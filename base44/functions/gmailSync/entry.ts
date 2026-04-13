import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Semaphore-based concurrency limiter
async function withConcurrencyLimit(tasks, limit) {
  const results = [];
  const executing = [];
  for (const task of tasks) {
    const p = Promise.resolve().then(task);
    results.push(p);
    const e = p.then(() => executing.splice(executing.indexOf(e), 1));
    executing.push(e);
    if (executing.length >= limit) await Promise.race(executing);
  }
  return Promise.allSettled(results);
}

// Fetch with retry and exponential backoff for 429/5xx errors
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, 2 ** i * 500));
      continue;
    }
    break;
  }
  return null;
}

Deno.serve(async (req) => {
  const abortControllers = [];
  const now = new Date();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Load ingestion settings
    const settingsList = await base44.entities.EmailIngestionSettings.filter({ created_by: user.email }, '-created_date', 1);
    if (!settingsList.length) return Response.json({ error: 'No ingestion settings configured' }, { status: 400 });
    const config = settingsList[0];
    if (!config.leads_inbox) return Response.json({ error: 'No leads inbox configured' }, { status: 400 });

    // Get Gmail access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Cursor-based time window
    const recentLogs = await base44.entities.EmailIngestionLog.filter({ created_by: user.email }, '-created_date', 1);
    const lastSyncAt = recentLogs.length > 0
      ? recentLogs[0].created_date
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const afterTimestamp = Math.floor(new Date(lastSyncAt).getTime() / 1000);

    // Fetch Gmail message list
    const listAc = new AbortController();
    abortControllers.push(listAc);
    const listTimeout = setTimeout(() => listAc.abort(), 10000);
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`in:inbox after:${afterTimestamp}`)}&maxResults=200`,
      { headers: authHeader, signal: listAc.signal }
    );
    clearTimeout(listTimeout);
    const listData = await listRes.json();
    const messages = listData.messages || [];

    const keywords = config.keywords
      ? config.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
      : [];
    const threshold = config.confidence_threshold ?? 60;
    const autoCreate = config.auto_create !== false;
    const stats = { scanned: messages.length, created: 0, reviewed: 0, skipped: 0, errors: 0 };

    // Preload existing data in parallel for O(1) lookups
    const [existingLogs, existingLeadsList] = await Promise.allSettled([
      base44.entities.EmailIngestionLog.filter({ created_by: user.email }, '-created_date', 1000),
      base44.entities.Lead.filter({ created_by: user.email }, '-created_date', 1000),
    ]);
    const processedIds = new Set(
      (existingLogs.status === 'fulfilled' ? existingLogs.value : []).map(log => log.gmail_message_id)
    );
    const existingLeadsData = existingLeadsList.status === 'fulfilled' ? existingLeadsList.value : [];
    const leadByEmail = {};
    existingLeadsData.forEach(lead => { if (lead.email) leadByEmail[lead.email.toLowerCase()] = lead; });

    // Dedup using in-memory Set
    const newMessageIds = messages.map(m => m.id).filter(id => !processedIds.has(id));

    // Step 1: Fetch Gmail message details with concurrency limit + timeout + retry
    const fetchTasks = newMessageIds.map(messageId => async () => {
      const ac = new AbortController();
      abortControllers.push(ac);
      const timeout = setTimeout(() => ac.abort(), 10000);
      try {
        const res = await fetchWithRetry(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
          { headers: authHeader, signal: ac.signal }
        );
        if (!res) return null;
        const message = await res.json();
        return { messageId, message };
      } finally {
        clearTimeout(timeout);
      }
    });

    const fetchResults = await withConcurrencyLimit(fetchTasks, 10);
    const fetchedMessages = fetchResults
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
    const fetchErrors = fetchResults.filter(r => r.status === 'rejected');
    fetchErrors.forEach(r => console.error('[gmailSync] fetch error:', r.reason));
    stats.errors += fetchErrors.length;

    // Step 2: Parse messages
    const parsedMessages = fetchedMessages.map(({ messageId, message }) => {
      const hdrs = message.payload?.headers || [];
      const hdr = (name) => hdrs.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      const from = hdr('From');
      const subject = hdr('Subject');
      const dateStr = hdr('Date');
      const fromMatch = from.match(/^(.*?)\s*<(.+?)>$/) || [null, '', from];
      const senderName = fromMatch[1].trim().replace(/^"|"$/g, '');
      const senderEmail = fromMatch[2].trim() || from;

      let bodyText = '';
      const extractBody = (part) => {
        if (!part) return;
        if (part.mimeType === 'text/plain' && part.body?.data) {
          try { bodyText += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')); } catch (_) {}
        } else if (part.parts) {
          part.parts.forEach(extractBody);
        }
      };
      extractBody(message.payload);
      if (!bodyText && message.payload?.body?.data) {
        try { bodyText = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/')); } catch (_) {}
      }

      return { messageId, subject, dateStr, senderName, senderEmail, bodyText };
    });

    // Step 3: Keyword filter
    const keywordSkipped = parsedMessages.filter(({ subject, bodyText }) => {
      if (keywords.length === 0) return false;
      return !keywords.some(kw => (subject + ' ' + bodyText).toLowerCase().includes(kw));
    });
    const toProcess = parsedMessages.filter(({ subject, bodyText }) => {
      if (keywords.length === 0) return true;
      return keywords.some(kw => (subject + ' ' + bodyText).toLowerCase().includes(kw));
    });

    // Log keyword-skipped with concurrency limit
    const skipLogResults = await withConcurrencyLimit(
      keywordSkipped.map(({ messageId, subject, dateStr, senderName, senderEmail, bodyText }) => async () => {
        await base44.entities.EmailIngestionLog.create({
          gmail_message_id: messageId, sender_name: senderName, sender_email: senderEmail,
          subject, body_preview: bodyText.slice(0, 500),
          received_at: dateStr ? new Date(dateStr).toISOString() : now.toISOString(),
          processed_at: now.toISOString(), result: 'skipped', skip_reason: 'no keyword match',
        });
      }),
      10
    );
    skipLogResults.filter(r => r.status === 'rejected').forEach(r => console.error('[gmailSync] skip log error:', r.reason));
    stats.skipped += keywordSkipped.length;

    // Step 4: AI extraction with concurrency limit
    const processTasks = toProcess.map(({ messageId, subject, dateStr, senderName, senderEmail, bodyText }) => async () => {
      const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are BeaconIQ's lead extraction engine. Analyze the following email and determine whether the sender is a potential B2B lead. Return ONLY a valid JSON object with these exact fields:
is_lead: boolean
confidence: integer 0-100
name: string or null
email: the sender email address
company: string or null
title: string or null
phone: string or null
industry: string or null
email_body_summary: one sentence describing what this person is asking about
not_a_lead_reason: if is_lead is false, one short phrase explaining why

Sender name: ${senderName}. Sender email: ${senderEmail}. Subject: ${subject}. Email body: ${bodyText.slice(0, 3000)}`,
        response_json_schema: {
          type: "object",
          properties: {
            is_lead: { type: "boolean" }, confidence: { type: "number" },
            name: { type: "string" }, email: { type: "string" },
            company: { type: "string" }, title: { type: "string" },
            phone: { type: "string" }, industry: { type: "string" },
            email_body_summary: { type: "string" }, not_a_lead_reason: { type: "string" }
          },
          required: ["is_lead", "confidence"]
        }
      });

      const logBase = {
        gmail_message_id: messageId,
        sender_name: senderName, sender_email: senderEmail, subject,
        body_preview: bodyText.slice(0, 500),
        received_at: dateStr ? new Date(dateStr).toISOString() : now.toISOString(),
        processed_at: now.toISOString(),
        confidence_score: aiResult.confidence,
        email_body_summary: aiResult.email_body_summary || '',
        extracted_name: aiResult.name || '',
        extracted_email: aiResult.email || senderEmail,
        extracted_company: aiResult.company || '',
        extracted_title: aiResult.title || '',
        extracted_industry: aiResult.industry || '',
      };

      if (!aiResult.is_lead) {
        await base44.entities.EmailIngestionLog.create({ ...logBase, result: 'skipped', skip_reason: aiResult.not_a_lead_reason || 'not a lead' });
        stats.skipped++;
        return;
      }

      if (!(aiResult.confidence >= threshold && autoCreate)) {
        await base44.entities.EmailIngestionLog.create({ ...logBase, result: 'pending_review' });
        stats.reviewed++;
        return;
      }

      const extractedEmail = aiResult.email || senderEmail;
      const existingLead = leadByEmail[extractedEmail.toLowerCase()];

      if (existingLead) {
        const note = `Follow-up email received: ${aiResult.email_body_summary || subject}`;
        await base44.entities.Lead.update(existingLead.id, {
          notes: existingLead.notes ? `${existingLead.notes}\n\n${note}` : note,
        });
        await base44.entities.EmailIngestionLog.create({ ...logBase, result: 'duplicate_updated', lead_id: existingLead.id });
      } else {
        const newLead = await base44.entities.Lead.create({
          name: aiResult.name || senderName || senderEmail,
          email: extractedEmail, company: aiResult.company || '',
          title: aiResult.title || '', phone: aiResult.phone || '',
          industry: aiResult.industry || '', source: 'Gmail Ingestion',
          status: 'New', priority: 'Medium', notes: aiResult.email_body_summary || '',
        });

        try {
          const scoringText = `Subject: ${subject}\n${bodyText}`.slice(0, 2000);
          const scoreResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are BeaconIQ's intent scoring engine. Analyze the following B2B lead text. Return ONLY valid JSON:
intent_score: integer 0-100
urgency_level: 'Immediate', 'High', 'Medium', or 'Low'
decision_authority: 'High', 'Medium', or 'Low'
pain_point: specific problem in 1 sentence, or null
urgency_signals: up to 3 phrases as comma-separated string, or null
scoring_rationale: one sentence

Text: ${scoringText}`,
            response_json_schema: {
              type: "object",
              properties: {
                intent_score: { type: "number" }, urgency_level: { type: "string" },
                decision_authority: { type: "string" }, pain_point: { type: "string" },
                urgency_signals: { type: "string" }, scoring_rationale: { type: "string" }
              },
              required: ["intent_score", "urgency_level", "decision_authority"]
            }
          });
          const score = scoreResult.intent_score ?? 0;
          await base44.entities.IntentScore.create({
            lead_id: newLead.id, intent_score: score,
            urgency_level: scoreResult.urgency_level || 'Low',
            decision_authority: scoreResult.decision_authority || 'Low',
            pain_point: scoreResult.pain_point || null,
            urgency_signals: scoreResult.urgency_signals || null,
            scoring_rationale: scoreResult.scoring_rationale || null,
            scored_at: now.toISOString(), source_text: scoringText,
          });
          await base44.entities.Lead.update(newLead.id, { priority: score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low' });
        } catch (err) {
          console.error('[gmailSync] intent scoring error:', err?.message);
        }

        await base44.entities.EmailIngestionLog.create({ ...logBase, result: 'lead_created', lead_id: newLead.id });
      }
      stats.created++;
    });

    const processResults = await withConcurrencyLimit(processTasks, 10);
    processResults.filter(r => r.status === 'rejected').forEach(r => {
      console.error('[gmailSync] processing error:', r.reason);
      stats.errors++;
    });

    return Response.json({ success: true, stats });
  } finally {
    // Cleanup: abort any lingering fetch controllers
    abortControllers.forEach(ac => { try { ac.abort(); } catch (_) {} });

    // Best-effort: flush final sync stats to DB
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();
      if (user) {
        const settingsList = await base44.entities.EmailIngestionSettings.filter({ created_by: user.email }, '-created_date', 1);
        if (settingsList.length) {
          await base44.entities.EmailIngestionSettings.update(settingsList[0].id, {
            last_sync_at: now.toISOString(),
            is_active: true,
          });
        }
      }
    } catch (_) {}
  }
});
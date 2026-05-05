import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// --- Concurrency helpers ---

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

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

// --- Per-tenant AI client ---
// Returns { invokeLLM(prompt, schema) } using the workspace's own key if set,
// otherwise falls back to the platform default (base44 InvokeLLM integration).

async function callOpenAI(apiKey, model, prompt, schema) {
  const userContent = prompt;
  const body = {
    model,
    messages: [{ role: 'user', content: userContent }],
  };
  if (schema) {
    // Strict JSON-schema structured output (gpt-4o-* family)
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'beaconiq_response',
        schema,
        strict: false,
      },
    };
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[aiClient/openai] ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  return schema ? JSON.parse(content) : content;
}

async function callAnthropic(apiKey, model, prompt, schema) {
  const userContent = schema
    ? `${prompt}\n\nRespond with a valid JSON object matching this schema: ${JSON.stringify(schema)}`
    : prompt;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: 'user', content: userContent }] }),
  });
  if (!res.ok) throw new Error(`[aiClient/anthropic] ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.content?.[0]?.text || '';
  if (!schema) return content;
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('[aiClient/anthropic] No JSON found in response');
  return JSON.parse(match[0]);
}

function getAIClient(workspace, base44) {
  const hasCustomKey = workspace?.ai_api_key?.trim().length > 0;
  if (!hasCustomKey) {
    return {
      invokeLLM: (prompt, schema) =>
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          ...(schema ? { response_json_schema: schema } : {}),
        }),
    };
  }
  const provider = workspace.ai_provider || 'openai';
  const apiKey = workspace.ai_api_key;
  const defaultModels = { openai: 'gpt-4o-mini', anthropic: 'claude-3-5-sonnet-20241022' };
  const model = workspace.ai_model || defaultModels[provider] || 'gpt-4o-mini';
  console.log(`[gmailSync] Using tenant AI key — provider: ${provider}, model: ${model}`);
  return {
    invokeLLM: (prompt, schema) =>
      provider === 'anthropic'
        ? callAnthropic(apiKey, model, prompt, schema)
        : callOpenAI(apiKey, model, prompt, schema),
  };
}

// --- Usage metering ---
// Atomically upserts the current month's WorkspaceUsage record for the workspace.
async function incrementUsage(base44, workspaceId, delta) {
  const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const existing = await base44.asServiceRole.entities.WorkspaceUsage.filter(
    { workspace_id: workspaceId, month }, '-created_date', 1
  );
  if (existing.length) {
    const rec = existing[0];
    await base44.asServiceRole.entities.WorkspaceUsage.update(rec.id, {
      emails_processed: (rec.emails_processed || 0) + (delta.emails_processed || 0),
      leads_created:    (rec.leads_created    || 0) + (delta.leads_created    || 0),
      emails_sent:      (rec.emails_sent      || 0) + (delta.emails_sent      || 0),
      ai_calls_made:    (rec.ai_calls_made    || 0) + (delta.ai_calls_made    || 0),
    });
  } else {
    await base44.asServiceRole.entities.WorkspaceUsage.create({
      workspace_id: workspaceId,
      month,
      emails_processed: delta.emails_processed || 0,
      leads_created:    delta.leads_created    || 0,
      emails_sent:      delta.emails_sent      || 0,
      ai_calls_made:    delta.ai_calls_made    || 0,
    });
  }
}

// Guard: throws if workspace_id is missing
function assertWorkspaceId(workspace_id) {
  if (!workspace_id) throw new Error('[gmailSync] workspace_id is required — cross-tenant leak prevented');
}

// Rate limit guard: throws if tenant has exceeded their monthly email limit
async function checkRateLimit(base44, workspaceId, workspace) {
  const plan = workspace.plan || 'free';
  // Pro plan is unlimited
  if (plan === 'pro') return;

  const limit = workspace.monthly_email_limit ?? (plan === 'starter' ? 1000 : 100);
  const month = new Date().toISOString().slice(0, 7);
  const usageRecords = await base44.asServiceRole.entities.WorkspaceUsage.filter(
    { workspace_id: workspaceId, month }, '-created_date', 1
  );
  const used = usageRecords.length > 0 ? (usageRecords[0].emails_processed || 0) : 0;

  if (used >= limit) {
    const msg = `[gmailSync] Rate limit exceeded for workspace ${workspaceId} — plan: ${plan}, limit: ${limit}, used: ${used}. Skipping sync.`;
    console.warn(msg);
    throw Object.assign(new Error(`Monthly email limit reached (${used}/${limit}). Upgrade your plan to process more emails.`), { status: 429 });
  }
}

// Middleware guard: verifies the authenticated user owns the workspace (403 on mismatch)
// Returns the full workspace record so callers can access token fields
async function validateTenant(base44, workspaceId, userId) {
  const workspaces = await base44.asServiceRole.entities.Workspace.filter({ id: workspaceId }, '-created_date', 1);
  if (!workspaces.length) throw Object.assign(new Error('Workspace not found'), { status: 403 });
  if (workspaces[0].owner_user_id !== userId) {
    throw Object.assign(new Error('[gmailSync] Tenant mismatch — access denied'), { status: 403 });
  }
  return workspaces[0];
}

// Refresh the settings' access token using its refresh token; updates the EmailIngestionSettings record
async function refreshAccessToken(base44, settings) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: settings.gmail_refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`[gmailSync] Token refresh failed: ${data.error_description || data.error || 'unknown'}`);
  }
  const newExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
  await base44.asServiceRole.entities.EmailIngestionSettings.update(settings.id, {
    gmail_access_token: data.access_token,
    gmail_token_expiry: newExpiry,
  });
  return data.access_token;
}

// Returns a valid access token from EmailIngestionSettings, refreshing if expiring within 5 minutes
async function getValidAccessToken(settings, base44) {
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  if ((settings.gmail_token_expiry ?? 0) - Date.now() <= FIVE_MINUTES_MS) {
    console.log('[gmailSync] Token expiring soon — refreshing...');
    return await refreshAccessToken(base44, settings);
  }
  return settings.gmail_access_token;
}

Deno.serve(async (req) => {
  const abortControllers = [];
  const now = new Date();
  let base44 = null;
  let workspaceId = null;
  let configId = null;
  let lockAcquired = false;

  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve workspace and validate tenant ownership
    const workspaces = await base44.asServiceRole.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1);
    if (!workspaces.length) return Response.json({ error: 'No workspace found for user' }, { status: 400 });
    let workspace = workspaces[0];
    workspaceId = workspace.id;
    assertWorkspaceId(workspaceId);
    await validateTenant(base44, workspaceId, user.id);

    // Sync lock guard: prevent concurrent syncs for the same workspace
    if (workspace.sync_lock) {
      console.warn(`[gmailSync] workspace ${workspaceId} is already syncing — aborting duplicate run`);
      return Response.json({ skipped: true, reason: 'Sync already in progress for this workspace' });
    }
    await base44.asServiceRole.entities.Workspace.update(workspaceId, { sync_lock: true });
    lockAcquired = true;

    // Skip sync if Gmail not connected for this workspace
    if (!workspace.gmail_connected) {
      console.warn(`[gmailSync] workspace ${workspaceId} has gmail_connected=false — skipping sync`);
      return Response.json({ skipped: true, reason: 'Gmail not connected for this workspace' });
    }

    // Rate limit: check monthly email quota before doing any work
    await checkRateLimit(base44, workspaceId, workspace);

    // Load ingestion settings scoped to workspace
    const settingsList = await base44.asServiceRole.entities.EmailIngestionSettings.filter({ workspace_id: workspaceId }, '-created_date', 1);
    if (!settingsList.length) return Response.json({ error: 'No ingestion settings configured' }, { status: 400 });
    const config = settingsList[0];
    configId = config.id;
    if (!config.leads_inbox) return Response.json({ error: 'No leads inbox configured' }, { status: 400 });

    // Get valid per-tenant access token from EmailIngestionSettings (auto-refreshes if needed)
    console.log('[gmailSync] Fetching valid access token from EmailIngestionSettings...');
    const accessToken = await getValidAccessToken(config, base44);
    if (!accessToken) {
      return Response.json({ skipped: true, reason: 'No Gmail access token in EmailIngestionSettings — please reconnect Gmail' });
    }
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Build per-tenant AI client (own key if configured, else platform default)
    const aiClient = getAIClient(workspace, base44);

    // Cursor-based sync window — user-scoped client enforces RLS
    const recentLogs = await base44.entities.EmailIngestionLog.filter(
      { workspace_id: workspaceId }, '-created_date', 1
    );
    assertWorkspaceId(workspaceId);
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

    // Preload existing workspace-scoped data in parallel — user-scoped client enforces RLS
    assertWorkspaceId(workspaceId);
    const [existingLogsResult, existingLeadsResult] = await Promise.allSettled([
      base44.entities.EmailIngestionLog.filter({ workspace_id: workspaceId }, '-created_date', 1000),
      base44.entities.Lead.filter({ workspace_id: workspaceId }, '-created_date', 1000),
    ]);

    if (existingLogsResult.status === 'rejected') console.error('[gmailSync] preload logs error:', existingLogsResult.reason);
    if (existingLeadsResult.status === 'rejected') console.error('[gmailSync] preload leads error:', existingLeadsResult.reason);

    const processedIds = new Set(
      (existingLogsResult.status === 'fulfilled' ? existingLogsResult.value : []).map(l => l.gmail_message_id)
    );
    const existingLeadsData = existingLeadsResult.status === 'fulfilled' ? existingLeadsResult.value : [];
    const leadByEmail = {};
    existingLeadsData.forEach(lead => { if (lead.email) leadByEmail[lead.email.toLowerCase()] = lead; });

    const newMessageIds = messages.map(m => m.id).filter(id => !processedIds.has(id));

    // Step 1: Fetch message details with concurrency limit + AbortController timeout + retry
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
    const fetchedMessages = fetchResults.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
    fetchResults.filter(r => r.status === 'rejected').forEach(r => {
      console.error('[gmailSync] fetch error:', r.reason);
      stats.errors++;
    });

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
        } else if (part.parts) { part.parts.forEach(extractBody); }
      };
      extractBody(message.payload);
      if (!bodyText && message.payload?.body?.data) {
        try { bodyText = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/')); } catch (_) {}
      }
      return { messageId, subject, dateStr, senderName, senderEmail, bodyText };
    });

    // Step 3: Keyword filter
    const keywordSkipped = keywords.length > 0
      ? parsedMessages.filter(({ subject, bodyText }) => !keywords.some(kw => (subject + ' ' + bodyText).toLowerCase().includes(kw)))
      : [];
    const toProcess = keywords.length > 0
      ? parsedMessages.filter(({ subject, bodyText }) => keywords.some(kw => (subject + ' ' + bodyText).toLowerCase().includes(kw)))
      : parsedMessages;

    // Log keyword-skipped (workspace-scoped)
    assertWorkspaceId(workspaceId);
    const skipResults = await withConcurrencyLimit(
      keywordSkipped.map(({ messageId, subject, dateStr, senderName, senderEmail, bodyText }) => async () => {
        await base44.entities.EmailIngestionLog.create({
          workspace_id: workspaceId,
          gmail_message_id: messageId, sender_name: senderName, sender_email: senderEmail,
          subject, body_preview: bodyText.slice(0, 500),
          received_at: dateStr ? new Date(dateStr).toISOString() : now.toISOString(),
          processed_at: now.toISOString(), result: 'skipped', skip_reason: 'no keyword match',
        });
      }),
      10
    );
    skipResults.filter(r => r.status === 'rejected').forEach(r => console.error('[gmailSync] skip log error:', r.reason));
    stats.skipped += keywordSkipped.length;

    // Step 4: AI extraction + lead creation (workspace-scoped)
    assertWorkspaceId(workspaceId);
    const processTasks = toProcess.map(({ messageId, subject, dateStr, senderName, senderEmail, bodyText }) => async () => {
      const aiResult = await aiClient.invokeLLM(
        `You are BeaconIQ's lead extraction engine. Analyze the following email and determine whether the sender is a potential B2B lead. Return ONLY a valid JSON object with these exact fields:
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
        {
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
      );

      const logBase = {
        workspace_id: workspaceId,
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
          workspace_id: workspaceId,
          name: aiResult.name || senderName || senderEmail,
          email: extractedEmail, company: aiResult.company || '',
          title: aiResult.title || '', phone: aiResult.phone || '',
          industry: aiResult.industry || '', source: 'Email Ingestion',
          status: 'New', priority: 'Medium', notes: aiResult.email_body_summary || '',
        });

        try {
          const scoringText = `Subject: ${subject}\n${bodyText}`.slice(0, 2000);
          const scoreResult = await aiClient.invokeLLM(
            `You are BeaconIQ's intent scoring engine. Analyze the following B2B lead text. Return ONLY valid JSON:
intent_score: integer 0-100
urgency_level: 'Immediate', 'High', 'Medium', or 'Low'
decision_authority: 'High', 'Medium', or 'Low'
pain_point: specific problem in 1 sentence, or null
urgency_signals: up to 3 phrases as comma-separated string, or null
scoring_rationale: one sentence

Text: ${scoringText}`,
            {
              type: "object",
              properties: {
                intent_score: { type: "number" }, urgency_level: { type: "string" },
                decision_authority: { type: "string" }, pain_point: { type: "string" },
                urgency_signals: { type: "string" }, scoring_rationale: { type: "string" }
              },
              required: ["intent_score", "urgency_level", "decision_authority"]
            }
          );
          const score = scoreResult.intent_score ?? 0;
          await base44.entities.IntentScore.create({
            workspace_id: workspaceId,
            lead_id: newLead.id, intent_score: score,
            urgency_level: scoreResult.urgency_level || 'Low',
            decision_authority: scoreResult.decision_authority || 'Low',
            pain_point: scoreResult.pain_point || null,
            urgency_signals: scoreResult.urgency_signals || null,
            scoring_rationale: scoreResult.scoring_rationale || null,
            scored_at: now.toISOString(), source_text: scoringText,
          });
          await base44.entities.Lead.update(newLead.id, { priority: score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low' });

          // Template-based reply email generation
          try {
            const allTemplates = await base44.entities.Template.filter({ workspace_id: workspaceId }, '-created_date', 100);
            const matchingTemplate = allTemplates.find(t =>
              score >= (t.intent_range_min ?? 0) && score <= (t.intent_range_max ?? 100)
            );

            let emailSubject, emailBody;
            if (matchingTemplate) {
              // Use template as base and personalize with AI
              const personalized = await aiClient.invokeLLM(
                `You are BeaconIQ's email personalization engine. Personalize the following email template for a specific lead. Keep the structure and intent of the template, but tailor it to feel personal and relevant to this lead.

Lead name: ${aiResult.name || senderName}
Lead company: ${aiResult.company || 'unknown'}
Lead title: ${aiResult.title || 'unknown'}
Lead email summary: ${aiResult.email_body_summary || subject}

Template subject: ${matchingTemplate.subject}
Template body (HTML): ${matchingTemplate.body}

Return ONLY valid JSON with keys: subject (string), body (string, preserve HTML structure from template).`,
                { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } }, required: ["subject", "body"] }
              );
              emailSubject = personalized.subject || matchingTemplate.subject;
              emailBody = personalized.body || matchingTemplate.body;
              // Increment template use_count
              await base44.entities.Template.update(matchingTemplate.id, { use_count: (matchingTemplate.use_count || 0) + 1 });
            } else {
              // Default AI generation (no matching template)
              const generated = await aiClient.invokeLLM(
                `Generate a personalized outreach reply email for this lead.
Lead name: ${aiResult.name || senderName}, company: ${aiResult.company || 'unknown'}, title: ${aiResult.title || 'unknown'}.
Their inquiry: ${aiResult.email_body_summary || subject}.
Intent score: ${score}/100. Keep it concise, friendly, and professional.
Return ONLY valid JSON with keys: subject (string), body (string).`,
                { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } }, required: ["subject", "body"] }
              );
              emailSubject = generated.subject || `Re: ${subject}`;
              emailBody = generated.body || '';
            }

            if (emailSubject && emailBody) {
              await base44.entities.EmailLog.create({
                workspace_id: workspaceId,
                lead_id: newLead.id,
                lead_name: aiResult.name || senderName,
                lead_email: extractedEmail,
                subject: emailSubject,
                body: emailBody,
                status: 'Draft',
                ai_generated: true,
              });
            }
          } catch (emailErr) {
            console.error('[gmailSync] email generation error:', emailErr?.message);
          }
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

    // Meter usage for this sync run (best-effort, don't fail the sync if this errors)
    try {
      // Count AI calls: 1 per processed email (lead extraction) + 1 per lead created (intent scoring)
      const aiCalls = toProcess.length + stats.created;
      await incrementUsage(base44, workspaceId, {
        emails_processed: messages.length,
        leads_created: stats.created,
        ai_calls_made: aiCalls,
      });
    } catch (usageErr) {
      console.error('[gmailSync] usage metering error:', usageErr.message);
    }

    return Response.json({ success: true, stats });
  } catch (error) {
    const status = error.status === 403 ? 403 : 500;
    // Log error to ErrorLog entity (best-effort)
    try {
      if (base44 && status !== 401) {
        await base44.asServiceRole.entities.ErrorLog.create({
          workspace_id: workspaceId || 'unknown',
          function_name: 'gmailSync',
          error_message: error.message || String(error),
          error_stack: error.stack?.slice(0, 1000) || '',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (_) {}
    return Response.json({ error: error.message }, { status });
  } finally {
    // Cleanup: abort any lingering fetch controllers
    abortControllers.forEach(ac => { try { ac.abort(); } catch (_) {} });

    // Release sync lock
    if (base44 && workspaceId && lockAcquired) {
      try {
        await base44.asServiceRole.entities.Workspace.update(workspaceId, { sync_lock: false });
      } catch (_) {}
    }

    // Best-effort: flush final sync timestamp to DB
    if (base44 && configId) {
      try {
        await base44.entities.EmailIngestionSettings.update(configId, {
          last_sync_at: now.toISOString(),
          is_active: true,
        });
      } catch (_) {}
    }
  }
});
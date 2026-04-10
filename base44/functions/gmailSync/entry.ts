import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Load ingestion settings
    const settingsList = await base44.asServiceRole.entities.EmailIngestionSettings.list('-created_date', 1);
    if (!settingsList.length) return Response.json({ error: 'No ingestion settings configured' }, { status: 400 });
    const config = settingsList[0];
    if (!config.leads_inbox) return Response.json({ error: 'No leads inbox configured' }, { status: 400 });

    // Get Gmail access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Determine time window
    const now = new Date();
    let afterDate;
    if (config.last_sync_at) {
      afterDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else {
      const days = parseInt(config.lookback_window || '7');
      afterDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }
    const afterEpoch = Math.floor(afterDate.getTime() / 1000);

    // Fetch Gmail messages
    const query = `to:${config.leads_inbox} after:${afterEpoch}`;
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      { headers: authHeader }
    );
    const listData = await listRes.json();
    const messages = listData.messages || [];

    const keywords = config.keywords
      ? config.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
      : [];
    const threshold = config.confidence_threshold ?? 60;
    const autoCreate = config.auto_create !== false;
    const stats = { scanned: messages.length, created: 0, reviewed: 0, skipped: 0 };

    for (const { id: messageId } of messages) {
      // Dedup check
      const existing = await base44.asServiceRole.entities.EmailIngestionLog.filter({ gmail_message_id: messageId });
      if (existing.length > 0) continue;

      // Fetch full message
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: authHeader }
      );
      if (!msgRes.ok) continue;
      const message = await msgRes.json();

      const hdrs = message.payload?.headers || [];
      const hdr = (name) => hdrs.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      const from = hdr('From');
      const subject = hdr('Subject');
      const dateStr = hdr('Date');

      const fromMatch = from.match(/^(.*?)\s*<(.+?)>$/) || [null, '', from];
      const senderName = fromMatch[1].trim().replace(/^"|"$/g, '');
      const senderEmail = fromMatch[2].trim() || from;

      // Extract body text
      let bodyText = '';
      const extractBody = (part) => {
        if (!part) return;
        if (part.mimeType === 'text/plain' && part.body?.data) {
          try {
            bodyText += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          } catch (_) {}
        } else if (part.parts) {
          part.parts.forEach(extractBody);
        }
      };
      extractBody(message.payload);
      if (!bodyText && message.payload?.body?.data) {
        try { bodyText = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/')); } catch (_) {}
      }

      // Keyword filter
      if (keywords.length > 0) {
        const searchText = (subject + ' ' + bodyText).toLowerCase();
        if (!keywords.some(kw => searchText.includes(kw))) {
          await base44.asServiceRole.entities.EmailIngestionLog.create({
            gmail_message_id: messageId, sender_name: senderName, sender_email: senderEmail,
            subject, body_preview: bodyText.slice(0, 500),
            received_at: dateStr ? new Date(dateStr).toISOString() : now.toISOString(),
            processed_at: now.toISOString(), result: 'skipped', skip_reason: 'no keyword match',
          });
          stats.skipped++;
          continue;
        }
      }

      // AI extraction
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
            is_lead: { type: "boolean" },
            confidence: { type: "number" },
            name: { type: "string" },
            email: { type: "string" },
            company: { type: "string" },
            title: { type: "string" },
            phone: { type: "string" },
            industry: { type: "string" },
            email_body_summary: { type: "string" },
            not_a_lead_reason: { type: "string" }
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
        await base44.asServiceRole.entities.EmailIngestionLog.create({
          ...logBase, result: 'skipped', skip_reason: aiResult.not_a_lead_reason || 'not a lead',
        });
        stats.skipped++;
        continue;
      }

      const confirmed = aiResult.confidence >= threshold && autoCreate;

      if (!confirmed) {
        await base44.asServiceRole.entities.EmailIngestionLog.create({ ...logBase, result: 'pending_review' });
        stats.reviewed++;
        continue;
      }

      // Auto-create lead
      const extractedEmail = aiResult.email || senderEmail;
      const existingLeads = await base44.asServiceRole.entities.Lead.filter({ email: extractedEmail });

      if (existingLeads.length > 0) {
        const lead = existingLeads[0];
        const note = `Follow-up email received: ${aiResult.email_body_summary || subject}`;
        await base44.asServiceRole.entities.Lead.update(lead.id, {
          notes: lead.notes ? `${lead.notes}\n\n${note}` : note,
        });
        await base44.asServiceRole.entities.EmailIngestionLog.create({
          ...logBase, result: 'duplicate_updated', lead_id: lead.id,
        });
      } else {
        const newLead = await base44.asServiceRole.entities.Lead.create({
          name: aiResult.name || senderName || senderEmail,
          email: extractedEmail, company: aiResult.company || '',
          title: aiResult.title || '', phone: aiResult.phone || '',
          industry: aiResult.industry || '', source: 'Gmail Ingestion',
          status: 'New', priority: 'Medium', notes: aiResult.email_body_summary || '',
        });

        // Intent scoring
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
          await base44.asServiceRole.entities.IntentScore.create({
            lead_id: newLead.id, intent_score: score,
            urgency_level: scoreResult.urgency_level || 'Low',
            decision_authority: scoreResult.decision_authority || 'Low',
            pain_point: scoreResult.pain_point || null,
            urgency_signals: scoreResult.urgency_signals || null,
            scoring_rationale: scoreResult.scoring_rationale || null,
            scored_at: now.toISOString(), source_text: scoringText,
          });
          const priority = score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low';
          await base44.asServiceRole.entities.Lead.update(newLead.id, { priority });
        } catch (_) {}

        await base44.asServiceRole.entities.EmailIngestionLog.create({
          ...logBase, result: 'lead_created', lead_id: newLead.id,
        });
      }
      stats.created++;
    }

    // Update settings with last sync info
    await base44.asServiceRole.entities.EmailIngestionSettings.update(config.id, {
      last_sync_at: now.toISOString(),
      last_sync_stats: JSON.stringify(stats),
      is_active: true,
    });

    return Response.json({ success: true, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
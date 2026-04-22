import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * loadDemoData — BeaconIQ Sample Workspace Seeder
 * Seeds realistic demo data across the live MVP modules only
 * (Leads, Campaigns, EmailLog, EmailIngestionLog, IntentScore,
 *  FollowUpReminder, BusinessProfile, EmailIngestionSettings).
 * Every record is tagged with is_demo:true + demo_batch for safe cleanup.
 * Action: "seed" | "clear"
 */

const DEMO_BATCH = "sample_workspace_v2";
const DEMO_TAG = { is_demo: true, demo_batch: DEMO_BATCH };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Please sign in again to load demo data.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, workspace_id } = body;
    if (!workspace_id) return Response.json({ error: 'Workspace not ready. Please refresh and try again.' }, { status: 400 });
    if (!action || (action !== 'seed' && action !== 'clear')) {
      return Response.json({ error: 'Invalid action. Use seed or clear.' }, { status: 400 });
    }

    // Verify workspace belongs to the authenticated user
    const userWorkspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 5);
    const workspace = userWorkspaces.find(w => w.id === workspace_id);
    if (!workspace) return Response.json({ error: 'Workspace not found or access denied.' }, { status: 404 });

    if (action === 'clear') {
      const deleted = await clearDemoData(base44, workspace_id);
      return Response.json({ success: true, message: 'Demo data cleared.', deleted });
    }

    // action === 'seed'
    // Idempotency: if demo leads already exist, don't re-seed
    const existingLeads = await base44.entities.Lead.filter({ workspace_id, is_demo: true }, '-created_date', 1);
    if (existingLeads.length > 0) {
      return Response.json({
        success: true,
        already_seeded: true,
        message: 'Demo data is already loaded. Clear it first to re-seed.',
      });
    }

    const counts = await seedDemoData(base44, workspace_id, user);
    return Response.json({ success: true, message: 'Demo workspace ready.', ...counts });

  } catch (error) {
    console.error('[loadDemoData]', error?.message, error?.stack);
    return Response.json({
      error: 'Something went wrong loading demo data. Please try again.',
      details: error?.message,
    }, { status: 500 });
  }
});

async function clearDemoData(base44, workspace_id) {
  const e = base44.entities;
  const demoFilter = { workspace_id, is_demo: true };

  // Only clear entities used by the live MVP
  const [leads, campaigns, emails, ingestionLogs, reminders,
         ingestionSettings, intentScores, businessProfiles] = await Promise.all([
    e.Lead.filter(demoFilter, '-created_date', 500).catch(() => []),
    e.Campaign.filter(demoFilter, '-created_date', 50).catch(() => []),
    e.EmailLog.filter(demoFilter, '-created_date', 500).catch(() => []),
    e.EmailIngestionLog.filter(demoFilter, '-created_date', 500).catch(() => []),
    e.FollowUpReminder.filter(demoFilter, '-created_date', 500).catch(() => []),
    e.EmailIngestionSettings.filter(demoFilter, '-created_date', 10).catch(() => []),
    e.IntentScore.filter(demoFilter, '-created_date', 200).catch(() => []),
    e.BusinessProfile.filter(demoFilter, '-created_date', 10).catch(() => []),
  ]);

  const del = (entity, items) =>
    Promise.all(items.map(i => e[entity].delete(i.id).catch(() => {})));

  await Promise.all([
    del('Lead', leads),
    del('Campaign', campaigns),
    del('EmailLog', emails),
    del('EmailIngestionLog', ingestionLogs),
    del('FollowUpReminder', reminders),
    del('EmailIngestionSettings', ingestionSettings),
    del('IntentScore', intentScores),
    del('BusinessProfile', businessProfiles),
  ]);

  return {
    leads: leads.length,
    campaigns: campaigns.length,
    email_logs: emails.length,
    ingestion_logs: ingestionLogs.length,
    reminders: reminders.length,
    intent_scores: intentScores.length,
  };
}

async function seedDemoData(base44, workspace_id, user) {
  const sr = base44.entities;
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString();

  // ── Business Profile ──────────────────────────────────────────
  const existingProfiles = await sr.BusinessProfile.filter({ workspace_id }, '-created_date', 1).catch(() => []);
  if (!existingProfiles.length) {
    await sr.BusinessProfile.create({
      ...DEMO_TAG,
      workspace_id,
      business_name: "Apex Growth Partners",
      description: "We help B2B SaaS companies and marketing agencies convert inbound leads into pipeline faster using AI-driven intent scoring and hyper-personalized email replies.",
      industry: "Marketing Agency",
      target_audience: "B2B SaaS founders, VP Sales at 50-500 person companies, growth-stage startups post-Series A",
      products_services: "AI-powered inbound lead qualification, intent scoring, personalized email outreach",
      tone: "Professional",
      sales_goal: "Book a Meeting",
      website: "https://apexgrowthpartners.com",
      onboarding_complete: true,
    });
  }

  // ── Campaigns ─────────────────────────────────────────────────
  const [campQ1, campFintech, campNurture] = await Promise.all([
    sr.Campaign.create({
      ...DEMO_TAG,
      workspace_id,
      name: "Q1 Inbound Reply Sequence",
      description: "AI replies to high-intent inbound leads with a meeting CTA",
      status: "Active",
      total_leads: 18,
      total_sent: 34,
      total_replied: 7,
      total_opened: 22,
      steps: [
        { day: 0, subject_template: "Re: {{subject}}", message_template: "Hi {{name}}, thanks for reaching out about {{company}}..." },
        { day: 3, subject_template: "Re: {{subject}}", message_template: "Just checking in — does Tuesday work?" },
        { day: 7, subject_template: "Last follow-up", message_template: "Didn't want this to slip — still keen to chat?" },
      ],
    }),
    sr.Campaign.create({
      ...DEMO_TAG,
      workspace_id,
      name: "Fintech Hot Leads",
      description: "Priority sequence for fintech inbound enquiries",
      status: "Active",
      total_leads: 11,
      total_sent: 18,
      total_replied: 4,
      total_opened: 13,
      steps: [],
    }),
    sr.Campaign.create({
      ...DEMO_TAG,
      workspace_id,
      name: "Re-engagement: Cold Leads",
      description: "Nurture sequence for leads that went quiet",
      status: "Paused",
      total_leads: 42,
      total_sent: 42,
      total_replied: 3,
      total_opened: 18,
      steps: [],
    }),
  ]);

  // ── Leads ─────────────────────────────────────────────────────
  const leadsData = [
    { name: "Sarah Chen",       email: "sarah.chen@prism.io",       company: "Prism Analytics",  title: "VP of Marketing",        industry: "SaaS",              status: "Meeting Booked", priority: "High",   campaign_id: campQ1.id,      total_emails_sent: 3, last_contacted: daysAgo(1) },
    { name: "Marcus Webb",      email: "m.webb@dataloop.ai",         company: "DataLoop AI",      title: "Co-Founder & CEO",       industry: "SaaS",              status: "Interested",     priority: "High",   campaign_id: campQ1.id,      total_emails_sent: 2, last_contacted: daysAgo(2) },
    { name: "Priya Nair",       email: "priya@scalepath.com",        company: "ScalePath",        title: "Head of Growth",         industry: "Marketing Agency",  status: "Replied",        priority: "High",   campaign_id: campQ1.id,      total_emails_sent: 1, last_contacted: daysAgo(3) },
    { name: "Jordan Ellis",     email: "jellis@tradestack.io",       company: "TradeStack",       title: "CTO",                    industry: "Fintech",           status: "Contacted",      priority: "Medium", campaign_id: campFintech.id, total_emails_sent: 1, last_contacted: daysAgo(5) },
    { name: "Alicia Montoya",   email: "alicia@vaultworks.com",      company: "VaultWorks",       title: "Director of Revenue",    industry: "SaaS",              status: "Contacted",      priority: "Medium", campaign_id: campFintech.id, total_emails_sent: 2, last_contacted: daysAgo(4) },
    { name: "Tom Bradbury",     email: "t.bradbury@cloverfield.co",  company: "Cloverfield Media",title: "Head of Sales",          industry: "Consulting",        status: "New",            priority: "Medium", campaign_id: campQ1.id,      total_emails_sent: 0 },
    { name: "Nina Patel",       email: "nina@clearstride.com",       company: "ClearStride",      title: "CEO",                    industry: "SaaS",              status: "New",            priority: "High",   campaign_id: campQ1.id,      total_emails_sent: 0 },
    { name: "Derek Huang",      email: "derek.huang@finvault.io",    company: "FinVault",         title: "VP Engineering",         industry: "Fintech",           status: "Replied",        priority: "Low",    campaign_id: campFintech.id, total_emails_sent: 2, last_contacted: daysAgo(6) },
    { name: "Camille Dupont",   email: "c.dupont@lumino.fr",         company: "Lumino",           title: "CMO",                    industry: "E-commerce",        status: "Unresponsive",   priority: "Low",    campaign_id: campNurture.id, total_emails_sent: 3, last_contacted: daysAgo(14) },
    { name: "Ben Richards",     email: "ben@stackpulse.dev",         company: "StackPulse",       title: "Head of Growth",         industry: "SaaS",              status: "Closed",         priority: "High",   campaign_id: campQ1.id,      total_emails_sent: 5, last_contacted: daysAgo(7) },
  ];

  const createdLeads = await Promise.all(
    leadsData.map(l => sr.Lead.create({
      ...DEMO_TAG,
      ...l,
      workspace_id,
      source: "Email Ingestion",
      notes: "Captured via BeaconIQ inbox monitor.",
    }))
  );

  // ── Intent Scores ─────────────────────────────────────────────
  const intentData = [
    { lead: createdLeads[0], score: 91, urgency: "Immediate", pain: "Struggling to scale inbound response without burning SDRs", signals: "Visited pricing page 3x, replied within 4 hours" },
    { lead: createdLeads[1], score: 84, urgency: "High",      pain: "No repeatable inbound qualification process post-Series A", signals: "Hiring 2 AEs, referenced competitor in reply" },
    { lead: createdLeads[2], score: 78, urgency: "High",      pain: "Agency clients demanding faster inbound response times",   signals: "Asked for case studies, replied same day" },
    { lead: createdLeads[3], score: 72, urgency: "Medium",    pain: "Engineering-heavy team has no inbound sales process",      signals: "Opened email 4x, clicked link once" },
    { lead: createdLeads[4], score: 65, urgency: "Medium",    pain: "Fragmented inbox and no AI triage for enquiries",          signals: "Opened twice, no reply yet" },
    { lead: createdLeads[6], score: 70, urgency: "Medium",    pain: "CEO looking to build a sales motion from scratch",         signals: "Direct inbound, high authority" },
  ];

  await Promise.all(intentData.map(({ lead, score, urgency, pain, signals }) =>
    sr.IntentScore.create({
      ...DEMO_TAG,
      workspace_id,
      lead_id: lead.id,
      intent_score: score,
      urgency_level: urgency,
      decision_authority: score >= 80 ? "High" : "Medium",
      pain_point: pain,
      urgency_signals: signals,
      scoring_rationale: `AI scored ${score}/100 based on email content, engagement, and decision authority.`,
      scored_at: daysAgo(1),
      source_text: "Analyzed from inbound email.",
    })
  ));

  // ── Email Logs ────────────────────────────────────────────────
  const emailLogsData = [
    { lead: createdLeads[0], subject: "Re: Scaling your inbound response at Prism",   body: "Hi Sarah, great connecting — excited to demo next Tuesday.",   status: "Replied", sent_at: daysAgo(2) },
    { lead: createdLeads[1], subject: "Re: DataLoop's inbound process",               body: "Hi Marcus, saw your Series A announcement — congrats!",        status: "Opened",  sent_at: daysAgo(3) },
    { lead: createdLeads[2], subject: "ScalePath x Apex — partnership opportunity",   body: "Hi Priya, we work with 3 agencies in your space...",           status: "Replied", sent_at: daysAgo(3) },
    { lead: createdLeads[3], subject: "TradeStack's inbound enquiry volume",          body: "Hi Jordan, noticed TradeStack is hiring enterprise AEs...",    status: "Sent",    sent_at: daysAgo(5) },
    { lead: createdLeads[4], subject: "Helping VaultWorks triage inbound faster",     body: "Hi Alicia, your RevOps role posting caught my eye...",         status: "Opened",  sent_at: daysAgo(4) },
    { lead: createdLeads[7], subject: "FinVault — inbound lead intelligence",         body: "Hi Derek, love what you're building at FinVault...",           status: "Sent",    sent_at: daysAgo(6) },
  ];

  await Promise.all(emailLogsData.map(({ lead, subject, body, status, sent_at }) =>
    sr.EmailLog.create({
      ...DEMO_TAG,
      workspace_id,
      lead_id: lead.id,
      lead_name: lead.name,
      lead_email: lead.email,
      campaign_id: lead.campaign_id,
      subject,
      body,
      status,
      sent_at,
      ai_generated: true,
    })
  ));

  // ── Email Ingestion Logs ──────────────────────────────────────
  const ingestionLogsData = [
    { name: "Sarah Chen",          email: "sarah.chen@prism.io",       subject: "Interested in learning more",         result: "lead_created",   conf: 92, company: "Prism Analytics", preview: "Hi, I found your agency through a LinkedIn post..." },
    { name: "Marcus Webb",         email: "m.webb@dataloop.ai",        subject: "Re: Scaling inbound at DataLoop",     result: "lead_created",   conf: 88, company: "DataLoop AI",    preview: "We're post-Series A and need a repeatable process..." },
    { name: "Anonymous",           email: "info@techblog.co",          subject: "Newsletter subscription",              result: "skipped",        conf: 12, company: "",               preview: "You're subscribed to TechPulse Weekly..." },
    { name: "Priya Nair",          email: "priya@scalepath.com",       subject: "Agency partnership inquiry",           result: "lead_created",   conf: 81, company: "ScalePath",      preview: "We run paid media for 30+ SaaS clients..." },
    { name: "Potential Lead",      email: "contact@buildit.io",        subject: "Question about your services",         result: "pending_review", conf: 58, company: "BuildIt",        preview: "Came across BeaconIQ and curious how it works for..." },
    { name: "Derek Huang",         email: "derek.huang@finvault.io",   subject: "Exploring sales tooling options",      result: "lead_created",   conf: 74, company: "FinVault",       preview: "Our team is evaluating several tools this quarter..." },
    { name: "Unsubscribe Request", email: "noreply@marketing.co",      subject: "Please remove me",                     result: "skipped",        conf: 5,  company: "",               preview: "Please unsubscribe me from all communications..." },
    { name: "Nina Patel",          email: "nina@clearstride.com",      subject: "Looking for inbound qualification",    result: "pending_review", conf: 63, company: "ClearStride",    preview: "We're a 45-person SaaS company trying to build..." },
  ];

  await Promise.all(ingestionLogsData.map(({ name, email, subject, result, conf, company, preview }, i) =>
    sr.EmailIngestionLog.create({
      ...DEMO_TAG,
      workspace_id,
      gmail_message_id: `demo_msg_${i}_${workspace_id.slice(0, 8)}`,
      sender_name: name,
      sender_email: email,
      subject,
      body_preview: preview,
      email_body_summary: preview,
      received_at: daysAgo(i * 0.8 + 0.5),
      processed_at: daysAgo(i * 0.8),
      result,
      confidence_score: conf,
      ai_summary: result !== 'skipped' ? `AI identified this as a ${result === 'lead_created' ? 'high-value' : 'medium-value'} inbound B2B lead.` : 'Non-lead automated email.',
      extracted_name: name,
      extracted_email: email,
      extracted_company: company,
    })
  ));

  // ── Email Ingestion Settings ──────────────────────────────────
  const existingIngestion = await sr.EmailIngestionSettings.filter({ workspace_id }, '-created_date', 1).catch(() => []);
  if (!existingIngestion.length) {
    await sr.EmailIngestionSettings.create({
      ...DEMO_TAG,
      workspace_id,
      leads_inbox: "leads@apexgrowthpartners.com",
      sync_time: "08:00",
      keywords: "demo,saas,pipeline,inbound",
      confidence_threshold: 60,
      auto_create: true,
      lookback_window: "7",
      is_active: true,
      last_sync_at: daysAgo(0.1),
      last_sync_stats: JSON.stringify({ processed: 8, created: 4, skipped: 2, pending: 2 }),
    });
  }

  // ── Follow-up Reminders ───────────────────────────────────────
  await Promise.all([
    sr.FollowUpReminder.create({
      ...DEMO_TAG,
      workspace_id,
      lead_id: createdLeads[3].id,
      lead_name: createdLeads[3].name,
      lead_company: createdLeads[3].company,
      due_date: daysAgo(-1),
      status: "pending",
      reminder_type: "no_reply",
      days_since_contact: 5,
      user_email: user.email,
    }),
    sr.FollowUpReminder.create({
      ...DEMO_TAG,
      workspace_id,
      lead_id: createdLeads[1].id,
      lead_name: createdLeads[1].name,
      lead_company: createdLeads[1].company,
      due_date: daysAgo(0),
      status: "pending",
      reminder_type: "stale_interested",
      days_since_contact: 3,
      user_email: user.email,
    }),
    sr.FollowUpReminder.create({
      ...DEMO_TAG,
      workspace_id,
      lead_id: createdLeads[5].id,
      lead_name: createdLeads[5].name,
      lead_company: createdLeads[5].company,
      due_date: daysAgo(-2),
      status: "pending",
      reminder_type: "no_contact",
      days_since_contact: 0,
      user_email: user.email,
    }),
  ]);

  return {
    leads_created: createdLeads.length,
    campaigns_created: 3,
    email_logs_created: emailLogsData.length,
    ingestion_logs_created: ingestionLogsData.length,
    reminders_created: 3,
    intent_scores_created: intentData.length,
  };
}
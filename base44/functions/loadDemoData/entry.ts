import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * loadDemoData — BeaconIQ Demo / Sandbox Seeder
 * Seeds a full, realistic workspace across all entities.
 * Every record is tagged with is_demo: true and demo_batch for safe cleanup.
 * Action: "seed" | "clear"
 */

const DEMO_BATCH = "sample_workspace_v1";
const DEMO_TAG = { is_demo: true, demo_batch: DEMO_BATCH };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, workspace_id } = await req.json();
    if (!workspace_id) return Response.json({ error: 'workspace_id required' }, { status: 400 });

    // Verify workspace belongs to the authenticated user
    const userWorkspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 5);
    const workspace = userWorkspaces.find(w => w.id === workspace_id);
    if (!workspace) return Response.json({ error: 'Workspace not found or access denied' }, { status: 404 });

    if (action === 'clear') {
      await clearDemoData(base44, workspace_id);
      return Response.json({ success: true, message: 'Demo workspace cleared.' });
    }

    if (action === 'seed') {
      // Idempotency: check for existing demo leads by tag (use user-scoped so RLS passes)
      const existingLeads = await base44.entities.Lead.filter({ workspace_id, is_demo: true }, '-created_date', 1);
      if (existingLeads.length > 0) {
        return Response.json({ success: true, already_seeded: true, message: 'Demo data already loaded. Clear first to re-seed.' });
      }

      const result = await seedDemoData(base44, workspace_id, user);
      return Response.json({
        success: true,
        message: 'Demo workspace ready',
        counts: {
          leads: result.leads_created,
          campaigns: result.campaigns_created,
          prospects: result.prospects_created,
          intent_scores: result.intent_scores_created,
          ingestion_logs: result.ingestion_logs_created,
          reminders: result.reminders_created,
        },
        ...result,
      });
    }

    return Response.json({ error: 'Unsupported action. Use seed or clear.' }, { status: 400 });

  } catch (error) {
    console.error('[loadDemoData]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function clearDemoData(base44, workspace_id) {
  const e = base44.entities;
  const demoFilter = { workspace_id, is_demo: true };

  // Fetch all demo-tagged records across all entities
  const [leads, campaigns, emails, ingestionLogs, reminders, ingestionSettings,
         intentScores, icps, prospects, signals, contacts, runs, businessProfiles] = await Promise.all([
    e.Lead.filter(demoFilter, '-created_date', 500),
    e.Campaign.filter(demoFilter, '-created_date', 50),
    e.EmailLog.filter(demoFilter, '-created_date', 500),
    e.EmailIngestionLog.filter(demoFilter, '-created_date', 500),
    e.FollowUpReminder.filter(demoFilter, '-created_date', 500),
    e.EmailIngestionSettings.filter(demoFilter, '-created_date', 10),
    e.IntentScore.filter(demoFilter, '-created_date', 200),
    e.IdealCustomerProfile.filter(demoFilter, '-created_date', 20),
    e.Prospect.filter(demoFilter, '-created_date', 200),
    e.ProspectSignal.filter(demoFilter, '-created_date', 500),
    e.ProspectContact.filter(demoFilter, '-created_date', 500),
    e.DiscoveryRun.filter(demoFilter, '-created_date', 50),
    e.BusinessProfile.filter(demoFilter, '-created_date', 10),
  ]);

  const deleteAll = (entity, items) =>
    Promise.all(items.map(i => e[entity].delete(i.id).catch(() => {})));

  await Promise.all([
    deleteAll('Lead', leads),
    deleteAll('Campaign', campaigns),
    deleteAll('EmailLog', emails),
    deleteAll('EmailIngestionLog', ingestionLogs),
    deleteAll('FollowUpReminder', reminders),
    deleteAll('EmailIngestionSettings', ingestionSettings),
    deleteAll('IntentScore', intentScores),
    deleteAll('IdealCustomerProfile', icps),
    deleteAll('Prospect', prospects),
    deleteAll('ProspectSignal', signals),
    deleteAll('ProspectContact', contacts),
    deleteAll('DiscoveryRun', runs),
    deleteAll('BusinessProfile', businessProfiles),
  ]);
}

async function seedDemoData(base44, workspace_id, user) {
  const sr = base44.entities;
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString();

  // ── Business Profile ──────────────────────────────────────────
  const existingProfiles = await sr.BusinessProfile.filter({ workspace_id }, '-created_date', 1);
  if (!existingProfiles.length) {
    await sr.BusinessProfile.create({
      ...DEMO_TAG,
      workspace_id,
      business_name: "Apex Growth Partners",
      description: "We help B2B SaaS companies and marketing agencies scale their outbound pipeline using AI-driven lead intelligence and hyper-personalized email sequences.",
      industry: "Marketing Agency",
      target_audience: "B2B SaaS founders, VP Sales at 50-500 person companies, growth-stage startups post-Series A",
      products_services: "AI outreach sequences, lead enrichment, prospect discovery, pipeline acceleration",
      tone: "Professional",
      sales_goal: "Book a Meeting",
      website: "https://apexgrowthpartners.com",
      onboarding_complete: true,
    });
  }

  // ── Campaigns ─────────────────────────────────────────────────
  const [campQ1, campOutbound, campNurture] = await Promise.all([
    sr.Campaign.create({
      ...DEMO_TAG,
      workspace_id,
      name: "Q1 SaaS Outreach",
      description: "Campaign for Q1 SaaS targets",
      status: "Active",
      total_leads: 18,
      total_sent: 34,
      total_replied: 7,
      total_opened: 22,
      steps: [
        { day: 0, subject_template: "Quick question about {{company}}'s pipeline", message_template: "Hi {{name}}, noticed {{company}} recently..." },
        { day: 3, subject_template: "Re: Quick question", message_template: "Just circling back..." },
        { day: 7, subject_template: "Last check-in", message_template: "Didn't want this to slip through..." },
      ],
    }),
    sr.Campaign.create({
      ...DEMO_TAG,
      workspace_id,
      name: "Fintech Series B Targets",
      description: "Outbound to post-Series B fintech",
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
      name: "Re-Engagement: Cold Leads",
      description: "Nurture sequence for cold leads",
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
    { name: "Sarah Chen", email: "sarah.chen@prism.io", company: "Prism Analytics", title: "VP of Marketing", industry: "SaaS", status: "Meeting Booked", priority: "High", campaign_id: campQ1.id, total_emails_sent: 3, last_contacted: daysAgo(1) },
    { name: "Marcus Webb", email: "m.webb@dataloop.ai", company: "DataLoop AI", title: "Co-Founder & CEO", industry: "SaaS", status: "Interested", priority: "High", campaign_id: campQ1.id, total_emails_sent: 2, last_contacted: daysAgo(2) },
    { name: "Priya Nair", email: "priya@scalepath.com", company: "ScalePath", title: "Head of Growth", industry: "Marketing Agency", status: "Replied", priority: "High", campaign_id: campQ1.id, total_emails_sent: 1, last_contacted: daysAgo(3) },
    { name: "Jordan Ellis", email: "jellis@tradestack.io", company: "TradeStack", title: "CTO", industry: "Fintech", status: "Contacted", priority: "Medium", campaign_id: campOutbound.id, total_emails_sent: 1, last_contacted: daysAgo(5) },
    { name: "Alicia Montoya", email: "alicia@vaultworks.com", company: "VaultWorks", title: "Director of Revenue", industry: "SaaS", status: "Contacted", priority: "Medium", campaign_id: campOutbound.id, total_emails_sent: 2, last_contacted: daysAgo(4) },
    { name: "Tom Bradbury", email: "t.bradbury@cloverfield.co", company: "Cloverfield Media", title: "Head of Sales", industry: "Consulting", status: "New", priority: "Medium", campaign_id: campQ1.id, total_emails_sent: 0 },
    { name: "Nina Patel", email: "nina@clearstride.com", company: "ClearStride", title: "CEO", industry: "SaaS", status: "New", priority: "High", campaign_id: campQ1.id, total_emails_sent: 0 },
    { name: "Derek Huang", email: "derek.huang@finvault.io", company: "FinVault", title: "VP Engineering", industry: "Fintech", status: "Replied", priority: "Low", campaign_id: campOutbound.id, total_emails_sent: 2, last_contacted: daysAgo(6) },
    { name: "Camille Dupont", email: "c.dupont@lumino.fr", company: "Lumino", title: "CMO", industry: "E-commerce", status: "Unresponsive", priority: "Low", campaign_id: campNurture.id, total_emails_sent: 3, last_contacted: daysAgo(14) },
    { name: "Ben Richards", email: "ben@stackpulse.dev", company: "StackPulse", title: "Head of Growth", industry: "SaaS", status: "Closed", priority: "High", campaign_id: campQ1.id, total_emails_sent: 5, last_contacted: daysAgo(7) },
  ];

  const createdLeads = await Promise.all(
    leadsData.map(l => sr.Lead.create({
      ...DEMO_TAG,
      ...l,
      workspace_id,
      source: "Email Ingestion",
      notes: "Discovered via BeaconIQ inbox monitor.",
    }))
  );

  // ── Intent Scores ─────────────────────────────────────────────
  const intentData = [
    { lead: createdLeads[0], score: 91, urgency: "Immediate", pain: "Struggling to scale outbound without burning SDRs", signals: "Visited pricing page 3x, replied within 4 hours" },
    { lead: createdLeads[1], score: 84, urgency: "High", pain: "No repeatable outbound process post-Series A", signals: "Hiring 2 AEs, referenced competitor in reply" },
    { lead: createdLeads[2], score: 78, urgency: "High", pain: "Agency clients demanding faster lead gen results", signals: "Asked for case studies, replied same day" },
    { lead: createdLeads[3], score: 72, urgency: "Medium", pain: "Engineering-heavy team lacks sales process", signals: "Opened email 4x, clicked link once" },
    { lead: createdLeads[4], score: 65, urgency: "Medium", pain: "Fragmented CRM and no AI enrichment", signals: "Opened twice, no reply yet" },
    { lead: createdLeads[6], score: 70, urgency: "Medium", pain: "CEO looking to build sales motion from scratch", signals: "Direct inbound, high authority" },
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
      scoring_rationale: `AI scored ${score}/100 based on behavioral signals and email engagement.`,
      scored_at: daysAgo(1),
      source_text: "Analyzed from inbound email.",
    })
  ));

  // ── Email Logs ────────────────────────────────────────────────
  const emailLogsData = [
    { lead: createdLeads[0], subject: "Re: Scaling your outbound pipeline at Prism", body: "Hi Sarah, great connecting earlier this week — excited to demo next Tuesday.", status: "Replied", sent_at: daysAgo(2) },
    { lead: createdLeads[1], subject: "Quick question about DataLoop's pipeline", body: "Hi Marcus, saw your Series A announcement — congrats!", status: "Opened", sent_at: daysAgo(3) },
    { lead: createdLeads[2], subject: "ScalePath x Apex — partnership opportunity", body: "Hi Priya, we work with 3 agencies in your space...", status: "Replied", sent_at: daysAgo(3) },
    { lead: createdLeads[3], subject: "TradeStack's growth motion", body: "Hi Jordan, noticed TradeStack is hiring enterprise AEs...", status: "Sent", sent_at: daysAgo(5) },
    { lead: createdLeads[4], subject: "Helping VaultWorks hit Q2 pipeline targets", body: "Hi Alicia, your RevOps role posting caught my eye...", status: "Opened", sent_at: daysAgo(4) },
    { lead: createdLeads[7], subject: "FinVault — inbound lead intelligence", body: "Hi Derek, love what you're building at FinVault...", status: "Sent", sent_at: daysAgo(6) },
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
    { name: "Sarah Chen", email: "sarah.chen@prism.io", subject: "Interested in learning more", result: "lead_created", conf: 92, company: "Prism Analytics", preview: "Hi, I found your agency through a LinkedIn post..." },
    { name: "Marcus Webb", email: "m.webb@dataloop.ai", subject: "Re: Scaling outbound at DataLoop", result: "lead_created", conf: 88, company: "DataLoop AI", preview: "We're post-Series A and need a repeatable process..." },
    { name: "Anonymous", email: "info@techblog.co", subject: "Newsletter subscription", result: "skipped", conf: 12, company: "", preview: "You're subscribed to TechPulse Weekly..." },
    { name: "Priya Nair", email: "priya@scalepath.com", subject: "Agency partnership inquiry", result: "lead_created", conf: 81, company: "ScalePath", preview: "We run paid media for 30+ SaaS clients..." },
    { name: "Potential Lead", email: "contact@buildit.io", subject: "Question about your services", result: "pending_review", conf: 58, company: "BuildIt", preview: "Came across BeaconIQ and curious how it works for..." },
    { name: "Derek Huang", email: "derek.huang@finvault.io", subject: "Exploring sales tooling options", result: "lead_created", conf: 74, company: "FinVault", preview: "Our team is evaluating several tools this quarter..." },
    { name: "Unsubscribe Request", email: "noreply@marketing.co", subject: "Please remove me", result: "skipped", conf: 5, company: "", preview: "Please unsubscribe me from all communications..." },
    { name: "Nina Patel", email: "nina@clearstride.com", subject: "Looking for outbound partner", result: "pending_review", conf: 63, company: "ClearStride", preview: "We're a 45-person SaaS company trying to build..." },
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
      received_at: daysAgo(i * 0.8 + 0.5),
      processed_at: daysAgo(i * 0.8),
      result,
      confidence_score: conf,
      ai_summary: result !== 'skipped' ? `AI identified this as a ${result === 'lead_created' ? 'high-value' : 'medium-value'} B2B lead.` : 'Non-lead automated email.',
      extracted_name: name,
      extracted_email: email,
      extracted_company: company,
    })
  ));

  // ── Email Ingestion Settings ──────────────────────────────────
  const existingIngestion = await sr.EmailIngestionSettings.filter({ workspace_id }, '-created_date', 1);
  if (!existingIngestion.length) {
    await sr.EmailIngestionSettings.create({
      ...DEMO_TAG,
      workspace_id,
      leads_inbox: "leads@apexgrowthpartners.com",
      sync_time: "08:00",
      keywords: "demo,saas,pipeline,outbound",
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

  // ── ICP Profile ───────────────────────────────────────────────
  const icp = await sr.IdealCustomerProfile.create({
    ...DEMO_TAG,
    workspace_id,
    name: "[Demo] B2B SaaS Growth Companies",
    industries: JSON.stringify(["SaaS", "Technology", "Fintech"]),
    company_size_min: 30,
    company_size_max: 600,
    locations: JSON.stringify(["United States", "Canada", "United Kingdom"]),
    target_roles: JSON.stringify(["CEO", "VP Sales", "Head of Growth", "Co-Founder"]),
    keywords: JSON.stringify(["series a", "series b", "hiring", "scale", "growth", "pipeline"]),
    negative_keywords: JSON.stringify(["student", "nonprofit", "government"]),
    signals_enabled: JSON.stringify(["funding", "hiring", "product_launch", "leadership_change"]),
    is_active: true,
  });

  // ── Discovery Run ─────────────────────────────────────────────
  const run = await sr.DiscoveryRun.create({
    ...DEMO_TAG,
    workspace_id,
    icp_id: icp.id,
    icp_name: icp.name,
    run_status: "completed",
    run_started_at: daysAgo(1),
    run_finished_at: daysAgo(0.95),
    prospects_found: 5,
    notes: "Demo run — AI-generated prospects",
  });

  // ── Prospects + Signals + Contacts ───────────────────────────
  const prospectsData = [
    {
      company_name: "Nucleus HQ", domain: "nucleushq.com", website: "https://nucleushq.com",
      industry: "SaaS", employee_count: 87, revenue_range: "$4M-$12M ARR", location: "San Francisco, CA",
      fit_score: 91, timing_score: 88, opportunity_score: 90,
      ai_summary: "Nucleus HQ just closed a $6M Series A and is aggressively hiring SDRs. Their LinkedIn shows 4 open sales roles — classic buying signal for outbound tooling.",
      recommended_angle: "Congratulate on Series A and pitch pipeline acceleration during their hiring surge.",
      signals: [
        { type: "funding", title: "Closed $6M Series A", desc: "Led by Sequoia, announced 3 weeks ago.", strength: 92 },
        { type: "hiring", title: "4 Open SDR Roles", desc: "Actively hiring sales development reps on LinkedIn.", strength: 85 },
      ],
      contacts: [{ name: "Alex Torres", title: "VP of Sales", email: "a.torres@nucleushq.com", seniority: 85, dm_likelihood: 88 }],
    },
    {
      company_name: "Streamline Ops", domain: "streamlineops.io", website: "https://streamlineops.io",
      industry: "SaaS", employee_count: 142, revenue_range: "$8M-$25M ARR", location: "Austin, TX",
      fit_score: 85, timing_score: 81, opportunity_score: 83,
      ai_summary: "Streamline Ops recently replaced their CRO and is rebuilding their go-to-market strategy. New leadership = new budget authority = high openness to switching tools.",
      recommended_angle: "Lead with the leadership change angle — new CRO often re-evaluates existing vendors.",
      signals: [
        { type: "leadership_change", title: "New Chief Revenue Officer", desc: "Jake Morrison joined as CRO from Salesforce 6 weeks ago.", strength: 88 },
        { type: "product_launch", title: "Launched Enterprise Tier", desc: "New enterprise product line announced at SaaStr.", strength: 74 },
      ],
      contacts: [
        { name: "Jake Morrison", title: "Chief Revenue Officer", email: "jake.morrison@streamlineops.io", seniority: 90, dm_likelihood: 93 },
        { name: "Rachel Kim", title: "Head of RevOps", email: "r.kim@streamlineops.io", seniority: 75, dm_likelihood: 70 },
      ],
    },
    {
      company_name: "Ironclad Labs", domain: "ironcladlabs.co", website: "https://ironcladlabs.co",
      industry: "Fintech", employee_count: 55, revenue_range: "$2M-$7M ARR", location: "New York, NY",
      fit_score: 79, timing_score: 85, opportunity_score: 82,
      ai_summary: "Ironclad Labs is in rapid growth mode post-product-market fit. Their pricing page has been visited by our tracked signal sources — showing intent to invest in their stack.",
      recommended_angle: "Reference their pricing activity and pitch your ROI story with a similar-sized fintech.",
      signals: [
        { type: "pricing_page", title: "High Pricing Intent Signal", desc: "Multiple decision-makers visited pricing tier comparison.", strength: 82 },
        { type: "hiring", title: "Hiring VP of Marketing", desc: "Posted VP Marketing role — scaling go-to-market.", strength: 78 },
      ],
      contacts: [{ name: "Mia Strauss", title: "CEO", email: "mia@ironcladlabs.co", seniority: 95, dm_likelihood: 91 }],
    },
    {
      company_name: "Velo Commerce", domain: "velocommerce.com", website: "https://velocommerce.com",
      industry: "SaaS", employee_count: 210, revenue_range: "$15M-$40M ARR", location: "London, UK",
      fit_score: 82, timing_score: 72, opportunity_score: 77,
      ai_summary: "Velo Commerce is expanding into US markets and their public roadmap mentions building an outbound sales function from scratch. Perfect timing.",
      recommended_angle: "Pitch as the infrastructure for their US outbound motion — offer a US-focused agency partnership.",
      signals: [
        { type: "news", title: "US Market Expansion Announced", desc: "Blog post: 'Velo Commerce is coming to North America'.", strength: 80 },
        { type: "hiring", title: "Hiring US-Based AEs", desc: "3 US-based Account Executive roles posted this month.", strength: 76 },
      ],
      contacts: [{ name: "Oliver Grant", title: "VP Global Sales", email: "o.grant@velocommerce.com", seniority: 88, dm_likelihood: 85 }],
    },
    {
      company_name: "Clearpath AI", domain: "clearpath.ai", website: "https://clearpath.ai",
      industry: "Technology", employee_count: 38, revenue_range: "$1M-$4M ARR", location: "Toronto, Canada",
      fit_score: 74, timing_score: 79, opportunity_score: 77,
      ai_summary: "Clearpath AI is a fast-growing AI startup that recently shipped a new product and is pushing to build a sales pipeline. Lean team, founder-led sales — ideal BeaconIQ candidate.",
      recommended_angle: "Founder-led sales angle: BeaconIQ will save the CEO 10 hours per week on outbound.",
      signals: [
        { type: "product_launch", title: "Launched ClearPath 2.0", desc: "Major product update with enterprise features.", strength: 79 },
        { type: "tech_stack", title: "Adopted HubSpot CRM", desc: "Job listings reference HubSpot — they're building a sales stack.", strength: 71 },
      ],
      contacts: [{ name: "Sandeep Malhotra", title: "Co-Founder & CEO", email: "sand@clearpath.ai", seniority: 92, dm_likelihood: 90 }],
    },
  ];

  for (const pd of prospectsData) {
    const prospect = await sr.Prospect.create({
      ...DEMO_TAG,
      workspace_id,
      company_name: pd.company_name,
      domain: pd.domain,
      website: pd.website,
      industry: pd.industry,
      employee_count: pd.employee_count,
      revenue_range: pd.revenue_range,
      location: pd.location,
      source: "AI Discovery",
      status: "New",
      fit_score: pd.fit_score,
      timing_score: pd.timing_score,
      opportunity_score: pd.opportunity_score,
      ai_summary: pd.ai_summary,
      recommended_angle: pd.recommended_angle,
      icp_id: icp.id,
      discovery_run_id: run.id,
    });

    await Promise.all([
      ...pd.signals.map((s, i) =>
        sr.ProspectSignal.create({
          ...DEMO_TAG,
          workspace_id,
          prospect_id: prospect.id,
          signal_type: s.type,
          signal_title: s.title,
          signal_description: s.desc,
          signal_date: daysAgo(i * 4 + 1),
          strength_score: s.strength,
        })
      ),
      ...pd.contacts.map(c =>
        sr.ProspectContact.create({
          ...DEMO_TAG,
          workspace_id,
          prospect_id: prospect.id,
          name: c.name,
          title: c.title,
          email: c.email,
          seniority_score: c.seniority,
          decision_maker_likelihood: c.dm_likelihood,
        })
      ),
    ]);
  }

  return {
    leads_created: createdLeads.length,
    campaigns_created: 3,
    prospects_created: prospectsData.length,
    ingestion_logs_created: ingestionLogsData.length,
    reminders_created: 3,
    intent_scores_created: intentData.length,
  };
}
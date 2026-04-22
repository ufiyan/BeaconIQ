import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * runProspectDiscovery — BeaconIQ Prospect Discovery Engine
 *
 * Architecture:
 * - Uses an adapter pattern so real signal sources (Crunchbase, LinkedIn, Apollo, etc.)
 *   can be plugged in as drop-in adapters when API keys are configured.
 * - For MVP: uses AI to generate realistic prospect data based on the ICP.
 * - Scoring: deterministic weighted model (fit + timing → opportunity).
 * - Future: replace mockAdapter with fundingAdapter, hiringAdapter, newsAdapter, etc.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { icp_id, workspace_id } = body;
    if (!icp_id || !workspace_id) return Response.json({ error: 'icp_id and workspace_id are required' }, { status: 400 });

    // --- Authorization: verify the authenticated user actually owns this workspace ---
    // We use the user-scoped client (RLS enforced) AND additionally verify owner_user_id,
    // so a client cannot trigger discovery for a workspace they do not own by guessing an ID.
    const ownedWorkspaces = await base44.entities.Workspace.filter(
      { owner_user_id: user.id },
      '-created_date',
      200
    ).catch(() => []);
    const workspace = ownedWorkspaces.find(w => w.id === workspace_id);
    if (!workspace || workspace.owner_user_id !== user.id) {
      return Response.json(
        { error: 'You are not authorized to run discovery for this workspace.' },
        { status: 403 }
      );
    }

    // Load ICP scoped to the verified workspace — user-scoped client, RLS enforced.
    const icpList = await base44.entities.IdealCustomerProfile.filter(
      { workspace_id },
      '-created_date',
      200
    ).catch(() => []);
    const icp = icpList.find(i => i.id === icp_id);
    if (!icp) return Response.json({ error: 'ICP not found' }, { status: 404 });

    // Create a discovery run record
    const run = await base44.entities.DiscoveryRun.create({
      workspace_id,
      icp_id,
      icp_name: icp.name,
      run_status: 'running',
      run_started_at: new Date().toISOString(),
      prospects_found: 0,
    });

    const runId = run.id;

    try {
      // Parse ICP fields
      const industries = safeParseJson(icp.industries, ['SaaS', 'Technology', 'Marketing']);
      const locations = safeParseJson(icp.locations, ['United States', 'Canada', 'United Kingdom']);
      const keywords = safeParseJson(icp.keywords, ['growth', 'scale', 'enterprise']);
      const signals = safeParseJson(icp.signals_enabled, ['funding', 'hiring', 'product_launch']);
      const sizeMin = icp.company_size_min || 50;
      const sizeMax = icp.company_size_max || 500;

      // --- SIGNAL ADAPTER PATTERN ---
      // MVP: AI-powered mock adapter that generates realistic prospects
      // Future: replace with real adapters per signal type
      // e.g. fundingAdapter (Crunchbase), hiringAdapter (LinkedIn/Indeed), newsAdapter (Google News API)
      console.log(`[runProspectDiscovery] Running AI discovery for ICP: ${icp.name}`);
      const prospectData = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are BeaconIQ's Prospect Discovery AI. Generate 8 realistic B2B prospect companies that match this Ideal Customer Profile. Make them feel like real companies with authentic signal data.

ICP Name: ${icp.name}
Target Industries: ${industries.join(', ')}
Company Size: ${sizeMin}-${sizeMax} employees
Target Locations: ${locations.join(', ')}
Keywords: ${keywords.join(', ')}
Signals to track: ${signals.join(', ')}

Return a JSON object with key "prospects" containing an array of 8 objects. Each prospect object must have:
- company_name: string (realistic company name)
- website: string (realistic domain like https://company.com)
- domain: string (just the domain like company.com)
- industry: string (from target industries)
- employee_count: number (between ${sizeMin} and ${sizeMax})
- revenue_range: string (e.g. "$5M-$20M ARR")
- location: string (from target locations)
- ai_summary: string (2-3 sentences on why this company is a good prospect RIGHT NOW)
- recommended_angle: string (specific outreach hook based on their signals)
- signals: array of 2-3 signal objects, each with: signal_type (one of: ${signals.join(', ')}), signal_title (string), signal_description (string), signal_date (ISO date string within last 30 days), strength_score (number 60-95)
- contacts: array of 1-2 contact objects, each with: name (string), title (string), email (string, realistic), seniority_score (number 60-90), decision_maker_likelihood (number 50-90)`,
        response_json_schema: {
          type: 'object',
          properties: {
            prospects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  company_name: { type: 'string' },
                  website: { type: 'string' },
                  domain: { type: 'string' },
                  industry: { type: 'string' },
                  employee_count: { type: 'number' },
                  revenue_range: { type: 'string' },
                  location: { type: 'string' },
                  ai_summary: { type: 'string' },
                  recommended_angle: { type: 'string' },
                  signals: { type: 'array', items: { type: 'object' } },
                  contacts: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        }
      });

      const rawProspects = prospectData?.prospects || [];
      let prospectsCreated = 0;

      for (const p of rawProspects) {
        // Check for duplicate by domain
        const existing = await base44.asServiceRole.entities.Prospect.filter({ workspace_id, domain: p.domain }, '-created_date', 1);
        if (existing.length) {
          console.log(`[runProspectDiscovery] Skipping duplicate domain: ${p.domain}`);
          continue;
        }

        // Deterministic scoring model
        const fitScore = calculateFitScore(p, icp, industries, sizeMin, sizeMax, locations);
        const timingScore = calculateTimingScore(p.signals || []);
        const opportunityScore = Math.round(fitScore * 0.45 + timingScore * 0.55);

        // Persist prospect
        const prospect = await base44.entities.Prospect.create({
          workspace_id,
          company_name: p.company_name,
          website: p.website,
          domain: p.domain,
          industry: p.industry,
          employee_count: p.employee_count,
          revenue_range: p.revenue_range,
          location: p.location,
          source: 'AI Discovery',
          status: 'New',
          fit_score: fitScore,
          timing_score: timingScore,
          opportunity_score: opportunityScore,
          ai_summary: p.ai_summary,
          recommended_angle: p.recommended_angle,
          icp_id,
          discovery_run_id: runId,
        });

        // Persist signals
        for (const sig of (p.signals || [])) {
          await base44.entities.ProspectSignal.create({
            workspace_id,
            prospect_id: prospect.id,
            signal_type: sig.signal_type || 'news',
            signal_title: sig.signal_title || 'Signal detected',
            signal_description: sig.signal_description || '',
            signal_date: sig.signal_date || new Date().toISOString(),
            strength_score: sig.strength_score || 70,
          });
        }

        // Persist contacts
        for (const contact of (p.contacts || [])) {
          await base44.entities.ProspectContact.create({
            workspace_id,
            prospect_id: prospect.id,
            name: contact.name || 'Unknown',
            title: contact.title || '',
            email: contact.email || '',
            seniority_score: contact.seniority_score || 60,
            decision_maker_likelihood: contact.decision_maker_likelihood || 60,
          });
        }

        prospectsCreated++;
      }

      // Update run as completed
      await base44.entities.DiscoveryRun.update(runId, {
        run_status: 'completed',
        run_finished_at: new Date().toISOString(),
        prospects_found: prospectsCreated,
      });

      return Response.json({ success: true, run_id: runId, prospects_found: prospectsCreated });

    } catch (innerErr) {
      await base44.entities.DiscoveryRun.update(runId, {
        run_status: 'failed',
        run_finished_at: new Date().toISOString(),
        notes: innerErr.message,
      });
      throw innerErr;
    }

  } catch (error) {
    console.error('[runProspectDiscovery] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// --- Scoring Helpers ---

function safeParseJson(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch (_) { return fallback; }
}

function calculateFitScore(prospect, icp, industries, sizeMin, sizeMax, locations) {
  let score = 50; // base

  // Industry match
  if (industries.some(ind => prospect.industry?.toLowerCase().includes(ind.toLowerCase()))) score += 25;

  // Size match
  const emp = prospect.employee_count || 0;
  if (emp >= sizeMin && emp <= sizeMax) score += 15;
  else if (emp >= sizeMin * 0.5 && emp <= sizeMax * 1.5) score += 7;

  // Location match
  if (locations.some(loc => prospect.location?.toLowerCase().includes(loc.toLowerCase()))) score += 10;

  return Math.min(100, score);
}

function calculateTimingScore(signals) {
  if (!signals.length) return 30;
  const now = Date.now();
  let total = 0;
  for (const sig of signals) {
    const ageMs = now - new Date(sig.signal_date || now).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyBoost = ageDays < 7 ? 1.2 : ageDays < 14 ? 1.1 : ageDays < 30 ? 1.0 : 0.8;
    total += (sig.strength_score || 70) * recencyBoost;
  }
  return Math.min(100, Math.round(total / signals.length));
}
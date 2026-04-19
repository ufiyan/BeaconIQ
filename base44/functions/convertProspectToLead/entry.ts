import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * convertProspectToLead — BeaconIQ Prospect → Lead conversion
 * Checks for duplicates by domain/email, carries over signals + AI summary,
 * and marks the prospect as Converted.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prospect_id } = await req.json();
    if (!prospect_id) return Response.json({ error: 'prospect_id is required' }, { status: 400 });

    // Load prospect
    const prospects = await base44.asServiceRole.entities.Prospect.filter({ id: prospect_id }, '-created_date', 1);
    if (!prospects.length) return Response.json({ error: 'Prospect not found' }, { status: 404 });
    const prospect = prospects[0];

    // Validate workspace
    const workspaces = await base44.asServiceRole.entities.Workspace.filter({ id: prospect.workspace_id }, '-created_date', 1);
    if (!workspaces.length || workspaces[0].owner_user_id !== user.id) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Duplicate check: domain
    if (prospect.domain) {
      const existing = await base44.asServiceRole.entities.Lead.filter({ workspace_id: prospect.workspace_id }, '-created_date', 500);
      const domainMatch = existing.find(l => l.email?.toLowerCase().includes(prospect.domain?.toLowerCase()));
      if (domainMatch) {
        return Response.json({ duplicate: true, lead_id: domainMatch.id, message: `A lead with domain ${prospect.domain} already exists` });
      }
    }

    // Load best contact
    const contacts = await base44.asServiceRole.entities.ProspectContact.filter({ prospect_id }, '-created_date', 10);
    contacts.sort((a, b) => (b.decision_maker_likelihood || 0) - (a.decision_maker_likelihood || 0));
    const bestContact = contacts[0] || null;

    // Load top signals for notes
    const signals = await base44.asServiceRole.entities.ProspectSignal.filter({ prospect_id }, '-signal_date', 10);
    const signalSummary = signals.slice(0, 3).map(s => `• ${s.signal_title}: ${s.signal_description}`).join('\n');

    const notes = [
      prospect.ai_summary ? `AI Summary: ${prospect.ai_summary}` : '',
      prospect.recommended_angle ? `Recommended Angle: ${prospect.recommended_angle}` : '',
      signalSummary ? `Recent Signals:\n${signalSummary}` : '',
    ].filter(Boolean).join('\n\n');

    const customFields = JSON.stringify({
      fit_score: prospect.fit_score,
      timing_score: prospect.timing_score,
      opportunity_score: prospect.opportunity_score,
      prospect_id: prospect.id,
      revenue_range: prospect.revenue_range,
    });

    // Create Lead
    const lead = await base44.entities.Lead.create({
      workspace_id: prospect.workspace_id,
      name: bestContact?.name || prospect.company_name,
      email: bestContact?.email || `contact@${prospect.domain || 'unknown.com'}`,
      company: prospect.company_name,
      title: bestContact?.title || '',
      industry: prospect.industry,
      linkedin_url: bestContact?.linkedin_url || prospect.linkedin_url || '',
      source: 'Prospect Discovery',
      status: 'New',
      priority: prospect.opportunity_score >= 75 ? 'High' : prospect.opportunity_score >= 50 ? 'Medium' : 'Low',
      notes,
      custom_fields: customFields,
    });

    // Mark prospect as Converted
    await base44.entities.Prospect.update(prospect_id, { status: 'Converted' });

    return Response.json({ success: true, lead_id: lead.id });

  } catch (error) {
    console.error('[convertProspectToLead] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
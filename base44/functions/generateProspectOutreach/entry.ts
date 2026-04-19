import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * generateProspectOutreach — AI email generation from prospect discovery context
 * Extends BeaconIQ's existing email generation to use prospect signals + recommended angle.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prospect_id } = await req.json();
    if (!prospect_id) return Response.json({ error: 'prospect_id is required' }, { status: 400 });

    // Load prospect + related data
    const prospects = await base44.asServiceRole.entities.Prospect.filter({ id: prospect_id }, '-created_date', 1);
    if (!prospects.length) return Response.json({ error: 'Prospect not found' }, { status: 404 });
    const prospect = prospects[0];

    const [signals, contacts, profiles] = await Promise.all([
      base44.asServiceRole.entities.ProspectSignal.filter({ prospect_id }, '-signal_date', 5),
      base44.asServiceRole.entities.ProspectContact.filter({ prospect_id }, '-created_date', 5),
      base44.asServiceRole.entities.BusinessProfile.filter({ created_by: user.email }, '-created_date', 1),
    ]);

    contacts.sort((a, b) => (b.decision_maker_likelihood || 0) - (a.decision_maker_likelihood || 0));
    const bestContact = contacts[0];
    const profile = profiles[0];

    const businessContext = profile
      ? `Sender business: ${profile.business_name}. ${profile.description}. Tone: ${profile.tone}. Goal: ${profile.sales_goal}.`
      : 'A professional B2B company.';

    const signalContext = signals.map(s => `- ${s.signal_title} (${s.signal_type}): ${s.signal_description}`).join('\n');

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are BeaconIQ's outbound AI copywriter. Write a highly personalized cold outreach email based on REAL buying signals.

${businessContext}

Target Company: ${prospect.company_name}
Industry: ${prospect.industry || 'Unknown'}
Location: ${prospect.location || 'Unknown'}
Size: ${prospect.employee_count || 'Unknown'} employees

Contact Name: ${bestContact?.name || 'Decision Maker'}
Contact Title: ${bestContact?.title || 'Unknown'}

AI Summary (why they're interesting): ${prospect.ai_summary || ''}
Recommended Outreach Angle: ${prospect.recommended_angle || ''}

Recent Buying Signals:
${signalContext || 'General market signals detected'}

INSTRUCTIONS:
1. Reference 1-2 specific signals naturally in the email — make it feel timely and relevant
2. Use the recommended angle as your hook
3. Keep it under 120 words
4. Sound human, not robotic
5. End with a clear, low-friction CTA

Return JSON with "subject" (string) and "body" (string).`,
      response_json_schema: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          body: { type: 'string' }
        },
        required: ['subject', 'body']
      }
    });

    return Response.json({ success: true, subject: result.subject, body: result.body, contact: bestContact });

  } catch (error) {
    console.error('[generateProspectOutreach] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
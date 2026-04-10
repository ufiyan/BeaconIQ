import { base44 } from "@/api/base44Client";

const SCORING_PROMPT = `You are BeaconIQ's intent scoring engine. Analyze the following text from a potential B2B lead and extract their buying intent. Return ONLY a valid JSON object with these exact fields:

intent_score: integer 0-100 (100 = ready to buy immediately, 0 = no intent detected)
urgency_level: one of 'Immediate', 'High', 'Medium', 'Low'
  - Immediate: mentions deadline, 'ASAP', 'this week', 'budget approved', 'comparing vendors now'
  - High: clear problem stated, timeline within a quarter, decision-maker language
  - Medium: interest shown but no clear timeline
  - Low: vague inquiry, just browsing, no pain point stated

decision_authority: one of 'High', 'Medium', 'Low'
  - High: CEO, Founder, Director, VP, C-suite, or phrases like 'I can move forward', 'I make this decision'
  - Medium: Manager, Team Lead, or phrases like 'I need to check with my team'
  - Low: unclear role, junior title, or phrases like 'looking into options for my boss'

pain_point: extract the specific problem or need they mentioned in 1 sentence. If none stated, return null
urgency_signals: list up to 3 exact phrases from the text that signal urgency or intent. Return as a comma-separated string. If none, return null
scoring_rationale: one sentence explaining the score

Return only the JSON, no other text.`;

export async function scoreLeadIntent(leadId, sourceText) {
  if (!sourceText || sourceText.trim().length < 10) return null;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `${SCORING_PROMPT}\n\nText to analyze:\n${sourceText}`,
    response_json_schema: {
      type: "object",
      properties: {
        intent_score: { type: "number" },
        urgency_level: { type: "string" },
        decision_authority: { type: "string" },
        pain_point: { type: "string" },
        urgency_signals: { type: "string" },
        scoring_rationale: { type: "string" }
      },
      required: ["intent_score", "urgency_level", "decision_authority"]
    }
  });

  const score = result.intent_score ?? 0;

  // Derive priority from score
  const priority = score >= 80 ? "High" : score >= 50 ? "Medium" : "Low";

  // Delete old scores for this lead, then create new one
  const existing = await base44.entities.IntentScore.filter({ lead_id: leadId });
  for (const old of existing) {
    await base44.entities.IntentScore.delete(old.id);
  }

  const intentScore = await base44.entities.IntentScore.create({
    lead_id: leadId,
    intent_score: score,
    urgency_level: result.urgency_level || "Low",
    decision_authority: result.decision_authority || "Low",
    pain_point: result.pain_point || null,
    urgency_signals: result.urgency_signals || null,
    scoring_rationale: result.scoring_rationale || null,
    scored_at: new Date().toISOString(),
    source_text: sourceText.slice(0, 2000)
  });

  // Auto-update lead priority
  await base44.entities.Lead.update(leadId, { priority });

  return intentScore;
}
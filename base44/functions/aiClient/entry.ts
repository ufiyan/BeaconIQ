/**
 * getAIClient(workspace, base44)
 *
 * Returns an `invokeLLM(prompt, responseJsonSchema)` function scoped to the
 * workspace's AI configuration.
 *
 * Priority:
 *   1. workspace.ai_api_key is set → call the provider's API directly using the
 *      tenant's own key and model.
 *   2. Otherwise → fall back to the platform default (base44.integrations.Core.InvokeLLM).
 *
 * Supported providers: "openai" (default model: gpt-4o-mini),
 *                       "anthropic" (default model: claude-3-5-sonnet-20241022),
 *                       "base44" / anything else → platform default.
 */

async function callOpenAI(apiKey, model, prompt, responseJsonSchema) {
  const messages = [{ role: 'user', content: prompt }];
  const body = { model, messages };

  if (responseJsonSchema) {
    // Use OpenAI structured outputs (strict JSON-schema mode) when a schema
    // is provided. This is dramatically more reliable than `json_object` +
    // prompt-injected schema and is supported on all gpt-4o-* models.
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'beaconiq_response',
        schema: responseJsonSchema,
        strict: false,
      },
    };
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[aiClient/openai] API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  if (responseJsonSchema) {
    return JSON.parse(content);
  }
  return content;
}

async function callAnthropic(apiKey, model, prompt, responseJsonSchema) {
  let userPrompt = prompt;
  if (responseJsonSchema) {
    userPrompt += `\n\nRespond with a valid JSON object matching this schema: ${JSON.stringify(responseJsonSchema)}`;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[aiClient/anthropic] API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text || '';
  if (responseJsonSchema) {
    // Extract JSON from response (may have surrounding text)
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('[aiClient/anthropic] No JSON found in response');
    return JSON.parse(match[0]);
  }
  return content;
}

export function getAIClient(workspace, base44) {
  const hasCustomKey = workspace?.ai_api_key && workspace.ai_api_key.trim().length > 0;

  if (!hasCustomKey) {
    // Platform default — use base44 InvokeLLM integration
    return {
      invokeLLM: (prompt, responseJsonSchema) =>
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          ...(responseJsonSchema ? { response_json_schema: responseJsonSchema } : {}),
        }),
    };
  }

  const provider = workspace.ai_provider || 'openai';
  const apiKey = workspace.ai_api_key;

  const defaultModels = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-sonnet-20241022',
  };
  const model = workspace.ai_model || defaultModels[provider] || 'gpt-4o-mini';

  console.log(`[aiClient] Using tenant key — provider: ${provider}, model: ${model}`);

  return {
    invokeLLM: (prompt, responseJsonSchema) => {
      if (provider === 'anthropic') {
        return callAnthropic(apiKey, model, prompt, responseJsonSchema);
      }
      // Default to openai for "openai" or any unrecognised value
      return callOpenAI(apiKey, model, prompt, responseJsonSchema);
    },
  };
}

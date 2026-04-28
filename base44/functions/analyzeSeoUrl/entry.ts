import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Strip HTML to plain text (cheap, no deps)
function htmlToText(html, max = 4000) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function extractTag(html, regex) {
  const m = html.match(regex);
  return m ? m[1].trim() : null;
}

function countMatches(html, regex) {
  const m = html.match(regex);
  return m ? m.length : 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'A valid URL is required.' }, { status: 400 });
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    let parsed;
    try {
      parsed = new URL(normalizedUrl);
    } catch {
      return Response.json({ error: 'That URL is not valid.' }, { status: 400 });
    }

    // Fetch the page HTML
    let html = '';
    let status = 0;
    try {
      const res = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BeaconIQ-SEO-Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
      status = res.status;
      if (!res.ok) {
        return Response.json({ error: `Could not fetch page (HTTP ${status}).` }, { status: 400 });
      }
      html = await res.text();
    } catch (e) {
      return Response.json({ error: `Could not reach URL: ${e.message}` }, { status: 400 });
    }

    // Extract on-page SEO signals
    const title = extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescription = extractTag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    const canonical = extractTag(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
    const ogTitle = extractTag(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
    const ogDescription = extractTag(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
    const ogImage = extractTag(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
    const twitterCard = extractTag(html, /<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']*)["']/i);
    const viewport = extractTag(html, /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']*)["']/i);
    const robots = extractTag(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
    const lang = extractTag(html, /<html[^>]+lang=["']([^"']*)["']/i);

    const h1Count = countMatches(html, /<h1[\s>]/gi);
    const h2Count = countMatches(html, /<h2[\s>]/gi);
    const imgCount = countMatches(html, /<img[\s>]/gi);
    const imgWithAlt = countMatches(html, /<img[^>]*\salt=["'][^"']*["']/gi);
    const linkCount = countMatches(html, /<a[\s>]/gi);
    const hasStructuredData = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
    const htmlSizeKb = Math.round((html.length / 1024) * 10) / 10;

    const signals = {
      url: parsed.toString(),
      httpStatus: status,
      title,
      titleLength: title ? title.length : 0,
      metaDescription,
      metaDescriptionLength: metaDescription ? metaDescription.length : 0,
      canonical,
      ogTitle,
      ogDescription,
      ogImage,
      twitterCard,
      viewport,
      robots,
      lang,
      h1Count,
      h2Count,
      imgCount,
      imgWithAlt,
      imgsMissingAlt: Math.max(0, imgCount - imgWithAlt),
      linkCount,
      hasStructuredData,
      htmlSizeKb,
    };

    const textPreview = htmlToText(html);

    // AI analysis
    const prompt = `You are an SEO auditor. Analyze the following webpage and produce a concise, actionable SEO report.

URL: ${parsed.toString()}

ON-PAGE SIGNALS (extracted):
${JSON.stringify(signals, null, 2)}

PAGE TEXT PREVIEW (first 4000 chars):
"""
${textPreview}
"""

Score the page from 0-100 overall, plus four sub-scores (each 0-100):
- on_page: title, meta description, headings, canonical, lang
- content: clarity, depth, keyword focus inferred from text
- technical: viewport, robots, structured data, image alt coverage, page size
- social: Open Graph + Twitter card completeness

For each sub-score, include 1-2 sentences of reasoning.
List 3-7 prioritized recommendations (highest impact first), each with a short title and 1-2 sentence explanation.
Also list up to 5 strengths (what the page already does well).
Be specific and reference the signals above.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          overall_score: { type: 'number' },
          summary: { type: 'string' },
          sub_scores: {
            type: 'object',
            properties: {
              on_page: { type: 'object', properties: { score: { type: 'number' }, reasoning: { type: 'string' } } },
              content: { type: 'object', properties: { score: { type: 'number' }, reasoning: { type: 'string' } } },
              technical: { type: 'object', properties: { score: { type: 'number' }, reasoning: { type: 'string' } } },
              social: { type: 'object', properties: { score: { type: 'number' }, reasoning: { type: 'string' } } },
            },
          },
          strengths: { type: 'array', items: { type: 'string' } },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                detail: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              },
            },
          },
        },
        required: ['overall_score', 'summary', 'sub_scores', 'recommendations'],
      },
    });

    return Response.json({ signals, analysis: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
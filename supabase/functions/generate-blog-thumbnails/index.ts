import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIDTH = 1280;
const HEIGHT = 720;

// 6 minimalist APEX layout templates inspired by the podcast templates, but
// re-imagined as Lovable-AI-generated minimalist APEX brand visuals (no real subject required).
const APEX_BLOG_LAYOUTS = [
  {
    id: "clean-statement",
    label: "Clean Statement",
    prompt: `LAYOUT: Pure off-white #FCFEFF background with very subtle light-grey graph-paper grid. ONE single short headline rendered LEFT-aligned in HUGE bold modern sans-serif (Inter / Söhne, semibold), crisp Deep Ocean #001A23. ONE key word is underlined with a thick APEX Blue #00BCFF marker stroke. Tiny APEX Blue square glyph in the bottom-right corner. No people, no photo, no clutter. Editorial LinkedIn-style.`,
  },
  {
    id: "glass-card",
    label: "Glass Card",
    prompt: `LAYOUT: Deep Ocean #001A23 → Graphite Gray #1E2126 soft gradient background with subtle cyan glow bloom in the center. A softly rounded translucent frosted Liquid-Glass card sits centered, occupying ~70% of the canvas. 1px APEX Blue #00BCFF hairline border at 25% opacity, soft drop shadow. Inside the card: the headline in heavy modern sans-serif, Ice White #FCFEFF, perfectly centered, wrapped in smart quotation marks. ABOVE the headline inside the card: a tiny APEX Blue 3-dot indicator or thin underline accent. No people. Pure brand minimalism.`,
  },
  {
    id: "big-quote",
    label: "Big Quote",
    prompt: `LAYOUT: Solid Deep Ocean #001A23 background. Oversized opening smart quotation mark “ rendered in light APEX Blue #00BCFF (semi-transparent) in the upper-left as a giant typographic element. The headline below in bold sans-serif, Ice White, two short lines max, wrapped in smart quotes. Generous negative space. A thin 1px APEX Blue underline beneath the headline. Editorial magazine restraint.`,
  },
  {
    id: "metric-hero",
    label: "Metric Hero",
    prompt: `LAYOUT: Pure Ice White #FCFEFF background. ONE oversized number/metric extracted from the headline rendered as massive bold modern sans-serif in Deep Ocean #001A23 — the KEY digits tinted APEX Blue #00BCFF. Below the metric: a small one-line supporting label in Slate Steel #4B585D, tracked uppercase. No people, no clutter. SaaS case-study quality.`,
  },
  {
    id: "split-accent",
    label: "Split Accent",
    prompt: `LAYOUT: Asymmetric split — LEFT 35% is a flat APEX Blue #00BCFF panel with a single thin Ice White geometric icon (arrow, spark, circle) centered. RIGHT 65% is Deep Ocean #001A23 with the headline in bold sans-serif, Ice White, left-aligned, two lines max, wrapped in smart quotes. Tiny APEX Blue label "INSIGHT" or "BLOG" in the bottom-right corner. Premium tech editorial.`,
  },
  {
    id: "frosted-overlay",
    label: "Frosted Overlay",
    prompt: `LAYOUT: Deep Ocean #001A23 background with a very subtle abstract cyan light-leak in one corner. The headline is rendered HUGE across the center in light-weight modern sans-serif, Ice White, with the FIRST or LAST word highlighted in solid APEX Blue #00BCFF. Below: a thin 60px-wide APEX Blue divider line. No people, no photos. Apple-keynote calm.`,
  },
];

async function fetchBlogContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Blog fetch failed: ${res.status}`);
  const html = await res.text();
  // crude readability strip
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 12000);
}

async function extractHooks(blogText: string, count: number, apiKey: string): Promise<string[]> {
  const systemPrompt = `Du bist ein Top-YouTube/Social-Thumbnail Copywriter. Aus dem folgenden Blog-Text extrahierst du genau ${count} verschiedene, scroll-stoppende Hook-Headlines (jede für ein eigenes Thumbnail).

REGELN für JEDE Headline:
- 2 bis 7 Wörter max, ideal 3–5
- Sprache: gleiche Sprache wie der Blog (Deutsch bleibt Deutsch)
- Jede Headline beleuchtet einen ANDEREN Aspekt / eine andere Quintessenz des Blogs
- Keine Anführungszeichen, keine Emojis, keine Hashtags, kein Punkt am Ende
- Punchy, neugierig-machend, premium — Apple/Netflix Energie
- Smart Title Case oder ALL CAPS für Schlüsselwörter

OUTPUT FORMAT: Reines JSON-Array mit ${count} Strings, nichts anderes. Beispiel:
["Erste Headline","Zweite Headline","Dritte Headline"]`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Blog-Text:\n\n${blogText}` },
      ],
    }),
  });
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("__RATE_LIMIT__");
    if (resp.status === 402) throw new Error("__CREDITS__");
    throw new Error(`Hook extraction failed: ${resp.status}`);
  }
  const data = await resp.json();
  const raw: string = data.choices?.[0]?.message?.content || "";
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array in hook output");
  let arr: unknown;
  try {
    arr = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Hook JSON parse failed");
  }
  if (!Array.isArray(arr)) throw new Error("Hooks not an array");
  const hooks = arr
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0)
    .slice(0, count);
  while (hooks.length < count) hooks.push(hooks[hooks.length - 1] ?? "Insight");
  return hooks;
}

function buildBlogThumbnailPrompt(headline: string, layoutPrompt: string): string {
  return `You are a world-class brand designer creating a MINIMALIST APEX-brand thumbnail (16:9, exactly 1280×720) for a blog insight card. The aesthetic is ULTRA-MODERN, EDITORIAL, MINIMAL — Apple keynote × Linear × Vercel marketing.

═══ APEX BRAND LOCK — STRICT ═══
APEX COLOR PALETTE — use ONLY these:
• Ice White       #FCFEFF
• APEX Blue       #00BCFF  — single hero accent, used sparingly
• Deep Ocean      #001A23  — dominant dark background
• Slate Steel     #4B585D
• Frost White     #EDF9FE
• Graphite Gray   #1E2126
FORBIDDEN: warm oranges, teal-orange film grade, red, yellow, gradients outside the palette.

APEX TYPOGRAPHY: modern geometric sans-serif (Inter / Söhne / Neue Haas Grotesk). Perfect kerning, premium tracking.
APEX TONE: confident, premium, minimal, editorial. NO gimmicks, NO emojis, NO cartoon arrows, NO badges spam, NO stickers, NO faces, NO people.

═══ ABSOLUTELY FORBIDDEN ═══
• NO photos of people, NO faces, NO portraits.
• DO NOT render the word "APEX" or "CONSULTING" anywhere.
• DO NOT invent company names, taglines, slogans, URLs, @handles, hashtags, dates.
• DO NOT add any logo or wordmark.
• The ONLY text on the entire image is the HEADLINE below. Zero other text.
• Perfect spelling. No typos. No gibberish letters.

═══ LAYOUT (follow precisely) ═══
${layoutPrompt}

═══ HEADLINE TO RENDER (verbatim, perfect spelling) ═══
"${headline}"

OUTPUT: a single premium 16:9 minimalist APEX brand thumbnail image. Sharp, intentional, editorial. Top 1% quality.`;
}

async function callGeminiImage(prompt: string, apiKey: string): Promise<string> {
  const models = ["google/gemini-3.1-flash-image-preview", "google/gemini-3-pro-image-preview"];
  let lastError = "";
  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    let resp: Response;
    try {
      resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
          image_config: { aspect_ratio: "16:9" },
        }),
      });
    } catch (e) {
      lastError = e instanceof DOMException && e.name === "AbortError" ? "__TIMEOUT__" : String(e);
      continue;
    } finally {
      clearTimeout(timeout);
    }
    if (resp.status === 429) throw new Error("__RATE_LIMIT__");
    if (resp.status === 402) throw new Error("__CREDITS__");
    if (!resp.ok) {
      lastError = await resp.text();
      continue;
    }
    const data = await resp.json();
    const img = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (img) return img;
    lastError = "No image returned";
  }
  throw new Error(`All models failed: ${lastError}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const count = Math.min(12, Math.max(1, Number(body.count) || 4));
    const blogUrl: string | undefined = typeof body.blogUrl === "string" && body.blogUrl.trim() ? body.blogUrl.trim() : undefined;
    let blogContent: string = typeof body.blogContent === "string" ? body.blogContent.trim() : "";

    if (!blogContent && blogUrl) {
      try {
        blogContent = await fetchBlogContent(blogUrl);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: `Blog konnte nicht geladen werden: ${(e as Error).message}. Bitte Inhalt einfügen.` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (!blogContent || blogContent.length < 80) {
      return new Response(
        JSON.stringify({ error: "Blog-Inhalt zu kurz. Bitte vollen Blog-Text einfügen oder URL angeben." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract N hooks
    let hooks: string[];
    try {
      hooks = await extractHooks(blogContent, count, LOVABLE_API_KEY);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "__RATE_LIMIT__") {
        return new Response(JSON.stringify({ error: "Rate limit erreicht.", type: "RATE_LIMIT" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (msg === "__CREDITS__") {
        return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht.", type: "BILLING_REQUIRED" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    // For each hook, pick a rotated layout and build prompt
    const jobs = hooks.map((headline, i) => {
      const layout = APEX_BLOG_LAYOUTS[i % APEX_BLOG_LAYOUTS.length];
      return { headline, layoutId: layout.id, prompt: buildBlogThumbnailPrompt(headline, layout.prompt) };
    });

    // Concurrency-limited image gen
    const CONCURRENCY = 2;
    const settled: PromiseSettledResult<string>[] = [];
    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      const chunk = jobs.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.allSettled(chunk.map((j) => callGeminiImage(j.prompt, LOVABLE_API_KEY)));
      settled.push(...chunkResults);
    }

    for (const s of settled) {
      if (s.status === "rejected") {
        const msg = (s.reason as Error)?.message || "";
        if (msg === "__RATE_LIMIT__") {
          return new Response(JSON.stringify({ error: "Rate limit erreicht.", type: "RATE_LIMIT" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (msg === "__CREDITS__") {
          return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht.", type: "BILLING_REQUIRED" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const images = settled
      .map((s) => (s.status === "fulfilled" ? s.value : null))
      .filter((x): x is string => !!x);

    if (images.length === 0) {
      throw new Error("Keine Thumbnails generiert");
    }

    return new Response(
      JSON.stringify({
        images,
        hooks,
        template: {
          id: "blog-thumbnails",
          title: "Blog → Thumbnails",
          description: "Minimalistische APEX-Brand Thumbnails aus Blog",
          category: "APEX",
          style: "minimal",
          width: WIDTH,
          height: HEIGHT,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Blog thumbnail generator error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

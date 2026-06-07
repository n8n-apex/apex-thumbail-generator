import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIDTH = 1280;
const HEIGHT = 720;

// Podcast-inspired layouts re-engineered for APEX minimalism. All include the subject
// (real person from uploaded photo) when one is provided, otherwise pure brand visual.
const APEX_BLOG_LAYOUTS = [
  {
    id: "clean-cutout",
    label: "Clean Cutout",
    promptWithSubject: `LAYOUT — CLEAN CUTOUT (LinkedIn-editorial):
- Background: Frost White #EDF9FE with very subtle light-grey graph-paper grid.
- Subject (person from uploaded photo) as a clean photo-real studio cutout on the LEFT third, head-to-shoulder, sharp edges, soft natural studio key light, gentle drop shadow underneath for separation.
- Headline on the RIGHT 2/3 in HUGE bold modern sans-serif (Inter / Söhne), Deep Ocean #001A23, mixed-case, max 2 lines, wrapped in smart quotes. ONE key word underlined with a thick APEX Blue #00BCFF marker stroke.
- Tiny APEX Blue 1px line accent under the headline. Nothing else.`,
    promptNoSubject: `LAYOUT — CLEAN STATEMENT:
- Background: Frost White #EDF9FE with subtle light-grey graph-paper grid.
- Headline LEFT-aligned in HUGE bold modern sans-serif, Deep Ocean #001A23, 2 lines max, wrapped in smart quotes. ONE key word underlined with thick APEX Blue #00BCFF marker.
- Tiny APEX Blue square glyph in the bottom-right corner. No people.`,
  },
  {
    id: "glass-card",
    label: "Glass Quote Card",
    promptWithSubject: `LAYOUT — GLASS QUOTE CARD:
- Background: Deep Ocean #001A23 → Graphite Gray #1E2126 soft gradient with subtle cyan glow bloom behind the subject.
- Subject (person from uploaded photo) anchored on the RIGHT third, chest-and-head portrait, photo-real 85mm DSLR, shallow DOF, gentle APEX Blue rim light on hair/shoulder, confident micro-smile, sharp eye contact.
- LEFT 55–60%: softly rounded translucent frosted Liquid-Glass card, 1px APEX Blue hairline border at 25% opacity, soft drop shadow. Inside: headline in heavy modern sans-serif, Ice White #FCFEFF, centered, wrapped in smart quotes, max 2 lines.
- Tiny APEX Blue 3-dot indicator above headline inside the card.`,
    promptNoSubject: `LAYOUT — GLASS CARD:
- Background: Deep Ocean → Graphite Gray gradient, cyan glow center.
- Centered Liquid-Glass card with 1px APEX Blue hairline border, soft drop shadow.
- Headline inside in heavy sans-serif, Ice White, wrapped in smart quotes, perfectly centered. Tiny APEX Blue 3-dot accent above.`,
  },
  {
    id: "big-quote",
    label: "Big Quote",
    promptWithSubject: `LAYOUT — BIG QUOTE PORTRAIT:
- Background: Deep Ocean #001A23 with one soft warm/cyan side rim.
- Subject (person from uploaded photo) on the RIGHT half, cinematic medium portrait, Rembrandt-style lighting with cyan rim, glossy filmic skin.
- LEFT: oversized opening smart quotation mark “ in semi-transparent APEX Blue #00BCFF as giant typographic element. Below it the headline in bold sans-serif, Ice White, 2 short lines, wrapped in smart quotes. Thin 1px APEX Blue underline beneath. Generous negative space.`,
    promptNoSubject: `LAYOUT — BIG QUOTE:
- Solid Deep Ocean background.
- Oversized opening smart quote “ in light APEX Blue (semi-transparent) upper-left.
- Headline below in bold sans-serif, Ice White, 2 lines max, wrapped in smart quotes. Thin APEX Blue underline. Editorial magazine restraint.`,
  },
  {
    id: "metric-hero",
    label: "Metric Hero",
    promptWithSubject: `LAYOUT — METRIC HERO:
- Background: Frost White #EDF9FE flat.
- Subject (person from uploaded photo) anchored on the RIGHT third, relaxed confident posture, clean studio cutout with soft shadow.
- LEFT: ONE oversized number/metric from the headline rendered as massive bold sans-serif in Deep Ocean #001A23 — the KEY digits tinted APEX Blue #00BCFF. Tiny tracked uppercase label in Slate Steel #4B585D below the metric.
- If the headline has no number, render the headline itself huge with one key word in APEX Blue.`,
    promptNoSubject: `LAYOUT — METRIC HERO:
- Pure Frost White background.
- Oversized number/metric from the headline, massive bold sans-serif, Deep Ocean — KEY digits tinted APEX Blue. Small tracked uppercase label below in Slate Steel. No people.`,
  },
  {
    id: "neon-bracket",
    label: "Neon Bracket",
    promptWithSubject: `LAYOUT — NEON BRACKET (Hormozi × Everlast AI futurism):
- Background: cinematic Deep Ocean #001A23 with a soft APEX Blue #00BCFF aurora glow bloom on one side, fine film grain, ultra-premium.
- Subject (person from uploaded photo) anchored on the RIGHT third, chest-up cinematic portrait, photo-real 85mm DSLR, shallow DOF, sharp cyan rim light on hair/shoulder, confident micro-smile, sharp eye contact.
- LEFT/CENTER: two oversized neon cyan square BRACKETS [ ] as massive typographic frame element, frosted Liquid-Glass effect with 1px APEX Blue hairline + soft outer glow, slight 3D depth.
- Inside the brackets: headline in heavy modern sans-serif (Inter Heavy), Ice White #FCFEFF, 2 short lines max, wrapped in smart quotes. Tiny APEX Blue 3-dot indicator under the brackets.`,
    promptNoSubject: `LAYOUT — NEON BRACKET:
- Deep Ocean background with cyan aurora glow on one side.
- Two oversized neon cyan frosted-glass square BRACKETS [ ] centered, 1px APEX Blue hairline + soft glow.
- Inside: headline in heavy sans-serif, Ice White, wrapped in smart quotes, max 2 lines. APEX Blue 3-dot accent below.`,
  },
  {
    id: "holo-stack",
    label: "Holo Stack",
    promptWithSubject: `LAYOUT — HOLO STACK (Everlast AI futurism, Apple visionOS Liquid Glass):
- Background: Deep Ocean #001A23 → Graphite Gray #1E2126 gradient with soft cyan #00BCFF rim glow.
- Subject (person from uploaded photo) anchored on the RIGHT third, chest-up cinematic portrait, photo-real DSLR, glossy filmic skin, cyan rim light, confident eye contact.
- LEFT/CENTER: a floating perspective stack of 3 translucent glassmorphic UI dashboard PANELS (visionOS Liquid Glass), frosted blur, 1px APEX Blue hairline borders at 25% opacity, soft inner shadows + outer glow, each containing tiny cyan sparkline charts / metric tiles. The panels appear to hover in 3D space.
- Above the stack: bold white sans-serif headline (Inter Heavy), 2 lines max, wrapped in smart quotes. Tiny APEX Blue square accent.`,
    promptNoSubject: `LAYOUT — HOLO STACK:
- Deep Ocean → Graphite gradient with cyan glow.
- Centered floating 3D stack of 3 translucent glassmorphic UI dashboard cards (visionOS Liquid Glass), 1px APEX Blue hairlines, soft glow, tiny cyan charts inside.
- Above: bold Ice White sans-serif headline, 2 lines, smart quotes. APEX Blue square accent.`,
  },
  {
    id: "spectrum-glow",
    label: "Spectrum Glow",
    promptWithSubject: `LAYOUT — SPECTRUM GLOW (Everlast AI cinematic):
- Background: Deep Ocean #001A23 with a chromatic cyan #00BCFF aurora ribbon sweeping diagonally behind the subject, soft bloom, fine film grain.
- Subject (person from uploaded photo) anchored on the LEFT third, cinematic medium portrait, photo-real, glossy skin, strong cyan rim light edge, intense direct eye contact.
- RIGHT 60%: massive bold sans-serif headline (Inter Heavy), Ice White #FCFEFF, stacked 2 lines max, each line with subtle CYAN chromatic-offset RGB-split aesthetic. A thin APEX Blue underline accent below the last word. Generous negative space.`,
    promptNoSubject: `LAYOUT — SPECTRUM GLOW:
- Deep Ocean background with diagonal cyan aurora ribbon and bloom.
- Center: massive Ice White sans-serif headline, 2 lines, subtle cyan chromatic RGB-split offset on each line. Thin APEX Blue underline accent.`,
  },
  {
    id: "code-glass",
    label: "Code Glass",
    promptWithSubject: `LAYOUT — CODE GLASS (Tina Huang × Apple visionOS):
- Background: Deep Ocean #001A23 with soft cyan #00BCFF glow.
- Subject (person from uploaded photo) anchored on the LEFT third, chest-up clean photo-real cutout with soft cyan rim, confident expression.
- RIGHT 60%: a translucent frosted Liquid-Glass code/terminal PANEL (visionOS aesthetic), 1px APEX Blue hairline border, soft drop shadow + outer glow, traffic-light dots top-left, containing a few stylized lines of monospaced cyan/white code snippets with a blinking cursor.
- Above the panel: bold Ice White sans-serif headline (Inter Heavy), 2 lines max, wrapped in smart quotes. Tiny APEX Blue 3-dot accent.`,
    promptNoSubject: `LAYOUT — CODE GLASS:
- Deep Ocean background with cyan glow.
- Centered translucent frosted Liquid-Glass code/terminal panel, 1px APEX Blue hairline, traffic-light dots, stylized monospaced cyan/white code lines.
- Above: bold Ice White sans-serif headline, 2 lines, smart quotes. APEX Blue 3-dot accent.`,
  },
  {
    id: "ai-tools-row",
    label: "AI Tools Row",
    promptWithSubject: `LAYOUT — AI TOOLS ROW (Tina Huang tech-creator):
- Background: Deep Ocean #001A23 with soft cyan #00BCFF glow bloom, premium futuristic.
- Subject (person from uploaded photo) anchored on the RIGHT third, chest-up cinematic portrait, photo-real, glossy skin, cyan rim light, pointing/gesturing toward the tools, confident eye contact.
- LEFT/CENTER: a horizontal ROW of 4–5 floating translucent glassmorphic ROUNDED-SQUARE tiles (visionOS Liquid Glass), 1px APEX Blue hairline borders, soft inner shadows + outer glow, each tile prominently displays the LOGO/ICON of a specific AI tool from the TOOLS list below (render them as clean modern app-icon style, recognizable but stylized to fit the brand — no fake/garbled logos). Tiny tool name labels in tracked uppercase Slate Steel #4B585D under each tile.
- ABOVE the row: bold Ice White sans-serif headline (Inter Heavy), 1–2 lines max, wrapped in smart quotes. Tiny APEX Blue 3-dot accent.`,
    promptNoSubject: `LAYOUT — AI TOOLS ROW:
- Deep Ocean background with cyan glow.
- Centered horizontal row of 4–5 floating translucent glassmorphic rounded-square tiles (visionOS Liquid Glass), 1px APEX Blue hairlines, each showing the LOGO/ICON of a specific AI tool from the TOOLS list below as clean app-icon style. Tiny uppercase Slate Steel tool labels under each tile.
- Above: bold Ice White sans-serif headline, smart quotes, 2 lines max. APEX Blue 3-dot accent.`,
  },
  {
    id: "prompt-ui",
    label: "Prompt UI",
    promptWithSubject: `LAYOUT — PROMPT UI (Tina Huang × visionOS):
- Background: Deep Ocean #001A23 with soft cyan glow.
- Subject (person from uploaded photo) anchored on the LEFT third, chest-up cinematic portrait, photo-real, cyan rim light, confident eye contact.
- RIGHT 60%: a translucent frosted Liquid-Glass CHAT/PROMPT input panel (visionOS aesthetic), 1px APEX Blue hairline, soft outer glow, rounded corners, with a stylized "Ask anything…" placeholder line and a glowing cyan submit-arrow circle on the right. Above the input: one short example prompt line in Ice White that references the BLOG TOPIC from context (max 8 words). Tiny tracked uppercase Slate Steel label "PROMPT" above the panel — this label is allowed.
- ABOVE the panel: bold Ice White sans-serif headline (Inter Heavy), 2 lines max, smart quotes.`,
    promptNoSubject: `LAYOUT — PROMPT UI:
- Deep Ocean background with cyan glow.
- Centered translucent frosted Liquid-Glass chat/prompt input panel (visionOS), 1px APEX Blue hairline, glowing cyan submit-arrow circle, "Ask anything…" placeholder, one short example prompt referencing the BLOG TOPIC above (max 8 words).
- Above: bold Ice White sans-serif headline, 2 lines, smart quotes.`,
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

type BlogContext = {
  tools: string[];     // 4–5 concrete AI tools/products mentioned (or fitting)
  topics: string[];    // 3–5 short topic keywords (1–3 words each) from the blog
  metric: string;      // ONE short metric/number with a 1–2 word label, e.g. "10x Output" or "5 Min Setup"
  promptLine: string;  // ONE short example user-prompt line referencing the blog topic, max 8 words
  codeLines: string[]; // 3–5 short stylized code/terminal lines themed to the blog topic, max 40 chars each
};

async function extractBlogContext(blogText: string, apiKey: string): Promise<BlogContext> {
  const systemPrompt = `Aus dem Blog-Text extrahierst du strukturierten Kontext für Thumbnail-Visualisierungen. Sprache: gleiche Sprache wie der Blog.
Liefere EIN JSON-Objekt mit genau diesen Feldern:
{
  "tools":   string[4..5]   // konkrete, real existierende AI-Tools / Produkte / Plattformen, die zum Blog passen (z.B. ChatGPT, Claude, Midjourney, Notion AI, Perplexity, Cursor, Gemini, Runway, ElevenLabs, n8n, Zapier). Bevorzuge im Text genannte. Nur echte Namen.
  "topics":  string[3..5]   // kurze Themen-Keywords aus dem Blog, je 1–3 Wörter, Title Case
  "metric":  string         // EINE prägnante Kennzahl + Mini-Label aus dem Blog (z.B. "10x Output", "5 Min Setup", "+250% ROI"). Wenn keine im Text, erfinde EINE plausible, zum Thema passende
  "promptLine": string      // EINE kurze Beispiel-User-Prompt-Zeile, die das Blog-Thema referenziert, max 8 Wörter, keine Anführungszeichen
  "codeLines": string[3..5] // kurze, stilisierte Code-/Terminal-Zeilen, die zum Blog-Thema passen (z.B. "$ apex run --workflow", "import openai"), max 40 Zeichen
}
Antworte NUR mit dem reinen JSON-Objekt, nichts anderes.`;
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
  const fallback: BlogContext = { tools: [], topics: [], metric: "", promptLine: "", codeLines: [] };
  if (!resp.ok) return fallback;
  const data = await resp.json();
  const raw: string = data.choices?.[0]?.message?.content || "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return fallback;
  try {
    const obj = JSON.parse(m[0]);
    return {
      tools: Array.isArray(obj.tools) ? obj.tools.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 5) : [],
      topics: Array.isArray(obj.topics) ? obj.topics.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 5) : [],
      metric: typeof obj.metric === "string" ? obj.metric.trim() : "",
      promptLine: typeof obj.promptLine === "string" ? obj.promptLine.trim() : "",
      codeLines: Array.isArray(obj.codeLines) ? obj.codeLines.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 5) : [],
    };
  } catch {
    return fallback;
  }
}

function buildBlogThumbnailPrompt(
  headline: string,
  layoutPrompt: string,
  hasSubject: boolean,
  hasStyleRef: boolean,
  ctx?: BlogContext,
  layoutId?: string,
): string {
  const faceLock = hasSubject
    ? `═══ FACE LOCK — ABSOLUTE TOP PRIORITY ═══
The FIRST attached image is the IDENTITY reference for the person. Re-stage them into the layout below, but keep 1:1:
• ENTIRE FACE geometry, eyes, nose, mouth, jawline, ears
• Skin tone, undertone, freckles, moles, scars, tattoos
• Hairstyle: cut, length, parting, texture, color, hairline
• Beard / stubble: exact pattern, density, color
• Apparent age, ethnicity, gender presentation, body type
• Glasses, jewelry, piercings — exactly as in the reference
NEVER replace the face. NEVER swap ethnicity, age, gender. NEVER idealize.
═══════════════════════════════════════════════
`
    : "";

  const styleRef = hasStyleRef
    ? `═══ STYLE REFERENCE — FOLLOW THIS LOOK ═══
A SECOND image is attached AFTER the subject photo. It is a REFERENCE THUMBNAIL whose VISUAL STYLE you must emulate:
• Composition, subject placement, framing
• Typography style, size, weight, placement
• Color treatment within the APEX palette
• Background treatment
DO NOT copy the reference's people, faces, logos or exact text. Replace with the subject from the first image and the headline below.
═══════════════════════════════════════════════
`
    : "";

  return `You are a world-class brand designer creating a MINIMALIST APEX-brand thumbnail (16:9, exactly 1280×720) for a blog insight card. The aesthetic is ULTRA-MODERN, EDITORIAL, MINIMAL — Apple keynote × Linear × Vercel marketing, infused with the dark cinematic mood of premium European AI creators (think Leonard Schmedding's ultra-dark backgrounds, dramatic single-source side lighting, high contrast, and near-zero text clutter).

${faceLock}${styleRef}═══ APEX BRAND LOCK — STRICT ═══
APEX COLOR PALETTE — use ONLY these:
• Ice White       #FCFEFF
• APEX Blue       #00BCFF  — single hero accent, used sparingly as light/rim/glow
• Deep Ocean      #001A23  — dominant dark background
• Slate Steel     #4B585D
• Frost White     #EDF9FE
• Graphite Gray   #1E2126
FORBIDDEN: warm oranges, teal-orange film grade, red, yellow, gradients outside the palette.

STYLE INSPIRATION — Leonard Schmedding × Hormozi × Tina Huang × Everlast AI:
• Backgrounds: ultra-dark, almost black (#001A23 to #050508), never busy
• Lighting: dramatic single-source side or rim light, strong shadows, cinematic chiaroscuro
• Face treatment: when a person is present, they must be lit like a premium portrait — sharp catchlights, cyan rim light, no flat lighting
• Text restraint: maximum 2 lines of text, generous negative space, no badges/stickers/emojis
• Mood: confident, mysterious, premium, editorial — like a magazine cover meets tech tutorial

APEX TYPOGRAPHY: modern geometric sans-serif (Inter / Söhne / Neue Haas Grotesk). Perfect kerning, premium tracking.
APEX TONE: confident, premium, minimal, editorial. NO gimmicks, NO emojis, NO cartoon arrows, NO badges spam, NO stickers.

═══ ABSOLUTELY FORBIDDEN ═══
• DO NOT render the word "APEX" or "CONSULTING" anywhere.
• DO NOT invent company names, taglines, slogans, URLs, @handles, hashtags, dates.
• DO NOT add any logo or wordmark.
• The ONLY text on the entire image is the HEADLINE below. Zero other text.
• NO decorative micro-text, NO tagline, NO sublabel, NO "AI era" / "AI tools" / "2024" / "GUIDE" / "EPISODE" style tracked-uppercase mini labels, NO captions under the headline, NO category chips, NO tiny eyebrow text above the headline. Headline only — nothing else.
• NO tiny labels under icons/tiles/metrics unless explicitly allowed by the BLOG CONTEXT section below for this specific layout.
• Perfect spelling. No typos. No gibberish letters.${hasSubject ? "" : "\n• NO people, NO faces, NO portraits."}

═══ LAYOUT (follow precisely) ═══
${layoutPrompt}
${(() => {
  if (!ctx) return "";
  const blocks: string[] = [];
  // Always inject general blog context so visualizations are blog-themed
  if (ctx.topics.length > 0 || ctx.tools.length > 0 || ctx.metric) {
    blocks.push(`\n═══ BLOG CONTEXT (drive visuals from this — never invent off-topic content) ═══
${ctx.topics.length > 0 ? `• Topics: ${ctx.topics.join(", ")}\n` : ""}${ctx.tools.length > 0 ? `• Tools mentioned: ${ctx.tools.join(", ")}\n` : ""}${ctx.metric ? `• Key metric: ${ctx.metric}\n` : ""}All visual elements (icons, tiles, panels, code, prompts, charts, metrics) MUST reflect these blog specifics — not generic AI imagery.`);
  }
  // Layout-specific data sections
  if (layoutId === "ai-tools-row" && ctx.tools.length > 0) {
    blocks.push(`\n═══ TOOLS LIST (render these specific AI-tool logos/icons in the tiles, in this exact order) ═══
${ctx.tools.map((t, i) => `${i + 1}. ${t}`).join("\n")}
Render each tool as a clean, recognizable modern app-icon-style logo inside its own glass tile. Names appear ONLY as tiny tracked uppercase labels under each tile (these tool labels are allowed in addition to the headline).`);
  }
  if (layoutId === "holo-stack" && (ctx.metric || ctx.topics.length > 0 || ctx.tools.length > 0)) {
    blocks.push(`\n═══ DASHBOARD CONTENT (render inside the 3 glass panels) ═══
${ctx.metric ? `• Panel 1: hero metric "${ctx.metric}" with a small cyan sparkline below\n` : ""}${ctx.topics[0] ? `• Panel 2: tiny tracked uppercase label "${ctx.topics[0].toUpperCase()}" above a stylized cyan bar/line chart\n` : ""}${ctx.tools[0] ? `• Panel 3: a clean app-icon-style logo of ${ctx.tools[0]} with a tiny tracked uppercase "${ctx.tools[0].toUpperCase()}" label\n` : ""}These short labels are allowed; no other text.`);
  }
  if (layoutId === "code-glass" && ctx.codeLines.length > 0) {
    blocks.push(`\n═══ CODE PANEL CONTENT (render these exact lines inside the terminal, monospaced, blinking cursor on last line) ═══
${ctx.codeLines.map((l) => `> ${l}`).join("\n")}`);
  }
  if (layoutId === "prompt-ui" && ctx.promptLine) {
    blocks.push(`\n═══ PROMPT CONTENT (render this exact line inside the chat panel as the example user prompt) ═══
"${ctx.promptLine}"`);
  }
  if (layoutId === "metric-hero" && ctx.metric) {
    blocks.push(`\n═══ METRIC OVERRIDE ═══
Render the metric "${ctx.metric}" as the oversized hero number/label on the left. The digits/number portion is APEX Blue; the unit/label is Deep Ocean. Tiny tracked uppercase label below in Slate Steel referencing the blog topic "${ctx.topics[0] ?? ""}".`);
  }
  return blocks.join("\n");
})()}

═══ HEADLINE TO RENDER (verbatim, perfect spelling) ═══
"${headline}"

OUTPUT: a single premium 16:9 minimalist APEX brand thumbnail image. Sharp, intentional, editorial. Top 1% quality.`;
}

async function callGeminiImage(
  prompt: string,
  apiKey: string,
  imageBase64?: string,
  referenceStyleBase64?: string,
): Promise<string> {
  const contentParts: Array<Record<string, unknown>> = [];
  if (imageBase64) contentParts.push({ type: "image_url", image_url: { url: imageBase64 } });
  if (referenceStyleBase64) contentParts.push({ type: "image_url", image_url: { url: referenceStyleBase64 } });
  contentParts.push({ type: "text", text: prompt });

  const messages = [
    {
      role: "user",
      content: contentParts.length === 1 ? prompt : contentParts,
    },
  ];

  const hasAnyImage = !!imageBase64 || !!referenceStyleBase64;
  const models = hasAnyImage
    ? ["google/gemini-3.1-flash-image-preview"]
    : ["google/gemini-3.1-flash-image-preview", "google/gemini-3-pro-image-preview"];

  let lastError = "";
  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), hasAnyImage ? 75000 : 55000);
    let resp: Response;
    try {
      resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
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
    const variantsPerStyle = Math.min(12, Math.max(1, Number(body.count) || 4));
    const blogUrl: string | undefined = typeof body.blogUrl === "string" && body.blogUrl.trim() ? body.blogUrl.trim() : undefined;
    let blogContent: string = typeof body.blogContent === "string" ? body.blogContent.trim() : "";
    const imageBase64: string | undefined = typeof body.imageBase64 === "string" && body.imageBase64 ? body.imageBase64 : undefined;
    const referenceStyleBase64: string | undefined = typeof body.referenceStyleBase64 === "string" && body.referenceStyleBase64 ? body.referenceStyleBase64 : undefined;
    const rawForcedIds: string[] = Array.isArray(body.forcedLayoutIds)
      ? body.forcedLayoutIds.filter((x: unknown): x is string => typeof x === "string" && !!x)
      : (typeof body.forcedLayoutId === "string" && body.forcedLayoutId ? [body.forcedLayoutId] : []);
    const forcedLayouts = rawForcedIds
      .map((id) => APEX_BLOG_LAYOUTS.find((l) => l.id === id))
      .filter((x): x is typeof APEX_BLOG_LAYOUTS[number] => !!x);
    const hasSubject = !!imageBase64;
    // When user explicitly picked layouts we drive composition via layout prompt; skip style-ref leak
    const useStyleRef = !!referenceStyleBase64 && forcedLayouts.length === 0;
    const hasStyleRef = useStyleRef;

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

    const totalImages = forcedLayouts.length > 0
      ? forcedLayouts.length * variantsPerStyle
      : variantsPerStyle;

    let hooks: string[];
    try {
      hooks = await extractHooks(blogContent, totalImages, LOVABLE_API_KEY);
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

    const willUseToolsRow = forcedLayouts.some((l) => l.id === "ai-tools-row")
      || (forcedLayouts.length === 0 && APEX_BLOG_LAYOUTS.some((l) => l.id === "ai-tools-row"));
    let toolsList: string[] | undefined;
    if (willUseToolsRow) {
      try { toolsList = await extractAiTools(blogContent, LOVABLE_API_KEY); } catch { toolsList = []; }
    }

    const jobs = hooks.map((headline, i) => {
      const layout = forcedLayouts.length > 0
        ? forcedLayouts[Math.floor(i / variantsPerStyle) % forcedLayouts.length]
        : APEX_BLOG_LAYOUTS[i % APEX_BLOG_LAYOUTS.length];
      const layoutPrompt = hasSubject ? layout.promptWithSubject : layout.promptNoSubject;
      const tools = layout.id === "ai-tools-row" ? toolsList : undefined;
      return {
        headline,
        layoutId: layout.id,
        prompt: buildBlogThumbnailPrompt(headline, layoutPrompt, hasSubject, hasStyleRef, tools),
      };
    });

    const CONCURRENCY = 2;
    const settled: PromiseSettledResult<string>[] = [];
    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      const chunk = jobs.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.allSettled(
        chunk.map((j) => callGeminiImage(j.prompt, LOVABLE_API_KEY, imageBase64, useStyleRef ? referenceStyleBase64 : undefined)),
      );
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

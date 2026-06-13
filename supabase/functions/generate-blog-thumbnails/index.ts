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
- Headline on the RIGHT 2/3 in HUGE bold modern sans-serif (Inter / Söhne), Deep Ocean #001A23, mixed-case, max 2 lines. ONE key word underlined with a thick APEX Blue #00BCFF marker stroke.
- Tiny APEX Blue 1px line accent under the headline. Nothing else.`,
    promptNoSubject: `LAYOUT — CLEAN STATEMENT:
- Background: Frost White #EDF9FE with subtle light-grey graph-paper grid.
- Headline LEFT-aligned in HUGE bold modern sans-serif, Deep Ocean #001A23, 2 lines max. ONE key word underlined with thick APEX Blue #00BCFF marker.
- Tiny APEX Blue square glyph in the bottom-right corner. No people.`,
  },
  {
    id: "glass-card",
    label: "Glass Quote Card",
    promptWithSubject: `LAYOUT — GLASS QUOTE CARD:
- Background: Deep Ocean #001A23 → Graphite Gray #1E2126 soft gradient with subtle cyan glow bloom behind the subject.
- Subject (person from uploaded photo) anchored on the RIGHT third, chest-and-head portrait, photo-real 85mm DSLR, shallow DOF, gentle APEX Blue rim light on hair/shoulder, confident micro-smile, sharp eye contact.
- LEFT 55–60%: softly rounded translucent frosted Liquid-Glass card, 1px APEX Blue hairline border at 25% opacity, soft drop shadow. Inside: headline in heavy modern sans-serif, Ice White #FCFEFF, centered, max 2 lines.
- Tiny APEX Blue 3-dot indicator above headline inside the card.`,
    promptNoSubject: `LAYOUT — GLASS CARD:
- Background: Deep Ocean → Graphite Gray gradient, cyan glow center.
- Centered Liquid-Glass card with 1px APEX Blue hairline border, soft drop shadow.
- Headline inside in heavy sans-serif, Ice White, perfectly centered. Tiny APEX Blue 3-dot accent above.`,
  },
  {
    id: "big-quote",
    label: "Editorial Hero",
    promptWithSubject: `LAYOUT — EDITORIAL HERO PORTRAIT:
- Background: Deep Ocean #001A23 with one soft warm/cyan side rim.
- Subject (person from uploaded photo) on the RIGHT half, cinematic medium portrait, Rembrandt-style lighting with cyan rim, glossy filmic skin.
- LEFT: oversized thick APEX Blue #00BCFF vertical bar (8px wide, 70% height) as editorial accent. Right of the bar: headline in bold sans-serif, Ice White, 2 short lines, NO quotation marks. Thin 1px APEX Blue underline beneath. Generous negative space.`,
    promptNoSubject: `LAYOUT — EDITORIAL HERO:
- Solid Deep Ocean background.
- Thick APEX Blue vertical bar accent on the left (8px wide, 60% height).
- Headline next to the bar in bold sans-serif, Ice White, 2 lines max, NO quotation marks. Thin APEX Blue underline. Editorial magazine restraint.`,
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
- Inside the brackets: headline in heavy modern sans-serif (Inter Heavy), Ice White #FCFEFF, 2 short lines max. Tiny APEX Blue 3-dot indicator under the brackets.`,
    promptNoSubject: `LAYOUT — NEON BRACKET:
- Deep Ocean background with cyan aurora glow on one side.
- Two oversized neon cyan frosted-glass square BRACKETS [ ] centered, 1px APEX Blue hairline + soft glow.
- Inside: headline in heavy sans-serif, Ice White, max 2 lines. APEX Blue 3-dot accent below.`,
  },
  {
    id: "holo-stack",
    label: "Holo Stack",
    promptWithSubject: `LAYOUT — HOLO STACK (Everlast AI futurism, Apple visionOS Liquid Glass):
- Background: Deep Ocean #001A23 → Graphite Gray #1E2126 gradient with soft cyan #00BCFF rim glow.
- Subject (person from uploaded photo) anchored on the RIGHT third, chest-up cinematic portrait, photo-real DSLR, glossy filmic skin, cyan rim light, confident eye contact.
- LEFT/CENTER: a floating perspective stack of 3 translucent glassmorphic UI dashboard PANELS (visionOS Liquid Glass), frosted blur, 1px APEX Blue hairline borders at 25% opacity, soft inner shadows + outer glow, each containing tiny cyan sparkline charts / metric tiles. The panels appear to hover in 3D space.
- Above the stack: bold white sans-serif headline (Inter Heavy), 2 lines max. Tiny APEX Blue square accent.`,
    promptNoSubject: `LAYOUT — HOLO STACK:
- Deep Ocean → Graphite gradient with cyan glow.
- Centered floating 3D stack of 3 translucent glassmorphic UI dashboard cards (visionOS Liquid Glass), 1px APEX Blue hairlines, soft glow, tiny cyan charts inside.
- Above: bold Ice White sans-serif headline, 2 lines. APEX Blue square accent.`,
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
- Above the panel: bold Ice White sans-serif headline (Inter Heavy), 2 lines max. Tiny APEX Blue 3-dot accent.`,
    promptNoSubject: `LAYOUT — CODE GLASS:
- Deep Ocean background with cyan glow.
- Centered translucent frosted Liquid-Glass code/terminal panel, 1px APEX Blue hairline, traffic-light dots, stylized monospaced cyan/white code lines.
- Above: bold Ice White sans-serif headline, 2 lines. APEX Blue 3-dot accent.`,
  },
  {
    id: "ai-tools-row",
    label: "AI Tools Row",
    promptWithSubject: `LAYOUT — AI TOOLS ROW (Tina Huang tech-creator):
- Background: Deep Ocean #001A23 with soft cyan #00BCFF glow bloom, premium futuristic.
- Subject (person from uploaded photo) anchored on the RIGHT third, chest-up cinematic portrait, photo-real, glossy skin, cyan rim light, pointing/gesturing toward the tools, confident eye contact.
- LEFT/CENTER: a horizontal ROW of 4–5 floating translucent glassmorphic ROUNDED-SQUARE tiles (visionOS Liquid Glass), 1px APEX Blue hairline borders, soft inner shadows + outer glow, each tile prominently displays the LOGO/ICON of a specific AI tool from the TOOLS list below (render them as clean modern app-icon style, recognizable but stylized to fit the brand — no fake/garbled logos). Tiny tool name labels in tracked uppercase Slate Steel #4B585D under each tile.
- ABOVE the row: bold Ice White sans-serif headline (Inter Heavy), 1–2 lines max. Tiny APEX Blue 3-dot accent.`,
    promptNoSubject: `LAYOUT — AI TOOLS ROW:
- Deep Ocean background with cyan glow.
- Centered horizontal row of 4–5 floating translucent glassmorphic rounded-square tiles (visionOS Liquid Glass), 1px APEX Blue hairlines, each showing the LOGO/ICON of a specific AI tool from the TOOLS list below as clean app-icon style. Tiny uppercase Slate Steel tool labels under each tile.
- Above: bold Ice White sans-serif headline, 2 lines max. APEX Blue 3-dot accent.`,
  },
  {
    id: "prompt-ui",
    label: "Prompt UI",
    promptWithSubject: `LAYOUT — PROMPT UI (Tina Huang × visionOS):
- Background: Deep Ocean #001A23 with soft cyan glow.
- Subject (person from uploaded photo) anchored on the LEFT third, chest-up cinematic portrait, photo-real, cyan rim light, confident eye contact.
- RIGHT 60%: a translucent frosted Liquid-Glass CHAT/PROMPT input panel (visionOS aesthetic), 1px APEX Blue hairline, soft outer glow, rounded corners, with a stylized "Ask anything…" placeholder line and a glowing cyan submit-arrow circle on the right. Above the input: one short example prompt line in Ice White that references the BLOG TOPIC from context (max 8 words). Tiny tracked uppercase Slate Steel label "PROMPT" above the panel — this label is allowed.
- ABOVE the panel: bold Ice White sans-serif headline (Inter Heavy), 2 lines max.`,
    promptNoSubject: `LAYOUT — PROMPT UI:
- Deep Ocean background with cyan glow.
- Centered translucent frosted Liquid-Glass chat/prompt input panel (visionOS), 1px APEX Blue hairline, glowing cyan submit-arrow circle, "Ask anything…" placeholder, one short example prompt referencing the BLOG TOPIC above (max 8 words).
- Above: bold Ice White sans-serif headline, 2 lines.`,
  },
  {
    id: "transform-duo",
    label: "Transform Duo",
    promptWithSubject: `LAYOUT — TRANSFORM DUO (3D glowing input → output, premium YouTube hero):
- Background: pure near-black #050508 with a subtle dark floor reflection plane (very faint).
- TOP: bold modern sans-serif headline (Inter Heavy / Söhne Heavy), Ice White #FCFEFF, centered across the top third, 1 line if possible (2 max), HUGE size, generous tracking. UNDER the last word: a rough hand-drawn WHITE chalk/marker underline scribble (slightly imperfect, 2 quick strokes) — this is allowed.
- CENTER: TWO oversized 3D glowing objects side by side with a glowing WHITE motion-arrow between them pointing left→right. Soft floor reflections under each object.
  • LEFT object = the "FROM" state (input) of the blog topic, rendered as a stylized 3D icon (folder, file, raw note, chaotic stack, blank canvas, etc. — pick from BLOG CONTEXT below). Color: APEX Blue #00BCFF glowing, soft cyan rim light, blue floor reflection. Label embossed on the object face in clean white sans-serif (max 4 chars / file-ext style, e.g. ".md", "RAW", "IDEA").
  • RIGHT object = the "TO" state (output / result) of the blog topic, rendered as a stylized 3D icon (document, app, dashboard, polished file, etc.). Color: warm amber #FF9A1F glowing with soft orange rim light and warm floor reflection (this single warm accent is ALLOWED for this layout only, as a deliberate output-state highlight). Label embossed on the object face (e.g. "</> HTML", "APP", "SITE", "VIDEO" — pick from BLOG CONTEXT).
  • Between them: a chunky 3D motion-arrow made of WHITE light with speed-streak tail, glowing softly.
- RIGHT EDGE of canvas: 2–3 small floating dark UI preview cards (image preview, code snippet, layout blocks) with faint amber rim light, suggesting the rich output. Tiny — they're decorative only, no readable text.
- The subject (person from uploaded photo) is NOT placed in the scene for this layout — the objects ARE the hero. Ignore the subject photo for this specific layout.
- Cinematic, dramatic, ultra-premium, sharp shadows, soft bloom, fine grain.`,
    promptNoSubject: `LAYOUT — TRANSFORM DUO (3D glowing input → output):
- Background: pure near-black #050508 with very subtle dark floor reflection plane.
- TOP: bold Ice White sans-serif headline (Inter Heavy), centered, 1–2 lines max, with a rough hand-drawn WHITE chalk underline scribble under the last word (allowed).
- CENTER: TWO oversized 3D glowing objects side by side with a glowing WHITE 3D motion-arrow between them.
  • LEFT = input/"FROM" state of the blog topic as a stylized 3D icon (folder/file/note/raw stack), APEX Blue #00BCFF glowing, cyan rim light, blue floor reflection. Short embossed label on the face (e.g. ".md", "RAW", "IDEA" — pick from BLOG CONTEXT).
  • RIGHT = output/"TO" state as a stylized 3D icon (document/app/dashboard/polished file), warm amber #FF9A1F glowing with warm rim light and floor reflection (this single warm accent is ALLOWED for this layout only). Short embossed label (e.g. "</> HTML", "APP", "SITE" — from BLOG CONTEXT).
  • Between: chunky 3D WHITE light-arrow with speed-streak tail, soft glow.
- RIGHT EDGE: 2–3 small floating dark UI preview cards with faint amber rim, decorative only, no readable text.
- Cinematic, dramatic, ultra-premium, sharp shadows, soft bloom, fine grain.`,
  },
  {
    id: "hero-word",
    label: "Hero Word",
    promptWithSubject: `LAYOUT — HERO WORD (viral YouTube tech-creator, face + glowing 3D TOOL app-icon + ONE huge single word):
- Background: almost pure black #030308 to #07070C — MOSTLY DARK, deep cinematic darkness with fine grain. ONLY a very subtle dark-blue radial vignette directly behind the icon (just enough to separate it). NO circuit traces, NO grid, NO busy glowing patterns, NO bright walls. Dark dominates light at all times.
- RIGHT half: the person from the uploaded photo, chest-up, with a strong shocked/amazed cinematic expression — eyes wide, mouth slightly open, eyebrows raised. Face lit warm from below by the glowing icon, cool blue rim light from behind. Photo-real DSLR/85mm, glossy filmic skin, razor-sharp eyes. IDENTITY LOCKED to the uploaded photo (no idealization, no face swap, exact features).
- The person's LEFT hand (lower-center) is visible, open palm up, presenting the glowing icon.
- CENTER-LEFT: ONE oversized floating 3D app icon (~30% of canvas height), hovering above the open palm, casting colored light onto skin and fabric.
  • THE ICON MUST BE THE LITERAL APP/TOOL LOGO of the single KEY WORD in the headline. MANDATORY.
  • If the KEY WORD is a known software/app/brand (ChatGPT, GPT, Claude, Gemini, Midjourney, Sora, Runway, Figma, Notion, Photoshop, Illustrator, Premiere, After Effects, Lightroom, Canva, Cursor, VSCode, GitHub, Slack, Discord, YouTube, Instagram, TikTok, X/Twitter, LinkedIn, Spotify, Apple, Lovable, Supabase, Vercel, Linear, Perplexity, Grok, Copilot, n8n, Zapier, Make, Webflow, Framer, Blender, Davinci, CapCut), render its OFFICIAL real app icon — correct shape, correct brand colors, correct glyph — as a premium 3D liquid-glass version of that exact icon. Do NOT use a generic squircle in that case.
  • If the KEY WORD is a generic concept (Design, Code, AI, Video, Music, Write, Analytics, Photo, Edit, Chat, Brain, Cloud, Speed, Lock, Idea), use a rounded liquid-glass squircle containing a 3D glyph that literally represents the concept.
- TOP-LEFT: ONE huge bright SINGLE WORD in MASSIVE bold modern sans-serif (Inter Heavy / SF Pro Display Black), Ice White #FCFEFF, Title Case. EXTRACT THE ONE ESSENCE WORD from the headline — the single most important noun / tool name / core concept. HARD LIMIT: MAXIMUM 8 CHARACTERS. If the essence word is longer than 8 characters, REPLACE it with a shorter synonym or accepted abbreviation that still represents the topic (e.g. "Midjourney" → "MJ"; "ChatGPT" → "GPT"; "Photoshop" → "PS"; "Analytics" → "Data"; "Marketing" → "Sales"; "Automation" → "Auto"). Examples within limit: "ChatGPT Tutorial für Anfänger" → "GPT"; "Wie du besser designst" → "Design"; "Video Editing mit KI" → "Video"; "Midjourney Prompts die wirken" → "MJ". NEVER multiple words. NEVER filler words. NEVER more than 8 characters total. Word takes ~35–45% of canvas width, top-left aligned, generous tracking, subtle white outer glow. Letters may be partially occluded by the floating icon.
- BRAND EXCEPTION FOR THIS LAYOUT ONLY: the icon uses its TRUE brand colors (may be amber, green, purple, blue, etc.) and may spill that colored light onto face and hand. Headline stays pure Ice White. Background stays deep near-black.
- ONLY ONE WORD in the entire image. No subtitles, no badges, no extra logos, no labels, no captions. Blank dark surfaces everywhere else.
- Cinematic, dramatic, ultra-premium, mostly-DARK shocked-reaction-with-glowing-tool-icon YouTube hero aesthetic.`,
    promptNoSubject: `LAYOUT — HERO WORD (no subject — glowing 3D TOOL app-icon + ONE huge single word):
- Background: almost pure black #030308 to #07070C — MOSTLY DARK, only a subtle dark-blue radial vignette behind the icon. NO traces, NO grid, NO busy patterns. Deep cinematic darkness, fine grain.
- CENTER: ONE oversized floating 3D app icon (~38% of canvas height) with strong emissive light and soft bloom.
  • MUST be the LITERAL APP/TOOL LOGO of the single KEY WORD. Mandatory.
  • Known brand (ChatGPT, Claude, Gemini, Midjourney, Figma, Notion, Photoshop, Premiere, Canva, Cursor, GitHub, Lovable, Supabase, Vercel, Linear, n8n, Zapier, etc.) → render its OFFICIAL real app icon in true brand colors as premium 3D liquid-glass.
  • Generic concept (Design, Code, AI, Video, Music, Write, Analytics, Photo, Edit, Chat, Brain, Cloud, Speed, Lock, Idea) → amber liquid-glass squircle with 3D glyph literally representing it.
- TOP-LEFT: ONE huge bright SINGLE WORD (Inter Heavy), Ice White #FCFEFF, Title Case — the ONE essence word of the headline (tool name or core concept). HARD LIMIT: MAX 8 CHARACTERS. If longer, use a shorter synonym/abbreviation (Midjourney → MJ, ChatGPT → GPT, Photoshop → PS, Analytics → Data). Never multiple words, never filler, never more than 8 characters. ~35–45% canvas width, generous tracking, subtle white glow. May be partially occluded by the icon.
- BRAND EXCEPTION: icon uses its true brand colors. Headline pure Ice White. Background deep near-black.
- ONLY ONE WORD in the whole image. No subtitles, no badges, no extra text. Cinematic, dramatic, ultra-premium, mostly dark.`,
  },
  {
    id: "sticky-board",
    label: "Sticky Notes Board",
    promptWithSubject: `LAYOUT — STICKY NOTES BOARD (viral coaching/business YouTube, post-its pinned around face on chalkboard):
- Background: matte near-black chalkboard / dark wall #0a0a0a–#111111 with very faint chalk-dust texture and fine grain. No gradients, no glow, no patterns.
- SUBJECT (person from uploaded photo) CENTERED, chest-up, facing camera with a calm confident slight smile, sharp eye contact, photo-real 85mm DSLR, soft natural key light. IDENTITY FORENSICALLY LOCKED — same skull shape, same beard density and shape, same hairline, same skin tone, same exact features as the uploaded photo. Do NOT idealize, do NOT slim the face, do NOT swap identity.
- AROUND the head, 4 YELLOW POST-IT sticky notes (~13% canvas width each), 2 on the left and 2 on the right, each slightly rotated, each pinned with a small RED pushpin at the top. Each sticky note has ONE bold black hand-drawn LINE-ICON drawn on it that semantically matches the BLOG TOPIC (e.g. magnifying glass over document, person silhouette with short label, gear cluster with short label, eye with dollar sign, lightbulb, chart, checklist, target — pick 4 fitting the topic). Short ALL-CAPS labels under the icons (max 6 chars) are allowed ONLY inside the sticky notes.
- A thin dashed WHITE curve loosely connects the 4 sticky notes in an arc behind the subject's head.
- BOTTOM third: HUGE bold white sans-serif headline (Inter Heavy / SF Pro Display Black) ALL-CAPS, Ice White #FCFEFF, max 1 line if possible (2 short max), spanning full width, tight tracking. Under ONE key word: a thick GLOWING RED marker underline scribble (slightly imperfect 2 quick strokes).
- Premium, photo-real, cinematic, mostly dark, sharp.`,
    promptNoSubject: `LAYOUT — STICKY NOTES BOARD (no subject):
- Matte near-black chalkboard background #0a0a0a with faint chalk-dust texture.
- 4–5 YELLOW POST-IT sticky notes pinned with RED pushpins, slightly rotated, arranged in a loose arc across the upper two thirds. Each holds ONE bold black line-icon matching the BLOG TOPIC + short ALL-CAPS label (max 6 chars) — these labels are allowed.
- Thin dashed WHITE curve connecting them.
- BOTTOM third: HUGE bold Ice White ALL-CAPS sans-serif headline (Inter Heavy), 1 line if possible, with a thick GLOWING RED marker underline scribble under one key word.`,
  },
  {
    id: "notebook-grid",
    label: "Notebook Grid",
    promptWithSubject: `LAYOUT — NOTEBOOK GRID (editorial graph-paper, headline stack + deadpan portrait):
- Background: warm cream-beige PAPER #efe9d9 / #f2ecdd filling the whole frame, with a subtle ENGINEERING GRAPH-PAPER grid (fine light-grey 1px squares, ~36px). Faint paper grain. No gradients, no glow.
- SUBJECT (person from uploaded photo) anchored on the RIGHT third, chest-up, with hand thoughtfully resting near temple or chin, looking dead-straight into camera with a serious calm deadpan expression. Photo-real 85mm DSLR, sharp. IDENTITY FORENSICALLY LOCKED — same skull shape, same beard density and shape, same hairline, same skin tone, same exact features as the uploaded photo. Do NOT idealize, do NOT slim the face, do NOT swap identity.
- LEFT 55–60%: headline stacked in THREE short lines in HUGE bold black sans-serif (Inter Heavy / SF Pro Display Black), Deep Black #0a0a0a, mixed case, left-aligned. The MIDDLE line should be the punchy power phrase (number + noun if possible) and is rendered in the heaviest weight. Under the MIDDLE line: a thick hand-drawn RED marker underline scribble (slightly imperfect).
- No other decoration. No glow, no chromatic effects, no cyan. Magazine-clean.`,
    promptNoSubject: `LAYOUT — NOTEBOOK GRID (no subject):
- Cream-beige paper background #efe9d9 with subtle engineering graph-paper grid.
- Headline stacked in 3 short lines, HUGE bold black sans-serif (Inter Heavy), left-aligned, mixed case. The MIDDLE line is the punchy power phrase in the heaviest weight, with a hand-drawn red marker underline scribble under it.
- No other decoration. Magazine-clean, editorial.`,
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
  tools: string[];
  topics: string[];
  metric: string;
  promptLine: string;
  codeLines: string[];
  transformPair: { fromLabel: string; fromObject: string; toLabel: string; toObject: string };
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
  "transformPair": {        // Vorher→Nachher Transformation, die das Blog-Thema visuell darstellt
    "fromObject": string,   // 1–3 Wörter, das INPUT-Objekt als 3D-Icon (z.B. "Markdown folder", "raw notes", "blank canvas", "messy spreadsheet")
    "fromLabel":  string,   // sehr kurzer Label-Text fürs Icon, max 5 Zeichen (z.B. ".md", "RAW", "IDEA", "TXT")
    "toObject":   string,   // 1–3 Wörter, das OUTPUT-Objekt als 3D-Icon (z.B. "HTML document", "polished app", "finished video", "live dashboard")
    "toLabel":    string    // sehr kurzer Label-Text fürs Icon, max 6 Zeichen (z.B. "HTML", "APP", "SITE", "VIDEO")
  }
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
  const fallback: BlogContext = {
    tools: [], topics: [], metric: "", promptLine: "", codeLines: [],
    transformPair: { fromObject: "raw notes", fromLabel: "RAW", toObject: "polished output", toLabel: "DONE" },
  };
  if (!resp.ok) return fallback;
  const data = await resp.json();
  const raw: string = data.choices?.[0]?.message?.content || "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return fallback;
  try {
    const obj = JSON.parse(m[0]);
    const tp = obj.transformPair && typeof obj.transformPair === "object" ? obj.transformPair : {};
    return {
      tools: Array.isArray(obj.tools) ? obj.tools.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 5) : [],
      topics: Array.isArray(obj.topics) ? obj.topics.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 5) : [],
      metric: typeof obj.metric === "string" ? obj.metric.trim() : "",
      promptLine: typeof obj.promptLine === "string" ? obj.promptLine.trim() : "",
      codeLines: Array.isArray(obj.codeLines) ? obj.codeLines.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 5) : [],
      transformPair: {
        fromObject: (typeof tp.fromObject === "string" && tp.fromObject.trim()) || fallback.transformPair.fromObject,
        fromLabel: ((typeof tp.fromLabel === "string" && tp.fromLabel.trim()) || fallback.transformPair.fromLabel).slice(0, 6),
        toObject: (typeof tp.toObject === "string" && tp.toObject.trim()) || fallback.transformPair.toObject,
        toLabel: ((typeof tp.toLabel === "string" && tp.toLabel.trim()) || fallback.transformPair.toLabel).slice(0, 7),
      },
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
    ? `═══ FACE LOCK — ABSOLUTE TOP PRIORITY (HIGHEST RULE, OVERRIDES EVERYTHING ELSE) ═══
The FIRST attached image IS the person. Treat it as a forensic photo reference. Re-stage them into the layout, but the face MUST be photographically identical — like the same person stepped into a new scene, not a similar-looking model.
LOCK 1:1, pixel-faithful:
• ENTIRE FACE geometry: skull shape, forehead height, brow ridge, eye spacing & shape & color, nose bridge/tip/nostrils, lip shape & thickness, philtrum, chin shape, jawline, cheekbones, ear shape & position
• Skin: exact tone, undertone, texture, pores, freckles, moles, scars, blemishes — keep every mark
• Hair: cut, length, parting, density, hairline shape, color (incl. buzzcut/very short if so)
• Beard / stubble: exact pattern, density, length, color, edges — do not thicken or thin
• Eyebrows: shape, thickness, color
• Apparent age, ethnicity, gender, body type, neck/shoulder build
• Glasses, jewelry, watch, piercings — exactly as in the reference
NEVER beautify, slim, idealize, smooth skin, change ethnicity, change age, change gender, or generate a "similar" face. If in doubt, copy the reference face more literally. Identity match > artistic interpretation. A wrong face = failed output.
═══════════════════════════════════════════════
`
    : "";


  const styleRef = hasStyleRef
    ? `═══ STYLE REFERENCE — MATCH THIS LOOK EXACTLY ═══
A SECOND image is attached AFTER the subject photo. It is the OFFICIAL APEX preview of THIS exact layout. Treat it as the visual ground truth and match it 1:1:
• Composition, subject placement, framing, crop, camera angle
• Typography style, weight, size, placement, color, casing
• Background treatment (gradients, glow, traces, panels, textures)
• Color palette and how each color is used
• Lighting direction, rim light, shadow shape, overall mood
DO NOT copy the reference's person/face — replace with the subject from the FIRST image (their identity is locked above). DO NOT copy the reference's headline text — replace with the HEADLINE below. Everything else (look, feel, layout structure) must match the reference as closely as possible. The output should be visually indistinguishable from the reference except for the swapped face and headline.
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
FORBIDDEN: warm oranges, teal-orange film grade, red, yellow, gradients outside the palette.${layoutId === "transform-duo" ? `\nEXCEPTION FOR THIS LAYOUT ONLY: warm amber #FF9A1F is explicitly permitted as the glow color of the right-side "output" 3D object and its floor reflection only. Everything else stays brand-locked.` : ""}${layoutId === "hero-word" ? `\nEXCEPTION FOR THIS LAYOUT ONLY: the floating 3D tool icon may use its TRUE official brand colors (any color — amber, green, purple, red, etc., whatever the real app icon uses) and may spill that colored light onto the subject's face, hand and shoulder. Background must be DEEP NEAR-BLACK (mostly dark, no APEX-blue traces, no busy patterns). Headline stays pure Ice White. Everything else brand-locked.` : ""}

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
  if (layoutId === "transform-duo" && ctx.transformPair) {
    const tp = ctx.transformPair;
    blocks.push(`\n═══ TRANSFORM DUO CONTENT (render these exact objects) ═══
• LEFT (input, glowing APEX Blue): a stylized 3D icon of "${tp.fromObject}" with the short embossed label "${tp.fromLabel}" on its face.
• RIGHT (output, glowing warm amber): a stylized 3D icon of "${tp.toObject}" with the short embossed label "${tp.toLabel}" on its face.
• Between them: chunky 3D white light-arrow with motion streaks.
These two short labels on the objects are allowed in addition to the headline. No other text anywhere.`);
  }
  return blocks.join("\n");
})()}

═══ HEADLINE TO RENDER (verbatim, perfect spelling) ═══
${headline}

CRITICAL: render the headline as plain text WITHOUT any surrounding quotation marks (no " " no “ ” no ' ' no ‘ ’). No quote glyphs anywhere on the image.

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
    const manualTitle: string | undefined = typeof body.manualTitle === "string" && body.manualTitle.trim() ? body.manualTitle.trim().slice(0, 200) : undefined;
    const autoTitleFlag: boolean = !!body.autoTitle;
    const imageBase64: string | undefined = typeof body.imageBase64 === "string" && body.imageBase64 ? body.imageBase64 : undefined;
    const referenceStyleBase64: string | undefined = typeof body.referenceStyleBase64 === "string" && body.referenceStyleBase64 ? body.referenceStyleBase64 : undefined;
    const rawForcedIds: string[] = Array.isArray(body.forcedLayoutIds)
      ? body.forcedLayoutIds.filter((x: unknown): x is string => typeof x === "string" && !!x)
      : (typeof body.forcedLayoutId === "string" && body.forcedLayoutId ? [body.forcedLayoutId] : []);
    const forcedLayouts = rawForcedIds
      .map((id) => APEX_BLOG_LAYOUTS.find((l) => l.id === id))
      .filter((x): x is typeof APEX_BLOG_LAYOUTS[number] => !!x);
    const layoutReferences: Record<string, string> =
      body.layoutReferences && typeof body.layoutReferences === "object" && !Array.isArray(body.layoutReferences)
        ? Object.fromEntries(
            Object.entries(body.layoutReferences as Record<string, unknown>).filter(
              ([, v]) => typeof v === "string" && (v as string).startsWith("data:"),
            ),
          ) as Record<string, string>
        : {};
    const hasSubject = !!imageBase64;
    const useStyleRef = !!referenceStyleBase64 && forcedLayouts.length === 0;
    const hasStyleRef = useStyleRef;

    if (!blogContent && blogUrl) {
      try {
        blogContent = await fetchBlogContent(blogUrl);
      } catch (e) {
        if (!manualTitle) {
          return new Response(
            JSON.stringify({ error: `Blog konnte nicht geladen werden: ${(e as Error).message}. Bitte Inhalt einfügen oder Titel angeben.` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const haveBlog = !!blogContent && blogContent.length >= 80;
    if (!haveBlog && !manualTitle) {
      return new Response(
        JSON.stringify({ error: "Bitte Blog-Inhalt, URL oder manuellen Titel angeben." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const totalImages = forcedLayouts.length > 0
      ? forcedLayouts.length * variantsPerStyle
      : variantsPerStyle;

    let hooks: string[];
    try {
      if (haveBlog) {
        hooks = await extractHooks(blogContent, totalImages, LOVABLE_API_KEY);
      } else if (autoTitleFlag && manualTitle) {
        // Treat manualTitle as keywords; generate distinct hook headlines from them.
        const synthBlog = `Topic keywords: ${manualTitle}\n\nWrite scroll-stopping thumbnail headlines around these keywords.`;
        hooks = await extractHooks(synthBlog, totalImages, LOVABLE_API_KEY);
      } else {
        // Use the manual title verbatim for every variant.
        hooks = Array.from({ length: totalImages }, () => manualTitle as string);
      }
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
      // Fallback for manual title: use it as-is for all variants.
      if (manualTitle) {
        hooks = Array.from({ length: totalImages }, () => manualTitle);
      } else {
        throw e;
      }
    }

    // Blog-context extraction only when we have a blog. Otherwise layouts use generic visuals.
    let blogCtx: BlogContext | undefined;
    if (haveBlog) {
      try { blogCtx = await extractBlogContext(blogContent, LOVABLE_API_KEY); } catch { blogCtx = undefined; }
    }

    const jobs = hooks.map((headline, i) => {
      const layout = forcedLayouts.length > 0
        ? forcedLayouts[Math.floor(i / variantsPerStyle) % forcedLayouts.length]
        : APEX_BLOG_LAYOUTS[i % APEX_BLOG_LAYOUTS.length];
      const layoutPrompt = hasSubject ? layout.promptWithSubject : layout.promptNoSubject;
      const perLayoutRef = layoutReferences[layout.id];
      const jobStyleRef = perLayoutRef ?? (useStyleRef ? referenceStyleBase64 : undefined);
      const jobHasStyleRef = !!jobStyleRef;
      return {
        headline,
        layoutId: layout.id,
        styleRef: jobStyleRef,
        prompt: buildBlogThumbnailPrompt(headline, layoutPrompt, hasSubject, jobHasStyleRef, blogCtx, layout.id),
      };
    });

    const CONCURRENCY = 2;
    const settled: PromiseSettledResult<string>[] = [];
    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      const chunk = jobs.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.allSettled(
        chunk.map((j) => callGeminiImage(j.prompt, LOVABLE_API_KEY, imageBase64, j.styleRef)),
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

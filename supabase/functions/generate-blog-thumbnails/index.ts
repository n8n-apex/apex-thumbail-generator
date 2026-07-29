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
    id: "welche-ki",
    label: "Which AI? Icons Cloud",
    promptWithSubject: `LAYOUT — WHICH AI? FLOATING APP-ICONS CLOUD (cinematic dark YouTube hero, mirrors the provided reference image):
- BACKGROUND: cinematic near-black #050508 to Deep Ocean #001A23, mostly dark, very subtle dark radial glow behind the subject, fine film grain, ultra-premium.
- SUBJECT (person from uploaded photo) CENTERED, chest-up cinematic portrait, wearing dark/black shirt or blazer, calm confident subtle smile, sharp direct eye contact into camera, photo-real 85mm DSLR, glossy filmic skin. IDENTITY FORENSICALLY LOCKED to the uploaded photo — same skull shape, same beard density and exact beard shape, same hairline, same skin tone, same nose, same eyes. Do NOT idealize, slim, age, or swap identity. LIGHTING: body stays in natural neutral dark studio light. The face catches subtle warm/cool ambient tint from the surrounding glowing icons (soft, max 20% intensity — like real reflected light from the icons around him).
- AROUND the subject (LEFT and RIGHT sides, upper and lower zones — 6 to 8 icons total, NEVER covering the face): floating oversized glossy 3D LIQUID-GLASS app-icon SQUIRCLES (iOS/visionOS aesthetic — rounded-square tiles, ~14–18% canvas height each, slightly rotated in 3D perspective, some closer/some further with realistic depth-of-field blur on the farthest ones). Each squircle is a premium translucent white/glass tile with soft inner highlight and colored emissive glow, casting subtle colored light into the scene.
- ICON CONTENT — render the OFFICIAL real app logos of these specific AI tools, correct shape/glyph/true brand colors, as premium 3D liquid-glass versions (NO fake or garbled logos, NO invented brands, NO text labels):
  • ChatGPT (black spiral knot on white tile)
  • Anthropic Claude (orange starburst)
  • Google Gemini (blue-purple-red 4-point spark)
  • Microsoft Copilot (rainbow ribbon loop)
  • Perplexity (teal geometric bird/knot)
  • Midjourney (sailing-ship silhouette)
  • plus 1–2 additional recognizable AI tool icons from the BLOG CONTEXT below if it lists specific tools; otherwise use Notion AI, Cursor, Runway or Suno.
- The icons FLOAT and OVERLAP the edges of the frame (some partially cropped by the canvas edges, some fully visible), arranged in a loose cloud composition — never in a symmetric grid, never in a straight row. Depth-of-field blur on foreground/background icons, sharp focus on middle-layer icons and on the subject's face.
- BOTTOM third of canvas: ONE huge bold headline in MASSIVE modern sans-serif (Inter Heavy / SF Pro Display Black / Söhne Heavy), ALL-CAPS, pure Ice White #FCFEFF (NEVER yellow, NEVER cyan) with a subtle soft white outer glow, tight modern tracking, spanning nearly full width, MAX 2 short lines (1 line preferred). The headline may be partially occluded by 1–2 icons at its edges for depth. Centered.
- Read order: cloud of glowing AI ICONS → subject's confident face in the middle → WHITE HEADLINE at bottom.
- Absolutely nothing else in the frame. NO badges, NO tiny labels under icons, NO UI cards, NO extra text, NO tool name captions, NO subtitle, NO logos beyond the app icons themselves.`,
    promptNoSubject: `LAYOUT — WHICH AI? FLOATING APP-ICONS CLOUD (no subject):
- Cinematic near-black #050508 to Deep Ocean #001A23 background, mostly dark with subtle dark radial center glow, fine film grain.
- 8–10 oversized floating 3D LIQUID-GLASS app-icon SQUIRCLES arranged in a loose cloud composition across the whole canvas (never grid, never row), slightly rotated in 3D perspective, some cropped by edges, foreground/background icons with soft depth-of-field blur.
- Render the OFFICIAL real app logos of these AI tools (correct shape/glyph/true brand colors, premium 3D liquid-glass versions, NO fake logos, NO text on the tiles): ChatGPT, Claude, Gemini, Microsoft Copilot, Perplexity, Midjourney, plus 2–3 additional from the BLOG CONTEXT below (or Notion AI, Cursor, Runway, Suno as fallback).
- Each tile has soft colored emissive glow that lights up the surrounding dark scene.
- BOTTOM third: ONE huge bold Ice White #FCFEFF ALL-CAPS sans-serif headline (Inter Heavy), 1–2 short lines max, centered, with subtle soft white outer glow, tight tracking. NEVER yellow. Headline may be partially occluded by 1–2 icons for depth.
- Nothing else — no labels, no tool captions, no badges, no subtitle.`,
  },
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
    promptWithSubject: `LAYOUT — HERO WORD GLOW. MATCH THIS EXACT COMPOSITION (mirrors the provided reference image): ONE huge white word in the upper-left, ONE glowing 3D app-icon floating on an open palm in the lower-center (overlapping the bottom of the word), person on the right with the SAME facial expression / gaze / pose as the layout reference. Nothing else.
- BACKGROUND: pure near-black #030308 with a very subtle dark-blue radial glow behind the icon. Completely empty otherwise. NO grid, NO traces, NO patterns, NO extra objects, NO secondary text, NO badges, NO UI cards.
- WORD (upper-left, back layer): ONE single uppercase word in MASSIVE bold modern sans-serif (Inter Heavy / SF Pro Display Black), pure Ice White #FCFEFF with a soft white outer glow. Positioned in the upper-left ~55% of the canvas width, baseline roughly at vertical middle. The 3D icon must overlap and occlude the LOWER-CENTER of this word — this is required. HARD RULES: exactly ONE word, MAX 8 characters, uppercase. If the essence word is longer than 8 chars, abbreviate (Midjourney→MJ, ChatGPT→GPT, Photoshop→PS, Analytics→DATA, Marketing→SALES, Automation→AUTO). Extract the single most important noun/tool/concept from the headline.
- 3D ICON (lower-center, front layer, ~32–38% of canvas height): one oversized floating glossy 3D app icon hovering just above an open human palm visible at the bottom edge. Strong emissive glow casting colored light onto the palm and rim-lighting the lower edge of the word behind it.
  • If the key word is a known brand (ChatGPT, Claude, Gemini, Midjourney, Sora, Runway, Figma, Notion, Photoshop, Illustrator, Premiere, Lightroom, Canva, Cursor, GitHub, Slack, YouTube, Instagram, TikTok, Spotify, Lovable, Supabase, Vercel, Linear, Perplexity, n8n, Zapier, Blender, CapCut, MCP, etc.) → render its OFFICIAL real app icon in correct shape, glyph and true brand colors, as a premium 3D liquid-glass version.
  • If it's a generic concept → glossy 3D liquid-glass squircle (APEX Blue #00BCFF default) containing a literal 3D glyph for that concept.
- PERSON (right ~35% of canvas): the man from the uploaded photo, chest-up, wearing a dark/black shirt or suit. FACIAL PERFORMANCE IS REFERENCE-LOCKED: copy the exact expression from the provided layout reference preview (mouth shape, smirk/neutral/open state, eye openness, eyebrow position, head tilt and gaze direction). For the Hero Word Glow reference this should read as a calm normal/direct look, NOT a crazy laugh, NOT exaggerated surprise, NOT wide-open comedy face. Photo-real 85mm DSLR, glossy filmic skin, razor-sharp eyes. IDENTITY FORENSICALLY LOCKED to the uploaded photo: same skull shape, same beard density and exact beard shape, same hairline, same skin tone, same nose, same eyes. Do NOT idealize, slim, age, or swap identity. LIGHTING: body stays in natural neutral dark studio light — NO cyan/blue rim light on hair, shoulders or body. Only the FACE catches a very subtle cool tint from the icon on the side facing it (max 15% intensity, like distant ambient glow).
- Cinematic, premium, mostly DARK YouTube-thumbnail hero aesthetic. Read order: WORD upper-left → glowing ICON center on palm → reference-matched PERSON right. Absolutely nothing else in the frame.`,
    promptNoSubject: `LAYOUT — HERO WORD (no subject — glowing 3D TOOL app-icon + ONE huge single word):
- Background: almost pure black #030308 to #07070C — MOSTLY DARK, only a subtle dark-blue radial vignette behind the icon. NO traces, NO grid, NO busy patterns. Deep cinematic darkness, fine grain.
- CENTER-LOWER: ONE oversized floating 3D app icon (~30% of canvas height) with strong emissive light and soft bloom. The icon is placed LOWER so the word above never overlaps it.
  • MUST be the LITERAL APP/TOOL LOGO of the single KEY WORD. Mandatory.
  • Known brand (ChatGPT, Claude, Gemini, Midjourney, Figma, Notion, Photoshop, Premiere, Canva, Cursor, GitHub, Lovable, Supabase, Vercel, Linear, n8n, Zapier, etc.) → render its OFFICIAL real app icon in true brand colors as premium 3D liquid-glass.
  • Generic concept (Design, Code, AI, Video, Music, Write, Analytics, Photo, Edit, Chat, Brain, Cloud, Speed, Lock, Idea) → amber liquid-glass squircle with 3D glyph literally representing it.
- TOP-LEFT (high above the icon, clearly separated): ONE huge bright SINGLE WORD (Inter Heavy), Ice White #FCFEFF, Title Case — the ONE essence word of the headline (tool name or core concept). HARD LIMIT: MAX 8 CHARACTERS. If longer, use a shorter synonym/abbreviation (Midjourney → MJ, ChatGPT → GPT, Photoshop → PS, Analytics → Data). Never multiple words, never filler, never more than 8 characters. ~35–45% canvas width, generous tracking, subtle white glow. The word must be FULLY VISIBLE — NO part of it may be behind or occluded by the icon. Clear empty dark space between word and icon.
- BRAND EXCEPTION: icon uses its true brand colors. Headline pure Ice White. Background deep near-black.
- ONLY ONE WORD in the whole image. No subtitles, no badges, no extra text. Cinematic, dramatic, ultra-premium, mostly dark.`,
  },
  {
    id: "ai-assistant-glow",
    label: "AI Assistant Glow Hands",
    promptWithSubject: `LAYOUT — AI ASSISTANT GLOW HANDS. MATCH THIS EXACT COMPOSITION (mirrors the provided reference image): person centered, both hands raised at chest height cupping a floating 3D app-icon of the KEY TOOL, with a bold hand-drawn white arrow pointing at the icon and a HERO TWO-WORD headline in the upper area.
- BACKGROUND: pure near-black #030308 with a subtle APEX Blue #00BCFF radial glow behind the hands/icon. Empty otherwise — no grid, no patterns, no extra objects, no secondary text.
- HERO HEADLINE (top area, ~40% canvas width): two short bold uppercase words in Inter Heavy / SF Pro Display Black, pure Ice White #FCFEFF with a soft white outer glow. Perfect kerning.
- 3D ICON (center, floating just above the open cupped hands, ~28–34% of canvas height): oversized glossy 3D liquid-glass app icon of the KEY TOOL from the BLOG CONTEXT.
  • If it's a known brand (ChatGPT, Claude, n8n, Zapier, Midjourney, Figma, Notion, Cursor, Lovable, Supabase, Vercel, Linear, etc.) → render its OFFICIAL real app icon in correct shape, glyph and TRUE brand colors as a premium 3D liquid-glass version.
  • The icon keeps its native colors, BUT all glow, halo, rim light and ambient light spill around the icon and on the hands MUST be APEX BLUE / CYAN #00BCFF only (never orange, red, green or any other color — regardless of the icon's own colors).
- ARROW: one bold hand-drawn WHITE arrow (marker-style, slight imperfection, subtle white glow) originating from the headline area and pointing directly at the 3D icon. Exactly ONE arrow. No second arrow.
- PERSON (centered, chest-up, both hands visible cupping the icon): the man from the uploaded photo, wearing a dark shirt/jacket. FACIAL PERFORMANCE IS REFERENCE-LOCKED: copy the exact expression from the AI Assistant Glow Hands reference preview — confident smirk, closed mouth, subtle one-sided smile, calm intense direct gaze into camera, same eye openness, eyebrow angle and head pose. NO crazy laugh, NO open mouth, NO surprised face. Photo-real 85mm DSLR, glossy filmic skin. IDENTITY FORENSICALLY LOCKED to the uploaded photo: same skull shape, same beard density and exact beard shape, same hairline, same skin tone, same eyes. Do NOT idealize, slim, age, or swap identity. LIGHTING: body in natural neutral dark studio light; the face and hands catch a soft APEX Blue #00BCFF rim from the glowing icon.
- Cinematic, ultra-premium, mostly dark YouTube-thumbnail aesthetic. Read order: HEADLINE top → ARROW → glowing ICON on hands → SMIRKING PERSON. Nothing else in the frame.`,
    promptNoSubject: `LAYOUT — AI ASSISTANT GLOW HANDS (no subject):
- Deep near-black background with subtle APEX Blue radial glow.
- CENTER: floating 3D app icon of the KEY TOOL from BLOG CONTEXT (official brand colors and glyph, premium liquid-glass). Glow / halo / rim light strictly APEX Blue #00BCFF regardless of the icon's own colors.
- TOP: two-word Ice White uppercase hero headline (Inter Heavy) with soft white glow.
- One bold hand-drawn white arrow pointing at the icon. Nothing else.`,
  },
  {
    id: "sticky-board",
    label: "Sticky Notes Board",
    promptWithSubject: `LAYOUT — GLASS STICKY BOARD (APEX liquid-glass post-its connected by dashed line):
- Background: Deep Ocean #001A23 → Graphite Gray #1E2126 soft gradient with a subtle APEX Blue #00BCFF aurora glow bloom behind the subject, very faint cyan vignette, fine grain. Mostly dark, premium cinematic.
- SUBJECT (person from uploaded photo) CENTERED, chest-up, calm confident slight smile, sharp eye contact, photo-real 85mm DSLR, soft natural key light. LIGHTING: NO cyan rim light around body, hair, or shoulders — body stays in natural neutral light against the dark background. Only the FACE catches a very subtle, soft cyan #00BCFF tint on the cheekbones / temple (faint, like distant ambient glow, max 15% intensity). IDENTITY FORENSICALLY LOCKED — same skull shape, same beard density and shape, same hairline, same skin tone, same exact features as the uploaded photo. Do NOT idealize, slim, or swap identity.
- AROUND the head, 4 floating LIQUID-GLASS sticky tiles (visionOS / Apple Liquid Glass aesthetic): translucent frosted glass squares (~13% canvas width each), 1px APEX Blue #00BCFF hairline border at 35% opacity, soft inner shadow + outer cyan glow, gentle blur backdrop, subtle highlight on top edge, small rounded corners, each very slightly rotated. 2 tiles on the LEFT, 2 on the RIGHT. NO yellow paper, NO pushpins — they are glass panels, not post-its.
- Each glass tile contains ONE clean modern line-icon in APEX Blue #00BCFF that semantically matches the BLOG TOPIC (e.g. magnifier-on-doc, person silhouette, gear cluster, eye-with-$, lightbulb, chart, checklist, target — pick 4 fitting). Tiny tracked uppercase Ice White label under each icon inside the tile (max 6 chars) — allowed only inside the tiles.
- ALL 4 glass tiles are CONNECTED with ONE continuous thin WHITE DASHED LINE that arcs THROUGH/BEHIND the subject's head, passing from tile to tile in order (left-far → left-near → right-near → right-far). The dashed line is clearly visible (white, ~2px, dash 8/gap 6, subtle outer glow), forming one flowing arc.
- BOTTOM third: HUGE modern bold sans-serif headline (Inter Heavy / SF Pro Display Black / Söhne Heavy) ALL-CAPS, Ice White #FCFEFF, max 1 line if possible (2 short max), spanning full width, tight modern tracking, subtle soft glow. Under ONE key word: a thick APEX Blue #00BCFF glowing marker underline scribble (slightly imperfect 2 quick strokes).
- Premium, photo-real, cinematic, mostly dark, APEX liquid-glass aesthetic. No yellow, no red, no chalkboard texture.`,
    promptNoSubject: `LAYOUT — GLASS STICKY BOARD (no subject):
- Deep Ocean → Graphite gradient with subtle APEX Blue aurora glow, mostly dark, fine grain.
- 4–5 floating LIQUID-GLASS tiles (visionOS / Apple Liquid Glass): translucent frosted, 1px APEX Blue hairline, soft inner shadow + cyan outer glow, slightly rotated, arranged in a loose arc across the upper two thirds. Each holds ONE clean APEX Blue line-icon matching the BLOG TOPIC + tiny tracked uppercase Ice White label (max 6 chars) inside the tile.
- ONE continuous thin WHITE DASHED LINE (~2px, dash 8/gap 6, subtle glow) connects all tiles in a flowing arc through the canvas.
- BOTTOM third: HUGE modern bold Ice White ALL-CAPS sans-serif (Inter Heavy), 1 line if possible, with a thick APEX Blue glowing marker underline scribble under one key word. No yellow, no red.`,
  },
  {
    id: "notebook-grid",
    label: "Glass Notebook Grid",
    promptWithSubject: `LAYOUT — GLASS NOTEBOOK GRID (APEX liquid-glass editorial grid + portrait):
- Background: Deep Ocean #001A23 → Graphite Gray #1E2126 soft gradient with a subtle APEX Blue #00BCFF aurora glow bloom on the left, very faint cyan vignette, fine grain. Over the entire background, a subtle GRAPH-PAPER grid drawn in thin APEX Blue #00BCFF lines at ~12% opacity (fine 1px squares, ~36px) — feels like a futuristic engineering canvas, not paper.
- SUBJECT (person from uploaded photo) anchored on the RIGHT third, chest-up, hand thoughtfully resting near temple or chin, looking dead-straight into camera with a serious calm deadpan expression. Photo-real 85mm DSLR, glossy filmic skin. LIGHTING: NO cyan rim light around body, hair, or shoulders — body stays in natural neutral light against the dark background. Only the FACE catches a very subtle, soft cyan #00BCFF tint on the cheekbones / temple (faint, like distant ambient glow, max 15% intensity). IDENTITY FORENSICALLY LOCKED — same skull shape, same beard density and shape, same hairline, same skin tone, same exact features as the uploaded photo. Do NOT idealize, slim, or swap identity.
- LEFT 55–60%: headline stacked in THREE short lines in HUGE modern bold sans-serif (Inter Heavy / SF Pro Display Black), Ice White #FCFEFF, mixed case, left-aligned. The MIDDLE line is the punchy power phrase (number + noun if possible) rendered in the heaviest weight. Under the MIDDLE line: a thick APEX Blue #00BCFF glowing marker underline scribble (slightly imperfect).
- Optional: a very faint translucent liquid-glass panel behind the headline stack (1px APEX Blue hairline, soft glow, ~15% opacity backdrop) — keeps the editorial feel but unmistakably APEX.
- No cream paper, no beige, no black headline. Premium, photo-real, cinematic, mostly dark, APEX liquid-glass aesthetic.`,
    promptNoSubject: `LAYOUT — GLASS NOTEBOOK GRID (no subject):
- Deep Ocean → Graphite gradient with subtle APEX Blue aurora glow, mostly dark.
- Subtle APEX Blue graph-paper grid (~12% opacity) across the whole background.
- Headline stacked in 3 short lines, HUGE modern bold Ice White sans-serif (Inter Heavy), left-aligned, mixed case. The MIDDLE line is the punchy power phrase in the heaviest weight, with a thick APEX Blue glowing marker underline scribble under it. Optional faint translucent glass panel behind the stack.`,
  },
  {
    id: "apex-top5-stack",
    label: "Top Stack Icons",
    promptWithSubject: `LAYOUT — APEX TOP STACK ICONS (premium creator YouTube hero, mirrors the reference preview exactly):
- BACKGROUND: pure near-black #030308 with a soft APEX Blue #00BCFF radial glow bleeding from behind the icon stack on the LEFT half. Empty otherwise, no grid, no patterns, no secondary text or badges.
- LEFT HALF (icon stack, ~45% of canvas): a loose 3D stack of 4–5 oversized glossy 3D LIQUID-GLASS SQUIRCLE app icons (iOS/visionOS aesthetic — translucent tiles, slight 3D perspective, each rotated a few degrees, softly overlapping in a diamond/plus arrangement, some closer some further with mild depth-of-field). Bottom tile hovers just above a partially visible open human palm at the lower-left edge. Each tile displays a REAL OFFICIAL AI/creative tool app icon in TRUE brand colors and correct glyph (from the TOOLS list in BLOG CONTEXT; if the list is short, fall back to ChatGPT, Claude, Midjourney, Gemini, Runway, Notion). NEVER fake/garbled logos, NEVER text labels on the tiles. Every tile gets a subtle cyan #00BCFF rim/halo glow around it (regardless of the tile's own colors).
- RIGHT HALF (subject, ~55% of canvas): the man from the uploaded photo, chest-up cinematic 85mm DSLR portrait, black shirt/blazer, calm confident SMIRK (closed mouth, subtle one-sided smile), sharp direct eye contact into camera. IDENTITY FORENSICALLY LOCKED — same skull shape, same beard density and exact beard shape, same hairline, same skin tone, same features as the uploaded photo. Do NOT idealize, slim, age, or swap identity. LIGHTING: body in natural neutral dark studio light; ONLY the face and near-shoulder catch a subtle soft APEX Blue rim from the icons' glow (max 20% intensity).
- BOTTOM (headline, spans full width): ONE MASSIVE ALL-CAPS two-word or three-word headline in Inter Heavy / SF Pro Display Black. TWO-TONE SPLIT: the FIRST word rendered in pure Ice White #FCFEFF, the REMAINING word(s) rendered in APEX Blue #00BCFF. Tight modern tracking, subtle outer glow on both parts. NO gold, NO yellow. Baseline near the bottom edge, letters bold enough to feel iconic.
- Absolutely nothing else in the frame. No sub-caption, no badge, no arrows, no watermark.`,
    promptNoSubject: `LAYOUT — APEX TOP STACK ICONS (no subject):
- Near-black #030308 background with soft APEX Blue radial glow behind a centered icon stack.
- 5 oversized 3D liquid-glass squircle app icons in a diamond/plus stack, each showing an official AI/creative tool icon in TRUE brand colors (from BLOG CONTEXT TOOLS list). Cyan halo around every tile.
- Bottom: MASSIVE ALL-CAPS headline, Inter Heavy, TWO-TONE — first word Ice White, remaining word(s) APEX Blue #00BCFF, tight tracking, subtle glow. Nothing else.`,
  },
  {
    id: "apex-shhh-row",
    label: "Shhh Icon Row",
    promptWithSubject: `LAYOUT — APEX SHHH ICON ROW (mirrors the reference preview exactly):
- BACKGROUND: pure near-black #030308 with a subtle APEX Blue #00BCFF radial glow behind the subject. Empty otherwise, no grid or patterns.
- SUBJECT centered vertically: the man from the uploaded photo, chest-up cinematic 85mm DSLR portrait, black shirt, ONE index finger pressed vertically against pursed closed lips in a clean "shhh" secret gesture, calm intense direct gaze into camera. IDENTITY FORENSICALLY LOCKED — same skull, exact beard density and shape, hairline, features. Face catches a subtle APEX Blue rim glow only (max 15%). Body stays in natural neutral studio light.
- HORIZONTAL ROW OF 4 ICONS at head/upper-body height: 2 on the LEFT of the head, 2 on the RIGHT of the head. Each is an oversized 3D LIQUID-GLASS SQUIRCLE app icon (visionOS liquid glass — translucent glossy tiles, slight 3D perspective), showing REAL OFFICIAL AI/creative tool icons in TRUE brand colors and correct glyph, pulled from the TOOLS list in BLOG CONTEXT (fallback: Notion, Frame.io, Descript, DaVinci Resolve). Every tile has a subtle cyan #00BCFF rim/halo glow. NEVER faked/garbled logos, NEVER text on tiles.
- BOTTOM: ONE MASSIVE full-width ALL-CAPS two-word headline in Inter Heavy. TWO-TONE SPLIT: first word Ice White #FCFEFF, second word APEX Blue #00BCFF. Tight modern tracking, subtle outer glow. Baseline near the bottom edge.
- Nothing else in the frame. No arrows, no captions, no badges, no watermark.`,
    promptNoSubject: `LAYOUT — APEX SHHH ICON ROW (no subject):
- Near-black background with subtle APEX Blue radial glow.
- Horizontal row of 5 oversized 3D liquid-glass squircle app icons across the middle, each an official AI/creative tool icon in TRUE brand colors (from BLOG CONTEXT TOOLS). Subtle cyan halo per tile.
- Bottom: MASSIVE ALL-CAPS two-word headline, Inter Heavy, first word Ice White, second word APEX Blue #00BCFF, subtle glow. Nothing else.`,
  },
  {
    id: "apex-versus-duel",
    label: "Versus Duel",
    promptWithSubject: `LAYOUT — APEX VERSUS DUEL (mirrors the reference preview exactly):
- BACKGROUND: pure near-black #030308 with a subtle APEX Blue #00BCFF radial glow behind the subject. Empty otherwise.
- SUBJECT centered: the man from the uploaded photo, chest-up cinematic 85mm DSLR portrait, black turtleneck/shirt, SKEPTICAL EVALUATING expression — brows slightly furrowed, mouth closed, direct piercing gaze into camera, subtle micro-judgment. IDENTITY FORENSICALLY LOCKED — same skull, beard density and shape, hairline, features. Face catches subtle APEX Blue rim glow only.
- LEFT OF THE HEAD: ONE oversized 3D LIQUID-GLASS SQUIRCLE app icon (~24% canvas height) with the OFFICIAL logo of the FIRST tool from the BLOG CONTEXT TOOLS list in TRUE brand colors and correct glyph. Subtle cyan #00BCFF halo around the tile.
- RIGHT OF THE HEAD: ONE oversized 3D LIQUID-GLASS SQUIRCLE app icon (same size) with the OFFICIAL logo of the SECOND tool from the TOOLS list in TRUE brand colors. Same cyan halo treatment. If only one tool exists in context, use the primary tool on both sides with a subtle competitor generic icon on one side — always keep logos real.
- BOTTOM: MASSIVE full-width ALL-CAPS headline in Inter Heavy formulated as a versus question ("BESSER ALS X?", "X ODER Y?", etc — derived from the actual headline). TWO-TONE SPLIT: setup words in Ice White #FCFEFF, the KEY subject/tool word + question mark in APEX Blue #00BCFF. Tight tracking, subtle outer glow.
- Absolutely nothing else. No arrows, no VS glyph, no badge, no captions.`,
    promptNoSubject: `LAYOUT — APEX VERSUS DUEL (no subject):
- Near-black background with subtle APEX Blue radial glow.
- Centered: TWO oversized 3D liquid-glass squircle app icons side by side (~30% canvas height), each an official tool logo from BLOG CONTEXT TOOLS in TRUE brand colors, subtle cyan halo per tile.
- Bottom: MASSIVE ALL-CAPS versus headline (Inter Heavy), setup words Ice White, key word APEX Blue #00BCFF. Nothing else.`,
  },
  {
    id: "apex-single-hero",
    label: "Single Hero Icon",
    promptWithSubject: `LAYOUT — APEX SINGLE HERO ICON (mirrors the reference preview exactly):
- BACKGROUND: pure near-black #030308 with a bright APEX Blue #00BCFF radial glow bleeding from behind the icon on the LEFT half. Empty otherwise.
- LEFT HALF (~45%): ONE oversized 3D LIQUID-GLASS SQUIRCLE app icon (~50% canvas height, dominant hero), hovering just above a partially visible open human palm at the lower-left edge. Icon MUST be the OFFICIAL logo of the SINGLE PRIMARY tool/topic from the BLOG CONTEXT TOOLS list in TRUE brand colors and correct glyph (never generic, never faked). Strong cyan #00BCFF emissive glow spilling into the scene, subtle bloom, cinematic.
- RIGHT HALF (~55%): the man from the uploaded photo, chest-up cinematic 85mm DSLR portrait, black shirt, EXCITED-BUT-CONTROLLED expression (subtle open half-smile, slightly raised eyebrows in mild surprise, sharp direct eye contact — NOT wide-open cartoon shock). IDENTITY FORENSICALLY LOCKED to the uploaded photo — same skull, beard, hairline, features. Face catches soft APEX Blue rim glow from the icon side (max 25%). Body in neutral studio light.
- BOTTOM (spans full width): MASSIVE ALL-CAPS two-word (or one-word + exclamation) headline in Inter Heavy. TWO-TONE SPLIT: setup word Ice White #FCFEFF, hero word APEX Blue #00BCFF with the exclamation/question mark. Tight tracking, subtle outer glow, baseline near the bottom edge.
- Nothing else. No secondary text, no badge, no arrow, no watermark.`,
    promptNoSubject: `LAYOUT — APEX SINGLE HERO ICON (no subject):
- Near-black background with bright APEX Blue radial glow center.
- ONE oversized 3D liquid-glass squircle app icon centered (~55% canvas height), the OFFICIAL logo of the primary tool from BLOG CONTEXT in TRUE brand colors. Strong cyan emissive glow.
- Bottom: MASSIVE ALL-CAPS two-word headline, Inter Heavy, first word Ice White, hero word APEX Blue #00BCFF. Nothing else.`,
  },
  {
    id: "apex-chin-icon",
    label: "Chin Thinking Icon",
    promptWithSubject: `LAYOUT — APEX CHIN THINKING ICON (mirrors the reference preview exactly):
- BACKGROUND: pure near-black #030308 with a subtle APEX Blue #00BCFF radial glow behind the icon on the RIGHT. Empty otherwise.
- LEFT HALF (~45%): the man from the uploaded photo, chest-up cinematic 85mm DSLR portrait, black turtleneck or shirt, thumb-and-index-finger resting THOUGHTFULLY against chin, SKEPTICAL EVALUATING expression — brows slightly raised or furrowed, mouth pursed and closed, sharp direct eye contact. IDENTITY FORENSICALLY LOCKED — same skull, beard, hairline, features. Face catches subtle APEX Blue rim from the icon side. Body in neutral studio light.
- RIGHT HALF (~55%): ONE oversized 3D LIQUID-GLASS SQUIRCLE app icon (~55% canvas height, dominant), the OFFICIAL logo of the primary tool/topic from BLOG CONTEXT in TRUE brand colors and correct glyph. Slight 3D perspective, strong soft cyan #00BCFF glow spilling around it, translucent glossy tile with premium liquid-glass finish. Never faked logo, never text label on the tile.
- BOTTOM-RIGHT: MASSIVE ALL-CAPS stacked two-line headline in Inter Heavy, right-aligned or centered under the icon, formulated as a value/worthiness question ("LOHNT SICH X?"). TWO-TONE SPLIT: setup line Ice White #FCFEFF, second line with the tool/subject + question mark in APEX Blue #00BCFF. Tight tracking, subtle glow.
- Nothing else. No secondary text, no badge, no watermark.`,
    promptNoSubject: `LAYOUT — APEX CHIN THINKING ICON (no subject):
- Near-black background with subtle APEX Blue radial glow on the right.
- ONE oversized 3D liquid-glass squircle app icon on the right (~55% canvas height), the OFFICIAL logo of the primary tool from BLOG CONTEXT in TRUE brand colors, strong cyan glow.
- Left/bottom: MASSIVE ALL-CAPS stacked two-line headline (question), first line Ice White, second line APEX Blue #00BCFF. Nothing else.`,
  },
  {
    id: "apex-transition-wall",
    label: "Transition Wall",
    promptWithSubject: `LAYOUT — APEX TRANSITION WALL (mirrors the reference preview exactly):
- BACKGROUND: pure near-black #030308 with a subtle APEX Blue #00BCFF radial glow behind the subject. No grid, no patterns.
- SUBJECT centered vertically and horizontally: the man from the uploaded photo, chest-up cinematic 85mm DSLR portrait, black shirt/blazer, calm confident direct gaze into camera with subtle micro-smile. IDENTITY FORENSICALLY LOCKED — same skull, beard density and shape, hairline, features. Face catches subtle APEX Blue rim glow only. Body in neutral studio light.
- BEHIND HIM: a curved 3D wall of 6 floating rectangular VIDEO/SCENE thumbnail tiles arranged as a fanned semicircle (3 tiles on the LEFT curving up and away from the subject, 3 tiles on the RIGHT curving up and away), each tile slightly rotated in 3D toward the viewer as if suspended in space, with soft rounded corners, subtle APEX Blue #00BCFF rim glow, and a very faint drop shadow. The subject is placed IN FRONT of the wall, slightly overlapping the innermost tiles for depth.
- TILE CONTENT: use the ADDITIONAL REFERENCE IMAGES supplied in this request AS THE CONTENT OF THE 6 TILES — render each supplied image inside its own tile in order (top-left first, then bottom-left, then top-right, then bottom-right, etc.), preserving each image's original composition and colors. If fewer than 6 images are supplied, repeat/rearrange them naturally to fill 6 tiles. If NO extra images are supplied, generate 6 distinct moody cinematic mini-scenes derived from the BLOG CONTEXT topics (each a different environment/subject related to the blog).
- BOTTOM: MASSIVE full-width ALL-CAPS headline stacked over 1–2 lines in Inter Heavy. TWO-TONE SPLIT: setup word(s) Ice White #FCFEFF, key subject word APEX Blue #00BCFF. Tight tracking, subtle outer glow.
- Absolutely nothing else. No badges, no watermarks, no arrows.`,
    promptNoSubject: `LAYOUT — APEX TRANSITION WALL (no subject):
- Near-black background with subtle APEX Blue radial glow.
- CENTER: a curved 3D wall of 6 floating rectangular video/scene thumbnail tiles fanned in a semicircle, each slightly rotated in 3D toward the viewer, rounded corners, subtle cyan rim glow.
- Tile content: use the supplied ADDITIONAL REFERENCE IMAGES verbatim (one per tile, in order); if none supplied, generate 6 cinematic mini-scenes from BLOG CONTEXT topics.
- Bottom: MASSIVE ALL-CAPS headline (Inter Heavy), first part Ice White, key word APEX Blue #00BCFF. Nothing else.`,
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

function extractHeroWord(headline: string): string {
  const brands: Record<string, string> = {
    chatgpt: "GPT", claude: "CLAUDE", gemini: "GEMINI", midjourney: "MJ",
    sora: "SORA", runway: "RUNWAY", figma: "FIGMA", notion: "NOTION",
    photoshop: "PS", illustrator: "AI", premiere: "PR", lightroom: "LR",
    canva: "CANVA", cursor: "CURSOR", github: "GITHUB", slack: "SLACK",
    youtube: "YT", instagram: "IG", tiktok: "TT", spotify: "SPOTIFY",
    lovable: "LOVABLE", supabase: "SUPA", vercel: "VERCEL", linear: "LINEAR",
    perplexity: "PERP", n8n: "N8N", zapier: "ZAP", blender: "BLENDER",
    capcut: "CAPCUT", mcp: "MCP", marketing: "SALES", analytics: "DATA",
    automation: "AUTO", development: "DEV", programming: "CODE", business: "BIZ",
    strategy: "STRAT", management: "MGMT", productivity: "PROD", creativity: "CREATE",
    generation: "GEN", intelligence: "AI", optimization: "OPT", transformation: "TRANS",
    communication: "COMM", collaboration: "COLLAB", application: "APP",
    platform: "PLAT", design: "DESIGN", photo: "PHOTO", video: "VIDEO",
    music: "MUSIC", write: "WRITE", edit: "EDIT", chat: "CHAT", brain: "BRAIN",
    cloud: "CLOUD", speed: "SPEED", lock: "LOCK", idea: "IDEA",
  };
  const lower = headline.toLowerCase().replace(/[^\w\s]/g, " ");
  for (const [key, val] of Object.entries(brands)) {
    if (lower.includes(key)) return val;
  }
  const stop = new Set([
    "how","to","use","the","a","an","and","or","for","with","in","on","at","by","from","of",
    "is","are","was","were","be","been","being","have","has","had","do","does","did",
    "will","would","could","should","may","might","must","can","this","that","these","those",
    "i","you","he","she","it","we","they","me","him","her","us","them","my","your","his",
    "its","our","their","what","which","who","when","where","why","all","each","every",
    "both","few","more","most","other","some","such","no","not","only","own","same","so",
    "than","too","very","just","now","then","here","there","up","down","out","off","over",
    "under","again","further","once","also","back","still","as","if","about","into",
    "through","during","before","after","above","below","between","among","within",
    "without","against","across","behind","beyond","despite","except","inside","outside",
    "throughout","toward","underneath","until","upon","while","new","top","best",
    "ultimate","complete","full","guide","tutorial","tips","tricks","hacks","review","vs",
    "versus","beginner","advanced","pro","easy","quick","fast","simple","free","paid",
    "2024","2025","2026","2027",
  ]);
  const words = lower.split(/\s+/).filter(w => w.length > 1 && !stop.has(w));
  if (words.length === 0) {
    const fallback = lower.split(/\s+/).filter(w => w.length > 0);
    return (fallback[0] || "APEX").toUpperCase().slice(0, 8);
  }
  const w = words[0].toUpperCase();
  return w.length <= 8 ? w : (brands[words[0]] || w.slice(0, 8));
}

function buildBlogThumbnailPrompt(
  headline: string,
  layoutPrompt: string,
  hasSubject: boolean,
  hasStyleRef: boolean,
  ctx?: BlogContext,
  layoutId?: string,
): string {
  const isHeroWord = layoutId === "hero-word";
  const renderHeadline = isHeroWord ? extractHeroWord(headline) : headline;
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
    ? `═══ STYLE REFERENCE — HIGHEST VISUAL PRIORITY, MATCH THE LOOK, ADAPT THE CONTENT ═══
A SECOND image is attached AFTER the subject photo. It is the OFFICIAL APEX preview of THIS exact layout. Treat it as the visual ground truth FOR STYLE ONLY — match it 1:1 on:
• Composition, subject placement, framing, crop, camera angle
• Typography style, weight, size, placement, color, casing
• Background treatment (gradients, glow, traces, panels, textures)
• Color palette and how each color is used
• Lighting direction, rim light, shadow shape, overall mood
• FACIAL PERFORMANCE of the subject: mirror the exact expression shown in the reference — same mouth shape (closed-mouth smirk / neutral / open / laughing), same eye state (wide / calm / narrowed), same eyebrow position, same head tilt, same gaze direction, same emotional intensity. This is NOT optional mood inspiration; it is a strict copy target.
• If any layout text below conflicts with the reference expression, IGNORE the layout text and follow the reference. The reference expression overrides words like shocked, amazed, laughing, smiling, serious, surprised, intense, etc.
• Apply the reference expression to the identity-locked face from the FIRST image. The final face must look like the uploaded person wearing the exact expression/pose from the reference preview.
• Number, shape, size and arrangement of decorative panels / tiles / cards / brackets

CRITICAL — DO NOT copy the reference's CONTENT, only its style:
• DO NOT copy the reference's person/face — replace with the subject from the FIRST image (their identity is locked above).
• DO NOT copy the reference's headline text — replace with the HEADLINE below.
• DO NOT copy the reference's ICONS, LOGOS, GLYPHS, CHART SHAPES, CODE LINES, PROMPT TEXT, METRIC NUMBERS, LABELS, or any other content-bearing element. These MUST be re-derived from the BLOG CONTEXT section below so the thumbnail visually represents THIS specific blog. If the reference shows a magnifier icon but the blog is about video, render a video-camera icon in the same tile style. If the reference shows "ChatGPT" but the blog talks about Midjourney, render Midjourney. Same VISUAL LANGUAGE, different SEMANTIC CONTENT.
The output should be visually indistinguishable from the reference in STYLE, while every content element clearly reflects this blog's topic, tools, and metrics.
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
• Perfect spelling. No typos. No gibberish letters.${hasSubject ? "" : "\n• NO people, NO faces, NO portraits."}${isHeroWord ? "\n• HERO WORD LAYOUT ADDITIONAL RULE: ZERO additional text. No word count label. No step number. No micro-caption. No badge. No UI element with text. Not a single letter besides the one headline word." : ""}

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
  if (layoutId === "hero-word") {
    const heroWord = extractHeroWord(headline);
    const primaryTool = ctx.tools[0] || "";
    const primaryTopic = ctx.topics[0] || "";
    blocks.push(`\n═══ HERO WORD ICON OVERRIDE (mandatory — overrides any icon visible in the style reference) ═══
The floating 3D app icon on the palm MUST literally represent THIS blog's subject — not whatever icon the style reference shows.
• Hero word being rendered: "${heroWord}"
${primaryTool ? `• Primary tool from blog: "${primaryTool}" — render its OFFICIAL real app icon (correct shape, glyph, true brand colors) as a premium 3D liquid-glass version on the palm.\n` : ""}${!primaryTool && primaryTopic ? `• Primary blog topic: "${primaryTopic}" — render a stylized 3D liquid-glass squircle icon with a literal 3D glyph for this concept.\n` : ""}DO NOT render the icon from the style reference (e.g. if the reference shows OnePage, ChatGPT, Notion, or any other logo, IGNORE it). The icon must match the hero word and blog tool above. Same VISUAL TREATMENT as the reference (size, palm placement, glow, rim light, occlusion of the word) — different LOGO/GLYPH.`);
  }
  return blocks.join("\n");
})()}

═══ HEADLINE TO RENDER (verbatim, perfect spelling) ═══
${renderHeadline}

CRITICAL: render the headline as plain text WITHOUT any surrounding quotation marks (no " " no “ ” no ' ' no ‘ ’). No quote glyphs anywhere on the image.

OUTPUT: a single premium 16:9 minimalist APEX brand thumbnail image. Sharp, intentional, editorial. Top 1% quality.`;
}

async function callGeminiImage(
  prompt: string,
  apiKey: string,
  imageBase64?: string,
  referenceStyleBase64?: string,
  logoBase64?: string,
): Promise<string> {
  const contentParts: Array<Record<string, unknown>> = [];
  if (imageBase64) contentParts.push({ type: "image_url", image_url: { url: imageBase64 } });
  if (referenceStyleBase64) contentParts.push({ type: "image_url", image_url: { url: referenceStyleBase64 } });
  if (logoBase64) contentParts.push({ type: "image_url", image_url: { url: logoBase64 } });
  const finalPrompt = logoBase64
    ? `${prompt}\n\nBRAND LOGO INTEGRATION: The last attached image is a brand logo / tool icon. Integrate it PROMINENTLY and NATURALLY into the APEX layout — keep the logo's EXACT ORIGINAL COLORS, shape and proportions intact (never redraw, never restyle, never recolor the logo itself — if the uploaded logo is pink, keep it pink; if orange, keep it orange; if green, keep it green). Depending on the layout, place it as a floating hero icon, on a device / app tile, or as a small corner brand mark. Do NOT distort, do NOT recolor, do NOT add text to the logo. IMPORTANT: any GLOW, RIM LIGHT, HALO, AMBIENT LIGHT, REFLECTION or LIGHT SPILL around/behind/on the logo must ALWAYS be APEX BLUE / CYAN (#00BCFF) — regardless of the logo's own colors. The logo keeps its native colors, but the surrounding light is always apex blue.`
    : prompt;
  contentParts.push({ type: "text", text: finalPrompt });

  const messages = [
    {
      role: "user",
      content: contentParts.length === 1 ? finalPrompt : contentParts,
    },
  ];

  const hasAnyImage = !!imageBase64 || !!referenceStyleBase64 || !!logoBase64;
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
    // Fallbacks — Gemini image responses sometimes embed the image differently
    const msg = data.choices?.[0]?.message;
    const altUrl =
      msg?.image_url?.url ||
      msg?.content?.find?.((c: { type?: string; image_url?: { url?: string } }) => c?.type === "image_url")?.image_url?.url ||
      (typeof msg?.content === "string" && msg.content.startsWith("data:image") ? msg.content : undefined);
    if (altUrl) return altUrl;
    console.error("[callGeminiImage] No image in response. finish_reason:", data.choices?.[0]?.finish_reason, "message keys:", msg ? Object.keys(msg) : "none");
    lastError = `No image returned (finish_reason=${data.choices?.[0]?.finish_reason ?? "?"})`;
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
    const logoBase64: string | undefined = typeof body.logoBase64 === "string" && body.logoBase64 ? body.logoBase64 : undefined;
    const rawForcedIds: string[] = Array.isArray(body.forcedLayoutIds)
      ? body.forcedLayoutIds.filter((x: unknown): x is string => typeof x === "string" && !!x)
      : (typeof body.forcedLayoutId === "string" && body.forcedLayoutId ? [body.forcedLayoutId] : []);
    const forcedLayouts = rawForcedIds
      .map((id) => APEX_BLOG_LAYOUTS.find((l) => l.id === id))
      .filter((x): x is typeof APEX_BLOG_LAYOUTS[number] => !!x);
    console.log("[blog-thumbs] rawForcedIds:", rawForcedIds, "-> matched layouts:", forcedLayouts.map(l => l.id));
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
        chunk.map((j) => callGeminiImage(j.prompt, LOVABLE_API_KEY, imageBase64, j.styleRef, logoBase64)),
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
    console.log("[blog-thumbs] settled:", settled.map(s => s.status), "-> images returned:", images.length, "of", jobs.length, "jobs");
    settled.forEach((s, i) => {
      if (s.status === "rejected") console.error(`[blog-thumbs] job ${i} (${jobs[i].layoutId}) rejected:`, (s.reason as Error)?.message);
    });

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

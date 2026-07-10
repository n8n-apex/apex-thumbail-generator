import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIDTH = 1280;
const HEIGHT = 720;

type VlogStyle = "lifestyle" | "podcast" | "testimonial";
type TextStyle = "serif" | "modern" | "none";
type PodcastStyle =
  | "clean-cutout"
  | "bold-hero"
  | "punchy-reaction"
  | "tools-showcase"
  | "podcast-frame"
  | "cinematic-portrait";
type TestimonialLayout =
  | "quote-card"
  | "five-star"
  | "before-after"
  | "result-number"
  | "magazine"
  | "chat-bubble";

const VLOG_STYLES: Record<VlogStyle, { label: string; prompt: string }> = {
  lifestyle: {
    label: "Lifestyle / Daily Vlog",
    prompt: `LIFESTYLE / DAILY VLOG im AUDI RS6 — warm, persönlich, cinematic.
- HERO CAR: Audi RS6 Avant (C8) — muss als Szene/Setting deutlich erkennbar sein. Korrekte RS6-Details: quattro-Schriftzug, Single-Frame-Grill, RS-Logo, Quad-Oval-Auspuff, breite Kotflügel, OLED-Heckleuchten.
- Setting: Subjekt im/am RS6 (Fahrersitz mit Lenkrad sichtbar, lehnend an der Karosserie, Tür offen, Tankstelle bei Nacht, Underground-Parkhaus, City-Street bei Sonnenuntergang).
- Warmes Golden-Hour- oder gemütliches Innenraum-Licht (Dashboard-Glow, Ambient Light der RS6-Kabine), creamy Hauttöne, feines Filmkorn.
- Color Grade: warmes Cream/Amber gemischt mit dem tiefen Lack des RS6 (Daytona Grey / Nardo / Mythos Black) — ein einzelner gesättigter Akzent.
- Stimmung: candid, lifestyle, "ein Tag mit dem RS6".`,
  },
  podcast: {
    label: "Podcast",
    prompt: `PODCAST / INTERVIEW thumbnail — modern, premium, instant scroll-stop. Specific sub-style is provided separately below; this is just the umbrella category.`,
  },
  testimonial: {
    label: "Testimonial",
    prompt: `TESTIMONIAL / SOCIAL PROOF thumbnail — high-converting, editorial, scroll-stopping. Reference: top creator-economy testimonial reels, Apple "Shot on iPhone" portraits, premium SaaS case-study covers.
- Subject: ONE real, relatable, photo-real person (client / customer / happy user) — confident genuine expression (warm smile, eyes-into-camera, slight head tilt), authentic skin texture, natural make-up, normal everyday outfit (NOT corporate stock-photo suit).
- Lighting: soft natural three-point or window key, gentle rim, creamy skin tones, shallow depth of field, real DSLR / 85mm portrait feel.
- Background: clean, intentional, premium — soft neutral studio gradient, blurred minimal interior, or simple branded color wash. Never busy, never office-stock.
- Composition: subject anchored on ONE side (left or right) leaving generous negative space for the quote / star rating / result number.
- Mood: trustworthy, premium, human, "this is a real person who got a real result" — never salesy, never cheesy, never stock-photo.`,
  },
};

const PODCAST_STYLES: Record<PodcastStyle, { label: string; prompt: string }> = {
  "clean-cutout": {
    label: "Clean Cutout (LinkedIn-style)",
    prompt: `CLEAN CUTOUT / EDITORIAL PODCAST THUMBNAIL — reference: top creator-economy podcasts.
- Background: PURE off-white with a very subtle light grey GRID pattern (graph-paper look), absolutely clean, no clutter.
- Subject: clean studio cutout on the LEFT third (head-to-shoulder), photo-realistic, sharp edges, soft natural studio key light, gentle drop shadow underneath for separation.
- Typography: huge bold modern SANS-SERIF (Inter / Söhne / Neue Haas Grotesk Display) in deep near-black, lowercase, two-line headline filling the RIGHT 2/3 of the canvas. One key word gets a thick brand-color highlighter underline (chunky marker stroke).
- Optional minimal vector glyph (chat bubble, app logo silhouette) sitting under the headline in flat brand color.
- Mood: editorial, calm, premium, LinkedIn-friendly.`,
  },
  "bold-hero": {
    label: "Bold Hero with Tool Frames",
    prompt: `BOLD HERO PODCAST THUMBNAIL with software/product frames either side — reference: top tech-podcast creators.
- Background: smooth dark navy or rich charcoal gradient with a soft brand-color glow behind subject.
- Subject: confident centered cutout (chest-up), arms relaxed or slight gesture, sharp studio lighting, soft rim light.
- TWO premium glass UI frames floating LEFT and RIGHT of the subject (code editor mockup, phone mockup, dashboard mockup) — semi-transparent glassmorphism, subtle green/cyan inner glow, light reflections.
- Big bold display SANS-SERIF headline at the TOP center in crisp near-white, balanced kerning, single line preferred.
- Subtle motion-style arrow or chevron between subject and frame for visual flow.
- Mood: premium product-demo energy, MKBHD x Apple keynote.`,
  },
  "punchy-reaction": {
    label: "Punchy Reaction (Big White Type)",
    prompt: `PUNCHY REACTION PODCAST THUMBNAIL — reference: viral self-improvement / fitness / mindset podcasts.
- Background: rich cinematic dark teal-to-deep-orange gradient, atmospheric, slightly out of focus, subtle film grain.
- Subject: dramatic close-up on the LEFT (face fills ~half the frame), expressive emotional look (raised eyebrow, mouth slightly open, intense eye contact), strong rim light, filmic skin tones.
- Typography: HUGE white display CONDENSED SANS-SERIF on the RIGHT (Anton, Bebas Neue feel), two-line headline, ALL CAPS, tight tracking. One letter inside the headline is REPLACED by a flat brand-color icon glyph (asterisk, sparkle, star) — same x-height, perfectly aligned.
- Below the headline: a small punchy rectangular brand-color BADGE with one short white caps phrase (e.g. "TRY THIS", "WATCH NOW").
- Mood: high-energy, scroll-stopping, premium reaction.`,
  },
  "tools-showcase": {
    label: "AI Tools Showcase",
    prompt: `AI TOOLS SHOWCASE PODCAST THUMBNAIL — reference: top AI/tech newsletter podcasts.
- Background: moody dark blue tech office or server-room bokeh, soft cinematic depth-of-field, subtle warm rim light.
- Subject: centered, chest-up behind an open laptop (laptop glow lighting the face from below), confident slight smile, studio-quality skin.
- Four to five floating SQUIRCLE GLASS APP ICONS hovering symmetrically around the subject's head/shoulders (think frosted glass squares with vivid flat logos inside — ChatGPT, Claude, Notion-style), each connected to the laptop with a thin glowing fiber-optic light line.
- Typography: ONE huge punchy display SANS-SERIF word at the BOTTOM center in vivid brand-yellow or brand color, ALL CAPS, tight tracking, slight soft glow.
- Mood: futuristic, AI-native, premium tech.`,
  },
  "podcast-frame": {
    label: "Podcast Show Frame",
    prompt: `PODCAST SHOW-FRAME THUMBNAIL — reference: No Priors, Lenny's, Acquired style.
- Background: deep saturated brand-color gradient (purple, navy, or dark magenta) with very subtle blurred UI/app screenshot ghosted behind for texture.
- TOP-LEFT corner: leave COMPLETELY EMPTY. Do NOT render any show logo, wordmark, brand name, channel name, podcast name, letters, or text of any kind in the top-left (or anywhere else outside the explicit headline). No "PRIORS", no "No Priors", no invented show names, no faux logos.
- Subject: clean cutout on the LEFT, chest-up, warm confident expression, soft studio key light, subtle rim.
- THREE squircle glass APP ICONS floating in the UPPER-RIGHT quadrant, slight perspective tilt, frosted glass with vivid flat logos.
- Headline: two-line bold display SANS-SERIF on the RIGHT/BOTTOM. First line in crisp white. Second line in italicized condensed display sans in vivid brand-orange or brand-color, slight slant, tight tracking.
- Mood: premium podcast brand, instantly recognizable, editorial.`,
  },
  "cinematic-portrait": {
    label: "Cinematic Editorial Portrait",
    prompt: `CINEMATIC EDITORIAL PORTRAIT PODCAST THUMBNAIL — reference: Vanity Fair / GQ / A24 cover aesthetic.
- Background: deep moody darkness, almost black, with one single soft warm side-light source (Rembrandt lighting), heavy chiaroscuro shadows, fine cinematic film grain.
- Subject: dramatic tight close-up on the RIGHT half of the frame (eyes-to-shoulder), intense direct eye contact into the camera, half-face lit / half-face in shadow, glossy filmic skin texture, sharp focus on the eyes, shallow depth-of-field.
- Typography: elegant tall DISPLAY SERIF wordmark (Canela, GT Sectra, Domaine Display) overlapping the subject — large title ACROSS THE TOP in semi-transparent off-white that the face partially eclipses (magazine-cover masthead effect), and the same/related title repeated SOLID white at the BOTTOM in slightly smaller scale. Restrained letter-spacing, all caps or small caps.
- No badges, no glows, no extra UI. Pure editorial restraint.
- Mood: prestige, cinematic, awards-season magazine cover.`,
  },
};

const TEXT_STYLES: Record<TextStyle, string> = {
  serif: `Elegant cinematic DISPLAY SERIF (Canela, GT Sectra, Recoleta, Playfair Display). Refined, restrained, magazine-cover quality — Vogue / WIRED / A24 / Apple TV+ aesthetic. Smart title-case, generous letter-spacing, hairline-thin to medium weight (NEVER ultra-black, NEVER bombastic). Subtle filmic tint, no glow spam, no thick drop shadow. Premium, quiet confidence.`,
  modern: `Apple keynote aesthetic. Clean GEOMETRIC SANS-SERIF (SF Pro Display, Inter, Söhne, Neue Haas Grotesk Display) in light to medium weight. Crisp white or warm off-white. Perfect optical tracking, mixed weight hierarchy, generous negative space. Minimal, intentional, A24 title-card calm. No bold-condensed, no oversized blocks.`,
  none: `NO text overlay — pure cinematic image only.`,
};

interface GenerateBody {
  action: "generate";
  vlogStyle: VlogStyle;
  textStyle: TextStyle;
  title?: string;
  brandColor?: string;
  imageBase64?: string;
  variants?: number;
  sceneDescription?: string;
  podcastStyles?: PodcastStyle[];
  podcastStyle?: PodcastStyle;
  testimonialLayouts?: TestimonialLayout[];
  testimonialLayout?: TestimonialLayout;
  referenceStyleBase64?: string;
  logoBase64?: string;
  autoTitle?: boolean;
  titleKeywords?: string;
  enforceApexCI?: boolean;
}


const TEXT_LAYOUTS = [
  "IMMERSION / TEXT-BEHIND-SUBJECT: Large display headline rendered BIG in the background BEHIND the subject (magazine-cover depth trick). The subject's head and shoulders occlude part of the letters, while the visible portions remain clearly readable. Letters extend wide across the frame (up to ~70% width) but sit in the background plane with subtle atmospheric haze, slight motion blur on the far edges, and color-graded to blend with the scene. Premium Vogue / Apple TV+ feel — never flat sticker text.",
  "BIG BACKGROUND TYPE — partial occlusion: Oversized elegant serif headline anchored in the upper background, partially hidden by the subject's silhouette and the car interior. Color slightly desaturated to recede behind the person, with cinematic film grain on the glyphs. Strong immersion, still legible on visible parts.",
  "Small refined headline in the TOP-LEFT corner, hairline weight, off-white with subtle warm tint — Apple-trailer minimalism.",
  "Headline in the LOWER-THIRD, centered, medium weight, soft filmic shadow for legibility — A24 poster calm.",
  "Headline beside the subject's shoulder in clean negative space, light weight, wide tracking — premium magazine feel.",
  "Headline TOP-RIGHT corner, compact, restrained, with a thin 1px underline accent in the brand color.",
  "Headline BOTTOM-LEFT, single line, italic display serif, warm cream, subtle film grain on glyphs.",
  "Headline TOP-CENTER, small caps, wide letter-spacing, semi-transparent white — elegant Netflix title-card look.",
];

// APEX TESTIMONIAL STYLES — Novist-reference quality, minimalist, premium, clickbait scroll-stop.
// Shared base every layout inherits:
const APEX_TESTIMONIAL_BASE = `
APEX TESTIMONIAL THUMBNAIL — top 1% YouTube testimonial cover. Reference quality: Novist-style premium customer story covers, Apple keynote restraint, Linear / Vercel marketing.
- AESTHETIC: minimalist, editorial, premium. ZERO clutter. ZERO stock-photo cheese. ZERO MrBeast loudness.
- BACKGROUND: deep cinematic dark (near-black charcoal #0A0F14 → deep navy #0E1822 soft gradient) with a faint subtle cyan glow blooming from behind the subject. Optional very subtle blurred interior bokeh (office / studio) — never busy.
- SUBJECT: ONE real photo-real person (the customer/client), cinematic medium portrait, shallow DOF, premium 85mm DSLR look, real skin micro-detail, soft three-point lighting, gentle cyan rim light on the hair/shoulder, warm natural skin tones, confident genuine micro-smile, sharp eye contact. NOT corporate stock-suit.
- BRAND COLOR: APEX cyan #00BCFF used SPARINGLY as the single accent (rim light hint, star glyphs, one underline, one badge — never flooded).
- TYPOGRAPHY: ONE single headline only — heavy modern sans-serif (Inter / Söhne / Neue Haas Grotesk Display, semibold/bold), tight tracking, mixed-case with smart quotation marks "..." wrapping the quote. Crisp off-white. Premium kerning. Two to three short lines max. The quote is the HOOK — clickbait energy via curiosity, not via shouting.
- 5-STAR ROW: 5 solid sharp star glyphs in APEX cyan #00BCFF, small, premium, never oversized — sits inside a small rounded "badge" capsule with a subtle glass tint OR floats above the quote.
- MICRO-BADGE (optional): one tiny pill-shaped capsule with a single short uppercase label like "KUNDENSTIMME" / "CASE STUDY" / "RESULT" in tiny tracked sans-serif, soft glass fill, cyan 1px border. Bottom-left corner only.
- GLASS / LIQUID-GLASS surfaces: quote container is a softly rounded translucent glass card (frosted, very subtle inner highlight, 1px cyan-tinted hairline border, soft drop shadow) — Apple Liquid-Glass feel. Never plastic, never heavy.
- ABSOLUTELY NO: fake names, fake logos, fake brand wordmarks, signature scribbles, hand-drawn arrows, comic fonts, neon glow spam, multiple headlines, second sub-headline, watermark, URL, @handle, hashtag, episode number, channel name. Render ONLY the single provided quote/headline. Any other text surface (laptop screen, lanyard, mug, t-shirt) must be BLANK.
- COMPOSITION: clear focal hierarchy — eye lands on the quote first, then the stars, then the face. Generous negative space. 16:9 landscape only.
`;

const TESTIMONIAL_STYLES: Record<TestimonialLayout, { label: string; prompt: string }> = {
  "quote-card": {
    label: "Glass Quote Card",
    prompt: `${APEX_TESTIMONIAL_BASE}
LAYOUT — GLASS QUOTE CARD (STRICT TEMPLATE — must match this exact composition every single time, only the person and the quote text change):

EXACT CANVAS LAYOUT (16:9, must be reproduced precisely):
- BACKGROUND: deep dark charcoal-to-navy gradient (#0A0F14 → #0E1822) with very subtle dark blurred interior bokeh (out-of-focus office/studio environment). Faint cyan glow bloom from behind the subject. No other elements.
- SUBJECT (person) anchored on the RIGHT side of the frame, occupying roughly the right 35–40% of the canvas. Chest-and-head portrait, cropped at upper chest, head near the top of the frame. Photo-real, cinematic 85mm DSLR look, shallow depth of field, soft three-point lighting, gentle cyan rim light on hair/shoulder, warm natural skin, confident genuine micro-smile, sharp eye contact toward camera. The subject's body slightly overlaps the right edge of the glass quote card (the card sits BEHIND the shoulder for depth).
- GLASS QUOTE CARD on the LEFT, vertically centered, occupying roughly the left 55–60% of the canvas width and the middle ~55% of the height. Large softly rounded rectangle (corner radius ~28px at 1920w scale), frosted translucent dark glass fill (very low opacity white tint over the dark bg), 1px hairline cyan-tinted border #00BCFF at ~25% opacity, soft diffuse drop shadow, subtle inner top-left highlight. Apple Liquid-Glass feel.
- FIVE-STAR CAPSULE: a small pill-shaped glass capsule sits CENTERED HORIZONTALLY at the TOP EDGE of the quote card, half-overlapping the card's top border (straddling it). Inside the capsule: exactly 5 solid sharp cyan stars #00BCFF, evenly spaced, medium-small size.
- HEADLINE (the quote): rendered INSIDE the glass card, centered both horizontally and vertically. Heavy modern sans-serif (Inter / Söhne / Neue Haas Grotesk Display, bold), crisp off-white #F2F5F8, tight tracking, generous line-height. WRAPPED IN SMART QUOTATION MARKS ("...") — opening quote at the start, closing quote at the end. Maximum 2 lines, broken naturally at a comma if present. Large display size — fills the card with comfortable padding.
- KUNDENSTIMME BADGE in the BOTTOM-LEFT corner of the canvas (with ~3% margin from edges): a small pill-shaped glass capsule, 1px cyan border #00BCFF, frosted dark glass fill, containing the single uppercase word "KUNDENSTIMME" (or "CASE STUDY" if the quote is English) in tiny tracked cyan sans-serif.

ABSOLUTE CONSISTENCY RULES:
- Position, size, and styling of the glass card, 5-star capsule, badge, and subject placement MUST be identical across every generation — this is a fixed brand template. Only the person's face/body and the quote text vary.
- NO additional text, NO name, NO company, NO logo, NO secondary line, NO arrows, NO icons beyond the 5 stars.
- The quote text must appear EXACTLY as provided, only wrapped in smart quotes.`,
  },
  "five-star": {
    label: "Five-Star Hero",
    prompt: `${APEX_TESTIMONIAL_BASE}
LAYOUT — FIVE-STAR HERO:
- Subject centered, chest-up, calm confident look directly into camera.
- ABOVE the headline: a clean horizontal row of 5 sharp cyan stars, medium size, perfectly aligned, sitting inside a subtle pill-shaped glass capsule.
- BELOW the stars: the HEADLINE in bold sans-serif, perfectly centered, 2 short lines max, crisp off-white, wrapped in smart quotation marks.
- Background: dark gradient with a soft cyan halo behind the subject's head. Nothing else.`,
  },
  "before-after": {
    label: "Transformation",
    prompt: `${APEX_TESTIMONIAL_BASE}
LAYOUT — TRANSFORMATION (minimalist, no labels):
- Subject takes the full frame as a single cinematic portrait — confident, glowing rim light, premium.
- A single oversized cyan upward arrow glyph (thin elegant line-art, NOT cartoon) sits subtly behind the subject as a depth element, suggesting transformation/result.
- HEADLINE bottom-third, restrained bold sans-serif, off-white, wrapped in smart quotes. Tiny cyan 5-star row directly above the headline.
- Do NOT render the words "BEFORE" or "AFTER" — pure visual.`,
  },
  "result-number": {
    label: "Result Metric",
    prompt: `${APEX_TESTIMONIAL_BASE}
LAYOUT — RESULT METRIC (the quote IS the number):
- Subject anchored on the RIGHT third, smiling, relaxed posture, cyan rim light.
- LEFT side: ONE oversized metric/number rendered as massive bold sans-serif glyphs in crisp off-white (the headline string IS the metric, e.g. "+45 Neukunden"). The KEY number is tinted APEX cyan #00BCFF for emphasis.
- Below the metric: a tiny single-line muted-grey supporting label is OMITTED — keep it pure number only.
- Tiny cyan 5-star row sits ABOVE the metric inside a subtle glass capsule.
- Bottom-left: tiny cyan pill badge "RESULT". No other text.`,
  },
  "magazine": {
    label: "Editorial Cover",
    prompt: `${APEX_TESTIMONIAL_BASE}
LAYOUT — EDITORIAL COVER (prestige, GQ/Vanity Fair feel — but APEX-modern, NOT serif):
- Subject takes the full frame, cinematic medium portrait, dramatic Rembrandt-style lighting with cyan rim, glossy filmic skin, sharp eyes.
- The HEADLINE sits across the TOP of the frame in HUGE bold modern sans-serif (NOT serif), semi-transparent off-white, the subject's head partially eclipses the letters (magazine masthead depth trick). Wrapped in smart quotes.
- A small cyan 5-star row sits at the BOTTOM-LEFT inside a tiny glass capsule. Nothing else.`,
  },
  "chat-bubble": {
    label: "iMessage Proof",
    prompt: `${APEX_TESTIMONIAL_BASE}
LAYOUT — iMESSAGE PROOF (premium glass bubble):
- Subject anchored on the RIGHT half, casual confident expression, looking slightly toward the bubble on the LEFT.
- LEFT side: one CLEAN ROUNDED iMessage-style CHAT BUBBLE rendered as Liquid Glass — frosted translucent, 1px cyan hairline border, soft drop shadow, subtle inner highlight. Inside the bubble: a small cyan 5-star row at top, then the HEADLINE as a short quote in bold sans-serif, crisp off-white, wrapped in smart quotes.
- Bubble has a small tail pointing toward the subject. NO sender name, NO timestamp, NO read receipt — keep the bubble pure.
- Background: deep dark gradient with a soft cyan glow behind the subject.`,
  },
};

const TESTIMONIAL_LAYOUT_ORDER: TestimonialLayout[] = ["quote-card", "five-star", "before-after", "result-number", "magazine", "chat-bubble"];


function buildPrompt(body: GenerateBody, variantSeed: string, variantIndex: number) {
  const vlog = VLOG_STYLES[body.vlogStyle];
  const textBlock = TEXT_STYLES[body.textStyle];
  const isPodcast = body.vlogStyle === "podcast";
  const isTestimonial = body.vlogStyle === "testimonial";
  const testimonialKey: TestimonialLayout = isTestimonial
    ? (body.testimonialLayout ?? TESTIMONIAL_LAYOUT_ORDER[variantIndex % TESTIMONIAL_LAYOUT_ORDER.length])
    : "quote-card";
  const textLayout = isTestimonial
    ? TESTIMONIAL_STYLES[testimonialKey].prompt
    : TEXT_LAYOUTS[variantIndex % TEXT_LAYOUTS.length];
  const titleText = body.title?.trim();
  const enforceCI = !!body.enforceApexCI;
  const brand = enforceCI ? "#00BCFF" : (body.brandColor || "#00BCFF");
  const podcastStyle = isPodcast && body.podcastStyle ? PODCAST_STYLES[body.podcastStyle] : null;
  const hasStyleRef = !!body.referenceStyleBase64;

  const apexCIBlock = enforceCI ? `═══ APEX CI — STRICT BRAND LOCK (COLOR + TYPOGRAPHY ONLY) ═══
Follow the APEX 2025 visual identity for COLOR, TYPOGRAPHY and TONE. This is NOT a corporate ad — keep it visually SCHLICHT / minimal / editorial.

APEX COLOR PALETTE — use ONLY these colors:
• Ice White       #FCFEFF
• APEX Blue       #00BCFF  — single hero accent, used sparingly
• Deep Ocean      #001A23  — dominant dark background
• Slate Steel     #4B585D
• Frost White     #EDF9FE
• Graphite Gray   #1E2126
FORBIDDEN colors: warm sunset oranges, teal-orange film grade, Netflix red, MrBeast yellow, anything outside the palette as a dominant tone.

APEX GRADE: cool, clean, premium-tech. Natural skin tones, no warm orange grade.
APEX TYPOGRAPHY: modern geometric sans-serif (Inter / Söhne / Neue Haas Grotesk). Headline color: APEX Blue #00BCFF or Ice White #FCFEFF only.
APEX TONE: confident, premium, minimal, editorial. NO gimmicks, NO clickbait, NO emojis, NO arrows, NO red circles, NO badges, NO stickers, NO decorative shapes.

═══ ABSOLUTELY FORBIDDEN TEXT / GRAPHICS (HARD RULE) ═══
• DO NOT render the word "APEX" anywhere in the image.
• DO NOT render the word "CONSULTING" anywhere in the image.
• DO NOT invent any company name, tagline, slogan, URL, handle, @-mention, hashtag, episode number, date or channel name.
• DO NOT add any logo, wordmark, monogram, icon-mark or brand seal. No fake APEX logo. No fake sponsor logos.
• The ONLY text allowed on the entire thumbnail is the explicit HEADLINE provided below (if any). If no headline is provided, the image must contain ZERO text.
• If a logo file is explicitly attached/provided, reproduce it 100% pixel-accurate (exact shape, proportions, colors, spacing) — never redraw, restyle, recolor or "interpret" it.
═══════════════════════════════════════════════
` : "";



  const styleRefBlock = hasStyleRef ? `═══ STYLE REFERENCE — FOLLOW THIS LOOK ═══
A SECOND image is attached AFTER the subject photo. It is a REFERENCE THUMBNAIL whose VISUAL STYLE you must emulate. Mirror these aspects from the reference:
• Overall composition and subject placement (left/center/right, crop, framing)
• Typography style, size, weight, placement and color treatment
• Color palette, color grade, lighting mood, contrast level
• Background treatment (cutout / scene / gradient / blur / props)
• Any UI frames, icons, badges, shapes or decorative elements
• Overall energy (calm editorial vs. punchy reaction vs. premium keynote)

DO NOT copy the reference's PEOPLE, FACES, BRAND LOGOS, or EXACT TEXT WORDS. Replace those with the subject from the first image (or generated subject) and the headline below.
This style reference OVERRIDES the podcast/vlog style direction when in conflict.
═══════════════════════════════════════════════
` : "";

  return `${body.imageBase64 ? `TASK: This is a PHOTO RETOUCH / COMPOSITE task. The attached image IS the subject reference. Keep the EXACT same person, face, hair, expression — only restage them into the cinematic ${isPodcast ? "podcast thumbnail" : "vlog thumbnail"} layout described below. Do NOT replace the face. Do NOT swap ethnicity, age, gender. Do NOT idealize.

` : ""}${apexCIBlock}${styleRefBlock}You are a world-class YouTube thumbnail designer creating a CINEMATIC, CLICK-WORTHY 16:9 thumbnail (exactly 1280×720, 16:9 landscape) for a ${isPodcast ? "PODCAST / INTERVIEW show" : "personal VLOG"}.${enforceCI ? " Apply the APEX 2025 visual identity (palette + typography + tone) silently — do NOT render brand names, logos or wordmarks in the image." : ""} The result must look like a high-end Netflix poster / Apple keynote frame — premium, sharp, intentional, SCHLICHT and uncluttered.


${body.imageBase64 ? (isPodcast ? `═══ FACE LOCK — ABSOLUTE TOP PRIORITY ═══
Use the uploaded photo as the IDENTITY reference for the subject. Re-stage the person into the podcast thumbnail layout described below, but keep these 1:1:
• ENTIRE FACE: face shape, geometry, every facial feature, eyes/eyebrows/nose/mouth/lips/ears/jawline
• Skin tone, undertone, freckles, moles, scars, tattoos
• Hairstyle: cut, length, parting, texture, color, hairline
• Beard / stubble / facial hair: exact pattern, density, color
• Apparent age, ethnicity, gender presentation, body type
• Glasses, jewelry, piercings — exactly as in the reference

YOU MAY change: pose, expression (slightly more expressive/confident), framing/crop, clothing color, background (per podcast style direction), lighting setup. The face must look like the SAME PERSON, not a generated lookalike.

FORBIDDEN: face swap, ethnicity change, age shift, idealized/"model-ified" version, generic AI face.
═══════════════════════════════════════════════
` : `═══ IMAGE LOCK — ABSOLUTE TOP PRIORITY (overrides everything else) ═══
The uploaded photo IS the output. Treat it like a RAW file going through color grading + retouch — never like a reference to redraw.

PRESERVE 1:1 from the uploaded photo (do NOT alter ANY of these):
• ENTIRE FACE: face shape, geometry, proportions, every facial feature
• Eyes (color, shape, spacing, lids), eyebrows (shape, thickness, arch), nose, mouth, lips, smile lines, ears, jawline, chin
• Skin tone, undertone, freckles, moles, scars, birthmarks, tattoos, pores, micro-texture
• Hairstyle exactly: cut, length, parting, texture, color, hairline, every flyaway
• Beard / stubble / facial hair: exact pattern, density, color
• Apparent age, ethnicity, gender presentation, body type and proportions
• Glasses, jewelry, piercings, accessories — exactly as in the reference
• Clothing: same garment, same cut, same colors (color grade may shift slightly, garment must not change)
• POSE: exact head tilt, gaze direction, shoulder line, body orientation, hand positions
• CAMERA: exact perspective, framing, distance, lens angle, focal length, crop. No zoom, no mirror, no rotate, no re-crop.
• BACKGROUND COMPOSITION: same setting, same objects in same positions. Only lighting/atmosphere may be enhanced.

YOU MAY ONLY CHANGE: light quality, color grade, subtle atmospheric haze/grain, gentle background bokeh polish, optional cinematic vignette. Nothing else.

FORBIDDEN: do NOT beautify, slim, smooth, de-age, age-up, idealize, "model-ify", swap ethnicity, change gender, alter face geometry, change eye color, change hair color, change clothing, change pose, change camera angle, change background, or generate a generic "AI face." NO face replacement. NO new scene.

A stranger comparing reference and output must instantly say "yes, that's the same photo, just color-graded."
═══════════════════════════════════════════════
`) : `SUBJECT: Generate a photorealistic relatable ${isPodcast ? "podcast host (mid-20s to mid-40s, confident expressive)" : "vlogger (mid-20s to mid-30s, expressive but natural)"}. Photo-real human, never illustrated. Across all variants in this batch keep the SAME person — same face, hair, age, ethnicity, outfit family — only change pose, expression and composition.
`}
${isPodcast && podcastStyle ? `PODCAST STYLE DIRECTION (FOLLOW THIS EXACTLY):\n${podcastStyle.prompt}\n` : (body.imageBase64 ? "" : `VLOG STYLE DIRECTION:\n${vlog.prompt}\n`)}
${titleText ? `═══ TEXT RULES — STRICT, ELEGANT, APPLE-STYLE ═══
EXACTLY ONE text element on the entire thumbnail: the headline below. NOTHING ELSE — no subtitle, no tagline, no episode number, no date, no channel name, no logo text, no captions, no badges, no watermark, no extra words, no signage, no book titles, no screen UI text, no posters, no graffiti, no labels, no name tags, no microphone branding, no clothing prints, no random glyphs or fake foreign-language characters in the background. Every surface that would normally carry text (signs, screens, books, mic flags, shirts) must render BLANK.

HEADLINE (render EXACTLY this text, perfectly spelled, NO additions, NO variations, NO translations, NO duplication): "${titleText}"

Typography direction: ${textBlock}

LAYOUT TREATMENT FOR THIS VARIANT: ${textLayout}

SIZE & PLACEMENT (hard rules — follow the LAYOUT TREATMENT above):
- If layout is "IMMERSION / TEXT-BEHIND-SUBJECT" or "BIG BACKGROUND TYPE": headline may span 50–75% of the frame width, sitting in the background plane BEHIND the subject so the body partially occludes the letters. Visible portions stay clearly readable. Apply atmospheric perspective (slight haze, subtle desaturation, gentle defocus on far edges, color graded to blend with the scene).
- For all other layouts: headline occupies AT MOST ~25–35% of the frame width — refined, restrained, Apple-style.
- Single line preferred. Two lines only for long titles. NEVER more than 2 lines.
- ALWAYS fully inside the safe frame — never clipped, never bleeding off the edges, never cut by the canvas border.
- NEVER cover the subject's face. Partial occlusion of letters by head/shoulders is REQUIRED for behind-subject layouts and creates the immersion depth.
- NEVER duplicated, NEVER mirrored, NEVER overlapping itself. Render only ONCE.
- ${body.imageBase64 ? "Composite the headline as a typographic layer that lives in the depth plane behind the subject — the person from the uploaded photo must remain in front, fully intact, naturally occluding parts of the letters." : ""}
═══════════════════════════════════════════════` : `═══ ZERO TEXT — ABSOLUTE HARD RULE ═══
The image must contain ZERO text of any kind. No words, no letters, no numbers, no glyphs, no symbols, no captions, no subtitles, no headlines, no taglines, no slogans, no logos, no wordmarks, no monograms, no watermarks, no signatures, no URLs, no @handles, no #hashtags, no dates, no episode numbers, no channel names, no fake brand names, no invented company names.
Also remove ALL incidental text from the scene: no signage, no street signs, no posters, no billboards, no book titles, no magazine covers, no screen UI text, no phone notifications, no microphone branding, no clothing prints/labels, no graffiti, no name tags, no chyrons, no LED tickers, no scoreboards, no random glyphs or fake foreign-language characters in the background.
If a surface would normally carry text (book spine, sign, screen, mic flag, t-shirt print, laptop lid, mug, poster, whiteboard), render it BLANK or replace it with abstract shapes/textures.
═══════════════════════════════════════════════`}

BRAND ACCENT COLOR: ${brand}
- Use sparingly: rim light tint or headline color hint only. Do NOT flood the image.

${body.sceneDescription && !body.imageBase64 ? `SCENE / CONTEXT: ${body.sceneDescription}` : ""}

${body.imageBase64 ? `GRADE VARIANT (lighting/atmosphere${isPodcast ? "" : " only — perspective and content stay 100% locked to the uploaded photo"}): ${variantSeed}` : `COMPOSITION VARIANT: ${variantSeed}`}

ABSOLUTE QUALITY BAR — HYPERREALISTIC CINEMATIC VLOG THUMBNAIL:
- HYPER-PHOTOREALISTIC, indistinguishable from a real DSLR/cinema-camera frame (ARRI Alexa, RED Komodo, Sony FX6 look)
- Shot-on 35mm full-frame sensor feel, creamy natural bokeh, real skin micro-detail (pores, peach fuzz, subsurface scattering) — NEVER plastic / waxy / airbrushed
- Real-world physically-based lighting, motivated key, soft fill, rim light, accurate shadows
- Cinematic color science: filmic contrast, subtle teal-orange or warm grade, fine grain, no oversaturation, no HDR halos
- Razor-sharp focus on the eyes, micro-catchlights, individual eyelashes resolvable
- STRICT 16:9 LANDSCAPE aspect ratio (1280×720 or higher 16:9). NEVER square, vertical or 4:3.
- Must read clearly at 320×180 small preview size
- ${isPodcast ? "NO car in the scene unless the podcast style explicitly references it — this is a PODCAST thumbnail, not a car vlog." : isTestimonial ? "NO car, NO vehicle, NO automotive setting — this is a TESTIMONIAL thumbnail. Focus is the human + the social proof (quote / stars / result number)." : (body.imageBase64 ? "ABSOLUTELY no new scenery, no added Audi RS6 if not present in the photo — keep the uploaded photo's setting." : "MANDATORY HERO CAR: Audi RS6 Avant (C8) prominently in the scene with correct details (Quad-Oval-Auspuff, Single-Frame-Grill, RS-Felgen, breite Kotflügel, OLED-Heckleuchten, \"quattro\"-Schriftzug).")}
- CONSISTENCY ACROSS BATCH: same color grade, same lighting mood, same subject identity across all variants.

NEVER DO:
- ${titleText ? `NEVER add ANY text other than the single headline "${titleText}" — no extra words, no duplicate text, no subtitle, no signage, no captions, no logo text.` : "NEVER add any text, letters, numbers, captions, logos, watermarks or signage of any kind."}
- No MrBeast-style loud bold-condensed type, no neon arrows, no red circles, no emoji overlays
- No comic / bubble / amateur fonts, no rainbow gradients, no glow-text spam
- No garbled or misspelled text
- No square / portrait / vertical framing — 16:9 landscape ONLY
- No plastic / waxy / airbrushed / over-smoothed skin, no AI-generic faces
- ${isPodcast ? "When using the uploaded photo, the face identity must match (same person), but pose/background/lighting follow the podcast style direction." : (body.imageBase64 ? "NEVER change the person, pose, clothing, background or camera angle from the uploaded photo." : "Do NOT change the subject's identity between variants.")}
- ONLY cinematic, hyperrealistic, premium vlog aesthetic — nothing else`;
}

const VARIANT_SEEDS = [
  "Soft golden-hour key light from the left, warm cream highlights, gentle haze in background, deep filmic shadows.",
  "Cooler twilight ambience, subtle teal-orange split tone, faint window/streetlight bokeh behind, polished contrast.",
  "Moody low-key lighting, single motivated rim light, rich blacks, dramatic atmosphere, cinematic vignette.",
  "Bright clean daylight grade, crisp whites, airy background separation, premium editorial feel.",
  "Dusk neon-tinted ambience, soft cyan/magenta accents in the background bokeh, glossy highlights on the RS6.",
  "Overcast diffused soft light, neutral filmic grade, muted background, refined understated mood.",
];

async function generateTitleFromKeywords(
  keywords: string,
  contentType: string,
  textStyleHint: string,
  apiKey: string,
): Promise<string> {
  const systemPrompt = `You are a world-class YouTube thumbnail copywriter. Generate ONE single scroll-stopping thumbnail title in the LANGUAGE of the keywords (auto-detect — German keywords → German title, English → English).
RULES:
- 2 to 7 words MAX, ideally 3–5
- ALL CAPS or smart Title Case (match the visual style hint)
- Punchy, curiosity-inducing, premium — Apple/Netflix energy, NOT clickbait spam
- No quotes, no emojis, no hashtags, no numbering, no period at the end
- No subtitle, no episode number
- Output ONLY the title text, nothing else, no explanation
Visual style hint: ${textStyleHint}
Content type: ${contentType}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Keywords / Thema: ${keywords}` },
      ],
    }),
  });
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("__RATE_LIMIT__");
    if (resp.status === 402) throw new Error("__CREDITS__");
    throw new Error(`Title generation failed: ${resp.status}`);
  }
  const data = await resp.json();
  const raw: string = data.choices?.[0]?.message?.content || "";
  // Clean up: strip quotes, trailing punctuation, newlines
  const cleaned = raw
    .trim()
    .replace(/^["'`„"]+|["'`""]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .split("\n")[0]
    .trim()
    .slice(0, 100);
  return cleaned;
}

async function callGemini(
  prompt: string,
  imageBase64: string | undefined,
  apiKey: string,
  referenceStyleBase64?: string,
  logoBase64?: string,
): Promise<string> {
  const contentParts: Array<Record<string, unknown>> = [];
  if (imageBase64) contentParts.push({ type: "image_url", image_url: { url: imageBase64 } });
  if (referenceStyleBase64) contentParts.push({ type: "image_url", image_url: { url: referenceStyleBase64 } });
  if (logoBase64) contentParts.push({ type: "image_url", image_url: { url: logoBase64 } });
  const finalPrompt = logoBase64
    ? `${prompt}\n\nBRAND LOGO INTEGRATION: The last attached image is a brand logo / tool icon. Integrate it PROMINENTLY and NATURALLY into the composition — keep the logo's exact colors, shape and proportions intact (never redraw, never restyle). Place it as a tasteful brand mark (corner watermark, on a device screen, on a product, or as a floating hero icon depending on the layout). Do NOT distort, do NOT recolor, do NOT add text to the logo.`
    : prompt;
  contentParts[contentParts.length === 0 ? 0 : contentParts.length] = { type: "text", text: finalPrompt };

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
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          modalities: ["image", "text"],
          image_config: { aspect_ratio: "16:9" },
        }),
      });
    } catch (error) {
      lastError = error instanceof DOMException && error.name === "AbortError" ? "__TIMEOUT__" : String(error);
      console.error(`Model ${model} request failed:`, lastError);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (resp.status === 429) throw new Error("__RATE_LIMIT__");
    if (resp.status === 402) throw new Error("__CREDITS__");

    if (!resp.ok) {
      lastError = await resp.text();
      console.error(`Model ${model} failed:`, resp.status, lastError);
      continue;
    }

    const data = await resp.json();
    const img = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (img) return img;
    lastError = "No image returned";
  }
  if (lastError === "__TIMEOUT__") throw new Error("__TIMEOUT__");
  throw new Error(`All models failed: ${lastError}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();

    if (body.action === "generate") {
      const isPodcast = body.vlogStyle === "podcast";
      const isTestimonial = body.vlogStyle === "testimonial";
      const podcastStyles: PodcastStyle[] | undefined =
        isPodcast && Array.isArray(body.podcastStyles) && body.podcastStyles.length > 0
          ? body.podcastStyles.slice(0, 6)
          : undefined;
      const testimonialLayouts: TestimonialLayout[] | undefined =
        isTestimonial && Array.isArray(body.testimonialLayouts) && body.testimonialLayouts.length > 0
          ? body.testimonialLayouts.slice(0, 6)
          : undefined;

      // Auto-generate title from keywords if requested
      if (body.autoTitle && typeof body.titleKeywords === "string" && body.titleKeywords.trim().length > 0) {
        try {
          const styleHint = body.textStyle === "serif"
            ? "elegant cinematic display serif, magazine-cover, smart Title Case"
            : body.textStyle === "modern"
              ? "clean modern sans-serif Apple keynote, Title Case or ALL CAPS"
              : "no text — but still generate a short title in case";
          const contentType = isPodcast ? "podcast / interview" : (body.vlogStyle || "vlog");
          const generated = await generateTitleFromKeywords(
            body.titleKeywords,
            contentType,
            styleHint,
            LOVABLE_API_KEY,
          );
          if (generated) {
            body.title = generated;
            console.log("Auto-generated title:", generated);
          }
        } catch (e) {
          const msg = (e as Error).message;
          if (msg === "__RATE_LIMIT__" || msg === "__CREDITS__") {
            return new Response(
              JSON.stringify({
                error: msg === "__RATE_LIMIT__"
                  ? "Rate limit erreicht beim Titel-Generieren."
                  : "AI-Credits aufgebraucht.",
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          console.error("Auto-title failed, continuing without title:", e);
        }
      }


      // Build job list: for podcast mode -> variants per selected style; else -> variant seeds
      type Job = { prompt: string; index: number };
      const jobs: Job[] = [];
      const variantsPerStyle = Math.min(6, Math.max(1, body.variants ?? 2));
      if (podcastStyles) {
        // Generate `variantsPerStyle` images PER selected style => total = variantsPerStyle * styles.length
        let idx = 0;
        for (const ps of podcastStyles) {
          for (let v = 0; v < variantsPerStyle; v++) {
            const variantSeed = VARIANT_SEEDS[v % VARIANT_SEEDS.length];
            const bodyForJob: GenerateBody = { ...body, podcastStyle: ps };
            jobs.push({ prompt: buildPrompt(bodyForJob, variantSeed, idx), index: idx });
            idx++;
          }
        }
      } else if (testimonialLayouts) {
        // Generate `variantsPerStyle` images PER selected testimonial layout
        let idx = 0;
        for (const tl of testimonialLayouts) {
          for (let v = 0; v < variantsPerStyle; v++) {
            const variantSeed = VARIANT_SEEDS[v % VARIANT_SEEDS.length];
            const bodyForJob: GenerateBody = { ...body, testimonialLayout: tl };
            jobs.push({ prompt: buildPrompt(bodyForJob, variantSeed, idx), index: idx });
            idx++;
          }
        }
      } else {
        const total = Math.min(VARIANT_SEEDS.length, variantsPerStyle);
        VARIANT_SEEDS.slice(0, total).forEach((seed, i) => {
          jobs.push({ prompt: buildPrompt(body, seed, i), index: i });
        });
      }

      // Process with limited concurrency to balance speed and memory
      const CONCURRENCY = 2;
      const settled: PromiseSettledResult<string>[] = [];
      for (let i = 0; i < jobs.length; i += CONCURRENCY) {
        const chunk = jobs.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.allSettled(
          chunk.map((job) => callGemini(job.prompt, body.imageBase64, LOVABLE_API_KEY, body.referenceStyleBase64))
        );
        settled.push(...chunkResults);
      }


      // Surface critical errors
      for (const s of settled) {
        if (s.status === "rejected") {
          const msg = (s.reason as Error)?.message || "";
          if (msg === "__RATE_LIMIT__") {
            return new Response(
              JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es in ein paar Sekunden erneut.", type: "RATE_LIMIT" }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (msg === "__CREDITS__") {
            return new Response(
              JSON.stringify({ error: "AI-Credits aufgebraucht. Bitte lade dein Lovable-AI-Guthaben auf, um weiter zu generieren.", type: "BILLING_REQUIRED" }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      const images = settled
        .map((s) => (s.status === "fulfilled" ? s.value : null))
        .filter((x): x is string => !!x);

      if (images.length === 0) {
        const firstErr = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
        throw new Error(firstErr?.reason?.message || "Keine Varianten generiert");
      }

      return new Response(
        JSON.stringify({
          images,
          template: {
            id: `vlog-${body.vlogStyle}`,
            title: VLOG_STYLES[body.vlogStyle as VlogStyle]?.label || "Vlog Thumbnail",
            description: "Cinematic YouTube Vlog Thumbnail",
            category: "YouTube",
            style: "",
            width: WIDTH,
            height: HEIGHT,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === "iterate") {
      const { imageBase64, prompt } = body;
      if (!imageBase64 || !prompt) {
        return new Response(
          JSON.stringify({ error: "Image and prompt required for iteration" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      try {
        const img = await callGemini(
          `You are a world-class YouTube thumbnail designer. Edit this thumbnail with this precise change: ${prompt}.

Maintain the PREMIUM CINEMATIC quality. Make targeted changes only — keep the overall composition, subject identity, and color grade intact unless the request explicitly asks otherwise. Photo-realistic. Perfect spelling on any text. Output 1280×720 16:9.`,
          imageBase64,
          LOVABLE_API_KEY
        );
        return new Response(JSON.stringify({ image: img }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        const msg = (e as Error).message;
        if (msg === "__RATE_LIMIT__") {
          return new Response(JSON.stringify({ error: "Rate limit erreicht." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (msg === "__CREDITS__") {
          return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw e;
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Thumbnail generator error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

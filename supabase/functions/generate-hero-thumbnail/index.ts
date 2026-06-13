import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIDTH = 1280;
const HEIGHT = 720;

const GRADES = [
  "Warm amber glow from icon lights subject's face from below, deep teal shadows, circuit board background fades to pure black at edges. Cinematic teal-orange split tone.",
  "Crimson-orange icon glow, subject rim-lit cyan from behind, near-black background with faint blue circuit traces, high contrast filmic.",
  "Electric blue icon emission (APEX #00BCFF), subject's face lit cool blue, deep navy circuit board background, subtle violet rim light, premium tech feel.",
  "Vivid magenta-pink icon glow, subject lit warm on one side cool on the other, dark plum background with neon circuit lines, futuristic.",
  "Emerald-green icon glow (Matrix-style), subject rim-lit white, black background with thin green circuit traces, mysterious tech mood.",
  "Pure white-hot icon core radiating golden glow, subject in soft warm key, deep charcoal background with faint copper circuit traces, premium minimalist.",
];

function buildHeroPrompt(word: string, hasFace: boolean, variantSeed: string): string {
  const w = word.trim().toUpperCase();
  return `HYPERREALISTIC YOUTUBE THUMBNAIL — 16:9 landscape (1280×720), shot-on-DSLR cinematic look.

COMPOSITION (strict):
- RIGHT half: photoreal person from chest up, looking with intense shocked/amazed expression at a glowing 3D object floating above their open hand on the LEFT. Eyes wide, mouth slightly open, eyebrows raised — genuine astonished reaction. Hand visible in lower-left/center, palm up, fingers slightly curled, the glowing object hovers a few cm above the palm.
- LEFT half: ONE huge bright headline word "${w}" in MASSIVE white sans-serif display type (Inter / SF Pro Display / Söhne Display Bold), all in proper Title Case (first letter capital, rest lowercase) — render EXACTLY as "${w.charAt(0)}${w.slice(1).toLowerCase()}". Word takes up ~35-45% of canvas width, top-left aligned, slight soft white outer glow, no shadow stack, no effects-spam. Letters can be partially occluded by the floating 3D object for depth.
- FLOATING 3D OBJECT (centerpiece): a glowing translucent SQUIRCLE app-icon (rounded-square iOS-style) approx 25-30% of canvas height, made of liquid-glass / amber-orange glowing crystal material with strong emissive inner light, a stylized 3D ICON GLYPH inside the squircle that visually represents the concept of "${word}" (interpret the word semantically — design tool=compass/asterisk/pen, code=brackets/cursor, AI=neural-burst, music=waveform, video=play-triangle, etc.). The icon glows intensely and casts warm light onto the person's face and hand.
- BACKGROUND: deep near-black with subtle blue/cyan glowing CIRCUIT-BOARD traces and faint tech particles, soft vignette, atmospheric depth.

${hasFace ? `═══ FACE LOCK — TOP PRIORITY ═══
The uploaded photo is the IDENTITY reference for the person. Re-stage them into the composition above, but PRESERVE 1:1:
• Entire face geometry, every facial feature
• Eyes, eyebrows, nose, mouth, lips, ears, jawline
• Skin tone, freckles, moles, scars
• Hairstyle exactly: cut, length, color, texture
• Beard / stubble exactly
• Glasses, jewelry, piercings — exactly as in the reference
• Apparent age, ethnicity, gender presentation

YOU MAY change: pose (shocked-reaction with open hand holding glowing icon), expression (amazed), outfit color/style if needed for the dark scene, lighting. The face must look like the SAME PERSON, not a lookalike.
FORBIDDEN: face swap, ethnicity change, age shift, idealized version, generic AI face.
═══════════════════════════════════════════════` : `Generate a photoreal person (mid-20s to mid-40s, modern relatable look, casual t-shirt or hoodie), strong cinematic facial expression of genuine amazement.`}

LIGHTING & GRADE: ${variantSeed}

TYPOGRAPHY RULES (absolute):
- Render EXACTLY one word: "${w.charAt(0)}${w.slice(1).toLowerCase()}". No subtitle, no second line, no badge, no logo, no extra text anywhere on the canvas.
- Perfectly spelled, no duplication, no mirrored copies, no foreign-language glyphs in background.
- All other surfaces (clothing, screens, signage, posters) render BLANK.

QUALITY BAR:
- ARRI Alexa / RED cinema feel, real skin micro-detail (pores, peach fuzz), micro-catchlights in eyes
- Razor sharp focus on eyes and on the glowing 3D icon
- Strong physical light interaction: amber glow visibly illuminates skin, fingers, fabric
- Strict 16:9 landscape, must read at 320×180 thumbnail size
- NO MrBeast cartoon style, NO red circles, NO arrows, NO emoji, NO plastic skin, NO oversaturation
- Premium "shocked-reaction-with-glowing-app-icon" YouTube thumbnail aesthetic`;
}

async function callGemini(prompt: string, imageBase64: string | undefined, apiKey: string): Promise<string> {
  const contentParts: Array<Record<string, unknown>> = [];
  if (imageBase64) contentParts.push({ type: "image_url", image_url: { url: imageBase64 } });
  contentParts.push({ type: "text", text: prompt });
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 75000);
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: contentParts.length === 1 ? prompt : contentParts }],
        modalities: ["image", "text"],
        image_config: { aspect_ratio: "16:9" },
      }),
    });
    if (resp.status === 429) throw new Error("__RATE_LIMIT__");
    if (resp.status === 402) throw new Error("__CREDITS__");
    if (!resp.ok) throw new Error(`Gemini failed: ${resp.status} ${await resp.text()}`);
    const data = await resp.json();
    const img = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!img) throw new Error("No image returned");
    return img;
  } finally {
    clearTimeout(t);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const body = await req.json();
    const word = String(body.word ?? "").trim().split(/\s+/)[0]?.slice(0, 24) ?? "";
    if (!word) throw new Error("Bitte ein Wort eingeben");
    const count = Math.min(Math.max(Number(body.count ?? 2), 1), 12);
    const imageBase64: string | undefined = body.imageBase64;

    const jobs = Array.from({ length: count }, (_, i) => {
      const seed = GRADES[i % GRADES.length];
      return buildHeroPrompt(word, !!imageBase64, seed);
    });

    const results = await Promise.allSettled(jobs.map((p) => callGemini(p, imageBase64, apiKey)));
    const images: string[] = [];
    let rateHit = false;
    let creditsHit = false;
    for (const r of results) {
      if (r.status === "fulfilled") images.push(r.value);
      else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        if (msg === "__RATE_LIMIT__") rateHit = true;
        if (msg === "__CREDITS__") creditsHit = true;
        console.error("hero-word job failed:", msg);
      }
    }
    if (images.length === 0) {
      return new Response(
        JSON.stringify({
          error: creditsHit
            ? "AI-Credits aufgebraucht."
            : rateHit
              ? "Rate-Limit erreicht. Bitte kurz warten."
              : "Generierung fehlgeschlagen.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        images,
        template: {
          id: "hero-word",
          title: `Hero Word: ${word}`,
          description: "Face + glowing 3D tool icon + big word",
          category: "hero-word",
          style: "hero-word",
          width: WIDTH,
          height: HEIGHT,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

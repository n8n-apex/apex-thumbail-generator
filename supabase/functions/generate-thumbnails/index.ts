import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIDTH = 1280;
const HEIGHT = 720;

type VlogStyle = "lifestyle" | "travel" | "tech";
type TextStyle = "bold" | "serif" | "modern" | "none";

const VLOG_STYLES: Record<VlogStyle, { label: string; prompt: string }> = {
  lifestyle: {
    label: "Lifestyle / Daily Vlog",
    prompt: `LIFESTYLE / DAILY VLOG aesthetic — warm, personal, cinematic real-life moment.
- Golden-hour or warm soft natural light, creamy skin tones, gentle film grain
- Cozy authentic setting (apartment, cafe, city street, kitchen) with shallow depth-of-field bokeh
- Color palette: warm cream, soft beige, sun-kissed amber with a single saturated accent
- Subject feels candid, emotionally relatable — slight smile or contemplative
- Reference look: Casey Neistat meets Emma Chamberlain meets Apple lifestyle ad`,
  },
  travel: {
    label: "Travel / Adventure",
    prompt: `TRAVEL / ADVENTURE cinematic vlog — epic, vast, awe-inspiring.
- Sweeping landscape (mountains, ocean, desert, city skyline) with dramatic atmospheric light
- Subject smaller in frame OR mid-shot with epic backdrop, suggesting scale and adventure
- Color palette: deep teal-orange cinematic grade, rich shadows, glowing highlights
- Sense of motion, weather, atmosphere (mist, dust, sunrays, snow)
- Reference look: Peter McKinnon / Sam Kolder / Devin Graham aerial-cinematic`,
  },
  tech: {
    label: "Tech / Business",
    prompt: `TECH / BUSINESS vlog — clean, modern, futuristic, premium.
- Studio or modern office setting with controlled three-point lighting and rim light
- Tech objects subtly visible (laptop, screen glow, minimal desk setup) but never cluttered
- Color palette: deep charcoal/navy base, electric cyan/blue accent, crisp whites
- Sharp, polished, high-contrast — Apple keynote / MKBHD studio quality
- Subject confident, direct, professional — slight serious expression`,
  },
};

const TEXT_STYLES: Record<TextStyle, string> = {
  bold: `Massive BOLD CONDENSED SANS-SERIF (Druk Wide, Anton, or Impact style), ALL CAPS, perfectly kerned. Bright white or yellow with thick black outline / drop shadow for maximum readability. MrBeast / Mark Rober level click-worthy but tasteful, NOT amateur. Text placed BEHIND the subject's head/shoulders (text-behind-subject technique).`,
  serif: `Elegant cinematic DISPLAY SERIF (Playfair Display Black, Recoleta, Canela). Title-case or smart capitalization. Soft glow / subtle drop shadow. Color tinted slightly toward the brand accent. Magazine-cover quality (Vogue, WIRED). Text layered BEHIND the subject for cinematic depth.`,
  modern: `Clean modern GEOMETRIC SANS-SERIF (SF Pro Display, Inter, Söhne). Crisp white, perfect tracking, mixed weight hierarchy. Apple keynote premium feel. Text positioned with intention, layered behind or beside the subject with soft shadow.`,
  none: `NO text overlay — pure cinematic image only. Composition leaves clear space where the YouTube duration badge sits (bottom-right) and where future title overlay can go.`,
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
}

function buildPrompt(body: GenerateBody, variantSeed: string) {
  const vlog = VLOG_STYLES[body.vlogStyle];
  const textBlock = TEXT_STYLES[body.textStyle];
  const titleText = body.title?.trim();
  const brand = body.brandColor || "#00BCFF";

  return `${body.imageBase64 ? `TASK: This is a PHOTO COMPOSITE / EDIT task. The attached image shows a real person — your job is to take THIS EXACT person (every facial feature unchanged) and place them into a brand-new cinematic YouTube vlog thumbnail scene. Treat the input as a STRICT face & identity reference, not as inspiration.

` : ""}You are a world-class YouTube thumbnail designer creating a CINEMATIC, CLICK-WORTHY 16:9 thumbnail (exactly 1280×720, 16:9 landscape) for a personal VLOG. The result must look like a high-end Netflix poster / Apple keynote frame — premium, sharp, intentional. It must BALLERN — instant scroll-stop visual impact at maximum production value.

${body.imageBase64 ? `═══ IDENTITY LOCK — ABSOLUTE TOP PRIORITY (overrides everything else) ═══
The person in the reference image MUST appear in the output as the SAME human being — instantly recognizable to their friends and family.

PRESERVE 1:1 (do NOT alter any of these):
• Face shape and overall geometry (forehead, cheek width, chin shape, jawline angle)
• Eye color, eye shape, eye spacing, eyelid shape
• Eyebrow shape, thickness, color, arch
• Nose shape, length, width, nostril shape, bridge
• Mouth shape, lip thickness, lip color, smile lines
• Skin tone, undertone, freckles, moles, scars, birthmarks, tattoos
• Hairstyle: exact cut, length, parting, texture, color, hairline
• Beard / stubble / facial hair: exact pattern and density
• Apparent age, ethnicity, gender presentation
• Body type and proportions
• Any glasses, jewelry, distinctive accessories visible in the reference

YOU MAY CHANGE: lighting, color grade, background/scene, outfit (only if needed for the vlog style), pose, head angle (keep face mostly toward camera), subtle expression.

FORBIDDEN: do NOT beautify, slim, smooth, de-age, age-up, idealize, "model-ify", swap ethnicity, change gender, alter face geometry, change eye color, change hair color, or generate a generic "AI face." If you cannot keep the identity at full body, output a tighter crop that still uses the exact reference face 1:1.

A stranger comparing the reference and the output must immediately say "yes, that's the same person."
═══════════════════════════════════════════════
` : `SUBJECT: Generate a photorealistic relatable vlogger (mid-20s to mid-30s, expressive but natural). Photo-real human, never illustrated. Across all variants in this batch keep the SAME person — same face, hair, age, ethnicity, outfit family — only change pose, expression and composition.
`}
VLOG STYLE DIRECTION:
${vlog.prompt}

TYPOGRAPHY DIRECTION:
${textBlock}

${titleText ? `HEADLINE TEXT (use EXACTLY, perfectly spelled): "${titleText}"
- Render in the typography style above as a dominant visual element
- ALL caps if Bold style, smart-case if Serif/Modern
- Max 2-3 lines, large, punchy, instantly readable at 320×180 thumbnail size
- IMPORTANT: text must NEVER cover the subject's face — place behind shoulders or in negative space` : `NO headline — purely visual cinematic frame.`}

BRAND ACCENT COLOR: ${brand}
- Use sparingly as accent: rim light tint, headline color hint, small logo / underline accent
- Do NOT flood the image with this color

${body.sceneDescription ? `SCENE / CONTEXT: ${body.sceneDescription}` : ""}

COMPOSITION VARIANT: ${variantSeed}

ABSOLUTE QUALITY BAR — HYPERREALISTIC CINEMATIC VLOG THUMBNAIL:
- HYPER-PHOTOREALISTIC, indistinguishable from a real DSLR/cinema-camera frame (ARRI Alexa, RED Komodo, Sony FX6 look)
- Shot on 35mm full-frame sensor, 35-85mm prime lens, f/1.8–f/2.8 shallow depth of field with creamy natural bokeh
- Real skin micro-detail: visible pores, fine peach fuzz, natural skin texture, subsurface scattering, realistic specular highlights — NEVER plastic, NEVER waxy, NEVER airbrushed
- Real-world physically-based lighting: motivated key light, soft fill, rim/hair light, accurate shadow falloff, natural ambient occlusion
- Cinematic color science: filmic contrast curve, slight teal-orange or warm grade depending on style, subtle film grain, no oversaturation, no HDR halos
- Razor-sharp focus on the eyes, micro-catchlights visible, individual eyelashes resolvable
- Clean intentional composition with clear focal hierarchy and rule-of-thirds anchoring
- Headline (if present) perfectly spelled — never garble letters
- Text-behind-subject technique creates premium magazine-cover depth
- STRICT 16:9 LANDSCAPE aspect ratio — exactly 1280×720 pixels (or higher 16:9 like 1920×1080). NEVER square, NEVER vertical, NEVER 4:3. Frame the composition wide.
- Must read clearly at 320×180 small preview size
- VLOG-ONLY context: every output must look like a frame from a real personal vlog (lifestyle, travel or tech) — NOT a movie poster, NOT a stock photo, NOT a fashion editorial, NOT an ad
- CONSISTENCY ACROSS THIS BATCH: every variant must share the SAME color grade, SAME lighting mood, SAME wardrobe family, SAME subject identity. Only composition and angle change.

NEVER DO:
- No childish cartoon faces, no exaggerated shocked expressions (unless Bold/MrBeast style explicitly chosen — then keep it tasteful)
- No emoji overlays, no neon arrows, no red circles
- No comic / bubble / amateur fonts
- No watermarks, no fake logos
- No garbled or misspelled text
- No cluttered busy collage layouts
- No square / portrait / vertical framing — 16:9 landscape ONLY
- Do NOT change the subject's identity between variants`;
}

const VARIANT_SEEDS = [
  "Frontal hero portrait, subject centered slightly off to one third, head and shoulders fully visible, direct or near-direct eye contact with camera. Wide cinematic environment behind.",
  "Medium close-up, subject 3/4 body, slight angle but face still 80% toward camera. Strong rim light, headline wrapping behind shoulders.",
  "Mid-shot environmental, subject standing/sitting in the scene, face clearly visible toward camera, scene depth on the opposite side.",
  "Tight cinematic close-up of face and upper shoulders, dramatic lighting, eyes razor sharp, expression engaged, headline integrated into background.",
  "Wide establishing shot, subject prominent in lower-third or one-third, face turned toward camera and clearly readable, epic backdrop dominating.",
  "Action / motion frame, subject mid-gesture but face oriented toward camera, dynamic light streaks or atmosphere, headline in negative space.",
];

async function callGemini(prompt: string, imageBase64: string | undefined, apiKey: string): Promise<string> {
  const messages = [
    {
      role: "user",
      content: imageBase64
        ? [
            // Image FIRST so the model treats it as the primary reference subject to composite/edit.
            { type: "image_url", image_url: { url: imageBase64 } },
            { type: "text", text: prompt },
          ]
        : prompt,
    },
  ];
  const models = ["google/gemini-3-pro-image-preview", "google/gemini-3.1-flash-image-preview"];
  let lastError = "";
  for (const model of models) {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
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
  throw new Error(`All models failed: ${lastError}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();

    if (body.action === "generate") {
      const variants = Math.min(6, Math.max(1, body.variants ?? 4));
      const seeds = VARIANT_SEEDS.slice(0, variants);

      const settled = await Promise.allSettled(
        seeds.map((seed) => callGemini(buildPrompt(body, seed), body.imageBase64, LOVABLE_API_KEY))
      );

      // Surface critical errors
      for (const s of settled) {
        if (s.status === "rejected") {
          const msg = (s.reason as Error)?.message || "";
          if (msg === "__RATE_LIMIT__") {
            return new Response(
              JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es in ein paar Sekunden erneut." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (msg === "__CREDITS__") {
            return new Response(
              JSON.stringify({ error: "AI-Credits aufgebraucht. Bitte lade dein Guthaben auf." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIDTH = 1280;
const HEIGHT = 720;

type VlogStyle = "lifestyle" | "travel" | "tech" | "driving";
type TextStyle = "serif" | "modern" | "none";

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
  travel: {
    label: "Travel / Adventure",
    prompt: `TRAVEL / ADVENTURE cinematic vlog im AUDI RS6 — episch, weit, awe-inspiring.
- HERO CAR: Audi RS6 Avant (C8) muss prominent in der Szene sein — korrekte Proportionen, Single-Frame-Grill, Quad-Auspuff, RS-Felgen, breite Hüften.
- Setting: RS6 auf Bergpass-Serpentine, Wüstenstraße, Küstenhighway, verschneitem Alpenpass, leerer Autobahn bei Sonnenaufgang. Subjekt steht am Auto, lehnt an der Motorhaube, oder sitzt mit offener Tür.
- Dramatisches atmosphärisches Licht, Mist/Staub/Sonnenstrahlen, weite Landschaft die Maßstab erzeugt.
- Color Grade: deep teal-orange cinematic, satte Schatten, glühende Highlights — RS6-Lack reflektiert die Umgebung.
- Reference: Peter McKinnon / Sam Kolder Auto-Roadtrip-Cinematic.`,
  },
  tech: {
    label: "Tech / Business",
    prompt: `TECH / BUSINESS vlog im AUDI RS6 — clean, modern, premium, futuristic.
- HERO CAR: Audi RS6 Avant (C8) als Statement-Objekt — perfekte Reflexionen, Studio-saubere Karosserie, RS-Details (Single-Frame, Quad-Auspuff, RS-Felgen, OLED-Lichter) korrekt.
- Setting: RS6 in moderner Tiefgarage mit LED-Strips, Glas-Showroom, nächtliche Skyline-Rooftop, oder minimal Studio mit kontrolliertem Light. Subjekt confident am/im Auto.
- Dashboard-Glow, MMI-Display sichtbar, Innenraum-Ambient-Light in Cyan/Blau, kontrollierte Three-Point-Beleuchtung mit Rim Light.
- Color Palette: tiefes Charcoal/Navy, electric Cyan/Blau Akzent, crisp Whites — RS6-Lack glänzt.
- Look: Apple Keynote / MKBHD Studio trifft Top-Gear-Hochglanz.`,
  },
  driving: {
    label: "In-Car POV / Driving Vlog",
    prompt: `IN-CAR DRIVING VLOG aus dem AUDI RS6 Avant (C8) — cinematic Selfie-POV aus dem Cockpit, exakt wie ein echtes Vlog-Standbild aus dem Auto.
- KAMERA-PERSPEKTIVE: Front-Selfie aus dem Fahrersitz, Handy/Kamera in ausgestreckter Hand (Arm leicht im Frame sichtbar wie auf einem echten Vlog-Selfie), Subjekt schaut Richtung Kamera. Leichte Weitwinkel-Optik (24-28mm look) wie iPhone-Frontkamera, aber mit cinematic Grading.
- COCKPIT-DETAILS sichtbar und korrekt: Audi RS6 Lenkrad mit RS-Logo und flachem unteren Bereich, Sicherheitsgurt diagonal über Brust, schwarze Lederausstattung mit Rautenmuster (Valcona Leder), Kopfstützen mit RS-Prägung im Hintergrund (Rückbank teilweise sichtbar), schwarzer Dachhimmel, Alcantara/Leder-Säulen, MMI-Display dezent angedeutet. Beifahrersitz leer und sichtbar.
- AUSSENWELT durch die Fenster: cinematic Autobahn / Landstraße / City bei Tag oder goldener Abendsonne — Bewegungs-Andeutung, Bäume/Leitplanken/Skyline ziehen vorbei, weiches Bokeh durch Windschutzscheibe & Seitenfenster.
- LIGHT: weiches Tageslicht von links durch Fahrerfenster, sanfte Schatten, natürlicher Hauttyp, leichter Lift in den Schatten, filmischer Kontrast.
- COLOR GRADE: leicht kühles Tageslicht außen, warmer Hautton innen, gedämpftes Schwarz im Interieur, dezenter Akzent in der Markenfarbe.
- STIMMUNG: ruhig, fokussiert, "auf dem Weg" — wie ein hochwertiger Daily-Driving-Vlog (Theo Baier / David Dobrik Auto-Selfie-Look in cinematic).`,
  },
};

const TEXT_STYLES: Record<TextStyle, string> = {
  serif: `Elegant cinematic DISPLAY SERIF (Playfair Display Black, Recoleta, Canela, GT Sectra). Title-case smart capitalization, tight tracking. Soft glow / subtle filmic drop shadow. Color tinted slightly toward the brand accent or warm cream. Vogue / WIRED / Netflix poster cover quality. Text layered BEHIND the subject for cinematic depth. Absolutely no bubble, comic, condensed-bold or MrBeast-style fonts.`,
  modern: `Clean modern GEOMETRIC SANS-SERIF (SF Pro Display, Inter, Söhne, Neue Haas Grotesk). Crisp white, perfect tracking, mixed weight hierarchy, generous negative space. Apple keynote / A24 minimal title card feel. Text positioned with intention, layered behind or beside the subject with soft cinematic shadow.`,
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

YOU MAY CHANGE: lighting quality, color grade, atmospheric details in the background, minor wardrobe color/finish, subtle expression nuance.

═══ PERSPECTIVE LOCK — equally critical ═══
KEEP the EXACT camera perspective, framing, focal length, distance, lens angle, head tilt, shoulder line, body pose, hand positions, and overall composition of the uploaded reference photo. Do NOT re-pose the subject, do NOT change the camera angle, do NOT zoom in or out, do NOT mirror, do NOT rotate. The output must register as the SAME photo, just upgraded — like a colorist + retoucher + environment-enhancement pass on the original frame.
The variant seed below describes ONLY background mood / atmospheric variation — it must NEVER override the original perspective.
═══════════════════════════════════════════

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

COMPOSITION VARIANT: ${body.imageBase64 ? `KEEP original perspective/pose/framing from the reference photo unchanged. Vary ONLY background atmosphere & lighting nuance: ${variantSeed}` : variantSeed}

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
- MANDATORY HERO CAR: Audi RS6 Avant (C8) MUST be present and clearly recognizable in EVERY thumbnail (interior driver shot, exterior leaning, parked, driving). Correct RS6 details only — NEVER an A6, S6, generic wagon or other brand. Quad-Oval-Auspuff, Single-Frame-Grill, RS-Felgen, breite Kotflügel, OLED-Heckleuchten, "quattro"-Schriftzug.
- CONSISTENCY ACROSS THIS BATCH: every variant must share the SAME color grade, SAME lighting mood, SAME wardrobe family, SAME subject identity. Only composition and angle change.

NEVER DO:
- No childish cartoon faces, no exaggerated shocked / open-mouth / pointing expressions
- No MrBeast-style loud bold-condensed type, no neon arrows, no red circles, no emoji overlays
- No comic / bubble / amateur fonts, no rainbow gradients, no glow-text spam
- No watermarks, no fake logos, no garbled or misspelled text
- No cluttered busy collage layouts, no stock-photo / fashion-editorial / movie-poster vibe
- No square / portrait / vertical framing — 16:9 landscape ONLY
- No plastic / waxy / airbrushed / over-smoothed skin, no AI-generic faces
- Do NOT change the subject's identity between variants
- ONLY cinematic, hyperrealistic, premium vlog aesthetic — nothing else`;
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

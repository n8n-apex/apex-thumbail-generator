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

  return `${body.imageBase64 ? `TASK: This is a PHOTO RETOUCH / RE-GRADE task. The attached image IS the output base. Your job is to keep the EXACT same photo — same person, same face, same pose, same framing, same background composition — and only upgrade the lighting, color grade and atmosphere into a cinematic YouTube vlog thumbnail. Do NOT generate a new scene, do NOT re-pose, do NOT swap the background.

` : ""}You are a world-class YouTube thumbnail designer creating a CINEMATIC, CLICK-WORTHY 16:9 thumbnail (exactly 1280×720, 16:9 landscape) for a personal VLOG. The result must look like a high-end Netflix poster / Apple keynote frame — premium, sharp, intentional. Instant scroll-stop visual impact at maximum production value.

${body.imageBase64 ? `═══ IMAGE LOCK — ABSOLUTE TOP PRIORITY (overrides everything else) ═══
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
` : `SUBJECT: Generate a photorealistic relatable vlogger (mid-20s to mid-30s, expressive but natural). Photo-real human, never illustrated. Across all variants in this batch keep the SAME person — same face, hair, age, ethnicity, outfit family — only change pose, expression and composition.
`}
${body.imageBase64 ? "" : `VLOG STYLE DIRECTION:\n${vlog.prompt}\n`}
${titleText ? `═══ TEXT RULES — STRICT ═══
There is EXACTLY ONE text element on the entire thumbnail: the headline below. NOTHING ELSE — no subtitle, no tagline, no episode number, no date, no channel name, no logo text, no captions, no badges, no watermark, no extra words anywhere in the frame.

HEADLINE (render EXACTLY this text, perfectly spelled, NO additions, NO variations, NO translations): "${titleText}"

Typography direction: ${textBlock}
- Max 2-3 lines, large, punchy, instantly readable at 320×180 thumbnail size
- Place behind shoulders or in clean negative space — NEVER over the face
- ${body.imageBase64 ? "Overlay the headline as a typographic layer ON TOP of the preserved photo — do NOT re-render or alter the underlying photo to fit the text." : ""}
═══════════════════════════════════════════════` : `NO TEXT AT ALL on the thumbnail. Zero words, zero letters, zero numbers, zero logos, zero captions, zero watermarks, zero signage. Pure cinematic image only.`}

BRAND ACCENT COLOR: ${brand}
- Use sparingly: rim light tint or headline color hint only. Do NOT flood the image.

${body.sceneDescription && !body.imageBase64 ? `SCENE / CONTEXT: ${body.sceneDescription}` : ""}

${body.imageBase64 ? `GRADE VARIANT (lighting/atmosphere only — perspective and content stay 100% locked to the uploaded photo): ${variantSeed}` : `COMPOSITION VARIANT: ${variantSeed}`}

ABSOLUTE QUALITY BAR — HYPERREALISTIC CINEMATIC VLOG THUMBNAIL:
- HYPER-PHOTOREALISTIC, indistinguishable from a real DSLR/cinema-camera frame (ARRI Alexa, RED Komodo, Sony FX6 look)
- Shot-on 35mm full-frame sensor feel, creamy natural bokeh, real skin micro-detail (pores, peach fuzz, subsurface scattering) — NEVER plastic / waxy / airbrushed
- Real-world physically-based lighting, motivated key, soft fill, rim light, accurate shadows
- Cinematic color science: filmic contrast, subtle teal-orange or warm grade, fine grain, no oversaturation, no HDR halos
- Razor-sharp focus on the eyes, micro-catchlights, individual eyelashes resolvable
- STRICT 16:9 LANDSCAPE aspect ratio (1280×720 or higher 16:9). NEVER square, vertical or 4:3.
- Must read clearly at 320×180 small preview size
- ${body.imageBase64 ? "ABSOLUTELY no new scenery, no added Audi RS6 if not present in the photo — keep the uploaded photo's setting." : "MANDATORY HERO CAR: Audi RS6 Avant (C8) prominently in the scene with correct details (Quad-Oval-Auspuff, Single-Frame-Grill, RS-Felgen, breite Kotflügel, OLED-Heckleuchten, \"quattro\"-Schriftzug)."}
- CONSISTENCY ACROSS BATCH: same color grade, same lighting mood, same subject identity across all variants.

NEVER DO:
- ${titleText ? `NEVER add ANY text other than the single headline "${titleText}" — no extra words, no duplicate text, no subtitle, no signage, no captions, no logo text.` : "NEVER add any text, letters, numbers, captions, logos, watermarks or signage of any kind."}
- No MrBeast-style loud bold-condensed type, no neon arrows, no red circles, no emoji overlays
- No comic / bubble / amateur fonts, no rainbow gradients, no glow-text spam
- No garbled or misspelled text
- No square / portrait / vertical framing — 16:9 landscape ONLY
- No plastic / waxy / airbrushed / over-smoothed skin, no AI-generic faces
- ${body.imageBase64 ? "NEVER change the person, pose, clothing, background or camera angle from the uploaded photo." : "Do NOT change the subject's identity between variants."}
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
  const models = imageBase64
    ? ["google/gemini-3.1-flash-image-preview"]
    : ["google/gemini-3.1-flash-image-preview", "google/gemini-3-pro-image-preview"];
  let lastError = "";
  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), imageBase64 ? 70000 : 55000);
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
      const variants = Math.min(4, Math.max(1, body.variants ?? 2));
      const seeds = VARIANT_SEEDS.slice(0, variants);

      // Process with limited concurrency to balance speed and memory
      const CONCURRENCY = 2;
      const settled: PromiseSettledResult<string>[] = [];
      for (let i = 0; i < seeds.length; i += CONCURRENCY) {
        const chunk = seeds.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.allSettled(
          chunk.map((seed) => callGemini(buildPrompt(body, seed), body.imageBase64, LOVABLE_API_KEY))
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

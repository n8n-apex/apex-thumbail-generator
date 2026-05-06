import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ThumbnailTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  style: string;
  width: number;
  height: number;
}

const TEMPLATES: ThumbnailTemplate[] = [
  {
    id: "yt-cinematic",
    title: "YouTube Cinematic",
    description: "Filmische Ästhetik mit dramatischer Beleuchtung",
    category: "YouTube",
    style: `HYPER-REALISTIC cinematic YouTube thumbnail. Professional photo-composite style like top YouTubers (MKBHD, Ali Abdaal, Peter McKinnon).
Key elements:
- LARGE BOLD HEADLINE text placed BEHIND the subject's head/body (text-behind-subject technique) — the text should appear to be layered behind the person
- Dramatic three-point lighting with strong rim light separating subject from background
- Shallow depth of field with cinematic bokeh
- Rich, color-graded look (teal-orange or moody dark tones)
- Clean composition with subject on one side, headline on the other
- Professional drop shadows and subtle glow effects on text
- NO clipart, NO cartoon elements, NO amateur look`,
    width: 1280,
    height: 720,
  },
  {
    id: "yt-editorial",
    title: "YouTube Editorial",
    description: "Magazin-Cover Layout, editorial Typografie",
    category: "YouTube",
    style: `HIGH-END editorial magazine cover style YouTube thumbnail. Think Vogue, GQ, or TIME magazine cover.
Key elements:
- BOLD SERIF or modern sans-serif headline text BEHIND or OVERLAPPING the subject (text-behind-subject layering)
- Mixed typography weights: massive headline + smaller subtext
- Clean grid-based layout with intentional whitespace
- Sophisticated muted color palette (earth tones, navy, cream) with ONE bold accent
- Subject photographed in studio-quality lighting
- Subtle texture overlays (grain, halftone dots)
- Editorial crop — subject may be partially cut off for dramatic effect`,
    width: 1280,
    height: 720,
  },
  {
    id: "yt-minimal",
    title: "YouTube Minimal",
    description: "Reduziertes Design mit starker Typografie",
    category: "YouTube",
    style: `ULTRA-PREMIUM minimalist YouTube thumbnail. Apple keynote / Google I/O quality.
Key elements:
- ONE massive bold keyword as focal point, placed with intention (can be behind subject)
- Generous negative space — at least 40% of frame is breathing room
- Monochromatic or duotone palette with subtle gradient
- Single clean focal element (person, product, or icon)
- Typography: modern geometric sans-serif (like Helvetica Neue, SF Pro, or Montserrat)
- Subtle shadows and depth through layering
- NO busy backgrounds, NO multiple text elements`,
    width: 1280,
    height: 720,
  },
  {
    id: "ig-editorial",
    title: "Instagram Editorial",
    description: "High-Fashion Magazin-Look",
    category: "Instagram",
    style: `HIGH-FASHION editorial Instagram post. Vogue/Harper's Bazaar aesthetic.
Key elements:
- Fashion-forward composition with bold typography overlay
- Text elegantly integrated with the subject (behind, overlapping, or framing)
- Sophisticated muted palette: cream, charcoal, blush, sage
- Elegant serif headlines (Playfair Display, Bodoni style)
- Studio-quality lighting with soft shadows
- Luxury brand visual language
- Clean, aspirational, gallery-worthy`,
    width: 1080,
    height: 1080,
  },
  {
    id: "ig-brand",
    title: "Instagram Brand",
    description: "Premium Brand Identity Post",
    category: "Instagram",
    style: `PREMIUM brand identity Instagram post. Apple, Tesla, or Aesop marketing quality.
Key elements:
- Clean geometric layout with sophisticated color blocking
- Bold modern sans-serif typography, perfectly kerned
- Product/subject as hero element with dramatic lighting
- Monochromatic base + ONE accent color for maximum impact
- Minimalist composition with intentional negative space
- Premium materials feel: glass, metal, concrete textures
- Text can be layered behind or around the subject`,
    width: 1080,
    height: 1080,
  },
  {
    id: "ig-story-premium",
    title: "Story Premium",
    description: "Elegante Story mit Glassmorphism",
    category: "Instagram",
    style: `PREMIUM Instagram story with glassmorphism design language.
Key elements:
- Frosted glass card overlays with subtle transparency
- Vibrant gradient mesh background (but refined, not garish)
- Clean sans-serif typography with perfect hierarchy
- Subject/product centered with glass panels framing it
- Soft shadows and light refraction effects
- Modern UI-inspired layout (like iOS or macOS design)
- Headline text integrated with glass layers`,
    width: 1080,
    height: 1920,
  },
  {
    id: "tt-professional",
    title: "TikTok Professional",
    description: "Modernes Cover mit starkem Branding",
    category: "TikTok",
    style: `PROFESSIONAL TikTok cover with modern tech/startup aesthetic.
Key elements:
- Bold gradient mesh or abstract 3D background
- Large impactful headline text (can be behind subject)
- Clean, contemporary design — NO childish or trendy TikTok clichés
- Strong brand presence with accent color
- Professional portrait or product shot
- Sleek, polished, Silicon Valley quality
- Typography: bold geometric sans-serif`,
    width: 1080,
    height: 1920,
  },
  {
    id: "li-thought-leader",
    title: "LinkedIn Thought Leader",
    description: "Authoritative Business-Visual",
    category: "LinkedIn",
    style: `AUTHORITATIVE LinkedIn thought leadership visual. McKinsey, BCG presentation quality.
Key elements:
- Professional navy/charcoal base with gold or electric blue accent
- Clean data visualization elements (charts, graphs as design accents)
- Bold headline with executive-level typography
- Corporate but MODERN — not dated or generic
- Subject/portrait with professional lighting
- Infographic-inspired layout with clean hierarchy
- Text layered with sophisticated depth effects`,
    width: 1200,
    height: 627,
  },
  {
    id: "fb-corporate",
    title: "Facebook Corporate",
    description: "Professioneller Unternehmens-Post",
    category: "Facebook",
    style: `PROFESSIONAL corporate Facebook post. Fortune 500 marketing quality.
Key elements:
- Clean, credible, brand-consistent design
- Modern gradient or solid color background
- Professional typography hierarchy (headline + subtext)
- Subject/product integrated cleanly
- Subtle geometric patterns or abstract shapes
- Business communication style with polish
- Text and imagery layered with depth`,
    width: 1200,
    height: 630,
  },
  {
    id: "podcast-premium",
    title: "Podcast Premium",
    description: "High-End Podcast-Cover",
    category: "Podcast",
    style: `PREMIUM podcast cover art. NPR, Spotify Original, or NYT podcast quality.
Key elements:
- Sophisticated dark theme with rich accent details (gold, electric blue, or warm amber)
- Professional headshot integration with dramatic lighting
- Luxury magazine-quality typography (mix of serif headline + sans-serif details)
- Subtle audio motifs (waveform, microphone silhouette) as design accents — NOT literal
- Moody, atmospheric, cinematic feel
- Title text as main design element, can be behind or overlapping the portrait
- Square format optimized for podcast players`,
    width: 1400,
    height: 1400,
  },
  {
    id: "testimonial-youtube",
    title: "Testimonial YouTube",
    description: "Cinematic 16:9 YouTube Testimonial",
    category: "Testimonial",
    style: `HYPER-REALISTIC cinematic 16:9 YouTube TESTIMONIAL thumbnail. Same premium quality as top YouTubers (MKBHD, Ali Abdaal, Peter McKinnon).
Key elements:
- Customer portrait as the hero subject with dramatic three-point lighting and strong rim light separating subject from background
- LARGE BOLD customer QUOTE rendered with text-behind-subject technique — quote text appears layered BEHIND the person
- Elegant oversized quote marks (") as a refined accent in brand color
- Shallow depth of field with cinematic bokeh background
- Rich color-graded look (teal-orange or moody dark tones)
- Small attribution line: name + role/company in clean smaller typography
- Professional drop shadows and subtle glow on text
- NO clipart, NO cartoon, NO amateur look — feels like a film still`,
    width: 1280,
    height: 720,
  },
  {
    id: "testimonial-instagram-portrait",
    title: "Testimonial Instagram 4:5",
    description: "Cinematic 4:5 Instagram Portrait Testimonial",
    category: "Testimonial",
    style: `HYPER-REALISTIC cinematic 4:5 Instagram PORTRAIT testimonial post. Film-still quality.
Key elements:
- Customer portrait as hero subject with dramatic three-point lighting and strong rim light
- LARGE BOLD customer QUOTE using text-behind-subject technique — quote layered BEHIND the person
- Elegant oversized quote marks (") as refined accent in brand color
- Shallow depth of field, cinematic bokeh background
- Rich color-graded look (teal-orange or moody dark tones)
- Attribution: name, role, company in clean small typography
- Professional drop shadows, subtle glow on text
- Optimized for 4:5 portrait Instagram feed crop — composition uses vertical real estate
- NO clipart, NO cartoon, NO amateur look — feels like a film still`,
    width: 1080,
    height: 1350,
  },
  {
    id: "testimonial-instagram",
    title: "Testimonial Instagram Post",
    description: "Cinematic 1:1 Instagram Testimonial",
    category: "Testimonial",
    style: `HYPER-REALISTIC cinematic 1:1 Instagram TESTIMONIAL post. Film-still quality.
Key elements:
- Customer portrait as hero subject with dramatic three-point lighting and strong rim light
- LARGE BOLD customer QUOTE using text-behind-subject technique — quote layered BEHIND the person
- Elegant oversized quote marks (") as a refined accent in brand color
- Shallow depth of field with cinematic bokeh
- Rich color-graded palette (teal-orange or moody dark tones)
- Attribution: name, role, company in clean small typography
- Professional drop shadows, subtle glow on text
- NO clipart, NO cartoon — premium, film-still feel`,
    width: 1080,
    height: 1080,
  },
  {
    id: "testimonial-quote",
    title: "Testimonial Quote",
    description: "Cinematic Premium Kunden-Zitat",
    category: "Testimonial",
    style: `HYPER-REALISTIC cinematic 1:1 testimonial graphic — film-still aesthetic.
Key elements:
- Customer portrait as hero subject with dramatic three-point lighting, strong rim light, cinematic bokeh
- LARGE BOLD customer QUOTE rendered with text-behind-subject technique — quote layered BEHIND the person
- Elegant oversized quote marks (") as refined accent in brand color
- Rich color-graded look (teal-orange or moody dark tones)
- Small attribution line: name + role/company
- Professional drop shadows and subtle glow effects on text
- NO clipart, NO cartoon, NO amateur look`,
    width: 1080,
    height: 1080,
  },
  {
    id: "testimonial-story",
    title: "Testimonial Story",
    description: "Cinematic 9:16 Testimonial Story",
    category: "Testimonial",
    style: `HYPER-REALISTIC cinematic 9:16 vertical TESTIMONIAL story (Instagram/TikTok). Film-still quality.
Key elements:
- Customer portrait as full-bleed hero with dramatic three-point lighting and strong rim light
- LARGE BOLD customer QUOTE using text-behind-subject technique — quote layered BEHIND the person
- Elegant oversized quote marks (") as refined accent in brand color
- Shallow depth of field, cinematic bokeh
- Rich color-graded look (teal-orange or moody dark tones)
- Attribution: name, role, company in clean small typography
- Professional drop shadows, subtle glow on text
- NO clipart, NO cartoon, NO amateur look — feels like a film still`,
    width: 1080,
    height: 1920,
  },
  {
    id: "testimonial-landscape",
    title: "Testimonial Landscape",
    description: "Cinematic Landscape Testimonial Web/LinkedIn",
    category: "Testimonial",
    style: `HYPER-REALISTIC cinematic landscape TESTIMONIAL graphic for website hero or LinkedIn. Film-still quality.
Key elements:
- Customer portrait as hero subject with dramatic three-point lighting and strong rim light
- LARGE BOLD customer QUOTE using text-behind-subject technique — quote layered BEHIND the person
- Elegant oversized quote marks (") as refined accent in brand color
- Shallow depth of field, cinematic bokeh background
- Rich color-graded look (teal-orange or moody dark tones)
- Attribution block: name, role, company in clean small typography
- Professional drop shadows, subtle glow on text
- NO clipart, NO cartoon, NO amateur look`,
    width: 1200,
    height: 627,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { action, templateId, customText, brandColor, imageBase64, prompt, testimonialName, testimonialRole } = await req.json();

    if (action === "list-templates") {
      return new Response(
        JSON.stringify({ templates: TEMPLATES }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate") {
      const template = TEMPLATES.find((t) => t.id === templateId);
      if (!template) {
        return new Response(
          JSON.stringify({ error: "Template not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const textInstruction = customText
        ? `CRITICAL: Include this exact text as the MAIN HEADLINE in the design: "${customText}". 
           Make it the dominant visual element. Use the text-behind-subject technique where the headline text appears BEHIND the person/subject.
           The text should be LARGE, BOLD, and perfectly readable. Professional typography with proper kerning and weight.`
        : "Create a visually striking composition without specific text. Use abstract shapes or subtle placeholder elements instead.";

      const colorInstruction = brandColor
        ? `Use ${brandColor} as the PRIMARY ACCENT COLOR. Apply it strategically: headline text color, rim lights, subtle glows, or accent elements. Keep the overall palette cohesive and sophisticated.`
        : "";

      const imageInstruction = imageBase64
        ? `IMPORTANT: Use this uploaded image as the MAIN SUBJECT. Place it prominently in the composition.
           Apply the text-behind-subject technique: layer the headline text BEHIND the subject so text appears to go behind the person/object.
           Color-grade the subject to match the overall thumbnail aesthetic.
           Add dramatic lighting effects (rim light, ambient glow) to integrate the subject naturally.`
        : "Create a compelling visual composition with abstract elements, shapes, or symbolic imagery as the focal point.";

      const masterPrompt = `You are a world-class thumbnail designer. Create an EXCEPTIONAL, PROFESSIONAL thumbnail image.

STYLE DIRECTION:
${template.style}

${textInstruction}

${colorInstruction}

${imageInstruction}

ABSOLUTE REQUIREMENTS:
- ALL text MUST be in German (Deutsch). No English text whatsoever.
- This must look like it was made by a TOP-TIER creative agency (Pentagram, Collins, or IDEO level)
- PHOTO-REALISTIC quality — no illustrations, no cartoons, no clipart
- Professional color grading with cinematic feel
- Clean, intentional composition with clear visual hierarchy
- The text-behind-subject layering technique is KEY for premium look
- Output: ${template.width}×${template.height}px

NEVER DO:
- No "Mr Beast" clickbait style
- No comic/bubble fonts
- No neon arrows or circles
- No shocked face expressions
- No emoji overlays
- No cluttered busy layouts
- No amateur stock photo look
- No generic corporate clip art`;

      const messages: any[] = [
        {
          role: "user",
          content: imageBase64
            ? [
                { type: "text", text: masterPrompt },
                { type: "image_url", image_url: { url: imageBase64 } },
              ]
            : masterPrompt,
        },
      ];

      const models = ["google/gemini-3-pro-image-preview", "google/gemini-3.1-flash-image-preview"];
      let response: Response | null = null;
      let lastError = "";

      for (const model of models) {
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            modalities: ["image", "text"],
          }),
        });

        if (response.ok) break;

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es in ein paar Sekunden erneut." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI-Credits aufgebraucht. Bitte lade dein Guthaben auf." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        lastError = await response.text();
        console.error(`Model ${model} failed:`, response.status, lastError);
        // Try next model
      }

      if (!response || !response.ok) {
        throw new Error(`All AI models failed. Last error: ${lastError}`);
      }

      const data = await response.json();
      const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImage) {
        console.error("No image in AI response:", JSON.stringify(data).slice(0, 500));
        throw new Error("AI did not return an image");
      }

      return new Response(
        JSON.stringify({ image: generatedImage, template }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "iterate") {
      const iterateImage = imageBase64;
      const iteratePrompt = prompt || customText;
      if (!iterateImage || !iteratePrompt) {
        return new Response(
          JSON.stringify({ error: "Image and prompt required for iteration" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const iterateModels = ["google/gemini-3-pro-image-preview", "google/gemini-3.1-flash-image-preview"];
      let iterateResp: Response | null = null;
      let iterateLastErr = "";

      for (const model of iterateModels) {
        iterateResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: `You are a world-class thumbnail designer. Edit this thumbnail: ${iteratePrompt}. 
                  
Maintain the PREMIUM, PROFESSIONAL quality. Make precise, targeted changes only. 
Keep the text-behind-subject layering if present. 
Ensure photo-realistic quality and cinematic color grading.
ALL text must remain in German.` },
                  { type: "image_url", image_url: { url: iterateImage } },
                ],
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (iterateResp.ok) break;

        if (iterateResp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit erreicht." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (iterateResp.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI-Credits aufgebraucht." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        iterateLastErr = await iterateResp.text();
        console.error(`Iterate model ${model} failed:`, iterateResp.status, iterateLastErr);
      }

      if (!iterateResp || !iterateResp.ok) {
        throw new Error(`All AI models failed for iteration. Last: ${iterateLastErr}`);
      }

      const data = await iterateResp.json();
      const editedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!editedImage) throw new Error("AI did not return an edited image");

      return new Response(
        JSON.stringify({ image: editedImage }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Thumbnail generator error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    style: "Cinematic widescreen composition, dramatic rim lighting, shallow depth of field effect, dark moody atmosphere with a single accent color highlight, professional color grading like a movie poster, elegant serif or sans-serif typography, no cluttered elements",
    width: 1280,
    height: 720,
  },
  {
    id: "yt-editorial",
    title: "YouTube Editorial",
    description: "Magazin-Cover Layout, editorial Typografie",
    category: "YouTube",
    style: "High-end editorial magazine cover layout, sophisticated typography with mixed weights, clean grid-based composition, muted earth tones or monochromatic palette with one accent, professional portrait or product photography style, subtle geometric overlays",
    width: 1280,
    height: 720,
  },
  {
    id: "yt-minimal",
    title: "YouTube Minimal",
    description: "Reduziertes Design mit starker Typografie",
    category: "YouTube",
    style: "Ultra-minimal design, generous whitespace, bold modern sans-serif headline, single focal point, monochromatic with subtle gradient, Apple/Google design language, no decorative clutter",
    width: 1280,
    height: 720,
  },
  {
    id: "ig-editorial",
    title: "Instagram Editorial",
    description: "High-Fashion Magazin-Look",
    category: "Instagram",
    style: "High-fashion editorial post, Vogue/GQ magazine aesthetic, sophisticated muted color palette, elegant serif typography, clean layout with tasteful negative space, premium feel",
    width: 1080,
    height: 1080,
  },
  {
    id: "ig-brand",
    title: "Instagram Brand",
    description: "Premium Brand Identity Post",
    category: "Instagram",
    style: "Premium brand identity post, clean geometric layout, sophisticated color blocking, modern sans-serif typography, luxury brand aesthetic like Apple or Tesla marketing, minimal elegant composition",
    width: 1080,
    height: 1080,
  },
  {
    id: "ig-story-premium",
    title: "Story Premium",
    description: "Elegante Story mit Glassmorphism",
    category: "Instagram",
    style: "Premium Instagram story, glassmorphism card elements, subtle gradient background, refined sans-serif typography, luxury product presentation style, frosted glass overlays, soft shadows",
    width: 1080,
    height: 1920,
  },
  {
    id: "tt-professional",
    title: "TikTok Professional",
    description: "Modernes Cover mit starkem Branding",
    category: "TikTok",
    style: "Professional TikTok cover, modern gradient mesh background, clean bold typography, contemporary design, no childish elements, startup/tech aesthetic, sleek and polished",
    width: 1080,
    height: 1920,
  },
  {
    id: "li-thought-leader",
    title: "LinkedIn Thought Leader",
    description: "Authoritative Business-Visual",
    category: "LinkedIn",
    style: "Authoritative LinkedIn thought leadership post, corporate but modern design, data visualization accents, professional navy/charcoal palette with gold or blue accent, clean infographic style, executive presentation quality",
    width: 1200,
    height: 627,
  },
  {
    id: "fb-corporate",
    title: "Facebook Corporate",
    description: "Professioneller Unternehmens-Post",
    category: "Facebook",
    style: "Corporate Facebook post, clean professional layout, brand-consistent design, subtle gradient, modern typography hierarchy, business communication style, polished and credible",
    width: 1200,
    height: 630,
  },
  {
    id: "podcast-premium",
    title: "Podcast Premium",
    description: "High-End Podcast-Cover",
    category: "Podcast",
    style: "Premium podcast cover art, sophisticated dark theme, elegant gold or accent color details, professional headshot integration style, luxury magazine typography, subtle audio wave or microphone motif, NPR/Spotify Original quality",
    width: 1400,
    height: 1400,
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

    const { action, templateId, customText, brandColor, imageBase64, prompt } = await req.json();

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
        ? `Include this text prominently in the design: "${customText}". Use elegant, professional typography.`
        : "Do not include any specific text. Use clean placeholder areas or leave space for text.";

      const colorInstruction = brandColor
        ? `Use ${brandColor} as the primary accent color, keeping the overall palette sophisticated.`
        : "";

      const prompt = `Create a premium, professional ${template.category} thumbnail/post image. 
Style: ${template.style}. 
${textInstruction} 
${colorInstruction}
IMPORTANT: ALL text in the image MUST be in German (Deutsch). No English text whatsoever. Use German words, phrases, and typography.
This must look like it was designed by a top-tier creative agency. No amateur, clickbait, or "Mr Beast" style elements. 
No excessive text, no comic fonts, no neon arrows, no shocked face expressions, no emoji overlays, no busy cluttered layouts.
The design should feel premium, refined, and sophisticated. Think Vogue, Apple, or McKinsey presentation quality.
Output dimensions: ${template.width}x${template.height} pixels.`;

      const messages: any[] = [
        {
          role: "user",
          content: imageBase64
            ? [
                { type: "text", text: `${prompt}\n\nUse this uploaded image as the main visual element. Integrate it elegantly into the composition.` },
                { type: "image_url", image_url: { url: imageBase64 } },
              ]
            : prompt,
        },
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages,
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
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
        const errorText = await response.text();
        console.error("AI Gateway error:", response.status, errorText);
        throw new Error(`AI Gateway error: ${response.status}`);
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

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: `Edit this thumbnail image: ${iteratePrompt}. Keep the overall professional, premium quality. Make precise targeted changes only.` },
                { type: "image_url", image_url: { url: iterateImage } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit erreicht." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI-Credits aufgebraucht." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
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

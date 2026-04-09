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
    id: "yt-bold",
    title: "YouTube Bold",
    description: "Fetter Text mit Kontrast-Hintergrund",
    category: "YouTube",
    style: "Bold text overlay with high contrast gradient background, dramatic lighting, professional YouTube thumbnail style",
    width: 1280,
    height: 720,
  },
  {
    id: "yt-reaction",
    title: "YouTube Reaktion",
    description: "Shocked Face Style mit großem Text",
    category: "YouTube",
    style: "Reaction-style thumbnail with large expressive text, bright colors, speech bubbles, arrows, YouTube reaction thumbnail style",
    width: 1280,
    height: 720,
  },
  {
    id: "yt-tutorial",
    title: "YouTube Tutorial",
    description: "Clean mit Schritt-Anzeige",
    category: "YouTube",
    style: "Clean tutorial thumbnail with step numbers, modern gradient background, tech/education style, professional",
    width: 1280,
    height: 720,
  },
  {
    id: "ig-lifestyle",
    title: "Instagram Lifestyle",
    description: "Ästhetisch mit Warm-Ton Filter",
    category: "Instagram",
    style: "Aesthetic lifestyle Instagram post, warm tones, soft lighting, minimal elegant text overlay, influencer style",
    width: 1080,
    height: 1080,
  },
  {
    id: "ig-promo",
    title: "Instagram Promo",
    description: "Produkt-Highlight mit CTA",
    category: "Instagram",
    style: "Product promotion Instagram post, clean background, bold call-to-action text, modern minimalist design",
    width: 1080,
    height: 1080,
  },
  {
    id: "ig-story-sale",
    title: "Story Sale",
    description: "Sale/Angebot Story",
    category: "Instagram",
    style: "Instagram story sale announcement, bold discount text, vibrant gradient, urgency elements, swipe-up style",
    width: 1080,
    height: 1920,
  },
  {
    id: "tt-hook",
    title: "TikTok Hook",
    description: "Attention-Grabbing Cover",
    category: "TikTok",
    style: "TikTok cover image, bold hook text, trending style, eye-catching colors, Gen-Z aesthetic",
    width: 1080,
    height: 1920,
  },
  {
    id: "li-professional",
    title: "LinkedIn Professional",
    description: "Business-Post mit Clean Design",
    category: "LinkedIn",
    style: "Professional LinkedIn post image, corporate clean design, business blue tones, data visualization elements, thought leadership style",
    width: 1200,
    height: 627,
  },
  {
    id: "fb-engagement",
    title: "Facebook Engagement",
    description: "Engagement-Post mit Frage",
    category: "Facebook",
    style: "Facebook engagement post, question-style layout, community interaction design, warm welcoming colors",
    width: 1200,
    height: 630,
  },
  {
    id: "podcast-cover",
    title: "Podcast Cover",
    description: "Professionelles Podcast-Cover",
    category: "Podcast",
    style: "Professional podcast cover art, microphone elements, bold podcast name text, dark moody background, audio wave visualization",
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

    const { action, templateId, customText, brandColor, imageBase64 } = await req.json();

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
        ? `Include this text prominently in the design: "${customText}".`
        : "Do not include any specific text, use placeholder text areas.";

      const colorInstruction = brandColor
        ? `Use ${brandColor} as the primary accent color.`
        : "";

      let prompt = `Create a professional ${template.category} thumbnail/post image. Style: ${template.style}. ${textInstruction} ${colorInstruction} The image should be ${template.width}x${template.height} pixels, high quality, ready to post. Make it look like it was made by a professional social media designer.`;

      const messages: any[] = [
        {
          role: "user",
          content: imageBase64
            ? [
                { type: "text", text: `${prompt} Use this uploaded image as the main visual element and incorporate it into the design.` },
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
        JSON.stringify({
          image: generatedImage,
          template,
        }),
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

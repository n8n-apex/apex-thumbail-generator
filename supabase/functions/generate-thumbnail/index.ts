import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    const { action } = body;

    // === SUGGEST MODE: analyze transcript and suggest viral thumbnail ===
    if (action === "suggest") {
      const { transcript } = body;
      if (!transcript || transcript.length === 0) {
        return new Response(
          JSON.stringify({ error: "No transcript provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const transcriptText = transcript.map((w: any) => w.text).join(" ");

      const suggestResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `Du bist ein Social-Media-Experte für virale YouTube/TikTok/Instagram Thumbnails. 
Analysiere das Transkript und schlage vor:
1. Eine Thumbnail-Beschreibung (auf Englisch, für KI-Bildgenerierung optimiert) die maximal viral ist - nutze Emotionen, Neugier, Überraschung
2. Einen kurzen, knalligen Overlay-Text (auf Deutsch, max 4-5 Wörter) der Klicks generiert

Antworte NUR im JSON-Format:
{"prompt": "...", "overlayText": "...", "focusType": "face|center|product|text"}`
              },
              {
                role: "user",
                content: `Transkript: "${transcriptText.slice(0, 2000)}"`
              }
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "suggest_thumbnail",
                  description: "Return a viral thumbnail suggestion based on the transcript.",
                  parameters: {
                    type: "object",
                    properties: {
                      prompt: { type: "string", description: "English image generation prompt for a viral thumbnail" },
                      overlayText: { type: "string", description: "Short German overlay text, max 4-5 words, click-bait style" },
                      focusType: { type: "string", enum: ["face", "center", "product", "text"] }
                    },
                    required: ["prompt", "overlayText", "focusType"],
                    additionalProperties: false
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "suggest_thumbnail" } }
          }),
        }
      );

      if (!suggestResponse.ok) {
        if (suggestResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (suggestResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Credits required. Please add funds." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const t = await suggestResponse.text();
        console.error("AI suggest error:", suggestResponse.status, t);
        throw new Error(`AI error: ${suggestResponse.status}`);
      }

      const suggestData = await suggestResponse.json();
      
      // Extract from tool call
      const toolCall = suggestData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const args = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({ suggestion: args }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback: try parsing content as JSON
      const content = suggestData.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(content);
        return new Response(
          JSON.stringify({ suggestion: parsed }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        throw new Error("Could not parse suggestion");
      }
    }

    // === GENERATE MODE: create the thumbnail image ===
    const { prompt, frameImage, overlayText } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "No prompt provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userContent: any[] = [];

    let fullPrompt = `Create an ultra-realistic, cinematic Instagram/TikTok Reel thumbnail in PORTRAIT 9:16 aspect ratio (1080x1920). ${prompt}`;
    
    if (overlayText) {
      fullPrompt += ` Include the text "${overlayText}" in a frosted glass / liquid glass style overlay box with rounded corners, subtle blur, and light refraction effects. The text should be bold, clearly legible, and prominent.`;
    }

    fullPrompt += ` Style: ultra-high quality, 4K cinematic look, dramatic lighting, shallow depth of field, professional color grading. The image MUST be in vertical 9:16 portrait format. The thumbnail should be eye-catching and scroll-stopping.`;

    userContent.push({ type: "text", text: fullPrompt });

    if (frameImage) {
      userContent.push({
        type: "image_url",
        image_url: { url: frameImage },
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: userContent }],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits required. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = data.choices?.[0]?.message?.content || "";

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    return new Response(
      JSON.stringify({ imageUrl, description: textContent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Thumbnail generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

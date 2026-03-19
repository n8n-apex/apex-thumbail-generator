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

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const language = (formData.get("language") as string) || "de";

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (audioFile.size > 4 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Audio file too large. Max 4MB." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let base64Audio = "";
    const chunkSize = 32768;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      base64Audio += String.fromCharCode(...chunk);
    }
    base64Audio = btoa(base64Audio);

    const mimeType = audioFile.type || "audio/wav";

    // Use tool calling for structured output - much more reliable than asking for JSON in text
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are a precise speech-to-text transcription engine. Transcribe this audio word by word in language: ${language}.

CRITICAL TIMING RULES:
- Each word MUST have precise start and end timestamps in seconds (2 decimal places)
- The start time of a word is when the speaker BEGINS saying it
- The end time is when the speaker FINISHES saying it  
- Words must be in chronological order
- There must be NO gaps between consecutive words within a sentence (the end of word N should equal or be very close to the start of word N+1)
- Silence gaps between sentences are fine
- Be extremely precise with timing - these timestamps control subtitle display

QUALITY RULES:
- Only transcribe clearly spoken, intelligible words
- Skip filler sounds like "ähm", "äh", "hmm", "mhm" unless they're clearly intentional
- Do NOT include random noise artifacts or unintelligible sounds as words
- If a word is unclear, skip it rather than guessing
- Set confidence below 0.5 for any word you're unsure about
- Clean up the text for natural reading flow`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Audio}`,
                  },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_transcript",
                description: "Return the transcribed words with precise timestamps.",
                parameters: {
                  type: "object",
                  properties: {
                    words: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          text: { type: "string", description: "The spoken word" },
                          start: { type: "number", description: "Start time in seconds (precise to 2 decimals)" },
                          end: { type: "number", description: "End time in seconds (precise to 2 decimals)" },
                          confidence: { type: "number", description: "Confidence score 0-1" },
                        },
                        required: ["text", "start", "end", "confidence"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["words"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_transcript" } },
        }),
      }
    );

    base64Audio = "";

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits required." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();

    // Extract from tool call response
    let transcript: Array<{text: string; start: number; end: number; confidence: number}> = [];

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        transcript = args.words || [];
      } catch (e) {
        console.error("Failed to parse tool call:", e);
      }
    }

    // Fallback: try content as text
    if (transcript.length === 0) {
      const content = data.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) transcript = JSON.parse(jsonMatch[0]);
      } catch {
        console.error("Fallback parse failed:", content);
      }
    }

    console.log(`Transcribed ${transcript.length} words`);

    return new Response(
      JSON.stringify({ transcript }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Transcription error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

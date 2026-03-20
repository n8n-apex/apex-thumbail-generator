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
    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    if (!DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_API_KEY is not configured");
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

    if (audioFile.size > 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Audio file too large. Max 25MB." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await audioFile.arrayBuffer();

    // Deepgram pre-recorded API with word-level timestamps
    const params = new URLSearchParams({
      model: "nova-3",
      language,
      smart_format: "true",
      punctuate: "true",
      diarize: "false",
      utterances: "false",
      // Filler word detection — Deepgram marks them so we can filter client-side
      filler_words: "true",
    });

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?${params.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": audioFile.type || "audio/wav",
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Deepgram API error [${response.status}]:`, errorText);

      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Invalid Deepgram API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Deepgram credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Deepgram API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract word-level results from Deepgram response
    const channel = data.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    if (!alternative?.words || alternative.words.length === 0) {
      return new Response(
        JSON.stringify({ transcript: [], provider: "deepgram" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map Deepgram words to our TranscriptWord format
    const transcript = alternative.words.map((w: {
      word: string;
      start: number;
      end: number;
      confidence: number;
      punctuated_word?: string;
    }) => ({
      text: w.punctuated_word || w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    }));

    console.log(`Deepgram transcribed ${transcript.length} words (lang: ${language})`);

    return new Response(
      JSON.stringify({ transcript, provider: "deepgram" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Deepgram transcription error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

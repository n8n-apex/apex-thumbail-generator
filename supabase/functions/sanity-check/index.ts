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

    const { transcript, silences, calibration, duration } = await req.json();

    if (!transcript || transcript.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transcript provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context for the sanity check agent
    const transcriptText = transcript.map((w: any) => w.text).join(" ");
    const wordCount = transcript.length;
    const avgConfidence = transcript.reduce((s: number, w: any) => s + (w.confidence || 0), 0) / wordCount;
    const silenceCount = silences?.length || 0;
    const silenceTime = silences?.reduce((s: number, gap: any) => s + (gap.end - gap.start), 0) || 0;

    // Check for timing issues in transcript
    const timingIssues: string[] = [];
    for (let i = 0; i < transcript.length - 1; i++) {
      const curr = transcript[i];
      const next = transcript[i + 1];
      if (curr.end > next.start + 0.05) {
        timingIssues.push(`Overlap: "${curr.text}" (${curr.end.toFixed(2)}s) > "${next.text}" (${next.start.toFixed(2)}s)`);
      }
      const gap = next.start - curr.end;
      if (gap > 2.0) {
        timingIssues.push(`Large gap ${gap.toFixed(1)}s between "${curr.text}" and "${next.text}"`);
      }
    }

    // Check for words inside silence gaps (subtitle would show during cut)
    const wordsInSilence: string[] = [];
    if (silences) {
      for (const w of transcript) {
        for (const s of silences) {
          if (w.start >= s.start && w.end <= s.end) {
            wordsInSilence.push(`"${w.text}" at ${w.start.toFixed(2)}s is inside silence gap`);
          }
        }
      }
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
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Du bist ein Qualitätskontrolle-Agent für Video-Untertitel und Silence-Cutting.

Deine Aufgabe: Prüfe ob die Untertitel mit der Sprache synchron sind und die Pausen-Schnitte sinnvoll gesetzt sind.

Bewerte auf einer Skala 0-100:
- sync_score: Wie gut matchen Untertitel mit der Stimme? (Timing-Überlappungen, Lücken, Reihenfolge)
- cut_score: Wie sinnvoll sind die Pausen-Schnitte? (Nicht mitten im Satz, nicht zu aggressiv, nicht zu sanft)
- content_score: Ist der Transkript-Text sinnvoll und lesbar? (Keine Artefakte, guter Textfluss)

Gib konkrete Verbesserungsvorschläge wenn ein Score unter 80 ist.
Wenn alles gut ist, bestätige das.`
            },
            {
              role: "user",
              content: `Prüfe dieses Video-Ergebnis:

TRANSKRIPT (${wordCount} Wörter, Ø Konfidenz: ${(avgConfidence * 100).toFixed(1)}%):
"${transcriptText.slice(0, 3000)}"

PAUSEN-SCHNITTE: ${silenceCount} Pausen entfernt (${silenceTime.toFixed(1)}s von ${duration?.toFixed(1) || "?"}s)

KALIBRIERUNG: ${calibration?.reasoning || "Standard-Parameter"}
Konfidenz: ${calibration?.confidence || "N/A"}/100

ERKANNTE TIMING-PROBLEME: ${timingIssues.length > 0 ? timingIssues.slice(0, 10).join("\n") : "Keine"}

WÖRTER IN PAUSEN-GAPS: ${wordsInSilence.length > 0 ? wordsInSilence.slice(0, 5).join("\n") : "Keine"}`
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "sanity_check_result",
                description: "Return the quality check results",
                parameters: {
                  type: "object",
                  properties: {
                    sync_score: { type: "number", description: "Subtitle-voice sync quality 0-100" },
                    cut_score: { type: "number", description: "Silence cut quality 0-100" },
                    content_score: { type: "number", description: "Transcript content quality 0-100" },
                    overall_score: { type: "number", description: "Overall quality 0-100" },
                    passed: { type: "boolean", description: "true if all scores >= 70 and overall >= 75" },
                    issues: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "List of specific issues found (empty if passed)"
                    },
                    suggestions: {
                      type: "array",
                      items: { type: "string" },
                      description: "Actionable improvement suggestions"
                    },
                    summary: { type: "string", description: "Brief German summary of the check result" }
                  },
                  required: ["sync_score", "cut_score", "content_score", "overall_score", "passed", "issues", "suggestions", "summary"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "sanity_check_result" } }
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
      console.error("Sanity check AI error:", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify({ result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("No structured result from sanity check");
  } catch (error: unknown) {
    console.error("Sanity check error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

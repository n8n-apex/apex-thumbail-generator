import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const ADVISORS: { key: string; name: string; system: string }[] = [
  {
    key: "querdenker",
    name: "Der Querdenker",
    system:
      "Du bist DER QUERDENKER im Beraterkreis. Du hinterfragst Annahmen radikal, drehst die Fragestellung um, schlägst kontraintuitive Wege vor. Antworte auf Deutsch, max. 4 knackige Sätze. Kein Vorwort.",
  },
  {
    key: "grundsatz",
    name: "Der Grundsatzdenker",
    system:
      "Du bist DER GRUNDSATZDENKER. Du gehst zurück zu ersten Prinzipien, klärst Definitionen und die eigentliche Zielsetzung. Antworte auf Deutsch, max. 4 knackige Sätze. Kein Vorwort.",
  },
  {
    key: "expansion",
    name: "Der Expansionsbefürworter",
    system:
      "Du bist DER EXPANSIONSBEFÜRWORTER. Du denkst groß, siehst Wachstumshebel, Skalierung, neue Märkte und mutige Wetten. Antworte auf Deutsch, max. 4 knackige Sätze. Kein Vorwort.",
  },
  {
    key: "aussenseiter",
    name: "Der Außenseiter",
    system:
      "Du bist DER AUSSENSEITER. Du bringst die Perspektive von außen – jemand ohne Branchenwissen, mit gesundem Menschenverstand und ungewöhnlichen Analogien. Antworte auf Deutsch, max. 4 knackige Sätze. Kein Vorwort.",
  },
  {
    key: "umsetzer",
    name: "Der Umsetzer",
    system:
      "Du bist DER UMSETZER. Du denkst in Deadlines, Ressourcen, konkreten nächsten Schritten und Machbarkeit. Antworte auf Deutsch, max. 4 knackige Sätze. Kein Vorwort.",
  },
];

async function callModel(system: string, user: string, key: string): Promise<string> {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gateway ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const advisorAnswers = await Promise.all(
      ADVISORS.map(async (a) => {
        try {
          const answer = await callModel(a.system, question, LOVABLE_API_KEY);
          return { key: a.key, name: a.name, answer };
        } catch (e) {
          return { key: a.key, name: a.name, answer: `⚠️ Fehler: ${(e as Error).message}` };
        }
      })
    );

    const chairmanSystem =
      "Du bist DER VORSITZENDE des Beraterkreises. Du liest alle fünf Berater-Antworten, wägst sie ab und lieferst dem Entscheider EINE klare Empfehlung plus den EINEN konkreten ersten Schritt. Antworte auf Deutsch in genau diesem Markdown-Format:\n\n**Empfehlung:** <1-3 Sätze>\n\n**Erster Schritt:** <ein einziger, sofort umsetzbarer Schritt>";

    const chairmanUser =
      `URSPRÜNGLICHE FRAGE:\n${question}\n\nBERATER-ANTWORTEN:\n\n` +
      advisorAnswers.map((a) => `### ${a.name}\n${a.answer}`).join("\n\n");

    const chairman = await callModel(chairmanSystem, chairmanUser, LOVABLE_API_KEY);

    return new Response(
      JSON.stringify({ advisors: advisorAnswers, chairman }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

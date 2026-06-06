import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

async function fetchTranscript(videoId: string): Promise<{ transcript: string; title: string; description: string }> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en`;
  const html = await fetch(watchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  }).then((r) => r.text());

  // Extract title + description from meta tags
  const titleMatch = html.match(/<meta name="title" content="([^"]+)"/);
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  const title = titleMatch ? decodeHtml(titleMatch[1]) : '';
  const description = descMatch ? decodeHtml(descMatch[1]) : '';

  // Find captionTracks
  const capMatch = html.match(/"captionTracks":(\[.*?\])/);
  let transcript = '';
  if (capMatch) {
    try {
      const tracks = JSON.parse(capMatch[1]);
      // prefer english, fallback first
      const track = tracks.find((t: any) => /en/i.test(t.languageCode)) ?? tracks[0];
      if (track?.baseUrl) {
        const baseUrl = track.baseUrl.replace(/\\u0026/g, '&');
        const xml = await fetch(baseUrl).then((r) => r.text());
        transcript = xml
          .replace(/<text[^>]*>/g, ' ')
          .replace(/<\/text>/g, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        transcript = decodeHtml(transcript);
      }
    } catch (e) {
      console.error('caption parse', e);
    }
  }

  return { transcript, title, description };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');
    const body = await req.json();
    const url = String(body?.url ?? '').trim();
    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Ungültige YouTube-URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transcript, title, description } = await fetchTranscript(videoId);
    const source = [
      title && `TITEL: ${title}`,
      description && `BESCHREIBUNG: ${description}`,
      transcript && `TRANSCRIPT (gekürzt): ${transcript.slice(0, 8000)}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    if (!source) {
      return new Response(JSON.stringify({ error: 'Kein Transcript/Inhalt gefunden' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sys = `Du bist ein Conversion-Copywriter für Social-Media-Testimonial-Thumbnails.
Aus dem gelieferten YouTube-Video extrahierst du DAS EINE knackige Testimonial-Zitat / Ergebnis, das auf ein Thumbnail gehört.
Regeln:
- Sprache des Outputs = Sprache des Videos (meistens Deutsch oder Englisch)
- Maximal 8 Wörter, scroll-stoppend, emotional / Ergebnis-fokussiert
- Keine Anführungszeichen, kein Punkt am Ende
- Wenn konkrete Zahl/Resultat vorkommt (Umsatz, %, Tage), nimm die
- Liefere NUR das Zitat als reinen Text, ohne Erklärung`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: source },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI-Gateway: ${aiRes.status} ${txt}`);
    }
    const aiJson = await aiRes.json();
    const quote = String(aiJson?.choices?.[0]?.message?.content ?? '')
      .trim()
      .replace(/^["'„"«»]+|["'""«»]+$/g, '')
      .replace(/\.$/, '');

    return new Response(
      JSON.stringify({ quote, videoTitle: title, hasTranscript: transcript.length > 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('extract-testimonial-quote', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Fehler' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

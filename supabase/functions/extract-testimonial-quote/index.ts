import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const YT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Cookie: 'CONSENT=YES+cb; SOCS=CAI',
};

function extractVideoId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
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
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function xmlToText(xml: string): string {
  return decodeHtml(
    xml
      .replace(/<text[^>]*>/g, ' ')
      .replace(/<\/text>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

async function fetchTimedTextDirect(videoId: string, lang: string): Promise<string> {
  const variants = [
    `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}`,
    `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&kind=asr`,
    `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=srv3`,
  ];
  for (const u of variants) {
    try {
      const r = await fetch(u, { headers: YT_HEADERS });
      if (!r.ok) continue;
      const txt = await r.text();
      if (txt && txt.trim().length > 20) {
        const out = xmlToText(txt);
        if (out.length > 20) return out;
      }
    } catch (_) {
      /* next */
    }
  }
  return '';
}

async function fetchFromCaptionTracks(html: string): Promise<string> {
  const capMatch = html.match(/"captionTracks":(\[[^\]]+\])/);
  if (!capMatch) return '';
  try {
    const tracks = JSON.parse(capMatch[1]);
    const priority = (t: any) => {
      const lc = String(t?.languageCode || '');
      if (/^de/i.test(lc)) return 0;
      if (/^en/i.test(lc)) return 1;
      return 2;
    };
    tracks.sort((a: any, b: any) => priority(a) - priority(b));
    for (const track of tracks) {
      if (!track?.baseUrl) continue;
      const baseUrl = String(track.baseUrl).replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      try {
        const xml = await fetch(baseUrl, { headers: YT_HEADERS }).then((r) => r.text());
        const out = xmlToText(xml);
        if (out.length > 20) return out;
      } catch (_) {
        /* next */
      }
    }
  } catch (e) {
    console.error('caption parse', e);
  }
  return '';
}

async function fetchOEmbed(videoId: string): Promise<{ title: string; author: string }> {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!r.ok) return { title: '', author: '' };
    const j = await r.json();
    return { title: String(j?.title ?? ''), author: String(j?.author_name ?? '') };
  } catch {
    return { title: '', author: '' };
  }
}

async function fetchVideoData(videoId: string) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=de&persist_hl=1`;
  let html = '';
  try {
    html = await fetch(watchUrl, { headers: YT_HEADERS }).then((r) => r.text());
  } catch (e) {
    console.error('watch fetch', e);
  }

  const titleMatch = html.match(/<meta name="title" content="([^"]+)"/);
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  let title = titleMatch ? decodeHtml(titleMatch[1]) : '';
  let description = descMatch ? decodeHtml(descMatch[1]) : '';

  // Fallback to oEmbed for title
  if (!title) {
    const oe = await fetchOEmbed(videoId);
    title = oe.title;
  }

  // Try multiple transcript sources
  let transcript = '';
  if (html) transcript = await fetchFromCaptionTracks(html);
  if (!transcript) transcript = await fetchTimedTextDirect(videoId, 'de');
  if (!transcript) transcript = await fetchTimedTextDirect(videoId, 'en');
  if (!transcript) transcript = await fetchTimedTextDirect(videoId, 'de-DE');
  if (!transcript) transcript = await fetchTimedTextDirect(videoId, 'en-US');

  console.log('video data', {
    videoId,
    titleLen: title.length,
    descLen: description.length,
    transcriptLen: transcript.length,
  });

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

    const { transcript, title, description } = await fetchVideoData(videoId);

    const hasContent = transcript.length > 0 || description.length > 30 || title.length > 0;
    if (!hasContent) {
      return new Response(
        JSON.stringify({
          error:
            'Video-Inhalt nicht abrufbar (privat, altersbeschränkt oder ohne Untertitel/Beschreibung).',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const source = [
      title && `TITEL: ${title}`,
      description && `BESCHREIBUNG: ${description}`,
      transcript && `TRANSCRIPT (gekürzt): ${transcript.slice(0, 12000)}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const sys = `Du bist ein Conversion-Copywriter für Social-Media-Testimonial-Thumbnails.
Der Nutzer liefert dir bereits den extrahierten Inhalt eines öffentlichen YouTube-Videos (Titel, Beschreibung und/oder Transcript) als reinen Text.
Du musst NICHT auf das Internet zugreifen — der Inhalt ist im Prompt vorhanden.

Deine Aufgabe: Extrahiere DAS EINE knackige Testimonial-Zitat / Ergebnis, das auf ein Thumbnail gehört.

Regeln:
- Antworte AUSSCHLIESSLICH mit dem Zitat selbst — KEINE Entschuldigungen, KEIN "ich kann nicht", KEINE Disclaimer.
- Sprache = Sprache des Inhalts (i.d.R. Deutsch oder Englisch).
- Maximal 8 Wörter, scroll-stoppend, emotional oder ergebnis-fokussiert.
- Keine Anführungszeichen, kein Punkt am Ende.
- Wenn eine konkrete Zahl/Resultat vorkommt (Umsatz, %, Tage, Kunden), bevorzuge die.
- Wenn nur Titel/Beschreibung vorhanden ist, leite aus diesen ab — niemals verweigern.
- Antworte NUR mit dem reinen Zitat-Text, sonst nichts.`;

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
          {
            role: 'user',
            content: `Hier ist der bereits extrahierte Inhalt eines öffentlichen YouTube-Videos. Liefere das beste Thumbnail-Zitat:\n\n${source}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI-Gateway ${aiRes.status}: ${txt}`);
    }
    const aiJson = await aiRes.json();
    let quote = String(aiJson?.choices?.[0]?.message?.content ?? '')
      .trim()
      .replace(/^["'„"«»]+|["'""«»]+$/g, '')
      .replace(/\.$/, '')
      .trim();

    // Guard against refusal patterns
    if (/sorry|kann (ich|leider)|cannot|can'?t|unable|keinen zugriff|no access/i.test(quote)) {
      quote = '';
    }

    if (!quote) {
      return new Response(
        JSON.stringify({
          error: 'Konnte keine prägnante Quintessenz extrahieren. Mehr Kontext im Video nötig.',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        quote,
        videoTitle: title,
        hasTranscript: transcript.length > 0,
        usedSources: {
          transcript: transcript.length > 0,
          description: description.length > 0,
          title: title.length > 0,
        },
      }),
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

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Users, Crown } from "lucide-react";
import { toast } from "sonner";

type Advisor = { key: string; name: string; answer: string };
type Turn = {
  id: string;
  question: string;
  advisors?: Advisor[];
  chairman?: string;
  loading?: boolean;
};

const ADVISOR_ICONS: Record<string, string> = {
  querdenker: "🔀",
  grundsatz: "🧭",
  expansion: "🚀",
  aussenseiter: "👁️",
  umsetzer: "🛠️",
};

export default function Beraterkreis() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  useEffect(() => {
    taRef.current?.focus();
  }, [busy]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    const id = crypto.randomUUID();
    setTurns((t) => [...t, { id, question: q, loading: true }]);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("advisor-council", {
        body: { question: q },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTurns((t) =>
        t.map((x) =>
          x.id === id
            ? { ...x, loading: false, advisors: data.advisors, chairman: data.chairman }
            : x
        )
      );
    } catch (e) {
      const msg = (e as Error).message ?? "Fehler";
      toast.error(msg);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, loading: false, chairman: `⚠️ ${msg}` } : x)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Beraterkreis</h1>
            <p className="text-xs text-muted-foreground">5 KI-Berater · 1 Vorsitzender · 1 klare Empfehlung</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
          {turns.length === 0 && (
            <div className="text-center text-muted-foreground py-16">
              <p className="text-lg">Stelle deine Frage an den Beraterkreis.</p>
              <p className="text-sm mt-2">Querdenker · Grundsatzdenker · Expansionsbefürworter · Außenseiter · Umsetzer</p>
            </div>
          )}

          {turns.map((t) => (
            <div key={t.id} className="space-y-4">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 whitespace-pre-wrap">
                  {t.question}
                </div>
              </div>

              {t.loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Der Beraterkreis tagt…
                </div>
              )}

              {t.advisors && (
                <div className="grid gap-3 md:grid-cols-2">
                  {t.advisors.map((a) => (
                    <Card key={a.key} className="p-4 bg-card/60 backdrop-blur border-border/60">
                      <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                        <span className="text-lg">{ADVISOR_ICONS[a.key] ?? "•"}</span>
                        {a.name}
                      </div>
                      <div className="text-sm text-muted-foreground prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{a.answer}</ReactMarkdown>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {t.chairman && (
                <Card className="p-5 bg-primary/5 border-primary/40 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.4)]">
                  <div className="flex items-center gap-2 mb-2 font-semibold text-primary">
                    <Crown className="w-4 h-4" />
                    Der Vorsitzende
                  </div>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{t.chairman}</ReactMarkdown>
                  </div>
                </Card>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="border-t border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex gap-2 items-end">
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Deine Frage an den Beraterkreis…"
            rows={2}
            className="resize-none"
            disabled={busy}
          />
          <Button onClick={send} disabled={busy || !input.trim()} size="lg">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </footer>
    </div>
  );
}

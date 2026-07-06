import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Aperture } from "lucide-react";

interface Stage {
  id: number;
  title: string;
  color: string;
  description: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  labelAlign: "left" | "right";
}

const stages: Stage[] = [
  {
    id: 1,
    title: "Wow",
    color: "#00D4AA",
    description: "ChatGPT answers everything. Elaborated, credible, coherent. A superhuman chatbot.",
    x: 12,
    y: 90,
    labelX: 24,
    labelY: 82,
    labelAlign: "left",
  },
  {
    id: 2,
    title: "Wait a minute",
    color: "#F59E0B",
    description: "An LLM is just a statistical language predictor.\nIt produces plausible answers, not understanding.",
    x: 30,
    y: 52,
    labelX: 16,
    labelY: 68,
    labelAlign: "left",
  },
  {
    id: 3,
    title: "Damn",
    color: "#EF4444",
    description: "It occasionally stitches wrong snippets together\nand confidently generates incorrect answers.",
    x: 50,
    y: 18,
    labelX: 60,
    labelY: 14,
    labelAlign: "left",
  },
  {
    id: 4,
    title: "Got it",
    color: "#FBBF24",
    description: "Great when there is no single 'right' answer.\nUnreliable when perfection is required.",
    x: 72,
    y: 40,
    labelX: 68,
    labelY: 28,
    labelAlign: "right",
  },
  {
    id: 5,
    title: "Ready now",
    color: "#00BCFF",
    description: "The real value is clear. Productivity boost —\nwhile recognizing when it gets things completely wrong.",
    x: 90,
    y: 80,
    labelX: 82,
    labelY: 88,
    labelAlign: "right",
  },
];

const WIDTH = 1600;
const HEIGHT = 900;
const PAD = { left: 120, right: 80, top: 140, bottom: 140 };
const GW = WIDTH - PAD.left - PAD.right;
const GH = HEIGHT - PAD.top - PAD.bottom;

function cx(pct: number) {
  return PAD.left + (pct / 100) * GW;
}
function cy(pct: number) {
  return PAD.top + GH - (pct / 100) * GH;
}

export default function ConfidenceCurve() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [downloading, setDownloading] = useState(false);

  const pathD = stages
    .map((s, i) => {
      const x = cx(s.x);
      const y = cy(s.y);
      if (i === 0) return `M ${x} ${y}`;
      const prev = stages[i - 1];
      const px = cx(prev.x);
      const py = cy(prev.y);
      const cp1x = px + (x - px) * 0.5;
      const cp1y = py;
      const cp2x = px + (x - px) * 0.5;
      const cp2y = y;
      return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
    })
    .join(" ");

  const handleDownload = async () => {
    if (!svgRef.current) return;
    setDownloading(true);
    try {
      const svg = svgRef.current;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      const canvas = document.createElement("canvas");
      canvas.width = WIDTH * 2;
      canvas.height = HEIGHT * 2;
      const ctx = canvas.getContext("2d")!;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.fillStyle = "#0B1120";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "apex-chatgpt-confidence-curve.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        setDownloading(false);
      }, "image/png");
    } catch {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient flex flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-[1600px] flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl glass-button-primary flex items-center justify-center">
            <Aperture className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              APEX <span className="text-[hsl(var(--primary))]">Intelligence</span>
            </h1>
            <p className="text-sm text-muted-foreground">ChatGPT Confidence Curve</p>
          </div>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="glass-button-primary text-white border-0 rounded-full px-5 py-2 h-auto gap-2"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Exporting…" : "Download PNG"}
        </Button>
      </div>

      <div className="w-full max-w-[1600px] rounded-[2rem] glass-elevated p-4 md:p-6 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto rounded-2xl"
          xmlns="http://www.w3.org/2000/svg"
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
        >
          <defs>
            <linearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0B1120" />
              <stop offset="50%" stopColor="#111A2E" />
              <stop offset="100%" stopColor="#0B1120" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00D4AA" />
              <stop offset="25%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="75%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#00BCFF" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="rgba(0,0,0,0.25)" />
            </filter>
          </defs>

          <rect width={WIDTH} height={HEIGHT} fill="url(#bgGradient)" rx="24" />

          {/* Decorative grid */}
          <g opacity="0.06">
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={cx(i * 10)}
                y1={cy(0)}
                x2={cx(i * 10)}
                y2={cy(100)}
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1={cx(0)}
                y1={cy(i * 10)}
                x2={cx(100)}
                y2={cy(i * 10)}
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Title */}
          <text
            x={WIDTH / 2}
            y={72}
            textAnchor="middle"
            fontSize="42"
            fontWeight="800"
            fill="#F8FAFC"
            letterSpacing="-0.02em"
          >
            The ChatGPT Confidence Curve
          </text>
          <text
            x={WIDTH / 2}
            y={108}
            textAnchor="middle"
            fontSize="18"
            fontWeight="500"
            fill="#94A3B8"
          >
            From hype to mastery — understanding where real value lives
          </text>

          {/* Axes */}
          <line
            x1={cx(0)}
            y1={cy(0)}
            x2={cx(100)}
            y2={cy(0)}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1={cx(0)}
            y1={cy(0)}
            x2={cx(0)}
            y2={cy(100)}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <g key={pct}>
              <text
                x={cx(0) - 18}
                y={cy(pct) + 6}
                textAnchor="end"
                fontSize="14"
                fontWeight="600"
                fill="#CBD5E1"
              >
                {pct}%
              </text>
            </g>
          ))}
          <text
            x={cx(0) - 52}
            y={cy(50) - 4}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="#94A3B8"
            transform={`rotate(-90, ${cx(0) - 52}, ${cy(50)})`}
          >
            Confidence in ChatGPT
          </text>

          {/* X-axis labels */}
          <text
            x={cx(0)}
            y={cy(0) + 46}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill="#F1F5F9"
          >
            No knowledge
          </text>
          <text
            x={cx(0)}
            y={cy(0) + 68}
            textAnchor="middle"
            fontSize="13"
            fontWeight="500"
            fill="#64748B"
          >
            (believe the hype)
          </text>

          <text
            x={cx(50)}
            y={cy(0) + 46}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill="#F1F5F9"
          >
            Knowledge of ChatGPT
          </text>

          <text
            x={cx(100)}
            y={cy(0) + 46}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill="#F1F5F9"
          >
            Enough knowledge
          </text>
          <text
            x={cx(100)}
            y={cy(0) + 68}
            textAnchor="middle"
            fontSize="13"
            fontWeight="500"
            fill="#64748B"
          >
            (understand the reality)
          </text>

          {/* Direction arrows */}
          <path
            d={`M ${cx(12)} ${cy(0) + 90} L ${cx(38)} ${cy(0) + 90}`}
            stroke="rgba(0,188,255,0.5)"
            strokeWidth="2"
            markerEnd="url(#arrowCyan)"
          />
          <path
            d={`M ${cx(62)} ${cy(0) + 90} L ${cx(88)} ${cy(0) + 90}`}
            stroke="rgba(0,188,255,0.5)"
            strokeWidth="2"
            markerEnd="url(#arrowCyan)"
          />
          <defs>
            <marker id="arrowCyan" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="rgba(0,188,255,0.7)" />
            </marker>
          </defs>

          {/* Confidence curve */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Dotted reference line */}
          <line
            x1={cx(0)}
            y1={cy(50)}
            x2={cx(100)}
            y2={cy(50)}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeDasharray="6 6"
          />

          {/* Stage markers and labels */}
          {stages.map((s) => {
            const x = cx(s.x);
            const y = cy(s.y);
            const lx = cx(s.labelX);
            const ly = cy(s.labelY);
            const textAnchor = s.labelAlign;
            const boxWidth = 320;
            const boxX = textAnchor === "left" ? lx + 14 : lx - 14 - boxWidth;
            return (
              <g key={s.id}>
                {/* Marker circle */}
                <circle cx={x} cy={y} r="14" fill={s.color} filter="url(#glow)" />
                <circle cx={x} cy={y} r="20" fill="none" stroke={s.color} strokeWidth="2" opacity="0.35" />
                <text
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="800"
                  fill="#0B1120"
                >
                  {s.id}
                </text>

                {/* Leader line */}
                <line
                  x1={x}
                  y1={y}
                  x2={textAnchor === "left" ? boxX - 6 : boxX + boxWidth + 6}
                  y2={ly}
                  stroke={s.color}
                  strokeWidth="2"
                  opacity="0.6"
                  strokeLinecap="round"
                />

                {/* Label card */}
                <g filter="url(#softShadow)">
                  <rect
                    x={boxX}
                    y={ly - 34}
                    width={boxWidth}
                    height={74}
                    rx="14"
                    fill="rgba(255,255,255,0.08)"
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="1"
                  />
                  <rect
                    x={boxX}
                    y={ly - 34}
                    width={4}
                    height={74}
                    rx="2"
                    fill={s.color}
                  />
                </g>
                <text
                  x={boxX + 18}
                  y={ly - 12}
                  textAnchor="start"
                  fontSize="17"
                  fontWeight="800"
                  fill={s.color}
                >
                  {s.title}
                </text>
                <text
                  x={boxX + 18}
                  y={ly + 12}
                  textAnchor="start"
                  fontSize="13"
                  fontWeight="500"
                  fill="#E2E8F0"
                >
                  {s.description}
                </text>
              </g>
            );
          })}

          {/* APEX watermark */}
          <text
            x={WIDTH - 40}
            y={HEIGHT - 30}
            textAnchor="end"
            fontSize="12"
            fontWeight="700"
            fill="rgba(255,255,255,0.25)"
            letterSpacing="0.1em"
          >
            APEX AI INTELLIGENCE
          </text>
        </svg>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Exportiert als 3200×1800 PNG — bereit für Thumbnails, Präsentationen oder Social Media.
      </p>
    </div>
  );
}

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Stage {
  id: number;
  title: string;
  titleColor: string;
  body: string;
  x: number; // % along x (curve point)
  y: number; // % along y
  // Label box (top-left corner) in % of chart area
  labelX: number;
  labelY: number;
  labelW: number;
}

const stages: Stage[] = [
  {
    id: 1,
    title: "Wow.",
    titleColor: "#1FA34A",
    body: "ChatGPT is able to answer all my questions. It quickly generates very elaborated answers that are credible and coherent. Finally a chatbot that behaves like a super human.",
    x: 4,
    y: 96,
    labelX: 12,
    labelY: 92,
    labelW: 34,
  },
  {
    id: 2,
    title: "Wait a minute.",
    titleColor: "#E8912B",
    body: 'ChatGPT is powered by a Large Language Model (LLM) which is ultimately a statistical tool used to predict language without understanding it and produce "statistically plausible" answers.',
    x: 22,
    y: 55,
    labelX: 30,
    labelY: 72,
    labelW: 34,
  },
  {
    id: 3,
    title: "Damn.",
    titleColor: "#D93A2B",
    body: "This means that ChatGPT will occasionally generate incorrect answers by unintentionally stitching wrong snippet of information together.",
    x: 44,
    y: 18,
    labelX: 6,
    labelY: 32,
    labelW: 34,
  },
  {
    id: 4,
    title: "Got it.",
    titleColor: "#E8912B",
    body: 'ChatGPT is great when there isn\'t a precise "right answer". But it cannot be trusted when the answer must be "perfect" to be reliably useful.',
    x: 70,
    y: 30,
    labelX: 48,
    labelY: 22,
    labelW: 34,
  },
  {
    id: 5,
    title: "Ready now.",
    titleColor: "#1FA34A",
    body: "Now I understand where the real value of ChatGPT resides. It can definitely give my productivity a boost, but it's important to recognize when it gets things completely wrong.",
    x: 92,
    y: 78,
    labelX: 62,
    labelY: 96,
    labelW: 34,
  },
];

const WIDTH = 1600;
const HEIGHT = 1000;
const PAD = { left: 160, right: 80, top: 60, bottom: 160 };
const GW = WIDTH - PAD.left - PAD.right;
const GH = HEIGHT - PAD.top - PAD.bottom;

function cx(pct: number) {
  return PAD.left + (pct / 100) * GW;
}
function cy(pct: number) {
  return PAD.top + GH - (pct / 100) * GH;
}

// Wrap text to N chars roughly, splitting on spaces.
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export default function ConfidenceCurve() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Curve: smooth pass through the 5 points using cubic beziers
  const pts = stages.map((s) => ({ x: cx(s.x), y: cy(s.y) }));
  let pathD = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = p1.x - p0.x;
    // Ease horizontal so curve is smooth
    const c1x = p0.x + dx * 0.45;
    const c1y = p0.y;
    const c2x = p0.x + dx * 0.55;
    const c2y = p1.y;
    pathD += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
  }

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
          ctx.fillStyle = "#FFFFFF";
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

  const originX = cx(0);
  const originY = cy(0);
  const topY = cy(100);
  const rightX = cx(100);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-[1600px] flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
            The ChatGPT Confidence Curve
          </h1>
          <p className="text-sm text-neutral-500">APEX · Light Edition</p>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="rounded-full px-5 py-2 h-auto gap-2 bg-[hsl(var(--primary))] text-white hover:opacity-90"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Exporting…" : "Download PNG"}
        </Button>
      </div>

      <div className="w-full max-w-[1600px] rounded-2xl border border-neutral-200 bg-white p-4 md:p-6 shadow-sm overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
        >
          <defs>
            <marker id="arrowBlack" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L10,4 z" fill="#111827" />
            </marker>
            <marker id="arrowAxis" markerWidth="14" markerHeight="14" refX="12" refY="5" orient="auto">
              <path d="M0,0 L0,10 L12,5 z" fill="#111827" />
            </marker>
            <marker id="arrowBlue" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L10,4 z" fill="#2E7BE0" />
            </marker>
          </defs>

          {/* White background */}
          <rect width={WIDTH} height={HEIGHT} fill="#FFFFFF" />

          {/* HFS badge */}
          <g>
            <circle cx={WIDTH - 90} cy={70} r="36" fill="#F26A3F" />
            <text
              x={WIDTH - 90}
              y={78}
              textAnchor="middle"
              fontSize="22"
              fontWeight="800"
              fill="#FFFFFF"
              letterSpacing="0.05em"
            >
              HFS
            </text>
          </g>

          {/* Y-axis */}
          <line
            x1={originX}
            y1={originY}
            x2={originX}
            y2={topY - 20}
            stroke="#111827"
            strokeWidth="2.5"
            markerEnd="url(#arrowAxis)"
          />
          {/* X-axis */}
          <line
            x1={originX}
            y1={originY}
            x2={rightX + 20}
            y2={originY}
            stroke="#111827"
            strokeWidth="2.5"
            markerEnd="url(#arrowAxis)"
          />

          {/* Y-axis labels */}
          <text x={originX - 20} y={topY + 6} textAnchor="end" fontSize="24" fontWeight="700" fill="#111827">
            100%
          </text>
          <text x={originX - 20} y={originY + 6} textAnchor="end" fontSize="24" fontWeight="700" fill="#111827">
            0%
          </text>

          {/* Y-axis title */}
          <g transform={`translate(${originX - 96}, ${(topY + originY) / 2}) rotate(-90)`}>
            <text textAnchor="middle" fontSize="24" fontWeight="600" fill="#2E7BE0">
              <tspan x="0" dy="0">Confidence level</tspan>
              <tspan x="0" dy="30">in ChatGPT</tspan>
            </text>
          </g>
          {/* small up arrow near Y-axis title */}
          <path
            d={`M ${originX - 50} ${topY + 40} L ${originX - 50} ${topY + 10}`}
            stroke="#2E7BE0"
            strokeWidth="2.5"
            markerEnd="url(#arrowBlue)"
          />

          {/* X-axis title */}
          <text
            x={(originX + rightX) / 2}
            y={originY + 110}
            textAnchor="middle"
            fontSize="28"
            fontWeight="600"
            fill="#111827"
          >
            Knowledge of
          </text>
          <text
            x={(originX + rightX) / 2}
            y={originY + 144}
            textAnchor="middle"
            fontSize="28"
            fontWeight="600"
            fill="#111827"
          >
            ChatGPT
          </text>

          {/* No knowledge / Enough knowledge */}
          <text x={originX} y={originY + 60} textAnchor="middle" fontSize="20" fontWeight="700" fill="#111827">
            No knowledge
          </text>
          <text x={originX} y={originY + 84} textAnchor="middle" fontSize="16" fill="#4B5563">
            (believe the hype)
          </text>
          <path
            d={`M ${originX - 60} ${originY + 100} L ${originX + 60} ${originY + 100}`}
            stroke="#2E7BE0"
            strokeWidth="2.5"
            markerEnd="url(#arrowBlue)"
          />

          <text x={rightX} y={originY + 60} textAnchor="middle" fontSize="20" fontWeight="700" fill="#111827">
            Enough knowledge
          </text>
          <text x={rightX} y={originY + 84} textAnchor="middle" fontSize="16" fill="#4B5563">
            (understand the reality)
          </text>
          <path
            d={`M ${rightX - 60} ${originY + 100} L ${rightX + 60} ${originY + 100}`}
            stroke="#2E7BE0"
            strokeWidth="2.5"
            markerEnd="url(#arrowBlue)"
          />

          {/* Horizontal dotted reference at stage 5 level */}
          <line
            x1={originX}
            y1={cy(78)}
            x2={rightX}
            y2={cy(78)}
            stroke="#111827"
            strokeWidth="1.5"
            strokeDasharray="3 6"
            opacity="0.55"
          />

          {/* The red confidence curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#D93A2B"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Stage markers + arrows + text labels */}
          {stages.map((s) => {
            const mx = cx(s.x);
            const my = cy(s.y);
            const lx = cx(s.labelX);
            const ly = cy(s.labelY);
            const lines = wrap(s.body, 42);
            const titleFontSize = 20;
            const bodyFontSize = 18;

            // Arrow from label toward the marker
            // Start near label edge, end just outside the marker circle.
            const dx = mx - lx;
            const dy = my - ly;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / dist;
            const uy = dy / dist;
            const startX = lx + ux * 20;
            const startY = ly + uy * 20;
            const endX = mx - ux * 28;
            const endY = my - uy * 28;

            return (
              <g key={s.id}>
                {/* Arrow */}
                <path
                  d={`M ${startX} ${startY} L ${endX} ${endY}`}
                  stroke="#111827"
                  strokeWidth="2"
                  markerEnd="url(#arrowBlack)"
                  fill="none"
                />
                {/* Marker circle */}
                <circle cx={mx} cy={my} r="22" fill="#111827" stroke="#FFFFFF" strokeWidth="3" />
                <text
                  x={mx}
                  y={my + 8}
                  textAnchor="middle"
                  fontSize="22"
                  fontWeight="800"
                  fill="#FFFFFF"
                >
                  {s.id}
                </text>

                {/* Label */}
                <text x={lx} y={ly} fontSize={titleFontSize} fontWeight="800" fill={s.titleColor}>
                  {s.title}
                  <tspan fill="#111827" fontWeight="500" fontSize={bodyFontSize}>
                    {" "}
                    {lines[0]}
                  </tspan>
                </text>
                {lines.slice(1).map((line, i) => (
                  <text
                    key={i}
                    x={lx}
                    y={ly + (i + 1) * 24}
                    fontSize={bodyFontSize}
                    fontWeight="500"
                    fill="#111827"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

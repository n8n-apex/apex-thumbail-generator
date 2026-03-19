import { Loader2 } from "lucide-react";

interface ProcessingScreenProps {
  fileName: string;
  progress: number;
  currentStep: string;
  steps: { label: string; done: boolean; active: boolean }[];
}

const ProcessingScreen = ({ fileName, progress, currentStep, steps }: ProcessingScreenProps) => {
  return (
    <div className="flex h-full w-full items-center justify-center mesh-gradient">
      <div className="w-full max-w-sm glass-elevated rounded-3xl p-7 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl glass-item">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <h2 className="text-sm font-bold text-foreground mb-1">Verarbeitung</h2>
        <p className="truncate text-[11px] text-muted-foreground mb-5">{fileName}</p>

        <div className="space-y-2 text-left">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 transition-all ${
                step.done ? "bg-primary shadow-sm shadow-primary/30" : step.active ? "bg-primary animate-pulse shadow-sm shadow-primary/20" : "bg-muted"
              }`} />
              <span className={`text-xs ${step.done || step.active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
              {step.active && (
                <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full glass-item">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              )}
              {step.done && <span className="ml-auto text-[10px] text-primary font-bold">✓</span>}
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10px] text-muted-foreground">{currentStep}</p>
      </div>
    </div>
  );
};

export default ProcessingScreen;

import { Loader2 } from "lucide-react";

interface AnalyzingStateProps {
  fileName: string;
  progress: number;
  currentStep: string;
  steps: { label: string; done: boolean; active: boolean }[];
}

const AnalyzingState = ({ fileName, progress, currentStep, steps }: AnalyzingStateProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center mesh-gradient p-8">
      <div className="w-full max-w-md glass rounded-2xl p-8">
        <div className="mb-8 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <h2 className="text-lg font-bold text-foreground">Analyzing</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">{fileName}</p>
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-3">
              <div
                className={`h-2 w-2 rounded-full transition-colors ${
                  step.done
                    ? "bg-primary"
                    : step.active
                    ? "bg-primary animate-pulse-glow"
                    : "bg-border"
                }`}
              />
              <span
                className={`text-xs ${
                  step.done || step.active ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {step.active && (
                <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              )}
              {step.done && (
                <span className="ml-auto text-xs text-primary font-medium">✓</span>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">{currentStep}</p>
      </div>
    </div>
  );
};

export default AnalyzingState;

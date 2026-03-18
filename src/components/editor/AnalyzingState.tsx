import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface AnalyzingStateProps {
  fileName: string;
  progress: number; // 0-1
  currentStep: string;
  steps: { label: string; done: boolean; active: boolean }[];
}

const AnalyzingState = ({ fileName, progress, currentStep, steps }: AnalyzingStateProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Analyzing</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">{fileName}</p>
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  step.done
                    ? "bg-primary"
                    : step.active
                    ? "bg-primary animate-pulse-glow"
                    : "bg-muted"
                }`}
              />
              <span
                className={`text-xs ${
                  step.done || step.active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {step.active && (
                <div className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              )}
              {step.done && (
                <span className="ml-auto text-xs text-primary">✓</span>
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

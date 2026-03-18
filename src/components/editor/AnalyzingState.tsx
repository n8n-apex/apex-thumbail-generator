import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface AnalyzingStateProps {
  fileName: string;
  onComplete: () => void;
}

const STEPS = [
  { label: "Extracting audio track", duration: 800 },
  { label: "Analyzing audio levels", duration: 1200 },
  { label: "Detecting silence gaps", duration: 1000 },
  { label: "Running Whisper transcription", duration: 1500 },
  { label: "Aligning word timestamps", duration: 600 },
  { label: "Preparing editor", duration: 400 },
];

const AnalyzingState = ({ fileName, onComplete }: AnalyzingStateProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentStep >= STEPS.length) {
      onComplete();
      return;
    }

    const stepDuration = STEPS[currentStep].duration;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setCurrentStep((s) => s + 1);
            setProgress(0);
          }, 200);
          return 100;
        }
        return p + 100 / (stepDuration / 50);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [currentStep, onComplete]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Analyzing</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">{fileName}</p>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  i < currentStep
                    ? "bg-primary"
                    : i === currentStep
                    ? "bg-primary animate-pulse-glow"
                    : "bg-muted"
                }`}
              />
              <span
                className={`text-xs ${
                  i <= currentStep ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {i === currentStep && (
                <div className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              {i < currentStep && (
                <span className="ml-auto text-xs text-primary">✓</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyzingState;

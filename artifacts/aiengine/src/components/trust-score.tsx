import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TrustScoreProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showLabel?: boolean;
}

export function TrustScore({ score, size = "md", className, showLabel = true }: TrustScoreProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  // Determine color based on score
  let colorClass = "text-primary";
  let ringClass = "text-primary";
  
  if (score < 40) {
    colorClass = "text-destructive";
    ringClass = "text-destructive";
  } else if (score < 70) {
    colorClass = "text-warning";
    ringClass = "text-warning";
  } else if (score >= 90) {
    colorClass = "text-success";
    ringClass = "text-success";
  }

  const sizeMap = {
    sm: { wrapper: "w-12 h-12", text: "text-sm", stroke: 2, radius: 20 },
    md: { wrapper: "w-16 h-16", text: "text-lg", stroke: 3, radius: 28 },
    lg: { wrapper: "w-24 h-24", text: "text-2xl", stroke: 4, radius: 40 },
    xl: { wrapper: "w-32 h-32", text: "text-4xl", stroke: 5, radius: 54 },
  };

  const { wrapper, text, stroke, radius } = sizeMap[size];
  const center = radius + stroke;
  const sizeValue = center * 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn("relative flex items-center justify-center", wrapper)}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${sizeValue} ${sizeValue}`}>
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn("transition-all duration-1000 ease-out", ringClass)}
          />
        </svg>
        <div className={cn("absolute inset-0 flex items-center justify-center font-mono-numeric font-bold", colorClass, text)}>
          {Math.round(displayScore)}
        </div>
      </div>
      {showLabel && (
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Trust Score
        </span>
      )}
    </div>
  );
}

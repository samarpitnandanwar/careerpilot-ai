import { cn, scoreColor } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizeConfig = {
  sm: { svg: 64, stroke: 5, fontSize: "text-sm", labelSize: "text-[10px]" },
  md: { svg: 100, stroke: 7, fontSize: "text-xl", labelSize: "text-xs" },
  lg: { svg: 140, stroke: 9, fontSize: "text-3xl", labelSize: "text-sm" },
};

export function ScoreRing({
  score,
  size = "md",
  label,
  className,
}: ScoreRingProps) {
  const config = sizeConfig[size];
  const radius = (config.svg - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative">
        <svg
          width={config.svg}
          height={config.svg}
          className="-rotate-90"
        >
          <circle
            cx={config.svg / 2}
            cy={config.svg / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={config.stroke}
          />
          <circle
            cx={config.svg / 2}
            cy={config.svg / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all duration-700 ease-out", color)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", config.fontSize, color)}>
            {score}
          </span>
        </div>
      </div>
      {label && (
        <span className={cn("font-medium text-slate-600", config.labelSize)}>
          {label}
        </span>
      )}
    </div>
  );
}

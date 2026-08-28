import { cn } from "@/lib/utils";
import { APPLICATION_STATUS_COLORS, type ApplicationStatus } from "@/types";

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

const statusIcons: Record<ApplicationStatus, string> = {
  saved: "○",
  applied: "●",
  screening: "◎",
  assessment: "◐",
  interview: "◉",
  offer: "★",
  accepted: "✓",
  rejected: "✗",
  withdrawn: "—",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        APPLICATION_STATUS_COLORS[status],
        className,
      )}
    >
      <span>{statusIcons[status]}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { CARD_STYLE, C_GREEN, C_RED, C_YELLOW, C_MID, C_DIM } from "@/lib/analysisConstants";

export type SignalType = "bullish" | "bearish" | "neutral" | "warning" | "unavailable";

interface MetricCardProps {
  label: string;
  sublabel: string;
  value: string;
  signal: SignalType;
  signalText: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  loading?: boolean;
}

export function MetricCard({
  label,
  sublabel,
  value,
  signal,
  signalText,
  subtitle,
  icon,
  badge,
  loading = false,
}: MetricCardProps) {
  const signalColor =
    signal === "bullish"
      ? C_GREEN
      : signal === "bearish"
        ? C_RED
        : signal === "warning"
          ? C_YELLOW
          : signal === "unavailable"
            ? C_DIM
            : C_MID;

  const signalBg =
    signal === "bullish"
      ? "oklch(0.723 0.185 150 / 0.10)"
      : signal === "bearish"
        ? "oklch(0.637 0.220 25 / 0.10)"
        : signal === "warning"
          ? "oklch(0.820 0.160 90 / 0.10)"
          : "oklch(0.155 0.020 240)";

  return (
    <div className="rounded-xl p-4 flex flex-col gap-2 min-w-0" style={CARD_STYLE}>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.785 0.135 200 / 0.12)", color: "oklch(0.785 0.135 200)" }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: "oklch(0.910 0.015 240)" }}>
              {label}
            </div>
            <div className="text-[10px] font-mono truncate" style={{ color: C_DIM }}>
              {sublabel}
            </div>
          </div>
        </div>
        {badge && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: "oklch(0.785 0.135 200 / 0.10)", color: "oklch(0.785 0.135 200)" }}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 min-w-0">
        {loading ? (
          <Skeleton className="h-7 w-28 rounded" style={{ background: "oklch(1 0 0 / 0.06)" }} />
        ) : (
          <div
            className="font-mono font-bold text-xl truncate min-w-0"
            title={value}
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            {value}
          </div>
        )}
        {!loading && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
            style={{ background: signalBg, color: signalColor }}
          >
            {signalText}
          </span>
        )}
      </div>

      {subtitle && !loading && (
        <div className="text-[10px] font-mono truncate" style={{ color: C_DIM }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

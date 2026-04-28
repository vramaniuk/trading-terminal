import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  BarChart2,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MacroAssetState,
  OpenInterestState,
} from "../hooks/useAnalysisData";
import { useAnalysisData } from "../hooks/useAnalysisData";
import { DerivativesSection, OnChainSection, VolumeSection } from "./AnalysisMetricSections";
import { SectorPerformance } from "./SectorPerformance";

// ---- Stablecoin exclusion set ----
const STABLECOINS = new Set([
  "USDT",
  "USDC",
  "TUSD",
  "PAXUSD",
  "DAI",
  "FRAX",
  "LUSD",
  "USDP",
  "USDD",
  "GUSD",
  "GBPT",
  "EURS",
  "BUSD",
  "USDM",
  "FDUSD",
  "UST",
  "USTC",
  "SUSD",
  "HUSD",
  "XAUT",
  "PAXG",
  "USDS",
  "CRVUSD",
  "PYUSD",
  "USDE",
  "FXUSD",
  "USDX",
  "EURC",
  "USDK",
  "USDH",
  "EURS",
  "AEUR",
  "XIDR",
  "IDRT",
]);

// ---- Shared formatters ----
function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtUsdCompact(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtUsd(n);
}

function fmtMarketCap(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString("en-US")}`;
}

function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

function fmtOIUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

function fmtRate(rate: number): string {
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${(rate * 100).toFixed(4)}%`;
}

function calcChange(price: number, prevClose: number): number {
  if (!prevClose) return 0;
  return ((price - prevClose) / prevClose) * 100;
}

function fmtMoverPrice(n: number): string {
  if (n >= 10_000)
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1)
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

// ---- Countdown hook ----
function useCountdown(targetMs: number): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function update() {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setLabel("settling...");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setLabel(`${h}h ${m}m ${s}s`);
      else if (m > 0) setLabel(`${m}m ${s}s`);
      else setLabel(`${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return label;
}

function useFngCountdown(seconds: number): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!seconds) return;
    let remaining = seconds;
    function update() {
      if (remaining <= 0) {
        setLabel("updating...");
        return;
      }
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      setLabel(m > 0 ? `${m}m ${s}s` : `${s}s`);
      remaining -= 1;
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return label;
}

// ---- Fear & Greed color ----
function fngColor(value: number): string {
  if (value <= 25) return "oklch(0.637 0.220 25)";
  if (value <= 45) return "oklch(0.720 0.185 55)";
  if (value <= 55) return "oklch(0.820 0.160 90)";
  if (value <= 75) return "oklch(0.780 0.185 145)";
  return "oklch(0.723 0.185 150)";
}

// ---- Section header ----
function SectionHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex flex-col gap-0.5">
        <h2
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "oklch(0.612 0.020 240)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <span
            className="text-[10px]"
            style={{ color: "oklch(0.450 0.015 240)" }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {badge && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{
            background: "oklch(0.785 0.135 200 / 0.10)",
            color: "oklch(0.785 0.135 200)",
            border: "1px solid oklch(0.785 0.135 200 / 0.20)",
          }}
        >
          {badge}
        </span>
      )}
      <div
        className="flex-1 h-px"
        style={{ background: "oklch(1 0 0 / 0.07)" }}
      />
    </div>
  );
}

// ---- SVG Arc Gauge ----
function FearGreedGauge({
  value,
  loading,
}: { value: number; loading: boolean }) {
  const cx = 65;
  const cy = 70;
  const r = 55;
  const GAP_DEG = 2.5;
  const segSpan = (180 - 4 * GAP_DEG) / 5;
  const SEGMENTS = [
    { color: "#EA3943" },
    { color: "#EA8C00" },
    { color: "#F3D42F" },
    { color: "#93D900" },
    { color: "#16C784" },
  ];
  function polarToXY(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }
  function arcPath(startAngle: number, endAngle: number) {
    const p1 = polarToXY(startAngle);
    const p2 = polarToXY(endAngle);
    return `M ${p1.x.toFixed(4)} ${p1.y.toFixed(4)} A ${r} ${r} 0 0 0 ${p2.x.toFixed(4)} ${p2.y.toFixed(4)}`;
  }
  const needleAngle = 180 - (value / 100) * 180;
  const needlePt = polarToXY(needleAngle);
  return (
    <div
      style={{
        position: "relative",
        width: 130,
        height: 75,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      <svg width="130" height="75" viewBox="0 0 130 75" aria-hidden="true">
        {SEGMENTS.map((seg, i) => {
          const startAngle = 180 - i * (segSpan + GAP_DEG);
          const endAngle = startAngle - segSpan;
          return (
            <path
              key={seg.color}
              d={arcPath(startAngle, endAngle)}
              stroke={seg.color}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
        {!loading && (
          <>
            <circle
              cx={needlePt.x}
              cy={needlePt.y}
              r="6"
              fill="none"
              stroke="white"
              strokeWidth="2"
              style={{ transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
            <circle
              cx={needlePt.x}
              cy={needlePt.y}
              r="5"
              fill="black"
              style={{ transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          </>
        )}
      </svg>
    </div>
  );
}

// ---- Range bar ----
function RangeBar({
  price,
  low52w,
  high52w,
}: { price: number; low52w: number; high52w: number }) {
  const range = high52w - low52w;
  const pct = range > 0 ? ((price - low52w) / range) * 100 : 50;
  const clampedPct = Math.min(100, Math.max(0, pct));
  return (
    <div className="mt-3">
      <div
        className="flex justify-between text-[10px] mb-1"
        style={{ color: "oklch(0.450 0.015 240)" }}
      >
        <span>{low52w > 0 ? fmtNum(low52w) : "\u2014"}</span>
        <span
          className="text-[9px] uppercase tracking-wider"
          style={{ color: "oklch(0.500 0.015 240)" }}
        >
          52W Range
        </span>
        <span>{high52w > 0 ? fmtNum(high52w) : "\u2014"}</span>
      </div>
      <div
        className="relative h-1 rounded-full"
        style={{ background: "oklch(1 0 0 / 0.08)" }}
      >
        <div
          className="absolute h-full rounded-full"
          style={{
            width: `${clampedPct}%`,
            background:
              "linear-gradient(90deg, oklch(0.637 0.220 25 / 0.6), oklch(0.785 0.135 200 / 0.7))",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2"
          style={{
            left: `calc(${clampedPct}% - 5px)`,
            background: "oklch(0.910 0.015 240)",
            borderColor: "oklch(0.785 0.135 200)",
            boxShadow: "0 0 6px oklch(0.785 0.135 200 / 0.6)",
          }}
        />
      </div>
    </div>
  );
}

// ---- Macro card ----
function MacroCard({
  label,
  ticker,
  data,
  prefix = "$",
  suffix = "",
  decimals = 2,
  icon,
  show52wRange = true,
}: {
  label: string;
  ticker: string;
  data: MacroAssetState;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: React.ReactNode;
  show52wRange?: boolean;
}) {
  const change = calcChange(data.price, data.prevClose);
  const isPositive = change >= 0;
  const color = isPositive ? "oklch(0.723 0.185 150)" : "oklch(0.637 0.220 25)";
  return (
    <div
      className="rounded-xl p-3 sm:p-4 flex flex-col gap-1 min-w-0 overflow-hidden"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              color: "oklch(0.785 0.135 200)",
            }}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-xs font-semibold truncate"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {label}
            </div>
            <div
              className="text-[10px] font-mono truncate"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {ticker}
            </div>
          </div>
        </div>
        {data.loading ? (
          <Skeleton
            className="h-4 w-12 sm:w-16 rounded shrink-0"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          />
        ) : data.error ? (
          <span
            className="text-xs shrink-0"
            style={{ color: "oklch(0.450 0.015 240)" }}
          >
            –
          </span>
        ) : (
          <div
            className="flex items-center gap-1 text-xs font-semibold shrink-0"
            style={{ color }}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      {data.loading ? (
        <Skeleton
          className="h-7 w-24 sm:w-28 rounded mt-1"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : data.error ? (
        <span
          className="text-sm sm:text-base font-mono font-bold truncate"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          unavailable
        </span>
      ) : (
        <div
          className="font-mono font-bold text-base sm:text-xl mt-0.5 truncate min-w-0"
          style={{ color: "oklch(0.910 0.015 240)" }}
        >
          {prefix}
          {fmtNum(data.price, decimals)}
          {suffix}
        </div>
      )}
      {show52wRange && !data.loading && !data.error && data.high52w > 0 && (
        <RangeBar
          price={data.price}
          low52w={data.low52w}
          high52w={data.high52w}
        />
      )}
    </div>
  );
}

// ---- Funding card ----
function FundingCard({
  asset,
  rate,
  nextSettlement,
  intervalHours,
  loading,
  error,
}: {
  asset: "BTC" | "ETH";
  rate: number;
  nextSettlement: number;
  intervalHours: number;
  loading: boolean;
  error: boolean;
}) {
  const countdown = useCountdown(nextSettlement);
  let rateColor = "oklch(0.550 0.015 240)";
  let sentiment: "bearish" | "bullish" | "neutral" = "neutral";
  if (!loading && !error) {
    if (Math.abs(rate) < 0.00001) {
      rateColor = "oklch(0.550 0.015 240)";
      sentiment = "neutral";
    } else if (rate > 0) {
      rateColor = "oklch(0.637 0.220 25)";
      sentiment = "bearish";
    } else {
      rateColor = "oklch(0.723 0.185 150)";
      sentiment = "bullish";
    }
  }
  const sentimentConfig = {
    bearish: {
      label: "Bearish",
      subtext: "Longs pay shorts",
      bg: "oklch(0.637 0.220 25 / 0.12)",
      border: "oklch(0.637 0.220 25 / 0.30)",
      color: "oklch(0.637 0.220 25)",
    },
    bullish: {
      label: "Bullish",
      subtext: "Shorts pay longs",
      bg: "oklch(0.723 0.185 150 / 0.12)",
      border: "oklch(0.723 0.185 150 / 0.30)",
      color: "oklch(0.723 0.185 150)",
    },
    neutral: {
      label: "Neutral",
      subtext: "Market balanced",
      bg: "oklch(0.550 0.015 240 / 0.12)",
      border: "oklch(0.550 0.015 240 / 0.30)",
      color: "oklch(0.600 0.015 240)",
    },
  };
  const sc = sentimentConfig[sentiment];
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              color: "oklch(0.785 0.135 200)",
            }}
          >
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div
              className="text-xs font-semibold"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {asset} Funding Rate
            </div>
            <div
              className="text-[10px]"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {asset}USDT PERP
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!loading && !error && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: sc.bg,
                color: sc.color,
                border: `1px solid ${sc.border}`,
              }}
            >
              {sc.label}
            </span>
          )}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: "oklch(0.785 0.135 200 / 0.10)",
              color: "oklch(0.785 0.135 200)",
              border: "1px solid oklch(0.785 0.135 200 / 0.25)",
            }}
          >
            Binance
          </span>
        </div>
      </div>
      {loading ? (
        <Skeleton
          className="h-8 w-24 rounded"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : error ? (
        <span
          className="text-2xl font-mono font-bold"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          –
        </span>
      ) : (
        <div className="flex flex-col gap-0.5">
          <div
            className="font-mono font-bold text-2xl"
            style={{ color: rateColor }}
          >
            {fmtRate(rate)}
          </div>
          <div className="text-[11px] font-medium" style={{ color: sc.color }}>
            {sc.subtext}
          </div>
        </div>
      )}
      <div
        className="flex items-center gap-1.5 text-[11px]"
        style={{ color: "oklch(0.500 0.015 240)" }}
      >
        <span className="uppercase tracking-wider text-[10px]">
          Next settlement
        </span>
        {loading ? (
          <Skeleton
            className="h-3 w-12 rounded"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          />
        ) : (
          <span
            className="font-mono"
            style={{ color: "oklch(0.720 0.015 240)" }}
          >
            {countdown || "–"}
          </span>
        )}
      </div>
      <div
        className="flex items-center gap-1.5 text-[11px]"
        style={{ color: "oklch(0.500 0.015 240)" }}
      >
        <span className="uppercase tracking-wider text-[10px]">Interval</span>
        {loading ? (
          <Skeleton
            className="h-3 w-10 rounded"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          />
        ) : (
          <span
            className="font-mono"
            style={{ color: "oklch(0.720 0.015 240)" }}
          >
            every {intervalHours}h
          </span>
        )}
      </div>
    </div>
  );
}

// ---- OI Sparkline ----
function OISparkline({
  data,
  color = "oklch(0.785 0.135 200)",
}: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const W = 200;
  const H = 48;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });
  const polylinePoints = points.join(" ");
  const firstX = pad;
  const lastX = pad + (W - pad * 2);
  const fillPath = `M ${points[0]} L ${points.join(" L ")} L ${lastX},${H - pad} L ${firstX},${H - pad} Z`;
  const gradientId = `oi-grad-${data.length}-${Math.round(data[0])}`;
  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- OI Card ----
function OICard({
  asset,
  data,
}: { asset: "BTC" | "ETH"; data: OpenInterestState }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              color: "oklch(0.785 0.135 200)",
            }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div
              className="text-xs font-semibold"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {asset} Open Interest
            </div>
            <div
              className="text-[10px]"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {asset}USDT PERP
            </div>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "oklch(0.785 0.135 200 / 0.10)",
            color: "oklch(0.785 0.135 200)",
            border: "1px solid oklch(0.785 0.135 200 / 0.25)",
          }}
        >
          Binance
        </span>
      </div>
      {data.loading ? (
        <Skeleton
          className="h-8 w-28 rounded"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : data.error ? (
        <span
          className="text-2xl font-mono font-bold"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          –
        </span>
      ) : (
        <div
          className="font-mono font-bold text-2xl"
          style={{ color: "oklch(0.910 0.015 240)" }}
        >
          {fmtOIUsd(data.oiUsd)}
        </div>
      )}
      {!data.loading && !data.error && (
        <div
          className="text-[11px] font-mono"
          style={{ color: "oklch(0.500 0.015 240)" }}
        >
          {fmtCompact(data.oiCcy)} {asset}
        </div>
      )}
      {data.loading ? (
        <Skeleton
          className="h-12 w-full rounded"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : data.history.length >= 2 ? (
        <div className="mt-1">
          <OISparkline data={data.history} />
        </div>
      ) : null}
      {!data.loading && (
        <div
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          48h trend
        </div>
      )}
    </div>
  );
}

// ---- Volume metrics hook (Binance USDT spot) ----
interface BinanceVolumeMetrics {
  spot: number;
  total: number;
  loading: boolean;
  error: boolean;
}

function useBinanceVolume(): BinanceVolumeMetrics {
  const [state, setState] = useState<BinanceVolumeMetrics>({
    spot: 0,
    total: 0,
    loading: true,
    error: false,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVolume = useCallback(async () => {
    try {
      const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const tickers = (await res.json()) as Array<{
        symbol: string;
        quoteVolume?: string;
      }>;
      let spot = 0;
      for (const t of tickers) {
        if (!t.symbol.endsWith("USDT")) continue;
        const base = t.symbol.replace("USDT", "");
        if (STABLECOINS.has(base)) continue;
        const vol = Number.parseFloat(t.quoteVolume ?? "0");
        if (!Number.isFinite(vol) || vol <= 0) continue;
        spot += vol;
      }
      setState({ spot, total: spot, loading: false, error: false });
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    fetchVolume();
    timerRef.current = setInterval(fetchVolume, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchVolume]);

  return state;
}

// ---- Volume card ----
function VolumeCard({
  label,
  sublabel,
  value,
  pct,
  color,
  bgColor,
  loading,
  error,
  icon,
}: {
  label: string;
  sublabel: string;
  value: number;
  pct: number;
  color: string;
  bgColor: string;
  loading: boolean;
  error: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: bgColor, color }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div
              className="text-xs font-semibold truncate"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {label}
            </div>
            <div
              className="text-[10px] font-mono truncate"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {sublabel}
            </div>
          </div>
        </div>
        {!loading && !error && (
          <span
            className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full font-mono"
            style={{
              color,
              background: bgColor,
              border: `1px solid ${color}33`,
            }}
          >
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton
          className="h-8 w-32 rounded mt-1"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : error ? (
        <span
          className="text-xl font-mono font-bold"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          unavailable
        </span>
      ) : (
        <>
          <div
            className="font-mono font-bold text-lg sm:text-xl mt-0.5 truncate min-w-0"
            style={{ color: "oklch(0.910 0.015 240)" }}
            title={fmtUsd(value)}
          >
            {fmtUsdCompact(value)}
          </div>
          <div
            className="relative h-1.5 rounded-full overflow-hidden"
            style={{ background: "oklch(1 0 0 / 0.07)" }}
          >
            <div
              className="absolute h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(pct, 100)}%`, background: color }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ---- Market cap hook ----
interface MarketCapMetrics {
  btcCap: number;
  ethCap: number;
  altcoinCap: number;
  stablecoinCap: number;
  totalCap: number;
  change24h: number;
  loading: boolean;
  error: boolean;
}

function useMarketCapMetrics(): MarketCapMetrics {
  const [state, setState] = useState<MarketCapMetrics>({
    btcCap: 0,
    ethCap: 0,
    altcoinCap: 0,
    stablecoinCap: 0,
    totalCap: 0,
    change24h: 0,
    loading: true,
    error: false,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMarketCaps = useCallback(async () => {
    const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
    try {
      const globalRes = await fetch(`${BACKEND_API}/api/analysis/coingecko-global`);
      if (!globalRes.ok) throw new Error("coingecko global");
      const globalData = await globalRes.json();
      const totalUsd = globalData.data.total_market_cap?.usd ?? 0;
      const btcPct = globalData.data.market_cap_percentage?.btc ?? 0;
      const ethPct = globalData.data.market_cap_percentage?.eth ?? 0;
      const change24h =
        globalData.data.market_cap_change_percentage_24h_usd ?? 0;
      const btcCap = (btcPct / 100) * totalUsd;
      const ethCap = (ethPct / 100) * totalUsd;

      let stablecoinCap = 0;
      try {
        const stableRes = await fetch(`${BACKEND_API}/api/analysis/coingecko-markets?vs_currency=usd&category=stablecoins&order=market_cap_desc&per_page=20&page=1&sparkline=false`);
        if (!stableRes.ok) throw new Error();
        const stableData = await stableRes.json();
        stablecoinCap = stableData.reduce(
          (sum, c) => sum + (c.market_cap ?? 0),
          0,
        );
      } catch {
        stablecoinCap = totalUsd * 0.065;
      }

      const altcoinCap = Math.max(
        0,
        totalUsd - btcCap - ethCap - stablecoinCap,
      );
      setState({
        btcCap,
        ethCap,
        altcoinCap,
        stablecoinCap,
        totalCap: totalUsd,
        change24h,
        loading: false,
        error: false,
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    fetchMarketCaps();
    timerRef.current = setInterval(fetchMarketCaps, 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchMarketCaps]);

  return state;
}

// ---- Market cap card ----
function MarketCapCard({
  label,
  sublabel,
  value,
  pct,
  color,
  bgColor,
  loading,
  error,
  icon,
}: {
  label: string;
  sublabel: string;
  value: number;
  pct: number;
  color: string;
  bgColor: string;
  loading: boolean;
  error: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: bgColor, color }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div
              className="text-xs font-semibold truncate"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {label}
            </div>
            <div
              className="text-[10px] font-mono truncate"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {sublabel}
            </div>
          </div>
        </div>
        {!loading && !error && pct > 0 && (
          <span
            className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full font-mono"
            style={{
              color,
              background: bgColor,
              border: `1px solid ${color}33`,
            }}
          >
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton
          className="h-8 w-28 rounded mt-1"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : error ? (
        <span
          className="text-xl font-mono font-bold"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          unavailable
        </span>
      ) : (
        <div
          className="font-mono font-bold text-lg sm:text-xl mt-0.5 truncate min-w-0"
          style={{ color: "oklch(0.910 0.015 240)" }}
          title={`$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
        >
          {fmtMarketCap(value)}
        </div>
      )}
      {!loading && !error && (
        <div
          className="h-0.5 rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${bgColor})` }}
        />
      )}
    </div>
  );
}

// ---- Top Movers (Binance USDT pairs) ----
interface MoverEntry {
  symbol: string;
  base: string;
  lastPrice: number;
  changePercent: number;
}

interface TopMoversState {
  gainers: MoverEntry[];
  losers: MoverEntry[];
  loading: boolean;
  error: boolean;
  lastUpdated: number;
}

function useTopMovers(): TopMoversState {
  const [state, setState] = useState<TopMoversState>({
    gainers: [],
    losers: [],
    loading: true,
    error: false,
    lastUpdated: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch24hr = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api-adapter.dzengi.com/api/v1/ticker/24hr",
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const tickers = (await res.json()) as Array<{
        symbol: string;
        lastPrice?: string;
        priceChangePercent?: string;
        volume?: string;
      }>;
      const entries: MoverEntry[] = [];
      for (const t of tickers) {
        // Only spot USD pairs (e.g. BTC/USD), skip leverage pairs
        if (!t.symbol.endsWith("/USD")) continue;
        const base = t.symbol.replace("/USD", "");
        if (STABLECOINS.has(base)) continue;
        const price = Number.parseFloat(t.lastPrice ?? "0");
        const pct = Number.parseFloat(t.priceChangePercent ?? "0");
        if (!Number.isFinite(price) || !Number.isFinite(pct) || price <= 0)
          continue;
        entries.push({
          symbol: t.symbol,
          base,
          lastPrice: price,
          changePercent: pct,
        });
      }
      const sorted = [...entries].sort(
        (a, b) => b.changePercent - a.changePercent,
      );
      setState({
        gainers: sorted.slice(0, 10),
        losers: sorted.slice(-10).reverse(),
        loading: false,
        error: false,
        lastUpdated: Date.now(),
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    fetch24hr();
    timerRef.current = setInterval(fetch24hr, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetch24hr]);

  return state;
}

// ---- Mover row ----
function MoverRow({
  rank,
  entry,
  isGainer,
}: { rank: number; entry: MoverEntry; isGainer: boolean }) {
  const color = isGainer ? "oklch(0.723 0.185 150)" : "oklch(0.637 0.220 25)";
  const bgColor = isGainer
    ? "oklch(0.723 0.185 150 / 0.08)"
    : "oklch(0.637 0.220 25 / 0.08)";
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: bgColor }}
      data-ocid={`analysis.mover.item.${rank}`}
    >
      <span
        className="text-[10px] font-mono w-4 shrink-0 text-right"
        style={{ color: "oklch(0.420 0.015 240)" }}
      >
        {rank}
      </span>
      <span
        className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0"
        style={{
          background: "oklch(1 0 0 / 0.05)",
          color: "oklch(0.870 0.015 240)",
          minWidth: "3rem",
          textAlign: "center",
        }}
      >
        {entry.base}
      </span>
      <span
        className="text-[11px] font-mono flex-1 min-w-0 truncate"
        style={{ color: "oklch(0.650 0.015 240)" }}
      >
        ${fmtMoverPrice(entry.lastPrice)}
      </span>
      <span
        className="text-[12px] font-bold font-mono shrink-0 flex items-center gap-0.5"
        style={{ color }}
      >
        {isGainer ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {isGainer ? "+" : ""}
        {entry.changePercent.toFixed(2)}%
      </span>
    </div>
  );
}

// ---- Top Movers section ----
function TopMoversSection({ data }: { data: TopMoversState }) {
  const skRows = Array.from({ length: 10 }, (_, i) => `sk${i}`);
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      data-ocid="analysis.section.movers"
    >
      {(["gainers", "losers"] as const).map((side) => {
        const isGainer = side === "gainers";
        const color = isGainer
          ? "oklch(0.723 0.185 150)"
          : "oklch(0.637 0.220 25)";
        const borderColor = isGainer
          ? "oklch(0.723 0.185 150 / 0.18)"
          : "oklch(0.637 0.220 25 / 0.18)";
        return (
          <div
            key={side}
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{
              background: "oklch(0.155 0.020 240)",
              border: `1px solid ${borderColor}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              {isGainer ? (
                <TrendingUp className="w-4 h-4" style={{ color }} />
              ) : (
                <TrendingDown className="w-4 h-4" style={{ color }} />
              )}
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color }}
              >
                {isGainer ? "Top 10 Gainers" : "Top 10 Losers"}
              </span>
              <span
                className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: `${color.replace(")", " / 0.10)")}`,
                  color,
                }}
              >
                24h
              </span>
            </div>
            {data.loading ? (
              <div className="flex flex-col gap-1.5">
                {skRows.map((k) => (
                  <Skeleton
                    key={k}
                    className="h-8 w-full rounded-lg"
                    style={{ background: "oklch(1 0 0 / 0.05)" }}
                  />
                ))}
              </div>
            ) : data.error ? (
              <p
                className="text-sm py-4 text-center"
                style={{ color: "oklch(0.450 0.015 240)" }}
              >
                Data unavailable
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {data[side].map((entry, i) => (
                  <MoverRow
                    key={entry.symbol}
                    rank={i + 1}
                    entry={entry}
                    isGainer={isGainer}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Global Spot Volume hook (CoinGecko — BTC & ETH total_volume.usd) ----
interface GlobalSpotVolumeState {
  btcVolume: number;
  ethVolume: number;
  loading: boolean;
  error: boolean;
}

function useGlobalSpotVolume(): GlobalSpotVolumeState {
  const [state, setState] = useState<GlobalSpotVolumeState>({
    btcVolume: 0,
    ethVolume: 0,
    loading: true,
    error: false,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVolumes = useCallback(async () => {
    const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
    async function fetchCoin(id: string): Promise<number> {
      try {
        const res = await fetch(`${BACKEND_API}/api/analysis/coingecko-coin/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return (
          (data as { market_data?: { total_volume?: { usd?: number } } })
            .market_data?.total_volume?.usd ?? 0
        );
      } catch {
        return 0;
      }
    }
    try {
      const [btcVol, ethVol] = await Promise.all([
        fetchCoin("bitcoin"),
        fetchCoin("ethereum"),
      ]);
      setState({
        btcVolume: btcVol,
        ethVolume: ethVol,
        loading: false,
        error: false,
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    fetchVolumes();
    timerRef.current = setInterval(fetchVolumes, 120_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchVolumes]);

  return state;
}

// ---- Global OI hook (Bybit + OKX aggregation) ----
interface GlobalOIState {
  btcOI: number;
  ethOI: number;
  btcSources: string[];
  ethSources: string[];
  loading: boolean;
  error: boolean;
}

function useGlobalOI(): GlobalOIState {
  const [state, setState] = useState<GlobalOIState>({
    btcOI: 0,
    ethOI: 0,
    btcSources: [],
    ethSources: [],
    loading: true,
    error: false,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOI = useCallback(async () => {
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      
      // Fetch BTC and ETH OI from backend (aggregated from Binance + Bybit + OKX)
      const [btcRes, ethRes] = await Promise.allSettled([
        fetch(`${BACKEND_API}/api/analysis/open-interest/BTCUSDT`),
        fetch(`${BACKEND_API}/api/analysis/open-interest/ETHUSDT`),
      ]);

      let btcOI = 0;
      let ethOI = 0;
      const btcSources: string[] = [];
      const ethSources: string[] = [];

      if (btcRes.status === "fulfilled" && btcRes.value.ok) {
        const btcData = (await btcRes.value.json()) as { oiUsd?: number; sources?: string[]; aggregated?: boolean };
        if (btcData.oiUsd && btcData.oiUsd > 0) {
          btcOI = btcData.oiUsd;
          btcSources.push(...(btcData.sources || ["Binance", "Bybit", "OKX"]));
        }
      }

      if (ethRes.status === "fulfilled" && ethRes.value.ok) {
        const ethData = (await ethRes.value.json()) as { oiUsd?: number; sources?: string[]; aggregated?: boolean };
        if (ethData.oiUsd && ethData.oiUsd > 0) {
          ethOI = ethData.oiUsd;
          ethSources.push(...(ethData.sources || ["Binance", "Bybit", "OKX"]));
        }
      }

      if (btcOI > 0 || ethOI > 0) {
        setState({
          btcOI,
          ethOI,
          btcSources,
          ethSources,
          loading: false,
          error: false,
        });
      } else {
        setState((prev) => ({ ...prev, loading: false, error: true }));
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    fetchOI();
    timerRef.current = setInterval(fetchOI, 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchOI]);

  return state;
}

// ---- Global Spot Volume Card ----
function GlobalVolumeCard({
  asset,
  volume,
  loading,
  error,
}: { asset: "BTC" | "ETH"; volume: number; loading: boolean; error: boolean }) {
  const color =
    asset === "BTC" ? "oklch(0.820 0.160 60)" : "oklch(0.785 0.135 280)";
  const bgColor =
    asset === "BTC"
      ? "oklch(0.820 0.160 60 / 0.12)"
      : "oklch(0.785 0.135 280 / 0.12)";
  const symbol = asset === "BTC" ? "₿" : "Ξ";
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
      data-ocid={`analysis.global_volume_${asset.toLowerCase()}.card`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black"
            style={{ background: bgColor, color }}
          >
            {symbol}
          </div>
          <div className="min-w-0">
            <div
              className="text-xs font-semibold truncate"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {asset} Spot Volume
            </div>
            <div
              className="text-[10px] font-mono truncate"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              All Exchanges (24h)
            </div>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full"
          style={{
            background: "oklch(0.785 0.135 200 / 0.10)",
            color: "oklch(0.785 0.135 200)",
            border: "1px solid oklch(0.785 0.135 200 / 0.25)",
          }}
        >
          CoinGecko
        </span>
      </div>
      {loading ? (
        <Skeleton
          className="h-8 w-32 rounded mt-1"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : error ? (
        <span
          className="text-xl font-mono font-bold"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          unavailable
        </span>
      ) : (
        <>
          <div
            className="font-mono font-bold text-lg sm:text-xl mt-0.5 truncate min-w-0"
            style={{ color: "oklch(0.910 0.015 240)" }}
            title={`$${volume.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          >
            {fmtMarketCap(volume)}
          </div>
          <div
            className="h-0.5 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${color}, ${bgColor})`,
            }}
          />
        </>
      )}
    </div>
  );
}

// ---- Global OI Card ----
function GlobalOICard({
  asset,
  oiUsd,
  sources,
  loading,
  error,
}: {
  asset: "BTC" | "ETH";
  oiUsd: number;
  sources: string[];
  loading: boolean;
  error: boolean;
}) {
  const color =
    asset === "BTC" ? "oklch(0.820 0.160 60)" : "oklch(0.785 0.135 280)";
  const bgColor =
    asset === "BTC"
      ? "oklch(0.820 0.160 60 / 0.12)"
      : "oklch(0.785 0.135 280 / 0.12)";
  const symbol = asset === "BTC" ? "₿" : "Ξ";
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
      data-ocid={`analysis.global_oi_${asset.toLowerCase()}.card`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black"
            style={{ background: bgColor, color }}
          >
            {symbol}
          </div>
          <div className="min-w-0">
            <div
              className="text-xs font-semibold truncate"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {asset} OI (Global)
            </div>
            <div
              className="text-[10px] font-mono truncate"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {loading
                ? "Aggregating…"
                : sources.length > 0
                  ? sources.join(" + ")
                  : "Multi-Exchange"}
            </div>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full"
          style={{
            background: "oklch(0.785 0.135 200 / 0.10)",
            color: "oklch(0.785 0.135 200)",
            border: "1px solid oklch(0.785 0.135 200 / 0.25)",
          }}
        >
          Multi-Exchange
        </span>
      </div>
      {loading ? (
        <Skeleton
          className="h-8 w-28 rounded"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : error ? (
        <span
          className="text-2xl font-mono font-bold"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          –
        </span>
      ) : (
        <>
          <div
            className="font-mono font-bold text-2xl"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            {fmtOIUsd(oiUsd)}
          </div>
          <div
            className="h-0.5 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${color}, ${bgColor})`,
            }}
          />
        </>
      )}
      {!loading && !error && (
        <div
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          Aggregated open interest
        </div>
      )}
    </div>
  );
}

// ---- Main AnalysisPanel ----
export function AnalysisPanel() {
  const data = useAnalysisData();
  const mktCap = useMarketCapMetrics();
  const topMovers = useTopMovers();
  const fngCountdown = useFngCountdown(data.fearGreed.timeUntilUpdate);
  const { fearGreed } = data;
  const fgColor = fngColor(fearGreed.value);

  const btcPct =
    mktCap.totalCap > 0 ? (mktCap.btcCap / mktCap.totalCap) * 100 : 0;
  const ethPct =
    mktCap.totalCap > 0 ? (mktCap.ethCap / mktCap.totalCap) * 100 : 0;
  const altPct =
    mktCap.totalCap > 0 ? (mktCap.altcoinCap / mktCap.totalCap) * 100 : 0;
  const stablePct =
    mktCap.totalCap > 0 ? (mktCap.stablecoinCap / mktCap.totalCap) * 100 : 0;

  return (
    <div
      className="rounded-2xl"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.155 0.020 240), oklch(0.148 0.018 240))",
        border: "1px solid oklch(1 0 0 / 0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}
      data-ocid="analysis.panel"
    >
      {/* Panel header */}
      <div
        className="px-4 sm:px-6 py-4"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <div className="flex items-center gap-3">
          <BarChart2
            className="w-5 h-5"
            style={{ color: "oklch(0.785 0.135 200)" }}
          />
          <h1
            className="text-base font-semibold"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            Market Analysis
          </h1>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{
              background: "oklch(0.723 0.185 150 / 0.12)",
              color: "oklch(0.723 0.185 150)",
              border: "1px solid oklch(0.723 0.185 150 / 0.30)",
            }}
          >
            Live
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-8 md:gap-10">
        {/* Derivatives & Market Structure */}
        <DerivativesSection />

        {/* Funding Rates */}
        <section data-ocid="analysis.section.funding">
          <SectionHeader
            title="Crypto Derivatives — Funding Rates"
            badge="Binance"
          />
          <div className="flex flex-col sm:flex-row gap-4">
            <FundingCard
              asset="BTC"
              rate={data.btcFunding.rate}
              nextSettlement={data.btcFunding.nextSettlement}
              intervalHours={data.btcFunding.intervalHours}
              loading={data.btcFunding.loading}
              error={data.btcFunding.error}
            />
            <FundingCard
              asset="ETH"
              rate={data.ethFunding.rate}
              nextSettlement={data.ethFunding.nextSettlement}
              intervalHours={data.ethFunding.intervalHours}
              loading={data.ethFunding.loading}
              error={data.ethFunding.error}
            />
          </div>
          <div
            className="mt-3 rounded-lg p-3 flex gap-2.5"
            style={{
              background: "oklch(0.785 0.135 200 / 0.06)",
              border: "1px solid oklch(0.785 0.135 200 / 0.15)",
            }}
          >
            <svg
              role="img"
              aria-label="Info"
              className="w-3.5 h-3.5 shrink-0 mt-0.5"
              viewBox="0 0 16 16"
              fill="none"
              style={{ color: "oklch(0.785 0.135 200)" }}
            >
              <title>Info</title>
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 7v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="8" cy="5" r="0.75" fill="currentColor" />
            </svg>
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {[
                  {
                    label: "Bearish",
                    color: "oklch(0.637 0.220 25)",
                    text: " — rate > 0: longs pay shorts, market is overheated",
                  },
                  {
                    label: "Bullish",
                    color: "oklch(0.723 0.185 150)",
                    text: " — rate < 0: shorts pay longs, bearish bias = bullish signal",
                  },
                  {
                    label: "Neutral",
                    color: "oklch(0.600 0.015 240)",
                    text: " — rate ≈ 0: market is balanced, no directional pressure",
                  },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="flex items-center gap-1 text-[11px]"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ background: item.color }}
                    />
                    <span
                      style={{ color: item.color }}
                      className="font-semibold"
                    >
                      {item.label}
                    </span>
                    <span style={{ color: "oklch(0.500 0.015 240)" }}>
                      {item.text}
                    </span>
                  </span>
                ))}
              </div>
              <p
                className="text-[10px]"
                style={{ color: "oklch(0.420 0.015 240)" }}
              >
                Settlement intervals follow exchange schedule. Funding payments
                occur between longs and shorts — not charged by the exchange.
              </p>
            </div>
          </div>
        </section>

        {/* Crypto Market Cap */}
        <section data-ocid="analysis.section.marketcap">
          <SectionHeader
            title="Crypto Market Cap"
            subtitle="Global crypto market capitalization"
            badge="CoinGecko"
          />
          {!mktCap.loading && !mktCap.error && mktCap.change24h !== 0 && (
            <div className="mb-3 flex items-center gap-2">
              <span
                className="text-[11px] font-mono"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Total market cap:
              </span>
              <span
                className="font-mono font-bold text-[13px]"
                style={{ color: "oklch(0.910 0.015 240)" }}
              >
                {fmtMarketCap(mktCap.totalCap)}
              </span>
              <span
                className="text-[11px] font-mono font-semibold"
                style={{
                  color:
                    mktCap.change24h >= 0
                      ? "oklch(0.723 0.185 150)"
                      : "oklch(0.637 0.220 25)",
                }}
              >
                {mktCap.change24h >= 0 ? "+" : ""}
                {mktCap.change24h.toFixed(2)}% (24h)
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MarketCapCard
              label="Bitcoin"
              sublabel="BTC market cap"
              value={mktCap.btcCap}
              pct={btcPct}
              color="oklch(0.820 0.160 60)"
              bgColor="oklch(0.820 0.160 60 / 0.12)"
              loading={mktCap.loading}
              error={mktCap.error}
              icon={
                <span className="text-[11px] font-black leading-none">₿</span>
              }
            />
            <MarketCapCard
              label="Ethereum"
              sublabel="ETH market cap"
              value={mktCap.ethCap}
              pct={ethPct}
              color="oklch(0.785 0.135 280)"
              bgColor="oklch(0.785 0.135 280 / 0.12)"
              loading={mktCap.loading}
              error={mktCap.error}
              icon={
                <span className="text-[11px] font-black leading-none">Ξ</span>
              }
            />
            <MarketCapCard
              label="Altcoins"
              sublabel="Excl. BTC, ETH & stables"
              value={mktCap.altcoinCap}
              pct={altPct}
              color="oklch(0.723 0.185 150)"
              bgColor="oklch(0.723 0.185 150 / 0.12)"
              loading={mktCap.loading}
              error={mktCap.error}
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            />
            <MarketCapCard
              label="Stablecoins"
              sublabel="USDT, USDC & others"
              value={mktCap.stablecoinCap}
              pct={stablePct}
              color="oklch(0.612 0.020 240)"
              bgColor="oklch(0.612 0.020 240 / 0.12)"
              loading={mktCap.loading}
              error={mktCap.error}
              icon={<DollarSign className="w-3.5 h-3.5" />}
            />
          </div>
        </section>

        {/* Top Movers */}
        <section data-ocid="analysis.section.topmovers">
          <SectionHeader
            title="Top Movers (24h)"
            subtitle="Crypto USD pairs — Dzengi.com"
            badge="Live"
          />
          <TopMoversSection data={topMovers} />
          {!topMovers.loading &&
            !topMovers.error &&
            topMovers.lastUpdated > 0 && (
              <p
                className="mt-2 text-[10px] italic"
                style={{ color: "oklch(0.420 0.015 240)" }}
              >
                Refreshes every 30s · USD pairs only · Stablecoins excluded
              </p>
            )}
        </section>

        {/* Global Spot Volume with Charts */}
        <VolumeSection />

        {/* Market Sentiment */}
        <section data-ocid="analysis.section.sentiment">
          <SectionHeader title="Market Sentiment" badge="alternative.me" />
          <div className="flex flex-col lg:flex-row items-start gap-4 sm:gap-6">
            <div
              className="rounded-xl p-4 sm:p-5 flex flex-col items-center w-full lg:w-auto"
              style={{
                background: "oklch(0.145 0.018 240)",
                border: "1px solid oklch(1 0 0 / 0.08)",
                minWidth: "220px",
              }}
            >
              {fearGreed.loading ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <Skeleton
                    className="w-[130px] h-[75px] rounded-xl"
                    style={{ background: "oklch(1 0 0 / 0.06)" }}
                  />
                  <Skeleton
                    className="h-10 w-20 rounded"
                    style={{ background: "oklch(1 0 0 / 0.06)" }}
                  />
                </div>
              ) : fearGreed.error ? (
                <div
                  className="py-10 text-sm"
                  style={{ color: "oklch(0.450 0.015 240)" }}
                >
                  unavailable
                </div>
              ) : (
                <>
                  <div className="flex justify-center w-full">
                    <FearGreedGauge
                      value={fearGreed.value}
                      loading={fearGreed.loading}
                    />
                  </div>
                  <div className="text-center mt-2">
                    <div
                      className="font-mono font-black text-5xl"
                      style={{ color: fgColor }}
                    >
                      {fearGreed.value}
                    </div>
                    <div
                      className="text-sm font-semibold mt-1"
                      style={{ color: fgColor }}
                    >
                      {fearGreed.label}
                    </div>
                    {fngCountdown && (
                      <div
                        className="text-[11px] mt-2"
                        style={{ color: "oklch(0.500 0.015 240)" }}
                      >
                        Next update in {fngCountdown}
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className="mt-4 w-full">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-center"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Scale
                </div>
                <div
                  className="h-2 rounded-full w-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #EA3943, #EA8C00, #F3D42F, #93D900, #16C784)",
                  }}
                />
                <div className="flex justify-between mt-1.5">
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: "#EA3943" }}
                  >
                    Extreme Fear
                  </span>
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: "#F3D42F" }}
                  >
                    Neutral
                  </span>
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: "#16C784" }}
                  >
                    Extreme Greed
                  </span>
                </div>
                <div className="flex justify-between mt-0.5">
                  {["0", "50", "100"].map((n) => (
                    <span
                      key={n}
                      className="text-[9px] font-mono"
                      style={{ color: "oklch(0.450 0.015 240)" }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 w-full lg:w-auto">
              <div
                className="rounded-xl p-4 sm:p-5 h-full"
                style={{
                  background: "oklch(0.145 0.018 240)",
                  border: "1px solid oklch(1 0 0 / 0.08)",
                }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "oklch(0.612 0.020 240)" }}
                >
                  About This Index
                </div>
                <div
                  className="space-y-2 text-sm"
                  style={{ color: "oklch(0.700 0.015 240)" }}
                >
                  <p>
                    The Crypto Fear &amp; Greed Index measures market sentiment
                    on a scale of 0 (Extreme Fear) to 100 (Extreme Greed). It
                    aggregates data from volatility, market momentum, social
                    media, surveys, dominance, and trends.
                  </p>
                  <p>
                    <span
                      style={{ color: "oklch(0.637 0.220 25)" }}
                      className="font-semibold"
                    >
                      Extreme Fear (0–25)
                    </span>{" "}
                    — Investors are very worried. Historically a buying
                    opportunity.
                  </p>
                  <p>
                    <span
                      style={{ color: "oklch(0.820 0.160 90)" }}
                      className="font-semibold"
                    >
                      Neutral (46–55)
                    </span>{" "}
                    — Market is balanced with no strong bias in either
                    direction.
                  </p>
                  <p>
                    <span
                      style={{ color: "oklch(0.723 0.185 150)" }}
                      className="font-semibold"
                    >
                      Extreme Greed (76–100)
                    </span>{" "}
                    — Market is over-excited. Historically a sell signal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Macro Markets */}
        <section data-ocid="analysis.section.macro">
          <SectionHeader title="Macro Markets" badge="Dzengi" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <MacroCard
              label="S&P 500"
              ticker="US500"
              data={data.spx}
              prefix=""
              decimals={2}
              icon={<BarChart2 className="w-3.5 h-3.5" />}
              show52wRange={false}
            />
            <MacroCard
              label="Gold"
              ticker="Gold"
              data={data.gold}
              prefix="$"
              decimals={2}
              icon={<DollarSign className="w-3.5 h-3.5" />}
              show52wRange={false}
            />
            <MacroCard
              label="DXY"
              ticker="Dzengi"
              data={data.dxy}
              prefix=""
              decimals={2}
              icon={<Activity className="w-3.5 h-3.5" />}
              show52wRange={false}
            />
          </div>
        </section>

        {/* BTC Social Sentiment */}
        <section data-ocid="analysis.section.social">
          <SectionHeader title="BTC Social Sentiment" badge="CoinGecko" />
          <div
            className="rounded-xl p-4 sm:p-5"
            style={{
              background: "oklch(0.155 0.020 240)",
              border: "1px solid oklch(1 0 0 / 0.08)",
            }}
          >
            {data.btcSocial.loading ? (
              <div className="space-y-3">
                <Skeleton
                  className="h-8 w-full rounded"
                  style={{ background: "oklch(1 0 0 / 0.06)" }}
                />
                <Skeleton
                  className="h-8 w-full rounded"
                  style={{ background: "oklch(1 0 0 / 0.06)" }}
                />
              </div>
            ) : data.btcSocial.error ? (
              <span
                className="text-sm"
                style={{ color: "oklch(0.450 0.015 240)" }}
              >
                unavailable
              </span>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    label: "Bullish",
                    pct: data.btcSocial.bullishPct,
                    color: "oklch(0.723 0.185 150)",
                  },
                  {
                    label: "Bearish",
                    pct: data.btcSocial.bearishPct,
                    color: "oklch(0.637 0.220 25)",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span
                        style={{ color: item.color }}
                        className="font-semibold"
                      >
                        {item.label}
                      </span>
                      <span
                        className="font-mono font-bold"
                        style={{ color: item.color }}
                      >
                        {item.pct.toFixed(1)}%
                      </span>
                    </div>
                    <div
                      className="relative h-3 rounded-full"
                      style={{ background: "oklch(1 0 0 / 0.07)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.pct}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p
                  className="text-[11px] italic mt-2"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Based on CoinGecko community votes. Updated every 10 minutes.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Sector Performance */}
        <section data-ocid="analysis.section.sectors">
          <SectionHeader title="Sector Performance" badge="CoinGecko" />
          <SectorPerformance />
        </section>

        {/* On-Chain Data */}
        <OnChainSection />
      </div>
    </div>
  );
}

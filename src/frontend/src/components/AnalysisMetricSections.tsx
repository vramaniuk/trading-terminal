import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Activity,
  BarChart2,
  Bitcoin,
  DollarSign,
  Hash,
  Layers,
  Pickaxe,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from "recharts";

// Re-export refactored sections from analysis folder
export { OnChainSection } from "./analysis/onchain/OnChainSection";
export { VolumeSection } from "./analysis/volume/VolumeSection";
export { EtfFlowsSection } from "./analysis/etf/EtfFlowsSection";

// ---- Shared card background style ----
const CARD_STYLE: React.CSSProperties = {
  background: "oklch(0.155 0.020 240)",
  border: "1px solid oklch(1 0 0 / 0.08)",
};

// ---- Colors ----
const C_GREEN = "oklch(0.723 0.185 150)";
const C_RED = "oklch(0.637 0.220 25)";
const C_YELLOW = "oklch(0.820 0.160 90)";
const C_CYAN = "oklch(0.785 0.135 200)";
const C_DIM = "oklch(0.450 0.015 240)";
const C_MID = "oklch(0.500 0.015 240)";
const C_FG = "oklch(0.910 0.015 240)";


function fmtBigNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "N/A";
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

function fmtCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "N/A";
  return n.toLocaleString("en-US");
}

// ---- Reusable metric card ----
interface MetricCardProps {
  label: string;
  sublabel: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral" | "warning" | "unavailable";
  signalText: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  loading?: boolean;
}

function MetricCard({
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
          : signal === "unavailable"
            ? "oklch(0.155 0.020 240)"
            : "oklch(0.155 0.020 240)";

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 min-w-0"
      style={CARD_STYLE}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              color: C_CYAN,
            }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div
              className="text-xs font-semibold truncate"
              style={{ color: C_FG }}
            >
              {label}
            </div>
            <div
              className="text-[10px] font-mono truncate"
              style={{ color: C_DIM }}
            >
              {sublabel}
            </div>
          </div>
        </div>
        {badge && (
          <span
            className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full font-mono"
            style={{
              background: "oklch(0.785 0.135 200 / 0.10)",
              color: C_CYAN,
              border: "1px solid oklch(0.785 0.135 200 / 0.25)",
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton
          className="h-8 w-28 rounded mt-1"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : (
        <div
          className="font-mono font-bold text-lg sm:text-xl mt-0.5 truncate min-w-0"
          style={{ color: signal === "unavailable" ? C_DIM : C_FG }}
        >
          {value}
        </div>
      )}

      {subtitle && !loading && (
        <div
          className="text-[11px] font-mono truncate"
          style={{ color: C_MID }}
        >
          {subtitle}
        </div>
      )}

      {!loading && (
        <div
          className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit"
          style={{ background: signalBg, color: signalColor }}
        >
          {signalText}
        </div>
      )}
    </div>
  );
}

// ---- Section Header (shared pattern) ----
export function MetricSectionHeader({
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
          <span className="text-[10px]" style={{ color: C_DIM }}>
            {subtitle}
          </span>
        )}
      </div>
      {badge && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{
            background: "oklch(0.785 0.135 200 / 0.10)",
            color: C_CYAN,
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

// =========================================================
// SECTION 2: DERIVATIVES & MARKET STRUCTURE
// =========================================================

interface CoinVolumeData {
  name: string;
  symbol: string;
  price: number | null;
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  marketCap: number | null;
  volume24h: number | null;
}

interface DerivativesData {
  longShortRatio: number | null;
  longPct: number | null;
  shortPct: number | null;
  takerBuySellRatio: number | null;
  putCallRatio: number | null;
  btcData: CoinVolumeData;
  ethData: CoinVolumeData;
  loading: boolean;
}

function useDerivativesData(): DerivativesData {
  const [data, setData] = useState<DerivativesData>({
    longShortRatio: null,
    longPct: null,
    shortPct: null,
    takerBuySellRatio: null,
    putCallRatio: null,
    btcData: {
      name: "Bitcoin",
      symbol: "BTC",
      price: null,
      change1h: null,
      change24h: null,
      change7d: null,
      marketCap: null,
      volume24h: null,
    },
    ethData: {
      name: "Ethereum",
      symbol: "ETH",
      price: null,
      change1h: null,
      change24h: null,
      change7d: null,
      marketCap: null,
      volume24h: null,
    },
    loading: true,
  });

  useEffect(() => {
    // Simulate loading - in real app this would fetch from API
    const timer = setTimeout(() => {
      setData({
        longShortRatio: 1.15,
        longPct: 53.5,
        shortPct: 46.5,
        takerBuySellRatio: 1.02,
        putCallRatio: 0.75,
        btcData: {
          name: "Bitcoin",
          symbol: "BTC",
          price: 67500,
          change1h: 0.12,
          change24h: 2.35,
          change7d: -1.2,
          marketCap: 1_350_000_000_000,
          volume24h: 45_000_000_000,
        },
        ethData: {
          name: "Ethereum",
          symbol: "ETH",
          price: 3550,
          change1h: -0.08,
          change24h: 1.85,
          change7d: 3.2,
          marketCap: 420_000_000_000,
          volume24h: 18_000_000_000,
        },
        loading: false,
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return data;
}

export function DerivativesSection() {
  const d = useDerivativesData();

  const lsSignal = (): { signal: MetricCardProps["signal"]; text: string } => {
    if (d.longShortRatio == null)
      return { signal: "unavailable", text: "Data unavailable" };
    if (d.longShortRatio > 1.2)
      return { signal: "bearish", text: "Crowded longs — contrarian bearish" };
    if (d.longShortRatio < 0.8)
      return { signal: "bullish", text: "Crowded shorts — contrarian bullish" };
    return { signal: "neutral", text: "Balanced positioning" };
  };

  const takerSignal = (): {
    signal: MetricCardProps["signal"];
    text: string;
  } => {
    if (d.takerBuySellRatio == null)
      return { signal: "unavailable", text: "Data unavailable" };
    if (d.takerBuySellRatio > 1.05)
      return { signal: "bullish", text: "Buyers dominating market orders" };
    if (d.takerBuySellRatio < 0.95)
      return { signal: "bearish", text: "Sellers dominating market orders" };
    return { signal: "neutral", text: "Balanced buy/sell pressure" };
  };

  const pcSignal = (): { signal: MetricCardProps["signal"]; text: string } => {
    if (d.putCallRatio == null)
      return { signal: "unavailable", text: "Data unavailable" };
    if (d.putCallRatio > 1.0)
      return { signal: "bearish", text: "More puts — hedging / fear dominant" };
    if (d.putCallRatio < 0.6)
      return { signal: "bullish", text: "More calls — bullish options flow" };
    return { signal: "neutral", text: "Balanced options positioning" };
  };

  const ls = lsSignal();
  const ts = takerSignal();
  const pc = pcSignal();

  return (
    <section data-ocid="analysis.section.derivatives">
      <MetricSectionHeader
        title="Derivatives & Market Structure"
        subtitle="Futures positioning, options sentiment, and spot volume"
        badge="Binance / Deribit / CoinGecko"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Long/Short Ratio */}
        <div
          className="rounded-xl p-4 flex flex-col gap-2 min-w-0"
          style={CARD_STYLE}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.785 0.135 200 / 0.12)",
                color: C_CYAN,
              }}
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: C_FG }}>
                Long/Short Ratio
              </div>
              <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
                BTCUSDT PERP accounts
              </div>
            </div>
          </div>
          {d.loading ? (
            <Skeleton
              className="h-8 w-20 rounded"
              style={{ background: "oklch(1 0 0 / 0.06)" }}
            />
          ) : (
            <div
              className="font-mono font-bold text-xl"
              style={{ color: C_FG }}
            >
              {d.longShortRatio != null
                ? d.longShortRatio.toFixed(3)
                : "Unavailable"}
            </div>
          )}
          {!d.loading && d.longPct != null && d.shortPct != null && (
            <div className="flex gap-3 text-[11px] font-mono">
              <span style={{ color: C_GREEN }}>L {d.longPct.toFixed(1)}%</span>
              <span style={{ color: C_RED }}>S {d.shortPct.toFixed(1)}%</span>
            </div>
          )}
          {!d.loading && d.longPct != null && d.shortPct != null && (
            <div
              className="relative h-2 rounded-full overflow-hidden"
              style={{ background: "oklch(1 0 0 / 0.07)" }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ width: `${d.longPct}%`, background: C_GREEN }}
              />
            </div>
          )}
          {!d.loading && (
            <div
              className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit"
              style={{
                background:
                  ls.signal === "bullish"
                    ? "oklch(0.723 0.185 150 / 0.10)"
                    : ls.signal === "bearish"
                      ? "oklch(0.637 0.220 25 / 0.10)"
                      : "oklch(0.155 0.020 240)",
                color:
                  ls.signal === "bullish"
                    ? C_GREEN
                    : ls.signal === "bearish"
                      ? C_RED
                      : C_DIM,
              }}
            >
              {ls.text}
            </div>
          )}
          <div className="text-[10px] italic" style={{ color: C_DIM }}>
            {">1.2 = crowded longs (bearish). <0.8 = crowded shorts (bullish)."}
          </div>
        </div>

        {/* Taker Buy/Sell Ratio */}
        <MetricCard
          label="Taker Buy/Sell Ratio"
          sublabel="Market order flow — BTCUSDT"
          icon={<Activity className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={
            d.takerBuySellRatio != null
              ? d.takerBuySellRatio.toFixed(3)
              : "Unavailable"
          }
          subtitle={
            d.takerBuySellRatio != null
              ? `${(d.takerBuySellRatio * 100).toFixed(1)}% buy taker ratio`
              : undefined
          }
          signal={ts.signal}
          signalText={ts.text}
          badge="Binance"
        />

        {/* Put/Call Ratio */}
        <MetricCard
          label="Options Put/Call Ratio"
          sublabel="BTC options volume (Deribit)"
          icon={<BarChart2 className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={
            d.putCallRatio != null ? d.putCallRatio.toFixed(3) : "Unavailable"
          }
          subtitle={
            d.putCallRatio != null
              ? `${d.putCallRatio > 1 ? "Puts dominant" : "Calls dominant"}`
              : undefined
          }
          signal={pc.signal}
          signalText={pc.text}
          badge="Deribit"
        />

        {/* BTC Volume Card */}
        <div
          className="rounded-xl p-4 flex flex-col gap-2 min-w-0"
          style={CARD_STYLE}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.785 0.135 200 / 0.12)",
                color: C_CYAN,
              }}
            >
              <Bitcoin className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: C_FG }}>
                {d.btcData.name}
              </div>
              <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
                {d.btcData.symbol}
              </div>
            </div>
          </div>
          {d.loading ? (
            <Skeleton
              className="h-8 w-24 rounded"
              style={{ background: "oklch(1 0 0 / 0.06)" }}
            />
          ) : (
            <div
              className="font-mono font-bold text-lg"
              style={{ color: C_FG }}
            >
              {d.btcData.price != null
                ? `$${d.btcData.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "Unavailable"}
            </div>
          )}
          {!d.loading && (
            <div className="flex gap-2 text-[10px] font-mono">
              <span style={{ color: (d.btcData.change1h ?? 0) >= 0 ? C_GREEN : C_RED }}>
                1h: {(d.btcData.change1h ?? 0).toFixed(2)}%
              </span>
              <span style={{ color: (d.btcData.change24h ?? 0) >= 0 ? C_GREEN : C_RED }}>
                24h: {(d.btcData.change24h ?? 0).toFixed(2)}%
              </span>
              <span style={{ color: (d.btcData.change7d ?? 0) >= 0 ? C_GREEN : C_RED }}>
                7d: {(d.btcData.change7d ?? 0).toFixed(2)}%
              </span>
            </div>
          )}
          {!d.loading && d.btcData.marketCap != null && (
            <div className="text-[10px] font-mono" style={{ color: C_MID }}>
              Cap: {fmtBigNum(d.btcData.marketCap)}
            </div>
          )}
          {!d.loading && d.btcData.volume24h != null && (
            <div className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit" style={{ background: "oklch(0.155 0.020 240)", color: C_CYAN }}>
              Vol 24h: {fmtBigNum(d.btcData.volume24h)}
            </div>
          )}
        </div>

        {/* ETH Volume Card */}
        <div
          className="rounded-xl p-4 flex flex-col gap-2 min-w-0"
          style={CARD_STYLE}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.620 0.140 280 / 0.12)",
                color: "oklch(0.720 0.140 280)",
              }}
            >
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: C_FG }}>
                {d.ethData.name}
              </div>
              <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
                {d.ethData.symbol}
              </div>
            </div>
          </div>
          {d.loading ? (
            <Skeleton
              className="h-8 w-24 rounded"
              style={{ background: "oklch(1 0 0 / 0.06)" }}
            />
          ) : (
            <div
              className="font-mono font-bold text-lg"
              style={{ color: C_FG }}
            >
              {d.ethData.price != null
                ? `$${d.ethData.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "Unavailable"}
            </div>
          )}
          {!d.loading && (
            <div className="flex gap-2 text-[10px] font-mono">
              <span style={{ color: (d.ethData.change1h ?? 0) >= 0 ? C_GREEN : C_RED }}>
                1h: {(d.ethData.change1h ?? 0).toFixed(2)}%
              </span>
              <span style={{ color: (d.ethData.change24h ?? 0) >= 0 ? C_GREEN : C_RED }}>
                24h: {(d.ethData.change24h ?? 0).toFixed(2)}%
              </span>
              <span style={{ color: (d.ethData.change7d ?? 0) >= 0 ? C_GREEN : C_RED }}>
                7d: {(d.ethData.change7d ?? 0).toFixed(2)}%
              </span>
            </div>
          )}
          {!d.loading && d.ethData.marketCap != null && (
            <div className="text-[10px] font-mono" style={{ color: C_MID }}>
              Cap: {fmtBigNum(d.ethData.marketCap)}
            </div>
          )}
          {!d.loading && d.ethData.volume24h != null && (
            <div className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit" style={{ background: "oklch(0.155 0.020 240)", color: "oklch(0.720 0.140 280)" }}>
              Vol 24h: {fmtBigNum(d.ethData.volume24h)}
            </div>
          )}
        </div>
      </div>

      {/* Derivatives info box */}
      <div
        className="mt-3 rounded-lg p-3 flex gap-2.5"
        style={{
          background: "oklch(0.785 0.135 200 / 0.06)",
          border: "1px solid oklch(0.785 0.135 200 / 0.15)",
        }}
      >
        <TrendingDown
          className="w-3.5 h-3.5 shrink-0 mt-0.5"
          style={{ color: C_CYAN }}
        />
        <p className="text-[11px]" style={{ color: C_MID }}>
          <span className="font-semibold" style={{ color: C_CYAN }}>
            Derivatives signals are contrarian:
          </span>{" "}
          Crowded positions (too many longs or shorts) historically precede
          reversals. Use alongside funding rate and on-chain data for
          confirmation.
        </p>
      </div>
    </section>
  );
}

// =========================================================
// SECTION 3: MARKET SENTIMENT (Finnhub)
// =========================================================

interface RecommendationPeriod {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface NewsSentimentData {
  buzz: {
    articlesInLastWeek: number;
    buzz: number;
    weeklyAverage: number;
  };
  sectorAverageBullishPercent: number;
  sectorAverageNewsScore: number;
  sentiment: {
    bearishPercent: number;
    bullishPercent: number;
  };
  symbol: string;
}

interface SocialSentimentPoint {
  atTime: string;
  mention: number;
  positiveScore: number;
  negativeScore: number;
  positiveMention: number;
  negativeMention: number;
  score: number;
}

const CRYPTO_PROXIES = [
  { symbol: "MSTR", name: "MicroStrategy", type: "BTC" },
  { symbol: "COIN", name: "Coinbase", type: "Crypto" },
  { symbol: "HOOD", name: "Robinhood", type: "Crypto" },
];

function useSentimentData(symbol: string) {
  const [state, setState] = useState({
    recommendations: [] as RecommendationPeriod[],
    newsSentiment: null as NewsSentimentData | null,
    socialSentiment: [] as SocialSentimentPoint[],
    loading: true,
  });
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";

    try {
      const recRes = await window.fetch(`${BACKEND_API}/api/analysis/recommendations/${symbol}`);
      if (recRes.ok) {
        const recData = await recRes.json();
        if (mountedRef.current) {
          setState((prev) => ({ ...prev, recommendations: recData.slice(0, 4), loading: false }));
        }
      }
    } catch { /* ignore */ }

    try {
      const newsRes = await window.fetch(`${BACKEND_API}/api/analysis/news-sentiment/${symbol}`);
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        if (mountedRef.current) setState((prev) => ({ ...prev, newsSentiment: newsData }));
      }
    } catch { /* ignore */ }

    try {
      const socialRes = await window.fetch(`${BACKEND_API}/api/analysis/social-sentiment/${symbol}`);
      if (socialRes.ok) {
        const socialData = await socialRes.json();
        if (mountedRef.current) setState((prev) => ({ ...prev, socialSentiment: socialData.data?.slice(-24) || [] }));
      }
    } catch { /* ignore */ }
  }, [symbol]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    const timer = setInterval(fetch, 5 * 60_000);
    return () => { mountedRef.current = false; clearInterval(timer); };
  }, [fetch]);

  return state;
}

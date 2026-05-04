import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Users, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { C_GREEN, C_RED, C_YELLOW, C_CYAN, C_FG, C_DIM, C_MID } from "@/lib/analysisConstants";
import { SectionHeader } from "@/components/analysis/common/SectionHeader";

interface RecommendationPeriod {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface NewsSentimentData {
  buzz: { articlesInLastWeek: number; buzz: number; weeklyAverage: number };
  sentiment: { bearishPercent: number; bullishPercent: number };
}

interface SocialSentimentPoint {
  atTime: string;
  mention: number;
  positiveMention: number;
  negativeMention: number;
  score: number;
}

const CRYPTO_PROXIES = [
  { symbol: "MSTR", name: "MicroStrategy" },
  { symbol: "COIN", name: "Coinbase" },
  { symbol: "HOOD", name: "Robinhood" },
];

function useSentimentData(symbol: string) {
  const [state, setState] = useState({
    recommendations: [] as RecommendationPeriod[],
    newsSentiment: null as NewsSentimentData | null,
    socialSentiment: [] as SocialSentimentPoint[],
    loading: true,
  });
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
    try {
      const recRes = await window.fetch(`${BACKEND_API}/api/analysis/recommendations/${symbol}`);
      if (recRes.ok) {
        const recData = await recRes.json();
        if (mountedRef.current) setState((prev) => ({ ...prev, recommendations: recData.slice(0, 4), loading: false }));
      }
    } catch {}
    try {
      const newsRes = await window.fetch(`${BACKEND_API}/api/analysis/news-sentiment/${symbol}`);
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        if (mountedRef.current) setState((prev) => ({ ...prev, newsSentiment: newsData }));
      }
    } catch {}
    try {
      const socialRes = await window.fetch(`${BACKEND_API}/api/analysis/social-sentiment/${symbol}`);
      if (socialRes.ok) {
        const socialData = await socialRes.json();
        if (mountedRef.current) setState((prev) => ({ ...prev, socialSentiment: socialData.data?.slice(-24) || [] }));
      }
    } catch {}
  }, [symbol]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    const timer = setInterval(fetchData, 5 * 60_000);
    return () => { mountedRef.current = false; clearInterval(timer); };
  }, [fetchData]);

  return state;
}

export function AnalystRecommendations({ symbol }: { symbol: string }) {
  const { recommendations, loading } = useSentimentData(symbol);
  const latest = recommendations[0];
  const total = latest ? latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell : 0;
  const bullishPct = total > 0 ? ((latest?.strongBuy || 0) + (latest?.buy || 0)) / total * 100 : 0;
  const bearishPct = total > 0 ? ((latest?.sell || 0) + (latest?.strongSell || 0)) / total * 100 : 0;

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "oklch(0.155 0.020 240)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "oklch(0.785 0.135 200 / 0.12)", color: C_CYAN }}>
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: C_FG }}>{symbol} Analyst Ratings</div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>Wall Street consensus</div>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "oklch(0.785 0.135 200 / 0.10)", color: C_CYAN, border: "1px solid oklch(0.785 0.135 200 / 0.25)" }}>Finnhub</span>
      </div>
      {loading ? (
        <Skeleton className="h-16 w-full rounded-lg" style={{ background: "oklch(1 0 0 / 0.06)" }} />
      ) : total > 0 ? (
        <>
          <div className="flex gap-1 h-3 rounded-full overflow-hidden">
            {latest.strongBuy > 0 && <div style={{ width: `${(latest.strongBuy / total) * 100}%`, background: C_GREEN }} />}
            {latest.buy > 0 && <div style={{ width: `${(latest.buy / total) * 100}%`, background: "oklch(0.720 0.150 160)" }} />}
            {latest.hold > 0 && <div style={{ width: `${(latest.hold / total) * 100}%`, background: C_YELLOW }} />}
            {latest.sell > 0 && <div style={{ width: `${(latest.sell / total) * 100}%`, background: "oklch(0.700 0.150 40)" }} />}
            {latest.strongSell > 0 && <div style={{ width: `${(latest.strongSell / total) * 100}%`, background: C_RED }} />}
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            {latest.strongBuy > 0 && <span style={{ color: C_GREEN }}>● Strong Buy: {latest.strongBuy}</span>}
            {latest.buy > 0 && <span style={{ color: "oklch(0.720 0.150 160)" }}>● Buy: {latest.buy}</span>}
            {latest.hold > 0 && <span style={{ color: C_YELLOW }}>● Hold: {latest.hold}</span>}
            {latest.sell > 0 && <span style={{ color: "oklch(0.700 0.150 40)" }}>● Sell: {latest.sell}</span>}
            {latest.strongSell > 0 && <span style={{ color: C_RED }}>● Strong Sell: {latest.strongSell}</span>}
          </div>
          <div className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit" style={{ background: bullishPct > bearishPct ? `${C_GREEN} / 0.10` : bearishPct > bullishPct ? `${C_RED} / 0.10` : "oklch(0.550 0.015 240 / 0.10)", color: bullishPct > bearishPct ? C_GREEN : bearishPct > bullishPct ? C_RED : "oklch(0.600 0.015 240)" }}>
            {bullishPct > bearishPct ? `Bullish consensus (${bullishPct.toFixed(0)}% buy)` : bearishPct > bullishPct ? `Bearish consensus (${bearishPct.toFixed(0)}% sell)` : "Neutral consensus"}
          </div>
        </>
      ) : <div className="text-[11px]" style={{ color: C_DIM }}>No analyst data</div>}
    </div>
  );
}

export function NewsSentimentCard({ symbol }: { symbol: string }) {
  const { newsSentiment, loading } = useSentimentData(symbol);
  const bullish = newsSentiment?.sentiment?.bullishPercent ?? 0;
  const bearish = newsSentiment?.sentiment?.bearishPercent ?? 0;
  const buzz = newsSentiment?.buzz?.buzz ?? 0;
  const articles = newsSentiment?.buzz?.articlesInLastWeek ?? 0;

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "oklch(0.155 0.020 240)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "oklch(0.820 0.160 90 / 0.12)", color: C_YELLOW }}>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: C_FG }}>{symbol} News Sentiment</div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>Media buzz & sentiment</div>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "oklch(0.820 0.160 90 / 0.10)", color: C_YELLOW, border: "1px solid oklch(0.820 0.160 90 / 0.25)" }}>Finnhub</span>
      </div>
      {loading ? (
        <Skeleton className="h-12 w-full rounded-lg" style={{ background: "oklch(1 0 0 / 0.06)" }} />
      ) : newsSentiment ? (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[10px] mb-1" style={{ color: C_DIM }}>Bullish {bullish.toFixed(0)}%</div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.08)" }}>
                <div style={{ width: `${bullish}%`, background: C_GREEN, height: "100%" }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] mb-1" style={{ color: C_DIM }}>Bearish {bearish.toFixed(0)}%</div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.08)" }}>
                <div style={{ width: `${bearish}%`, background: C_RED, height: "100%" }} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 text-[10px]">
            <div><span style={{ color: C_DIM }}>Articles: </span><span className="font-mono font-semibold" style={{ color: C_FG }}>{articles}</span></div>
            <div><span style={{ color: C_DIM }}>Buzz: </span><span className="font-mono font-semibold" style={{ color: buzz > 1 ? C_GREEN : buzz < 0.8 ? C_RED : C_FG }}>{buzz.toFixed(2)}x</span></div>
          </div>
          <div className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit" style={{ background: bullish > bearish + 10 ? `${C_GREEN} / 0.10` : bearish > bullish + 10 ? `${C_RED} / 0.10` : "oklch(0.550 0.015 240 / 0.10)", color: bullish > bearish + 10 ? C_GREEN : bearish > bullish + 10 ? C_RED : "oklch(0.600 0.015 240)" }}>
            {bullish > bearish + 10 ? "Positive news sentiment" : bearish > bullish + 10 ? "Negative news sentiment" : "Neutral news sentiment"}
          </div>
        </>
      ) : <div className="text-[11px]" style={{ color: C_DIM }}>No sentiment data</div>}
    </div>
  );
}

export function SocialSentimentCard({ symbol }: { symbol: string }) {
  const { socialSentiment, loading } = useSentimentData(symbol);
  const totalMentions = socialSentiment.reduce((sum, p) => sum + p.mention, 0);
  const avgScore = socialSentiment.length > 0 ? socialSentiment.reduce((sum, p) => sum + p.score, 0) / socialSentiment.length : 0;
  const positiveMentions = socialSentiment.reduce((sum, p) => sum + p.positiveMention, 0);
  const negativeMentions = socialSentiment.reduce((sum, p) => sum + p.negativeMention, 0);

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "oklch(0.155 0.020 240)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "oklch(0.723 0.185 150 / 0.12)", color: C_GREEN }}>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: C_FG }}>{symbol} Social Sentiment</div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>Reddit & Twitter</div>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "oklch(0.723 0.185 150 / 0.10)", color: C_GREEN, border: "1px solid oklch(0.723 0.185 150 / 0.25)" }}>Finnhub</span>
      </div>
      {loading ? (
        <Skeleton className="h-12 w-full rounded-lg" style={{ background: "oklch(1 0 0 / 0.06)" }} />
      ) : socialSentiment.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2 text-center" style={{ background: "oklch(0.723 0.185 150 / 0.08)" }}>
              <div className="text-[10px]" style={{ color: C_DIM }}>Mentions (24h)</div>
              <div className="font-mono font-bold" style={{ color: C_GREEN }}>{totalMentions.toLocaleString()}</div>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ background: avgScore > 0 ? "oklch(0.723 0.185 150 / 0.08)" : avgScore < 0 ? "oklch(0.637 0.220 25 / 0.08)" : "oklch(0.550 0.015 240 / 0.08)" }}>
              <div className="text-[10px]" style={{ color: C_DIM }}>Avg Score</div>
              <div className="font-mono font-bold" style={{ color: avgScore > 0 ? C_GREEN : avgScore < 0 ? C_RED : C_FG }}>{avgScore > 0 ? "+" : ""}{avgScore.toFixed(3)}</div>
            </div>
          </div>
          <div className="flex justify-between text-[10px]"><span style={{ color: C_GREEN }}>+{positiveMentions}</span><span style={{ color: C_DIM }}>split</span><span style={{ color: C_RED }}>-{negativeMentions}</span></div>
          <div className="flex h-2 rounded-full overflow-hidden">
            <div style={{ width: `${(positiveMentions / (positiveMentions + negativeMentions || 1)) * 100}%`, background: C_GREEN }} />
            <div style={{ width: `${(negativeMentions / (positiveMentions + negativeMentions || 1)) * 100}%`, background: C_RED }} />
          </div>
          <div className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit" style={{ background: positiveMentions > negativeMentions * 1.5 ? `${C_GREEN} / 0.10` : negativeMentions > positiveMentions * 1.5 ? `${C_RED} / 0.10` : "oklch(0.550 0.015 240 / 0.10)", color: positiveMentions > negativeMentions * 1.5 ? C_GREEN : negativeMentions > positiveMentions * 1.5 ? C_RED : "oklch(0.600 0.015 240)" }}>
            {positiveMentions > negativeMentions * 1.5 ? "Bullish social sentiment" : negativeMentions > positiveMentions * 1.5 ? "Bearish social sentiment" : "Mixed social sentiment"}
          </div>
        </>
      ) : <div className="text-[11px]" style={{ color: C_DIM }}>No social data</div>}
    </div>
  );
}

export function FinnhubSentimentSection() {
  return (
    <section data-ocid="analysis.section.sentiment" className="mb-8">
      <SectionHeader
        title="Market Sentiment"
        subtitle="Analyst ratings, news & social for crypto-correlated equities"
        badge="Finnhub"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {CRYPTO_PROXIES.map((proxy) => (
          <div key={proxy.symbol} className="contents">
            <AnalystRecommendations symbol={proxy.symbol} />
            <NewsSentimentCard symbol={proxy.symbol} />
            <SocialSentimentCard symbol={proxy.symbol} />
          </div>
        ))}
      </div>
    </section>
  );
}

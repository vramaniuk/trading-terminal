import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
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


const CRYPTO_PROXIES = [
  { symbol: "MSTR", name: "MicroStrategy" },
  { symbol: "COIN", name: "Coinbase" },
  { symbol: "HOOD", name: "Robinhood" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "NVDA", name: "Nvidia" },
];

function useSentimentData(symbol: string) {
  const [state, setState] = useState({
    recommendations: [] as RecommendationPeriod[],
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
  }, [symbol]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    const timer = setInterval(fetchData, 5 * 60_000);
    return () => { mountedRef.current = false; clearInterval(timer); };
  }, [fetchData]);

  return state;
}

export function AnalystRecommendations({ symbol, name }: { symbol: string; name: string }) {
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
            <div className="text-xs font-semibold" style={{ color: C_FG }}>{name}</div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>{symbol} · Wall Street</div>
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


export function FinnhubSentimentSection() {
  return (
    <section data-ocid="analysis.section.sentiment" className="mb-8">
      <SectionHeader
        title="Market Sentiment"
        subtitle="Analyst ratings for crypto-correlated equities"
        badge="Finnhub"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {CRYPTO_PROXIES.map((proxy) => (
          <AnalystRecommendations key={proxy.symbol} symbol={proxy.symbol} name={proxy.name} />
        ))}
      </div>
    </section>
  );
}

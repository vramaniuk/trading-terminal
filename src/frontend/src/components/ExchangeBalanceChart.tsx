import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface BalanceDataPoint {
  date: string;
  value: number;
}

interface PercentageChanges {
  day24: number;
  day7: number;
  day30: number;
}

interface ExchangeBalanceChartProps {
  exchange: "binance" | "okx" | "bybit";
  asset: "btc" | "eth";
  days?: number;
}

const EXCHANGE_COLORS = {
  binance: "oklch(0.637 0.220 25)",
  okx: "oklch(0.723 0.185 150)",
  bybit: "oklch(0.785 0.135 200)",
};

const EXCHANGE_LABELS = {
  binance: "Binance",
  okx: "OKX",
  bybit: "Bybit",
};

const ASSET_LABELS = {
  btc: "BTC",
  eth: "ETH",
};

function formatValue(value: number, asset: "btc" | "eth"): string {
  if (asset === "btc") {
    return `${value.toLocaleString()} BTC`;
  }
  return `${value.toLocaleString()} ETH`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calculatePercentageChanges(data: BalanceDataPoint[]): PercentageChanges {
  if (data.length < 2) {
    return { day24: 0, day7: 0, day30: 0 };
  }

  const latest = data[data.length - 1].value;
  const day24Index = Math.max(0, data.length - 2);
  const day7Index = Math.max(0, data.length - 8);
  const day30Index = Math.max(0, data.length - 31);

  const day24Change = data[day24Index].value
    ? ((latest - data[day24Index].value) / data[day24Index].value) * 100
    : 0;
  const day7Change = data[day7Index].value
    ? ((latest - data[day7Index].value) / data[day7Index].value) * 100
    : 0;
  const day30Change = data[day30Index].value
    ? ((latest - data[day30Index].value) / data[day30Index].value) * 100
    : 0;

  return { day24: day24Change, day7: day7Change, day30: day30Change };
}

export function ExchangeBalanceChart({
  exchange,
  asset,
  days = 30,
}: ExchangeBalanceChartProps) {
  const [data, setData] = useState<BalanceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await fetch(
        `${BACKEND_API}/api/analysis/exchange-balances?exchange=${exchange}&asset=${asset}&days=${days}`,
      );
      if (!res.ok) throw new Error("Failed to fetch data");
      const result = await res.json();
      setData(result.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [exchange, asset, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartConfig = {
    value: {
      label: `${EXCHANGE_LABELS[exchange]} ${ASSET_LABELS[asset]} Balance`,
      color: EXCHANGE_COLORS[exchange],
    },
  };

  const percentageChanges = calculatePercentageChanges(data);
  const currentValue = data.length > 0 ? data[data.length - 1].value : 0;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className="text-xs font-semibold"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            {EXCHANGE_LABELS[exchange]} {ASSET_LABELS[asset]} Balance
          </div>
          <div
            className="text-[10px]"
            style={{ color: "oklch(0.450 0.015 240)" }}
          >
            Last {days} days
          </div>
        </div>
        <div
          className="w-3 h-3 rounded-full"
          style={{ background: EXCHANGE_COLORS[exchange] }}
        />
      </div>

      {/* Current balance and percentage changes */}
      {!loading && !error && data.length > 0 && (
        <div className="flex flex-col gap-2">
          <div
            className="text-lg font-mono font-bold"
            style={{ color: "oklch(0.960 0.010 240)" }}
          >
            {formatValue(currentValue, asset)}
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "24h", value: percentageChanges.day24 },
              { label: "7d", value: percentageChanges.day7 },
              { label: "30d", value: percentageChanges.day30 },
            ].map((item) => {
              const isPositive = item.value >= 0;
              const color = isPositive
                ? "oklch(0.723 0.185 150)"
                : "oklch(0.637 0.220 25)";
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{
                    background: `${color} / 0.15`,
                    color,
                    border: `1px solid ${color} / 0.3`,
                  }}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span className="font-mono">
                    {item.label}: {isPositive ? "+" : ""}
                    {item.value.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <Skeleton
          className="h-40 w-full rounded-lg"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : error ? (
        <div
          className="h-40 flex items-center justify-center text-xs"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          Failed to load data
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-40 w-full">
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "oklch(0.450 0.015 240)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "oklch(0.450 0.015 240)" }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatDate(label as string)}
                  formatter={(value) => [
                    formatValue(value as number, asset),
                    "Balance",
                  ]}
                />
              }
            />
            <Line
              dataKey="value"
              type="monotone"
              stroke={EXCHANGE_COLORS[exchange]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}

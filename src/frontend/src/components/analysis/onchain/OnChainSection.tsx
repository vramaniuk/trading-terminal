import { SectionHeader } from "@/components/analysis/common/SectionHeader";
import { MetricCard } from "@/components/analysis/common/MetricCard";
import { useOnChainData } from "@/hooks/analysis/useOnChainData";
import { HashrateChart } from "./HashrateChart";
import { DifficultyChart } from "./DifficultyChart";
import { fmtBigNum, fmtCount } from "@/lib/formatters";
import { Users, Hash, Activity, Bitcoin, Layers, DollarSign } from "lucide-react";

export function OnChainSection() {
  const d = useOnChainData();
  const supplyPct = d.circulatingSupplyBTC != null ? (d.circulatingSupplyBTC / 21_000_000) * 100 : null;

  return (
    <section data-ocid="analysis.section.onchain">
      <SectionHeader
        title="On-Chain Data"
        subtitle="Bitcoin network health metrics"
        badge="blockchain.info · mempool.space"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="Active Addresses (24h)"
          sublabel="Unique BTC addresses active"
          icon={<Users className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={d.activeAddresses != null ? fmtCount(d.activeAddresses) : "Unavailable"}
          signal={d.activeAddresses == null ? "unavailable" : d.activeAddresses > 800_000 ? "bullish" : d.activeAddresses > 400_000 ? "neutral" : "bearish"}
          signalText={d.activeAddresses == null ? "Data unavailable" : d.activeAddresses > 800_000 ? "High network activity — bullish" : d.activeAddresses > 400_000 ? "Moderate activity — neutral" : "Low activity — bearish"}
          badge="blockchain.info"
        />

        <MetricCard
          label="Transactions (24h)"
          sublabel="On-chain confirmed transactions"
          icon={<Hash className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={d.txCount24h != null ? fmtCount(d.txCount24h) : "Unavailable"}
          signal={d.txCount24h == null ? "unavailable" : d.txCount24h > 350_000 ? "bullish" : d.txCount24h > 200_000 ? "neutral" : "bearish"}
          signalText={d.txCount24h == null ? "Data unavailable" : d.txCount24h > 350_000 ? "High usage — strong demand" : d.txCount24h > 200_000 ? "Normal usage" : "Low usage — reduced demand"}
          badge="blockchain.info"
        />

        <MetricCard
          label="Hash Rate"
          sublabel="BTC mining power (24h avg)"
          icon={<Activity className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={d.hashRateEH != null ? `${d.hashRateEH.toFixed(2)} EH/s` : "Unavailable"}
          signal={d.hashRateEH == null ? "unavailable" : d.hashRateEH > 650 ? "bullish" : d.hashRateEH > 500 ? "neutral" : "bearish"}
          signalText={d.hashRateEH == null ? "Data unavailable" : d.hashRateEH > 650 ? "Rising hash rate — strong miner confidence" : d.hashRateEH > 500 ? "Stable hash rate — neutral" : "Declining hash rate — miner exit risk"}
          badge="blockchain.info"
        />

        <MetricCard
          label="Circulating Supply"
          sublabel="Total BTC mined to date"
          icon={<Bitcoin className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={d.circulatingSupplyBTC != null ? `${(d.circulatingSupplyBTC / 1_000_000).toFixed(4)}M BTC` : "Unavailable"}
          subtitle={supplyPct != null ? `${supplyPct.toFixed(2)}% of 21M max supply` : undefined}
          signal={d.circulatingSupplyBTC == null ? "unavailable" : "neutral"}
          signalText={d.circulatingSupplyBTC == null ? "Data unavailable" : "Informational — fixed 21M cap"}
          badge="blockchain.info"
        />

        <MetricCard
          label="Mempool Size"
          sublabel="Pending transaction queue"
          icon={<Layers className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={d.mempoolCount != null ? `${fmtCount(d.mempoolCount)} txs` : "Unavailable"}
          subtitle={d.mempoolVsizeMB != null ? `${d.mempoolVsizeMB.toFixed(1)} MB pending` : undefined}
          signal={d.mempoolCount == null ? "unavailable" : d.mempoolCount > 100_000 ? "warning" : d.mempoolCount > 30_000 ? "neutral" : "bullish"}
          signalText={d.mempoolCount == null ? "Data unavailable" : d.mempoolCount > 100_000 ? "High congestion — fees elevated" : d.mempoolCount > 30_000 ? "Moderate congestion" : "Low congestion — fees normal"}
          badge="mempool.space"
        />

        <MetricCard
          label="Estimated TX Volume"
          sublabel="On-chain USD value moved"
          icon={<DollarSign className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={d.netflowVol != null ? fmtBigNum(d.netflowVol) : "Unavailable"}
          signal={d.netflowVol == null ? "unavailable" : d.netflowVol > 5_000_000_000 ? "bullish" : d.netflowVol > 1_000_000_000 ? "neutral" : "bearish"}
          signalText={d.netflowVol == null ? "Data unavailable" : d.netflowVol > 5_000_000_000 ? "Large value transfers — high activity" : d.netflowVol > 1_000_000_000 ? "Normal on-chain flow" : "Low on-chain movement"}
          badge="blockchain.info"
        />

        <HashrateChart />
        <DifficultyChart />
      </div>
    </section>
  );
}

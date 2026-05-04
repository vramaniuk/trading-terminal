import { SectionHeader } from "@/components/analysis/common/SectionHeader";
import { VolumeChart } from "./VolumeChart";

export function VolumeSection() {
  return (
    <section data-ocid="analysis.section.volume" className="mb-8">
      <SectionHeader
        title="Global Spot Volume"
        subtitle="24h trading volume aggregated across all major exchanges"
        badge="CoinGecko"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <VolumeChart asset="bitcoin" title="BTC Volume" color="oklch(0.820 0.160 60)" />
        <VolumeChart asset="ethereum" title="ETH Volume" color="oklch(0.785 0.135 280)" />
      </div>
    </section>
  );
}

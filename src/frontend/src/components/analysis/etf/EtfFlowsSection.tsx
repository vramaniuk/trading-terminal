import { SectionHeader } from "@/components/analysis/common/SectionHeader";
import { EtfNetFlowChart } from "./EtfNetFlowChart";

export function EtfFlowsSection() {
  return (
    <section data-ocid="analysis.section.etf_flows" className="mb-8">
      <SectionHeader
        title="US spot ETF — daily net flows"
        subtitle="USD net flow from bitbo.io (BTC)"
        badge="Bitbo"
      />
      <div className="grid grid-cols-1 gap-3">
        <EtfNetFlowChart asset="btc" title="Bitcoin (BTC) spot ETFs" accent="oklch(0.820 0.160 60)" />
      </div>
    </section>
  );
}

# Analysis Components Refactoring

## New Folder Structure

```
src/
├── components/
│   └── analysis/
│       ├── index.ts                    # Main exports
│       ├── common/                     # Shared components
│       │   ├── SectionHeader.tsx
│       │   ├── MetricCard.tsx
│       │   └── FearGreedGauge.tsx
│       ├── onchain/                    # On-chain metrics
│       │   ├── OnChainSection.tsx
│       │   ├── HashrateChart.tsx
│       │   └── DifficultyChart.tsx
│       ├── sentiment/                  # Market sentiment
│       │   └── FinnhubSentiment.tsx
│       ├── volume/                     # Volume metrics
│       │   ├── VolumeSection.tsx
│       │   └── VolumeChart.tsx
│       ├── etf/                        # ETF flows
│       │   ├── EtfFlowsSection.tsx
│       │   └── EtfNetFlowChart.tsx
│       ├── derivatives/                # Derivatives metrics (TODO)
│       └── macro/                      # Macro markets (TODO)
├── hooks/
│   └── analysis/
│       ├── index.ts
│       ├── useCountdown.ts
│       ├── useOnChainData.ts
│       ├── useChartData.ts
│       ├── useVolumeData.ts
│       └── useEtfFlows.ts
└── lib/
    ├── analysisConstants.ts            # Shared constants
    └── formatters.ts                   # Formatting utilities
```

## Migration Guide

### Old → New Imports

```typescript
// Old (from AnalysisMetricSections.tsx)
import { OnChainSection, MetricCard } from "./AnalysisMetricSections";

// New (from analysis folder)
import { OnChainSection, MetricCard } from "./analysis";
import { useOnChainData } from "@/hooks/analysis";
```

### Shared Constants

```typescript
// Use from lib/analysisConstants.ts
import { C_GREEN, C_RED, C_CYAN, C_FG, C_DIM, CARD_STYLE } from "@/lib/analysisConstants";
```

### Formatters

```typescript
// Use from lib/formatters.ts
import { fmtUsd, fmtCompact, fmtBigNum, fmtCount, fmtRate } from "@/lib/formatters";
```

## Completed Refactoring

### ✅ On-Chain Section
- `OnChainSection` → `analysis/onchain/OnChainSection.tsx`
- `useOnChainData` → `hooks/analysis/useOnChainData.ts`
- `HashrateChart` → `analysis/onchain/HashrateChart.tsx`
- `DifficultyChart` → `analysis/onchain/DifficultyChart.tsx`
- Chart data hooks → `hooks/analysis/useChartData.ts`

### ✅ Volume Section
- `VolumeSection` → `analysis/volume/VolumeSection.tsx`
- `VolumeChart` → `analysis/volume/VolumeChart.tsx`
- `useVolumeChart` → `hooks/analysis/useVolumeData.ts`

### ✅ ETF Flows Section
- `EtfFlowsSection` → `analysis/etf/EtfFlowsSection.tsx`
- `EtfNetFlowChart` → `analysis/etf/EtfNetFlowChart.tsx`
- `useEtfFlows` → `hooks/analysis/useEtfFlows.ts`

### ✅ Sentiment Section (Finnhub)
- `FinnhubSentimentSection` → `analysis/sentiment/FinnhubSentiment.tsx`
- `AnalystRecommendations` (sub-component)
- `NewsSentimentCard` (sub-component)
- `SocialSentimentCard` (sub-component)

### ✅ Common Components
- `SectionHeader` → `analysis/common/SectionHeader.tsx`
- `MetricCard` → `analysis/common/MetricCard.tsx`
- `FearGreedGauge` → `analysis/common/FearGreedGauge.tsx`

## TODO Future Refactoring

### Derivatives Section
- Extract `DerivativesSection` to `analysis/derivatives/DerivativesSection.tsx`
- Create sub-components for each card type (FundingCard, OICard, etc.)
- Create `hooks/analysis/useDerivativesData.ts`

### AnalysisPanel Refactoring
The `AnalysisPanel.tsx` file contains many components that should be split:

1. **Hooks to extract:**
   - `useBinanceVolume` → `hooks/analysis/useBinanceVolume.ts`
   - `useMarketCapMetrics` → `hooks/analysis/useMarketCapMetrics.ts`
   - `useTopMovers` → `hooks/analysis/useTopMovers.ts`
   - `useGlobalSpotVolume` → `hooks/analysis/useGlobalSpotVolume.ts`
   - `useGlobalOI` → `hooks/analysis/useGlobalOI.ts`

2. **Components to extract:**
   - `FearGreedGauge` → `analysis/common/FearGreedGauge.tsx` ✅ Done
   - `RangeBar` → `analysis/common/RangeBar.tsx`
   - `MacroCard` → `analysis/macro/MacroCard.tsx`
   - `FundingCard` → `analysis/derivatives/FundingCard.tsx`
   - `OICard`/`OISparkline` → `analysis/derivatives/OICard.tsx`
   - `VolumeCard` → `analysis/volume/VolumeCard.tsx`
   - `MarketCapCard` → `analysis/macro/MarketCapCard.tsx`
   - `GlobalVolumeCard` → `analysis/volume/GlobalVolumeCard.tsx`
   - `GlobalOICard` → `analysis/derivatives/GlobalOICard.tsx`
   - `TopMoversSection` → `analysis/movers/TopMoversSection.tsx`

## Benefits of New Structure

1. **Single Responsibility**: Each component has one clear purpose
2. **Reusability**: Common components can be easily imported
3. **Testability**: Smaller components are easier to unit test
4. **Maintainability**: Changes are localized to specific feature folders
5. **Discoverability**: Clear folder structure makes finding components easier
6. **Code Splitting**: Can lazy load sections for better performance

## Best Practices Followed

1. **Co-location**: Related components, hooks, and types are kept together
2. **Barrel exports**: `index.ts` files provide clean import paths
3. **Shared utilities**: Common code extracted to `lib/` folder
4. **Type safety**: Interfaces defined alongside components
5. **Hook composition**: Data fetching logic separated from presentation

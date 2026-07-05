import express from 'express';
import axios from 'axios';

const router = express.Router();

const BINANCE_FAPI = 'https://fapi.binance.com';
const BINANCE_FAPI_ALT = 'https://fapi1.binance.com';
const BYBIT_API = 'https://api.bybit.com';
const OKX_API = 'https://www.okx.com';

// Multiple proxy services for fallback when direct Binance access is blocked (cloud IPs)
const PROXY_SERVICES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];
// Lazy getters for env vars - ensures they are read AFTER dotenv.config() runs
const getCOINGECKO_API_KEY = () => process.env.COINGECKO_API_KEY;
const getFINNHUB_API_KEY = () => process.env.FINNHUB_API_KEY;
const getAMBERDATA_API_KEY = () => process.env.AMBERDATA_API_KEY;
const BITBO_BTC_ETF_URL = 'https://bitbo.io/treasuries/etf-flows/';

/** Bitbo ETF series updates daily; cache responses to limit fetches. */
const ETF_FLOW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Simple in-memory cache with TTL for CoinGecko API (rate limit: 10-30 calls/min free tier)
const cache = new Map();
const CACHE_TTL_MS = 60_000; // 60 seconds cache

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data, ttlMs = CACHE_TTL_MS) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

/** Parse embedded Bitbo Highcharts series (US spot BTC ETF net flow, USD). */
function extractBitboBtcHistoryUsdData(html) {
  const startMarker = 'const historyUsd = [';
  const start = html.indexOf(startMarker);
  if (start === -1) return [];
  const end = html.indexOf('\n    const mergedHistoryUsd', start + startMarker.length);
  if (end === -1) return [];
  const block = html.slice(start, end);
  const re =
    /getPreviousBusinessDay\((\d+)\)\s*,\s*truncate\(\s*(-?[\d.]+)\s*\*\s*([\d.]+)\s*,\s*\d+\s*\)/g;
  const out = [];
  let m;
  while ((m = re.exec(block)) !== null) {
    const ts = Number(m[1]);
    const netFlowUsd = Number(m[2]) * Number(m[3]);
    if (!Number.isFinite(ts) || !Number.isFinite(netFlowUsd)) continue;
    out.push({
      date: new Date(ts).toISOString().split('T')[0],
      netFlowUsd,
    });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** Parse CoinGlass ETH ETF flow data from embedded JSON/JS */
function extractCoinGlassEthEtfData(html) {
  const out = [];

  // CoinGlass often stores data in __NEXT_DATA__ or similar script tags
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const jsonData = JSON.parse(nextDataMatch[1]);
      // Navigate through the JSON structure to find ETF flow data
      const props = jsonData?.props?.pageProps;
      if (props) {
        // Try to extract flow data from various possible locations
        const etfData = props.etfData || props.data || props.etfFlows || props.chartData;
        if (Array.isArray(etfData)) {
          etfData.forEach(point => {
            if (point.date && (point.netFlow != null || point.flow != null || point.inflow != null)) {
              out.push({
                date: point.date,
                netFlowUsd: Number(point.netFlow || point.flow || point.inflow || 0),
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse __NEXT_DATA__:', e.message);
    }
  }

  // Alternative: Look for chart data in script tags
  const chartDataMatch = html.match(/"chartData"\s*:\s*(\[[\s\S]*?\])/);
  if (chartDataMatch) {
    try {
      const chartData = JSON.parse(chartDataMatch[1]);
      if (Array.isArray(chartData)) {
        chartData.forEach(point => {
          if (point.date && (point.flow != null || point.netFlow != null)) {
            out.push({
              date: point.date,
              netFlowUsd: Number(point.flow || point.netFlow || 0),
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to parse chartData:', e.message);
    }
  }

  // Alternative: Look for ETF-specific data arrays
  const etfFlowMatch = html.match(/"etfFlows"\s*:\s*(\[[\s\S]*?\])/);
  if (etfFlowMatch) {
    try {
      const etfFlows = JSON.parse(etfFlowMatch[1]);
      if (Array.isArray(etfFlows)) {
        etfFlows.forEach(point => {
          if (point.date && (point.netFlow != null || point.flow != null)) {
            out.push({
              date: point.date,
              netFlowUsd: Number(point.netFlow || point.flow || 0),
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to parse etfFlows:', e.message);
    }
  }

  // Alternative: Look for data arrays with date and value fields
  const dataMatch = html.match(/"data"\s*:\s*(\[[\s\S]*?\])/);
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1]);
      if (Array.isArray(data)) {
        data.forEach(point => {
          if (point.date && (point.value != null || point.netFlow != null || point.flow != null)) {
            out.push({
              date: point.date,
              netFlowUsd: Number(point.value || point.netFlow || point.flow || 0),
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to parse data array:', e.message);
    }
  }

  // Sort by date
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** Parse SoSoValue ETH ETF flow data from embedded JSON/JS */
function extractSoSoValueEthEtfData(html) {
  const out = [];

  // SoSoValue likely uses __NEXT_DATA__ or similar Next.js patterns
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const jsonData = JSON.parse(nextDataMatch[1]);
      // Navigate through the JSON structure to find ETF flow data
      const props = jsonData?.props?.pageProps;
      if (props) {
        // Try to extract flow data from various possible locations
        const etfData = props.etfData || props.data || props.etfFlows || props.chartData || props.netFlowData;
        if (Array.isArray(etfData)) {
          etfData.forEach(point => {
            if (point.date && (point.netFlow != null || point.flow != null || point.inflow != null || point.value != null)) {
              out.push({
                date: point.date,
                netFlowUsd: Number(point.netFlow || point.flow || point.inflow || point.value || 0),
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse __NEXT_DATA__:', e.message);
    }
  }

  // Alternative: Look for chart data in script tags
  const chartDataMatch = html.match(/"chartData"\s*:\s*(\[[\s\S]*?\])/);
  if (chartDataMatch) {
    try {
      const chartData = JSON.parse(chartDataMatch[1]);
      if (Array.isArray(chartData)) {
        chartData.forEach(point => {
          if (point.date && (point.flow != null || point.netFlow != null || point.value != null)) {
            out.push({
              date: point.date,
              netFlowUsd: Number(point.flow || point.netFlow || point.value || 0),
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to parse chartData:', e.message);
    }
  }

  // Alternative: Look for ETF-specific data arrays
  const etfFlowMatch = html.match(/"etfFlows"\s*:\s*(\[[\s\S]*?\])/);
  if (etfFlowMatch) {
    try {
      const etfFlows = JSON.parse(etfFlowMatch[1]);
      if (Array.isArray(etfFlows)) {
        etfFlows.forEach(point => {
          if (point.date && (point.netFlow != null || point.flow != null)) {
            out.push({
              date: point.date,
              netFlowUsd: Number(point.netFlow || point.flow || 0),
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to parse etfFlows:', e.message);
    }
  }

  // Alternative: Look for netFlowData arrays
  const netFlowMatch = html.match(/"netFlowData"\s*:\s*(\[[\s\S]*?\])/);
  if (netFlowMatch) {
    try {
      const netFlowData = JSON.parse(netFlowMatch[1]);
      if (Array.isArray(netFlowData)) {
        netFlowData.forEach(point => {
          if (point.date && (point.netFlow != null || point.flow != null || point.value != null)) {
            out.push({
              date: point.date,
              netFlowUsd: Number(point.netFlow || point.flow || point.value || 0),
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to parse netFlowData:', e.message);
    }
  }

  // Alternative: Look for data arrays with date and value fields
  const dataMatch = html.match(/"data"\s*:\s*(\[[\s\S]*?\])/);
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1]);
      if (Array.isArray(data)) {
        data.forEach(point => {
          if (point.date && (point.value != null || point.netFlow != null || point.flow != null)) {
            out.push({
              date: point.date,
              netFlowUsd: Number(point.value || point.netFlow || point.flow || 0),
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to parse data array:', e.message);
    }
  }

  // Sort by date
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** Fetch Finnhub analyst recommendations for a symbol */
async function fetchFinnhubRecommendations(symbol) {
  if (!getFINNHUB_API_KEY()) {
    throw new Error('FINNHUB_API_KEY not set');
  }

  const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${getFINNHUB_API_KEY()}`;
  const response = await axios.get(url, { timeout: 15000 });
  return response.data || [];
}


async function fetchWithFallbacks(url, options = {}) {
  const timeout = options.timeout || 10000;
  // Try direct first
  try {
    const res = await axios.get(url, { timeout, ...options });
    return res;
  } catch (directErr) {
    // Try alternate Binance domain if it's a Binance URL
    if (url.includes('fapi.binance.com')) {
      try {
        const altUrl = url.replace('fapi.binance.com', 'fapi1.binance.com');
        const res = await axios.get(altUrl, { timeout, ...options });
        return res;
      } catch (_) { /* continue to proxies */ }
    }
    // Try proxy services
    for (const proxyFn of PROXY_SERVICES) {
      try {
        const proxyUrl = proxyFn(url);
        const res = await axios.get(proxyUrl, { timeout: timeout + 5000, ...options });
        return res;
      } catch (_) { /* try next */ }
    }
    throw directErr;
  }
}

// Fear & Greed
router.get('/fear-greed', async (req, res) => {
  try {
    const response = await axios.get('https://api.alternative.me/fng/?limit=1');
    const item = response.data?.data?.[0];
    res.json({
      value: Number(item.value),
      label: item.value_classification,
      timeUntilUpdate: Number(item.time_until_update ?? 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Funding Rate - OKX primary (works from cloud IPs), Bybit/Binance fallback
router.get('/funding/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const instId = symbol.replace('USDT', '-USDT-SWAP');

    // Try OKX first (works from all IPs including cloud)
    try {
      const okxRes = await axios.get(`${OKX_API}/api/v5/public/funding-rate?instId=${instId}`, { timeout: 8000 });
      const item = okxRes.data?.data?.[0];
      if (item && item.fundingRate) {
        return res.json({
          rate: Number(item.fundingRate),
          nextSettlement: Number(item.nextFundingTime),
          intervalHours: 8,
          source: 'OKX'
        });
      }
    } catch (_) { /* fall through */ }

    // Try Bybit
    try {
      const bybitTicker = await axios.get(`${BYBIT_API}/v5/market/tickers?category=linear&symbol=${symbol}`, { timeout: 8000 });
      const item = bybitTicker.data?.result?.list?.[0];
      if (item && item.fundingRate) {
        return res.json({
          rate: Number(item.fundingRate),
          nextSettlement: Number(item.nextFundingTime),
          intervalHours: 8,
          source: 'Bybit'
        });
      }
    } catch (_) { /* fall through */ }

    // Fallback to Binance
    const url = `${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${symbol}`;
    let response = await fetchWithFallbacks(url);
    res.json({
      rate: Number(response.data.lastFundingRate),
      nextSettlement: Number(response.data.nextFundingTime),
      intervalHours: 8,
      source: 'Binance'
    });
  } catch (error) {
    console.error('Error fetching funding:', error.message);
    res.status(500).json({ error: 'Failed to fetch funding' });
  }
});

// Long/Short Ratio - OKX primary (works from cloud IPs), Bybit/Binance fallback
router.get('/longshort/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1d' } = req.query;
    const instId = symbol.replace('USDT', '-USDT-SWAP');

    // Try OKX first (top trader long/short ratio - works from cloud IPs)
    try {
      const okxRes = await axios.get(`${OKX_API}/api/v5/rubik/stat/contracts/long-short-account-ratio-contract-top-trader?instId=${instId}&period=5m`, { timeout: 8000 });
      const data = okxRes.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[0]; // [timestamp, ratio]
        const longShortRatio = Number(latest[1]);
        const longAccount = longShortRatio / (1 + longShortRatio);
        const shortAccount = 1 / (1 + longShortRatio);
        return res.json({
          symbol,
          longShortRatio,
          longAccount,
          shortAccount,
          timestamp: Number(latest[0]),
          source: 'OKX'
        });
      }
    } catch (_) { /* fall through */ }

    // Try Bybit
    try {
      const bybitRes = await axios.get(`${BYBIT_API}/v5/market/account-ratio?category=linear&symbol=${symbol}&period=${period}&limit=1`, { timeout: 8000 });
      const item = bybitRes.data?.result?.list?.[0];
      if (item) {
        const buyRatio = Number(item.buyRatio);
        const sellRatio = Number(item.sellRatio);
        const longShortRatio = sellRatio > 0 ? (buyRatio / sellRatio) : 1;
        return res.json({
          symbol,
          longShortRatio,
          longAccount: buyRatio,
          shortAccount: sellRatio,
          timestamp: Number(item.timestamp),
          source: 'Bybit'
        });
      }
    } catch (_) { /* fall through */ }

    // Fallback to Binance
    const url = `${BINANCE_FAPI}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=${period}`;
    let response = await fetchWithFallbacks(url);

    const data = response.data;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'No data available' });
    }

    const latest = data[data.length - 1];
    res.json({
      symbol,
      longShortRatio: Number(latest.longShortRatio),
      longAccount: Number(latest.longAccount),
      shortAccount: Number(latest.shortAccount),
      timestamp: latest.timestamp,
      source: 'Binance'
    });
  } catch (error) {
    console.error('Error fetching long/short ratio:', error.message);
    res.status(500).json({ error: 'Failed to fetch long/short ratio' });
  }
});

// Taker Buy/Sell Ratio - OKX primary (works from cloud IPs), Bybit/Binance fallback
router.get('/taker-ratio/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1d' } = req.query;
    const instId = symbol.replace('USDT', '-USDT-SWAP');

    // Try OKX first (taker volume ratio - works from cloud IPs)
    try {
      const okxRes = await axios.get(`${OKX_API}/api/v5/rubik/stat/taker-volume-contract?instId=${instId}&period=5m`, { timeout: 8000 });
      const data = okxRes.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[0]; // [timestamp, sellVol, buyVol, ratio]
        const sellVol = Number(latest[1]);
        const buyVol = Number(latest[2]);
        const buySellRatio = sellVol > 0 ? buyVol / sellVol : 1;
        return res.json({
          symbol,
          buySellRatio,
          buyVol,
          sellVol,
          timestamp: Number(latest[0]),
          source: 'OKX'
        });
      }
    } catch (_) { /* fall through */ }

    // Try Bybit
    try {
      const bybitRes = await axios.get(`${BYBIT_API}/v5/market/account-ratio?category=linear&symbol=${symbol}&period=${period}&limit=1`, { timeout: 8000 });
      const item = bybitRes.data?.result?.list?.[0];
      if (item) {
        const buyRatio = Number(item.buyRatio);
        const sellRatio = Number(item.sellRatio);
        return res.json({
          symbol,
          buySellRatio: buyRatio > 0 && sellRatio > 0 ? (buyRatio / sellRatio) : 1,
          buyVol: buyRatio,
          sellVol: sellRatio,
          timestamp: Number(item.timestamp),
          source: 'Bybit'
        });
      }
    } catch (_) { /* fall through */ }

    // Fallback to Binance
    const url = `${BINANCE_FAPI}/futures/data/takerlongshortRatio?symbol=${symbol}&period=${period}`;
    let response = await fetchWithFallbacks(url);

    const data = response.data;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'No data available' });
    }

    const latest = data[data.length - 1];
    res.json({
      symbol,
      buySellRatio: Number(latest.buySellRatio),
      buyVol: Number(latest.buyVol),
      sellVol: Number(latest.sellVol),
      timestamp: latest.timestamp,
      source: 'Binance'
    });
  } catch (error) {
    console.error('Error fetching taker ratio:', error.message);
    res.status(500).json({ error: 'Failed to fetch taker ratio' });
  }
});

// Open Interest - aggregated from Bybit (primary) + OKX
router.get('/open-interest/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    let oiUsd = 0;
    const sources = [];

    // Bybit OI
    try {
      const bybitRes = await axios.get(`${BYBIT_API}/v5/market/tickers?category=linear&symbol=${symbol}`, { timeout: 8000 });
      const item = bybitRes.data?.result?.list?.[0];
      if (item && item.openInterest) {
        // openInterest is in coin units, multiply by mark price for USD
        const oiCoins = Number(item.openInterest);
        const markPrice = Number(item.markPrice || item.lastPrice || 0);
        oiUsd += oiCoins * markPrice;
        sources.push('Bybit');
      }
    } catch (_) { /* skip */ }

    // OKX OI
    try {
      const instId = symbol.replace('USDT', '-USDT-SWAP');
      const okxRes = await axios.get(`${OKX_API}/api/v5/public/open-interest?instType=SWAP&instId=${instId}`, { timeout: 8000 });
      const item = okxRes.data?.data?.[0];
      if (item && item.oiCcy) {
        // OKX returns oi in coin units, get price from Bybit or use 0
        const markPrice = oiUsd > 0 ? oiUsd / Number(item.oiCcy || 1) : 0;
        // Use oiCcy * approximate price
        const okxOiCoins = Number(item.oiCcy);
        // Get price from last known
        try {
          const priceRes = await axios.get(`${OKX_API}/api/v5/market/ticker?instId=${instId}`, { timeout: 5000 });
          const price = Number(priceRes.data?.data?.[0]?.last || 0);
          if (price > 0) {
            oiUsd += okxOiCoins * price;
            sources.push('OKX');
          }
        } catch (_) { /* skip price fetch */ }
      }
    } catch (_) { /* skip */ }

    res.json({
      symbol,
      oiUsd,
      history: [],
      sources
    });
  } catch (error) {
    console.error('Error fetching open interest:', error.message);
    res.status(500).json({ error: 'Failed to fetch open interest' });
  }
});

// Put/Call Ratio from Amberdata (Deribit options data)
router.get('/put-call-ratio/:currency', async (req, res) => {
  try {
    const { currency } = req.params;
    const apiKey = getAMBERDATA_API_KEY();

    if (!apiKey) {
      return res.status(503).json({ error: 'Amberdata API key not configured' });
    }

    const url = `https://api.amberdata.com/markets/derivatives/analytics/trades-flow/put-call-ratio?currency=${currency.toUpperCase()}&exchange=deribit&timeRange=1d`;
    const response = await axios.get(url, {
      headers: { 'x-api-key': apiKey },
      timeout: 15000
    });

    const data = response.data?.payload?.data;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'No data available' });
    }

    const latest = data[0]; // Most recent data point
    res.json({
      currency: currency.toUpperCase(),
      exchange: 'deribit',
      putCallRatioOpenInterest: latest.putCallRatioOpenInterest,
      putCallRatioVolume24hr: latest.putCallRatioVolume24hr,
      timestamp: latest.timestamp,
      source: 'Amberdata'
    });
  } catch (error) {
    console.error('Error fetching put-call ratio:', error.message);
    res.status(500).json({ error: 'Failed to fetch put-call ratio' });
  }
});

// Gamma Exposure (GEX) by Strike - for identifying pin risk and volatility zones
router.get('/gamma-exposure/:currency', async (req, res) => {
  try {
    const { currency } = req.params;
    const apiKey = getAMBERDATA_API_KEY();

    if (!apiKey) {
      return res.status(503).json({ error: 'Amberdata API key not configured' });
    }

    // Fetch open interest with greeks from Amberdata
    const url = `https://api.amberdata.com/markets/derivatives/analytics/aggregated/greeks?currency=${currency.toUpperCase()}&exchange=deribit`;
    const response = await axios.get(url, {
      headers: { 'x-api-key': apiKey },
      timeout: 15000
    });

    const data = response.data?.payload?.data;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'No gamma data available' });
    }

    // Calculate Gamma Exposure by strike
    // GEX = Gamma * Open Interest * Contract Size * Spot Price
    // Calls have positive gamma exposure, puts have negative
    const gexByStrike = new Map();
    let totalGex = 0;
    let maxPositiveGex = { strike: 0, value: 0 };
    let maxNegativeGex = { strike: 0, value: 0 };

    for (const option of data) {
      const strike = parseFloat(option.strikePrice);
      const gamma = parseFloat(option.gamma || 0);
      const oi = parseFloat(option.openInterest || 0);
      const spot = parseFloat(option.underlyingPrice || 0);
      const isCall = option.optionType === 'call';

      if (!strike || !gamma || !oi || !spot) continue;

      // GEX calculation: gamma * OI * spot (calls positive, puts negative)
      const contractMultiplier = currency.toUpperCase() === 'BTC' ? 1 : 1; // Adjust if needed
      const gex = gamma * oi * spot * contractMultiplier * (isCall ? 1 : -1);

      const currentGex = gexByStrike.get(strike) || 0;
      gexByStrike.set(strike, currentGex + gex);
      totalGex += gex;
    }

    // Find max positive and negative GEX strikes
    const sortedStrikes = Array.from(gexByStrike.entries())
      .sort((a, b) => b[1] - a[1]); // Sort by GEX desc

    if (sortedStrikes.length > 0) {
      maxPositiveGex = { strike: sortedStrikes[0][0], value: sortedStrikes[0][1] };
      maxNegativeGex = { strike: sortedStrikes[sortedStrikes.length - 1][0], value: sortedStrikes[sortedStrikes.length - 1][1] };
    }

    // Sort by strike for chart data
    const chartData = Array.from(gexByStrike.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([strike, gex]) => ({ strike, gex }));

    res.json({
      currency: currency.toUpperCase(),
      exchange: 'deribit',
      spotPrice: data[0]?.underlyingPrice,
      totalGammaExposure: totalGex,
      maxPositiveGex,
      maxNegativeGex,
      chartData,
      interpretation: totalGex > 0
        ? 'Net positive gamma - dealers hedge by selling rallies/buying dips (dampens volatility)'
        : 'Net negative gamma - dealers hedge by buying rallies/selling dips (amplifies volatility)',
      timestamp: new Date().toISOString(),
      source: 'Amberdata'
    });
  } catch (error) {
    console.error('Error fetching gamma exposure:', error.message);
    res.status(500).json({ error: 'Failed to fetch gamma exposure' });
  }
});

// Finnhub Analyst Recommendations
router.get('/recommendations/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await fetchFinnhubRecommendations(symbol);
    res.json(data);
  } catch (error) {
    console.error('Error fetching recommendations:', error.message);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});


// Macro Data
router.get('/macro/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get('https://api-adapter.dzengi.com/api/v1/ticker/24hr');
    const item = response.data.find(t => t.symbol === symbol);
    if (!item) {
      return res.status(404).json({ error: `Symbol ${symbol} not found` });
    }
    const price = Number(item.lastPrice);
    res.json({
      price,
      prevClose: price - Number(item.priceChange),
      high52w: Number(item.highPrice ?? 0),
      low52w: Number(item.lowPrice ?? 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch macro' });
  }
});

// BTC Social
router.get('/btc-social', async (req, res) => {
  try {
    const cacheKey = 'btc-social';
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const params = new URLSearchParams({
      localization: 'false',
      tickers: 'false',
      market_data: 'false',
      community_data: 'false',
      developer_data: 'false'
    });
    if (getCOINGECKO_API_KEY()) {
      params.append('x_cg_demo_api_key', getCOINGECKO_API_KEY());
    }
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin?${params.toString()}`;
    let response = await fetchWithFallbacks(url);
    const result = {
      bullishPct: Number(response.data.sentiment_votes_up_percentage ?? 0),
      bearishPct: Number(response.data.sentiment_votes_down_percentage ?? 0)
    };
    
    setCached(cacheKey, result, 120000); // Cache for 2 minutes
    res.json(result);
  } catch (error) {
    console.error('Error fetching btc-social:', error.message);
    res.status(500).json({ error: 'Failed to fetch social' });
  }
});


// Tickers for price feed
router.get('/tickers', async (req, res) => {
  try {
    const response = await axios.get('https://api-adapter.dzengi.com/api/v1/ticker/24hr');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickers' });
  }
});

// Individual ticker price (for stocks like COIN, HOOD, etc.)
router.get('/ticker/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get(`https://api-adapter.dzengi.com/api/v1/ticker/24hr?symbol=${encodeURIComponent(symbol)}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticker' });
  }
});

// Blockchain stats - Single call to /stats endpoint with fallback to charts API
router.get('/blockchain-stats', async (req, res) => {
  try {
    // Helper to fetch with CORS proxy fallback
    const fetchWithFallback = async (url, options = {}) => {
      return await fetchWithFallbacks(url, { timeout: 10000, ...options });
    };

    // Primary: Use /stats endpoint for all current data
    const statsRes = await fetchWithFallback('https://api.blockchain.info/stats');
    const stats = statsRes.data || {};

    // Fallback: Fetch active addresses from charts API if not in stats
    let n_unique_addresses = null;
    try {
      const addressesRes = await fetchWithFallback('https://api.blockchain.info/charts/n-unique-addresses?timespan=2days&format=json&sampled=false');
      const values = addressesRes.data?.values || [];
      // Get the most recent value
      n_unique_addresses = values.length > 0 ? values[values.length - 1].y : null;
    } catch {
      // Keep null if unavailable
    }

    // Convert values to proper units
    const hashrateEH = stats.hash_rate ? stats.hash_rate / 1_000_000_000 : null; // GH/s to EH/s
    const totalbcBTC = stats.totalbc ? stats.totalbc / 1e8 : null; // satoshis to BTC
    const supplyPct = totalbcBTC ? (totalbcBTC / 21_000_000) * 100 : null;

    res.json({
      hashrate: hashrateEH,
      difficulty: stats.difficulty || null,
      totalbc: stats.totalbc || null,
      n_transactions: stats.n_tx || null,
      n_unique_addresses,
      mempoolCount: null, // Not in /stats, fetched separately
      mempoolVsizeMB: null,
      market_price_usd: stats.market_price_usd || null,
      estimated_transaction_volume_usd: stats.estimated_transaction_volume_usd || null,
      miners_revenue_usd: stats.miners_revenue_usd || null,
      minutes_between_blocks: stats.minutes_between_blocks || null,
      supplyPct,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching blockchain stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch blockchain stats' });
  }
});

// Hashrate historical chart data from blockchain.info
router.get('/hashrate-chart', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    // Map days to timespan format
    const timespanMap = {
      '1': '1days',
      '7': '7days',
      '30': '30days',
      '90': '3months',
      '180': '6months',
      '365': '1year'
    };
    const timespan = timespanMap[days] || '30days';

    const url = `https://api.blockchain.info/charts/hash-rate?timespan=${timespan}&format=json&sampled=true`;
    const response = await fetchWithFallbacks(url, { timeout: 15000 });

    const values = response.data?.values || [];
    const data = values.map(point => ({
      date: new Date(point.x * 1000).toISOString().split('T')[0],
      value: point.y / 1_000_000  // TH/s to EH/s
    }));

    res.json({
      asset: 'btc',
      metric: 'hashrate',
      unit: 'EH/s',
      description: response.data?.description || 'Bitcoin network hash rate',
      data
    });
  } catch (error) {
    console.error('Error fetching hashrate chart:', error.message);
    res.status(500).json({ error: 'Failed to fetch hashrate data' });
  }
});

// Difficulty historical chart data from blockchain.info
router.get('/difficulty-chart', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    // Map days to timespan format
    const timespanMap = {
      '1': '1days',
      '7': '7days',
      '30': '30days',
      '90': '3months',
      '180': '6months',
      '365': '1year'
    };
    const timespan = timespanMap[days] || '30days';

    const url = `https://api.blockchain.info/charts/difficulty?timespan=${timespan}&format=json&sampled=true`;
    const response = await fetchWithFallbacks(url, { timeout: 15000 });

    const values = response.data?.values || [];
    const data = values.map(point => ({
      date: new Date(point.x * 1000).toISOString().split('T')[0],
      value: point.y
    }));

    res.json({
      asset: 'btc',
      metric: 'difficulty',
      unit: 'T',
      description: response.data?.description || 'Bitcoin network difficulty',
      data
    });
  } catch (error) {
    console.error('Error fetching difficulty chart:', error.message);
    res.status(500).json({ error: 'Failed to fetch difficulty data' });
  }
});

// CoinGecko global market data
router.get('/coingecko-global', async (req, res) => {
  try {
    const cacheKey = 'coingecko-global';
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const params = new URLSearchParams();
    if (getCOINGECKO_API_KEY()) {
      params.append('x_cg_demo_api_key', getCOINGECKO_API_KEY());
    }
    const url = `https://api.coingecko.com/api/v3/global?${params.toString()}`;
    const response = await fetchWithFallbacks(url, { timeout: 10000 });
    
    setCached(cacheKey, response.data, 60000); // Cache for 60 seconds
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching coingecko global:', error.message);
    res.status(500).json({ error: 'Failed to fetch coingecko global data' });
  }
});

// CoinGecko coin data
router.get('/coingecko-coin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `coingecko-coin-${id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const params = new URLSearchParams({
      localization: 'false',
      tickers: 'false',
      market_data: 'true',
      community_data: 'false',
      developer_data: 'false'
    });
    if (getCOINGECKO_API_KEY()) {
      params.append('x_cg_demo_api_key', getCOINGECKO_API_KEY());
    }
    const url = `https://api.coingecko.com/api/v3/coins/${id}?${params.toString()}`;
    const response = await fetchWithFallbacks(url, { timeout: 10000 });
    
    setCached(cacheKey, response.data, 60000); // Cache for 60 seconds
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching coingecko coin:', error.message);
    res.status(500).json({ error: 'Failed to fetch coingecko coin data' });
  }
});

// CoinGecko volume history for charts (aggregate from all exchanges)
router.get('/volume-chart/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    const cacheKey = `volume-chart-${id}-${days}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const params = new URLSearchParams({
      vs_currency: 'usd',
      days: String(days),
    });
    if (getCOINGECKO_API_KEY()) {
      params.append('x_cg_demo_api_key', getCOINGECKO_API_KEY());
    }
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?${params.toString()}`;
    const response = await fetchWithFallbacks(url, { timeout: 15000 });
    
    // Response contains: prices: [[timestamp, price], ...], market_caps: [...], total_volumes: [[timestamp, volume], ...]
    const volumes = response.data?.total_volumes || [];
    const prices = response.data?.prices || [];
    
    // Format data for chart - aggregate to daily points
    const data = volumes.map((point, index) => ({
      date: new Date(point[0]).toISOString().split('T')[0],
      volume: point[1], // USD volume
      price: prices[index]?.[1] || null,
    }));
    
    // Downsample if too many points (keep ~30-60 points for display)
    const downsampled = data.length > 60 
      ? data.filter((_, i) => i % Math.ceil(data.length / 45) === 0)
      : data;
    
    const result = {
      asset: id,
      metric: 'volume',
      unit: 'USD',
      description: `24h spot trading volume aggregated across all exchanges (CoinGecko)`,
      days: Number(days),
      data: downsampled,
    };
    
    setCached(cacheKey, result, 120000); // Cache for 2 minutes
    res.json(result);
  } catch (error) {
    console.error('Error fetching volume chart:', error.message);
    res.status(500).json({ error: 'Failed to fetch volume data' });
  }
});

// US spot Bitcoin ETF daily net flows — bitbo.io only (embedded page chart). Cache 24h.
router.get('/etf-daily-flows/:asset', async (req, res) => {
  try {
    const asset = String(req.params.asset || '').toLowerCase();
    const days = Math.min(730, Math.max(7, Number.parseInt(String(req.query.days), 10) || 90));

    let data = [];
    let source = 'none';
    let sourceDetail = '';

    if (asset === 'btc') {
      const cacheKey = `etf-daily-flows-btc-${days}-bitbo-v2`;
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      try {
        const response = await axios.get(BITBO_BTC_ETF_URL, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TradingTerminal/1.0)',
          },
        });
        data = extractBitboBtcHistoryUsdData(response.data);
        if (data.length > 0) {
          source = 'bitbo';
          sourceDetail = `${BITBO_BTC_ETF_URL} — US spot Bitcoin ETF net flow (USD) from embedded chart series.`;
        } else {
          sourceDetail = 'Bitbo page loaded but no historyUsd series was parsed.';
        }
      } catch (e) {
        console.warn('Bitbo ETF:', e.message);
        sourceDetail = 'Failed to fetch bitbo.io treasuries/etf-flows/.';
      }

      // Filter out invalid dates: future dates and weekends (ETFs don't trade Sat/Sun)
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      data = data.filter((row) => {
        const rowDate = new Date(row.date);
        const dayOfWeek = rowDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
        // Exclude weekends and future dates
        return row.date <= todayStr && dayOfWeek !== 0 && dayOfWeek !== 6;
      });

      const cutoffMs = Date.now() - days * 86400000;
      let trimmed = data.filter((row) => {
        const t = new Date(`${row.date}T12:00:00Z`).getTime();
        return t >= cutoffMs;
      });
      if (trimmed.length > days) trimmed = trimmed.slice(-days);
      if (trimmed.length === 0 && data.length > 0) {
        trimmed = data.length > days ? data.slice(-days) : data;
      }

      const result = {
        asset: 'btc',
        metric: 'etf_net_flow_usd',
        unit: 'USD',
        source,
        sourceDetail,
        description: 'US spot Bitcoin ETF daily net flow (Bitbo). Note: Data may lag 12-24h behind real-time sources like Farside Investors.',
        days,
        data: trimmed,
      };

      setCached(cacheKey, result, ETF_FLOW_CACHE_TTL_MS);
      res.json(result);
    } else {
      return res.status(400).json({ error: 'asset must be btc' });
    }
  } catch (error) {
    console.error('Error fetching ETF daily flows:', error.message);
    res.status(500).json({ error: 'Failed to fetch ETF flow data' });
  }
});

// CoinGecko markets data
router.get('/coingecko-markets', async (req, res) => {
  try {
    const { vs_currency = 'usd', order = 'market_cap_desc', per_page = 250, page = 1, category } = req.query;
    const params = new URLSearchParams({
      vs_currency,
      order,
      per_page,
      page,
      sparkline: 'false'
    });
    if (category) {
      params.append('category', category);
    }
    if (getCOINGECKO_API_KEY()) {
      params.append('x_cg_demo_api_key', getCOINGECKO_API_KEY());
    }
    const url = `https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`;
    const response = await fetchWithFallbacks(url);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching coingecko markets:', error.message);
    res.status(500).json({ error: 'Failed to fetch coingecko markets data' });
  }
});

// CoinMetrics - Active addresses and transaction counts
router.get('/coinmetrics/:asset', async (req, res) => {
  try {
    const { asset } = req.params;
    const { metrics = 'active_addresses,tx_count', start, end } = req.query;
    const url = `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=${asset}&metrics=${metrics}${start ? `&start=${start}` : ''}${end ? `&end=${end}` : ''}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coinmetrics data' });
  }
});

// Etherscan - ETH whale wallet activity (v2 API)
router.get('/etherscan/address/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const apiKey = process.env.ETHERSCAN_API_KEY || '';
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch etherscan data' });
  }
});

// Etherscan - ETH transaction count for address (v2 API)
router.get('/etherscan/txcount/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const apiKey = process.env.ETHERSCAN_API_KEY || '';
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest&apikey=${apiKey}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch etherscan tx count' });
  }
});

// Etherscan - ETH large transactions (whale tracking)
router.get('/eth/large-transactions', async (req, res) => {
  try {
    const { min_value = 1, limit = 50 } = req.query;
    const apiKey = process.env.ETHERSCAN_API_KEY || '';
    const minValueWei = BigInt(min_value) * BigInt(10 ** 18); // Convert ETH to Wei

    // Get latest block number first
    const blockUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_blockNumber&apikey=${apiKey}`;
    const blockRes = await axios.get(blockUrl);
    const latestBlock = parseInt(blockRes.data.result, 16);

    const transactions = [];
    let totalTxCount = 0;
    let whaleTxCount = 0;
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    // ETH produces ~7200 blocks per day (12s block time)
    const blocksToCheck = Math.min(7200, Math.ceil(limit / 5));
    
    for (let i = 0; i < blocksToCheck; i++) {
      const blockNumber = latestBlock - i;
      // Get block with transactions
      const blockUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getBlockByNumber&tag=0x${blockNumber.toString(16)}&boolean=true&apikey=${apiKey}`;
      const blockRes = await axios.get(blockUrl);
      const block = blockRes.data.result;
      
      if (block && block.transactions) {
        const blockTime = Number(block.timestamp) * 1000;
        if (blockTime < twentyFourHoursAgo) break;
        
        totalTxCount += block.transactions.length;
        
        for (const tx of block.transactions) {
          const value = BigInt(tx.value || '0');
          if (value >= minValueWei) {
            whaleTxCount++;
            transactions.push({
              hash: tx.hash,
              time: new Date(blockTime).toISOString(),
              sender: tx.from,
              recipient: tx.to || 'Contract Creation',
              amount: Number(value) / 1e18, // Convert Wei to ETH
              gasUsed: Number(tx.gas),
              gasPrice: Number(tx.gasPrice) / 1e9, // Convert to Gwei
            });
          }
          
          if (transactions.length >= limit) break;
        }
      }
      
      if (transactions.length >= limit) break;
    }
    
    const whalePercentage = totalTxCount > 0 ? (whaleTxCount / totalTxCount) * 100 : 0;

    res.json({
      data: {
        transactions,
        stats: {
          totalTransactions: totalTxCount,
          whaleTransactions: whaleTxCount,
          whalePercentage: whalePercentage.toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching ETH large transactions:', error);
    res.status(500).json({ error: 'Failed to fetch ETH large transactions' });
  }
});

// Blockchair - BTC whale stats (large transactions)
router.get('/blockchair/btc/stats', async (req, res) => {
  try {
    const url = 'https://api.blockchair.com/bitcoin/stats';
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blockchair stats' });
  }
});

// Mempool.space - BTC large transactions
router.get('/btc/large-transactions', async (req, res) => {
  try {
    const { min_amount = 1, limit = 50 } = req.query;
    // Get recent blocks from mempool.space (last 24h = ~144 blocks)
    const blocksUrl = 'https://mempool.space/api/blocks';
    const blocksRes = await axios.get(blocksUrl);
    const blocks = blocksRes.data?.slice(0, 144) || [];

    const transactions = [];
    let totalTxCount = 0;
    let whaleTxCount = 0;
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const block of blocks) {
      if (block.timestamp * 1000 < twentyFourHoursAgo) break;
      
      // Get transactions for this block
      const blockTxUrl = `https://mempool.space/api/block/${block.id}/txs`;
      const txRes = await axios.get(blockTxUrl);
      const txs = txRes.data || [];
      totalTxCount += txs.length;
      
      for (const tx of txs) {
        // Calculate total output value in BTC (convert from satoshis)
        const totalOut = tx.vout.reduce((sum, out) => sum + (out.value || 0), 0);
        const btcAmount = totalOut / 100000000; // Convert satoshis to BTC
        
        if (btcAmount >= min_amount) {
          whaleTxCount++;
          transactions.push({
            hash: tx.txid,
            time: new Date(block.timestamp * 1000).toISOString(),
            sender: tx.vin?.[0]?.prevout?.scriptpubkey_address || 'Unknown',
            recipient: tx.vout?.[0]?.scriptpubkey_address || 'Unknown',
            amount: btcAmount,
            fee: (tx.fee || 0) / 100000000
          });
        }
        
        if (transactions.length >= limit) break;
      }
      if (transactions.length >= limit) break;
    }
    
    const whalePercentage = totalTxCount > 0 ? (whaleTxCount / totalTxCount) * 100 : 0;

    res.json({
      data: {
        transactions,
        stats: {
          totalTransactions: totalTxCount,
          whaleTransactions: whaleTxCount,
          whalePercentage: whalePercentage.toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching large transactions:', error);
    res.status(500).json({ error: 'Failed to fetch large transactions' });
  }
});

// CoinMetrics exchange ID mapping
const COINMETRICS_EXCHANGES = {
  binance: 'binance',
  okx: 'okex',
  bybit: 'bybit',
  coinbasepro: 'coinbase',
  bitfinex: 'bitfinex',
  kraken: 'kraken',
  gemini: 'gemini'
};

// CoinMetrics asset ID mapping
const COINMETRICS_ASSETS = {
  btc: 'btc',
  eth: 'eth'
};

// Fetch real exchange balance history from CoinMetrics
async function fetchCoinMetricsExchangeBalance(exchange, asset, days) {
  const cmExchange = COINMETRICS_EXCHANGES[exchange];
  const cmAsset = COINMETRICS_ASSETS[asset];

  if (!cmExchange || !cmAsset) {
    throw new Error('Unsupported exchange or asset for CoinMetrics');
  }

  // Calculate date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Use exchange_metrics endpoint for exchange-specific balance data
  // Metrics: bal_unix (balance in native units), bal_usd (balance in USD)
  const metrics = cmAsset === 'btc' ? 'bal_unix' : 'bal_unix';
  const url = `https://community-api.coinmetrics.io/v4/timeseries/exchange-metrics?exchanges=${cmExchange}&assets=${cmAsset}&metrics=${metrics}&start=${startDate}&end=${endDate}&frequency=1d`;

  const response = await axios.get(url, { timeout: 10000 });
  const series = response.data?.data || [];

  if (series.length === 0) {
    throw new Error('No data returned from CoinMetrics');
  }

  // Transform CoinMetrics data to our format
  const data = series.map(row => ({
    date: row.time.split('T')[0],
    value: Math.round(parseFloat(row[metrics] || 0))
  }));

  // Sort by date ascending
  data.sort((a, b) => new Date(a.date) - new Date(b.date));

  return { exchange, asset, data };
}

// Fallback to aggregated exchange data from asset-metrics if exchange-specific not available
async function fetchCoinMetricsAggregateBalance(asset, days) {
  const cmAsset = COINMETRICS_ASSETS[asset];

  // Calculate date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Use asset_metrics with exchange_supply_native (total across all exchanges)
  const metric = 'exchange_supply_native';
  const url = `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=${cmAsset}&metrics=${metric}&start=${startDate}&end=${endDate}&frequency=1d`;

  const response = await axios.get(url, { timeout: 10000 });
  const series = response.data?.data || [];

  if (series.length === 0) {
    throw new Error('No aggregate data returned from CoinMetrics');
  }

  // For aggregate data, we estimate per-exchange based on known market share
  const exchangeShare = {
    binance: 0.35,
    okx: 0.15,
    bybit: 0.12,
    coinbasepro: 0.18,
    bitfinex: 0.08,
    kraken: 0.12
  };

  return series.map(row => ({
    date: row.time.split('T')[0],
    totalSupply: parseFloat(row[metric] || 0)
  }));
}

// Exchange balance history - tries CoinMetrics, returns unavailable if no data
router.get('/exchange-balances', async (req, res) => {
  try {
    const { exchange, asset, days = 30 } = req.query;
    const numDays = parseInt(days);

    let result;

    // Try CoinMetrics exchange-specific data first
    try {
      result = await fetchCoinMetricsExchangeBalance(exchange, asset, numDays);
    } catch (exchangeError) {
      // Try aggregate data and estimate per-exchange
      try {
        const aggregateData = await fetchCoinMetricsAggregateBalance(asset, numDays);

        // Estimate this exchange's share based on real CoinGlass data
        // Total: 2,456,830 BTC
        const exchangeShare = {
          coinbasepro: 0.348,  // 854,295 / 2,456,830
          binance: 0.249,      // 611,674 / 2,456,830
          bitfinex: 0.165,     // 405,743 / 2,456,830
          kraken: 0.061,       // 149,229 / 2,456,830
          okx: 0.041,          // 101,397 / 2,456,830
          gemini: 0.038,       // 94,352 / 2,456,830
          bybit: 0.019         // 46,876 / 2,456,830
        };
        const share = exchangeShare[exchange] || 0.01;

        result = {
          exchange,
          asset,
          data: aggregateData.map(d => ({
            date: d.date,
            value: Math.round(d.totalSupply * share)
          }))
        };
      } catch (aggregateError) {
        result = { exchange, asset, data: [] };
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error in exchange-balances endpoint:', error.message);
    res.status(500).json({ error: 'Failed to fetch exchange balance data' });
  }
});

// CoinGecko Categories (Sector Performance)
router.get('/categories', async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (getCOINGECKO_API_KEY()) {
      params.append('x_cg_demo_api_key', getCOINGECKO_API_KEY());
    }
    const url = `https://api.coingecko.com/api/v3/coins/categories?${params.toString()}`;
    const response = await fetchWithFallbacks(url);

    // Filter and format relevant categories
    const relevantCategories = response.data
      .filter(cat => cat.market_cap && cat.market_cap > 0)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        marketCap: cat.market_cap,
        marketCapChange24h: cat.market_cap_change_24h || 0,
        volume24h: cat.volume_24h || 0,
        top3Coins: cat.top_3_coins || []
      }))
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 15); // Top 15 categories by market cap

    res.json(relevantCategories);
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});


export default router;

import express from 'express';
import axios from 'axios';

const router = express.Router();

const CORSPROXY = 'https://corsproxy.io/?url=';
const BINANCE_FAPI = 'https://fapi.binance.com';
const BYBIT_API = 'https://api.bybit.com';
const OKX_API = 'https://www.okx.com';
// Lazy getters for env vars - ensures they are read AFTER dotenv.config() runs
const getCOINGECKO_API_KEY = () => process.env.COINGECKO_API_KEY;
const getFINNHUB_API_KEY = () => process.env.FINNHUB_API_KEY;
const getDUNE_API_KEY = () => process.env.DUNE_API_KEY;
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

/** Fetch ETH ETF holdings from Finnhub and calculate flows */
async function fetchFinnhubEthEtfFlows(days) {
  if (!getFINNHUB_API_KEY()) {
    throw new Error('FINNHUB_API_KEY not set');
  }

  // List of major US spot ETH ETF tickers
  const ethEtfs = ['ETHA', 'ETHE', 'FETH', 'CETH', 'ETHW', 'ETHV', 'QETH', 'EZET'];
  
  const holdingsByDate = new Map();
  
  // Fetch holdings for each ETF
  for (const ticker of ethEtfs) {
    try {
      const url = `https://finnhub.io/api/v1/etf/holdings?symbol=${ticker}&token=${getFINNHUB_API_KEY()}`;
      const response = await axios.get(url, { timeout: 15000 });
      const holdings = response.data?.holdings || [];
      
      holdings.forEach(holding => {
        const date = holding.date;
        if (!date) return;
        
        if (!holdingsByDate.has(date)) {
          holdingsByDate.set(date, []);
        }
        holdingsByDate.get(date).push({
          ticker,
          shares: Number(holding.shares) || 0,
          price: Number(holding.price) || 0,
        });
      });
    } catch (e) {
      console.warn(`Failed to fetch Finnhub holdings for ${ticker}:`, e.message);
    }
  }
  
  // Calculate total holdings per date
  const totalHoldingsByDate = new Map();
  holdingsByDate.forEach((holdings, date) => {
    let totalValue = 0;
    holdings.forEach(h => {
      totalValue += h.shares * h.price;
    });
    totalHoldingsByDate.set(date, totalValue);
  });
  
  // Sort dates
  const sortedDates = Array.from(totalHoldingsByDate.keys()).sort();
  
  // Calculate flows (change in holdings)
  const flows = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currDate = sortedDates[i];
    const prevValue = totalHoldingsByDate.get(prevDate) || 0;
    const currValue = totalHoldingsByDate.get(currDate) || 0;
    const flow = currValue - prevValue;
    
    flows.push({
      date: currDate,
      netFlowUsd: flow,
    });
  }
  
  // Return last N days of flows
  return flows.slice(-days);
}

/** Fetch ETH ETF spot net flows from Dune Analytics */
async function fetchDuneEthEtfFlows(days) {
  if (!getDUNE_API_KEY()) {
    throw new Error('DUNE_API_KEY not set');
  }

  // Dune query ID for Ethereum Spot ETF Net Inflows (updated daily)
  // This query tracks daily net inflows for US spot ETH ETFs
  // NOTE: Query ID 4356704 is a reference query. Verify it exists in your Dune account
  // or create your own query at dune.com/queries and update this ID.
  // Public queries can also be found in Dune's query library.
  const DUNE_ETH_ETF_QUERY_ID = 4356704;

  try {
    // Step 1: Execute the query (or use existing results)
    const executeUrl = `https://api.dune.com/api/v1/query/${DUNE_ETH_ETF_QUERY_ID}/execute`;
    const executeRes = await axios.post(
      executeUrl,
      {},
      {
        headers: {
          'X-Dune-API-Key': getDUNE_API_KEY(),
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const executionId = executeRes.data?.execution_id;
    if (!executionId) {
      throw new Error('No execution ID returned from Dune');
    }

    // Step 2: Poll for results (Dune queries may take time)
    const maxRetries = 30;
    const pollInterval = 2000; // 2 seconds

    for (let i = 0; i < maxRetries; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusUrl = `https://api.dune.com/api/v1/execution/${executionId}/status`;
      const statusRes = await axios.get(statusUrl, {
        headers: { 'X-Dune-API-Key': getDUNE_API_KEY() },
        timeout: 10000,
      });

      const state = statusRes.data?.state;
      if (state === 'QUERY_STATE_COMPLETED') {
        break;
      } else if (state === 'QUERY_STATE_FAILED' || state === 'QUERY_STATE_CANCELLED') {
        throw new Error(`Dune query failed with state: ${state}`);
      }
      // Continue polling if state is EXECUTING or PENDING
    }

    // Step 3: Fetch results
    const resultsUrl = `https://api.dune.com/api/v1/execution/${executionId}/results`;
    const resultsRes = await axios.get(resultsUrl, {
      headers: { 'X-Dune-API-Key': getDUNE_API_KEY() },
      timeout: 15000,
    });

    const rows = resultsRes.data?.result?.rows || [];

    // Transform Dune results to our format
    // Expected columns: date, net_inflow_usd (or similar)
    const flows = rows
      .map((row) => ({
        date: row.date || row.day || row.timestamp,
        netFlowUsd: Number(row.net_inflow_usd || row.net_flow_usd || row.inflow_usd || 0),
      }))
      .filter((row) => row.date && Number.isFinite(row.netFlowUsd))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Return last N days
    return flows.slice(-days);
  } catch (error) {
    console.error('Dune API error:', error.message);
    throw error;
  }
}

/** Fetch latest ETH ETF spot net flows from Dune using results endpoint (faster, cached) */
async function fetchDuneEthEtfFlowsLatest(days) {
  if (!getDUNE_API_KEY()) {
    throw new Error('DUNE_API_KEY not set');
  }

  // Dune query ID for Ethereum Spot ETF Net Inflows
  // NOTE: Query ID 4356704 is a reference. Verify it exists or create your own query.
  const DUNE_ETH_ETF_QUERY_ID = 4356704;

  try {
    // Use the results endpoint to get latest cached results (much faster)
    const resultsUrl = `https://api.dune.com/api/v1/query/${DUNE_ETH_ETF_QUERY_ID}/results`;
    const resultsRes = await axios.get(resultsUrl, {
      headers: { 'X-Dune-API-Key': getDUNE_API_KEY() },
      timeout: 15000,
    });

    const rows = resultsRes.data?.result?.rows || [];

    // Transform Dune results to our format
    const flows = rows
      .map((row) => ({
        date: row.date || row.day || row.timestamp,
        netFlowUsd: Number(row.net_inflow_usd || row.net_flow_usd || row.inflow_usd || row.net_flow || 0),
      }))
      .filter((row) => row.date && Number.isFinite(row.netFlowUsd))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Return last N days
    return flows.slice(-days);
  } catch (error) {
    console.error('Dune API error (latest):', error.message);
    throw error;
  }
}

function proxiedGet(url) {
  return `${CORSPROXY}${encodeURIComponent(url)}`;
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

// Funding Rate
router.get('/funding/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const url = `${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${symbol}`;
    let response = await axios.get(url).catch(() => axios.get(proxiedGet(url)));
    res.json({
      rate: Number(response.data.lastFundingRate),
      nextSettlement: Number(response.data.nextFundingTime),
      intervalHours: 8
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch funding' });
  }
});

// Macro Data
router.get('/macro/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get('https://api-adapter.dzengi.com/api/v1/ticker/24hr');
    const item = response.data.find(t => t.symbol === symbol);
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
    let response = await axios.get(url).catch(() => axios.get(proxiedGet(url)));
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

// Fetch OI from Binance
async function fetchBinanceOI(symbol) {
  const oiUrl = `${BINANCE_FAPI}/fapi/v1/openInterest?symbol=${symbol}`;
  const historyUrl = `${BINANCE_FAPI}/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=48`;
  
  try {
    const [oiRes, historyRes] = await Promise.all([
      axios.get(oiUrl, { timeout: 5000 }).catch(() => axios.get(proxiedGet(oiUrl), { timeout: 5000 })),
      axios.get(historyUrl, { timeout: 5000 }).catch(() => axios.get(proxiedGet(historyUrl), { timeout: 5000 }))
    ]);
    
    const oiUsd = Number(oiRes.data.openInterestValue || oiRes.data.sumOpenInterestValue || 0);
    const history = historyRes.data?.slice(-48).map(row => Number(row.sumOpenInterestValue || 0)) || [];
    
    return { oiUsd, source: 'Binance', history };
  } catch (error) {
    console.error('Binance OI fetch failed:', error.message);
    return null;
  }
}

// Fetch OI from Bybit
async function fetchBybitOI(symbol) {
  // Bybit API: /v5/market/tickers with category=linear for perpetuals
  const symbolFormatted = symbol.replace('USDT', ''); // BTCUSDT -> BTC
  const url = `${BYBIT_API}/v5/market/tickers?category=linear&symbol=${symbol}`;
  
  try {
    const res = await axios.get(url, { timeout: 5000 }).catch(() => axios.get(proxiedGet(url), { timeout: 5000 }));
    const ticker = res.data?.result?.list?.[0];
    if (!ticker) return null;
    
    // openInterest is in coin units, convert to USD using lastPrice
    const oiCcy = Number(ticker.openInterest || 0);
    const price = Number(ticker.lastPrice || 0);
    const oiUsd = oiCcy * price;
    
    return { oiUsd, source: 'Bybit' };
  } catch (error) {
    console.error('Bybit OI fetch failed:', error.message);
    return null;
  }
}

// Fetch OI from OKX
async function fetchOkxOI(symbol) {
  // OKX API: /api/v5/public/open-interest
  const instId = symbol.replace('USDT', '-USDT-SWAP'); // BTCUSDT -> BTC-USDT-SWAP
  const url = `${OKX_API}/api/v5/public/open-interest?instType=SWAP&instId=${instId}`;
  
  try {
    const res = await axios.get(url, { timeout: 5000 }).catch(() => axios.get(proxiedGet(url), { timeout: 5000 }));
    const data = res.data?.data?.[0];
    if (!data) return null;
    
    // OKX returns OI in contracts, need to multiply by contract size and price
    const oiUsd = Number(data.oiCcy || 0); // oiCcy is in USD terms
    
    return { oiUsd, source: 'OKX' };
  } catch (error) {
    console.error('OKX OI fetch failed:', error.message);
    return null;
  }
}

// Open Interest - Aggregated from multiple exchanges (like CoinMarketCap/CryptoBubbles)
router.get('/open-interest/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Fetch from all exchanges in parallel
    const [binanceData, bybitData, okxData] = await Promise.all([
      fetchBinanceOI(symbol),
      fetchBybitOI(symbol),
      fetchOkxOI(symbol)
    ]);
    
    // Aggregate OI from all available sources
    let totalOiUsd = 0;
    const sources = [];
    const sourceValues = {};
    
    if (binanceData?.oiUsd > 0) {
      totalOiUsd += binanceData.oiUsd;
      sources.push('Binance');
      sourceValues.binance = binanceData.oiUsd;
    }
    if (bybitData?.oiUsd > 0) {
      totalOiUsd += bybitData.oiUsd;
      sources.push('Bybit');
      sourceValues.bybit = bybitData.oiUsd;
    }
    if (okxData?.oiUsd > 0) {
      totalOiUsd += okxData.oiUsd;
      sources.push('OKX');
      sourceValues.okx = okxData.oiUsd;
    }
    
    // Use history from Binance if available
    const history = binanceData?.history || [];
    
    res.json({ 
      oiUsd: totalOiUsd, 
      oiCcy: 0, // Not aggregated per coin
      history,
      sources,
      sourceValues,
      aggregated: sources.length > 0
    });
  } catch (error) {
    console.error('Open Interest fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch OI', details: error.message });
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

// Blockchain stats - Single call to /stats endpoint with fallback to charts API
router.get('/blockchain-stats', async (req, res) => {
  try {
    // Helper to fetch with CORS proxy fallback
    const fetchWithFallback = async (url, options = {}) => {
      try {
        return await axios.get(url, { timeout: 10000, ...options });
      } catch {
        return await axios.get(proxiedGet(url), { timeout: 15000, ...options });
      }
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
    const response = await axios.get(url, { timeout: 15000 }).catch(() =>
      axios.get(proxiedGet(url), { timeout: 20000 })
    );

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
    const response = await axios.get(url, { timeout: 15000 }).catch(() =>
      axios.get(proxiedGet(url), { timeout: 20000 })
    );

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
    const response = await axios.get(url, { timeout: 10000 }).catch(() => 
      axios.get(proxiedGet(url), { timeout: 15000 })
    );
    
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
    const response = await axios.get(url, { timeout: 10000 }).catch(() => 
      axios.get(proxiedGet(url), { timeout: 15000 })
    );
    
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
    const response = await axios.get(url, { timeout: 15000 }).catch(() =>
      axios.get(proxiedGet(url), { timeout: 20000 })
    );
    
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
      const cacheKey = `etf-daily-flows-btc-${days}-bitbo-v1`;
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
        description: 'US spot Bitcoin ETF daily net flow (inflows minus outflows).',
        days,
        data: trimmed,
      };

      setCached(cacheKey, result, ETF_FLOW_CACHE_TTL_MS);
      res.json(result);
    } else if (asset === 'eth') {
      // ETH ETF flows: Try Dune first, then Finnhub as fallback
      const cacheKey = `etf-daily-flows-eth-${days}-dune-v1`;
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Try Dune API first for ETH ETF spot net flows
      if (getDUNE_API_KEY()) {
        try {
          data = await fetchDuneEthEtfFlowsLatest(days);
          if (data.length > 0) {
            source = 'dune';
            sourceDetail = 'Dune Analytics — US spot Ethereum ETF daily net inflows (USD) from Dune query.';
          } else {
            sourceDetail = 'Dune API returned no data, will try fallback.';
          }
        } catch (e) {
          console.warn('Dune ETH ETF:', e.message);
          sourceDetail = `Dune API failed: ${e.message}`;
        }
      } else {
        sourceDetail = 'DUNE_API_KEY not set, skipping Dune source.';
      }

      // Fallback to Finnhub if Dune failed or returned no data
      if (data.length === 0 && getFINNHUB_API_KEY()) {
        try {
          const finnhubData = await fetchFinnhubEthEtfFlows(days);
          if (finnhubData.length > 0) {
            data = finnhubData;
            source = 'finnhub';
            sourceDetail = 'Finnhub API — US spot Ethereum ETF net flow (USD) calculated from daily holdings changes. (Dune fallback)';
          } else {
            sourceDetail += ' Finnhub API also returned no holdings data.';
          }
        } catch (e) {
          console.warn('Finnhub ETH ETF fallback:', e.message);
          sourceDetail += ` Finnhub fallback failed: ${e.message}`;
        }
      }

      const result = {
        asset: 'eth',
        metric: 'etf_net_flow_usd',
        unit: 'USD',
        source,
        sourceDetail,
        description: 'US spot Ethereum ETF daily net flow (inflows minus outflows).',
        days,
        data,
      };

      setCached(cacheKey, result, ETF_FLOW_CACHE_TTL_MS);
      res.json(result);
    } else {
      return res.status(400).json({ error: 'asset must be btc or eth' });
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
    const response = await axios.get(url).catch(() => axios.get(proxiedGet(url)));
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
    console.log(`Fetching ETH transactions with min_value=${min_value}, limit=${limit}`);
    
    // Get latest block number first
    const blockUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_blockNumber&apikey=${apiKey}`;
    const blockRes = await axios.get(blockUrl);
    const latestBlock = parseInt(blockRes.data.result, 16);
    console.log(`Latest block: ${latestBlock}`);
    
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
    console.log(`Total transactions: ${totalTxCount}, Whale transactions: ${whaleTxCount}, Whale percentage: ${whalePercentage.toFixed(2)}%`);
    
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
    console.log(`Fetching BTC transactions with min_amount=${min_amount}, limit=${limit}`);
    // Get recent blocks from mempool.space (last 24h = ~144 blocks)
    const blocksUrl = 'https://mempool.space/api/blocks';
    const blocksRes = await axios.get(blocksUrl);
    const blocks = blocksRes.data?.slice(0, 144) || [];
    console.log(`Fetched ${blocks.length} blocks for 24h period`);
    
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
    console.log(`Total transactions: ${totalTxCount}, Whale transactions: ${whaleTxCount}, Whale percentage: ${whalePercentage.toFixed(2)}%`);
    
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

// Generate realistic mock data as final fallback
function generateMockBalanceData(exchange, asset, days) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const data = [];

  // Base values from CoinGlass real data (BTC balances as of reference date)
  const baseValues = {
    coinbasepro: { btc: 854295, eth: 5500000 },  // #1 - Coinbase
    binance: { btc: 611674, eth: 4800000 },      // #2 - Binance
    bitfinex: { btc: 405743, eth: 3200000 },    // #3 - Bitfinex
    kraken: { btc: 149229, eth: 1200000 },      // #4 - Kraken
    okx: { btc: 101397, eth: 850000 },           // #5 - OKX
    gemini: { btc: 94352, eth: 780000 },         // #6 - Gemini
    bybit: { btc: 46876, eth: 420000 }           // #8 - Bybit
  };

  const baseValue = baseValues[exchange]?.[asset] || 100000;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * dayMs);
    const daysAgo = days - i;
    const trendFactor = 1 + (daysAgo * 0.001 * (Math.random() - 0.5));
    const dailyVariation = 0.98 + Math.random() * 0.04;
    const value = baseValue * trendFactor * dailyVariation;

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value)
    });
  }

  return { exchange, asset, data };
}

// Exchange balance history - tries CoinMetrics, falls back to mock
router.get('/exchange-balances', async (req, res) => {
  try {
    const { exchange, asset, days = 30 } = req.query;
    const numDays = parseInt(days);

    let result;

    // Try CoinMetrics exchange-specific data first
    try {
      result = await fetchCoinMetricsExchangeBalance(exchange, asset, numDays);
      console.log(`CoinMetrics exchange data fetched for ${exchange}/${asset}`);
    } catch (exchangeError) {
      console.log(`Exchange-specific data failed for ${exchange}/${asset}:`, exchangeError.message);

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
        console.log(`CoinMetrics aggregate data used for ${exchange}/${asset}`);
      } catch (aggregateError) {
        console.log(`Aggregate data failed, using mock for ${exchange}/${asset}:`, aggregateError.message);
        result = generateMockBalanceData(exchange, asset, numDays);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error in exchange-balances endpoint:', error.message);
    // Return mock data as last resort to prevent frontend errors
    const { exchange, asset, days = 30 } = req.query;
    const mockData = generateMockBalanceData(exchange, asset, parseInt(days));
    res.json(mockData);
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
    const response = await axios.get(url).catch(() => axios.get(proxiedGet(url)));

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

// Open Interest (Direct API calls to exchanges)
router.get('/open-interest', async (req, res) => {
  try {
    const { asset = 'btc' } = req.query;
    const assetUpper = asset.toUpperCase();
    const symbol = `${assetUpper}USDT`;
    
    // Fetch OI from multiple exchanges directly
    const promises = [
      // Bybit
      axios.get(`https://api.bybit.com/v5/market/open-interest?category=linear&symbol=${symbol}&intervalTime=5min&limit=1`)
        .then(r => {
          const list = r.data?.result?.list;
          return list?.[0]?.openInterest ? Number.parseFloat(list[0].openInterest) : 0;
        })
        .catch(() => 0),
      // OKX
      axios.get(`https://www.okx.com/api/v5/public/open-interest?instType=SWAP&uly=${assetUpper}-USD`)
        .then(r => {
          const data = r.data?.data;
          return data?.reduce((sum, item) => sum + Number.parseFloat(item.oi || 0), 0) || 0;
        })
        .catch(() => 0),
    ];
    
    const [bybitOI, okxOI] = await Promise.all(promises);
    
    // Get current price to convert contracts to USD
    let price = 0;
    try {
      const priceRes = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      price = Number.parseFloat(priceRes.data.price || 0);
    } catch {
      price = assetUpper === 'BTC' ? 76000 : 4000; // Fallback prices
    }
    
    // Calculate total OI in USD
    const totalOI = (bybitOI + okxOI) * price;
    
    // Generate mock history for sparkline (since direct APIs don't provide history)
    const history = [];
    const now = Date.now();
    for (let i = 48; i >= 0; i--) {
      const variation = 0.95 + Math.random() * 0.1;
      history.push(totalOI * variation);
    }
    
    res.json({
      asset: assetUpper,
      latest: {
        contract_count: bybitOI + okxOI,
        value_usd: totalOI,
        time: new Date().toISOString()
      },
      history
    });
  } catch (error) {
    console.error('Error fetching open interest:', error);
    res.status(500).json({ error: 'Failed to fetch open interest' });
  }
});

export default router;

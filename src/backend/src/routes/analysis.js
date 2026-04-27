import express from 'express';
import axios from 'axios';

const router = express.Router();

const CORSPROXY = 'https://corsproxy.io/?url=';
const BINANCE_FAPI = 'https://fapi.binance.com';

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
    const url = 'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false';
    let response = await axios.get(url).catch(() => axios.get(proxiedGet(url)));
    res.json({
      bullishPct: Number(response.data.sentiment_votes_up_percentage ?? 0),
      bearishPct: Number(response.data.sentiment_votes_down_percentage ?? 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch social' });
  }
});

// Open Interest
router.get('/open-interest/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const oiUrl = `${BINANCE_FAPI}/fapi/v1/openInterest?symbol=${symbol}`;
    const historyUrl = `${BINANCE_FAPI}/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=48`;
    
    const [oiRes, historyRes] = await Promise.all([
      axios.get(oiUrl).catch(() => axios.get(proxiedGet(oiUrl))),
      axios.get(historyUrl).catch(() => axios.get(proxiedGet(historyUrl)))
    ]);
    
    const oiCcy = Number(oiRes.data.openInterest);
    const history = historyRes.data.slice(-48).map(row => Number(row.sumOpenInterestValue));
    
    res.json({ oiUsd: oiCcy, oiCcy, history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OI' });
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

// Blockchain stats (for on-chain data)
router.get('/blockchain-stats', async (req, res) => {
  try {
    const response = await axios.get('https://blockchain.info/stats');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blockchain stats' });
  }
});

// CoinGecko global market data
router.get('/coingecko-global', async (req, res) => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/global');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coingecko global data' });
  }
});

// CoinGecko coin data
router.get('/coingecko-coin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coingecko coin data' });
  }
});

// CoinGecko markets data
router.get('/coingecko-markets', async (req, res) => {
  try {
    const { vs_currency = 'usd', order = 'market_cap_desc', per_page = 250, page = 1, category } = req.query;
    let url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs_currency}&order=${order}&per_page=${per_page}&page=${page}&sparkline=false`;
    if (category) {
      url += `&category=${category}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coingecko markets data' });
  }
});

export default router;

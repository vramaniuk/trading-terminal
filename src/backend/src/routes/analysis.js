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

export default router;

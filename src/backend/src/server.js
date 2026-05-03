import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file directory (works with ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables IMMEDIATELY before any other imports
const envPath = process.env.NODE_ENV
  ? join(__dirname, '..', `.env.${process.env.NODE_ENV}`)
  : join(__dirname, '..', '.env.development');

dotenv.config({ path: envPath });

import express from 'express';
import cors from 'cors';
import analysisRoutes from './routes/analysis.js';
import authRoutes from './routes/auth.js';

console.log('[server] Loading env from:', envPath);
console.log('[server] PORT loaded:', process.env.PORT || 'using default 3001');
console.log('[server] API keys loaded:', {
  COINGECKO: process.env.COINGECKO_API_KEY ? '✓' : '✗',
  FINNHUB: process.env.FINNHUB_API_KEY ? '✓' : '✗',
  DUNE: process.env.DUNE_API_KEY ? '✓' : '✗',
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/analysis', analysisRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

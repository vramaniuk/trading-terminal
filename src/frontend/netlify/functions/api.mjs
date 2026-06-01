import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import analysisRoutes from '../../../backend/src/routes/analysis.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Mount analysis routes
app.use('/api/analysis', analysisRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export const handler = serverless(app);

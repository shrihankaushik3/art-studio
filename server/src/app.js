import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import paintingRoutes from './routes/paintingRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import potteryRoutes from './routes/potteryRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(rootDir, '.env') });

const app = express();

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json());

// Serve static images directly from seedData/images
const imagesPath = path.join(rootDir, 'seedData/images');
if (fs.existsSync(imagesPath)) {
  app.use('/images', express.static(imagesPath));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/paintings', paintingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/pottery', potteryRoutes);

// In production, serve the built frontend
const clientDistPath = path.join(rootDir, 'client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/images')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

export default app;

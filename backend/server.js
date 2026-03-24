const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const { pool } = require('./config/database');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallets');
const tradeRoutes = require('./routes/trades');
const referralRoutes = require('./routes/referrals');
const adminRoutes = require('./routes/admin');

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = [
  'https://crypto-exchange-frontend.vercel.app',
  'https://crypto-exchange-admin.netlify.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin', adminRoutes);

// WebSocket for real-time prices
const priceService = require('./services/priceService');
priceService.init(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Load environment variables
dotenv.config();

// Import routes
import agentsRouter from './routes/agents';
import blockchainRouter from './routes/blockchain';
import evolutionRouter from './routes/evolution';
import generationsRouter from './routes/generations';
import metricsRouter from './routes/metrics';
import stakingRouter from './routes/staking';
import transactionsRouter from './routes/transactions';

// Import services
import { initAmadeusClient } from './chain/amadeus-client';
import { initDatabase } from './database/db';
import { startAgentExecutor } from './services/agent-executor';
import { initBlockchain } from './services/blockchain';
import { startIndexer } from './services/indexer';
import { initWebSocket } from './websocket/socket';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/agents', agentsRouter);
app.use('/api/generations', generationsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/evolution', evolutionRouter);
app.use('/api/staking', stakingRouter);
app.use('/api/blockchain', blockchainRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    // Initialize database (non-blocking - server will start even if DB fails)
    try {
      await initDatabase();
      console.log('✅ Database connected');
    } catch (dbError: any) {
      console.warn('⚠️  Database connection failed:', dbError.message);
      console.warn('⚠️  Server will start but API endpoints may not work');
      console.warn('⚠️  Make sure DATABASE_URL is set in your .env file');
    }

    // Initialize blockchain connection (EVM)
    try {
      await initBlockchain();
    } catch (blockchainError: any) {
      console.warn('⚠️  EVM Blockchain connection failed:', blockchainError.message);
    }

    // Initialize Amadeus client
    try {
      initAmadeusClient();
    } catch (amadeusError: any) {
      console.warn('⚠️  Amadeus client init failed:', amadeusError.message);
    }

    // Initialize WebSocket
    initWebSocket(io);
    console.log('✅ WebSocket initialized');

    // Start background services (non-blocking)
    try {
      startAgentExecutor(io);
      console.log('✅ Agent executor started');
    } catch (executorError: any) {
      console.warn('⚠️  Agent executor failed to start:', executorError.message);
    }

    try {
      startIndexer(io);
      console.log('✅ Blockchain indexer started');
    } catch (indexerError: any) {
      console.warn('⚠️  Indexer failed to start:', indexerError.message);
    }

    // Start HTTP server (always start, even if services fail)
    httpServer.listen(PORT, () => {
      console.log(`🚀 EvoSwarm Backend running on http://localhost:${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`\n💡 Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

export { io };


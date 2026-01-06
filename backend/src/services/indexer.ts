import { Server as SocketIOServer } from 'socket.io';
import { subscribeToTable, supabase } from '../database/supabase';

// Event handlers for different table changes
function handleAgentChange(io: SocketIOServer, payload: any) {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  switch (eventType) {
    case 'INSERT':
      io.emit('agent.created', newRecord);
      break;
    case 'UPDATE':
      io.emit('agent.updated', { ...newRecord, previousStatus: oldRecord?.status });
      break;
    case 'DELETE':
      io.emit('agent.deleted', { id: oldRecord?.id });
      break;
  }
}

function handleTransactionChange(io: SocketIOServer, payload: any) {
  const { eventType, new: newRecord } = payload;
  
  if (eventType === 'INSERT') {
    io.emit('transaction.new', newRecord);
  } else if (eventType === 'UPDATE') {
    io.emit('transaction.updated', newRecord);
  }
}

function handleGenerationChange(io: SocketIOServer, payload: any) {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  if (eventType === 'INSERT') {
    io.emit('generation.started', newRecord);
  } else if (eventType === 'UPDATE' && newRecord?.status === 'completed') {
    io.emit('generation.completed', newRecord);
  }
}

// Start the indexer service
export function startIndexer(io: SocketIOServer): void {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️  Supabase not configured - real-time features disabled');
      console.warn('⚠️  Set SUPABASE_URL and SUPABASE_SERVICE_KEY to enable');
      return;
    }

    console.log('📡 Starting Supabase real-time indexer...');

    // Subscribe to agents table
    const agentsChannel = subscribeToTable('agents', (payload) => {
      handleAgentChange(io, payload);
    });

    // Subscribe to transactions table
    const transactionsChannel = subscribeToTable('transactions', (payload) => {
      handleTransactionChange(io, payload);
    });

    // Subscribe to generations table
    const generationsChannel = subscribeToTable('generations', (payload) => {
      handleGenerationChange(io, payload);
    });

    console.log('✅ Supabase real-time subscriptions active');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Closing Supabase channels...');
      supabase.removeChannel(agentsChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(generationsChannel);
    });
  } catch (error: any) {
    console.warn('⚠️  Failed to start indexer:', error.message);
  }
}

// Mock blockchain indexer for on-chain events
// In production, this would listen to contract events via viem/ethers
export async function indexBlockchainEvents(io: SocketIOServer): Promise<void> {
  // This is a placeholder for real blockchain event indexing
  // Would use viem's watchContractEvent to listen to:
  // - TradeExecuted events
  // - StakeDeposited events
  // - StrategyRegistered events
  
  console.log('📡 Blockchain indexer ready (mock mode)');
}

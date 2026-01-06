import { Socket, Server as SocketIOServer } from 'socket.io';

// WebSocket event handlers
export function initWebSocket(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Handle subscription requests
    socket.on('subscribe', (data: { topic: string }) => {
      const { topic } = data;
      const validTopics = ['agents', 'transactions', 'metrics', 'generations', 'system'];
      
      if (validTopics.includes(topic)) {
        socket.join(topic);
        console.log(`Client ${socket.id} subscribed to ${topic}`);
        socket.emit('subscribed', { topic, success: true });
      } else {
        socket.emit('error', { message: `Invalid topic: ${topic}` });
      }
    });

    // Handle unsubscription
    socket.on('unsubscribe', (data: { topic: string }) => {
      const { topic } = data;
      socket.leave(topic);
      console.log(`Client ${socket.id} unsubscribed from ${topic}`);
      socket.emit('unsubscribed', { topic, success: true });
    });

    // Handle ping for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });

    // Send initial connection success
    socket.emit('connected', { 
      socketId: socket.id,
      timestamp: Date.now(),
      availableTopics: ['agents', 'transactions', 'metrics', 'generations', 'system'],
    });
  });

  // Middleware for authentication (placeholder)
  io.use((socket, next) => {
    // In production, verify JWT token here
    // const token = socket.handshake.auth.token;
    // if (!verifyToken(token)) return next(new Error('Authentication error'));
    next();
  });
}

// Helper to broadcast to specific rooms
export function broadcastToRoom(io: SocketIOServer, room: string, event: string, data: any): void {
  io.to(room).emit(event, data);
}

// Helper to broadcast system alerts
export function broadcastSystemAlert(
  io: SocketIOServer, 
  severity: 'info' | 'warning' | 'error', 
  message: string
): void {
  io.emit('system.alert', { severity, message, timestamp: Date.now() });
}

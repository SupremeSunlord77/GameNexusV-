import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { analyzeBehavior } from '../services/behaviorAI';

const prisma = new PrismaClient();

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('✅ User connected:', socket.id);

    // Join a lobby
    socket.on('join_lobby', async (lobbyId: string) => {
      try {
        socket.join(lobbyId);
        console.log(`📥 Socket ${socket.id} joined lobby: ${lobbyId}`);

        // Load chat history
        const history = await prisma.chatMessage.findMany({
          where: { sessionId: lobbyId },
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'asc' },
          take: 50
        });

        socket.emit('load_history', history);
      } catch (err) {
        console.error('Error joining lobby:', err);
      }
    });

    // Send message with AI analysis
    socket.on('send_message', async (data: { lobbyId: string; userId: string; message: string }) => {
      try {
        const { lobbyId, userId, message } = data;
        console.log('💬 Message received:', message);

        // 🤖 AI ANALYSIS
        const analysis = await analyzeBehavior(userId, message);
        
        console.log('📊 Analysis complete:', {
          newRep: analysis.newRep,
          isToxic: analysis.isToxic,
          reason: analysis.reason,
          scoreChange: analysis.scoreChange
        });

        // Save message to database
        const chatMessage = await prisma.chatMessage.create({
          data: {
            content: message,
            userId,
            sessionId: lobbyId,
            isToxic: analysis.isToxic
          },
          include: {
            user: { select: { username: true } }
          }
        });

        // Broadcast to all users in lobby
        io.to(lobbyId).emit('receive_message', {
          username: chatMessage.user.username,
          message: chatMessage.content,
          isToxic: analysis.isToxic
        });

        // 🔥 CRITICAL FIX: Ensure ALL properties exist using nullish coalescing
        const reputationUpdate = {
          newScore: analysis.newRep ?? 50,
          change: analysis.scoreChange ?? 0,
          reason: analysis.reason ?? 'Message analyzed'
        };

        console.log('📤 Sending reputation update:', reputationUpdate);

        // Send reputation update ONLY to sender (private event)
        socket.emit('reputation_update', reputationUpdate);

        console.log(`✅ Message saved & broadcast. User reputation: ${analysis.newRep}`);
      } catch (err) {
        console.error('❌ Error sending message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });
};
import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { analyzeBehavior } from '../services/behaviorAI';

const prisma = new PrismaClient();

// --- Connection Tracking: socketId → userId ---
const connectedUsers = new Map<string, string>();

export function getConnectionCount(): number {
  return connectedUsers.size;
}

export const setupSocketHandlers = (io: Server) => {

  // 📡 Broadcast live stats to admin-room every 10 seconds
  setInterval(async () => {
    try {
      const activeSessions = await prisma.lFGSession.count({ where: { status: 'OPEN' } });
      const connectedPlayers = connectedUsers.size;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const deletedToday = await prisma.lFGDeletionLog.count({
        where: { deletedAt: { gte: today } }
      });

      const notificationsSent = await prisma.notification.count({
        where: { createdAt: { gte: today } }
      });

      io.to('admin-room').emit('live_stats_update', {
        activeSessions,
        connectedPlayers,
        deletedToday,
        notificationsSent,
        timestamp: new Date().toISOString()
      });
    } catch (_) {}
  }, 10000);

  io.on('connection', (socket: Socket) => {
    console.log('✅ User connected:', socket.id);

    // --- JOIN LOBBY ---
    socket.on('join_lobby', async (lobbyId: string) => {
      try {
        socket.join(lobbyId);
        console.log(`📥 Socket ${socket.id} joined lobby: ${lobbyId}`);

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

    // --- JOIN ADMIN ROOM ---
    socket.on('join_admin', () => {
      socket.join('admin-room');
      console.log(`🔐 Admin socket joined admin-room: ${socket.id}`);
    });

    // --- JOIN LFG FEED ---
    socket.on('join_lfg_feed', () => {
      socket.join('lfg_feed');
      console.log(`📡 Socket joined lfg_feed: ${socket.id}`);
    });

    // --- JOIN USER PERSONAL ROOM (for notifications) ---
    socket.on('join_user_room', (userId: string) => {
      socket.join(`user:${userId}`);
      connectedUsers.set(socket.id, userId);
      console.log(`🔔 Socket ${socket.id} joined user:${userId}`);
    });

    // --- SEND MESSAGE WITH AI ANALYSIS + MUTE CHECK ---
    socket.on('send_message', async (data: { lobbyId: string; userId: string; message: string }) => {
      try {
        const { lobbyId, userId, message } = data;
        console.log('💬 Message received:', message);

        // 🚫 MUTE CHECK — auto-expire old mutes
        await prisma.disciplinaryAction.updateMany({
          where: {
            userId,
            actionType: 'mute',
            isActive: true,
            expiresAt: { lt: new Date() }
          },
          data: { isActive: false }
        });

        const activeMute = await prisma.disciplinaryAction.findFirst({
          where: {
            userId,
            actionType: 'mute',
            isActive: true,
            expiresAt: { gt: new Date() }
          }
        });

        if (activeMute) {
          const remaining = Math.ceil((activeMute.expiresAt!.getTime() - Date.now()) / 60000);
          socket.emit('mute_error', {
            message: `You are muted for ${remaining} more minute${remaining !== 1 ? 's' : ''}.`
          });
          return;
        }

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

        const reputationUpdate = {
          newScore: analysis.newRep ?? 50,
          change: analysis.scoreChange ?? 0,
          reason: analysis.reason ?? 'Message analyzed'
        };

        socket.emit('reputation_update', reputationUpdate);

        console.log(`✅ Message saved & broadcast. User reputation: ${analysis.newRep}`);
      } catch (err) {
        console.error('❌ Error sending message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
      connectedUsers.delete(socket.id);
    });
  });
};

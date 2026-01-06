import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const setupSocketIO = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    // 1. Join Lobby & Load History
    socket.on("join_lobby", async (lobbyId: string) => {
      socket.join(lobbyId);
      console.log(`User ${socket.id} joined lobby: ${lobbyId}`);

      try {
        // Fetch last 50 messages from the Database
        const history = await prisma.chatMessage.findMany({
          where: { sessionId: lobbyId },
          include: { user: { select: { username: true } } }, // Get the username too
          orderBy: { createdAt: 'asc' }, // Oldest first
          take: 50
        });

        // Send history ONLY to the user who just joined
        socket.emit("load_history", history);
        
      } catch (error) {
        console.error("Error loading history:", error);
      }
    });

    // 2. Handle Sending Messages
    socket.on("send_message", async (data) => {
      // data = { lobbyId, userId, message }
      console.log(`Msg in ${data.lobbyId}: ${data.message}`);

      try {
        // SAVE to Database
        const savedMsg = await prisma.chatMessage.create({
          data: {
            content: data.message,
            sessionId: data.lobbyId,
            userId: data.userId // We need the User ID to link it!
          },
          include: { user: { select: { username: true } } }
        });

        // Broadcast to everyone in the room (including sender)
        io.to(data.lobbyId).emit("receive_message", {
          username: savedMsg.user.username,
          message: savedMsg.content,
          createdAt: savedMsg.createdAt
        });

      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
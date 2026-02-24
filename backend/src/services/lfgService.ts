import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateSessionInput {
  hostUserId: string;
  gameId: string;
  title: string;
  description?: string;
  region: string;
  micRequired: boolean;
  maxPlayers: number;
}

export const lfgService = {
  // 1. Get All Games (So frontend can show a dropdown)
  getAllGames: async () => {
    return await prisma.game.findMany();
  },
  // 2. Create a new Session (Host a Lobby)
  createSession: async (data: CreateSessionInput) => {
  const {
    hostUserId,
    gameId,
    title,
    description,
    region,
    micRequired,
    maxPlayers
  } = data;

    return await prisma.lFGSession.create({
      data: {
        title,
        description,
        region,
        micRequired,
        maxPlayers,
        currentPlayers: 1,

        // REQUIRED relation: host
        host: {
          connect: { id: hostUserId }
        },

        // REQUIRED relation: game
        game: {
          connect: { id: gameId }
        },

        // Auto-join host as participant
        participants: {
          create: {
            userId: hostUserId
            }
          }
        }
      });
  },

  // 3. Get All Open Sessions (The Feed)
  getSessions: async () => {
    // NOTICE: 'lFGSession'
    return await prisma.lFGSession.findMany({
      where: { status: 'OPEN' },
      include: {
        game: true,
        host: { select: { username: true, reputationScore: true } } // Show host name & rep
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // 4. Join a Session
  joinSession: async (sessionId: string, userId: string) => {
    // Check if session exists and is open
    // NOTICE: 'lFGSession'
    const session = await prisma.lFGSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");
    if (session.status !== 'OPEN') throw new Error("Session is not open");
    if (session.currentPlayers >= session.maxPlayers) throw new Error("Session is full");

    // Check if user already joined
    // NOTICE: 'lFGParticipant'
    const existing = await prisma.lFGParticipant.findUnique({
      where: { sessionId_userId: { sessionId, userId } }
    });
    if (existing) throw new Error("You are already in this session");

    const newCount = session.currentPlayers + 1;
    const newStatus = newCount >= session.maxPlayers ? 'FULL' : 'OPEN';

    // Add user and update count (Transaction ensures safety)
    return await prisma.$transaction([
      prisma.lFGParticipant.create({
        data: { sessionId, userId }
      }),
      prisma.lFGSession.update({
        where: { id: sessionId },
        data: { currentPlayers: { increment: 1 }, status: newStatus }
      })
    ]);
  },

  // 5. Leave a Session (non-host player, or host which auto-closes)
  leaveSession: async (sessionId: string, userId: string) => {
    const session = await prisma.lFGSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");

    const participant = await prisma.lFGParticipant.findUnique({
      where: { sessionId_userId: { sessionId, userId } }
    });
    if (!participant) throw new Error("You are not in this session");

    const isHost = session.hostUserId === userId;
    const newCount = session.currentPlayers - 1;
    // Close if host leaves or the last participant leaves
    const shouldClose = isHost || newCount <= 0;

    await prisma.$transaction([
      prisma.lFGParticipant.delete({ where: { sessionId_userId: { sessionId, userId } } }),
      prisma.lFGSession.update({
        where: { id: sessionId },
        data: {
          currentPlayers: { decrement: 1 },
          ...(shouldClose ? { status: 'CLOSED' } : {})
        }
      })
    ]);

    return { closed: shouldClose };
  },

  // 6. Close a Session (host only — explicit close button)
  closeSession: async (sessionId: string, userId: string) => {
    const session = await prisma.lFGSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");
    if (session.hostUserId !== userId) throw new Error("Only the host can close this session");

    return await prisma.lFGSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED' }
    });
  }
};
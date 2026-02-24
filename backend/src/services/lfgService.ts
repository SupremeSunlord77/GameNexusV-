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

    // Add user and update count (Transaction ensures safety)
    return await prisma.$transaction([
      prisma.lFGParticipant.create({
        data: { sessionId, userId }
      }),
      prisma.lFGSession.update({
        where: { id: sessionId },
        data: { currentPlayers: { increment: 1 } }
      })
    ]);
  }
};
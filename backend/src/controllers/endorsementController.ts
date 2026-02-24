import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🚨 EMERGENCY 24-HOUR VERSION
 * Endorse Another User (Creates Trust Edge)
 * POST /api/endorsements/:userId
 */
export const endorseUser = async (req: Request, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const { type } = req.body; // 'teamPlayer', 'positive', 'skilled', 'shotcaller'
    const sourceUserId = req.user?.id || req.user?.userId;

    if (!sourceUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (sourceUserId === targetUserId) {
      res.status(400).json({ error: "Cannot endorse yourself" });
      return;
    }

    // Validate endorsement type
    const validTypes = ['teamPlayer', 'positive', 'skilled', 'shotcaller'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ 
        error: "Invalid endorsement type",
        validTypes 
      });
      return;
    }

    // Create or update trust edge in graph
    const edge = await prisma.trustEdge.upsert({
      where: {
        sourceUserId_targetUserId: {
          sourceUserId,
          targetUserId: targetUserId
        }
      },
      create: {
        sourceUserId,
        targetUserId: targetUserId,
        weight: 0.8,
        source: 'ENDORSEMENT'
      },
      update: {
        weight: 0.9, // Increase weight on re-endorsement
        source: 'ENDORSEMENT'
      }
    });

    // Update endorsement counts on user
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { endorsements: true }
    });

    const currentEndorsements = (user?.endorsements as any) || {
      teamPlayer: 0,
      positive: 0,
      skilled: 0,
      shotcaller: 0
    };

    currentEndorsements[type] = (currentEndorsements[type] || 0) + 1;

    await prisma.user.update({
      where: { id: targetUserId },
      data: { 
        endorsements: currentEndorsements,
        // Slightly boost eigenTrustScore on endorsement (temporary boost until full calculation)
        eigenTrustScore: { increment: 0.01 }
      }
    });

    res.json({
      success: true,
      message: `${type} endorsement recorded! 👍`,
      newCount: currentEndorsements[type],
      totalEndorsements: Object.values(currentEndorsements).reduce((a: any, b: any) => a + b, 0)
    });
  } catch (error) {
    console.error("Endorsement error:", error);
    res.status(500).json({ error: "Failed to record endorsement" });
  }
};

/**
 * Get User's Endorsements and Trust Info
 * GET /api/endorsements/:userId
 */
export const getEndorsements = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const [user, incomingTrust, outgoingTrust] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          endorsements: true,
          eigenTrustScore: true,
          reputation: true
        }
      }),
      prisma.trustEdge.findMany({
        where: { targetUserId: userId },
        include: {
          sourceUser: {
            select: { 
              id: true,
              username: true, 
              eigenTrustScore: true 
            }
          }
        },
        orderBy: { weight: 'desc' },
        take: 10 // Only show top 10 endorsers
      }),
      prisma.trustEdge.findMany({
        where: { sourceUserId: userId },
        include: {
          targetUser: {
            select: { 
              id: true,
              username: true 
            }
          }
        },
        take: 10
      })
    ]);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const endorsements = (user.endorsements as any) || {
      teamPlayer: 0,
      positive: 0,
      skilled: 0,
      shotcaller: 0
    };

    res.json({
      user: {
        username: user.username,
        trustScore: user.eigenTrustScore,
        reputation: user.reputation
      },
      endorsements: {
        counts: endorsements,
        total: Object.values(endorsements).reduce((a: any, b: any) => a + b, 0)
      },
      trustGraph: {
        incomingCount: incomingTrust.length,
        outgoingCount: outgoingTrust.length,
        topEndorsers: incomingTrust.map(edge => ({
          username: edge.sourceUser.username,
          userId: edge.sourceUser.id,
          weight: edge.weight,
          theirTrust: edge.sourceUser.eigenTrustScore,
          date: edge.createdAt
        })),
        endorsed: outgoingTrust.map(edge => ({
          username: edge.targetUser.username,
          userId: edge.targetUser.id,
          weight: edge.weight,
          date: edge.createdAt
        }))
      }
    });
  } catch (error) {
    console.error("Get endorsements error:", error);
    res.status(500).json({ error: "Failed to get endorsements" });
  }
};

/**
 * Get Endorsement Stats (For Admin/Analytics)
 * GET /api/endorsements/stats
 */
export const getEndorsementStats = async (req: Request, res: Response) => {
  try {
    const [totalEdges, userStats] = await Promise.all([
      prisma.trustEdge.count(),
      prisma.user.findMany({
        where: {
          role: 'USER'
        },
        select: {
          id: true,
          username: true,
          endorsements: true,
          eigenTrustScore: true
        },
        orderBy: {
          eigenTrustScore: 'desc'
        },
        take: 20 // Top 20 most trusted
      })
    ]);

    const processedStats = userStats.map(user => {
      const endorsements = (user.endorsements as any) || {};
      const total = Object.values(endorsements).reduce((a: any, b: any) => a + b, 0);
      
      return {
        userId: user.id,
        username: user.username,
        totalEndorsements: total,
        trustScore: user.eigenTrustScore,
        breakdown: endorsements
      };
    });

    res.json({
      totalTrustEdges: totalEdges,
      topUsers: processedStats,
      averageTrust: processedStats.reduce((sum, u) => sum + u.trustScore, 0) / processedStats.length
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
};
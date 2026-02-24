import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🚨 EMERGENCY 24-HOUR VERSION
 * Submit Quick Behavioral Assessment (10 questions)
 * POST /api/behavioral/assessment
 */
export const submitAssessment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { answers } = req.body; // Array of 10 scores (1-5)

    if (!answers || answers.length !== 10) {
      res.status(400).json({ error: "Please answer all 10 questions" });
      return;
    }

    // Calculate 5 behavioral vectors from 10 questions
    const vectors = {
      communicationDensity: (answers[0] + answers[1]) / 10,  // Q1,Q2 → 0-1
      competitiveIntensity: (answers[2] + answers[3]) / 10,  // Q3,Q4 → 0-1
      scheduleReliability: 0.5,                              // Default (calculated from history later)
      toxicityTolerance: (answers[4] + answers[5]) / 10,     // Q5,Q6 → 0-1
      mentorshipPropensity: (answers[6] + answers[7]) / 10   // Q7,Q8 → 0-1
    };

    // Determine Bartle Type (simplified)
    const bartleScores = {
      ACHIEVER: answers[8],      // Q9: "I play to win and rank up"
      SOCIALIZER: answers[9],    // Q10: "I play to make friends"
      EXPLORER: answers[2],      // Q3: Curiosity/exploration
      KILLER: answers[3]         // Q4: Competitiveness
    };

    const bartleType = Object.entries(bartleScores)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];

    const gamerDNA = {
      bartleType,
      assessmentDate: new Date(),
      playStyleTags: generateTags(vectors)
    };

    // Update user in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        behavioralVectors: vectors,
        gamerDNA: gamerDNA
      }
    });

    res.json({
      success: true,
      message: "Gamer DNA Profile Created! 🎮",
      profile: {
        vectors,
        bartleType,
        playStyleTags: gamerDNA.playStyleTags,
        radarChartData: generateRadarData(vectors)
      }
    });
  } catch (error) {
    console.error("Assessment error:", error);
    res.status(500).json({ error: "Assessment failed" });
  }
};

/**
 * Get Behavioral Profile
 * GET /api/behavioral/profile/:userId
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        behavioralVectors: true,
        gamerDNA: true,
        eigenTrustScore: true,
        endorsements: true,
        reputation: true
      }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.behavioralVectors) {
      res.json({
        ...user,
        needsAssessment: true,
        message: "User needs to complete behavioral assessment"
      });
      return;
    }

    res.json({
      ...user,
      radarChartData: generateRadarData(user.behavioralVectors as any),
      needsAssessment: false
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};

/**
 * Calculate Compatibility Between Current User and Target User
 * GET /api/behavioral/compatibility/:targetUserId
 */
export const calculateCompatibility = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?.id || req.user?.userId;
    const { targetUserId } = req.params;

    if (!currentUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (currentUserId === targetUserId) {
      res.status(400).json({ error: "Cannot calculate compatibility with yourself" });
      return;
    }

    const [user1, user2] = await Promise.all([
      prisma.user.findUnique({ 
        where: { id: currentUserId },
        select: {
          username: true,
          behavioralVectors: true,
          gamerDNA: true,
          eigenTrustScore: true
        }
      }),
      prisma.user.findUnique({ 
        where: { id: targetUserId },
        select: {
          username: true,
          behavioralVectors: true,
          gamerDNA: true,
          eigenTrustScore: true
        }
      })
    ]);

    if (!user1 || !user2) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user1.behavioralVectors || !user2.behavioralVectors) {
      res.json({
        score: 0.5,
        needsAssessment: true,
        message: "One or both users need to complete behavioral assessment",
        user1HasProfile: !!user1.behavioralVectors,
        user2HasProfile: !!user2.behavioralVectors
      });
      return;
    }

    const v1 = user1.behavioralVectors as any;
    const v2 = user2.behavioralVectors as any;

    // Calculate Euclidean distance in 5D space
    const distance = Math.sqrt(
      Math.pow(v1.communicationDensity - v2.communicationDensity, 2) +
      Math.pow(v1.competitiveIntensity - v2.competitiveIntensity, 2) +
      Math.pow(v1.scheduleReliability - v2.scheduleReliability, 2) +
      Math.pow(v1.toxicityTolerance - v2.toxicityTolerance, 2) +
      Math.pow(v1.mentorshipPropensity - v2.mentorshipPropensity, 2)
    );

    const maxDistance = Math.sqrt(5); // Max distance in 5D unit cube
    const behaviorScore = 1 - (distance / maxDistance);
    
    // Include trust in calculation
    const trustScore = (user1.eigenTrustScore + user2.eigenTrustScore) / 2;
    
    // Weighted: 70% behavior, 30% trust
    const finalScore = behaviorScore * 0.7 + trustScore * 0.3;

    res.json({
      score: finalScore,
      breakdown: {
        behavioral: behaviorScore,
        trust: trustScore,
        distance: distance
      },
      interpretation: getInterpretation(finalScore),
      details: {
        user1: {
          username: user1.username,
          type: (user1.gamerDNA as any)?.bartleType
        },
        user2: {
          username: user2.username,
          type: (user2.gamerDNA as any)?.bartleType
        }
      },
      recommendation: getRecommendation(finalScore, v1, v2)
    });
  } catch (error) {
    console.error("Compatibility error:", error);
    res.status(500).json({ error: "Compatibility calculation failed" });
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function generateTags(vectors: any): string[] {
  const tags: string[] = [];
  
  if (vectors.communicationDensity > 0.7) tags.push("Chatty");
  else if (vectors.communicationDensity < 0.3) tags.push("Silent");
  
  if (vectors.competitiveIntensity > 0.7) tags.push("Tryhard");
  else if (vectors.competitiveIntensity < 0.3) tags.push("Casual");
  
  if (vectors.mentorshipPropensity > 0.7) tags.push("Sherpa");
  else if (vectors.mentorshipPropensity < 0.3) tags.push("Solo Player");
  
  if (vectors.toxicityTolerance < 0.3) tags.push("Safe Space");
  else if (vectors.toxicityTolerance > 0.7) tags.push("Thick Skin");
  
  return tags;
}

function generateRadarData(vectors: any) {
  return {
    labels: [
      'Communication',
      'Competitive',
      'Reliability',
      'Toxicity Tolerance',
      'Mentorship'
    ],
    values: [
      vectors.communicationDensity * 100,
      vectors.competitiveIntensity * 100,
      vectors.scheduleReliability * 100,
      vectors.toxicityTolerance * 100,
      vectors.mentorshipPropensity * 100
    ]
  };
}

function getInterpretation(score: number): string {
  if (score > 0.8) return "Excellent Match - Very compatible playstyles";
  if (score > 0.65) return "Good Match - Compatible in most areas";
  if (score > 0.5) return "Moderate Match - Some differences but workable";
  if (score > 0.35) return "Poor Match - Significant playstyle differences";
  return "Very Poor Match - Incompatible playstyles";
}

function getRecommendation(score: number, v1: any, v2: any): string {
  if (score > 0.7) {
    return "Great compatibility! This could be a long-term teammate.";
  }
  
  const diffs: string[] = [];
  
  if (Math.abs(v1.communicationDensity - v2.communicationDensity) > 0.4) {
    diffs.push("communication style");
  }
  if (Math.abs(v1.competitiveIntensity - v2.competitiveIntensity) > 0.4) {
    diffs.push("competitive mindset");
  }
  if (Math.abs(v1.toxicityTolerance - v2.toxicityTolerance) > 0.4) {
    diffs.push("behavior expectations");
  }
  
  if (diffs.length > 0) {
    return `Consider discussing ${diffs.join(', ')} before teaming up.`;
  }
  
  return "Moderate compatibility. Worth trying a casual game first.";
}
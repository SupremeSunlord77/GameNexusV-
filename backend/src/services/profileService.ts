import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ProfileInput {
  userId: string;
  displayName?: string;
  bio?: string;
  region: string;
  primaryLanguage: string;
  playStyle: "CASUAL" | "COMPETITIVE" | "HARDCORE";
  communicationPref: "VOICE" | "TEXT" | "PING_ONLY";
}

export const profileService = {
  // Create or Update a user's profile
  upsertProfile: async (data: ProfileInput) => {
    return prisma.userProfile.upsert({
      where: { userId: data.userId },
      update: {
        displayName: data.displayName,
        bio: data.bio,
        region: data.region,
        primaryLanguage: data.primaryLanguage,
        playStyle: data.playStyle,
        communicationPref: data.communicationPref
      },
      create: {
        userId: data.userId,
        displayName: data.displayName,
        bio: data.bio,
        region: data.region,
        primaryLanguage: data.primaryLanguage,
        playStyle: data.playStyle,
        communicationPref: data.communicationPref
      }
    });
  },

  // Get a profile by User ID (safe for first-time users)
  getProfile: async (userId: string) => {
    return prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });
  }
};

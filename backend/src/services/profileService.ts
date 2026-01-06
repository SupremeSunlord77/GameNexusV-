import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProfileInput {
  userId: string;
  displayName?: string;
  bio?: string;
  region: string;
  playStyle: 'CASUAL' | 'COMPETITIVE' | 'HARDCORE'; // Matches your schema logic
  communicationPref: 'VOICE' | 'TEXT' | 'PING_ONLY';
}

export const profileService = {
  // Create or Update a user's profile
  upsertProfile: async (data: ProfileInput) => {
    return await prisma.userProfile.upsert({
      where: { userId: data.userId },
      update: {
        displayName: data.displayName,
        bio: data.bio,
        region: data.region,
        playStyle: data.playStyle,
        communicationPref: data.communicationPref
      },
      create: {
        userId: data.userId,
        displayName: data.displayName,
        bio: data.bio,
        region: data.region,
        playStyle: data.playStyle,
        communicationPref: data.communicationPref
      }
    });
  },

  // Get a profile by User ID
  getProfile: async (userId: string) => {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: { user: { select: { username: true, email: true } } }
    });
    
    if (!profile) throw new Error('Profile not found');
    return profile;
  }
};
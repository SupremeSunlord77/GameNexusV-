import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client'; // <--- Added missing import
import { profileService } from '../services/profileService';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient(); // <--- Initialize Prisma

export const upsertProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const profile = await profileService.upsertProfile({ ...req.body, userId });
    res.status(200).json(profile);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    
    const profile = await profileService.getProfile(userId);
    res.json(profile);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

// 👇 This is the new function (Only pasted once!)
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params; // Get ID from URL
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        username: true, 
        email: true, 
        createdAt: true 
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Wrap it in { user: ... } to match what the Frontend expects
    res.json({ user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: 'Server error' });
  }
};
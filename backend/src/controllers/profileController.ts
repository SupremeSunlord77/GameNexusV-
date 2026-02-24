import { Response, Request } from "express";
import { profileService } from "../services/profileService";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Create or Update logged-in user's profile
 * PUT /api/profile/me
 */
export const upsertProfile = async (
  req: Request, // 👈 Updated to Request
  res: Response
): Promise<void> => {
  try {
    // Note: Check if your JWT payload uses 'id' or 'userId'. 
    // If you used 'userId' in your token generation, change this to req.user?.userId
    const userId = req.user?.id || req.user?.userId; 
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const profile = await profileService.upsertProfile({
      ...req.body,
      userId
    });

    res.status(200).json(profile);
  } catch (error) {
    console.error("Profile upsert failed:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/**
 * Get logged-in user's profile (USER + PROFILE)
 * GET /api/profile/me
 */
export const getMyProfile = async (
  req: Request, // 👈 Updated to Request
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        email: true,
        createdAt: true
      }
    });

    const profile = await profileService.getProfile(userId);

    res.json({
      user,
      profile
    });
  } catch (error) {
    console.error("Failed to fetch my profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get public profile by userId
 * GET /api/profile/:userId
 */
export const getProfileByUserId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        email: true,
        createdAt: true
      }
    });

    const profile = await profileService.getProfile(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ user, profile });
  } catch (error) {
    console.error("Failed to fetch public profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};
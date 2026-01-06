import { Request, Response } from 'express';
import { lfgService } from '../services/lfgService';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getGames = async (req: Request, res: Response) => {
  const games = await lfgService.getAllGames();
  res.json(games);
};

export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const hostUserId = req.user?.id;
    if (!hostUserId) { res.sendStatus(401); return; }

    const session = await lfgService.createSession({ ...req.body, hostUserId });
    res.status(201).json(session);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await lfgService.getSessions();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
};

export const joinSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.body;
    
    if (!userId) { res.sendStatus(401); return; }

    await lfgService.joinSession(sessionId, userId);
    res.json({ message: "Successfully joined session!" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
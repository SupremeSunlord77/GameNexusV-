import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface globally to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: any; // Allows usage of req.user in any controller
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    // 👇 FIX: Use the SAME fallback key as your authController
    // If .env is missing, this ensures we still use the "super_secret..." key
    const secret = process.env.JWT_SECRET || 'super_secret_fallback_key';
    
    const verified = jwt.verify(token, secret);
    req.user = verified; // Attach user info (id, role) to request
    next();
  } catch (err) {
    console.log("Token Verification Error:", err); // Optional: helps debug
    res.status(400).json({ error: "Invalid Token" });
  }
};
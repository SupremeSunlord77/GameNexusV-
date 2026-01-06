import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Express Request type to include user data
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    jwt.verify(token, process.env.JWT_SECRET || 'super_secret_fallback_key', (err, user) => {
      if (err) {
        res.sendStatus(403); // Forbidden (Token invalid)
        return; 
      }

      req.user = user as any;
      next(); // Move to the next function (the controller)
    });
  } else {
    res.sendStatus(401); // Unauthorized (No token provided)
  }
};
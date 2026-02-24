// types/express.d.ts
// This file extends Express Request type with custom properties

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        userId?: string;
        email?: string;
        role?: string;
      };
    }
  }
}

export {};
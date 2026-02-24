import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

// Define permissions for each endpoint
type Permission = {
  [key in UserRole]?: boolean;
};

type EndpointPermissions = {
  [endpoint: string]: Permission;
};

// Access Control Matrix
const permissions: EndpointPermissions = {
  // Auth - Everyone
  'auth:register': { USER: true, MODERATOR: true, ADMIN: true },
  'auth:login': { USER: true, MODERATOR: true, ADMIN: true },
  
  // Profile Management - Everyone
  'profile:read': { USER: true, MODERATOR: true, ADMIN: true },
  'profile:update': { USER: true, MODERATOR: true, ADMIN: true },
  
  // LFG Sessions - Everyone
  'lfg:browse': { USER: true, MODERATOR: true, ADMIN: true },
  'lfg:create': { USER: true, MODERATOR: true, ADMIN: true },
  'lfg:join': { USER: true, MODERATOR: true, ADMIN: true },
  
  // Behavioral System - Everyone (read), Auth users (submit)
  'behavioral:assessment': { USER: true, MODERATOR: true, ADMIN: true },
  'behavioral:profile': { USER: true, MODERATOR: true, ADMIN: true },
  'behavioral:compatibility': { USER: true, MODERATOR: true, ADMIN: true },
  
  // Endorsements - Everyone
  'endorsement:create': { USER: true, MODERATOR: true, ADMIN: true },
  'endorsement:read': { USER: true, MODERATOR: true, ADMIN: true },
  
  // Moderation - MODERATOR & ADMIN only
  'moderation:flagged-users': { MODERATOR: true, ADMIN: true },
  'moderation:ban': { MODERATOR: true, ADMIN: true },
  'moderation:warn': { MODERATOR: true, ADMIN: true },
  'moderation:chat-context': { MODERATOR: true, ADMIN: true },
  'moderation:reputation-adjust': { MODERATOR: true, ADMIN: true },
  'moderation:all-users': { MODERATOR: true, ADMIN: true },
  
  // Admin Only
  'admin:stats': { ADMIN: true },
  'admin:audit-logs': { ADMIN: true },
  'admin:create-moderator': { ADMIN: true },
  
  // Endorsement Stats (can be admin or open)
  'endorsement:stats': { ADMIN: true }
};

/**
 * RBAC Middleware Factory
 * Creates a middleware that checks if user has required permission
 * 
 * @param permissionKey - The permission key from the permissions object
 */
export const requirePermission = (permissionKey: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    const userRole = req.user.role as UserRole;
    
    // Check if permission exists
    if (!permissions[permissionKey]) {
      console.error(`Permission key "${permissionKey}" not defined in RBAC matrix`);
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Permission not defined' 
      });
    }

    // Check if user's role has permission
    if (!permissions[permissionKey][userRole]) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Access denied. Required role: ${Object.keys(permissions[permissionKey]).join(' or ')}`,
        yourRole: userRole
      });
    }

    // Permission granted
    next();
  };
};

/**
 * Role-based middleware (simpler version)
 * Allows access only to specified roles
 * 
 * @param allowedRoles - Array of roles that can access the endpoint
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        yourRole: userRole
      });
    }

    next();
  };
};

/**
 * Check if user is banned
 */
export const checkBanStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Import prisma here to avoid circular dependencies
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: req.user.id || req.user.userId },
      select: { isBanned: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Staff cannot be banned via system
    if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
      return next();
    }

    if (user.isBanned) {
      return res.status(403).json({ 
        error: 'Account suspended',
        message: 'Your account has been banned. Contact support for assistance.' 
      });
    }

    next();
  } catch (error) {
    console.error('Ban check error:', error);
    res.status(500).json({ error: 'Failed to verify account status' });
  }
};

/**
 * Admin only middleware (shorthand)
 */
export const adminOnly = requireRole(UserRole.ADMIN);

/**
 * Staff only middleware (ADMIN or MODERATOR)
 */
export const staffOnly = requireRole(UserRole.ADMIN, UserRole.MODERATOR);

/**
 * Authenticated users only (any role)
 */
export const authenticated = requireRole(UserRole.USER, UserRole.MODERATOR, UserRole.ADMIN);
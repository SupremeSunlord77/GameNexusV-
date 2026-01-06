import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const prisma = new PrismaClient();

// Helper: Generate Token
const generateToken = (user: any) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'super_secret_fallback_key',
    { expiresIn: '7d' }
  );
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username } = req.body;

    // 1. Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Create User in DB
    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: 'USER' // Default role
      }
    });

    // 4. Return Token
    const token = generateToken(newUser);
    res.status(201).json({ token, user: { id: newUser.id, username: newUser.username, role: newUser.role } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Find User
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    // 2. Check Password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    // 3. Return Token
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};
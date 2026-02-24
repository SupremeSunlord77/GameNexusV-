import { PrismaClient, UserRole } from '@prisma/client'; // Import UserRole enum
import bcrypt from 'bcryptjs'; // You need this to hash passwords

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Seeding...');

  // 1. SEED GAMES
  const games = [
    { name: 'Valorant', genre: 'Tactical Shooter' },
    { name: 'Apex Legends', genre: 'Battle Royale' },
    { name: 'League of Legends', genre: 'MOBA' },
    { name: 'Counter-Strike 2', genre: 'Tactical Shooter' },
    { name: 'Dota 2', genre: 'MOBA' },
    { name: 'Overwatch 2', genre: 'Hero Shooter' },
    { name: 'Minecraft', genre: 'Sandbox' },
    { name: 'Fortnite', genre: 'Battle Royale' }
  ];

  for (const game of games) {
    await prisma.game.upsert({
      where: { name: game.name },
      update: {},
      create: game
    });
  }
  console.log('✅ Games Seeded');

  // 2. SEED USERS
  const passwordHash = await bcrypt.hash('password123', 10); // Default password for everyone

  const users = [
    {
      email: 'admin@gamenexus.com',
      username: 'TheAdmin',
      role: UserRole.ADMIN,
      reputation: 100 // Admin is perfect
    },
    {
      email: 'mod@gamenexus.com',
      username: 'TheModerator',
      role: UserRole.MODERATOR,
      reputation: 90 // Mod is trusted
    },
    {
      email: 'user@gamenexus.com',
      username: 'RegularJoe',
      role: UserRole.USER,
      reputation: 50 // Normal start
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {}, // If exists, do nothing
      create: {
        email: user.email,
        username: user.username,
        passwordHash: passwordHash,
        role: user.role,
        reputation: user.reputation,
        profile: {
          create: {
            region: 'NA',
            bio: `I am the ${user.role.toLowerCase()} of this server.`
          }
        }
      }
    });
  }
  console.log('✅ Users Seeded');
  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const games = [
    { name: 'Valorant', genre: 'Tactical Shooter' },
    { name: 'Apex Legends', genre: 'Battle Royale' },
    { name: 'League of Legends', genre: 'MOBA' },
    { name: 'Counter-Strike 2', genre: 'Tactical Shooter' },
    { name: 'Overwatch 2', genre: 'Hero Shooter' }
  ];

  console.log('🌱 Seeding Games...');

  for (const game of games) {
    await prisma.game.upsert({
      where: { name: game.name },
      update: {},
      create: game,
    });
  }

  console.log('✅ Games seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
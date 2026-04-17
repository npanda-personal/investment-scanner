const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const userId = 'test-user-id';
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    await prisma.user.create({
      data: {
        id: userId,
        email: 'test@example.com',
        passwordHash: '$2b$10$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhash', // dummy bcrypt hash
        firstName: 'Test',
        lastName: 'User',
      },
    });
    console.log('✅ Created test user with ID', userId);
  } else {
    console.log('✅ Test user already exists');
  }
}

seed()
  .catch((error) => {
    console.error('Failed to seed test user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Keep these aligned with the Playwright auth helper defaults
// (frontend/tests/ui/support/auth.ts -> E2E_EMAIL / E2E_PASSWORD).
const EMAIL = (process.env.E2E_EMAIL || 'test@example.com').trim().toLowerCase();
const PASSWORD = process.env.E2E_PASSWORD || 'TestUser123!';
const DISPLAY_NAME = 'Test User';

// Mirror AuthIdentityService.hashPassword: scrypt$<salt>$<hash> (base64url).
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => (error ? reject(error) : resolve(key)));
  });
  return `scrypt$${salt}$${derived.toString('base64url')}`;
}

async function seed() {
  const existing = await prisma.appUser.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log('✅ Test user already exists:', EMAIL);
    return;
  }
  const user = await prisma.appUser.create({
    data: {
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      displayName: DISPLAY_NAME,
      subscription: {
        create: { planCode: 'FREE', status: 'ACTIVE' },
      },
    },
  });
  console.log('✅ Created test user', EMAIL, 'with ID', user.id);
}

seed()
  .catch((error) => {
    console.error('Failed to seed test user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

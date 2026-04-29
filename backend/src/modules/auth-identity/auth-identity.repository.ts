import prisma from '../../db/prisma';

export class AuthIdentityRepository {
  constructor(private readonly db = prisma) {}

  findByEmail(email: string) {
    return this.db.appUser.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.db.appUser.findUnique({ where: { id } });
  }

  createUser(input: { email: string; passwordHash: string; name?: string | null }) {
    return this.db.appUser.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.name ?? null,
        subscription: {
          create: { planCode: 'FREE', status: 'ACTIVE' },
        },
      },
    });
  }

  updateProfile(id: string, input: { name?: string | null }) {
    return this.db.appUser.update({
      where: { id },
      data: { displayName: input.name },
    });
  }

  updateLastLogin(id: string) {
    return this.db.appUser.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}

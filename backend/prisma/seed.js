import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Crea el usuario id=1 si no existe. Idempotente para poder correrlo cada vez que arranca.
await prisma.user.upsert({
  where: { id: 1 },
  update: {},
  create: { id: 1, name: 'Lorenzo' },
});

console.log('seed: user id=1 listo');
await prisma.$disconnect();

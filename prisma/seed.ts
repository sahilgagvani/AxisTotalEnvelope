import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashed = await bcrypt.hash('password123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@axis.com' },
    update: { password: hashed },
    create: {
      email: 'admin@axis.com',
      password: hashed,
      name: 'Sahil',
      role: 'ADMIN',
    },
  })
  console.log('✅ Seeded admin user: admin@axis.com / password123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
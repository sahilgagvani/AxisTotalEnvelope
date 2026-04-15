import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Edit this list to add/remove/update users ───────────────────────────────
const users: { email: string; name: string; password: string; role: Role }[] = [
  { email: 'admin@axis.com',     name: 'Sahil',  password: 'password123', role: 'ADMIN'        },
  { email: 'inspector@axis.com', name: 'Alex',   password: 'password123', role: 'QC_INSPECTOR' },
]
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const seededEmails: string[] = []

  for (const user of users) {
    const hashed = await bcrypt.hash(user.password, 10)
    await prisma.user.upsert({
      where:  { email: user.email },
      update: { name: user.name, password: hashed, role: user.role },
      create: { email: user.email, name: user.name, password: hashed, role: user.role },
    })
    seededEmails.push(user.email)
    console.log(`✅ Upserted: ${user.email} (${user.role})`)
  }

  // Remove any users in the DB that are no longer in the list above
  const { count } = await prisma.user.deleteMany({
    where: { email: { notIn: seededEmails } },
  })
  if (count > 0) console.log(`🗑️  Removed ${count} user(s) no longer in seed list`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

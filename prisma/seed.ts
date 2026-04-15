import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Edit this list to add/remove/update users ───────────────────────────────
const users: { username: string; name: string; pin: string; role: Role }[] = [
  { username: 'admin',     name: 'Sahil', pin: '1234', role: 'ADMIN'        },
  { username: 'inspector', name: 'Ash',  pin: '5678', role: 'QC_INSPECTOR' },
]
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const seededUsernames: string[] = []

  for (const user of users) {
    const hashed = await bcrypt.hash(user.pin, 10)
    await prisma.user.upsert({
      where:  { username: user.username },
      update: { name: user.name, pin: hashed, role: user.role },
      create: { username: user.username, name: user.name, pin: hashed, role: user.role },
    })
    seededUsernames.push(user.username)
    console.log(`✅ Upserted: ${user.username} (${user.role})`)
  }

  // Remove any users in the DB that are no longer in the list above
  const { count } = await prisma.user.deleteMany({
    where: { username: { notIn: seededUsernames } },
  })
  if (count > 0) console.log(`🗑️  Removed ${count} user(s) no longer in seed list`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

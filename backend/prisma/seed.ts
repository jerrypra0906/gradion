import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

type MockCaseRow = {
  case_number: number;
  observation_text: string;
  initial_programs: string[];
};

async function seedMockAutismCasesInline() {
  const raw = readFileSync(path.join(__dirname, '../src/data/mockAutismCases.json'), 'utf8');
  const rows = JSON.parse(raw) as MockCaseRow[];
  let inserted = 0;
  let updated = 0;
  for (const row of rows) {
    const id = `mock_${row.case_number}`;
    const existing = await prisma.abaAutismCase.findUnique({ where: { id } });
    await prisma.abaAutismCase.upsert({
      where: { id },
      create: {
        id,
        case_number: row.case_number,
        observation_text: row.observation_text,
        initial_programs: row.initial_programs,
        source: 'mock',
        language: 'id',
      },
      update: {
        case_number: row.case_number,
        observation_text: row.observation_text,
        initial_programs: row.initial_programs,
        source: 'mock',
        language: 'id',
      },
    });
    if (existing) updated += 1;
    else inserted += 1;
  }
  return { inserted, updated };
}

async function main() {
  console.log('🌱 Seeding database...');

  // Hash passwords
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gradion.id' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@gradion.id',
      password_hash: hashedPassword,
      role: 'admin',
      is_email_verified: true,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create Therapist User
  const therapist = await prisma.user.upsert({
    where: { email: 'therapist@gradion.id' },
    update: {},
    create: {
      name: 'Dr. Sarah Therapist',
      email: 'therapist@gradion.id',
      password_hash: hashedPassword,
      role: 'therapist',
      is_email_verified: true,
    },
  });
  console.log('✅ Created therapist user:', therapist.email);

  // Create Consultant User (clinical / supervisory role)
  const consultant = await prisma.user.upsert({
    where: { email: 'consultant@gradion.id' },
    update: {},
    create: {
      name: 'Dr. Alex Consultant',
      email: 'consultant@gradion.id',
      password_hash: hashedPassword,
      role: 'consultant',
      is_email_verified: true,
    },
  });
  console.log('✅ Created consultant user:', consultant.email);

  // Create Parent User
  const parent = await prisma.user.upsert({
    where: { email: 'parent@gradion.id' },
    update: {},
    create: {
      name: 'John Parent',
      email: 'parent@gradion.id',
      password_hash: hashedPassword,
      role: 'parent',
      is_email_verified: true,
    },
  });
  console.log('✅ Created parent user:', parent.email);

  // Create a child for the parent
  const child = await prisma.child.upsert({
    where: { id: 1 },
    update: {},
    create: {
      parent_id: parent.id,
      name: 'Alice',
      birthdate: new Date('2020-01-15'),
      diagnosis: 'ASD',
      monthly_quota: 12,
      used_sessions: 0,
    },
  });
  console.log('✅ Created child:', child.name);

  // Assign therapist to child
  await prisma.therapistChild.upsert({
    where: {
      therapist_id_child_id: {
        therapist_id: therapist.id,
        child_id: child.id,
      },
    },
    update: {},
    create: {
      therapist_id: therapist.id,
      child_id: child.id,
    },
  });
  console.log('✅ Assigned therapist to child');

  // Assign consultant to same child (demo)
  await prisma.therapistChild.upsert({
    where: {
      therapist_id_child_id: {
        therapist_id: consultant.id,
        child_id: child.id,
      },
    },
    update: {},
    create: {
      therapist_id: consultant.id,
      child_id: child.id,
    },
  });
  console.log('✅ Assigned consultant to child');

  // Create a sample session
  const session = await prisma.session.create({
    data: {
      therapist_id: therapist.id,
      child_id: child.id,
      duration_minutes: 60,
      goals_worked_on: ['eye contact', 'two-way communication'],
      notes: 'Good progress today. Child showed improved eye contact.',
    },
  });
  console.log('✅ Created sample session');

  try {
    const mockCases = await seedMockAutismCasesInline();
    console.log('✅ Seeded mock autism cases:', mockCases);
  } catch (e) {
    console.warn('⚠️ Skipped mock autism cases seed (run migrations first):', (e as Error).message);
  }

  // Update child's used_sessions
  await prisma.child.update({
    where: { id: child.id },
    data: { used_sessions: 1 },
  });

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });


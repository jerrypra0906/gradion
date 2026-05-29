import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

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


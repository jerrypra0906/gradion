import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDefaultTemplateJson() {
  const raw = readFileSync(
    path.join(__dirname, '../data/defaultInitialObservationTemplate.json'),
    'utf8'
  );
  return JSON.parse(raw);
}

export async function ensureDefaultInitialObservationTemplate() {
  const active = await prisma.initialObservationTemplate.findFirst({
    where: { is_active: true },
    orderBy: { updated_at: 'desc' },
  });
  if (active) return active;

  const template_json = loadDefaultTemplateJson();
  const created = await prisma.initialObservationTemplate.create({
    data: {
      key: 'initial-observation-v1',
      version: 1,
      template_json,
      is_active: true,
    },
  });
  return created;
}

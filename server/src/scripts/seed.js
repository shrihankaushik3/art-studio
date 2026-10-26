import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Painting from '../models/Painting.js';
import { PotteryItem, Glaze } from '../models/Pottery.js';
import StudioConfig from '../models/StudioConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

dotenv.config({ path: path.join(rootDir, '.env') });

export async function runSeed(options = { silent: false }) {
  const seedPath = path.join(rootDir, 'seedData', 'seed.json');
  const paintingsPath = path.join(rootDir, 'seedData', 'paintings.json');

  let seedData = null;
  let paintingsCatalog = null;

  // 1. Try loading full seed.json if present (e.g. local development)
  if (fs.existsSync(seedPath)) {
    try {
      const content = fs.readFileSync(seedPath, 'utf8');
      seedData = JSON.parse(content);
      if (!options.silent) console.log('Loaded development seed data from seedData/seed.json');
    } catch (err) {
      console.error('Error reading seedData/seed.json:', err.message);
    }
  }

  // 2. Try loading tracked paintings.json (preferred for production)
  if (fs.existsSync(paintingsPath)) {
    try {
      const pContent = fs.readFileSync(paintingsPath, 'utf8');
      const parsed = JSON.parse(pContent);
      paintingsCatalog = Array.isArray(parsed) ? parsed : parsed.paintings;
      if (!options.silent) console.log('Loaded painting catalog from seedData/paintings.json');
    } catch (err) {
      console.error('Error reading seedData/paintings.json:', err.message);
    }
  }

  // If paintings.json was not loaded, fall back to seedData.paintings
  if (!paintingsCatalog && seedData && Array.isArray(seedData.paintings)) {
    paintingsCatalog = seedData.paintings;
  }

  // If paintings catalog is missing or invalid, report a clear error and abort
  if (!paintingsCatalog || !Array.isArray(paintingsCatalog) || paintingsCatalog.length === 0) {
    const errorMsg = 'Failed to seed paintings: Tracked catalog seedData/paintings.json is missing or empty.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 3. Seed Paintings (Idempotent upsert by id)
  let paintingCount = 0;
  for (const p of paintingsCatalog) {
    await Painting.findOneAndUpdate(
      { id: p.id },
      {
        id: p.id,
        title: p.title,
        artist: p.artist,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        status: p.status || 'available'
      },
      { upsert: true, new: true }
    );
    paintingCount++;
  }
  if (!options.silent) console.log(`Seeded ${paintingCount} paintings.`);

  // 4. Seed Studio Account securely (only when password is provided via env or seed.json)
  const studioEmail = process.env.STUDIO_EMAIL || seedData?.studioAccount?.email || 'studio@artstudio.in';
  const studioPlainPassword = process.env.STUDIO_PASSWORD || seedData?.studioAccount?.password;
  const studioRole = seedData?.studioAccount?.role || 'studio';

  if (studioEmail && studioPlainPassword) {
    const existingUser = await User.findOne({ email: studioEmail.toLowerCase() });
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(studioPlainPassword, saltRounds);

    if (existingUser) {
      existingUser.password = hashedPassword;
      existingUser.role = studioRole;
      await existingUser.save();
      if (!options.silent) console.log(`Studio user [${studioEmail}] updated successfully with role [${studioRole}].`);
    } else {
      await User.create({
        email: studioEmail.toLowerCase(),
        password: hashedPassword,
        role: studioRole
      });
      if (!options.silent) console.log(`Studio user [${studioEmail}] created successfully with role [${studioRole}].`);
    }
  }

  // 5. Seed Pottery Items (Idempotent upsert by id)
  const potteryItemsList = (seedData && Array.isArray(seedData.potteryItems))
    ? seedData.potteryItems
    : [
        { id: 'i-01', name: 'Kulhad (clay cup)' },
        { id: 'i-02', name: 'Surahi (water jug)' },
        { id: 'i-03', name: 'Matka (water pot)' },
        { id: 'i-04', name: 'Diya set' },
        { id: 'i-05', name: 'Gamla (planter)' }
      ];

  let potteryCount = 0;
  for (const item of potteryItemsList) {
    await PotteryItem.findOneAndUpdate(
      { id: item.id },
      { id: item.id, name: item.name },
      { upsert: true, new: true }
    );
    potteryCount++;
  }
  if (!options.silent) console.log(`Seeded ${potteryCount} pottery items.`);

  // 6. Seed Glazes (Idempotent upsert by id)
  const glazesList = (seedData && Array.isArray(seedData.glazes))
    ? seedData.glazes
    : [
        { id: 'g-01', name: 'Kumkum Red' },
        { id: 'g-02', name: 'Haldi Yellow' },
        { id: 'g-03', name: 'Mehendi Green' },
        { id: 'g-04', name: 'Indigo Blue' },
        { id: 'g-05', name: 'Sandalwood Beige' },
        { id: 'g-06', name: 'Charcoal Black' }
      ];

  let glazeCount = 0;
  for (const glaze of glazesList) {
    await Glaze.findOneAndUpdate(
      { id: glaze.id },
      { id: glaze.id, name: glaze.name },
      { upsert: true, new: true }
    );
    glazeCount++;
  }
  if (!options.silent) console.log(`Seeded ${glazeCount} glazes.`);

  // 7. Seed Mural Configuration
  const muralRate = seedData?.mural?.ratePerSqFt || 150;
  const currency = seedData?.currency || 'INR';
  await StudioConfig.findOneAndUpdate(
    { key: 'default' },
    {
      key: 'default',
      currency,
      muralRatePerSqFt: muralRate
    },
    { upsert: true, new: true }
  );
  if (!options.silent) console.log(`Seeded Studio Config: Mural Rate = ${muralRate} ${currency}/sq ft.`);

  return { paintingCount, potteryCount, glazeCount };
}

// Direct execution from CLI
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await runSeed({ silent: false });
      console.log('Seeding finished successfully.');
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Seeding failed:', err.message);
      await disconnectDB();
      process.exit(1);
    }
  })();
}

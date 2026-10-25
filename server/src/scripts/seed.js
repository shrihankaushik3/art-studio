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
  let seedData = null;

  if (fs.existsSync(seedPath)) {
    try {
      const content = fs.readFileSync(seedPath, 'utf8');
      seedData = JSON.parse(content);
      if (!options.silent) console.log('Loaded seed data from seedData/seed.json');
    } catch (err) {
      console.error('Error reading seedData/seed.json:', err.message);
    }
  } else {
    if (!options.silent) console.warn('Warning: seedData/seed.json not found. Falling back to environment configurations.');
  }

  if (!seedData) {
    if (!options.silent) console.log('Proceeding with baseline configuration.');
    return;
  }

  // 1. Seed Studio Account securely
  const studioEmail = process.env.STUDIO_EMAIL || seedData.studioAccount?.email || 'studio@artstudio.in';
  const studioPlainPassword = process.env.STUDIO_PASSWORD || seedData.studioAccount?.password;
  const studioRole = seedData.studioAccount?.role || 'studio';

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

  // 2. Seed Paintings (Idempotent upsert by id)
  if (Array.isArray(seedData.paintings)) {
    let paintingCount = 0;
    for (const p of seedData.paintings) {
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
  }

  // 3. Seed Pottery Items (Idempotent upsert by id)
  if (Array.isArray(seedData.potteryItems)) {
    let potteryCount = 0;
    for (const item of seedData.potteryItems) {
      await PotteryItem.findOneAndUpdate(
        { id: item.id },
        { id: item.id, name: item.name },
        { upsert: true, new: true }
      );
      potteryCount++;
    }
    if (!options.silent) console.log(`Seeded ${potteryCount} pottery items.`);
  }

  // 4. Seed Glazes (Idempotent upsert by id)
  if (Array.isArray(seedData.glazes)) {
    let glazeCount = 0;
    for (const glaze of seedData.glazes) {
      await Glaze.findOneAndUpdate(
        { id: glaze.id },
        { id: glaze.id, name: glaze.name },
        { upsert: true, new: true }
      );
      glazeCount++;
    }
    if (!options.silent) console.log(`Seeded ${glazeCount} glazes.`);
  }

  // 5. Seed Mural Configuration
  const muralRate = seedData.mural?.ratePerSqFt || 150;
  const currency = seedData.currency || 'INR';
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

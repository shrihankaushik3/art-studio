import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { connectDB } from './config/db.js';
import Painting from './models/Painting.js';
import { runSeed } from './scripts/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(rootDir, '.env') });

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    // Auto-seed if database is freshly initialized or empty
    const count = await Painting.countDocuments();
    if (count === 0) {
      console.log('Database empty. Running initial idempotent seed...');
      await runSeed({ silent: false });
    }

    app.listen(PORT, () => {
      console.log(`Art Studio API Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err.message);
    process.exit(1);
  }
}

startServer();

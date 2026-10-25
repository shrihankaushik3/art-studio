import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

let mongoMemoryServer = null;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/artstudio';

  try {
    // Attempt connecting to the configured MongoDB instance with a short timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`Connected to MongoDB at ${uri}`);
    return uri;
  } catch (err) {
    console.log(`Could not connect to external MongoDB at ${uri}. Launching embedded MongoDB...`);
    
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const downloadDir = path.resolve(projectRoot, '.cache/mongodb-binaries');
      
      mongoMemoryServer = await MongoMemoryServer.create({
        binary: {
          downloadDir
        }
      });
      
      const memoryUri = mongoMemoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`Connected to embedded MongoDB at ${memoryUri}`);
      return memoryUri;
    } catch (memErr) {
      console.error('Failed to start embedded MongoDB:', memErr.message);
      throw err;
    }
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
  } catch (err) {
    console.error('Error disconnecting database:', err.message);
  }
}

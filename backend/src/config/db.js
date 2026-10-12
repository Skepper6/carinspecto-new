import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

// Two separate databases, so test data never mixes with live data:
//   production (NODE_ENV=production) -> MONGODB_URI        (MongoDB Atlas, the live database)
//   everything else (your computer)  -> MONGODB_URI_LOCAL  (default: local MongoDB, database "carinspecto_dev")
const LOCAL_DEFAULT = 'mongodb://127.0.0.1:27017/carinspecto_dev';
export const isProduction = process.env.NODE_ENV === 'production';

export async function connectDB() {
  const uri = isProduction ? process.env.MONGODB_URI : (process.env.MONGODB_URI_LOCAL || LOCAL_DEFAULT);
  if (!uri) {
    console.warn('MONGODB_URI is not set - running without a database.');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB connected: ${mongoose.connection.name} (${isProduction ? 'live / Atlas' : 'local'})`);
    return true;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    if (!isProduction) console.error('Is MongoDB running on this computer? (Windows: the "MongoDB" service). Or set MONGODB_URI_LOCAL in backend/.env.');
    return false;
  }
}

export const dbState = () => ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ?? 'unknown';

import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

// Connects to MongoDB Atlas. Returns false (and keeps the API up) when MONGODB_URI is not set,
// so the existing demo-state endpoints keep working while the real API is being built.
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI is not set - running without a database.');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB connected (${mongoose.connection.name})`);
    return true;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    return false;
  }
}

export const dbState = () => ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ?? 'unknown';

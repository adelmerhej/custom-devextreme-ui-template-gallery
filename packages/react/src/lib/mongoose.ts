/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Connection } from 'mongoose';
import process from 'process';

const MONGODB_URI = process.env.MONGODB_URI as string;

console.log('MONGODB_URI:', MONGODB_URI);

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// Define a global interface to extend the Node.js global object
interface MongooseCache {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

// Attach cache to the global object to persist across hot reloads
let cached: MongooseCache = (globalThis as any).mongoose;

if (!cached) {
  cached = (globalThis as any).mongoose = { conn: null, promise: null };
}

export async function dbConnect(): Promise<Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((mongooseInstance) => mongooseInstance.connection);
  }

  cached.conn = await cached.promise;
  if (!cached.conn) {
    throw new Error('Failed to connect to MongoDB');
  }
  return cached.conn;
}

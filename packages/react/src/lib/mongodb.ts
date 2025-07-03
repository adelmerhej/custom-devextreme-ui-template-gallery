import { MongoClient } from 'mongodb';
import process from 'process';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('Please add MONGODB_URI to your environment variables');
}
const options = {};

// Already checked above, so this block is no longer needed.
if (!process.env.MONGODB_URI) {
  throw new Error('Please add MONGODB_URI to your environment variables');
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export {};

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalThis._mongoClientPromise = client.connect();
  }
  clientPromise = globalThis._mongoClientPromise;
} else {
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export { clientPromise };

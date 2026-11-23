import { MongoClient, ObjectId } from "mongodb";

let clientPromise = globalThis._mongoClientPromise;

export async function db() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  if (!clientPromise) {
    clientPromise = new MongoClient(process.env.MONGODB_URI).connect();
    globalThis._mongoClientPromise = clientPromise;
  }
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "cmddrop");
}

export function oid(id) {
  try { return new ObjectId(id); } catch { return null; }
}

export function clean(doc) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

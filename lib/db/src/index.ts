import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// EXTERNAL_DATABASE_URL takes priority (user's production DB);
// falls back to the Replit-managed DATABASE_URL.
const connectionString =
  process.env.EXTERNAL_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No database URL found. Set EXTERNAL_DATABASE_URL (your production DB) or ensure DATABASE_URL is provisioned.",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";

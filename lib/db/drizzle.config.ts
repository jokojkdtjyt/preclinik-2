import { defineConfig } from "drizzle-kit";
import path from "path";

const url = process.env.EXTERNAL_DATABASE_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "No database URL found. Set EXTERNAL_DATABASE_URL (your production DB) or ensure DATABASE_URL is provisioned.",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: { url },
});

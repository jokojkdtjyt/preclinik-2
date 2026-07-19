import { getAuth, clerkClient } from "@clerk/express";
import { db, adminsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { Request } from "express";

/**
 * Returns true if the incoming request comes from a verified admin.
 *
 * Respects X-Preview-As-Student: true — when an admin opts into student-preview
 * mode, this returns false so they experience the platform exactly as a student
 * would (draft lessons hidden, no admin-bypass on play-url access, etc.).
 *
 * Security note: this header can only REMOVE privileges (an admin choosing to
 * downgrade themselves), never grant them, so spoofing it by a non-admin user
 * is harmless.
 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  // Admin explicitly asked to be treated as a regular student for preview
  if (req.headers["x-preview-as-student"] === "true") return false;

  const auth = getAuth(req);
  if (!auth?.userId) return false;

  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const raw =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
    if (!raw) return false;

    const email = raw.trim().toLowerCase();
    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(sql`lower(trim(${adminsTable.email})) = ${email}`);
    return !!admin;
  } catch {
    return false;
  }
}

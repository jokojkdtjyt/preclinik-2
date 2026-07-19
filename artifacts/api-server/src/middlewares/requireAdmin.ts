import { getAuth, clerkClient } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import { db, adminsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface AdminAuthedRequest extends Request {
  userId: string;
  userEmail: string;
}

/**
 * Express middleware that:
 * 1. Verifies the Clerk session (userId present)
 * 2. Resolves the user's primary email via the Clerk backend SDK
 * 3. Checks the email exists in the `admins` table (case-insensitive, trimmed)
 *
 * Returns 401 if not signed in, 403 if signed in but not an admin.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const raw =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

    if (!raw) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const email = raw.trim().toLowerCase();

    // Case-insensitive match: normalise both sides in SQL
    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(sql`lower(trim(${adminsTable.email})) = ${email}`);

    if (!admin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    (req as AdminAuthedRequest).userId = userId;
    (req as AdminAuthedRequest).userEmail = email;
    next();
  } catch (err) {
    console.error("[requireAdmin] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Admin management endpoints — CRUD for the `admins` table.
 * All routes are protected by requireAdmin (caller must already be an admin).
 * Router is mounted at /api, so paths below are prefixed /api automatically.
 */
import { Router, type IRouter } from "express";
import { db, adminsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// GET /admin/admins — list all admin emails
router.get("/admin/admins", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({ email: adminsTable.email, addedAt: adminsTable.addedAt })
    .from(adminsTable)
    .orderBy(adminsTable.addedAt);
  res.json(rows);
});

// POST /admin/admins — add a new admin email
router.post("/admin/admins", requireAdmin, async (req, res): Promise<void> => {
  const { email: rawEmail } = req.body ?? {};
  if (typeof rawEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim())) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  const email = rawEmail.trim().toLowerCase();

  const [existing] = await db
    .select()
    .from(adminsTable)
    .where(sql`lower(trim(${adminsTable.email})) = ${email}`);

  if (existing) {
    res.status(409).json({ error: "Email is already an admin" });
    return;
  }

  await db.insert(adminsTable).values({ email });
  res.status(201).json({ email });
});

// DELETE /admin/admins/:email — remove an admin email
// Refuses if it would leave zero admins remaining.
router.delete(
  "/admin/admins/:email",
  requireAdmin,
  async (req, res): Promise<void> => {
    const email = decodeURIComponent(req.params.email as string).trim().toLowerCase();

    // Guard: count remaining admins before deleting
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adminsTable);

    if (Number(count) <= 1) {
      res.status(400).json({ error: "Cannot remove the last admin" });
      return;
    }

    const deleted = await db
      .delete(adminsTable)
      .where(sql`lower(trim(${adminsTable.email})) = ${email}`)
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }
    res.json({ ok: true });
  },
);

export default router;

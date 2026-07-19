import { Router, type IRouter } from "express";
import { db, modulesTable, lessonsTable, adminsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// ── GET /me/role ── (mounted at /api, so full path is /api/me/role) ───────────
// Auth-optional — returns { isAdmin: boolean }.
// Compares the Clerk user's primary email case-insensitively against the
// admins table. Called on every page load by useIsAdmin() with a 5-min cache.
router.get("/me/role", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.json({ isAdmin: false });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const raw =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

    if (!raw) {
      res.json({ isAdmin: false });
      return;
    }

    const email = raw.trim().toLowerCase();

    // Case-insensitive comparison: normalise both sides in SQL
    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(sql`lower(trim(${adminsTable.email})) = ${email}`);

    res.json({ isAdmin: !!admin });
  } catch (err) {
    // Return 500 so useIsAdmin() throws and React Query retries,
    // preserving the old cached { isAdmin: true } value instead of
    // caching a false-negative { isAdmin: false } as a successful 200.
    console.error("[GET /me/role] error:", err);
    res.status(500).json({ error: "Role check failed" });
  }
});

// ── GET /admin/stats ── (full path: /api/admin/stats) ─────────────────────────
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [moduleStats] = await db
    .select({
      totalModules: sql<number>`count(*)::int`,
      liveModules: sql<number>`count(*) filter (where ${modulesTable.published} = true)::int`,
      totalStudents: sql<number>`coalesce(sum(${modulesTable.students}), 0)::int`,
    })
    .from(modulesTable);

  const [lessonStats] = await db
    .select({
      totalLessons: sql<number>`count(*)::int`,
      liveLessons: sql<number>`count(*) filter (where ${lessonsTable.published} = true)::int`,
    })
    .from(lessonsTable);

  res.json({
    totalModules: Number(moduleStats?.totalModules ?? 0),
    liveModules: Number(moduleStats?.liveModules ?? 0),
    totalLessons: Number(lessonStats?.totalLessons ?? 0),
    liveLessons: Number(lessonStats?.liveLessons ?? 0),
    totalStudents: Number(moduleStats?.totalStudents ?? 0),
  });
});

// ── GET /admin/students ── (full path: /api/admin/students) ───────────────────
router.get("/admin/students", requireAdmin, async (_req, res): Promise<void> => {
  const students = [
    { id: "s1", name: "Meriem Saadi",    email: "meriem.saadi@example.com",  progressPercent: 72 },
    { id: "s2", name: "Anis Benali",     email: "anis.benali@example.com",   progressPercent: 45 },
    { id: "s3", name: "Lina Khelifi",    email: "lina.khelifi@example.com",  progressPercent: 88 },
    { id: "s4", name: "Karim Ouali",     email: "karim.ouali@example.com",   progressPercent: 31 },
    { id: "s5", name: "Sara Boudaoud",   email: "sara.boudaoud@example.com", progressPercent: 60 },
  ];
  res.json(students);
});

export default router;

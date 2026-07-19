import { Router, type IRouter } from "express";
import { eq, ilike, and, inArray } from "drizzle-orm";
import { db, modulesTable, lessonsTable } from "@workspace/db";
import {
  ListModulesQueryParams,
  CreateModuleBody,
  GetModuleParams,
  UpdateModuleBody,
  UpdateModuleParams,
  DeleteModuleParams,
} from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/modules", async (req, res): Promise<void> => {
  const parsed = ListModulesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { published, search } = parsed.data;

  const conditions = [];
  if (published !== undefined) {
    conditions.push(eq(modulesTable.published, published));
  }
  if (search) {
    conditions.push(ilike(modulesTable.title, `%${search}%`));
  }

  const modules = conditions.length > 0
    ? await db.select().from(modulesTable).where(and(...conditions))
    : await db.select().from(modulesTable);

  const moduleIds = modules.map((m) => m.id);
  const lessonRows = moduleIds.length > 0
    ? await db
        .select({
          moduleId: lessonsTable.moduleId,
          total: sql<number>`count(*)::int`,
          live: sql<number>`count(*) filter (where ${lessonsTable.published} = true)::int`,
        })
        .from(lessonsTable)
        .where(inArray(lessonsTable.moduleId, moduleIds))
        .groupBy(lessonsTable.moduleId)
    : [];

  const countMap = new Map<string, { total: number; live: number }>();
  for (const row of lessonRows) {
    countMap.set(row.moduleId, { total: Number(row.total), live: Number(row.live) });
  }

  const result = modules.map((m) => {
    const counts = countMap.get(m.id) ?? { total: 0, live: 0 };
    return { ...m, lessonCount: counts.total, liveLessonCount: counts.live };
  });

  res.json(result);
});

router.post("/modules", async (req, res): Promise<void> => {
  const parsed = CreateModuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { gradient, ...rest } = parsed.data;
  const [mod] = await db
    .insert(modulesTable)
    .values({
      ...rest,
      gradient: gradient ?? null,
      outcomes: rest.outcomes ?? [],
    })
    .returning();

  res.status(201).json({ ...mod, lessonCount: 0, liveLessonCount: 0 });
});

router.get("/modules/:moduleId", async (req, res): Promise<void> => {
  const params = GetModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [mod] = await db
    .select()
    .from(modulesTable)
    .where(eq(modulesTable.id, params.data.moduleId));

  if (!mod) {
    res.status(404).json({ error: "Module not found" });
    return;
  }

  const lessonRows = await db
    .select({
      total: sql<number>`count(*)::int`,
      live: sql<number>`count(*) filter (where ${lessonsTable.published} = true)::int`,
    })
    .from(lessonsTable)
    .where(eq(lessonsTable.moduleId, mod.id));

  const counts = lessonRows[0] ?? { total: 0, live: 0 };
  res.json({ ...mod, lessonCount: Number(counts.total), liveLessonCount: Number(counts.live) });
});

router.patch("/modules/:moduleId", async (req, res): Promise<void> => {
  const params = UpdateModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateModuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [mod] = await db
    .update(modulesTable)
    .set(parsed.data)
    .where(eq(modulesTable.id, params.data.moduleId))
    .returning();

  if (!mod) {
    res.status(404).json({ error: "Module not found" });
    return;
  }

  const lessonRows = await db
    .select({
      total: sql<number>`count(*)::int`,
      live: sql<number>`count(*) filter (where ${lessonsTable.published} = true)::int`,
    })
    .from(lessonsTable)
    .where(eq(lessonsTable.moduleId, mod.id));

  const counts = lessonRows[0] ?? { total: 0, live: 0 };
  res.json({ ...mod, lessonCount: Number(counts.total), liveLessonCount: Number(counts.live) });
});

router.delete("/modules/:moduleId", async (req, res): Promise<void> => {
  const params = DeleteModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [mod] = await db
    .delete(modulesTable)
    .where(eq(modulesTable.id, params.data.moduleId))
    .returning();

  if (!mod) {
    res.status(404).json({ error: "Module not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

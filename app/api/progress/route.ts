import { desc, eq } from "drizzle-orm";
import { attempts, learners } from "@/db/schema";
import { getDb } from "@/db";

const validSkills = new Set(["reading", "listening"]);

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{12,80}$/.test(value);
}

export async function GET(request: Request) {
  const learnerId = new URL(request.url).searchParams.get("learnerId");
  if (!validId(learnerId)) return Response.json({ error: "Invalid learner id" }, { status: 400 });
  try {
    const rows = await getDb().select().from(attempts)
      .where(eq(attempts.learnerId, learnerId)).orderBy(desc(attempts.completedAt));
    return Response.json({ attempts: rows });
  } catch (error) {
    console.error("Progress load failed", error);
    return Response.json({ error: "暂时无法读取学习记录，请稍后重试。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload || !validId(payload.learnerId) || typeof payload.questionId !== "string" ||
      typeof payload.answer !== "string" || typeof payload.isCorrect !== "boolean" ||
      !validSkills.has(String(payload.skill))) {
    return Response.json({ error: "Invalid study record" }, { status: 400 });
  }
  try {
    const db = getDb();
    await db.insert(learners).values({ id: payload.learnerId }).onConflictDoNothing();
    const now = new Date().toISOString();
    await db.insert(attempts).values({
      learnerId: payload.learnerId, questionId: payload.questionId.slice(0, 80),
      skill: String(payload.skill), answer: payload.answer.slice(0, 500),
      isCorrect: payload.isCorrect, completedAt: now,
    }).onConflictDoUpdate({
      target: [attempts.learnerId, attempts.questionId],
      set: { answer: payload.answer.slice(0, 500), isCorrect: payload.isCorrect, completedAt: now },
    });
    return Response.json({ savedAt: now });
  } catch (error) {
    console.error("Progress save failed", error);
    return Response.json({ error: "保存失败，请保持此页面并稍后再试。" }, { status: 503 });
  }
}


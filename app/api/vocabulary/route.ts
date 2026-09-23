import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learners, vocabulary } from "@/db/schema";

const statuses = new Set(["new", "learning", "mastered"]);
function validId(value: unknown): value is string { return typeof value === "string" && /^[a-zA-Z0-9_-]{12,80}$/.test(value); }

export async function GET(request: Request) {
  const learnerId = new URL(request.url).searchParams.get("learnerId");
  if (!validId(learnerId)) return Response.json({ error: "Invalid learner id" }, { status: 400 });
  try {
    const words = await getDb().select().from(vocabulary).where(eq(vocabulary.learnerId, learnerId)).orderBy(asc(vocabulary.updatedAt));
    return Response.json({ words });
  } catch (error) {
    console.error("Vocabulary load failed", error);
    return Response.json({ error: "暂时无法读取生词记录。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !validId(body.learnerId) || typeof body.word !== "string" || typeof body.meaning !== "string" || typeof body.example !== "string" || !statuses.has(String(body.status))) {
    return Response.json({ error: "Invalid vocabulary record" }, { status: 400 });
  }
  try {
    const db = getDb();
    await db.insert(learners).values({ id: body.learnerId }).onConflictDoNothing();
    const values = { learnerId: body.learnerId, word: body.word.slice(0, 100), meaning: body.meaning.slice(0, 300), example: body.example.slice(0, 600), status: String(body.status), updatedAt: new Date().toISOString() };
    await db.insert(vocabulary).values(values).onConflictDoUpdate({ target: [vocabulary.learnerId, vocabulary.word], set: values });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Vocabulary save failed", error);
    return Response.json({ error: "生词状态保存失败，请稍后重试。" }, { status: 503 });
  }
}


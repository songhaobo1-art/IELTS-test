import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const learners = sqliteTable("learners", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const attempts = sqliteTable(
  "attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    learnerId: text("learner_id").notNull().references(() => learners.id),
    questionId: text("question_id").notNull(),
    skill: text("skill").notNull(),
    answer: text("answer").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    completedAt: text("completed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_attempts_learner_question").on(table.learnerId, table.questionId),
    index("idx_attempts_learner_completed").on(table.learnerId, table.completedAt),
  ],
);

export const vocabulary = sqliteTable(
  "vocabulary",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    learnerId: text("learner_id").notNull().references(() => learners.id),
    word: text("word").notNull(),
    meaning: text("meaning").notNull(),
    example: text("example").notNull(),
    status: text("status").notNull().default("new"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_vocabulary_learner_word").on(table.learnerId, table.word),
    index("idx_vocabulary_learner_status").on(table.learnerId, table.status),
  ],
);


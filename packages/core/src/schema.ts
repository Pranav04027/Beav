import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core"

export const tasks = sqliteTable("tasks", {
   id: integer().
});
import { timestamp } from "drizzle-orm/mysql-core";
import { sqliteTable, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core"

export const tasks = sqliteTable("tasks", {
    //ULID
    id: text("id").primaryKey(),

    //Github link
    githubIssueId: integer("githubIssueId").notNull(),
    githubIssueNumber: integer("githubIssueNumber").notNull(),
    repoOwner: text("repoOwner").notNull(),
    repoName: text("repoName").notNull(),
    IssueTitle: text("IssueTitle").notNull(),

    //State Machine
    status: text("status", { enum: ["pending", "running", "done", "failed"] }).notNull(),

    //Resiliance
    retryCount: integer("retryCount").default(0),
    maxRetries: integer("max_retries").default(3),

    //Execution Data
    workSpacePath: text("workSpacePath"),
    workerPID: integer("workerPID"),

    //Timestamps
    lastHeartbeat: integer("lastHeartbeat"),
    claimedAt: integer("claimedAt"),
    startedAt: integer("startedAt"),
    completedAt: integer("completedAt"),
    createdAt: integer("createdAt")
}, (table) => ({
  uniqueRepoIssue: uniqueIndex("uniqueRepoIssue").on(
    table.repoOwner, 
    table.repoName, 
    table.githubIssueNumber
  ),
}));

export const taskLogs = sqliteTable("taskLogs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: text("task_id").notNull().references(() => tasks.id),
    stream: text("stream", { enum: ["stdout", "stderr", "system"] }).notNull(),
    line: text("line").notNull(),
    ts: integer("ts")
});

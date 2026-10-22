import { z } from 'zod';

export const AssignedTaskSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]+$/),
  githubIssueNumber: z.number().int().positive(),
  issueTitle: z.string(),
  body: z.string().nullable(),
  workspacePath: z.string().min(1),
  workspaceRoot: z.string().min(1),
  claimedAt: z.number().int().nonnegative(),
  retryCount: z.number().int().nonnegative(),
});
export type AssignedTask = z.infer<typeof AssignedTaskSchema>;

export const failureKinds = [
  'agent',
  'publication',
  'launch',
  'crash',
  'timeout',
  'shutdown',
] as const;
export type FailureKind = (typeof failureKinds)[number];

const common = { taskId: z.string().min(1) };
export const WorkerEventSchema = z.discriminatedUnion('type', [
  z.object({
    ...common,
    type: z.literal('heartbeat'),
    ts: z.number().finite(),
  }),
  z.object({
    ...common,
    type: z.literal('log'),
    stream: z.literal('system'),
    line: z.string(),
    ts: z.number().finite(),
  }),
  z.object({
    ...common,
    type: z.literal('thread-state'),
    threadId: z.string(),
    turnId: z.string(),
  }),
  z.object({
    ...common,
    type: z.literal('failed'),
    error: z.string(),
    kind: z.enum(failureKinds),
    ts: z.number().finite(),
  }),
  z.object({
    ...common,
    type: z.literal('completed'),
    completedAt: z.number().finite(),
    prNumber: z.number().int().positive(),
    prUrl: z.string().url(),
  }),
]);
export type WorkerEvent = z.infer<typeof WorkerEventSchema>;

export const WorkerAckSchema = z.object({
  type: z.literal('ack'),
  taskId: z.string(),
  event: z.enum(['completed', 'failed']),
  accepted: z.boolean(),
});

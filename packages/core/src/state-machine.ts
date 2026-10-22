export const taskStatuses = [
  'pending',
  'claimed',
  'running',
  'verifying',
  'done',
  'failed',
  'crashed',
] as const;
export type TaskStatus = (typeof taskStatuses)[number];

const transitions: Record<TaskStatus, readonly TaskStatus[]> = {
  pending: ['claimed'],
  claimed: ['running', 'crashed'],
  running: ['verifying', 'failed', 'crashed'],
  verifying: ['done', 'failed'],
  done: [],
  failed: ['pending'],
  crashed: ['pending'],
};

export function assertAllowedTransition(current: TaskStatus, next: TaskStatus) {
  if (!transitions[current].includes(next)) {
    throw new Error('Invalid transition: ' + current + ' → ' + next);
  }
}

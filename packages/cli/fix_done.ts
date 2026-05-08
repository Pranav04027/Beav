import { db, tasks, eq } from '@beav/core';
async function run() {
  await db.delete(tasks).where(eq(tasks.status, 'done'));
  console.log('Deleted done tasks');
  process.exit(0);
}
run();

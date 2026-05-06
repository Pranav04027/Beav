import { db, tasks } from '@beav/core';

export default async function status() {
    return db.select().from(tasks).orderBy(tasks.createdAt);
}

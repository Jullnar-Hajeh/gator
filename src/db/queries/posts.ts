import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../index.js";
import { posts, feedFollows } from "../schema.js";

export async function createPost(data: {
  title: string;
  url: string;
  description?: string;
  publishedAt?: Date;
  feedId: string;
}) {
  await db.insert(posts).values(data).onConflictDoNothing();
}

export async function getPostsForUser(userId: string, limit: number = 2) {
  const userFollows = await db
    .select({ feedId: feedFollows.feedId })
    .from(feedFollows)
    .where(eq(feedFollows.userId, userId));

  const feedIds = userFollows.map(f => f.feedId);
  
  if (feedIds.length === 0) {
    return [];
  }

  return await db
    .select()
    .from(posts)
    .where(inArray(posts.feedId, feedIds))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}

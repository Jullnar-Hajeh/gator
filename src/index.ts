import { setUser, readConfig } from "./config.js";
import { createUser, getUserByName, deleteAllUsers, getUsers } from "./db/queries/users.js";
import { createFeed, getFeeds, getFeedByUrl, getNextFeedToFetch, markFeedFetched } from "./db/queries/feeds.js";
import { createFeedFollow, getFeedFollowsForUser, deleteFeedFollow } from "./db/queries/feedFollows.js";
import { createPost, getPostsForUser } from "./db/queries/posts.js";
import { fetchFeed } from "./rss.js";
import { User } from "./db/schema.js";

type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;
type UserCommandHandler = (cmdName: string, user: User, ...args: string[]) => Promise<void>;
type CommandsRegistry = Record<string, CommandHandler>;

function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const config = readConfig();
    if (!config.currentUserName) throw new Error("You must be logged in.");
    const user = await getUserByName(config.currentUserName);
    if (!user) throw new Error("Current user not found.");
    return handler(cmdName, user, ...args);
  };
}

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);
  if (!match) throw new Error("Invalid duration format.");
  const value = parseInt(match[1]);
  const unit = match[2];
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60000;
  if (unit === 'h') return value * 3600000;
  return value;
}

async function scrapeFeeds() {
  const nextFeed = await getNextFeedToFetch();
  if (!nextFeed) return;
  await markFeedFetched(nextFeed.id);
  
  try {
    const feedData = await fetchFeed(nextFeed.url);
    let items = feedData?.channel?.item || feedData?.items || [];
    if (!Array.isArray(items)) items = [items];

    for (const item of items) {
      await createPost({
        title: item.title,
        url: item.link || item.url,
        description: item.description,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        feedId: nextFeed.id
      });
    }
    console.log(`Saved ${items.length} posts from ${nextFeed.name}`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
  }
}

async function handlerAgg(cmdName: string, ...args: string[]) {
  const timeStr = args[0] || "1m";
  const intervalTime = parseDuration(timeStr);
  console.log(`Aggregator started every ${timeStr}...`);
  
  scrapeFeeds();
  const interval = setInterval(scrapeFeeds, intervalTime);
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    clearInterval(interval);
    process.exit(0);
  });
  await new Promise(() => {});
}

async function handlerBrowse(cmdName: string, user: User, ...args: string[]) {
  const limit = args[0] ? parseInt(args[0]) : 2;
  const postsList = await getPostsForUser(user.id, limit);
  
  if (postsList.length === 0) {
    console.log("No posts found. Are you following any feeds with content?");
    return;
  }

  for (const post of postsList) {
    console.log(`\n--- ${post.title} ---`);
    console.log(`Source: ${post.url}`);
    console.log(`Published: ${post.publishedAt?.toLocaleString()}`);
    console.log(`Description: ${post.description?.slice(0, 100)}...`);
  }
}

async function main() {
  const registry: CommandsRegistry = {};
  
  const handlers: any = {
    login: async (c: any, ...a: any) => { 
      const user = await getUserByName(a[0]); 
      if (!user) throw new Error("User not found");
      setUser(a[0]); 
      console.log(`User set to ${a[0]}`); 
    },
    register: async (c: any, ...a: any) => { 
      await createUser(a[0]); 
      setUser(a[0]); 
      console.log(`User ${a[0]} registered and logged in`);
    },
    reset: async () => { 
      await deleteAllUsers(); 
      console.log("Database reset");
    },
    users: async () => {
      const allUsers = await getUsers();
      const config = readConfig();
      allUsers.forEach(u => {
        const current = u.name === config.currentUserName ? "(current)" : "";
        console.log(`* ${u.name} ${current}`);
      });
    },
    feeds: async () => {
      const allFeeds = await getFeeds();
      allFeeds.forEach(f => console.log(`* ${f.name}: ${f.url} (added by ${f.userName})`));
    },
    agg: handlerAgg,
    browse: middlewareLoggedIn(handlerBrowse),
    addfeed: middlewareLoggedIn(async (c, u, ...a) => {
      const f = await createFeed(a[0], a[1], u.id);
      await createFeedFollow(u.id, f.id);
      console.log(`Feed "${a[0]}" added and followed`);
    }),
    follow: middlewareLoggedIn(async (c, u, ...a) => {
      const f = await getFeedByUrl(a[0]);
      if (!f) throw new Error("Feed not found");
      await createFeedFollow(u.id, f.id);
      console.log(`Followed: ${f.name}`);
    }),
    unfollow: middlewareLoggedIn(async (c, u, ...a) => {
      const f = await getFeedByUrl(a[0]);
      if (!f) throw new Error("Feed not found");
      await deleteFeedFollow(u.id, f.id);
      console.log(`Unfollowed: ${f.name}`);
    }),
    following: middlewareLoggedIn(async (c, u) => {
      const follows = await getFeedFollowsForUser(u.id);
      if (follows.length === 0) console.log("You are not following any feeds");
      follows.forEach(f => console.log(`* ${f.feedName}`));
    })
  };

  Object.keys(handlers).forEach(k => registry[k] = handlers[k]);

  const [cmd, ...args] = process.argv.slice(2);
  try {
    if (registry[cmd]) {
      await registry[cmd](cmd, ...args);
    } else {
      console.log("Command not found");
    }
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
  }
}
main();

# gator - RSS Feed Aggregator CLI

A command-line tool built with TypeScript and Node.js to fetch, store, and browse RSS feeds.

## Prerequisites
* Node.js (v18+)
* PostgreSQL database

## Setup & Configuration

To set up the project and database connection entirely via the command line:

1. **Install Dependencies:**
```bash
npm install
```

2. **Create Configuration File:**
Run the following command to create your config file (replace with your actual DB URL):
```bash
echo '{"db_url": "postgres://postgres:postgres@localhost:5432/gator", "current_user_name": "julnar"}' > ~/.gatorconfig.json
```

3. **Run Database Migrations:**
```bash
npm run generate
npm run migrate
```

## Usage Commands
Run these commands using `npm run start -- <command>`:

### Users:
* `register <name>` - Register and login.
* `login <name>` - Switch active user.
* `users` - List all registered users.

### Feeds:
* `addfeed <name> <url>` - Add and follow a new feed.
* `feeds` - Show all system feeds.
* `follow <url>` - Follow an existing feed.
* `unfollow <url>` - Stop following a feed.
* `following` - Show your followed feeds.

### Aggregation & Browsing:
* `agg <duration>` - Start the background scraper (e.g., `1m` or `30s`).
* `browse <limit>` - View latest posts from followed feeds (default limit is 2).

## Development
To reset the entire database:
```bash
npm run start reset
```

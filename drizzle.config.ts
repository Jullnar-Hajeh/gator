
import { defineConfig } from "drizzle-kit";

import fs from "fs";

import os from "os";

import path from "path";



const configPath = path.join(os.homedir(), ".gatorconfig.json");

const fileContents = fs.readFileSync(configPath, { encoding: "utf-8" });

const dbUrl = JSON.parse(fileContents).db_url;



export default defineConfig({

  schema: "./src/db/schema.ts",

  out: "./src/db/migrations",

  dialect: "postgresql",

  dbCredentials: {

    url: dbUrl,

  },

});


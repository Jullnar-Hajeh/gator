import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function validateConfig(rawConfig: any): Config {
  return {
    dbUrl: rawConfig.db_url || "",
    currentUserName: rawConfig.current_user_name,
  };
}

export function readConfig(): Config {
  const filePath = getConfigFilePath();
  const fileContents = fs.readFileSync(filePath, { encoding: "utf-8" });
  const rawConfig = JSON.parse(fileContents);
  return validateConfig(rawConfig);
}

function writeConfig(cfg: Config): void {
  const filePath = getConfigFilePath();
  const rawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };
  fs.writeFileSync(filePath, JSON.stringify(rawConfig, null, 2), { encoding: "utf-8" });
}

export function setUser(userName: string): void {
  const cfg = readConfig();
  cfg.currentUserName = userName;
  writeConfig(cfg);
}

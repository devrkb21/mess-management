/**
 * Expo app config.
 *
 * The API base URL reaches the JS bundle through the standard EXPO_PUBLIC_*
 * environment-variable mechanism (see src/constants/config.ts). Expo CLI only
 * auto-loads .env files from this directory, while the repo keeps a single
 * .env at the repository root — so load it here without any extra dependency.
 * Variables already present in the environment always win.
 */
const path = require("node:path");
const fs = require("node:fs");

const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || match[1].startsWith("#") || process.env[match[1]] !== undefined) {
      continue;
    }
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

module.exports = require("./app.json");
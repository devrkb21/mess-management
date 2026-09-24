const { config } = require("dotenv");
const path = require("node:path");
const appJson = require("./app.json");

config({ path: path.resolve(__dirname, "../.env") });

module.exports = appJson;
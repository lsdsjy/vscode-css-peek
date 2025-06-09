const { defineConfig } = require("@vscode/test-cli");

module.exports = defineConfig({
  label: "unit-tests",
  files: "tests/out/**/*.test.js",
  extensionDevelopmentPath: ".",
  workspaceFolder: "tests/fixture",
  srcDir: "server/src", // What about coverage for client
  launchArgs: ["--disable-extensions"],
});

const { defineConfig } = require("@vscode/test-cli");

module.exports = defineConfig({
  label: "unit-tests",
  files: "tests/out/**/*.test.js",
  workspaceFolder: "tests/fixture",
  srcDir: "server/src", // What about coverage for client
});

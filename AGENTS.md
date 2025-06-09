# Contributor Guide

## Dev environment tips
- Ignore warnings from `yarn` about the "vscode" engine appearing to be invalid

## Testing Instructions
- Run `xvfb-run -a yarn test` to run the tests using the vscode-test cli
- Ensure to always build the latest code using `yarn build` or `yarn watch` before running any tests
- The `tests/fixtures` directory contains various example markup and style files to test the extension under different conditions
- Use `yarn test --help` to discover various options that can be used to filter the tests being executed
- Fix any test or type errors until the whole suite is green.
- After moving files or changing imports, run yarn lint to be sure ESLint and TypeScript rules still pass.
- Add or update tests for the code you change, even if nobody asked.

## PR instructions
Title format: [OpenAI Codex] <Title>
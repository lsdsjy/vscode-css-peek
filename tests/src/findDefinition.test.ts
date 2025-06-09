import * as assert from "assert";
import * as vscode from "vscode";
import { TextDocument as ServerTextDocument } from "vscode-languageserver";

import { findDefinition } from "../../server/out/core/findDefinition";
import { create } from "../../server/out/logger";
import type { StylesheetMap, Selector } from "../../server/src/types";

async function loadStylesheets(files: string[]): Promise<StylesheetMap> {
  const map: StylesheetMap = {};
  for (const file of files) {
    const vscodeDoc = await vscode.workspace.openTextDocument(
      vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, file)
    );
    const text = vscodeDoc.getText();
    const serverDoc = ServerTextDocument.create(
      vscodeDoc.uri.toString(),
      vscodeDoc.languageId,
      vscodeDoc.version,
      text
    );
    map[serverDoc.uri] = { document: serverDoc };
  }
  return map;
}

suite("findDefinition", () => {
  create(console as any);
  let map: StylesheetMap;
  suiteSetup(async () => {
    map = await loadStylesheets([
      "stylesheet.css",
      "example.less",
      "example.scss",
      "my_style.scss",
      "extendFailureCase.less",
    ]);
  });

  test("finds class selector definitions", () => {
    const selector: Selector = { attribute: "class", value: "test" };
    const defs = findDefinition(selector, map);
    assert.strictEqual(defs.length, 3);
    const files = defs
      .map((d) => vscode.Uri.parse(d.uri).path.split("/").pop())
      .sort();
    assert.deepStrictEqual(
      files,
      ["example.scss", "stylesheet.css", "stylesheet.css"].sort()
    );
  });

  test("finds id selector definitions across files", () => {
    const selector: Selector = { attribute: "id", value: "test-2" };
    const defs = findDefinition(selector, map).sort((a, b) =>
      a.uri.localeCompare(b.uri)
    );
    assert.strictEqual(defs.length, 3);
    const files = defs.map((d) =>
      vscode.Uri.parse(d.uri).path.split("/").pop()
    );
    assert.deepStrictEqual(
      files.sort(),
      ["example.less", "example.scss", "stylesheet.css"].sort()
    );
  });

  test("finds tag selector definitions", () => {
    const selector: Selector = { attribute: null as any, value: "h1" };
    const defs = findDefinition(selector, map).sort(
      (a, b) => a.range.start.line - b.range.start.line
    );
    assert.strictEqual(defs.length, 4);
    const lines = defs.map((d) => d.range.start.line);
    assert.deepStrictEqual(lines, [0, 16, 16, 19]);
  });
});

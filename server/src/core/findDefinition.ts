import * as path from "path";
import {
  Location,
  SymbolInformation,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  getLESSLanguageService,
  LanguageService,
  SymbolKind,
} from "vscode-css-languageservice";

import { Selector, StylesheetMap } from "../types";
import { console } from "./../logger";

const languageServices: { [id: string]: LanguageService } = {
  css: getCSSLanguageService(),
  scss: getSCSSLanguageService(),
  less: getLESSLanguageService(),
};

export function isLanguageServiceSupported(serviceId: string) {
  return !!languageServices[serviceId];
}

export function getLanguageService(document: TextDocument) {
  let service = languageServices[document.languageId];
  if (!service) {
    console.log(
      "Document type is " + document.languageId + ", using css instead."
    );
    service = languageServices["css"];
  }
  return service;
}


function resolveSymbolName(symbols: SymbolInformation[], i: number): string {
  const name = symbols[i].name;
  if (name.startsWith("&")) {
    return resolveSymbolName(symbols, i - 1) + name.slice(1);
  }
  return name;
}

function splitCamelCase(str: string): string[] {
  return str.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/);
}

function isFuzzyMatch(query: string, target: string): boolean {
  if (!query || !target) return false;
  
  query = query.toLowerCase();
  target = target.toLowerCase();
  
  // 直接前缀匹配
  if (target.startsWith(query)) {
    return true;
  }
  
  // 模糊匹配：检查query的每个字符是否按顺序出现在target中
  let queryIndex = 0;
  let targetIndex = 0;
  
  while (queryIndex < query.length && targetIndex < target.length) {
    if (query[queryIndex] === target[targetIndex]) {
      queryIndex++;
    }
    targetIndex++;
  }
  
  // 如果所有query字符都匹配了，就是模糊匹配
  if (queryIndex === query.length) {
    return true;
  }
  
  // camelCase增强匹配：检查首字母缩写匹配
  const targetParts = splitCamelCase(target);
  const queryChars = query.split('');
  
  // 检查是否是首字母缩写，如 "slh" 匹配 "SessionListHeader"
  if (queryChars.length <= targetParts.length) {
    let matchCount = 0;
    for (let i = 0; i < targetParts.length && matchCount < queryChars.length; i++) {
      if (targetParts[i].length > 0 && targetParts[i][0].toLowerCase() === queryChars[matchCount]) {
        matchCount++;
      }
    }
    if (matchCount === queryChars.length) {
      return true;
    }
  }
  
  // 检查分段前缀匹配：如 "sesslh" 匹配 "sessionListHeader"
  const targetChars = target.split('');
  let charMatchCount = 0;
  
  for (let i = 0; i < targetChars.length && charMatchCount < query.length; i++) {
    if (targetChars[i] === query[charMatchCount]) {
      charMatchCount++;
    }
  }
  
  return charMatchCount === query.length;
}

export function findSymbols(
  selector: Selector,
  stylesheetMap: StylesheetMap
): SymbolInformation[] {
  const foundSymbols: SymbolInformation[] = [];

  const classOrIdSelector =
    selector.attribute === "class" || selector.attribute === "id";

  // Test all the symbols against the RegExp
  Object.keys(stylesheetMap).forEach((uri) => {
    const styleSheet = stylesheetMap[uri];
    try {
      let symbols: SymbolInformation[];
      if (styleSheet.symbols) {
        // use the cached value
        symbols = styleSheet.symbols;
      } else {
        // The document symbols haven't been extracted and cached yet.
        // Skip the file-based filtering for now since we're doing fuzzy matching
        console.log(`Parsing ${path.basename(uri)}`);

        // Looks like it does. Now, let's go ahead and actually get the symbols + cache the symbols for the future
        const languageService = getLanguageService(styleSheet.document);
        const stylesheet = languageService.parseStylesheet(styleSheet.document);
        symbols = styleSheet.symbols = languageService.findDocumentSymbols(
          styleSheet.document,
          stylesheet
        );
      }

      console.log(`${path.basename(uri)} has ${symbols.length} symbols`);
      console.log(`Searching through them all for "${selector.value}"`);

      symbols.forEach((symbol, i) => {
        const name = resolveSymbolName(symbols, i);

        // 提取类名或ID名（去掉前缀的.或#）
        let targetName = name;
        if (classOrIdSelector) {
          if (selector.attribute === "class" && name.startsWith(".")) {
            targetName = name.substring(1);
          } else if (selector.attribute === "id" && name.startsWith("#")) {
            targetName = name.substring(1);
          }
        }

        // 使用新的模糊匹配逻辑
        if (isFuzzyMatch(selector.value, targetName)) {
          foundSymbols.push(symbol);
        } else if (!classOrIdSelector) {
          // Special case for tag selectors - match "*" as the rightmost character
          if (/\*\s*$/.test(name)) {
            foundSymbols.push(symbol);
          }
        }
      });

      console.log(`Done`);
    } catch (e) {
      console.log(e.stack);
    }
  });

  return foundSymbols;
}

export function findDefinition(
  selector: Selector,
  stylesheetMap: StylesheetMap
): Location[] {
  return findSymbols(selector, stylesheetMap).map(({ location }) => location);
}

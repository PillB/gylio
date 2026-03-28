#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const allowedDirectories = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);
const targetArgs = process.argv.slice(2);

const resolveTargets = () => {
  if (targetArgs.length > 0) {
    return targetArgs.map((target) => path.resolve(process.cwd(), target));
  }
  return [path.resolve(process.cwd(), 'src')];
};

const collectFiles = (entryPath, files = []) => {
  if (!fs.existsSync(entryPath)) return files;
  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    if (/\.(jsx|tsx)$/.test(entryPath)) files.push(entryPath);
    return files;
  }

  for (const child of fs.readdirSync(entryPath)) {
    if (allowedDirectories.has(child)) continue;
    collectFiles(path.join(entryPath, child), files);
  }
  return files;
};

const getLineNumber = (content, index) => content.slice(0, index).split('\n').length;

const textNodePattern = />\s*([^<{\n][^<{]*[A-Za-zÀ-ÿ][^<{]*)\s*</g;
const attributePattern = /\b(aria-label|title|placeholder|alt)\s*=\s*"([^"{][^"]*[A-Za-zÀ-ÿ][^"]*)"/g;

const shouldIgnoreText = (rawText) => {
  const text = rawText.trim();
  if (!text) return true;
  if (/^(true|false|null)$/i.test(text)) return true;
  if (/^[\w.-]+$/.test(text) && !text.includes(' ')) return true;
  if (/[{}()=]/.test(text)) return true;
  return false;
};

const violations = [];
for (const target of resolveTargets()) {
  for (const filePath of collectFiles(target)) {
    const content = fs.readFileSync(filePath, 'utf8');

    for (const match of content.matchAll(textNodePattern)) {
      const [, rawText] = match;
      if (shouldIgnoreText(rawText)) continue;
      violations.push({
        filePath,
        line: getLineNumber(content, match.index ?? 0),
        message: `Hardcoded JSX text: "${rawText.trim()}"`
      });
    }

    for (const match of content.matchAll(attributePattern)) {
      const [, attr, value] = match;
      if (shouldIgnoreText(value)) continue;
      violations.push({
        filePath,
        line: getLineNumber(content, match.index ?? 0),
        message: `Hardcoded ${attr} attribute: "${value.trim()}"`
      });
    }
  }
}

if (violations.length > 0) {
  console.error('i18n check failed. Found user-facing hardcoded strings in JSX/TSX:');
  violations.forEach(({ filePath, line, message }) => {
    console.error(`- ${path.relative(process.cwd(), filePath)}:${line} ${message}`);
  });
  process.exit(1);
}

console.log('i18n check passed: no hardcoded user-facing JSX/TSX strings found.');

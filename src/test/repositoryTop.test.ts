import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The top of the repository holds the project's own files. Working notes live in docs/notes, and the one-off agent
 * scripts (and the agent SDKs only they used) are gone: they were never built or tested, and sat beside the app.
 */
const root = process.cwd();

describe('the top of the repository', () => {
  it('has only the README and the instructions for people and agents as Markdown', () => {
    const markdown = fs.readdirSync(root).filter((file) => file.endsWith('.md')).sort();
    expect(markdown).toEqual(['AGENTS.md', 'CLAUDE.md', 'README.md']);
  });

  it('keeps the moved notes, with an index that names each of them', () => {
    const index = fs.readFileSync(path.join(root, 'docs/notes/README.md'), 'utf8');
    const notes = fs.readdirSync(path.join(root, 'docs/notes')).filter((file) => file !== 'README.md');
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.filter((file) => !index.includes(`\`${file}\``))).toEqual([]);
  });

  it('has no one-off agent scripts, and no dependency only they used', () => {
    const scripts = fs.readdirSync(path.join(root, 'scripts'));
    expect(scripts.filter((file) => /^batch-|^agent-validate/.test(file))).toEqual([]);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const declared = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
    expect(declared.filter((name) => name.startsWith('@anthropic-ai/'))).toEqual([]);
  });
});

import React from 'react';

/**
 * Minimal, dependency-free renderer for the policy markdown subset
 * (h1-h3, paragraphs, flat bullet lists, pipe tables, **bold**, [links](url)).
 * It builds React elements directly and never uses innerHTML.
 */

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
const SAFE_HREF = /^(\/|https:\/\/|mailto:)/;

const unescapeMd = (s: string) => s.replace(/\\([\\`*_{}[\]()#+\-.!|<>])/g, '$1');

const resolveHref = (href: string, base: string) =>
  href.startsWith('/') ? `${base.replace(/\/$/, '')}${href}` : href;

export function renderInline(text: string, base = '/'): React.ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{unescapeMd(part.slice(2, -2))}</strong>;
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link && SAFE_HREF.test(link[2])) {
      return (
        <a key={i} href={resolveHref(link[2], base)}>
          {unescapeMd(link[1])}
        </a>
      );
    }
    return <React.Fragment key={i}>{unescapeMd(part)}</React.Fragment>;
  });
}

const splitRow = (line: string) =>
  line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

const HEADING = /^(#{1,3}) (.*)$/;

function renderTable(lines: string[], key: number, base: string) {
  const [head, , ...rows] = lines;
  return (
    <div key={key} className="legal-table-wrap" tabIndex={0} role="region" aria-label={splitRow(head)[0]}>
      <table>
        <thead>
          <tr>{splitRow(head).map((c, i) => <th key={i} scope="col">{renderInline(c, base)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>{splitRow(r).map((c, ci) => <td key={ci}>{renderInline(c, base)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderHeading(match: RegExpExecArray, key: number, base: string) {
  const level = match[1].length;
  const children = renderInline(match[2], base);
  if (level === 1) return <h1 key={key}>{children}</h1>;
  return level === 2 ? <h2 key={key}>{children}</h2> : <h3 key={key}>{children}</h3>;
}

export function renderMarkdown(md: string, base = '/'): React.ReactNode[] {
  const blocks = md.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  return blocks.map((block, key) => {
    const lines = block.split('\n');
    const heading = HEADING.exec(block);
    if (heading && lines.length === 1) return renderHeading(heading, key, base);
    if (lines.every((l) => l.startsWith('- '))) {
      return <ul key={key}>{lines.map((l, i) => <li key={i}>{renderInline(l.slice(2), base)}</li>)}</ul>;
    }
    if (lines.length > 2 && lines.every((l) => l.startsWith('|'))) return renderTable(lines, key, base);
    return <p key={key}>{renderInline(lines.join(' '), base)}</p>;
  });
}

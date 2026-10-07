import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { toText } from 'hast-util-to-text';
import { createMermaidRenderer } from 'mermaid-isomorphic';
import { parse } from 'space-separated-tokens';
import { visitParents } from 'unist-util-visit-parents';

/**
 * Drop-in replacement for rehype-mermaid (strategy: 'inline-svg' only) with a
 * persistent on-disk SVG cache.
 *
 * Why: the site has 1500+ mermaid diagrams. Rendering them all through
 * headless Chromium on every build takes tens of minutes. This plugin caches
 * each rendered SVG in .cache/mermaid/ keyed by sha256(mermaid version +
 * diagram source), so builds are incremental and resumable.
 *
 * Note: with strategy 'inline-svg', upstream rehype-mermaid renders a dark
 * variant too (option dark: true) but then discards it — only the light SVG
 * is inlined. We skip that wasted second render entirely; output is identical.
 */

const here = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(here, '..', '.cache', 'mermaid');
const ERROR_LOG = join(here, '..', '.cache', 'mermaid-errors.jsonl');
mkdirSync(CACHE_DIR, { recursive: true });

const mermaidVersion = JSON.parse(
  readFileSync(join(here, '..', 'node_modules', 'mermaid', 'package.json'), 'utf8')
).version;

const nonWhitespacePattern = /\w/;

function cacheKey(diagram) {
  return createHash('sha256').update(`inline-svg\0${mermaidVersion}\0${diagram}`).digest('hex');
}

function isMermaidCodeElement(element) {
  if (element.tagName !== 'code') return false;
  let className = element.properties?.className;
  if (typeof className === 'string') className = parse(className);
  if (!Array.isArray(className)) return false;
  return className.includes('language-mermaid');
}

export default function rehypeMermaidCached(options = {}) {
  const renderDiagrams = createMermaidRenderer(options);
  return (ast, file) => {
    const instances = [];
    visitParents(ast, 'element', (node, ancestors) => {
      if (!isMermaidCodeElement(node)) return;
      const parent = ancestors.at(-1);
      let inclusiveAncestors = ancestors;
      if (parent.type === 'element' && parent.tagName === 'pre') {
        for (const child of parent.children) {
          if (child.type === 'text') {
            if (nonWhitespacePattern.test(child.value)) return;
          } else if (child !== node) {
            return;
          }
        }
      } else {
        inclusiveAncestors = [...inclusiveAncestors, node];
      }
      instances.push({ diagram: toText(node, { whitespace: 'pre' }), ancestors: inclusiveAncestors });
    });

    if (!instances.length) return;

    // Split cached vs uncached
    const svgs = new Array(instances.length);
    const toRender = [];
    const toRenderIdx = [];
    let hits = 0;
    for (const [i, inst] of instances.entries()) {
      const key = cacheKey(inst.diagram);
      inst.key = key;
      try {
        svgs[i] = readFileSync(join(CACHE_DIR, `${key}.svg`), 'utf8');
        hits++;
      } catch {
        toRender.push(inst.diagram);
        toRenderIdx.push(i);
      }
    }

    const finish = () => {
      for (const [i, inst] of instances.entries()) {
        if (svgs[i] === undefined) {
          const message = file.message(`mermaid render failed (see above)`, {
            ruleId: 'rehype-mermaid-cached',
            source: 'rehype-mermaid-cached',
            ancestors: inst.ancestors,
          });
          message.fatal = true;
          throw message;
        }
        const replacement = fromHtmlIsomorphic(svgs[i], { fragment: true }).children[0];
        const node = inst.ancestors.at(-1);
        const parent = inst.ancestors.at(-2);
        parent.children[parent.children.indexOf(node)] = replacement;
      }
    };

    if (!toRender.length) {
      finish();
      return;
    }

    console.log(`[mermaid-cache] ${file.path || file.basename || 'file'}: ${hits} cached, ${toRender.length} to render`);

    return renderDiagrams(toRender, { ...options, screenshot: false }).then((results) => {
      const failures = [];
      for (const [k, result] of results.entries()) {
        const i = toRenderIdx[k];
        if (result.status === 'rejected') {
          // Non-fatal: keep the original code block in the output and report
          // the failure so every bad diagram can be fixed in one pass.
          failures.push({
            file: file.path || file.basename || 'unknown',
            blockIndex: i + 1,
            diagram: instances[i].diagram,
            reason: String(result.reason && result.reason.message ? result.reason.message : result.reason)
              .split('\n').slice(0, 6).join('\n'),
          });
          continue;
        }
        svgs[i] = result.value.svg;
        try {
          writeFileSync(join(CACHE_DIR, `${instances[i].key}.svg`), result.value.svg);
        } catch {
          // cache write failure is non-fatal
        }
      }
      if (failures.length) {
        for (const f of failures) {
          appendFileSync(ERROR_LOG, JSON.stringify(f) + '\n');
        }
        console.warn(`[mermaid-cache] ${failures.length} diagram(s) FAILED to render (see .cache/mermaid-errors.jsonl)`);
        // Replace failed nodes with nothing: keep original code block.
        for (const [i, inst] of instances.entries()) {
          if (svgs[i] === undefined) continue;
          const replacement = fromHtmlIsomorphic(svgs[i], { fragment: true }).children[0];
          const node = inst.ancestors.at(-1);
          const parent = inst.ancestors.at(-2);
          parent.children[parent.children.indexOf(node)] = replacement;
        }
        return;
      }
      finish();
    });
  };
}

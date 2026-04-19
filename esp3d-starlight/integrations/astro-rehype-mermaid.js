import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import { toHast } from 'mdast-util-to-hast';
import { visit } from 'unist-util-visit';
import rehypeMermaid from 'rehype-mermaid';

/** Transforme le bloc mermaid en HTML avant le highlighting */
const remarkMermaidToHtml = () => (tree) => {
  visit(tree, 'code', (code, index, parent) => {
    if (index === undefined || !parent || code.lang !== 'mermaid') return;
    const html = toHtml(toHast(code));
    parent.children.splice(index, 1, { type: 'html', value: html });
  });
};

/** Remet le HTML dans le bon format pour rehype */
const rehypeMermaidRawToHast = () => (tree) => {
  visit(tree, 'raw', (node, index, parent) => {
    if (index === undefined || !parent) return;
    if (node.value.startsWith('<pre><code class="language-mermaid"')) {
      const hast = fromHtml(node.value, { fragment: true });
      parent.children.splice(index, 1, hast);
    }
  });
};

export default function astroRehypeMermaid(options = {}) {
  return {
    name: 'astro-mermaid',
    hooks: {
      'astro:config:setup'({ updateConfig }) {
        updateConfig({
          markdown: {
            remarkPlugins: [remarkMermaidToHtml],
            rehypePlugins: [
              rehypeMermaidRawToHast,
              [rehypeMermaid, options],
            ],
          },
        });
      },
    },
  };
}
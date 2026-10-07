// Valide tous les blocs ```mermaid des fiches codewiki avec le mermaid du site
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'src/content/docs/ESP3D-X/Version_2X/documentation/codewiki';
const mermaid = (await import('mermaid')).default;
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

let bad = 0, total = 0;
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.md'))) {
  const text = fs.readFileSync(path.join(DIR, f), 'utf8');
  const blocks = [...text.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)];
  for (let i = 0; i < blocks.length; i++) {
    total++;
    try {
      await mermaid.parse(blocks[i][1]);
    } catch (e) {
      bad++;
      const line = String(e.message).split('\n').find(l => l.trim().length > 3) || e.message;
      console.log(`${f}#${i + 1}: ${line.slice(0, 140)}`);
    }
  }
}
console.log(`\n${total} diagrammes, ${bad} en echec`);

from pathlib import Path
import re

roots = [
    Path('src/content/docs/ESP3D/version-3x'),
    Path('src/content/docs/ESP3D/version-21x'),
]
pattern = re.compile(r'^>\s*\*\*(Warning|Info|Note|Danger):\s*(.*)$')
changed = []
for root in roots:
    mdx_files = sorted(root.rglob('*.mdx')) + sorted(root.rglob('*.md'))
    for path in mdx_files:
        text = path.read_text(encoding='utf-8')
        lines = text.splitlines()
        out = []
        in_block = False
        for line in lines:
            m = pattern.match(line)
            if not in_block and m:
                kind = m.group(1)
                rest = m.group(2).strip()
                if rest == '**Note:**' or rest == '':
                    rest = ''
                cls = 'warning-panel' if kind == 'Warning' else 'danger-panel' if kind == 'Danger' else 'info-panel'
                out.append(f'<aside class="{cls}">')
                if rest:
                    out.append(f'  <p><strong>{kind}:</strong> {rest}</p>')
                else:
                    out.append(f'  <p><strong>{kind}:</strong></p>')
                in_block = True
                continue
            if in_block:
                if line.startswith('>'):
                    content = line[1:]
                    if content.startswith(' '):
                        content = content[1:]
                    out.append('  ' + content)
                    continue
                else:
                    out.append('</aside>')
                    in_block = False
            out.append(line)
        if in_block:
            out.append('</aside>')
            in_block = False
        new_text = '\n'.join(out) + ('\n' if text.endswith('\n') else '')
        if new_text != text:
            path.write_text(new_text, encoding='utf-8')
            changed.append(path)
print('changed', len(changed))
for p in changed:
    print(p)

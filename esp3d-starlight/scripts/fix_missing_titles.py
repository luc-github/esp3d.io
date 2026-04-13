from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'docs' / 'ESP3D' / 'version-3x'

for path in sorted(root.rglob('*.mdx')):
    text = path.read_text(encoding='utf-8')
    stripped = text.lstrip()
    if stripped.startswith('---'):
        continue
    title = None
    for line in text.splitlines():
        if line.startswith('# '):
            title = line[2:].strip()
            break
        if line.startswith('## '):
            title = line[3:].strip()
            break
    if not title:
        title = path.stem.replace('_', ' ').replace('-', ' ').title()
    frontmatter = f'---\ntitle: {title}\n---\n\n'
    path.write_text(frontmatter + text, encoding='utf-8')
    print(f'Added title to {path.relative_to(root)}')

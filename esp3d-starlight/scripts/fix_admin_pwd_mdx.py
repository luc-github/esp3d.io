from pathlib import Path

root = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'docs' / 'ESP3D' / 'version-3x'
if not root.exists():
    raise SystemExit(f'Missing root: {root}')

pattern = '* pwd=<admin password>'
replacement = '* `pwd=<admin password>`'
count = 0
for path in root.rglob('*.mdx'):
    text = path.read_text(encoding='utf-8')
    if pattern in text:
        text = text.replace(pattern, replacement)
        path.write_text(text, encoding='utf-8')
        count += 1
print(f'Updated {count} files.')

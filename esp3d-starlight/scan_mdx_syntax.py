import re
from pathlib import Path
root = Path('src/content/docs/ESP3D/version-3x')
mdx_files = list(root.rglob('*.mdx'))
report = []
for path in mdx_files:
    text = path.read_text(encoding='utf-8')
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        if 'pwd=<' in line and '`' not in line:
            report.append(f'{path}:{i}: {line}')
        if re.search(r'<[^>]+>', line) and '`' not in line and not line.strip().startswith('```'):
            # skip known allowed HTML tags if lower-case and simple
            if re.search(r'<[A-Za-z][A-Za-z0-9_-]*>', line) and not re.search(r'`', line):
                report.append(f'{path}:{i}: {line}')
            elif re.search(r'</[A-Za-z][A-Za-z0-9_-]*>', line) and not re.search(r'`', line):
                report.append(f'{path}:{i}: {line}')
with open('scan-results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(report))
print('done', len(report))

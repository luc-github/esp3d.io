import re

with open('src/content/docs/ESP3D/version-3x/documentation/api/websockets.mdx', 'r', encoding='utf-8') as f:
    content = f.read()

html_tables = re.findall(r'<div class="rounded-table">', content)
md_table_lines = re.findall(r'^\|.*\|', content, re.MULTILINE)

print(f'Tableaux HTML (rounded-table): {len(html_tables)}')
print(f'Lignes de tableaux markdown: {len(md_table_lines)}')
print()

# Show HTML table headers
matches = re.finditer(r'<div class="rounded-table">.*?<thead>.*?</thead>', content, re.DOTALL)
for i, m in enumerate(matches):
    text = re.sub(r'<[^>]+>', ' ', m.group(0))
    text = ' '.join(text.split())[:80]
    print(f'HTML #{i+1}: {text}...')

print()
# Show a few markdown table lines for context
print('Exemples de lignes markdown restantes:')
for i, line in enumerate(md_table_lines[:6]):
    print(f'  {line[:80]}')

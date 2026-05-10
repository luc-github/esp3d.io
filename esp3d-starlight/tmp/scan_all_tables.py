import re
from pathlib import Path

files = list(Path('src/content/docs').rglob('*.mdx'))

total_md_tables = 0
empty_header_tables = []

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Skip if no markdown tables
    if not re.search(r'^\|.*\|', content, re.MULTILINE):
        continue
    
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('|') and line.endswith('|') and '---' not in line:
            if i + 1 < len(lines):
                sep = lines[i + 1].strip()
                if sep.startswith('|') and sep.endswith('|') and all(c in '|-: ' for c in sep):
                    data_rows = []
                    j = i + 2
                    while j < len(lines):
                        next_line = lines[j].strip()
                        if next_line.startswith('|') and next_line.endswith('|') and '---' not in next_line:
                            data_rows.append(next_line)
                            j += 1
                        else:
                            break
                    
                    total_md_tables += 1
                    cells = [c.strip() for c in line[1:-1].split('|')]
                    if all(c == '' for c in cells):
                        empty_header_tables.append((str(f), i+1, len(data_rows)))
                    
                    i = j
                    continue
        i += 1

print(f'Total markdown tables found: {total_md_tables}')
print(f'Empty header tables: {len(empty_header_tables)}')
for f, line, rows in empty_header_tables[:10]:
    print(f'  {f}:{line} ({rows} data rows)')

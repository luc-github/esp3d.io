import re

with open('src/content/docs/ESP3D/version-3x/documentation/api/websockets.mdx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

i = 0
count = 0
while i < len(lines) - 2:
    line = lines[i].strip()
    # Check if line looks like a markdown table row
    if line.startswith('|') and line.endswith('|') and '---' not in line:
        # Look ahead for separator
        if i + 1 < len(lines) and '---' in lines[i+1]:
            # Look ahead for identical data row
            if i + 2 < len(lines):
                data_line = lines[i+2].strip()
                if data_line.startswith('|') and data_line.endswith('|') and '---' not in data_line:
                    # Compare cells (ignore whitespace)
                    header_cells = [c.strip() for c in line[1:-1].split('|')]
                    data_cells = [c.strip() for c in data_line[1:-1].split('|')]
                    if header_cells == data_cells:
                        print(f'Line {i+1}: DUPE -> {line[:80]}')
                        count += 1
                        i += 3
                        continue
    i += 1

print(f'\nTotal duplicated tables: {count}')

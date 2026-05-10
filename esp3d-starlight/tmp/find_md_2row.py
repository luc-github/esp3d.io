import re
from pathlib import Path

files = [
    'src/content/docs/ESP3D/version-3x/documentation/api/websockets.mdx',
    'src/content/docs/ESP3D/version-3x/documentation/commands/index.mdx',
    'src/content/docs/ESP3D/version-3x/documentation/lua.mdx',
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('|') and line.endswith('|') and '---' not in line:
            # Potential table header
            if i + 1 < len(lines) and '---' in lines[i + 1]:
                # Count data rows
                data_rows = 0
                j = i + 2
                while j < len(lines):
                    next_line = lines[j].strip()
                    if next_line.startswith('|') and next_line.endswith('|') and '---' not in next_line:
                        data_rows += 1
                        j += 1
                    else:
                        break
                
                if data_rows == 2:
                    print(f'{f}: 2 data rows at line {i+1}')
                    print(f'  Header: {line[:80]}')
                    print(f'  Row 1:  {lines[i+2].strip()[:80]}')
                    print(f'  Row 2:  {lines[i+3].strip()[:80]}')
                    print()
                
                i = j
                continue
        i += 1

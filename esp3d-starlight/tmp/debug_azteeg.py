import re
from pathlib import Path

def is_separator(line):
    stripped = line.strip()
    if not (stripped.startswith('|') and stripped.endswith('|')):
        return False
    return all(c in '|-: ' for c in stripped)

def is_table_row(line):
    stripped = line.strip()
    return stripped.startswith('|') and stripped.endswith('|') and not is_separator(stripped)

def is_empty_header(header_line):
    cells = [c.strip() for c in header_line[1:-1].split('|')]
    return all(c == '' for c in cells)

f = Path('src/content/docs/ESP3D/version-3x/hardware/system_boards/main_boards/azteeg_x5_wifi/index.mdx')
with open(f, 'r', encoding='utf-8') as file:
    lines = file.read().split('\n')

for i, line in enumerate(lines):
    stripped = line.strip()
    if is_table_row(stripped):
        print(f'Line {i+1}: table row found: "{stripped}"')
        if i + 1 < len(lines):
            sep = lines[i + 1].strip()
            print(f'  Next line: "{sep}"')
            print(f'  is_separator: {is_separator(sep)}')
            if is_separator(sep):
                data_rows = []
                j = i + 2
                while j < len(lines):
                    next_line = lines[j].strip()
                    if is_table_row(next_line):
                        data_rows.append(next_line)
                        j += 1
                    else:
                        break
                print(f'  Data rows: {len(data_rows)}')
                print(f'  Empty header: {is_empty_header(stripped)}')

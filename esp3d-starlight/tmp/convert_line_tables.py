import re

with open('src/content/docs/ESP3D/version-3x/documentation/api/websockets.mdx', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
new_lines = []
i = 0
converted = 0

def is_separator(line):
    # A markdown separator line contains only |, -, :, and spaces
    stripped = line.strip()
    if not (stripped.startswith('|') and stripped.endswith('|')):
        return False
    inner = stripped[1:-1]
    return all(c in '|-: ' for c in stripped)

def is_table_row(line):
    stripped = line.strip()
    return stripped.startswith('|') and stripped.endswith('|') and not is_separator(stripped)

while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    
    if is_table_row(stripped):
        # Look ahead for separator line
        if i + 1 < len(lines) and is_separator(lines[i + 1].strip()):
            # Check if there is a data line after the separator
            has_data = False
            if i + 2 < len(lines) and is_table_row(lines[i + 2].strip()):
                has_data = True
            
            if not has_data:
                # This is a single-row table (header only, no data)
                # Convert to HTML .table-line
                cells = [c.strip() for c in stripped[1:-1].split('|')]
                td_html = ''.join(f'<td>{c}</td>' for c in cells)
                html_block = (
                    '<div class="rounded-table">\n'
                    '<table class="table-line">\n'
                    '<tbody>\n'
                    f'<tr>{td_html}</tr>\n'
                    '</tbody>\n'
                    '</table>\n'
                    '</div>'
                )
                new_lines.append(html_block)
                converted += 1
                i += 2  # skip header and separator
                continue
    
    new_lines.append(line)
    i += 1

with open('src/content/docs/ESP3D/version-3x/documentation/api/websockets.mdx', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f'Converted {converted} single-row tables to .table-line HTML')

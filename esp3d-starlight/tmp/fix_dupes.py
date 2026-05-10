import re
import subprocess

# Get original file from git
result = subprocess.run(
    ['git', 'show', 'HEAD:esp3d-starlight/src/content/docs/ESP3D/version-3x/documentation/api/websockets.mdx'],
    capture_output=True, text=True, encoding='utf-8'
)
original = result.stdout

with open('src/content/docs/ESP3D/version-3x/documentation/api/websockets.mdx', 'r', encoding='utf-8') as f:
    current = f.read()

# Extract all markdown tables from original
original_tables = {}
for m in re.finditer(r'((?:^\|[^\n]+\|\n)+)', original, re.MULTILINE):
    table_text = m.group(1).strip()
    lines = table_text.split('\n')
    if len(lines) >= 1 and lines[0].startswith('|'):
        key = lines[0].strip()
        original_tables[key] = table_text

print(f'Found {len(original_tables)} tables in original')

# Find duplicated tables in current and replace them
def replace_dupes(match):
    block = match.group(1)
    lines = block.strip().split('\n')
    if len(lines) >= 3:
        header = lines[0].strip()
        sep = lines[1].strip()
        data = lines[2].strip()
        # Check if header and data are identical (ignoring whitespace in cells)
        h_cells = [c.strip() for c in header[1:-1].split('|')]
        d_cells = [c.strip() for c in data[1:-1].split('|')]
        if h_cells == d_cells:
            # Try to find original table
            if header in original_tables:
                print(f'Replaced: {header[:60]}...')
                return '\n' + original_tables[header] + '\n'
            else:
                # Remove duplicate data line
                print(f'Fixed (no original): {header[:60]}...')
                return '\n' + '\n'.join(lines[:2]) + '\n'
    return '\n' + block + '\n'

# Pattern: a markdown table block that starts with a non-separator row, followed by separator, followed by another row
pattern = r'\n((?:^\|[^\n]+\|\n)+)\n'
new_current = re.sub(pattern, replace_dupes, current, flags=re.MULTILINE)

with open('src/content/docs/ESP3D/version-3x/documentation/api/websockets.mdx', 'w', encoding='utf-8') as f:
    f.write(new_current)

print('Done!')

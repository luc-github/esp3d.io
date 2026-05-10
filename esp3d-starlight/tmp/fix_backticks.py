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

def normalize(s):
    return ' '.join(s.replace('`', '').replace('\u2013', '-').replace('\u2026', '...').split())

# Build a map from normalized header -> original table text
original_tables = {}
for m in re.finditer(r'((?:^\|[^\n]+\|\n)+)', original, re.MULTILINE):
    table_text = m.group(1).strip()
    lines = table_text.split('\n')
    if len(lines) >= 1 and lines[0].startswith('|'):
        key = normalize(lines[0])
        original_tables[key] = table_text

print(f'Found {len(original_tables)} tables in original')

# Find tables in current and replace with original if match
def replace_table(match):
    block = match.group(1)
    lines = block.strip().split('\n')
    if len(lines) >= 2 and lines[0].startswith('|'):
        key = normalize(lines[0])
        if key in original_tables:
            orig = original_tables[key]
            # Only replace if different
            if block.strip() != orig:
                print(f'Replaced: {lines[0][:60]}...')
                return '\n' + orig + '\n'
    return '\n' + block + '\n'

pattern = r'\n((?:^\|[^\n]+\|\n)+)\n'
new_current = re.sub(pattern, replace_table, current, flags=re.MULTILINE)

with open('src/content/docs/ESP3D/version-3x/documentation/api/websockets.mdx', 'w', encoding='utf-8') as f:
    f.write(new_current)

print('Done!')

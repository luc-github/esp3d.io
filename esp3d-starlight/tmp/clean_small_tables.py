import re
from pathlib import Path

def html_table_to_md(html):
    # Extract rows from thead and tbody
    thead_match = re.search(r'<thead>(.*?)</thead>', html, re.DOTALL)
    tbody_match = re.search(r'<tbody>(.*?)</tbody>', html, re.DOTALL)
    if not thead_match or not tbody_match:
        return None
    
    def extract_cells(section_html):
        rows = re.findall(r'<tr>(.*?)</tr>', section_html, re.DOTALL)
        result = []
        for row in rows:
            cells = re.findall(r'<t[dh]>(.*?)</t[dh]>', row, re.DOTALL)
            result.append(cells)
        return result
    
    thead_rows = extract_cells(thead_match.group(1))
    tbody_rows = extract_cells(tbody_match.group(1))
    
    if not thead_rows or not tbody_rows:
        return None
    
    # Build markdown table
    lines = []
    # Header row
    header = '| ' + ' | '.join(c.strip() for c in thead_rows[0]) + ' |'
    lines.append(header)
    # Separator
    sep = '|' + '|'.join('-' * (len(c.strip()) + 2) for c in thead_rows[0]) + '|'
    lines.append(sep)
    # Body rows
    for row in tbody_rows:
        lines.append('| ' + ' | '.join(c.strip() for c in row) + ' |')
    
    return '\n'.join(lines)

def clean_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    def replace_block(match):
        html = match.group(0)
        # Count tbody rows
        tbody_match = re.search(r'<tbody>(.*?)</tbody>', html, re.DOTALL)
        if not tbody_match:
            return html
        tbody_rows = re.findall(r'<tr>', tbody_match.group(1))
        if len(tbody_rows) <= 1:
            md = html_table_to_md(html)
            if md:
                return md
        return html
    
    # Find all rounded-table blocks
    pattern = r'<div class="rounded-table">\s*<table class="table-compact">.*?</table>\s*</div>'
    new_content = re.sub(pattern, replace_block, content, flags=re.DOTALL)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return new_content != content

# Process backup files
files = [
    'tmp/websockets_backup.mdx',
    'tmp/lua_backup.mdx',
    'tmp/commands_backup.mdx',
]

for f in files:
    if clean_file(f):
        print(f'Cleaned: {f}')
    else:
        print(f'No changes: {f}')

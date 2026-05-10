import re
from bs4 import BeautifulSoup

def html_table_to_md(html):
    soup = BeautifulSoup(html, 'html.parser')
    table = soup.find('table')
    if not table:
        return None
    
    thead = table.find('thead')
    tbody = table.find('tbody')
    if not thead or not tbody:
        return None
    
    def get_cells(row):
        cells = row.find_all(['th', 'td'])
        # Strip HTML tags, keep text
        return [c.get_text(strip=True) for c in cells]
    
    thead_rows = thead.find_all('tr')
    tbody_rows = tbody.find_all('tr')
    
    if not thead_rows or not tbody_rows:
        return None
    
    lines = []
    header_cells = get_cells(thead_rows[0])
    lines.append('| ' + ' | '.join(header_cells) + ' |')
    lines.append('|' + '|'.join([' --- ' for _ in header_cells]) + '|')
    for row in tbody_rows:
        cells = get_cells(row)
        lines.append('| ' + ' | '.join(cells) + ' |')
    
    return '\n'.join(lines)

def clean_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    def replace_block(match):
        html = match.group(0)
        soup = BeautifulSoup(html, 'html.parser')
        tbody = soup.find('tbody')
        if not tbody:
            return html
        rows = tbody.find_all('tr')
        if len(rows) <= 1:
            md = html_table_to_md(html)
            if md:
                return '\n' + md + '\n'
        return html
    
    pattern = r'<div class="rounded-table">\s*<table class="table-compact">.*?</table>\s*</div>'
    new_content = re.sub(pattern, replace_block, content, flags=re.DOTALL)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return new_content != content

files = [
    'tmp/websockets_backup.mdx',
    'tmp/commands_backup.mdx',
]

for f in files:
    if clean_file(f):
        print(f'Cleaned: {f}')
    else:
        print(f'No changes: {f}')

import re
from pathlib import Path
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
        return [c.get_text(strip=True) for c in cells]
    
    thead_rows = thead.find_all('tr')
    tbody_rows = tbody.find_all('tr')
    
    if not thead_rows or not tbody_rows:
        return None
    
    lines = []
    # Header
    header_cells = get_cells(thead_rows[0])
    lines.append('| ' + ' | '.join(header_cells) + ' |')
    # Separator (simple dashes)
    lines.append('|' + '|'.join([' --- ' for _ in header_cells]) + '|')
    # Body
    for row in tbody_rows:
        cells = get_cells(row)
        lines.append('| ' + ' | '.join(cells) + ' |')
    
    return '\n'.join(lines)

def clean_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    soup = BeautifulSoup(content, 'html.parser')
    wrappers = soup.find_all('div', class_='rounded-table')
    
    replacements = []
    for wrapper in wrappers:
        table = wrapper.find('table')
        if not table:
            continue
        tbody = table.find('tbody')
        if not tbody:
            continue
        rows = tbody.find_all('tr')
        if len(rows) <= 1:
            md = html_table_to_md(str(wrapper))
            if md:
                replacements.append((str(wrapper), md))
    
    new_content = content
    for old, new in replacements:
        new_content = new_content.replace(old, new, 1)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return len(replacements)

files = [
    'tmp/websockets_backup.mdx',
    'tmp/commands_backup.mdx',
]

for f in files:
    count = clean_file(f)
    print(f'Cleaned {count} small tables from {f}')

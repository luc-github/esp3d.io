import re
from pathlib import Path
from bs4 import BeautifulSoup

files = list(Path('src/content/docs').rglob('*.mdx'))

def remove_tfoot(html):
    return re.sub(r'\s*<tfoot>.*?</tfoot>\s*', '', html, flags=re.DOTALL)

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    original = content
    
    # Find all .table-compact blocks
    for m in re.finditer(r'<div class="rounded-table">\s*<table class="table-compact">.*?</table>\s*</div>', content, re.DOTALL):
        html = m.group(0)
        soup = BeautifulSoup(html, 'html.parser')
        tbody = soup.find('tbody')
        tfoot = soup.find('tfoot')
        rows = tbody.find_all('tr') if tbody else []
        if len(rows) == 2 and tfoot:
            new_html = remove_tfoot(html)
            content = content.replace(html, new_html, 1)
    
    if content != original:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f'Updated: {f}')

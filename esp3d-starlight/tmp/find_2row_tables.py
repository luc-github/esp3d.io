import re
from pathlib import Path
from bs4 import BeautifulSoup

files = list(Path('src/content/docs').rglob('*.mdx'))

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Find all .table-compact blocks
    for m in re.finditer(r'<div class="rounded-table">\s*<table class="table-compact">.*?</table>\s*</div>', content, re.DOTALL):
        html = m.group(0)
        soup = BeautifulSoup(html, 'html.parser')
        tbody = soup.find('tbody')
        tfoot = soup.find('tfoot')
        rows = tbody.find_all('tr') if tbody else []
        if len(rows) == 2 and tfoot:
            thead = soup.find('thead')
            header = ' / '.join(th.get_text(strip=True) for th in thead.find_all('th')) if thead else 'no header'
            print(f'{f}: {len(rows)} rows, header: {header[:60]}')

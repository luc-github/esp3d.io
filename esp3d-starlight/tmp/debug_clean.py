import re
from bs4 import BeautifulSoup

with open('tmp/websockets_backup.mdx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<div class="rounded-table">\s*<table class="table-compact">.*?</table>\s*</div>'
matches = list(re.finditer(pattern, content, re.DOTALL))

for i, match in enumerate(matches):
    html = match.group(0)
    soup = BeautifulSoup(html, 'html.parser')
    tbody = soup.find('tbody')
    if tbody:
        rows = tbody.find_all('tr')
        if len(rows) <= 1:
            print(f'Match {i}: {len(rows)} rows -> should convert')
            md_soup = BeautifulSoup(html, 'html.parser')
            table = md_soup.find('table')
            thead = table.find('thead') if table else None
            tbody2 = table.find('tbody') if table else None
            if thead and tbody2:
                thead_rows = thead.find_all('tr')
                tbody_rows = tbody2.find_all('tr')
                print(f'  thead rows: {len(thead_rows)}, tbody rows: {len(tbody_rows)}')
            else:
                print(f'  Missing thead or tbody')
        else:
            print(f'Match {i}: {len(rows)} rows -> keep')
    else:
        print(f'Match {i}: no tbody')

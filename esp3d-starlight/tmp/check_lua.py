import re
from bs4 import BeautifulSoup

with open('tmp/lua_backup.mdx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<div class="rounded-table">\s*<table class="table-compact">.*?</table>\s*</div>'
matches = list(re.finditer(pattern, content, re.DOTALL))

for i, match in enumerate(matches):
    html = match.group(0)
    soup = BeautifulSoup(html, 'html.parser')
    tbody = soup.find('tbody')
    rows = tbody.find_all('tr') if tbody else []
    print(f'Match {i}: {len(rows)} rows')

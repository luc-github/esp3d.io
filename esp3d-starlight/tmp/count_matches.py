import re
with open('tmp/websockets_backup.mdx', 'r', encoding='utf-8') as f:
    content = f.read()
pattern = r'<div class="rounded-table">\s*<table class="table-compact">.*?</table>\s*</div>'
matches = list(re.finditer(pattern, content, re.DOTALL))
print(f'Found {len(matches)} matches')

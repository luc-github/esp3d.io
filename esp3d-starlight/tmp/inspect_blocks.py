import re
with open('tmp/websockets_backup.mdx', 'r', encoding='utf-8') as f:
    content = f.read()
blocks = re.findall(r'<div class="rounded-table">.*?</table>\s*</div>', content, re.DOTALL)
print(f'Found {len(blocks)} blocks')
for i, b in enumerate(blocks[:3]):
    print(f'--- Block {i} ---')
    print(b[:500])
    print('...')

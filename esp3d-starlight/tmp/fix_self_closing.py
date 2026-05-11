from pathlib import Path

files = list(Path('src/content/docs').rglob('*.mdx'))

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    original = content
    content = content.replace(' / class="img-small">', ' class="img-small" />')
    content = content.replace(' / class="img-medium">', ' class="img-medium" />')
    
    if content != original:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f'Fixed: {f}')

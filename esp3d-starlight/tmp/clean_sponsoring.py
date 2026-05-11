import re

with open('src/content/docs/sponsoring/sponsoring.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all <style>...</style> blocks
content = re.sub(r'<style>.*?</style>\s*', '', content, flags=re.DOTALL)

# Replace inline style on discord image
content = content.replace('style="max-width: 50px"', 'class="img-small"')

# Remove inline styles from SVG cells (keep only the SVG structure)
content = re.sub(r'<td style="padding:0">', '<td>', content)
content = re.sub(r'<text([^>]+) style="font-family:monospace;font-size:14px"', r'<text\1 style="font-family:monospace;font-size:14px"', content)
# Remove fill="transparent" style (keep the attribute)
content = re.sub(r' style="font-family:monospace;font-size:14px" fill="transparent"', ' fill="transparent" style="font-family:monospace;font-size:14px"', content)

# Actually, the SVG styles are fine as inline styles since they are SVG attributes
# Just clean up the table structure

with open('src/content/docs/sponsoring/sponsoring.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Cleaned sponsoring.html')

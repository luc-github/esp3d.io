import re
from pathlib import Path

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Replace <center> and </center>
    content = content.replace('<center>', '<div class="text-center">')
    content = content.replace('</center>', '</div>')
    
    # Replace width="250" with class="img-small" on img tags
    # Match: <img ... width="250" ...> or <img ... width='250' ...>
    def replace_width_250(match):
        tag = match.group(0)
        # Remove width="250" or width='250'
        tag = re.sub(r'\s*width=["\']250["\']', '', tag)
        # Add class="img-small" before the closing >
        if 'class="' in tag:
            tag = tag.replace('class="', 'class="img-small ')
        else:
            tag = tag.replace('>', ' class="img-small">')
        return tag
    
    def replace_width_400(match):
        tag = match.group(0)
        tag = re.sub(r'\s*width=["\']400["\']', '', tag)
        if 'class="' in tag:
            tag = tag.replace('class="', 'class="img-medium ')
        else:
            tag = tag.replace('>', ' class="img-medium">')
        return tag
    
    content = re.sub(r'<img\b[^>]*width=["\']250["\'][^>]*>', replace_width_250, content)
    content = re.sub(r'<img\b[^>]*width=["\']400["\'][^>]*>', replace_width_400, content)
    
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Files with <center> or width="..."
files = [
    'src/content/docs/ESP3D/version-3x/showcase/lua/index.mdx',
    'src/content/docs/ESP3D/version-3x/installation/index.mdx',
    'src/content/docs/ESP3D/version-3x/installation/vscode-platformio.mdx',
    'src/content/docs/ESP3D/version-3x/installation/arduino.mdx',
    'src/content/docs/ESP3D/version-21x/installation/index.mdx',
    'src/content/docs/ESP3D/version-21x/installation/vscode-platformio/index.mdx',
    'src/content/docs/ESP3D/version-21x/installation/arduino/index.mdx',
    'src/content/docs/tools/discovery/mdns.mdx',
    'src/content/docs/tools/discovery/ssdp.mdx',
]

for f in files:
    if fix_file(f):
        print(f'Fixed: {f}')
    else:
        print(f'No changes: {f}')

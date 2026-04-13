from pathlib import Path
import shutil
import re

root = Path(__file__).resolve().parent.parent.parent / 'archives-tmp' / 'src' / 'docs' / 'ESP3D' / 'Version_3.X'
dst = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'docs' / 'ESP3D' / 'version-3x'
img_dst = Path(__file__).resolve().parent.parent / 'public' / 'img'

if dst.exists():
    shutil.rmtree(dst)

for src_path in root.rglob('*'):
    rel = src_path.relative_to(root)
    if src_path.is_dir():
        continue
    target_dir = dst / rel.parent
    target_dir.mkdir(parents=True, exist_ok=True)
    if src_path.suffix.lower() == '.md':
        target_path = target_dir / (src_path.stem + '.mdx')
        text = src_path.read_text(encoding='utf-8')

        lines = text.splitlines()
        out_lines = []
        in_admon = False
        for line in lines:
            m = re.match(r'^(?P<indent>\s*)!!!\s*(?P<kind>\w+)(?:\s+"(?P<title>[^"]+)")?\s*$', line)
            if m:
                kind = m.group('kind').capitalize()
                title = m.group('title')
                title_text = f' **{title}:**' if title else ''
                out_lines.append(f'> **{kind}:{title_text}')
                in_admon = True
                continue
            if in_admon:
                if line.strip() == '':
                    out_lines.append('>')
                    continue
                if re.match(r'^\s*\S', line) and not line.lstrip().startswith('>'):
                    in_admon = False
                else:
                    stripped = line.lstrip(' ') if line.startswith(' ') else line
                    out_lines.append('> ' + stripped)
                    continue
            out_lines.append(line)
        text = '\n'.join(out_lines)
        text = text.replace('* pwd=<admin password>', '* `pwd=<admin password>`')
        text = text.replace('* pwd=<admin/user password>', '* `pwd=<admin/user password>`')        text = re.sub(r'{%\s*include-markdown\s+"\.\/([^\"]+)"\s*%}', r'See [configuration](./configuration/).', text)
        text = re.sub(r'\{\{\s*List_children\([^)]*\)\s*\}\}', '__LIST_CHILDREN__', text)

        def rewrite_image(match):
            alt, path, tail = match.group(1), match.group(2), match.group(3)
            if re.match(r'^(https?:|/)', path):
                return match.group(0)
            normalized = path.split('?')[0].split('#')[0]
            src_image = src_path.parent / normalized
            if src_image.exists():
                new_path = '/img/' + str((rel.parent / normalized)).replace('\\', '/').lstrip('./')
                return f'![{alt}]({new_path}{tail})'
            return match.group(0)

        text = re.sub(r'!\[([^\]]*)\]\(([^\)]+)(\))', rewrite_image, text)
        target_path.write_text(text, encoding='utf-8')
    else:
        if src_path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.gif', '.svg'}:
            img_target = img_dst / rel
            img_target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_path, img_target)
        else:
            target_path = target_dir / src_path.name
            shutil.copy2(src_path, target_path)

for mdx_path in dst.rglob('*.mdx'):
    content = mdx_path.read_text(encoding='utf-8')
    if '__LIST_CHILDREN__' not in content:
        continue
    parent = mdx_path.parent
    entries = []
    for child in sorted(parent.iterdir()):
        if child.is_dir() and (child / 'index.mdx').exists():
            label = child.name.replace('_', ' ').replace('-', ' ').title()
            entries.append(f'* [{label}](./{child.name}/)')
        elif child.is_file() and child.suffix == '.mdx' and child.name != 'index.mdx':
            label = child.stem.replace('_', ' ').replace('-', ' ').title()
            entries.append(f'* [{label}](./{child.stem}/)')
    if entries:
        replacement = '\n'.join(entries)
    else:
        replacement = '> No subpages available yet.'
    content = content.replace('__LIST_CHILDREN__', replacement)
    mdx_path.write_text(content, encoding='utf-8')

print('3.X migration complete:', dst)

import os
from pathlib import Path
from urllib.parse import quote
import re

def define_env(env):
    "Hook function"

    def extract_fronmatter(chemin_fichier):
        with open(chemin_fichier, 'r', encoding='utf-8') as fichier:
            contenu = fichier.read()
        
        match = re.search(r'---\s*(.*?)\s*---', contenu, re.DOTALL)
        if match:
            frontmatter = match.group(1)
            title = re.search(r'title\s*:\s*(.*)', frontmatter)
            description = re.search(r'description\s*:\s*(.*)', frontmatter)
            weight = re.search(r'weight\s*:\s*(\d+)', frontmatter)
            return {
                'title': title.group(1).strip().strip('"\'') if title else None,
                'description': description.group(1).strip() if description else None,
                'weight': int(weight.group(1)) if weight else 0
            }
        return None

    @env.macro
    def List_children(depth=1):
        base_path = env.conf['docs_dir']
        current_page = Path(env.page.file.src_path)
        rooted = str(current_page.parent)
        full_path = os.path.join(base_path, rooted)

        def list_files(path, current_depth):
            if current_depth > depth:
                return ""

            items = []
            for f in os.listdir(path):
                full_file_path = os.path.join(path, f)
                if os.path.isdir(full_file_path):
                    index_path = os.path.join(full_file_path, 'index.md')
                    if os.path.exists(index_path):
                        info = extract_fronmatter(index_path) or {}
                        rel_path = os.path.relpath(full_file_path, full_path)
                        url = quote(rel_path.replace('\\', '/') + '/')
                        title = info.get('title') or os.path.basename(full_file_path)
                        weight = info.get('weight', 0)
                        sub_list = list_files(full_file_path, current_depth + 1)
                        items.append((weight, f'<li><a href="{url}">{title}</a>{sub_list}</li>'))
                elif f.endswith('.md') and f != 'index.md':
                    info = extract_fronmatter(full_file_path) or {}
                    rel_path = os.path.relpath(full_file_path, full_path)
                    url = quote(rel_path.replace('\\', '/'))
                    title = info.get('title') or os.path.splitext(f)[0]
                    weight = info.get('weight', 0)
                    items.append((weight, f'<li><a href="{url}">{title}</a></li>'))

            sorted_items = sorted(items, key=lambda x: x[0])  # sort by weight
            return '<ul>' + ''.join([item[1] for item in sorted_items]) + '</ul>' if items else ""

        result = list_files(full_path, 1)
        if result:
            styled_result = f"<div style='display: flex; justify-content: center;'><div style='display: inline-block; text-align: left;'>{result}</div></div>"
            return styled_result
        return "<p>No files found.</p>"
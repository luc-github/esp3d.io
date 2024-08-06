import os
from pathlib import Path
from urllib.parse import quote
import re

def define_env(env):
    "Hook function"

    def extract_frontmatter(file_path):
        with open(file_path, 'r', encoding='utf-8') as fichier:
            contenu = fichier.read()
        
        match = re.search(r'---\s*(.*?)\s*---', contenu, re.DOTALL)
        if match:
            frontmatter = match.group(1)
            title = re.search(r'title\s*:\s*(.*)', frontmatter)
            description = re.search(r'description\s*:\s*(.*)', frontmatter)
            weight = re.search(r'weight\s*:\s*(\d+)', frontmatter)
            return {
                'title': title.group(1).strip().strip('"\'') if title else None,
                'description': description.group(1).strip().strip('"\'')  if description else None,
                'weight': int(weight.group(1)) if weight else 0
            }
        return None

    @env.macro
    def List_children(depth=1, addDescription=False):
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
                        info = extract_frontmatter(index_path) or {}
                        rel_path = os.path.relpath(full_file_path, full_path)
                        url = quote(rel_path.replace('\\', '/') + '/')
                        title = info.get('title') or os.path.basename(full_file_path)
                        weight = info.get('weight', 0)
                        desc = info.get('description', '')
                        sub_list = list_files(full_file_path, current_depth + 1)
                        item_content = f'<a href="{url}">{title}</a>'
                        if addDescription and desc:
                            item_content += f' <div class="description"  style="margin-bottom:1rem!important;margin-top:0px!important;"><i>{desc}</i></span>'
                        items.append((weight, f'<li>{item_content}{sub_list}</li>'))
                elif f.endswith('.md') and f != 'index.md':
                    info = extract_frontmatter(full_file_path) or {}
                    rel_path = os.path.relpath(full_file_path, full_path)
                    url = quote(rel_path.replace('\\', '/'))
                    title = info.get('title') or os.path.splitext(f)[0]
                    weight = info.get('weight', 0)
                    desc = info.get('description', '')
                    item_content = f'<a href="{url}">{title}</a>'
                    if addDescription and desc:
                        item_content += f' <div class="description" style="margin-bottom:1rem!important;margin-top:0px!important;"><i>{desc}</i></div>'
                    items.append((weight, f'<li>{item_content}</li>'))
            
            sorted_items = sorted(items, key=lambda x: x[0])  # sort by weight
            return '<ul>' + ''.join([item[1] for item in sorted_items]) + '</ul>' if items else ""

        result = list_files(full_path, 1)
        if result:
            styled_result = f"<div style='display: flex; justify-content: center;'><div style='display: inline-block; text-align: left;'>{result}</div></div>"
            return styled_result
        return "<p>No files found.</p>"
    
    @env.macro
    def attachements():
        base_path = env.conf['docs_dir']
        current_page = Path(env.page.file.src_path)
        attachments_dir = os.path.join(base_path, str(current_page.parent), 'attachments.mkdocs')

        if not os.path.isdir(attachments_dir):
            return "<p>No directory " + attachments_dir + " found.</p>"

        def get_file_size(file_path):
            size_bytes = os.path.getsize(file_path)
            for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
                if size_bytes < 1024.0:
                    return f"{size_bytes:.2f} {unit}"
                size_bytes /= 1024.0

        items = []
        for file in os.listdir(attachments_dir):
            file_path = os.path.join(attachments_dir, file)
            if os.path.isfile(file_path):
                size = get_file_size(file_path)
                url ="attachments.mkdocs/"+ file
                items.append(f'<li><a href="{url}" download >{file} ({size})</a></li>')

        if items:
            result = '<ul>' + ''.join(items) + '</ul>'
            styled_result = f'<div><div style="color:white; background:#6ab0de;font-weight:700;padding:6px 12px;"><span>&#x1F4E6;</span>Attachments</div><div class="admonition">{result}</div></div>'
            return styled_result
        return "<p>No attachement found.</p>"



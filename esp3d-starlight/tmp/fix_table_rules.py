import re
from pathlib import Path
from bs4 import BeautifulSoup

def build_tfoot(col_count):
    cells = '\n      '.join('<td>&nbsp;</td>' for _ in range(col_count))
    return f'''  <tfoot>
    <tr>
      {cells}
    </tr>
  </tfoot>'''

def md_table_to_html(header, data_rows, compact_class='table-compact', with_tfoot=True):
    header_cells = [c.strip() for c in header[1:-1].split('|')]
    col_count = len(header_cells)
    
    thead = '  <thead>\n    <tr>\n      ' + '\n      '.join(f'<th>{c}</th>' for c in header_cells) + '\n    </tr>\n  </thead>'
    
    tbody_lines = []
    for row in data_rows:
        cells = [c.strip() for c in row[1:-1].split('|')]
        tbody_lines.append('      ' + '\n      '.join(f'<td>{c}</td>' for c in cells))
    tbody = '  <tbody>\n' + '\n'.join(f'    <tr>\n{line}\n    </tr>' for line in tbody_lines) + '\n  </tbody>'
    
    tfoot = ''
    if with_tfoot:
        tfoot = '\n' + build_tfoot(col_count)
    
    return f'''<div class="rounded-table">
<table class="{compact_class}">
{thead}
{tbody}{tfoot}
</table>
</div>'''

files = [
    'src/content/docs/ESP3D/version-3x/documentation/api/websockets.mdx',
    'src/content/docs/ESP3D/version-3x/documentation/commands/index.mdx',
    'src/content/docs/ESP3D/version-3x/documentation/lua.mdx',
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    original = content
    lines = content.split('\n')
    new_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        # Detect markdown table header
        if line.startswith('|') and line.endswith('|') and '---' not in line:
            # Look ahead for separator
            if i + 1 < len(lines):
                sep = lines[i + 1].strip()
                if sep.startswith('|') and sep.endswith('|') and all(c in '|-: ' for c in sep):
                    # Count data rows
                    data_rows = []
                    j = i + 2
                    while j < len(lines):
                        next_line = lines[j].strip()
                        if next_line.startswith('|') and next_line.endswith('|') and '---' not in next_line:
                            data_rows.append(next_line)
                            j += 1
                        else:
                            break
                    
                    if len(data_rows) == 1:
                        # 1 header + 1 data row -> .table-compact without tfoot
                        html = md_table_to_html(line, data_rows, with_tfoot=False)
                        new_lines.append(html)
                        i = j
                        continue
                    elif len(data_rows) >= 2:
                        # 1 header + 2+ data rows -> .table-compact with tfoot
                        html = md_table_to_html(line, data_rows, with_tfoot=True)
                        new_lines.append(html)
                        i = j
                        continue
        
        # Check if this is a .table-compact block with 2 tbody rows and no tfoot
        # We need to add tfoot back
        if i < len(lines) and '<table class="table-compact">' in lines[i]:
            # Find the end of this block
            block_start = i
            block_end = i
            while block_end < len(lines) and '</div>' not in lines[block_end]:
                block_end += 1
            block_end += 1  # include </div>
            
            block = '\n'.join(lines[block_start:block_end])
            soup = BeautifulSoup(block, 'html.parser')
            tbody = soup.find('tbody')
            tfoot = soup.find('tfoot')
            rows = tbody.find_all('tr') if tbody else []
            
            if len(rows) == 2 and not tfoot:
                # Add tfoot back
                thead = soup.find('thead')
                if thead:
                    col_count = len(thead.find_all('th'))
                else:
                    col_count = len(rows[0].find_all('td'))
                
                # Insert tfoot before </table>
                tfoot_html = build_tfoot(col_count)
                new_block = block.replace('</table>', tfoot_html + '\n</table>')
                new_lines.append(new_block)
                i = block_end
                continue
        
        new_lines.append(lines[i])
        i += 1
    
    new_content = '\n'.join(new_lines)
    if new_content != original:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f'Updated: {f}')
    else:
        print(f'No changes: {f}')

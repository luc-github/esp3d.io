import re
from pathlib import Path

def is_separator(line):
    stripped = line.strip()
    if not (stripped.startswith('|') and stripped.endswith('|')):
        return False
    if '-' not in stripped and ':' not in stripped:
        return False
    return all(c in '|-: ' for c in stripped)

def is_table_row(line):
    stripped = line.strip()
    return stripped.startswith('|') and stripped.endswith('|') and not is_separator(stripped)

def is_empty_header(header_line):
    cells = [c.strip() for c in header_line[1:-1].split('|')]
    return all(c == '' for c in cells)

def build_tfoot(col_count):
    cells = '\n      '.join('<td>&nbsp;</td>' for _ in range(col_count))
    return f'''  <tfoot>
    <tr>
      {cells}
    </tr>
  </tfoot>'''

def md_table_to_html(header_line, data_rows, table_class='table-compact', with_tfoot=True, empty_header=False):
    header_cells = [c.strip() for c in header_line[1:-1].split('|')]
    col_count = len(header_cells)
    
    if empty_header:
        thead_cells = ['<th>&nbsp;</th>'] * col_count
    else:
        thead_cells = [f'<th>{c}</th>' for c in header_cells]
    
    thead = '  <thead>\n    <tr>\n      ' + '\n      '.join(thead_cells) + '\n    </tr>\n  </thead>'
    
    tbody_lines = []
    for row in data_rows:
        cells = [c.strip() for c in row[1:-1].split('|')]
        tbody_lines.append('      ' + '\n      '.join(f'<td>{c}</td>' for c in cells))
    tbody = '  <tbody>\n' + '\n'.join(f'    <tr>\n{line}\n    </tr>' for line in tbody_lines) + '\n  </tbody>'
    
    tfoot = ''
    if with_tfoot:
        tfoot = '\n' + build_tfoot(col_count)
    
    return f'''<div class="rounded-table">
<table class="{table_class}">
{thead}
{tbody}{tfoot}
</table>
</div>'''

files = list(Path('src/content/docs').rglob('*.mdx'))
converted_files = 0
total_tables = 0

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    original = content
    lines = content.split('\n')
    new_lines = []
    i = 0
    file_converted = 0
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        if is_table_row(stripped):
            # Look ahead for separator
            if i + 1 < len(lines) and is_separator(lines[i + 1]):
                header_line = stripped
                data_rows = []
                j = i + 2
                while j < len(lines):
                    next_line = lines[j].strip()
                    if is_table_row(next_line):
                        data_rows.append(next_line)
                        j += 1
                    else:
                        break
                
                empty_header = is_empty_header(header_line)
                
                if empty_header:
                    # Table with empty header -> .table-compact with empty <thead>
                    with_tfoot = len(data_rows) >= 2
                    html = md_table_to_html(header_line, data_rows, 
                                          table_class='table-compact', 
                                          with_tfoot=with_tfoot, 
                                          empty_header=True)
                    new_lines.append(html)
                    file_converted += 1
                    i = j
                    continue
                elif len(data_rows) == 0:
                    # Frame format (header only) -> .table-line
                    cells = [c.strip() for c in header_line[1:-1].split('|')]
                    td_html = ''.join(f'<td>{c}</td>' for c in cells)
                    html = (
                        '<div class="rounded-table">\n'
                        '<table class="table-line">\n'
                        '<tbody>\n'
                        f'<tr>{td_html}</tr>\n'
                        '</tbody>\n'
                        '</table>\n'
                        '</div>'
                    )
                    new_lines.append(html)
                    file_converted += 1
                    i = j
                    continue
                elif len(data_rows) == 1:
                    # 1 header + 1 data row -> .table-compact without tfoot
                    html = md_table_to_html(header_line, data_rows, 
                                          table_class='table-compact', 
                                          with_tfoot=False)
                    new_lines.append(html)
                    file_converted += 1
                    i = j
                    continue
                else:
                    # 1 header + 2+ data rows -> .table-compact with tfoot
                    html = md_table_to_html(header_line, data_rows, 
                                          table_class='table-compact', 
                                          with_tfoot=True)
                    new_lines.append(html)
                    file_converted += 1
                    i = j
                    continue
        
        new_lines.append(line)
        i += 1
    
    new_content = '\n'.join(new_lines)
    if new_content != original:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        converted_files += 1
        total_tables += file_converted
        print(f'{f}: {file_converted} tables converted')

print(f'\nTotal: {total_tables} tables converted in {converted_files} files')

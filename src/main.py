import os
from pathlib import Path
def define_env(env):
    "Hook function"

    @env.macro
    def List_childrens(depth=1):
        files = []
        base_path = env.conf['docs_dir']
        current_page = Path(env.page.file.src_path)
        rooted = str(current_page.parent)

        full_path = os.path.join(base_path, rooted)
        if not os.path.exists(full_path):
            return ""

        for f in os.listdir(full_path):
            if f.endswith(".md"):
                files.append(f)

        return files


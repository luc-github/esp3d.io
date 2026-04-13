const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', 'src', 'content', 'docs', 'ESP3D', 'version-3x');
const pattern = '* pwd=<admin password>';
const replacement = '* `pwd=<admin password>`';
let count = 0;
function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full);
    else if (name.isFile() && full.endsWith('.mdx')) {
      let text = fs.readFileSync(full, 'utf8');
      if (text.includes(pattern)) {
        text = text.split(pattern).join(replacement);
        fs.writeFileSync(full, text, 'utf8');
        count += 1;
      }
    }
  }
}
walk(root);
console.log('Updated', count, 'files.');

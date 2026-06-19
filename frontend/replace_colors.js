const fs = require('fs');
const path = require('path');

const colorMap = {
  '#051424': '#000000',
  '#0f131e': '#000000',
  '#121317': '#050505',
  '#1e1f23': '#111111',
  '#1b1f2b': '#1a1a1a',
  '#343538': '#222222',
  '#44474f': '#333333',
  '#424479': '#333333'
};

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir('/home/prayag/coding/Dev/Project/VersionVista/frontend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    content = content.split(oldColor).join(newColor);
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});

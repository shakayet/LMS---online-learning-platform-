/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const fs = require('fs');
const path = require('path');

const stripComments = (code) => {
  let stripped = code.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, (match, p1, p2) => {
    if (p2) return p2; 
    return p1 || ""; 
  });

  return stripped.split('\n')
    .map(line => line.trimEnd())
    .filter((line, index, arr) => {
      if (line.trim() === '' && index > 0 && arr[index-1].trim() === '') {
        return false;
      }
      return true;
    })
    .join('\n');
};

const walk = (dir) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
};

const targetDirs = ['src', 'dist', 'scripts'];
targetDirs.forEach(dirName => {
  const dirPath = path.join(__dirname, dirName);
  const files = walk(dirPath);
  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const stripped = stripComments(content);
    if (content !== stripped) {
      fs.writeFileSync(file, stripped, 'utf8');
      console.log(`Cleaned up: ${file}`);
    }
  });
});

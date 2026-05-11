/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const fs = require('fs');
const path = require('path');

const cleanFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');

  const regex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
  let cleaned = content.replace(regex, (match, p1, p2) => {
    if (p2) return p2;
    return p1 || "";
  });

  cleaned = cleaned.replace(/(`[\s\S]*?`)/g, (match) => {

    return match.replace(/^(\s*)\/\/.*$/gm, '$1');
  });

  cleaned = cleaned.split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  if (content !== cleaned) {
    fs.writeFileSync(filePath, cleaned + '\n', 'utf8');
    console.log(`Cleaned: ${filePath}`);
  }
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
  const dirPath = path.join(process.cwd(), dirName);
  const files = walk(dirPath);
  files.forEach(cleanFile);
});

cleanFile(__filename);

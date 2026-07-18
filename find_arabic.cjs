const fs = require('fs');
const path = require('path');

const arabicRegex = /[\u0600-\u06FF]/;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        scanDir(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (file === 'localization.tsx') continue; // Skip translation definitions itself
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const matches = [];
      lines.forEach((line, index) => {
        if (arabicRegex.test(line)) {
          matches.push({ lineNum: index + 1, text: line.trim() });
        }
      });
      if (matches.length > 0) {
        console.log(`\n=== File: ${fullPath} (${matches.length} matches) ===`);
        // Limit output per file to avoid too much output
        const toShow = matches.slice(0, 100);
        toShow.forEach(m => {
          console.log(`${m.lineNum}: ${m.text}`);
        });
        if (matches.length > 100) {
          console.log(`... and ${matches.length - 100} more matches`);
        }
      }
    }
  }
}

scanDir('./src');

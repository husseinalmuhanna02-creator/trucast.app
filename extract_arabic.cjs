const fs = require('fs');
const path = require('path');

const arabicRegex = /[\u0600-\u06FF]+/;

// Find all matches of strings (quoted or inside JSX tags) containing Arabic
const doubleQuoteRegex = /"([^"\n]*[\u0600-\u06FF]+[^"\n]*)"/g;
const singleQuoteRegex = /'([^'\n]*[\u0600-\u06FF]+[^'\n]*)'/g;
const backtickRegex = /`([^`\n]*[\u0600-\u06FF]+[^`\n]*)`/g;
const jsxTextRegex = />\s*([^<>\n]*[\u0600-\u06FF]+[^<>\n]*)\s*</g;

const uniqueArabic = new Set();

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
      if (file === 'localization.tsx') continue;
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      let match;
      while ((match = doubleQuoteRegex.exec(content)) !== null) {
        uniqueArabic.add(match[1].trim());
      }
      while ((match = singleQuoteRegex.exec(content)) !== null) {
        uniqueArabic.add(match[1].trim());
      }
      while ((match = backtickRegex.exec(content)) !== null) {
        // Clean template literals if necessary, but keep it simple
        uniqueArabic.add(match[1].trim());
      }
      while ((match = jsxTextRegex.exec(content)) !== null) {
        uniqueArabic.add(match[1].trim());
      }
    }
  }
}

scanDir('./src');

console.log(JSON.stringify(Array.from(uniqueArabic).sort(), null, 2));

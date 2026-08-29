const fs = require('fs');

const code = fs.readFileSync('/src/components/LiveStreamScreen.tsx', 'utf8');

let braces = [];
let parens = [];
let jsxTags = [];

const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Clean comments and strings for simple matching
  let cleanLine = line.replace(/\/\/.*$/g, '');
  
  for (let j = 0; j < cleanLine.length; j++) {
    const char = cleanLine[j];
    if (char === '{') {
      braces.push({ lineNum, col: j + 1 });
    } else if (char === '}') {
      if (braces.length === 0) {
        console.log(`Unmatched } on line ${lineNum}, col ${j + 1}`);
      } else {
        braces.pop();
      }
    } else if (char === '(') {
      parens.push({ lineNum, col: j + 1 });
    } else if (char === ')') {
      if (parens.length === 0) {
        console.log(`Unmatched ) on line ${lineNum}, col ${j + 1}`);
      } else {
        parens.pop();
      }
    }
  }
}

console.log(`Remaining open braces: ${braces.length}`);
if (braces.length > 0) {
  console.log("First 5 open braces:");
  console.log(braces.slice(0, 5));
}

console.log(`Remaining open parens: ${parens.length}`);
if (parens.length > 0) {
  console.log("First 5 open parens:");
  console.log(parens.slice(0, 5));
}

const ts = require('typescript');
const fs = require('fs');

const fileName = 'src/components/LiveStreamScreen.tsx';
const fileContent = fs.readFileSync(fileName, 'utf8');

const sourceFile = ts.createSourceFile(
  fileName,
  fileContent,
  ts.ScriptTarget.Latest,
  true
);

// We want to find the node at line 5496
let targetPos = 0;
const lines = fileContent.split('\n');
for (let i = 0; i < 5495; i++) {
  targetPos += lines[i].length + 1; // +1 for newline
}

console.log(`Target pos for line 5496: ${targetPos}`);

function printNodePath(node, depth = 0) {
  if (node.pos <= targetPos && node.end >= targetPos) {
    const kindName = ts.SyntaxKind[node.kind];
    console.log(`${'  '.repeat(depth)}${kindName} [${node.pos} - ${node.end}]`);
    ts.forEachChild(node, (child) => printNodePath(child, depth + 1));
  }
}

printNodePath(sourceFile);

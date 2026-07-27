import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AssessmentSignature.jsx', 'utf8');

// Strip regex literals to avoid false positives with slashes
content = content.replace(/\/[^\/\n]+\/[gimy]*/g, '""');

let stack = [];
let lines = content.split('\n');

let lineNum = 1;
let inString = null;
let isComment = false;
let isBlockComment = false;

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  if (c === '\n') lineNum++;
  
  if (isComment) {
    if (c === '\n') isComment = false;
    continue;
  }
  if (isBlockComment) {
    if (c === '*' && content[i+1] === '/') {
      isBlockComment = false;
      i++;
    }
    continue;
  }
  if (inString) {
    if (c === inString) {
      // check if escaped
      if (content[i-1] !== '\\') inString = null;
    }
    continue;
  }
  
  // comments
  if (c === '/' && content[i+1] === '/') {
    isComment = true;
    i++;
    continue;
  }
  if (c === '/' && content[i+1] === '*') {
    isBlockComment = true;
    i++;
    continue;
  }
  
  // strings
  if (c === '"' || c === "'" || c === '`') {
    inString = c;
    continue;
  }
  
  // brackets
  if (c === '(' || c === '[' || c === '{') {
    stack.push({ char: c, line: lineNum, pos: i });
  } else if (c === ')' || c === ']' || c === '}') {
    const last = stack.pop();
    if (!last) {
      console.log(`Extra closing bracket '${c}' on line ${lineNum}`);
      continue;
    }
    const matches = (last.char === '(' && c === ')') ||
                    (last.char === '[' && c === ']') ||
                    (last.char === '{' && c === '}');
    if (!matches) {
      console.log(`Mismatch: opened '${last.char}' on line ${last.line} but closed with '${c}' on line ${lineNum}`);
      // Push last back to recover
      stack.push(last);
    }
  }
}

console.log('Nesting check completed! Stack size:', stack.length);
if (stack.length > 0) {
  console.log('Unclosed brackets:', stack.map(s => `${s.char} (line ${s.line})`));
}

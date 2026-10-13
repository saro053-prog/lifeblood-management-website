const fs = require('fs');
const filePath = 'scripts/build_final_pdf.js';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add top-right page number CSS
const topCss = `
    .page-num-top {
      position: absolute;
      top: 6px;
      right: 8px;
      font-family: var(--font-heading);
      font-size: 10pt;
      font-weight: 700;
      color: var(--primary);
    }
`;

if (!code.includes('.page-num-top')) {
  code = code.replace('.page-num {', topCss + '\n    .page-num {');
}

// 2. Change all <span class="page-num">Page (\d+)</span> to <span class="page-num">$1</span>
code = code.replace(/<span class="page-num">Page (\d+)<\/span>/g, '<span class="page-num">$1</span>');

// 3. Insert <span class="page-num-top">X</span> right after each <div class="page">
let pageCount = 0;
code = code.replace(/<div class="page">/g, (match) => {
  pageCount++;
  return `${match}\n    <span class="page-num-top">${pageCount}</span>`;
});

console.log(`✅ Updated ${pageCount} pages: added top-right number & removed 'Page' prefix.`);
fs.writeFileSync(filePath, code, 'utf8');

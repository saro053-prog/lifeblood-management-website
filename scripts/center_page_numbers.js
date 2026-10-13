const fs = require('fs');
const filePath = 'scripts/build_final_pdf.js';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Remove .page-num-top CSS
code = code.replace(/\s*\.page-num-top\s*{[\s\S]*?}/, '');

// 2. Remove all <span class="page-num-top">\d+</span> from HTML
code = code.replace(/\s*<span class="page-num-top">\d+<\/span>/g, '');

// 3. Update .page-footer to center align
const centeredFooterCss = `
    .page-footer {
      position: absolute;
      bottom: 8px;
      left: 4px;
      right: 4px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      font-family: var(--font-heading);
    }

    .page-num {
      display: inline-block;
      font-size: 10.5pt;
      font-weight: 700;
      color: var(--primary);
      letter-spacing: 0.5px;
    }
`;

code = code.replace(/\.page-footer\s*{[\s\S]*?\.page-num\s*{[\s\S]*?}/, centeredFooterCss.trim());

// 4. Update the footer inner content to just the centered page number
code = code.replace(/<div class="page-footer">[\s\S]*?<span class="page-num">(\d+)<\/span>[\s\S]*?<\/div>/g, 
  '<div class="page-footer"><span class="page-num">$1</span></div>');

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Updated build_final_pdf.js: page numbers are now strictly centered!');

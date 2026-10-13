const fs = require('fs');
const html = fs.readFileSync('FINAL_YEAR_PROJECT_REPORT_50P.html', 'utf8');
const divs = html.split('<div class="page"');
console.log('Total page sections:', divs.length - 1);
divs.slice(1).forEach((d, idx) => {
  const titleMatch = d.match(/<h[12][^>]*>(.*?)<\/h[12]>/);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'No Heading';
  const hasImg = d.includes('<img');
  const hasTable = d.includes('<table');
  const length = d.length;
  console.log(`Page Div ${idx + 1}: len=${length}, img=${hasImg}, tbl=${hasTable} | ${title}`);
});

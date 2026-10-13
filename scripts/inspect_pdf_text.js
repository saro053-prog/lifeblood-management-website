const fs = require('fs');
const pdf = fs.readFileSync('C:/Users/saroo/OneDrive/Desktop/LifeBlood_Final_Year_Project_Report.pdf', 'latin1');
const re = /Page\s*(\d+)/g;
let m;
const found = [];
while ((m = re.exec(pdf)) !== null) {
  found.push(m[0]);
}
console.log('Total Page X matches in PDF:', found.length);
console.log('Sample matches:', found.slice(0, 5), '...', found.slice(-5));

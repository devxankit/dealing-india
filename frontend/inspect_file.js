const fs = require('fs');
const filePath = 'c:\\Users\\HP\\Desktop\\appzeto_first\\dealing-india\\frontend\\src\\modules\\B2BUserApp\\pages\\B2BVendorStore.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);
const line568 = lines[567];
console.log('Line 568:', JSON.stringify(line568));
console.log('Line 568 CharCodes:', line568.split('').map(c => c.charCodeAt(0)));

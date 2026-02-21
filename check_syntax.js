import { readFileSync } from 'fs';
import { parse } from '@babel/parser';

try {
    const code = readFileSync('c:/Users/k/Desktop/dealing india/frontend/src/modules/B2BVendor/pages/B2BBannerBooking.jsx', 'utf8');
    parse(code, {
        sourceType: 'module',
        plugins: ['jsx']
    });
    console.log('Syntax OK');
} catch (e) {
    console.error('Syntax Error:', e.message);
    process.exit(1);
}

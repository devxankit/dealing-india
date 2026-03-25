
import zohoBooksService from './services/zohoBooks.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function testZoho() {
  try {
    console.log('Testing Zoho access token refresh...');
    const token = await zohoBooksService.getAccessToken();
    console.log('Access token obtained successfully!');
    
    console.log('Testing Zoho Contacts list...');
    const contacts = await zohoBooksService.ensureZohoContactForVendor({
        email: 'test-ping@dealingindia.com',
        name: 'Test Ping',
        businessName: 'Test Ping Corp'
    });
    console.log('Zoho API check successful! Contact ID:', contacts);
  } catch (err) {
    console.error('Zoho check failed:', err.message);
    if (err.response?.data) {
        console.error('API Error details:', err.response.data);
    }
  }
}

testZoho();

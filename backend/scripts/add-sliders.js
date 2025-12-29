import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = 'vishalpatel581012@gmail.com';
const ADMIN_PASSWORD = 'Vishu@123';

// Slider data with images from hero folder
const slidersData = [
  {
    title: 'Home',
    imagePath: path.join(__dirname, '../../frontend/data/hero/slide1.png'),
    link: '/app/search',
    order: 1,
    status: 'active',
  },
  {
    title: 'Home',
    imagePath: path.join(__dirname, '../../frontend/data/hero/slide2.png'),
    link: '/app/daily-deals',
    order: 2,
    status: 'active',
  },
  {
    title: 'Home',
    imagePath: path.join(__dirname, '../../frontend/data/hero/slide3.png'),
    link: '/app/flash-sale',
    order: 3,
    status: 'active',
  },
  {
    title: 'Home',
    imagePath: path.join(__dirname, '../../frontend/data/hero/slide4.png'),
    link: '/app/offers',
    order: 4,
    status: 'active',
  },
];

// Function to login admin
async function loginAdmin() {
  try {
    console.log('🔐 Logging in admin...');
    const response = await axios.post(`${API_BASE_URL}/auth/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (response.data.success && response.data.data.token) {
      console.log('✅ Admin login successful!');
      return response.data.data.token;
    } else {
      throw new Error('Login failed: ' + (response.data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

// Function to add slider
async function addSlider(token, sliderData) {
  try {
    // Check if image file exists
    if (!fs.existsSync(sliderData.imagePath)) {
      throw new Error(`Image file not found: ${sliderData.imagePath}`);
    }

    // Create FormData
    const formData = new FormData();
    formData.append('title', sliderData.title);
    formData.append('link', sliderData.link);
    formData.append('order', sliderData.order.toString());
    formData.append('status', sliderData.status);
    
    // Read and append image file
    const imageStream = fs.createReadStream(sliderData.imagePath);
    const filename = path.basename(sliderData.imagePath);
    formData.append('image', imageStream, {
      filename: filename,
      contentType: 'image/png',
    });

    // Make API request
    const response = await axios.post(
      `${API_BASE_URL}/admin/sliders`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.data.success) {
      console.log(`✅ Slider "${sliderData.title}" (Order: ${sliderData.order}) added successfully!`);
      return response.data.data.slider;
    } else {
      throw new Error('Failed to add slider: ' + (response.data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error(`❌ Failed to add slider "${sliderData.title}":`, error.response?.data?.message || error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting slider addition process...\n');

    // Login admin
    const token = await loginAdmin();
    console.log('');

    // Add each slider
    for (let i = 0; i < slidersData.length; i++) {
      const slider = slidersData[i];
      console.log(`📸 Adding slider ${i + 1}/${slidersData.length}...`);
      await addSlider(token, slider);
      console.log('');
      
      // Small delay between requests
      if (i < slidersData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('🎉 All sliders added successfully!');
    console.log(`\n✅ Total ${slidersData.length} sliders added to the database.`);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();


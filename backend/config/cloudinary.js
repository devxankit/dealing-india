import pkg from 'cloudinary';
const { v2: cloudinary } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  const missingKeys = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME) missingKeys.push('CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) missingKeys.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) missingKeys.push('CLOUDINARY_API_SECRET');
  
  const errorMessage = `❌ Cloudinary configuration failed. Missing environment variables: ${missingKeys.join(', ')}. Server cannot start without valid Cloudinary config.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
} else {
  console.log('✅ Cloudinary configured successfully');
}

export default cloudinary;


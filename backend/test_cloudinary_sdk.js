import cloudinary from './config/cloudinary.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

function testUrlGeneration() {
    const videoPublicId = 'reels/vzwamlcynlnqkugxehmp';
    const musicPublicId = 'music_library/hevprdp2agbahtnrqlzj';
    const version = '1773727222';

    // Cloudinary SDK way
    const url = cloudinary.url(videoPublicId, {
        resource_type: 'video',
        version: version,
        transformation: [
            { effect: 'mute' },
            { overlay: { resource_type: 'video', public_id: musicPublicId } },
            { flags: 'layer_apply' }
        ]
    });

    console.log('Generated URL:', url);
}

testUrlGeneration();

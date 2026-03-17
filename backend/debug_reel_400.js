import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import Reel from './models/Reel.model.js';
import Music from './models/Music.model.js';

async function checkReel() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const reelId = '69b8ee0ddf974ecf936e30f1';
        const reel = await Reel.findById(reelId);
        if (!reel) {
            console.log('Reel not found');
            return;
        }

        console.log('Reel Video URL:', reel.videoUrl);
        console.log('Reel Audio Status:', reel.audioStatus);
        console.log('Music ID:', reel.musicId);

        if (reel.musicId) {
            const music = await Music.findById(reel.musicId);
            console.log('Music Public ID:', music?.publicId);
            console.log('Music File URL:', music?.fileUrl);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkReel();

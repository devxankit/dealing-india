import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const run = async () => {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        const bTypes = await mongoose.connection.collection("businesstypes").find().toArray();
        console.log("Business Types:", JSON.stringify(bTypes.map(t => ({ name: t.name, slug: t.slug })), null, 2));
        
        const addons = await mongoose.connection.collection("b2baddonplans").find().toArray();
        console.log("Addon Plans:", JSON.stringify(addons.map(a => ({ name: a.name, roles: a.applicableRoles })), null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
run();

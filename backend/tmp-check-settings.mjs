import dns from 'dns';  
dns.setServers(['8.8.8.8','8.8.4.4']);  
import mongoose from 'mongoose';  
import dotenv from 'dotenv';  
dotenv.config({ path: '.env' });  
await mongoose.connect(process.env.MONGODB_URI);  
const docs = await mongoose.connection.db.collection('businesstypesettings').find({}, { projection: { businessTypeId: 1, propertyForms: 1, enabledModules: 1 } }).limit(50).toArray();  
console.log(JSON.stringify(docs, null, 2));  
await mongoose.disconnect();  

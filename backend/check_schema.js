import mongoose from 'mongoose';
import Property from './models/Property.model.js';
console.log('PlotArea type:', Property.schema.path('plotDetails.plotArea').instance);
console.log('BuiltUpArea type:', Property.schema.path('plotDetails.builtUpArea').instance);
process.exit(0);

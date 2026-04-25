const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // ─── Index Migration ──────────────────────────────────────────────────
        // The old pushsubscriptions collection has a non-sparse unique index on
        // subscription.endpoint which blocks inserting FCM-only documents
        // (multiple nulls violate the constraint). Drop it and let Mongoose
        // recreate it correctly as a sparse index.
        try {
            const col = mongoose.connection.collection('pushsubscriptions');
            const indexes = await col.indexes();
            const oldIdx = indexes.find(
                (i) => i.key && i.key['subscription.endpoint'] && !i.sparse
            );
            if (oldIdx) {
                await col.dropIndex(oldIdx.name);
                console.log('[DB] Dropped old non-sparse subscription.endpoint index ✅');
            }
            // Sync fresh indexes from current Mongoose schema definitions
            const PushSubscription = require('../models/pushSubscription.model');
            await PushSubscription.syncIndexes();
            console.log('[DB] PushSubscription indexes synced ✅');
        } catch (idxErr) {
            // Index migration failure is non-fatal — log and continue
            console.warn('[DB] Index migration warning:', idxErr.message);
        }

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
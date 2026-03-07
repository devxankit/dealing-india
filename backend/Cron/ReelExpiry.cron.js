import cron from 'node-cron';
import Reel from '../models/Reel.model.js';
import ReelLike from '../models/ReelLike.model.js';
import ReelComment from '../models/ReelComment.model.js';

const REEL_ACTIVE_HOURS = 24;

/**
 * Expire reels that have been approved for more than 24 hours.
 * Clears likes and comments for those reels to keep DB lightweight.
 * Runs every 15 minutes.
 */
async function expireReels() {
  const cutoff = new Date(Date.now() - REEL_ACTIVE_HOURS * 60 * 60 * 1000);
  const reelsToExpire = await Reel.find({
    status: 'approved',
    approvedAt: { $lt: cutoff },
  })
    .select('_id')
    .lean();

  if (reelsToExpire.length === 0) return;

  const ids = reelsToExpire.map((r) => r._id);
  await Promise.all([
    Reel.updateMany({ _id: { $in: ids } }, { $set: { status: 'expired' } }),
    ReelLike.deleteMany({ reelId: { $in: ids } }),
    ReelComment.deleteMany({ reelId: { $in: ids } }),
  ]);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ReelExpiry] Expired ${ids.length} reel(s)`);
  }
}

let task = null;

export function startReelExpiryCron() {
  if (task) return;
  task = cron.schedule('*/15 * * * *', expireReels, { scheduled: true });
}

export function stopReelExpiryCron() {
  if (task) {
    task.stop();
    task = null;
  }
}

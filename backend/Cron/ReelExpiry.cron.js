import cron from 'node-cron';
import Reel from '../models/Reel.model.js';
import ReelLike from '../models/ReelLike.model.js';
import ReelComment from '../models/ReelComment.model.js';

/**
 * Reel expiry cron is now disabled.
 * We no longer expire reels after 24 hours; all approved reels remain visible.
 * This function is kept as a no-op for backwards compatibility.
 */
async function expireReels() {
  // no-op
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

/**
 * Time Warp Utility for Development/Testing
 * 
 * Allows shifting the "current" time of the application to test
 * time-dependent features like return windows.
 */

// Store offset in milliseconds
let timeOffset = 0;

/**
 * Get the current time with the applied offset
 * @returns {Date}
 */
export const getWarpedDate = () => {
    return new Date(Date.now() + timeOffset);
};

/**
 * Set the time warp offset in days
 * @param {number} days 
 */
export const setTimeWarpOffset = (days) => {
    timeOffset = days * 24 * 60 * 60 * 1000;
    console.log(`[TimeWarp] Offset set to ${days} days (${timeOffset} ms)`);
};

/**
 * Reset the time warp offset to 0
 */
export const resetTimeWarp = () => {
    timeOffset = 0;
    console.log(`[TimeWarp] Offset reset to 0`);
};

/**
 * Get current raw offset
 * @returns {number}
 */
export const getTimeWarpOffset = () => timeOffset;

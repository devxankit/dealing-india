// Helper functions for managing vendor reels

// Get all reels for a vendor
export const getVendorReels = (vendorId) => {
  const savedReels = localStorage.getItem('vendor-reels');
  const allReels = savedReels ? JSON.parse(savedReels) : [];
  return allReels.filter((reel) => reel.vendorId === parseInt(vendorId));
};

// Get a single reel by ID
export const getReelById = (reelId) => {
  const savedReels = localStorage.getItem('vendor-reels');
  const allReels = savedReels ? JSON.parse(savedReels) : [];
  return allReels.find((reel) => reel.id === parseInt(reelId));
};

// Add a new reel
export const addVendorReel = (reelData) => {
  const savedReels = localStorage.getItem('vendor-reels');
  const allReels = savedReels ? JSON.parse(savedReels) : [];
  
  const newReel = {
    id: Date.now(), // Simple ID generation
    ...reelData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: reelData.status || 'draft',
    likes: reelData.likes || 0,
    comments: reelData.comments || 0,
    shares: reelData.shares || 0,
    views: reelData.views || 0,
  };
  
  allReels.push(newReel);
  localStorage.setItem('vendor-reels', JSON.stringify(allReels));
  return newReel;
};

// Update an existing reel
export const updateVendorReel = (reelId, updatedData) => {
  const savedReels = localStorage.getItem('vendor-reels');
  const allReels = savedReels ? JSON.parse(savedReels) : [];
  
  const index = allReels.findIndex((reel) => reel.id === parseInt(reelId));
  if (index === -1) {
    throw new Error('Reel not found');
  }
  
  allReels[index] = {
    ...allReels[index],
    ...updatedData,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem('vendor-reels', JSON.stringify(allReels));
  return allReels[index];
};

// Delete a reel
export const deleteVendorReel = (reelId) => {
  const savedReels = localStorage.getItem('vendor-reels');
  const allReels = savedReels ? JSON.parse(savedReels) : [];
  
  const filteredReels = allReels.filter((reel) => reel.id !== parseInt(reelId));
  localStorage.setItem('vendor-reels', JSON.stringify(filteredReels));
  return true;
};

// Get all active reels (for user app)
export const getActiveReels = () => {
  const savedReels = localStorage.getItem('vendor-reels');
  const allReels = savedReels ? JSON.parse(savedReels) : [];
  return allReels.filter((reel) => reel.status === 'active');
};


// Helper functions for managing vendor reels

// Mock Data for Initial State
export const MOCK_VENDOR_REELS = [
  {
    id: 101,
    vendorId: 1, // Assumption: Mock vendor ID is 1
    vendorName: "Fashion Hub",
    productName: "Summer Floral Dress",
    productPrice: 1499,
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
    description: "Perfect for summer outings! Lightweight and breathable fabric.",
    likes: 124,
    comments: 18,
    shares: 45,
    views: 1205,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 102,
    vendorId: 1,
    vendorName: "Fashion Hub",
    productName: "Classic Denim Jacket",
    productPrice: 2999,
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
    description: "Stylish denim jacket for all seasons. Premium quality.",
    likes: 89,
    comments: 12,
    shares: 23,
    views: 850,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 103,
    vendorId: 1,
    vendorName: "Fashion Hub",
    productName: "Urban Streetwear Hoodie",
    productPrice: 1899,
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400",
    description: "Stay cool with our latest urban collection.",
    likes: 256,
    comments: 45,
    shares: 89,
    views: 3400,
    status: 'active',
    createdAt: new Date(Date.now() - 172800000).toISOString()
  }
];

// Get all reels for a vendor
export const getVendorReels = (vendorId) => {
  const savedReels = localStorage.getItem('vendor-reels');
  let allReels = savedReels ? JSON.parse(savedReels) : [];

  // If no reels in storage, fallback to mock data (without persisting to avoid zombie data issues)
  // Logic: If I haven't edited/deleted anything, I see mock data.
  // Once I create a reel, 'vendor-reels' exists.
  // Problem: If I create one reel, the mock ones disappear if I don't merge them.
  // Solution: Initialize storage with MOCK data if null.

  if (!savedReels) {
    allReels = MOCK_VENDOR_REELS;
    localStorage.setItem('vendor-reels', JSON.stringify(allReels));
  }

  return allReels.filter((reel) => reel.vendorId === parseInt(vendorId));
};

// Get a single reel by ID
export const getReelById = (reelId) => {
  const savedReels = localStorage.getItem('vendor-reels');
  const allReels = savedReels ? JSON.parse(savedReels) : MOCK_VENDOR_REELS;
  return allReels.find((reel) => reel.id === parseInt(reelId));
};

// Add a new reel
export const addVendorReel = (reelData) => {
  const savedReels = localStorage.getItem('vendor-reels');
  const allReels = savedReels ? JSON.parse(savedReels) : [...MOCK_VENDOR_REELS];

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
  const allReels = savedReels ? JSON.parse(savedReels) : [...MOCK_VENDOR_REELS];

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
  const allReels = savedReels ? JSON.parse(savedReels) : [...MOCK_VENDOR_REELS];

  const filteredReels = allReels.filter((reel) => reel.id !== parseInt(reelId));
  localStorage.setItem('vendor-reels', JSON.stringify(filteredReels));
  return true;
};

// Get all active reels (for user app)
export const getActiveReels = () => {
  const savedReels = localStorage.getItem('vendor-reels');
  const allReels = savedReels ? JSON.parse(savedReels) : MOCK_VENDOR_REELS;
  return allReels.filter((reel) => reel.status === 'active');
};

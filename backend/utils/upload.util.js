import multer from 'multer';
import path from 'path';

// Use memory storage for direct Cloudinary upload
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Multer configuration
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

// Helper to get file URL (kept for backward compatibility)
// Note: This is deprecated - files are now stored in Cloudinary
export const getFileUrl = (filename) => {
  if (!filename) return null;
  // If it's already a full URL, return as is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  // Return relative path for local storage (legacy support)
  return `/upload/${filename}`;
};

// Helper to delete file (kept for backward compatibility)
// Note: This is deprecated - files are now stored in Cloudinary
export const deleteFile = (filename) => {
  // No-op: Files are now stored in Cloudinary, not locally
  // This function is kept for backward compatibility only
  console.warn('deleteFile() called but files are now stored in Cloudinary');
};


import multer from 'multer';
import path from 'path';

// Use memory storage for direct Cloudinary upload
const storage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
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

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|mov|avi|wmv|flv|webm|mkv/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/');

  if (mimetype || extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files are allowed (mp4, mov, avi, wmv, flv, webm, mkv)'));
  }
};

// File filter for both images and videos
const mediaFileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  const videoTypes = /mp4|mov|avi|wmv|flv|webm|mkv/;
  const extname = imageTypes.test(path.extname(file.originalname).toLowerCase()) || 
                  videoTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = imageTypes.test(file.mimetype) || 
                   videoTypes.test(file.mimetype) || 
                   file.mimetype.startsWith('image/') || 
                   file.mimetype.startsWith('video/');

  if (mimetype || extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image or video files are allowed'));
  }
};

// Multer configuration for images only
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: imageFileFilter,
});

// Multer configuration for videos (larger file size)
export const uploadVideo = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
  fileFilter: videoFileFilter,
});

// Multer configuration for reels (video + thumbnail)
export const uploadReel = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: mediaFileFilter,
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


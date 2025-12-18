// Client-side image compression utility
// This creates compressed versions of images for listings

const compressImage = (imageSrc, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate new dimensions
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to WebP
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedUrl = URL.createObjectURL(blob);
            resolve(compressedUrl);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageSrc;
  });
};

// Preload and compress images for listings
const preloadCompressedImages = async (imageSources) => {
  const compressedImages = {};

  for (const src of imageSources) {
    try {
      const compressedSrc = await compressImage(src);
      compressedImages[src] = compressedSrc;
    } catch (error) {
      console.warn(`Failed to compress ${src}:`, error);
      compressedImages[src] = src; // Fallback to original
    }
  }

  return compressedImages;
};

export { compressImage, preloadCompressedImages };



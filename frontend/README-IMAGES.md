# Image Optimization Guide

## Overview
This project uses optimized images for different contexts:
- **Hero images**: High-priority, load immediately
- **Product listings**: Compressed, lazy-loaded
- **Product details**: Original quality, high-priority

## How to Compress Images

### Option 1: Using ImageMagick (Recommended)

1. Install ImageMagick:
   ```bash
   # macOS
   brew install imagemagick

   # Ubuntu/Debian
   sudo apt-get install imagemagick

   # Windows
   # Download from: https://imagemagick.org/script/download.php#windows
   ```

2. Run the compression script:
   ```bash
   cd frontend
   node scripts/compress-images.js
   ```

### Option 2: Manual Compression

Use online tools like:
- [TinyPNG](https://tinypng.com/)
- [ImageOptim](https://imageoptim.com/)
- [Squoosh](https://squoosh.app/)

#### Naming Convention:
- Original: `product.png`
- Listing version: `product_listing.webp` (800px max, 75% quality)
- Hero version: `hero_compressed.webp` (1200px max, 80% quality)

### Option 3: Web-based Compression

Create a simple HTML file to compress images:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Image Compressor</title>
</head>
<body>
    <input type="file" id="fileInput" multiple accept="image/*">
    <button onclick="compressImages()">Compress Images</button>
    <div id="output"></div>

    <script>
        async function compressImage(file, maxWidth = 800, quality = 0.8) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    let { width, height } = img;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxWidth) {
                            width = (width * maxWidth) / height;
                            height = maxWidth;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/webp', quality);
                };

                img.src = URL.createObjectURL(file);
            });
        }

        async function compressImages() {
            const files = document.getElementById('fileInput').files;
            const output = document.getElementById('output');

            for (const file of files) {
                try {
                    const compressed = await compressImage(file);

                    // Download compressed image
                    const url = URL.createObjectURL(compressed);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name.replace(/\.(png|jpg|jpeg)$/i, '_listing.webp');
                    a.textContent = `Download ${a.download}`;
                    output.appendChild(a);
                    output.appendChild(document.createElement('br'));
                } catch (error) {
                    console.error('Compression failed:', error);
                }
            }
        }
    </script>
</body>
</html>
```

## Current Image Usage

### Product Listings
- Uses `context="product-listing"`
- Lazy loads with low priority
- Compressed to 800px max, 75% quality

### Hero Banners
- Uses `context="hero"`
- Loads eagerly with high priority
- Can be compressed to 1200px max

### Product Details
- Uses `context="product-detail"`
- Loads eagerly with high priority
- Uses original quality

## Performance Tips

1. **Preload critical images** in the HTML head
2. **Use WebP format** for modern browsers
3. **Implement responsive images** with srcset
4. **Consider CDN** for image delivery
5. **Add blur placeholders** for better UX



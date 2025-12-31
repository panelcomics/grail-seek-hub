/**
 * Client-side image compression utilities
 * Compresses images before uploading to reduce API costs and improve performance
 */

const MAX_DIMENSION = 800; // Reduced for faster loading - most displays show at 400px or less
const JPEG_QUALITY = 0.7; // Improved compression while maintaining quality
const MAX_SIZE_BYTES = 500 * 1024; // 500KB max for better performance

export interface CompressionResult {
  base64: string; // Raw base64 without data URL prefix
  sizeKB: number;
  width: number;
  height: number;
}

export interface CompressionError {
  error: string;
  originalSizeKB?: number;
}

/**
 * Compress an image file for scanning
 * @param file - The image file to compress
 * @returns Promise with compression result or error
 */
export async function compressImageForScanning(
  file: File
): Promise<CompressionResult | CompressionError> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      try {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({ error: 'Failed to create canvas context' });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with quality setting
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ error: 'Failed to compress image' });
              return;
            }

            const sizeKB = Math.round(blob.size / 1024);

            // Check size limit
            if (blob.size > MAX_SIZE_BYTES) {
              resolve({
                error: `Image is too large after compression (${sizeKB}KB). Please use a smaller image or better lighting to reduce file size.`,
                originalSizeKB: Math.round(file.size / 1024),
              });
              return;
            }

            // Convert to base64 without data URL prefix
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              // Strip "data:image/jpeg;base64," prefix
              const base64 = dataUrl.split(',')[1];
              
              resolve({
                base64,
                sizeKB,
                width,
                height,
              });
            };
            reader.readAsDataURL(blob);
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      } catch (err) {
        resolve({
          error: err instanceof Error ? err.message : 'Unknown compression error',
        });
      }
    };

    img.onerror = () => {
      resolve({ error: 'Failed to load image' });
    };

    reader.onerror = () => {
      resolve({ error: 'Failed to read file' });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get user-friendly tips for better scanning
 */
export function getScanningTips(): string[] {
  return [
    'Shoot straight on in good lighting',
    'Avoid shadows and glare',
    'Capture the entire cover clearly',
    'Use a steady hand or surface',
  ];
}

/**
 * Compress an image data URL for listing storage
 * @param imageData Base64 data URL of the image
 * @param maxWidth Maximum width (default: 2000px)
 * @param quality Quality for compression (default: 0.85)
 * @returns Promise<string> Compressed image as base64 data URL
 */
export async function compressImageDataUrl(
  imageData: string,
  maxWidth = 2000,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use better image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with quality setting
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.src = imageData;
  });
}

/**
 * Create a thumbnail version of an image
 * @param imageData Base64 data URL of the image
 * @param maxSize Maximum width/height (default: 400px)
 * @returns Promise<string> Thumbnail as base64 data URL
 */
export async function createThumbnail(
  imageData: string,
  maxSize = 400
): Promise<string> {
  return compressImageDataUrl(imageData, maxSize, 0.75);
}

/**
 * Get the size of a base64 image in KB
 * @param base64String Base64 data URL
 * @returns Size in kilobytes
 */
export function getBase64Size(base64String: string): number {
  const base64Length = base64String.length - (base64String.indexOf(',') + 1);
  const sizeInBytes = (base64Length * 3) / 4;
  return sizeInBytes / 1024; // Convert to KB
}

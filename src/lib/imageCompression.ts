/**
 * Client-side image compression utilities
 * Compresses images before uploading to reduce API costs and improve performance
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

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

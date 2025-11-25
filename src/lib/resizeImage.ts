/**
 * Client-side image compression and thumbnail generation
 * Reduces upload size and provides fast-loading previews
 */

export interface CompressionOptions {
  maxDim?: number;
  quality?: number;
  thumbDim?: number;
}

export interface CompressionResult {
  compressed: Blob;
  preview: Blob;
  stats: {
    originalKB: number;
    compressedKB: number;
    previewKB: number;
    elapsedMs: number;
  };
}

const DEFAULT_MAX_DIM = 1200;
const DEFAULT_QUALITY = 0.85;
const DEFAULT_THUMB_DIM = 400;
const MAX_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5MB
const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024; // 4MB

/**
 * Compress an image for upload and generate a thumbnail
 */
export async function compressForUpload(
  file: File,
  opts?: CompressionOptions
): Promise<CompressionResult> {
  const startTime = performance.now();
  const originalKB = Math.round(file.size / 1024);
  
  const maxDim = opts?.maxDim ?? DEFAULT_MAX_DIM;
  const quality = opts?.quality ?? DEFAULT_QUALITY;
  const thumbDim = opts?.thumbDim ?? DEFAULT_THUMB_DIM;

  // Check if compression is needed
  const needsCompression = file.size > MAX_SIZE_BYTES;
  
  try {
    // Try modern createImageBitmap API first
    const imageBitmap = await createImageBitmap(file, { 
      imageOrientation: 'from-image' 
    });
    
    const { compressed, preview } = await processWithImageBitmap(
      imageBitmap,
      file,
      maxDim,
      quality,
      thumbDim,
      needsCompression
    );
    
    imageBitmap.close();
    
    const elapsedMs = Math.round(performance.now() - startTime);
    
    return {
      compressed,
      preview,
      stats: {
        originalKB,
        compressedKB: Math.round(compressed.size / 1024),
        previewKB: Math.round(preview.size / 1024),
        elapsedMs,
      },
    };
  } catch (err) {
    console.warn('createImageBitmap not available, falling back to Image+Canvas', err);
    
    // Fallback for iOS Safari and older browsers
    const { compressed, preview } = await processWithImageElement(
      file,
      maxDim,
      quality,
      thumbDim,
      needsCompression
    );
    
    const elapsedMs = Math.round(performance.now() - startTime);
    
    return {
      compressed,
      preview,
      stats: {
        originalKB,
        compressedKB: Math.round(compressed.size / 1024),
        previewKB: Math.round(preview.size / 1024),
        elapsedMs,
      },
    };
  }
}

async function processWithImageBitmap(
  imageBitmap: ImageBitmap,
  originalFile: File,
  maxDim: number,
  quality: number,
  thumbDim: number,
  needsCompression: boolean
): Promise<{ compressed: Blob; preview: Blob }> {
  const width = imageBitmap.width;
  const height = imageBitmap.height;
  
  // Calculate dimensions for compressed image
  let compressedWidth = width;
  let compressedHeight = height;
  
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      compressedWidth = maxDim;
      compressedHeight = Math.round((height * maxDim) / width);
    } else {
      compressedHeight = maxDim;
      compressedWidth = Math.round((width * maxDim) / height);
    }
  }
  
  // Create compressed image
  let compressed: Blob;
  if (!needsCompression && compressedWidth === width && compressedHeight === height) {
    // File is small enough and doesn't need resizing
    compressed = originalFile;
  } else {
    compressed = await resizeImageBitmap(imageBitmap, compressedWidth, compressedHeight, quality);
    
    // If still too large, re-encode at lower quality
    if (compressed.size > MAX_PAYLOAD_BYTES) {
      compressed = await resizeImageBitmap(imageBitmap, compressedWidth, compressedHeight, 0.72);
    }
  }
  
  // Calculate thumbnail dimensions
  const { width: thumbWidth, height: thumbHeight } = calculateThumbDimensions(
    width,
    height,
    thumbDim
  );
  
  // Create thumbnail
  const preview = await resizeImageBitmap(imageBitmap, thumbWidth, thumbHeight, 0.75);
  
  return { compressed, preview };
}

async function processWithImageElement(
  file: File,
  maxDim: number,
  quality: number,
  thumbDim: number,
  needsCompression: boolean
): Promise<{ compressed: Blob; preview: Blob }> {
  const img = await loadImage(file);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  
  // Calculate dimensions for compressed image
  let compressedWidth = width;
  let compressedHeight = height;
  
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      compressedWidth = maxDim;
      compressedHeight = Math.round((height * maxDim) / width);
    } else {
      compressedHeight = maxDim;
      compressedWidth = Math.round((width * maxDim) / height);
    }
  }
  
  // Create compressed image
  let compressed: Blob;
  if (!needsCompression && compressedWidth === width && compressedHeight === height) {
    compressed = file;
  } else {
    compressed = await resizeWithCanvas(img, compressedWidth, compressedHeight, quality);
    
    // If still too large, re-encode at lower quality
    if (compressed.size > MAX_PAYLOAD_BYTES) {
      compressed = await resizeWithCanvas(img, compressedWidth, compressedHeight, 0.72);
    }
  }
  
  // Calculate thumbnail dimensions
  const { width: thumbWidth, height: thumbHeight } = calculateThumbDimensions(
    width,
    height,
    thumbDim
  );
  
  // Create thumbnail
  const preview = await resizeWithCanvas(img, thumbWidth, thumbHeight, 0.75);
  
  return { compressed, preview };
}

function calculateThumbDimensions(
  width: number,
  height: number,
  maxThumbDim: number
): { width: number; height: number } {
  if (width <= maxThumbDim && height <= maxThumbDim) {
    return { width, height };
  }
  
  if (width > height) {
    return {
      width: maxThumbDim,
      height: Math.round((height * maxThumbDim) / width),
    };
  } else {
    return {
      width: Math.round((width * maxThumbDim) / height),
      height: maxThumbDim,
    };
  }
}

async function resizeImageBitmap(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.drawImage(bitmap, 0, 0, width, height);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

async function resizeWithCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.drawImage(img, 0, 0, width, height);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

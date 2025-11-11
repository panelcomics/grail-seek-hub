// Image preprocessing utilities for comic scanner (optimized for slabbed comics)

/**
 * Detects slab edges and crops to comic cover area
 * Uses canvas edge detection to identify the inner comic cover within CGC/CBCS slab
 */
export async function cropSlabEdges(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Detect edges by finding high-contrast boundaries (simplified edge detection)
      let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
      const threshold = 40; // Edge contrast threshold
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // Check if pixel is part of an edge (high contrast with neighbors)
          if (x > 0 && y > 0) {
            const prevIdx = ((y - 1) * canvas.width + (x - 1)) * 4;
            const diffR = Math.abs(r - data[prevIdx]);
            const diffG = Math.abs(g - data[prevIdx + 1]);
            const diffB = Math.abs(b - data[prevIdx + 2]);
            
            if (diffR + diffG + diffB > threshold) {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
        }
      }
      
      // Add 5% padding to avoid cutting into cover
      const padding = 0.05;
      const cropWidth = maxX - minX;
      const cropHeight = maxY - minY;
      minX = Math.max(0, minX - cropWidth * padding);
      maxX = Math.min(canvas.width, maxX + cropWidth * padding);
      minY = Math.max(0, minY - cropHeight * padding);
      maxY = Math.min(canvas.height, maxY + cropHeight * padding);
      
      // If no clear edges detected (plain image), return original
      if (cropWidth < canvas.width * 0.3 || cropHeight < canvas.height * 0.3) {
        resolve(imageDataUrl);
        return;
      }
      
      // Crop to detected cover area
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = maxX - minX;
      croppedCanvas.height = maxY - minY;
      const croppedCtx = croppedCanvas.getContext('2d')!;
      croppedCtx.drawImage(
        canvas,
        minX, minY, croppedCanvas.width, croppedCanvas.height,
        0, 0, croppedCanvas.width, croppedCanvas.height
      );
      
      resolve(croppedCanvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageDataUrl;
  });
}

/**
 * Increases contrast and sharpness for better OCR on slab labels
 */
export function enhanceForOCR(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Increase contrast (factor: 1.3)
      const contrastFactor = 1.3;
      const contrastIntercept = 128 * (1 - contrastFactor);
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] * contrastFactor + contrastIntercept)); // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * contrastFactor + contrastIntercept)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * contrastFactor + contrastIntercept)); // B
      }
      
      // Apply sharpening kernel (basic 3x3 sharpen)
      const sharpenKernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];
      
      const tempData = new Uint8ClampedArray(data);
      const width = canvas.width;
      const height = canvas.height;
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          for (let c = 0; c < 3; c++) { // RGB channels only
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                const kernelIdx = (ky + 1) * 3 + (kx + 1);
                sum += tempData[idx] * sharpenKernel[kernelIdx];
              }
            }
            const idx = (y * width + x) * 4 + c;
            data[idx] = Math.max(0, Math.min(255, sum));
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageDataUrl;
  });
}

/**
 * Full preprocessing pipeline for slabbed comics
 */
export async function preprocessSlabImage(imageDataUrl: string): Promise<string> {
  const cropped = await cropSlabEdges(imageDataUrl);
  const enhanced = await enhanceForOCR(cropped);
  return enhanced;
}

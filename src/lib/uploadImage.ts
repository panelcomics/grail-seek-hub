import { supabase } from "@/integrations/supabase/client";
import { compressForUpload } from "./resizeImage";

interface UploadResult {
  path: string;
  publicUrl: string;
  previewUrl?: string;
  stats?: {
    originalKB: number;
    compressedKB: number;
    previewKB: number;
    elapsedMs: number;
  };
}

async function uploadAttempt(file: File): Promise<UploadResult> {
  const compressionStart = performance.now();
  
  // Compress image and generate thumbnail
  const { compressed, preview, stats } = await compressForUpload(file);
  
  const compressionElapsed = Math.round(performance.now() - compressionStart);
  
  console.log('[uploadImage] Compression complete:', {
    ...stats,
    compressionMs: compressionElapsed
  });

  // Create FormData with compressed image and preview
  const form = new FormData();
  form.append("image", compressed, `${file.name.replace(/\.[^.]+$/, '')}-compressed.jpg`);
  form.append("preview", preview, `${file.name.replace(/\.[^.]+$/, '')}-thumb.jpg`);

  console.log('CALLING_EDGE /functions/v1/upload-scanner-image', {
    name: file.name,
    originalSize: file.size,
    compressedSize: compressed.size,
    previewSize: preview.size,
    ...stats
  });

  const uploadStart = performance.now();
  const { data, error } = await supabase.functions.invoke("upload-scanner-image", { body: form });
  const uploadElapsed = Math.round(performance.now() - uploadStart);
  
  console.log('EDGE_RESPONSE', error ? 'ERROR' : 'SUCCESS', { 
    data, 
    error,
    uploadMs: uploadElapsed,
    totalMs: stats.elapsedMs + uploadElapsed
  });
  
  if (error) throw new Error(error.message || "Upload proxy failed");

  const path = data?.path?.toString() ?? "";
  const publicUrl = (data?.publicUrl ?? data?.url ?? "").toString();
  const previewUrl = data?.previewUrl?.toString();
  
  if (!publicUrl) throw new Error("Upload proxy returned no publicUrl");
  
  return { 
    path, 
    publicUrl, 
    previewUrl,
    stats: {
      ...stats,
      elapsedMs: stats.elapsedMs + uploadElapsed
    }
  };
}

export async function uploadViaProxy(file: File): Promise<UploadResult> {
  const delays = [500, 1500, 3000];
  let lastError: Error | null = null;

  for (let i = 0; i < delays.length; i++) {
    try {
      return await uploadAttempt(file);
    } catch (err: any) {
      lastError = err;
      console.warn(`[uploadViaProxy] Attempt ${i + 1} failed:`, err.message);
      if (i < delays.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }
  }

  throw lastError || new Error("Upload failed after retries");
}

import { supabase } from "@/integrations/supabase/client";

async function uploadAttempt(file: File): Promise<{ path: string; publicUrl: string }> {
  const form = new FormData();
  form.append("image", file);

  console.log('CALLING_EDGE /functions/v1/upload-scanner-image', {
    name: file.name,
    size: file.size,
    type: file.type
  });

  const { data, error } = await supabase.functions.invoke("upload-scanner-image", { body: form });
  
  console.log('EDGE_RESPONSE', error ? 'ERROR' : 'SUCCESS', { data, error });
  
  if (error) throw new Error(error.message || "Upload proxy failed");

  const path = data?.path?.toString() ?? "";
  const publicUrl = (data?.publicUrl ?? data?.url ?? "").toString();
  if (!publicUrl) throw new Error("Upload proxy returned no publicUrl");
  
  return { path, publicUrl };
}

export async function uploadViaProxy(file: File): Promise<{ path: string; publicUrl: string }> {
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

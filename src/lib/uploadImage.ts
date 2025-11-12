import { supabase } from "@/integrations/supabase/client";

export async function uploadViaProxy(file: File): Promise<{ path: string; publicUrl: string }> {
  const form = new FormData();
  form.append("file", file);

  const { data, error } = await supabase.functions.invoke("upload-scanner-image", { body: form });
  if (error) throw new Error(error.message || "Upload proxy failed");

  const path = data?.path?.toString() ?? "";
  const publicUrl = (data?.publicUrl ?? data?.url ?? "").toString();
  if (!publicUrl) throw new Error("Upload proxy returned no publicUrl");
  
  return { path, publicUrl };
}

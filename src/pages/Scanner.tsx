import { useState } from "react";

export default function Scanner() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Smaller, reliable uploads from phone photos
  async function fileToBase64(file: File) {
    const img = new Image();
    const reader = new FileReader();

    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = dataUrl;
    });

    // Resize to max 1600px on the largest edge (keeps payload small)
    const maxSide = 1600;
    let width = (img as HTMLImageElement).width;
    let height = (img as HTMLImageElement).height;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, width, height);

    const compressed = canvas.toDataURL("image/jpeg", 0.85);
    return compressed.split(",")[1]; // strip "data:" prefix
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch("/functions/v1/scan-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Scan failed. Try a straight-on, well-lit cover photo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
      <h2>📷 AI Comic Scanner</h2>
      <p>Upload a clear cover photo. We’ll OCR with Google Vision and match on ComicVine.</p>

      <input type="file" accept="image/*" capture="environment" onChange={onPick} />

      {loading && <p style={{ marginTop: 12 }}>Scanning…</p>}
      {error && <p style={{ marginTop: 12, color: "#f66" }}>{error}</p>}
      {result && (
        <pre
          style={{
            background: "#111",
            color: "#0f0",
            padding: "1rem",
            marginTop: "1rem",
            maxHeight: 480,
            overflow: "auto",
            borderRadius: 8,
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

import { useState } from "react";

export default function Scanner() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fileToBase64(file: File) {
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
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

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
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

      <input type="file" accept="image/*" onChange={onPick} />

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

export function withTimeout<T>(p: Promise<T>, ms: number, label = "op"): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    p.then(
      v => { clearTimeout(id); resolve(v); },
      e => { clearTimeout(id); reject(e); }
    );
  });
}

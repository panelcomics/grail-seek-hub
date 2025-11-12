/**
 * Client session tracking for scanner analytics
 * Creates a persistent anonymous session ID
 */

export function getSessionId(): string {
  const key = 'gs_session_id';
  let id = localStorage.getItem(key);
  
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  
  return id;
}

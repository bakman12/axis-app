import { getCurrentKey } from './cryptoStore';

const PREFIX = 'axis_local_';

export async function saveLocalEntities(entityName, records) {
  const key = getCurrentKey();
  if (!key || !Array.isArray(records)) return;
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ct = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key,
      new TextEncoder().encode(JSON.stringify(records))
    );
    localStorage.setItem(PREFIX + entityName, JSON.stringify({
      ct: btoa(String.fromCharCode(...new Uint8Array(ct))),
      iv: btoa(String.fromCharCode(...iv)),
    }));
  } catch { /* silently ignore write errors */ }
}

export async function loadLocalEntities(entityName) {
  const key = getCurrentKey();
  const stored = localStorage.getItem(PREFIX + entityName);
  if (!key || !stored) return null;
  try {
    const { ct, iv } = JSON.parse(stored);
    const plain = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0)) },
      key,
      Uint8Array.from(atob(ct), c => c.charCodeAt(0))
    );
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

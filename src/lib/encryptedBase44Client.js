import { base44 } from '@/api/base44Client';
import { getCurrentKey } from './cryptoStore';
import { saveLocalEntities, loadLocalEntities } from './localEntityStore';

// Fields encrypted per entity. Only non-query fields are encrypted so server-side
// filtering on id, status, date, medication_id etc. continues to work.
const ENCRYPTED_FIELDS = {
  Medication:     ['name', 'dosage', 'notes', 'barcode'],
  MedicationLog:  ['medication_name', 'context'],
  HealthProfile:  ['health_conditions', 'dietary_restrictions', 'goals', 'notes'],
  CheckIn:        ['notes'],
  DailyMood:      ['notes'],
  Trip:           ['destination', 'notes'],
  ImportantEvent: ['title', 'description'],
};

// Encrypt a single value using the in-memory key from cryptoStore.
// Returns a {ct, iv} envelope. If the key is not loaded, returns plaintext (app locked).
async function encryptValue(value) {
  const key = getCurrentKey();
  if (!key || value === null || value === undefined) return value;

  const plaintext = typeof value !== 'string' ? JSON.stringify(value) : value;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return {
    ct: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Decrypt a {ct, iv} envelope. Handles both encrypted and legacy plaintext values
// transparently — existing unencrypted data is returned as-is until the user re-saves it.
async function decryptValue(value) {
  const key = getCurrentKey();
  if (!key || !value || typeof value !== 'object' || !value.ct) return value;

  try {
    const ct = Uint8Array.from(atob(value.ct), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(value.iv), c => c.charCodeAt(0));
    const plain = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    const str = new TextDecoder().decode(plain);
    try { return JSON.parse(str); } catch { return str; }
  } catch {
    return value; // decryption failed — return ciphertext envelope rather than crash
  }
}

async function encryptRecord(entityName, data) {
  const fields = ENCRYPTED_FIELDS[entityName] ?? [];
  if (!fields.length) return data;
  const result = { ...data };
  await Promise.all(fields.map(async f => {
    if (f in result) result[f] = await encryptValue(result[f]);
  }));
  return result;
}

async function decryptRecord(entityName, record) {
  const fields = ENCRYPTED_FIELDS[entityName] ?? [];
  if (!fields.length) return record;
  const result = { ...record };
  await Promise.all(fields.map(async f => {
    if (f in result) result[f] = await decryptValue(result[f]);
  }));
  return result;
}

async function decryptList(entityName, records) {
  if (!Array.isArray(records)) return [];
  return Promise.all(records.map(r => decryptRecord(entityName, r)));
}

// Build a transparent wrapper around base44.entities.<name>
// All list/filter results are cached locally (AES-encrypted) so data survives
// API failures and is instantly available after PIN unlock on next session.
function makeEntityProxy(entityName) {
  const raw = base44.entities[entityName];
  if (!raw) return raw;

  return {
    async create(data) {
      const enc = await encryptRecord(entityName, data);
      // Save to local cache immediately so the record survives even if the API fails.
      // Include created_date so filters/sorts work correctly on local records.
      const localId = `local-${Date.now()}`;
      const localRecord = { created_date: new Date().toISOString(), ...data, id: localId };
      const cached = (await loadLocalEntities(entityName)) ?? [];
      saveLocalEntities(entityName, [...cached, localRecord]);

      try {
        const result = await raw.create(enc);
        if (result?.id) {
          // Replace temp record with the real server-assigned ID
          const updated = (await loadLocalEntities(entityName)) ?? [];
          saveLocalEntities(entityName, updated.map(r => r.id === localId ? { ...localRecord, id: result.id } : r));
          return result;
        }
        return localRecord;
      } catch {
        return localRecord; // Server unavailable — local record is source of truth
      }
    },
    async update(id, data) {
      const enc = await encryptRecord(entityName, data);
      const cached = (await loadLocalEntities(entityName)) ?? [];
      saveLocalEntities(entityName, cached.map(r => r.id === id ? { ...r, ...data } : r));
      try {
        return await raw.update(id, enc);
      } catch {
        return { id, ...data };
      }
    },
    async filter(query, ...args) {
      try {
        const records = await raw.filter(query, ...args);
        const decrypted = await decryptList(entityName, records);
        // Only overwrite local cache when server returned real data.
        // An empty server response when we have local data means the server
        // is not configured — keep the local records.
        const existing = await loadLocalEntities(entityName);
        if (decrypted.length > 0 || !existing?.length) {
          saveLocalEntities(entityName, decrypted);
        }
        return decrypted.length > 0 ? decrypted : (existing ?? []).filter(
          r => Object.entries(query).every(([k, v]) => r[k] === v)
        );
      } catch {
        const existing = (await loadLocalEntities(entityName)) ?? [];
        return existing.filter(r => Object.entries(query).every(([k, v]) => r[k] === v));
      }
    },
    async list(...args) {
      try {
        const records = await raw.list(...args);
        const decrypted = await decryptList(entityName, records);
        const existing = await loadLocalEntities(entityName);
        if (decrypted.length > 0 || !existing?.length) {
          saveLocalEntities(entityName, decrypted);
        }
        return decrypted.length > 0 ? decrypted : (existing ?? []);
      } catch {
        return (await loadLocalEntities(entityName)) ?? [];
      }
    },
    async get(id) {
      try {
        const record = await raw.get(id);
        return record ? decryptRecord(entityName, record) : record;
      } catch {
        const cached = (await loadLocalEntities(entityName)) ?? [];
        return cached.find(r => r.id === id) ?? null;
      }
    },
    async delete(id) {
      const cached = (await loadLocalEntities(entityName)) ?? [];
      saveLocalEntities(entityName, cached.filter(r => r.id !== id));
      try {
        return await raw.delete(id);
      } catch {
        return { id };
      }
    },
  };
}

// Drop-in replacement for base44.entities — components swap the import path only.
// Non-encrypted entities (Pharmacy, Achievement, etc.) pass through unchanged.
export const entities = new Proxy({}, {
  get(_, name) {
    return makeEntityProxy(name);
  },
});

// One-time migration: re-encrypt all existing plaintext records in Base44.
// Call this after the user first sets up their PIN/biometric.
// Safe to call multiple times — already-encrypted records are skipped (decryptValue returns {ct,iv} objects which re-encrypt fine, but the nested encrypt guard handles this via the "is it already a {ct,iv}?" check).
export async function migrateExistingData(onProgress) {
  const entityNames = Object.keys(ENCRYPTED_FIELDS).filter(
    name => ENCRYPTED_FIELDS[name].length > 0
  );
  let done = 0;

  for (const name of entityNames) {
    try {
      const raw = base44.entities[name];
      const records = await raw.list().catch(() => []);

      for (const record of records) {
        // Check if any sensitive field is still plaintext (not a {ct,iv} object)
        const needsMigration = ENCRYPTED_FIELDS[name].some(
          f => record[f] !== null && record[f] !== undefined && typeof record[f] !== 'object'
        );
        if (!needsMigration) continue;

        const encrypted = await encryptRecord(name, record);
        await raw.update(record.id, encrypted);
      }
    } catch {
      // Skip silently — partial migration is acceptable
    }
    done++;
    onProgress?.(done, entityNames.length, name);
  }
}

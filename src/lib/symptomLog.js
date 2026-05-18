const KEY = 'axis_symptom_log';
const MAX = 200;

export function loadSymptoms() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function addSymptom(entry) {
  const log = loadSymptoms();
  log.unshift({
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  localStorage.setItem(KEY, JSON.stringify(log.slice(0, MAX)));
}

export function deleteSymptom(id) {
  const log = loadSymptoms().filter(e => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(log));
}

export function clearSymptoms() {
  localStorage.removeItem(KEY);
}

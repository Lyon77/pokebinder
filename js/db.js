const DB_NAME = 'pokebinder';
const DB_VERSION = 1;
const COLLECTIONS_STORE = 'collections';
const TCG_CACHE_STORE = 'tcg-cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
        db.createObjectStore(COLLECTIONS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TCG_CACHE_STORE)) {
        db.createObjectStore(TCG_CACHE_STORE, { keyPath: 'name' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function getCollection(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COLLECTIONS_STORE, 'readonly');
    const req = tx.objectStore(COLLECTIONS_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveCollection(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COLLECTIONS_STORE, 'readwrite');
    const req = tx.objectStore(COLLECTIONS_STORE).put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getCachedCards(name) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TCG_CACHE_STORE, 'readonly');
    const req = tx.objectStore(TCG_CACHE_STORE).get(name.toLowerCase());
    req.onsuccess = () => {
      const record = req.result;
      if (!record) return resolve(null);
      if (Date.now() - record.ts > CACHE_TTL_MS) return resolve(null);
      resolve(record.cards);
    };
    req.onerror = () => reject(req.error);
  });
}

async function cacheCards(name, cards) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TCG_CACHE_STORE, 'readwrite');
    const req = tx.objectStore(TCG_CACHE_STORE).put({
      name: name.toLowerCase(),
      cards,
      ts: Date.now(),
    });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function clearExpiredCache() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TCG_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(TCG_CACHE_STORE);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return resolve();
      if (Date.now() - cursor.value.ts > CACHE_TTL_MS) {
        cursor.delete();
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

async function getAllCollections() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COLLECTIONS_STORE, 'readonly');
    const req = tx.objectStore(COLLECTIONS_STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).map(r => ({ id: r.id, name: r.name, type: r.type || 'pokedex' })));
    req.onerror = () => reject(req.error);
  });
}

async function getAllCollectionsFull() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COLLECTIONS_STORE, 'readonly');
    const req = tx.objectStore(COLLECTIONS_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getAllCachedCards() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TCG_CACHE_STORE, 'readonly');
    const req = tx.objectStore(TCG_CACHE_STORE).getAll();
    req.onsuccess = () => {
      const out = [];
      const now = Date.now();
      for (const entry of (req.result || [])) {
        if (now - entry.ts > CACHE_TTL_MS) continue;
        if (Array.isArray(entry.cards)) out.push(...entry.cards);
      }
      resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

async function deleteCollection(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COLLECTIONS_STORE, 'readwrite');
    const req = tx.objectStore(COLLECTIONS_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export {
  openDB,
  getCollection, saveCollection, deleteCollection,
  getAllCollections, getAllCollectionsFull,
  getCachedCards, getAllCachedCards, cacheCards, clearExpiredCache,
};

// IndexedDB：存放使用者上傳的影片 / GIF / 圖片（Blob）
const DB_NAME = 'live-wallpaper';
const STORE = 'media';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const mediaDB = {
  put: (id, blob) => tx('readwrite', s => s.put(blob, id)),
  get: id => tx('readonly', s => s.get(id)),
  delete: id => tx('readwrite', s => s.delete(id)),
};

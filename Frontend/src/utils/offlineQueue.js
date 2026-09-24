import { spatialAPI } from '../services/api.js';

/**
 * Offline Location Queue: Uses IndexedDB to store location breadcrumbs when cell network is lost (basements/tunnels)
 * and flushes stored pings in compressed batch payloads upon network restoration.
 */

const DB_NAME = 'twite_connect_offline_tracking';
const DB_VERSION = 1;
const STORE_NAME = 'offline_crumbs';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineCrumb(crumb) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ ...crumb, queued_at: Date.now() });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[OfflineQueue] Storage warning:', err);
    return false;
  }
}

export async function getOfflineCrumbs() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

export async function clearOfflineCrumbs() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

export async function flushOfflineQueue(syncFn) {
  const crumbs = await getOfflineCrumbs();
  if (!crumbs || crumbs.length === 0) return;

  try {
    console.log(`[OfflineQueue] Syncing ${crumbs.length} queued offline/pocket pings...`);
    if (typeof syncFn === 'function') {
      await syncFn(crumbs);
    } else if (spatialAPI && typeof spatialAPI.pushBatchLocations === 'function') {
      await spatialAPI.pushBatchLocations(crumbs);
    }
    await clearOfflineCrumbs();
    console.log('[OfflineQueue] Successfully flushed offline queue.');
  } catch (err) {
    console.warn('[OfflineQueue] Flush sync warning:', err);
  }
}

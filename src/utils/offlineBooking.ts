/**
 * Offline-first booking persistence using IndexedDB.
 * Stores pending bookings when offline and syncs when back online.
 */

type PendingBooking = {
  id: string;
  packageName: string;
  preferredDate: string;
  preferredTime: string;
  name: string;
  contact: string;
  notes: string;
  createdAt: string;
  status: "pending" | "synced" | "failed";
};

const DB_NAME = "nhb-bookings";
const DB_VERSION = 1;
const STORE_NAME = "pending-bookings";

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function savePendingBooking(booking: Omit<PendingBooking, "id" | "createdAt" | "status">): Promise<string | null> {
  const db = await openDB();
  if (!db) return null;

  const id = `booking_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: PendingBooking = {
    ...booking,
    id,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(entry);
    request.onsuccess = () => resolve(id);
    request.onerror = () => resolve(null);
  });
}

export async function getPendingBookings(): Promise<PendingBooking[]> {
  const db = await openDB();
  if (!db) return [];

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as PendingBooking[]);
    request.onerror = () => resolve([]);
  });
}

export async function markBookingSynced(id: string): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result as PendingBooking | undefined;
      if (entry) {
        entry.status = "synced";
        store.put(entry);
      }
      resolve();
    };
    getReq.onerror = () => resolve();
  });
}

export async function removePendingBooking(id: string): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

export async function syncPendingBookings(): Promise<{ synced: number; failed: number }> {
  const bookings = await getPendingBookings();
  const pending = bookings.filter((b) => b.status === "pending");
  let synced = 0;
  let failed = 0;

  for (const booking of pending) {
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageName: booking.packageName,
          preferredDate: booking.preferredDate,
          preferredTime: booking.preferredTime,
          name: booking.name,
          contact: booking.contact,
          notes: booking.notes,
        }),
      });

      if (response.ok) {
        await markBookingSynced(booking.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

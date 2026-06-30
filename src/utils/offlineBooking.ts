/**
 * Offline-first booking persistence using IndexedDB.
 * Stores pending bookings when offline and syncs when back online.
 */

import { publicMutationHeaders } from "../lib/admin-helpers";

export type PendingBooking = {
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
export const PENDING_BOOKINGS_CHANGED_EVENT = "nhb:pending-bookings-changed";

function notifyPendingBookingsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PENDING_BOOKINGS_CHANGED_EVENT));
  }
}

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
    tx.oncomplete = () => {
      notifyPendingBookingsChanged();
      resolve(id);
    };
    tx.onabort = () => resolve(null);
    tx.onerror = () => resolve(null);
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

export type PendingBookingRecoverySummary = {
  pendingCount: number;
  failedCount: number;
  totalCount: number;
};

export function summarizePendingBookingRecovery(bookings: PendingBooking[]): PendingBookingRecoverySummary {
  let pendingCount = 0;
  let failedCount = 0;

  for (const booking of bookings) {
    if (booking.status === "pending") pendingCount++;
    if (booking.status === "failed") failedCount++;
  }

  return {
    pendingCount,
    failedCount,
    totalCount: pendingCount + failedCount,
  };
}

export async function markBookingFailed(id: string): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    let changed = false;
    tx.oncomplete = () => {
      if (changed) notifyPendingBookingsChanged();
      resolve();
    };
    tx.onabort = () => resolve();
    tx.onerror = () => resolve();
    getReq.onsuccess = () => {
      const entry = getReq.result as PendingBooking | undefined;
      if (entry) {
        entry.status = "failed";
        store.put(entry);
        changed = true;
      }
    };
    getReq.onerror = () => resolve();
  });
}

async function deleteBookingRecord(id: string): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    let deleted = false;
    tx.oncomplete = () => resolve(deleted);
    tx.onabort = () => resolve(false);
    tx.onerror = () => resolve(false);
    request.onsuccess = () => {
      deleted = true;
    };
    request.onerror = () => resolve(false);
  });
}

export async function removePendingBooking(id: string): Promise<void> {
  if (await deleteBookingRecord(id)) notifyPendingBookingsChanged();
}

export async function clearSyncedBookings(): Promise<number> {
  const bookings = await getPendingBookings();
  const syncedIds = bookings.filter((booking) => booking.status === "synced").map((booking) => booking.id);
  const removed = await Promise.all(syncedIds.map((id) => deleteBookingRecord(id)));
  const removedCount = removed.filter(Boolean).length;
  if (removedCount > 0) notifyPendingBookingsChanged();
  return removedCount;
}

export function createPendingBookingRequestInit(booking: PendingBooking): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", ...publicMutationHeaders },
    body: JSON.stringify({
      packageName: booking.packageName,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      name: booking.name,
      contact: booking.contact,
      notes: booking.notes,
    }),
  };
}

export type PendingBookingSyncDisposition = "synced" | "failed" | "retry";

export function getPendingBookingSyncDisposition(status: number): PendingBookingSyncDisposition {
  if (status >= 200 && status < 300) return "synced";
  if (status >= 400 && status < 500) return "failed";
  return "retry";
}

export async function syncPendingBookings(): Promise<{ synced: number; failed: number }> {
  const bookings = await getPendingBookings();
  const pending = bookings.filter((b) => b.status === "pending");
  let synced = 0;
  let failed = 0;

  for (const booking of pending) {
    try {
      const response = await fetch("/api/booking", createPendingBookingRequestInit(booking));
      const disposition = getPendingBookingSyncDisposition(response.status);

      if (disposition === "synced") {
        await removePendingBooking(booking.id);
        synced++;
      } else if (disposition === "failed") {
        await markBookingFailed(booking.id);
        failed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

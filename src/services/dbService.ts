import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Vehicle, GasStation, FuelLog, UserProfile } from '../types';
import { LEGACY_DUMMY_STATION_IDS } from '../data/seedData';

const STATIONS_COLLECTION = 'stations';
const VEHICLES_COLLECTION = 'vehicles';
const LOGS_COLLECTION = 'fuel_logs';
const USERS_COLLECTION = 'users';

/**
 * Firestore menolak field `undefined` (mis. notes opsional laporan).
 * Bersihkan via JSON round-trip: undefined hilang, null/tanggal-string aman.
 */
function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Real-time subscription to Gas Stations.
 * Koleksi kosong = tetap kosong (tidak ada seed dummy lagi).
 * Dokumen dummy warisan ikut disaring agar tidak tampil di mana pun.
 * Selalu return unsubscribe function (noop kalau gagal init).
 */
export function subscribeStations(onUpdate: (stations: GasStation[]) => void): () => void {
  try {
    const colRef = collection(db, STATIONS_COLLECTION);

    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          onUpdate([]);
          return;
        }

        const items: GasStation[] = [];
        snapshot.forEach((d) => {
          const st = d.data() as GasStation;
          if (!LEGACY_DUMMY_STATION_IDS.includes(st.id)) items.push(st);
        });
        onUpdate(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, STATIONS_COLLECTION);
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, STATIONS_COLLECTION);
    return () => {};
  }
}

/**
 * Save or update station details (e.g. queue, fuels, community reports) in Firestore
 */
export async function updateStationInDb(station: GasStation): Promise<void> {
  const path = `${STATIONS_COLLECTION}/${station.id}`;
  try {
    await setDoc(doc(db, STATIONS_COLLECTION, station.id), stripUndefined(station), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Cache hasil peta (OSM) ke Firestore agar user lain langsung dapat tanpa fetch ulang.
 * Keamanan: hanya CREATE doc yang belum ada (cek getDoc dulu, setDoc tanpa merge).
 * Tidak pernah menimpa data komunitas/laporan yang sudah ada.
 * Dirancang fire-and-forget (jalan di background, tidak memblokir UI).
 */
export async function saveOsmStationsToDb(
  stations: GasStation[]
): Promise<{ savedIds: string[]; skipped: number }> {
  const savedIds: string[] = [];
  let skipped = 0;
  const CONCURRENCY = 5;
  for (let i = 0; i < stations.length; i += CONCURRENCY) {
    const chunk = stations.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async (st) => {
        const ref = doc(db, STATIONS_COLLECTION, st.id);
        const snap = await getDoc(ref);
        if (snap.exists()) return false;
        await setDoc(ref, stripUndefined(st));
        return true;
      })
    );
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) savedIds.push(chunk[idx].id);
      else skipped += 1;
    });
  }
  return { savedIds, skipped };
}

/**
 * Real-time subscription to Vehicles for a user
 */
export function subscribeVehicles(
  userId: string,
  onUpdate: (vehicles: Vehicle[]) => void
): () => void {
  const path = VEHICLES_COLLECTION;
  try {
    const q = query(collection(db, VEHICLES_COLLECTION), where('userId', '==', userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Vehicle[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as Vehicle);
        });
        onUpdate(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

/**
 * Save or update vehicle
 */
export async function saveVehicleToDb(vehicle: Vehicle & { userId: string }): Promise<void> {
  const path = `${VEHICLES_COLLECTION}/${vehicle.id}`;
  try {
    await setDoc(doc(db, VEHICLES_COLLECTION, vehicle.id), vehicle, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a vehicle
 */
export async function deleteVehicleFromDb(vehicleId: string): Promise<void> {
  const path = `${VEHICLES_COLLECTION}/${vehicleId}`;
  try {
    await deleteDoc(doc(db, VEHICLES_COLLECTION, vehicleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time subscription to Fuel Logs for a user
 */
export function subscribeLogs(
  userId: string,
  onUpdate: (logs: FuelLog[]) => void
): () => void {
  const path = LOGS_COLLECTION;
  try {
    const q = query(
      collection(db, LOGS_COLLECTION),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: FuelLog[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as FuelLog);
        });
        // Sort descending by date
        items.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        onUpdate(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

/**
 * Save or update fuel log
 */
export async function saveLogToDb(log: FuelLog & { userId: string }): Promise<void> {
  const path = `${LOGS_COLLECTION}/${log.id}`;
  try {
    await setDoc(doc(db, LOGS_COLLECTION, log.id), log, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete fuel log
 */
export async function deleteLogFromDb(logId: string): Promise<void> {
  const path = `${LOGS_COLLECTION}/${logId}`;
  try {
    await deleteDoc(doc(db, LOGS_COLLECTION, logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time subscription to User Profile
 */
export function subscribeUserProfile(
  userId: string,
  onUpdate: (profile: UserProfile | null) => void
): () => void {
  const path = `${USERS_COLLECTION}/${userId}`;
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as UserProfile);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

/**
 * Save or update user profile
 */
export async function saveUserProfileToDb(
  userId: string,
  profile: Partial<UserProfile> & { id?: string; email?: string }
): Promise<void> {
  const path = `${USERS_COLLECTION}/${userId}`;
  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), { id: userId, ...profile }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

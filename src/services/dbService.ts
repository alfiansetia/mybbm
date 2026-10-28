import {
  collection,
  doc,
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
import { initialStations } from '../data/seedData';

const STATIONS_COLLECTION = 'stations';
const VEHICLES_COLLECTION = 'vehicles';
const LOGS_COLLECTION = 'fuel_logs';
const USERS_COLLECTION = 'users';

/**
 * Real-time subscription to Gas Stations.
 * Seeds initial stations to Firestore if the collection is empty.
 */
export function subscribeStations(onUpdate: (stations: GasStation[]) => void): () => void {
  try {
    const colRef = collection(db, STATIONS_COLLECTION);

    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // Auto-seed initial stations into Firestore
          try {
            for (const st of initialStations) {
              await setDoc(doc(db, STATIONS_COLLECTION, st.id), st);
            }
          } catch (seedErr) {
            console.warn('Initial stations seeding notice:', seedErr);
          }
          onUpdate(initialStations);
          return;
        }

        const items: GasStation[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as GasStation);
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
  }
}

/**
 * Save or update station details (e.g. queue, fuels, community reports) in Firestore
 */
export async function updateStationInDb(station: GasStation): Promise<void> {
  const path = `${STATIONS_COLLECTION}/${station.id}`;
  try {
    await setDoc(doc(db, STATIONS_COLLECTION, station.id), station, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
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

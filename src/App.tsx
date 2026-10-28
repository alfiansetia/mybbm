/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Vehicle,
  GasStation,
  FuelLog,
  UserProfile,
  CommunityReport,
} from './types';
import { LEGACY_DUMMY_STATION_IDS } from './data/seedData';
import {
  testConnection,
  auth,
  loginWithGoogle,
  logoutUser,
  onAuthStateChanged,
} from './lib/firebase';
import {
  subscribeStations,
  updateStationInDb,
  saveOsmStationsToDb,
  subscribeVehicles,
  saveVehicleToDb,
  deleteVehicleFromDb,
  subscribeLogs,
  saveLogToDb,
  deleteLogFromDb,
  subscribeUserProfile,
  saveUserProfileToDb,
} from './services/dbService';
import { User as FirebaseUser } from 'firebase/auth';
import { TopHeader } from './components/TopHeader';
import { BottomNav, NavTab } from './components/BottomNav';
import { EmptyState } from './components/EmptyState';
import { RequireLogin } from './components/RequireLogin';
import { BerandaView } from './views/BerandaView';
import { GuestBerandaView } from './views/GuestBerandaView';
import { CekSpbuView } from './views/CekSpbuView';
import { CatatBbmView } from './views/CatatBbmView';
import { DetailSpbuView } from './views/DetailSpbuView';
import { StatistikView } from './views/StatistikView';
import { AkunView } from './views/AkunView';
import { calculateReporterScore } from './utils/reputation';
import { useUserLocation } from './hooks/useUserLocation';
import { fetchMapStations, mergeStationsById } from './services/nearbyStations';

// Data pribadi (kendaraan/log/profil) murni milik user — tidak ada seed dummy.
// Hanya stations (data publik bersama) yang memakai seed bootstrap.
const STORAGE_VERSION = 'v2-per-user';
const GUEST_PROFILE: UserProfile = {
  name: 'Tamu',
  email: '',
  avatar: '',
  credibilityScore: 0,
  reputationPoints: 0,
  isVerified: false,
  activeVehicleId: '',
  totalReports: 0,
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    if (localStorage.getItem('mybbm_schema_version') !== STORAGE_VERSION) return fallback;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // State milik user — default kosong, diisi dari Firestore per akun
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadJSON('mybbm_vehicles', []));

  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(() => {
    try {
      if (localStorage.getItem('mybbm_schema_version') !== STORAGE_VERSION) return null;
      return localStorage.getItem('mybbm_active_vehicle');
    } catch {
      return null;
    }
  });

  const [logs, setLogs] = useState<FuelLog[]>(() => loadJSON('mybbm_logs', []));

  // Stations = data publik: hasil deteksi peta + laporan komunitas. Tanpa seed dummy.
  const [stations, setStations] = useState<GasStation[]>(() => {
    try {
      const saved = localStorage.getItem('mybbm_stations');
      if (!saved) return [];
      const parsed = JSON.parse(saved) as GasStation[];
      return parsed.filter((s) => !LEGACY_DUMMY_STATION_IDS.includes(s.id));
    } catch {
      return [];
    }
  });

  // SPBU real dari peta (OSM) hasil fetch di CekSpbuView — disimpan di sini agar
  // bisa dibuka detailnya + dilaporkan (laporan pertama menyimpannya ke Firestore).
  const [nearbyStations, setNearbyStations] = useState<GasStation[]>([]);

  // Bootstrap: begitu app dibuka + GPS dapat, langsung deteksi SPBU terdekat (radius 5 km)
  // dan cache ke Firestore (saat login) agar user lain langsung dapat tanpa loading.
  const bootstrapped = useRef(false);
  const pendingSave = useRef<GasStation[]>([]);
  const { coords: bootCoords, status: bootStatus } = useUserLocation(true);

  useEffect(() => {
    if (bootStatus !== 'success' || bootstrapped.current) return;
    bootstrapped.current = true;
    const ctrl = new AbortController();
    const apiKey =
      import.meta.env.VITE_GOOGLE_PLACES_API_KEY ||
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      '';
    fetchMapStations({
      lat: bootCoords[0],
      lng: bootCoords[1],
      radiusM: 5000,
      placesApiKey: apiKey || undefined,
      signal: ctrl.signal,
    })
      .then(({ stations: found, source }) => {
        if (found.length === 0) return;
        console.info(`[Bootstrap] ${found.length} SPBU via ${source} — tampil + cache`);
        setNearbyStations((prev) => mergeStationsById(prev, found));
        pendingSave.current = found.filter(
          (s) => s.id.startsWith('osm-') || s.id.startsWith('gplaces-')
        );
      })
      .catch(() => {
        // Gagal total (offline/kuota) — CekSpbuView akan coba lagi dengan cache-nya.
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootStatus]);

  // Simpan hasil bootstrap ke Firestore begitu user login (rules butuh auth).
  useEffect(() => {
    if (!currentUser || pendingSave.current.length === 0) return;
    const batch = pendingSave.current.splice(0, 25);
    saveOsmStationsToDb(batch).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  /** Terapkan mutasi ke satu SPBU di kedua list (komunitas + peta), return hasil update. */
  const updateStationEverywhere = (stationId: string, mutate: (st: GasStation) => GasStation) => {
    const current = [...stations, ...nearbyStations].find((s) => s.id === stationId);
    if (!current) return null;
    const updated = mutate(current);
    setStations((prev) => prev.map((st) => (st.id === stationId ? updated : st)));
    setNearbyStations((prev) => prev.map((st) => (st.id === stationId ? updated : st)));
    return updated;
  };

  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    loadJSON('mybbm_user', GUEST_PROFILE)
  );

  const [activeTab, setActiveTab] = useState<NavTab>('beranda');
  const [catatInitialMode, setCatatInitialMode] = useState<'scan' | 'manual'>('scan');
  const [selectedStationDetailId, setSelectedStationDetailId] = useState<string | null>(null);

  // Migrasi sekali: buang cache dummy versi lama (seed Budi Santoso dkk).
  // Cache stations dipertahankan karena itu data publik.
  useEffect(() => {
    if (localStorage.getItem('mybbm_schema_version') !== STORAGE_VERSION) {
      ['mybbm_vehicles', 'mybbm_active_vehicle', 'mybbm_logs', 'mybbm_user'].forEach((k) =>
        localStorage.removeItem(k)
      );
      localStorage.setItem('mybbm_schema_version', STORAGE_VERSION);
      setVehicles([]);
      setActiveVehicleId(null);
      setLogs([]);
      setUserProfile(GUEST_PROFILE);
    }
  }, []);

  // Test Firestore connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  // 1. Stations: publik, tidak butuh auth — subscribe sekali saja
  useEffect(() => {
    const unsubscribe = subscribeStations((cloudStations) => {
      if (cloudStations && cloudStations.length > 0) {
        setStations(cloudStations);
        localStorage.setItem('mybbm_stations', JSON.stringify(cloudStations));
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Auth listener saja — jalan sekali, tidak depend ke activeVehicleId
  // (sebelumnya depend [activeVehicleId] bikin resubscribe + leak tiap ganti kendaraan)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  // 3. User-scoped sync — jalan hanya saat uid berubah.
  // Data murni dari Firestore milik akun ini. Cloud kosong = tetap kosong (tanpa seed dummy).
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    const unsubProfile = subscribeUserProfile(uid, (profile) => {
      if (profile) {
        setUserProfile(profile);
        if (profile.activeVehicleId) {
          setActiveVehicleId(profile.activeVehicleId);
        }
      } else {
        // First time login: persist default profile ke Firestore
        const newProfile: UserProfile = {
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Pengendara',
          email: currentUser.email || 'pengendara@gmail.com',
          avatar: currentUser.photoURL || '',
          credibilityScore: 5.0,
          reputationPoints: 100,
          isVerified: true,
          activeVehicleId: '',
          totalReports: 0,
        };
        setUserProfile(newProfile);
        saveUserProfileToDb(uid, newProfile);
      }
    });

    const unsubVehicles = subscribeVehicles(uid, (cloudVehicles) => {
      setVehicles(cloudVehicles);
      setActiveVehicleId((prev) =>
        prev && cloudVehicles.some((v) => v.id === prev)
          ? prev
          : cloudVehicles[0]?.id ?? null
      );
    });

    const unsubLogs = subscribeLogs(uid, (cloudLogs) => {
      setLogs(cloudLogs);
    });

    return () => {
      unsubProfile();
      unsubVehicles();
      unsubLogs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mybbm_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    if (activeVehicleId) {
      localStorage.setItem('mybbm_active_vehicle', activeVehicleId);
    } else {
      localStorage.removeItem('mybbm_active_vehicle');
    }
  }, [activeVehicleId]);

  useEffect(() => {
    localStorage.setItem('mybbm_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('mybbm_stations', JSON.stringify(stations));
  }, [stations]);

  useEffect(() => {
    localStorage.setItem('mybbm_user', JSON.stringify(userProfile));
  }, [userProfile]);

  // Kendaraan aktif milik user yang login — null kalau belum ada / belum login
  const activeVehicle =
    vehicles.find((v) => v.id === activeVehicleId) ?? null;

  const handleSelectVehicle = (id: string) => {
    setActiveVehicleId(id);
    if (currentUser) {
      saveUserProfileToDb(currentUser.uid, { activeVehicleId: id });
    }
  };

  const handleNavigateTab = (tab: NavTab, mode?: 'scan' | 'manual') => {
    if (tab === 'catat-bbm' && mode) {
      setCatatInitialMode(mode);
    }
    setSelectedStationDetailId(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStation = (stationId: string) => {
    setSelectedStationDetailId(stationId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add new fuel log and save to Firestore (hanya saat login + ada kendaraan aktif)
  const handleSaveLog = async (newLog: FuelLog) => {
    if (!currentUser || !activeVehicle) return;
    setLogs((prev) => [newLog, ...prev]);

    // Update vehicle current odometer if higher
    let updatedVehicle = activeVehicle;
    if (newLog.odometer > activeVehicle.currentOdo) {
      updatedVehicle = {
        ...activeVehicle,
        currentOdo: newLog.odometer,
        averageKmL: newLog.calculatedKmL || activeVehicle.averageKmL,
      };
      setVehicles((prev) =>
        prev.map((v) => (v.id === activeVehicle.id ? updatedVehicle : v))
      );
    }

    // Persist to Cloud Firestore
    await saveLogToDb({ ...newLog, userId: currentUser.uid });
    if (newLog.odometer > activeVehicle.currentOdo) {
      await saveVehicleToDb({ ...updatedVehicle, userId: currentUser.uid });
    }

    setActiveTab('beranda');
  };

  // Community reporting and write to Firestore (wajib login)
  const handleSubmitReport = async (
    stationId: string,
    newReportData: Omit<CommunityReport, 'id' | 'timestamp'>
  ) => {
    if (!currentUser) {
      await handleGoogleLogin();
      return;
    }
    const reportId = `rep-${Date.now()}`;
    const newReport: CommunityReport = {
      ...newReportData,
      id: reportId,
      timestamp: new Date().toISOString(),
    };

    let targetUpdatedStation: GasStation | null = null;

    targetUpdatedStation = updateStationEverywhere(stationId, (st) => {
      // Update fuel status in station
      const updatedFuels = st.fuels.map((f) => {
        if (f.type.toLowerCase().includes(newReport.fuelType.toLowerCase())) {
          return {
            ...f,
            status: newReport.status,
            notes: newReport.notes || f.notes,
            lastUpdated: 'Baru saja',
          };
        }
        return f;
      });

      // Laporan pertama ke SPBU peta (OSM): daftarkan jenis BBM-nya sekalian
      const reportedFuels =
        updatedFuels.length === 0
          ? [
              {
                type: newReport.fuelType,
                ronOrCn: '',
                price: 0,
                status: newReport.status,
                notes: newReport.notes,
                lastUpdated: 'Baru saja',
              },
            ]
          : updatedFuels;

      // Anti-spam rule: replace previous report by same user if within 30 mins
      const otherReports = st.reports.filter(
        (r) => r.reporterName !== userProfile.name || r.fuelType !== newReport.fuelType
      );

      const updated: GasStation = {
        ...st,
        fuels: reportedFuels,
        queueStatus: newReport.queueStatus,
        queueEstimateText:
          newReport.queueStatus === 'Sepi'
            ? 'Lancar (<3 min)'
            : newReport.queueStatus === 'Sedang'
            ? 'Antrean Sedang (±6-10 mnt)'
            : 'Antrean Panjang (>15 mnt)',
        lastReportMinutesAgo: 1,
        contributorsCount: st.contributorsCount + 1,
        reports: [newReport, ...otherReports],
      };

      return updated;
    });

    // Save updated station to Firestore
    if (targetUpdatedStation) {
      await updateStationInDb(targetUpdatedStation);
    }

    // Boost current user's reputation points and reports count
    const updatedReputation = {
      reputationPoints: userProfile.reputationPoints + 15,
      totalReports: userProfile.totalReports + 1,
      credibilityScore: calculateReporterScore(
        userProfile.credibilityScore,
        5,
        0,
        userProfile.totalReports + 1
      ),
    };

    setUserProfile((prev) => ({
      ...prev,
      ...updatedReputation,
    }));

    if (currentUser) {
      await saveUserProfileToDb(currentUser.uid, updatedReputation);
    }
  };

  // Peer verification: vote thumbs up or thumbs down (wajib login)
  const handleVoteReport = async (
    stationId: string,
    reportId: string,
    voteType: 'up' | 'down'
  ) => {
    if (!currentUser) {
      await handleGoogleLogin();
      return;
    }
    let targetUpdatedStation: GasStation | null = null;

    targetUpdatedStation = updateStationEverywhere(stationId, (st) => {
      const updatedReports = st.reports.map((rep) => {
        if (rep.id !== reportId) return rep;

        const alreadyUp = rep.userVoted === 'up';
        const alreadyDown = rep.userVoted === 'down';

        let newUp = rep.upvotes;
        let newDown = rep.downvotes;
        let newUserVoted: 'up' | 'down' | undefined = voteType;

        if (voteType === 'up') {
          if (alreadyUp) {
            newUp -= 1;
            newUserVoted = undefined;
          } else {
            newUp += 1;
            if (alreadyDown) newDown -= 1;
          }
        } else {
          if (alreadyDown) {
            newDown -= 1;
            newUserVoted = undefined;
          } else {
            newDown += 1;
            if (alreadyUp) newUp -= 1;
          }
        }

        // Recalculate reporter trust score
        const updatedTrust = calculateReporterScore(
          rep.reporterTrustScore,
          newUp,
          newDown
        );

        return {
          ...rep,
          upvotes: newUp,
          downvotes: newDown,
          userVoted: newUserVoted,
          reporterTrustScore: updatedTrust,
        };
      });

      const updated: GasStation = {
        ...st,
        verifiedCount: st.verifiedCount + (voteType === 'up' ? 1 : 0),
        reports: updatedReports,
      };

      return updated;
    });

    if (targetUpdatedStation) {
      await updateStationInDb(targetUpdatedStation);
    }
  };

  // Export CSV function (FR-T6)
  const handleExportCSV = () => {
    const headers = [
      'Tanggal',
      'Kendaraan',
      'SPBU',
      'Brand',
      'Jenis BBM',
      'Volume (Liter)',
      'Harga per Liter (Rp)',
      'Total Bayar (Rp)',
      'Odometer (km)',
      'Jarak Tempuh (km)',
      'Konsumsi (km/L)',
      'Biaya per km (Rp)',
      'Status Full Tank',
      'Metode Pembayaran',
      'Catatan',
    ];

    const rows = logs.map((l) => [
      l.displayDate || l.dateTime,
      vehicles.find((v) => v.id === l.vehicleId)?.name || 'Kendaraan',
      `"${l.stationName}"`,
      l.stationBrand,
      l.fuelType,
      l.liters,
      l.pricePerLiter,
      l.totalAmount,
      l.odometer,
      l.distanceKm || '',
      l.calculatedKmL || '',
      l.costPerKm || '',
      l.isFullTank ? 'Full Tank' : 'Parsial',
      `"${l.paymentMethod}"`,
      `"${l.notes || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `mybbm_laporan_konsumsi_${(activeVehicle?.name ?? 'kendaraan').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddVehicle = async (newVeh: Omit<Vehicle, 'id'>) => {
    if (!currentUser) {
      await handleGoogleLogin();
      return;
    }
    const id = `veh-${Date.now()}`;
    const vehicleWithId = { ...newVeh, id };
    setVehicles((prev) => [...prev, vehicleWithId]);
    setActiveVehicleId(id);

    if (currentUser) {
      await saveVehicleToDb({ ...vehicleWithId, userId: currentUser.uid });
      await saveUserProfileToDb(currentUser.uid, { activeVehicleId: id });
    }
  };

  // Ubah data kendaraan (nama, plat, odo, dsb.) + simpan ke Firestore.
  const handleUpdateVehicle = async (updated: Vehicle) => {
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    if (currentUser) {
      await saveVehicleToDb({ ...updated, userId: currentUser.uid });
    }
  };

  // Hapus satu kendaraan + seluruh log BBM-nya (kendaraan aktif dialihkan otomatis).
  const handleDeleteVehicle = async (id: string) => {
    const remaining = vehicles.filter((v) => v.id !== id);
    const removedLogs = logs.filter((l) => l.vehicleId === id);
    setVehicles(remaining);
    setLogs((prev) => prev.filter((l) => l.vehicleId !== id));

    let nextActive: string | null = activeVehicleId;
    if (activeVehicleId === id) {
      nextActive = remaining[0]?.id ?? null;
      setActiveVehicleId(nextActive);
    }

    if (currentUser) {
      await deleteVehicleFromDb(id);
      await Promise.all(removedLogs.map((l) => deleteLogFromDb(l.id)));
      await saveUserProfileToDb(currentUser.uid, { activeVehicleId: nextActive ?? '' });
    } else {
      localStorage.removeItem('mybbm_active_vehicle');
    }
  };

  // Reset = hapus data pribadi milik akun ini (kendaraan + log + statistik profil).
  // Data stations (publik) dipertahankan.
  const handleResetData = async () => {
    if (currentUser) {
      await Promise.all([
        ...vehicles.map((v) => deleteVehicleFromDb(v.id)),
        ...logs.map((l) => deleteLogFromDb(l.id)),
      ]);
      const freshStats = {
        reputationPoints: 100,
        totalReports: 0,
        credibilityScore: 5.0,
        activeVehicleId: '',
      };
      await saveUserProfileToDb(currentUser.uid, freshStats);
      setUserProfile((prev) => ({ ...prev, ...freshStats }));
    } else {
      setUserProfile(GUEST_PROFILE);
    }

    setVehicles([]);
    setActiveVehicleId(null);
    setLogs([]);

    ['mybbm_vehicles', 'mybbm_active_vehicle', 'mybbm_logs', 'mybbm_user'].forEach((k) =>
      localStorage.removeItem(k)
    );
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google Sign In failed:', err);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      // Bersihkan data pribadi dari memori + cache agar tidak bocor ke akun berikutnya
      setVehicles([]);
      setActiveVehicleId(null);
      setLogs([]);
      setUserProfile(GUEST_PROFILE);
      ['mybbm_vehicles', 'mybbm_active_vehicle', 'mybbm_logs', 'mybbm_user'].forEach((k) =>
        localStorage.removeItem(k)
      );
      setActiveTab('akun');
    } catch (err) {
      console.error('Google Logout failed:', err);
    }
  };

  // Gabungan komunitas + peta untuk semua tampilan (Beranda, Cek SPBU, Detail).
  const displayStations = useMemo(
    () => mergeStationsById(stations, nearbyStations),
    [stations, nearbyStations]
  );

  const selectedStation = displayStations.find((s) => s.id === selectedStationDetailId);

  // Subtitle for header
  let subtitle = 'Beranda';
  if (selectedStationDetailId) subtitle = 'Detail SPBU';
  else if (activeTab === 'cek-spbu') subtitle = 'Cek SPBU & Stok';
  else if (activeTab === 'catat-bbm') subtitle = 'Catat Pengisian';
  else if (activeTab === 'statistik') subtitle = 'Statistik & Analisis';
  else if (activeTab === 'akun') subtitle = 'Akun & Kendaraan';

  // Tab yang butuh kendaraan aktif — hanya berlaku bila sudah login.
  // Beranda TIDAK hard-block: tanpa kendaraan tetap tampil konten + CTA tambah kendaraan.
  // Tamu tetap bisa buka beranda (versi publik), cek SPBU, dan detail.
  const isGuest = !currentUser;
  const needsVehicle =
    !!currentUser && (activeTab === 'catat-bbm' || activeTab === 'statistik');

  return (
    <div className="bg-[#f7f9ff] text-[#181c20] min-h-screen flex flex-col antialiased selection:bg-sky-200">
      {/* Fixed Top Header */}
      <TopHeader
        currentSubtitle={subtitle}
        activeVehicle={activeVehicle}
        allVehicles={vehicles}
        onSelectVehicle={handleSelectVehicle}
        userProfile={userProfile}
        onOpenAccount={() => handleNavigateTab('akun')}
        onOpenVehicleModal={() => handleNavigateTab('akun')}
      />

      {/* Main Content Area Mobile Envelope */}
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-4 pt-20 pb-safe">
        {selectedStation ? (
          <DetailSpbuView
            station={selectedStation}
            userProfile={userProfile}
            isGuest={isGuest}
            onRequireLogin={handleGoogleLogin}
            onBack={() => setSelectedStationDetailId(null)}
            onSubmitReport={handleSubmitReport}
            onVoteReport={handleVoteReport}
          />
        ) : isGuest && (activeTab === 'catat-bbm' || activeTab === 'statistik') ? (
          <RequireLogin
            title={activeTab === 'catat-bbm' ? 'Catat BBM perlu login' : 'Statistik perlu login'}
            hint={
              activeTab === 'catat-bbm'
                ? 'Masuk untuk menambah kendaraan dan menyimpan riwayat pengisian BBM-mu.'
                : 'Masuk untuk melihat tren konsumsi, biaya, dan insight kendaraanmu.'
            }
            icon={activeTab === 'catat-bbm' ? 'edit_note' : 'bar_chart'}
            onLogin={handleGoogleLogin}
          />
        ) : !activeVehicle && needsVehicle ? (
          <EmptyState
            icon="two_wheeler"
            title="Belum ada kendaraan"
            hint="Tambahkan kendaraan pertamamu untuk mulai mencatat pengisian BBM."
            actionLabel="Tambah Kendaraan"
            onAction={() => handleNavigateTab('akun')}
          />
        ) : activeTab === 'beranda' ? (
          isGuest || !activeVehicle ? (
            <GuestBerandaView
              stations={displayStations}
              onSelectStation={handleSelectStation}
              onNavigateTab={handleNavigateTab}
              onLogin={handleGoogleLogin}
              noVehicleMode={!isGuest}
            />
          ) : (
            <BerandaView
              activeVehicle={activeVehicle!}
              logs={logs}
              stations={displayStations}
              onNavigateTab={handleNavigateTab}
              onSelectStation={handleSelectStation}
              onOpenReportModal={(stationId) => {
                if (stationId) {
                  handleSelectStation(stationId);
                } else {
                  handleSelectStation(displayStations[1]?.id || displayStations[0]?.id);
                }
              }}
              onExportData={handleExportCSV}
              onChangeVehicle={() => handleNavigateTab('akun')}
            />
          )
        ) : activeTab === 'cek-spbu' ? (
          <CekSpbuView
            stations={stations}
            onSelectStation={handleSelectStation}
            onNearbyUpdate={(list) => setNearbyStations((prev) => mergeStationsById(prev, list))}
            canContribute={!!currentUser}
            onOpenReportModal={(stationId) => {
              if (stationId) {
                handleSelectStation(stationId);
              } else {
                handleSelectStation(displayStations[1]?.id || displayStations[0]?.id);
              }
            }}
          />
        ) : activeTab === 'catat-bbm' ? (
          <CatatBbmView
            activeVehicle={activeVehicle!}
            allVehicles={vehicles}
            stations={displayStations}
            initialMode={catatInitialMode}
            onSaveLog={handleSaveLog}
            onCancel={() => handleNavigateTab('beranda')}
          />
        ) : activeTab === 'statistik' ? (
          <StatistikView
            activeVehicle={activeVehicle!}
            logs={logs}
            onChangeVehicle={() => handleNavigateTab('akun')}
            onExportCSV={handleExportCSV}
          />
        ) : (
          <AkunView
            userProfile={userProfile}
            vehicles={vehicles}
            activeVehicleId={activeVehicleId}
            currentUser={currentUser}
            onLoginGoogle={handleGoogleLogin}
            onLogoutGoogle={handleGoogleLogout}
            onSelectVehicle={handleSelectVehicle}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation (hidden when in Detail view so bottom actions take prominence) */}
      {!selectedStationDetailId && (
        <BottomNav activeTab={activeTab} onChangeTab={handleNavigateTab} />
      )}
    </div>
  );
}

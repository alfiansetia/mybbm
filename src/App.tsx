/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Vehicle,
  GasStation,
  FuelLog,
  UserProfile,
  CommunityReport,
} from './types';
import {
  initialVehicles,
  initialStations,
  initialLogs,
  initialUserProfile,
} from './data/seedData';
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
  subscribeVehicles,
  saveVehicleToDb,
  subscribeLogs,
  saveLogToDb,
  subscribeUserProfile,
  saveUserProfileToDb,
} from './services/dbService';
import { User as FirebaseUser } from 'firebase/auth';
import { TopHeader } from './components/TopHeader';
import { BottomNav, NavTab } from './components/BottomNav';
import { BerandaView } from './views/BerandaView';
import { CekSpbuView } from './views/CekSpbuView';
import { CatatBbmView } from './views/CatatBbmView';
import { DetailSpbuView } from './views/DetailSpbuView';
import { StatistikView } from './views/StatistikView';
import { AkunView } from './views/AkunView';
import { calculateReporterScore } from './utils/reputation';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // Local storage backed state as offline baseline
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('mybbm_vehicles');
    return saved ? JSON.parse(saved) : initialVehicles;
  });

  const [activeVehicleId, setActiveVehicleId] = useState<string>(() => {
    return localStorage.getItem('mybbm_active_vehicle') || initialVehicles[0].id;
  });

  const [logs, setLogs] = useState<FuelLog[]>(() => {
    const saved = localStorage.getItem('mybbm_logs');
    return saved ? JSON.parse(saved) : initialLogs;
  });

  const [stations, setStations] = useState<GasStation[]>(() => {
    const saved = localStorage.getItem('mybbm_stations');
    return saved ? JSON.parse(saved) : initialStations;
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('mybbm_user');
    return saved ? JSON.parse(saved) : initialUserProfile;
  });

  const [activeTab, setActiveTab] = useState<NavTab>('beranda');
  const [catatInitialMode, setCatatInitialMode] = useState<'scan' | 'manual'>('scan');
  const [selectedStationDetailId, setSelectedStationDetailId] = useState<string | null>(null);

  // Refs untuk hindari stale closure di subscription Firestore
  const activeVehicleIdRef = useRef(activeVehicleId);
  const vehiclesRef = useRef(vehicles);
  useEffect(() => {
    activeVehicleIdRef.current = activeVehicleId;
  }, [activeVehicleId]);
  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

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

  // 3. User-scoped sync — jalan hanya saat uid berubah
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    const unsubProfile = subscribeUserProfile(uid, (profile) => {
      if (profile) {
        setUserProfile(profile);
        localStorage.setItem('mybbm_user', JSON.stringify(profile));
        if (profile.activeVehicleId) {
          setActiveVehicleId(profile.activeVehicleId);
        }
      } else {
        // First time login: persist default profile ke Firestore
        const newProfile: UserProfile = {
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Pengendara',
          email: currentUser.email || 'pengendara@gmail.com',
          avatar:
            currentUser.photoURL ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          credibilityScore: 5.0,
          reputationPoints: 100,
          isVerified: true,
          activeVehicleId: activeVehicleIdRef.current,
          totalReports: 0,
        };
        setUserProfile(newProfile);
        saveUserProfileToDb(uid, newProfile);
      }
    });

    const unsubVehicles = subscribeVehicles(uid, (cloudVehicles) => {
      if (cloudVehicles && cloudVehicles.length > 0) {
        setVehicles(cloudVehicles);
        if (!cloudVehicles.some((v) => v.id === activeVehicleIdRef.current)) {
          setActiveVehicleId(cloudVehicles[0].id);
        }
      } else {
        // Seed hanya sekali saat cloud kosong, pakai snapshot ref (hindari forEach tanpa await)
        const localVehicles = vehiclesRef.current;
        if (localVehicles.length > 0) {
          (async () => {
            for (const v of localVehicles) {
              await saveVehicleToDb({ ...v, userId: uid });
            }
          })();
        }
      }
    });

    const unsubLogs = subscribeLogs(uid, (cloudLogs) => {
      if (cloudLogs && cloudLogs.length > 0) {
        setLogs(cloudLogs);
      }
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
    localStorage.setItem('mybbm_active_vehicle', activeVehicleId);
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

  const activeVehicle =
    vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || initialVehicles[0];

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

  // Add new fuel log and save to Firestore
  const handleSaveLog = async (newLog: FuelLog) => {
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

    // Persist to Cloud Firestore if authenticated
    if (currentUser) {
      await saveLogToDb({ ...newLog, userId: currentUser.uid });
      if (newLog.odometer > activeVehicle.currentOdo) {
        await saveVehicleToDb({ ...updatedVehicle, userId: currentUser.uid });
      }
    }

    setActiveTab('beranda');
  };

  // Community reporting and write to Firestore
  const handleSubmitReport = async (
    stationId: string,
    newReportData: Omit<CommunityReport, 'id' | 'timestamp'>
  ) => {
    const reportId = `rep-${Date.now()}`;
    const newReport: CommunityReport = {
      ...newReportData,
      id: reportId,
      timestamp: new Date().toISOString(),
    };

    let targetUpdatedStation: GasStation | null = null;

    setStations((prev) =>
      prev.map((st) => {
        if (st.id !== stationId) return st;

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

        // Anti-spam rule: replace previous report by same user if within 30 mins
        const otherReports = st.reports.filter(
          (r) => r.reporterName !== userProfile.name || r.fuelType !== newReport.fuelType
        );

        const updated: GasStation = {
          ...st,
          fuels: updatedFuels,
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

        targetUpdatedStation = updated;
        return updated;
      })
    );

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

  // Peer verification: vote thumbs up or thumbs down
  const handleVoteReport = async (
    stationId: string,
    reportId: string,
    voteType: 'up' | 'down'
  ) => {
    let targetUpdatedStation: GasStation | null = null;

    setStations((prev) =>
      prev.map((st) => {
        if (st.id !== stationId) return st;

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

        targetUpdatedStation = updated;
        return updated;
      })
    );

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
      `mybbm_laporan_konsumsi_${activeVehicle.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddVehicle = async (newVeh: Omit<Vehicle, 'id'>) => {
    const id = `veh-${Date.now()}`;
    const vehicleWithId = { ...newVeh, id };
    setVehicles((prev) => [...prev, vehicleWithId]);
    setActiveVehicleId(id);

    if (currentUser) {
      await saveVehicleToDb({ ...vehicleWithId, userId: currentUser.uid });
      await saveUserProfileToDb(currentUser.uid, { activeVehicleId: id });
    }
  };

  const handleResetData = () => {
    // Clear all cached keys in localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('mybbm')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Reset React state to pristine seed data
    setVehicles(initialVehicles);
    setActiveVehicleId(initialVehicles[0].id);
    setLogs(initialLogs);
    setStations(initialStations);
    setUserProfile(initialUserProfile);

    // Save initial state into storage
    localStorage.setItem('mybbm_vehicles', JSON.stringify(initialVehicles));
    localStorage.setItem('mybbm_active_vehicle', initialVehicles[0].id);
    localStorage.setItem('mybbm_logs', JSON.stringify(initialLogs));
    localStorage.setItem('mybbm_stations', JSON.stringify(initialStations));
    localStorage.setItem('mybbm_user', JSON.stringify(initialUserProfile));
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
    } catch (err) {
      console.error('Google Logout failed:', err);
    }
  };

  const selectedStation = stations.find((s) => s.id === selectedStationDetailId);

  // Subtitle for header
  let subtitle = 'Beranda';
  if (selectedStationDetailId) subtitle = 'Detail SPBU';
  else if (activeTab === 'cek-spbu') subtitle = 'Cek SPBU & Stok';
  else if (activeTab === 'catat-bbm') subtitle = 'Catat Pengisian';
  else if (activeTab === 'statistik') subtitle = 'Statistik & Analisis';
  else if (activeTab === 'akun') subtitle = 'Akun & Kendaraan';

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
            onBack={() => setSelectedStationDetailId(null)}
            onSubmitReport={handleSubmitReport}
            onVoteReport={handleVoteReport}
          />
        ) : activeTab === 'beranda' ? (
          <BerandaView
            activeVehicle={activeVehicle}
            logs={logs}
            stations={stations}
            onNavigateTab={handleNavigateTab}
            onSelectStation={handleSelectStation}
            onOpenReportModal={(stationId) => {
              if (stationId) {
                handleSelectStation(stationId);
              } else {
                handleSelectStation(stations[1]?.id || stations[0]?.id);
              }
            }}
            onExportData={handleExportCSV}
            onChangeVehicle={() => handleNavigateTab('akun')}
          />
        ) : activeTab === 'cek-spbu' ? (
          <CekSpbuView
            stations={stations}
            onSelectStation={handleSelectStation}
            onOpenReportModal={(stationId) => {
              if (stationId) {
                handleSelectStation(stationId);
              } else {
                handleSelectStation(stations[1]?.id || stations[0]?.id);
              }
            }}
          />
        ) : activeTab === 'catat-bbm' ? (
          <CatatBbmView
            activeVehicle={activeVehicle}
            allVehicles={vehicles}
            stations={stations}
            initialMode={catatInitialMode}
            onSaveLog={handleSaveLog}
            onCancel={() => handleNavigateTab('beranda')}
          />
        ) : activeTab === 'statistik' ? (
          <StatistikView
            activeVehicle={activeVehicle}
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

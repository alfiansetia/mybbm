export type BrandType = 'Pertamina' | 'Shell' | 'Vivo' | 'BP' | 'Toko Madura' | 'Lainnya';

export type AvailabilityStatus = 'Tersedia' | 'Terbatas' | 'Kosong';

export type QueueStatus = 'Sepi' | 'Sedang' | 'Panjang';

export interface Vehicle {
  id: string;
  name: string;
  type: 'motor' | 'mobil';
  brand: string;
  model: string;
  year: number;
  engineSpec?: string;
  plateNumber: string;
  primaryFuel: string;
  currentOdo: number;
  averageKmL: number;
  /** Kapasitas tangki (liter) — tiap motor/mobil beda, dipakai validasi full tank. */
  tankCapacityL?: number;
  isArchived?: boolean;
}

export interface FuelDetail {
  type: string;
  ronOrCn: string;
  price: number;
  status: AvailabilityStatus;
  notes?: string;
  lastUpdated: string;
}

export interface CommunityReport {
  id: string;
  stationId: string;
  fuelType: string;
  status: AvailabilityStatus;
  queueStatus: QueueStatus;
  notes?: string;
  reporterName: string;
  reporterAvatar?: string;
  reporterTrustScore: number;
  /** UID penulis — untuk anti-spam & atribusi (rules melarang tulis profil orang lain). */
  reporterUid?: string;
  /** Snapshot skor pelapor saat melapor — basis hitung-ulang trust saat vote (idempoten). */
  reporterBaseScore?: number;
  isVerifiedReporter?: boolean;
  timestamp: string;
  minutesAgo: number;
  upvotes: number;
  downvotes: number;
  userVoted?: 'up' | 'down';
}

export interface GasStation {
  id: string;
  code: string;
  name: string;
  brand: BrandType;
  address: string;
  distanceKm: number;
  lat: number;
  lng: number;
  queueStatus: QueueStatus;
  queueEstimateText: string;
  queueMinutes: number;
  facilities: string[];
  badges?: string[];
  fuels: FuelDetail[];
  lastReportMinutesAgo: number;
  contributorsCount: number;
  verifiedCount: number;
  notes?: string;
  reports: CommunityReport[];
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  dateTime: string;
  displayDate: string;
  stationName: string;
  stationBrand: BrandType;
  fuelType: string;
  odometer: number;
  previousOdo?: number;
  distanceKm?: number;
  isFullTank: boolean;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  paymentMethod: string;
  calculatedKmL?: number;
  costPerKm?: number;
  efficiencyBadge?: string;
  receiptImage?: string;
  notes?: string;
  isDraft?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  credibilityScore: number;
  reputationPoints: number;
  isVerified: boolean;
  activeVehicleId: string;
  totalReports: number;
  /** Epoch-ms sampai kapan user tidak boleh melapor lagi (anti-spam). */
  cooldownUntilMs?: number;
  /** Cooldown per SPBU+BBM: kunci `${stationId}||${bbm}` → epoch-ms.
   *  Lapor BBM bedo nang SPBU podo (utowo SPBU bedo) ora dikunci. */
  reportCooldowns?: Record<string, number>;
}

/** Hasil submit laporan: diterima / ditolak cooldown / kena penalti penolakan komunitas. */
export interface SubmitReportResult {
  accepted: boolean;
  penalized: boolean;
  retryInMs: number;
}

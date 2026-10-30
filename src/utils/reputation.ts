import { CommunityReport, AvailabilityStatus, GasStation } from '../types';

export interface ReputationTier {
  label: string;
  minScore: number;
  icon: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  iconColor: string;
}

/**
 * SATU-SATUNYA sumber tier reputasi. Badge, legenda Akun, dan rule terverifikasi
 * semuanya turun dari tabel ini — jangan bikin ambang tandingan di tempat lain.
 */
export const REPUTATION_TIERS: ReputationTier[] = [
  {
    label: 'Master Komunitas',
    minScore: 4.8,
    icon: 'military_tech',
    badgeBg: 'bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/10',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-400/80',
    iconColor: 'text-amber-600',
  },
  {
    label: 'Kontributor Terpercaya',
    minScore: 4.5,
    icon: 'verified',
    badgeBg: 'bg-gradient-to-r from-emerald-500/15 via-teal-400/20 to-emerald-500/10',
    textColor: 'text-emerald-900',
    borderColor: 'border-emerald-400/80',
    iconColor: 'text-emerald-600',
  },
  {
    label: 'Motorist Aktif',
    minScore: 3.5,
    icon: 'two_wheeler',
    badgeBg: 'bg-gradient-to-r from-sky-500/15 via-sky-400/20 to-sky-500/10',
    textColor: 'text-sky-900',
    borderColor: 'border-sky-400/80',
    iconColor: 'text-[#006194]',
  },
  {
    label: 'Warga Baru',
    minScore: 1.0,
    icon: 'person',
    badgeBg: 'bg-slate-100',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
    iconColor: 'text-slate-500',
  },
];

/** Skor awal pengguna baru — Warga Baru, bukan master instan. */
export const NEW_USER_SCORE = 3.0;

/** Centang "terverifikasi" diperoleh, bukan bawaan lahir: minimal tier Kontributor. */
export const VERIFIED_SCORE_MIN = 4.5;

/** Bonus per laporan terkirim (aktivitas murni, tanpa vote fiktif). */
export const REPORT_ACTIVITY_STEP = 0.02;

/** Jeda wajib lapor ULANG kombinasi SPBU+BBM sing podo (anti-spam).
 *  Lapor BBM bedo (Pertalite → Pertamax) ora dikunci. */
export const REPORT_COOLDOWN_MS = 3 * 60 * 1000;

/** Jeda bila laporan dikirim padahal info sebelumnya ditolak komunitas. */
export const PENALIZED_COOLDOWN_MS = 15 * 60 * 1000;

/** Jendela relevansi laporan komunitas: luwih seko iki = basi, didelikne
 *  saka konsensus + tampilan utama (iso dibuka lewat tombol riwayat).
 *  Stok SPBU ganti cepet — 12 jam wis cukup basi. */
export const REPORT_RELEVANT_MINUTES = 12 * 60;

/** Net vote (up − 1.5×down) ≤ ini = info pelapor ditolak komunitas. */
export const REJECTED_NET_MAX = -3;

/** Penalti skor bila tetap melapor setelah infonya ditolak. */
export const REJECTED_PENALTY = 0.3;

/** Sisa cooldown (ms) dari profil. 0 = boleh melapor. */
export function reportCooldownLeftMs(
  cooldownUntilMs?: number,
  now: number = Date.now()
): number {
  return Math.max(0, (cooldownUntilMs ?? 0) - now);
}

/**
 * Kunci cooldown per SPBU+BBM — lapor Pertalite ora ngunci Pertamax.
 * Fuel dinormalke (lowercase) ben "Pertamax" vs "pertamax" dadi siji kunci.
 */
export function reportCooldownKey(stationId: string, fuelType: string): string {
  return `${stationId}||${(fuelType ?? '').trim().toLowerCase()}`;
}

/** Sisa cooldown per-kunci (ms) dari profil. 0 = kombinasi iki boleh dilapor. */
export function reportKeyCooldownLeftMs(
  reportCooldowns: Record<string, number> | undefined,
  stationId: string,
  fuelType: string,
  now: number = Date.now()
): number {
  const until = reportCooldowns?.[reportCooldownKey(stationId, fuelType)] ?? 0;
  return Math.max(0, until - now);
}

/** "150000 ms" → "2:30" untuk label tombol. */
export function formatCooldown(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Net peer-feedback satu laporan. */
export function peerNetOf(upvotes: number, downvotes: number): number {
  return upvotes - downvotes * 1.5;
}

/**
 * Umur laporan (menit). Utamake `timestamp` ISO (dinamis, ora basi) —
 * fallback `minutesAgo` kanggo data warisan sing timestamp-e ora valid.
 */
export function reportAgeMinutes(
  report: Pick<CommunityReport, 'timestamp' | 'minutesAgo'>,
  now: number = Date.now()
): number {
  const t = Date.parse(report.timestamp ?? '');
  if (!Number.isNaN(t)) {
    return Math.max(0, Math.floor((now - t) / 60000));
  }
  return Math.max(0, report.minutesAgo ?? 0);
}

/** Laporan isih relevan (anyar) opo wis basi? */
export function isReportFresh(
  report: Pick<CommunityReport, 'timestamp' | 'minutesAgo'>,
  now: number = Date.now(),
  windowMinutes: number = REPORT_RELEVANT_MINUTES
): boolean {
  return reportAgeMinutes(report, now) <= windowMinutes;
}

/** "5" → "5 mnt lalu", "130" → "2 jam lalu", "3000" → "2 hari lalu". */
export function formatReportAge(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

export function getReputationTier(score: number): ReputationTier {
  for (const tier of REPUTATION_TIERS) {
    if (score >= tier.minScore) {
      return tier;
    }
  }
  return REPUTATION_TIERS[REPUTATION_TIERS.length - 1];
}

/**
 * Skor trust MURNI dari vote: basis TETAP + bonus vote saat ini.
 * Idempoten — vote yang sama selalu menghasilkan skor yang sama,
 * mencabut vote mengembalikan skor ke basis. Jangan pernah passing
 * skor-yang-sudah-berbonus sebagai basis (itu menggembungkan skor).
 */
export function calculateReporterScore(
  baseScore: number = NEW_USER_SCORE,
  upvotes: number = 0,
  downvotes: number = 0
): number {
  const netVotes = upvotes - downvotes * 1.5;
  const voteBonus = Math.min(1.0, Math.max(-2.0, netVotes * 0.05));
  const finalScore = Math.min(5.0, Math.max(1.0, baseScore + voteBonus));
  return Number(finalScore.toFixed(1));
}

/**
 * PRD BR-2: Aggregates community reports within time window (default 6h)
 * Weighted formula:
 * w = recency_factor * reporter_trust * (1 + upvotes - downvotes)
 */
export function computeAggregatedStatus(
  reports: CommunityReport[],
  targetFuelType?: string
): {
  dominantStatus: AvailabilityStatus;
  confidence: number;
  totalWeight: number;
  latestReport?: CommunityReport;
  summaryText: string;
} {
  const relevantReports = targetFuelType
    ? reports.filter((r) => r.fuelType.toLowerCase().includes(targetFuelType.toLowerCase()))
    : reports;

  if (!relevantReports || relevantReports.length === 0) {
    return {
      dominantStatus: 'Tersedia',
      confidence: 60,
      totalWeight: 1,
      summaryText: 'Belum ada laporan baru (estimasi normal)',
    };
  }

  const weights: Record<AvailabilityStatus, number> = {
    Tersedia: 0,
    Terbatas: 0,
    Kosong: 0,
  };

  relevantReports.forEach((rep) => {
    // Recency decay: fresher reports within 30 mins have weight 1.0, decaying up to 6 hours
    const minutes = rep.minutesAgo || 10;
    const recencyFactor = Math.max(0.2, 1 - minutes / 360);

    // Reporter trust: scaled 1.0 - 5.0 => 0.5 - 2.5 weight factor
    const trustWeight = rep.reporterTrustScore / 2;

    // Upvotes / downvotes modifier
    const voteWeight = Math.max(0.2, 1 + (rep.upvotes - rep.downvotes * 1.2) * 0.1);

    const totalReportWeight = recencyFactor * trustWeight * voteWeight;
    weights[rep.status] += totalReportWeight;
  });

  const totalW = weights.Tersedia + weights.Terbatas + weights.Kosong;
  let dominant: AvailabilityStatus = 'Tersedia';
  let maxW = weights.Tersedia;

  if (weights.Kosong > maxW) {
    dominant = 'Kosong';
    maxW = weights.Kosong;
  }
  if (weights.Terbatas > maxW) {
    dominant = 'Terbatas';
    maxW = weights.Terbatas;
  }

  // If close difference between Tersedia and Kosong, default to Terbatas (ambiguous)
  if (
    Math.abs(weights.Tersedia - weights.Kosong) < 0.2 * totalW &&
    weights.Tersedia > 0 &&
    weights.Kosong > 0
  ) {
    dominant = 'Terbatas';
  }

  const confidence = totalW > 0 ? Math.round((maxW / totalW) * 100) : 50;

  return {
    dominantStatus: dominant,
    confidence: Math.min(99, Math.max(40, confidence)),
    totalWeight: totalW,
    latestReport: relevantReports[0],
    summaryText: `Status ${dominant} berdasarkan ${relevantReports.length} laporan motorist`,
  };
}

/**
 * Get station overall pin status based on fuel filter
 */
export function getStationPinStatus(
  station: GasStation,
  selectedFuelFilter: string = 'Semua'
): {
  color: 'green' | 'amber' | 'red' | 'brown' | 'gray';
  label: string;
  bgHex: string;
} {
  if (station.brand === 'Toko Madura') {
    return { color: 'brown', label: 'Ready 24 Jam', bgHex: '#894d00' };
  }

  // Data peta (OSM) tanpa info stok — jangan diklaim Tersedia/Kosong.
  if (station.fuels.length === 0) {
    return { color: 'gray', label: 'Belum ada data', bgHex: '#64748b' };
  }

  let fuelsToCheck = station.fuels;
  if (selectedFuelFilter !== 'Semua') {
    fuelsToCheck = station.fuels.filter((f) =>
      f.type.toLowerCase().includes(selectedFuelFilter.toLowerCase())
    );
  }

  if (fuelsToCheck.length === 0) {
    fuelsToCheck = station.fuels;
  }

  const hasEmpty = fuelsToCheck.some((f) => f.status === 'Kosong');
  const allEmpty = fuelsToCheck.every((f) => f.status === 'Kosong');
  const hasLimited = station.queueStatus === 'Sedang' || fuelsToCheck.some((f) => f.status === 'Terbatas');

  if (allEmpty || (hasEmpty && fuelsToCheck.length === 1)) {
    return { color: 'red', label: 'Kosong', bgHex: '#dc2626' };
  }
  if (hasEmpty) {
    return { color: 'red', label: 'Ada yang Kosong', bgHex: '#dc2626' };
  }
  if (hasLimited) {
    return { color: 'amber', label: 'Terbatas / Antre', bgHex: '#d97706' };
  }

  return { color: 'green', label: 'Tersedia', bgHex: '#059669' };
}

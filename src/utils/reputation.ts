import { CommunityReport, AvailabilityStatus, GasStation } from '../types';

export interface ReputationTier {
  label: string;
  badgeColor: string;
  minScore: number;
  icon: string;
}

export const REPUTATION_TIERS: ReputationTier[] = [
  { label: 'Master Komunitas', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300', minScore: 4.8, icon: 'military_tech' },
  { label: 'Kontributor Terpercaya', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300', minScore: 4.5, icon: 'verified' },
  { label: 'Motorist Aktif', badgeColor: 'bg-sky-100 text-sky-800 border-sky-300', minScore: 3.5, icon: 'two_wheeler' },
  { label: 'Warga Baru', badgeColor: 'bg-slate-100 text-slate-700 border-slate-300', minScore: 1.0, icon: 'person' },
];

export function getReputationTier(score: number): ReputationTier {
  for (const tier of REPUTATION_TIERS) {
    if (score >= tier.minScore) {
      return tier;
    }
  }
  return REPUTATION_TIERS[REPUTATION_TIERS.length - 1];
}

/**
 * Calculates dynamic reporter trust score (1.0 to 5.0)
 * based on upvotes, downvotes and verified history.
 */
export function calculateReporterScore(
  baseScore: number = 4.5,
  upvotes: number = 0,
  downvotes: number = 0,
  totalReports: number = 1
): number {
  const netVotes = upvotes - downvotes * 1.5;
  const voteBonus = Math.min(1.0, Math.max(-2.0, netVotes * 0.05));
  const activityBonus = Math.min(0.5, totalReports * 0.02);

  const finalScore = Math.min(5.0, Math.max(1.0, baseScore + voteBonus + activityBonus));
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

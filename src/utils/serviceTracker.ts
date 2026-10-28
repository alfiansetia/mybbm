import { Vehicle, FuelLog } from '../types';

export interface ServiceChecklistItem {
  name: string;
  desc: string;
  priority: 'Kritis' | 'Penting' | 'Sedang';
}

export interface ServiceCalculationResult {
  currentMileage: number;
  serviceInterval: number;
  lastServiceMileage: number;
  nextServiceMileage: number;
  remainingKm: number;
  progressPercentage: number;
  isWarning: boolean; // Triggered if remainingKm <= 500 km
  isUrgent: boolean;  // Triggered if remainingKm <= 200 km
  isOverdue: boolean; // Triggered if remainingKm <= 0 km
  avgDailyKm: number;
  estimatedDaysLeft: number;
  statusLabel: string;
  severity: 'normal' | 'warning' | 'urgent' | 'overdue';
  checklist: ServiceChecklistItem[];
}

/**
 * ServiceTracker Utility
 * Calculates remaining distance until periodic vehicle maintenance
 * and triggers visual warnings if below 500 km.
 */
export const ServiceTracker = {
  WARNING_THRESHOLD_KM: 500,
  URGENT_THRESHOLD_KM: 200,

  /**
   * Determine periodic service interval according to vehicle type in Indonesia
   * Motor: 3,000 km (oli mesin & perawatan berkala skutik / bebek)
   * Mobil: 5,000 km (oli mesin & servis berkala)
   */
  getServiceInterval(vehicleType: 'motor' | 'mobil'): number {
    return vehicleType === 'motor' ? 3000 : 5000;
  },

  /**
   * Calculate exact remaining distance until next scheduled service
   */
  calculateRemainingDistance(
    currentMileage: number,
    serviceInterval: number,
    lastServiceMileage?: number | null
  ): number {
    let baseline = lastServiceMileage;
    if (baseline === undefined || baseline === null || isNaN(baseline) || baseline > currentMileage) {
      baseline = Math.floor(currentMileage / serviceInterval) * serviceInterval;
    }
    const nextTarget = baseline + serviceInterval;
    return nextTarget - currentMileage;
  },

  /**
   * Check if vehicle mileage triggers a visual warning (below 500km threshold)
   */
  isWarningBelow500Km(remainingKm: number, threshold: number = 500): boolean {
    return remainingKm <= threshold;
  },

  /**
   * Calculate progress percentage toward service milestone (0 - 100%)
   */
  calculateProgress(remainingKm: number, serviceInterval: number): number {
    const passed = serviceInterval - remainingKm;
    return Math.min(100, Math.max(0, Math.round((passed / serviceInterval) * 100)));
  },

  /**
   * Compute average daily mileage based on chronological fuel logs
   */
  calculateDailyMileage(
    logs: FuelLog[],
    vehicleId: string,
    defaultDailyKm: number = 25
  ): number {
    const vehicleLogs = logs.filter((l) => l.vehicleId === vehicleId && l.odometer > 0);
    if (vehicleLogs.length < 2) return defaultDailyKm;

    const sorted = [...vehicleLogs].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const dayDiff = Math.max(
      1,
      Math.round(
        (new Date(last.dateTime).getTime() - new Date(first.dateTime).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const distanceDiff = last.odometer - first.odometer;

    if (distanceDiff > 0 && dayDiff > 0) {
      return Math.max(5, Math.round(distanceDiff / dayDiff));
    }
    return defaultDailyKm;
  },

  /**
   * Full service evaluation for a vehicle
   */
  evaluateServiceStatus(
    vehicle: Vehicle,
    logs: FuelLog[] = [],
    customBaselineOdo?: number | null
  ): ServiceCalculationResult {
    const vehicleLogs = logs.filter((l) => l.vehicleId === vehicle.id);
    const maxLogOdo =
      vehicleLogs.length > 0 ? Math.max(...vehicleLogs.map((l) => l.odometer || 0)) : 0;
    const currentMileage = Math.max(vehicle.currentOdo || 0, maxLogOdo);

    const serviceInterval = this.getServiceInterval(vehicle.type);

    let baseline = customBaselineOdo;
    if (baseline === undefined || baseline === null || isNaN(baseline) || baseline > currentMileage) {
      baseline = Math.floor(currentMileage / serviceInterval) * serviceInterval;
    }

    const nextServiceMileage = baseline + serviceInterval;
    const remainingKm = nextServiceMileage - currentMileage;
    const isOverdue = remainingKm <= 0;
    const isUrgent = remainingKm <= this.URGENT_THRESHOLD_KM;
    const isWarning = this.isWarningBelow500Km(remainingKm, this.WARNING_THRESHOLD_KM);

    const progressPercentage = this.calculateProgress(remainingKm, serviceInterval);

    const defaultDaily = vehicle.type === 'motor' ? 25 : 35;
    const avgDailyKm = this.calculateDailyMileage(vehicleLogs, vehicle.id, defaultDaily);
    const estimatedDaysLeft = isOverdue ? 0 : Math.max(1, Math.round(remainingKm / avgDailyKm));

    let severity: 'normal' | 'warning' | 'urgent' | 'overdue' = 'normal';
    let statusLabel = 'Normal';

    if (isOverdue) {
      severity = 'overdue';
      statusLabel = `Jadwal Terlewati (+${Math.abs(remainingKm)} km)`;
    } else if (isUrgent) {
      severity = 'urgent';
      statusLabel = `Segera Servis (Sisa ${remainingKm} km)`;
    } else if (isWarning) {
      severity = 'warning';
      statusLabel = `Perlu Servis (Sisa ${remainingKm} km)`;
    } else {
      severity = 'normal';
      statusLabel = `Kondisi Prima (Sisa ${remainingKm} km)`;
    }

    const checklist: ServiceChecklistItem[] =
      vehicle.type === 'motor'
        ? [
            { name: 'Ganti Oli Mesin', desc: 'Wajib tiap 2.000–3.000 km', priority: 'Kritis' },
            { name: 'Ganti Oli Gardan / CVT', desc: 'Tiap 6.000–8.000 km', priority: 'Sedang' },
            { name: 'Pembersihan & Cek CVT', desc: 'Cek roller & v-belt', priority: 'Penting' },
            { name: 'Cek Kampas & Minyak Rem', desc: 'Pastikan rem pakem & aman', priority: 'Kritis' },
            { name: 'Filter Udara & Busi', desc: 'Jaga efisiensi bahan bakar', priority: 'Sedang' },
          ]
        : [
            { name: 'Ganti Oli Mesin & Filter Oli', desc: 'Wajib tiap 5.000–10.000 km', priority: 'Kritis' },
            { name: 'Pemeriksaan Radiator Coolant', desc: 'Cegah mesin overheat', priority: 'Penting' },
            { name: 'Filter Udara & Filter AC', desc: 'Jaga performa & sirkulasi udara', priority: 'Penting' },
            { name: 'Cek Minyak & Kampas Rem 4 Roda', desc: 'Pemeriksaan sistem rem', priority: 'Kritis' },
            { name: 'Rotasi Ban & Tekanan Angin', desc: 'Keausan merata & hemat BBM', priority: 'Sedang' },
          ];

    return {
      currentMileage,
      serviceInterval,
      lastServiceMileage: baseline,
      nextServiceMileage,
      remainingKm,
      progressPercentage,
      isWarning,
      isUrgent,
      isOverdue,
      avgDailyKm,
      estimatedDaysLeft,
      statusLabel,
      severity,
      checklist,
    };
  },
};

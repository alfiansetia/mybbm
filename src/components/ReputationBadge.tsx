import React from 'react';

export type MedalTier = 'gold' | 'silver' | 'bronze';

export interface MedalConfig {
  tier: MedalTier;
  label: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  iconColor: string;
  iconName: string;
}

export function getMedalConfig(score: number): MedalConfig {
  if (score >= 4.8) {
    return {
      tier: 'gold',
      label: 'Gold',
      badgeBg: 'bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/10',
      textColor: 'text-amber-900',
      borderColor: 'border-amber-400/80',
      iconColor: 'text-amber-600',
      iconName: 'military_tech',
    };
  }
  if (score >= 4.2) {
    return {
      tier: 'silver',
      label: 'Silver',
      badgeBg: 'bg-gradient-to-r from-slate-200/80 via-slate-100 to-slate-200/50',
      textColor: 'text-slate-800',
      borderColor: 'border-slate-300',
      iconColor: 'text-slate-600',
      iconName: 'workspace_premium',
    };
  }
  return {
    tier: 'bronze',
    label: 'Bronze',
    badgeBg: 'bg-gradient-to-r from-orange-200/40 via-amber-100/60 to-orange-200/30',
    textColor: 'text-amber-950',
    borderColor: 'border-amber-600/40',
    iconColor: 'text-amber-700',
    iconName: 'shield',
  };
}

export interface ReputationBadgeProps {
  credibilityScore: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showScore?: boolean;
  className?: string;
}

export const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  credibilityScore,
  size = 'sm',
  showLabel = true,
  showScore = true,
  className = '',
}) => {
  const config = getMedalConfig(credibilityScore);

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    xs: 'text-[12px]',
    sm: 'text-[14px]',
    md: 'text-[16px]',
    lg: 'text-[20px]',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border shadow-xs transition-all select-none ${config.badgeBg} ${config.textColor} ${config.borderColor} ${sizeClasses} ${className}`}
      title={`Reputasi ${config.label} • Skor Kredibilitas: ${credibilityScore.toFixed(1)} ★`}
    >
      {/* Medal Icon (Bronze, Silver, Gold) */}
      <span
        className={`material-symbols-outlined shrink-0 ${config.iconColor} ${iconSizes}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {config.iconName}
      </span>

      {/* Tier Label */}
      {showLabel && (
        <span className="font-bold tracking-tight">
          {config.label}
        </span>
      )}

      {/* Score */}
      {showScore && (
        <span className="inline-flex items-center gap-0.5 tabular-nums font-extrabold ml-0.5">
          <span>{credibilityScore.toFixed(1)}</span>
          <span className="text-[9px] opacity-75">★</span>
        </span>
      )}
    </span>
  );
};

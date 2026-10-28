import React from 'react';
import { getReputationTier } from '../utils/reputation';

export interface MedalConfig {
  label: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  iconColor: string;
  iconName: string;
}

/** Badge selalu cermin tabel REPUTATION_TIERS — tidak ada ambang sendiri. */
export function getMedalConfig(score: number): MedalConfig {
  const tier = getReputationTier(score);
  return {
    label: tier.label,
    badgeBg: tier.badgeBg,
    textColor: tier.textColor,
    borderColor: tier.borderColor,
    iconColor: tier.iconColor,
    iconName: tier.icon,
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

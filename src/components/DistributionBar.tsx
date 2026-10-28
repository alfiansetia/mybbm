import React from 'react';

export interface DistributionItem {
  label: string;
  sub: string;
  pct: number;
  color: string;
}

interface DistributionBarProps {
  items: DistributionItem[];
  emptyText: string;
  maxItems?: number;
}

/** Bar distribusi + legenda terpusat (dipakai komposisi brand & BBM). */
export const DistributionBar: React.FC<DistributionBarProps> = ({
  items,
  emptyText,
  maxItems = 2,
}) => {
  const shown = items.slice(0, maxItems);
  if (shown.length === 0) {
    return (
      <p className="text-[11px] text-slate-400 py-2 text-center">{emptyText}</p>
    );
  }
  return (
    <>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5 gap-0.5">
        {shown.map((item, i) => (
          <div
            key={item.label}
            className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${
              i === shown.length - 1 ? 'rounded-r-full' : ''
            }`}
            style={{ width: `${item.pct}%`, backgroundColor: item.color }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between pt-0.5 text-xs flex-wrap gap-1">
        {shown.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-slate-800 font-medium">{item.label}</span>
            <span className="text-slate-400 text-[10px] font-bold">
              ({item.pct}% · {item.sub})
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { id as localeId } from 'date-fns/locale';
import { Modal } from './Modal';
import { formatDisplayDateTime } from '../utils/format';

interface DateTimePickerSheetProps {
  initial: Date;
  max?: Date;
  onPick: (date: Date) => void;
  onClose: () => void;
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex-1 flex flex-col items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl py-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          aria-label={`Kurangi ${label}`}
          className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 font-bold active:scale-95 transition-transform"
        >
          −
        </button>
        <span className="text-xl font-extrabold text-slate-900 tabular-nums w-10 text-center">
          {pad(value)}
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          aria-label={`Tambah ${label}`}
          className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 font-bold active:scale-95 transition-transform"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Picker tanggal + jam custom (bottom-sheet): kalender DayPicker + stepper jam. */
export const DateTimePickerSheet: React.FC<DateTimePickerSheetProps> = ({
  initial,
  max,
  onPick,
  onClose,
}) => {
  const upper = max ?? new Date();
  const [day, setDay] = useState<Date>(initial > upper ? upper : initial);
  const [hour, setHour] = useState(initial.getHours());
  const [minute, setMinute] = useState(initial.getMinutes());

  const composed = new Date(day);
  composed.setHours(hour, minute, 0, 0);
  const clamped = composed > upper ? upper : composed;

  return (
    <Modal
      icon="calendar_today"
      title="Pilih Tanggal & Jam"
      subtitle="Kapan pengisian dilakukan?"
      onClose={onClose}
      position="sheet"
    >
      <div className="flex flex-col gap-3">
        <div className="[--rdp-accent-color:#006194] flex justify-center">
          <DayPicker
            mode="single"
            locale={localeId}
            weekStartsOn={1}
            selected={day}
            onSelect={(d) => d && setDay(d)}
            disabled={{ after: upper }}
            captionLayout="dropdown"
          />
        </div>

        <div className="flex gap-2">
          <Stepper label="Jam" value={hour} min={0} max={23} onChange={setHour} />
          <Stepper label="Menit" value={minute} min={0} max={59} onChange={setMinute} />
        </div>

        <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
          <span className="text-xs font-bold text-[#004b73]">
            {formatDisplayDateTime(clamped)}
          </span>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setDay(now);
              setHour(now.getHours());
              setMinute(now.getMinutes());
            }}
            className="text-[11px] font-bold text-[#006194] underline"
          >
            Sekarang
          </button>
        </div>

        <button
          type="button"
          onClick={() => onPick(clamped)}
          className="w-full h-11 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-bold active:scale-[0.99] transition"
        >
          Pilih Waktu Ini
        </button>
      </div>
    </Modal>
  );
};

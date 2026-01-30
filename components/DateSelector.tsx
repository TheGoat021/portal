'use client';

import { useState, useEffect } from 'react';

export function DateSelector({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  // 🔹 estados temporários
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  // 🔹 sync quando o pai muda
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  function setToday() {
    onChange(today, today);
  }

  function setYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.toISOString().slice(0, 10);
    onChange(y, y);
  }

  function applyDates() {
    if (!tempStart || !tempEnd) return;
    onChange(tempStart, tempEnd);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={setToday}
        className="px-4 py-2 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10"
      >
        Hoje
      </button>

      <button
        onClick={setYesterday}
        className="px-4 py-2 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10"
      >
        Ontem
      </button>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={tempStart}
          onChange={(e) => setTempStart(e.target.value)}
          className="bg-black border border-green-500/40 text-gray-200 rounded px-2 py-1"
        />

        <span className="text-gray-400">até</span>

        <input
          type="date"
          value={tempEnd}
          onChange={(e) => setTempEnd(e.target.value)}
          className="bg-black border border-green-500/40 text-gray-200 rounded px-2 py-1"
        />
      </div>

      <button
        onClick={applyDates}
        className="px-4 py-2 rounded-md bg-green-600 text-black font-medium hover:bg-green-500"
      >
        Aplicar
      </button>
    </div>
  );
}
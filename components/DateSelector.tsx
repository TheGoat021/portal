'use client';

import { useEffect, useState } from 'react';

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

  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

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
    <div className="flex flex-wrap items-center gap-2">
      {/* Botões rápidos */}
      <QuickButton label="Hoje" onClick={setToday} />
      <QuickButton label="Ontem" onClick={setYesterday} />

      {/* Datas */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={tempStart}
          onChange={(e) => setTempStart(e.target.value)}
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />

        <span className="text-sm text-gray-500">até</span>

        <input
          type="date"
          value={tempEnd}
          onChange={(e) => setTempEnd(e.target.value)}
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Aplicar */}
      <button
        onClick={applyDates}
        className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        Aplicar
      </button>
    </div>
  );
}

function QuickButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
    >
      {label}
    </button>
  );
}
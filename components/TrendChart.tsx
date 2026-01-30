'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type TrendItem = {
  date: string;
  conversions: number;
};

/* 🔹 Formata data ISO → DD/MM */
function formatDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}`;
}

export function TrendChart({ data }: { data: TrendItem[] }) {
  return (
    <div className="bg-black border border-green-500 rounded-xl p-6 text-gray-200 h-full">
      <h2 className="text-green-400 mb-4">Tendência de Conversões</h2>

      {data.length === 0 ? (
        <p className="text-sm text-gray-400">
          Nenhum dado disponível no período selecionado
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
            />

            <YAxis stroke="#6b7280" />

            <Tooltip
              labelFormatter={(label) =>
                formatDate(label as string)
              }
            />

            <Line
              type="monotone"
              dataKey="conversions"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
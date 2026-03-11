'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Dot,
} from 'recharts';

type TrendItem = {
  date: string;
  conversions: number;
};

function formatDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}`;
}

/* 🔹 Define cor baseado na variação */
function getColor(current: number, previous?: number) {
  if (previous === undefined) return '#facc15'; // amarelo início

  if (current > previous) return '#22c55e'; // verde subida
  if (current < previous) return '#ef4444'; // vermelho queda

  return '#facc15'; // amarelo estável
}

export function TrendChart({ data }: { data: TrendItem[] }) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        Nenhum dado disponível no período selecionado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Tendência de Conversões
        </h3>
        <p className="text-sm text-gray-500">
          Evolução das conversões ao longo do período.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
          />

          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#6b7280"
            fontSize={12}
          />

          <YAxis
            stroke="#6b7280"
            fontSize={12}
          />

          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 13,
            }}
            labelFormatter={(label) =>
              formatDate(label as string)
            }
          />

          <Line
            type="monotone"
            dataKey="conversions"
            stroke="#facc15"
            strokeWidth={3}
            dot={(props: any) => {
              const { cx, cy, index } = props;

              const prev =
                index > 0 ? data[index - 1].conversions : undefined;

              const color = getColor(
                data[index].conversions,
                prev
              );

              return (
                <Dot
                  cx={cx}
                  cy={cy}
                  r={4}
                  stroke="white"
                  strokeWidth={2}
                  fill={color}
                />
              );
            }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
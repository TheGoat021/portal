type FunnelData = {
  impressions: number;
  clicks: number;
  leads: number;
  sales: number;
};

function formatValue(value: number) {
  return Math.round(value).toLocaleString('pt-BR');
}

export function FunnelChart({ data }: { data: FunnelData }) {
  const steps = [
    {
      label: 'Impressões',
      value: data.impressions,
      gradient: 'from-red-500 to-red-600',
    },
    {
      label: 'Cliques',
      value: data.clicks,
      gradient: 'from-orange-400 to-orange-500',
    },
    {
      label: 'Leads',
      value: data.leads,
      gradient: 'from-yellow-400 to-yellow-500',
    },
    {
      label: 'Vendas',
      value: data.sales,
      gradient: 'from-green-500 to-green-600',
    },
  ];

  const maxWidth = 100;
  const minWidth = 55;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Funil de conversão
        </h3>
        <p className="text-sm text-gray-500">
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
        <div className="flex flex-col items-center gap-1">
          {steps.map((step, index) => {
            const width =
              maxWidth -
              index * ((maxWidth - minWidth) / (steps.length - 1));

            return (
              <div
                key={step.label}
                className={`flex h-16 items-center justify-center text-white font-semibold bg-gradient-to-r ${step.gradient}`}
                style={{
                  width: `${width}%`,
                  clipPath:
                    'polygon(6% 0%, 94% 0%, 86% 100%, 14% 100%)',
                }}
              >
                <div className="text-center leading-tight">
                  <p className="text-sm opacity-90">
                    {step.label}
                  </p>
                  <p className="text-lg font-bold">
                    {formatValue(step.value)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
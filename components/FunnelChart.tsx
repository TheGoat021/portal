type FunnelData = {
  impressions: number;
  clicks: number;
  leads: number;
  sales: number;
};

export function FunnelChart({ data }: { data: FunnelData }) {
  const steps = [
    { label: 'Impressões', value: data.impressions },
    { label: 'Cliques', value: data.clicks },
    { label: 'Leads', value: data.leads },
    { label: 'Vendas', value: data.sales },
  ];

  const maxWidth = 360;
  const minWidth = 140;

  return (
    <div className="bg-black rounded-xl p-6 border border-green-500 text-gray-200">
      <h2 className="text-green-400 mb-6">Funil</h2>

      <div className="flex flex-col items-center gap-2">
        {steps.map((step, index) => {
          const width =
            maxWidth -
            index * ((maxWidth - minWidth) / (steps.length - 1));

          return (
            <div
              key={step.label}
              className="relative flex items-center justify-center"
              style={{
                width: `${width}px`,
                height: '56px',
                clipPath:
                  'polygon(10% 0%, 90% 0%, 80% 100%, 20% 100%)',
                background:
                  'linear-gradient(180deg, #14532d, #166534)',
              }}
            >
              <div className="text-center">
                <p className="text-sm text-green-400 font-medium">
                  {step.label}
                </p>
                <p className="text-white text-sm font-semibold">
                  {Math.round(step.value).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
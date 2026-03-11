type Campaign = {
  campaign_name?: string;
  platform: string;
  clicks: number;
  cost: number;
  conversions: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);
}

function getPlatformBadge(platform: string) {
  if (platform === 'google') {
    return 'bg-blue-50 text-blue-700 border border-blue-100';
  }

  if (platform === 'meta') {
    return 'bg-sky-50 text-sky-700 border border-sky-100';
  }

  return 'bg-gray-50 text-gray-700 border border-gray-200';
}

export function CampaignsTable({
  campaigns,
}: {
  campaigns: Campaign[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Campanhas recentes
        </h3>
        <p className="text-sm text-gray-500">
          Acompanhe cliques, custo e conversões por campanha.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr className="border-b border-gray-200">
                <th className="px-5 py-3 text-left font-semibold">Campanha</th>
                <th className="px-5 py-3 text-left font-semibold">Plataforma</th>
                <th className="px-5 py-3 text-right font-semibold">Cliques</th>
                <th className="px-5 py-3 text-right font-semibold">Custo</th>
                <th className="px-5 py-3 text-right font-semibold">Conversões</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {campaigns.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Nenhuma campanha encontrada no período selecionado.
                  </td>
                </tr>
              ) : (
                campaigns.map((c, i) => (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      <div className="max-w-[280px]">
                        <p className="truncate font-medium text-gray-900">
                          {c.campaign_name ?? '—'}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getPlatformBadge(
                          c.platform
                        )}`}
                      >
                        {c.platform}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right text-gray-700">
                      {Number(c.clicks ?? 0).toLocaleString('pt-BR')}
                    </td>

                    <td className="px-5 py-4 text-right text-gray-700">
                      {formatCurrency(Number(c.cost ?? 0))}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span className="font-semibold text-gray-900">
                        {Number(c.conversions ?? 0).toLocaleString('pt-BR')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
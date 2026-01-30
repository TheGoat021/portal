type Campaign = {
  campaign_name?: string;
  platform: string;
  clicks: number;
  cost: number;
  conversions: number;
};

export function CampaignsTable({ campaigns }: { campaigns: any[] }) {
  return (
    <div className="bg-black border border-green-500 rounded-xl p-6 text-gray-200">
      <h2 className="text-green-400 mb-4">Campanhas Recentes</h2>

      <table className="w-full text-sm">
        <thead className="text-gray-400 border-b border-green-500/30">
          <tr>
            <th className="text-left py-2">Campanha</th>
            <th className="text-left">Plataforma</th>
            <th className="text-right">Cliques</th>
            <th className="text-right">Custo (R$)</th>
            <th className="text-right">Conversões</th>
          </tr>
        </thead>

        <tbody>
          {campaigns.map((c, i) => (
            <tr
              key={i}
              className="border-b border-green-500/10 last:border-0 hover:bg-green-500/5"
            >
              <td className="py-2">
                {c.campaign_name ?? '—'}
              </td>
              <td className="capitalize text-gray-300">{c.platform}</td>
              <td className="text-right">{c.clicks}</td>
              <td className="text-right">
                R$ {Number(c.cost ?? 0).toLocaleString('pt-BR')}
              </td>
              <td className="text-right text-green-400 font-medium">
                {c.conversions ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
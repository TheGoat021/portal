'use client';

import { useEffect, useState } from 'react';

import { getDashboardOverview } from '@/services/dashboard.service';
import { CampaignsTable } from '@/components/CampaignsTable';
import { TopCampaigns } from '@/components/TopCampaigns';
import { TrendChart } from '@/components/TrendChart';
import { FunnelChart } from '@/components/FunnelChart';
import { DateSelector } from '@/components/DateSelector';

const CUSTOMER_ID = 1471558083175379; // Meta Ads (numeric)

export default function MetaVisaoGeralPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [overview, setOverview] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [topCampaigns, setTopCampaigns] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard(start: string, end: string) {
    setLoading(true);

    try {
      const overviewRes = await getDashboardOverview(
        CUSTOMER_ID,
        start,
        end,
        'meta'
      );

      if (!overviewRes?.success) {
        throw new Error('Erro ao carregar overview');
      }

      const campaignsRes = await fetch(
        `/api/dashboard/campaigns?customerId=${CUSTOMER_ID}&platform=meta&startDate=${start}&endDate=${end}`
      ).then((r) => r.json());

      if (!campaignsRes?.success) {
        throw new Error('Erro ao carregar campanhas');
      }

      const trendRes = await fetch(
        `/api/dashboard/trend?customerId=${CUSTOMER_ID}&platform=meta&startDate=${start}&endDate=${end}`
      ).then((r) => r.json());

      if (!trendRes?.success) {
        throw new Error('Erro ao carregar tendência');
      }

      setOverview(overviewRes.data);

      // 🔧 CORREÇÃO: o endpoint retorna um array direto
      setCampaigns(campaignsRes.data);
      setTopCampaigns(campaignsRes.data);

      setTrend(trendRes.data);
    } catch (err) {
      console.error('DASHBOARD META ERROR', err);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard(startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p>Carregando...</p>;
  if (!overview) return <p>Erro ao carregar dados</p>;

  const { kpis, funnel } = overview;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-xl text-green-400 font-semibold">
          Meta Ads — Visão Geral
        </h1>

        <DateSelector
          startDate={startDate}
          endDate={endDate}
          onChange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
            loadDashboard(s, e);
          }}
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="Investimento" value={kpis.investimento} />
        <KpiCard title="CPC" value={kpis.cpc} />
        <KpiCard title="CTR" value={kpis.ctr} />
        <KpiCard title="CPA" value={kpis.cpa} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <FunnelChart data={funnel} />
        <div className="col-span-2">
          <TrendChart data={trend} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <CampaignsTable campaigns={campaigns} />
        </div>
        <TopCampaigns campaigns={topCampaigns} />
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-black border border-green-500 rounded-xl p-4 text-gray-200">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-xl text-green-400 font-semibold">
        {value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
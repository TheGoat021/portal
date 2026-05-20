"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ModuleKey =
  | "WhatsApp"
  | "CRM"
  | "Vendas"
  | "Marketing"
  | "Treinamento"
  | "Financeiro"
  | "Relatórios";

type QuickCard = {
  label: string;
  value: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: string[];
  cards?: QuickCard[];
};

type SidebarItem = {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  tags?: string[];
  chatTitle: string;
  messages: ChatMessage[];
};

const modules: ModuleKey[] = [
  "WhatsApp",
  "CRM",
  "Vendas",
  "Marketing",
  "Treinamento",
  "Financeiro",
  "Relatórios",
];

const sidebarByModule: Record<ModuleKey, SidebarItem[]> = {
  WhatsApp: [
    {
      id: "wpp-maria",
      title: "Maria Oliveira",
      subtitle: "Precisamos ajustar o vencimento do boleto.",
      time: "09:14",
      tags: ["Novo lead", "Comercial"],
      chatTitle: "Maria Oliveira · WhatsApp",
      messages: [
        { id: "1", role: "user", text: "Oi, quero entender os planos disponíveis." },
        {
          id: "2",
          role: "assistant",
          text: "Claro. Posso te mostrar os planos por faixa de investimento e tempo de contrato.",
          actions: ["Enviar tabela", "Falar com consultor"],
        },
      ],
    },
    {
      id: "wpp-carlos",
      title: "Carlos Mendes",
      subtitle: "Conseguiu confirmar meu contrato?",
      time: "08:47",
      tags: ["Pós-vendas"],
      chatTitle: "Carlos Mendes · WhatsApp",
      messages: [
        { id: "1", role: "user", text: "Conseguiu confirmar meu contrato?" },
        {
          id: "2",
          role: "assistant",
          text: "Sim. Seu contrato está ativo e com renovação prevista para 15/08.",
        },
      ],
    },
    {
      id: "wpp-ana",
      title: "Ana Souza",
      subtitle: "Quero cancelar no fim do ciclo.",
      time: "Ontem",
      tags: ["Risco"],
      chatTitle: "Ana Souza · WhatsApp",
      messages: [
        { id: "1", role: "user", text: "Quero cancelar no fim do ciclo." },
        {
          id: "2",
          role: "assistant",
          text: "Entendi. Posso abrir um plano de retenção e te apresentar alternativas antes do cancelamento.",
          actions: ["Abrir retenção", "Registrar cancelamento"],
        },
      ],
    },
    {
      id: "wpp-joao",
      title: "João Pereira",
      subtitle: "Pode me mandar o link de pagamento?",
      time: "Ontem",
      tags: ["Comercial"],
      chatTitle: "João Pereira · WhatsApp",
      messages: [
        { id: "1", role: "user", text: "Pode me mandar o link de pagamento?" },
        {
          id: "2",
          role: "assistant",
          text: "Perfeito. Segue o link seguro para pagamento e confirmação imediata.",
          actions: ["Gerar novo link", "Ver faturas"],
        },
      ],
    },
    {
      id: "wpp-grupo",
      title: "Grupo Comercial",
      subtitle: "Meta do dia: 18 vendas.",
      time: "Seg",
      tags: ["Comercial"],
      chatTitle: "Grupo Comercial · WhatsApp",
      messages: [
        { id: "1", role: "user", text: "Meta do dia: 18 vendas." },
        {
          id: "2",
          role: "assistant",
          text: "Atualização automática: 11 vendas concluídas, 4 em negociação avançada.",
        },
      ],
    },
  ],
  CRM: [
    {
      id: "crm-ia",
      title: "Axion IA - CRM",
      subtitle: "Central de operações comerciais",
      chatTitle: "Axion IA - CRM",
      messages: [
        { id: "1", role: "user", text: "Quero cadastrar uma nova venda." },
        {
          id: "2",
          role: "assistant",
          text: "Perfeito. Para cadastrar a venda, preciso confirmar alguns dados: cliente, CPF, plano contratado, valor pago e vendedor responsável.",
          actions: ["Buscar cliente", "Preencher manualmente", "Usar conversa atual"],
        },
      ],
    },
    {
      id: "crm-cadastrar",
      title: "Cadastrar nova venda",
      chatTitle: "Cadastrar nova venda",
      messages: [
        { id: "1", role: "user", text: "Iniciar cadastro de nova venda." },
        {
          id: "2",
          role: "assistant",
          text: "Início rápido pronto. Escolha se deseja importar dados do lead ou cadastrar do zero.",
          actions: ["Importar lead", "Cadastrar do zero"],
        },
      ],
    },
    {
      id: "crm-consultar",
      title: "Consultar cliente",
      chatTitle: "Consultar cliente",
      messages: [
        { id: "1", role: "user", text: "Quero consultar um cliente." },
        {
          id: "2",
          role: "assistant",
          text: "Digite nome, CPF ou telefone para localizar rapidamente no CRM.",
        },
      ],
    },
    {
      id: "crm-contrato",
      title: "Atualizar contrato",
      chatTitle: "Atualizar contrato",
      messages: [
        { id: "1", role: "user", text: "Preciso atualizar um contrato." },
        {
          id: "2",
          role: "assistant",
          text: "Posso te guiar por aditivo, renovação ou alteração de plano.",
          actions: ["Aditivo", "Renovação", "Alterar plano"],
        },
      ],
    },
    {
      id: "crm-leads",
      title: "Leads em aberto",
      chatTitle: "Leads em aberto",
      messages: [
        { id: "1", role: "user", text: "Me mostra leads em aberto." },
        {
          id: "2",
          role: "assistant",
          text: "Você possui 27 leads sem fechamento, com 9 em estágio de proposta.",
        },
      ],
    },
    {
      id: "crm-pendencias",
      title: "Clientes com pendência",
      chatTitle: "Clientes com pendência",
      messages: [
        { id: "1", role: "user", text: "Quais clientes têm pendências?" },
        {
          id: "2",
          role: "assistant",
          text: "Foram encontrados 14 clientes com pendências de documentação ou pagamento.",
        },
      ],
    },
    {
      id: "crm-pipeline",
      title: "Pipeline comercial",
      chatTitle: "Pipeline comercial",
      messages: [
        { id: "1", role: "user", text: "Resumo do pipeline comercial." },
        {
          id: "2",
          role: "assistant",
          text: "Pipeline atual: 41 oportunidades, sendo 12 em negociação final.",
        },
      ],
    },
  ],
  Vendas: [
    {
      id: "ven-resumo",
      title: "Resumo do mês",
      chatTitle: "Resumo do mês",
      messages: [
        { id: "1", role: "user", text: "Me dá o resumo do mês." },
        {
          id: "2",
          role: "assistant",
          text: "Mês com ritmo de crescimento estável, acima da meta semanal em 8%.",
          cards: [
            { label: "Vendas", value: "93" },
            { label: "Receita", value: "R$ 184.700" },
            { label: "Conversão", value: "21,4%" },
          ],
        },
      ],
    },
    {
      id: "ven-ranking",
      title: "Ranking de vendedores",
      chatTitle: "Ranking de vendedores",
      messages: [
        { id: "1", role: "user", text: "Mostra ranking de vendedores." },
        {
          id: "2",
          role: "assistant",
          text: "Top 3 vendedores: Larissa, Mateus e Rafael.",
        },
      ],
    },
    {
      id: "ven-origem",
      title: "Vendas por origem",
      chatTitle: "Vendas por origem",
      messages: [
        { id: "1", role: "user", text: "Como estão as vendas por origem?" },
        {
          id: "2",
          role: "assistant",
          text: "Maior volume vindo de tráfego pago, seguido por indicação.",
        },
      ],
    },
    {
      id: "ven-pendentes",
      title: "Vendas pendentes",
      chatTitle: "Vendas pendentes",
      messages: [
        { id: "1", role: "user", text: "Quero ver vendas pendentes." },
        {
          id: "2",
          role: "assistant",
          text: "Existem 16 vendas pendentes de confirmação de pagamento.",
        },
      ],
    },
    {
      id: "ven-ganhos",
      title: "Clientes ganhos",
      chatTitle: "Clientes ganhos",
      messages: [
        { id: "1", role: "user", text: "Clientes ganhos nesta semana." },
        {
          id: "2",
          role: "assistant",
          text: "Foram 22 clientes ganhos nos últimos 7 dias.",
        },
      ],
    },
    {
      id: "ven-perdidos",
      title: "Clientes perdidos",
      chatTitle: "Clientes perdidos",
      messages: [
        { id: "1", role: "user", text: "Clientes perdidos no período." },
        {
          id: "2",
          role: "assistant",
          text: "Foram 6 perdas, com principal motivo: preço e timing.",
        },
      ],
    },
  ],
  Marketing: [
    {
      id: "mkt-dashboard",
      title: "Dashboard de campanhas",
      chatTitle: "Dashboard de campanhas",
      messages: [
        { id: "1", role: "user", text: "Como está o desempenho das campanhas?" },
        {
          id: "2",
          role: "assistant",
          text: "Google Ads teve melhor ROAS, enquanto Meta Ads gerou mais volume de leads. Existem 3 campanhas com CPL acima do ideal.",
        },
      ],
    },
    {
      id: "mkt-google",
      title: "Google Ads",
      chatTitle: "Google Ads",
      messages: [
        { id: "1", role: "user", text: "Resumo de Google Ads." },
        {
          id: "2",
          role: "assistant",
          text: "ROAS médio em 5.2x com CPC estável na última semana.",
        },
      ],
    },
    {
      id: "mkt-meta",
      title: "Meta Ads",
      chatTitle: "Meta Ads",
      messages: [
        { id: "1", role: "user", text: "Resumo de Meta Ads." },
        {
          id: "2",
          role: "assistant",
          text: "Maior alcance e volume de leads, porém CPL acima do alvo em 12%.",
        },
      ],
    },
    {
      id: "mkt-cpl",
      title: "CPL",
      chatTitle: "CPL",
      messages: [
        { id: "1", role: "user", text: "Qual o CPL atual?" },
        {
          id: "2",
          role: "assistant",
          text: "CPL consolidado em R$ 37, com variação positiva em campanhas de topo.",
        },
      ],
    },
    {
      id: "mkt-cac",
      title: "CAC",
      chatTitle: "CAC",
      messages: [
        { id: "1", role: "user", text: "Qual CAC atual?" },
        {
          id: "2",
          role: "assistant",
          text: "CAC em R$ 412, com tendência de queda após otimizações de público.",
        },
      ],
    },
    {
      id: "mkt-roas",
      title: "ROAS",
      chatTitle: "ROAS",
      messages: [
        { id: "1", role: "user", text: "Como está o ROAS?" },
        {
          id: "2",
          role: "assistant",
          text: "ROAS total em 4.8x, puxado por campanhas de fundo de funil.",
        },
      ],
    },
    {
      id: "mkt-best",
      title: "Campanhas com melhor resultado",
      chatTitle: "Campanhas com melhor resultado",
      messages: [
        { id: "1", role: "user", text: "Quais campanhas performaram melhor?" },
        {
          id: "2",
          role: "assistant",
          text: "As campanhas " +
            "Conversão Direta" +
            " e " +
            "Retargeting Premium" +
            " lideraram em retorno e custo eficiente.",
        },
      ],
    },
  ],
  Treinamento: [
    {
      id: "tre-trilha",
      title: "Trilha inicial",
      chatTitle: "Trilha inicial",
      messages: [
        { id: "1", role: "user", text: "Quero revisar a trilha inicial." },
        {
          id: "2",
          role: "assistant",
          text: "A trilha inicial tem 6 módulos, com foco em abordagem, CRM e fechamento.",
        },
      ],
    },
    {
      id: "tre-scripts",
      title: "Scripts de atendimento",
      chatTitle: "Scripts de atendimento",
      messages: [
        { id: "1", role: "user", text: "Me passa os scripts de atendimento." },
        {
          id: "2",
          role: "assistant",
          text: "Disponíveis scripts para primeiro contato, objeções e proposta final.",
        },
      ],
    },
    {
      id: "tre-quiz",
      title: "Quiz comercial",
      chatTitle: "Quiz comercial",
      messages: [
        { id: "1", role: "user", text: "Status do quiz comercial." },
        {
          id: "2",
          role: "assistant",
          text: "74% da equipe já concluiu o quiz comercial com nota média 8,6.",
        },
      ],
    },
    {
      id: "tre-materiais",
      title: "Materiais obrigatórios",
      chatTitle: "Materiais obrigatórios",
      messages: [
        { id: "1", role: "user", text: "Quais materiais obrigatórios estão pendentes?" },
        {
          id: "2",
          role: "assistant",
          text: "Há 3 materiais obrigatórios pendentes para novos colaboradores.",
        },
      ],
    },
    {
      id: "tre-progresso",
      title: "Progresso dos colaboradores",
      chatTitle: "Progresso dos colaboradores",
      messages: [
        { id: "1", role: "user", text: "Quais colaboradores estão atrasados?" },
        {
          id: "2",
          role: "assistant",
          text: "Encontrei 4 colaboradores com trilhas pendentes e 2 que ainda não concluíram o quiz comercial.",
        },
      ],
    },
  ],
  Financeiro: [
    {
      id: "fin-overview",
      title: "Visão financeira",
      subtitle: "Resumo gerencial mockado",
      chatTitle: "Financeiro",
      messages: [
        { id: "1", role: "user", text: "Me mostra um panorama financeiro." },
        {
          id: "2",
          role: "assistant",
          text: "Receita, inadimplência e projeção de caixa estão dentro da faixa planejada para o mês.",
          cards: [
            { label: "Receita", value: "R$ 184.700" },
            { label: "Inadimplência", value: "3,2%" },
            { label: "Caixa (30d)", value: "R$ 91.300" },
          ],
        },
      ],
    },
  ],
  Relatórios: [
    {
      id: "rep-diretoria",
      title: "Relatório de diretoria",
      chatTitle: "Relatório de diretoria",
      messages: [
        { id: "1", role: "user", text: "Quero o relatório de diretoria." },
        {
          id: "2",
          role: "assistant",
          text: "Relatório consolidado pronto com visão de receita, eficiência comercial e marketing.",
        },
      ],
    },
    {
      id: "rep-faturamento",
      title: "Faturamento mensal",
      chatTitle: "Faturamento mensal",
      messages: [
        { id: "1", role: "user", text: "Qual foi o faturamento deste mês?" },
        {
          id: "2",
          role: "assistant",
          text: "Com base nos dados consolidados, o faturamento deste mês está em R$ 184.700,00.",
          cards: [
            { label: "Faturamento", value: "R$ 184.700" },
            { label: "Vendas", value: "93" },
            { label: "Ticket médio", value: "R$ 1.986" },
            { label: "ROAS", value: "4.8x" },
          ],
        },
      ],
    },
    {
      id: "rep-vendedor",
      title: "Performance por vendedor",
      chatTitle: "Performance por vendedor",
      messages: [
        { id: "1", role: "user", text: "Como está a performance por vendedor?" },
        {
          id: "2",
          role: "assistant",
          text: "O time A superou a meta em 11%, com destaque para os vendedores seniores.",
        },
      ],
    },
    {
      id: "rep-origem",
      title: "Performance por origem",
      chatTitle: "Performance por origem",
      messages: [
        { id: "1", role: "user", text: "Performance por origem de leads." },
        {
          id: "2",
          role: "assistant",
          text: "Leads de indicação convertem melhor, enquanto tráfego pago gera maior escala.",
        },
      ],
    },
    {
      id: "rep-cancel",
      title: "Cancelamentos",
      chatTitle: "Cancelamentos",
      messages: [
        { id: "1", role: "user", text: "Resumo de cancelamentos." },
        {
          id: "2",
          role: "assistant",
          text: "Taxa de cancelamento em 2,1%, principal motivo relacionado a preço.",
        },
      ],
    },
    {
      id: "rep-ia",
      title: "Diagnóstico da IA",
      chatTitle: "Diagnóstico da IA",
      messages: [
        { id: "1", role: "user", text: "Diagnóstico da IA deste mês." },
        {
          id: "2",
          role: "assistant",
          text: "A IA manteve estabilidade e reduziu tempo médio de resposta em 18%.",
        },
      ],
    },
  ],
};

const tagStyles: Record<string, string> = {
  "Novo lead": "bg-white/45 text-slate-600",
  "Pós-vendas": "bg-white/45 text-slate-600",
  Risco: "bg-white/45 text-slate-600",
  Comercial: "bg-white/45 text-slate-600",
};

export default function AxionConversacionalPage() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("WhatsApp");
  const [activeItemId, setActiveItemId] = useState<string>(sidebarByModule.WhatsApp[0].id);
  const [draft, setDraft] = useState("");
  const [softphoneMinimized, setSoftphoneMinimized] = useState(true);

  const sidebarItems = sidebarByModule[activeModule];
  const workspaceNav = ["Inbox", "Agents", "Pipeline", "Automations", "Knowledge"];

  const analyticsByModule: Record<
    ModuleKey,
    { label: string; value: string; trend: string; tone: string }[]
  > = {
    WhatsApp: [
      { label: "Conversas ativas", value: "128", trend: "+12%", tone: "from-cyan-400/30 to-blue-400/20" },
      { label: "Tempo médio", value: "2m 14s", trend: "-18%", tone: "from-emerald-400/30 to-cyan-300/20" },
      { label: "SLA", value: "96.2%", trend: "+3.1%", tone: "from-violet-400/25 to-fuchsia-300/20" },
      { label: "Novos leads", value: "37", trend: "+8%", tone: "from-sky-400/25 to-indigo-300/20" },
    ],
    CRM: [
      { label: "Oportunidades", value: "41", trend: "+6%", tone: "from-cyan-400/30 to-blue-400/20" },
      { label: "Negociação", value: "12", trend: "+2", tone: "from-indigo-400/30 to-violet-300/20" },
      { label: "Pendências", value: "14", trend: "-4", tone: "from-emerald-400/30 to-teal-300/20" },
      { label: "Conversão", value: "21.4%", trend: "+1.2%", tone: "from-sky-400/30 to-cyan-300/20" },
    ],
    Vendas: [
      { label: "Receita", value: "R$ 184.7k", trend: "+8.2%", tone: "from-cyan-400/30 to-blue-400/20" },
      { label: "Ticket médio", value: "R$ 1.986", trend: "+4.1%", tone: "from-violet-400/25 to-fuchsia-300/20" },
      { label: "Pendentes", value: "16", trend: "-2", tone: "from-emerald-400/30 to-teal-300/20" },
      { label: "Ganhas", value: "22", trend: "+5", tone: "from-sky-400/25 to-indigo-300/20" },
    ],
    Marketing: [
      { label: "ROAS", value: "4.8x", trend: "+0.4", tone: "from-cyan-400/30 to-blue-400/20" },
      { label: "CPL", value: "R$ 37", trend: "-6%", tone: "from-emerald-400/30 to-cyan-300/20" },
      { label: "CAC", value: "R$ 412", trend: "-3%", tone: "from-sky-400/25 to-indigo-300/20" },
      { label: "Campanhas", value: "18", trend: "+2", tone: "from-violet-400/25 to-fuchsia-300/20" },
    ],
    Treinamento: [
      { label: "Conclusão", value: "74%", trend: "+9%", tone: "from-cyan-400/30 to-blue-400/20" },
      { label: "Pendentes", value: "4", trend: "-1", tone: "from-emerald-400/30 to-teal-300/20" },
      { label: "Quiz aberto", value: "2", trend: "=", tone: "from-violet-400/25 to-fuchsia-300/20" },
      { label: "Nota média", value: "8.6", trend: "+0.3", tone: "from-sky-400/25 to-indigo-300/20" },
    ],
    Financeiro: [
      { label: "Receita", value: "R$ 184.7k", trend: "+8%", tone: "from-cyan-400/30 to-blue-400/20" },
      { label: "Inadimplência", value: "3.2%", trend: "-0.6%", tone: "from-emerald-400/30 to-teal-300/20" },
      { label: "Caixa 30d", value: "R$ 91.3k", trend: "+2.4%", tone: "from-violet-400/25 to-fuchsia-300/20" },
      { label: "Margem", value: "28%", trend: "+1.1%", tone: "from-sky-400/25 to-indigo-300/20" },
    ],
    Relatórios: [
      { label: "Faturamento", value: "R$ 184.7k", trend: "+8.2%", tone: "from-cyan-400/30 to-blue-400/20" },
      { label: "Vendas", value: "93", trend: "+5", tone: "from-violet-400/25 to-fuchsia-300/20" },
      { label: "Ticket", value: "R$ 1.986", trend: "+2.1%", tone: "from-emerald-400/30 to-teal-300/20" },
      { label: "ROAS", value: "4.8x", trend: "+0.4", tone: "from-sky-400/25 to-indigo-300/20" },
    ],
  };

  const activeItem = useMemo(
    () => sidebarItems.find((item) => item.id === activeItemId) ?? sidebarItems[0],
    [activeItemId, sidebarItems],
  );

  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>(activeItem.messages);

  useEffect(() => {
    setLiveMessages(activeItem.messages);
  }, [activeItem]);

  const onChangeModule = (module: ModuleKey) => {
    setActiveModule(module);
    setActiveItemId(sidebarByModule[module][0].id);
  };

  const onChangeItem = (item: SidebarItem) => {
    setActiveItemId(item.id);
    setLiveMessages(item.messages);
  };

  const onSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;

    const userMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      text: draft,
    };

    const assistantMessage: ChatMessage = {
      id: `local-assistant-${Date.now()}`,
      role: "assistant",
      text: "Perfeito. Mensagem recebida neste protótipo estático do Axion Conversacional.",
    };

    setLiveMessages((prev) => [...prev, userMessage, assistantMessage]);
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#f5f8ff] font-sans text-slate-800">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-20 h-80 w-80 rounded-full bg-violet-300/35 blur-3xl" />
        <div className="absolute right-10 top-16 h-96 w-96 rounded-full bg-cyan-300/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-[40rem] rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-[1800px] items-center gap-4 px-4 lg:px-6">
          <div className="min-w-[180px]">
            <p className="text-lg font-semibold tracking-tight text-slate-900">Axion Intelligence</p>
            <p className="text-xs text-slate-500">Workspace · Portal Interno</p>
          </div>

          <nav className="hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
            {modules.map((module) => (
              <button
                key={module}
                type="button"
                onClick={() => onChangeModule(module)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activeModule === module
                    ? "bg-white/80 text-slate-900 shadow-[0_6px_20px_rgba(115,95,255,0.16)]"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                }`}
              >
                {module}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar no Axion..."
              className="hidden h-10 w-56 rounded-xl border border-white/70 bg-white/60 px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-200 focus:bg-white lg:block"
            />
            <div className="grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/70 text-sm font-semibold text-slate-700">
              FR
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
          {modules.map((module) => (
            <button
              key={module}
              type="button"
              onClick={() => onChangeModule(module)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                activeModule === module
                  ? "bg-white/80 text-slate-900"
                  : "bg-white/45 text-slate-600"
              }`}
            >
              {module}
            </button>
          ))}
        </div>
      </header>

      <main className="relative mx-auto grid h-[calc(100vh-5rem)] w-full max-w-[1800px] flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)_340px] lg:p-6">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/38 backdrop-blur-xl">
          <div className="border-b border-white/60 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-semibold text-white">
                AI
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Felipe Rocha</p>
                <p className="text-xs text-slate-500">Axion Operator</p>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-700">
              IA online • Fluxo operacional ativo
            </div>
          </div>

          <div className="border-b border-white/50 p-3">
            <div className="grid grid-cols-2 gap-2">
              {workspaceNav.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-xl border border-white/70 bg-white/55 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-white/80"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pt-3">
            <h2 className="text-sm font-semibold text-slate-900">{activeModule}</h2>
            <p className="text-xs text-slate-500">Contexto operacional</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {sidebarItems.map((item) => {
              const active = item.id === activeItem.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeItem(item)}
                  className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-white/70 bg-white/85 shadow-[0_8px_28px_rgba(148,163,184,0.2)]"
                      : "border-transparent bg-white/45 hover:bg-white/70"
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">{item.title}</p>
                    {item.time ? <span className="text-xs text-slate-400">{item.time}</span> : null}
                  </div>
                  {item.subtitle ? <p className="line-clamp-1 text-xs text-slate-500">{item.subtitle}</p> : null}
                  {item.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            tagStyles[tag] ?? "bg-white/45 text-slate-600"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/65 bg-white/35 backdrop-blur-xl">
          <div className="border-b border-white/60 bg-white/45 px-5 py-4">
            <h1 className="text-base font-semibold text-slate-900">{activeItem.chatTitle}</h1>
            <p className="text-xs text-slate-500">Axion Conversational OS · AI Native Workspace</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {liveMessages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-[0_8px_24px_rgba(148,163,184,0.15)] ${
                    message.role === "user"
                      ? "rounded-br-md border-cyan-100 bg-gradient-to-br from-cyan-100/80 to-violet-100/70 text-slate-800"
                      : "rounded-bl-md border-white/70 bg-white/70 text-slate-700"
                  }`}
                >
                  <p>{message.text}</p>
                  {message.cards?.length ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {message.cards.map((card) => (
                        <div key={card.label} className="rounded-xl border border-white/75 bg-white/65 p-2">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">{card.label}</p>
                          <p className="text-sm font-semibold text-slate-800">{card.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {message.actions?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          className="rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-white"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onSend} className="border-t border-white/60 bg-white/45 p-4">
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <button type="button" className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs text-slate-600 hover:bg-white">
                Nova tarefa
              </button>
              <button type="button" className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs text-slate-600 hover:bg-white">
                Gerar resumo
              </button>
              <button type="button" className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs text-slate-600 hover:bg-white">
                Criar follow-up
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Escreva uma mensagem para o Axion..."
                className="h-11 flex-1 rounded-2xl border border-white/80 bg-white/75 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-200 focus:bg-white"
              />
              <button
                type="submit"
                className="h-11 rounded-2xl bg-gradient-to-r from-violet-500/95 to-cyan-500/90 px-5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Enviar
              </button>
            </div>
          </form>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/38 p-3 backdrop-blur-xl">
          <div className="mb-3 rounded-2xl border border-white/70 bg-white/65 p-4">
            <p className="text-xs text-slate-500">Resumo Inteligente</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{activeModule} · Operação em tempo real</p>
            <p className="mt-2 text-xs text-slate-500">
              A IA consolidou métricas, comportamento de leads e próximos passos recomendados.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {analyticsByModule[activeModule].map((metric) => (
              <div
                key={metric.label}
                className={`rounded-2xl border border-white/70 bg-gradient-to-br ${metric.tone} p-3 shadow-[0_8px_24px_rgba(148,163,184,0.14)]`}
              >
                <p className="text-[11px] text-slate-600">{metric.label}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{metric.value}</p>
                <p className="mt-1 text-xs text-slate-500">{metric.trend}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 min-h-0 flex-1 rounded-2xl border border-white/70 bg-white/60 p-3">
            <p className="text-xs font-medium text-slate-500">Atividades Recentes</p>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl bg-white/75 p-2 text-xs text-slate-600">Lead Maria Oliveira movido para proposta.</div>
              <div className="rounded-xl bg-white/75 p-2 text-xs text-slate-600">Campanha Google Ads acima da meta de ROAS.</div>
              <div className="rounded-xl bg-white/75 p-2 text-xs text-slate-600">IA sugeriu follow-up para 6 clientes em risco.</div>
            </div>

            <div className="mt-4 rounded-xl border border-white/80 bg-white/75 p-3">
              <p className="text-xs text-slate-500">Funil de vendas</p>
              <div className="mt-2 space-y-2">
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-[78%] rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-[56%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-[31%] rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <div className="fixed bottom-6 right-6 z-30 w-72 rounded-2xl border border-white/70 bg-white/55 p-4 text-slate-600 shadow-[0_14px_40px_rgba(148,163,184,0.22)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Softphone minimizado</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Online
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSoftphoneMinimized((prev) => !prev)}
            className="rounded-md border border-white/80 bg-white/80 px-2 py-1 text-xs text-slate-600 hover:bg-white"
          >
            {softphoneMinimized ? "Expandir" : "Minimizar"}
          </button>
        </div>
        {!softphoneMinimized ? (
          <div className="rounded-xl border border-white/80 bg-white/75 p-3 text-xs text-slate-600">
            Controles visuais do softphone (protótipo sem integração real).
          </div>
        ) : null}
      </div>
    </div>
  );
}


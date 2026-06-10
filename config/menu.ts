import { geographicView } from "google-ads-api/build/src/protos/autogen/resourceNames";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  GraduationCap,
  DollarSign,
  Calendar,
  Stethoscope,
  Crown,
  MessageCircle,
  Settings,
  TrendingUp,
  Phone,
  PersonStandingIcon,
  PersonStanding,
  GitGraphIcon,
  GitGraph,
  LucideGitGraph,
  Gauge,
  ChartNoAxesColumn,
  Megaphone,
  FileText,
} from "lucide-react";
import { graphicalItemsReducer } from "recharts/types/state/graphicalItemsSlice";

export type MenuItem = {
  label: string;
  href?: string;
  external?: boolean;
  module?: string;
  newTab?: boolean;
  allowExternal?: boolean; // âœ… ADICIONADO
};

export type MenuSection = {
  title?: string; // ðŸ‘ˆ opcional (Home fica sem título)
  icon?: LucideIcon; // âœ… ícone só no título da seção (e no "Home" quando retraída)
  roles: string[];
  items: MenuItem[];
};

export const menuConfig: MenuSection[] = [
  // âœ… HOME (sem submenu, aparece direto)
  {
    icon: Home,
    roles: ["TREINAMENTO", "COMERCIAL", "AGENDAMENTO", "EXAMES", "DIRETORIA"],
    items: [
      {
        label: "Home",
        href: "/portal",
      },
    ],
  },

  {
    icon: DollarSign,
    roles: ["DIRETORIA"],
    items: [
      {
        label: "CRM",
        href: "/portal/vendas",
      },
    ],
  },

  {
    icon: Calendar,
    roles: ["AGENDAMENTO", "DIRETORIA"],
    items: [
      {
        label: "Dasboard",
        href: "/portal/agendamento/gestao-teste",
      },
    ],
  },

  {
    icon: Calendar,
    roles: ["TREINAMENTO", "COMERCIAL", "EXAMES",],
    items: [
      {
        label: "Novo registro",
        href: "/portal/agendamento/gestao-teste?tab=novo",
      },
    ],
  },
{
    icon: Phone,
    roles: [ "DIRETORIA"],
    items: [
      {
        label: "Axion Voice",
        href: "/portal/voice/queues",
      },
    ],
  },
  {
    icon: Crown,
    roles: ["DIRETORIA"],
    items: [
      {
        label: "Axion League",
        href: "/portal/axion-league",
      },
    ],
  },
   {
    icon: Crown,
    roles: ["COMERCIAL"],
    items: [
      {
        label: "Tabela Copa",
        href: "/axion-league/tabela",
      },
    ],
  },

  {
    icon: MessageCircle,
    roles: ["TREINAMENTO", "COMERCIAL", "AGENDAMENTO", "EXAMES", "DIRETORIA"],
    items: [
      {
        label: "WhatsApp Oficial",
        href: "/portal/conversas-meta",
      },
    ],
  },

  {
    icon: MessageCircle,
    roles: [],
    items: [
      {
        label: "WhatsApp",
        href: "/portal/conversas",
      },
    ],
  },
  
  {
    icon: Settings,
    roles: ["DIRETORIA"],
    items: [
      {
        label: "Whatsapp Config",
        href: "/portal/whatsapp",
      },
    ],
  },
   {
    icon: PersonStanding,
    roles: ["DIRETORIA"],
    items: [
      {
        label: "Usuários",
        href: "/portal/usuarios",
      },
    ],
  },

  {
    icon: ChartNoAxesColumn,
    roles: ["DIRETORIA"],
    items: [
      {
        label: "Performance",
        href: "/portal/relatorios/consolidado",
      },
    ],
  },
  {
    icon: FileText,
    roles: ["DIRETORIA"],
    items: [
      {
        label: "Assinaturas",
        href: "/portal/assinaturas",
      },
    ],
  },

  {
    icon: Megaphone,
    roles: ["DIRETORIA"],
    items: [
      {
        label: "Marketing",
        href: "/portal/diretoria/visao-geral",
      },
    ],
  },

  {
    title: "Treinamento",
    icon: GraduationCap,
    roles: ["TREINAMENTO", "COMERCIAL", "AGENDAMENTO", "EXAMES", "DIRETORIA"],
    items: [
      {
        label: "Agendamento",
        href: "/portal/treinamento/agendamento",
        module: "agendamento",
      },
      {
        label: "Vendas Comercial",
        href: "/portal/treinamento/vendas-comercial",
        module: "vendas-comercial",
      },
      {
        label: "Exames",
        href: "/portal/treinamento/exames",
        module: "exames",
      },
      {
        label: "Cancelamento",
        href: "/portal/treinamento/cancelamento",
        module: "cancelamento",
      },
    ],
  },

  {
    title: "Extras Agendamento",
    icon: Calendar,
    roles: ["AGENDAMENTO"],
    items: [
      {
        label: "TN Cancelamento",
        href: "https://docs.google.com/document/d/1xxRstJptIuIYeVqroVEk-bZZ8n5jq9foXbOeg55_9_0/edit?usp=sharing",
        allowExternal: true,
      },
      {
        label: "TN Agendamento",
        href: "https://docs.google.com/document/d/1b-YmFMyM8ecsB5W_tFplAUR7KygjhWpjqcDNRLG2yUk/edit?usp=sharing",
        allowExternal: true,
      },
      {
        label: "Clínicas",
        href: "https://docs.google.com/spreadsheets/d/1R0UVojq0po_O0YFcywHANnK4-zEEK_pz7M3oftLgJNk/edit?gid=275434661#gid=275434661",
        allowExternal: true,
      },
      {
        label: "Agendas",
        href: "https://sage-macaron-e8a43f.netlify.app/",
        allowExternal: true,
      },
      {
        label: "Voucher",
        href: "https://docs.google.com/document/d/1aM0bShwqJEP5nf1eXgoPwDCJYmYU4vTDi2IpOvqCOy0/edit?tab=t.0",
        allowExternal: true,
      },
      {
        label: "Declaração",
        href: "https://docs.google.com/document/d/1MMYLt9PC_4sJ58wHwUVGoLo_uT-tpgpd1k8IdETp9RM/edit?tab=t.0",
        allowExternal: true,
      },
    ],
  },

  {
    title: " Extras Exames",
    icon: Stethoscope,
    roles: ["EXAMES"],
    items: [
      {
        label: "TN Cancelamento",
        href: "https://docs.google.com/document/d/15gOYw1BFQ6F6TmmTNdLqhEvl7hmL1QjQaSR82DDoxOE/edit?usp=sharing",
        allowExternal: true,
      },
      {
        label: "Formulário de envio",
        href: "https://docs.google.com/forms/d/e/1FAIpQLSdMJCBwV0mRuyUX2zMVfNJxPM6Kp-LU3cnNsPe9I9X-uO5B1A/viewform",
        allowExternal: true,
      },
      {
        label: "Cotação Planilha",
        href: "https://docs.google.com/spreadsheets/d/1mk0o6hhLPOHDZ9KQEdI1gEsjIetFX-J_BeJt9pGhRpE/edit?usp=sharing",
        allowExternal: true,
      },
      {
        label: "Calculadora",
        href: "https://reliable-bienenstitch-be5e7d.netlify.app/",
        allowExternal: true,
      },
      {
        label: "Geral",
        href: "https://docs.google.com/spreadsheets/d/1ccKvDXwcLzYhqqdGflU_ZB3gUMtcK5kEGD48TjdphZI/edit?gid=471605490#gid=471605490",
        allowExternal: true,
      },
      {
        label: "Relatório",
        href: "https://docs.google.com/spreadsheets/d/1AMGifoSs6wXnCLGisiYsdyiXDm4ztpi0yHqunL6YqEk/edit?gid=677795770#gid=677795770",
        allowExternal: true,
      },
      {
        label: "Voucher",
        href: "https://docs.google.com/forms/d/e/1FAIpQLSf7skQvwV4oTecTaIahCLjLMwHsXFmoI8_SaF21rOwAm-pFAg/viewform?usp=header",
        allowExternal: true,
      },
    ],
  },
{
    title: "Extras Comercial",
    icon: Calendar,
    roles: ["COMERCIAL"],
    items: [
      { label: "Metas Geral",
         href: "https://glittering-dieffenbachia-ed9bc9.netlify.app/",
         allowExternal: true,
      },
      { label: "Equipe A",
     href: "https://docs.google.com/spreadsheets/d/1x5vfTy5datDHqFq2HJtMxVfBXTG0l4gSaJjh4RxjL7o/edit?gid=0#gid=0",
     allowExternal: true,
      },
      { label: "Equipe B",
     href: "https://docs.google.com/spreadsheets/d/1kp8WvwvDNMQZHW3jRAUGAzp4oXtqvjGtk4oIclCGhi0/edit?gid=1570139612#gid=1570139612",
     allowExternal: true,
      },
      { label: "Consulta CPF",
     href: "https://servicos.receita.fazenda.gov.br/Servicos/CPF/ConsultaSituacao/ConsultaPublica.asp",
     allowExternal: true,
      },
      { label: "Agendas",
     href: "https://sage-macaron-e8a43f.netlify.app/",
     allowExternal: true,
      },
      { label: "Credenciadas", 
    href: "https://docs.google.com/spreadsheets/d/1R0UVojq0po_O0YFcywHANnK4-zEEK_pz7M3oftLgJNk/edit?usp=sharing",
     allowExternal: true,
      },
    ],
  },
];


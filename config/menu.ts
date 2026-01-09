import { Home, FileText } from "lucide-react";

export type MenuItem = {
  label: string;
  href?: string;
  external?: boolean;
  module?: string;
};

export type MenuSection = {
  title: string;
  roles: string[];
  items: MenuItem[];
};

export const menuConfig = [
  {
    title: "Treinamento",
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
    title: "Agendamento",
    roles: ["AGENDAMENTO", "EXAMES", "DIRETORIA"],
    items: [
      { label:'TN Cancelamento', href: 'https://docs.google.com/document/d/1xxRstJptIuIYeVqroVEk-bZZ8n5jq9foXbOeg55_9_0/edit?usp=sharing'},
      { label:'TN Agendamento', href: 'https://docs.google.com/document/d/1b-YmFMyM8ecsB5W_tFplAUR7KygjhWpjqcDNRLG2yUk/edit?usp=sharing'},
      { label: "Clínicas", href: "https://docs.google.com/spreadsheets/d/1R0UVojq0po_O0YFcywHANnK4-zEEK_pz7M3oftLgJNk/edit?gid=275434661#gid=275434661" },
      { label: "Agendas", href: "https://sage-macaron-e8a43f.netlify.app/" },
      { label:'Metas', href:'https://docs.google.com/spreadsheets/d/11yDILj0SU1j-oHeIsMQUAT12GDy5lKilPB7U_m9v_TU/edit?gid=1777785698#gid=1777785698' },
      { label:'agendamentos', href:'https://docs.google.com/spreadsheets/d/19Sue6E0GVWMPJ5xscnbjEEmn9yvqeGojQqB8eV0d6HI/edit?gid=2034801768#gid=2034801768' },
      { label:'Voucher', href:'https://docs.google.com/document/d/1aM0bShwqJEP5nf1eXgoPwDCJYmYU4vTDi2IpOvqCOy0/edit?tab=t.0' },
      { label:'Declaração', href:'https://docs.google.com/document/d/1MMYLt9PC_4sJ58wHwUVGoLo_uT-tpgpd1k8IdETp9RM/edit?tab=t.0' },
      { label:'Ficticio', href:'https://docs.google.com/spreadsheets/d/18RGJdJKcZiDA5k5bnuqVV_2fDNSUqlVwfZlYhdjoD9E/edit?gid=191968330#gid=191968330' },
      { label:'Elev', href:'http://179.125.68.164:9000/nxt3000/login.php' },
      { label:'Gestão', href:'https://gestao.drdetodos.com.br/' },
      { label:'Duotalk', href:'https://app.duotalk.io/login?to=&acc=687fdae2b21652ca230157e5' }
    ],
  },
  {
    title: "Comercial",
    roles: ["COMERCIAL", "DIRETORIA"],
    items: [
      { label:'Equipe A',href:'https://docs.google.com/spreadsheets/d/1x5vfTy5datDHqFq2HJtMxVfBXTG0l4gSaJjh4RxjL7o/edit?gid=0#gid=0' },
      { label:'Equipe B', href:'https://docs.google.com/spreadsheets/d/1kp8WvwvDNMQZHW3jRAUGAzp4oXtqvjGtk4oIclCGhi0/edit?gid=1570139612#gid=1570139612' },
      { label:'Consulta CPF ', href:'https://servicos.receita.fazenda.gov.br/Servicos/CPF/ConsultaSituacao/ConsultaPublica.asp' },
      { label:'Agendas', href:'https://sage-macaron-e8a43f.netlify.app/' },
      { label:'Fic', href:'https://docs.google.com/forms/d/e/1FAIpQLSegsWrwcEw9DalA_NzueAbPJzquyPQ6Owy04OHhlSZh_3MEYg/viewform' },
      { label:'Elev', href:'http://179.125.68.164:9000/nxt3000/login.php' },
      { label:'Gestão', href:'https://gestao.drdetodos.com.br/' },
      { label:'Duotalk', href:'https://app.duotalk.io/login?to=&acc=687fdae2b21652ca230157e5' }
    ],
  },
  {
    title: "Exames",
    roles: ["EXAMES", "DIRETORIA"],
    items: [
      { label:'TN Cancelamento', href: 'https://docs.google.com/document/d/15gOYw1BFQ6F6TmmTNdLqhEvl7hmL1QjQaSR82DDoxOE/edit?usp=sharing'},
      { label:'Formulário de envio', href:'https://docs.google.com/forms/d/e/1FAIpQLSdMJCBwV0mRuyUX2zMVfNJxPM6Kp-LU3cnNsPe9I9X-uO5B1A/viewform' },
      { label:'Cotação', href:'https://reliable-bienenstitch-be5e7d.netlify.app/' },
      { label:'Geral', href:'https://docs.google.com/spreadsheets/d/1ccKvDXwcLzYhqqdGflU_ZB3gUMtcK5kEGD48TjdphZI/edit?gid=471605490#gid=471605490' },
      { label:'Relatório', href:'https://docs.google.com/spreadsheets/d/1AMGifoSs6wXnCLGisiYsdyiXDm4ztpi0yHqunL6YqEk/edit?gid=677795770#gid=677795770' },
      { label:'Elev', href:'http://179.125.68.164:9000/nxt3000/login.php' },
      { label:'Gestão', href:'https://gestao.drdetodos.com.br/' },
      { label:'Duotalk', href:'https://app.duotalk.io/login?to=&acc=687fdae2b21652ca230157e5' },
      { label:'Voucher', href:'https://docs.google.com/forms/d/e/1FAIpQLSf7skQvwV4oTecTaIahCLjLMwHsXFmoI8_SaF21rOwAm-pFAg/viewform?usp=header' }
    ],
  },
  {
    title: "Diretoria",
    roles: ["DIRETORIA"],
    items: [
      {
        label: "Avaliações dos Colaboradores",
        href: "/portal/diretoria/avaliacoes",
      },
      { label:'Geral Empresa', href:'https://docs.google.com/spreadsheets/d/1UTz8gqUmWQH_E2LgwZqZro31APchbT-BodexzcZZEjs/edit?gid=1536522903#gid=1536522903' },
      { label:'Enel', href:'https://docs.google.com/spreadsheets/d/1NEp86R1RJY-T_9Q27EY4wHiKmgBkeCmi6VdJBWaylmI/edit?gid=1422568270#gid=1422568270' },
      { label:'Boleto', href:'https://docs.google.com/spreadsheets/d/1ckPdHqETORG6D1iwdUB60qQxDVFYmrnxxUaV_ludW8o/edit?gid=337204937#gid=337204937' },
      { label:'Google', href:'https://ads.google.com/aw/campaigns?ocid=260112867&workspaceId=-1748819828&euid=548870555&__u=4420376195&uscid=260112867&__c=3514259083&authuser=0', newTab:true },
      { label:'Facebook', href:'https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1471558083175379&business_id=2873022919602848&selected_campaign_ids=120219409538060243&selected_adset_ids=120219409538110243', newTab:true },
      { label:'Procon', href:'https://docs.google.com/spreadsheets/d/18h5JlAcHZHG4My6Oq5tRyPai_h0Sg7H0vukLYaiMgUE/edit?gid=0#gid=0' },
      { label:'Parcial',href:'https://docs.google.com/spreadsheets/d/1zJ3yWflaC_r2hnc5Zh97Iq4M8LoeiypE4gvtrdjiUX0/edit?gid=0#gid=0' },
      { label:'Bonificação',href:'https://docs.google.com/spreadsheets/d/12EiH6UxsH9CHBTzSY0qNkMWopDWiwxpBh6ZYh8PUzIw/edit?gid=0#gid=0' },
      { label:'Calendário',href:'https://docs.google.com/spreadsheets/d/12EiH6UxsH9CHBTzSY0qNkMWopDWiwxpBh6ZYh8PUzIw/edit?gid=0#gid=0' },
      { label:'Recados',href:'https://docs.google.com/spreadsheets/d/1H7yH9Y7Q0Ywmm78U9FuhS2nbzimyIm5olDS2YH-ehTM/edit?gid=0#gid=0' },
    ],
  },

  /* ✅ ÚNICA ADIÇÃO */
  {
    title: "Evolução",
    roles: ["COMERCIAL", "DIRETORIA"],
    items: [
      {
        label: "Minha Evolução",
        href: "/portal/evolucao",
      },
      {
        label: "Lançar Evolução",
        href: "/portal/evolucao/lancar",
      },
    ],
  },

  {
    title: "Administração",
    roles: ["DIRETORIA"],
    items: [
      { label: "Usuários", href: "/portal/usuarios" },
    ],
  },
];

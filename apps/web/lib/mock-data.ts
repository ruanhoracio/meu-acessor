// ── Dados do app — zerados e prontos para produção ────────

export const PROJETOS = [
  { id: "1", nome: "Ana Lima", tipo: "cliente" as const, cor: "#ff5a3d", ativo: true },
  { id: "2", nome: "Pedro Mendes", tipo: "cliente" as const, cor: "#60a5fa", ativo: true },
  { id: "3", nome: "Studio Interno", tipo: "interno" as const, cor: "#34d399", ativo: true },
  { id: "4", nome: "Curso YouTube", tipo: "interno" as const, cor: "#fbbf24", ativo: true },
  { id: "5", nome: "Pessoal", tipo: "pessoal" as const, cor: "#a78bfa", ativo: true },
];

export interface VideoItem {
  id: string;
  titulo: string;
  projetoId: string;
  projeto: typeof PROJETOS[number] | null;
  formato: "reels" | "vsl" | "criativo" | "aula" | "institucional" | "outro";
  estagio: "briefing" | "material_recebido" | "cortando" | "primeiro_corte" | "revisao" | "ajustes" | "aprovado" | "entregue";
  prazoEntrega: Date | null;
  estimativaHoras: number | null;
  horasReais: number | null;
  aguardando: "eu" | "cliente" | "gravacao" | "aprovacao" | null;
  linkBruto?: string | null;
  linkEntrega?: string | null;
  rodadasAlteracao: number;
  criadoEm: Date;
  ultimoEvento: Date | null;
}

export interface TarefaItem {
  id: string;
  titulo: string;
  descricao?: string | null;
  projetoId: string | null;
  projeto: typeof PROJETOS[number] | null;
  prazo: Date | null;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  status: "aberta" | "fazendo" | "concluida" | "cancelada";
  recorrencia?: string | null;
}

export const VIDEOS: VideoItem[] = [];

export const TAREFAS: TarefaItem[] = [];

export const EVENTOS: {
  id: string;
  titulo: string;
  inicio: Date;
  fim: Date | null;
  projeto: typeof PROJETOS[number] | null;
}[] = [];

export const NOTAS: {
  id: string;
  titulo: string;
  conteudo: string;
  tags: string[];
  projetoId: string | null;
  projeto: typeof PROJETOS[number] | null;
  videoId: string | null;
  criadoEm: Date;
}[] = [];

export const REFERENCIAS: {
  id: string;
  url: string;
  titulo: string;
  tags: string[];
  thumbnail: string | null;
  criadoEm: Date;
}[] = [];

export const INBOX_ITEMS: {
  id: string;
  origem: "telegram";
  tipoMidia: "texto" | "audio" | "foto" | "link";
  conteudoBruto: string;
  transcricao: string | null;
  status: "pendente" | "processado" | "erro" | "ignorado";
  criadoEm: Date;
}[] = [];

// ── Constantes ────────────────────────────────────────────

export const ESTAGIO_LABELS: Record<string, string> = {
  briefing: "Briefing",
  material_recebido: "Material",
  cortando: "Cortando",
  primeiro_corte: "1º Corte",
  revisao: "Revisão",
  ajustes: "Ajustes",
  aprovado: "Aprovado",
  entregue: "Entregue",
};

export const ESTAGIOS_KANBAN = [
  "briefing",
  "material_recebido",
  "cortando",
  "primeiro_corte",
  "revisao",
  "ajustes",
  "aprovado",
] as const;

export const FORMATO_LABELS: Record<string, string> = {
  reels: "Reels",
  vsl: "VSL",
  criativo: "Criativo",
  aula: "Aula",
  institucional: "Institucional",
  outro: "Outro",
};

export const AGUARDANDO_LABELS: Record<string, string> = {
  eu: "Eu",
  cliente: "Cliente",
  gravacao: "Gravação",
  aprovacao: "Aprovação",
};

export const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

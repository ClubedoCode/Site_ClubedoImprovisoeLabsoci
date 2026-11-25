export interface Evento {
  id: number | string;
  nome: string;
  data: string; // "YYYY-MM-DD"
  hora?: string | null; // "HH:mm" ou "HH:mm:ss"
  local: string;
  descr?: string | null;
  descr_g?: string | null;
  capa_url?: string | null;
  categoria?: string | null; // "apresentacao" | "oficina" | "Ensaio" | ...
  proj?: 'cdi' | 'lab' | '-' | null;
  concluido?: boolean | 0 | 1 | null; // SQLite devolve 0/1
  entrada?: string | null; // "20" = R$ 20; vazio = gratuita
}

export interface Imagem {
  id: number | string;
  url: string;
}

export interface RespostaEventos {
  data: Evento[];
}

export interface Membro {
  id: number | string;
  nome: string;
  foto_url?: string | null;
  funcao?: string | null;
  ativo?: boolean | 0 | 1 | null; // SQLite devolve 0/1
}
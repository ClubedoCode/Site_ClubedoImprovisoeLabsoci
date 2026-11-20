export interface Tema {
  nome: string;
  logo: string;
  icone: string;
  instagram: string;
  subtitulo: string;
  subtituloExtra?: string;
  cor?: string; // sobrescreve as variáveis de laranja/dourado
}

export const temaClube: Tema = {
  nome: 'Clube do Improviso',
  logo: '/images/simbolo-clube.jpg',
  icone: '/iconCaduLaranja.png',
  instagram: 'https://www.instagram.com/clubedoimproviso/',
  subtitulo: 'Projeto cultural da UFC Campus Russas',
};

export const temaLabSoci: Tema = {
  nome: 'LabSoci',
  logo: '/images/simbolo-lab.jpg',
  icone: '/iconCaduAzul.png',
  instagram: 'https://www.instagram.com/labsoci/',
  subtitulo: 'Projeto de extensão da UFC Campus Russas',
  subtituloExtra:
    'Laboratório de Sociodrama e de Desenvolvimento do Pensamento Crítico Social',
  cor: '#055173',
};

export function temaDoProjeto(proj?: string | null): Tema {
  return proj === 'lab' ? temaLabSoci : temaClube;
}
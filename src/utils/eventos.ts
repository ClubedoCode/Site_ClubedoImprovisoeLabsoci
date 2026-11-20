import type { Evento } from '../types/evento';
import { parseData } from './formatarEvento';

export function eventosFuturos(eventos: Evento[]): Evento[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return eventos
    .filter((evento) => parseData(evento.data) >= hoje)
    .sort((a, b) => parseData(a.data).getTime() - parseData(b.data).getTime());
}

export function eventosPassados(eventos: Evento[]): Evento[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return eventos
    .filter((evento) => parseData(evento.data) < hoje)
    .sort((a, b) => parseData(b.data).getTime() - parseData(a.data).getTime());
}

export function filtrarPorNome(eventos: Evento[], termo: string): Evento[] {
  const busca = termo.trim().toLocaleLowerCase('pt-BR');
  if (!busca) return eventos;

  return eventos.filter((evento) =>
    evento.nome.toLocaleLowerCase('pt-BR').includes(busca)
  );
}

/** Categorias oferecidas nos formulários de evento. */
export const CATEGORIAS = [
  { valor: 'apresentacao', rotulo: 'Apresentação' },
  { valor: 'oficina', rotulo: 'Oficina' },
  { valor: 'terca', rotulo: 'Terça Cultural' },
  { valor: 'Ensaio', rotulo: 'Ensaio' },
];

export function infoCategoria(categoria?: string | null) {
  switch (categoria?.toLowerCase()) {
    case 'apresentacao':
      return { classe: 'badge teatro', rotulo: 'Apresentação' };
    case 'oficina':
      return { classe: 'badge oficina', rotulo: 'Oficina' };
    case 'terca':
      return { classe: 'badge especial', rotulo: 'Terça Cultural' };
    case 'ensaio':
      return { classe: 'badge especial', rotulo: 'Ensaio' };
    default:
      return { classe: 'badge especial', rotulo: categoria || 'Evento' };
  }
}
import { useEffect, useState } from 'react';
import type { Evento, Imagem, Membro } from '../types/evento';

type Status = 'ok' | 'nao-encontrado' | 'erro';

interface Resultado {
  id: string;
  status: Status;
  evento: Evento | null;
  membros: Membro[];
  imagens: Imagem[];
  tags: string[];
}

class ErroHttp extends Error {
  status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

async function obter<T>(url: string, signal: AbortSignal): Promise<T> {
  const resposta = await fetch(url, { signal });
  if (!resposta.ok) throw new ErroHttp(resposta.status);
  const json = await resposta.json();
  // Aceita tanto { data: ... } quanto o valor direto
  return (json && !Array.isArray(json) && 'data' in json ? json.data : json) as T;
}

const VAZIO = { evento: null, membros: [], imagens: [], tags: [] };

export function useEventoDetalhe(id: string) {
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const base = `/api/evento/${encodeURIComponent(id)}`;

    async function carregar() {
      try {
        const evento = await obter<Evento | null>(base, signal);
        if (!evento) {
          setResultado({ id, status: 'nao-encontrado', ...VAZIO });
          return;
        }

        const [membros, imagens, tags] = await Promise.allSettled([
          obter<Membro[]>(`${base}/membros`, signal),
          obter<Imagem[]>(`${base}/imagens`, signal),
          obter<(string | { tag: string })[]>(`${base}/tags`, signal),
        ]);
        if (signal.aborted) return;

        setResultado({
          id,
          status: 'ok',
          evento,
          membros: membros.status === 'fulfilled' ? membros.value : [],
          imagens: imagens.status === 'fulfilled' ? imagens.value : [],
          tags:
            tags.status === 'fulfilled'
              ? tags.value.map((t) => (typeof t === 'string' ? t : t.tag)).filter(Boolean)
              : [],
        });
      } catch (e) {
        if (signal.aborted) return;
        const naoEncontrado = e instanceof ErroHttp && e.status === 404;
        if (!naoEncontrado) console.error('Erro ao carregar evento:', e);
        setResultado({ id, status: naoEncontrado ? 'nao-encontrado' : 'erro', ...VAZIO });
      }
    }

    carregar();
    return () => controller.abort();
  }, [id]);

  // "carregando" é derivado: o resultado guardado ainda não é deste id
  const carregando = resultado?.id !== id;

  if (carregando || !resultado) {
    return { carregando: true, status: 'ok' as Status, ...VAZIO };
  }
  return { carregando: false, ...resultado };
}
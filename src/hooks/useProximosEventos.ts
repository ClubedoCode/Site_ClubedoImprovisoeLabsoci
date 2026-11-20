import { useEffect, useState } from 'react';
import type { Evento, RespostaEventos } from '../types/evento';
import { eventosFuturos } from '../utils/eventos';

export function useProximosEventos(limite = 4) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      try {
        const resposta = await fetch('/api/eventos', { signal: controller.signal });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        const resultado: Evento[] | RespostaEventos = await resposta.json();
        const lista = Array.isArray(resultado) ? resultado : resultado.data;
        const proximos = eventosFuturos(lista).slice(0, limite);

        setEventos(proximos);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('Erro ao carregar eventos:', e);
        setErro(true);
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }

    carregar();
    return () => controller.abort();
  }, [limite]);

  return { eventos, carregando, erro };
}
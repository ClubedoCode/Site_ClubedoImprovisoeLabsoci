import { useEffect, useState } from 'react';
import type { Evento, RespostaEventos } from '../types/evento';

export function useEventos() {
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
        setEventos(Array.isArray(resultado) ? resultado : resultado.data);
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
  }, []);

  return { eventos, carregando, erro };
}
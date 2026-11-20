import { useEffect, useState } from 'react';
import type { Membro } from '../types/evento';

export function useMembros() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      try {
        const resposta = await fetch('/api/membros', { signal: controller.signal });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        const resultado: Membro[] | { data: Membro[] } = await resposta.json();
        const lista = Array.isArray(resultado) ? resultado : resultado.data;

        setMembros(lista.filter((m) => m.ativo !== 0 && m.ativo !== false));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('Erro ao carregar os membros da equipe:', e);
        setErro(true);
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }

    carregar();
    return () => controller.abort();
  }, []);

  return { membros, carregando, erro };
}
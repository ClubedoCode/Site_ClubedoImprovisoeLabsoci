import type { SyntheticEvent } from 'react';

export const PLACEHOLDER = '/images/perfil-placeholder.png';

/** URL completa ou caminho absoluto passam direto; nome de arquivo vai para a pasta. */
export function urlDeImagem(valor: string | null | undefined, pasta: string): string {
  if (!valor) return PLACEHOLDER;
  if (/^(https?:)?\/\//.test(valor) || valor.startsWith('/')) return valor;
  return `/images/${pasta}/${valor}`;
}

export function aoFalharImagem(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.src.endsWith(PLACEHOLDER)) img.src = PLACEHOLDER;
}
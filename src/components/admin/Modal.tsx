import { useEffect, type ReactNode } from 'react';

interface Props {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}

/** Janela sobreposta. Fecha com Esc, clicando fora ou no ✕. */
export default function Modal({ titulo, aoFechar, children }: Props) {
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') aoFechar();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div className="modal-content" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button type="button" className="close-modal" aria-label="Fechar" onClick={aoFechar}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

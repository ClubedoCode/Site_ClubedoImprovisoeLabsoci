interface PaginacaoProps {
  paginaAtual: number;
  total: number;
  porPagina: number;
  onMudar: (pagina: number) => void;
}

export default function Paginacao({ paginaAtual, total, porPagina, onMudar }: PaginacaoProps) {
  const totalPaginas = Math.ceil(total / porPagina);
  if (totalPaginas <= 1) return null;

  const itens = [];
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === 1 || i === totalPaginas || Math.abs(i - paginaAtual) <= 1) {
      itens.push(
        <button
          key={i}
          className={`page-btn${i === paginaAtual ? ' active' : ''}`}
          onClick={() => onMudar(i)}
        >
          {i}
        </button>
      );
    } else if (Math.abs(i - paginaAtual) === 2) {
      itens.push(
        <span key={`gap-${i}`} className="page-gap">…</span>
      );
    }
  }

  return (
    <div className="pagination">
      <button
        className="page-btn"
        aria-label="Página anterior"
        disabled={paginaAtual === 1}
        onClick={() => onMudar(paginaAtual - 1)}
      >
        &#8249;
      </button>
      {itens}
      <button
        className="page-btn"
        aria-label="Próxima página"
        disabled={paginaAtual === totalPaginas}
        onClick={() => onMudar(paginaAtual + 1)}
      >
        &#8250;
      </button>
    </div>
  );
}
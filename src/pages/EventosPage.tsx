import { useMemo, useRef, useState, type FormEvent } from 'react';
import Navbar from '../components/Navbar';
import CartaoEvento from '../components/eventos/CartaoEvento';
import CartaoEventoPassado from '../components/eventos/CartaoEventoPassado';
import Paginacao from '../components/eventos/Paginacao';
import { useEventos } from '../hooks/useEventos';
import { eventosFuturos, eventosPassados, filtrarPorNome } from '../utils/eventos';
import '../styles/eventos.css';

type Visao = 'proximos' | 'anteriores';

const POR_PAGINA: Record<Visao, number> = { proximos: 4, anteriores: 8 };

export default function EventosPage() {
  const { eventos, carregando, erro } = useEventos();

  const [visao, setVisao] = useState<Visao>('proximos');
  const [busca, setBusca] = useState(''); // texto digitado
  const [termo, setTermo] = useState(''); // termo aplicado (ao clicar em Buscar / Enter)
  const [pagina, setPagina] = useState(1);
  const listaRef = useRef<HTMLDivElement>(null);

  const lista = useMemo(() => {
    const filtrados = filtrarPorNome(eventos, termo);
    return visao === 'proximos' ? eventosFuturos(filtrados) : eventosPassados(filtrados);
  }, [eventos, termo, visao]);

  const porPagina = POR_PAGINA[visao];
  const visiveis = lista.slice((pagina - 1) * porPagina, pagina * porPagina);

  function trocarVisao(nova: Visao) {
    setVisao(nova);
    setPagina(1);
  }

  function buscar(e: FormEvent) {
    e.preventDefault();
    setTermo(busca);
    setPagina(1);
  }

  function mudarPagina(nova: number) {
    setPagina(nova);
    listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <header className="agenda-hero">
        <Navbar ativa="eventos" />
        <h1>AGENDA DO IMPROVISO</h1>
        <p>
          Encontros, espetáculos e vivências teatrais abertas para toda a comunidade
          da UFC Russas e região.
        </p>
      </header>

      <main className="events-page-main">
        <div className="view-toggle">
          <button
            className={`toggle-btn${visao === 'proximos' ? ' active' : ''}`}
            onClick={() => trocarVisao('proximos')}
          >
            PRÓXIMOS EVENTOS
          </button>
          <button
            className={`toggle-btn${visao === 'anteriores' ? ' active' : ''}`}
            onClick={() => trocarVisao('anteriores')}
          >
            EVENTOS ANTERIORES
          </button>
        </div>

        <form className="search-bar" onSubmit={buscar}>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar evento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button type="submit" className="search-btn">Buscar</button>
        </form>

        <div className="events-list-container" ref={listaRef}>
          <div className={visao === 'proximos' ? 'events-grid' : 'events-list-past'}>
            {carregando && <div className="empty-state">Carregando eventos...</div>}

            {erro && (
              <div className="empty-state">Não foi possível carregar os eventos.</div>
            )}

            {!carregando && !erro && lista.length === 0 && (
              <div className="empty-state">
                ✨ Nenhum evento encontrado nesta categoria. Em breve novidades!
              </div>
            )}

            {visiveis.map((evento) =>
              visao === 'proximos' ? (
                <CartaoEvento key={evento.id} evento={evento} />
              ) : (
                <CartaoEventoPassado key={evento.id} evento={evento} />
              )
            )}
          </div>

          <Paginacao
            paginaAtual={pagina}
            total={lista.length}
            porPagina={porPagina}
            onMudar={mudarPagina}
          />
        </div>
      </main>
    </>
  );
}
import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Paginacao from '../components/eventos/Paginacao';
import TabelaEventos from '../components/admin/TabelaEventos';
import ModalNovoEvento from '../components/admin/ModalNovoEvento';
import ModalExcluirEvento from '../components/admin/ModalExcluirEvento';
import { temaClube } from '../config/temas';
import { useAdmin } from '../context/AdminContext';
import { useTemaFixo } from '../context/TemaContext';
import { useEventos } from '../hooks/useEventos';
import { useMembros } from '../hooks/useMembros';
import type { Evento } from '../types/evento';
import { eventosFuturos, eventosPassados, filtrarPorNome } from '../utils/eventos';
import '../styles/eventos.css';
import '../styles/admin.css';

type Filtro = 'todos' | 'proximos' | 'passados';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'proximos', rotulo: 'Próximos' },
  { id: 'passados', rotulo: 'Passados' },
];

const POR_PAGINA = 10;

export default function AdminPage() {
  const { admin, carregando: verificandoAdmin } = useAdmin();

  // Sem sessão: vai para o login e volta para cá depois
  if (!verificandoAdmin && !admin) {
    return <Navigate to={`/admin/login?voltar=${encodeURIComponent('/admin')}`} replace />;
  }

  return <Painel verificando={verificandoAdmin} />;
}

function Painel({ verificando }: { verificando: boolean }) {
  useTemaFixo(temaClube);
  const { usuario } = useAdmin();
  const { eventos: carregados, carregando, erro } = useEventos();
  const { membros } = useMembros();

  const [removidos, setRemovidos] = useState<Evento['id'][]>([]);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [pagina, setPagina] = useState(1);
  const [criando, setCriando] = useState(false);
  const [excluindo, setExcluindo] = useState<Evento | null>(null);
  const [aviso, setAviso] = useState('');

  // Lista sem os eventos excluídos nesta visita (evita recarregar tudo)
  const eventos = useMemo(
    () => carregados.filter((e) => !removidos.includes(e.id)),
    [carregados, removidos]
  );
  const proximos = useMemo(() => eventosFuturos(eventos), [eventos]);

  const lista = useMemo(() => {
    const filtrados = filtrarPorNome(eventos, busca);
    if (filtro === 'proximos') return eventosFuturos(filtrados);
    if (filtro === 'passados') return eventosPassados(filtrados);
    // "Todos": próximos primeiro (mais perto antes), depois os passados
    return [...eventosFuturos(filtrados), ...eventosPassados(filtrados)];
  }, [eventos, busca, filtro]);

  const visiveis = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  function aoExcluir(evento: Evento) {
    setRemovidos((atual) => [...atual, evento.id]);
    setExcluindo(null);
    setAviso(`Evento "${evento.nome}" excluído.`);
    // Se a página ficou vazia, volta uma
    if (visiveis.length === 1 && pagina > 1) setPagina(pagina - 1);
  }

  const estatisticas = [
    { icone: '📅', valor: eventos.length, rotulo: 'Eventos cadastrados' },
    { icone: '⏰', valor: proximos.length, rotulo: 'Próximos eventos' },
    { icone: '🎭', valor: membros.length, rotulo: 'Membros ativos' },
  ];

  return (
    <>
      <header className="agenda-hero admin-hero">
        <Navbar ativa="admin" />
        <p className="admin-hero-subtitle">
          Painel de Controle{usuario ? ` · Olá, ${usuario}` : ''}
        </p>
        <h1>Gerenciamento de Eventos</h1>
        <p>
          Adicione, edite ou remova os eventos do site. Mantenha as informações sempre
          atualizadas para o público.
        </p>
        <button
          type="button"
          className="btn btn-primary admin-new-btn"
          onClick={() => setCriando(true)}
          disabled={verificando}
        >
          + Novo Evento
        </button>
        <Link to="/admin/membros" className="btn btn-outline admin-members-link">
          Gerenciar Membros
        </Link>
      </header>

      <main className="admin-main">
        <section className="admin-stats">
          {estatisticas.map(({ icone, valor, rotulo }) => (
            <div className="stat-card" key={rotulo}>
              <div className="stat-icon" aria-hidden="true">{icone}</div>
              <div>
                <strong>{carregando ? '–' : valor}</strong>
                <p>{rotulo}</p>
              </div>
            </div>
          ))}
        </section>

        {aviso && (
          <p className="admin-notice" role="status">
            {aviso}
            <button type="button" aria-label="Fechar aviso" onClick={() => setAviso('')}>
              ✕
            </button>
          </p>
        )}

        <section className="admin-filters">
          <input
            type="search"
            className="admin-search"
            placeholder="🔍 Buscar evento por título..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
          <div className="admin-filter-group">
            {FILTROS.map(({ id, rotulo }) => (
              <button
                key={id}
                type="button"
                className={`admin-filter-btn${filtro === id ? ' active' : ''}`}
                onClick={() => {
                  setFiltro(id);
                  setPagina(1);
                }}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </section>

        {carregando || verificando ? (
          <p className="admin-empty">Carregando eventos...</p>
        ) : erro ? (
          <p className="admin-empty">Não foi possível carregar os eventos.</p>
        ) : lista.length === 0 ? (
          <p className="admin-empty">Nenhum evento encontrado.</p>
        ) : (
          <TabelaEventos eventos={visiveis} aoExcluir={setExcluindo} />
        )}

        <Paginacao
          paginaAtual={pagina}
          total={lista.length}
          porPagina={POR_PAGINA}
          onMudar={setPagina}
        />
      </main>

      {criando && <ModalNovoEvento aoFechar={() => setCriando(false)} />}

      {excluindo && (
        <ModalExcluirEvento
          evento={excluindo}
          aoFechar={() => setExcluindo(null)}
          aoExcluir={aoExcluir}
        />
      )}
    </>
  );
}

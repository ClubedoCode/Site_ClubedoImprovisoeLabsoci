import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ModalExcluirMembro from '../components/admin/ModalExcluirMembro';
import ModalMembro from '../components/admin/ModalMembro';
import TabelaMembros from '../components/admin/TabelaMembros';
import Paginacao from '../components/eventos/Paginacao';
import { temaClube } from '../config/temas';
import { useAdmin } from '../context/AdminContext';
import { useTemaFixo } from '../context/TemaContext';
import type { Membro } from '../types/evento';
import '../styles/eventos.css';
import '../styles/admin.css';

type Filtro = 'todos' | 'ativos' | 'inativos';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'ativos', rotulo: 'Ativos' },
  { id: 'inativos', rotulo: 'Inativos' },
];
const POR_PAGINA = 10;

export default function AdminMembrosPage() {
  const { admin, carregando: verificandoAdmin } = useAdmin();

  if (!verificandoAdmin && !admin) {
    return (
      <Navigate
        to={`/admin/login?voltar=${encodeURIComponent('/admin/membros')}`}
        replace
      />
    );
  }

  return <PainelMembros verificando={verificandoAdmin} />;
}

function PainelMembros({ verificando }: { verificando: boolean }) {
  useTemaFixo(temaClube);
  const { usuario } = useAdmin();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<Membro | null>(null);
  const [criando, setCriando] = useState(false);
  const [excluindo, setExcluindo] = useState<Membro | null>(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      try {
        const resposta = await fetch('/api/membros', { signal: controller.signal });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const json: { data?: Membro[] } = await resposta.json();
        if (!json.data) throw new Error('A resposta não retornou a lista de membros.');
        setMembros(json.data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Erro ao carregar membros para administração:', err);
        setErro('Não foi possível carregar os membros.');
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }

    carregar();
    return () => controller.abort();
  }, []);

  const ativos = useMemo(
    () => membros.filter((membro) => membro.ativo !== 0 && membro.ativo !== false),
    [membros]
  );
  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return membros
      .filter((membro) => {
        const ativo = membro.ativo !== 0 && membro.ativo !== false;
        if (filtro === 'ativos' && !ativo) return false;
        if (filtro === 'inativos' && ativo) return false;
        return (
          !termo ||
          membro.nome.toLocaleLowerCase('pt-BR').includes(termo) ||
          (membro.funcao ?? '').toLocaleLowerCase('pt-BR').includes(termo)
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [membros, busca, filtro]);
  const visiveis = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  function aoSalvar(membro: Membro, avisoApi?: string) {
    const jaExistia = membros.some((item) => item.id === membro.id);
    setMembros((atual) =>
      [...atual.filter((item) => item.id !== membro.id), membro].sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
      )
    );
    setCriando(false);
    setEditando(null);
    setAviso(
      avisoApi ?? `Membro "${membro.nome}" ${jaExistia ? 'atualizado' : 'criado'}.`
    );
  }

  function aoExcluir(membro: Membro, avisoApi?: string) {
    setMembros((atual) => atual.filter((item) => item.id !== membro.id));
    setExcluindo(null);
    setAviso(avisoApi ?? `Membro "${membro.nome}" excluído.`);
    if (visiveis.length === 1 && pagina > 1) setPagina(pagina - 1);
  }

  const estatisticas = [
    { icone: '🎭', valor: membros.length, rotulo: 'Membros cadastrados' },
    { icone: '✅', valor: ativos.length, rotulo: 'Membros ativos' },
    { icone: '⏸️', valor: membros.length - ativos.length, rotulo: 'Membros inativos' },
  ];

  return (
    <>
      <header className="agenda-hero admin-hero">
        <Navbar ativa="admin-membros" />
        <p className="admin-hero-subtitle">
          Painel de Controle{usuario ? ` · Olá, ${usuario}` : ''}
        </p>
        <h1>Gerenciamento de Membros</h1>
        <p>Cadastre, edite, ative ou remova membros da equipe do site.</p>
        <button
          type="button"
          className="btn btn-primary admin-new-btn"
          onClick={() => setCriando(true)}
          disabled={verificando}
        >
          + Novo Membro
        </button>
        <Link to="/admin" className="btn btn-outline admin-members-link">
          Gerenciar Eventos
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
            placeholder="🔍 Buscar por nome ou função..."
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
          <p className="admin-empty">Carregando membros...</p>
        ) : erro ? (
          <p className="admin-empty">{erro}</p>
        ) : lista.length === 0 ? (
          <p className="admin-empty">Nenhum membro encontrado.</p>
        ) : (
          <TabelaMembros
            membros={visiveis}
            aoEditar={setEditando}
            aoExcluir={setExcluindo}
          />
        )}

        <Paginacao
          paginaAtual={pagina}
          total={lista.length}
          porPagina={POR_PAGINA}
          onMudar={setPagina}
        />
      </main>

      {(criando || editando) && (
        <ModalMembro
          membro={editando}
          aoFechar={() => {
            setCriando(false);
            setEditando(null);
          }}
          aoSalvar={aoSalvar}
        />
      )}
      {excluindo && (
        <ModalExcluirMembro
          membro={excluindo}
          aoFechar={() => setExcluindo(null)}
          aoExcluir={aoExcluir}
        />
      )}
    </>
  );
}

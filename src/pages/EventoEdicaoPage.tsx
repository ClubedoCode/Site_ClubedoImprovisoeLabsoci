import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import OrganizacaoEvento from '../components/evento-detalhe/OrganizacaoEvento';
import { temaClube, temaDoProjeto } from '../config/temas';
import { useAdmin } from '../context/AdminContext';
import { useTemaFixo } from '../context/TemaContext';
import { useEventoDetalhe } from '../hooks/useEventoDetalhe';
import { useMembros } from '../hooks/useMembros';
import type { Evento, Imagem, Membro } from '../types/evento';
import { CATEGORIAS, infoCategoria } from '../utils/eventos';
import { aoFalharImagem, urlDeImagem } from '../utils/imagens';
import '../styles/evento-detalhe.css';
import '../styles/evento-edicao.css';

const CAPA_PADRAO = '/images/tela.jpg';

const PROJETOS = [
  { valor: 'cdi', rotulo: 'Clube do Improviso' },
  { valor: 'lab', rotulo: 'LabSoci' },
  { valor: '-', rotulo: 'Ambos' },
];

interface Formulario {
  nome: string;
  categoria: string;
  proj: 'cdi' | 'lab' | '-';
  data: string;
  hora: string; // "HH:mm"
  local: string;
  entrada: string;
  descr: string;
  descr_g: string;
  capa_url: string;
  concluido: boolean;
  tags: string[];
  membros: string[]; // ids como texto
  imagens: string[]; // urls
}

function formularioInicial(
  evento: Evento,
  membros: Membro[],
  imagens: Imagem[],
  tags: string[]
): Formulario {
  return {
    nome: evento.nome ?? '',
    categoria: evento.categoria ?? '',
    proj: evento.proj ?? '-',
    data: evento.data ?? '',
    hora: evento.hora?.slice(0, 5) ?? '',
    local: evento.local ?? '',
    entrada: evento.entrada ?? '',
    descr: evento.descr ?? '',
    descr_g: evento.descr_g ?? '',
    capa_url: evento.capa_url ?? '',
    concluido: Boolean(evento.concluido),
    tags,
    membros: membros.map((m) => String(m.id)),
    imagens: imagens.map((i) => i.url),
  };
}

export default function EventoEdicaoPage() {
  const { id = '' } = useParams();
  const { admin, carregando: verificandoAdmin } = useAdmin();
  const { carregando, status, evento, membros, imagens, tags } = useEventoDetalhe(id);

  // Visitante sem login vai para o login e volta para cá depois.
  // (O servidor também recusa o salvamento sem sessão; isto é só a interface.)
  if (!verificandoAdmin && !admin) {
    const voltar = encodeURIComponent(`/evento/${id}/editar`);
    return <Navigate to={`/admin/login?voltar=${voltar}`} replace />;
  }

  if (carregando || verificandoAdmin) {
    return (
      <Moldura>
        <main className="detail-status">
          <p>Carregando evento...</p>
        </main>
      </Moldura>
    );
  }

  if (status !== 'ok' || !evento) {
    return (
      <Moldura>
        <main className="detail-status">
          <p>
            {status === 'nao-encontrado'
              ? 'Evento não encontrado.'
              : 'Não foi possível carregar o evento.'}
          </p>
          <Link to="/eventos" className="back-button">← Voltar para eventos</Link>
        </main>
      </Moldura>
    );
  }

  return (
    <FormularioEvento
      key={id}
      id={id}
      inicial={formularioInicial(evento, membros, imagens, tags)}
      membrosDoEvento={membros}
    />
  );
}

/** Hero sem capa, usado enquanto carrega ou quando dá erro. */
function Moldura({ children }: { children: ReactNode }) {
  useTemaFixo(temaClube);
  return (
    <>
      <header className="event-detail-hero">
        <img src={CAPA_PADRAO} alt="" className="detail-hero-img" />
        <Navbar ativa="eventos" />
      </header>
      {children}
    </>
  );
}

function FormularioEvento({
  id,
  inicial,
  membrosDoEvento,
}: {
  id: string;
  inicial: Formulario;
  membrosDoEvento: Membro[];
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState(inicial);
  const [novaTag, setNovaTag] = useState('');
  const [novaImagem, setNovaImagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const { membros: membrosAtivos, carregando: carregandoMembros } = useMembros();

  // A cor da página acompanha o projeto escolhido
  useTemaFixo(temaDoProjeto(form.proj));

  // Ativos + quem já está no evento (mesmo que inativo)
  const membrosDisponiveis = [
    ...membrosAtivos,
    ...membrosDoEvento.filter((m) => !membrosAtivos.some((a) => String(a.id) === String(m.id))),
  ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  function alterar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function adicionarTag() {
    const tag = novaTag.trim().replace(/^#/, '');
    if (tag && !form.tags.includes(tag)) alterar('tags', [...form.tags, tag]);
    setNovaTag('');
  }

  function adicionarImagem() {
    const url = novaImagem.trim();
    if (url && !form.imagens.includes(url)) alterar('imagens', [...form.imagens, url]);
    setNovaImagem('');
  }

  function alternarMembro(membroId: string) {
    alterar(
      'membros',
      form.membros.includes(membroId)
        ? form.membros.filter((m) => m !== membroId)
        : [...form.membros, membroId]
    );
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return setErro('O nome do evento é obrigatório.');
    if (!form.data) return setErro('A data do evento é obrigatória.');

    setSalvando(true);
    setErro('');
    try {
      const resposta = await fetch(`/api/evento/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hora: form.hora ? `${form.hora}:00` : '',
          membros: form.membros.map(Number),
        }),
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json.error || json.message || `HTTP ${resposta.status}`);
      navigate(`/evento/${id}`);
    } catch (err) {
      setErro(`Não foi possível salvar: ${err instanceof Error ? err.message : err}`);
      setSalvando(false);
    }
  }

  const capa = form.capa_url.trim() || CAPA_PADRAO;
  const { rotulo } = infoCategoria(form.categoria);

  return (
    <>
      <header className="event-detail-hero">
        <img
          key={capa}
          src={capa}
          alt="Prévia da capa do evento"
          className="detail-hero-img"
          onError={(e) => {
            if (!e.currentTarget.src.endsWith(CAPA_PADRAO)) e.currentTarget.src = CAPA_PADRAO;
          }}
        />
        <Navbar ativa="eventos" />
      </header>

      <form className="event-detail-grid edit-form" onSubmit={salvar} noValidate>
        <article className="detail-main">
          <div className="back-button-wrapper">
            <Link to={`/evento/${id}`} className="back-button">← Voltar para o evento</Link>
          </div>

          <div className="detail-header-card">
            <label className="edit-label edit-label-light" htmlFor="nome">Nome do evento</label>
            <input
              id="nome"
              className="edit-title-input"
              value={form.nome}
              onChange={(e) => alterar('nome', e.target.value)}
              required
            />
            <div className="detail-badges">
              <span className="detail-badge badge-primary">🎪 {rotulo}</span>
              {form.concluido && <span className="detail-badge">✔ Realizado</span>}
              {form.tags.map((tag) => (
                <span className="detail-badge" key={tag}>#{tag}</span>
              ))}
            </div>
          </div>

          <div className="detail-content">
            <div className="info-section">
              <h3 className="section-title">📝 Descrição</h3>
              <Campo rotulo="Descrição curta (aparece nos cartões)" htmlFor="descr">
                <textarea
                  id="descr"
                  rows={3}
                  value={form.descr}
                  onChange={(e) => alterar('descr', e.target.value)}
                />
              </Campo>
              <Campo rotulo="Descrição completa (aparece na página do evento)" htmlFor="descr_g">
                <textarea
                  id="descr_g"
                  rows={8}
                  value={form.descr_g}
                  onChange={(e) => alterar('descr_g', e.target.value)}
                />
              </Campo>
            </div>

            <div className="info-section">
              <h3 className="section-title">📍 Informações Práticas</h3>
              <div className="edit-row">
                <Campo rotulo="📅 Data" htmlFor="data">
                  <input
                    id="data"
                    type="date"
                    value={form.data}
                    onChange={(e) => alterar('data', e.target.value)}
                    required
                  />
                </Campo>
                <Campo rotulo="⏰ Horário" htmlFor="hora">
                  <input
                    id="hora"
                    type="time"
                    value={form.hora}
                    onChange={(e) => alterar('hora', e.target.value)}
                  />
                </Campo>
              </div>
              <Campo rotulo="📍 Local" htmlFor="local">
                <input
                  id="local"
                  value={form.local}
                  placeholder="Sala dos Projetos Culturais"
                  onChange={(e) => alterar('local', e.target.value)}
                />
              </Campo>
              <Campo rotulo="🎟️ Entrada (valor em reais; vazio = gratuita)" htmlFor="entrada">
                <input
                  id="entrada"
                  value={form.entrada}
                  placeholder="Ex.: 20"
                  onChange={(e) => alterar('entrada', e.target.value)}
                />
              </Campo>
            </div>

            <div className="info-section">
              <h3 className="section-title">🎭 Equipe de Coordenação</h3>
              <p className="team-description">Marque os membros que conduzem este evento.</p>
              {carregandoMembros ? (
                <p className="team-description">Carregando membros...</p>
              ) : (
                <div className="members-grid">
                  {membrosDisponiveis.map((membro) => {
                    const membroId = String(membro.id);
                    const marcado = form.membros.includes(membroId);
                    return (
                      <label
                        key={membroId}
                        className={`member-card edit-member${marcado ? ' selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternarMembro(membroId)}
                        />
                        <div className="member-avatar">
                          <img
                            src={urlDeImagem(membro.foto_url, 'membros')}
                            alt=""
                            onError={aoFalharImagem}
                          />
                        </div>
                        <div className="member-info">
                          <h4>{membro.nome}</h4>
                          <div className="member-role">{membro.funcao || 'Participante'}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </article>

        <aside className="detail-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-title">⚙️ Classificação</h3>
            <Campo rotulo="Projeto organizador" htmlFor="proj">
              <select
                id="proj"
                value={form.proj}
                onChange={(e) => alterar('proj', e.target.value as Formulario['proj'])}
              >
                {PROJETOS.map((p) => (
                  <option key={p.valor} value={p.valor}>{p.rotulo}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Categoria" htmlFor="categoria">
              <select
                id="categoria"
                value={form.categoria}
                onChange={(e) => alterar('categoria', e.target.value)}
              >
                <option value="">Sem categoria</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.rotulo}</option>
                ))}
                {form.categoria && !CATEGORIAS.some((c) => c.valor === form.categoria) && (
                  <option value={form.categoria}>{form.categoria}</option>
                )}
              </select>
            </Campo>
            <label className="edit-check">
              <input
                type="checkbox"
                checked={form.concluido}
                onChange={(e) => alterar('concluido', e.target.checked)}
              />
              Evento já realizado
            </label>
          </div>

          <OrganizacaoEvento proj={form.proj} />

          <div className="sidebar-card">
            <h3 className="sidebar-title">🏷️ Tags</h3>
            <ListaEditavel
              itens={form.tags}
              formatar={(tag) => `#${tag}`}
              aoRemover={(tag) => alterar('tags', form.tags.filter((t) => t !== tag))}
            />
            <AdicionarItem
              valor={novaTag}
              placeholder="Nova tag"
              aoMudar={setNovaTag}
              aoAdicionar={adicionarTag}
            />
          </div>

          <div className="sidebar-card">
            <h3 className="sidebar-title">🖼️ Capa</h3>
            <Campo rotulo="URL da imagem de capa (vazio = capa padrão)" htmlFor="capa_url">
              <input
                id="capa_url"
                value={form.capa_url}
                placeholder="/images/tela.jpg"
                onChange={(e) => alterar('capa_url', e.target.value)}
              />
            </Campo>
          </div>

          <div className="sidebar-card">
            <h3 className="sidebar-title">Galeria de Fotos</h3>
            {form.imagens.length === 0 && (
              <p className="gallery-empty">Nenhuma foto adicionada.</p>
            )}
            <div className="edit-gallery">
              {form.imagens.map((url) => (
                <div className="detail-gallery-item edit-gallery-item" key={url}>
                  <img src={urlDeImagem(url, 'eventos')} alt="" onError={aoFalharImagem} />
                  <button
                    type="button"
                    className="edit-remove"
                    aria-label="Remover foto"
                    onClick={() => alterar('imagens', form.imagens.filter((i) => i !== url))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <AdicionarItem
              valor={novaImagem}
              placeholder="URL ou nome do arquivo"
              aoMudar={setNovaImagem}
              aoAdicionar={adicionarImagem}
            />
          </div>

          <div className="sidebar-card edit-actions">
            {erro && <p className="edit-error" role="alert">{erro}</p>}
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
            <Link to={`/evento/${id}`} className="edit-cancel">Cancelar</Link>
          </div>
        </aside>
      </form>
    </>
  );
}

function Campo({
  rotulo,
  htmlFor,
  children,
}: {
  rotulo: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="edit-field">
      <label className="edit-label" htmlFor={htmlFor}>{rotulo}</label>
      {children}
    </div>
  );
}

function ListaEditavel({
  itens,
  formatar,
  aoRemover,
}: {
  itens: string[];
  formatar: (item: string) => string;
  aoRemover: (item: string) => void;
}) {
  if (itens.length === 0) return <p className="gallery-empty">Nenhuma tag.</p>;
  return (
    <div className="edit-chips">
      {itens.map((item) => (
        <span className="edit-chip" key={item}>
          {formatar(item)}
          <button type="button" aria-label={`Remover ${item}`} onClick={() => aoRemover(item)}>
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}

function AdicionarItem({
  valor,
  placeholder,
  aoMudar,
  aoAdicionar,
}: {
  valor: string;
  placeholder: string;
  aoMudar: (valor: string) => void;
  aoAdicionar: () => void;
}) {
  return (
    <div className="edit-add">
      <input
        value={valor}
        placeholder={placeholder}
        onChange={(e) => aoMudar(e.target.value)}
        onKeyDown={(e) => {
          // Enter adiciona o item em vez de enviar o formulário
          if (e.key === 'Enter') {
            e.preventDefault();
            aoAdicionar();
          }
        }}
      />
      <button type="button" onClick={aoAdicionar}>Adicionar</button>
    </div>
  );
}

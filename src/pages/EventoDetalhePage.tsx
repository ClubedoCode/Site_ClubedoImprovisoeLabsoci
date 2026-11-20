import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import OrganizacaoEvento from '../components/evento-detalhe/OrganizacaoEvento';
import CartaoMembro from '../components/evento-detalhe/CartaoMembro';
import GaleriaEvento from '../components/evento-detalhe/GaleriaEvento';
import { temaClube, temaDoProjeto } from '../config/temas';
import { useAdmin } from '../context/AdminContext';
import { useTemaFixo } from '../context/TemaContext';
import { useEventoDetalhe } from '../hooks/useEventoDetalhe';
import { infoCategoria } from '../utils/eventos';
import {
  formatarDataCompleta,
  formatarEntrada,
  formatarHora,
  parseData,
} from '../utils/formatarEvento';
import '../styles/evento-detalhe.css';

const CAPA_PADRAO = '/images/tela.jpg';

const RECOMENDACOES: Record<string, string[]> = {
  oficina: [
    'Chegar com 15 minutos de antecedência',
    'Roupas confortáveis para atividades práticas',
    'Trazer garrafa d\u2019água',
    'Inscrições presenciais no local',
    'Certificado de participação ao final',
  ],
};
const RECOMENDACOES_PADRAO = [
  'Chegar com 15 minutos de antecedência',
  'Silenciar o celular durante a atividade',
];

export default function EventoDetalhePage() {
  const { id = '' } = useParams();
  const { carregando, status, evento, membros, imagens, tags } = useEventoDetalhe(id);

  // Enquanto carrega, usa o tema padrão (laranja), como no site original
  useTemaFixo(evento ? temaDoProjeto(evento.proj) : temaClube);

  const capa = evento?.capa_url || CAPA_PADRAO;

  return (
    <>
      <header className="event-detail-hero">
        <img
          src={capa}
          alt={evento ? `Capa do evento ${evento.nome}` : ''}
          className="detail-hero-img"
          onError={(e) => {
            if (!e.currentTarget.src.endsWith(CAPA_PADRAO)) e.currentTarget.src = CAPA_PADRAO;
          }}
        />
        <Navbar ativa="eventos" />
      </header>

      {carregando && (
        <main className="detail-status">
          <p>Carregando evento...</p>
        </main>
      )}

      {!carregando && (status !== 'ok' || !evento) && (
        <main className="detail-status">
          <p>
            {status === 'nao-encontrado'
              ? 'Evento não encontrado.'
              : 'Não foi possível carregar o evento.'}
          </p>
          <Link to="/eventos" className="back-button">← Voltar para eventos</Link>
        </main>
      )}

      {!carregando && status === 'ok' && evento && (
        <DetalheEvento evento={evento} membros={membros} imagens={imagens} tags={tags} />
      )}
    </>
  );
}

type Dados = ReturnType<typeof useEventoDetalhe>;

function DetalheEvento({
  evento,
  membros,
  imagens,
  tags,
}: {
  evento: NonNullable<Dados['evento']>;
  membros: Dados['membros'];
  imagens: Dados['imagens'];
  tags: Dados['tags'];
}) {
  const { admin } = useAdmin();
  const { rotulo } = infoCategoria(evento.categoria);
  const concluido = Boolean(evento.concluido);
  const hora = formatarHora(evento.hora);
  const descricao = evento.descr_g || evento.descr || 'Em breve mais informações.';
  const recomendacoes =
    RECOMENDACOES[evento.categoria?.toLowerCase() ?? ''] ?? RECOMENDACOES_PADRAO;

  return (
    <main className="event-detail-grid">
      <article className="detail-main">
        <div className="back-button-wrapper with-edit">
          <Link to="/eventos" className="back-button">← Voltar para eventos</Link>
          {admin && (
            <Link to={`/evento/${evento.id}/editar`} className="back-button">
              ✏️ Editar evento
            </Link>
          )}
        </div>

        <div className="detail-header-card">
          <h1>{evento.nome}</h1>
          <div className="detail-badges">
            <span className="detail-badge badge-primary">🎪 {rotulo}</span>
            {concluido && <span className="detail-badge">✔ Realizado</span>}
            {tags.map((tag) => (
              <span className="detail-badge" key={tag}>#{tag}</span>
            ))}
          </div>
        </div>

        <div className="detail-content">
          <div className="info-section">
            <p className="full-description">{descricao}</p>
          </div>

          <div className="info-section">
            <h3 className="section-title">📍 Informações Práticas</h3>
            <div className="info-row">
              <span className="info-icon">📅</span>
              <span><strong>Data:</strong> {formatarDataCompleta(parseData(evento.data))}</span>
            </div>
            {hora && (
              <div className="info-row">
                <span className="info-icon">⏰</span>
                <span><strong>Horário:</strong> {hora}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-icon">📍</span>
              <span><strong>Local:</strong> {evento.local}</span>
            </div>
            <div className="info-row">
              <span className="info-icon">🎟️</span>
              <span><strong>Entrada:</strong> {formatarEntrada(evento.entrada)}</span>
            </div>
          </div>

          {membros.length > 0 && (
            <div className="info-section">
              <h3 className="section-title">🎭 Equipe de Coordenação</h3>
              <p className="team-description">
                Este evento {concluido ? 'foi conduzido' : 'será conduzido'} pelos seguintes
                membros:
              </p>
              <div className="members-grid">
                {membros.map((membro) => (
                  <CartaoMembro key={membro.id} membro={membro} />
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      <aside className="detail-sidebar">
        <OrganizacaoEvento proj={evento.proj} />

        {!concluido && (
          <div className="sidebar-card">
            <h3 className="sidebar-title">Recomendações</h3>
            <ul className="recommendations-list">
              {recomendacoes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {(concluido || imagens.length > 0) && <GaleriaEvento imagens={imagens} />}
      </aside>
    </main>
  );
}
import CartaoEvento from './eventos/CartaoEvento';
import { useProximosEventos } from '../hooks/useProximosEventos';

export default function ProximosEventos() {
  const { eventos, carregando, erro } = useProximosEventos(4);

  return (
    <section className="section parallax-section" id="eventos">
      <div className="overlay light" />
      <div className="parallax-content">
        <p className="section-mini">Programação</p>
        <h2>Próximos Eventos</h2>
        <div className="divider" />

        <div className="events-grid">
          {carregando && <div className="empty-state">Carregando eventos...</div>}
          {erro && (
            <div className="empty-state">Não foi possível carregar os eventos.</div>
          )}
          {!carregando && !erro && eventos.length === 0 && (
            <div className="empty-state">Nenhum evento programado no momento.</div>
          )}

          {eventos.map((evento) => (
            <CartaoEvento key={evento.id} evento={evento} />
          ))}
        </div>
      </div>
    </section>
  );
}
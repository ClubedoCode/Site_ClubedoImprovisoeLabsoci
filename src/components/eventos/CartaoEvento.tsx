import { Link } from 'react-router-dom';
import type { Evento } from '../../types/evento';
import { formatarHora, formatarMes, parseData } from '../../utils/formatarEvento';
import { infoCategoria } from '../../utils/eventos';

export default function CartaoEvento({ evento }: { evento: Evento }) {
  const data = parseData(evento.data);
  const hora = formatarHora(evento.hora);
  const { classe, rotulo } = infoCategoria(evento.categoria);
  const projeto = evento.proj && evento.proj !== '-' ? evento.proj : 'neutro';

  return (
    <Link to={`/evento/${evento.id}`} className="event-card-modern">
      <div className={`event-date-box ${projeto}`}>
        <div className="day-number">{data.getDate()}</div>
        <div className="month-year">
          {formatarMes(data)} {data.getFullYear()}
        </div>
        {hora && <div className="hour">{hora}</div>}
      </div>

      <div className="event-info">
        <h3>{evento.nome}</h3>
        <div className="event-meta">
          <span>{evento.local}</span>
          {hora && <span>{hora}</span>}
        </div>
        <div className="event-tags">
          <span className={classe}>{rotulo}</span>
        </div>
        <p className="event-description">{evento.descr ?? ''}</p>
        <div className="event-location-link">Ver local no mapa • Aberto ao público</div>
      </div>
    </Link>
  );
}
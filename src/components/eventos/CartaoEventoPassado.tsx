import { Link } from 'react-router-dom';
import type { Evento } from '../../types/evento';
import { formatarMes, parseData } from '../../utils/formatarEvento';
import { infoCategoria } from '../../utils/eventos';

export default function CartaoEventoPassado({ evento }: { evento: Evento }) {
  const data = parseData(evento.data);
  const { classe, rotulo } = infoCategoria(evento.categoria);

  return (
    <Link to={`/evento/${evento.id}`} className="event-card-past">
      <div className="past-date">
        <span className="past-day">{data.getDate()}</span>
        <span className="past-month">
          {formatarMes(data)}/{data.getFullYear()}
        </span>
      </div>
      <h3 className="past-title">{evento.nome}</h3>
      <span className={`${classe} past-badge`}>{rotulo}</span>
    </Link>
  );
}
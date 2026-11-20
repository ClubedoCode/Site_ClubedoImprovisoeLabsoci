import { Link } from 'react-router-dom';
import type { Evento } from '../../types/evento';
import { infoCategoria } from '../../utils/eventos';
import { formatarMes, parseData } from '../../utils/formatarEvento';

interface Props {
  eventos: Evento[];
  aoExcluir: (evento: Evento) => void;
}

export default function TabelaEventos({ eventos, aoExcluir }: Props) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Título</th>
            <th>Local</th>
            <th>Tipo</th>
            <th>Status</th>
            <th className="col-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => {
            const data = parseData(evento.data);
            const passado = data < hoje;

            return (
              <tr key={evento.id}>
                <td>
                  <div className={`table-date${passado ? ' past' : ''}`}>
                    <strong>{data.getDate()}</strong>
                    <span>{formatarMes(data)}</span>
                    <small>{data.getFullYear()}</small>
                  </div>
                </td>
                <td>
                  <Link to={`/evento/${evento.id}`} className="table-title">
                    {evento.nome}
                  </Link>
                </td>
                <td>{evento.local}</td>
                <td>
                  <span className="etag">{infoCategoria(evento.categoria).rotulo}</span>
                </td>
                <td>
                  <span className={`status-badge ${passado ? 'past' : 'future'}`}>
                    {passado ? 'Passado' : 'Futuro'}
                  </span>
                </td>
                <td className="col-actions">
                  <div className="table-actions">
                    <Link
                      to={`/evento/${evento.id}/editar`}
                      className="btn-icon btn-edit"
                      title="Editar"
                      aria-label={`Editar ${evento.nome}`}
                    >
                      ✏️
                    </Link>
                    <button
                      type="button"
                      className="btn-icon btn-delete"
                      title="Excluir"
                      aria-label={`Excluir ${evento.nome}`}
                      onClick={() => aoExcluir(evento)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

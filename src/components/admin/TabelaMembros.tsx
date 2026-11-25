import type { Membro } from '../../types/evento';
import { aoFalharImagem, urlDeImagem } from '../../utils/imagens';

interface Props {
  membros: Membro[];
  aoEditar: (membro: Membro) => void;
  aoExcluir: (membro: Membro) => void;
}

export default function TabelaMembros({ membros, aoEditar, aoExcluir }: Props) {
  return (
    <div className="admin-table-wrapper">
      <table className="admin-table member-admin-table">
        <thead>
          <tr>
            <th>Membro</th>
            <th>Função</th>
            <th>Status</th>
            <th className="col-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          {membros.map((membro) => {
            const ativo = membro.ativo !== 0 && membro.ativo !== false;
            return (
              <tr key={membro.id}>
                <td>
                  <span className="member-table-name">
                    <img
                      className="member-table-avatar"
                      src={urlDeImagem(membro.foto_url, 'membros')}
                      alt=""
                      onError={aoFalharImagem}
                    />
                    {membro.nome}
                  </span>
                </td>
                <td>{membro.funcao || 'Participante'}</td>
                <td>
                  <span className={`status-badge ${ativo ? 'future' : 'past'}`}>
                    {ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="col-actions">
                  <div className="table-actions">
                    <button
                      type="button"
                      className="btn-icon btn-edit"
                      title="Editar"
                      aria-label={`Editar ${membro.nome}`}
                      onClick={() => aoEditar(membro)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-delete"
                      title="Excluir"
                      aria-label={`Excluir ${membro.nome}`}
                      onClick={() => aoExcluir(membro)}
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

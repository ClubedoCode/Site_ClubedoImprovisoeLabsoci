import type { Membro } from '../../types/evento';
import { aoFalharImagem, urlDeImagem } from '../../utils/imagens';

export default function CartaoMembro({ membro }: { membro: Membro }) {
  return (
    <div className="member-card">
      <div className="member-avatar">
        <img
          src={urlDeImagem(membro.foto_url, 'membros')}
          alt={`Foto de ${membro.nome}`}
          onError={aoFalharImagem}
        />
      </div>
      <div className="member-info">
        <h4>{membro.nome}</h4>
        <div className="member-role">{membro.funcao || 'Participante'}</div>
      </div>
    </div>
  );
}
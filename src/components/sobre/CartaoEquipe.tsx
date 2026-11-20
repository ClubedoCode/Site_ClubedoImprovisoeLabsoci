import type { Membro } from '../../types/evento';
import { aoFalharImagem, urlDeImagem } from '../../utils/imagens';

export default function CartaoEquipe({ membro }: { membro: Membro }) {
  return (
    <div className="membro-card">
      <div className="membro-foto">
        <img
          src={urlDeImagem(membro.foto_url, 'membros')}
          alt={`Foto de ${membro.nome}`}
          loading="lazy"
          onError={aoFalharImagem}
        />
      </div>
      <div className="membro-info">
        <h3>{membro.nome}</h3>
        <div className="membro-funcao">{membro.funcao || 'Colaborador'}</div>
      </div>
    </div>
  );
}
import { temaClube, temaLabSoci } from '../../config/temas';
import type { Evento } from '../../types/evento';

const ORGS = {
  cdi: [{ tema: temaClube, descricao: 'Projeto de Cultura · UFC Russas' }],
  lab: [
    {
      tema: temaLabSoci,
      descricao:
        'Laboratório de Sociodrama e Desenvolvimento do Pensamento Crítico Social · UFC Russas',
    },
  ],
  ambos: [
    { tema: temaClube, descricao: 'Diretoria de Cultura · UFC Russas' },
    { tema: temaLabSoci, descricao: 'Diretoria de Cultura · UFC Russas' },
  ],
};

export default function OrganizacaoEvento({ proj }: { proj: Evento['proj'] }) {
  const lista = proj === 'cdi' ? ORGS.cdi : proj === 'lab' ? ORGS.lab : ORGS.ambos;

  return (
    <div className="sidebar-card">
      <h3 className="sidebar-title">📌 Organização</h3>
      {lista.map(({ tema, descricao }) => (
        <div className="org-info" key={tema.nome}>
          <img src={tema.logo} alt={tema.nome} className="org-logo" />
          <div>
            <strong>{tema.nome}</strong>
            <p>{descricao}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
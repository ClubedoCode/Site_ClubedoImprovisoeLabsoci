import { useTema } from '../../context/TemaContext';
import { useMembros } from '../../hooks/useMembros';
import CartaoEquipe from './CartaoEquipe';

export default function Equipe() {
  const tema = useTema();
  const { membros, carregando, erro } = useMembros();

  return (
    <section className="membros">
      <h2 className="sobre-section-title">Nossa Equipe</h2>
      <p className="membros-subtitle">
        Conheça os membros que fazem o {tema.nome} acontecer
      </p>

      {carregando && <p className="sobre-empty">Carregando equipe...</p>}
      {erro && <p className="sobre-empty">Erro ao carregar dados da equipe.</p>}
      {!carregando && !erro && membros.length === 0 && (
        <p className="sobre-empty">Nenhum membro cadastrado no momento.</p>
      )}

      {membros.length > 0 && (
        <div className="membros-grid">
          {membros.map((membro) => (
            <CartaoEquipe key={membro.id} membro={membro} />
          ))}
        </div>
      )}
    </section>
  );
}
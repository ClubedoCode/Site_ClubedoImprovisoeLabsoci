const OFICINAS = [
  {
    titulo: 'Jogos Teatrais',
    descricao:
      'Atividades para desenvolver escuta, colaboração, espontaneidade e imaginação.',
  },
  {
    titulo: 'Expressão Corporal',
    descricao: 'Exercícios de presença de palco, postura, ritmo e movimentação.',
  },
  {
    titulo: 'Improviso em Cena',
    descricao:
      'Dinâmicas com criação instantânea de cenas e resolução criativa de situações.',
  },
];

export default function Oficinas() {
  return (
    <section className="section" id="oficinas">
      <div className="section-header">
        <p className="section-mini">Práticas e vivências</p>
        <h2>Oficinas</h2>
        <div className="divider" />
      </div>

      <div className="feature-grid">
        {OFICINAS.map(({ titulo, descricao }) => (
          <div className="feature-box" key={titulo}>
            <h3>{titulo}</h3>
            <p>{descricao}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
import Navbar from '../components/Navbar';
import Equipe from '../components/sobre/Equipe';
import '../styles/sobre.css';

const PILARES = [
  {
    icone: '🎯',
    titulo: 'Missão',
    texto:
      'Promover o teatro de improviso como ferramenta de expressão artística, desenvolvimento pessoal e integração comunitária no campus da UFC Russas e região.',
  },
  {
    icone: '🔭',
    titulo: 'Visão',
    texto:
      'Ser referência em arte e cultura no interior do Ceará, formando artistas e plateias através do improviso teatral.',
  },
  {
    icone: '🤝',
    titulo: 'Valores',
    texto:
      'Criatividade, inclusão, respeito, colaboração, espontaneidade e transformação social.',
  },
];

export default function SobrePage() {
  return (
    <>
      <header className="sobre-hero">
        <Navbar ativa="sobre" />
        <h1>🎭 Sobre o Clube do Improviso</h1>
        <p>Expressão, criatividade e conexão através do improviso teatral na UFC Russas</p>
      </header>

      <main className="sobre-main">
        <section className="pilares-grid">
          {PILARES.map(({ icone, titulo, texto }) => (
            <div className="pilar-card" key={titulo}>
              <div className="pilar-icone" aria-hidden="true">{icone}</div>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </div>
          ))}
        </section>

        <section className="historia">
          <h2 className="sobre-section-title">Nossa História</h2>
          <div className="historia-content">
            <p>
              O Clube do Improviso foi fundado em 2022 por um grupo de estudantes apaixonados
              por teatro da Universidade Federal do Ceará - Campus Russas. O que começou como
              encontros informais em salas de aula rapidamente se transformou em um movimento
              cultural dentro do campus.
            </p>
            <p>
              Desde então, já realizamos mais de 30 oficinas, 15 espetáculos e participamos de
              diversos festivais de teatro na região. Nosso objetivo é democratizar o acesso à
              arte e proporcionar um espaço seguro para que estudantes e comunidade possam
              explorar sua criatividade através do improviso.
            </p>
          </div>
        </section>

        <Equipe />
      </main>
    </>
  );
}
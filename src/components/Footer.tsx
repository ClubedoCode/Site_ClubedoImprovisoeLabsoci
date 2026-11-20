interface FooterProps {
  nome: string;
}

export default function Footer({ nome }: FooterProps) {
  return (
    <footer className="footer">
      <h3>{nome}</h3>
      <p>Universidade Federal do Ceará - Campus Russas</p>
      <p>Expressão, criatividade e conexão através do improviso.</p>
    </footer>
  );
}
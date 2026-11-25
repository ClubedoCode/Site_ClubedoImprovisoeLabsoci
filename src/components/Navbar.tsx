import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useTema } from '../context/TemaContext';

type Pagina = 'inicio' | 'eventos' | 'sobre' | 'admin' | 'admin-membros';

const LINKS: { id: Pagina; rotulo: string; to: string }[] = [
  { id: 'inicio', rotulo: 'Início', to: '/' },
  { id: 'eventos', rotulo: 'Eventos', to: '/eventos' },
  { id: 'sobre', rotulo: 'Sobre Nós', to: '/sobre' },
];

export default function Navbar({ ativa }: { ativa?: Pagina }) {
  const tema = useTema();
  const { admin, sair } = useAdmin();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <nav className="navbar">
      <div className="logo">
        <div className="logo-circle">
          <img src={tema.logo} alt={tema.nome} />
        </div>
        <span>{tema.nome}</span>
      </div>

      <button
        className="menu-toggle"
        aria-label="Abrir menu"
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto((aberto) => !aberto)}
      >
        ☰
      </button>

      <ul className={`nav-links${menuAberto ? ' show' : ''}`}>
        {LINKS.map(({ id, rotulo, to }) => (
          <li key={id}>
            <Link to={to} className={ativa === id ? 'active' : undefined}>
              {rotulo}
            </Link>
          </li>
        ))}
        {admin && (
          <li>
            <Link to="/admin" className={ativa === 'admin' ? 'active' : undefined}>
              Eventos (admin)
            </Link>
          </li>
        )}
        {admin && (
          <li>
            <Link
              to="/admin/membros"
              className={ativa === 'admin-membros' ? 'active' : undefined}
            >
              Membros (admin)
            </Link>
          </li>
        )}
        {admin && (
          <li>
            <button type="button" className="nav-logout" onClick={sair}>
              Sair (admin)
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
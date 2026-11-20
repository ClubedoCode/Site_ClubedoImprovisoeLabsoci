import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { temaClube } from '../config/temas';
import { useAdmin } from '../context/AdminContext';
import { useTemaFixo } from '../context/TemaContext';
import '../styles/evento-detalhe.css';
import '../styles/login.css';

/** Só aceita caminhos internos, para o "?voltar=" não levar a outro site. */
function destinoSeguro(voltar: string | null): string {
  return voltar && voltar.startsWith('/') && !voltar.startsWith('//') ? voltar : '/admin';
}

export default function LoginPage() {
  useTemaFixo(temaClube);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const destino = destinoSeguro(params.get('voltar'));
  const { admin, carregando, entrar } = useAdmin();

  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Quem já está logado não precisa ver o formulário
  if (!carregando && admin && !enviando) return <Navigate to={destino} replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(usuario.trim(), senha);
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar.');
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="event-detail-hero">
        <img src="/images/tela.jpg" alt="" className="detail-hero-img" />
        <Navbar />
      </header>

      <main className="login-page">
        <form className="login-card" onSubmit={enviar}>
          <h1>Área do administrador</h1>
          <p className="login-subtitle">Entre para editar os eventos do site.</p>

          <label htmlFor="usuario">Usuário</label>
          <input
            id="usuario"
            autoComplete="username"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            autoFocus
          />

          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {erro && <p className="login-error" role="alert">{erro}</p>}

          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </main>
    </>
  );
}

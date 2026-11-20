import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTema } from '../context/TemaContext';
import Navbar from './Navbar';

const IMAGENS_HERO = ['tela.jpg', 'tela2.jpg', 'tela3.jpg', 'tela4.jpg'];

export default function Hero() {
  const tema = useTema();
  const [imagem] = useState(
    () => IMAGENS_HERO[Math.floor(Math.random() * IMAGENS_HERO.length)]
  );

  return (
    <header
      className="hero"
      id="inicio"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.58)), url("/images/${imagem}")`,
      }}
    >
      <div className="overlay" />

      <Navbar ativa="inicio" />

      <div className="hero-content">
        <p className="hero-subtitle">{tema.subtitulo}</p>
        {tema.subtituloExtra && (
          <p className="hero-subtitle-extra">{tema.subtituloExtra}</p>
        )}
        <h1>FAZER ARTE É UM ATO DE RESISTÊNCIA</h1>
        <p className="hero-text">
          Um espaço de criatividade, expressão e conexão por meio de jogos teatrais,
          oficinas e apresentações que aproximam arte e universidade.
        </p>
        <div className="hero-buttons">
          <Link to="/eventos" className="btn btn-primary">Ver eventos</Link>
          <Link to="/sobre" className="btn btn-secondary">Conheça o projeto</Link>
        </div>
      </div>
    </header>
  );
}
import type { Imagem } from '../../types/evento';
import { aoFalharImagem, urlDeImagem } from '../../utils/imagens';

export default function GaleriaEvento({ imagens }: { imagens: Imagem[] }) {
  return (
    <div className="sidebar-card">
      <h3 className="sidebar-title">Galeria de Fotos</h3>

      {imagens.length === 0 ? (
        <p className="gallery-empty">As fotos deste evento ainda não foram publicadas.</p>
      ) : (
        <div className="gallery-scroll">
          {imagens.map((imagem, i) => (
            <div className="detail-gallery-item" key={imagem.id}>
              <img
                src={urlDeImagem(imagem.url, 'eventos')}
                alt={`Foto do evento ${i + 1}`}
                loading="lazy"
                onError={aoFalharImagem}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
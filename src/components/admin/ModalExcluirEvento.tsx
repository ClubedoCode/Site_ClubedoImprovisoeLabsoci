import { useState } from 'react';
import type { Evento } from '../../types/evento';
import { formatarDataCompleta, parseData } from '../../utils/formatarEvento';
import Modal from './Modal';

interface Props {
  evento: Evento;
  aoFechar: () => void;
  aoExcluir: (evento: Evento) => void;
}

export default function ModalExcluirEvento({ evento, aoFechar, aoExcluir }: Props) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');

  async function excluir() {
    setExcluindo(true);
    setErro('');
    try {
      const resposta = await fetch(`/api/evento/${encodeURIComponent(evento.id)}`, {
        method: 'DELETE',
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json.error || json.message || `HTTP ${resposta.status}`);
      aoExcluir(evento);
    } catch (err) {
      setErro(`Não foi possível excluir: ${err instanceof Error ? err.message : err}`);
      setExcluindo(false);
    }
  }

  return (
    <Modal titulo="🗑️ Excluir evento" aoFechar={aoFechar}>
      <div className="admin-form">
        <p className="confirm-text">
          Tem certeza que deseja excluir <strong>{evento.nome}</strong> (
          {formatarDataCompleta(parseData(evento.data))})?
        </p>
        <p className="form-hint">
          A equipe, as tags e as fotos ligadas a ele também saem do evento. Essa ação não
          pode ser desfeita.
        </p>

        {erro && <p className="admin-error" role="alert">{erro}</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={aoFechar} autoFocus>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={excluir}
            disabled={excluindo}
          >
            {excluindo ? 'Excluindo...' : 'Excluir evento'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

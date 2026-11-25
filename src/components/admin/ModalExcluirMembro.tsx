import { useState } from 'react';
import type { Membro } from '../../types/evento';
import Modal from './Modal';

interface Props {
  membro: Membro;
  aoFechar: () => void;
  aoExcluir: (membro: Membro, aviso?: string) => void;
}

export default function ModalExcluirMembro({ membro, aoFechar, aoExcluir }: Props) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmandoVinculos, setConfirmandoVinculos] = useState(false);
  const [eventosVinculados, setEventosVinculados] = useState(0);

  async function excluir(confirmarVinculos = false) {
    setExcluindo(true);
    setErro('');
    try {
      const url = `/api/membro/${encodeURIComponent(membro.id)}${
        confirmarVinculos ? '?forcar=1' : ''
      }`;
      const resposta = await fetch(url, { method: 'DELETE' });
      const json: {
        error?: string;
        message?: string;
        aviso?: string;
        vinculos?: number;
      } =
        await resposta.json().catch(() => ({}));
      if (resposta.status === 409 && json.vinculos) {
        setEventosVinculados(json.vinculos);
        setConfirmandoVinculos(true);
        setExcluindo(false);
        return;
      }
      if (!resposta.ok) {
        const mensagem = json.error || json.message || `HTTP ${resposta.status}`;
        throw new Error(json.aviso ? `${mensagem} ${json.aviso}` : mensagem);
      }
      aoExcluir(membro, json.aviso);
    } catch (err) {
      setErro(`Não foi possível excluir: ${err instanceof Error ? err.message : err}`);
      setExcluindo(false);
    }
  }

  return (
    <Modal titulo="🗑️ Excluir membro" aoFechar={aoFechar}>
      <div className="admin-form">
        <p className="confirm-text">
          Tem certeza que deseja excluir <strong>{membro.nome}</strong>?
        </p>
        <p className="form-hint">
          Se houver vínculos com eventos, você receberá um aviso antes da remoção.
        </p>
        {confirmandoVinculos && (
          <p className="admin-error" role="alert">
            Este membro está afiliado a {eventosVinculados}{' '}
            {eventosVinculados === 1 ? 'evento' : 'eventos'}. Se continuar, ele será
            removido desses eventos; os eventos continuarão cadastrados.
          </p>
        )}
        {erro && <p className="admin-error" role="alert">{erro}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={aoFechar} autoFocus>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => excluir(confirmandoVinculos)}
            disabled={excluindo}
          >
            {excluindo
              ? 'Excluindo...'
              : confirmandoVinculos
                ? 'Remover mesmo assim'
                : 'Excluir membro'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

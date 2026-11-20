import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIAS } from '../../utils/eventos';
import Modal from './Modal';

const VAZIO = {
  nome: '',
  data: '',
  hora: '',
  local: 'Sala dos Projetos Culturais',
  categoria: '',
  proj: 'cdi',
  descr: '',
};

/**
 * Cadastro rápido com os campos principais. Depois de criar, abre a página
 * de edição para completar o resto (equipe, fotos, capa, tags...).
 */
export default function ModalNovoEvento({ aoFechar }: { aoFechar: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function alterar(campo: keyof typeof VAZIO, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return setErro('O título do evento é obrigatório.');
    if (!form.data) return setErro('A data do evento é obrigatória.');

    setSalvando(true);
    setErro('');
    try {
      const resposta = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hora: form.hora ? `${form.hora}:00` : '' }),
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json.error || json.message || `HTTP ${resposta.status}`);
      navigate(`/evento/${json.data.id}/editar`);
    } catch (err) {
      setErro(`Não foi possível criar: ${err instanceof Error ? err.message : err}`);
      setSalvando(false);
    }
  }

  return (
    <Modal titulo="📅 Novo Evento" aoFechar={aoFechar}>
      <form className="admin-form" onSubmit={salvar} noValidate>
        <div className="form-group">
          <label htmlFor="novo-nome">Título do evento *</label>
          <input
            id="novo-nome"
            placeholder="Ex.: Oficina de Improviso"
            value={form.nome}
            onChange={(e) => alterar('nome', e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="novo-data">Data *</label>
            <input
              id="novo-data"
              type="date"
              value={form.data}
              onChange={(e) => alterar('data', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="novo-hora">Horário</label>
            <input
              id="novo-hora"
              type="time"
              value={form.hora}
              onChange={(e) => alterar('hora', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="novo-local">Local</label>
          <input
            id="novo-local"
            value={form.local}
            onChange={(e) => alterar('local', e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="novo-categoria">Tipo de evento</label>
            <select
              id="novo-categoria"
              value={form.categoria}
              onChange={(e) => alterar('categoria', e.target.value)}
            >
              <option value="">Selecione...</option>
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>{c.rotulo}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="novo-proj">Projeto</label>
            <select
              id="novo-proj"
              value={form.proj}
              onChange={(e) => alterar('proj', e.target.value)}
            >
              <option value="cdi">Clube do Improviso</option>
              <option value="lab">LabSoci</option>
              <option value="-">Ambos</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="novo-descr">Descrição curta</label>
          <textarea
            id="novo-descr"
            rows={3}
            placeholder="Detalhes do evento..."
            value={form.descr}
            onChange={(e) => alterar('descr', e.target.value)}
          />
        </div>

        <p className="form-hint">
          Depois de criar, você vai para a página de edição para completar equipe, fotos e capa.
        </p>

        {erro && <p className="admin-error" role="alert">{erro}</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? 'Criando...' : 'Criar evento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

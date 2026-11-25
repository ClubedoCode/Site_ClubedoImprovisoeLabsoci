import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Membro } from '../../types/evento';
import { aoFalharImagem, urlDeImagem } from '../../utils/imagens';
import Modal from './Modal';

interface Props {
  membro: Membro | null;
  aoFechar: () => void;
  aoSalvar: (membro: Membro, aviso?: string) => void;
}

interface FormularioMembro {
  nome: string;
  funcao: string;
  foto_url: string;
  ativo: boolean;
}

export default function ModalMembro({ membro, aoFechar, aoSalvar }: Props) {
  const [form, setForm] = useState<FormularioMembro>({
    nome: membro?.nome ?? '',
    funcao: membro?.funcao ?? '',
    foto_url: membro?.foto_url ?? '',
    ativo: membro ? membro.ativo !== 0 && membro.ativo !== false : true,
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const arquivoInput = useRef<HTMLInputElement>(null);
  const urlPrevia = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (urlPrevia.current) URL.revokeObjectURL(urlPrevia.current);
    },
    []
  );

  function alterar<K extends keyof FormularioMembro>(campo: K, valor: FormularioMembro[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function selecionarArquivo(novoArquivo: File | null) {
    if (urlPrevia.current) URL.revokeObjectURL(urlPrevia.current);
    urlPrevia.current = novoArquivo ? URL.createObjectURL(novoArquivo) : null;
    setPrevia(urlPrevia.current);
    setArquivo(novoArquivo);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) {
      setErro('O nome do membro é obrigatório.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      const dados = new FormData();
      dados.append('nome', form.nome.trim());
      dados.append('funcao', form.funcao);
      dados.append('foto_url', removerFoto ? '' : form.foto_url);
      dados.append('ativo', String(form.ativo));
      if (arquivo) dados.append('foto', arquivo);
      if (removerFoto && !arquivo) dados.append('remover_foto', 'true');

      const resposta = await fetch(
        membro ? `/api/membro/${encodeURIComponent(membro.id)}` : '/api/membros',
        {
          method: membro ? 'PUT' : 'POST',
          body: dados,
        }
      );
      const json: { error?: string; message?: string; aviso?: string; data?: Membro } =
        await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        const mensagem = json.error || json.message || `HTTP ${resposta.status}`;
        throw new Error(json.aviso ? `${mensagem} ${json.aviso}` : mensagem);
      }
      if (!json.data) throw new Error('A resposta não retornou o membro salvo.');
      aoSalvar(json.data, json.aviso);
    } catch (err) {
      setErro(`Não foi possível salvar: ${err instanceof Error ? err.message : err}`);
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo={membro ? '✏️ Editar membro' : '🎭 Novo membro'}
      aoFechar={aoFechar}
    >
      <form className="admin-form" onSubmit={salvar} noValidate>
        <div className="form-group">
          <label htmlFor="membro-nome">Nome *</label>
          <input
            id="membro-nome"
            value={form.nome}
            onChange={(e) => alterar('nome', e.target.value)}
            maxLength={100}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="membro-funcao">Função</label>
          <input
            id="membro-funcao"
            value={form.funcao}
            onChange={(e) => alterar('funcao', e.target.value)}
            maxLength={100}
            placeholder="Ex.: Coordenação"
          />
        </div>

        <div className="form-group member-photo-field">
          <label htmlFor="membro-arquivo">
            Enviar foto (JPEG, PNG ou WebP; máximo 5 MB)
          </label>
          <p className="form-hint">
            A imagem é otimizada e convertida para WebP automaticamente.
          </p>
          <input
            id="membro-arquivo"
            ref={arquivoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              selecionarArquivo(e.target.files?.[0] ?? null);
              setRemoverFoto(false);
            }}
          />
          {previa || (!removerFoto && form.foto_url) ? (
            <div className="member-photo-preview-wrapper">
              <img
                className="member-photo-preview"
                src={previa ?? urlDeImagem(form.foto_url, 'membros')}
                alt="Prévia da foto do membro"
                onError={aoFalharImagem}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  selecionarArquivo(null);
                  if (arquivoInput.current) arquivoInput.current.value = '';
                  setRemoverFoto(true);
                  alterar('foto_url', '');
                }}
              >
                Remover foto
              </button>
            </div>
          ) : (
            <p className="form-hint">Nenhuma foto selecionada.</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="membro-foto-url">Ou usar URL/nome de arquivo existente</label>
          <input
            id="membro-foto-url"
            value={form.foto_url}
            onChange={(e) => {
              alterar('foto_url', e.target.value);
              selecionarArquivo(null);
              if (arquivoInput.current) arquivoInput.current.value = '';
              setRemoverFoto(false);
            }}
            maxLength={255}
            placeholder="Ex.: https://... ou nome-do-arquivo.jpg"
          />
        </div>

        <label className="edit-check">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => alterar('ativo', e.target.checked)}
          />
          Membro ativo no site
        </label>

        {erro && <p className="admin-error" role="alert">{erro}</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : membro ? 'Salvar alterações' : 'Criar membro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const path = require('path');
const fs = require('fs/promises');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const sqlite3 = require('sqlite3').verbose();

const { ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET } = process.env;
if (!ADMIN_USER || !ADMIN_PASSWORD || !SESSION_SECRET) {
    console.error('Faltam variáveis no .env: ADMIN_USER, ADMIN_PASSWORD e SESSION_SECRET.');
    console.error('Copie o .env.example para .env e preencha os valores.');
    process.exit(1);
}

const app = express();
const port = Number(process.env.PORT) || 3000;
const UPLOADS_DIR = path.resolve(__dirname, process.env.UPLOADS_DIR || 'uploads');
const MEMBER_UPLOADS_DIR = path.join(UPLOADS_DIR, 'membros');
const db = new sqlite3.Database(
    path.resolve(__dirname, process.env.DB_PATH || 'database.db')
);

app.use(express.json());

const uploadFotoMembro = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 5,
        fieldNameSize: 100,
        fieldSize: 2048,
    },
    fileFilter(req, file, callback) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            callback(new Error('Envie uma imagem JPEG, PNG ou WebP.'));
            return;
        }
        callback(null, true);
    },
});

function receberFotoMembro(req, res, next) {
    uploadFotoMembro.single('foto')(req, res, (err) => {
        if (!err) return next();
        const status = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
            ? 413
            : 400;
        res.status(status).json({ error: err.message });
    });
}

// ---------- Sessão de admin ----------
// O cookie guarda "usuario.expiracao.assinatura". A assinatura (HMAC com o
// SESSION_SECRET) impede que alguém fabrique ou altere o cookie no navegador.

const COOKIE_SESSAO = 'admin_sessao';
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000; // 8 horas

function assinar(texto) {
    return crypto.createHmac('sha256', SESSION_SECRET).update(texto).digest('base64url');
}

// Compara em tempo constante, para não vazar informação pelo tempo de resposta
function iguais(a, b) {
    const hashA = crypto.createHash('sha256').update(String(a)).digest();
    const hashB = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(hashA, hashB);
}

function criarToken(usuario) {
    const dados = `${Buffer.from(usuario).toString('base64url')}.${Date.now() + DURACAO_SESSAO_MS}`;
    return `${dados}.${assinar(dados)}`;
}

/** Devolve o usuário se o token for válido e não tiver expirado; senão null. */
function lerToken(token) {
    const partes = String(token || '').split('.');
    if (partes.length !== 3) return null;

    const [usuario64, expira, assinatura] = partes;
    if (!iguais(assinatura, assinar(`${usuario64}.${expira}`))) return null;
    if (Number(expira) < Date.now()) return null;

    return Buffer.from(usuario64, 'base64url').toString();
}

function lerCookie(req, nome) {
    const cookies = req.headers.cookie || '';
    for (const parte of cookies.split(';')) {
        const [chave, ...valor] = parte.trim().split('=');
        if (chave === nome) return decodeURIComponent(valor.join('='));
    }
    return null;
}

function usuarioDaSessao(req) {
    return lerToken(lerCookie(req, COOKIE_SESSAO));
}

const OPCOES_COOKIE = {
    httpOnly: true, // o JavaScript da página não consegue ler o cookie
    sameSite: 'lax', // não é enviado por formulários de outros sites
    secure: process.env.NODE_ENV === 'production', // só HTTPS em produção
    path: '/',
};

/** "Porteiro": só deixa passar quem tem sessão de admin válida. */
function exigirAdmin(req, res, next) {
    if (!usuarioDaSessao(req)) {
        res.status(401).json({ error: 'Não autorizado. Faça login como administrador.' });
        return;
    }
    next();
}

app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body ?? {};
    const usuarioOk = iguais(usuario ?? '', ADMIN_USER);
    const senhaOk = iguais(senha ?? '', ADMIN_PASSWORD);

    if (!usuarioOk || !senhaOk) {
        res.status(401).json({ error: 'Usuário ou senha incorretos.' });
        return;
    }

    res.cookie(COOKIE_SESSAO, criarToken(ADMIN_USER), {
        ...OPCOES_COOKIE,
        maxAge: DURACAO_SESSAO_MS,
    });
    res.json({ message: 'sucesso', data: { admin: true, usuario: ADMIN_USER } });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie(COOKIE_SESSAO, OPCOES_COOKIE);
    res.json({ message: 'sucesso' });
});

// O front-end pergunta aqui se quem está navegando é admin
app.get('/api/sessao', (req, res) => {
    const usuario = usuarioDaSessao(req);
    res.json({ message: 'sucesso', data: { admin: Boolean(usuario), usuario } });
});

// Colunas públicas de Membros (sem matrícula)
const COLUNAS_MEMBRO = 'm.id, m.nome, m.foto_url, m.funcao';

function listar(res, sql, params = []) {
    db.all(sql, params, (err, rows) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json({ message: 'sucesso', data: rows });
    });
}

// ---------- API ----------

app.get('/api/eventos', (req, res) => {
    listar(res, 'SELECT * FROM Eventos ORDER BY data ASC');
});

app.get('/api/membros', (req, res) => {
    listar(res, `SELECT ${COLUNAS_MEMBRO}, m.ativo FROM Membros m ORDER BY m.nome ASC`);
});

app.get('/api/evento/:id', (req, res) => {
    db.get('SELECT * FROM Eventos WHERE id = ?', [req.params.id], (err, row) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (!row) { res.status(404).json({ message: 'Evento não encontrado' }); return; }
        res.json({ message: 'sucesso', data: row });
    });
});

app.get('/api/evento/:id/membros', (req, res) => {
    listar(
        res,
        `SELECT ${COLUNAS_MEMBRO}
         FROM Membros m
         INNER JOIN evento_membro em ON em.membro_id = m.id
         WHERE em.evento_id = ?
         ORDER BY m.nome ASC`,
        [req.params.id]
    );
});

app.get('/api/evento/:id/imagens', (req, res) => {
    listar(
        res,
        `SELECT i.id, i.url
         FROM Imagens i
         INNER JOIN evento_imagem ei ON ei.imagem_id = i.id
         WHERE ei.evento_id = ?
         ORDER BY i.id ASC`,
        [req.params.id]
    );
});

app.get('/api/evento/:id/tags', (req, res) => {
    listar(res, 'SELECT tag FROM evento_tag WHERE evento_id = ?', [req.params.id]);
});

// ---------- Edição de evento ----------

// Versões em Promise das funções do sqlite3
function executar(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function buscarUm(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
}

function erroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

async function armazenarFotoMembro(arquivo) {
    let buffer;
    let metadata;
    try {
        const imagem = sharp(arquivo.buffer, { failOn: 'error', limitInputPixels: 25_000_000 });
        metadata = await imagem.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
            throw erroHttp(400, 'O conteúdo enviado não é uma imagem JPEG, PNG ou WebP válida.');
        }
        if (!metadata.width || !metadata.height ||
            metadata.width * metadata.height > 25_000_000) {
            throw erroHttp(413, 'A imagem excede o limite de resolução permitido.');
        }
        buffer = await sharp(arquivo.buffer, {
            failOn: 'error',
            limitInputPixels: 25_000_000,
        })
            .rotate()
            .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();
    } catch (erro) {
        if (erro.status) throw erro;
        throw erroHttp(400, 'Não foi possível processar a imagem enviada.');
    }

    await fs.mkdir(MEMBER_UPLOADS_DIR, { recursive: true });
    const nomeArquivo = `${crypto.randomUUID()}.webp`;
    const caminho = path.join(MEMBER_UPLOADS_DIR, nomeArquivo);
    await fs.writeFile(caminho, buffer, { flag: 'wx' });
    return { url: `/uploads/membros/${nomeArquivo}` };
}

function caminhoDeFotoMembro(url) {
    const prefixo = '/uploads/membros/';
    if (typeof url !== 'string' || !url.startsWith(prefixo)) return null;
    const nomeArquivo = url.slice(prefixo.length);
    if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}\.webp$/i.test(nomeArquivo)) {
        return null;
    }
    return path.join(MEMBER_UPLOADS_DIR, nomeArquivo);
}

async function limparFotoMembroSeSemUso(url) {
    const caminho = caminhoDeFotoMembro(url);
    if (!caminho) return false;

    const referencias = await buscarUm(
        'SELECT COUNT(*) AS total FROM Membros WHERE foto_url = ?',
        [url]
    );
    if (referencias.total > 0) return false;

    try {
        await fs.unlink(caminho);
    } catch (erro) {
        if (erro.code !== 'ENOENT') throw erro;
    }
    return true;
}

async function avisoSeFalharLimpeza(url) {
    try {
        await limparFotoMembroSeSemUso(url);
        return null;
    } catch (erro) {
        console.error(`Não foi possível limpar a foto ${url}:`, erro);
        return 'Não foi possível remover uma imagem obsoleta do armazenamento.';
    }
}

const PROJETOS = ['cdi', 'lab', '-'];

function textoOuNulo(valor) {
    if (valor === undefined || valor === null) return null;
    const texto = String(valor).trim();
    return texto === '' ? null : texto;
}

function listaDeTextos(valor) {
    if (!Array.isArray(valor)) return [];
    return [...new Set(valor.map(textoOuNulo).filter(Boolean))];
}

function lerCorpoMembro(corpo = {}) {
    if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
        return { erro: 'Dados do membro inválidos' };
    }

    const nome = textoOuNulo(corpo.nome);
    const funcao = textoOuNulo(corpo.funcao) ?? '';
    const fotoUrl = textoOuNulo(corpo.foto_url);

    if (!nome) return { erro: 'O nome do membro é obrigatório' };
    if (nome.length > 100) return { erro: 'O nome deve ter no máximo 100 caracteres' };
    if (funcao.length > 100) return { erro: 'A função deve ter no máximo 100 caracteres' };
    if (fotoUrl && fotoUrl.length > 255) {
        return { erro: 'A URL da foto deve ter no máximo 255 caracteres' };
    }
    if (fotoUrl && /^[a-z][a-z\d+.-]*:/i.test(fotoUrl) &&
        !/^https?:\/\//i.test(fotoUrl)) {
        return { erro: 'Use uma URL HTTP(S) ou um caminho de imagem local válido' };
    }

    return {
        campos: [
            nome,
            fotoUrl,
            funcao,
            [false, 0, 'false', '0'].includes(corpo.ativo) ? 0 : 1,
        ],
    };
}

/**
 * Valida o corpo enviado pelo formulário de evento.
 * Devolve { erro } ou { campos, membros, tags, imagens }.
 */
function lerCorpoEvento(corpo = {}) {
    const nome = textoOuNulo(corpo.nome);
    const data = textoOuNulo(corpo.data);
    const proj = textoOuNulo(corpo.proj) ?? '-';

    if (!nome) return { erro: 'O nome é obrigatório' };
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return { erro: 'Data inválida (use AAAA-MM-DD)' };
    }
    if (!PROJETOS.includes(proj)) return { erro: 'Projeto inválido' };

    return {
        // Na mesma ordem das colunas usadas no INSERT e no UPDATE
        campos: [
            nome,
            data,
            textoOuNulo(corpo.hora),
            textoOuNulo(corpo.local) ?? 'Sala dos Projetos Culturais',
            textoOuNulo(corpo.descr),
            textoOuNulo(corpo.descr_g),
            textoOuNulo(corpo.capa_url),
            proj,
            textoOuNulo(corpo.categoria),
            corpo.concluido ? 1 : 0,
            textoOuNulo(corpo.entrada),
        ],
        membros: Array.isArray(corpo.membros)
            ? [...new Set(corpo.membros.map(Number).filter(Number.isInteger))]
            : [],
        tags: listaDeTextos(corpo.tags),
        imagens: listaDeTextos(corpo.imagens),
    };
}

const COLUNAS_EVENTO =
    'nome, data, hora, local, descr, descr_g, capa_url, proj, categoria, concluido, entrada';
const COLUNAS_MEMBRO_ADMIN = 'm.id, m.nome, m.foto_url, m.funcao, m.ativo';

app.post('/api/membros', exigirAdmin, receberFotoMembro, async (req, res) => {
    const membro = lerCorpoMembro(req.body);
    if (membro.erro) return res.status(400).json({ error: membro.erro });

    let fotoNova;
    try {
        if (req.file) {
            fotoNova = await armazenarFotoMembro(req.file);
            membro.campos[1] = fotoNova.url;
        }
        const resultado = await executar(
            'INSERT INTO Membros (nome, foto_url, funcao, ativo) VALUES (?, ?, ?, ?)',
            membro.campos
        );
        const criado = await buscarUm(
            `SELECT ${COLUNAS_MEMBRO_ADMIN} FROM Membros m WHERE m.id = ?`,
            [resultado.lastID]
        );
        res.status(201).json({ message: 'sucesso', data: criado });
    } catch (err) {
        const aviso = fotoNova ? await avisoSeFalharLimpeza(fotoNova.url) : null;
        res.status(err.status || 500).json({
            error: err.message,
            ...(aviso ? { aviso } : {}),
        });
    }
});

app.put('/api/membro/:id', exigirAdmin, receberFotoMembro, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    const membro = lerCorpoMembro(req.body);
    if (membro.erro) return res.status(400).json({ error: membro.erro });

    let fotoNova;
    try {
        const anterior = await buscarUm(
            'SELECT foto_url FROM Membros WHERE id = ?',
            [id]
        );
        if (!anterior) return res.status(404).json({ message: 'Membro não encontrado' });

        if (req.file) {
            fotoNova = await armazenarFotoMembro(req.file);
            membro.campos[1] = fotoNova.url;
        } else if (['true', '1'].includes(String(req.body.remover_foto))) {
            membro.campos[1] = null;
        } else if (req.body.foto_url === undefined) {
            membro.campos[1] = anterior.foto_url;
        }

        const resultado = await executar(
            'UPDATE Membros SET nome = ?, foto_url = ?, funcao = ?, ativo = ? WHERE id = ?',
            [...membro.campos, id]
        );
        if (resultado.changes === 0) {
            return res.status(404).json({ message: 'Membro não encontrado' });
        }
        const atualizado = await buscarUm(
            `SELECT ${COLUNAS_MEMBRO_ADMIN} FROM Membros m WHERE m.id = ?`,
            [id]
        );
        const fotoAlterada = anterior.foto_url !== atualizado.foto_url;
        const aviso = fotoAlterada
            ? await avisoSeFalharLimpeza(anterior.foto_url)
            : null;
        res.json({
            message: 'sucesso',
            data: atualizado,
            ...(aviso ? { aviso } : {}),
        });
    } catch (err) {
        const aviso = fotoNova ? await avisoSeFalharLimpeza(fotoNova.url) : null;
        res.status(err.status || 500).json({
            error: err.message,
            ...(aviso ? { aviso } : {}),
        });
    }
});

app.delete('/api/membro/:id', exigirAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
    const confirmarVinculos = req.query.forcar === '1';

    try {
        const removido = await emTransacao(async () => {
            const existe = await buscarUm(
                'SELECT id, foto_url FROM Membros WHERE id = ?',
                [id]
            );
            if (!existe) {
                throw erroHttp(404, 'Membro não encontrado');
            }

            const vinculos = await buscarUm(
                'SELECT COUNT(*) AS total FROM evento_membro WHERE membro_id = ?',
                [id]
            );
            if (vinculos.total > 0 && !confirmarVinculos) {
                const erro = erroHttp(
                    409,
                    'Este membro está associado a eventos. Confirme a remoção para desvinculá-lo.'
                );
                erro.vinculos = vinculos.total;
                throw erro;
            }

            if (vinculos.total > 0) {
                await executar('DELETE FROM evento_membro WHERE membro_id = ?', [id]);
            }
            await executar('DELETE FROM Membros WHERE id = ?', [id]);
            return existe;
        });
        const aviso = await avisoSeFalharLimpeza(removido.foto_url);
        res.json({ message: 'sucesso', ...(aviso ? { aviso } : {}) });
    } catch (err) {
        res.status(err.status || 500).json({
            error: err.message,
            ...(err.vinculos ? { vinculos: err.vinculos } : {}),
        });
    }
});

/** Substitui membros, tags e fotos do evento pelos enviados. */
async function salvarRelacoes(id, { membros, tags, imagens }) {
    await executar('DELETE FROM evento_membro WHERE evento_id = ?', [id]);
    for (const membroId of membros) {
        await executar('INSERT INTO evento_membro (membro_id, evento_id) VALUES (?, ?)', [
            membroId,
            id,
        ]);
    }

    await executar('DELETE FROM evento_tag WHERE evento_id = ?', [id]);
    for (const tag of tags) {
        await executar('INSERT INTO evento_tag (evento_id, tag) VALUES (?, ?)', [id, tag]);
    }

    // Reaproveita a imagem se a URL já estiver cadastrada
    await executar('DELETE FROM evento_imagem WHERE evento_id = ?', [id]);
    for (const url of imagens) {
        const imagem = await buscarUm('SELECT id FROM Imagens WHERE url = ?', [url]);
        const imagemId = imagem
            ? imagem.id
            : (await executar('INSERT INTO Imagens (url) VALUES (?)', [url])).lastID;
        await executar('INSERT INTO evento_imagem (evento_id, imagem_id) VALUES (?, ?)', [
            id,
            imagemId,
        ]);
    }
}

/** Roda as operações numa transação: ou tudo é salvo, ou nada. */
async function emTransacao(operacoes) {
    await executar('BEGIN TRANSACTION');
    try {
        const resultado = await operacoes();
        await executar('COMMIT');
        return resultado;
    } catch (err) {
        await executar('ROLLBACK').catch(() => {});
        throw err;
    }
}

// Criar evento
app.post('/api/eventos', exigirAdmin, async (req, res) => {
    const evento = lerCorpoEvento(req.body);
    if (evento.erro) return res.status(400).json({ error: evento.erro });

    try {
        const id = await emTransacao(async () => {
            const marcadores = evento.campos.map(() => '?').join(', ');
            const { lastID } = await executar(
                `INSERT INTO Eventos (${COLUNAS_EVENTO}) VALUES (${marcadores})`,
                evento.campos
            );
            await salvarRelacoes(lastID, evento);
            return lastID;
        });

        const criado = await buscarUm('SELECT * FROM Eventos WHERE id = ?', [id]);
        res.status(201).json({ message: 'sucesso', data: criado });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Editar evento. Corpo: campos + membros (ids), tags (textos) e imagens (urls)
app.put('/api/evento/:id', exigirAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    const evento = lerCorpoEvento(req.body);
    if (evento.erro) return res.status(400).json({ error: evento.erro });

    try {
        const existe = await buscarUm('SELECT id FROM Eventos WHERE id = ?', [id]);
        if (!existe) return res.status(404).json({ message: 'Evento não encontrado' });

        await emTransacao(async () => {
            const atribuicoes = COLUNAS_EVENTO.split(', ').map((c) => `${c} = ?`).join(', ');
            await executar(`UPDATE Eventos SET ${atribuicoes} WHERE id = ?`, [
                ...evento.campos,
                id,
            ]);
            await salvarRelacoes(id, evento);
        });

        const atualizado = await buscarUm('SELECT * FROM Eventos WHERE id = ?', [id]);
        res.json({ message: 'sucesso', data: atualizado });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Excluir evento (e seus vínculos com membros, tags e fotos)
app.delete('/api/evento/:id', exigirAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    try {
        const existe = await buscarUm('SELECT id FROM Eventos WHERE id = ?', [id]);
        if (!existe) return res.status(404).json({ message: 'Evento não encontrado' });

        await emTransacao(async () => {
            await salvarRelacoes(id, { membros: [], tags: [], imagens: [] });
            await executar('DELETE FROM Eventos WHERE id = ?', [id]);
        });

        res.json({ message: 'sucesso' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// /api/* inexistente devolve JSON 404 (e não o index.html do React)
app.use('/api', (req, res) => {
    res.status(404).json({ message: 'Rota não encontrada' });
});

app.use('/uploads/membros', express.static(MEMBER_UPLOADS_DIR, {
    dotfiles: 'deny',
    index: false,
    maxAge: '7d',
    setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
    },
}));

// ---------- Front-end (build do Vite) ----------

const dist = path.join(__dirname, 'dist');

app.use(express.static(dist));

// Qualquer outra rota (/eventos, /evento/12, /sobre...) cai no React Router
app.use((req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
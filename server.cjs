const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const crypto = require('crypto');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const { ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET } = process.env;
if (!ADMIN_USER || !ADMIN_PASSWORD || !SESSION_SECRET) {
    console.error('Faltam variáveis no .env: ADMIN_USER, ADMIN_PASSWORD e SESSION_SECRET.');
    console.error('Copie o .env.example para .env e preencha os valores.');
    process.exit(1);
}

const app = express();
const port = Number(process.env.PORT) || 3000;
const db = new sqlite3.Database(
    path.resolve(__dirname, process.env.DB_PATH || 'database.db')
);

app.use(express.json());

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
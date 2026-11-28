const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const crypto = require('crypto');
const express = require('express');
const { pool, emTransacao } = require('./db.cjs');

const { ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET } = process.env;
if (!ADMIN_USER || !ADMIN_PASSWORD || !SESSION_SECRET) {
    console.error('Faltam variáveis no .env: ADMIN_USER, ADMIN_PASSWORD e SESSION_SECRET.');
    console.error('Copie o .env.example para .env e preencha os valores.');
    process.exit(1);
}

const app = express();
const port = Number(process.env.PORT) || 3000;


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
    if (!Number.isFinite(Number(expira)) || Number(expira) < Date.now()) return null;

    return Buffer.from(usuario64, 'base64url').toString();
}

function lerCookie(req, nome) {
    const cookies = req.headers.cookie || '';
    for (const parte of cookies.split(';')) {
        const [chave, ...valor] = parte.trim().split('=');
        if (chave === nome) {
            try { return decodeURIComponent(valor.join('=')); } catch { return null; }
        }
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

// ---------- API PostgreSQL ----------
// Projeções explícitas: matrícula nunca é devolvida por estas rotas públicas.
const COLUNAS_MEMBRO = 'm.id, m.nome, m.foto_url, m.funcao';
const PROJETOS = new Set(['cdi', 'lab', '-']);
const CATEGORIAS = new Set(['apresentacao', 'oficina', 'terca', 'Ensaio']);

function falha(res, err) {
    const codigosValidacao = new Set(['22001','22003','22007','22008','22P02','23502','23503','23505','23514']);
    if (codigosValidacao.has(err.code)) {
        return res.status(400).json({ error: 'Dados inválidos ou relacionamento inexistente.' });
    }
    console.error('Erro na operação PostgreSQL:', err.code || err.name);
    return res.status(500).json({ error: 'Falha interna ao acessar o banco.' });
}
function idValido(valor) {
    if (typeof valor !== 'number' && (typeof valor !== 'string' || !/^\d+$/.test(valor))) return null;
    const n = Number(valor);
    return Number.isInteger(n) && n > 0 && n <= 2147483647 ? n : null;
}
function textoOuNulo(valor) {
    if (valor === undefined || valor === null) return null;
    if (typeof valor !== 'string') throw new TypeError('Texto inválido');
    return valor.trim() || null;
}
function listaDeTextos(valor) {
    if (valor === undefined || valor === null) return [];
    if (!Array.isArray(valor)) throw new TypeError('Lista inválida');
    return [...new Set(valor.map(textoOuNulo).filter(Boolean))];
}
function lerCorpoEvento(corpo = {}) {
    try {
        const nome = textoOuNulo(corpo.nome);
        const data = textoOuNulo(corpo.data);
        const hora = textoOuNulo(corpo.hora);
        const proj = textoOuNulo(corpo.proj) ?? '-';
        const categoria = textoOuNulo(corpo.categoria);
        if (!nome) return { erro: 'O nome é obrigatório' };
        if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: 'Data inválida (use AAAA-MM-DD)' };
        if (hora && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(hora)) return { erro: 'Horário inválido' };
        if (!PROJETOS.has(proj)) return { erro: 'Projeto inválido' };
        if (categoria && !CATEGORIAS.has(categoria)) return { erro: 'Categoria inválida' };
        if (corpo.concluido != null && ![true,false,0,1].includes(corpo.concluido)) return { erro: 'Conclusão inválida' };
        if (corpo.membros != null && !Array.isArray(corpo.membros)) return { erro: 'Lista de membros inválida' };
        const membros = (corpo.membros ?? []).map(idValido);
        if (membros.includes(null)) return { erro: 'ID de membro inválido' };
        return {
            campos: [nome,data,hora,textoOuNulo(corpo.local) ?? 'Sala dos Projetos Culturais',
                textoOuNulo(corpo.descr),textoOuNulo(corpo.descr_g),proj,categoria,
                Boolean(corpo.concluido),textoOuNulo(corpo.entrada)],
            capa: textoOuNulo(corpo.capa_url),
            membros: [...new Set(membros)], tags: listaDeTextos(corpo.tags), imagens: listaDeTextos(corpo.imagens),
        };
    } catch { return { erro: 'Formato dos campos do evento inválido' }; }
}

async function listar(res, sql, params = []) {
    try {
        const { rows } = await pool.query(sql, params);
        return res.json({ message: 'sucesso', data: rows });
    } catch (err) { return falha(res, err); }
}
app.get('/api/eventos', (req, res) => listar(res, 'SELECT * FROM eventos_api ORDER BY data ASC, id ASC'));
app.get('/api/membros', (req, res) => listar(res, `SELECT ${COLUNAS_MEMBRO}, m.ativo FROM membros m ORDER BY m.nome ASC, m.id ASC`));
app.get('/api/evento/:id', async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    try {
        const { rows } = await pool.query('SELECT * FROM eventos_api WHERE id = $1', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Evento não encontrado' });
        return res.json({ message: 'sucesso', data: rows[0] });
    } catch (err) { return falha(res, err); }
});
app.get('/api/evento/:id/membros', (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    return listar(res, `SELECT ${COLUNAS_MEMBRO} FROM membros m
        JOIN evento_membro em ON em.membro_id=m.id WHERE em.evento_id=$1 ORDER BY m.nome,m.id`, [id]);
});
app.get('/api/evento/:id/imagens', (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    return listar(res, `SELECT i.id,i.url FROM imagens i JOIN evento_imagem ei ON ei.imagem_id=i.id
        WHERE ei.evento_id=$1 ORDER BY i.id`, [id]);
});
app.get('/api/evento/:id/tags', (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    return listar(res, 'SELECT tag FROM evento_tag WHERE evento_id=$1 ORDER BY tag', [id]);
});

// As operações de escrita compartilham UM cliente do pool durante toda a transação.
async function obterImagem(cliente, url) {
    if (!url) return null;
    // UNIQUE(url) + upsert impede duplicação mesmo sob concorrência.
    const { rows } = await cliente.query(`INSERT INTO imagens(url) VALUES($1)
        ON CONFLICT(url) DO UPDATE SET url=EXCLUDED.url RETURNING id`, [url]);
    return rows[0].id;
}
async function salvarRelacoes(cliente, id, evento) {
    await cliente.query('DELETE FROM evento_membro WHERE evento_id=$1', [id]);
    if (evento.membros.length) await cliente.query(`INSERT INTO evento_membro(evento_id,membro_id)
        SELECT $1, unnest($2::integer[])`, [id, evento.membros]);
    await cliente.query('DELETE FROM evento_tag WHERE evento_id=$1', [id]);
    if (evento.tags.length) await cliente.query(`INSERT INTO evento_tag(evento_id,tag)
        SELECT $1, unnest($2::text[])`, [id, evento.tags]);
    await cliente.query('DELETE FROM evento_imagem WHERE evento_id=$1', [id]);
    const ids = [];
    // Ordem estável de aquisição dos locks de imagens em operações concorrentes.
    for (const url of [...evento.imagens].sort()) ids.push(await obterImagem(cliente, url));
    if (ids.length) await cliente.query(`INSERT INTO evento_imagem(evento_id,imagem_id)
        SELECT $1, unnest($2::integer[])`, [id, ids]);
}
const CAMPOS = 'nome,data,hora,local,descr,descr_g,proj,categoria,concluido,entrada,capa_id';
async function consultaEvento(cliente,id) {
    return (await cliente.query('SELECT * FROM eventos_api WHERE id=$1',[id])).rows[0];
}
app.post('/api/eventos', exigirAdmin, async (req,res) => {
    const evento=lerCorpoEvento(req.body);
    if (evento.erro) return res.status(400).json({error:evento.erro});
    try {
        const criado=await emTransacao(async cliente => {
            const capa=await obterImagem(cliente,evento.capa);
            const {rows}=await cliente.query(`INSERT INTO eventos(${CAMPOS})
                VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,[...evento.campos,capa]);
            const id=rows[0].id;
            await salvarRelacoes(cliente,id,evento);
            return consultaEvento(cliente,id);
        });
        return res.status(201).json({message:'sucesso',data:criado});
    } catch(err) { return falha(res,err); }
});
app.put('/api/evento/:id', exigirAdmin, async (req,res) => {
    const id=idValido(req.params.id);
    if (!id) return res.status(400).json({error:'ID inválido'});
    const evento=lerCorpoEvento(req.body);
    if (evento.erro) return res.status(400).json({error:evento.erro});
    try {
        const atualizado=await emTransacao(async cliente => {
            // Serializa alterações no mesmo evento e evita a janela de corrida do SQLite antigo.
            const lock=await cliente.query('SELECT id FROM eventos WHERE id=$1 FOR UPDATE',[id]);
            if (!lock.rowCount) return null;
            const capa=await obterImagem(cliente,evento.capa);
            const atribuicoes=CAMPOS.split(',').map((c,i)=>`${c}=$${i+1}`).join(',');
            await cliente.query(`UPDATE eventos SET ${atribuicoes} WHERE id=$12`,[...evento.campos,capa,id]);
            await salvarRelacoes(cliente,id,evento);
            return consultaEvento(cliente,id);
        });
        if (!atualizado) return res.status(404).json({message:'Evento não encontrado'});
        return res.json({message:'sucesso',data:atualizado});
    } catch(err) { return falha(res,err); }
});
app.delete('/api/evento/:id', exigirAdmin, async (req,res) => {
    const id=idValido(req.params.id);
    if (!id) return res.status(400).json({error:'ID inválido'});
    try {
        // FKs ON DELETE CASCADE eliminam apenas os vínculos; imagens e membros permanecem.
        const resultado=await pool.query('DELETE FROM eventos WHERE id=$1 RETURNING id',[id]);
        if (!resultado.rowCount) return res.status(404).json({message:'Evento não encontrado'});
        return res.json({message:'sucesso'});
    } catch(err) { return falha(res,err); }
});

app.use('/api', (req,res) => res.status(404).json({message:'Rota não encontrada'}));
const dist=path.join(__dirname,'dist');
app.use(express.static(dist));
app.use((req,res)=>res.sendFile(path.join(dist,'index.html')));

// Falhar cedo caso a conexão ou a migração ainda não estejam prontas.
async function iniciar() {
    try {
        await pool.query('SELECT id FROM eventos_api LIMIT 1');
        const servidor=app.listen(port,()=>console.log(`Servidor rodando em http://localhost:${port} (PostgreSQL)`));
        for (const sinal of ['SIGINT','SIGTERM']) process.once(sinal,()=>servidor.close(()=>pool.end().finally(()=>process.exit(0))));
    } catch(err) {
        console.error('PostgreSQL indisponível ou esquema ausente:',err.code||err.name);
        await pool.end();
        process.exitCode=1;
    }
}
iniciar();

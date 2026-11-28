const { Pool } = require('pg');

// O pg usa PGHOST, PGPORT, PGDATABASE, PGUSER e PGPASSWORD do ambiente.
// Não desativar a validação TLS para produção. Configurar a CA do provedor.
const pool = new Pool({ max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
pool.on('error', (err) => console.error('Falha inesperada no pool PostgreSQL:', err.code || err.name));

async function emTransacao(operacoes) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const resultado = await operacoes(cliente);
        await cliente.query('COMMIT');
        return resultado;
    } catch (err) {
        try { await cliente.query('ROLLBACK'); } catch { /* preservar erro original */ }
        throw err;
    } finally {
        cliente.release();
    }
}

module.exports = { pool, emTransacao };

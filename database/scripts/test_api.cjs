// Executar exclusivamente em banco de desenvolvimento. Cria e remove dados de teste.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });
const assert = require('node:assert/strict');
const { pool } = require('../../db.cjs');
const base = `http://127.0.0.1:${process.env.PORT || 3000}/api`;
const marker = `CDI_TESTE_PG_${Date.now()}_${process.pid}`;
const url = `/images/${marker}.jpg`;
let cookie = '';
let id;
let criouImagem = false;
async function req(route, method='GET', body, auth=true) {
    const r = await fetch(`${base}${route}`, {
        method, headers: { ...(body !== undefined ? {'Content-Type':'application/json'} : {}), ...(auth && cookie ? {Cookie:cookie} : {}) },
        ...(body !== undefined ? {body:JSON.stringify(body)} : {}),
    });
    const json = await r.json();
    const setCookie = r.headers.get('set-cookie');
    if (setCookie && route === '/login' && r.ok) cookie=setCookie.split(';')[0];
    return {status:r.status,json};
}
function expectStatus(r,status) { assert.equal(r.status,status,`Esperado HTTP ${status}, recebido ${r.status}`); return r.json.data; }
async function main() {
    const membros=expectStatus(await req('/membros'),200);
    assert.ok(membros.length,'Migre os membros primeiro');
    assert.ok(membros.every(m=>!Object.hasOwn(m,'matricula')),'Matrícula exposta');
    const membro=membros[0].id;
    const original={nome:marker,data:'2026-12-01',hora:'18:00:00',local:'Teste local',proj:'cdi',categoria:'oficina',concluido:false,entrada:'Gratuita',capa_url:url,imagens:[url],membros:[membro],tags:['tag-A','tag-B']};
    expectStatus(await req('/eventos','POST',original,false),401);
    expectStatus(await req('/login','POST',{usuario:process.env.ADMIN_USER,senha:process.env.ADMIN_PASSWORD}),200);
    assert.ok(cookie);
    const criado=expectStatus(await req('/eventos','POST',original),201);
    id=criado.id; criouImagem=true;
    assert.equal(criado.data,'2026-12-01'); assert.equal(criado.hora,'18:00:00'); assert.equal(criado.capa_url,url);
    assert.equal(criado.concluido,false); assert.equal(criado.entrada,'Gratuita');
    const tags=expectStatus(await req(`/evento/${id}/tags`),200);
    assert.deepEqual(tags.map(t=>t.tag).sort(),['tag-A','tag-B']);
    const equipe=expectStatus(await req(`/evento/${id}/membros`),200);
    assert.equal(equipe.length,1); assert.equal(equipe[0].id,membro);
    assert.ok(!Object.hasOwn(equipe[0],'matricula'));
    assert.equal(expectStatus(await req(`/evento/${id}/imagens`),200)[0].url,url);
    const imagem=await pool.query('SELECT count(*)::int AS n FROM imagens WHERE url=$1',[url]);
    assert.equal(imagem.rows[0].n,1,'Capa e galeria devem reaproveitar imagem');
    let ausente=2147483647;
    while ((await pool.query('SELECT 1 FROM membros WHERE id=$1',[ausente])).rowCount) ausente--;
    expectStatus(await req(`/evento/${id}`,'PUT',{...original,nome:marker+'_INVALIDO',membros:[ausente]}),400);
    assert.equal(expectStatus(await req(`/evento/${id}`),200).nome,marker,'Rollback de edição falhou');
    assert.deepEqual(expectStatus(await req(`/evento/${id}/tags`),200).map(t=>t.tag).sort(),['tag-A','tag-B']);
    assert.equal(expectStatus(await req(`/evento/${id}/membros`),200)[0].id,membro);
    expectStatus(await req('/eventos','POST',{...original,nome:marker+'_DATA_INVALIDA',data:'2026-02-30'}),400);
    expectStatus(await req('/eventos','POST',{...original,nome:marker+'_MEMBRO_INVALIDO',membros:[ausente]}),400);
    const inval=await pool.query('SELECT count(*)::int AS n FROM eventos WHERE nome IN ($1,$2)',[marker+'_DATA_INVALIDA',marker+'_MEMBRO_INVALIDO']);
    assert.equal(inval.rows[0].n,0);
    const editado=expectStatus(await req(`/evento/${id}`,'PUT',{...original,nome:marker+'_EDITADO',concluido:true,tags:['nova']}),200);
    assert.equal(editado.concluido,true);
    assert.deepEqual(expectStatus(await req(`/evento/${id}/tags`),200).map(t=>t.tag),['nova']);
    expectStatus(await req(`/evento/${id}`,'DELETE'),200);
    expectStatus(await req(`/evento/${id}`),404);
    for(const suffix of ['membros','imagens','tags']) assert.deepEqual(expectStatus(await req(`/evento/${id}/${suffix}`),200),[]);
    expectStatus(await req('/logout','POST'),200);
    cookie='';
    expectStatus(await req('/eventos','POST',original,false),401);
    console.log('PASSOU: autenticação, criação, leitura, edição, exclusão, tags múltiplas, capa/galeria, privacidade, rollback e cascata.');
}
main().catch(err=>{console.error(err.message);process.exitCode=1;}).finally(async()=>{
    try {
        // Somente registros marcados por esta execução; não remove dados reais.
        await pool.query('DELETE FROM eventos WHERE nome IN ($1,$2,$3,$4,$5)',[marker,marker+'_EDITADO',marker+'_INVALIDO',marker+'_DATA_INVALIDA',marker+'_MEMBRO_INVALIDO']);
        if(criouImagem) await pool.query(`DELETE FROM imagens i WHERE url=$1 AND NOT EXISTS(SELECT 1 FROM eventos e WHERE e.capa_id=i.id) AND NOT EXISTS(SELECT 1 FROM evento_imagem ei WHERE ei.imagem_id=i.id)`,[url]);
    } catch(err){console.error('Falha na limpeza dos dados de teste:',err.code||err.name);process.exitCode=1;}
    await pool.end();
});

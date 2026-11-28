"""Gera SQL privado e relatório sem alterar o SQLite. Python 3.10+, stdlib."""
import argparse
import datetime as dt
import hashlib
import json
import re
import sqlite3
from pathlib import Path


def literal(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, int):
        return str(value)
    if not isinstance(value, str) or '\x00' in value:
        raise ValueError('Valor não representável no SQL PostgreSQL')
    return "'" + value.replace("'", "''") + "'"


def iso_date(value):
    try:
        return isinstance(value, str) and dt.date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def boolean(value):
    if value not in (0, 1):
        raise ValueError('Booleano legado diferente de 0 ou 1; revisar origem')
    return bool(value)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('sqlite', type=Path)
    p.add_argument('--out', type=Path, default=Path('database/private'))
    p.add_argument('--data-ensaio', help='Data YYYY-MM-DD confirmada pela equipe para o evento 58; sem isso fica em quarentena')
    args = p.parse_args()
    if args.data_ensaio and not iso_date(args.data_ensaio):
        p.error('--data-ensaio deve ser uma data real YYYY-MM-DD')
    src = args.sqlite.resolve(strict=True)
    digest = hashlib.sha256(src.read_bytes()).hexdigest()
    with sqlite3.connect(src.as_uri() + '?mode=ro', uri=True) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA query_only=ON')
        conn.execute('BEGIN')
        if [r[0] for r in conn.execute('PRAGMA integrity_check')] != ['ok']:
            raise RuntimeError('Falha de integridade SQLite')
        if conn.execute('PRAGMA foreign_key_check').fetchall():
            raise RuntimeError('Existem vínculos órfãos no SQLite')
        names = ['Eventos', 'Membros', 'Imagens', 'evento_membro', 'evento_imagem', 'evento_tag']
        raw = {n: [dict(r) for r in conn.execute(f'SELECT * FROM "{n}"')] for n in names}
        seq = dict(conn.execute('SELECT name,seq FROM sqlite_sequence').fetchall())
    if hashlib.sha256(src.read_bytes()).hexdigest() != digest:
        raise RuntimeError('SQLite mudou durante leitura; interrompa o backend e repita')
    test_ids, invalid_ids, selected = [], [], []
    quarantine = []
    corrected = []
    for original in sorted(raw['Eventos'], key=lambda r:r['id']):
        r = dict(original)
        if r['nome'].strip().casefold() in {'evento teste', 'teste'}:
            test_ids.append(r['id'])
            continue
        if args.data_ensaio and r['id'] == 58 and r['nome'] == 'Ensaio Aberto' and not iso_date(r['data']):
            r['data'] = args.data_ensaio
            corrected.append({'id':58, 'campo':'data', 'de':original['data'], 'para':r['data']})
        if not iso_date(r['data']):
            invalid_ids.append(r['id'])
            quarantine.append({'motivo':'data inválida', 'evento':original})
            continue
        if r['hora'] is not None and not re.fullmatch(r'([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?', r['hora']):
            raise ValueError(f"Evento {r['id']}: horário inválido; revisar")
        if r['proj'] not in ('cdi','lab','-'):
            raise ValueError(f"Evento {r['id']}: projeto desconhecido")
        if r['categoria'] is not None and r['categoria'] not in ('apresentacao','oficina','terca','Ensaio'):
            raise ValueError(f"Evento {r['id']}: categoria desconhecida; revisar domínio")
        selected.append(r)
    if args.data_ensaio and not corrected:
        raise ValueError('Não encontrei evento 58 Ensaio Aberto com data inválida; override não aplicado')
    selected_ids = {r['id'] for r in selected}
    rel = {n:[r for r in raw[n] if r['evento_id'] in selected_ids] for n in ('evento_membro','evento_imagem','evento_tag')}
    for item in quarantine:
        eid=item['evento']['id']
        item['vinculos']={n:[r for r in raw[n] if r['evento_id']==eid] for n in rel}
    # Mantém IDs de imagens do legado e cadastra capas ausentes na tabela de imagens.
    images = [dict(r) for r in sorted(raw['Imagens'], key=lambda r:r['id'])]
    by_url = {r['url']:r['id'] for r in images}
    if len(by_url) != len(images) or any(not isinstance(url,str) or not url.strip() for url in by_url):
        raise ValueError('Imagens com URL repetida/vazia; revisar origem antes de migrar')
    next_image = max([0,seq.get('Imagens',0),*(r['id'] for r in images)]) + 1
    for r in selected:
        url = r['capa_url']
        if url and url.strip() and url not in by_url:
            by_url[url] = next_image
            images.append({'id':next_image,'url':url})
            next_image += 1
        r['capa_id'] = by_url.get(url)
        r['concluido'] = boolean(r['concluido'])
    members = [dict(r) for r in sorted(raw['Membros'], key=lambda r:r['id'])]
    for r in members:
        r['ativo'] = boolean(r['ativo'])
        r['matricula'] = str(r['matricula']) if r['matricula'] is not None else None
    tables = {
        'imagens': (['id','url'],images),
        'membros': (['id','nome','foto_url','funcao','ativo','matricula'],members),
        'eventos': (['id','nome','data','hora','local','descr','descr_g','capa_id','proj','categoria','concluido','entrada'],selected),
        'evento_membro': (['evento_id','membro_id'],rel['evento_membro']),
        'evento_imagem': (['evento_id','imagem_id'],rel['evento_imagem']),
        'evento_tag': (['evento_id','tag'],rel['evento_tag']),
    }
    sql=['-- PRIVADO: contém dados pessoais. Não versionar nem compartilhar.','BEGIN;','SET LOCAL standard_conforming_strings = on;',
         'LOCK TABLE eventos,membros,imagens,evento_membro,evento_imagem,evento_tag IN ACCESS EXCLUSIVE MODE;',
         'DO $$ BEGIN IF '+ ' OR '.join(f'EXISTS (SELECT 1 FROM {t})' for t in tables) + " THEN RAISE EXCEPTION 'Destino não está vazio; migração interrompida'; END IF; END; $$;"]
    for table,(cols,rows) in tables.items():
        for r in rows:
            sql.append(f'INSERT INTO {table} ({", ".join(cols)}) VALUES ({", ".join(literal(r[c]) for c in cols)});')
    # Sequences são não transacionais; ajustá-las somente após todas as validações.
    for table,(_,rows) in tables.items():
        sql.append(f"DO $$ BEGIN IF (SELECT count(*) FROM {table}) <> {len(rows)} THEN RAISE EXCEPTION 'Contagem divergente: {table}'; END IF; END; $$;")
    # Verificação integral de conteúdo por comparação bidirecional com o conjunto esperado.
    for table,(cols,rows) in tables.items():
        if not rows: continue
        casts={'id':'integer','evento_id':'integer','membro_id':'integer','imagem_id':'integer','capa_id':'integer','data':'date','hora':'time','ativo':'boolean','concluido':'boolean'}
        values=',\n'.join('('+', '.join(f'{literal(r[c])}::{casts.get(c,"text")}' for c in cols)+')' for r in rows)
        query=f'SELECT {", ".join(cols)} FROM {table}'
        delimiter = '$audit$'
        while delimiter in values:
            delimiter = '$audit' + str(len(delimiter)) + 'x$'
            if delimiter in values:
                delimiter = '$audit' + 'x' * (len(values) + 1) + '$'
        sql.append(f"DO {delimiter} BEGIN IF EXISTS (WITH esperado AS (VALUES {values}) SELECT 1 FROM (({query} EXCEPT SELECT * FROM esperado) UNION ALL (SELECT * FROM esperado EXCEPT {query})) AS diferencas) THEN RAISE EXCEPTION 'Conteúdo divergente: {table}'; END IF; END; {delimiter};")
    for dest,origin in [('eventos','Eventos'),('membros','Membros'),('imagens','Imagens')]:
        high=max([0,seq.get(origin,0),*(r['id'] for r in raw[origin]),*(r['id'] for r in tables[dest][1])])
        sql.append(f"SELECT setval(pg_get_serial_sequence('{dest}','id'), {max(1,high)}, {'true' if high else 'false'});")
    sql.append('COMMIT;')
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'import.sql').write_text('\n'.join(sql)+'\n',encoding='utf-8')
    (args.out/'quarentena.json').write_text(json.dumps(quarantine,ensure_ascii=False,indent=2),encoding='utf-8')
    report={'sha256_sqlite':digest,'origem':{n:len(rows) for n,rows in raw.items()},'eventos_teste_excluidos':len(test_ids),
            'ids_teste_excluidos':test_ids,'ids_quarentena':invalid_ids,'correcoes_autorizadas':corrected,
            'destino_esperado':{n:len(rows) for n,(_,rows) in tables.items()},'matriculas_preservadas':sum(r['matricula'] is not None for r in members),
            'vinculos_excluidos':{n:len(raw[n])-len(rel[n]) for n in rel},'origem_intacta':True}
    (args.out/'relatorio.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    print('SQL gerado; nada foi importado no PostgreSQL. Confira o relatório antes de aplicar.')

if __name__=='__main__': main()

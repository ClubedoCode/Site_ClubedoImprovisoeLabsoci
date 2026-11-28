-- Auditoria sem exibir matrículas, dados pessoais ou descrições.
SELECT 'eventos' AS tabela,count(*) FROM eventos UNION ALL
SELECT 'membros',count(*) FROM membros UNION ALL
SELECT 'imagens',count(*) FROM imagens UNION ALL
SELECT 'evento_membro',count(*) FROM evento_membro UNION ALL
SELECT 'evento_imagem',count(*) FROM evento_imagem UNION ALL
SELECT 'evento_tag',count(*) FROM evento_tag UNION ALL
SELECT 'projetos',count(*) FROM projetos UNION ALL
SELECT 'categorias',count(*) FROM categorias;
SELECT count(*) FILTER(WHERE matricula IS NOT NULL) AS matriculas_preservadas FROM membros;
SELECT id,nome,data,hora FROM eventos ORDER BY id;
SELECT count(*) AS eventos_teste FROM eventos WHERE lower(btrim(nome)) IN ('evento teste','teste');
SELECT count(*) AS orfaos_evento_membro FROM evento_membro em LEFT JOIN eventos e ON e.id=em.evento_id LEFT JOIN membros m ON m.id=em.membro_id WHERE e.id IS NULL OR m.id IS NULL;
SELECT count(*) AS orfaos_evento_imagem FROM evento_imagem ei LEFT JOIN eventos e ON e.id=ei.evento_id LEFT JOIN imagens i ON i.id=ei.imagem_id WHERE e.id IS NULL OR i.id IS NULL;
SELECT count(*) AS orfaos_tag FROM evento_tag et LEFT JOIN eventos e ON e.id=et.evento_id WHERE e.id IS NULL;
SELECT column_name,data_type FROM information_schema.columns WHERE table_name='eventos_api' ORDER BY ordinal_position;

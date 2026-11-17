-- Mantém a chave única consistente com o cadastro, que grava somente dígitos.
UPDATE "estabelecimentos"
SET "cnpj" = regexp_replace("cnpj", '\D', '', 'g')
WHERE "cnpj" ~ '\D';

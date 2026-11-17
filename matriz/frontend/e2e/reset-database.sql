-- Esvazia todas as tabelas da base dos testes E2E (exceto o registo das
-- migrations), antes do seed. Só corre numa base cujo nome termine em _test;
-- o playwright.config.ts já o confirmou antes de chegar aqui.
DO $$
DECLARE
  tables text;
BEGIN
  IF right(current_database(), 5) <> '_test' THEN
    RAISE EXCEPTION 'Recusado: a base "%" não termina em _test.', current_database();
  END IF;
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO tables
    FROM pg_tables
   WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';
  IF tables IS NOT NULL THEN
    EXECUTE 'TRUNCATE ' || tables || ' CASCADE';
  END IF;
END
$$;

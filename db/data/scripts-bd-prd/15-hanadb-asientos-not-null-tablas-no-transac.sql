-- CUENTA
SELECT NUMERO, COUNT(*) FROM com_carrefour_journal_Cuenta
GROUP BY NUMERO HAVING COUNT(*) > 1;
SELECT * FROM com_carrefour_journal_Cuenta
WHERE NUMERO IS NULL OR NOMBRE IS NULL OR TIPO_ID IS NULL;

-- TIPO CUENTA
SELECT CODIGO, COUNT(*) FROM com_carrefour_journal_TipoCuenta
GROUP BY CODIGO HAVING COUNT(*) > 1;
SELECT * FROM com_carrefour_journal_TipoCuenta
WHERE CODIGO IS NULL OR NOMBRE IS NULL;

-- ESTADOS SOLICITUD
SELECT CODIGO, COUNT(*) FROM com_carrefour_journal_EstadosSolicitud
GROUP BY CODIGO HAVING COUNT(*) > 1;
SELECT * FROM com_carrefour_journal_EstadosSolicitud
WHERE CODIGO IS NULL OR NOMBRE IS NULL;

-- SECTOR
SELECT CODIGO, COUNT(*) FROM com_carrefour_journal_Sector
GROUP BY CODIGO HAVING COUNT(*) > 1;
SELECT * FROM com_carrefour_journal_Sector
WHERE CODIGO IS NULL OR NOMBRE IS NULL;

-- TIPO ASIENTO
SELECT CODIGO, COUNT(*) FROM com_carrefour_journal_TipoAsiento
GROUP BY CODIGO HAVING COUNT(*) > 1;
SELECT * FROM com_carrefour_journal_TipoAsiento
WHERE CODIGO IS NULL OR NOMBRE IS NULL;

-- SUBTIPO ASIENTO
SELECT CODIGO, COUNT(*) FROM com_carrefour_journal_SubTipoAsiento
GROUP BY CODIGO HAVING COUNT(*) > 1;
SELECT * FROM com_carrefour_journal_SubTipoAsiento
WHERE CODIGO IS NULL OR NOMBRE IS NULL;

-- REFERENCIA
SELECT CODIGO, COUNT(*) FROM com_carrefour_journal_Referencia
GROUP BY CODIGO HAVING COUNT(*) > 1;
SELECT * FROM com_carrefour_journal_Referencia
WHERE CODIGO IS NULL OR NOMBRE IS NULL;

-- EMPLEADO
SELECT EMAIL, COUNT(*) FROM com_carrefour_journal_Empleado
GROUP BY EMAIL HAVING COUNT(*) > 1;
SELECT * FROM com_carrefour_journal_Empleado
WHERE NOMBRE IS NULL OR EMAIL IS NULL;

-- CARGO
SELECT CODIGO, COUNT(*) FROM com_carrefour_journal_Cargo
GROUP BY CODIGO HAVING COUNT(*) > 1;
SELECT * FROM com_carrefour_journal_Cargo
WHERE CODIGO IS NULL OR NOMBRE IS NULL;

-- CONFIGURACIONES
SELECT EMPLEADO_ID, SECTOR_ID, COUNT(*)
FROM com_carrefour_journal_ConfigSolicitante
GROUP BY EMPLEADO_ID, SECTOR_ID HAVING COUNT(*) > 1;

SELECT EMPLEADO_ID, SECTOR_ID, CARGO_ID, COUNT(*)
FROM com_carrefour_journal_ConfigAprobador
GROUP BY EMPLEADO_ID, SECTOR_ID, CARGO_ID HAVING COUNT(*) > 1;

-- UMBRAL CUENTA
SELECT CUENTACONTABLE_ID, COUNT(*)
FROM com_carrefour_journal_UmbralCuenta
GROUP BY CUENTACONTABLE_ID HAVING COUNT(*) > 1;

SELECT * FROM com_carrefour_journal_UmbralCuenta
WHERE CUENTACONTABLE_ID IS NULL
   OR IMPORTEGERENCIA IS NULL
   OR IMPORTECFO IS NULL;

-- SECUENCIAS
SELECT * FROM com_carrefour_journal_Secuencias
WHERE NOMBRE IS NULL;





-- ALTER TABLE com_carrefour_journal_Cuenta
-- ALTER ("NUMERO" NVARCHAR(20) NOT NULL,
--       "NOMBRE" NVARCHAR(100) NOT NULL,
--       "TIPO_ID" NVARCHAR(36) NOT NULL);

-- ALTER TABLE com_carrefour_journal_TipoCuenta
-- ALTER ("CODIGO" NVARCHAR(50) NOT NULL,
--       "NOMBRE" NVARCHAR(100) NOT NULL);

-- ALTER TABLE com_carrefour_journal_EstadosSolicitud
-- ALTER ("CODIGO" NVARCHAR(10) NOT NULL,
--       "NOMBRE" NVARCHAR(100) NOT NULL);

-- ALTER TABLE com_carrefour_journal_Sector
-- ALTER ("CODIGO" NVARCHAR(50) NOT NULL,
--       "NOMBRE" NVARCHAR(50) NOT NULL);

-- ALTER TABLE com_carrefour_journal_TipoAsiento
-- ALTER ("CODIGO" NVARCHAR(10) NOT NULL,
--       "NOMBRE" NVARCHAR(100) NOT NULL);

-- ALTER TABLE com_carrefour_journal_SubTipoAsiento
-- ALTER ("CODIGO" NVARCHAR(10) NOT NULL,
--       "NOMBRE" NVARCHAR(100) NOT NULL);

-- ALTER TABLE com_carrefour_journal_Referencia
-- ALTER ("CODIGO" NVARCHAR(50) NOT NULL,
--       "NOMBRE" NVARCHAR(100) NOT NULL);

-- ALTER TABLE com_carrefour_journal_Empleado
-- ALTER ("NOMBRE" NVARCHAR(50) NOT NULL,
--       "EMAIL"  NVARCHAR(100) NOT NULL);

-- ALTER TABLE com_carrefour_journal_Cargo
-- ALTER ("CODIGO" NVARCHAR(50) NOT NULL,
--       "NOMBRE" NVARCHAR(100) NOT NULL);

-- ALTER TABLE com_carrefour_journal_ConfigSolicitante
-- ALTER ("EMPLEADO_ID" NVARCHAR(36) NOT NULL,
--       "SECTOR_ID"   NVARCHAR(36) NOT NULL);

-- ALTER TABLE com_carrefour_journal_ConfigAprobador
-- ALTER ("EMPLEADO_ID" NVARCHAR(36) NOT NULL,
--       "SECTOR_ID"   NVARCHAR(36) NOT NULL,
--       "CARGO_ID"    NVARCHAR(36) NOT NULL);

-- ALTER TABLE com_carrefour_journal_UmbralCuenta
-- ALTER ("CUENTACONTABLE_ID" NVARCHAR(36) NOT NULL,
--       "IMPORTEGERENCIA"   DECIMAL(15,2) NOT NULL,
--       "IMPORTECFO"        DECIMAL(15,2) NOT NULL);





CREATE UNIQUE INVERTED INDEX com_carrefour_journal_Cuenta_numeroCuenta
ON com_carrefour_journal_Cuenta (NUMERO);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_TipoCuenta_codigo
ON com_carrefour_journal_TipoCuenta (CODIGO);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_TipoCuenta_nombre
ON com_carrefour_journal_TipoCuenta (NOMBRE);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_EstadosSolicitud_codigo
ON com_carrefour_journal_EstadosSolicitud (CODIGO);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_EstadosSolicitud_nombre
ON com_carrefour_journal_EstadosSolicitud (NOMBRE);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_Sector_codigo
ON com_carrefour_journal_Sector (CODIGO);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_Sector_nombre
ON com_carrefour_journal_Sector (NOMBRE);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_TipoAsiento_codigo
ON com_carrefour_journal_TipoAsiento (CODIGO);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_TipoAsiento_nombre
ON com_carrefour_journal_TipoAsiento (NOMBRE);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_SubTipoAsiento_codigo
ON com_carrefour_journal_SubTipoAsiento (CODIGO);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_SubTipoAsiento_nombre
ON com_carrefour_journal_SubTipoAsiento (NOMBRE);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_Referencia_codigo
ON com_carrefour_journal_Referencia (CODIGO);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_Referencia_nombre
ON com_carrefour_journal_Referencia (NOMBRE);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_Empleado_email
ON com_carrefour_journal_Empleado (EMAIL);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_Cargo_codigo
ON com_carrefour_journal_Cargo (CODIGO);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_Cargo_nombre
ON com_carrefour_journal_Cargo (NOMBRE);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_ConfigSolicitante_empSec
ON com_carrefour_journal_ConfigSolicitante (EMPLEADO_ID, SECTOR_ID);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_ConfigAprobador_empSecCar
ON com_carrefour_journal_ConfigAprobador (EMPLEADO_ID, SECTOR_ID, CARGO_ID);

CREATE UNIQUE INVERTED INDEX com_carrefour_journal_UmbralCuenta_cuenta
ON com_carrefour_journal_UmbralCuenta (CUENTACONTABLE_ID);








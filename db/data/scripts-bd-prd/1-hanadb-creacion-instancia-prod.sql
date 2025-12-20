/*
[DESCRIPTION]

- No description
*/

--LOGUEADO COMO DBADMIN

CREATE SCHEMA ASIENTOS_MANUALES_PRD;
CREATE USER CAP_REMOTE PASSWORD Untintodeverano2026; --Pazodearxeriz2026
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA ASIENTOS_MANUALES_PRD TO CAP_REMOTE;
GRANT CREATE ANY, DROP ON SCHEMA ASIENTOS_MANUALES_PRD TO CAP_REMOTE;


--LOGUEADO COMO CAP_REMOTE


--compile srv/service.cds  --to sql --ESTE CREO TODO
--cds compile db/schema.cds  --to sql


SELECT CURRENT_USER FROM DUMMY;

CREATE COLUMN TABLE CDS_OUTBOX_MESSAGES(
	ID NVARCHAR(36) NOT NULL,
	TIMESTAMP LONGDATE,
	TARGET NVARCHAR(5000),
	MSG NCLOB MEMORY THRESHOLD 1000,
	ATTEMPTS INTEGER DEFAULT 0,
	PARTITION INTEGER DEFAULT 0,
	LASTERROR NCLOB MEMORY THRESHOLD 1000,
	LASTATTEMPTTIMESTAMP LONGDATE,
	STATUS NVARCHAR(23),
	PRIMARY KEY(
		ID
	)
);


CREATE TABLE com_carrefour_journal_CabeceraAsiento (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  numeroSolicitud NVARCHAR(12),
  periodoAnio INTEGER,
  periodoMes INTEGER,
  fechaDocumento DATE,
  fechaContabilizacion DATE,
  claseDocumento NVARCHAR(255),
  moneda NVARCHAR(5),
  textoCabecera NVARCHAR(255),
  sociedad NVARCHAR(50),
  numeroDocumentoSAP NVARCHAR(20),
  idInstanciaWorkflow NVARCHAR(100),
  correo_solicitante NVARCHAR(100),
  estadoSolicitud_ID NVARCHAR(36),
  numeroDocumentoContable NVARCHAR(50),
  CodigoEmpresaContabilizacion NVARCHAR(10),
  AnioFiscalContabilizacion INTEGER,
  numeroAsiento NVARCHAR(50),
  sectorSolicitante_ID NVARCHAR(36),
  tipoAsiento_ID NVARCHAR(36),
  subtipoAsiento_ID NVARCHAR(36),
  referencia_ID NVARCHAR(36),
  solicitante_ID NVARCHAR(36),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_DetalleAsiento (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  cabecera_ID NVARCHAR(36),
  numeroLinea INTEGER,
  descripcion NVARCHAR(255),
  cuentaContable_ID NVARCHAR(36),
  centroCosto NVARCHAR(20),
  clave INTEGER,
  importe DECIMAL(15, 2),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_Cuenta (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  numero NVARCHAR(20),
  nombre NVARCHAR(100),
  tipo_ID NVARCHAR(36),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_TipoCuenta (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  codigo NVARCHAR(50),
  nombre NVARCHAR(100),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_EstadosSolicitud (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  codigo NVARCHAR(10) NOT NULL,
  nombre NVARCHAR(100) NOT NULL,
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_Sector (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  codigo NVARCHAR(50),
  nombre NVARCHAR(50),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_TipoAsiento (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  codigo NVARCHAR(10),
  nombre NVARCHAR(100),
  referencia NVARCHAR(100),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_SubTipoAsiento (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  codigo NVARCHAR(10),
  nombre NVARCHAR(100),
  tipoAsiento_ID NVARCHAR(36),
  umbralMinimoAsiento DECIMAL(15, 2),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_Referencia (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  codigo NVARCHAR(50),
  nombre NVARCHAR(100),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_Empleado (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  nombre NVARCHAR(50),
  email NVARCHAR(100),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_AprobadorSolicitud (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  empleado_ID NVARCHAR(36),
  solicitud_ID NVARCHAR(36),
  fechaAprobacion DATE,
  decision NVARCHAR(15),
  cabecera_ID NVARCHAR(36),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_DatosReporteSeguimiento (
  ID NVARCHAR(36) NOT NULL,
  numeroSolicitud NVARCHAR(255),
  tipoAsiento NVARCHAR(255),
  subtipoAsiento NVARCHAR(255),
  fechaCreacion TIMESTAMP,
  aprobador NVARCHAR(255),
  fechaAprobacion TIMESTAMP,
  estado NVARCHAR(255),
  numeroDocumentoSAP NVARCHAR(255),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_Secuencias (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  nombre NVARCHAR(50) NOT NULL,
  valor INTEGER,
  PRIMARY KEY(ID, nombre)
);

CREATE TABLE com_carrefour_journal_Cargo (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  codigo NVARCHAR(50),
  nombre NVARCHAR(100),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_ConfigAprobador (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  empleado_ID NVARCHAR(36),
  sector_ID NVARCHAR(36),
  cargo_ID NVARCHAR(36),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_ConfigSolicitante (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  empleado_ID NVARCHAR(36),
  sector_ID NVARCHAR(36),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_UmbralCuenta (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  cuentaContable_ID NVARCHAR(36),
  importeGerencia DECIMAL(15, 2),
  importeCFO DECIMAL(15, 2),
  comentarios NVARCHAR(255),
  PRIMARY KEY(ID)
);

CREATE TABLE com_carrefour_journal_Constantes (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  nombreConstante NVARCHAR(100),
  codigo NVARCHAR(50),
  nombreElemento NVARCHAR(100),
  PRIMARY KEY(ID)
);

CREATE TABLE DRAFT_DraftAdministrativeData (
  DraftUUID NVARCHAR(36) NOT NULL,
  CreationDateTime TIMESTAMP,
  CreatedByUser NVARCHAR(256),
  CreatedByUserDescription NVARCHAR(256),
  DraftIsCreatedByMe BOOLEAN,
  LastChangeDateTime TIMESTAMP,
  LastChangedByUser NVARCHAR(256),
  LastChangedByUserDescription NVARCHAR(256),
  InProcessByUser NVARCHAR(256),
  InProcessByUserDescription NVARCHAR(256),
  DraftIsProcessedByMe BOOLEAN,
  DraftMessages NCLOB,
  PRIMARY KEY(DraftUUID)
);

CREATE TABLE GestionaAsientos_Sectores_drafts (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP NULL,
  createdBy NVARCHAR(255) NULL,
  modifiedAt TIMESTAMP NULL,
  modifiedBy NVARCHAR(255) NULL,
  codigo NVARCHAR(50) NULL,
  nombre NVARCHAR(50) NULL,
  IsActiveEntity BOOLEAN,
  HasActiveEntity BOOLEAN,
  HasDraftEntity BOOLEAN,
  DraftAdministrativeData_DraftUUID NVARCHAR(36) NOT NULL,
  PRIMARY KEY(ID)
);

CREATE TABLE GestionaAsientos_Empleados_drafts (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP NULL,
  createdBy NVARCHAR(255) NULL,
  modifiedAt TIMESTAMP NULL,
  modifiedBy NVARCHAR(255) NULL,
  nombre NVARCHAR(50) NULL,
  email NVARCHAR(100) NULL,
  IsActiveEntity BOOLEAN,
  HasActiveEntity BOOLEAN,
  HasDraftEntity BOOLEAN,
  DraftAdministrativeData_DraftUUID NVARCHAR(36) NOT NULL,
  PRIMARY KEY(ID)
);

CREATE TABLE CatalogService_ConfigAprobadores_drafts (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP NULL,
  createdBy NVARCHAR(255) NULL,
  modifiedAt TIMESTAMP NULL,
  modifiedBy NVARCHAR(255) NULL,
  empleado_ID NVARCHAR(36) NULL,
  sector_ID NVARCHAR(36) NULL,
  cargo_ID NVARCHAR(36) NULL,
  IsActiveEntity BOOLEAN,
  HasActiveEntity BOOLEAN,
  HasDraftEntity BOOLEAN,
  DraftAdministrativeData_DraftUUID NVARCHAR(36) NOT NULL,
  PRIMARY KEY(ID)
);

CREATE TABLE CatalogService_ConfigSolicitantes_drafts (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP NULL,
  createdBy NVARCHAR(255) NULL,
  modifiedAt TIMESTAMP NULL,
  modifiedBy NVARCHAR(255) NULL,
  empleado_ID NVARCHAR(36) NULL,
  sector_ID NVARCHAR(36) NULL,
  IsActiveEntity BOOLEAN,
  HasActiveEntity BOOLEAN,
  HasDraftEntity BOOLEAN,
  DraftAdministrativeData_DraftUUID NVARCHAR(36) NOT NULL,
  PRIMARY KEY(ID)
);

CREATE TABLE CatalogService_Cuentas_drafts (
  ID NVARCHAR(36) NOT NULL,
  numero NVARCHAR(20) NULL,
  nombre NVARCHAR(100) NULL,
  tipo_ID NVARCHAR(36) NULL,
  IsActiveEntity BOOLEAN,
  HasActiveEntity BOOLEAN,
  HasDraftEntity BOOLEAN,
  DraftAdministrativeData_DraftUUID NVARCHAR(36) NOT NULL,
  PRIMARY KEY(ID)
);

CREATE TABLE CatalogService_UmbralesCuentas_drafts (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP NULL,
  createdBy NVARCHAR(255) NULL,
  modifiedAt TIMESTAMP NULL,
  modifiedBy NVARCHAR(255) NULL,
  cuentaContable_ID NVARCHAR(36) NULL,
  importeGerencia DECIMAL(15, 2) NULL,
  importeCFO DECIMAL(15, 2) NULL,
  comentarios NVARCHAR(255) NULL,
  IsActiveEntity BOOLEAN,
  HasActiveEntity BOOLEAN,
  HasDraftEntity BOOLEAN,
  DraftAdministrativeData_DraftUUID NVARCHAR(36) NOT NULL,
  PRIMARY KEY(ID)
);

CREATE TABLE CDS_OUTBOX_MESSAGES (
  ID NVARCHAR(36) NOT NULL , 
  TIMESTAMP LONGDATE, 
  TARGET NVARCHAR(5000), 
  MSG NCLOB MEMORY THRESHOLD 1000, 
  ATTEMPTS INTEGER DEFAULT 0, 
  PARTITION INTEGER DEFAULT 0, 
  LASTERROR NCLOB MEMORY THRESHOLD 1000, 
  LASTATTEMPTTIMESTAMP LONGDATE, 
  STATUS NVARCHAR(23), 
  PRIMARY KEY (ID)
); 

CREATE VIEW GestionaAsientos_CabeceraAsiento AS SELECT
  CabeceraAsiento_0.ID,
  CabeceraAsiento_0.createdAt,
  CabeceraAsiento_0.createdBy,
  CabeceraAsiento_0.modifiedAt,
  CabeceraAsiento_0.modifiedBy,
  CabeceraAsiento_0.numeroSolicitud,
  CabeceraAsiento_0.periodoAnio,
  CabeceraAsiento_0.periodoMes,
  CabeceraAsiento_0.fechaDocumento,
  CabeceraAsiento_0.fechaContabilizacion,
  CabeceraAsiento_0.claseDocumento,
  CabeceraAsiento_0.moneda,
  CabeceraAsiento_0.textoCabecera,
  CabeceraAsiento_0.sociedad,
  CabeceraAsiento_0.numeroDocumentoSAP,
  CabeceraAsiento_0.idInstanciaWorkflow,
  CabeceraAsiento_0.correo_solicitante,
  CabeceraAsiento_0.estadoSolicitud_ID,
  CabeceraAsiento_0.numeroDocumentoContable,
  CabeceraAsiento_0.CodigoEmpresaContabilizacion,
  CabeceraAsiento_0.AnioFiscalContabilizacion,
  CabeceraAsiento_0.numeroAsiento,
  CabeceraAsiento_0.sectorSolicitante_ID,
  CabeceraAsiento_0.tipoAsiento_ID,
  CabeceraAsiento_0.subtipoAsiento_ID,
  CabeceraAsiento_0.referencia_ID,
  CabeceraAsiento_0.solicitante_ID
FROM com_carrefour_journal_CabeceraAsiento AS CabeceraAsiento_0;

CREATE VIEW GestionaAsientos_DetalleAsiento AS SELECT
  DetalleAsiento_0.ID,
  DetalleAsiento_0.createdAt,
  DetalleAsiento_0.createdBy,
  DetalleAsiento_0.modifiedAt,
  DetalleAsiento_0.modifiedBy,
  DetalleAsiento_0.cabecera_ID,
  DetalleAsiento_0.numeroLinea,
  DetalleAsiento_0.descripcion,
  DetalleAsiento_0.cuentaContable_ID,
  DetalleAsiento_0.centroCosto,
  DetalleAsiento_0.clave,
  DetalleAsiento_0.importe
FROM com_carrefour_journal_DetalleAsiento AS DetalleAsiento_0;

CREATE VIEW GestionaAsientos_Cuentas AS SELECT
  Cuenta_0.ID,
  Cuenta_0.createdAt,
  Cuenta_0.createdBy,
  Cuenta_0.modifiedAt,
  Cuenta_0.modifiedBy,
  Cuenta_0.numero,
  Cuenta_0.nombre,
  Cuenta_0.tipo_ID
FROM com_carrefour_journal_Cuenta AS Cuenta_0;

CREATE VIEW GestionaAsientos_EstadosSolicitud AS SELECT
  EstadosSolicitud_0.ID,
  EstadosSolicitud_0.createdAt,
  EstadosSolicitud_0.createdBy,
  EstadosSolicitud_0.modifiedAt,
  EstadosSolicitud_0.modifiedBy,
  EstadosSolicitud_0.codigo,
  EstadosSolicitud_0.nombre
FROM com_carrefour_journal_EstadosSolicitud AS EstadosSolicitud_0;

CREATE VIEW GestionaAsientos_Sectores AS SELECT
  Sector_0.ID,
  Sector_0.createdAt,
  Sector_0.createdBy,
  Sector_0.modifiedAt,
  Sector_0.modifiedBy,
  Sector_0.codigo,
  Sector_0.nombre
FROM com_carrefour_journal_Sector AS Sector_0;

CREATE VIEW GestionaAsientos_TiposAsiento AS SELECT
  TipoAsiento_0.ID,
  TipoAsiento_0.createdAt,
  TipoAsiento_0.createdBy,
  TipoAsiento_0.modifiedAt,
  TipoAsiento_0.modifiedBy,
  TipoAsiento_0.codigo,
  TipoAsiento_0.nombre,
  TipoAsiento_0.referencia
FROM com_carrefour_journal_TipoAsiento AS TipoAsiento_0;

CREATE VIEW GestionaAsientos_SubTiposAsiento AS SELECT
  SubTipoAsiento_0.ID,
  SubTipoAsiento_0.createdAt,
  SubTipoAsiento_0.createdBy,
  SubTipoAsiento_0.modifiedAt,
  SubTipoAsiento_0.modifiedBy,
  SubTipoAsiento_0.codigo,
  SubTipoAsiento_0.nombre,
  SubTipoAsiento_0.tipoAsiento_ID,
  SubTipoAsiento_0.umbralMinimoAsiento
FROM com_carrefour_journal_SubTipoAsiento AS SubTipoAsiento_0;

CREATE VIEW GestionaAsientos_Referencia AS SELECT
  Referencia_0.ID,
  Referencia_0.createdAt,
  Referencia_0.createdBy,
  Referencia_0.modifiedAt,
  Referencia_0.modifiedBy,
  Referencia_0.codigo,
  Referencia_0.nombre
FROM com_carrefour_journal_Referencia AS Referencia_0;

CREATE VIEW GestionaAsientos_Empleados AS SELECT
  Empleado_0.ID,
  Empleado_0.createdAt,
  Empleado_0.createdBy,
  Empleado_0.modifiedAt,
  Empleado_0.modifiedBy,
  Empleado_0.nombre,
  Empleado_0.email
FROM com_carrefour_journal_Empleado AS Empleado_0;

CREATE VIEW GestionaAsientos_AprobadorSolicitud AS SELECT
  AprobadorSolicitud_0.ID,
  AprobadorSolicitud_0.createdAt,
  AprobadorSolicitud_0.createdBy,
  AprobadorSolicitud_0.modifiedAt,
  AprobadorSolicitud_0.modifiedBy,
  AprobadorSolicitud_0.empleado_ID,
  AprobadorSolicitud_0.solicitud_ID,
  AprobadorSolicitud_0.fechaAprobacion,
  AprobadorSolicitud_0.decision,
  AprobadorSolicitud_0.cabecera_ID
FROM com_carrefour_journal_AprobadorSolicitud AS AprobadorSolicitud_0;

CREATE VIEW GestionaAsientos_DatosReporteSeguimiento AS SELECT
  DatosReporteSeguimiento_0.ID,
  DatosReporteSeguimiento_0.numeroSolicitud,
  DatosReporteSeguimiento_0.tipoAsiento,
  DatosReporteSeguimiento_0.subtipoAsiento,
  DatosReporteSeguimiento_0.fechaCreacion,
  DatosReporteSeguimiento_0.aprobador,
  DatosReporteSeguimiento_0.fechaAprobacion,
  DatosReporteSeguimiento_0.estado,
  DatosReporteSeguimiento_0.numeroDocumentoSAP
FROM com_carrefour_journal_DatosReporteSeguimiento AS DatosReporteSeguimiento_0;

CREATE VIEW GestionaAsientos_Secuencias AS SELECT
  Secuencias_0.ID,
  Secuencias_0.createdAt,
  Secuencias_0.createdBy,
  Secuencias_0.modifiedAt,
  Secuencias_0.modifiedBy,
  Secuencias_0.nombre,
  Secuencias_0.valor
FROM com_carrefour_journal_Secuencias AS Secuencias_0;

CREATE VIEW CatalogService_Cargos AS SELECT
  Cargo_0.ID,
  Cargo_0.createdAt,
  Cargo_0.createdBy,
  Cargo_0.modifiedAt,
  Cargo_0.modifiedBy,
  Cargo_0.codigo,
  Cargo_0.nombre
FROM com_carrefour_journal_Cargo AS Cargo_0;

CREATE VIEW CatalogService_Sectores AS SELECT
  Sector_0.ID,
  Sector_0.createdAt,
  Sector_0.createdBy,
  Sector_0.modifiedAt,
  Sector_0.modifiedBy,
  Sector_0.codigo,
  Sector_0.nombre
FROM com_carrefour_journal_Sector AS Sector_0;

CREATE VIEW CatalogService_ConfigAprobadores AS SELECT
  ConfigAprobador_0.ID,
  ConfigAprobador_0.createdAt,
  ConfigAprobador_0.createdBy,
  ConfigAprobador_0.modifiedAt,
  ConfigAprobador_0.modifiedBy,
  ConfigAprobador_0.empleado_ID,
  ConfigAprobador_0.sector_ID,
  ConfigAprobador_0.cargo_ID
FROM com_carrefour_journal_ConfigAprobador AS ConfigAprobador_0;

CREATE VIEW CatalogService_Empleados AS SELECT
  Empleado_0.ID,
  Empleado_0.createdAt,
  Empleado_0.createdBy,
  Empleado_0.modifiedAt,
  Empleado_0.modifiedBy,
  Empleado_0.nombre,
  Empleado_0.email
FROM com_carrefour_journal_Empleado AS Empleado_0;

CREATE VIEW CatalogService_ConfigSolicitantes AS SELECT
  ConfigSolicitante_0.ID,
  ConfigSolicitante_0.createdAt,
  ConfigSolicitante_0.createdBy,
  ConfigSolicitante_0.modifiedAt,
  ConfigSolicitante_0.modifiedBy,
  ConfigSolicitante_0.empleado_ID,
  ConfigSolicitante_0.sector_ID
FROM com_carrefour_journal_ConfigSolicitante AS ConfigSolicitante_0;

CREATE VIEW CatalogService_TiposCuentas AS SELECT
  TipoCuenta_0.ID,
  TipoCuenta_0.createdAt,
  TipoCuenta_0.createdBy,
  TipoCuenta_0.modifiedAt,
  TipoCuenta_0.modifiedBy,
  TipoCuenta_0.codigo,
  TipoCuenta_0.nombre
FROM com_carrefour_journal_TipoCuenta AS TipoCuenta_0;

CREATE VIEW CatalogService_Cuentas AS SELECT
  Cuenta_0.ID,
  Cuenta_0.numero,
  Cuenta_0.nombre,
  Cuenta_0.tipo_ID
FROM com_carrefour_journal_Cuenta AS Cuenta_0;

CREATE VIEW CatalogService_UmbralesCuentas AS SELECT
  UmbralCuenta_0.ID,
  UmbralCuenta_0.createdAt,
  UmbralCuenta_0.createdBy,
  UmbralCuenta_0.modifiedAt,
  UmbralCuenta_0.modifiedBy,
  UmbralCuenta_0.cuentaContable_ID,
  UmbralCuenta_0.importeGerencia,
  UmbralCuenta_0.importeCFO,
  UmbralCuenta_0.comentarios
FROM com_carrefour_journal_UmbralCuenta AS UmbralCuenta_0;

CREATE VIEW CatalogService_TiposAsiento AS SELECT
  TipoAsiento_0.ID,
  TipoAsiento_0.createdAt,
  TipoAsiento_0.createdBy,
  TipoAsiento_0.modifiedAt,
  TipoAsiento_0.modifiedBy,
  TipoAsiento_0.codigo,
  TipoAsiento_0.nombre,
  TipoAsiento_0.referencia
FROM com_carrefour_journal_TipoAsiento AS TipoAsiento_0;

CREATE VIEW CatalogService_SubTiposAsiento AS SELECT
  SubTipoAsiento_0.ID,
  SubTipoAsiento_0.createdAt,
  SubTipoAsiento_0.createdBy,
  SubTipoAsiento_0.modifiedAt,
  SubTipoAsiento_0.modifiedBy,
  SubTipoAsiento_0.codigo,
  SubTipoAsiento_0.nombre,
  SubTipoAsiento_0.tipoAsiento_ID,
  SubTipoAsiento_0.umbralMinimoAsiento
FROM com_carrefour_journal_SubTipoAsiento AS SubTipoAsiento_0;

CREATE VIEW CatalogService_Constantes AS SELECT
  Constantes_0.ID,
  Constantes_0.createdAt,
  Constantes_0.createdBy,
  Constantes_0.modifiedAt,
  Constantes_0.modifiedBy,
  Constantes_0.nombreConstante,
  Constantes_0.codigo,
  Constantes_0.nombreElemento
FROM com_carrefour_journal_Constantes AS Constantes_0;

CREATE VIEW CatalogService_EstadosSolicitud AS SELECT
  EstadosSolicitud_0.ID,
  EstadosSolicitud_0.createdAt,
  EstadosSolicitud_0.createdBy,
  EstadosSolicitud_0.modifiedAt,
  EstadosSolicitud_0.modifiedBy,
  EstadosSolicitud_0.codigo,
  EstadosSolicitud_0.nombre
FROM com_carrefour_journal_EstadosSolicitud AS EstadosSolicitud_0;

CREATE VIEW CatalogService_Referencia AS SELECT
  Referencia_0.ID,
  Referencia_0.createdAt,
  Referencia_0.createdBy,
  Referencia_0.modifiedAt,
  Referencia_0.modifiedBy,
  Referencia_0.codigo,
  Referencia_0.nombre
FROM com_carrefour_journal_Referencia AS Referencia_0;

CREATE VIEW GestionaAsientos_DraftAdministrativeData AS SELECT
  DraftAdministrativeData.DraftUUID,
  DraftAdministrativeData.CreationDateTime,
  DraftAdministrativeData.CreatedByUser,
  DraftAdministrativeData.CreatedByUserDescription,
  DraftAdministrativeData.DraftIsCreatedByMe,
  DraftAdministrativeData.LastChangeDateTime,
  DraftAdministrativeData.LastChangedByUser,
  DraftAdministrativeData.LastChangedByUserDescription,
  DraftAdministrativeData.InProcessByUser,
  DraftAdministrativeData.InProcessByUserDescription,
  DraftAdministrativeData.DraftIsProcessedByMe,
  DraftAdministrativeData.DraftMessages
FROM DRAFT_DraftAdministrativeData AS DraftAdministrativeData;

CREATE VIEW CatalogService_DraftAdministrativeData AS SELECT
  DraftAdministrativeData.DraftUUID,
  DraftAdministrativeData.CreationDateTime,
  DraftAdministrativeData.CreatedByUser,
  DraftAdministrativeData.CreatedByUserDescription,
  DraftAdministrativeData.DraftIsCreatedByMe,
  DraftAdministrativeData.LastChangeDateTime,
  DraftAdministrativeData.LastChangedByUser,
  DraftAdministrativeData.LastChangedByUserDescription,
  DraftAdministrativeData.InProcessByUser,
  DraftAdministrativeData.InProcessByUserDescription,
  DraftAdministrativeData.DraftIsProcessedByMe,
  DraftAdministrativeData.DraftMessages
FROM DRAFT_DraftAdministrativeData AS DraftAdministrativeData;




SELECT *
FROM SYS.TABLES
WHERE SCHEMA_NAME = 'ASIENTOS_MANUALES_PRD'
ORDER BY TABLE_NAME;




CREATE ROLE R_ASIENTOS_MANUALES_PRD;

GRANT SELECT, INSERT, UPDATE, DELETE 
    ON SCHEMA ASIENTOS_MANUALES_PRD 
    TO R_ASIENTOS_MANUALES_PRD;
    
GRANT CREATE ANY, DROP 
    ON SCHEMA ASIENTOS_MANUALES_PRD 
    TO R_ASIENTOS_MANUALES_PRD;
    
GRANT R_ASIENTOS_MANUALES_PRD TO CAP_REMOTE;


SELECT * 
FROM GRANTED_ROLES
WHERE GRANTEE = 'CAP_REMOTE';

SELECT * 
FROM GRANTED_PRIVILEGES
WHERE GRANTEE = 'CAP_REMOTE';

ALTER TABLE COM_CARREFOUR_JOURNAL_APROBADORSOLICITUD ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_APROBADORSOLICITUD_CABECERA FOREIGN KEY ( CABECERA_ID ) REFERENCES COM_CARREFOUR_JOURNAL_CABECERAASIENTO (ID) ON UPDATE RESTRICT ON DELETE CASCADE ENFORCED VALIDATED INITIALLY DEFERRED;
ALTER TABLE COM_CARREFOUR_JOURNAL_APROBADORSOLICITUD ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_APROBADORSOLICITUD_EMPLEADO FOREIGN KEY ( EMPLEADO_ID ) REFERENCES COM_CARREFOUR_JOURNAL_EMPLEADO (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;

ALTER TABLE COM_CARREFOUR_JOURNAL_CABECERAASIENTO ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CABECERAASIENTO_ESTADOSOLICITUD FOREIGN KEY ( ESTADOSOLICITUD_ID ) REFERENCES COM_CARREFOUR_JOURNAL_ESTADOSSOLICITUD (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;
ALTER TABLE COM_CARREFOUR_JOURNAL_CABECERAASIENTO ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CABECERAASIENTO_SECTORSOLICITANTE FOREIGN KEY ( SECTORSOLICITANTE_ID ) REFERENCES COM_CARREFOUR_JOURNAL_SECTOR (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;
ALTER TABLE COM_CARREFOUR_JOURNAL_CABECERAASIENTO ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CABECERAASIENTO_REFERENCIA FOREIGN KEY ( REFERENCIA_ID ) REFERENCES COM_CARREFOUR_JOURNAL_REFERENCIA (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;
ALTER TABLE COM_CARREFOUR_JOURNAL_CABECERAASIENTO ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CABECERAASIENTO_SOLICITANTE FOREIGN KEY ( SOLICITANTE_ID ) REFERENCES COM_CARREFOUR_JOURNAL_EMPLEADO (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;
ALTER TABLE COM_CARREFOUR_JOURNAL_CABECERAASIENTO ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CABECERAASIENTO_SUBTIPOASIENTO FOREIGN KEY ( SUBTIPOASIENTO_ID ) REFERENCES COM_CARREFOUR_JOURNAL_SUBTIPOASIENTO (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;
ALTER TABLE COM_CARREFOUR_JOURNAL_CABECERAASIENTO ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CABECERAASIENTO_TIPOASIENTO FOREIGN KEY ( TIPOASIENTO_ID ) REFERENCES COM_CARREFOUR_JOURNAL_TIPOASIENTO (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;

ALTER TABLE COM_CARREFOUR_JOURNAL_CONFIGAPROBADOR ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CONFIGAPROBADOR_CARGO FOREIGN KEY ( CARGO_ID ) REFERENCES COM_CARREFOUR_JOURNAL_CARGO (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;
ALTER TABLE COM_CARREFOUR_JOURNAL_CONFIGAPROBADOR ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CONFIGAPROBADOR_EMPLEADO FOREIGN KEY ( EMPLEADO_ID ) REFERENCES COM_CARREFOUR_JOURNAL_EMPLEADO (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;
ALTER TABLE COM_CARREFOUR_JOURNAL_CONFIGAPROBADOR ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CONFIGAPROBADOR_SECTOR FOREIGN KEY ( SECTOR_ID ) REFERENCES COM_CARREFOUR_JOURNAL_SECTOR (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;

ALTER TABLE COM_CARREFOUR_JOURNAL_CONFIGSOLICITANTE ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CONFIGSOLICITANTE_EMPLEADO FOREIGN KEY ( EMPLEADO_ID ) REFERENCES COM_CARREFOUR_JOURNAL_EMPLEADO (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;
ALTER TABLE COM_CARREFOUR_JOURNAL_CONFIGSOLICITANTE ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CONFIGSOLICITANTE_SECTOR FOREIGN KEY ( SECTOR_ID ) REFERENCES COM_CARREFOUR_JOURNAL_SECTOR (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;

ALTER TABLE COM_CARREFOUR_JOURNAL_CUENTA ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_CUENTA_TIPO FOREIGN KEY ( TIPO_ID ) REFERENCES COM_CARREFOUR_JOURNAL_TIPOCUENTA (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;

ALTER TABLE COM_CARREFOUR_JOURNAL_DETALLEASIENTO ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_DETALLEASIENTO_CABECERA FOREIGN KEY ( CABECERA_ID ) REFERENCES COM_CARREFOUR_JOURNAL_CABECERAASIENTO (ID) ON UPDATE RESTRICT ON DELETE CASCADE ENFORCED VALIDATED INITIALLY DEFERRED;
ALTER TABLE COM_CARREFOUR_JOURNAL_DETALLEASIENTO ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_DETALLEASIENTO_CUENTACONTABLE FOREIGN KEY ( CUENTACONTABLE_ID ) REFERENCES COM_CARREFOUR_JOURNAL_CUENTA (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;

ALTER TABLE COM_CARREFOUR_JOURNAL_SUBTIPOASIENTO ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_SUBTIPOASIENTO_TIPOASIENTO FOREIGN KEY ( TIPOASIENTO_ID ) REFERENCES COM_CARREFOUR_JOURNAL_TIPOASIENTO (ID) ON UPDATE RESTRICT ON DELETE CASCADE ENFORCED VALIDATED INITIALLY DEFERRED;

ALTER TABLE COM_CARREFOUR_JOURNAL_UMBRALCUENTA ADD CONSTRAINT C__COM_CARREFOUR_JOURNAL_UMBRALCUENTA_CUENTACONTABLE FOREIGN KEY ( CUENTACONTABLE_ID ) REFERENCES COM_CARREFOUR_JOURNAL_CUENTA (ID) ON UPDATE RESTRICT ON DELETE RESTRICT ENFORCED VALIDATED INITIALLY DEFERRED;



{
  host: 015424e7-c8a6-48a5-affb-d145004e6225.hana.prod-us30.hanacloud.ondemand.com,
  port: 443,
  encrypt: true,
  sslValidateCertificate: true,
  schema: ASIENTOS_MANUALES_PRD,
  user: CAP_REMOTE,
  password: Pazodearxeriz2026
}


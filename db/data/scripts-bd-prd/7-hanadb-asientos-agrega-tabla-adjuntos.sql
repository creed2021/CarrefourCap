
DROP TABLE com_carrefour_journal_AdjuntoSolicitud;

CREATE TABLE com_carrefour_journal_AdjuntoSolicitud (
  ID NVARCHAR(36) NOT NULL,
  createdAt TIMESTAMP,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP,
  modifiedBy NVARCHAR(255),
  cabecera_ID NVARCHAR(36),
  identificadorAdjunto NVARCHAR(50),
  nombreAdjunto NVARCHAR(100),
  urlAdjunto NVARCHAR(1000),
  PRIMARY KEY(ID)
);

ALTER TABLE com_carrefour_journal_AdjuntoSolicitud ADD CONSTRAINT c__com_carrefour_journal_AdjuntoSolicitud_cabecera
FOREIGN KEY(cabecera_ID)
REFERENCES com_carrefour_journal_CabeceraAsiento(ID)
ON UPDATE RESTRICT
ON DELETE CASCADE
VALIDATED
ENFORCED
INITIALLY DEFERRED;

CREATE VIEW GESTIONAASIENTOS_ADJUNTOSOLICITUD AS SELECT
  AdjuntoSolicitud_0.ID,
  AdjuntoSolicitud_0.createdAt,
  AdjuntoSolicitud_0.createdBy,
  AdjuntoSolicitud_0.modifiedAt,
  AdjuntoSolicitud_0.modifiedBy,
  AdjuntoSolicitud_0.cabecera_ID,
  AdjuntoSolicitud_0.identificadorAdjunto,
  AdjuntoSolicitud_0.nombreAdjunto,
  AdjuntoSolicitud_0.urlAdjunto
FROM com_carrefour_journal_AdjuntoSolicitud AS AdjuntoSolicitud_0


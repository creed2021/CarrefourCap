ALTER TABLE com_carrefour_journal_AdjuntoSolicitud
ADD (sessionId NVARCHAR(100));

CREATE OR REPLACE VIEW GESTIONAASIENTOS_ADJUNTOSOLICITUD AS (SELECT
  AdjuntoSolicitud_0.ID,
  AdjuntoSolicitud_0.createdAt,
  AdjuntoSolicitud_0.createdBy,
  AdjuntoSolicitud_0.modifiedAt,
  AdjuntoSolicitud_0.modifiedBy,
  AdjuntoSolicitud_0.cabecera_ID,
  AdjuntoSolicitud_0.identificadorAdjunto,
  AdjuntoSolicitud_0.nombreAdjunto,
  AdjuntoSolicitud_0.urlAdjunto,
  AdjuntoSolicitud_0.sessionId
FROM com_carrefour_journal_AdjuntoSolicitud AS AdjuntoSolicitud_0);
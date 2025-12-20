/*

[DESCRIPTION]

- No description

*/


DROP VIEW GestionaAsientos_AprobadorSolicitud;

CREATE VIEW GestionaAsientos_AprobadorSolicitud AS SELECT
  AprobadorSolicitud_0.ID,
  AprobadorSolicitud_0.createdAt,
  AprobadorSolicitud_0.createdBy,
  AprobadorSolicitud_0.modifiedAt,
  AprobadorSolicitud_0.modifiedBy,
  AprobadorSolicitud_0.empleado_ID,
  AprobadorSolicitud_0.fechaAprobacion,
  AprobadorSolicitud_0.decision,
  AprobadorSolicitud_0.cabecera_ID
FROM com_carrefour_journal_AprobadorSolicitud AS AprobadorSolicitud_0;
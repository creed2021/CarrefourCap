# Cambios para despliegues según ambiente

Capa | Acción | Archivo | Constante
-----|--------|----|---
Backend | Cambiar constante | bpa-helper.js | DEFINITION_ID_BPA_PRD 
Backend	| Cambiar constante	| bpa-helper.js | URL_BPA_PRD
Backend	| Cambiar constante	| bpa-helper.js | APIKEY_BPA_PRD
Backend	| Cambiar constante	| bpa-helper.js | URL_MYINBOX_PRD
Backend	| Cambiar constante	| dms-helper.js	| REPO_ID_PRD
Backend	| Cambiar constante	| sol-helper.js	| URL_S4_HANA_PRD
Backend | Renombrar Archivo | mta.jaml	| N/A
Backend | Renombrar Archivo | package.json	| N/A
Frontend | Renombrar Archivo | xs-app.json	| N/A
Frontend | Cambiar constante | SolAsientosAjuste.controller.js	| REPO_ID_PRD	

# Configuración niveles logueo
En cada entorno se pueden configurar variables para establecer el formato y nivel de logueo. Los comandos indicados mas abajo requieren del cf login y de la selección de la organización y espacio correctos según el ambiente.

## Formato de logueo
Para logueo reducido útil para revisar el log con CF logs:
- cf set-env asientos-ajustes-srv CDS_LOG_FORMAT plain
- cf restage asientos-ajustes-srv (baja momentaneamente la aplicación)

Para logueo ampliado en json para sistemas de observabilidad, mucho texto para CF logs pero útil para observabilidad:
- cf set-env asientos-ajustes-srv CDS_LOG_FORMAT json
- cf restage asientos-ajustes-srv (baja momentaneamente la aplicación)

## Nivel de logueo
Se pueden establecer los siguientes niveles de logueo:
silent->error->warn->info->debug->trace

- cf set-env asientos-ajustes-srv CDS_LOG_LEVELS '{"app":"debug","sql":"silent","odata":"silent","auth":"silent","audit":"silent"}'
- cf restage asientos-ajustes-srv (baja momentaneamente la aplicación)

## Configuración por entorno
### DEV
- cf set-env asientos-ajustes-srv CDS_LOG_LEVELS '{"app":"debug","sql":"silent","odata":"silent","auth":"silent","audit":"silent"}'
- cf set-env asientos-ajustes-srv CDS_LOG_FORMAT plain
### PRD
- cf set-env asientos-ajustes-srv CDS_LOG_LEVELS '{"app":"error","sql":"silent","odata":"silent","auth":"silent","audit":"silent"}'
- cf set-env asientos-ajustes-srv CDS_LOG_FORMAT plain


# Cambios para despliegues según ambiente

Capa | Acción | Archivo | Constante
-----|--------|----|---
Backend | Cambiar constante en cada uso | bpa-helper.js | DEFINITION_ID_BPA_PRD 
Backend	| Cambiar constante en cada uso	| bpa-helper.js | URL_BPA_PRD
Backend	| Cambiar constante en cada uso	| bpa-helper.js | APIKEY_BPA_PRD
Backend	| Cambiar constante en cada uso	| dms-helper.js	| REPO_ID_PRD
Backend	| Cambiar constante en cada uso	| sol-helper.js	| URL_S4_HANA_PRD
Frontend | Renombrar Archivo | mta.jaml	| N/A
Frontend | Renombrar Archivo | package.json	| N/A
Frontend | Renombrar Archivo | xs-app.json	| N/A	

# Getting Started

Welcome to your new project.

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`package.json` | project metadata and configuration
`readme.md` | this getting started guide


## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start adding content, for example, a [db/schema.cds](db/schema.cds).


## Learn More

Learn more at https://cap.cloud.sap/docs/get-started/.

🧾 Proyecto SAP CAP – Asientos de Ajuste Contable (Modificado)
📘 Descripción

Este proyecto es una aplicación SAP CAP (Cloud Application Programming Model) que gestiona datos maestros y procesos relacionados con la aprobación y contabilización de asientos de ajuste contable.
Incluye entidades de control (sectores, cargos, cuentas, tipos de asiento, umbrales de aprobación) y acciones de negocio simuladas (mock).

⚙️ Requisitos previos

Node.js >= 18

Instalado globalmente el CLI de CAP:

npm install -g @sap/cds-dk


SAP Business Application Studio (BAS) o Visual Studio Code con extensión SAP CDS.

(Opcional) SQLite o SAP HANA para persistencia.

🚀 Ejecución local

Instalar dependencias

npm install


Ejecutar el servidor CAP

cds watch


Esto levantará el servicio en
👉 http://localhost:4004/catalog

Probar endpoints

Abrir el archivo test.http
 en VS Code y ejecutar las peticiones.

O usar curl, por ejemplo:

curl -X POST http://localhost:4004/catalog/RegistrarAprobacion

🧩 Estructura principal
Carpeta / Archivo	Descripción
db/schema.cds	Definición de entidades del modelo de datos CAP.
srv/service.cds	Definición de servicios OData y acciones.
srv/handlers.js	Implementación de lógica mock para acciones.
test.http	Archivo con peticiones de prueba (VS Code REST Client).
package.json	Configuración de dependencias y scripts de ejecución.
🗃️ Entidades principales

Cargo, Sector, Aprobador

TipoCuenta, Cuenta

TipoAsiento, SubTipoAsiento

Constantes

Todas las entidades usan cuid y managed de @sap/cds/common.

⚡ Acciones disponibles (mock)
Acción	Propósito	Respuesta
RegistrarAprobacion	Simula la aprobación de un asiento	{ result: "ok" }
RegistrarRechazo	Simula el rechazo de un asiento	{ result: "ok" }
ObtenerDatosFormularioAprobacion	Devuelve estructura de formulario de ejemplo	{ formulario: {...} }
RealizarContabilizacion	Simula la contabilización de un asiento	{ result: "ok" }
🧪 Pruebas de CRUD (ejemplos)

Crear un Cargo:

POST http://localhost:4004/catalog/Cargos
Content-Type: application/json

{
  "nombre": "Analista Contable"
}


Listar Cargos:

GET http://localhost:4004/catalog/Cargos


Crear un TipoAsiento con detalle:

POST http://localhost:4004/catalog/TiposAsiento
Content-Type: application/json

{
  "codigo": "TA01",
  "nombre": "Asiento de Cierre",
  "referencia": "CIERRE",
  "subTipos": [
    { "codigo": "ST01", "nombre": "Ajuste 1" },
    { "codigo": "ST02", "nombre": "Ajuste 2" }
  ]
}

🧱 Despliegue en SAP BTP (Cloud Foundry)

Compilar y empaquetar:

cds build --production


Loguearse a Cloud Foundry:

cf login


Desplegar:

cf push
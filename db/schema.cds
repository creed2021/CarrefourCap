using {
  cuid,
  managed
} from '@sap/cds/common';
namespace com.carrefour.journal;
entity CabeceraAsiento : cuid, managed {
  numeroSolicitud      : String(12)  @title: 'Número de Solicitud';
  periodoAnio          : Integer     @title: 'Año';
  periodoMes           : Integer     @title: 'Mes';
  fechaDocumento       : Date        @title: 'Fecha Documento';
  fechaContabilizacion : Date        @title: 'Fecha Contabilización';
  claseDocumento       : String      @title: 'Clase Documento';
  moneda               : String(5)   @title: 'Moneda'; // Usar 3 caracteres si es ISO 4217
  textoCabecera        : String(255) @title: 'Texto de Cabecera';
  sociedad             : String(50)  @title: 'Sociedad';
  numeroDocumentoSAP   : String(20);
  idInstanciaWorkflow  : String(100);
  // ✅ Campo no persistente, pero accesible vía OData y req.data
  correo_solicitante : String(100)
    @cds.persistence.skip
    @Core.Description : 'Email del solicitante (no persistente)';
  
  items                : Composition of many DetalleAsiento
                           on items.cabecera = $self; // $self apunta a la instancia actual de CabeceraAsiento
    estadoSolicitud : Association to EstadosSolicitud;
    numeroDocumentoContable : String(50);
    CodigoEmpresaContabilizacion : String(10);
    AnioFiscalContabilizacion : Integer;
    numeroAsiento : String(50);
    sectorSolicitante: Association to Sector @title: 'Sector Solicitante';
    tipoAsiento : Association to TipoAsiento @title: 'Tipo Asiento';
    subtipoAsiento : Association to SubTipoAsiento @title: 'Subtipo Asiento';
    referencia : Association to Referencia @title: 'Referencia Externa';
    solicitante : Association to Empleado @title: 'Solicitante';
    aprobadoresSolicitud: Composition of many AprobadorSolicitud
                          on aprobadoresSolicitud.cabecera = $self;
    
    adjuntosSolicitud: Composition of many AdjuntoSolicitud
                          on adjuntosSolicitud.cabecera = $self;

    resumenCuentas : Association to many ResumenCuentas
                       on resumenCuentas.cabecera_ID = $self.ID;
}
entity AdjuntoSolicitud: cuid, managed {
  cabecera              : Association to one CabeceraAsiento;
  identificadorAdjunto  : String(50);
  nombreAdjunto         : String(100);
  urlAdjunto            : String(1000);
  sessionId             : String(100);
}
@assert.unique: {
  codigoNombreEstadosSol: [ codigo ],
  nombreEstadosSol: [ nombre ],
}
entity EstadosSolicitud : cuid, managed {
    codigo : String(10);
    nombre : String(100);
}
/**
 * Entidad DetalleAsiento
 * (El child, contenido en la cabecera)
 */
entity DetalleAsiento : cuid, managed {
  cabecera        : Association to one CabeceraAsiento;
  numeroLinea     : Integer        @title: 'Número Línea';
  descripcion     : String         @title: 'Descripcion';
  cuentaContable : Association to Cuenta;
  centroCosto     : String(20)     @title: 'Centro Costo';
  clave           : Integer        @title: 'Clave';
  importe         : Decimal(15, 2) @title: 'Importe';
}

/**
 * Vista ResumenCuentas
 * Agrega el detalle de asiento por cuenta contable, separando los importes
 * según signo (clave 40 = Debe, clave 50 = Haber). Soporta la Mejora N° 14
 * (resumen del asiento por cuenta en la reportería de Consulta Estado Solicitudes).
 */
entity ResumenCuentas as SELECT from DetalleAsiento {
    key cabecera.ID as cabecera_ID : UUID,
    key cuentaContable.ID as cuentaContable_ID : UUID,
    cuentaContable.numero      as idCuenta     : String(20),
    cuentaContable.nombre      as nombreCuenta  : String(100),
    cuentaContable.tipo.nombre as tipoCuenta    : String(100),
    sum(case when clave = 40 then importe else 0 end) as importeDebe  : Decimal(15,2),
    sum(case when clave = 50 then importe else 0 end) as importeHaber : Decimal(15,2)
} GROUP BY
    cabecera.ID,
    cuentaContable.ID,
    cuentaContable.numero,
    cuentaContable.nombre,
    cuentaContable.tipo.nombre;

@assert.unique: {
  codigoCargo: [ codigo ],
  nombreCargo: [ nombre ],
}
entity Cargo : cuid, managed {
  codigo                 : String(50);
  nombre                 : String(100);
}
@assert.unique: {
  codigoSector: [ codigo ],
  nombreSector: [ nombre ],
}
entity Sector : cuid, managed {
  codigo                  : String(50);
  nombre                  : String(50);
}
@assert.unique: {
  nombreEmp: [ nombre ],
  emailEmp: [ email ],
}
entity Empleado : cuid, managed {
  nombre            : String(50);
  email              : String(100);
}
entity AprobadorSolicitud: cuid, managed {
    empleado         : Association to Empleado;
    fechaAprobacion  : Date;
    nivelAprobacion  : String(200);
    decision         : String(15);
    /* Owner → CabeceraAsiento */
    cabecera : Association to one CabeceraAsiento;
}
@assert.unique: {
  empSecConfigSol: [ empleado, sector ],
}
entity ConfigSolicitante : cuid, managed {
    empleado  : Association to Empleado;
    sector    : Association to Sector;
}
@assert.unique: {
  codigoTipoCuenta: [ codigo ],
  nombreTipoCuenta: [ nombre ],
}
entity TipoCuenta : cuid, managed {
  codigo : String(50);
  nombre : String(100);
}
@assert.unique: {
  empSecCar: [ empleado, sector, cargo ],
}
entity ConfigAprobador : cuid, managed {
    empleado  : Association to Empleado;
    sector     : Association to Sector;
    cargo      : Association to Cargo;
}                          
@assert.unique: {
  numeroCuenta: [ numero ],
}
entity Cuenta : cuid, managed {
    numero : String(20);
    nombre : String(100);
    tipo   : Association to TipoCuenta;
}
@assert.unique: {
  cuentaContableUmbral: [ cuentaContable ],
}
entity UmbralCuenta : cuid, managed {
    cuentaContable : Association to Cuenta;
    importeGerencia : Decimal(15, 2) @title: 'Importe Gerencia';
    importeCFO : Decimal(15, 2) @title: 'Importe CFO';
    comentarios: String(255);
}
@assert.unique: {
  codigoTipoAsiento: [ codigo ],
  nombreTipoAiento: [ nombre ],
}
entity TipoAsiento : cuid, managed {
    codigo     : String(10);
    nombre     : String(100);
    referencia : String(100);
    subTipos   : Composition of many SubTipoAsiento on subTipos.tipoAsiento = $self;
}
@assert.unique: {
  codigoSubTipoAsiento: [ codigo ],
  nombreTipoAsiento: [ nombre ]
}
entity SubTipoAsiento : cuid, managed {
    codigo      : String(10);
    nombre      : String(100);
    tipoAsiento : Association to TipoAsiento;
    umbralMinimoAsiento  : Decimal(15,2);
}
@assert.unique: {
  tipoAsientoConfigAdjunto: [ tipoAsiento ],
}
entity ConfigAdjuntoObligatorio : cuid, managed {
    tipoAsiento  : Association to TipoAsiento @title: 'Tipo Asiento';
    obligatorio  : Boolean default true        @title: 'Adjunto Obligatorio';
}
entity Constantes : cuid, managed {
    nombreConstante : String(100);
    codigo          : String(50);
    nombreElemento  : String(100);
}
@assert.unique: {
  codigoReferencia: [ codigo ],
  nombreReferencia: [ nombre ],
}
entity Referencia : cuid, managed {
    codigo: String(50);
    nombre: String(100)
}
entity Secuencias : cuid, managed {
  key nombre : String(50);
  valor  : Integer;
}
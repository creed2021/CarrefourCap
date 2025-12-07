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
}

entity DatosReporteSeguimiento: cuid {
    numeroSolicitud     : String;
    tipoAsiento         : String;
    subtipoAsiento      : String;
    fechaCreacion       : Timestamp;
    aprobador           : String;
    fechaAprobacion     : Timestamp;
    estado              : String;
    numeroDocumentoSAP  : String;
}

entity EstadosSolicitud : cuid, managed {
    codigo : String(10) not null;
    nombre : String(100) not null;
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

entity Cargo : cuid, managed {
  codigo                 : String(50);
  nombre                 : String(100);
}

entity Sector : cuid, managed {
  codigo                  : String(50);
  nombre                  : String(50);
}

entity Empleado : cuid, managed {
  nombre            : String(50);
  email              : String(100);
}

entity AprobadorSolicitud: cuid, managed {
    empleado         : Association to Empleado;
    fechaAprobacion  : Date;
    decision         : String(15);
    /* Owner → CabeceraAsiento */
    cabecera : Association to one CabeceraAsiento;
}

entity ConfigSolicitante : cuid, managed {
    empleado  : Association to Empleado;
    sector    : Association to Sector;
}
entity TipoCuenta : cuid, managed {
  codigo : String(50);
  nombre : String(100);
}

entity ConfigAprobador : cuid, managed {
    empleado  : Association to Empleado;
    sector     : Association to Sector;
    cargo      : Association to Cargo;
}                          

entity Cuenta : cuid, managed {
    numero : String(20);
    nombre : String(100);
    tipo   : Association to TipoCuenta;
}

entity UmbralCuenta : cuid, managed {
    cuentaContable : Association to Cuenta;
    importeGerencia : Decimal(15, 2) @title: 'Importe Gerencia';
    importeCFO : Decimal(15, 2) @title: 'Importe CFO';
    comentarios: String(255);
}

entity TipoAsiento : cuid, managed {
    codigo     : String(10);
    nombre     : String(100);
    referencia : String(100);
    subTipos   : Composition of many SubTipoAsiento on subTipos.tipoAsiento = $self;
}

entity SubTipoAsiento : cuid, managed {
    codigo      : String(10);
    nombre      : String(100);
    tipoAsiento : Association to TipoAsiento;
    umbralMinimoAsiento  : Decimal(15,2);
}

entity Constantes : cuid, managed {
    nombreConstante : String(100);
    codigo          : String(50);
    nombreElemento  : String(100);
}
entity Referencia : cuid, managed {
    codigo: String(50);
    nombre: String(100)
}

entity Secuencias : cuid, managed {
  key nombre : String(50);
  valor  : Integer;
}
using com.carrefour.journal as my from '../db/schema';

@odata: { version: '4.0' }
service GestionaAsientos{
    entity CabeceraAsiento     as projection on my.CabeceraAsiento{
            *,
            estadoSolicitud,
            sectorSolicitante,
            tipoAsiento,
            subtipoAsiento,
            referencia,
            solicitante,
            items,
            aprobadoresSolicitud,
            adjuntosSolicitud
    };

    annotate CabeceraAsiento with {
        numeroSolicitud @cds.collation: 'SAP_DEFAULT';
    }
    entity DetalleAsiento as projection on my.DetalleAsiento {
        *,
        cuentaContable: redirected to Cuentas
    };
    // entity DatosReporteSeguimiento    as projection on my.DatosReporteSeguimiento;
    entity AprobadorSolicitud as projection on my.AprobadorSolicitud{
            *,
            empleado: redirected to Empleados
    };

    entity AdjuntoSolicitud as projection on my.AdjuntoSolicitud;

    action prepareAdjuntos (sessionId: String);
    action RegistrarAprobacion(idSolicitud: UUID, emailAprobador: String) returns String;
    action RegistrarRechazo(idSolicitud: UUID, emailAprobador: String) returns String;
    action ObtenerDatosFormularioAprobacion(id: UUID) //returns Object;
    action RealizarContabilizacion(id: UUID) returns String;
    function ListarWorkflowsBPA() returns String;


    entity EstadosSolicitud as projection on my.EstadosSolicitud;
    entity Sectores         as projection on my.Sector;
    entity TiposAsiento     as projection on my.TipoAsiento;
    entity SubTiposAsiento  as projection on my.SubTipoAsiento;
    entity Referencia       as projection on my.Referencia;
    entity Empleados        as projection on my.Empleado;
    entity CuentaUsuario    as projection on my.CuentaUsuario;
    entity Cuentas          as projection on my.Cuenta;
    entity TiposCuentas         as projection on my.TipoCuenta;
    entity Secuencias          as projection on my.Secuencias;
}

@odata: { version: '4.0' }
service CatalogService {
    entity Cargos              as projection on my.Cargo;
    entity Sectores            as projection on my.Sector;
    entity ConfigAprobadores    as projection on my.ConfigAprobador;
    entity ConfigSolicitantes as projection on my.ConfigSolicitante;
    entity TiposCuentas         as projection on my.TipoCuenta;
    entity Cuentas             as projection on my.Cuenta
 {
        ID,
        numero,
        nombre,
        tipo
    };
    entity UmbralesCuentas as projection on my.UmbralCuenta;
    entity TiposAsiento        as projection on my.TipoAsiento;
    entity SubTiposAsiento     as projection on my.SubTipoAsiento;
    entity Constantes          as projection on my.Constantes;
    entity EstadosSolicitud    as projection on my.EstadosSolicitud;
    entity Referencia          as projection on my.Referencia;
    entity Empleados           as projection on my.Empleado{
            ID,
            *
    };
}

//    annotate GestionaAsientos.CabeceraAsiento with @(requires: 'Solicitante');
//    annotate GestionaAsientos.ObtenerDatosFormularioAprobacion with @(requires: 'Aprobador');
//    annotate GestionaAsientos.RealizarContabilizacion with @(requires: 'Aprobador');
//    annotate GestionaAsientos.RegistrarAprobacion with @(requires: 'Aprobador');
//    annotate GestionaAsientos.RegistrarRechazo with @(requires: 'Aprobador');    

//    annotate CatalogService with @(requires: 'Admin_Datos_Maestros');

   //annotate GestionaAsientos.CabeceraAsiento with @Capabilities.InsertRestrictions.Insertable: false;
   //annotate GestionaAsientos.CabeceraAsiento with @Capabilities.UpdateRestrictions.Updatable: false;
   //annotate GestionaAsientos.CabeceraAsiento with @Capabilities.DeleteRestrictions.Deletable: false;
   annotate GestionaAsientos.CabeceraAsiento with @UI.CreateEnabled: false;
   annotate GestionaAsientos.CabeceraAsiento @UI.CreateHidden: true;
   annotate GestionaAsientos.CabeceraAsiento @UI.DeleteHidden: true;
   //annotate GestionaAsientos.CabeceraAsiento with @odata.draft.enabled;

   annotate GestionaAsientos.Sectores with @Capabilities.InsertRestrictions.Insertable: true;
   annotate GestionaAsientos.Sectores with @Capabilities.UpdateRestrictions.Updatable: true;
   annotate GestionaAsientos.Sectores with @Capabilities.DeleteRestrictions.Deletable: true;
   annotate GestionaAsientos.Sectores with @UI.CreateEnabled: true;
   annotate GestionaAsientos.Sectores @UI.CreateHidden: false;
   annotate GestionaAsientos.Sectores with @odata.draft.enabled;

   annotate GestionaAsientos.Cuentas with @Capabilities.InsertRestrictions.Insertable: true;
   annotate GestionaAsientos.Cuentas with @Capabilities.UpdateRestrictions.Updatable: true;
   annotate GestionaAsientos.Cuentas with @Capabilities.DeleteRestrictions.Deletable: true;
   annotate GestionaAsientos.Cuentas with @UI.CreateEnabled: true;
   annotate GestionaAsientos.Cuentas @UI.CreateHidden: false;
   annotate GestionaAsientos.Cuentas with @odata.draft.enabled;

   annotate CatalogService.UmbralesCuentas with @Capabilities.InsertRestrictions.Insertable: true;
   annotate CatalogService.UmbralesCuentas with @Capabilities.UpdateRestrictions.Updatable: true;
   annotate CatalogService.UmbralesCuentas with @Capabilities.DeleteRestrictions.Deletable: true;
   annotate CatalogService.UmbralesCuentas with @UI.CreateEnabled: true;
   annotate CatalogService.UmbralesCuentas @UI.CreateHidden: false;
   annotate CatalogService.UmbralesCuentas with @odata.draft.enabled;

   annotate CatalogService.ConfigSolicitantes with @Capabilities.InsertRestrictions.Insertable: true;
   annotate CatalogService.ConfigSolicitantes with @Capabilities.UpdateRestrictions.Updatable: true;
   annotate CatalogService.ConfigSolicitantes with @Capabilities.DeleteRestrictions.Deletable: true;
   annotate CatalogService.ConfigSolicitantes with @UI.CreateEnabled: true;
   annotate CatalogService.ConfigSolicitantes @UI.CreateHidden: false;
   annotate CatalogService.ConfigSolicitantes with @odata.draft.enabled;

   annotate CatalogService.ConfigAprobadores with @Capabilities.InsertRestrictions.Insertable: true;
   annotate CatalogService.ConfigAprobadores with @Capabilities.UpdateRestrictions.Updatable: true;
   annotate CatalogService.ConfigAprobadores with @Capabilities.DeleteRestrictions.Deletable: true;
   annotate CatalogService.ConfigAprobadores with @UI.CreateEnabled: true;
   annotate CatalogService.ConfigAprobadores @UI.CreateHidden: false;
   annotate CatalogService.ConfigAprobadores with @odata.draft.enabled;

   annotate GestionaAsientos.Empleados with @Capabilities.InsertRestrictions.Insertable: true;
   annotate GestionaAsientos.Empleados with @Capabilities.UpdateRestrictions.Updatable: true;
   annotate GestionaAsientos.Empleados with @Capabilities.DeleteRestrictions.Deletable: true;
   annotate GestionaAsientos.Empleados with @UI.CreateEnabled: true;
   annotate GestionaAsientos.Empleados @UI.CreateHidden: false;
   annotate GestionaAsientos.Empleados with @odata.draft.enabled;

   































































































using GestionaAsientos as service from '../../srv/service';

annotate service.CabeceraAsiento with @(
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: numeroSolicitud,
            },
            {
                $Type: 'UI.DataField',
                Value: sociedad,
            },
            {
                $Type: 'UI.DataField',
                Value: periodoAnio,
            },
            {
                $Type: 'UI.DataField',
                Value: periodoMes,
            },
            {
                $Type: 'UI.DataField',
                Value: fechaDocumento,
            },
            {
                $Type: 'UI.DataField',
                Value: fechaContabilizacion,
            },
            {
                $Type: 'UI.DataField',
                Value: claseDocumento,
            },
            {
                $Type: 'UI.DataField',
                Value: moneda,
            },
            {
                $Type: 'UI.DataField',
                Value: tipoCambio,
            },
            {
                $Type: 'UI.DataField',
                Value: estadoSolicitud.nombre,
                Label: 'Estado',
            },
            {
                $Type: 'UI.DataField',
                Value: referencia.nombre,
                Label: 'Referencia',
            },
            {
                $Type: 'UI.DataField',
                Value: sectorSolicitante.nombre,
                Label: 'Sector',
            },
            {
                $Type: 'UI.DataField',
                Value: solicitante.nombre,
                Label: 'Solicitante',
            },
            {
                $Type: 'UI.DataField',
                Label: 'correo_solicitante',
                Value: correo_solicitante,
            },
            {
                $Type: 'UI.DataField',
                Value: subtipoAsiento.nombre,
                Label: 'SubTipo Asiento',
            },
            {
                $Type: 'UI.DataField',
                Value: tipoAsiento.nombre,
                Label: 'Tipo Asiento',
            },
            {
                $Type: 'UI.DataField',
                Value: textoCabecera,
            },
            {
                $Type: 'UI.DataField',
                Label: 'numeroDocumentoSAP',
                Value: numeroDocumentoSAP,
            },
        ],
    },
    UI.Facets                    : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'GeneratedFacet1',
            Label : 'Consulta Estado de Solicitud',
            Target: '@UI.FieldGroup#GeneratedGroup',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Detalle de Asiento',
            ID    : 'DetalledeAsiento',
            Target: 'items/@UI.SelectionPresentationVariant#DetalledeAsiento',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Resumen por Cuenta',
            ID    : 'ResumenCuentas',
            Target: 'resumenCuentas/@UI.SelectionPresentationVariant#ResumenCuentas',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Detalle de Aprobadores',
            ID    : 'DetalledeAprobadores',
            Target: 'aprobadoresSolicitud/@UI.SelectionPresentationVariant#DetalledeAprobadores1',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Adjuntos',
            ID    : 'Adjuntos',
            Target: 'adjuntosSolicitud/@UI.LineItem#Adjuntos',
        },
    ],
    UI.LineItem                  : [
        {
            $Type: 'UI.DataField',
            Value: numeroSolicitud,
        },
        {
            $Type: 'UI.DataField',
            Value: periodoAnio,
        },
        {
            $Type: 'UI.DataField',
            Value: periodoMes,
        },
        {
            $Type: 'UI.DataField',
            Value: solicitante.nombre,
            Label: 'Solicitante',
        },
        {
            $Type: 'UI.DataField',
            Value: sectorSolicitante.nombre,
            Label: 'Sector Solicitante',
        },
        {
            $Type: 'UI.DataField',
            Value: estadoSolicitud.nombre,
            Label: 'Estado',
        },
        {
            $Type: 'UI.DataField',
            Value: tipoAsiento.nombre,
            Label: 'Tipo Asiento',
        },
        {
            $Type: 'UI.DataField',
            Value: subtipoAsiento.nombre,
            Label: 'Subtipo Asiento',
        },
    ],
);

annotate service.CabeceraAsiento with {
    estadoSolicitud @Common.ValueList: {
        $Type         : 'Common.ValueListType',
        CollectionPath: 'EstadosSolicitud',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: estadoSolicitud_ID,
                ValueListProperty: 'ID',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'codigo',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'nombre',
            },
        ],
    }
};

annotate service.CabeceraAsiento with {
    sectorSolicitante @Common.ValueList: {
        $Type         : 'Common.ValueListType',
        CollectionPath: 'Sectores',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: sectorSolicitante_ID,
                ValueListProperty: 'ID',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'codigo',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'nombre',
            },
        ],
    }
};

annotate service.CabeceraAsiento with {
    tipoAsiento @Common.ValueList: {
        $Type         : 'Common.ValueListType',
        CollectionPath: 'TiposAsiento',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: tipoAsiento_ID,
                ValueListProperty: 'ID',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'codigo',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'nombre',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'referencia',
            },
        ],
    }
};

annotate service.CabeceraAsiento with {
    subtipoAsiento @Common.ValueList: {
        $Type         : 'Common.ValueListType',
        CollectionPath: 'SubTiposAsiento',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: subtipoAsiento_ID,
                ValueListProperty: 'ID',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'codigo',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'nombre',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'umbralMinimoAsiento',
            },
        ],
    }
};

annotate service.CabeceraAsiento with {
    referencia @Common.ValueList: {
        $Type         : 'Common.ValueListType',
        CollectionPath: 'Referencia',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: referencia_ID,
                ValueListProperty: 'ID',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'codigo',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'nombre',
            },
        ],
    }
};

annotate service.CabeceraAsiento with {
    solicitante @Common.ValueList: {
        $Type         : 'Common.ValueListType',
        CollectionPath: 'Empleados',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: solicitante_ID,
                ValueListProperty: 'ID',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'nombre',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'email',
            },
        ],
    }
};

annotate service.DetalleAsiento with @(
    UI.DeleteHidden                                  : true,
    UI.LineItem #DetalledeAsiento                    : [
        {
            $Type: 'UI.DataField',
            Value: numeroLinea,
        },
        {
            $Type: 'UI.DataField',
            Value: clave,
        },
        {
            $Type: 'UI.DataField',
            Value: cuentaContable.numero,
            Label: 'numero',
        },
        {
            $Type: 'UI.DataField',
            Value: cuentaContable.nombre,
            Label: 'nombre',
        },
        {
            $Type: 'UI.DataField',
            Value: centroCosto,
        },
        {
            $Type: 'UI.DataField',
            Value: importe,
            Label: 'Importe Mon Transacción',
        },
        {
            $Type        : 'UI.DataField',
            Value        : importeMonSociedad,
            Label        : 'Importe Mon Sociedad',
            ![@UI.Hidden]: {$Eq: [
                {$Path: 'cabecera/moneda'},
                'ARS'
            ]},
        },
    ],
    UI.SelectionPresentationVariant #DetalledeAsiento: {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {
            $Type         : 'UI.PresentationVariantType',
            Visualizations: ['@UI.LineItem#DetalledeAsiento',
            ],
            SortOrder     : [{
                $Type     : 'Common.SortOrderType',
                Property  : numeroLinea,
                Descending: false,
            }, ],
        },
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [],
        },
    },
);

annotate service.ResumenCuentas with @(
    UI.LineItem #ResumenCuentas                    : [
        {
            $Type: 'UI.DataField',
            Value: idCuenta,
            Label: 'Cuenta',
        },
        {
            $Type: 'UI.DataField',
            Value: nombreCuenta,
            Label: 'Nombre Cuenta',
        },
        {
            $Type: 'UI.DataField',
            Value: tipoCuenta,
            Label: 'Tipo de Cuenta',
        },
        {
            $Type: 'UI.DataField',
            Value: importeDebe,
            Label: 'Debe',
        },
        {
            $Type: 'UI.DataField',
            Value: importeHaber,
            Label: 'Haber',
        },
    ],
    UI.SelectionPresentationVariant #ResumenCuentas: {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {
            $Type         : 'UI.PresentationVariantType',
            Visualizations: ['@UI.LineItem#ResumenCuentas',
            ],
            SortOrder     : [{
                $Type     : 'Common.SortOrderType',
                Property  : idCuenta,
                Descending: false,
            }, ],
        },
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [],
        },
    },
);

annotate service.AprobadorSolicitud with @(
    UI.LineItem #DetalledeAprobadores                     : [
        {
            $Type: 'UI.DataField',
            Value: fechaAprobacion,
            Label: 'fechaAprobacion',
        },
        {
            $Type: 'UI.DataField',
            Value: empleado.nombre,
            Label: 'nombre',
        },
        {
            $Type: 'UI.DataField',
            Value: decision,
            Label: 'decision',
        },
    ],
    UI.SelectionPresentationVariant #DetalledeAprobadores : {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {
            $Type         : 'UI.PresentationVariantType',
            Visualizations: ['@UI.LineItem#DetalledeAprobadores',
            ],
            SortOrder     : [{
                $Type     : 'Common.SortOrderType',
                Property  : fechaAprobacion,
                Descending: false,
            }, ],
        },
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [],
        },
    },
    UI.LineItem #DetalledeAprobadores1                    : [
        {
            $Type: 'UI.DataField',
            Value: cabecera.aprobadoresSolicitud.fechaAprobacion,
            Label: 'Fecha',
        },
        {
            $Type: 'UI.DataField',
            Value: cabecera.aprobadoresSolicitud.responsable,
            Label: 'Responsable',
        },
        {
            $Type: 'UI.DataField',
            Value: cabecera.aprobadoresSolicitud.empleado.nombre,
            Label: 'Empleado',
        },
        {
            $Type: 'UI.DataField',
            Value: cabecera.aprobadoresSolicitud.decision,
            Label: 'Decisión',
        },
        {
            $Type: 'UI.DataField',
            Value: cabecera.aprobadoresSolicitud.usuariosAlternativos,
            Label: 'Usuarios Aprobadores',
        },
        {
            $Type: 'UI.DataField',
            Value: cabecera.aprobadoresSolicitud.motivoRechazo,
            Label: 'Motivo de Rechazo',
        },
    ],
    UI.SelectionPresentationVariant #DetalledeAprobadores1: {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {
            $Type         : 'UI.PresentationVariantType',
            Visualizations: ['@UI.LineItem#DetalledeAprobadores1',
            ],
            SortOrder     : [{
                $Type     : 'Common.SortOrderType',
                Property  : fechaAprobacion,
                Descending: false,
            }, ],
        },
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [],
        },
    },
);

annotate service.AdjuntoSolicitud with @(UI.LineItem #Adjuntos: [
    {
        $Type: 'UI.DataField',
        Value: cabecera.adjuntosSolicitud.modifiedAt,
        Label: 'Fecha Adjunto',
    },
    {
        $Type: 'UI.DataField',
        Value: nombreAdjunto,
        Label: 'nombreAdjunto',
    },
    {
        $Type: 'UI.DataFieldWithUrl',
        Value: 'Descargar',
        Label: ' ',
        Url  : urlAdjunto
    },
]);

annotate service.CabeceraAsiento with @(UI.HeaderInfo: {
    TypeName      : 'Listado de Solicitudes',
    TypeNamePlural: 'Listado de Solicitudes'
});

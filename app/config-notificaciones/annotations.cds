using CatalogService as service from '../../srv/service';

// Mejora 22 - Configuración de notificación de contabilización (app de aprobadores)

annotate service.ConfigNotificaciones with @(
    UI.HeaderInfo : {
        TypeName       : 'Notificación de Contabilización',
        TypeNamePlural : 'Mis Notificaciones de Contabilización',
        Title          : { Value : sector.nombre },
        Description    : { Value : cargo.nombre },
    },
    UI.SelectionFields : [ sector_ID ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : empleado.nombre,
            Label : 'Aprobador',
        },
        {
            $Type : 'UI.DataField',
            Value : sector.nombre,
            Label : 'Sector',
        },
        {
            $Type : 'UI.DataField',
            Value : cargo.nombre,
            Label : 'Cargo',
        },
        {
            $Type : 'UI.DataField',
            Value : notificarContabilizacion,
            Label : 'Recibir aviso de contabilización',
        },
    ],
    UI.FieldGroup #Notificacion : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            {
                $Type : 'UI.DataField',
                Value : empleado_ID,
                Label : 'Aprobador',
            },
            {
                $Type : 'UI.DataField',
                Value : sector_ID,
                Label : 'Sector',
            },
            {
                $Type : 'UI.DataField',
                Value : cargo_ID,
                Label : 'Cargo',
            },
            {
                $Type : 'UI.DataField',
                Value : notificarContabilizacion,
                Label : 'Recibir aviso de contabilización',
            },
        ],
    },
    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'NotificacionFacet',
            Label  : 'Notificación de Contabilización',
            Target : '@UI.FieldGroup#Notificacion',
        },
    ],
);

annotate service.ConfigNotificaciones with {
    empleado @(
        Common.Text : empleado.nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
    );
    sector @(
        Common.Label : 'Sector',
        Common.Text : sector.nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.ValueListWithFixedValues : true,
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Sectores',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : sector_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'nombre',
                },
            ],
        },
    );
    cargo @(
        Common.Text : cargo.nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
    );
};

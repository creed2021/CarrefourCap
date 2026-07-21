using CatalogService as service from '../../srv/service';

annotate service.ConfigAdjuntosObligatorios with @(
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: tipoAsiento.nombre,
                Label: 'Tipo de Asiento',
            },
            {
                $Type: 'UI.DataField',
                Value: obligatorio,
                Label: 'Adjunto Obligatorio',
            },
        ],
    },
    UI.Facets : [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneratedFacet1',
        Label : 'General Information',
        Target: '@UI.FieldGroup#GeneratedGroup',
    }, ],
    UI.LineItem : [
        {
            $Type: 'UI.DataField',
            Value: tipoAsiento.nombre,
            Label: 'Tipo de Asiento',
        },
        {
            $Type: 'UI.DataField',
            Value: obligatorio,
            Label: 'Adjunto Obligatorio',
        },
    ],
    UI.HeaderInfo: {
        TypeName      : 'Configuración de Adjunto',
        TypeNamePlural: 'Configuraciones de Adjuntos',
        Title         : {
            $Type: 'UI.DataField',
            Value: tipoAsiento.nombre,
        },
    },
);

annotate service.TiposAsiento with {
    nombre @Core.Computed : true;
};
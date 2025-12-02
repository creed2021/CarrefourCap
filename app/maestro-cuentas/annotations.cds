using CatalogService as service from '../../srv/service';
annotate service.Cuentas with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Numero',
                Value : numero,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Nombre',
                Value : nombre,
            },
            {
                $Type : 'UI.DataField',
                Value : tipo_ID,
                Label : 'Tipo',
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'Maestro de Cuentas',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Numero',
            Value : numero,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Nombre',
            Value : nombre,
        },
        {
            $Type : 'UI.DataField',
            Value : tipo.nombre,
            Label : 'Tipo',
        },
    ],
);

annotate service.Cuentas with {
    tipo @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'TiposCuentas',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : tipo_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'codigo',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'nombre',
                },
            ],
        },
        Common.Text : tipo.nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
    )
};


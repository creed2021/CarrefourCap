using CatalogService as service from '../../srv/service';
annotate service.ConfigSolicitantes with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : empleado_ID,
                Label : 'empleado_ID',
            },
            {
                $Type : 'UI.DataField',
                Value : sector_ID,
                Label : 'sector_ID',
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'Configuración de Solicitantes',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : empleado.nombre,
            Label : 'Empleado',
        },
        {
            $Type : 'UI.DataField',
            Value : sector.nombre,
            Label : 'Sector',
        },
    ],
);

annotate service.ConfigSolicitantes with {
    empleado @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Empleados',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : empleado_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'nombre',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'email',
                },
            ],
        },
        Common.Text : empleado.nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
    )
};

annotate service.ConfigSolicitantes with {
    sector @(
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
                    ValueListProperty : 'codigo',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'nombre',
                },
            ],
        },
        Common.Text : sector.nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
    )
};


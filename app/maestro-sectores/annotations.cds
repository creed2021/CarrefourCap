using GestionaAsientos as service from '../../srv/service';
annotate service.Sectores with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Código',
                Value : codigo,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Nombre',
                Value : nombre,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'Maestro de Sectores',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Código',
            Value : codigo,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Nombre',
            Value : nombre,
        },
    ],
);

annotate service.Sectores with {
    codigo @Common.FieldControl : #Mandatory
};

annotate service.Sectores with {
    nombre @Common.FieldControl : #Mandatory
};

annotate service.Sectores with @(UI.HeaderInfo: {
    TypeName      : 'Listado de Sectores',
    TypeNamePlural: 'Listado de Sectores'
});

annotate service.Sectores with @(
    UI.PresentationVariant : {
        $Type : 'UI.PresentationVariantType',
        Visualizations : ['@UI.LineItem'],
        SortOrder : [
            {
                $Type : 'Common.SortOrderType',
                Property : nombre,
                Descending : false
            }
        ]
    }
);
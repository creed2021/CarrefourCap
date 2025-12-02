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
            Label : 'Maestro de Enpleados',
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


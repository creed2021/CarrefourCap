using GestionaAsientos as service from '../../srv/service';
annotate service.Empleados with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'nombre',
                Value : nombre,
            },
            {
                $Type : 'UI.DataField',
                Label : 'email',
                Value : email,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'Maestro de Empleados',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'nombre',
            Value : nombre,
        },
        {
            $Type : 'UI.DataField',
            Label : 'email',
            Value : email,
        },
    ],
);

annotate service.Empleados with {
    nombre @Common.FieldControl : #Mandatory
};

annotate service.Empleados with {
    email @Common.FieldControl : #Mandatory
};

annotate service.Empleados with @(UI.HeaderInfo: {
    TypeName      : 'Listado de Empleados',
    TypeNamePlural: 'Listado de Empleados'
});
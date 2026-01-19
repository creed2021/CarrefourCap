using GestionaAsientos as service from '../../srv/service';
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
                Label : 'Tipo de Cuenta',
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
            Label : 'numero',
            Value : numero,
        },
        {
            $Type : 'UI.DataField',
            Label : 'nombre',
            Value : nombre,
        },
    ],
    UI.HeaderInfo : {
        TypeName : 'Cuenta',
        TypeNamePlural : 'TypeCuentas',
        Title : {
            $Type : 'UI.DataField',
            Value : nombre,
        },
    },
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
            Label : 'Maestro de Cuentas',
        },
        Common.Text : tipo.nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.ValueListWithFixedValues : true,
        Common.FieldControl : #Mandatory,
    )
};

annotate service.Cuentas with {
    numero @Common.FieldControl : #Mandatory
};

annotate service.Cuentas with {
    nombre @Common.FieldControl : #Mandatory
};

annotate service.TiposCuentas with {
    ID @(
        Common.Text : nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};


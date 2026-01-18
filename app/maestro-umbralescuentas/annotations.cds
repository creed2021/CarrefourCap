using CatalogService as service from '../../srv/service';
annotate service.UmbralesCuentas with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : cuentaContable_ID,
                Label : 'Cuenta Contable',
            },
            {
                $Type : 'UI.DataField',
                Value : importeGerencia,
            },
            {
                $Type : 'UI.DataField',
                Value : importeCFO,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Comentarios',
                Value : comentarios,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'Configuración de Umbrales',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : cuentaContable.numero,
            Label : 'Número Cuenta',
        },
        {
            $Type : 'UI.DataField',
            Value : cuentaContable.nombre,
            Label : 'Nombre Cuenta',
        },
        {
            $Type : 'UI.DataField',
            Value : importeGerencia,
        },
        {
            $Type : 'UI.DataField',
            Value : importeCFO,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Comentarios',
            Value : comentarios,
        },
    ],
);

annotate service.UmbralesCuentas with {
    cuentaContable @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Cuentas',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : cuentaContable_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'numero',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'nombre',
                },
            ],
            Label : 'Cuenta Contable',
        },
        Common.Text : cuentaContable.nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.FieldControl : #Mandatory,
        Common.ValueListWithFixedValues : true,
    )
};

annotate service.UmbralesCuentas with @(UI.HeaderInfo: {
    TypeName      : 'Configuración de Umbrales',
    TypeNamePlural: 'Configuración de Umbrales'
});
annotate service.UmbralesCuentas with {
    importeGerencia @Common.FieldControl : #Mandatory
};

annotate service.UmbralesCuentas with {
    importeCFO @Common.FieldControl : #Mandatory
};

annotate service.Cuentas with {
    ID @(
        Common.Text : nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};


using CatalogService as service from '../../srv/service';


annotate service.ConfigAprobadores with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: empleado_ID,
                Label: 'aprobador',
            },
            {
                $Type: 'UI.DataField',
                Value: cargo_ID,
                Label: 'cargo',
            },
            {
                $Type: 'UI.DataField',
                Value: sector_ID,
                Label: 'sector',
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'Configuración de Aprobadores',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type: 'UI.DataField',
            Value: cargo.nombre,
            Label: 'Cargo',
        },
        {
            $Type: 'UI.DataField',
            Value: sector.nombre,
            Label: 'Sector',
        },
        {
            $Type: 'UI.DataField',
            Value: empleado.nombre,
            Label: 'Aprobador',
        }
    ],
);

annotate service.ConfigAprobadores with {
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
        Common.ValueListWithFixedValues : false,
    )
};

annotate service.ConfigAprobadores with {
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
        Common.ValueListWithFixedValues : false,
    )
};

annotate service.ConfigAprobadores with {
    cargo @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Cargos',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : cargo_ID,
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
        Common.Text : cargo.nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.ValueListWithFixedValues : false,
    )
};
annotate service.ConfigAprobadores with @(
  UI.HeaderInfo: {
    TypeName: 'Listado Configuración de Aprobadores',
    TypeNamePlural: 'Listado Configuración de Aprobadores'
  }
);

annotate service.Sectores with {
    ID @(
        Common.Text : nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

annotate service.Cargos with {
    ID @(
        Common.Text : nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

annotate service.Empleados with {
    ID @(
        Common.Text : nombre,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};


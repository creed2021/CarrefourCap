sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.carrefour.consultaestadosolicitudes',
            componentId: 'DetalleAsientoObjectPage',
            contextPath: '/CabeceraAsiento/items'
        },
        CustomPageDefinitions
    );
});
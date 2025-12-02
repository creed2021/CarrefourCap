sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/carrefour/consultaestadosolicitudes/test/integration/pages/CabeceraAsientoList",
	"com/carrefour/consultaestadosolicitudes/test/integration/pages/CabeceraAsientoObjectPage",
	"com/carrefour/consultaestadosolicitudes/test/integration/pages/DetalleAsientoObjectPage"
], function (JourneyRunner, CabeceraAsientoList, CabeceraAsientoObjectPage, DetalleAsientoObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/carrefour/consultaestadosolicitudes') + '/test/flp.html#app-preview',
        pages: {
			onTheCabeceraAsientoList: CabeceraAsientoList,
			onTheCabeceraAsientoObjectPage: CabeceraAsientoObjectPage,
			onTheDetalleAsientoObjectPage: DetalleAsientoObjectPage
        },
        async: true
    });

    return runner;
});


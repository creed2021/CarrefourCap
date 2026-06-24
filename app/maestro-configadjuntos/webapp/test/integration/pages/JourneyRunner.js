sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"maestroconfigadjuntos/test/integration/pages/ConfigAdjuntosObligatoriosList",
	"maestroconfigadjuntos/test/integration/pages/ConfigAdjuntosObligatoriosObjectPage"
], function (JourneyRunner, ConfigAdjuntosObligatoriosList, ConfigAdjuntosObligatoriosObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('maestroconfigadjuntos') + '/test/flp.html#app-preview',
        pages: {
			onTheConfigAdjuntosObligatoriosList: ConfigAdjuntosObligatoriosList,
			onTheConfigAdjuntosObligatoriosObjectPage: ConfigAdjuntosObligatoriosObjectPage
        },
        async: true
    });

    return runner;
});


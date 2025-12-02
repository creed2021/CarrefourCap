sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/carrefour/maestroconfigsolicitantes/test/integration/pages/ConfigSolicitantesList",
	"com/carrefour/maestroconfigsolicitantes/test/integration/pages/ConfigSolicitantesObjectPage"
], function (JourneyRunner, ConfigSolicitantesList, ConfigSolicitantesObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/carrefour/maestroconfigsolicitantes') + '/test/flp.html#app-preview',
        pages: {
			onTheConfigSolicitantesList: ConfigSolicitantesList,
			onTheConfigSolicitantesObjectPage: ConfigSolicitantesObjectPage
        },
        async: true
    });

    return runner;
});


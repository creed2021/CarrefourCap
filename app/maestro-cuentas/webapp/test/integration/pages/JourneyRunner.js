sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/carrefour/maestrocuentas/test/integration/pages/CuentasList",
	"com/carrefour/maestrocuentas/test/integration/pages/CuentasObjectPage"
], function (JourneyRunner, CuentasList, CuentasObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/carrefour/maestrocuentas') + '/test/flp.html#app-preview',
        pages: {
			onTheCuentasList: CuentasList,
			onTheCuentasObjectPage: CuentasObjectPage
        },
        async: true
    });

    return runner;
});


sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/carrefour/maestroumbralescuentas/test/integration/pages/UmbralesCuentasList",
	"com/carrefour/maestroumbralescuentas/test/integration/pages/UmbralesCuentasObjectPage"
], function (JourneyRunner, UmbralesCuentasList, UmbralesCuentasObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/carrefour/maestroumbralescuentas') + '/test/flp.html#app-preview',
        pages: {
			onTheUmbralesCuentasList: UmbralesCuentasList,
			onTheUmbralesCuentasObjectPage: UmbralesCuentasObjectPage
        },
        async: true
    });

    return runner;
});


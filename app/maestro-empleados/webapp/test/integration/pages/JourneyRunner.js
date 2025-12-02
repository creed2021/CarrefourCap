sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/carrefour/maestroempleados/test/integration/pages/EmpleadosList",
	"com/carrefour/maestroempleados/test/integration/pages/EmpleadosObjectPage"
], function (JourneyRunner, EmpleadosList, EmpleadosObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/carrefour/maestroempleados') + '/test/flp.html#app-preview',
        pages: {
			onTheEmpleadosList: EmpleadosList,
			onTheEmpleadosObjectPage: EmpleadosObjectPage
        },
        async: true
    });

    return runner;
});


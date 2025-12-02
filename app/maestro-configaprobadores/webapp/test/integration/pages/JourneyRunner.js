sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/carrefour/maestroconfigaprobadores/test/integration/pages/ConfigAprobadoresList",
	"com/carrefour/maestroconfigaprobadores/test/integration/pages/ConfigAprobadoresObjectPage"
], function (JourneyRunner, ConfigAprobadoresList, ConfigAprobadoresObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/carrefour/maestroconfigaprobadores') + '/test/flp.html#app-preview',
        pages: {
			onTheConfigAprobadoresList: ConfigAprobadoresList,
			onTheConfigAprobadoresObjectPage: ConfigAprobadoresObjectPage
        },
        async: true
    });

    return runner;
});


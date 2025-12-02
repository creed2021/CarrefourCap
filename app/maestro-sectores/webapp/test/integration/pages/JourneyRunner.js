sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/carrefour/maestrosectores/test/integration/pages/SectoresList",
	"com/carrefour/maestrosectores/test/integration/pages/SectoresObjectPage"
], function (JourneyRunner, SectoresList, SectoresObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/carrefour/maestrosectores') + '/test/flp.html#app-preview',
        pages: {
			onTheSectoresList: SectoresList,
			onTheSectoresObjectPage: SectoresObjectPage
        },
        async: true
    });

    return runner;
});


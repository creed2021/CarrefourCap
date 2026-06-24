sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();
            Then.onTheConfigAdjuntosObligatoriosList.iSeeThisPage();
        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheConfigAdjuntosObligatoriosList.onFilterBar().iExecuteSearch();
            
            Then.onTheConfigAdjuntosObligatoriosList.onTable().iCheckRows();

            When.onTheConfigAdjuntosObligatoriosList.onTable().iPressRow(0);
            Then.onTheConfigAdjuntosObligatoriosObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});
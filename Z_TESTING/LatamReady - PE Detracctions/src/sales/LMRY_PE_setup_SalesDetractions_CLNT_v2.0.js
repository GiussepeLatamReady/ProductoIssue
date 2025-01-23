/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @Name LMRY_PE_setup_SalesDetractions_CLNT_v2.0.js
 * @NAmdConfig ./config.json
 */

define(['N/url'],

  function (url) {
    const STLT_ID = "customscript_lmry_pe_det_salesetup_stlt";
    const DEPLOY_ID = "customdeploy_lmry_pe_det_salesetup_stlt";

    function pageInit(scriptContext) {
    }

    function openList() {

      var scriptContext = {
        scriptId: 'customscript_lmry_pe_det_sales_list_stlt',
        deploymentId: 'customdeploy_lmry_pe_det_sales_list_stlt'
      };

      var path = url.resolveScript(scriptContext);

      window.location.href = path;


    }


    function fieldChanged(context){
      var recordObj = context.currentRecord;
      if(context.fieldId === "custpage_subsidiary"){
        setWindowChanged(window, false);
        window.location.href = url.resolveScript({
            scriptId: STLT_ID,
            deploymentId: DEPLOY_ID,
            params: {
                subsidiary: Number(recordObj.getValue("custpage_subsidiary")) || ""
            }
        });
      }
    }

    return {
      pageInit: pageInit,
      openList: openList,
      fieldChanged : fieldChanged
    };

  });

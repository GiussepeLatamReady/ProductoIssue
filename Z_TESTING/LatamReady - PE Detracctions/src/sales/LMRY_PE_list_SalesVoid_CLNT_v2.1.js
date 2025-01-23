/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */

define(['N/url', 'N/format'],

  function(url, format) {

    const fields = {
      'custcriteria_period':'text',
      'custcriteria_user':'text',
      'custcriteria_subsidiary':'text',
      'custcriteria_date_from':'date',
      'custcriteria_date_to':'date',
    };

    function pageInit(scriptContext) {
      // alert('Hello World');
    }

    var scriptBatchDetractionVoid = {
      scriptId: 'customscript_lmry_pe_det_sales_d_stlt',
      deploymentId: 'customdeploy_lmry_pe_det_sales_d_stlt'
    }

    function back() {
      window.history.back();
    }

    function fieldChanged(scriptContext){

      var currentField = scriptContext.fieldId;

      var currentContext = scriptContext.currentRecord;

      let parameters = {};

      if(Object.keys(fields).includes(currentField)){
        Object.entries(fields).forEach( (line)=>{

          let value = currentContext.getValue(line[0]);
  
          if(value && line[1] == 'date'){
  
            value = format.parse({
              value: value,
              type: format.Type.DATE
            });
  
            value = value.getFullYear() + '-' + (value.getMonth() + 1) + '-' + value.getDate();
          }
  
          parameters[line[0]] = value; 
        });
        
        let scriptUrl = url.resolveScript({
          deploymentId: scriptBatchDetractionVoid.deploymentId,
          scriptId: scriptBatchDetractionVoid.scriptId,
          params: parameters
        });
  
        window.onbeforeunload = null;
        window.location.href = scriptUrl
      }

      return true;
    }



    return {
      pageInit: pageInit,
      back: back,
      fieldChanged: fieldChanged
    };

  });

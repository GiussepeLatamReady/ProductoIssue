/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 * @Name LMRY_PE_setup_SalesDetractions_STLT_v2.0.js
 */


define([
    'detraction/serverWidget',
    'detraction/metadata',
    'detraction/operations',
    'detraction/server'
  ],

  function(
    customWidget,
    metadata,
    operations,
    server
  ) {


    var daoContext = null;

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {

      daoContext = metadata.open();

      if (context.request.method == 'GET') {
        let currentSubsidiary = context.request.parameters.subsidiary || "";

        customWidget.setting(daoContext);

        customWidget.createForm('custtitle_sales_setup');

        customWidget.print().clientScriptModulePath = './LMRY_PE_setup_SalesDetractions_CLNT_v2.0.js';

        customWidget.addSubmitButton('custbutton_save');

        customWidget.addButton('custbutton_cancel', 'openList()');
        let subsidiaries = operations.getAccountSetup();

        customWidget.addField("custpage_subsidiary","select").setOptions(subsidiaries.map((v)=>{
          return { id : v.subsidiary, text : v.subsidiaryName}
        })).setValue(currentSubsidiary);

        let accounts = (currentSubsidiary) ? operations.getSearchAccountBySubsidiary([currentSubsidiary]) : [];
        log.debug("accounts", JSON.stringify(accounts));
        let detractionAccs = accounts.filter((a)=>a.accountCategory === "detraction");
        let bankAccs = accounts.filter((a)=>a.accountCategory === "bank");
        let roundingAccs = accounts.filter((a)=>a.accountCategory === "rounding");
        let roundingCreditAccs = accounts.filter((a)=>a.accountCategory === "roundingCredit");

        let subsidiaryTable = customWidget.createTable('custlist_subsidiaries');

        subsidiaryTable.addColumn('custpage_col_sales_subsidiary', 'select', 'subsidiary').isOnlyRead(true)

        subsidiaryTable.addColumn('custpage_col_sales_det_acc', 'select').setOptions(detractionAccs).isMandatory(true);

        subsidiaryTable.addColumn('custpage_col_sales_bank_acc', 'select').setOptions(bankAccs).isMandatory(true);

        subsidiaryTable.addColumn('custpage_col_sales_rounding_acc', 'select').setOptions(roundingAccs).isMandatory(true);

        subsidiaryTable.addColumn('custpage_col_sales_rounding_accc', 'select').setOptions(roundingCreditAccs).isMandatory(true);

        subsidiaryTable.addColumn('custpage_col_detailed_rounding', 'checkbox').isMandatory(true);

        let subsidiaryConfig = subsidiaries.filter((v)=> Number(v.subsidiary) === Number(currentSubsidiary) );

        subsidiaryConfig.forEach((line) => {

          let currentRow = [];

          currentRow[0] = line.subsidiary;
          currentRow[1] = line.detraction;
          currentRow[2] = line.bank;
          currentRow[3] = line.rounding;
          currentRow[4] = line.roundingCredit;
          currentRow[5] = line.checkDetailedRounding;
          

          subsidiaryTable.addRow(currentRow);

        });

        customWidget.activeSubmit();

        context.response.writePage(customWidget.print());

      } else {

        let request = context.request;

        let contextList = getSublistValues(request, {
          sublist: 'custlist_subsidiaries',
          input: [
            'custpage_col_sales_subsidiary',
            'custpage_col_sales_det_acc',
            'custpage_col_sales_bank_acc',
            'custpage_col_sales_rounding_acc',
            'custpage_col_sales_rounding_accc',
            'custpage_col_detailed_rounding'
          ],
          output: [
            'subsidiary',
            'detraction',
            'bank',
            'rounding',
            'roundingCredit',
            'checkDetailedRounding'
          ]
        });

        let setupContext = server.openSetup();

        for (let i = 0; i < contextList.length; i++) {

          let subsidiary = contextList[i].subsidiary;

          log.debug('contextList[i]', contextList[i]); 
          contextList[i].checkDetailedRounding = contextList[i].checkDetailedRounding === "T" ? true : contextList[i].checkDetailedRounding === "F" ? false : contextList[i].checkDetailedRounding;


          setupContext.updateInformation(contextList[i]);

        }

        server.openRedirect('ListDetractions');


      }



    }

    function getSublistValues(request, sublistContext) {

      let sublistId = sublistContext.sublist;

      let arrayFields = sublistContext.input;

      let arrayMap = sublistContext.output;

      let result = [];

      let totalLines = request.getLineCount({
        group: sublistId
      });

      for (let i = 0; i < totalLines; i++) {

        let jsonLine = {};

        for (let j = 0; j < arrayFields.length; j++) {

          let key = arrayMap[j] ? arrayMap[j] : arrayFields[j];

          jsonLine[key] = request.getSublistValue({
            group: sublistId,
            name: arrayFields[j],
            line: i
          })

        }
        result.push(jsonLine)
      }
      return result;


    }



    return {
      onRequest: onRequest
    };

  });

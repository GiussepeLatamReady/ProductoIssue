/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */

/*****************************************************************************
  VERSION 1.0
  05/04/2023 | Pierre Bernaola 

/*****************************************************************************/
define([
  'N',
  'detraction/serverWidget',
  'detraction/metadata',
  'detraction/operations',
  'detraction/server',
  'detraction/launcher'
],

function(
  N,
  customWidget,
  metadata,
  operations,
  server,
  launcher
) {

  var record = N.record;
  var log = N.log;

  /**
   * Definition of the Suitelet script trigger point.
   *
   * @param {Object} context
   * @param {ServerRequest} context.request - Encapsulation of the incoming request
   * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
   * @Since 2015.2
   */
  function onRequest(context) {

    if (context.request.method == 'GET') {

      let _DAO = metadata.open();

      const parameters = context.request.parameters;

      let subsiParameter = parameters['custcriteria_subsidiary'] ? parameters['custcriteria_subsidiary'] : '';
      let userParameter = parameters['custcriteria_user'] ? parameters['custcriteria_user'] : '';
      let periodParameter = parameters['custcriteria_period'] ? parameters['custcriteria_period'] : '';
      let dateFrom = parameters['custcriteria_date_from'] ? 
        new Date(parameters['custcriteria_date_from'].replace(/-/g, '/')) : '';
      let dateTo = parameters['custcriteria_date_to'] ? 
        new Date(parameters['custcriteria_date_to'].replace(/-/g, '/')) : '';

      const listBatch = operations.getBatchSearchForVoid(
        subsiParameter, 
        userParameter, 
        periodParameter, 
        dateFrom,
        dateTo
      );

      customWidget.setting(_DAO);

      customWidget.createForm('custtitle_sales_delete');

      customWidget.addButton('custbutton_back', 'back()');

      var criteriaGruop = customWidget.createGroup('custtab_voidsales_criteria');

      if(server.isOneWorld()){
        criteriaGruop.addField('custcriteria_subsidiary', 'select')
        .isNewColumn(true)
        .setOptions(operations.getSubsidiariesByCountry('PE'))
        .setValue(subsiParameter);
      }
      
      criteriaGruop.addField('custcriteria_period', 'select')
        .setOptions(operations.getSearchPeriod())
        .setValue(periodParameter);

      criteriaGruop.addField('custcriteria_user', 'select','employee')
        .setValue(userParameter);

      criteriaGruop.addField('custcriteria_date_from', 'date')
        .isNewColumn(true)
        .setValue(dateFrom);

      criteriaGruop.addField('custcriteria_date_to', 'date')
        .setValue(dateTo);

      var deleteTable = customWidget.createTable('custtable_sales_delete');

      deleteTable.addMarkAllButtons();

      deleteTable.addColumn('custpage_col_check', 'checkbox', 'left');
      deleteTable.addColumn('custcol_sales_list_id', 'integer', 'left');
      deleteTable.addColumn('custcol_sales_list_batch', 'text', 'left');
      deleteTable.addColumn('custcol_sales_list_user', 'text', 'left');

      if (server.isOneWorld())
      deleteTable.addColumn('custcol_sales_list_subsi', 'text', 'left');

      deleteTable.addColumn('custcol_sales_list_period', 'text', 'left');
      deleteTable.addColumn('custcol_sales_list_dateprocess', 'text', 'left');
      deleteTable.addColumn('custcol_sales_list_number', 'text', 'left');
      deleteTable.addColumn('custcol_sales_list_status', 'text', 'left');
      deleteTable.addColumn('custcol_sales_list_journal', 'text', 'left');
      deleteTable.addColumn('custpage_col_journal_id', 'text', 'left').isHidden(true);

      listBatch.forEach((currentLine) => {

        let currentRow = [];

        currentRow[0] = 'F';

        currentRow[1] = currentLine.batchID;

        currentRow[2] = currentLine.batchName;

        currentRow[3] = currentLine.user.text;

        if (server.isOneWorld())
          currentRow.push(currentLine.subsidiary.text);

        currentRow.push(currentLine.period);

        currentRow.push(currentLine.date);

        currentRow.push(currentLine.transactions + '' + _DAO.getName('message_quantity_sales'));

        let color = {
          '1': 'black',
          '2': 'black',
          '3': 'black',
          '4': 'red',
        }

        currentRow.push('<span color="' + color[currentLine.status] + '">' +
          _DAO.getName('status_sales_' + currentLine.status) + "</span>")

        currentRow.push(operations.generateRecordLink(
          currentLine.journal.id, currentLine.journal.text, 'journalentry'));

        currentRow.push(currentLine.journal.id);

        deleteTable.addRow(currentRow);

      });

      customWidget.addSubmitButton();
      customWidget.activeSubmit();

      customWidget.print().clientScriptModulePath = './LMRY_PE_list_SalesVoid_CLNT_v2.1.js';

      context.response.writePage(customWidget.print());

    } else {
      let request = context.request;

      let selecteds = getSublistValuesSelected(request, {
        sublist: 'custtable_sales_delete',
        input: [
          'custpage_col_check',
          'custcol_sales_list_id'
        ],
        output: [
          'check',
          'batchId'
        ]
      });

      saveRecord(selecteds);

      server.bulkUpdateWithVoidPending(selecteds);

      launcher.executeFlow('SalesVoidJournal');

      server.openRedirect('ListDetractions');
    }

    function saveRecord(selecteds){

      let objRecord = record.create({
        type: 'customrecord_lmry_batch_d_void_sales'
      });

      objRecord.setValue('custrecord_lmry_batch_d_void_sales_id', JSON.stringify(selecteds));
      objRecord.setValue('custrecord_lmry_batch_d_void_sales_stts', '1');

      objRecord.save();
    }


    function getSublistValuesSelected(request, sublistContext) {

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

        if(jsonLine.check == 'T'){
          delete jsonLine.check;
          result.push(jsonLine);
        }
          
      }
      return result;


    }

  }


  return {
    onRequest: onRequest
  };

});

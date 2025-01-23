/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */

/*****************************************************************************
  VERSION 1.0
  19/08/2021 | Richard Galvez | QA : Marisol Cconislla.
  - Now the list show a Batch Name in column number two, also add Date column
    in column number 5 (4 if the account is mid market edition)
/*****************************************************************************/
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

        customWidget.setting(_DAO);

        customWidget.createList('custitle_sales_list');

        // if (context.request.parameters.isNew == 'T') {
        //   customWidget.message.info(_DAO.getName('message_confirm_sales'));
        //
        // }

        customWidget.addButton('custlist_sales_new', 'openCreate');

        customWidget.addButton('custlist_sales_setup', 'openSetup');

        customWidget.addButtom('custpage_buttom_2', 'refresh');

        customWidget.addButtom('custpage_buttom_5', 'openDelete');
        
        customWidget.addColumn('custcol_sales_list_id', 'integer', 'left');

        customWidget.addColumn('custcol_sales_list_batch', 'text', 'left');

        customWidget.addColumn('custcol_sales_list_user', 'text', 'left');

        if (server.isOneWorld())
          customWidget.addColumn('custcol_sales_list_subsi', 'text', 'left')

        customWidget.addColumn('custcol_sales_list_period', 'text', 'left');

        customWidget.addColumn('custcol_sales_list_dateprocess', 'text', 'left');

        customWidget.addColumn('custcol_sales_list_number', 'text', 'left');

        customWidget.addColumn('custcol_sales_list_status', 'text', 'left');

        customWidget.addColumn('custcol_sales_list_journal', 'text', 'left');

        customWidget.addColumn('custcol_sales_list_details', 'textarea', 'left');


        customWidget.print().clientScriptModulePath = './LMRY_PE_list_SalesDetractions_CLNT_v2.0.js';

        let batchListResult = operations.getBatchSearch();
        batchListResult.forEach((currentLine) => {

          let currentRow = [];

          currentRow[0] = currentLine.batchID;

          currentRow[1] = currentLine.batchName;

          currentRow[2] = currentLine.user.text;

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
            '5': 'black',
            '6': 'black',
            '7': 'black',
            '8': 'black'
          }

          currentRow.push('<span color="' + color[currentLine.status] + '">' +
            _DAO.getName('status_sales_' + currentLine.status) + "</span>")

          currentRow.push(operations.generateRecordLink(
            currentLine.journal.id, currentLine.journal.text, 'journalentry'));

          currentRow.push(currentLine.details);

          customWidget.insertRow(currentRow);

        });

        context.response.writePage(customWidget.print());

      } else {

      }

    }


    return {
      onRequest: onRequest
    };

  });

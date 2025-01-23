/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */


define(['detraction/serverWidget', 'detraction/metadata', 'detraction/loader', 'detraction/batch',
    'detraction/batchFlow', 'N/search'
  ],

  function(customWidget, metadata, loader, batch, batchFlow, search) {

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

        var _PARAMS = loader.getParams(context);

        var _DAO = metadata.open();

        customWidget.setting(_DAO);

        customWidget.createList('list_title');
        //
        // /*------  Table --------*/
        // var _LIST = customWidget.createTable("custlist_batch");
        //
        // _LIST.addColumn('list_col_1', 'integer');
        //
        // _LIST.addColumn('list_col_2', 'text');
        //
        // _LIST.addColumn('list_col_3', 'text');
        //
        // _LIST.addColumn('list_col_4', 'text');
        //
        // _LIST.addColumn('list_col_5', 'text');
        //
        // _LIST.addColumn('list_col_6', 'text');
        //
        // _LIST.addColumn('list_col_7', 'text');

        customWidget.addColumn('list_col_1', 'text', 'center');

        customWidget.addColumn('list_col_2', 'integer', 'left');

        //customWidget.addColumn('list_col_3', 'text', 'left');

        customWidget.addColumn('list_col_4', 'text', 'left');

        customWidget.addColumn('list_col_5', 'text', 'left');

        customWidget.addColumn('list_col_6', 'text', 'left');

        customWidget.addColumn('list_col_7', 'text', 'left');

        customWidget.addColumn('list_col_8', 'text', 'left');

        customWidget.addColumn('list_col_9', 'text', 'left');

        var rows = getResultBatch(_DAO);

        for (var i = 0; i < rows.length; i++) {

          customWidget.insertRow(rows[i]);

        }


        context.response.writePage(customWidget.print());

      } else {

      }

    }

    function getResultBatch(_DAO) {

      var rows = [];

      search.create({
        type: 'customrecord_lmry_pe_detractions_batch',
        columns: [{
            name: 'internalid',
            sort: 'DESC'
          },
          'custrecord_lmry_pe_det_b_subsidiary',
          {
            name: "periodname",
            join: "CUSTRECORD_LMRY_PE_DET_B_PERIOD",
          },
          'custrecord_lmry_pe_det_b_status',
          'custrecord_lmry_pe_det_b_sunat_file',
          'custrecord_lmry_pe_det_b_bank_file',
          'custrecord_lmry_pe_det_b_journals',
        ]
      }).run().each(function(line) {

        var row = [];

        var column = line.columns;

        var id = line.getValue(column[0]);
        var subsidiary = line.getText(column[1]);
        var period = line.getValue(column[2]);
        var status = _DAO.getName(batch.statusType[line.getValue(column[3])]);
        var solfile = line.getValue(column[4]) ?
          getURLFile(
            line.getValue(column[4]),
            line.getText(column[4])) : '';

        var bankfile = line.getValue(column[5]) ?
        getURLFile(
          line.getValue(column[5]),
          line.getText(column[5])) : '';

        var journal = line.getValue(column[6]) ? loader.generateUrl('journalentry',
          line.getText(column[6]),
          line.getValue(column[6])) : '';


        row.push(loader.generateUrl('customrecord_lmry_pe_detractions_batch',
          _DAO.getName('custaction_view'),
          id));
        row.push(id);
        row.push(subsidiary);
        row.push(period);
        row.push(status);
        row.push(solfile);
        row.push(bankfile);
        row.push(journal);

        rows.push(row);

        return true;
      });

      return rows;

    }

    function getURLFile(id, text) {

      var link = '<a href="/core/media/previewmedia.nl?id=' + id + '" class="dottedlink" target="_blank">' + text + '</a>'
      return link;
    }



    return {
      onRequest: onRequest
    };

  });

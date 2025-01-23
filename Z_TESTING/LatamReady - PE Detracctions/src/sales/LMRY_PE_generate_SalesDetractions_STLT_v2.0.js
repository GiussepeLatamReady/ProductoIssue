/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 * @Name LMRY_PE_generate_SalesDetractions_STLT_v2.0.js
 */
/*****************************************************************************
  VERSION 2.0
  17/02/2022 | Richard Galvez
  - add new columns and change the object generated.
/*****************************************************************************/

define([
  'detraction/serverWidget',
  'detraction/metadata',
  'detraction/server',
  'detraction/operations',
  'detraction/launcher',
  'N/log'
],

  function (
    customWidget,
    metadata,
    server,
    operations,
    launcher,
    log
  ) {


    var isOneWorld = true;

    function getParameters(context) {

      let result = {};

      let fieldsValues = {
        'custfilter_subsi': 'subsidiary',
        'custfilter_ar_acc': 'account',
        'custfilter_customer': 'customer',
        'custfilter_date_from': 'from',
        'custfilter_date_to': 'to'
      };


      let params = context.request.parameters;

      for (let id in fieldsValues) {

        let value = params[id];

        if (value) {
          result[fieldsValues[id]] = value;
        }
      }

      return result;

    }

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {

      isOneWorld = server.isOneWorld();

      let detractionSetup = server.openSetup();

      if (context.request.method == 'GET') {

        let _DAO = metadata.open();

        let params = getParameters(context);

        customWidget.setting(_DAO);

        customWidget.createForm('custtitle_suitelet_sales');

        customWidget.print().clientScriptModulePath = './LMRY_PE_generate_SalesDetractions_CLNT_v2.0.js';

        customWidget.addSubmitButton();

        let _GROUP_A = customWidget.createGroup('custgroup_criteria');


        if (isOneWorld) {
          _GROUP_A.addField("custfilter_subsi", 'select').isMandatory(true)
            .setOptions(detractionSetup.getSubsidaries())
            .setValue(params.subsidiary);
        }

        /* Other Filters */

        _GROUP_A.addField("custfilter_ar_acc", 'select').isNewColumn(true)
          .setOptions(operations.getSearchReceivableAccount())
          .setValue(params.account);
        
		/* Cambio : Task - D1091 , Request REQ230900039 realizado */
		let customerField = _GROUP_A.addField('custfilter_customer', 'select').isNewColumn(true);
		if(params.subsidiary) {
			customerField.setOptions(operations.getSearchCustomer(params.subsidiary));
		}
		customerField.setValue(params.customer);
		/* fin del cambio */
	  
        /* Dates Filters */
        _GROUP_A.addField("custfilter_date_from", 'date').isNewColumn(true).isShort(true)
          .setValue(
            (params.from ? operations.stringToDate(params.from) : '')
          );

        _GROUP_A.addField("custfilter_date_to", 'date').isShort(true)
          .setValue(
            (params.to ? operations.stringToDate(params.to) : '')
          );


        let _GROUP_B = customWidget.createGroup('custgroup_inf');
        /* Necesary accounts for the detraction flow */
        _GROUP_B.addField("custpage_acc_1", 'select', 'account').isMandatory(true).isOnlyRead(true);

        _GROUP_B.addField("custpage_acc_2", 'select', 'account').isMandatory(true).isOnlyRead(true);

        _GROUP_B.addField("custpage_acc_3", 'select', 'account').isMandatory(true).isOnlyRead(true);

        _GROUP_B.addField("custpage_acc_5", 'select', 'account').isMandatory(true).isOnlyRead(true);

        _GROUP_B.addField("custpage_detailed_rounding", 'checkbox').isMandatory(true).isOnlyRead(true);

        _GROUP_B.addField("custpage_i_date", 'date').isMandatory(true).isNewColumn(true);

        _GROUP_B.addField("custpage_i_period", 'select').isMandatory(true)
          .setOptions(operations.getSearchPeriod())

        _GROUP_B.addField("custpage_i_note", "text").isNewColumn(true);

        _GROUP_B.addField("custpage_i_batch", 'text').isMandatory(true);

        var _GROUP_C = customWidget.createGroup('custgroup_clasification');

        var clasifications = {
          'departments': 'custpage_c_department',
          'classes': 'custpage_c_class',
          'locations': 'custpage_c_location',
        }
        var records = {
          'departments': operations.getSearchDepartment,
          'classes': operations.getSearchClass,
          'locations': operations.getSearchLocation,
        }

        for (var key in clasifications) {

          var viewer = operations.getClasification(key);

          if (viewer != 'hidden') {

            if (viewer == 'visible') {
              _GROUP_C.addField(clasifications[key], "select").setOptions(records[key](params.subsidiary));
            } else {
              _GROUP_C.addField(clasifications[key], "select").isMandatory(true).setOptions(records[key](params.subsidiary));
            }

          }

        }

        /*------  Table --------*/
        var _LIST = customWidget.createTable("custlist_transactions");

        _LIST.addColumn('custpage_col_trans_check', 'checkbox').isOnlyRead(false);

        _LIST.addColumn('custpage_col_trans_id', 'text').isHidden(true);

        _LIST.addColumn('custpage_col_tranid', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_customer', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_taxperiod', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_date', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_concept', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_voucher_serie', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_voucher_number', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_currency', 'select', 'currency').isOnlyRead(true);

        _LIST.addColumn('custpage_col_amount', 'currency').isOnlyRead(true);

        _LIST.addColumn('custpage_col_fx_amount', 'currency').isOnlyRead(true);

        _LIST.addColumn('custpage_col_de_rate', 'percent').isOnlyRead(true);

        _LIST.addColumn('custpage_col_de_amount', 'currency').isOnlyRead(true);

        _LIST.addColumn('custpage_col_de_total_amount', 'currency').isOnlyRead(true);

        _LIST.addColumn('custpage_col_de_decimals', 'currency').isOnlyRead(true);

        _LIST.addColumn('custpage_col_de_pending_amount', 'currency').isOnlyRead(true);

        _LIST.addColumn('custpage_col_de_decimal_payed', 'currency').isHidden(true);

        _LIST.addColumn('custpage_col_de_pay_amount', 'integer').isEdit(true).isDisabled(true)

        _LIST.addButton('custbuttom_check_all', 'markAll');

        _LIST.addButton('custbuttom_uncheck_all', 'unMarkAll');

        if (params.subsidiary || !isOneWorld) {

          let subsidiaryInformation = {};

          let isConfiguredMidMarket = false;

          if (isOneWorld) {

            subsidiaryInformation = detractionSetup.getInformation(params.subsidiary);

          } else {
            subsidiaryInformation = detractionSetup.getInformation();

            if (subsidiaryInformation.detraction && subsidiaryInformation.bank && subsidiaryInformation.rounding && subsidiaryInformation.roundingCredit) {
              isConfiguredMidMarket = true;
            }

            if (!isConfiguredMidMarket) {
              customWidget.message.warning(_DAO.getName('message_sales_setup_error'));
            }

          }


          let currentPeriod = operations.getCurrentPeriod();
          subsidiaryInformation.checkDetailedRounding = subsidiaryInformation.checkDetailedRounding ? "T" : "F";

          customWidget.setFieldValues({
            'custpage_acc_1': subsidiaryInformation.detraction,
            'custpage_acc_2': subsidiaryInformation.bank,
            'custpage_acc_3': subsidiaryInformation.rounding,
            'custpage_acc_5': subsidiaryInformation.roundingCredit,
            'custpage_detailed_rounding': subsidiaryInformation.checkDetailedRounding,
            'custpage_i_date': currentPeriod.date,
            'custpage_i_period': currentPeriod.period
          });

          params.onlyAviable = true;



          let searchResult = [];
          try {
            searchResult = operations.getSearchInvoice(params);

            searchResult.forEach((line) => {

              let currentRow = [];

              currentRow[0] = 'F';

              currentRow[1] = line.transaction.id;

              currentRow[2] = operations.generateRecordLink(line.transaction.id, line.transaction.value, 'invoice');

              currentRow[3] = operations.generateRecordLink(line.customer.id, line.customer.value, 'customer');

              currentRow[4] = line.period;

              currentRow[5] = line.trandate;

              currentRow[6] = line.concept;

              currentRow[7] = line.serie;

              currentRow[8] = line.number;

              currentRow[9] = line.currency;

              currentRow[10] = line.fxBase;

              currentRow[11] = line.base;

              currentRow[12] = line.exrate;

              currentRow[13] = line.amount;

              currentRow[14] = Math.round(line.amount);

              currentRow[15] = "" + Number((parseFloat(line.amount) - Math.round(line.amount)).toFixed(2));

              let pay = line.pay ? line.pay : 0;

              let pendingAmount = (Math.round(line.amount) - pay).toFixed(2);

              let isOldVersion = line.isOldVersion;

              currentRow[16] = "" + pendingAmount;

              currentRow[17] = "" + line.decimal;

              currentRow[18] = '';

              if (!isOldVersion && parseInt(pendingAmount) > 0) {
                _LIST.addRow(currentRow);
              }

            });
          } catch (err) {
            let error = err.name;
            let message = err.message;

            if (error == "SSS_SEARCH_FOR_EACH_LIMIT_EXCEEDED") {

              message = _DAO.getName('message_max_limit_error').replaceAll("\n", "<br>");

            }
            searchResult = [];
            customWidget.message.warning(message);
          }

          if (searchResult.length > 0) {

            if (isOneWorld || isConfiguredMidMarket)
              customWidget.activeSubmit();
          }

        }

        context.response.writePage(customWidget.print());

      } else {

        let serverContext = server.openContext(context);

        let transactionResult = serverContext.getRequestSublistValues({
          sublist: 'custlist_transactions',
          input: [
            'custpage_col_trans_check',
            'custpage_col_trans_id',
            'custpage_col_de_total_amount',
            'custpage_col_de_decimals',
            'custpage_col_de_pay_amount',
            'custpage_col_de_decimal_payed',
            'custpage_col_de_pending_amount'
          ],
          output: ['isCheck', 'transaction', 'total', 'decimal', 'pay', 'decimalPayed', 'pending']
        });

        let subsidiary = serverContext.getParamValue('custfilter_subsi');

        let batchNumber = serverContext.getParamValue('custpage_i_batch')

        let period = serverContext.getParamValue('custpage_i_period');

        let date = serverContext.getParamValue('custpage_i_date');

        let note = serverContext.getParamValue('custpage_i_note');

        let clasifications = {
          department: serverContext.getParamValue('custpage_c_department'),
          class: serverContext.getParamValue('custpage_c_class'),
          location: serverContext.getParamValue('custpage_c_location')
        }

        let transactionContext = {};

        transactionResult.forEach((line) => {

          if (line.isCheck == 'T' || line.isCheck == true) {

            let decimal = 0;

            let pay = Number(line.pay);

            let pending = Number(line.pending);

            if ((pending - pay) <= 0) {

              decimal = Number((Number(line.decimal) - Number(line.decimalPayed)).toFixed(2));

            } else {
              decimal = Number((line.decimal * line.pay / line.total).toFixed(2))
            }

            transactionContext[line.transaction] = {
              batch: batchNumber,
              pay: pay,
              decimal: decimal
            }

          }
        });



        let salesBatchContext = server.createBatch();

        salesBatchContext.setProperties({
          'subsidiary': subsidiary,
          'date': operations.stringToDate(date),
          'period': period,
          'memo': note,
          'batch': batchNumber,
          'class': clasifications.class,
          'department': clasifications.department,
          'location': clasifications.location,
        });

        salesBatchContext.setTransactions(transactionContext);

        salesBatchContext.commit();

        launcher.executeFlow(launcher.Type.GENERATE_SALES_JOURNAL);

        server.openRedirect('ListDetractions');

      }

    }

    return {
      onRequest: onRequest
    };

  });

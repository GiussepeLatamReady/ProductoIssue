/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @NAmdConfig ./config.json
 * @Name LMRY_PE_BatchDetraction_URET_v2.0.js
 */
/******************************************************************************************
  VERSION 3.0
  23/05/2022 : Richard Galvez Lopez
  - Change the version Script to 2.1
/*****************************************************************************************/

define(["detraction/serverWidget", "detraction/metadata", 'detraction/loader', "detraction/batch",
    "detraction/batchFlow", 'N/log'
  ],

  function(customWidget, metadata, loader, batch, batchFlow, log) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {

      requestStatus(scriptContext);

      if (customWidget.isUserInterface()) {

        var _DAO = metadata.open();

        customWidget.setting(_DAO);

        customWidget.setForm(scriptContext.form);

        customWidget.print().clientScriptModulePath = './LMRY_PE_BatchDetraction_CLNT_v2.0.js';

        log.error('tabs', scriptContext.form.getTabs());

        customWidget.clearFields(scriptContext.newRecord.type);

        customWidget.replaceField('custrecord_lmry_pe_det_b_status', 'select',
          null, contextStatus(_DAO)).isFirstRow(true).isOnlyRead(true);

        customWidget.replaceField('custrecord_lmry_pe_det_b_period', 'select', null,
          loader.getOption(getContextSearchPeriod())).isOnlyRead(true);

        customWidget.addField('custpage_acc_1', 'select', 'account').
        insertBefore('custrecord_lmry_pe_det_b_user').isOnlyRead(true);

        customWidget.addField('custpage_acc_2', 'select', 'account').
        insertBefore('custrecord_lmry_pe_det_b_user').isOnlyRead(true);;

        customWidget.addField('custpage_acc_3', 'select', 'account').
        insertBefore('custrecord_lmry_pe_det_b_user').isOnlyRead(true);;

        customWidget.addField('custpage_acc_5', 'select', 'account').
        insertBefore('custrecord_lmry_pe_det_b_user').isOnlyRead(true);

        customWidget.addField('custpage_acc_4', 'select', 'account').
        insertBefore('custrecord_lmry_pe_det_b_user').isOnlyRead(true);;

        

        customWidget.addField('custpage_detailed_rounding', 'checkbox').
        insertBefore('custrecord_lmry_pe_det_b_user').isOnlyRead(true);

        customWidget.setFieldValues(
          loader.getAccounts(scriptContext.newRecord.getValue('custrecord_lmry_pe_det_b_subsidiary'))
        );


        var TAB = customWidget.createTab('custpage_tab_transactions', 'notes');

        /*------  Table --------*/
        var _LIST = TAB.addTable("custpage_custlist_transactions");

        _LIST.addColumn('custpage_col_det_number', 'text').isEdit(true).isMandatory(true);

        _LIST.addColumn('custpage_col_trans_id', 'text').isHidden(true);

        _LIST.addColumn('custpage_col_tranid', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_vendor', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_account_det', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_proforma', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_code', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_operation', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_taxperiod', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_voucher', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_voucher_serie', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_voucher_number', 'text').isOnlyRead(true);

        _LIST.addColumn('custpage_col_currency', 'select', 'currency').isOnlyRead(true);

        _LIST.addColumn('custpage_col_amount', 'currency').isOnlyRead(true);

        _LIST.addColumn('custpage_col_fx_amount', 'currency').isOnlyRead(true);

        _LIST.addColumn('custpage_col_de_rate', 'percent').isOnlyRead(true);

        _LIST.addColumn('custpage_col_de_amount', 'currency').isOnlyRead(true);

        let subsidiary = scriptContext.newRecord.getValue('custrecord_lmry_pe_det_b_subsidiary');

        var arrayIds = JSON.parse(
          scriptContext.newRecord.getValue('custrecord_lmry_pe_det_b_vendorbill'));

        if (!Array.isArray(arrayIds)) {
          arrayIds = Object.values(arrayIds).map((current) => {
            return current.transaction
          });
        }

        var numbers = scriptContext.newRecord.getValue('custrecord_lmry_pe_det_b_number');

        try {
          numbers = JSON.parse(numbers);
        } catch (err) {
          numbers = {};
        }
        log.error('numbers', numbers);

        var rows = loader.getTransactionsByIds(arrayIds, numbers, subsidiary);

        for (var i = 0; i < rows.length; i++) {

          _LIST.addRow(rows[i]);

        }

        var step = scriptContext.newRecord.getValue('custrecord_lmry_pe_det_b_status');

        if (step == batch.Status.PENDING_FILE || step == batch.Status.PENDING_JOURNAL ||
          step == batch.Status.GENERATING_FILES || step == batch.Status.GENERATING_JOURNAL) {

          customWidget.addButtom('custpage_buttom_2', 'reload()');

        }

        if (step == batch.Status.ERROR_FILES || step == batch.Status.COMPLETE_FILES) {

          customWidget.addButtom('custpage_buttom_1', 'generateFile()');

        }

        if (step == batch.Status.ERROR_JOURNAL || step == batch.Status.COMPLETE_FILES) {

          var button = customWidget.addButtom('custpage_buttom_3', 'generateJournal()');

          if (!scriptContext.newRecord.getValue('custrecord_lmry_pe_det_b_number') ||
            scriptContext.newRecord.getValue('custrecord_lmry_pe_det_b_number') == '{}')
            button.isDisabled = true;

        }

        if (step == batch.Status.ERROR_JOURNAL || step == batch.Status.COMPLETE_FILES ||
          step == batch.Status.ERROR_FILES || step == batch.Status.COMPLETE_FILES) {

          customWidget.addButtom('custpage_buttom_4', 'cancelFlow()');

        }


      }

    }

    function getContextSearchPeriod() {
      return {
        type: "accountingperiod",
        filters: [
          ["isquarter", "is", "F"],
          "AND",
          ["isyear", "is", "F"],
          "AND",
          ["closed", "is", "F"],
          "AND",
          ["isadjust", "is", "F"]
        ],
        columns: [{
          name: "internalid",
          sort: 'ASC',
        }, {
          name: "periodname",
        }]
      };
    }

    function contextStatus(_dao) {

      var result = [];

      for (var x in batch.statusType) {

        var id = x;
        var text = _dao.getName(batch.statusType[x]);

        result.push({
          id: id,
          text: text
        });

      }

      return result;

    }

    function requestStatus(scriptContext) {

      log.error("request", scriptContext);

      if (scriptContext.request) {

        var parameters = scriptContext.request.parameters;

        if (parameters['createFile'] == 'T') {

          batch.openBatchFile(scriptContext.newRecord.id);

          batchFlow.executeFlow(batchFlow.Type.GENERATE_FILE);

          batch.reloadPage(scriptContext.newRecord.id);

        } else {

          if (parameters['generateJournal'] == 'T') {

            batch.openBatchJournal(scriptContext.newRecord.id);

            batchFlow.executeFlow(batchFlow.Type.GENERATE_JOURNAL);

            batch.reloadPage(scriptContext.newRecord.id);

          } else {

            if (parameters['cancel'] == 'T') {

              batch.cancel(scriptContext.newRecord.id);

              batch.reloadPage(scriptContext.newRecord.id);

            }

          }

        }


      }

    }


    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {

      var _record = scriptContext.newRecord;

      var _list = _record.getSublist({
        sublistId: 'custpage_custlist_transactions'
      });

      if (_list) {

        var lines = _record.getLineCount({
          sublistId: 'custpage_custlist_transactions'
        });

        var jsonResult = {};

        for (var i = 0; i < lines; i++) {

          var number = _record.getSublistValue({
            sublistId: 'custpage_custlist_transactions',
            fieldId: 'custpage_col_det_number',
            line: i
          });

          var id = _record.getSublistValue({
            sublistId: 'custpage_custlist_transactions',
            fieldId: 'custpage_col_trans_id',
            line: i
          })

          jsonResult[id] = number;

        }

        _record.setValue('custrecord_lmry_pe_det_b_number', JSON.stringify(jsonResult));

      }

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {

    }

    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      //afterSubmit: afterSubmit
    };

  });

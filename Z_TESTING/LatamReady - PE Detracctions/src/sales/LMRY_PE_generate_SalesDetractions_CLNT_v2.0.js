/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */

define([
    'detraction/metadata',
    'N/url',
    'N/currentRecord'
  ],

  function(metadata, url, currentRecord) {

    /****************************************
      Universal Variables
    ********/
    var suiteletScript = {
      scriptId: 'customscript_lmry_pe_det_salesgene_stlt',
      deploymentId: 'customdeploy_lmry_pe_det_salesgene_stlt'
    };

    var fieldsValues = {
      'custfilter_subsi': 'normal',
      'custfilter_ar_acc': 'normal',
      'custfilter_customer': 'normal',
      'custfilter_date_from': 'date',
      'custfilter_date_to': 'date'
    };

    /****************************************
      Default Functions
    ********/
    function validateField(scriptContext) {

      try {
        var recordContext = scriptContext.currentRecord;

        var currentField = scriptContext.fieldId;

        if (fieldsValues[currentField]) {

          var parameters = getValues(recordContext);

          var path = url.resolveScript({
            scriptId: suiteletScript.scriptId,
            deploymentId: suiteletScript.deploymentId,
            params: parameters
          });

          setWindowChanged(window, false);
          window.location.href = path;

        }


      } catch (err) {
        console.log(err);
      }

      return true;

    }

    function fieldChanged(scriptContext) {

      var currentField = scriptContext.fieldId;

      var currentContext = scriptContext.currentRecord;

      var currentSubList = scriptContext.sublistId;

      var payAmountKey = 'custpage_col_de_pay_amount';

      var pendingAmountKey = 'custpage_col_de_pending_amount';

      if (currentSubList == 'custlist_transactions') {

        var currentLine = scriptContext.line;

        if (currentField == 'custpage_col_trans_check') {

          var isActive = currentContext.getSublistValue(currentSubList, currentField, currentLine);

          var payAmountField = currentContext.getSublistField(currentSubList, payAmountKey, currentLine)

          var payAmountValue = '';

          if (isActive == 'T' || isActive == true) {
            payAmountField.isDisabled = false;

            payAmountValue = currentContext.getSublistValue(currentSubList, pendingAmountKey, currentLine);

            console.log(payAmountValue);

          } else {
            payAmountField.isDisabled = true;
          }

          currentContext.setCurrentSublistValue({
            sublistId: currentSubList,
            fieldId: payAmountKey,
            value: payAmountValue,
            ignoreFieldChange: true
          });

        }

        if (currentField == 'custpage_col_de_pay_amount') {

          var amountValue = currentContext.getSublistValue(currentSubList,
            currentField, currentLine);

          if (!amountValue) {
            amountValue = 1;
          } else {
            amountValue = Number(amountValue + "");
            if (amountValue <= 0) {
              amountValue = 1;
            } else {
              var pendingAmount = currentContext.getSublistValue(
                currentSubList, pendingAmountKey, currentLine);
              pendingAmount = Number(pendingAmount);
              if (amountValue > pendingAmount)
                amountValue = pendingAmount;
            }


          }
          currentContext.setCurrentSublistValue({
            sublistId: currentSubList,
            fieldId: currentField,
            value: amountValue,
            ignoreFieldChange: true
          })
        }

        currentContext.commitLine({
          sublistId: currentSubList
        });
      }

      return true;

    }

    function saveRecord(scriptContext) {

      var _record = scriptContext.currentRecord;

      _dao = metadata.open();

      var line = _record.findSublistLineWithValue({
        sublistId: 'custlist_transactions',
        fieldId: 'custpage_col_trans_check',
        value: 'T'
      });

      if (line < 0) {
        alert(_dao.getName('error_form_002'));
        return false;
      } else {
        return true;
      }

    }


    /****************************************
      Custom Functions
    ********/
    function getValues(recordContext) {

      var result = {};

      for (var id in fieldsValues) {

        var currentField = id;
        var value = recordContext.getValue(id);

        if (value) {
          if (fieldsValues[id] == 'date') {
            value = recordContext.getText(id);
          }
          result[id] = value;
        }

      }

      return result;

    }

    function markAll() {

      var current = currentRecord.get();

      var lineNumbers = current.getLineCount('custlist_transactions');

      for (var i = 0; i < lineNumbers; i++) {

        current.selectLine({
          sublistId: 'custlist_transactions',
          line: i
        });

        current.setCurrentSublistValue({
          sublistId: 'custlist_transactions',
          fieldId: 'custpage_col_trans_check',
          value: true,
          ignoreFieldChange: false
        })

      }


    }

    function unMarkAll() {

      var current = currentRecord.get();

      var lineNumbers = current.getLineCount('custlist_transactions');

      for (var i = 0; i < lineNumbers; i++) {

        current.selectLine({
          sublistId: 'custlist_transactions',
          line: i
        });

        current.setCurrentSublistValue({
          sublistId: 'custlist_transactions',
          fieldId: 'custpage_col_trans_check',
          value: false,
          ignoreFieldChange: false
        })

      }

    }

    return {

      validateField: validateField,
      saveRecord: saveRecord,
      fieldChanged: fieldChanged,
      markAll: markAll,
      unMarkAll: unMarkAll
    };

  });

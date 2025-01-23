/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 * @Name LMRY_PE_generate_detractions_CLNT_v2.0.js
 */

define(['N/currentRecord', 'N/url', 'N/record', 'N/search',
  '../../lib/LMRY_detrac_popup_LBRY_v2.0.js',
  '../../lib/LMRY_detrac_metadata_LBRY_v2.0.js',
        'N/runtime'
],

  function (currentRecord, url, record, search, latamWidget, metadata,runtime) {

    var _dao = '';

    var accounts = null;

    var jsonFields = {

      "custfilter_subsi": 'value',
      "custfilter_date_from": 'date',
      "custfilter_date_to": 'date',
      "custfilter_ap_acc": 'value',
      "custfilter_vendor": 'value',
    }

    function pageInit(scriptContext) {
      try {
        latamWidget.openSubForm();

        _dao = metadata.open();

        if (scriptContext.currentRecord.getValue('custfilter_subsi')) {
          document.getElementById('settings').addEventListener("click", openPopup);
          accounts = getAccountPopup(scriptContext.currentRecord.getValue('custfilter_subsi'));
        }


        if (!accounts) {
          accounts = getAccountPopup('@NONE@');
        }
      } catch (err) {
        console.log(err);
      }

    }

    function openPopup() {

      var _current = currentRecord.get();

      var arrayAccounts = JSON.parse(accounts);

      var objForm = latamWidget.createForm(_dao.getName('custtitle_popup'), 600, 560);

      objForm.addButton('custpopup_submit', _dao.getName('custpopup_submit'), 'submit');

      objForm.addTab('custpopup_tab', _dao.getName('custpopup_tab'));

      objForm.addField('custpopup_acc_1', _dao.getName('custpopup_acc_1'), 'select',
        'custpopup_tab', arrayAccounts.other);

      objForm.addField('custpopup_acc_2', _dao.getName('custpopup_acc_2'), 'select',
        'custpopup_tab', arrayAccounts.expense);

      objForm.addField('custpopup_acc_3', _dao.getName('custpopup_acc_3'), 'select',
        'custpopup_tab', arrayAccounts.expense);

      objForm.addField('custpopup_acc_5', _dao.getName('custpopup_acc_5'), 'select',
        'custpopup_tab', arrayAccounts.income);

      objForm.addField('custpopup_acc_4', _dao.getName('custpopup_acc_4'), 'select',
        'custpopup_tab', arrayAccounts.bank);

      objForm.addField('custpopup_detailed_rounding', _dao.getName('custpopup_detailed_rounding'), 'checkbox',
        'custpopup_tab');

      objForm.writeForm();

      var subsi = _current.getValue('custfilter_subsi');
      var acc1 = _current.getValue('custpage_acc_1');
      var acc2 = _current.getValue('custpage_acc_2');
      var acc3 = _current.getValue('custpage_acc_3');
      var acc4 = _current.getValue('custpage_acc_4');
      var acc5 = _current.getValue('custpage_acc_5');
      var chexkDetailedRounding = _current.getValue('custpage_detailed_rounding');

      try {
        objForm.setValue('custpopup_acc_1', acc1);
        objForm.setValue('custpopup_acc_2', acc2);
        objForm.setValue('custpopup_acc_3', acc3);
        objForm.setValue('custpopup_acc_4', acc4);
        objForm.setValue('custpopup_acc_5', acc5);
        objForm.setValue('custpopup_detailed_rounding', chexkDetailedRounding);
        
      } catch (err) {
        console.log(err);
      }

      objForm.addClick('custpopup_submit', function () {

        var _setup = null;

        var acc1 = objForm.getValue('custpopup_acc_1');
        var acc2 = objForm.getValue('custpopup_acc_2');
        var acc3 = objForm.getValue('custpopup_acc_3');
        var acc4 = objForm.getValue('custpopup_acc_4');
        var acc5 = objForm.getValue('custpopup_acc_5');
        

        if (acc1 && acc2 && acc3 && acc4 && acc5) {

          search.create({
            type: 'customrecord_lmry_pe_detractions_acc',
            filters: ['custrecord_lmry_pe_dec_ac_subsi', 'anyof', subsi]
          }).run().each(function (line) {

            _setup = record.load({
              type: 'customrecord_lmry_pe_detractions_acc',
              id: line.id
            });

          });

          if (!_setup) {
            _setup = record.create({
              type: 'customrecord_lmry_pe_detractions_acc'
            });
          }

          try {
            _setup.setValue('custrecord_lmry_pe_dec_ac_subsi', subsi);
            _setup.setValue('custrecord_lmry_det_ac_account_1', objForm.getValue('custpopup_acc_1'));
            _setup.setValue('custrecord_lmry_det_ac_account_2', objForm.getValue('custpopup_acc_2'));
            _setup.setValue('custrecord_lmry_det_ac_account_3', objForm.getValue('custpopup_acc_3'));
            _setup.setValue('custrecord_lmry_det_ac_account_4', objForm.getValue('custpopup_acc_4'));
            _setup.setValue('custrecord_lmry_det_ac_account_5', objForm.getValue('custpopup_acc_5'));
            _setup.setValue('custrecord_lmry_pe_detailed_rounding_pur', objForm.getValue('custpopup_detailed_rounding'));

            _setup.save({
              disableTriggers: true,
              ignoreMandatoryFields: true
            })

            latamWidget.closePopup();

            alert(_dao.getName('error_popup_001'));

            window.location.reload();
          } catch (err) {
            alert(err);
          }

        } else {

          var error = _dao.getName('error_popup_002');

          if (!acc1)
            error += '-' + _dao.getName('custpopup_acc_1') + '\n';

          if (!acc2)
            error += '-' + _dao.getName('custpopup_acc_2') + '\n';

          if (!acc3)
            error += '-' + _dao.getName('custpopup_acc_3') + '\n';

          if (!acc4)
            error += '-' + _dao.getName('custpopup_acc_4') + '\n';


          alert(error);

        }
      });
    }


    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

      var currentRecord = scriptContext.currentRecord;

      var fieldId = scriptContext.fieldId;

      if (jsonFields[fieldId]) {

        var type = jsonFields[fieldId];

        var jsonContext = {};

        for (var key in jsonFields) {

          var value = currentRecord.getValue(key);

          if (value) {

            if (jsonFields[key] == 'date') {

              value = currentRecord.getText(key);

            }

            jsonContext[key] = value;
          }

        }

        var path = url.resolveScript({
          scriptId: 'customscript_lmry_pe_gene_det_stlt',
          deploymentId: 'customdeploy_lmry_pe_gene_det_stlt',
          returnExternalUrl: false,
          params: jsonContext
        });

        setWindowChanged(window, false);
        window.location.href = path;


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

    function getAccountPopup(subsi) {

      var resultContext = {
        bank: [],
        expense: [],
        other: [],
        income: [],
      }

      var _filters = 
        [
          ["type", "anyof", "OthCurrLiab", "Bank", "Expense", "Income", 'OthIncome', 'OthExpense'],
          "AND",
          ["isinactive", "is", "F"],
          "AND",
          ["custrecord_lmry_localbook", 'is', 'T'],
          "AND",
          ["custrecord_lmry_code_account_sunat", 'noneof', "@NONE@"]
      ];

      if(runtime.isFeatureInEffect('SUBSIDIARIES') == true || 
         runtime.isFeatureInEffect('SUBSIDIARIES') == 'T' ){
        _filters.push('AND');
        _filters.push(["subsidiary", 'anyof', [subsi, '@NONE@']])
         }

      var searchContext = search.create({
        type: "account",
        filters: _filters,
        columns: [
          'internalid', 'name', 'type'
        ]
      });

      var myPagedData = searchContext.runPaged({
        pageSize: 1000
      });

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({
          index: pageRange.index
        });
        myPage.data.forEach(function (result) {

          var id = result.getValue('internalid');
          var type = result.getValue('type');
          var name = result.getValue('name');

          var context = {
            value: id,
            text: name
          };

          switch (type) {
            case "OthCurrLiab":
              resultContext.other.push(context);
              break;
            case "Bank":
              resultContext.bank.push(context);
              break;
            case "Expense":
              resultContext.expense.push(context);
              break;
            case "Income":
              resultContext.income.push(context);
              break;
            case "OthIncome":
              resultContext.income.push(context);
              break;
            case "OthExpense":
              resultContext.expense.push(context);
              break;
          }

          return true;

        });
      });
      console.log(resultContext);
      return JSON.stringify(resultContext);

    }

    return {
      pageInit: pageInit,
      fieldChanged: fieldChanged,
      saveRecord: saveRecord
    };

  });

/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 * @Name LMRY_PE_list_SalesDetractions_CLNT_v2.0.js
 */

define(['N/url', 'N/runtime', 'LR/popup', 'detraction/metadata'],

  function(url, runtime, latamWidget, metadata) {

    var _dao = null;

    function isOneWorld() {

      return runtime.isFeatureInEffect({
        feature: 'SUBSIDIARIES'
      });

    }

    function pageInit(scriptContext) {
      alert('Hello World');
    }

    function openSetup() {

      if (!_dao)
        _dao = metadata.open();

      if (isOneWorld()) {
        var scriptContext = {
          scriptId: 'customscript_lmry_pe_det_salesetup_stlt',
          deploymentId: 'customdeploy_lmry_pe_det_salesetup_stlt'
        };

        var path = url.resolveScript(scriptContext);

        window.location.href = path;
      } else {

        latamWidget.openSubForm();

        var accountList = getSearchAccount();

        setTimeout(function() {

          var objForm = latamWidget.createForm(_dao.getName('custtitle_popup'), 600, 560);

          objForm.addButton('custpopup_submit', _dao.getName('custpopup_submit'), 'submit');

          objForm.addTab('custpopup_tab', _dao.getName('custpopup_tab'));

          objForm.addField('custpopup_acc_1', _dao.getName('custpopup_acc_1'), 'select',
            'custpopup_tab', accountList.detraction);

          objForm.addField('custpopup_acc_3', _dao.getName('custpopup_acc_3'), 'select',
            'custpopup_tab', accountList.rounding);

          objForm.addField('custpopup_acc_5', _dao.getName('custpopup_acc_5'), 'select',
            'custpopup_tab', accountList.roundingCredit);

          objForm.addField('custpopup_acc_4', _dao.getName('custpopup_acc_4'), 'select',
            'custpopup_tab', accountList.bank);

          objForm.addField('custpopup_detailed_rounding', _dao.getName('custpopup_detailed_rounding'), 'checkbox',
            'custpopup_tab', accountList.bank);

          objForm.writeForm();

          var setupCompany = getSetup();

          try {
            objForm.setValue('custpopup_acc_1', setupCompany.detraction);
            objForm.setValue('custpopup_acc_3', setupCompany.rounding);
            objForm.setValue('custpopup_acc_5', setupCompany.roundingCredit);
            objForm.setValue('custpopup_acc_4', setupCompany.bank);
          } catch (err) {
            console.log(err);
          }

          objForm.addClick('custpopup_submit', function() {

            var _setup = null;

            var acc1 = objForm.getValue('custpopup_acc_1');
            var acc3 = objForm.getValue('custpopup_acc_3');
            var acc4 = objForm.getValue('custpopup_acc_4');
            var acc5 = objForm.getValue('custpopup_acc_5');

            if (acc1 && acc3 && acc4 && acc5) {

              var result = updateSetup(acc1, acc3, acc4, acc5);

              if (result.isCompleted) {
                alert(result.value);

                latamWidget.closePopup();

              } else {
                alert(_dao.getName('message_sales_update_2'));
              }


            } else {

              var error = _dao.getName('error_popup_002');

              if (!acc1)
                error += '-' + _dao.getName('custpopup_acc_1') + '\n';

              if (!acc3)
                error += '-' + _dao.getName('custpopup_acc_3') + '\n';

              if (!acc4)
                error += '-' + _dao.getName('custpopup_acc_4') + '\n';

              if (!acc5)
                error += '-' + _dao.getName('custpopup_acc_5') + '\n';

              alert(error);

            }
          });

        }, 500);

      }


    }


    function openCreate() {

      var scriptContext = {
        scriptId: 'customscript_lmry_pe_det_salesgene_stlt',
        deploymentId: 'customdeploy_lmry_pe_det_salesgene_stlt'
      };

      var path = url.resolveScript(scriptContext);

      window.location.href = path;


    }


    var scriptContextMidMarket = {
      scriptId: 'customscript_lmry_pe_det_salesmid_stlt',
      deploymentId: 'customdeploy_lmry_pe_det_salesmid_stlt'
    }

    function getSearchAccount() {

      var httpRequest = new XMLHttpRequest();

      var path = url.resolveScript(scriptContextMidMarket);

      httpRequest.open('POST', path, false);

      httpRequest.send(JSON.stringify({
        action: 'getSearchAccount'
      }));

      var result = JSON.parse(httpRequest.response);

      if (result.isCompleted) {
        return result.value;
      } else {
        return [];
      }

    }

    function getSetup() {

      var httpRequest = new XMLHttpRequest();

      var path = url.resolveScript(scriptContextMidMarket);

      httpRequest.open('POST', path, false);

      httpRequest.send(JSON.stringify({
        action: 'getSetup'
      }));

      var result = JSON.parse(httpRequest.response);

      console.log(result);

      if (result.isCompleted) {
        return result.value;
      } else {
        return {};
      }

    }

    function updateSetup(detraction, rounding, bank, roundingCredit) {

      var httpRequest = new XMLHttpRequest();

      var path = url.resolveScript(scriptContextMidMarket);

      httpRequest.open('POST', path, false);

      httpRequest.send(JSON.stringify({
        action: 'updateSetup',
        content: {
          detraction: detraction,
          rounding: rounding,
          roundingCredit: roundingCredit,
          bank: bank
        }
      }));

      var result = JSON.parse(httpRequest.response);

      return result;


    }

    function refresh() {
      window.location.reload();
    }

    function openDelete(){

      var output = url.resolveScript({
        scriptId: 'customscript_lmry_pe_det_sales_d_stlt',
        deploymentId: 'customdeploy_lmry_pe_det_sales_d_stlt'
      });

      window.location.href = output;
    }

    return {
      pageInit: pageInit,
      openSetup: openSetup,
      openCreate: openCreate,
      refresh: refresh,
      openDelete: openDelete
    };

  });

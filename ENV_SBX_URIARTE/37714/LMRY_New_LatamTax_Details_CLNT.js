/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_New_LatamTax_Details_CLNT.js				        ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Oct 30 2020  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/url', 'N/record', 'N/currentRecord', 'N/ui/dialog', 'N/runtime','N/search', '../Latam_Library/LMRY_libSendingEmailsLBRY_V2.0','../Latam_Library/LMRY_Log_LBRY_V2.0'],

  function(url, record, currentRecord, dialog, runtime, search, library, libLog) {

    var subsi_OW = runtime.isFeatureInEffect({feature: "SUBSIDIARIES"});
    var idLog = '';
    var LMRY_script = 'LMRY_New_LatamTax_Details_CLNT.js';
    var Language = runtime.getCurrentScript().getParameter({name:'LANGUAGE'});
    Language = Language.substring(0,2);

    //Traducción de campos
    switch (Language) {
      case 'es':
        var Mensaje1 = 'La base o retención está vacía';
        var Mensaje2 = 'El pago de la factura';
        var Mensaje3 = ' es menor que sus retenciones';
        var Mensaje4 = 'Usted no ha seleccionado ';
        var Mensaje5 = ' retenciones, ¿Está seguro? ';
        var Mensaje6 = 'Se presentó un error. No se puedo continuar con el proceso';
        break;

      case 'pt':
        var Mensaje1 = 'A base ou retenção está vazia';
        var Mensaje2 = 'O pagamento da fatura';
        var Mensaje3 = ' é menos do que suas retenções';
        var Mensaje4 = 'Você não selecionou ';
        var Mensaje5 = ' retenções. Tem certeza?';
        var Mensaje6 = 'Um erro ocorreu. Eu não posso continuar com o processo';
        break;

      default:
        var Mensaje1 = 'The base or retention is empty';
        var Mensaje2 = 'The payment for the bill';
        var Mensaje3 = ' is less than your withholdings';
        var Mensaje4 = 'You have not selected ';
        var Mensaje5 = ' withholdings. Are you sure?';
        var Mensaje6 = 'An error occurred. I cannot continue with the process';
    }

    function pageInit(scriptContext){

      try{

        var objRecord = scriptContext.currentRecord;
        idLog = objRecord.getValue('custpage_st_proc');

      }catch(err){
        library.sendemail('[pageInit] ' + err, LMRY_script);
      }

    }

    function funcionCancel(){

      try{

        record.delete({type:'customrecord_lmry_new_latamtax_sales_log',id: idLog});

        var output = url.resolveScript({scriptId: 'customscript_lmry_newlatamtax_sales_stlt',deploymentId: 'customdeploy_lmry_newlatamtax_sales_stlt',returnExternalUrl: false});

      	//output = output.replace('forms','system'),
      	window.location.href = output;

      }catch(err){
        alert(Mensaje6);
        library.sendemail('[funcionCancel]' + err, LMRY_script);
        libLog.doLog({ title: "[ funcionCancel ]", message: err, relatedScript: LMRY_script });
        return false;
      }
    }

    function saveRecord(scriptContext) {

      try {

        var objRecord = scriptContext.currentRecord;
        var row = objRecord.getLineCount({sublistId: 'custpage_id_sub'});
        var contador = 0,contadorCheck = 0;
        var arrayNoRet = [];
        var arrayEdited = [];
        var jsonPaymentRet = {};

        var subsidiary = objRecord.getValue('id_subsi');
        var licenses = library.getLicenses(subsidiary);
        var feature = library.getAuthorization(550,licenses);

        if(row > 0){
          for(var i = 0; i < row; i++){
            var check = objRecord.getSublistValue({sublistId: 'custpage_id_sub',fieldId: 'sub_check',line: i});
            var orden = objRecord.getSublistValue({sublistId:'custpage_id_sub',fieldId:'sub_id',line:i});
            var paymentHidden = objRecord.getSublistValue({sublistId:'custpage_id_sub',fieldId:'sub_pago',line:i});
            var amount = objRecord.getSublistValue({sublistId:'custpage_id_sub',fieldId:'sub_imp_cal',line:i});

            var invoice = objRecord.getSublistValue({sublistId: 'custpage_id_sub',fieldId: 'sub_transa',line: i});
            invoice = invoice.split(">");
            invoice = (invoice[1].split("<"))[0];

            if(!check){
              arrayNoRet.push({'invoice': invoice, 'orden': orden});
              contador++;
            }else{
              contadorCheck++;
              if(jsonPaymentRet[invoice] == null || jsonPaymentRet[invoice] == undefined){
                jsonPaymentRet[invoice] = {'payment': paymentHidden, 'retencion': 0};
              }

              jsonPaymentRet[invoice]['retencion'] += parseFloat(amount);

              //EDITED
              if(feature){
                var amountRemaining = objRecord.getSublistValue({sublistId:'custpage_id_sub',fieldId:'sub_imp_app',line:i});

                if(!amount || !amountRemaining){
                  alert(Mensaje1);
                  return false;
                }

                arrayEdited.push({'invoice': invoice, 'orden': orden, 'base': amountRemaining, 'amount': amount});
              }

            }

          }

          //VALIDACION Q EL PAYMENT SEA MAYOR QUE LA SUMA DE RETENCIONES X BILL
          if(contadorCheck > 0){
            for(var i in jsonPaymentRet){
              if(jsonPaymentRet[i]['payment'] <= jsonPaymentRet[i]['retencion']){
                alert(Mensaje2 + i + Mensaje3);
                return false;
              }
            }
          }


        }//FIN CUANDO SI HAY LINEAS

        record.submitFields({type: 'customrecord_lmry_new_latamtax_sales_log', id: idLog, values: {custrecord_lmry_new_latamtax_noretention: JSON.stringify(arrayNoRet), custrecord_lmry_new_latamtax_edited: JSON.stringify(arrayEdited)}});

        if(row > 0 && contador > 0){
          return confirm(Mensaje4+ contador + Mensaje5);
        }

        return true;

      } catch (err) {
        alert(Mensaje6);
        library.sendemail('[saveRecord]' + err, LMRY_script);
        libLog.doLog({ title: "[ saveRecord ]", message: err, relatedScript: LMRY_script });
        return false;
      }
    }

    return {
      pageInit : pageInit,
      funcionCancel : funcionCancel,
      saveRecord: saveRecord

    };

  });

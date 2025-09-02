/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: lmry_wht_details_cancel2.js                      ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Set 22 2017  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/url', 'N/record', 'N/currentRecord', 'N/ui/message', 'N/runtime', 'N/search', '../Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', "../Latam_Library/LMRY_Log_LBRY_V2.0", "N/query"],

    function (url, record, currentRecord, message, runtime, search, library, lbryLog, query) {

        const LMRY_script = "lmry_wht_details_cancel2.js";
        var subsi_OW = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });;
        var subsidiary = '', id_log = '';
        var proceso = '';
        var setuptax = [];

        var Language = runtime.getCurrentScript().getParameter({ name: 'LANGUAGE' });
        Language = Language.substring(0, 2);

        //Traducción de campos
        switch (Language) {
            case 'es':
                var Mensaje1 = 'La base o retención está vacía';
                var Mensaje2 = 'El pago de la factura';
                var Mensaje3 = ' es menor que sus retenciones';
                var Mensaje4 = 'Usted no ha seleccionado ';
                var Mensaje5 = 'retenciones, ¿Está seguro? ';
                var Mensaje6 = 'Espere un momento por favor, un Proceso esta en ejecución..';
                break;

            case 'pt':
                var Mensaje1 = 'A base ou retenção está vazia';
                var Mensaje2 = 'O pagamento da fatura';
                var Mensaje3 = ' é menos do que suas retenções';
                var Mensaje4 = 'Você não selecionou ';
                var Mensaje5 = 'retenções. Tem certeza?';
                var Mensaje6 = 'Aguarde um momento, um processo em andamento.'
                break;

            default:
                var Mensaje1 = 'The base or retention is empty';
                var Mensaje2 = 'The payment for the bill';
                var Mensaje3 = ' is less than your withholdings';
                var Mensaje4 = 'You have not selected ';
                var Mensaje5 = 'withholdings. Are you sure?';
                var Mensaje6 = 'Please wait a moment, a process is in progress.';
        }

        function pageInit(scriptContext) {
            var objRecord = scriptContext.currentRecord;
            id_log = objRecord.getValue({ fieldId: 'custpage_st_proc' });

            var vendor = objRecord.getValue({ fieldId: 'pi_id_vend' });

            if (vendor == '' || vendor == null) {
                proceso = '1';
            } else {
                proceso = '0';
            }

            subsidiary = objRecord.getValue({ fieldId: 'id_subsi' });
            var filtros_setuptax = [];
            filtros_setuptax[0] = search.createFilter({ name: 'isinactive', operator: 'is', values: ['F'] });
            if (subsi_OW) {
                filtros_setuptax[1] = search.createFilter({ name: 'custrecord_lmry_setuptax_subsidiary', operator: 'anyof', values: subsidiary });
            }
            var search_setuptax = search.create({ type: 'customrecord_lmry_setup_tax_subsidiary', filters: filtros_setuptax, columns: ['custrecord_lmry_setuptax_amorounding', 'custrecord_lmry_setuptax_type_rounding'] });
            var result_setuptax = search_setuptax.run().getRange({ start: 0, end: 1 });

            if (result_setuptax != null && result_setuptax != '') {
                setuptax[0] = result_setuptax[0].getValue('custrecord_lmry_setuptax_amorounding');
                setuptax[1] = result_setuptax[0].getValue('custrecord_lmry_setuptax_type_rounding');

                if (setuptax[1] != null && setuptax[1] != '') {
                    if (setuptax[1] == '1') {
                        setuptax[2] = "1";
                    } else {
                        setuptax[2] = "2";
                    }
                }
                if (setuptax[0] != null && setuptax[0] != '') {
                    setuptax[2] = "3";
                }
                if (setuptax[1] != null && setuptax[1] != '' && setuptax[0] != null && setuptax[0] != '') {
                    setuptax[2] = "0";
                }
            }

        }

        function funcionCancel() {

            try {

                var output = '';
                var queryParams = new URLSearchParams(window.location.search);
                var backScriptId = queryParams.get("param_scriptId");
                var backDeployId = queryParams.get("param_deployId");
                if (proceso == '0') {
                    var delete_log = record.delete({ type: 'customrecord_lmry_wht_payments_log', id: id_log });
                    output = url.resolveScript(
                        { 
                            scriptId: backScriptId || 'customscript_lmry_wht_on_payments_sltl', 
                            deploymentId: backDeployId || 'customdeploy_lmry_wht_on_payments_stlt', 
                            returnExternalUrl: false 
                        });
                } else {
                    var delete_log = record.delete({ type: 'customrecord_lmry_wht_massive_payments', id: id_log });
                    output = url.resolveScript(
                        { 
                            scriptId: backScriptId ||  'customscript_lmry_wht_massive_pay_stlt', 
                            deploymentId: backDeployId || 'customdeploy_lmry_wht_massive_pay_stlt', 
                            returnExternalUrl: false 
                        });
                }

                //output = output.replace('forms','system'),
                window.location.href = output;

            } catch (err) {
                handleError("[ funcionCancel ]", err);
                return false;
            }
        }

        function fieldChanged(scriptContext) {

            try {
                //SETUP TAX SUBSIDIARY PARA EL REDONDEO

                var objRecord = scriptContext.currentRecord;

                if (scriptContext.sublistId == 'custpage_id_sub' && scriptContext.fieldId == 'sub_check' && setuptax[2] == "3") {
                    var i = scriptContext.line;
                    var selc_app = objRecord.getSublistValue({ sublistId: 'custpage_id_sub', fieldId: 'sub_check', line: i });
                    if (selc_app) {
                        var amount = objRecord.getSublistValue({ sublistId: 'custpage_id_sub', fieldId: 'sub_imp_cal', line: i });
                        objRecord.setCurrentSublistValue({ sublistId: 'custpage_id_sub', fieldId: 'sub_edit_amount', value: amount });
                        var campo_editable = objRecord.getSublistField({ sublistId: 'custpage_id_sub', fieldId: 'sub_edit_amount', line: i });
                        if (campo_editable.isDisabled) {
                            campo_editable.isDisabled = false;
                        }
                    } else {
                        objRecord.setCurrentSublistValue({ sublistId: 'custpage_id_sub', fieldId: 'sub_edit_amount', value: '' });
                        var campo_editable = objRecord.getSublistField({ sublistId: 'custpage_id_sub', fieldId: 'sub_edit_amount', line: i });
                        if (!campo_editable.isDisabled) {
                            campo_editable.isDisabled = true;
                        }
                    }
                }


            } catch (msgerr) {
                alert('Se presentó un error. No se puedo continuar con el proceso');
                return false;
            }
            return true;
        }

        function saveRecord(scriptContext) {

            try {

                var objRecord = scriptContext.currentRecord;
                var row = objRecord.getLineCount({ sublistId: 'custpage_id_sub' });

                var subsidiary = objRecord.getValue('id_subsi');

                var licenses = library.getLicenses(subsidiary);
                var feature = library.getAuthorization(288, licenses);

                var suma = '', cadena_manual = '';
                var contador = 0;
                var s_pago = [];

                if (row > 0) {
                    for (var i = 0; i < row; i++) {
                        var check = objRecord.getSublistValue({ sublistId: 'custpage_id_sub', fieldId: 'sub_check', line: i });
                        var orden = objRecord.getSublistValue({ sublistId: 'custpage_id_sub', fieldId: 'sub_id', line: i });
                        var bill_temporal = objRecord.getSublistValue({ sublistId: 'custpage_id_sub', fieldId: 'sub_transa', line: i });

                        var x = bill_temporal.split(">");
                        var bill = ((x[1]).split("<"))[0];

                        if (check == false) {
                            contador++;
                            suma = suma + bill + ";" + orden + "|";

                        } else {
                            var aux_spago = '';

                            var pago_bill = objRecord.getSublistValue({ sublistId: 'custpage_id_sub', fieldId: 'sub_pago', line: i });
                            var amount_manual = objRecord.getSublistValue({ sublistId: 'custpage_id_sub', fieldId: 'sub_imp_cal', line: i });
                            s_pago.push(bill + ";" + pago_bill + ";" + amount_manual);

                            if (feature) {
                                var base_manual = objRecord.getSublistValue({ sublistId: 'custpage_id_sub', fieldId: 'sub_imp_app', line: i });

                                if (amount_manual == null || amount_manual == '' || base_manual == null || base_manual == '') {
                                    alert(Mensaje1);
                                    return false;
                                }

                                cadena_manual += bill + ";" + orden + ";" + base_manual + ";" + amount_manual + "|";

                            }

                        }
                    }
                }

                var remainingUsage1 = runtime.getCurrentScript().getRemainingUsage();

                var aux_pago = 0, bill = '';
                if (s_pago.length > 0) {
                    for (var i = 0; i < s_pago.length; i++) {
                        var aux_linea = s_pago[i].split(';');
                        if (i == 0) {
                            aux_pago = aux_linea[1];
                            bill = aux_linea[0];
                        } else {
                            if (aux_linea[0] != bill) {
                                aux_pago = aux_linea[1];
                                bill = aux_linea[0];
                            }
                        }

                        aux_pago = parseFloat(aux_pago) - parseFloat(aux_linea[2]);

                        if (aux_pago < 0) {
                            alert(Mensaje2 + ' ' + bill + ' ' + Mensaje3);
                            return false;
                        }
                    }
                }

                var remainingUsage1 = runtime.getCurrentScript().getRemainingUsage();
                /*if (!validateTransactions(scriptContext)) {
                    return false;
                }*/
                if (proceso == '0') {
                    var payments_log = record.submitFields({ type: 'customrecord_lmry_wht_payments_log', id: id_log, values: { custrecord_lmry_wht_ret: suma, custrecord_lmry_wht_man: cadena_manual } });
                } else {
                    var massive = record.submitFields({ type: 'customrecord_lmry_wht_massive_payments', id: id_log, values: { custrecord_lmry_wht_massive_apply_reten: suma, custrecord_lmry_wht_massive_manual: cadena_manual } });
                }

                if (row != 0) {
                    if (row >= contador && contador != 0) {
                        return confirm(Mensaje4 + ' ' + contador + ' ' + Mensaje5);
                    }
                }

                if (!validateExecution()) {
                    return false;
                }

                return true;

            } catch (msgerr) {
                handleError("[ saveRecord ]", msgerr);
                return false;
            }
        }

        function validateExecution() {
            var MR_SCRIPT_ID = "";
            var MR_DEPLOY_ID = "";
            if (!Number(proceso)) {
                MR_SCRIPT_ID = "customscript_lmry_wht_payments_schdl";
                MR_DEPLOY_ID = "customdeploy_lmry_wht_payments_schdl";
            } else {
                MR_SCRIPT_ID = "customscript_lmry_wht_massive_pay_mprd";
                MR_DEPLOY_ID = "customdeploy_lmry_wht_massive_pay_mprd";
            }

            var search_executions = search.create({
                type: "scheduledscriptinstance",
                filters:
                    [
                        ["status", "anyof", "PENDING", "PROCESSING"], "AND",
                        ["script.scriptid", "is", MR_SCRIPT_ID], "AND",
                        ["scriptdeployment.scriptid", "is", MR_DEPLOY_ID]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "timestampcreated",
                            sort: search.Sort.DESC
                        }),
                        "mapreducestage",
                        "status",
                        "taskid"
                    ]
            });

            var results = search_executions.run().getRange(0, 1);

            if (results && results.length) {
                var myMsg = message.create({
                    title: 'Alert',
                    message: Mensaje6, //Please wait a moment, a process is in progress.
                    type: message.Type.INFORMATION,
                    duration: 8000
                });
                myMsg.show();
                return false;
            }

            return true;
        }

        function handleError(functionName, err) {
            console.error(functionName, err);
            lbryLog.doLog({ title: functionName, message: err, relatedScript: LMRY_script });
            alert(functionName + "\n" + JSON.stringify({ name: err.name, message: err.message }));
        }

        function validateTransactions(scriptContext) {
            try {
                var id_log = (scriptContext.currentRecord).getValue("custpage_st_proc");
                var bills = "";
                console.debug(id_log);
                if (proceso == "0") {
                    bills = search.lookupFields({
                        type: "customrecord_lmry_wht_payments_log",
                        id: id_log,
                        columns: ["custrecord_lmry_wht_doc", "custrecord_lmry_wht_bil"]
                    }).custrecord_lmry_wht_bil;
                    bills = bills.split("|");
                } else if (proceso == "1") {
                    var logs = search.lookupFields({
                        type: "customrecord_lmry_wht_massive_payments",
                        id: id_log,
                        columns: ["custrecord_lmry_wht_massive_payments_log"]
                    }).custrecord_lmry_wht_massive_payments_log;
                    logs = logs.split("|").filter(function (e) { return e != "" });
                    console.log(["logs", logs])
                    var cadena = "";
                    logs.map(function (e2) {
                        cadena += search.lookupFields({
                            type: "customrecord_lmry_wht_payments_log",
                            id: e2,
                            columns: ["custrecord_lmry_wht_bil"]
                        }).custrecord_lmry_wht_bil
                    });
                    bills = cadena.split("|")
                }
                var amounts = {};
                bills = bills.filter(function (e1) { return e1 != "" && e1 != undefined }).map(function (e) { amounts[e.split(";")[0]] = e.split(";")[1]; return e.split(";")[0] });
                console.log(bills);
                var consulta1 = "SELECT CUSTOMRECORD_LMRY_WHT_PAYMENTS_LOG.custrecord_lmry_wht_sta,CUSTOMRECORD_LMRY_WHT_PAYMENTS_LOG.custrecord_lmry_wht_doc,Transaction.id  FROM CUSTOMRECORD_LMRY_WHT_PAYMENTS_LOG, Transaction WHERE custrecord_lmry_wht_sta = 'Finalizado' and Transaction.id = any(" + bills.toString() + ") and Transaction.foreignamountunpaid = 0 ";
                var auxString = "";
                for (var index in bills) {
                    if (auxString == "") {
                        auxString = auxString + "custrecord_lmry_wht_doc LIKE '%" + bills[index] + "%'";
                    } else {
                        auxString = auxString + " or custrecord_lmry_wht_doc LIKE '%" + bills[index] + "%'";
                    }
                }
                if (auxString != "") {
                    consulta1 += "and ( ";
                    consulta1 += auxString;
                    consulta1 += " )";
                }
                console.debug(consulta1)
                var resultsQuery = query.runSuiteQL({
                    query: consulta1
                }).asMappedResults();
                console.log(resultsQuery);
                if (resultsQuery.length > 0) {
                    var bills2 = []
                    resultsQuery.map(function (e) { if (e.id && bills2.indexOf(e.id) != -1) { bills2.push(e.id) } })
                    translateAlert("Ya se han pagado totalmente estas transacciones " + bills2.toString() + " seleccione otras");
                    bills2 = []
                    return false;
                } else {
                    var consulta2 = "SELECT 	Transaction.id,	Transaction.foreignamountunpaid  FROM 	Transaction  WHERE 	Transaction.id = any( " + bills.toString() + " )";
                    var resultsQuery2 = query.runSuiteQL({
                        query: consulta2
                    }).asMappedResults();
                    var billsNotPayable = [];
                    for (var index in resultsQuery2) {
                        var monto = amounts[resultsQuery2[index].id];
                        var auxmonto = resultsQuery2[index].foreignamountunpaid;
                        if (auxmonto < monto) {
                            billsNotPayable.push(resultsQuery2[index].id)
                        }
                    }
                    if (billsNotPayable.length > 0) {
                        translateAlert("El monto a pagar sobrepasa el valor restante en estas transacciones " + billsNotPayable.toString() + " modifique el monto a pagar");
                        return false;
                    }
                    return true;
                }
            } catch (error) {
                console.error(error)
                return false;
            }

        }

        function translateAlert(textInit) {
            fetch("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=" + Language + "&q=" + textInit)
                .then(function (response) {
                    return response.text();
                })
                .then(function (text) {
                    alert(JSON.parse(text)[0][0][0])
                }
                )
        }

        return {
            pageInit: pageInit,
            funcionCancel: funcionCancel,
            //fieldChanged: fieldChanged,
            saveRecord: saveRecord
        };

    });
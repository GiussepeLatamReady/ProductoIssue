/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_AR_WHT_Void_Payments_STLT.js  		    	    ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jul 05 2020  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 * @NModuleScope Public
 */
 define(['N/log', 'N/ui/serverWidget', 'N/runtime', 'N/search', 'N/url', 'N/redirect', 'N/record', 'N/task', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0'],
    function (log, serverWidget, runtime, search, url, redirect, record, task, library_mail) {

        var LANGUAGE = "";
        var SCRIPT_ID = "customscript_lmry_ar_wht_void_pymt_stlt";
        var DEPLOY_ID = "customdeploy_lmry_ar_wht_void_pymt_stlt";
        var MR_SCRIPT_ID = "customscript_lmry_ar_wht_void_pymt_mr";
        var MR_DEPLOY_ID = "customdeploy_lmry_ar_wht_void_pymt_mr";
        var CLIENT_SCRIPT = './Latam_Library/LMRY_AR_WHT_Void_Payments_CLNT.js';
        var LMRY_script = "LatamReady - AR WHT Void Payment STLT";

        function onRequest(context) {
            if (context.request.method == "GET") {
                try {
                    LANGUAGE = runtime.getCurrentScript().getParameter({ name: "LANGUAGE" });
                    LANGUAGE = LANGUAGE.substring(0, 2);
                    var form = createForm();
                    form.clientScriptModulePath = CLIENT_SCRIPT;
                    var sublist = createSubList(form);
                    addDataSublist(sublist);

                    context.response.writePage(form);
                }
                catch (err) {
                    library_mail.sendemail('[ onRequest - GET ]' + err, LMRY_script);
                }
            } else {
                try {
                    var idLog = context.request.parameters.custpage_idlog;
                    var cancellationDate = context.request.parameters.custpage_date_void.toString();
                    if (idLog) {


                        record.submitFields({
                            type: 'customrecord_lmry_wht_payments_log',
                            id: idLog,
                            values: {
                                'custrecord_lmry_wht_sta': "Anulación en proceso",
                            },
                            options: {
                                disableTriggers: true
                            }
                        });

                        var task_mr = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: MR_SCRIPT_ID,
                            deploymentId: MR_DEPLOY_ID,
                            params: {
                                'custscript_lmry_ar_wht_void_idlog': idLog,
                                'custscript_lmry_ar_wht_void_date' : cancellationDate
                            }
                        });

                        task_mr.submit();
                    }

                    redirect.toSuitelet({
                        scriptId: SCRIPT_ID,
                        deploymentId: DEPLOY_ID
                    });

                }
                catch (err) {
                    library_mail.sendemail('[ onRequest - POST ]' + err, LMRY_script);
                }
            }
        }


        function createForm() {
            var form = serverWidget.createForm({ title: getText('title') });
            form.addFieldGroup({ id: "main_group", label: getText('group')});

            var fieldIdLog = form.addField({
                id: "custpage_idlog",
                label: getText('idlog'),
                type: serverWidget.FieldType.INTEGER,
                container: 'main_group'
            });

            var fieldDate = form.addField({
                id: "custpage_date_void",
                label: getText('date_void'),
                type: serverWidget.FieldType.DATE,
                container: 'main_group'
            });
            fieldDate.defaultValue = new Date();

            fieldIdLog.isMandatory = true;
            fieldIdLog.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });

            // var fieldMessage = form.addField({
            //     id: "custpage_message",
            //     label: getText('titlemsg'),
            //     type: serverWidget.FieldType.INLINEHTML
            // });

            // fieldMessage.layoutType = serverWidget.FieldLayoutType.OUTSIDEBELOW;

            // var html = "<html>";
            // html += "<table border='0' class='table_fields' cellspacing='0' cellpadding='0'>";
            // html += "<tr>";
            // html += "</tr>";
            // html += "<tr>";
            // html += "<td class='text'>";
            // html += "<div style=\"color: gray; font-size: 12pt; margin-top: 10px; padding: 5px; border-top: 1pt solid silver\">";
            // html += getText('message') + "</div>";
            // html += "</td>";
            // html += "</tr>";
            // html += "</table>";
            // html += "</html>";

            // fieldMessage.defaultValue = html;

            form.addSubmitButton({ label: getText('submit') });

            return form;
        }

        function createSubList(form) {
            var sublist = form.addSublist({
                id: 'custpage_sublist',
                type: serverWidget.SublistType.STATICLIST,
                label: getText('titlelog')
            });

            sublist.addRefreshButton();

            sublist.addField({ id: 'custpage_internalid', label: getText('internalid'), type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_subsidiary', label: getText('subsidiary'), type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_datecreated', label: getText('datecreated'), type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_employee', label: getText('employee'), type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_vendor', label: getText('vendor'), type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_payment', label: getText('payment'), type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_status', label: getText('status'), type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_lastmodified', label: getText('lastmodified'), type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_process', label: getText('process'), type: serverWidget.FieldType.TEXT });

            return sublist;
        }

        function addDataSublist(sublist) {
            var search_log = search.load({
                id: 'customsearch_lmry_wht_payments_voided'
            });

            var results = search_log.run().getRange(0, 1000);
            if (results) {
                var columns = search_log.columns;

                for (var i = 0; i < results.length; i++) {
                    var internalid = results[i].getValue(columns[0]);
                    if (internalid) {
                        sublist.setSublistValue({ id: 'custpage_internalid', line: i, value: internalid });
                    }

                    var subsidiary = results[i].getText(columns[1]);
                    if (subsidiary) {
                        sublist.setSublistValue({ id: 'custpage_subsidiary', line: i, value: subsidiary });
                    }

                    var datecreated = results[i].getValue(columns[7]);
                    if (datecreated) {
                        sublist.setSublistValue({ id: 'custpage_datecreated', line: i, value: datecreated })
                    }

                    var employee = results[i].getText(columns[2]);
                    if (employee) {
                        sublist.setSublistValue({ id: 'custpage_employee', line: i, value: employee })
                    }

                    var vendorId = results[i].getValue(columns[3]);
                    var vendorText = results[i].getText(columns[3]);

                    if (vendorId) {
                        sublist.setSublistValue({ id: 'custpage_vendor', line: i, value: getLink(vendorText, 'vendor', vendorId) });
                    }

                    var paymentId = results[i].getValue(columns[4]);
                    var paymentText = results[i].getText(columns[4]);
                    if (paymentId) {
                        sublist.setSublistValue({ id: 'custpage_payment', line: i, value: getLink(paymentText, 'vendorpayment', paymentId) });
                    }

                    var status = results[i].getValue(columns[5]);
                    if (status) {
                        sublist.setSublistValue({ id: 'custpage_status', line: i, value: status });
                    }

                    var lastmodified = results[i].getValue(columns[8]);
                    if (lastmodified) {
                        sublist.setSublistValue({ id: 'custpage_lastmodified', line: i, value: lastmodified });
                    }

                    var massiveIDLog = results[i].getValue(columns[9]);
                    var typeProcess = (massiveIDLog) ? 'Massive' : 'Individual';

                    sublist.setSublistValue({ id: 'custpage_process', line: i, value: typeProcess });
                }
            }
        }

        function getLink(label, recordType, recordId) {
            var link = url.resolveRecord({ recordType: recordType, recordId: recordId, isEditMode: false });
            var htmllink = '<a class="dottedlink" href ="' + link + '" target="_blank">' + label + '</a>';
            return htmllink
        }

        var TEXT_BY_LANG = {
            'title': { 'en': 'LatamTax - Payment Voided', 'es': 'LatamTax - Anulacion de Pagos', 'pt': 'LatamTax - Cancelamento de Pagamentos' },
            'group':{'en': 'Primary Information', 'es': 'Información Primaria', 'pt': 'Informação Primária' },
            'idlog': { 'en': 'WHT ID Log'},
            'titlemsg': { 'en': 'Message', 'es': 'Mensaje', 'pt': 'Mensagem' },
            'message': {
                'en': " Note: To void the WHT on Payment process, you must enter the Internal ID. <br><br>Select the Refresh option to verify that the process was completed.",
                'es': "	Nota: Para anular el proceso de WHT on Payment, tiene que ingresar el ID Interno. <br><br>Seleccionar la opcion Refresh para verificar que el proceso fue completado.",
                'pt': " Observação: para abortar o processo WHT no pagamento, você deve inserir a ID interna. <br><br>Selecione a opção Atualizar para verificar se o processo foi concluído."
            },
            'submit': { 'en': 'Submit', 'es': 'Enviar', 'pt': 'Mandar' },
            'titlelog': { 'en': 'WHT Generated', 'es': 'WHT Generados', 'pt': 'WHT Gerado' },
            'internalid': { 'en': 'Internal ID' },
            'subsidiary': { 'en': 'Subsidiary', 'es': 'Subsidiaria', 'pt': 'Subsidiária' },
            'datecreated': { 'en': 'Date Created', 'es': 'Fecha de Creación', 'pt': 'Data de Criação' },
            'employee': { 'en': 'Employee', 'es': 'Empleado', 'pt': 'Empregado' },
            'vendor': { 'en': 'Vendor', 'es': 'Proveedor', 'pt': 'Fornecedor' },
            'payment': { 'en': 'Payment', 'es': 'Pago', 'pt': 'Pagamento' },
            'status': { 'en': 'Status', 'es': 'Estado', 'pt': 'Estado' },
            'lastmodified': { 'en': 'Last Modified', 'es': 'Última Modificación', 'pt': 'Última Modificação' },
            'process': { 'en': 'Process', 'es': 'Proceso', 'pt': 'Processar' },
            'date_void': { 'es': 'Fecha de anulacion (SICORE)', 'en': 'Cancellation date (SICORE)', 'pt': 'Data de cancelamento (SICORE)' }
        }

        function getText(key) {
            if (TEXT_BY_LANG[key]) {
                return TEXT_BY_LANG[key][LANGUAGE] || TEXT_BY_LANG[key]['en'];
            }
            return '';
        }

        return {
            onRequest: onRequest
        }
    });

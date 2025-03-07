/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
 ||   This script for customer center (Time)                     ||
 ||                                                              ||
 ||  File Name: LMRY_PE_IGVNoDomiciliciado_LBRY.js               ||
 ||                                                              ||
 ||  Version Date         Author        Remarks                  ||
 ||  2.0     Nov 18 2021  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

 define(['N/runtime', 'N/search', 'N/record', 'N/log', 'N/currency', 'N/format', './LMRY_libSendingEmailsLBRY_V2.0'],

 function (runtime, search, record, log, currency, format, library_send) {

     var LMRY_script = 'LMRY_PE_IGVNoDomiciliciado_LBRY';


     function calcularIGV(recordObj) {
         try {

             var approvalRoutine = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALVENDORBILL' });
             var approvalRoutineJournal = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
             var featureMB = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });
             var featureSubs = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
             if ((approvalRoutine == true || approvalRoutine == 'T') && recordObj.type == 'vendorbill') {
                 var approvalStatus = recordObj.getValue({ fieldId: 'approvalstatus' });
                 if (approvalStatus != '2') return true; // approved
             } 
             var amountIGV = '';
             var applywht = recordObj.getValue({ fieldId: 'custbody_lmry_apply_wht_code' });
             var subsidiary = featureSubs ? recordObj.getValue({ fieldId: 'subsidiary' }) : 1;
             var licenses = library_send.getLicenses(subsidiary);
             var statusJournal = library_send.getAuthorization(1081, licenses) ? "1" : "2";
             var entityIGV = recordObj.getValue({ fieldId: 'entity' });
             var trandate = recordObj.getValue({ fieldId: 'trandate' });
             var journalForm = null;

             if (applywht == 'T' || applywht == true) {
                 var igvAccount = 0;
                 var igvAccountOrig = 0;
                 var currencySetup = 0;
                 var newExchangeRate = 1;
                 var igvPercent = 0;

                 var filters = [
                     ["isinactive", "is", "F"]
                 ];
                 if (featureSubs) filters.push("AND", ["custrecord_lmry_setuptax_subsidiary", "is", subsidiary]);
                 //Consulta de datos del record LatamReady - Setup Tax Subsidiary
                 var creditSearchObj = search.create({
                     type: "customrecord_lmry_setup_tax_subsidiary",
                     filters: filters,
                     columns: [
                        'custrecord_lmry_setuptax_pe_igv_account',
                        'custrecord_lmry_setuptax_currency',
                        'custrecord_lmry_setuptax_pe_igv_percent',
                        'custrecord_lmry_setuptax_pe_igv_acc_orig',
                        'custrecord_lmry_setuptax_form_journal'
                    ]
                 });
                 creditSearchObj = creditSearchObj.run().getRange(0, 1000);

                 if (creditSearchObj != null && creditSearchObj != '') {
                     igvAccount = creditSearchObj[0].getValue('custrecord_lmry_setuptax_pe_igv_account');
                     igvAccountOrig = creditSearchObj[0].getValue('custrecord_lmry_setuptax_pe_igv_acc_orig') || 0;
                     currencySetup = creditSearchObj[0].getValue('custrecord_lmry_setuptax_currency');
                     igvPercent = creditSearchObj[0].getValue('custrecord_lmry_setuptax_pe_igv_percent');
                     journalForm = creditSearchObj[0].getValue('custrecord_lmry_setuptax_form_journal');
                     if (igvPercent) {
                         igvPercent = parseFloat(igvPercent);
                     }
                 } else {
                     log.error('ALERT', 'No se realizó configuración en LatamReady - Setup Tax Subsidiary');
                 }

                 var exchangeRate = 1;

                 if (featureSubs && featureMB) { // OneWorld y Multibook
                     var currencySubs = search.lookupFields({
                         type: 'subsidiary',
                         id: subsidiary,
                         columns: ['currency']
                     });
                     currencySubs = currencySubs.currency[0].value;

                     if (currencySubs != currencySetup && currencySetup != '' && currencySetup != null) {
                         var lineasBook = recordObj.getLineCount({
                             sublistId: 'accountingbookdetail'
                         });
                         if (lineasBook != null && lineasBook != '') {
                             for (var i = 0; i < lineasBook; i++) {
                                 var lineaCurrencyMB = recordObj.getSublistValue({
                                     sublistId: 'accountingbookdetail',
                                     fieldId: 'currency',
                                     line: i
                                 });
                                 if (lineaCurrencyMB == currencySetup) {
                                     exchangeRate = recordObj.getSublistValue({
                                         sublistId: 'accountingbookdetail',
                                         fieldId: 'exchangerate',
                                         line: i
                                     });
                                     newExchangeRate = currency.exchangeRate({
                                         source: currencySetup,
                                         target: currencySubs,
                                         date: format.parse({ type: format.Type.DATE, value: trandate })
                                     });
                                     break;
                                 }
                             }
                         }
                     } else { // La moneda de la subsidiaria es igual a la moneda del setup
                         exchangeRate = recordObj.getValue({
                             fieldId: 'exchangerate'
                         });
                         newExchangeRate = 1;
                     }
                 } else { // No es OneWorld o no tiene Multibook
                     exchangeRate = recordObj.getValue({
                         fieldId: 'exchangerate'
                     });
                     newExchangeRate = 1 / exchangeRate;
                 }

                 var idJournal = 0;
                 var JEamount = 0;

                 var featureAprove = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
                 var concepDetr = recordObj.getValue('custbody_lmry_document_type');

                 //Legal Document Type NO DOMICILIADO
                 if (concepDetr == 354) {
                     var cantItem = recordObj.getLineCount('item');
                     var cantExpense = recordObj.getLineCount('expense');

                     //Se crea objeto para setear valor de columna LATAM - CL NON-RECOVERABLE VAT AMOUNT
                     var rcdTransaction = record.load({
                         type: recordObj.type,
                         id: recordObj.id,
                         isDynamic: false
                     });

                     for (var j = 0; j < cantItem; j++) {
                         if (!recordObj.getSublistValue('item', 'custcol_4601_witaxline', j) && recordObj.getSublistValue('item', 'rate', j)) {
                             //Valor IGV en líneas
                             var JEamountLine = parseFloat(recordObj.getSublistValue('item', 'amount', j)) * exchangeRate * igvPercent / 100;
                             JEamountLine = Math.round(JEamountLine * 100) / 100;

                             var amountCol = rcdTransaction.getSublistValue('item', 'custcol_lmry_monto_iva_no_recup_cl', j);
                             if (!amountCol) {
                                 if (JEamountLine) {
                                     rcdTransaction.setSublistValue('item', 'custcol_lmry_monto_iva_no_recup_cl', j, JEamountLine);
                                 } else {
                                     rcdTransaction.setSublistValue('item', 'custcol_lmry_monto_iva_no_recup_cl', j, 0);
                                 }
                             }

                             //Valor IGV cabecera
                             JEamount += parseFloat(JEamountLine);
                             JEamount = Math.round(JEamount * 100) / 100;
                         }
                     }

                     for (var j = 0; j < cantExpense; j++) {
                         if (!recordObj.getSublistValue('expense', 'custcol_4601_witaxline', j)) {
                             //Valor IGV en líneas
                             var JEamountLine = parseFloat(recordObj.getSublistValue('expense', 'amount', j)) * exchangeRate * igvPercent / 100;
                             JEamountLine = Math.round(JEamountLine * 100) / 100;

                             var amountCol = rcdTransaction.getSublistValue('expense', 'custcol_lmry_monto_iva_no_recup_cl', j);
                             if (!amountCol) {
                                 if (JEamountLine) {
                                     rcdTransaction.setSublistValue('expense', 'custcol_lmry_monto_iva_no_recup_cl', j, JEamountLine);
                                 } else {
                                     rcdTransaction.setSublistValue('expense', 'custcol_lmry_monto_iva_no_recup_cl', j, 0);
                                 }
                             }

                             //Valor IGV cabecera
                             JEamount += parseFloat(JEamountLine);
                             JEamount = Math.round(JEamount * 100) / 100;
                         }
                     }

                     rcdTransaction.save({
                         ignoreMandatoryFields: true,
                         disableTriggers: true,
                         enableSourcing: true
                     });

                     if (JEamount) {
                         log.debug('JEamount', JEamount);
                         amountIGV = JEamount;

                         if (igvAccount) {
                             var JournalIDAndExist = getJournalIDAndExist(recordObj.id);
                             var newJournal;
                             if (JournalIDAndExist.exist) {
                                 newJournal = record.load({
                                     type: 'journalentry',
                                     id: JournalIDAndExist.journalID,
                                     isDynamic: false
                                 })
                             } else {
                                 newJournal = record.create({ type: record.Type.JOURNAL_ENTRY });
                             }

                             if (journalForm) {
                                newJournal.setValue('customform', journalForm);
                             }
                             if (subsidiary && !JournalIDAndExist.exist) {
                                 newJournal.setValue('subsidiary', subsidiary);
                             }
                             if (approvalRoutineJournal == true || approvalRoutineJournal == 'T') {
                                newJournal.setValue('approvalstatus', statusJournal);
                             }
                             newJournal.setValue('trandate', recordObj.getValue('trandate'));
                             newJournal.setValue('postingperiod', recordObj.getValue('postingperiod'));
                             if (recordObj.id) {
                                 newJournal.setValue('custbody_lmry_reference_transaction', recordObj.id);
                                 newJournal.setValue('custbody_lmry_reference_transaction_id', recordObj.id);
                             }
                             newJournal.setValue('custbody_lmry_es_detraccion', false);
                             newJournal.setValue('currency', currencySetup);
                             newJournal.setValue('exchangerate', newExchangeRate);
                             newJournal.setValue('memo', 'Calculo de IGV - ID: ' + recordObj.id);
                             if (JournalIDAndExist.exist) {
                                 var itemcount = newJournal.getLineCount('item');

                                 for (var j = itemcount; j > 0; j--) {
                                     newJournal.removeLineItem('item', j);
                                 }
                             }
                             // Segmentation
                             var lineDep = recordObj.getSublistValue('item', 'department', 0);
                             var lineCla = recordObj.getSublistValue('item', 'class', 0);
                             var lineLoc = recordObj.getSublistValue('item', 'location', 0);
                             // Line from
                             if (igvAccountOrig) {
                                 newJournal.setSublistValue('line', 'account', 0, igvAccountOrig);
                             } else {
                                 newJournal.setSublistValue('line', 'account', 0, recordObj.getValue('account'));
                             }
                             newJournal.setSublistValue('line', 'credit', 0, JEamount);
                             newJournal.setSublistValue('line', 'memo', 0, 'IGV Amount');
                             newJournal.setSublistValue('line', 'entity', 0, entityIGV);
                             if (lineDep != null && lineDep != '' && lineDep != undefined) {
                                 newJournal.setSublistValue('line', 'department', 0, lineDep);
                             }
                             if (lineCla != null && lineCla != '' && lineCla != undefined) {
                                 newJournal.setSublistValue('line', 'class', 0, lineCla);
                             }
                             if (lineLoc != null && lineLoc != '' && lineLoc != undefined) {
                                 newJournal.setSublistValue('line', 'location', 0, lineLoc);
                             }
                             // Line to
                             newJournal.setSublistValue('line', 'account', 1, igvAccount);
                             newJournal.setSublistValue('line', 'debit', 1, JEamount);
                             newJournal.setSublistValue('line', 'memo', 1, 'IGV Amount');
                             newJournal.setSublistValue('line', 'entity', 1, entityIGV);
                             if (lineDep != null && lineDep != '' && lineDep != undefined) {
                                 newJournal.setSublistValue('line', 'department', 1, lineDep);
                             }
                             if (lineCla != null && lineCla != '' && lineCla != undefined) {
                                 newJournal.setSublistValue('line', 'class', 1, lineCla);
                             }
                             if (lineLoc != null && lineLoc != '' && lineLoc != undefined) {
                                 newJournal.setSublistValue('line', 'location', 1, lineLoc);
                             }
                             idJournal = newJournal.save({
                                 enableSourcing: true,
                                 ignoreMandatoryFields: true,
                                 dissableTriggers: true
                             });

                             if (idJournal) {
                                 log.debug('Journal IGV', idJournal);
                                 var transactionfield = getTranFieldsIDAndExist(recordObj.id)
                                 var peTranFieldObj;
                                 if (transactionfield.exist) {
                                     peTranFieldObj = record.load({
                                         type: 'customrecord_lmry_pe_transaction_fields',
                                         id: transactionfield.transactionFieldID,
                                         isDynamic: false,
                                     })
                                 } else {
                                     peTranFieldObj = record.create({
                                         type: 'customrecord_lmry_pe_transaction_fields'
                                     });
                                 }

                                 peTranFieldObj.setValue({
                                     fieldId: 'custrecord_lmry_pe_transaction_related',
                                     value: recordObj.id
                                 });
                                 peTranFieldObj.setValue({
                                     fieldId: 'custrecord_lmry_pe_igv_wht_amount',
                                     value: JEamount
                                 });
                                 peTranFieldObj.setValue({
                                     fieldId: 'custrecord_lmry_pe_reference_journal',
                                     value: idJournal
                                 });
                                 peTranFieldObj.save({
                                     enableSourcing: true,
                                     ignoreMandatoryFields: true,
                                     disableTriggers: true
                                 });
                             }
                         }
                     }
                 }
             }

             record.submitFields({
                 type: recordObj.type,
                 id: recordObj.id,
                 values: {
                     'custbody_lmry_monto_retencion_igv': amountIGV
                 },
                 options: {
                     disableTriggers: true
                 }
             });

         } catch (err) {
             log.error('ERROR - calcularIGV', err);
         }
     }

     function deleteTransactionFields(LMRY_Intern) {
         try {
             var peTransField = search.create({
                 type: "customrecord_lmry_pe_transaction_fields",
                 filters: [
                     ["custrecord_lmry_pe_transaction_related", "is", LMRY_Intern],
                     "AND",
                     ["isinactive", "is", "F"]
                 ],
                 columns: ['internalid']
             });

             peTransField = peTransField.run().getRange(0, 1);
             if (peTransField != null && peTransField != '') {
                 record.delete({
                     type: 'customrecord_lmry_pe_transaction_fields',
                     id: peTransField[0].getValue('internalid')
                 });
             }
         } catch (err) {
             log.error('ERROR - deleteTransactionFields', err);
         }
     }

     function deleteJournalIGV(LMRY_Intern) {
         try {
             var listJournal = [];
             var JournalSearchObj = search.create({
                 type: "journalentry",
                 filters: [
                     ["custbody_lmry_reference_transaction", "is", LMRY_Intern],
                     "AND",
                     ["mainline", "is", "T"],
                     "AND",
                     ["memomain", "startswith", "Calculo de IGV - ID:"]
                 ],
                 columns: ['internalid']
             });
             JournalSearchObj = JournalSearchObj.run().getRange(0, 1000);

             if (JournalSearchObj != null && JournalSearchObj != '') {
                 for (var i = 0; i < JournalSearchObj.length; i++) {
                     if (listJournal.indexOf(JournalSearchObj[i].getValue('internalid')) == -1) {
                         record.delete({
                             type: 'journalentry',
                             id: JournalSearchObj[i].getValue('internalid')
                         });
                         listJournal.push(JournalSearchObj[i].getValue('internalid'))
                     }

                 }
             }
         } catch (err) {
             log.error('ERROR - deleteTransactionFields', err);
         }
     }
     function getJournalIDAndExist(transactionID) {
         var journalIDandExist = {
             journalID: null,
             exist: false
         }
         var journalIGVSearch = search.create({
             type: "journalentry",
             filters: [
                 ["custbody_lmry_reference_transaction", "is", transactionID],
                 "AND",
                 ["mainline", "is", "T"],
                 "AND",
                 ["memomain", "startswith", "Calculo de IGV - ID:"]
             ],
             columns: ['internalid']
         });
         var journalIGVResult = journalIGVSearch.run().getRange(0, 1);
         if (journalIGVResult.length > 0) {
             journalIDandExist.exist = true;
             journalIDandExist.journalID = journalIGVResult[0].getValue('internalid')
         }
         return journalIDandExist
     }
     function getTranFieldsIDAndExist(transactionID) {
         var tranFieldsIDAndExist = {
             transactionFieldID: null,
             exist: false
         }
         var transFieldSearch = search.create({
             type: "customrecord_lmry_pe_transaction_fields",
             filters: [
                 ["custrecord_lmry_pe_transaction_related", "is", transactionID],
                 "AND",
                 ["isinactive", "is", "F"]
             ],
             columns: ['internalid']
         });
         var transFieldResult = transFieldSearch.run().getRange(0, 1);
         if (transFieldResult.length > 0) {
             tranFieldsIDAndExist.exist = true;
             tranFieldsIDAndExist.transactionFieldID = transFieldResult[0].getValue('internalid')
         }
         return tranFieldsIDAndExist
     }
     return {
         calcularIGV: calcularIGV,
         deleteTransactionFields: deleteTransactionFields,
         deleteJournalIGV: deleteJournalIGV
     };

 });
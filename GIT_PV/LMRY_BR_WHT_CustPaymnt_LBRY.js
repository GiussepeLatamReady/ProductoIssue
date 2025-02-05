/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 * @Name LMRY_BR_WHT_CustPaymnt_LBRY.js
 * @Author diego@latamready.com
 */
define(['N/log', 'N/search', 'N/transaction', 'N/runtime', 'N/record', 'N/format', "N/util", '../Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', "../Latam_Library/LMRY_Log_LBRY_V2.0"],
    function (log, search, transaction, runtime, record, format, util, library_mail, libLog) {

        var TAX_TYPE = 1;
        var MEMO_RECLASS = 'Reclassification - WHT';
        var MEMO_INTEREST = "Latam - Interest and Penalty";
        var MEMO_WHT = "(LatamTax -  WHT)";
        var MEMO_EXPORT_WHT = "LatamTax - Export WHT";
        var LMRY_script = 'LMRY_BR_WHT_CustPaymnt_LBRY.js';
        var WHT_MEMO = 'Latam - WHT Tax';

        // SuiteTax
        var ST_FEATURE = false;

        function voidPayment(paymentObj) {
            try {
                var idPayment = paymentObj.id;
                if (idPayment) {
                    var isReversalVoidingActive = runtime.getCurrentScript().getParameter({ name: 'REVERSALVOIDING' });
                    var isVoided = paymentObj.getValue('voided');
                    log.debug('isReversalVoidingActive', isReversalVoidingActive);
                    log.debug('voided', paymentObj.getValue('voided'));
                    if (isVoided == 'F' && (isReversalVoidingActive == 'F' || isReversalVoidingActive == false)) {
                        var search_journals = search.create({
                            type: "journalentry",
                            filters: [
                                ["custbody_lmry_reference_transaction", "anyof", idPayment], "AND",
                                ["memomain", "startswith", MEMO_RECLASS], "AND",
                                ["linesequencenumber", "equalto", "0"], "AND",
                                ["memo", "doesnotstartwith", "VOID"]
                            ],
                            columns: ['internalid']
                        });

                        var results = search_journals.run().getRange(0, 10);
                        if (results.length) {
                            var idJournal = results[0].getValue('internalid');
                            transaction.void({
                                type: transaction.Type.JOURNAL_ENTRY,
                                id: idJournal
                            });
                        }

                        removeOtherChargesInBRTransactionFields(paymentObj);

                        var invoices = getOtherChargesTransactions(paymentObj);
                        for (var i = 0; i < invoices.length; i++) {
                            var idInvoice = invoices[i];
                            transaction.void({
                                type: transaction.Type.INVOICE,
                                id: idInvoice
                            });
                        }
                        inactiveCustPaymentLog(idPayment);
                    }
                }
            } catch (err) {
                log.error("[ voidPayment ]", err);
                library_mail.sendemail('[ voidPayment ]' + err, LMRY_script);
                libLog.doLog({ title: "[ voidPayment ]", message: err, relatedScript: LMRY_script });
            }
        }

        function beforeDeletePayment(paymentObj) {
            var idPayment = paymentObj.id;
            try {
                if (idPayment) {
                    deleteTaxResults(idPayment);
                    deleteJournals(idPayment);
                    removeOtherChargesInBRTransactionFields(paymentObj);
                    deleteExportWhtCreditMemos(paymentObj);
                }
            } catch (err) {
                log.error("[ beforeDeletePayment ]", err);
                library_mail.sendemail('[ beforeDeletePayment ]' + err, LMRY_script);
                libLog.doLog({ title: "[ beforeDeletePayment ]", message: err, relatedScript: LMRY_script, extra: { idPayment: idPayment } });
            }
        }

        function deleteTaxResults(recordId) {
            if (recordId) {
                var searchTaxResults = search.create({
                    type: 'customrecord_lmry_br_transaction',
                    filters: [
                        ['custrecord_lmry_br_transaction', 'anyof', recordId], 'AND',
                        ['custrecord_lmry_tax_type', 'anyof', TAX_TYPE]
                    ],
                    columns: ['internalid']
                });

                var results = searchTaxResults.run().getRange(0, 1000);
                if (results) {
                    for (var i = 0; i < results.length; i++) {
                        var internalid = results[i].getValue('internalid');
                        record.delete({
                            type: 'customrecord_lmry_br_transaction',
                            id: internalid
                        });
                    }
                }
            }
        }

        function deleteJournals(recordId) {
            var search_journals = search.create({
                type: "journalentry",
                filters: [
                    ["custbody_lmry_reference_transaction", "anyof", recordId], "AND",
                    ["memomain", "startswith", MEMO_RECLASS]
                ],
                columns: ['internalid']
            });

            var results = search_journals.run().getRange(0, 10);
            if (results.length) {
                var internalid = results[0].getValue('internalid');
                record.delete({
                    type: 'journalentry',
                    id: internalid
                });
            }
        }

        //Obtiene las Notas de Debito de Interes y Multa
        function getOtherChargesTransactions(paymentObj) {
            var transactions = [];

            var appliedInvoices = [];

            var numApplieds = paymentObj.getLineCount({ sublistId: "apply" });
            for (var i = 0; i < numApplieds; i++) {
                var isApplied = paymentObj.getSublistValue({ sublistId: "apply", fieldId: "apply", line: i });
                var id = paymentObj.getSublistValue({ sublistId: "apply", fieldId: "internalid", line: i });
                if ((isApplied == "T" || isApplied == true) && appliedInvoices.indexOf(Number(id)) == -1) {
                    appliedInvoices.push(Number(id));
                }
            }

            var searchInvoices = search.create({
                type: "invoice",
                filters: [
                    ["internalid", "anyof", appliedInvoices], "AND",
                    ["mainline", "is", "T"], "AND",
                    ["memo", "startswith", MEMO_INTEREST]
                ],
                columns: ["internalid"]
            });

            var results = searchInvoices.run().getRange(0, 1000);

            for (var i = 0; i < results.length; i++) {
                var id = results[i].getValue("internalid");
                transactions.push(Number(id));
            }

            log.debug("otherChargesTransactions", JSON.stringify(transactions));

            return transactions;
        }

        function deleteOtherChargesTransactions(paymentObj) {
            var invoices = getOtherChargesTransactions(paymentObj);
            for (var i = 0; i < invoices.length; i++) {
                var idInvoice = invoices[i];
                record.delete({
                    type: "invoice",
                    id: idInvoice
                });
            }
        }

        function removeOtherChargesInBRTransactionFields(paymentObj) {

            var searchLogs = search.create({
                type: "customrecord_lmry_br_custpayment_log",
                filters: [
                    ["isinactive", "is", "F"], "AND",
                    ["custrecord_lmry_br_custpaym_log_idpaymt", "anyof", paymentObj.id]
                ],
                columns: ["internalid", "custrecord_lmry_br_custpaym_log_data"]
            });

            var logs = searchLogs.run().getRange(0, 10);

            if (logs && logs.length) {
                var idLog = logs[0].getValue("internalid");
                log.debug("idLog", idLog);
                var dataPayment = logs[0].getValue("custrecord_lmry_br_custpaym_log_data");

                if (dataPayment) {
                    dataPayment = JSON.parse(dataPayment);
                    var invoices = {};
                    for (var key in dataPayment) {
                        var interest = dataPayment[key]["interest"] || 0.00;
                        interest = parseFloat(interest);
                        var penalty = dataPayment[key]["penalty"] || 0.00;
                        penalty = parseFloat(penalty);

                        var idInvoice = key.split("-")[0];

                        if (!invoices[idInvoice]) {
                            invoices[idInvoice] = { "interest": 0.00, "penalty": 0.00 };
                        }

                        invoices[idInvoice]["interest"] = round2(invoices[idInvoice]["interest"] + interest);
                        invoices[idInvoice]["penalty"] = round2(invoices[idInvoice]["penalty"] + penalty);
                    }

                    log.debug("invoices", JSON.stringify(invoices));


                    if (Object.keys(invoices).length) {
                        //Se buscan los BR Transaction fields de los invoices que componen este pago
                        var searchBRTransactionFields = search.create({
                            type: "customrecord_lmry_br_transaction_fields",
                            filters: [
                                ["isinactive", "is", "F"], "AND",
                                ["custrecord_lmry_br_related_transaction", "anyof", Object.keys(invoices)], "AND",
                                ["custrecord_lmry_br_related_transaction.mainline", "is", "T"]
                            ],
                            columns: ["internalid", "custrecord_lmry_br_related_transaction", "custrecord_lmry_br_interes", "custrecord_lmry_br_multa"]
                        });

                        var results = searchBRTransactionFields.run().getRange(0, 10);
                        if (results && results.length) {
                            for (var i = 0; i < results.length; i++) {
                                var idInvoice = results[i].getValue("custrecord_lmry_br_related_transaction");

                                if (invoices[String(idInvoice)]) {
                                    var interest = invoices[String(idInvoice)]["interest"];
                                    interest = parseFloat(interest) || 0.00;
                                    var penalty = invoices[String(idInvoice)]["penalty"];
                                    penalty = parseFloat(penalty) || 0.00;
                                    var idBrTransactionField = results[i].getValue("internalid");
                                    var currentInterest = results[i].getValue("custrecord_lmry_br_interes");
                                    currentInterest = parseFloat(currentInterest) || 0.00;
                                    var currentPenalty = results[i].getValue("custrecord_lmry_br_multa");
                                    currentPenalty = parseFloat(currentPenalty) || 0.00;

                                    if (interest || penalty) {
                                        currentInterest = currentInterest - interest;
                                        currentInterest = round2(currentInterest);
                                        currentPenalty = currentPenalty - penalty;
                                        currentPenalty = round2(currentPenalty);
                                        if (currentInterest >= 0 && currentPenalty >= 0) {
                                            record.submitFields({
                                                type: "customrecord_lmry_br_transaction_fields",
                                                id: idBrTransactionField,
                                                values: {
                                                    "custrecord_lmry_br_interes": currentInterest,
                                                    "custrecord_lmry_br_multa": currentPenalty
                                                },
                                                options: {
                                                    disableTriggers: true
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        function createPayment(paymentObj, transactions, notaDebitos, form, process) {
            var idpayment = '';
            if (form) {
                var FEAT_INSTALLMENTS = runtime.isFeatureInEffect({ feature: "installments" });

                var customer = paymentObj['customer'];
                var paymentRecord = record.transform({
                    fromType: record.Type.CUSTOMER,
                    fromId: customer,
                    toType: record.Type.CUSTOMER_PAYMENT,
                    isDynamic: true,
                    defaultValues: {
                        'customform': form
                    }
                });

                paymentRecord.setValue('subsidiary', paymentObj['subsidiary']);
                var trandate = paymentObj['date'];
                trandate = format.parse({ value: trandate, type: format.Type.DATE });
                paymentRecord.setValue('trandate', trandate);
                paymentRecord.setValue('postingperiod', paymentObj['period']);
                paymentRecord.setValue('aracct', paymentObj['araccount']);
                paymentRecord.setValue('currency', paymentObj['currency']);
                paymentRecord.setValue('exchangerate', paymentObj['exchangerate']);
                paymentRecord.setValue('undepfunds', paymentObj['undepfunds']);

                if (paymentObj['undepfunds'] == 'F' && paymentObj['bankaccount']) {
                    paymentRecord.setValue('account', paymentObj['bankaccount']);
                }

                paymentRecord.setValue('custbody_lmry_paymentmethod', paymentObj['paymentmethod']);
                paymentRecord.setValue('memo', paymentObj['memo']);

                if (paymentObj['department']) {
                    paymentRecord.setValue('department', paymentObj['department']);
                }
                if (paymentObj['class']) {
                    paymentRecord.setValue('class', paymentObj['class']);
                }
                if (paymentObj['location']) {
                    paymentRecord.setValue('location', paymentObj['location']);
                }

                if (paymentObj["csegments"]) {
                    var csegments = paymentObj["csegments"];
                    for (var segmentId in csegments) {
                        if (paymentRecord.getField(segmentId)) {
                            var segmentValue = csegments[segmentId] || "";
                            paymentRecord.setValue(segmentId, segmentValue);
                        }
                    }
                }



                var numApply = paymentRecord.getLineCount({ sublistId: 'apply' });

                for (var i = 0; i < numApply; i++) {
                    paymentRecord.selectLine({ sublistId: 'apply', line: i });

                    var lineId = paymentRecord.getCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'internalid'
                    });

                    lineId = String(lineId);

                    var key = lineId;
                    if (FEAT_INSTALLMENTS == true || FEAT_INSTALLMENTS == "T") {
                        var installnum = paymentRecord.getCurrentSublistValue({ sublistId: "apply", fieldId: "installmentnumber" });
                        if (installnum) {
                            key = lineId + "-" + installnum;
                        }
                    }

                    if (transactions.hasOwnProperty(key)) {
                        paymentRecord.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: true
                        });

                        if (process == '0' && transactions[key]['primerpago'] == 'T') {
                            transactions[key]['amountpaid'] = parseFloat(transactions[key]['amountpaid']) + parseFloat(transactions[key]['advance']);
                        }

                        var whtAmt = transactions[key].whtAmt || 0.00;
                        whtAmt = parseFloat(whtAmt);

                        var amountPaid = round2(transactions[key]["amountpaid"] - round2(whtAmt));
                        if (amountPaid) {
                            paymentRecord.setCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'amount',
                                value: amountPaid
                            });
                        }
                    }

                    if (notaDebitos.hasOwnProperty(lineId)) {
                        var interestAmt = notaDebitos[lineId].amount || 0.00;
                        interestAmt = parseFloat(interestAmt);
                        if (interestAmt) {
                            paymentRecord.setCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'apply',
                                value: true
                            });
                            paymentRecord.setCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'amount',
                                value: interestAmt
                            });
                        }
                    }
                }

                //APLICACION DEL ANTICIPO (CM O JOURNAL): SOLO PARA EL INDIVIDUAL
                var banderaJournal = true;
                var numCredit = paymentRecord.getLineCount({ sublistId: 'credit' });

                if (process == 0 && paymentObj['advance']) {
                    //var auxAdvance = JSON.parse(paymentObj['advance']);
                    var auxAdvance = paymentObj["advance"];
                    for (var i = 0; i < numCredit; i++) {
                        paymentRecord.selectLine({ sublistId: 'credit', line: i });
                        var lineId = paymentRecord.getCurrentSublistValue({ sublistId: 'credit', fieldId: 'internalid' });

                        var amountJournal = paymentRecord.getCurrentSublistValue({ sublistId: 'credit', fieldId: 'total' });

                        for (var j in auxAdvance) {
                            if (auxAdvance[j]['id'] == lineId && parseFloat(auxAdvance[j]['amount']) == Math.abs(parseFloat(amountJournal))) {
                                paymentRecord.setCurrentSublistValue({ sublistId: 'credit', fieldId: 'apply', value: true });
                                banderaJournal = false;
                            }
                        }

                        if (!banderaJournal) {
                            break;
                        }


                    }
                }

                var FEAT_MULTIBOOK = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });
                if (FEAT_MULTIBOOK == true || FEAT_MULTIBOOK == "T") {
                    var accountingBooks = paymentObj["books"];
                    var numBooks = paymentRecord.getLineCount({ sublistId: "accountingbookdetail" });
                    for (var i = 0; i < numBooks; i++) {
                        paymentRecord.selectLine({ sublistId: "accountingbookdetail", line: i });
                        var bookId = paymentRecord.getCurrentSublistValue({ sublistId: "accountingbookdetail", fieldId: "bookid" });
                        bookId = String(bookId);
                        if (accountingBooks.hasOwnProperty(bookId) && accountingBooks[bookId].exchangeRate) {
                            var bookExchangeRate = accountingBooks[bookId].exchangeRate;
                            bookExchangeRate = parseFloat(bookExchangeRate);
                            paymentRecord.setCurrentSublistValue({ sublistId: "accountingbookdetail", fieldId: "exchangerate", value: bookExchangeRate });
                        }
                    }
                }

                idpayment = paymentRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true,
                    disableTriggers: true
                });

            }
            return idpayment;
        }

        //C0815
        function createDiscount(paymentObj,invoiceId,setupTax,discount){
            var F_MULTPRICE = runtime.isFeatureInEffect({ feature: 'MULTPRICE' });
            var creditMemo = record.transform({
                fromType: "invoice",
                fromId: invoiceId,
                toType: "creditmemo",
                isDynamic: false,
                defaultValues: {
                    "customform": setupTax.creditmemoForm
                }
            });
            
            var dateCredit = format.parse({
                value: paymentObj.date,
                type: format.Type.DATE
            });
            creditMemo.setValue("trandate", dateCredit);
            creditMemo.setValue("postingperiod", paymentObj.period);
            creditMemo.setValue("currency", paymentObj.currency);
            creditMemo.setValue("exchangerate", paymentObj.exchangerate);
            creditMemo.setValue('custbody_lmry_reference_transaction', invoiceId);
            creditMemo.setValue('custbody_lmry_reference_transaction_id', invoiceId);
            creditMemo.setValue('custbody_lmry_document_type', null);
            var featureLang = runtime.getCurrentScript().getParameter({
                name: 'LANGUAGE'
              });

              log.debug('featureLang',featureLang);
              if(featureLang == 'es'){
                creditMemo.setValue('memo', 'Creado como descuento para BR - Customer Payment');
              }else if(featureLang == 'pt_BR'){
                creditMemo.setValue('memo', 'Criado como desconto para BR - Pagamento do Cliente');
              }else{
                creditMemo.setValue('memo', 'Created as discount for BR - Customer Payment');
              }
            
            removeAllItems(creditMemo);

            creditMemo.insertLine({
                sublistId: 'item',
                line: 0
            });

            creditMemo.setSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: 0,
                value: setupTax.discountItem
            });

            if (F_MULTPRICE == true || F_MULTPRICE == "T") {
                creditMemo.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'price',
                    line: 0,
                    value: -1
                });
            }

            creditMemo.setSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: 0,
                value: discount
            });
            creditMemo.setSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                line: 0,
                value: discount
            });

            if (setupTax.taxcode) {
                creditMemo.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxcode',
                    line: 0,
                    value: setupTax.taxcode
                });
            }
            // Aplicar al Invoice en la sublista 'apply'
            var lineCount = creditMemo.getLineCount({ sublistId: 'apply' });
            for (var i = 0; i < lineCount; i++) {
                var appliedInvoiceId = creditMemo.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    line: i
                });

                if (appliedInvoiceId == invoiceId) {
                    creditMemo.setSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        line: i,
                        value: true
                    });
                    break;
                }
            }


            creditMemo.save({
                ignoreMandatoryFields: true,
                disableTriggers: true,
                enableSourcing: true
            });

        }

        function getAccountingBooksString(idPayment) {

            var paymentResult = search.lookupFields({
                type: "customerpayment",
                id: idPayment,
                columns: ["internalid", "exchangerate", "subsidiary"]
            });

            var exchangeRate = paymentResult["exchangerate"];
            var books = [0], exchangeRates = [exchangeRate];

            var featureMB = runtime.isFeatureInEffect({
                feature: "MULTIBOOK"
            });

            if (featureMB == "T" || featureMB == true) {
                var subsidiary = paymentResult["subsidiary"];
                if (subsidiary && subsidiary.length) {
                    subsidiary = subsidiary[0]['value'];
                }

                var searchSecondaryBooks = search.create({
                    type: "accountingbook",
                    filters:
                        [
                            ["isprimary", "is", "F"], "AND",
                            ["subsidiary", "anyof", subsidiary], "AND",
                            ["status", "anyof", "ACTIVE"]
                        ],
                    columns: ["internalid"]
                });

                var results = searchSecondaryBooks.run().getRange(0, 10);
                var secondaryBooks = [];
                for (var i = 0; i < results.length; i++) {
                    var bookId = results[i].getValue("internalid");
                    secondaryBooks.push(bookId);
                }

                if (secondaryBooks.length) {
                    var searchAccountingBooks = search.create({
                        type: "transaction",
                        filters:
                            [
                                ["internalidnumber", "equalto", idPayment], "AND",
                                ["mainline", "is", "T"], "AND",
                                ["accountingtransaction.accountingbook", "anyof", secondaryBooks]
                            ],
                        columns: [
                            search.createColumn({
                                name: "accountingbook",
                                join: "accountingTransaction",
                                sort: search.Sort.ASC
                            }),
                            search.createColumn({
                                name: "exchangerate",
                                join: "accountingTransaction"
                            })
                        ],
                        settings: [search.createSetting({ name: 'consolidationtype', value: 'NONE' })]
                    });

                    var results = searchAccountingBooks.run().getRange(0, 10);
                    var columns = searchAccountingBooks.columns;
                    for (var i = 0; i < results.length; i++) {
                        var bookId = results[i].getValue(columns[0]);
                        var bookExchangeRate = results[i].getValue(columns[1]);
                        bookExchangeRate = parseFloat(bookExchangeRate);
                        if (books.indexOf(Number(bookId)) == -1) {
                            books.push(Number(bookId));
                            exchangeRates.push(bookExchangeRate);
                        }
                    }
                }
            }

            return books.join("|") + "&" + exchangeRates.join("|");
        }

        function getPaymentTaxResults(idpayment, subtypes) {
            var taxResults = [];
            var search_taxresults = search.create({
                type: 'customrecord_lmry_br_transaction',
                filters: [
                    ['isinactive', 'is', 'F'], 'AND',
                    ['custrecord_lmry_br_transaction', 'anyof', idpayment], 'AND',
                    ['custrecord_lmry_tax_type', 'anyof', "1"], 'AND',
                    ['custrecord_lmry_br_type_id', 'anyof', subtypes], "AND",
                    ["custrecord_lmry_is_export_tax_result", "is", "F"]
                ],
                columns: [
                    'internalid', 'custrecord_lmry_br_type_id', 'custrecord_lmry_br_total', 'custrecord_lmry_item', 'custrecord_lmry_related_applied_transact',
                    'custrecord_lmry_ccl.custrecord_lmry_ar_ccl_taxitem', 'custrecord_lmry_ntax.custrecord_lmry_ntax_taxitem', "custrecord_lmry_related_installm_num"
                ]
            });


            var results = search_taxresults.run().getRange(0, 1000);
            if (results) {
                for (var i = 0; i < results.length; i++) {
                    var taxresultObj = {
                        'internalid': results[i].getValue('internalid'),
                        'subtype': results[i].getText('custrecord_lmry_br_type_id'),
                        'subtypeid': results[i].getValue('custrecord_lmry_br_type_id'),
                        'fxamount': results[i].getValue('custrecord_lmry_br_total') || 0.00,
                        'idtransaction': idpayment,
                        'idapplytransaction': results[i].getValue('custrecord_lmry_related_applied_transact') || '',
                        'iditem': results[i].getValue('custrecord_lmry_item') || "",
                        'taxItem': results[i].getValue({ name: "custrecord_lmry_ar_ccl_taxitem", join: "custrecord_lmry_ccl" }) || results[i].getValue({ name: "custrecord_lmry_ntax_taxitem", join: "custrecord_lmry_ntax" }),
                        "installmentnumber": results[i].getValue("custrecord_lmry_related_installm_num")
                    };

                    taxResults.push(taxresultObj);
                }
            }

            return taxResults;
        }

        function getSetupTaxSubsidiary(idSubsidiary) {
            var setupTaxSubsidiary = {};
            if (idSubsidiary) {
                var search_setup = search.create({
                    type: 'customrecord_lmry_setup_tax_subsidiary',
                    filters: [
                        ['custrecord_lmry_setuptax_subsidiary', 'anyof', idSubsidiary], 'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'internalid', 'custrecord_lmry_setuptax_form_custpaymt', 'custrecord_lmry_setuptax_form_journal', 'custrecord_lmry_setuptax_form_creditmemo',
                        'custrecord_lmry_setuptax_reclass_subtyps', "custrecord_lmry_setuptax_form_invoice", "custrecord_lmry_setuptax_br_document", "custrecord_lmry_setuptax_currency",
                        "custrecord_lmry_setuptax_br_tax_code", "custrecord_lmry_br_ar_interes_item", "custrecord_lmry_br_ar_multa_item", "custrecord_lmry_setuptax_br_full_wht_sal",
                        'custrecord_lmry_setuptax_dcto_pay','custrecord_lmry_setuptax_dcto_item'
                    ]
                });

                var results = search_setup.run().getRange(0, 10);
                if (results && results.length) {
                    setupTaxSubsidiary["currency"] = results[0].getValue("custrecord_lmry_setuptax_currency") || "";
                    setupTaxSubsidiary['paymentform'] = results[0].getValue('custrecord_lmry_setuptax_form_custpaymt') || '';
                    setupTaxSubsidiary['journalform'] = results[0].getValue('custrecord_lmry_setuptax_form_journal') || '';
                    setupTaxSubsidiary["invoiceform"] = results[0].getValue("custrecord_lmry_setuptax_form_invoice") || "";
                    setupTaxSubsidiary["creditmemoForm"] = results[0].getValue("custrecord_lmry_setuptax_form_creditmemo") || "";
                    setupTaxSubsidiary["document"] = results[0].getValue("custrecord_lmry_setuptax_br_document") || "";
                    setupTaxSubsidiary["taxcode"] = results[0].getValue("custrecord_lmry_setuptax_br_tax_code") || "";
                    setupTaxSubsidiary["interestItem"] = results[0].getValue("custrecord_lmry_br_ar_interes_item") || "";
                    setupTaxSubsidiary["penaltyItem"] = results[0].getValue("custrecord_lmry_br_ar_multa_item") || "";
                    setupTaxSubsidiary["fullwht"] = results[0].getValue("custrecord_lmry_setuptax_br_full_wht_sal");
                    setupTaxSubsidiary["discountItem"] = results[0].getValue("custrecord_lmry_setuptax_dcto_item");
                    setupTaxSubsidiary["enableDiscount"] = results[0].getValue("custrecord_lmry_setuptax_dcto_pay");

                    var subtypes = results[0].getValue('custrecord_lmry_setuptax_reclass_subtyps');
                    if (subtypes) {
                        setupTaxSubsidiary['reclassSubtypes'] = subtypes = subtypes.split(/\u0005|\,/g);
                    }
                }
            }

            return setupTaxSubsidiary;
        }

        function crearNotaDebitoInteresMulta(idInvoice, installmentNumber, paymentObj, interest, penalty, setup) {

            ST_FEATURE = runtime.isFeatureInEffect({ feature: "tax_overhauling" });

            var idTransaction = "";

            interest = parseFloat(interest) || 0.00;
            penalty = parseFloat(penalty) || 0.00;
            if (interest + penalty) {

                var F_DEPARTMENTS = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
                var F_LOCATIONS = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
                var F_CLASSES = runtime.isFeatureInEffect({ feature: "CLASSES" });
                var F_APPROVAL_INVOICE = runtime.getCurrentScript().getParameter({ name: "CUSTOMAPPROVALCUSTINVC" });
                var F_MULTPRICE = runtime.isFeatureInEffect({ feature: 'MULTPRICE' });

                var subsidiary = paymentObj.subsidiary;
                var customer = paymentObj.customer;
                var currency = paymentObj.currency;
                var postingperiod = paymentObj.period;
                var exchangerate = paymentObj.exchangerate;
                var trandate = paymentObj.date;
                trandate = format.parse({ value: trandate, type: format.Type.DATE });

                var segmentation = {
                    department: paymentObj.department || "",
                    "class": paymentObj["class"] || "",
                    location: paymentObj.location || ""
                };

                var customSegments = paymentObj.csegments || {};
                segmentation = util.extend(segmentation, customSegments);

                var form = setup["invoiceform"];
                var document = setup["document"];
                var taxcode = setup["taxcode"];
                var interestItem = setup["interestItem"];
                var penaltyItem = setup["penaltyItem"];

                if (form && (interestItem || penaltyItem)) {

                    var entityTaxRegNum = "";
                    var nexus = "";
                    var subsidiaryTaxRegNum = "";

                    if (ST_FEATURE === true || ST_FEATURE === "T") {

                        var invoice_record = record.load({
                            type: 'invoice',
                            id: idInvoice
                        });

                        entityTaxRegNum = invoice_record.getValue('entitytaxregnum');
                        nexus = invoice_record.getValue('nexus');
                        subsidiaryTaxRegNum = invoice_record.getValue('subsidiarytaxregnum');

                    }

                    var invoiceObj = record.transform({
                        fromType: "customer",
                        fromId: customer,
                        toType: "invoice",
                        isDynamic: false,
                        defaultValues: {
                            "customform": form
                        }
                    });

                    invoiceObj.setValue("subsidiary", subsidiary);
                    invoiceObj.setValue("trandate", trandate);
                    invoiceObj.setValue("postingperiod", postingperiod);
                    invoiceObj.setValue("currency", currency);
                    invoiceObj.setValue("exchangerate", exchangerate);

                    if (ST_FEATURE === true || ST_FEATURE === "T") {
                        invoiceObj.setValue("taxregoverride", true);
                        invoiceObj.setValue("taxdetailsoverride", true);
                        invoiceObj.setValue("entitytaxregnum", entityTaxRegNum);
                        invoiceObj.setValue("nexus", nexus);
                        invoiceObj.setValue("subsidiarytaxregnum", subsidiaryTaxRegNum);
                    }

                    var memo = MEMO_INTEREST + " -" + idInvoice;
                    if (installmentNumber) {
                        memo = memo + "-" + installmentNumber;
                    }

                    invoiceObj.setValue('memo', memo);
                    invoiceObj.setValue('custbody_lmry_reference_transaction', idInvoice);
                    invoiceObj.setValue('custbody_lmry_reference_transaction_id', idInvoice);
                    invoiceObj.setValue('custbody_lmry_document_type', document); //LATAM - LEGAL DOCUMENT TYPE
                    invoiceObj.setValue("terms", "");

                    if (F_APPROVAL_INVOICE && invoiceObj.getField({
                        fieldId: 'approvalstatus'
                    })) {
                        invoiceObj.setValue('approvalstatus', 2);
                    }

                    removeAllItems(invoiceObj);

                    var items = [
                        { item: interestItem, memo: "Interest - ID: " + idInvoice, amount: interest },
                        { item: penaltyItem, memo: "Penalty - ID: " + idInvoice, amount: penalty }
                    ];

                    var j = 0;
                    for (var i = 0; i < items.length; i++) {
                        if (items[i]["item"] && items[i]["amount"]) {
                            invoiceObj.insertLine({
                                sublistId: 'item',
                                line: j
                            });
                            invoiceObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: j,
                                value: items[i]["item"]
                            });

                            if (F_MULTPRICE == true || F_MULTPRICE == "T") {
                                invoiceObj.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'price',
                                    line: j,
                                    value: -1
                                });
                            }

                            var amount = items[i]["amount"];
                            amount = round2(amount);

                            invoiceObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                line: j,
                                value: amount
                            });
                            invoiceObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                line: j,
                                value: amount
                            });

                            if (ST_FEATURE === false || ST_FEATURE === "F") {

                                invoiceObj.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'tax1amt',
                                    line: j,
                                    value: 0.00
                                });

                                if (taxcode) {
                                    invoiceObj.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'taxcode',
                                        line: j,
                                        value: taxcode
                                    });
                                }

                            }

                            invoiceObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'description',
                                line: j,
                                value: items[i]["memo"]
                            });

                            for (var segmentId in segmentation) {
                                var segmentField = invoiceObj.getSublistField({ sublistId: "item", fieldId: segmentId, line: j });
                                if (segmentField && segmentation[segmentId]) {
                                    invoiceObj.setSublistValue({ sublistId: "item", fieldId: segmentId, line: j, value: segmentation[segmentId] });
                                }
                            }

                            j++;
                        }
                    }

                    idTransaction = invoiceObj.save({
                        ignoreMandatoryFields: true,
                        disableTriggers: true,
                        enableSourcing: true
                    });
                }
            }

            return idTransaction;
        }

        function removeAllItems(recordObj) {
            while (true) {
                var numberItems = recordObj.getLineCount({ sublistId: 'item' });
                if (numberItems) {
                    recordObj.removeLine({ sublistId: 'item', line: numberItems - 1 });
                } else {
                    break;
                }
            }
        }

        function updatePaymentAmounts(idpayment, newInvoices, exportWhts) {
            var additionalAmount = 0.00;

            //Se acumula el monto total que se agregara al monto total del pago.
            for (var i in newInvoices) {
                var amount = newInvoices[i]["amount"] || 0.00;
                additionalAmount = round2(additionalAmount + amount);
            }

            for (var key in exportWhts) {
                var whtAmt = exportWhts[key].amount || 0.00;
                whtAmt = parseFloat(whtAmt);
                additionalAmount = round2(additionalAmount - whtAmt);
            }

            var paymentObj = record.load({
                type: "customerpayment",
                id: idpayment,
                isDynamic: true
            });


            //Se aumenta al monto total del pago, el monto de las notas de debito de interes y multas.
            var currentPaymentAmount = paymentObj.getValue("payment");
            currentPaymentAmount = parseFloat(currentPaymentAmount);
            paymentObj.setValue("payment", round2(currentPaymentAmount + additionalAmount));


            var FEAT_INSTALLMENTS = runtime.isFeatureInEffect({ feature: "installments" });
            //Se aplican las notas de debitos al pago.
            var numApply = paymentObj.getLineCount({
                sublistId: 'apply'
            });

            for (var i = 0; i < numApply; i++) {
                paymentObj.selectLine({ sublistId: 'apply', line: i });

                var lineId = paymentObj.getCurrentSublistValue({
                    sublistId: 'apply',
                    fieldId: 'internalid',
                    line: i
                });

                var key = lineId;
                if (FEAT_INSTALLMENTS == true || FEAT_INSTALLMENTS == "T") {
                    var instalmentNumLine = paymentObj.getCurrentSublistValue({ sublistId: "apply", fieldId: "installmentnumber" });
                    if (instalmentNumLine) {
                        key = lineId + "-" + instalmentNumLine;
                    }
                }

                if (exportWhts.hasOwnProperty(key) && exportWhts[key].amount) {
                    var currentAmt = paymentObj.getCurrentSublistValue({
                        sublistId: "apply",
                        fieldId: "amount"
                    }) || 0.00;

                    currentAmt = parseFloat(currentAmt);

                    var exportWht = exportWhts[key].amount || 0.00;
                    exportWht = parseFloat(exportWht);
                    var newAmt = round2(currentAmt - exportWht);

                    paymentObj.setCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        value: true
                    });

                    paymentObj.setCurrentSublistValue({
                        sublistId: "apply",
                        fieldId: "amount",
                        value: newAmt
                    });
                }


                if (newInvoices.hasOwnProperty(lineId)) {
                    paymentObj.setCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        value: true
                    });

                    paymentObj.setCurrentSublistValue({
                        sublistId: "apply",
                        fieldId: "amount",
                        value: parseFloat(newInvoices[String(lineId)]["amount"])
                    });
                }
            }

            paymentObj.setValue('custbody_lmry_br_amount_advance', '1');

            paymentObj.save({
                enableSourcing: true,
                ignoreMandatoryFields: true,
                disableTriggers: true
            });

            //}
        }

        function updateBRTransactionFields(transactions) {
            var FEAT_INSTALLMENTS = runtime.isFeatureInEffect({ feature: "installments" });
            var brTransactionFields = [];
            var invoices = {}, invoiceInstallments = {};

            for (var key in transactions) {
                var invoiceId = key.split("-")[0];
                var installmentNum = key.split("-")[1];
                if (!invoices.hasOwnProperty(invoiceId)) {
                    invoices[invoiceId] = { penalty: 0.00, interest: 0.00, whtAmt: 0.00 };
                }

                invoices[invoiceId].penalty = round2(invoices[invoiceId].penalty + (parseFloat(transactions[key].penalty) || 0.00));
                invoices[invoiceId].interest = round2(invoices[invoiceId].interest + (parseFloat(transactions[key].interest) || 0.00));

                if (installmentNum) {
                    if (!invoiceInstallments.hasOwnProperty(invoiceId)) {
                        invoiceInstallments[invoiceId] = {};
                    }
                    invoiceInstallments[invoiceId][installmentNum] = { wht: parseFloat(transactions[key].whtAmt) };
                }
            }

            if (Object.keys(invoices).length) {
                var hasBrTransactionFields = [];
                var installmentInvKeys = Object.keys(invoiceInstallments);
                var installments = {};
                if ((FEAT_INSTALLMENTS == true || FEAT_INSTALLMENTS == "T") && installmentInvKeys.length) {
                    var searchInstallments = search.create({
                        type: "invoice",
                        filters:
                            [
                                ["internalid", "anyof", installmentInvKeys], "AND",
                                ["mainline", "is", "T"]
                            ],
                        columns: [
                            search.createColumn({
                                name: "internalid",
                                sort: search.Sort.ASC
                            }),
                            search.createColumn({
                                name: "installmentnumber",
                                join: "installment",
                                sort: search.Sort.ASC
                            }),
                            "installment.fxamount",
                            "installment.duedate"
                        ],
                        settings: [search.createSetting({ name: 'consolidationtype', value: 'NONE' })]
                    });
                    var results = searchInstallments.run().getRange(0, 1000);
                    if (results) {
                        for (var i = 0; i < results.length; i++) {
                            var invoiceId = results[i].getValue("internalid");
                            var installmentNum = results[i].getValue({ name: "installmentnumber", join: "installment" }) || "";
                            var amount = results[i].getValue({ name: "fxamount", join: "installment" }) || 0.00;
                            amount = parseFloat(amount);
                            var duedate = results[i].getValue({ name: "duedate", join: "installment" }) || "";
                            if (!installments.hasOwnProperty(invoiceId)) {
                                installments[invoiceId] = {};
                            }
                            if (installmentNum) {
                                var key = invoiceId + "-" + installmentNum;
                                var wht = 0.00;
                                if (transactions.hasOwnProperty(key)) {
                                    wht = transactions[key].whtAmt || 0.00;
                                }

                                installments[invoiceId][installmentNum] = { amount: amount, duedate: duedate, wht: wht };
                            }
                        }
                    }
                }


                var searchBRTransactionFields = search.create({
                    type: "customrecord_lmry_br_transaction_fields",
                    filters: [
                        ["isinactive", "is", "F"], "AND",
                        ["custrecord_lmry_br_related_transaction", "anyof", Object.keys(invoices)]
                    ],
                    columns: ["internalid", "custrecord_lmry_br_related_transaction", "custrecord_lmry_br_interes", "custrecord_lmry_br_multa", "custrecord_lmry_br_installments"]
                });

                var results = searchBRTransactionFields.run().getRange(0, 1000);
                if (results && results.length) {
                    for (var i = 0; i < results.length; i++) {
                        var id = results[i].getValue("internalid");
                        var invoiceId = results[i].getValue("custrecord_lmry_br_related_transaction");
                        var previousInterest = results[i].getValue("custrecord_lmry_br_interes") || 0.00;
                        var previousPenalty = results[i].getValue("custrecord_lmry_br_multa") || 0.00;
                        var installmentObj = results[i].getValue("custrecord_lmry_br_installments") || "";

                        if (invoices.hasOwnProperty(invoiceId)) {

                            brTransactionFields.push(id);
                            hasBrTransactionFields.push(Number(invoiceId));

                            var interest = parseFloat(invoices[invoiceId]["interest"]) || 0.00;
                            var penalty = parseFloat(invoices[invoiceId]["penalty"]) || 0.00;
                            interest += parseFloat(previousInterest);
                            penalty += parseFloat(previousPenalty);

                            var values = {};
                            if (interest) {
                                values.custrecord_lmry_br_interes = round2(interest);
                            }

                            if (penalty) {
                                values.custrecord_lmry_br_multa = round2(penalty);
                            }

                            if ((FEAT_INSTALLMENTS == true || FEAT_INSTALLMENTS == "T")) {
                                if (installmentObj) {
                                    installmentObj = JSON.parse(installmentObj);
                                }
                                if (installments.hasOwnProperty(invoiceId)) {
                                    for (var iNum in installments[invoiceId]) {
                                        if (installmentObj && installmentObj.hasOwnProperty(iNum)) {
                                            var previousWht = installmentObj[iNum].wht || 0.00;
                                            previousWht = parseFloat(previousWht);
                                            installments[invoiceId][iNum].wht = round2(installments[invoiceId][iNum].wht + previousWht);
                                        }
                                    }
                                    values.custrecord_lmry_br_installments = JSON.stringify(installments[invoiceId]);
                                }
                            }


                            record.submitFields({
                                type: "customrecord_lmry_br_transaction_fields",
                                id: id,
                                values: values,
                                options: {
                                    disableTriggers: true
                                }
                            });

                        }
                    }
                }

                for (var invoiceId in invoices) {
                    if (hasBrTransactionFields.indexOf(Number(invoiceId)) == -1) {
                        var brTransactionField = record.create({
                            type: "customrecord_lmry_br_transaction_fields"
                        });

                        var interest = invoices[invoiceId].interest;
                        var penalty = invoices[invoiceId].penalty;

                        brTransactionField.setValue({ fieldId: "custrecord_lmry_br_related_transaction", value: invoiceId });
                        brTransactionField.setValue({ fieldId: "custrecord_lmry_br_interes", value: parseFloat(interest) || 0.00 });
                        brTransactionField.setValue({ fieldId: "custrecord_lmry_br_multa", value: parseFloat(penalty) || 0.00 });
                        brTransactionField.setValue({ fieldId: "custrecord_lmry_br_installments", value: JSON.stringify(installments[invoiceId]) });

                        var idBrTransactionField = brTransactionField.save({
                            ignoreMandatoryFields: true,
                            enableSourcing: true,
                            disableTriggers: true
                        });

                        brTransactionFields.push(idBrTransactionField);
                    }
                }
            }

            return brTransactionFields;
        }

        function getCustomSegments() {
            var customSegments = [];
            var FEAT_CUSTOMSEGMENTS = runtime.isFeatureInEffect({ feature: "customsegments" });

            if (FEAT_CUSTOMSEGMENTS == true || FEAT_CUSTOMSEGMENTS == "T") {
                var searchCustomSegments = search.create({
                    type: "customrecord_lmry_setup_cust_segm",
                    filters: [
                        ["isinactive", "is", "F"]
                    ],
                    columns: [
                        "internalid", "name", "custrecord_lmry_setup_cust_segm"]
                });

                var results = searchCustomSegments.run().getRange(0, 1000);

                if (results && results.length) {
                    for (var i = 0; i < results.length; i++) {
                        var customSegmentId = results[i].getValue("custrecord_lmry_setup_cust_segm");
                        customSegmentId = customSegmentId.trim() || "";
                        if (customSegmentId) {
                            customSegments.push(customSegmentId);
                        }
                    }
                }
            }
            return customSegments;
        }

        function getWhtTaxResults(idtransaction, subtypes) {
            var taxresults = [];
            var search_taxresults = search.create({
                type: 'customrecord_lmry_br_transaction',
                filters: [
                    ['isinactive', 'is', 'F'], 'AND',
                    ['custrecord_lmry_br_transaction', 'anyof', idtransaction], 'AND',
                    ['custrecord_lmry_tax_type', 'anyof', "1"], 'AND',
                    ['custrecord_lmry_br_type_id', 'anyof', subtypes], "AND",
                    ["custrecord_lmry_is_export_tax_result", "is", "F"], "AND",
                    [
                        ["custrecord_lmry_ccl.custrecord_lmry_ccl_wht_tax_point", "anyof", ["@NONE@", "1"]], "OR",
                        ["custrecord_lmry_ntax.custrecord_lmry_ntax_wht_tax_point", "anyof", ["@NONE@", "1"]] //Retencion aplicado a la factura
                    ]
                ],
                columns: [
                    'internalid', 'custrecord_lmry_br_type_id', 'custrecord_lmry_base_amount', 'custrecord_lmry_br_total',
                    'custrecord_lmry_total_base_currency', 'custrecord_lmry_base_amount_local_currc', 'custrecord_lmry_amount_local_currency',
                    'custrecord_lmry_br_percent', 'custrecord_lmry_ccl', 'custrecord_lmry_ntax', 'custrecord_lmry_item',
                    search.createColumn({
                        name: "custrecord_lmry_ar_ccl_taxitem",
                        join: "CUSTRECORD_LMRY_CCL"
                    }),
                    search.createColumn({
                        name: "custrecord_lmry_ntax_taxitem",
                        join: "CUSTRECORD_LMRY_NTAX"
                    })
                ]
            });

            var columns = search_taxresults.columns;

            var results = search_taxresults.run().getRange(0, 1000);

            if (results) {
                for (var i = 0; i < results.length; i++) {
                    var typeRecord = 'ccl';
                    var idrecordtax = results[i].getValue('custrecord_lmry_ccl') || '';
                    var taxitem = results[i].getValue(columns[11]);

                    if (!idrecordtax) {
                        typeRecord = 'ntax';
                        idrecordtax = results[i].getValue('custrecord_lmry_ntax');
                        taxitem = results[i].getValue(columns[12]);
                    }

                    var taxresultObj = {
                        'internalid': results[i].getValue('internalid'),
                        'subtype': results[i].getText('custrecord_lmry_br_type_id'),
                        'subtypeid': results[i].getValue('custrecord_lmry_br_type_id'),
                        'baseAmount': results[i].getValue('custrecord_lmry_base_amount'),
                        'fxamount': results[i].getValue('custrecord_lmry_br_total'),
                        'amount': results[i].getValue('custrecord_lmry_amount_local_currency'),
                        'taxRate': results[i].getValue('custrecord_lmry_br_percent'),
                        'typeRecord': typeRecord,
                        'idRecord': idrecordtax,
                        'locCurrBaseAmount': results[i].getValue('custrecord_lmry_base_amount_local_currc'),
                        'iditem': results[i].getValue('custrecord_lmry_item') || "",
                        'taxitem': taxitem
                    };

                    taxresults.push(taxresultObj);
                }
            }

            return taxresults;
        }

        function getReclassWhtTaxResults(idInvoice, installmentNumber, amountPaid, firstPayment, setupTax, localExchangeRate, advance) {
            var paymentTaxResults = [];
            var key = idInvoice;
            if (installmentNumber) {
                key = idInvoice + '-' + installmentNumber;
            }
            var advanceAmount = advance || 0;
            var reclassSubtypes = setupTax.reclassSubtypes;
            var fullwht = setupTax.fullwht;

            if (reclassSubtypes && reclassSubtypes.length) {
                log.debug('fullwht', fullwht);
                log.debug('firstPayment', firstPayment);

                var invoiceWhtTaxResults = getWhtTaxResults(idInvoice, reclassSubtypes);
                log.debug("invoiceWhtTaxResults", JSON.stringify(invoiceWhtTaxResults));

                if (invoiceWhtTaxResults.length) {
                    //var accountingbooks = getPaymentAccountingBooks(idPayment);
                    var invoiceObj = getInvoiceAmounts(idInvoice);
                    log.debug("invoiceObj", JSON.stringify(invoiceObj));

                    var totalInvoice = invoiceObj["total"];
                    var whtTotal = invoiceObj["whtAmount"];
                    var partialAmount = invoiceObj["total"];
                    var partialWhtAmount = invoiceObj["whtAmount"];

                    var iFactorAmount = 1, iFactorBase = 1;

                    var factor = 1;

                    //Si es primer pago y el check se encuentra activo se crea tax results por monto total de retención
                    if (fullwht) {
                        if (firstPayment && !firstPayment.hasOwnProperty(key)) {
                            //Segundo pago con check activado, no se crea tax results
                            log.debug('SEGUNDO PAGO', 'SEGUNDO PAGO');
                            return false;
                        }
                    } else {
                        // Se obtiene el factor de prorrateo para pagos parciales
                        log.debug('PAGO SIN CHECK', 'PAGO SIN CHECK');
                        if (installmentNumber && invoiceObj[String(installmentNumber)]) {
                            partialAmount = invoiceObj[String(installmentNumber)]["total"];
                            partialWhtAmount = invoiceObj[String(installmentNumber)]["whtAmount"];
                            var installmentAmount = invoiceObj[String(installmentNumber)]["total"];
                            var installmentWHT = invoiceObj[String(installmentNumber)]["whtAmount"];
                            iFactorBase = installmentAmount / totalInvoice;
                            iFactorAmount = installmentWHT / whtTotal;
                            log.debug("[iFactorBase,iFactorAmount]", [iFactorBase, iFactorAmount].join("-"));
                        }

                        var amountRemaining = round2(parseFloat(partialAmount) - parseFloat(partialWhtAmount));

                        log.debug('[partialAmount, amountdue]', [partialAmount, amountRemaining].join('-'));

                        var actualPaid = parseFloat(amountPaid) + parseFloat(advanceAmount);
                        if (parseFloat(actualPaid) != parseFloat(amountRemaining)) {
                            factor = parseFloat(actualPaid) / parseFloat(amountRemaining);
                        }
                    }

                    log.debug('factor', factor);

                    for (var i = 0; i < invoiceWhtTaxResults.length; i++) {

                        //Montos en moneda transaccion
                        var baseAmount = invoiceWhtTaxResults[i].baseAmount || 0.00;
                        baseAmount = parseFloat(baseAmount);
                        baseAmount = baseAmount * iFactorBase * factor;

                        var whtAmount = invoiceWhtTaxResults[i].fxamount || 0.00;
                        whtAmount = parseFloat(whtAmount);
                        whtAmount = whtAmount * iFactorAmount * factor;

                        var localCurBaseAmt = baseAmount;
                        var localCurrAmt = whtAmount;

                        if (localExchangeRate != 1) {
                            localCurBaseAmt = round2(baseAmount) * localExchangeRate;
                            localCurrAmt = round2(whtAmount) * localExchangeRate;
                        }

                        var taxresultObj = {
                            'sourceid': invoiceWhtTaxResults[i]['internalid'],
                            'subtype': invoiceWhtTaxResults[i]['subtype'],
                            'subtypeid': invoiceWhtTaxResults[i]['subtypeid'],
                            'baseAmount': baseAmount,
                            'fxamount': whtAmount,
                            'amount': localCurrAmt,
                            'locCurrBaseAmount': localCurBaseAmt,
                            //'idtransaction': idPayment,
                            'idapplytransaction': idInvoice,
                            //'accountingbooks': accountingbooks,
                            "installmentnumber": installmentNumber,
                            "iditem": invoiceWhtTaxResults[i]["iditem"],
                            "taxItem": invoiceWhtTaxResults[i]["taxitem"],
                        };

                        log.debug('taxresultObj', taxresultObj);

                        paymentTaxResults.push(taxresultObj);
                        //savePaymentTaxResult(taxresultObj);
                    }
                }
            }

            return paymentTaxResults;
        }

        function getReclassAccounts(subsidiary, subtypes) {
            var reclassaccounts = {};
            var filters = [
                ['isinactive', 'is', 'F'], 'AND',
                ['custrecord_lmry_br_wht_reclass_subsi', 'anyof', subsidiary], 'AND',
                ['custrecord_lmry_br_wht_reclass_subtype', 'anyof', subtypes]
            ];

            var search_reclass = search.create({
                type: 'customrecord_lmry_br_wht_reclass_account',
                filters: filters,
                columns: [
                    'internalid',
                    'custrecord_lmry_br_wht_reclass_subtype',
                    'custrecord_lmry_br_wht_reclass_accdeb'
                ]
            });

            var results = search_reclass.run().getRange(0, 1000);

            if (results) {
                for (var i = 0; i < results.length; i++) {
                    var internalid = results[i].getValue('internalid');
                    var subtype = results[i].getValue('custrecord_lmry_br_wht_reclass_subtype');
                    var account = results[i].getValue('custrecord_lmry_br_wht_reclass_accdeb') || '';
                    reclassaccounts[String(subtype)] = { 'internalid': internalid, 'account': account };
                }
            }

            return reclassaccounts;
        }

        function getSubtypeAccounts(taxResults) {
            var subtypeAccounts = {};

            var invoices = [], itemBySubtype = {};

            for (var i = 0; i < taxResults.length; i++) {
                var idInvoice = taxResults[i]["idapplytransaction"];
                var taxItem = taxResults[i]["taxItem"];
                var subtype = taxResults[i]["subtypeid"];

                if (idInvoice && invoices.indexOf(Number(idInvoice)) == -1) {
                    invoices.push(Number(idInvoice));
                }

                if (taxItem && !itemBySubtype[String(subtype)]) {
                    itemBySubtype[String(subtype)] = taxItem;
                }
            }

            log.debug("invoices", invoices);
            log.debug('itemBySubtype', JSON.stringify(itemBySubtype));

            if (invoices.length) {
                var searchCreditMemos = search.create({
                    type: "creditmemo",
                    filters: [
                        ["appliedtotransaction", "anyof", invoices], "AND",
                        ["mainline", "is", "T"], "AND",
                        ["memo", "startswith", MEMO_WHT]
                    ],
                    columns: ["internalid"]
                });

                var results = searchCreditMemos.run().getRange(0, 1000);

                var idCreditMemos = [];
                for (var i = 0; i < results.length; i++) {
                    var idCreditMemo = results[i].getValue("internalid");
                    if (idCreditMemos.indexOf(Number(idCreditMemo)) == -1) {
                        idCreditMemos.push(Number(idCreditMemo));
                    }
                }

                if (idCreditMemos.length) {
                    var searchAccounts = search.create({
                        type: "creditmemo",
                        filters: [
                            ["internalid", "anyof", idCreditMemos], "AND",
                            ["mainline", "is", "F"], "AND",
                            ["cogs", "is", "F"], "AND",
                            ["taxline", "is", "F"], "AND",
                            ["formulatext: {item.type.id}", "isnot", "ShipItem"], "AND",
                            ["item", "noneof", "@NONE@"]
                        ],
                        columns: [
                            search.createColumn({
                                name: "item",
                                summary: "GROUP"
                            }),
                            search.createColumn({
                                name: "account",
                                summary: "GROUP"
                            })
                        ]
                    });

                    var results = searchAccounts.run().getRange(0, 1000);
                    var columns = searchAccounts.columns;
                    for (var i = 0; i < results.length; i++) {
                        var taxItem = results[i].getValue(columns[0]);
                        var account = results[i].getValue(columns[1]);

                        if (Number(account)) {
                            for (var subType in itemBySubtype) {
                                if (Number(taxItem) == Number(itemBySubtype[subType])) {
                                    subtypeAccounts[String(subType)] = account;
                                }
                            }
                        }
                    }
                }
            }

            return subtypeAccounts;
        }
        function saveReclassWhtTaxResult(paymentId, accountingBookString, taxresultObj) {
            var recordTaxResult = record.copy({
                type: 'customrecord_lmry_br_transaction',
                id: taxresultObj['sourceid'],
                isDynamic: false
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_related_id',
                value: String(paymentId)
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_transaction',
                value: String(paymentId)
            });


            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_base_amount',
                value: round4(taxresultObj['baseAmount'])
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_total',
                value: round4(taxresultObj['fxamount'])
            });


            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_total_base_currency',
                value: round4(taxresultObj['amount'])
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_base_amount_local_currc',
                value: taxresultObj['locCurrBaseAmount']
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_amount_local_currency',
                value: taxresultObj['amount']
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_related_applied_transact',
                value: taxresultObj['idapplytransaction']
            });


            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_accounting_books',
                value: accountingBookString
            });

            if (taxresultObj["installmentnumber"]) {
                recordTaxResult.setValue({
                    fieldId: "custrecord_lmry_related_installm_num",
                    value: taxresultObj["installmentnumber"]
                });
            }

            var idtaxresult = recordTaxResult.save({
                ignoreMandatoryFields: true,
                disableTriggers: true,
                enableSourcing: true
            });

            log.debug('idtaxresult', idtaxresult);
        }

        function saveWhtTaxResults(paymentId, accBookString, taxResultObj) {
            var recordTaxResult = record.create({
                type: 'customrecord_lmry_br_transaction'
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_related_id',
                value: String(paymentId)
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_transaction',
                value: String(paymentId)
            });

            recordTaxResult.setValue({
                fieldId: "custrecord_lmry_related_applied_transact",
                value: taxResultObj.transactionId
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_type',
                value: taxResultObj.subType
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_type_id',
                value: taxResultObj.subTypeId
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_base_amount',
                value: round4(taxResultObj.baseAmount)
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_total',
                value: round4(taxResultObj.whtAmount)
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_total_base_currency',
                value: round4(taxResultObj.locCurrAmount)
            });


            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_percent',
                value: taxResultObj.taxRate
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_total_item',
                value: taxResultObj.type
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_item',
                value: taxResultObj.itemId
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_positem',
                value: taxResultObj.position
            });

            var fieldIdRecord = "";
            if (taxResultObj.recordType == "cc") {
                fieldIdRecord = "custrecord_lmry_ccl";
            } else if (taxResultObj.recordType == "nt") {
                fieldIdRecord = "custrecord_lmry_ntax";
            }

            recordTaxResult.setValue({
                fieldId: fieldIdRecord,
                value: taxResultObj.recordId
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_ccl',
                value: String(taxResultObj.recordId)
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_accounting_books',
                value: accBookString
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_tax_type',
                value: TAX_TYPE
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_receta',
                value: taxResultObj.receita
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_regimen_asoc_catalog',
                value: taxResultObj.regimenCatalog
            });

            if (recordTaxResult.getField({ fieldId: 'custrecord_lmry_base_amount_local_currc' })) {
                recordTaxResult.setValue({
                    fieldId: 'custrecord_lmry_base_amount_local_currc',
                    value: taxResultObj.locCurrBaseAmount
                });
            }

            if (recordTaxResult.getField({ fieldId: 'custrecord_lmry_amount_local_currency' })) {
                recordTaxResult.setValue({
                    fieldId: 'custrecord_lmry_amount_local_currency',
                    value: taxResultObj.locCurrAmount
                });
            }


            if (recordTaxResult.getField({ fieldId: 'custrecord_lmry_lineuniquekey' })) {
                recordTaxResult.setValue({
                    fieldId: 'custrecord_lmry_lineuniquekey',
                    value: taxResultObj.lineUniqueKey
                });
            }

            if (taxResultObj.grossAmt || typeof taxResultObj.grossAmt == "number") {
                recordTaxResult.setValue({ fieldId: "custrecord_lmry_gross_amt", value: taxResultObj.grossAmt });
            }

            if (taxResultObj.discAmt || typeof taxResultObj.discAmt == "number") {
                recordTaxResult.setValue({ fieldId: "custrecord_lmry_discount_amt", value: taxResultObj.discAmt });
            }

            if (taxResultObj.locCurrGrossAmt || typeof taxResultObj.locCurrGrossAmt == "number") {
                recordTaxResult.setValue({ fieldId: "custrecord_lmry_gross_amt_local_curr", value: taxResultObj.locCurrGrossAmt });
            }

            if (taxResultObj.locCurrDiscAmt || typeof taxResultObj.locCurrDiscAmt == "number") {
                recordTaxResult.setValue({ fieldId: "custrecord_lmry_discount_amt_local_curr", value: taxResultObj.locCurrDiscAmt });
            }

            recordTaxResult.setValue({ fieldId: "custrecord_lmry_is_export_tax_result", value: taxResultObj.isExport || false });
            recordTaxResult.setValue({ fieldId: "custrecord_lmry_br_apply_report", value: taxResultObj.isApplyReport || false });

            if (taxResultObj.installmentNumber) {
                recordTaxResult.setValue({ fieldId: "custrecord_lmry_related_installm_num", value: taxResultObj.installmentNumber });
            }

            var trId = recordTaxResult.save({
                ignoreMandatoryFields: true,
                disableTriggers: true,
                enableSourcing: true
            });
            return trId;
        }

        function createReclassJournalEntry(idPayment, paymentObj, paymentTaxResults, setupTax, featureGroup) {
            var idjournal = '';
            var reclassSubtypes = setupTax.reclassSubtypes;
            var form = setupTax.journalform;
            if (form) {
                if (paymentTaxResults.length) {

                    var FEAT_DPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
                    var FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });
                    var FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });

                    var subsidiary = paymentObj.subsidiary;
                    var customer = paymentObj.customer;
                    var currency = paymentObj.currency;
                    var postingperiod = paymentObj.period;
                    var exchangerate = paymentObj.exchangerate;
                    var trandate = paymentObj.date;
                    trandate = format.parse({ value: trandate, type: format.Type.DATE });
                    var department = paymentObj.department;
                    var class_ = paymentObj["class"];
                    var location = paymentObj.location;


                    //Se obtienen las cuentas de reclasificacion por subtype
                    var reclassAccounts = getReclassAccounts(subsidiary, reclassSubtypes);
                    log.debug('reclassAccounts', JSON.stringify(reclassAccounts));

                    //Se obtienen las cuentas actuales de retencion por subtype.
                    var subtypeAccounts = getSubtypeAccounts(paymentTaxResults);
                    log.debug('subtypeAccounts', JSON.stringify(subtypeAccounts));

                    if (Object.keys(reclassAccounts).length && Object.keys(subtypeAccounts).length) {
                        var journalRecord = record.create({
                            type: 'journalentry',
                            isDynamic: true
                        });

                        journalRecord.setValue("customform", form);
                        journalRecord.setValue('subsidiary', subsidiary);


                        journalRecord.setValue('trandate', trandate);
                        if (postingperiod) {
                            journalRecord.setValue("postingperiod", postingperiod);
                        }

                        journalRecord.setValue('currency', currency);
                        journalRecord.setValue('exchangerate', exchangerate);
                        journalRecord.setValue('custbody_lmry_reference_transaction', idPayment);
                        journalRecord.setValue("custbody_lmry_reference_transaction_id", idPayment);
                        journalRecord.setValue('memo', MEMO_RECLASS);

                        if ((FEAT_DPT == "T" || FEAT_DPT == true) && Number(department)) {
                            journalRecord.setValue('department', department);
                        }

                        if ((FEAT_CLASS == "T" || FEAT_CLASS == true) && Number(class_)) {
                            journalRecord.setValue('class', class_);
                        }

                        if ((FEAT_LOC == "T" || FEAT_LOC == true) && Number(location)) {
                            journalRecord.setValue('location', location);
                        }


                        var approvalFeature = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });

                        if (approvalFeature && journalRecord.getField({ fieldId: 'approvalstatus' })) {
                            journalRecord.setValue('approvalstatus', 2);
                        }

                        var whtLines = [];

                        paymentTaxResults.forEach(function (tr) {
                            var subType = tr.subtypeid;
                            var whtAmount = tr.fxamount || 0.00;
                            var invoiceId = tr.idapplytransaction;

                            var memo = tr.subtype + ' (Reclassification - WHT) -' + invoiceId;

                            if (tr.installmentnumber) {
                                memo = memo + "-" + tr.installmentnumber;
                            }

                            var whtLineObj = null;

                            if (featureGroup) {
                                var foundLines = whtLines.filter(function (line) {
                                    return line.subType == subType;
                                });
                                whtLineObj = foundLines[0];

                                if (whtLineObj) {
                                    whtLineObj.whtAmount = whtLineObj.whtAmount + whtAmount;
                                } else {
                                    whtLines.push({
                                        whtAmount: whtAmount,
                                        subType: subType,
                                        memo: memo,
                                        invoiceId: invoiceId
                                    });
                                }
                            } else {
                                whtLines.push({
                                    whtAmount: whtAmount,
                                    subType: subType,
                                    memo: memo,
                                    invoiceId: invoiceId
                                });
                            }

                        });
                        

                        whtLines.forEach(function (line) {
                            var subtype = line.subType;
                            var invoiceId = line.invoiceId;
                            var memo = line.memo;

                            if (subtypeAccounts[String(subtype)] && reclassAccounts[String(subtype)]) {
                                var accountcredit = subtypeAccounts[String(subtype)];
                                var accountdebit = reclassAccounts[String(subtype)]['account'];
                                if (accountcredit && accountdebit) {
                                    var amount = line.whtAmount;
                                    amount = round2(amount);
                                    if (amount) {
                                        //Credit
                                        journalRecord.selectNewLine({ sublistId: 'line' });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accountcredit });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: amount });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_pe_transaction_reference', value: invoiceId });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: memo });

                                        if ((FEAT_DPT == "T" || FEAT_DPT == true) && department) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: department });
                                        }

                                        if ((FEAT_CLASS == "T" || FEAT_CLASS == true) && class_) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: class_ });
                                        }

                                        if ((FEAT_LOC == "T" || FEAT_LOC == true) && location) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: location });
                                        }

                                        journalRecord.commitLine({ sublistId: 'line' });


                                        //Debit
                                        journalRecord.selectNewLine({ sublistId: 'line' });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accountdebit });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: amount });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_pe_transaction_reference', value: invoiceId });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: memo });

                                        if ((FEAT_DPT == "T" || FEAT_DPT == true) && department) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: department });
                                        }

                                        if ((FEAT_CLASS == "T" || FEAT_CLASS == true) && class_) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: class_ });
                                        }

                                        if ((FEAT_LOC == "T" || FEAT_LOC == true) && location) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: location });
                                        }

                                        journalRecord.commitLine({ sublistId: 'line' });
                                    }
                                }
                            }

                        });


                        var FEAT_MULTIBOOK = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });
                        if (FEAT_MULTIBOOK == true || FEAT_MULTIBOOK == "T") {
                            var accountingBooks = paymentObj["books"];
                            var numBooks = journalRecord.getLineCount({ sublistId: "accountingbookdetail" });
                            for (var i = 0; i < numBooks; i++) {
                                journalRecord.selectLine({ sublistId: "accountingbookdetail", line: i });
                                var bookId = journalRecord.getCurrentSublistValue({ sublistId: "accountingbookdetail", fieldId: "bookid" });
                                bookId = String(bookId);
                                if (accountingBooks.hasOwnProperty(bookId) && accountingBooks[bookId].exchangeRate) {
                                    var bookExchangeRate = accountingBooks[bookId].exchangeRate;
                                    bookExchangeRate = parseFloat(bookExchangeRate);
                                    journalRecord.setCurrentSublistValue({ sublistId: "accountingbookdetail", fieldId: "exchangerate", value: bookExchangeRate });
                                }
                            }
                        }


                        if (journalRecord.getLineCount({ sublistId: "line" })) {
                            idjournal = journalRecord.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true,
                                disableTriggers: true
                            });
                        }
                    }
                }
            }

            return idjournal;
        }

        function getInvoiceAmounts(idInvoice) {
            var invoiceObj = {};

            var columns = [
                "internalid",
                "fxamount",
                "applyingtransaction",
                "applyingTransaction.fxamount"
            ];

            var FEAT_INSTALLMENTS = runtime.isFeatureInEffect({ feature: "installments" });
            if (FEAT_INSTALLMENTS == true || FEAT_INSTALLMENTS == "T") {
                columns.push("installment.installmentnumber", "installment.fxamount");
            }

            var searchWHT = search.create({
                type: "invoice",
                filters:
                    [
                        ["internalid", "anyof", idInvoice], "AND",
                        ["applyingtransaction.type", "anyof", "CustCred"], "AND",
                        ["applyingtransaction.memomain", "startswith", MEMO_WHT], "AND",
                        ["applyingtransaction.mainline", "is", "T"]
                    ],
                columns: columns,
                settings: [search.createSetting({ name: 'consolidationtype', value: 'NONE' })]
            });

            var results = searchWHT.run().getRange(0, 10);
            if (results && results.length) {
                var total = results[0].getValue("fxamount") || 0.00;
                var whtAmount = results[0].getValue({ name: "fxamount", join: "applyingtransaction" }) || 0.00;
                invoiceObj["total"] = parseFloat(total);
                invoiceObj["whtAmount"] = Math.abs(parseFloat(whtAmount));
                var idCreditMemo = results[0].getValue("applyingtransaction");

                var numberInstallments = 0;
                if (FEAT_INSTALLMENTS == "T" || FEAT_INSTALLMENTS == true) {
                    for (var i = 0; i < results.length; i++) {
                        var installmentNumber = results[i].getValue({ name: "installmentnumber", join: "installment" }) || "";
                        if (installmentNumber) {
                            var installmentTotal = results[i].getValue({ name: "fxamount", join: "installment" }) || 0.00;
                            invoiceObj[String(installmentNumber)] = { "total": parseFloat(installmentTotal) };
                            numberInstallments++;
                        }
                    }
                }

                if (numberInstallments && idCreditMemo) {
                    var whtRecord = record.load({
                        type: "creditmemo",
                        id: idCreditMemo
                    });

                    var numApply = whtRecord.getLineCount({ sublistId: "apply" });

                    for (var i = 0; i < numApply; i++) {
                        var internalid = whtRecord.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
                        var installmentNumber = whtRecord.getSublistValue({ sublistId: "apply", fieldId: "installmentnumber", line: i });
                        var amount = whtRecord.getSublistValue({ sublistId: "apply", fieldId: "amount", line: i }) || 0.00;
                        var isApplied = whtRecord.getSublistValue({ sublistId: "apply", fieldId: "apply", line: i });

                        if ((isApplied == true || isApplied == "T") && installmentNumber && invoiceObj[String(installmentNumber)]) {
                            invoiceObj[String(installmentNumber)]["whtAmount"] = parseFloat(amount);
                        }
                    }
                }
            }

            return invoiceObj;
        }


        function deleteExportWhtCreditMemos(paymentObj) {
            var paymentId = paymentObj.id;
            if (paymentId) {
                var creditMemoSearch = search.create({
                    type: "creditmemo",
                    filters: [
                        ["mainline", "is", "T"], "AND",
                        ["memo", "is", MEMO_EXPORT_WHT], "AND",
                        ["custbody_lmry_apply_transaction", "anyof", paymentId]
                    ],
                    columns: ["internalid"]
                });

                var results = creditMemoSearch.run().getRange(0, 1000);
                for (var i = 0; i < results.length; i++) {
                    var id = results[i].getValue("internalid");
                    log.debug("export Credit ID", id);
                    record.delete({
                        type: "creditmemo",
                        id: id
                    });
                }
            }
        }

        function getPaymentLocalExchangeRate(setupTax, paymentObj) {
            var exchangeRate = paymentObj.exchangerate;
            var currency = paymentObj.currency;
            currency = Number(currency);
            var localCurrency = setupTax.currency;
            localCurrency = Number(localCurrency);

            var subsidiaryCurrency = search.lookupFields({
                type: "subsidiary",
                id: paymentObj.subsidiary,
                columns: ["currency"]
            }).currency[0].value;
            subsidiaryCurrency = Number(subsidiaryCurrency);

            if (subsidiaryCurrency == localCurrency) {
                return exchangeRate;
            } else {
                var FEAT_MULTIBOOK = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });
                if ((FEAT_MULTIBOOK == true || FEAT_MULTIBOOK == "T") && paymentObj.books) {
                    var bookIds = Object.keys(paymentObj.books);
                    if (bookIds.length) {
                        var bookSearch = search.create({
                            type: "accountingbook",
                            filters:
                                [
                                    ["internalid", "anyof", bookIds], "AND",
                                    ["status", "anyof", "ACTIVE"], "AND",
                                    ["currency", "anyof", localCurrency]
                                ],
                            columns: ["internalid", "currency"]
                        });

                        var results = bookSearch.run().getRange(0, 10);
                        if (results && results.length) {
                            var bookId = results[0].getValue("internalid");
                            bookId = String(bookId);
                            if (paymentObj.hasOwnProperty(bookId)) {
                                return parseFloat(paymentObj[bookId].exchangeRate);
                            }
                        }

                    }
                }
            }
            return exchangeRate;
        }

        function updateInstallmentWhtTaxFields(transactions) {
            var whtInvoices = {};
            for (var key in transactions) {
                var invoiceId = key.split("-")[0];
                var installmentNum = key.split("-")[1];
                if (installmentNum) {
                    if (!whtInvoices.hasOwnProperty(invoiceId)) {
                        whtInvoices[invoiceId] = { whtTotal: 0.00 };
                    }
                    whtInvoices[invoiceId].whtTotal = round2(whtInvoices[invoiceId].whtTotal + round2(transactions[key].whtAmt || 0.00));
                }
            }

            var invoiceKeys = Object.keys(whtInvoices);
            if (invoiceKeys.length) {
                var invoiceSearch = search.create({
                    type: "invoice",
                    filters: [
                        ["internalid", "anyof", invoiceKeys], "AND",
                        ["mainline", "is", "T"]
                    ],
                    columns: ["internalid", "custbody_lmry_wtax_amount"]
                });

                var results = invoiceSearch.run().getRange(0, 1000);
                if (results) {
                    for (var i = 0; i < results.length; i++) {
                        var id = results[i].getValue("internalid");
                        var previousWht = results[i].getValue("custbody_lmry_wtax_amount") || 0.00;
                        previousWht = parseFloat(previousWht);
                        if (whtInvoices.hasOwnProperty(id)) {
                            whtInvoices[id].whtTotal = round2((whtInvoices[id].whtTotal || 0.00) + round2(previousWht));
                        }
                    }

                    for (var invoiceId in whtInvoices) {
                        if (whtInvoices[invoiceId].whtTotal) {
                            record.submitFields({
                                type: "invoice",
                                id: invoiceId,
                                values: {
                                    'custbody_lmry_wtax_amount': whtInvoices[invoiceId].whtTotal,
                                    'custbody_lmry_wtax_code_des': WHT_MEMO
                                },
                                options: {
                                    disableTriggers: true
                                }
                            });
                        }
                    }
                }
            }
        }

        function round2(num) {
            var e = (num >= 0) ? 1e-6 : -1e-6;
            return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
        }

        function round4(num) {
            var e = (num >= 0) ? 1e-6 : -1e-6;
            return parseFloat(Math.round(parseFloat(num) * 1e4 + e) / 1e4);
        }

        function inactiveCustPaymentLog(idPayment) {
            var dataPaymentLog = search.create({
                type: "customrecord_lmry_br_custpayment_log",
                filters:
                    [
                        ["isinactive", "is", "F"],
                        "AND",
                        ["custrecord_lmry_br_custpaym_log_idpaymt", "anyof", idPayment]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            });
            var resultPaymentLog = dataPaymentLog.run().getRange(0, 1);
            if (resultPaymentLog.length > 0) {
                var idPaymentLog = resultPaymentLog[0].getValue("internalid");
                record.submitFields({
                    type: "customrecord_lmry_br_custpayment_log",
                    id: idPaymentLog,
                    values: {
                        "isinactive": true
                    },
                    options: {
                        disableTriggers: true
                    }
                });
            }
        }

        return {
            voidPayment: voidPayment,
            beforeDeletePayment: beforeDeletePayment,
            deleteOtherChargesTransactions: deleteOtherChargesTransactions,
            createPayment: createPayment,
            getAccountingBooksString: getAccountingBooksString,
            getSetupTaxSubsidiary: getSetupTaxSubsidiary,
            crearNotaDebitoInteresMulta: crearNotaDebitoInteresMulta,
            updatePaymentAmounts: updatePaymentAmounts,
            updateBRTransactionFields: updateBRTransactionFields,
            getReclassWhtTaxResults: getReclassWhtTaxResults,
            createReclassJournalEntry: createReclassJournalEntry,
            saveReclassWhtTaxResult: saveReclassWhtTaxResult,
            saveWhtTaxResults: saveWhtTaxResults,
            getPaymentLocalExchangeRate: getPaymentLocalExchangeRate,
            updateInstallmentWhtTaxFields: updateInstallmentWhtTaxFields,
            createDiscount: createDiscount
        };

    });

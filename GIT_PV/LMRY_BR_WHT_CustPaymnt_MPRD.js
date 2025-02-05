/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for Tools for Report                           ||
||                                                              ||
||  File Name: LMRY_BR_WHT_CustPaymnt_MPRD.js	                ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Apr 06 2020  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 *@NApiVersion 2.0
 *@NScriptType MapReduceScript
  *@NModuleScope Public

 */
define(['N/log', 'N/search', 'N/record', 'N/runtime', 'N/format', 'N/cache', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0',
    './WTH_Library/LMRY_BR_WHT_CustPaymnt_LBRY', './WTH_Library/LMRY_BR_Export_Withholding_Sales_LBRY_V2.0', './WTH_Library/LMRY_BR_WHT_ON_Payment_LBRY_V2.0',
    './Latam_Library/LMRY_Log_LBRY_V2.0'],
    function (log, search, record, runtime, format, cache, library_mail, lbryBRPayment, libExportWHT, libWhtPayment, lbryLog) {

        var LMRY_script = 'LatamReady - BR WHT Customer Payment MPRD';
        function getInputData() {
            var idLog = "";
            try {
                var mrCache = cache.getCache({
                    name: "lmry_br_custpayment_mr_cache",
                    scope: cache.Scope.PRIVATE
                });

                mrCache.remove({
                    key: "paymentParams"
                });

                mrCache.remove({
                    key: "setupTaxSubsidiary"
                });

                idLog = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_br_custpayment_log' });
                var paymentParams = mrCache.get({
                    key: "paymentParams",
                    loader: getParametersFromLog
                });
                log.debug("paymentParams", paymentParams);
                paymentParams = JSON.parse(paymentParams);

                var setupTaxLoader = lbryBRPayment.getSetupTaxSubsidiary.bind(null, paymentParams['subsidiary']);
                var setupTax = mrCache.get({
                    key: "setupTaxSubsidiary",
                    loader: setupTaxLoader,
                });
                log.debug("setupTax", setupTax);

                return paymentParams.transactions;

            } catch (err) {
                library_mail.sendemail('[ getInputData ]' + err, LMRY_script);
                if (idLog) {
                    record.submitFields({
                        type: "customrecord_lmry_br_custpayment_log",
                        id: idLog,
                        values: {
                            "custrecord_lmry_br_custpaym_log_status": "3"
                        },
                        options: {
                            disableTriggers: true
                        }
                    });
                }
                lbryLog.doLog({ title: "[ getInputData ]", message: err });
            }
        }

        function map(context) {
            try {
                var key = context.key;
                log.debug("key", key);
                key = key.split("-");

                var invoiceId = key[0];
                var installmentNum = key[1] || "";

                var mapValues = JSON.parse(context.value);
                log.debug('mapValues', JSON.stringify(mapValues));

                var amountPaid = parseFloat(mapValues['amountpaid']);
                var interest = parseFloat(mapValues["interest"]);
                var penalty = parseFloat(mapValues["penalty"]);
                var advance = parseFloat(mapValues["advance"]) || 0;
                //var primerPago = mapValues['primerpago'];
                var discount = parseFloat(mapValues["discount"]);

                var mrCache = cache.getCache({
                    name: "lmry_br_custpayment_mr_cache",
                    scope: cache.Scope.PRIVATE
                });

                var paymentParams = mrCache.get({
                    key: "paymentParams",
                    loader: getParametersFromLog
                });

                log.debug("paymentParams", paymentParams);
                paymentParams = JSON.parse(paymentParams);

                var setupTax = mrCache.get({
                    key: "setupTaxSubsidiary",
                    loader: lbryBRPayment.getSetupTaxSubsidiary.bind(null, paymentParams.subsidiary)
                });
                log.debug("setupTax", setupTax);
                setupTax = JSON.parse(setupTax);

                var firstPayment = paymentParams['firstpayment'];

                var localExchangeRate = lbryBRPayment.getPaymentLocalExchangeRate(setupTax, paymentParams);
                log.debug("localExchangeRate", localExchangeRate);

                var reclassTaxResults = lbryBRPayment.getReclassWhtTaxResults(invoiceId, installmentNum, amountPaid, firstPayment, setupTax, localExchangeRate, advance);
                log.debug('reclassTaxResults', JSON.stringify(reclassTaxResults));

                //Se crea el invoice de Interes y Multas
                var notaDebitoId = lbryBRPayment.crearNotaDebitoInteresMulta(invoiceId, installmentNum, paymentParams, interest, penalty, setupTax);
                log.debug("notaDebitoId", notaDebitoId);

                var exportWht = 0.00, creditMemos = [], whtTaxResults = [];

                var licenses = library_mail.getLicenses(paymentParams.subsidiary);
                var whtAmt = 0.00;
                if (library_mail.getAuthorization(847, licenses)) {
                    var whtResult = libWhtPayment.calculateBrWhtOnPayment(invoiceId, installmentNum, amountPaid, paymentParams, setupTax, localExchangeRate) || 0.00;
                    log.debug("whtResult", JSON.stringify(whtResult));
                    whtAmt = whtResult.totalWhtAmt || 0.00;
                    whtTaxResults = whtTaxResults.concat(whtResult.taxResults || []);
                    if (whtResult.creditMemoId) {
                        creditMemos.push(whtResult.creditMemoId);
                    }
                }

                if (library_mail.getAuthorization(719, licenses)) {
                    var exportResult = libExportWHT.calculateBrExportWHT(invoiceId, installmentNum, amountPaid, paymentParams, setupTax, localExchangeRate) || 0.00;
                    log.debug("exportResult", JSON.stringify(exportResult));
                    exportWht = exportResult.totalWhtAmt || 0.00;
                    whtTaxResults = whtTaxResults.concat(exportResult.taxResults || []);
                    if (exportResult.creditMemoId) {
                        creditMemos.push(exportResult.creditMemoId);
                    }
                }

                //C0815
                if(discount && discount!=0 && setupTax.enableDiscount){
                    lbryBRPayment.createDiscount(paymentParams,invoiceId,setupTax,discount);
                }

                context.write({
                    key: paymentParams.customer,
                    value: {
                        invoiceId: invoiceId, installmentNum: installmentNum, notaDebitoId: notaDebitoId, reclassTaxResults: reclassTaxResults,
                        whtTaxResults: whtTaxResults, exportWht: exportWht, whtAmt: whtAmt, creditMemos: creditMemos
                    }
                });

            } catch (err) {
                log.error('[ map ]', err);
                library_mail.sendemail('[ map ]' + err, LMRY_script);
                lbryLog.doLog({ title: "[ map ]", message: err });
            }
        }

        function reduce(context) {
            try {
                var reduceValues = context.values;
                log.debug('reduceValues', JSON.stringify(reduceValues));


                var mrCache = cache.getCache({
                    name: "lmry_br_custpayment_mr_cache"
                });

                var paymentParams = mrCache.get({
                    key: "paymentParams",
                    loader: getParametersFromLog
                });

                log.debug("paymentParams", paymentParams);
                paymentParams = JSON.parse(paymentParams);

                var setupTax = mrCache.get({
                    key: "setupTaxSubsidiary",
                    loader: lbryBRPayment.getSetupTaxSubsidiary.bind(null, paymentParams.subsidiary)
                });
                log.debug("setupTax", setupTax);
                setupTax = JSON.parse(setupTax);

                var transactions = paymentParams.transactions;

                var notaDebitos = {}, taxResults = [], creditMemos = [], reclassTaxResults = [];
                for (var i = 0; i < reduceValues.length; i++) {
                    if (reduceValues[i]) {
                        var obj = JSON.parse(reduceValues[i]);
                        var invoiceId = obj.invoiceId;
                        invoiceId = String(invoiceId);
                        var installmentNum = obj.installmentNum || "";
                        var notaDebitoId = obj.notaDebitoId || "";
                        notaDebitoId = String(notaDebitoId);

                        var exportWht = obj.exportWht || 0.00;
                        exportWht = parseFloat(exportWht);

                        var whtAmt = obj.whtAmt || 0.00;

                        if (invoiceId) {
                            var key = invoiceId;
                            if (installmentNum) {
                                key = invoiceId + "-" + installmentNum;
                            }

                            if (transactions.hasOwnProperty(key)) {
                                var interest = transactions[key].interest || 0.00;
                                interest = parseFloat(interest);
                                var penalty = transactions[key].penalty || 0.00;
                                penalty = parseFloat(penalty);

                                transactions[key].whtAmt = round2(parseFloat(whtAmt) + parseFloat(exportWht));

                                if (notaDebitoId) {
                                    notaDebitos[notaDebitoId] = { amount: round2(interest) + round2(penalty) };
                                }

                                taxResults = taxResults.concat(obj.whtTaxResults || []);
                                reclassTaxResults = reclassTaxResults.concat(obj.reclassTaxResults || []);
                                creditMemos = creditMemos.concat(obj.creditMemos || []);
                            }
                        }
                    }
                }

                log.debug("notaDebitos", JSON.stringify(notaDebitos));
                log.debug("taxResults", JSON.stringify(taxResults));
                log.debug("creditMemos", JSON.stringify(creditMemos));

                var paymentId = lbryBRPayment.createPayment(paymentParams, transactions, notaDebitos, setupTax.paymentform, '0');
                log.debug("paymentId", paymentId);
                var idLog = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_br_custpayment_log' });
                record.submitFields({
                    type: "customrecord_lmry_br_custpayment_log",
                    id: idLog,
                    values: {
                        "custrecord_lmry_br_custpaym_log_idpaymt": paymentId
                    },
                    options: {
                        disableTriggers: true
                    }
                });


                var licenses = library_mail.getLicenses(paymentParams.subsidiary);
                var FEAT_SUMMARY_WHT = library_mail.getAuthorization(1003, licenses);

                var journalId = lbryBRPayment.createReclassJournalEntry(paymentId, paymentParams, reclassTaxResults, setupTax, FEAT_SUMMARY_WHT);
                log.debug('journalId', journalId);

                var accountingBookString = lbryBRPayment.getAccountingBooksString(paymentId);

                for (var i = 0; i < reclassTaxResults.length; i++) {
                    lbryBRPayment.saveReclassWhtTaxResult(paymentId, accountingBookString, reclassTaxResults[i]);
                }

                for (var i = 0; i < taxResults.length; i++) {
                    lbryBRPayment.saveWhtTaxResults(paymentId, accountingBookString, taxResults[i]);
                }


                var FEAT_INSTALLMENTS = runtime.isFeatureInEffect({ feature: "installments" });
                if (FEAT_INSTALLMENTS == true || FEAT_INSTALLMENTS == "T") {
                    lbryBRPayment.updateInstallmentWhtTaxFields(transactions);
                }

                lbryBRPayment.updateBRTransactionFields(transactions);

                for (var i = 0; i < creditMemos.length; i++) {
                    record.submitFields({
                        type: "creditmemo",
                        id: creditMemos[i],
                        values: {
                            custbody_lmry_apply_transaction: paymentId
                        },
                        options: {
                            disableTriggers: true,
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        }
                    });
                }


                //Se guarda el Payment para actualizar el GL Impact
                var paymentRecord = record.load({
                    type: "customerpayment",
                    id: paymentId
                });

                paymentRecord.setValue("custbody_lmry_br_amount_advance", "1");

                paymentRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true,
                    disableTriggers: true
                });

                context.write({
                    key: paymentId,
                    value: {
                        isSuccess: 'T'
                    }
                });

            } catch (err) {
                log.error('[ reduce ]', err);
                library_mail.sendemail('[ reduce ]' + err, LMRY_script);
                var idLog = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_br_custpayment_log' });
                if (idLog) {
                    record.submitFields({
                        type: "customrecord_lmry_br_custpayment_log",
                        id: idLog,
                        values: {
                            "custrecord_lmry_br_custpaym_log_status": "3"
                        },
                        options: {
                            disableTriggers: true
                        }
                    });
                    lbryLog.doLog({ title: "[ reduce ]", message: err });
                }
            }
        }


        function summarize(context) {
            try {
                var totalRows = 0, totalSuccess = 0;
                var payments = [];
                context.output.iterator().each(function (key, value) {
                    var objValue = JSON.parse(value);
                    var isSuccess = objValue.isSuccess;
                    if (isSuccess == 'T') {
                        payments.push(key);
                        totalSuccess++;
                    }
                    totalRows++;
                    return true;
                });

                log.debug('stage', 'Summary');
                log.debug('totalRows', totalRows);
                log.debug('totalSuccess', totalSuccess);
                log.debug('payments', payments);

                var idLog = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_br_custpayment_log' });
                var idpayment = payments[0] || '';
                var status = (idpayment) ? '2' : '3';

                record.submitFields({
                    type: 'customrecord_lmry_br_custpayment_log',
                    id: idLog,
                    values: {
                        'custrecord_lmry_br_custpaym_log_status': status,
                    },
                    options: {
                        disableTriggers: true
                    }
                });
            }
            catch (err) {
                library_mail.sendemail('[ summarize ]' + err, LMRY_script);
                var idLog = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_br_custpayment_log' });
                if (idLog) {
                    record.submitFields({
                        type: "customrecord_lmry_br_custpayment_log",
                        id: idLog,
                        values: {
                            "custrecord_lmry_br_custpaym_log_status": "3"
                        },
                        options: {
                            disableTriggers: true
                        }
                    });
                }
                lbryLog.doLog({ title: "[ summarize ]", message: err });
            }
        }

        function getParametersFromLog() {
            var logId = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_br_custpayment_log' });
            var params = {};

            var FEAT_DPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
            var FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });
            var FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });

            var columns = [
                'custrecord_lmry_br_custpaym_log_subsid', 'custrecord_lmry_br_custpaym_customer', 'custrecord_lmry_br_custpaym_log_date',
                'custrecord_lmry_br_custpaym_log_employee', 'custrecord_lmry_br_custpaym_log_currency', 'custrecord_lmry_br_custpaym_log_aracc',
                'custrecord_lmry_br_custpaym_log_bankacc', 'custrecord_lmry_br_custpaym_log_period', 'custrecord_lmry_br_custpaym_log_data',
                'custrecord_lmry_br_custpaym_log_doctype', 'custrecord_lmry_br_custpaym_log_memo', 'custrecord_lmry_br_custpaym_log_segments',
                "custrecord_lmry_br_custpaym_log_paymmeth", 'custrecord_lmry_br_custpaym_log_advance', 'custrecord_lmry_br_custpaym_log_firstpay',
                "custrecord_lmry_br_custpaym_exchangerate", "custrecord_lmry_br_custpaym_accountbooks", "custrecord_lmry_br_custpaym_log_idpaymt"
            ];

            if (FEAT_DPT == 'T' || FEAT_DPT == true) {
                columns.push('custrecord_lmry_br_custpaym_log_deparmen');
            }

            if (FEAT_CLASS == 'T' || FEAT_CLASS == true) {
                columns.push('custrecord_lmry_br_custpaym_log_class');
            }

            if (FEAT_LOC == 'T' || FEAT_LOC == true) {
                columns.push('custrecord_lmry_br_custpaym_log_location');
            }

            var result = search.lookupFields({
                type: 'customrecord_lmry_br_custpayment_log',
                id: logId,
                columns: columns
            });


            params['customer'] = result['custrecord_lmry_br_custpaym_customer'][0]['value'];
            params['subsidiary'] = result['custrecord_lmry_br_custpaym_log_subsid'][0]['value'];
            var date = result['custrecord_lmry_br_custpaym_log_date'];
            //date = format.parse({ value: date, type: format.Type.DATE });
            params['date'] = date;

            params['currency'] = result['custrecord_lmry_br_custpaym_log_currency'][0]['value'];
            var exchangeRate = result["custrecord_lmry_br_custpaym_exchangerate"];
            params['exchangerate'] = parseFloat(exchangeRate);

            params['araccount'] = result['custrecord_lmry_br_custpaym_log_aracc'][0]['value'];

            var undepfunds = 'T';
            var bankaccount = result['custrecord_lmry_br_custpaym_log_bankacc'] || '';
            if (bankaccount && bankaccount.length) {
                undepfunds = 'F';
                params['bankaccount'] = result['custrecord_lmry_br_custpaym_log_bankacc'][0]['value'];
            }
            params['undepfunds'] = undepfunds;

            params['period'] = result['custrecord_lmry_br_custpaym_log_period'][0]['value'];

            var document = result['custrecord_lmry_br_custpaym_log_doctype'] || '';
            if (document && document.length) {
                params['document'] = document[0]['value'];
            }

            var department = result['custrecord_lmry_br_custpaym_log_deparmen'] || '';
            if (department && department.length) {
                params['department'] = department[0]['value'];
            }

            var class_ = result['custrecord_lmry_br_custpaym_log_class'] || '';

            if (class_ && class_.length) {
                params['class'] = class_[0]['value'];
            }

            var location = result['custrecord_lmry_br_custpaym_log_location'] || '';

            if (location && location.length) {
                params['location'] = location[0]['value'];
            }

            var csegments = result["custrecord_lmry_br_custpaym_log_segments"];
            if (csegments) {
                params["csegments"] = JSON.parse(csegments);
            }

            params['memo'] = result['custrecord_lmry_br_custpaym_log_memo'] || '';

            var paymentmethod = result['custrecord_lmry_br_custpaym_log_paymmeth'];
            if (paymentmethod && paymentmethod.length) {
                params['paymentmethod'] = paymentmethod[0]['value'];
            }
            var strTransactions = result['custrecord_lmry_br_custpaym_log_data'];

            if (strTransactions) {
                params['transactions'] = JSON.parse(strTransactions);
            }

            var advance = result['custrecord_lmry_br_custpaym_log_advance'] || '';
            if (advance) {
                params['advance'] = JSON.parse(advance);
            }

            var firstPayment = result['custrecord_lmry_br_custpaym_log_firstpay'];
            if (firstPayment) {
                params['firstpayment'] = JSON.parse(firstPayment);
            }


            var strBooks = result["custrecord_lmry_br_custpaym_accountbooks"];
            if (strBooks) {
                params["books"] = JSON.parse(strBooks);
            }

            var paymentId = result["custrecord_lmry_br_custpaym_log_idpaymt"];
            if (paymentId && paymentId.length) {
                paymentId = paymentId[0].value;
            }

            if (paymentId) {
                params["paymentId"] = paymentId;
                var bookString = lbryBRPayment.getAccountingBooksString(paymentId);
                params["bookString"] = bookString;
            }

            return params;
        }

        function round2(num) {
            var e = (num >= 0) ? 1e-6 : -1e-6;
            return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });

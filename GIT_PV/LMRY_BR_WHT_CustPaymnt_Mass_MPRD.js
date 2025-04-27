/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for Tools for Report                           ||
||                                                              ||
||  File Name: LMRY_BR_WHT_CustPaymnt_Mass_MPRD.js	            ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Nov 19 2020  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 *@NApiVersion 2.0
 *@NScriptType MapReduceScript
 *@NModuleScope Public
 */
define(['N/log', 'N/search', 'N/record', 'N/runtime', 'N/format', 'N/cache', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './WTH_Library/LMRY_BR_WHT_CustPaymnt_LBRY', './WTH_Library/LMRY_BR_Export_Withholding_Sales_LBRY_V2.0', './WTH_Library/LMRY_BR_WHT_ON_Payment_LBRY_V2.0',
    './Latam_Library/LMRY_Log_LBRY_V2.0'],
    function (log, search, record, runtime, format, cache, library_mail, lbryBRPayment, libExportWHT, libWhtPayment, libLog) {

        var LMRY_script = 'LatamReady - BR WHT Cust Payment Massive MPRD';
        function getInputData() {
            var idLog = "";
            try {
                var transactions = {};
                idLog = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_br_custpaymt_mass_log' });
                log.debug('idlog', idLog);
                var mrCache = cache.getCache({
                    name: "lmry_br_custpayment_mass_mr_cache",
                    scope: cache.Scope.PRIVATE
                });
                mrCache.remove({
                    key: "paymentParams"
                });
                mrCache.remove({
                    key: "setupTaxSubsidiary"
                });

                var params = mrCache.get({
                    key: "paymentParams",
                    loader: getParametersFromLog
                });

                log.debug("params", params);
                if (params) {
                    params = JSON.parse(params);
                    var setupTax = mrCache.get({
                        key: "setupTax",
                        loader: lbryBRPayment.getSetupTaxSubsidiary.bind(null, params.subsidiary)
                    });

                    log.debug("setupTax", setupTax);
                    setupTax = JSON.parse(setupTax);

                    if (params["transactions"] && setupTax['paymentform']) {
                        for (var keyPayment in params["transactions"]) {
                            var keys = keyPayment.split("-");
                            var customer = keys[0] || "";
                            var invoices = params["transactions"][keyPayment];
                            if (customer && invoices && Object.keys(invoices).length) {

                                var paymentObj = util.extend({ customer: customer }, params);

                                // var idpayment = "";
                                // try {
                                //     idpayment = lbryBRPayment.createPayment(paymentObj, invoices, setupTax['paymentform'], '1');
                                //     log.debug("idpayment", idpayment);
                                // } catch (err) {
                                //     log.error("[ createPayment ]", err);
                                //     library_mail.sendemail('[ createPayment ]' + err, LMRY_script);
                                //     libLog.doLog({ title: "[ createPayment ]", message: err, extra: { customer: customer } });
                                // }

                                //paymentObj["idpayment"] = idpayment;
                                var idIndividualLog = createRecordLog(idLog, paymentObj, invoices);
                                for (var idInvoice in invoices) {
                                    transactions[idInvoice] = invoices[idInvoice];
                                    transactions[idInvoice]["customer"] = customer;
                                    //transactions[idInvoice]["idpayment"] = idpayment;
                                    transactions[idInvoice]["idlog"] = idIndividualLog;
                                }

                            }
                        }

                        log.debug('transactions', transactions);
                    }
                }

                return transactions;

            } catch (err) {
                log.error("[ getInputData ]", err);
                library_mail.sendemail('[ getInputData ]' + err, LMRY_script);
                libLog.doLog({ title: "[ getInputData ]", message: err });
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
                var customer = mapValues["customer"];
                var amountPaid = parseFloat(mapValues['amountpaid']);
                var interest = parseFloat(mapValues["interest"]);
                var penalty = parseFloat(mapValues["penalty"]);
                //var advance = parseFloat(mapValues["advance"]);
                //var primerPago = mapValues['primerpago'];
                //C0815
                var discount = parseFloat(mapValues["discount"]);

                var idLog = mapValues["idlog"];

                var mrCache = cache.getCache({
                    name: "lmry_br_custpayment_mass_mr_cache"
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
                paymentParams.customer = customer;

                var localExchangeRate = lbryBRPayment.getPaymentLocalExchangeRate(setupTax, paymentParams);
                log.debug("localExchangeRate", localExchangeRate);

                var reclassTaxResults = lbryBRPayment.getReclassWhtTaxResults(invoiceId, installmentNum, amountPaid, firstPayment, setupTax, localExchangeRate);
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
                if (discount && discount != 0 && setupTax.enableDiscount) {
                    lbryBRPayment.createDiscount(paymentParams, invoiceId, setupTax, discount);
                }

                context.write({
                    key: customer,
                    value: {
                        invoiceId: invoiceId, installmentNum: installmentNum, notaDebitoId: notaDebitoId,
                        reclassTaxResults: reclassTaxResults, whtTaxResults: whtTaxResults,
                        exportWht: exportWht, whtAmt: whtAmt, creditMemos: creditMemos, idLog: idLog
                    }
                });


            } catch (err) {
                log.error('[ map ]', err);
                library_mail.sendemail('[ map ]' + err, LMRY_script);
                libLog.doLog({ title: "[ map ]", message: err });
            }
        }

        function reduce(context) {
            var idLog = "";
            try {
                var customer = context.key;
                var reduceValues = context.values;
                log.debug('reduceValues', JSON.stringify(reduceValues));
                var reduceObj = JSON.parse(reduceValues[0]);
                idLog = reduceObj["idLog"];

                var mrCache = cache.getCache({
                    name: "lmry_br_custpayment_mass_mr_cache"
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

                var currency = paymentParams.currency;
                var totalTransactions = paymentParams.transactions;
                var transactions = totalTransactions[customer + "-" + currency];

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

                            if (transactions && transactions.hasOwnProperty(key)) {
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

                paymentParams.customer = customer;
                var paymentId = lbryBRPayment.createPayment(paymentParams, transactions, notaDebitos, setupTax.paymentform, '1');
                log.debug("paymentId", paymentId);

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
                libLog.doLog({ title: "[ reduce ]", message: err });
            }
        }


        function summarize(context) {
            var idLog = "";
            try {
                idLog = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_br_custpaymt_mass_log' });
                var totalRows = 0, totalSuccess = 0;
                var payments = [];
                context.output.iterator().each(function (key, value) {
                    var objValue = JSON.parse(value);
                    var isSuccess = objValue.isSuccess;
                    if (isSuccess == 'T') {
                        payments.push(Number(key));
                        totalSuccess++;
                    }
                    totalRows++;
                    return true;
                });

                log.debug('stage', 'Summary');
                log.debug('totalRows', totalRows);
                log.debug('totalSuccess', totalSuccess);
                log.debug('payments', payments);

                var searchLogs = search.create({
                    type: "customrecord_lmry_br_custpayment_log",
                    filters: [
                        ["custrecord_lmry_br_custpaym_log_massive", "anyof", idLog]
                    ],
                    columns: ["internalid", "custrecord_lmry_br_custpaym_log_idpaymt"]
                });

                var results = searchLogs.run().getRange(0, 1000);
                for (var i = 0; i < results.length; i++) {
                    var idIndividualLog = results[i].getValue("internalid");
                    var idPayment = results[i].getValue("custrecord_lmry_br_custpaym_log_idpaymt");

                    var status = "3";
                    if (payments.indexOf(Number(idPayment)) != -1) {
                        status = "2";
                    }

                    if (idIndividualLog) {
                        record.submitFields({
                            type: 'customrecord_lmry_br_custpayment_log',
                            id: idIndividualLog,
                            values: {
                                'custrecord_lmry_br_custpaym_log_status': status,
                            },
                            options: {
                                disableTriggers: true
                            }
                        });
                    }
                }
            } catch (err) {
                log.error("[ summarize ]", err);
                library_mail.sendemail('[ summarize ]' + err, LMRY_script);
                libLog.doLog({ title: "[ summarize ]", message: err });
            }
        }

        function getParametersFromLog() {
            var params = {};

            var idlog = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_br_custpaymt_mass_log' });

            var FEAT_DPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
            var FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });
            var FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });

            var columns = [
                'custrecord_lmry_br_custpymt_mass_subsid', 'custrecord_lmry_br_custpymt_mass_date',
                'custrecord_lmry_br_custpymt_mass_emp', 'custrecord_lmry_br_custpymt_mass_aracc',
                'custrecord_lmry_br_custpymt_mass_bankacc', 'custrecord_lmry_br_custpymt_mass_period', 'custrecord_lmry_br_custpymt_mass_data',
                'custrecord_lmry_br_custpymt_mass_doctype', 'custrecord_lmry_br_custpymt_mass_memo', 'custrecord_lmry_br_custpymt_mass_paymeth',
                'custrecord_lmry_br_custpymt_mass_currenc', 'custrecord_lmry_br_custpymt_mass_fstpay', 'custrecord_lmry_br_custpymt_mass_exchrat', 'custrecord_lmry_br_custpymt_mass_acbooks'
            ];

            if (FEAT_DPT == 'T' || FEAT_DPT == true) {
                columns.push('custrecord_lmry_br_custpymt_mass_departm');
            }

            if (FEAT_CLASS == 'T' || FEAT_CLASS == true) {
                columns.push('custrecord_lmry_br_custpymt_mass_class');
            }

            if (FEAT_LOC == 'T' || FEAT_LOC == true) {
                columns.push('custrecord_lmry_br_custpymt_mass_locat');
            }

            var result = search.lookupFields({
                type: 'customrecord_lmry_br_custpymt_mass_log',
                id: idlog,
                columns: columns
            });
            params["userid"] = result["custrecord_lmry_br_custpymt_mass_emp"][0]["value"];
            params['subsidiary'] = result['custrecord_lmry_br_custpymt_mass_subsid'][0]['value'];
            var date = result['custrecord_lmry_br_custpymt_mass_date'];
            params['date'] = date;

            params['currency'] = result['custrecord_lmry_br_custpymt_mass_currenc'][0]['value'];
            var exchangeRate = result["custrecord_lmry_br_custpymt_mass_exchrat"];
            params['exchangerate'] = parseFloat(exchangeRate);
            params['araccount'] = result['custrecord_lmry_br_custpymt_mass_aracc'][0]['value'];

            var undepfunds = 'T';
            var bankaccount = result['custrecord_lmry_br_custpymt_mass_bankacc'] || '';
            if (bankaccount && bankaccount.length) {
                undepfunds = 'F';
                params['bankaccount'] = result['custrecord_lmry_br_custpymt_mass_bankacc'][0]['value'];
            }
            params['undepfunds'] = undepfunds;

            params['period'] = result['custrecord_lmry_br_custpymt_mass_period'][0]['value'];

            var document = result['custrecord_lmry_br_custpymt_mass_doctype'] || '';
            if (document && document.length) {
                params['document'] = document[0]['value'];
            }

            var department = result['custrecord_lmry_br_custpymt_mass_departm'] || '';
            if (department && department.length) {
                params['department'] = department[0]['value'];
            }

            var class_ = result['custrecord_lmry_br_custpymt_mass_class'] || '';

            if (class_ && class_.length) {
                params['class'] = class_[0]['value'];
            }

            var location = result['custrecord_lmry_br_custpymt_mass_locat'] || '';

            if (location && location.length) {
                params['location'] = location[0]['value'];
            }

            params['memo'] = result['custrecord_lmry_br_custpymt_mass_memo'] || '';

            var paymentmethod = result['custrecord_lmry_br_custpymt_mass_paymeth'];
            if (paymentmethod && paymentmethod.length) {
                params['paymentmethod'] = paymentmethod[0]['value'];
            }
            var strTransactions = result['custrecord_lmry_br_custpymt_mass_data'];

            if (strTransactions) {
                params['transactions'] = JSON.parse(strTransactions);
            }

            var firstPayment = result['custrecord_lmry_br_custpymt_mass_fstpay'];
            if (firstPayment) {
                params['firstpayment'] = JSON.parse(firstPayment);
            }

            var books = result["custrecord_lmry_br_custpymt_mass_acbooks"];
            if (books) {
                params["books"] = JSON.parse(books);
            }

            return params;
        }

        function createRecordLog(idParentLog, params, transactions) {
            var recordlog = record.create({
                type: 'customrecord_lmry_br_custpayment_log'
            });

            if (params["subsidiary"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_subsid', value: params["subsidiary"] });
            }

            if (params["customer"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_customer', value: params["customer"] });
            }
            if (params["date"]) {
                var date = format.parse({ value: params["date"], type: format.Type.DATE });
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_date', value: date });
            }
            if (params["userid"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_employee', value: params["userid"] });
            }
            if (params["currency"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_currency', value: params["currency"] });
            }

            if (params["araccount"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_aracc', value: params["araccount"] });
            }

            if (params["bankaccount"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_bankacc', value: params["bankaccount"] });
            }
            if (params["period"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_period', value: params["period"] });
            }
            if (params["document"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_doctype', value: params["document"] });
            }
            if (params["department"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_deparmen', value: params["department"] });
            }
            if (params["class"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_class', value: params["class"] });
            }
            if (params["location"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_location', value: params["location"] });
            }
            if (params["memo"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_memo', value: params["memo"] });
            }

            if (params["paymentmethod"]) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_paymmeth', value: params["paymentmethod"] });
            }

            recordlog.setValue({ fieldId: "custrecord_lmry_br_custpaym_log_type", value: "2" });

            recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_status', value: "1" });

            if (params["error"]) {
                recordlog.setValue({ fieldId: "custrecord_lmry_br_custpaym_log_error", value: JSON.stringify(params["error"]) });
            }

            recordlog.setValue({ fieldId: "custrecord_lmry_br_custpaym_log_massive", value: idParentLog });

            if (Object.keys(transactions).length) {
                recordlog.setValue({ fieldId: 'custrecord_lmry_br_custpaym_log_data', value: JSON.stringify(transactions) });
            }

            if (params['exchangerate']) {
                recordlog.setValue({ fieldId: "custrecord_lmry_br_custpaym_exchangerate", value: parseFloat(params["exchangerate"]) });
            }

            if (params['firstpayment']) {
                recordlog.setValue({ fieldId: "custrecord_lmry_br_custpaym_log_firstpay", value: JSON.stringify(params['firstpayment']) });
            }

            if (params["books"]) {
                recordlog.setValue({ fieldId: "custrecord_lmry_br_custpaym_accountbooks", value: JSON.stringify(params["books"]) });
            }

            var idlog = recordlog.save({
                enableSourcing: true,
                ignoreMandatoryFields: true,
                disableTriggers: true
            });

            return idlog;
        }


        function round2(num) {
            return parseFloat(Math.round(parseFloat(num) * 1e2 + 1e-6) / 1e2);
        }


        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });
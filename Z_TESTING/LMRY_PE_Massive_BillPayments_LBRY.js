/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
 ||   This script for customer center (Time)                     ||
 ||                                                              ||
 ||  File Name: LMRY_PE_Massive_BillPayments_LBRY.js             ||
 ||                                                              ||
 ||  Version Date         Author        Remarks                  ||
 ||  2.0     Jun 18 2019  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */
// ts-check

define(["N/runtime", "N/search", "N/record", "N/log", "N/url", "N/format", "./LMRY_libSendingEmailsLBRY_V2.0"],
    function (runtime, search, record, log, url, format, library_send) {
        var LMRY_script = "LMRY_PE_Massive_BillPayments_LBRY";
        var aux_separa = "";
        var subsidiary = "";
        var result_setuptax = [];
        var exchange_global = 1;
        var exchange_global_certificado = 1;
        var currencies = [];
        var docfiscal_bill = [];
        var docfiscal_id = [];
        var bill_map = [];
        var retenciones_map = [];
        var pagobill_map = [];
        var isOneWorld = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
        /**
         * 
         * @param {*} vendor 
         * @param {*} subsidiary 
         * @param {*} ap 
         * @param {*} resultMap 
         * @param {*} bill 
         * @param {*} currency 
         * @param {*} rate 
         * @param {*} accountingPeriod 
         * @param {*} date 
         * @param {*} department 
         * @param {*} clase 
         * @param {*} location 
         * @param {*} accountingbook 
         * @param {*} exchangeGlobalCertificado 
         * @param {*} result_setuptax 
         * @param {*} memo 
         * @param {*} paymentMethod 
         * @returns 
         */
        function aplicarJournal(
            vendor,
            subsidiary,
            ap,
            resultMap,
            bill,
            currency,
            rate,
            accountingPeriod,
            date,
            department,
            clase,
            location,
            accountingbook,
            exchangeGlobalCertificado,
            result_setuptax,
            memo,
            paymentMethod,
            data,
            whts
        ) {
            try {

                var jsonJournal = {};

                var jsonRenta = getRenta(subsidiary);
                var jsonBill = getDateRate(Object.keys(whts));
                var isFirstPayment = getIsFirstPayment(Object.keys(whts), subsidiary, vendor, ap, currency);
                var featureNoDomi = getFeatSetupTaxSubsidiary(subsidiary, 'custrecord_lmry_pago_no_domi');

                for (var i in whts) {
                    //Si no es primer pago, no crea journal
                    if (isFirstPayment[i]) {
                        continue;
                    }

                    var linesJournal = 0;

                    var journalRecord = record.create({ type: "journalentry", isDynamic: true });

                    if (subsidiary != "" && subsidiary != null) {
                        journalRecord.setValue({ fieldId: "subsidiary", value: subsidiary });
                    }

                    if (paymentMethod != "" && paymentMethod != null) {
                        if (!isOneWorld) {
                            var Search_met = search.lookupFields({
                                type: "customrecord_lmry_paymentmethod",
                                id: paymentMethod,
                                columns: ["custrecord_lmry_country_pm"],
                            });
                            journalRecord.setValue({
                                fieldId: "custbody_lmry_subsidiary_country",
                                value: Search_met.custrecord_lmry_country_pm[0].value,
                            });
                        }
                        journalRecord.setValue({
                            fieldId: "custbody_lmry_paymentmethod",
                            value: paymentMethod,
                        });
                    }

                    if (memo != "" && memo != null) {
                        journalRecord.setValue({ fieldId: "memo", value: memo });
                    }

                    if (department != "" && department != null) {
                        journalRecord.setValue({ fieldId: "department", value: department });
                    }

                    if (location != "" && location != null) {
                        journalRecord.setValue({ fieldId: "location", value: location });
                    }

                    if (clase != "" && clase != null) {
                        journalRecord.setValue({ fieldId: "class", value: clase });
                    }

                    if (featureNoDomi) {
                        var date_format = format.parse({ value: jsonBill[i]['date'], type: format.Type.DATE });
                    } else {
                        if (date != "" && date != null) {
                            var date_format = format.parse({ value: date, type: format.Type.DATE });
                        }
                    }
                    journalRecord.setValue({ fieldId: "trandate", value: date_format });

                    journalRecord.setValue({ fieldId: "approvalstatus", value: 2 });

                    if (currency != "" && currency != null) {
                        journalRecord.setValue({ fieldId: "currency", value: currency });
                    }

                    if (featureNoDomi) {
                        journalRecord.setValue({ fieldId: "exchangerate", value: jsonBill[i]['rate'] });
                    } else {
                        if (rate != "" && rate != null) {
                            journalRecord.setValue({ fieldId: "exchangerate", value: rate });
                        }
                    }

                    if (accountingPeriod != "" && accountingPeriod != null) {
                        journalRecord.setValue({ fieldId: "postingperiod", value: accountingPeriod });
                    }

                    journalRecord.setValue({
                        fieldId: "custbody_lmry_reference_transaction",
                        value: i,
                    });

                    journalRecord.setValue({
                        fieldId: "custbody_lmry_reference_transaction_id",
                        value: i,
                    });

                    //Por cada tipo de impuesto a la renta que tiene el bill actual
                    var montoJournal = 0, descJournal = [];

                    for (var j in whts[i]) {
                        if (!jsonRenta[j]) {
                            continue;
                        }

                        var montoImpuesto = parseFloat(whts[i][j]) * parseFloat(jsonRenta[j]['tasaRenta']) * parseFloat(jsonRenta[j]['percentRenta']);
                        var cuentaImpuesto = jsonRenta[j]['cuentaRenta'];
                        var basePagado = parseFloat(data[i]['payment']) / parseFloat(data[i]['totalamount']);
                        basePagado = parseFloat(basePagado) * parseFloat(whts[i][j]);

                        if (Number(montoImpuesto) > 0) {

                            montoJournal += Number(montoImpuesto);

                            descJournal.push({ 'monto': montoImpuesto, 'rate': parseFloat(jsonRenta[j]['tasaRenta']) * parseFloat(jsonRenta[j]['percentRenta']), 'basetotal': parseFloat(whts[i][j]), 'basepagado': basePagado });

                            //Linea de debito
                            journalRecord.selectNewLine({ sublistId: "line" });

                            if (ap != "" && ap != null) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "account",
                                    value: ap,
                                });
                            }

                            if (memo) {

                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "memo",
                                    value: memo,
                                });
                            }

                            journalRecord.setCurrentSublistValue({
                                sublistId: "line",
                                fieldId: "custcol_lmry_pe_impuesto_renta",
                                value: j,
                            });

                            journalRecord.setCurrentSublistValue({
                                sublistId: "line",
                                fieldId: "debit",
                                value: montoImpuesto,
                            });

                            if (vendor != "" && vendor != null) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "entity",
                                    value: vendor,
                                });
                            }

                            if (department != "" && department != null) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "department",
                                    value: department,
                                });
                            }

                            if (location != "" && location != null) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "location",
                                    value: location,
                                });
                            }

                            if (clase != "" && clase != null) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "class",
                                    value: clase,
                                });
                            }

                            journalRecord.commitLine({ sublistId: "line" });

                            //Linea de credito
                            journalRecord.selectNewLine({ sublistId: "line" });

                            if (cuentaImpuesto != "" && cuentaImpuesto != null) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "account",
                                    value: cuentaImpuesto
                                });
                            }

                            if (memo) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "memo",
                                    value: memo
                                });
                            }

                            journalRecord.setCurrentSublistValue({
                                sublistId: "line",
                                fieldId: "custcol_lmry_pe_impuesto_renta",
                                value: j,
                            });

                            journalRecord.setCurrentSublistValue({
                                sublistId: "line",
                                fieldId: "credit",
                                value: montoImpuesto
                            });

                            if (vendor != "" && vendor != null) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "entity",
                                    value: vendor
                                });
                            }
                            if (!featureNoDomi) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "custcol_lmry_ar_item_tributo",
                                    value: true,
                                });
                            }

                            if (department != "" && department != null) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "department",
                                    value: department,
                                });
                            }

                            if (location != "" && location != null) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "location",
                                    value: location,
                                });
                            }

                            if (clase != "" && clase != null) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "class",
                                    value: clase,
                                });
                            }

                            journalRecord.commitLine({ sublistId: "line" });

                            linesJournal++;
                        }
                    }

                    if (accountingbook != null && accountingbook != "") {
                        var c_multibook = journalRecord.getLineCount({
                            sublistId: "accountingbookdetail",
                        });
                        for (var c_lineas = 0; c_lineas < c_multibook; c_lineas++) {
                            journalRecord.selectLine({
                                sublistId: "accountingbookdetail",
                                line: c_lineas,
                            });

                            if (
                                journalRecord.getCurrentSublistValue({
                                    sublistId: "accountingbookdetail",
                                    fieldId: "currency",
                                }) == result_setuptax[7]
                            ) {
                                journalRecord.setCurrentSublistValue({
                                    sublistId: "accountingbookdetail",
                                    fieldId: "exchangerate",
                                    value: exchangeGlobalCertificado,
                                });
                                journalRecord.commitLine({ sublistId: "accountingbookdetail" });
                            }
                        }
                    }

                    if (linesJournal) {
                        var recordJournalid = journalRecord.save({ disableTriggers: true, ignoreMandatoryFields: true });
                        jsonJournal[i] = { 'idJournal': recordJournalid, 'monto': montoJournal, 'desc': descJournal };

                    }

                }

                log.debug('jsonJournal', jsonJournal);

                return jsonJournal;

            } catch (err) {
                log.error("[AplicarJournal]", err);
                library_send.sendemail("[AplicarJournal]" + err, LMRY_script);

            }
        }
        /**
         * 
         * @param {*} id_log 
         * @param {*} bill 
         * @param {*} idbill 
         * @param {*} arrayJournal 
         * @param {*} result_setuptax 
         * @param {*} subsidiary 
         * @param {*} date 
         * @param {*} accountingPeriod 
         * @param {*} paymentMethod 
         * @param {*} currency 
         * @param {*} memo 
         * @param {*} ap 
         * @param {*} bank 
         * @param {*} department 
         * @param {*} clase 
         * @param {*} location 
         * @param {*} rate 
         * @param {*} accountingbook 
         * @param {*} vendor 
         * @param {*} exchangeGlobalCertificado 
         * @param {*} check 
         * @returns 
         */
        function creadoPayment(
            id_log,
            jsonJournal,
            result_setuptax,
            subsidiary,
            date,
            accountingPeriod,
            paymentMethod,
            currency,
            memo,
            ap,
            bank,
            department,
            clase,
            location,
            rate,
            accountingbook,
            vendor,
            exchangeGlobalCertificado,
            check,
            DATA,
            whts
        ) {
            try {

                for (var i in jsonJournal) {
                    if (DATA.hasOwnProperty(i)) {
                        DATA[i]["idJournal"] = jsonJournal[i]["idJournal"];
                        DATA[i]["montoJournal"] = jsonJournal[i]["monto"];
                    }
                }

                log.debug('DATA', DATA);

                //Aplicar el journal a su bill respectivo
                for (var i in DATA) {

                    if (!DATA[i]['idJournal']) {
                        continue;
                    }

                    var objPayment = record.transform({
                        fromType: record.Type.VENDOR_BILL,
                        fromId: i,
                        toType: record.Type.VENDOR_PAYMENT,
                        isDynamic: true
                    });

                    if (currency != null && currency != "") {
                        objPayment.setValue({ fieldId: "currency", value: currency });
                    }

                    if (ap != null && ap != "") {
                        objPayment.setValue({ fieldId: "apacct", value: ap });
                    }

                    if (bank != null && bank != "") {
                        objPayment.setValue({ fieldId: "account", value: bank });
                    }

                    var cantidadApply = objPayment.getLineCount({ sublistId: "apply" });

                    for (var j = 0; j < cantidadApply; j++) {

                        objPayment.selectLine({ sublistId: "apply", line: j });
                        var docid = objPayment.getCurrentSublistValue({ sublistId: "apply", fieldId: "doc" });

                        if (docid == i) {

                            objPayment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                            objPayment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: DATA[i]['montoJournal'] });

                        }

                        if (docid == DATA[i]['idJournal']) {

                            objPayment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                            objPayment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: Number(DATA[i]['montoJournal']) * -1 });
                        }


                    }

                    objPayment.save({ disableTriggers: true, ignoreMandatoryFields: true });

                }

                //Aplicar Bills al Payment real

                var obj_payment = record.transform({
                    fromType: record.Type.VENDOR_BILL,
                    fromId: Object.keys(DATA)[0],
                    toType: record.Type.VENDOR_PAYMENT,
                    isDynamic: true
                });


                if (result_setuptax[4] != null && result_setuptax[4] != "") {
                    obj_payment.setValue({
                        fieldId: "customform",
                        value: result_setuptax[4],
                    });
                }

                if (subsidiary != null && subsidiary != "") {
                    obj_payment.setValue({ fieldId: "subsidiary", value: subsidiary });
                }

                date = format.parse({ value: date, type: format.Type.DATE });
                if (date != null && date != "") {
                    obj_payment.setValue({ fieldId: "trandate", value: date });
                }

                if ((accountingPeriod != null) && (accountingPeriod != "")) {
                    obj_payment.setValue({
                        fieldId: "postingperiod",
                        value: accountingPeriod,
                    });
                }

                if (paymentMethod != null && paymentMethod != "") {
                    obj_payment.setValue({
                        fieldId: "custbody_lmry_paymentmethod",
                        value: paymentMethod,
                    });
                }

                if (currency != null && currency != "") {
                    obj_payment.setValue({ fieldId: "currency", value: currency });
                }

                if (ap != null && ap != "") {
                    obj_payment.setValue({ fieldId: "apacct", value: ap });
                }

                if (bank != null && bank != "") {
                    obj_payment.setValue({ fieldId: "account", value: bank });
                }

                var correlativo = parseInt(result_setuptax[9]) + parseInt(check) + "";
                correlativo += "";
                //log.error('correlativo',correlativo);
                if (correlativo != "" && correlativo != null) {
                    var prefix = "ND";
                    //log.error('prefix',result_setuptax[11]);
                    if (result_setuptax[11] != null && result_setuptax[11] != "") {
                        prefix = result_setuptax[11];
                    }
                    obj_payment.setValue({
                        fieldId: "tranid",
                        value: prefix + "-" + correlativo,
                    });
                }

                if (department != null && department != "") {
                    obj_payment.setValue({ fieldId: "department", value: department });
                }

                if (location != null && location != "") {
                    obj_payment.setValue({ fieldId: "location", value: location });
                }

                if (clase != null && clase != "") {
                    obj_payment.setValue({ fieldId: "class", value: clase });
                }

                obj_payment.setValue({ fieldId: "exchangerate", value: rate });

                if (accountingbook != null && accountingbook != "") {
                    var c_multibook = obj_payment.getLineCount({
                        sublistId: "accountingbookdetail",
                    });
                    for (var c_lineas = 0; c_lineas < c_multibook; c_lineas++) {
                        obj_payment.selectLine({
                            sublistId: "accountingbookdetail",
                            line: c_lineas,
                        });

                        if (
                            obj_payment.getCurrentSublistValue({
                                sublistId: "accountingbookdetail",
                                fieldId: "currency",
                            }) == result_setuptax[7]
                        ) {
                            obj_payment.setCurrentSublistValue({
                                sublistId: "accountingbookdetail",
                                fieldId: "exchangerate",
                                value: exchangeGlobalCertificado,
                            });
                            obj_payment.commitLine({ sublistId: "accountingbookdetail" });
                        }
                    }
                }

                var line_pay = 0,
                    line_journal = 0,
                    recorpay = "";

                var cant_pay = obj_payment.getLineCount({ sublistId: "apply" });

                //Solo aplicar el primer bill
                for (var indpay = 0; indpay < cant_pay; indpay++) {
                    obj_payment.selectLine({ sublistId: "apply", line: indpay });
                    var docid = obj_payment.getCurrentSublistValue({
                        sublistId: "apply",
                        fieldId: "doc",
                    });


                    for (var i in DATA) {
                        if (docid == i) {

                            var monto = DATA[i]['payment'];

                            if (DATA[i]['montoJournal']) {
                                monto -= parseFloat(DATA[i]['montoJournal']);
                            }

                            obj_payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                            obj_payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: monto });

                            line_pay++;

                        }
                    }

                }

                if (line_pay > 0) {


                    recorpay = obj_payment.save({
                        ignoreMandatoryFields: true,
                        disableTriggers: true,
                    });

                    var valueMemo = memo || '';

                    record.submitFields({
                        type: 'vendorpayment',
                        id: recorpay,
                        values: { memo: valueMemo },
                        options: { disableTriggers: true, ignoreMandatoryFields: true }
                    });

                    log.debug('idPayment', recorpay);

                    if (recorpay != null && recorpay != "") {
                        // Actuliza el TranID
                        var newcheck = obj_payment.getValue({ fieldId: "tranid" });

                        // Comentado para generar nuestro propio correlativo
                        // Por subsidiaria

                        var id = record.submitFields({
                            type: "customrecord_lmry_pe_payments_log",
                            id: id_log,
                            values: {
                                custrecord_lmry_pe_status:
                                    "El pago ha sido generado, espere el estado FINALIZADO",
                                custrecord_lmry_pe_payment: recorpay,
                                custrecord_lmry_pe_pay: recorpay,
                                custrecord_lmry_pe_check: newcheck,
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true,
                                disableTriggers: true,
                            },
                        });
                    }

                    return true;

                }
            } catch (err) {

                record.submitFields({
                    type: "customrecord_lmry_pe_payments_log",
                    id: id_log,
                    values: {
                        custrecord_lmry_pe_status:
                            "Ocurrió un problema, revise su configuración",
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                        disableTriggers: true,
                    },
                });


                library_send.sendemail("[creadoPayment]" + err, LMRY_script);
                log.error("[creadoPayment]", err);
            }
        }
        /**
         * 
         * @param {*} sub 
         * @param {*} docFiscales 
         * @returns 
         */
        function llenado_setuptax(sub, docFiscales) {
            try {
                subsidiary = sub;

                var filtros_setuptax = new Array();
                filtros_setuptax[0] = search.createFilter({
                    name: "isinactive",
                    operator: "is",
                    values: ["F"],
                });
                filtros_setuptax[1] = search.createFilter({
                    name: "custrecord_lmry_setuptax_subsidiary",
                    operator: "anyof",
                    values: subsidiary,
                });

                var search_rounding = search.create({
                    type: "customrecord_lmry_setup_tax_subsidiary",
                    filters: filtros_setuptax,
                    columns: [
                        "custrecord_lmry_setuptax_amorounding",
                        "custrecord_lmry_setuptax_type_rounding",
                        "custrecord_lmry_setuptax_pe_correlative",
                        "internalid",
                        "custrecord_lmry_setuptax_pe_prefix",
                        "custrecord_lmry_setuptax_apply_line",
                        "custrecord_lmry_setuptax_currency",
                        "custrecord_lmry_setuptax_form_payment",
                        "custrecord_lmry_setuptax_form_credit",
                        "custrecord_lmry_setuptax_ar_group",
                    ],
                });

                var result_rounding = search_rounding
                    .run()
                    .getRange({ start: 0, end: 1 });

                result_setuptax = [];
                if (result_rounding != null && result_rounding.length > 0) {
                    result_setuptax.push(
                        result_rounding[0].getValue({
                            name: "custrecord_lmry_setuptax_amorounding",
                        })
                    );
                    result_setuptax.push(
                        result_rounding[0].getValue({
                            name: "custrecord_lmry_setuptax_type_rounding",
                        })
                    );
                    result_setuptax.push(
                        result_rounding[0].getValue({
                            name: "custrecord_lmry_setuptax_apply_line",
                        })
                    );
                    result_setuptax.push(
                        result_rounding[0].getText({
                            name: "custrecord_lmry_setuptax_currency",
                        })
                    );
                    result_setuptax.push(
                        result_rounding[0].getValue({
                            name: "custrecord_lmry_setuptax_form_payment",
                        })
                    );
                    result_setuptax.push(
                        result_rounding[0].getValue({
                            name: "custrecord_lmry_setuptax_form_credit",
                        })
                    );
                    result_setuptax.push(
                        result_rounding[0].getValue({
                            name: "custrecord_lmry_setuptax_ar_group",
                        })
                    );
                    result_setuptax.push(
                        result_rounding[0].getValue({
                            name: "custrecord_lmry_setuptax_currency",
                        })
                    );

                    var caso_rounding = "";
                    if (result_setuptax[1] != null && result_setuptax[1] != "") {
                        if (result_setuptax[1] == "1") {
                            caso_rounding = "1";
                        } else {
                            caso_rounding = "2";
                        }
                    }
                    if (result_setuptax[0] != null && result_setuptax[0] != "") {
                        caso_rounding = "3";
                    }
                    if (
                        result_setuptax[1] != null &&
                        result_setuptax[1] != "" &&
                        result_setuptax[0] != null &&
                        result_setuptax[0] != ""
                    ) {
                        caso_rounding = "0";
                    }

                    result_setuptax.push(caso_rounding);

                    var corr = result_rounding[0].getValue({
                        name: "custrecord_lmry_setuptax_pe_correlative",
                    });
                    corr = corr ? corr : 0;
                    result_setuptax.push(corr);

                    result_setuptax.push(
                        result_rounding[0].getValue({
                            name: "internalid",
                        })
                    );

                    result_setuptax.push(
                        result_rounding[0].getValue({
                            name: "custrecord_lmry_setuptax_pe_prefix",
                        })
                    );
                }

                var aux_fiscal = docFiscales.split("|");
                for (var i = 0; i < aux_fiscal.length - 1; i++) {
                    var cd = aux_fiscal[i].split(";");
                    docfiscal_id.push(cd[1]);
                    docfiscal_bill.push(cd[0]);
                }

                var retornar = [result_setuptax, docfiscal_id, docfiscal_bill];

                return retornar;
            } catch (err) {
                log.error("[multibooking]", err);
                library_send.sendemail("[multibooking]" + err, LMRY_script);

            }
        }
        /**
         * 
         * @param {*} currency_actual_text 
         * @param {*} exchange_actual 
         * @param {*} currency_book 
         * @returns 
         */
        function multibooking(currency_actual_text, exchange_actual, currency_book) {
            try {
                if (isOneWorld) {
                    var currency_base = search.lookupFields({
                        type: "subsidiary",
                        id: subsidiary,
                        columns: ["currency"],
                    });
                    currency_base = currency_base.currency[0].text;
                } else {
                    var currency_setup = runtime.getCurrentScript().getParameter({
                        name: "custscript_lmry_currency",
                    });
                    var currency_base = search.lookupFields({
                        type: "currency",
                        id: currency_setup,
                        columns: ["name"],
                    });
                    currency_base = currency_base.name;
                }

                currencies.push(currency_base);
                currencies.push(currency_actual_text);

                if (result_setuptax[3] == currencies[0]) {
                    exchange_global = 1 / parseFloat(exchange_actual);
                    exchange_global_certificado = exchange_actual;
                }
                if (
                    currency_actual_text == result_setuptax[3] &&
                    currency_actual_text == currency_base
                ) {
                    exchange_global = exchange_actual;
                    exchange_global_certificado = exchange_actual;
                }

                if (
                    result_setuptax[3] != currency_base &&
                    result_setuptax[3] != currency_actual_text
                ) {
                    var aux_cbook = currency_book.split("|");
                    for (var h = 0; h < aux_cbook.length - 1; h++) {
                        var aux_cbook2 = aux_cbook[h].split(";");
                        if (aux_cbook2[0] == result_setuptax[3]) {
                            exchange_global = 1 / parseFloat(aux_cbook2[1]);
                            exchange_global_certificado = parseFloat(aux_cbook2[1]);
                        }
                    }
                }

                currencies.push(exchange_global);
                currencies.push(exchange_global_certificado);
                return currencies;
            } catch (err) {
                log.error("[multibooking]", err);
                library_send.sendemail("[multibooking]" + err, LMRY_script);

            }
        }
        /**
         * 
         * @param {*} recordObjID 
         */
        function deleteJournal(recordObjID) {
            try {
                var filtersJournalDelete = [
                    ["custbody_lmry_reference_transaction", "is", recordObjID],
                    "AND",
                    ["mainline", "is", "T"],

                ]
                filtersJournalDelete.push("AND", ["memomain", "contains", "Impuesto a la Renta - Credit Card"])

                var listJournal = [];
                var JournalSearchObj = search.create({
                    type: "journalentry",
                    filters: filtersJournalDelete,
                    columns: ["internalid"],
                });
                JournalSearchObj = JournalSearchObj.run().getRange(0, 1000);

                if (JournalSearchObj != null && JournalSearchObj != "") {
                    for (var i = 0; i < JournalSearchObj.length; i++) {
                        if (
                            listJournal.indexOf(JournalSearchObj[i].getValue("internalid")) ==
                            -1
                        ) {
                            record.delete({
                                type: "journalentry",
                                id: JournalSearchObj[i].getValue("internalid"),
                            });
                            listJournal.push(JournalSearchObj[i].getValue("internalid"));
                        }
                    }
                }
            } catch (err) {
                library_send.sendemail("[deleteJournal]" + err, LMRY_script);
                log.error("[deleteJournal]", err);
            }
        }
        /**
         * 
         * @param {*} recordObjID 
         * @returns 
         */
        function cargarLineasTransaccion(recordObjID) {
            try {
                var fLocation = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
                var fDepartment = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
                var fClass = runtime.isFeatureInEffect({ feature: "CLASSES" });

                var linesTrans = {};
                var searchLinesTrans = search.load({
                    id: "customsearch_lmry_creditcard_lines",
                });
                searchLinesTrans.filters.push(
                    search.createFilter({
                        name: "internalid",
                        operator: "anyof",
                        values: recordObjID,
                    })
                );

                var resultLinesTrans = searchLinesTrans.run().getRange(0, 1000);

                if (resultLinesTrans != null && resultLinesTrans.length > 0) {
                    var columnsLinesTrans = resultLinesTrans[0].columns;
                    for (var i = 0; i < resultLinesTrans.length; i++) {
                        var amount = resultLinesTrans[i].getValue(columnsLinesTrans[1]);
                        var lineuniquekey = resultLinesTrans[i].getValue(
                            columnsLinesTrans[2]
                        );
                        var impuesto = resultLinesTrans[i].getValue(columnsLinesTrans[3]);

                        var arrayExp = [lineuniquekey, amount];
                        if (fLocation == true || fLocation == "T") {
                            var location = resultLinesTrans[i].getValue("location");
                            arrayExp.push(location);
                        }

                        if (fDepartment == true || fDepartment == "T") {
                            var department = resultLinesTrans[i].getValue("department");
                            arrayExp.push(department);
                        }

                        if (fClass == true || fClass == "T") {
                            var clase = resultLinesTrans[i].getValue("class");
                            arrayExp.push(clase);
                        }

                        if (linesTrans[impuesto]) {
                            linesTrans[impuesto].push(arrayExp);
                        } else {
                            linesTrans[impuesto] = [arrayExp];
                        }
                    }
                }
                return linesTrans;
            } catch (err) {
                library_send.sendemail("[deleteJournal]" + err, LMRY_script);
                log.error("[deleteJournal]", err);
            }
        }
        /**
         * Crea un journal con los impuestos a partir de las lineas de la transaccion
         * @param {*} linesTrans 
         * @param {*} recordObj 
         */
        function createJournal(linesTrans, recordObj) {
            try {
                var depSetup = "";
                var classSetup = "";
                var locSetup = "";
                var department = "";
                var clase = "";
                var journalForm = "";

                //Features
                var subsi_OW = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
                var fDepartment = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
                var fClass = runtime.isFeatureInEffect({ feature: "CLASSES" });
                var fLocation = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
                var fDeptMandatory = runtime
                    .getCurrentScript()
                    .getParameter({ name: "DEPTMANDATORY" });
                var fClassMandatory = runtime
                    .getCurrentScript()
                    .getParameter({ name: "CLASSMANDATORY" });
                var fLocMandatory = runtime
                    .getCurrentScript()
                    .getParameter({ name: "LOCMANDATORY" });

                //Campos de Credit Card
                var subsidiary = recordObj.getValue("subsidiary");
                var paymentMethod = recordObj.getValue("custbody_lmry_paymentmethod");
                var date = recordObj.getValue("trandate");
                var currency = recordObj.getValue("currency");
                var rate = recordObj.getValue("exchangerate");
                var accountingPeriod = recordObj.getValue("postingperiod");
                var vendor = recordObj.getValue("entity");
                var ap = recordObj.getValue("account");
                var memo = "Impuesto a la Renta - Credit Card";

                //Setup Tax Subsidiary
                var filters = [];
                filters.push(
                    search.createFilter({ name: "isinactive", operator: "is", values: "F" })
                );
                if (subsi_OW) {
                    filters.push(
                        search.createFilter({
                            name: "custrecord_lmry_setuptax_subsidiary",
                            operator: "is",
                            values: subsidiary,
                        })
                    );
                }
                var search_setuptax = search.create({
                    type: "customrecord_lmry_setup_tax_subsidiary",
                    columns: [
                        "custrecord_lmry_setuptax_department",
                        "custrecord_lmry_setuptax_class",
                        "custrecord_lmry_setuptax_location",
                        "custrecord_lmry_setuptax_form_journal",
                    ],
                    filters: filters,
                });
                var result_setuptax = search_setuptax
                    .run()
                    .getRange({ start: 0, end: 1 });

                if (result_setuptax != null && result_setuptax.length > 0) {
                    depSetup = result_setuptax[0].getValue(
                        "custrecord_lmry_setuptax_department"
                    );
                    classSetup = result_setuptax[0].getValue(
                        "custrecord_lmry_setuptax_class"
                    );
                    locSetup = result_setuptax[0].getValue(
                        "custrecord_lmry_setuptax_location"
                    );
                    journalForm = result_setuptax[0].getValue(
                        "custrecord_lmry_setuptax_form_journal"
                    );
                }

                if (Object.keys(linesTrans).length) {
                    for (var idImpuesto in linesTrans) {
                        var journal = 0;
                        var impuestoRenta = "";
                        var cuenta = "";
                        var linesJournal = 0;

                        var jeRec = record.create({ type: "journalentry", isDynamic: true });

                        if (journalForm) {
                            jeRec.setValue({ fieldId: "customform", value: journalForm });
                        }

                        if (subsi_OW) {
                            jeRec.setValue({ fieldId: "subsidiary", value: subsidiary });
                        }

                        if (paymentMethod != "" && paymentMethod != null) {
                            if (!subsi_OW) {
                                var Search_met = search.lookupFields({
                                    type: "customrecord_lmry_paymentmethod",
                                    id: paymentMethod,
                                    columns: ["custrecord_lmry_country_pm"],
                                });
                                jeRec.setValue({
                                    fieldId: "custbody_lmry_subsidiary_country",
                                    value: Search_met.custrecord_lmry_country_pm[0].value,
                                });
                            }
                            jeRec.setValue({
                                fieldId: "custbody_lmry_paymentmethod",
                                value: paymentMethod,
                            });
                        }

                        if (memo != "" && memo != null) {
                            jeRec.setValue({ fieldId: "memo", value: memo });
                        }

                        if (date != "" && date != null) {
                            jeRec.setValue({ fieldId: "trandate", value: date });
                        }

                        jeRec.setValue({ fieldId: "approvalstatus", value: 2 });

                        jeRec.setValue({ fieldId: "currency", value: currency });

                        if (rate != "" && rate != null) {
                            jeRec.setValue({ fieldId: "exchangerate", value: rate });
                        }

                        if (accountingPeriod != "" && accountingPeriod != null) {
                            jeRec.setValue({
                                fieldId: "postingperiod",
                                value: accountingPeriod,
                            });
                        }

                        jeRec.setValue({
                            fieldId: "custbody_lmry_reference_transaction",
                            value: recordObj.id,
                        });

                        jeRec.setValue({
                            fieldId: "custbody_lmry_reference_transaction_id",
                            value: recordObj.id,
                        });

                        log.debug("Líneas para el Journal", linesTrans[idImpuesto]);

                        for (var i = 0; i < linesTrans[idImpuesto].length; i++) {
                            var monto = linesTrans[idImpuesto][i][1];
                            monto = Math.abs(monto);
                            var lineid = linesTrans[idImpuesto][i][0];
                            var impuestoRenta = idImpuesto;

                            var searchImpuesto = search.create({
                                type: "customrecord_lmry_pe_cuenta_nodomicilio",
                                columns: [
                                    {
                                        name: "custrecord_lmry_pe_ren_tasa",
                                        join: "custrecord_lmry_pe_impuesto_renta",
                                        label: "LATAM PE - RENTA TASA APLICABLE",
                                    },
                                    {
                                        name: "custrecord_lmry_pe_ren_porc",
                                        join: "custrecord_lmry_pe_impuesto_renta",
                                        label: "LATAM PE - RENTA PORCENTAJE",
                                    },
                                    { name: "custrecord_lmry_pe_impuesto_renta" },
                                    { name: "custrecord_lmry_pe_cuenta" },
                                ],
                                filters: [
                                    ["custrecord_lmry_pe_impuesto_renta", "anyof", impuestoRenta],
                                    "AND",
                                    ["custrecord_lmry_pe_subsidiaria", "anyof", subsidiary],
                                    "AND",
                                    ["isinactive", "is", "F"],
                                ],
                            });

                            var searchResult = searchImpuesto.run().getRange(0, 1);
                            if (searchResult != "" && searchResult != null) {
                                var columns = searchResult[0].columns;

                                var tasa = searchResult[0].getValue(columns[0]);
                                var porcentaje = searchResult[0].getValue(columns[1]);
                                impuestoRenta = searchResult[0].getValue(columns[2]);
                                var porcenJournal = parseFloat(Number(parseFloat(porcentaje.toString())) / 100);
                                var tasaJournal = parseFloat(Number(parseFloat(tasa.toString())) / 100);
                                monto = Math.round(parseFloat(monto) * 100) / 100;
                                journal =
                                    Math.round(
                                        parseFloat(monto) *
                                        parseFloat(porcenJournal) *
                                        parseFloat(tasaJournal) *
                                        100
                                    ) / 100;
                                cuenta = searchResult[0].getValue(columns[3]);
                            }

                            if (journal > 0 && cuenta != "" && cuenta != null) {
                                //Linea de debito
                                jeRec.selectNewLine({ sublistId: "line" });

                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "account",
                                    value: ap,
                                });
                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "memo",
                                    value: "Transaction ID:" + lineid,
                                });
                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "custcol_lmry_pe_impuesto_renta",
                                    value: impuestoRenta,
                                });
                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "debit",
                                    value: journal,
                                });
                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "entity",
                                    value: vendor,
                                });

                                if (fLocation == true || fLocation == "T") {
                                    var location = linesTrans[idImpuesto][i][2];
                                    if (location != "" && location != null) {
                                        jeRec.setCurrentSublistValue({
                                            sublistId: "line",
                                            fieldId: "location",
                                            value: location,
                                        });
                                    } else if (fLocMandatory == true || fLocMandatory == "T") {
                                        if (locSetup != "" && locSetup != null) {
                                            jeRec.setCurrentSublistValue({
                                                sublistId: "line",
                                                fieldId: "location",
                                                value: locSetup,
                                            });
                                        }
                                    }
                                }

                                if (fDepartment == true || fDepartment == "T") {
                                    department = linesTrans[idImpuesto][i][3];
                                    if (department != "" && department != null) {
                                        jeRec.setCurrentSublistValue({
                                            sublistId: "line",
                                            fieldId: "department",
                                            value: department,
                                        });
                                    } else if (fDeptMandatory == true || fDeptMandatory == "T") {
                                        if (depSetup != "" && depSetup != null) {
                                            jeRec.setCurrentSublistValue({
                                                sublistId: "line",
                                                fieldId: "department",
                                                value: depSetup,
                                            });
                                        }
                                    }
                                }

                                if (fClass == true || fClass == "T") {
                                    clase = linesTrans[idImpuesto][i][4];
                                    if (clase != "" && clase != null) {
                                        jeRec.setCurrentSublistValue({
                                            sublistId: "line",
                                            fieldId: "class",
                                            value: clase,
                                        });
                                    } else if (fClassMandatory == true || fClassMandatory == "T") {
                                        if (classSetup != "" && classSetup != null) {
                                            jeRec.setCurrentSublistValue({
                                                sublistId: "line",
                                                fieldId: "class",
                                                value: classSetup,
                                            });
                                        }
                                    }
                                }

                                jeRec.commitLine({ sublistId: "line" });

                                //Linea de credito
                                jeRec.selectNewLine({ sublistId: "line" });
                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "account",
                                    value: cuenta,
                                });
                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "memo",
                                    value: "Transaction ID:" + lineid,
                                });
                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "custcol_lmry_pe_impuesto_renta",
                                    value: impuestoRenta,
                                });
                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "credit",
                                    value: journal,
                                });
                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "entity",
                                    value: vendor,
                                });
                                jeRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "custcol_lmry_ar_item_tributo",
                                    value: true,
                                });

                                if (fLocation == true || fLocation == "T") {
                                    var location = linesTrans[idImpuesto][i][2];
                                    if (location != "" && location != null) {
                                        jeRec.setCurrentSublistValue({
                                            sublistId: "line",
                                            fieldId: "location",
                                            value: location,
                                        });
                                    } else if (fLocMandatory == true || fLocMandatory == "T") {
                                        if (locSetup != "" && locSetup != null) {
                                            jeRec.setCurrentSublistValue({
                                                sublistId: "line",
                                                fieldId: "location",
                                                value: locSetup,
                                            });
                                        }
                                    }
                                }

                                if (fDepartment == true || fDepartment == "T") {
                                    if (department != "" && department != null) {
                                        jeRec.setCurrentSublistValue({
                                            sublistId: "line",
                                            fieldId: "department",
                                            value: department,
                                        });
                                    } else if (fDeptMandatory == true || fDeptMandatory == "T") {
                                        if (depSetup != "" && depSetup != null) {
                                            jeRec.setCurrentSublistValue({
                                                sublistId: "line",
                                                fieldId: "department",
                                                value: depSetup,
                                            });
                                        }
                                    }
                                }

                                if (fClass == true || fClass == "T") {
                                    if (clase != "" && clase != null) {
                                        jeRec.setCurrentSublistValue({
                                            sublistId: "line",
                                            fieldId: "class",
                                            value: clase,
                                        });
                                    } else if (fClassMandatory == true || fClassMandatory == "T") {
                                        if (classSetup != "" && classSetup != null) {
                                            jeRec.setCurrentSublistValue({
                                                sublistId: "line",
                                                fieldId: "class",
                                                value: classSetup,
                                            });
                                        }
                                    }
                                }

                                jeRec.commitLine({ sublistId: "line" });
                                linesJournal++;
                            } else {
                                log.error(
                                    "ALERT",
                                    "No se ha configurado correctamente el record LatamReady - PE Cuenta No Domiciliado o el monto del impuesto es igual a 0"
                                );
                            }
                        }
                        if (linesJournal > 0) {
                            var recordJournalid = jeRec.save();
                            log.debug("recordJournalid", recordJournalid);
                        }
                    }
                }
            } catch (err) {
                library_send.sendemail("[createJournal]" + err, LMRY_script);
                log.error("[createJournal]", err);
            }
        }

        function getWHTS(data) {

            var jsonWHT = {};

            var whts = search.create({
                type: 'vendorbill',
                filters: [
                    ["formulatext: {custcol_lmry_pe_impuesto_renta}", "isnotempty", ""], 'AND',
                    ["internalid", "anyof", Object.keys(data)]
                ],
                columns: ['custcol_lmry_pe_impuesto_renta', 'fxamount']
            });

            var pageData = whts.runPaged({ pageSize: 1000 });
            if (pageData) {
                pageData.pageRanges.forEach(function (pageRange) {
                    var page = pageData.fetch({ index: pageRange.index });
                    var results = page.data;
                    if (results) {
                        for (var i = 0; i < results.length; i++) {

                            var idBill = results[i].id;
                            var netAmount = results[i].getValue('fxamount');
                            var impuestoRenta = results[i].getValue('custcol_lmry_pe_impuesto_renta');

                            jsonWHT[idBill] = jsonWHT[idBill] || {};
                            jsonWHT[idBill][impuestoRenta] = jsonWHT[idBill][impuestoRenta] || 0;
                            jsonWHT[idBill][impuestoRenta] += Number(netAmount);


                        }
                    }
                });
            }

            log.debug('jsonWHT', jsonWHT);

            return jsonWHT;

        }

        function getRenta(subsidiary) {

            var jsonRenta = {};

            var searchImpuesto = search.create({
                type: "customrecord_lmry_pe_cuenta_nodomicilio",
                columns: [
                    {
                        name: "custrecord_lmry_pe_ren_tasa",
                        join: "custrecord_lmry_pe_impuesto_renta"
                    },
                    {
                        name: "custrecord_lmry_pe_ren_porc",
                        join: "custrecord_lmry_pe_impuesto_renta"
                    },
                    {
                        name: "custrecord_lmry_pe_impuesto_renta"
                    },
                    {
                        name: "custrecord_lmry_pe_cuenta"
                    }
                ],
                filters: [
                    ["custrecord_lmry_pe_subsidiaria", "anyof", subsidiary], "AND",
                    ["isinactive", "is", "F"]
                ]
            });

            searchImpuesto = searchImpuesto.run().getRange(0, 1000);

            if (searchImpuesto && searchImpuesto.length) {
                for (var i = 0; i < searchImpuesto.length; i++) {

                    var idRenta = searchImpuesto[i].getValue('custrecord_lmry_pe_impuesto_renta');
                    var tasaRenta = searchImpuesto[i].getValue({ name: 'custrecord_lmry_pe_ren_tasa', join: 'custrecord_lmry_pe_impuesto_renta' }) || 0;
                    tasaRenta = parseFloat(tasaRenta) / 100;
                    var percentRenta = searchImpuesto[i].getValue({ name: 'custrecord_lmry_pe_ren_porc', join: 'custrecord_lmry_pe_impuesto_renta' }) || 0;
                    percentRenta = parseFloat(percentRenta) / 100;
                    var cuentaRenta = searchImpuesto[i].getValue('custrecord_lmry_pe_cuenta');

                    jsonRenta[idRenta] = {
                        'tasaRenta': tasaRenta,
                        'percentRenta': percentRenta,
                        'cuentaRenta': cuentaRenta
                    };

                }
            }

            log.debug('jsonRenta', jsonRenta);

            return jsonRenta;

        }

        function getDateRate(idBills) {

            var jsonBill = {};

            var searchBills = search.create({
                type: 'vendorbill',
                filters: [
                    { name: 'internalid', operator: 'anyof', values: idBills },
                    { name: 'mainline', operator: 'is', values: 'T' }
                ],
                columns: ['trandate', 'exchangerate']
            });

            searchBills = searchBills.run().getRange(0, 1000);

            if (searchBills && searchBills.length) {
                for (var i = 0; i < searchBills.length; i++) {

                    jsonBill[searchBills[i].id] = {
                        'date': searchBills[i].getValue('trandate'),
                        'rate': searchBills[i].getValue('exchangerate')
                    }

                }
            }

            log.debug('jsonBill', jsonBill);

            return jsonBill;

        }

        function getIsFirstPayment(idBills, subsidiary, vendor, ap, currency) {

            var billsEncontrados = {};

            var searchLog = search.create({
                type: 'customrecord_lmry_pe_payments_log',
                filters: [
                    { name: 'custrecord_lmry_pe_subsidiary', operator: 'is', values: subsidiary },
                    { name: 'custrecord_lmry_pe_vendor', operator: 'is', values: vendor },
                    { name: 'custrecord_lmry_pe_account', operator: 'is', values: ap },
                    { name: 'custrecord_lmry_pe_currency', operator: 'is', values: currency },
                    { name: 'custrecord_lmry_pe_payment', operator: 'noneof', values: "@NONE@" },
                    { name: 'custrecord_lmry_pe_status', operator: 'is', values: 'Finalizado' }
                ],
                columns: [{ name: 'internalid', sort: search.Sort.DESC }, 'custrecord_lmry_pe_data']
            });

            searchLog = searchLog.run().getRange(0, 1000);

            if (searchLog && searchLog.length) {
                for (var i = 0; i < searchLog.length; i++) {

                    var data = searchLog[i].getValue('custrecord_lmry_pe_data');

                    for (var j = 0; j < idBills.length; j++) {

                        if (data.indexOf(idBills[j]) != -1) {
                            billsEncontrados[idBills[j]] = idBills[j];
                        }

                    }

                }
            }

            log.debug('billsEncontrados', billsEncontrados);

            return billsEncontrados;

        }

        function getFeatSetupTaxSubsidiary(idSubsi, feature) {
            try {
                var filtros = new Array();
                filtros[0] = search.createFilter({
                    name: 'isinactive',
                    operator: 'is',
                    values: ['F']
                });
                if (isOneWorld) {
                    filtros[1] = search.createFilter({
                        name: 'custrecord_lmry_setuptax_subsidiary',
                        operator: 'is',
                        values: idSubsi
                    });
                }
                var searchFeat = search.create({
                    type: 'customrecord_lmry_setup_tax_subsidiary',
                    columns: [feature],
                    filters: filtros
                });
                var resultFeat = searchFeat.run().getRange(0, 1);
                var featureSetup = resultFeat[0].getValue({ name: feature });

                return featureSetup;
            } catch (error) {
                log.error("[getFeatSetupTaxSubsidiary]","end")
            }

        }

        return {
            multibooking: multibooking,
            aplicarJournal: aplicarJournal,
            llenado_setuptax: llenado_setuptax,
            creadoPayment: creadoPayment,
            deleteJournal: deleteJournal,
            cargarLineasTransaccion: cargarLineasTransaccion,
            createJournal: createJournal,
            getWHTS: getWHTS,
            getFeatSetupTaxSubsidiary: getFeatSetupTaxSubsidiary
        };
    });
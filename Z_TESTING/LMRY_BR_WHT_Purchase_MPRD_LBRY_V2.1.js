/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = \
||   This script for customer center (Time)                      ||
||                                                               ||
||  File Name: LMRY_BR_WHT_Purchase_MPRD_LBRY_V2.1.js            ||
||                                                               ||
||  Version Date         Author        Remarks                   ||
||  2.1     Oct 31 2022  LatamReady    Use Script 2.1            ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/search', 'N/runtime', 'N/record', 'N/log', 'N/url', 'N/format'],

    function (serverWidget, search, runtime, record, log, url, format) {

        //JSON GLOBALES: GET INPUT DATA
        //var jsonLog = {};
        var jsonSetupTax = {};
        var jsonSetupGet = {};
        var jsonGrouped = {};
        var jsonWhtCode = {};
        var currentLog = '';


        var LmryScript = "LMRY_BR_Massive_WHT_Purchase_LBRY";

        function setLog(jsonLog, idLog, idUser, jsonSetupTax, jsonTaxRecord, subsiLog) {

            let entities = [];
            let searchObj = search.create({
                type: 'customrecord_lmry_br_wht_purchase_log',
                filters: ['internalid', 'anyof', idLog],
                columns: ['internalid', 'custrecord_lmry_br_wht_log_subsi', 'custrecord_lmry_br_wht_log_date', 'custrecord_lmry_br_wht_log_vendor', 'custrecord_lmry_br_wht_log_currency', 'custrecord_lmry_br_wht_log_apacc', 'custrecord_lmry_br_wht_log_bank',
                    'custrecord_lmry_br_wht_log_period', 'custrecord_lmry_br_wht_log_bills', 'custrecord_lmry_br_wht_log_memo', 'custrecord_lmry_br_wht_log_department', 'custrecord_lmry_br_wht_log_class', 'custrecord_lmry_br_wht_log_location',
                    'custrecord_lmry_br_wht_log_pmethod', 'custrecord_lmry_br_wht_log_check', 'custrecord_lmry_br_wht_log_process', 'custrecord_lmry_br_wht_log_advance', 'custrecord_lmry_br_wht_first_payment', 'custrecord_lmry_br_wht_log_reclasifacc']
            }).runPaged({ pageSize: 1000 });

            if (searchObj) {
                searchObj.pageRanges.forEach(function (pageRange) {
                    let page = searchObj.fetch({ index: pageRange.index });
                    let searchLog = page.data;
                    if (searchLog) {
                        for (let i = 0; i < searchLog.length; i++) {
                            let currentLog = searchLog[i].getValue("internalid");
                            jsonLog[currentLog] = {};

                            jsonLog[currentLog]['subsidiary'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_subsi');
                            jsonLog[currentLog]['vendor'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_vendor');
                            jsonLog[currentLog]['currency'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_currency');
                            jsonLog[currentLog]['apacc'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_apacc');
                            jsonLog[currentLog]['bank'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_bank');
                            jsonLog[currentLog]['date'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_date');
                            jsonLog[currentLog]['payments'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_bills');
                            jsonLog[currentLog]['period'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_period');
                            jsonLog[currentLog]['memo'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_memo');
                            jsonLog[currentLog]['check'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_check');
                            jsonLog[currentLog]['pmethod'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_pmethod');
                            jsonLog[currentLog]['process'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_process');
                            jsonLog[currentLog]['advance'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_advance');
                            jsonLog[currentLog]['firstpayment'] = searchLog[i].getValue('custrecord_lmry_br_wht_first_payment');
                            jsonLog[currentLog]['accreclassif'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_reclasifacc') || '';

                            //SEGMENTACION
                            jsonLog[currentLog]['department'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_department') || '';
                            jsonLog[currentLog]['class'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_class') || '';
                            jsonLog[currentLog]['location'] = searchLog[i].getValue('custrecord_lmry_br_wht_log_location') || '';

                            jsonLog[currentLog]['bills'] = {};
                            jsonLog[currentLog]['newbills'] = {};
                            jsonLog[currentLog]['percent'] = {};
                            jsonLog[currentLog]['truepercent'] = {};
                            jsonLog[currentLog]['multaeinteres'] = {};
                            jsonLog[currentLog]['journal'] = {};
                            jsonLog[currentLog]['primerpago'] = {};
                            jsonLog[currentLog]['percentjournal'] = {};

                            entities.push(searchLog[i].getValue('custrecord_lmry_br_wht_log_vendor'));

                            jsonLog[currentLog] = jsonConcat(jsonLog[currentLog], jsonSetupTax);

                            log.debug('jsonLog[currentLog]', JSON.stringify(jsonLog[currentLog]));
                            log.debug('currentLog', currentLog);
                            record.submitFields({
                                type: 'customrecord_lmry_br_wht_purchase_log',
                                id: currentLog,
                                values: {
                                    custrecord_lmry_br_wht_log_state: 'Procesando',
                                    custrecord_lmry_br_wht_log_employee: idUser
                                },
                                options: {
                                    ignoreMandatoryFields: true,
                                    disableTriggers: true
                                }
                            });
                            log.debug('currentLog', currentLog);
                        }
                    }
                });
            }

            getTaxRecords(jsonTaxRecord, entities, subsiLog);


        }

        function setError(idLog) {
            for (let index = 0; index < idLog.length; index++) {
                record.submitFields({
                    type: 'customrecord_lmry_br_wht_purchase_log',
                    id: idLog[index],
                    values: {
                        custrecord_lmry_br_wht_log_state: 'Ocurrio un error'
                    },
                    options: {
                        ignoreMandatoryFields: true,
                        disableTriggers: true
                    }
                });
            }
        }

        function getTaxRecords(jsonTaxRecord, entities, subsiLog) {
            // Contributory Class
            let columnsCC = [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'custrecord_lmry_ar_ccl_taxitem' }),
                search.createColumn({ name: 'custrecord_lmry_ccl_tax_rule' }),
                search.createColumn({ name: 'custrecord_lmry_ccl_wht_rule' }),
                search.createColumn({ name: 'custrecord_lmry_sub_type' }),
                search.createColumn({ name: 'custrecord_lmry_ar_ccl_entity' }),
                search.createColumn({ name: 'custrecord_lmry_ar_ccl_fechdesd' }),
                search.createColumn({ name: 'custrecord_lmry_ar_ccl_fechhast' }),
                search.createColumn({ name: 'custrecord_lmry_ar_ccl_taxrate' }),
                search.createColumn({ name: 'custrecord_lmry_ccl_apply_journal' })
            ];

            let filtersCC = [
                ['isinactive', 'is', 'F'], 'AND',
                ['custrecord_lmry_ccl_taxtype', 'is', '1'], 'AND', // Retencion
                ['custrecord_lmry_ccl_transactiontypes', 'is', '4'], 'AND', // Bill
                [
                    [
                        ['custrecord_lmry_ccl_gen_transaction', 'is', '5'], 'AND', // WHT by Transaction
                        ['custrecord_lmry_ccl_tax_rule', 'noneof', '@NONE@']
                    ], 'OR',
                    [
                        ['custrecord_lmry_ccl_gen_transaction', 'is', '8'], 'AND', // Latam WHT
                        ['custrecord_lmry_ccl_wht_rule', 'noneof', '@NONE@']
                    ]
                ], 'AND',
                ['custrecord_lmry_ccl_appliesto', 'is', '2'] // Lines
            ];
            if (entities) {
                filtersCC.push('AND', ['custrecord_lmry_ar_ccl_entity', 'anyof', entities]);
            }

            if (subsiLog) {
                filtersCC.push('AND', ['custrecord_lmry_ar_ccl_subsidiary', 'is', subsiLog]);
            }

            let contributoryClassSearch = search.create({
                type: 'customrecord_lmry_ar_contrib_class',
                columns: columnsCC,
                filters: filtersCC
            }).runPaged({ pageSize: 1000 });

            if (contributoryClassSearch) {
                contributoryClassSearch.pageRanges.forEach(function (pageRange) {
                    let page = contributoryClassSearch.fetch({ index: pageRange.index });
                    let results = page.data;
                    if (results) {
                        for (let i = 0; i < results.length; i++) {
                            let vendor = results[i].getValue('custrecord_lmry_ar_ccl_entity');
                            if (!jsonTaxRecord[vendor]) {
                                jsonTaxRecord[vendor] = {};
                            }
                            let index = results[i].getValue('internalid');
                            /*if (index) {
                                index += "|T";
                            } else {
                                index = results[i].getValue('custrecord_lmry_ccl_wht_rule') + "|W";
                            }*/
                            jsonTaxRecord[vendor][index] = {
                                item: results[i].getValue('custrecord_lmry_ar_ccl_taxitem'),
                                subtype: results[i].getValue('custrecord_lmry_sub_type'),
                                subtypetext: results[i].getText('custrecord_lmry_sub_type'),
                                rate: parseFloat(results[i].getValue('custrecord_lmry_ar_ccl_taxrate')),
                                startdate: results[i].getValue('custrecord_lmry_ar_ccl_fechdesd'),
                                enddate: results[i].getValue('custrecord_lmry_ar_ccl_fechhast'),
                                journal: results[i].getValue('custrecord_lmry_ccl_apply_journal')
                            }
                        }
                    }
                });
            }

            // National Taxes
            let columnsNT = [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'custrecord_lmry_ntax_taxitem' }),
                search.createColumn({ name: 'custrecord_lmry_ntax_tax_rule' }),
                search.createColumn({ name: 'custrecord_lmry_ntax_wht_rule' }),
                search.createColumn({ name: 'custrecord_lmry_ntax_sub_type' }),
                search.createColumn({ name: 'custrecord_lmry_ntax_datefrom' }),
                search.createColumn({ name: 'custrecord_lmry_ntax_dateto' }),
                search.createColumn({ name: 'custrecord_lmry_ntax_taxrate' }),
                search.createColumn({ name: 'custrecord_lmry_ntax_apply_journal' })
            ];

            let filtersNT = [
                ['isinactive', 'is', 'F'], 'AND',
                ['custrecord_lmry_ntax_taxtype', 'is', '1'], 'AND', // Retencion
                ['custrecord_lmry_ntax_transactiontypes', 'is', '4'], 'AND', // Bill
                [
                    [
                        ['custrecord_lmry_ntax_gen_transaction', 'is', '5'], 'AND', // WHT by Transaction
                        ['custrecord_lmry_ntax_tax_rule', 'noneof', '@NONE@']
                    ], 'OR',
                    [
                        ['custrecord_lmry_ntax_gen_transaction', 'is', '8'], 'AND', // Latam WHT
                        ['custrecord_lmry_ntax_wht_rule', 'noneof', '@NONE@']
                    ]
                ], 'AND',
                ['custrecord_lmry_ntax_appliesto', 'is', '2'] // Lines
            ];

            if (subsiLog) {
                filtersNT.push('AND', ['custrecord_lmry_ntax_subsidiary', 'is', subsiLog]);
            }

            let nationalTaxesSearch = search.create({
                type: 'customrecord_lmry_national_taxes',
                columns: columnsNT,
                filters: filtersNT
            }).runPaged({ pageSize: 1000 });

            if (nationalTaxesSearch) {
                nationalTaxesSearch.pageRanges.forEach(function (pageRange) {
                    let page = nationalTaxesSearch.fetch({ index: pageRange.index });
                    let results = page.data;
                    if (results) {
                        for (let i = 0; i < results.length; i++) {
                            let vendor = "0";
                            if (!jsonTaxRecord[vendor]) {
                                jsonTaxRecord[vendor] = {};
                            }
                            let index = results[i].getValue('internalid');
                            /*if (index) {
                                index += "|T";
                            } else {
                                index = results[i].getValue('custrecord_lmry_ntax_wht_rule') + "|W";
                            }*/
                            jsonTaxRecord[vendor][index] = {
                                item: results[i].getValue('custrecord_lmry_ntax_taxitem'),
                                subtype: results[i].getValue('custrecord_lmry_ntax_sub_type'),
                                subtypetext: results[i].getText('custrecord_lmry_ntax_sub_type'),
                                rate: parseFloat(results[i].getValue('custrecord_lmry_ntax_taxrate')),
                                startdate: results[i].getValue('custrecord_lmry_ntax_datefrom'),
                                enddate: results[i].getValue('custrecord_lmry_ntax_dateto'),
                                journal: results[i].getValue('custrecord_lmry_ntax_apply_journal')
                            }
                        }
                    }
                });
            }

            log.debug('jsonTaxRecord', JSON.stringify(jsonTaxRecord));
        }

        function creadoTransacciones(currentPayment, idLog) {
            var subsidiary = currentPayment.subsidiary;
            var accountingPeriod = currentPayment.period;
            var vendor = currentPayment.vendor;
            var fechaIngresada = currentPayment.date;
            fechaIngresada = format.parse({ value: fechaIngresada, type: format.Type.DATE });
            var currency = currentPayment.currency;
            var apacc = currentPayment.apacc;
            var bank = currentPayment.bank;
            var memo = currentPayment.memo;
            var bills = currentPayment.bills;
            var payments = currentPayment.payments;
            var primerBill = currentPayment.primerb;
            var c_department = currentPayment.department;
            var c_class = currentPayment.class;
            var c_location = currentPayment.location;
            var pmethod = currentPayment.pmethod;
            var check = currentPayment.check;
            var formPayment = currentPayment.formPayment;
            var formJournal = currentPayment.formJournal;
            var formBill = currentPayment.formBill;
            var whtSubtypes = currentPayment.whtSubtypes;
            var journal = currentPayment.journal;
            var percent = currentPayment.percent;
            var truepercent = currentPayment.truepercent;
            var multaeinteres = currentPayment.multaeinteres;
            var itemInteres = currentPayment.itemInteres;
            var itemMulta = currentPayment.itemMulta;
            var newBills = currentPayment.newbills;
            var documento = currentPayment.documentType;
            var taxCode = currentPayment.taxCode;
            var percentjournal = currentPayment.percentjournal;
            var process = currentPayment.process;
            var advance = currentPayment.advance;
            var acc_reclassif = currentPayment.accreclassif;
            var fullWHT = currentPayment.fullwht;
            var firstPayment = currentPayment.firstpayment;
            firstPayment = JSON.parse(firstPayment);

            var localCurrency = currentPayment.localCurrency;


            //CONFIGURACIONES
            var userObj = runtime.getCurrentUser();
            var mandatoryDepartment = userObj.getPreference({ name: "DEPTMANDATORY" });
            var mandatoryClass = userObj.getPreference({ name: "CLASSMANDATORY" });
            var mandatoryLocation = userObj.getPreference({ name: "LOCMANDATORY" });
            // CP2400485 : 12/09/2023 Segmentacion en la Linea del Journal
            var mandatory_onjourn = userObj.getPreference({ name: "CDLPERLINEONJE" });

            //Nuevo para bills multa e interes
            var multaBills = {};

            //CREADO DE BILLS DE MULTA E INTERES
            var idsMultaInteres = '';
            for (var i in multaeinteres) {
                for (var j in multaeinteres[i]) {

                    var multa = multaeinteres[i][j][0];
                    var interes = multaeinteres[i][j][1];

                    var amountNewBill = 0;
                    if (multa) {
                        amountNewBill += parseFloat(multa);
                    }
                    if (interes) {
                        amountNewBill += parseFloat(interes);
                    }

                    if (parseFloat(amountNewBill) > 0) {
                        var obj_bill = record.copy({ type: 'vendorbill', id: i, isDynamic: false });

                        if (formBill != '') {
                            obj_bill.setValue({ fieldId: 'customform', value: formBill });
                        }

                        /*obj_bill.setValue({fieldId: 'entity',value: vendor});
                        obj_bill.setValue({fieldId: 'subsidiary',value: subsidiary});
                        obj_bill.setValue({fieldId: 'currency',value: currency});
                        obj_bill.setValue({fieldId: 'apacct',value: apacc});*/

                        cleanVendorBillFields(obj_bill);

                        //CAMPOS DE CABECERA
                        obj_bill.setValue({ fieldId: 'trandate', value: fechaIngresada });
                        obj_bill.setValue({ fieldId: 'postingperiod', value: accountingPeriod });
                        obj_bill.setValue({ fieldId: 'approvalstatus', value: '2' });
                        obj_bill.setValue({ fieldId: 'custbody_lmry_reference_transaction', value: i });
                        obj_bill.setValue({ fieldId: 'custbody_lmry_reference_transaction_id', value: i });


                        var installments = runtime.isFeatureInEffect({ feature: "INSTALLMENTS" });
                        if (installments) {
                            obj_bill.setValue('terms', '');
                        }

                        if (documento) {
                            obj_bill.setValue({ fieldId: 'custbody_lmry_document_type', value: documento });
                        }

                        //SEGMENTACION
                        var bDepartment = obj_bill.getValue('department') ? obj_bill.getValue('department') : c_department;
                        var bClass = obj_bill.getValue('class') ? obj_bill.getValue('class') : c_class;
                        var bLocation = obj_bill.getValue('location') ? obj_bill.getValue('location') : c_location;

                        //REMOVER LINEAS
                        var totalItems = obj_bill.getLineCount({ sublistId: 'item' });
                        for (var k = 0; k < totalItems; k++) {
                            obj_bill.removeLine({ sublistId: 'item', line: totalItems - k - 1 });
                        }

                        var totalExpenses = obj_bill.getLineCount({ sublistId: 'expense' });
                        for (var k = 0; k < totalExpenses; k++) {
                            obj_bill.removeLine({ sublistId: 'expense', line: totalExpenses - k - 1 });
                        }

                        //ADICION DE LINEAS
                        var c = 0, memoBill = 'Latam - ';
                        if (multa && itemMulta) {
                            obj_bill.insertLine({ sublistId: 'item', line: c });

                            obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'item', line: c, value: itemMulta });
                            obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: c, value: "1" });
                            obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: c, value: multa });
                            if (taxCode) {
                                obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'taxcode', line: c, value: taxCode });
                            }

                            if (mandatoryDepartment && bDepartment) {
                                obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'department', line: c, value: bDepartment });
                            }

                            if (mandatoryClass && bClass) {
                                obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'class', line: c, value: bClass });
                            }

                            if (mandatoryLocation && bLocation) {
                                obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'location', line: c, value: bLocation });
                            }

                            memoBill = 'Multa';
                            c++;
                        }

                        if (interes && itemInteres) {
                            obj_bill.insertLine({ sublistId: 'item', line: c });

                            obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'item', line: c, value: itemInteres });
                            obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: c, value: "1" });
                            obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: c, value: interes });
                            if (taxCode) {
                                obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'taxcode', line: c, value: taxCode });
                            }

                            if (mandatoryDepartment && bDepartment) {
                                obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'department', line: c, value: bDepartment });
                            }

                            if (mandatoryClass && bClass) {
                                obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'class', line: c, value: bClass });
                            }

                            if (mandatoryLocation && bLocation) {
                                obj_bill.setSublistValue({ sublistId: 'item', fieldId: 'location', line: c, value: bLocation });
                            }

                            (c > 0) ? memoBill += ' e Interes' : memoBill += 'Interes';
                            c++;
                        }

                        obj_bill.setValue({ fieldId: 'memo', value: memoBill });

                        if (c > 0) {
                            var idNewBill = obj_bill.save({ ignoreMandatoryFields: true, disableTriggers: true });
                            idsMultaInteres += idNewBill + "|";
                            multaBills[idNewBill] = amountNewBill;
                        }
                    }
                }
            }

            log.debug('multaBills', multaBills);

            //CREADO DE BILL PAYMENT
            var obj_payment = record.transform({ fromType: record.Type.VENDOR_BILL, fromId: primerBill, toType: record.Type.VENDOR_PAYMENT, isDynamic: true });

            if (formPayment != '') {
                obj_payment.setValue({ fieldId: 'customform', value: formPayment });
            }

            obj_payment.setValue({ fieldId: 'subsidiary', value: subsidiary });
            obj_payment.setValue({ fieldId: 'trandate', value: fechaIngresada });
            obj_payment.setValue({ fieldId: 'postingperiod', value: accountingPeriod });
            obj_payment.setValue({ fieldId: 'currency', value: currency });
            obj_payment.setValue({ fieldId: 'apacct', value: apacc });
            obj_payment.setValue({ fieldId: 'account', value: bank });

            if (memo != null && memo != '') {
                obj_payment.setValue({ fieldId: 'memo', value: memo });
            }

            if (c_department != null && c_department != '') {
                obj_payment.setValue({ fieldId: 'department', value: c_department });
            }

            if (c_class != null && c_class != '') {
                obj_payment.setValue({ fieldId: 'class', value: c_class });
            }

            if (c_location != null && c_location != '') {
                obj_payment.setValue({ fieldId: 'location', value: c_location });
            }

            obj_payment.setValue({ fieldId: 'custbody_lmry_paymentmethod', value: pmethod });

            if (check != null && check != '') {
                try {
                    obj_payment.setValue({ fieldId: 'tranid', value: check });
                } catch (err) {
                    log.error('Error tranid Payment', err);

                    if (idsMultaInteres) {
                        var deleteMultaInteres = idsMultaInteres.split('|');
                        for (var i = 0; i < deleteMultaInteres.length - 1; i++) {
                            record.delete({ type: 'vendorbill', id: deleteMultaInteres[i] });
                        }
                    }

                    record.submitFields({ type: 'customrecord_lmry_br_wht_purchase_log', id: idLog, values: { custrecord_lmry_br_wht_log_state: 'Ocurrio un error' }, options: { ignoreMandatoryFields: true, disableTriggers: true } });
                    return true;

                }

            }

            //PAGO DE BILLS
            var cant_pay = obj_payment.getLineCount({ sublistId: 'apply' });
            var line_pay = 0, idPayment = '';
            var banderaJournal = true;

            for (var i = 0; i < cant_pay; i++) {
                obj_payment.selectLine({ sublistId: 'apply', line: i });
                var docid = obj_payment.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'doc' });

                //APLICACION DE BILLS NORMALES
                for (var j in newBills) {
                    for (k in newBills[j]) {
                        if (docid == j) {
                            if (k == '0') {
                                obj_payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                                obj_payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: newBills[j][k][2] });
                                line_pay++;
                            } else {
                                var numberInstallment = obj_payment.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'installmentnumber' });
                                if (numberInstallment == k) {
                                    obj_payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                                    obj_payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: newBills[j][k][2] });
                                    line_pay++;
                                }
                            }

                        }

                    }
                }

                //APLICACION DE NOTA DE CREDITO: ANTICIPO
                if (advance && banderaJournal) {
                    var auxAdvance = JSON.parse(advance);

                    var amountJournal = obj_payment.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'total' });

                    for (var j in auxAdvance) {
                        if (auxAdvance[j]['id'] == docid && parseFloat(auxAdvance[j]['amount']) == Math.abs(parseFloat(amountJournal))) {
                            obj_payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                            //obj_payment.setCurrentSublistValue({sublistId: 'apply',fieldId: 'amount',value: parseFloat(auxAdvance[j]['amount'])});
                            banderaJournal = false;
                        }
                    }

                    var brTransFieldSearch = search.create({
                        type: 'customrecord_lmry_br_transaction_fields',
                        columns: ['internalid'],
                        filters: [['custrecord_lmry_br_related_transaction', 'anyof', Object.keys(auxAdvance)]]
                    });
                    brTransFieldSearch = brTransFieldSearch.run().getRange(0, 1000);
                    if (brTransFieldSearch && brTransFieldSearch.length) {
                        for (let k = 0; k < brTransFieldSearch.length; k++) {
                            record.submitFields({
                                type: 'customrecord_lmry_br_transaction_fields',
                                id: brTransFieldSearch[k].getValue('internalid'),
                                values: { custrecord_lmry_br_advance: false, custrecord_lmry_br_amount_advance: '' },
                                options: { ignoreMandatoryFields: true, disableTriggers: true }
                            })
                        }
                    }
                }

            }

            //ACCOUNTING BOOK: BILL PAYMENT
            var ids = '0', rates = obj_payment.getValue("exchangerate");

            if (obj_payment.getLineCount({ sublistId: 'accountingbookdetail' }) > 0) {
                for (var i = 0; i < obj_payment.getLineCount({ sublistId: 'accountingbookdetail' }); i++) {
                    obj_payment.selectLine({ sublistId: 'accountingbookdetail', line: i });
                    var idBook = obj_payment.getCurrentSublistValue({ sublistId: 'accountingbookdetail', fieldId: 'bookid' });
                    var rateBook = obj_payment.getCurrentSublistValue({ sublistId: 'accountingbookdetail', fieldId: 'exchangerate' });

                    ids += '|' + idBook;
                    rates += '|' + rateBook;
                }
            }

            ids += '&' + rates;

            //SAVE DEL PAGO
            if (line_pay > 0) {
                try {
                    idPayment = obj_payment.save({ ignoreMandatoryFields: true, disableTriggers: false });
                } catch (err) {
                    log.error('Error al generarse el pago', err);

                    if (idsMultaInteres) {
                        var deleteMultaInteres = idsMultaInteres.split('|');
                        for (var i = 0; i < deleteMultaInteres.length - 1; i++) {
                            record.delete({ type: 'vendorbill', id: deleteMultaInteres[i] });
                        }
                    }

                    record.submitFields({ type: 'customrecord_lmry_br_wht_purchase_log', id: idLog, values: { custrecord_lmry_br_wht_log_state: 'Ocurrio un error' }, options: { ignoreMandatoryFields: true, disableTriggers: true } });
                    return true;

                }

                log.debug('idPayment', idPayment);

                var localExchangeRate = 1;
                //APLICACION DE LOS BILLS DE MULTA E INTERES AL PAGO
                if (idPayment) {
                    var loadPayment = record.load({ type: 'vendorpayment', id: idPayment, isDynamic: true });
                    var cant_pay = loadPayment.getLineCount({ sublistId: 'apply' });

                    for (var i = 0; i < cant_pay; i++) {
                        loadPayment.selectLine({ sublistId: 'apply', line: i });
                        var docid = loadPayment.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'doc' });

                        for (var j in multaBills) {
                            if (j == docid) {
                                var paymentTotal = loadPayment.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'total' });
                                loadPayment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                                loadPayment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: paymentTotal });
                            }
                        }

                    }

                    loadPayment.setValue('custbody_lmry_br_amount_advance', '1');

                    localExchangeRate = getLocalExchangeRate(loadPayment, localCurrency);
                    log.debug("localExchangeRate", localExchangeRate);

                    loadPayment.save({ ignoreMandatoryFields: true, disableTriggers: false });

                }

                //ACTUALIZACION LOG
                if (idPayment) {
                    record.submitFields({
                        type: 'customrecord_lmry_br_wht_purchase_log', id: idLog, values: {
                            custrecord_lmry_br_wht_log_state: 'El pago ha sido generado, se estan generando las retenciones en caso hubiera, espere el estado FINALIZADO',
                            custrecord_lmry_br_wht_log_payment: idPayment, custrecord_lmry_br_wht_log_id_payment: idPayment
                        }, options: { ignoreMandatoryFields: true, disableTriggers: true }
                    });

                    //ACTUALIZACION DE MULTA E INTERES EN EL BR TRANSACTION FIELD
                    var idBrTransaction = '';
                    for (var i in bills) {
                        var multa = 0, interes = 0;
                        for (var k in multaeinteres[i]) {
                            if (multaeinteres[i][k][0]) {
                                multa += parseFloat(multaeinteres[i][k][0]);
                            }

                            if (multaeinteres[i][k][1]) {
                                interes += parseFloat(multaeinteres[i][k][1]);
                            }

                        }

                        idBrTransaction += multa + ";" + interes + ";";

                        var searchBR = search.create({ type: 'customrecord_lmry_br_transaction_fields', columns: ['internalid', 'custrecord_lmry_br_multa', 'custrecord_lmry_br_interes'], filters: [{ name: 'custrecord_lmry_br_related_transaction', operator: 'anyof', values: i }] });
                        var resultBR = searchBR.run().getRange({ start: 0, end: 1 });

                        //BR EXISTE
                        if (resultBR != null && resultBR.length > 0) {
                            var multaBR = resultBR[0].getValue('custrecord_lmry_br_multa');
                            var interesBR = resultBR[0].getValue('custrecord_lmry_br_interes');

                            if (multaBR) {
                                multa += parseFloat(multaBR);
                            }

                            if (interesBR) {
                                interes += parseFloat(interesBR);
                            }

                            idBrTransaction += resultBR[0].getValue('internalid') + "|";

                            record.submitFields({ type: 'customrecord_lmry_br_transaction_fields', id: resultBR[0].getValue('internalid'), values: { custrecord_lmry_br_multa: multa, custrecord_lmry_br_interes: interes }, options: { ignoreMandatoryFields: true, disableTriggers: true } });
                        } else {
                            //BR NO EXISTE
                            var newBR = record.create({ type: 'customrecord_lmry_br_transaction_fields' });
                            newBR.setValue('custrecord_lmry_br_related_transaction', i);
                            newBR.setValue('custrecord_lmry_br_multa', multa);
                            newBR.setValue('custrecord_lmry_br_interes', interes);

                            var idBR = newBR.save({ ignoreMandatoryFields: true, disableTriggers: true });
                            idBrTransaction += idBR + "|";

                        }
                    }

                    record.submitFields({ type: 'customrecord_lmry_br_wht_purchase_log', id: idLog, values: { custrecord_lmry_br_wht_log_ids: idsMultaInteres, custrecord_lmry_br_wht_log_id_br: idBrTransaction }, options: { ignoreMandatoryFields: true, disableTriggers: true } });

                }
            }

            //COPY TAX RESULT
            for (var i in bills) {
                //BILL NO TIENE TAX RESULT
                if (bills[i].length == 0) {
                    continue;
                }

                for (var j = 0; j < bills[i].length; j++) {
                    var copyTaxResult = record.copy({ type: 'customrecord_lmry_br_transaction', id: bills[i][j], isDynamic: true });

                    var truePercentBill = 0;

                    //SI ES PRIMER PAGO Y CHECK ACTIVO: TODA LA RETENCION AL TAX RESULT
                    if (fullWHT) {
                        if (firstPayment[i]) {
                            truePercentBill = 1;
                        } else { //SEGUNDO PAGO, NADA DE RETENCION
                            break;
                        }
                    } else { // CHECK INACTIVO, RETENCION ACORDE AL PAGO (SUMATORIA: POR EL CASO DE INSTALLMENTS)
                        for (var k in percentjournal[i]) {
                            truePercentBill += parseFloat(percentjournal[i][k]);
                        }
                    }

                    var base_amount = copyTaxResult.getValue('custrecord_lmry_base_amount') || 0.00;

                    if (parseFloat(base_amount) >= 0) {
                        base_amount = parseFloat(base_amount) * parseFloat(truePercentBill);
                        base_amount = Math.round(parseFloat(base_amount) * 10000) / 10000;
                        copyTaxResult.setValue('custrecord_lmry_base_amount', base_amount);
                    }

                    var total = copyTaxResult.getValue('custrecord_lmry_br_total') || 0.00;
                    if (parseFloat(total) >= 0) {
                        total = parseFloat(total) * parseFloat(truePercentBill);
                        total = Math.round(parseFloat(total) * 10000) / 10000;
                        copyTaxResult.setValue('custrecord_lmry_br_total', total);
                    }

                    var total_base = parseFloat(total);
                    var baseLocal = parseFloat(base_amount);
                    if (localExchangeRate != 1) {
                        total_base = round2(total_base) * localExchangeRate;
                        baseLocal = round2(baseLocal) * localExchangeRate;
                    }
                    if (parseFloat(total_base) >= 0) {
                        copyTaxResult.setValue('custrecord_lmry_total_base_currency', round4(total_base));
                    }

                    //NUEVOS CAMPOS: TAB LOCAL CURRENCY
                    if (parseFloat(baseLocal) >= 0) {
                        copyTaxResult.setValue('custrecord_lmry_base_amount_local_currc', baseLocal);
                    }

                    if (parseFloat(total_base) >= 0) {
                        copyTaxResult.setValue('custrecord_lmry_amount_local_currency', total_base);
                    }

                    copyTaxResult.setValue('custrecord_lmry_br_transaction', idPayment);
                    copyTaxResult.setValue('custrecord_lmry_br_related_id', parseFloat(idPayment) + "");
                    copyTaxResult.setValue('custrecord_lmry_related_applied_transact', i);
                    copyTaxResult.setValue('custrecord_lmry_accounting_books', ids);

                    var idTaxResult = copyTaxResult.save({ ignoreMandatoryFields: true, disableTriggers: true });
                    //log.debug('idTaxResult',idTaxResult);

                }
            }

            createImportTaxResults(bills, percentjournal, idPayment, ids, fullWHT, firstPayment, localExchangeRate);

            //Creación Journal Reclasificación
            if (acc_reclassif != 0 && acc_reclassif != null && acc_reclassif != '') {
                var journalReclassif = createJournalReclassif(acc_reclassif, currentPayment, idPayment, multaBills);
                log.debug('journalReclassif', journalReclassif);
                if (journalReclassif) {
                    record.submitFields({ type: 'customrecord_lmry_br_wht_purchase_log', id: idLog, values: { custrecord_lmry_br_wht_journal_reclassif: journalReclassif }, options: { ignoreMandatoryFields: true, disableTriggers: true } });
                }
            }

            //CREACION JOURNAL
            var searchAccount = search.create({
                type: 'customrecord_lmry_br_wht_purchase_acc', columns: ['custrecord_lmry_br_wht_purchase_subtype', 'custrecord_lmry_br_wht_purchase_debit', 'custrecord_lmry_br_wht_purchase_credit'],
                filters: [{ name: 'custrecord_lmry_br_wht_purchase_subsi', operator: 'anyof', values: subsidiary }, { name: 'isinactive', operator: 'is', values: 'F' }]
            });

            var resultAccount = searchAccount.run().getRange({ start: 0, end: 1000 });

            var jsonAccount = {};
            if (resultAccount != null && resultAccount.length > 0) {
                for (var i = 0; i < resultAccount.length; i++) {
                    var subtype = resultAccount[i].getValue('custrecord_lmry_br_wht_purchase_subtype');
                    var debitAccount = resultAccount[i].getValue('custrecord_lmry_br_wht_purchase_debit');
                    var creditAccount = resultAccount[i].getValue('custrecord_lmry_br_wht_purchase_credit');

                    jsonAccount[subtype + ";" + debitAccount] = creditAccount;

                }
            }

            var journalAc = record.create({ type: 'journalentry', isDynamic: true });

            if (formJournal != '') {
                journalAc.setValue({ fieldId: 'customform', value: formJournal });
            }

            journalAc.setValue('subsidiary', subsidiary);
            journalAc.setValue('currency', currency);
            journalAc.setValue('trandate', fechaIngresada);
            journalAc.setValue('postingperiod', accountingPeriod);
            journalAc.setValue('memo', 'LatamReady - BR WHT Purchase');

            let featureApprovalJournal = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
            if (featureApprovalJournal == true || featureApprovalJournal == 'T') {
                journalAc.setValue('approvalstatus', '2');
            }

            journalAc.setValue('custbody_lmry_reference_transaction', idPayment);
            journalAc.setValue('custbody_lmry_reference_transaction_id', idPayment);

            var contadorJournal = 0;
            for (var i in journal) {
                var numeroBill = i;

                var truePercentBill = 0;

                //SI ES PRIMER PAGO Y CHECK ACTIVO: TODA LA RETENCION AL TAX RESULT
                if (fullWHT) {
                    if (firstPayment[numeroBill]) {
                        truePercentBill = 1;
                    } else { //SEGUNDO PAGO, NADA DE RETENCION
                        continue;
                    }
                } else { // CHECK INACTIVO, RETENCION ACORDE AL PAGO (SUMATORIA: POR EL CASO DE INSTALLMENTS)
                    for (var k in percentjournal[numeroBill]) {
                        truePercentBill += parseFloat(percentjournal[numeroBill][k]);
                    }
                }

                for (var j in journal[i]) {
                    var applyjournal = journal[i][j]['journal'];
                    if (applyjournal == "F" || applyjournal == false || applyjournal == "") {
                        continue;
                    }

                    var monto = journal[i][j]['amount'];
                    monto = Math.abs(parseFloat(monto)) * parseFloat(truePercentBill);
                    monto = Math.round(parseFloat(monto) * 100) / 100;

                    var debitAccount = journal[i][j]['account'];
                    var impuesto = journal[i][j]['impuesto'];

                    if (parseFloat(monto) <= 0) {
                        continue;
                    }

                    if (jsonAccount[impuesto + ";" + debitAccount] != null && jsonAccount[impuesto + ";" + debitAccount] != undefined) {
                        journalAc.selectNewLine({ sublistId: 'line' });
                        journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: debitAccount });
                        journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: monto });
                        journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_pe_transaction_reference', value: numeroBill });

                        if (journal[i][j]['department'] != null && journal[i][j]['department'] != '') {
                            journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: journal[i][j]['department'] });
                        } else {
                            // CP2400485 : 12/09/2023 Segmentacion en la Linea del Journal
                            if (mandatory_onjourn && c_department) {
                                journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: c_department });
                            }
                        }

                        if (journal[i][j]['class'] != null && journal[i][j]['class'] != '') {
                            journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: journal[i][j]['class'] });
                        } else {
                            // CP2400485 : 12/09/2023 Segmentacion en la Linea del Journal
                            if (mandatory_onjourn && c_class) {
                                journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: c_class });
                            }
                        }

                        if (journal[i][j]['location'] != null && journal[i][j]['location'] != '') {
                            journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: journal[i][j]['location'] });
                        } else {
                            // CP2400485 : 12/09/2023 Segmentacion en la Linea del Journal
                            if (mandatory_onjourn && c_location) {
                                journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: c_location });
                            }
                        }

                        journalAc.commitLine({ sublistId: 'line' });

                        journalAc.selectNewLine({ sublistId: 'line' });
                        journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: jsonAccount[impuesto + ";" + debitAccount] });
                        journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: monto });
                        journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_pe_transaction_reference', value: numeroBill });

                        if (journal[i][j]['department'] != null && journal[i][j]['department'] != '') {
                            journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: journal[i][j]['department'] });
                        } else {
                            // CP2400485 : 12/09/2023 Segmentacion en la Linea del Journal
                            if (mandatory_onjourn && c_department) {
                                journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: c_department });
                            }
                        }

                        if (journal[i][j]['class'] != null && journal[i][j]['class'] != '') {
                            journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: journal[i][j]['class'] });
                        } else {
                            // CP2400485 : 12/09/2023 Segmentacion en la Linea del Journal
                            if (mandatory_onjourn && c_class) {
                                journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: c_class });
                            }
                        }

                        if (journal[i][j]['location'] != null && journal[i][j]['location'] != '') {
                            journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: journal[i][j]['location'] });
                        } else {
                            // CP2400485 : 12/09/2023 Segmentacion en la Linea del Journal
                            if (mandatory_onjourn && c_location) {
                                journalAc.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: c_location });
                            }
                        }

                        journalAc.commitLine({ sublistId: 'line' });

                        contadorJournal++;
                    }
                }

            }

            var idJournal = '';
            if (contadorJournal > 0) {
                idJournal = journalAc.save({ ignoreMandatoryFields: true, disableTriggers: true });
            }

            log.debug('idJournal', idJournal);

            if (idJournal) {
                record.submitFields({ type: 'customrecord_lmry_br_wht_purchase_log', id: idLog, values: { custrecord_lmry_br_wht_log_journal: idJournal, custrecord_lmry_br_wht_log_state: 'Finalizado' }, options: { ignoreMandatoryFields: true, disableTriggers: true } });
            } else {
                record.submitFields({ type: 'customrecord_lmry_br_wht_purchase_log', id: idLog, values: { custrecord_lmry_br_wht_log_state: 'Finalizado' }, options: { ignoreMandatoryFields: true, disableTriggers: true } });
            }

        }

        function createJournalReclassif(accReclassif, jsonLog, idPayment, multaBills) {

            var subsidiary = jsonLog.subsidiary;
            var accountingPeriod = jsonLog.period;
            var vendor = jsonLog.vendor;
            var fechaIngresada = jsonLog.date;
            fechaIngresada = format.parse({ value: fechaIngresada, type: format.Type.DATE });
            var currency = jsonLog.currency;
            var apacc = jsonLog.apacc;
            var bank = jsonLog.bank;
            var payments = jsonLog.payments;
            var c_department = jsonLog.department;
            var c_class = jsonLog.class;
            var c_location = jsonLog.location;
            var formJournal = jsonLog.formJournal;
            var acc_reclassif = jsonLog.accreclassif;
            var pago_total = 0;

            var separa = payments.split("|");

            for (var i = 0; i < separa.length - 1; i++) {
                var tramo = separa[i].split(";"); //ID-BILL, PAGO BILL, RESTANTE BILL, MONTO TOTAL BILL
                var monto = Math.round(parseFloat(tramo[3]) * 100) / 100;
                pago_total = parseFloat(pago_total) + monto;
                if (Object.keys(multaBills).length) {
                    if (tramo[6]) {
                        var multa = Math.round(parseFloat(tramo[6]) * 100) / 100;
                        log.debug('multa', multa);
                        pago_total = parseFloat(pago_total) + multa;
                    }
                    if (tramo[7]) {
                        var intereses = Math.round(parseFloat(tramo[7]) * 100) / 100;
                        log.debug('intereses', intereses);
                        pago_total = parseFloat(pago_total) + intereses;
                    }
                }
            }
            log.debug('pago_total', pago_total);

            var searchProveedor = search.create({ type: 'customrecord_lmry_br_reclasif_tarjeta', columns: ['custrecord_lmry_br_proveedor'], filters: [['custrecord_lmry_br_cuenta_tarjeta', 'anyof', acc_reclassif], 'AND', ['custrecord_lmry_br_subsidiary', 'anyof', subsidiary]] });
            var resultProveedor = searchProveedor.run().getRange({ start: 0, end: 1 });

            var row = resultProveedor[0].columns;
            var idProveedor = resultProveedor[0].getValue(row[0]);
            log.debug('idProveedor', idProveedor);

            var journalReclassif = record.create({ type: 'journalentry', isDynamic: true });

            if (formJournal != '') {
                journalReclassif.setValue({ fieldId: 'customform', value: formJournal });
            }

            journalReclassif.setValue('subsidiary', subsidiary);
            journalReclassif.setValue('currency', currency);
            journalReclassif.setValue('trandate', fechaIngresada);
            journalReclassif.setValue('postingperiod', accountingPeriod);
            journalReclassif.setValue('memo', 'LatamReady - BR Reclassification');
            journalReclassif.setValue('approvalstatus', '2');

            journalReclassif.setValue('custbody_lmry_reference_transaction', idPayment);
            journalReclassif.setValue('custbody_lmry_reference_transaction_id', idPayment);

            journalReclassif.selectNewLine({ sublistId: 'line' });
            journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accReclassif });
            journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: pago_total });
            journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: idProveedor });

            if (c_department != null && c_department != '') {
                journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: c_department });
            }

            if (c_class != null && c_class != '') {
                journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: c_class });
            }

            if (c_location != null && c_location != '') {
                journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: c_location });
            }

            journalReclassif.commitLine({ sublistId: 'line' });

            journalReclassif.selectNewLine({ sublistId: 'line' });
            journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: apacc });
            journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: pago_total });
            journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: vendor });

            if (c_department != null && c_department != '') {
                journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: c_department });
            }

            if (c_class != null && c_class != '') {
                journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: c_class });
            }

            if (c_location != null && c_location != '') {
                journalReclassif.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: c_location });
            }

            journalReclassif.commitLine({ sublistId: 'line' });

            var idJournal = journalReclassif.save({ ignoreMandatoryFields: true, disableTriggers: true });
            return idJournal;

        }

        function iteracionBill(jsonLog, currentLog, jsonTaxRecord) {

            let bills = [], billsAux = [];
            let payments = jsonLog[currentLog]['payments'].split('|');

            for (let i = 0; i < payments.length - 1; i++) {
                let auxBill = payments[i].split(';');
                //0:bill ID, 1:total, 2:amount due, 3:payment amount, 4:total de Invoice, 5:num.Installment, 6:mora, 7:interes, 8:anticipo, 9:es primer pago

                let numeroInstallment = auxBill[5];

                if (jsonLog[currentLog]['multaeinteres'][auxBill[0]] == null || jsonLog[currentLog]['multaeinteres'][auxBill[0]] == undefined) {
                    jsonLog[currentLog]['multaeinteres'][auxBill[0]] = {};
                    jsonLog[currentLog]['truepercent'][auxBill[0]] = {};
                    jsonLog[currentLog]['percent'][auxBill[0]] = {};
                    jsonLog[currentLog]['newbills'][auxBill[0]] = {};
                    //jsonLog[currentLog]['advance'][auxBill[0]] = {};
                    jsonLog[currentLog]['primerpago'][auxBill[0]] = {};
                    jsonLog[currentLog]['percentjournal'][auxBill[0]] = {};
                    //jsonLog[currentLog]['bills'][auxBill[0]] = [0,0,0,0];

                    bills.push(auxBill[0]);
                    billsAux.push(auxBill[0]);

                }

                jsonLog[currentLog]['bills'][auxBill[0]] = [];

                jsonLog[currentLog]['primerpago'][auxBill[0]][numeroInstallment] = auxBill[9];
                jsonLog[currentLog]['multaeinteres'][auxBill[0]][numeroInstallment] = [auxBill[6], auxBill[7]];
                jsonLog[currentLog]['truepercent'][auxBill[0]][numeroInstallment] = parseFloat(auxBill[3]) / parseFloat(auxBill[4]);
                jsonLog[currentLog]['percent'][auxBill[0]][numeroInstallment] = parseFloat(auxBill[3]) / parseFloat(auxBill[1]);

                if (auxBill[9] == 'T' && jsonLog[currentLog]['process'] == 'Individual' && parseFloat(auxBill[8]) > 0) {
                    auxBill[3] = parseFloat(auxBill[3]) + parseFloat(auxBill[8]);
                }

                jsonLog[currentLog]['newbills'][auxBill[0]][numeroInstallment] = [auxBill[1], auxBill[2], auxBill[3], auxBill[5]];
                jsonLog[currentLog]['percentjournal'][auxBill[0]][numeroInstallment] = parseFloat(auxBill[3]) / parseFloat(auxBill[4]);

            }

            log.debug('bills', bills);
            jsonLog[currentLog]['primerb'] = bills[0];

            let whtConfigTypes = getConfigTypes(jsonLog[currentLog]['subsidiary']);
            let dataFiltered = isAddLine(bills, whtConfigTypes);
            let aux = {};
            dataJournalAddLine(dataFiltered.addline, aux, jsonLog, currentLog, dataFiltered.whts);
            dataJournalNoAddLine(dataFiltered.noaddline, aux, jsonLog, currentLog, jsonTaxRecord);
            log.debug('aux', JSON.stringify(aux));

            jsonLog[currentLog]['journal'] = aux;

            log.debug('jsonLog after', JSON.stringify(jsonLog));

            return jsonLog;

        }

        function dataJournalAddLine(bills, aux, jsonLog, currentLog, whtData) {
            if (!bills.length) return; 
            // Busqueda de Lineas del Bill
            let billLines = {};
            let whtLines = {}
            let FEAT_DEPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
            let FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
            let FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });

            let transationColumns = [];
            transationColumns.push(search.createColumn({ name: "internalid", label: "Internal ID" }));
            transationColumns.push(search.createColumn({ name: "item", label: "Item" }));
            transationColumns.push(search.createColumn({ name: "account", label: "Account" }));
            transationColumns.push(search.createColumn({ name: "trandate", label: "Date" }));
            transationColumns.push(search.createColumn({ name: "custcol_lmry_br_tax_rule", label: "Latam Col - Tax Rule" }));
            transationColumns.push(search.createColumn({ name: "custcol_lmry_wht_rule", label: "Latam Col - WHT Rule" }));
            transationColumns.push(search.createColumn({ name: "fxamount", label: "Amount (Foreign Currency)" }));
            transationColumns.push(search.createColumn({ name: "lineuniquekey", label: "Line Unique Key" }));
            transationColumns.push(search.createColumn({ name: "memo", label: "Memo" }));
            transationColumns.push(search.createColumn({ name: "custcol_lmry_ar_item_tributo", label: "Latam Col - Item Tributo" }));
            if (FEAT_DEPT == true || FEAT_DEPT == "T") {
                transationColumns.push(search.createColumn({ name: "department", label: "Department" }));
            }
            if (FEAT_LOC == true || FEAT_LOC == "T") {
                transationColumns.push(search.createColumn({ name: "location", label: "Location" }));
            }
            if (FEAT_CLASS == true || FEAT_CLASS == "T") {
                transationColumns.push(search.createColumn({ name: "class", label: "Class" }));
            }

            let transactionObj = search.create({
                type: "transaction",
                filters: [
                    ["mainline", "is", "F"], "AND",
                    ["shipping", "is", "F"], "AND",
                    ["taxline", "is", "F"], "AND",
                    ["cogs", "is", "F"], "AND",
                    ["item", "noneof", "@NONE@"], "AND",
                    ["internalid", "anyof", bills]
                ],
                columns: transationColumns
            }).runPaged({ pageSize: 1000 });

            if (transactionObj) {
                transactionObj.pageRanges.forEach(function (pageRange) {
                    let page = transactionObj.fetch({ index: pageRange.index });
                    let results = page.data;
                    if (results) {
                        for (let i = 0; i < results.length; i++) {
                            let linekey = results[i].getValue("lineuniquekey");
                            if (!billLines[linekey]) {
                                billLines[linekey] = {};
                            }
                            let itemTributo = results[i].getValue("custcol_lmry_ar_item_tributo");
                            if (itemTributo == true || itemTributo == "T") {

                                let subtype = results[i].getValue('memo') ? results[i].getValue('memo').split(" - ")[0] : "";
                                let lineuniquekey = results[i].getValue('memo') ? results[i].getValue('memo').split(" - ")[1] : "";
                                let key = [subtype, lineuniquekey].join(';');
                                if (!whtLines[key]) {
                                    whtLines[key] = {};
                                }
                                whtLines[key] = {
                                    internalid: results[i].getValue('internalid'),
                                    item: results[i].getValue('item'),
                                    account: results[i].getValue('account'),
                                    fxamount: results[i].getValue('fxamount'),
                                    lineuniquekey: results[i].getValue('lineuniquekey')
                                };
                            } else {
                                billLines[linekey] = {
                                    trandate: results[i].getValue("trandate"),
                                    taxrule: results[i].getValue("custcol_lmry_br_tax_rule"),
                                    whtrule: results[i].getValue("custcol_lmry_wht_rule"),
                                    id: results[i].getValue("internalid"),
                                    amount: results[i].getValue("fxamount")
                                };
                                if (FEAT_DEPT == true || FEAT_DEPT == "T") {
                                    billLines[linekey]["department"] = results[i].getValue("department");
                                }
                                if (FEAT_LOC == true || FEAT_LOC == "T") {
                                    billLines[linekey]["location"] = results[i].getValue("location");
                                }
                                if (FEAT_CLASS == true || FEAT_CLASS == "T") {
                                    billLines[linekey]["class"] = results[i].getValue("class");
                                }
                            }
                        }
                    }
                });
            }
            log.debug('whtLines', whtLines);
            log.debug('billLines', billLines);

            let taxResultJSON = {};
            //COPY TAX RESULT
            if (bills.length > 0) {
                let filtrosTR = [];
                filtrosTR[0] = search.createFilter({ name: 'custrecord_lmry_br_transaction', operator: 'anyof', values: bills });
                filtrosTR[1] = search.createFilter({ name: 'isinactive', operator: 'is', values: 'F' });
                filtrosTR[2] = search.createFilter({ name: 'custrecord_lmry_tax_type', operator: 'is', values: '1' });

                if (jsonLog[currentLog]['subtypes']) {
                    let auxTR = jsonLog[currentLog]['subtypes'].split(',');
                    filtrosTR[3] = search.createFilter({ name: 'custrecord_lmry_br_type_id', operator: 'anyof', values: auxTR });
                }

                let searchTaxResult = search.create({
                    type: 'customrecord_lmry_br_transaction',
                    columns: [
                        search.createColumn({ name: 'custrecord_lmry_br_total' }),
                        search.createColumn({ name: 'custrecord_lmry_br_type_id' }),
                        search.createColumn({ name: 'custrecord_lmry_ccl' }),
                        search.createColumn({ name: 'custrecord_lmry_ntax' }),
                        search.createColumn({ name: 'custrecord_lmry_lineuniquekey' }),
                        search.createColumn({ name: 'custrecord_lmry_br_transaction' }),
                        search.createColumn({ name: 'internalid' })
                    ],
                    filters: filtrosTR
                }).runPaged({ pageSize: 1000 });

                if (searchTaxResult) {
                    searchTaxResult.pageRanges.forEach(function (pageRange) {
                        let page = searchTaxResult.fetch({ index: pageRange.index });
                        let results = page.data;
                        if (results) {
                            for (let i = 0; i < results.length; i++) {
                                let id = results[i].getValue('custrecord_lmry_br_transaction');
                                if (!taxResultJSON[id]) {
                                    taxResultJSON[id] = [];
                                }
                                taxResultJSON[id].push({
                                    amount: results[i].getValue('custrecord_lmry_br_total'),
                                    subtype: results[i].getValue('custrecord_lmry_br_type_id'),
                                    ccl: results[i].getValue('custrecord_lmry_ccl'),
                                    ntax: results[i].getValue('custrecord_lmry_ntax'),
                                    linekey: results[i].getValue('custrecord_lmry_lineuniquekey'),
                                    internalid: results[i].getValue('internalid')
                                });
                                jsonLog[currentLog]['bills'][id].push(results[i].getValue('internalid'));
                            }
                        }
                    });
                }

                log.debug('taxResultJSON', JSON.stringify(taxResultJSON));

            }

            for (const bill in taxResultJSON) {
                let data = {};
                for (let index = 0; index < taxResultJSON[bill].length; index++) {
                    let taxAux = taxResultJSON[bill][index];
                    //let data = ["id","item","rate","name", "amount", "ratio", "discount", "apply", "receita", "taxcode"]
                    
                    let wht = whtData[bill].find(x => x.id == taxAux.subtype);
                    if (wht == null) continue;
                    log.debug('wht', wht);
                    let keycredit = [wht.item, round2(taxAux.amount), wht.name].join(';');
                    log.debug('keycredit', keycredit);
                    let linekey = taxAux.linekey;
                    log.debug('linekey', linekey);
                    let whtkey = [wht.name, linekey].join(';');
                    log.debug('whtkey', whtkey);

                    data[[keycredit, linekey].join(";")] = {
                        'amount': taxAux.amount,
                        'item': wht.item || "",
                        'rate': wht.rate || "",
                        'journal': wht.apply || "",
                        'account': whtLines[whtkey]?.account || "",
                        'impuesto': taxAux.subtype,
                        'department': billLines[linekey].department || "",
                        'class': billLines[linekey].class || "",
                        'location': billLines[linekey].location || ""
                    };
                }
                aux[bill] = data;
            }
        }

        function dataJournalNoAddLine(bills, aux, jsonLog, currentLog, jsonTaxRecord) {
            if (!bills.length) return; 
            // Busqueda de Bill Credit Aplicados
            let appliedLinesList = [];
            let appliedLines = {};
            let entitiesByBill = {};
            let retentionObj = search.create({
                type: "transaction",
                filters: [
                    ["appliedtotransaction", "anyof", bills]
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "appliedtotransaction", label: "Applied To Transaction" }),
                    search.createColumn({ name: "entity", join: "appliedtotransaction", label: "Name" })
                ]
            }).runPaged({ pageSize: 1000 });

            if (retentionObj) {
                retentionObj.pageRanges.forEach(function (pageRange) {
                    let page = retentionObj.fetch({ index: pageRange.index });
                    let results = page.data;
                    if (results) {
                        for (let i = 0; i < results.length; i++) {
                            appliedLinesList.push(results[i].getValue('internalid'));
                            appliedLines[results[i].getValue('internalid')] = results[i].getValue('appliedtotransaction');
                            entitiesByBill[results[i].getValue('appliedtotransaction')] = results[i].getValue({ name: 'entity', join: 'appliedtotransaction' });
                        }
                    }
                });
            }
            log.debug('appliedLinesList', appliedLinesList);
            log.debug('appliedLines', appliedLines);
            log.debug('entitiesByBill', entitiesByBill);

            // Caso no haya Retenciones aplicadas
            if (!appliedLinesList.length) {
                aux = {};
                log.debug('jsonLog after', JSON.stringify(aux));
                return aux;
            }

            // Busqueda de Lineas del Bill Credit Aplicado
            let creditLines = {};
            let creditObj = search.create({
                type: "transaction",
                filters: [
                    ["mainline", "is", "F"], "AND",
                    ["shipping", "is", "F"], "AND",
                    ["taxline", "is", "F"], "AND",
                    ["cogs", "is", "F"], "AND",
                    ["item", "noneof", "@NONE@"], "AND",
                    ["internalid", "anyof", appliedLinesList]
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "item", label: "Item" }),
                    search.createColumn({ name: "account", label: "Account" }),
                    search.createColumn({ name: "fxamount", label: "Amount (Foreign Currency)" }),
                    search.createColumn({ name: "lineuniquekey", label: "Line Unique Key" }),
                    search.createColumn({ name: "memo", label: "Memo" })
                ]
            }).runPaged({ pageSize: 1000 });

            if (creditObj) {
                creditObj.pageRanges.forEach(function (pageRange) {
                    let page = creditObj.fetch({ index: pageRange.index });
                    let results = page.data;
                    if (results) {
                        for (let i = 0; i < results.length; i++) {
                            //let id = results[i].getValue('internalid');
                            let subtype = results[i].getValue('memo') ? results[i].getValue('memo').split(" ")[0] : "";
                            let key = [results[i].getValue('item'), Math.abs(results[i].getValue('fxamount')), subtype].join(';');
                            if (!creditLines[key]) {
                                creditLines[key] = {};
                            }
                            creditLines[key] = {
                                internalid: results[i].getValue('internalid'),
                                item: results[i].getValue('item'),
                                account: results[i].getValue('account'),
                                fxamount: results[i].getValue('fxamount'),
                                lineuniquekey: results[i].getValue('lineuniquekey')
                            };
                        }
                    }
                });
            }
            log.debug('creditLines', creditLines);

            // Busqueda de Lineas del LR - BR Withholding Aplicado
            let whtLines = {};
            let whtObj = search.create({
                type: "customtransaction_lr_br_withholding",
                filters: [
                    ["custbody_lmry_reference_transaction", "anyof", bills]
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "account", label: "Account" }),
                    search.createColumn({ name: "fxamount", label: "Amount (Foreign Currency)" }),
                    search.createColumn({ name: "lineuniquekey", label: "Line Unique Key" }),
                    search.createColumn({ name: "memo", label: "Memo" }),
                    search.createColumn({ name: "custbody_lmry_reference_transaction", label: "Transaction Reference" })
                ]
            }).runPaged({ pageSize: 1000 });

            if (whtObj) {
                whtObj.pageRanges.forEach(function (pageRange) {
                    let page = whtObj.fetch({ index: pageRange.index });
                    let results = page.data;
                    if (results) {
                        for (let i = 0; i < results.length; i++) {
                            let memo = results[i].getValue('memo');
                            if (memo == "LR - BR Withholding") continue;

                            let bill = results[i].getValue('custbody_lmry_reference_transaction');
                            if (!whtLines[bill]) whtLines[bill] = {};
                            let subtype = memo ? memo.split(" - ")[0] : "";
                            let uniquekey = memo ? memo.split(" - ")[2] : "";
                            let key = [subtype, Math.abs(results[i].getValue('fxamount')), uniquekey].join(';');

                            if (!whtLines[bill][key]) whtLines[bill][key] = {};
                            whtLines[bill][key] = {
                                internalid: results[i].getValue('internalid'),
                                account: results[i].getValue('account'),
                                fxamount: results[i].getValue('fxamount'),
                                lineuniquekey: results[i].getValue('lineuniquekey')
                            };
                        }
                    }
                });
            }
            log.debug('whtLines', whtLines);

            // Busqueda de Lineas del Bill
            let billLines = {};
            let FEAT_DEPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
            let FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
            let FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });

            let transationColumns = [];
            transationColumns.push(search.createColumn({ name: "internalid", label: "Internal ID" }));
            transationColumns.push(search.createColumn({ name: "item", label: "Item" }));
            transationColumns.push(search.createColumn({ name: "account", label: "Account" }));
            transationColumns.push(search.createColumn({ name: "trandate", label: "Date" }));
            transationColumns.push(search.createColumn({ name: "custcol_lmry_br_tax_rule", label: "Latam Col - Tax Rule" }));
            transationColumns.push(search.createColumn({ name: "custcol_lmry_wht_rule", label: "Latam Col - WHT Rule" }));
            transationColumns.push(search.createColumn({ name: "fxamount", label: "Amount (Foreign Currency)" }));
            transationColumns.push(search.createColumn({ name: "lineuniquekey", label: "Line Unique Key" }));
            if (FEAT_DEPT == true || FEAT_DEPT == "T") {
                transationColumns.push(search.createColumn({ name: "department", label: "Department" }));
            }
            if (FEAT_LOC == true || FEAT_LOC == "T") {
                transationColumns.push(search.createColumn({ name: "location", label: "Location" }));
            }
            if (FEAT_CLASS == true || FEAT_CLASS == "T") {
                transationColumns.push(search.createColumn({ name: "class", label: "Class" }));
            }

            let transactionObj = search.create({
                type: "transaction",
                filters: [
                    ["mainline", "is", "F"], "AND",
                    ["shipping", "is", "F"], "AND",
                    ["taxline", "is", "F"], "AND",
                    ["cogs", "is", "F"], "AND",
                    ["item", "noneof", "@NONE@"], "AND",
                    ["internalid", "anyof", bills]
                ],
                columns: transationColumns
            }).runPaged({ pageSize: 1000 });

            if (transactionObj) {
                transactionObj.pageRanges.forEach(function (pageRange) {
                    let page = transactionObj.fetch({ index: pageRange.index });
                    let results = page.data;
                    if (results) {
                        for (let i = 0; i < results.length; i++) {
                            let linekey = results[i].getValue("lineuniquekey");
                            if (!billLines[linekey]) {
                                billLines[linekey] = [];
                            }
                            billLines[linekey] = {
                                trandate: results[i].getValue("trandate"),
                                taxrule: results[i].getValue("custcol_lmry_br_tax_rule"),
                                whtrule: results[i].getValue("custcol_lmry_wht_rule"),
                                id: results[i].getValue("internalid"),
                                amount: results[i].getValue("fxamount")
                            };
                            if (FEAT_DEPT == true || FEAT_DEPT == "T") {
                                billLines[linekey]["department"] = results[i].getValue("department");
                            }
                            if (FEAT_LOC == true || FEAT_LOC == "T") {
                                billLines[linekey]["location"] = results[i].getValue("location");
                            }
                            if (FEAT_CLASS == true || FEAT_CLASS == "T") {
                                billLines[linekey]["class"] = results[i].getValue("class");
                            }
                        }
                    }
                });
            }
            log.debug('billLines', billLines);

            let taxResultJSON = {};
            //COPY TAX RESULT
            if (bills.length > 0) {
                let filtrosTR = [];
                filtrosTR[0] = search.createFilter({ name: 'custrecord_lmry_br_transaction', operator: 'anyof', values: bills });
                filtrosTR[1] = search.createFilter({ name: 'isinactive', operator: 'is', values: 'F' });
                filtrosTR[2] = search.createFilter({ name: 'custrecord_lmry_tax_type', operator: 'is', values: '1' });

                if (jsonLog[currentLog]['subtypes']) {
                    let auxTR = jsonLog[currentLog]['subtypes'].split(',');
                    filtrosTR[3] = search.createFilter({ name: 'custrecord_lmry_br_type_id', operator: 'anyof', values: auxTR });
                }

                let searchTaxResult = search.create({
                    type: 'customrecord_lmry_br_transaction',
                    columns: [
                        search.createColumn({ name: 'custrecord_lmry_br_total' }),
                        search.createColumn({ name: 'custrecord_lmry_br_type_id' }),
                        search.createColumn({ name: 'custrecord_lmry_ccl' }),
                        search.createColumn({ name: 'custrecord_lmry_ntax' }),
                        search.createColumn({ name: 'custrecord_lmry_lineuniquekey' }),
                        search.createColumn({ name: 'custrecord_lmry_br_transaction' }),
                        search.createColumn({ name: 'internalid' })
                    ],
                    filters: filtrosTR
                }).runPaged({ pageSize: 1000 });

                if (searchTaxResult) {
                    searchTaxResult.pageRanges.forEach(function (pageRange) {
                        let page = searchTaxResult.fetch({ index: pageRange.index });
                        let results = page.data;
                        if (results) {
                            for (let i = 0; i < results.length; i++) {
                                let id = results[i].getValue('custrecord_lmry_br_transaction');
                                if (!taxResultJSON[id]) {
                                    taxResultJSON[id] = [];
                                }
                                taxResultJSON[id].push({
                                    amount: results[i].getValue('custrecord_lmry_br_total'),
                                    subtype: results[i].getValue('custrecord_lmry_br_type_id'),
                                    ccl: results[i].getValue('custrecord_lmry_ccl'),
                                    ntax: results[i].getValue('custrecord_lmry_ntax'),
                                    linekey: results[i].getValue('custrecord_lmry_lineuniquekey'),
                                    internalid: results[i].getValue('internalid')
                                });
                                jsonLog[currentLog]['bills'][id].push(results[i].getValue('internalid'));
                            }
                        }
                    });
                }

                log.debug('taxResultJSON', JSON.stringify(taxResultJSON));
                /*let resultTaxResult = searchTaxResult.run().getRange({ start: 0, end: 1000 });

                if (resultTaxResult != null && resultTaxResult.length > 0) {
                    let columnsTaxResult = resultTaxResult[0].columns;
                    for (var i = 0; i < resultTaxResult.length; i++) {
                        var bill = resultTaxResult[i].getValue('custrecord_lmry_br_transaction');
                        jsonLog[currentLog]['bills'][bill].push(resultTaxResult[i].getValue('internalid'));

                    }
                }*/
            }

            for (const bill in taxResultJSON) {
                let data = {};
                for (let index = 0; index < taxResultJSON[bill].length; index++) {
                    let taxAux = taxResultJSON[bill][index];
                    let taxrecord = taxAux.ccl;
                    let iscc = true;
                    if (!taxrecord) {
                        taxrecord = taxAux.ntax;
                        iscc = false;
                    }

                    let auxvendor = iscc ? entitiesByBill[bill] : "0";
                    log.debug('auxvendor', auxvendor);
                    let keycredit = [jsonTaxRecord[auxvendor][taxrecord].item, round2(taxAux.amount), jsonTaxRecord[auxvendor][taxrecord].subtypetext].join(';');
                    log.debug('keycredit', keycredit);
                    let linekey = taxAux.linekey;
                    log.debug('linekey', linekey);
                    let whtkey = [jsonTaxRecord[auxvendor][taxrecord].subtypetext, round2(taxAux.amount), taxAux.linekey].join(";");
                    log.debug('whtkey', whtkey);
                    data[[keycredit, linekey].join(";")] = {
                        'amount': taxAux.amount,
                        'item': jsonTaxRecord[auxvendor][taxrecord].item || "",
                        'rate': jsonTaxRecord[auxvendor][taxrecord].rate || "",
                        'journal': jsonTaxRecord[auxvendor][taxrecord].journal || "",
                        'account': whtLines?.[bill]?.[whtkey]?.account || creditLines?.[keycredit]?.account || "",
                        'impuesto': taxAux.subtype,
                        'department': billLines[linekey].department || "",
                        'class': billLines[linekey].class || "",
                        'location': billLines[linekey].location || ""
                    };
                }
                aux[bill] = data;
            }

        }

        function eliminarArray(arreglo, elemento) {
            var i = arreglo.indexOf(elemento);

            if (i != -1) {
                arreglo.splice(i, 1);
            }

            return arreglo;
        }

        function jsonConcat(j1, j2) {
            for (var key in j2) {
                j1[key] = j2[key];
            }

            return j1;
        }

        function cleanVendorBillFields(objBill) {
            objBill.setValue('custbody_lmry_doc_ref_type', ''); //Latam - Document Type REF
            objBill.setValue('custbody_lmry_exchange_rate_doc_ref', ''); //LATAM - TYPE CHANGE DOC REF
            objBill.setValue('custbody_lmry_apply_wht_code', false); // LATAM - APPLIED WHT CODE
            objBill.setValue('custbody_lmry_carga_inicial	', false); //LATAM - INITIAL LOAD?
            objBill.setValue('custbody_lmry_cl_ei_exchangerate', ''); //Latam - EI Exchange Rate
            objBill.setValue('custbody_lmry_document_type', ''); //LATAM - LEGAL DOCUMENT TYPE
            objBill.setValue('custbody_lmry_doc_ref_date', ''); //LATAM - DOCUMENT DATE REF
            objBill.setValue('custbody_lmry_doc_serie_ref', ''); //LATAM - DOCUMENT SERIES REF
            objBill.setValue('custbody_lmry_fecha_retencion', ''); //LATAM - WITHHOLDING DATE
            objBill.setValue('custbody_lmry_numero_cc', ''); // LATAM - NUMERO CC
            objBill.setValue('custbody_lmry_numero_er', ''); // LATAM - NUMERO ER
            objBill.setValue('custbody_lmry_numero_cc', ''); // LATAM - NUMERO SR
            objBill.setValue('custbody_lmry_num_doc_ref', ''); //LATAM - DOCUMENT NUMBER REF
            objBill.setValue('custbody_lmry_num_preimpreso', '') //LATAM - PREPRINTED NUMBER
            objBill.setValue('custbody_lmry_paymentmethod', '') //LATAM - PAYMENT METHOD
            objBill.setValue('custbody_lmry_percep_num', '') //LATAM - PERCEPCION NUMBER
            objBill.setValue('custbody_lmry_preimpreso_retencion', '') //LATAM - WITHHOLDING TAX NUMBER
            objBill.setValue('custbody_lmry_serie_doc_cxp', '') //LATAM - CXP SERIES
            objBill.setValue('custbody_lmry_serie_retencion', '') //LATAM - SERIE RETENCION
            objBill.setValue('custbody_lmry_tipo_renta', '') //LATAM - TIPO DE RENTA
            objBill.setValue('custbody_lmry_type_report', '') //LATAM - TIPO DE INFORME
        }

        function setupTaxSubsidiary(subsidiary) {

            let setupTax = search.create({
                type: 'customrecord_lmry_setup_tax_subsidiary', columns: ['custrecord_lmry_setuptax_form_payment', 'custrecord_lmry_setuptax_form_journal', 'custrecord_lmry_setuptax_reclass_subtyps',
                    'custrecord_lmry_setuptax_br_ap_interest', 'custrecord_lmry_setuptax_br_ap_multa', 'custrecord_lmry_setuptax_form_bill', 'custrecord_lmry_setuptax_br_document', 'custrecord_lmry_setuptax_br_tax_code',
                    'custrecord_lmry_setuptax_br_full_wht_tra', 'custrecord_lmry_setuptax_currency'],
                filters: [{ name: 'isinactive', operator: 'is', values: 'F' }, { name: 'custrecord_lmry_setuptax_subsidiary', operator: 'is', values: subsidiary }]
            });

            let resultTax = setupTax.run().getRange({ start: 0, end: 1 });

            jsonSetupTax = {
                'itemInteres': resultTax[0].getValue('custrecord_lmry_setuptax_br_ap_interest'),
                'itemMulta': resultTax[0].getValue('custrecord_lmry_setuptax_br_ap_multa'),
                'formBill': resultTax[0].getValue('custrecord_lmry_setuptax_form_bill'),
                'formPayment': resultTax[0].getValue('custrecord_lmry_setuptax_form_payment'),
                'formJournal': resultTax[0].getValue('custrecord_lmry_setuptax_form_journal'),
                'documentType': resultTax[0].getValue('custrecord_lmry_setuptax_br_document'),
                'taxCode': resultTax[0].getValue('custrecord_lmry_setuptax_br_tax_code'),
                'subtypes': resultTax[0].getValue('custrecord_lmry_setuptax_reclass_subtyps'),
                'fullwht': resultTax[0].getValue('custrecord_lmry_setuptax_br_full_wht_tra'),
                'localCurrency': resultTax[0].getValue('custrecord_lmry_setuptax_currency')
            };

            return jsonSetupTax;
        }

        function createImportTaxResults(bills, percents, paymentId, accountingBooks, fullWHT, jsonFirstPayment, localExchangeRate) {

            if (Object.keys(bills).length) {
                var taxResults = {};

                var searchTaxResults = search.create({
                    type: "customrecord_lmry_br_transaction",
                    filters: [
                        ["isinactive", "is", "F"], "AND",
                        ["custrecord_lmry_tax_type", "anyof", "4"], "AND",
                        ["custrecord_lmry_br_transaction", "anyof", Object.keys(bills)], "AND",
                        ["custrecord_lmry_br_is_import_tax_result", "is", "T"]
                    ],
                    columns: [
                        "internalid",
                        "custrecord_lmry_br_transaction",
                        "custrecord_lmry_br_type_id",
                        "custrecord_lmry_ccl",
                        "custrecord_lmry_ntax",
                        "custrecord_lmry_ccl.custrecord_lmry_ccl_br_nivel_contabiliz",
                        "custrecord_lmry_ntax.custrecord_lmry_nt_br_nivel_contabiliz",
                        "custrecord_lmry_ccl.custrecord_lmry_ccl_gl_impact",
                        "custrecord_lmry_ntax.custrecord_lmry_ntax_gl_impact",
                        "custrecord_lmry_ccl.custrecord_lmry_ccl_br_reverse_account",
                        "custrecord_lmry_ntax.custrecord_lmry_nt_br_reverse_account",
                        "custrecord_lmry_ccl.custrecord_lmry_br_ccl_account2",
                        "custrecord_lmry_ntax.custrecord_lmry_ntax_credit_account",
                        "custrecord_lmry_base_amount",
                        "custrecord_lmry_br_total",
                        "custrecord_lmry_amount_local_currency",
                        "custrecord_lmry_base_amount_local_currc"
                    ]
                });

                var results = searchTaxResults.run().getRange(0, 1000);
                if (results && results.length) {
                    for (var i = 0; i < results.length; i++) {
                        var idCC = results[i].getValue("custrecord_lmry_ccl");
                        var idNT = results[i].getValue("custrecord_lmry_ntax");
                        var importTaxLevel = "";
                        var creditAccount = "", reverseAccount = "", glImpact = false;
                        if (idCC) {
                            importTaxLevel = results[i].getValue({ join: "custrecord_lmry_ccl", name: "custrecord_lmry_ccl_br_nivel_contabiliz" });
                            glImpact = results[i].getValue({ join: "custrecord_lmry_ccl", name: "custrecord_lmry_ccl_gl_impact" });
                            creditAccount = results[i].getValue({ join: "custrecord_lmry_ccl", name: "custrecord_lmry_br_ccl_account2" });
                            reverseAccount = results[i].getValue({ join: "custrecord_lmry_ccl", name: "custrecord_lmry_ccl_br_reverse_account" });
                        } else if (idNT) {
                            importTaxLevel = results[i].getValue({ join: "custrecord_lmry_ntax", name: "custrecord_lmry_nt_br_nivel_contabiliz" });
                            glImpact = results[i].getValue({ join: "custrecord_lmry_ntax", name: "custrecord_lmry_ntax_gl_impact" });
                            creditAccount = results[i].getValue({ join: "custrecord_lmry_ntax", name: "custrecord_lmry_ntax_credit_account" });
                            reverseAccount = results[i].getValue({ join: "custrecord_lmry_ntax", name: "custrecord_lmry_nt_br_reverse_account" });
                        }

                        if (importTaxLevel && (!glImpact || (glImpact && creditAccount && reverseAccount))) {
                            var subtype = results[i].getValue("custrecord_lmry_br_type");
                            var billId = results[i].getValue("custrecord_lmry_br_transaction");
                            billId = String(billId);
                            var amount = results[i].getValue("custrecord_lmry_br_total") || 0.00;
                            amount = parseFloat(amount);

                            if (!taxResults[billId]) {
                                taxResults[billId] = [];
                            }

                            var id = results[i].getValue("internalid");
                            var subtype = results[i].getValue("custrecord_lmry_br_type_id");
                            var baseAmount = results[i].getValue("custrecord_lmry_base_amount") || 0.00;
                            var amount = results[i].getValue("custrecord_lmry_br_total") || 0.00;
                            var locCurrAmt = results[i].getValue("custrecord_lmry_amount_local_currency");
                            var locCurrBaseAmt = results[i].getValue("custrecord_lmry_base_amount_local_currc");

                            taxResults[billId].push({
                                "id": id,
                                "subtype": subtype,
                                "baseAmount": parseFloat(baseAmount),
                                "amount": parseFloat(amount),
                                "locCurrAmt": parseFloat(locCurrAmt),
                                "locCurrBaseAmt": parseFloat(locCurrBaseAmt)
                            });
                        }

                    }
                }

                log.debug("import TaxResults", JSON.stringify(taxResults));

                for (var billId in bills) {

                    if (fullWHT && !jsonFirstPayment[billId]) {
                        continue;
                    }

                    for (var installmNum in percents[billId]) {
                        var factor = parseFloat(percents[billId][installmNum]);

                        if (fullWHT) {
                            factor = 1 / parseFloat(Object.keys(percents[billId]).length);
                        }

                        if (taxResults[billId] && taxResults[billId].length) {
                            for (var i = 0; i < taxResults[billId].length; i++) {
                                var taxResult = taxResults[billId][i];

                                var recordTaxResult = record.copy({
                                    type: "customrecord_lmry_br_transaction",
                                    id: taxResult["id"]
                                });

                                recordTaxResult.setValue({
                                    fieldId: 'custrecord_lmry_br_related_id',
                                    value: paymentId
                                });

                                recordTaxResult.setValue({
                                    fieldId: 'custrecord_lmry_br_transaction',
                                    value: paymentId
                                });


                                if (factor != 1) {
                                    recordTaxResult.setValue({
                                        fieldId: 'custrecord_lmry_base_amount',
                                        value: round4(taxResult['baseAmount'] * factor)
                                    });

                                    recordTaxResult.setValue({
                                        fieldId: 'custrecord_lmry_br_total',
                                        value: round4(taxResult['amount'] * factor)
                                    });

                                    var locCurrBaseAmt = taxResult['baseAmount'] * factor;
                                    var locCurrAmt = taxResult['amount'] * factor;

                                    if (localExchangeRate != 1) {
                                        locCurrBaseAmt = round2(locCurrBaseAmt) * localExchangeRate;
                                        locCurrAmt = round2(locCurrAmt) * localExchangeRate;
                                    }

                                    recordTaxResult.setValue({
                                        fieldId: 'custrecord_lmry_total_base_currency',
                                        value: round4(locCurrAmt)
                                    });

                                    recordTaxResult.setValue({
                                        fieldId: 'custrecord_lmry_base_amount_local_currc',
                                        value: locCurrBaseAmt
                                    });

                                    recordTaxResult.setValue({
                                        fieldId: 'custrecord_lmry_amount_local_currency',
                                        value: locCurrAmt
                                    });
                                }

                                recordTaxResult.setValue({
                                    fieldId: 'custrecord_lmry_related_applied_transact',
                                    value: billId
                                });

                                recordTaxResult.setValue({
                                    fieldId: 'custrecord_lmry_accounting_books',
                                    value: accountingBooks
                                });

                                if (Number(installmNum)) {
                                    recordTaxResult.setValue({
                                        fieldId: "custrecord_lmry_related_installm_num",
                                        value: installmNum
                                    });
                                }

                                var idtaxresult = recordTaxResult.save({
                                    ignoreMandatoryFields: true,
                                    disableTriggers: true,
                                    enableSourcing: true
                                });

                            }
                        }
                    }
                }
            }
        }

        function round4(num) {
            var e = (num >= 0) ? 1e-6 : -1e-6;
            return parseFloat(Math.round(parseFloat(num) * 1e4 + e) / 1e4);
        }

        function round2(num) {
            var e = (num >= 0) ? 1e-6 : -1e-6;
            return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
        }

        function getLocalExchangeRate(recordObj, localCurrency) {
            var FEAT_SUBS = runtime.isFeatureInEffect({
                feature: "SUBSIDIARIES"
            });

            var FEAT_MULTIBOOK = runtime.isFeatureInEffect({
                feature: "MULTIBOOK"
            });
            var tranExchangeRate = recordObj.getValue("exchangerate");
            tranExchangeRate = parseFloat(tranExchangeRate);

            if (FEAT_SUBS && FEAT_MULTIBOOK) {
                var subsidiaryId = recordObj.getValue("subsidiary");
                var subsidiaryCurrency = search.lookupFields({
                    type: "subsidiary",
                    id: subsidiaryId,
                    columns: ["currency"]
                }).currency[0].value;

                if (localCurrency && (Number(localCurrency) != Number(subsidiaryCurrency))) {
                    if (recordObj.getLineCount({ sublistId: 'accountingbookdetail' }) > 0) {
                        for (var i = 0; i < recordObj.getLineCount({ sublistId: 'accountingbookdetail' }); i++) {
                            recordObj.selectLine({ sublistId: 'accountingbookdetail', line: i });
                            var currencyBook = recordObj.getCurrentSublistValue({ sublistId: 'accountingbookdetail', fieldId: 'currency' });
                            if (Number(currencyBook) == Number(localCurrency)) {
                                var rateBook = recordObj.getCurrentSublistValue({ sublistId: 'accountingbookdetail', fieldId: 'exchangerate' });
                                return parseFloat(rateBook);
                            }
                        }
                    }
                }
            }
            return tranExchangeRate;
        }

        function getConfigTypes(subsidiary) {
            let result = {};

            let isSuiteAppInstalledBR = suiteAppInfo.isSuiteAppInstalled({
                suiteAppId: "com.latamready.lmrybrlocalization"
            });

            if (!isSuiteAppInstalledBR) return result;

            let filters = [
                ["isinactive", "is", "F"]
            ];
            var isOneWorld = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
            if (isOneWorld) {
                filters.push("AND", ["custrecord_lr_br_wht_setup_subsidiary", "is", subsidiary]);
            }
            let whtList = search.create({
                type: "customrecord_lr_br_wht_setup",
                columns: [
                    "custrecord_lr_br_setup_subtype", "custrecord_lr_br_setup_amount_to", "custrecord_lr_br_setup_ratio",
                    "custrecord_lr_br_setup_discount", "custrecord_lr_br_setup_apply_journal", "custrecord_lr_br_setup_receita",
                    "custrecord_lr_br_setup_tax_code"
                ],
                filters: filters
            }).run().getRange(0, 1000);

            if (whtList && whtList.length) {
                for (let i = 0; i < whtList.length; i++) {
                    let subtype = whtList[i].getValue("custrecord_lr_br_setup_subtype");
                    let amount = whtList[i].getValue("custrecord_lr_br_setup_amount_to");
                    let ratio = whtList[i].getValue("custrecord_lr_br_setup_ratio");
                    let discount = whtList[i].getValue("custrecord_lr_br_setup_discount");
                    let apply = whtList[i].getValue("custrecord_lr_br_setup_apply_journal");
                    let receita = whtList[i].getValue("custrecord_lr_br_setup_receita");
                    let taxcode = whtList[i].getValue("custrecord_lr_br_setup_tax_code");
                    result[subtype] = { amount, ratio, discount, apply, receita, taxcode };
                }
            }

            return result;
        }

        function isAddLine(transactions, whtConfigTypes) {
            let results = { whts: {}, addline: [], noaddline: [] };

            let isSuiteAppInstalledBR = suiteAppInfo.isSuiteAppInstalled({
                suiteAppId: "com.latamready.lmrybrlocalization"
            });

            if (isSuiteAppInstalledBR) {
                let dataSearch = search.create({
                    type: "customrecord_lr_br_wht_data",
                    columns: ["custrecord_lr_br_wht_data", "custrecord_lr_br_wht_transaction"],
                    filters: [
                        ["isinactive", "is", "F"], "AND",
                        ["custrecord_lr_br_wht_transaction", "is", transactions]
                    ]
                }).run().getRange(0, 1000);

                if (dataSearch && dataSearch.length) {
                    for (let i = 0; i < dataSearch.length; i++) {

                        let whtData = dataSearch[i].getValue("custrecord_lr_br_wht_data");
                        let transaction = dataSearch[i].getValue("custrecord_lr_br_wht_transaction");
                        results.whts[transaction] = [];
                        let data = whtData ? JSON.parse(whtData) : [];
                        for (let j = data.length - 1; j >= 0; j--) {
                            let subtype = data[j].id;
                            if (!whtConfigTypes[subtype]) {
                                data.splice(j, 1);
                                continue;
                            }
                            results.whts[transaction].push(util.extend(data[j], whtConfigTypes[subtype]));
                        }
                        results.addline.push(transaction);
                    }
                }
            }          

            results.noaddline = transactions.filter(x => !results.addline.includes(x));
        
            log.debug("results", results);
            return results;
        }

        return {
            setLog: setLog,
            setupTaxSubsidiary: setupTaxSubsidiary,
            setError: setError,
            iteracionBill: iteracionBill,
            creadoTransacciones: creadoTransacciones
        };

    });
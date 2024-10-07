/*= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
  ||  This script for customer center                             ||
  ||                                                              ||
  ||  File Name:  LMRY_PE_DetractionPayment_MPRD_V2.0.js          ||
  ||                                                              ||
  ||  Version Date         Author        Remarks                  ||
  ||  2.0     Feb 05 2020  LatamReady    Bundle 37714             ||
   \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search', 'N/format', 'N/runtime', 'N/url', 'N/email'],

    function (log, record, search, format, runtime, url, email) {

        var LMRY_script = 'LatamReady - PE Detraction Payment MPRD';

        /*var scriptObj = runtime.getCurrentScript();
        var logid = scriptObj.getParameter({
            name: 'custscript_lmry_br_mass_gen_id'
        });*/
        var idJournal = runtime.getCurrentScript().getParameter('custscript_lmry_pe_detpay_journalid');
        var feature = runtime.getCurrentScript().getParameter('custscript_lmry_pe_detpay_feature');

        var featureOW = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
        /**
         * Input Data for processing
         *
         * @return Array,Object,Search,File
         *
         * @since 2016.1
         */
        function getInputData() {

            try {
                log.error('logid', idJournal);

                var journalentrySearchObj = search.create({
                    type: "journalentry",
                    filters: [
                        ["internalid", "is", idJournal]
                    ],
                    columns: [
                        'internalid', 'account',
                        'custcol_lmry_fecha_detraccion', 'custcol_lmry_factura_prov_detraccion',
                        'custcol_lmry_numero_detraccion', 'custcol_lmry_es_detraccion_masiva', 'line'
                    ]
                });
                if (featureOW) {
                    journalentrySearchObj.columns.push(search.createColumn({ name: 'subsidiary' }));
                }
                return journalentrySearchObj;

            } catch (err) {
                log.error('[ getInputData ]', err);
                return [];
            }

        }


        function map(context) {

            try {
                var searchResult = JSON.parse(context.value);
                var internalid = searchResult.values.internalid.value;
                var account = searchResult.values.account;
                //var subsidiary = searchResult.values.subsidiary.value;
                var fecha_detraccion = searchResult.values.custcol_lmry_fecha_detraccion;
                var numero_detraccion = searchResult.values.custcol_lmry_numero_detraccion;
                var es_detraccion_masiva = searchResult.values.custcol_lmry_es_detraccion_masiva;
                var factura = searchResult.values.custcol_lmry_factura_prov_detraccion.value;
                var linea = searchResult.values.line;
                if (featureOW) {
                    var subsidiary = searchResult.values.subsidiary.value;
                } else {
                    var subsidiary = 1;
                }

                if (linea % 2 == 0) {
                    if (es_detraccion_masiva == true || es_detraccion_masiva == 'T') {
                        if (factura != null && factura != null) {

                            fecha_detraccion = fecha_detraccion.split('/');
                            var fecha_format = format.format({ value: new Date(fecha_detraccion[2], fecha_detraccion[1] - 1, fecha_detraccion[0]), type: format.Type.DATE });

                            record.submitFields({
                                type: 'vendorbill', id: factura,
                                values: {
                                    custbody_lmry_doc_detraccion_date: fecha_format,
                                    custbody_lmry_num_comprobante_detrac: numero_detraccion,
                                    custbody_lmry_reference_transaction: internalid,
                                    custbody_lmry_reference_transaction_id: internalid
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true,
                                    disableTriggers: true
                                }
                            });
                            if (feature == true || feature == 'true') {
                                var ivaAccount = getAccountIVA(subsidiary);
                                if (ivaAccount) {
                                    transferIva(factura, ivaAccount, subsidiary, fecha_format);
                                }
                            }
                        }
                    }
                }

                context.write({
                    key: 1,
                    value: true
                });


            } catch (err) {
                log.error('[ map ]', err);
            }

        }


        function summarize(context) {

            try {

                var asientoDiario = record.load({ type: record.Type.JOURNAL_ENTRY, id: idJournal, isDynamic: true });

                asientoDiario.setValue('custbody_lmry_estado_detraccion', 'Procesado');

                var lineas = asientoDiario.getLineCount('line');
                for (var i = 0; i < lineas; i++) {
                    asientoDiario.selectLine({ sublistId: 'line', line: i });
                    asientoDiario.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_es_detraccion_masiva', value: false });
                    asientoDiario.commitLine({ sublistId: 'line' });
                }

                asientoDiario.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true,
                    disableTriggers: true
                });

                /*record.submitFields({
                    type: 'journalentry', id: idJournal,
                    values: {
                        custbody_lmry_estado_detraccion: 'Procesado'
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                        disableTriggers: true
                    }
                });*/

            } catch (err) {
                log.error('[ summarize ]', err);
            }
            return true;
        }

        function transferIva(billID, ivaAccount, subsidiary, fecha_detraccion) {
            try {
                var billSearchObj = search.create({
                    type: "vendorbill",
                    filters: [
                        ["internalid", "is", billID],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["taxline", "is", "T"]
                    ],
                    columns: ['internalid', 'account', 'debitfxamount', 'currency', 'exchangerate', 'custbody_lmry_concepto_detraccion']
                });
                billSearchObj = billSearchObj.run().getRange(0, 1000);

                if (billSearchObj != null && billSearchObj != '') {
                    var featureAprove = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
                    var concepDetr = billSearchObj[0].getValue('custbody_lmry_concepto_detraccion');
                    if (concepDetr != null && concepDetr != '' && concepDetr != 12) {
                        var newJournal = record.create({
                            type: record.Type.JOURNAL_ENTRY
                        });

                        if (featureOW && subsidiary) {
                            newJournal.setValue('subsidiary', subsidiary);
                        }
                        if (fecha_detraccion) {
                            var fecha = format.parse({ value: fecha_detraccion, type: format.Type.DATE });
                            newJournal.setValue('trandate', fecha);
                        }
                        if (billID) {
                            newJournal.setValue('custbody_lmry_reference_transaction', billID);
                            newJournal.setValue('custbody_lmry_reference_transaction_id', billID);
                        }
                        newJournal.setValue('custbody_lmry_es_detraccion', false);
                        if (featureAprove == 'T' || featureAprove == true) {
                            newJournal.setValue('approvalstatus', 2);
                        }
                        newJournal.setValue('currency', billSearchObj[0].getValue('currency'));
                        newJournal.setValue('exchangerate', billSearchObj[0].getValue('exchangerate'));
                        newJournal.setValue('memo', 'Traslado de IVA - Bill ID: ' + billID);

                        var linejournal = 0;
                        for (var i = 0; i < billSearchObj.length; i++) {
                            var debitfxamount = billSearchObj[i].getValue('debitfxamount');
                            if (debitfxamount) {
                                // Line from
                                newJournal.setSublistValue('line', 'account', linejournal, billSearchObj[i].getValue('account'));
                                newJournal.setSublistValue('line', 'credit', linejournal, debitfxamount);
                                newJournal.setSublistValue('line', 'memo', linejournal, 'Tax amount redirect');
                                newJournal.setSublistValue('line', 'custcol_lmry_es_detraccion_masiva', linejournal, false);
                                // Line to
                                newJournal.setSublistValue('line', 'account', linejournal + 1, ivaAccount);
                                newJournal.setSublistValue('line', 'debit', linejournal + 1, debitfxamount);
                                newJournal.setSublistValue('line', 'memo', linejournal + 1, 'Tax amount redirect');
                                newJournal.setSublistValue('line', 'custcol_lmry_es_detraccion_masiva', linejournal + 1, false);
                                linejournal += 2;
                            }

                        }

                        if (linejournal != 0) {
                            newJournal.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true,
                                dissableTriggers: true
                            });
                        }

                    }

                }
            } catch (error) {
                log.error('error', error);
            }
            return true;
        }

        function getAccountIVA(subsidiary) {
            var account = 0;
            try {
                var billSearchObj = search.create({
                    type: "customrecord_lmry_setup_tax_subsidiary",
                    filters: [
                        ["custrecord_lmry_setuptax_subsidiary", "is", subsidiary],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                    columns: ['custrecord_lmry_setuptax_pe_vat_account']
                });
                billSearchObj = billSearchObj.run().getRange(0, 1000);

                if (billSearchObj != null && billSearchObj != '') {
                    account = billSearchObj[0].getValue('custrecord_lmry_setuptax_pe_vat_account');
                }
            } catch (error) {
                log.error('error', error);
            }
            return account;
        }

        return {
            getInputData: getInputData,
            map: map,
            //reduce: reduce,
            summarize: summarize
        };

    });
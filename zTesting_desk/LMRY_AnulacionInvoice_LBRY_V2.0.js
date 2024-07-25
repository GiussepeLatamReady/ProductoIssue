/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_AnulacionInvoice_LBRY_V2.0.js  				||
||                                                              ||
||  Version   Date         Author        Remarks                ||
||  2.0     14 Nov 2019  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/record', 'N/runtime', 'N/log', 'N/search', 'N/format', 'N/transaction', './LMRY_IP_libSendingEmailsLBRY_V2.0', 'N/query'],
    function (record, runtime, log, search, format, transaction, libraryEmail, query) {

        var LMRY_script = 'LMRY_AnulacionInvoice_LBRY_V2.0.js';

        var MEMO_VOID_WHT = "Voided Latam - WHT"
        var MEMO_WHT = "(LatamTax -  WHT)";

        //Features
        var F_SUBSIDIAR = false;
        var F_MULTPRICE = false;
        var F_DEPARTMENTS = false;
        var F_LOCATIONS = false;
        var F_CLASSES = false;
        var F_DEPTMANDATORY = false;
        var F_CLASSMANDATORY = false;
        var F_LOCMANDATORY = false;
        var F_REVERSALVOIDING = false;
        var F_APPROVAL_INVOICE = false;
        var F_JOBS = false;

        function anularInvoice(id_invoice) {
            var response = {
                idInvoice: id_invoice,
                wht: false,
                standardvoid: false,
                idcreditmemo: null,
                error: null
            };

            try {
                F_SUBSIDIAR = runtime.isFeatureInEffect({
                    feature: "SUBSIDIARIES"
                });

                F_MULTPRICE = runtime.isFeatureInEffect({
                    feature: 'MULTPRICE'
                });

                F_DEPARTMENTS = runtime.isFeatureInEffect({
                    feature: "DEPARTMENTS"
                });
                F_LOCATIONS = runtime.isFeatureInEffect({
                    feature: "LOCATIONS"
                });
                F_CLASSES = runtime.isFeatureInEffect({
                    feature: "CLASSES"
                });

                //Obteniendo el estado de los Features Departamento / Clase / Localización
                F_DEPTMANDATORY = runtime.getCurrentScript().getParameter({
                    name: 'DEPTMANDATORY'
                });

                F_CLASSMANDATORY = runtime.getCurrentScript().getParameter({
                    name: 'CLASSMANDATORY'
                });

                F_LOCMANDATORY = runtime.getCurrentScript().getParameter({
                    name: 'LOCMANDATORY'
                });

                F_REVERSALVOIDING = runtime.getCurrentScript().getParameter({
                    name: 'REVERSALVOIDING'
                });

                F_APPROVAL_INVOICE = runtime.getCurrentScript().getParameter({
                    name: "CUSTOMAPPROVALCUSTINVC"
                });

                F_JOBS = runtime.isFeatureInEffect({
                    feature: "JOBS"
                });

                var customSegments = getCustomSegments();
                log.error("customSegments", customSegments);


                // 2022.06.23 ONE WORLD/MID MARKET
                var columns = [];
                if (F_SUBSIDIAR == true || F_SUBSIDIAR == 'T') {
                    columns = [
                        "trandate", "subsidiary", "custbody_lmry_subsidiary_country", "postingperiod", "approvalstatus",
                        "accountingperiod.closed", "tranid", "fxamount"
                    ];
                } else {
                    columns = [
                        "trandate", "custbody_lmry_subsidiary_country", "postingperiod", "approvalstatus",
                        "accountingperiod.closed", "tranid", "fxamount"
                    ];
                }

                if (F_DEPARTMENTS == true || F_DEPARTMENTS == 'T') {
                    columns.push("department");
                }

                if (F_CLASSES == true || F_CLASSES == 'T') {
                    columns.push("class");
                }

                if (F_LOCATIONS == true || F_LOCATIONS == 'T') {
                    columns.push("location");
                }
                log.debug('F_SUBSIDIAR - columns', F_SUBSIDIAR + ' - ' + columns);

                var invoice = search.lookupFields({
                    type: "invoice",
                    id: id_invoice,
                    columns: columns
                });

                log.error('invoice', JSON.stringify(invoice));
                var approvalstatus = '';
                if (invoice.approvalstatus && invoice.approvalstatus.length) {
                    approvalstatus = Number(invoice.approvalstatus[0].value);
                }

                var isClosedPeriod = invoice["accountingperiod.closed"];
                response['closedperiod'] = isClosedPeriod;

                if ((!F_APPROVAL_INVOICE || F_APPROVAL_INVOICE == 'F') || ((F_APPROVAL_INVOICE == true || F_APPROVAL_INVOICE == 'T') && approvalstatus == 2)) {

                    log.error('[isClosedPeriod, F_REVERSALVOIDING]', [isClosedPeriod, F_REVERSALVOIDING].join(','));

                    var taxResults = getTaxResults(id_invoice);
                    log.error('taxResults', JSON.stringify(taxResults));

                    var whtObject = getWithholdingTax(id_invoice, customSegments);
                    log.error('whtObject', JSON.stringify(whtObject));
                    if (whtObject['id']) {
                        response['wht'] = true;
                    }

                    //Si el periodo esta abierto y es posible la anulacion estandar
                    if (!isClosedPeriod && (F_REVERSALVOIDING == false || F_REVERSALVOIDING == 'F')) {
                        //si tiene retencion se anula primero el credit memo de retencion
                        if (whtObject['id']) {
                            voidWHTCreditMemo(whtObject['id']);
                        }

                        transaction.void({
                            type: transaction.Type.INVOICE,
                            id: id_invoice
                        });

                        voidLatamTaxJSONResult(id_invoice);

                        response['standardvoid'] = true;
                    } else {
                        // 2022.06.23 ONE WORLD/MID MARKET
                        // Evalua si existe anulacion de invoice para Mexico
                        var country = invoice.custbody_lmry_subsidiary_country[0].value;
                        if (isThereCancellation(id_invoice)) {
                            response.error = "La transaccion ya esta anulada. El proceso se ha cancelado";
                            return response;
                        }
                        var idSubsidiary = 1;
                        if (F_SUBSIDIAR == true || F_SUBSIDIAR == 'T') {
                            idSubsidiary = invoice.subsidiary[0].value;
                        }
                        //obtener los formularios
                        var forms = getForms(idSubsidiary);
                        log.error("forms", JSON.stringify(forms));

                        //Si tiene retenciones se crea un invoice para cancelar el credit memo de retencion
                        var idWHTInvoice = createVoidWHTInvoice(id_invoice, whtObject, customSegments, forms);

                        //Se crea el credit memo de anulacion
                        var idVoidCreditMemo = createVoidCreditMemo(id_invoice, invoice, idWHTInvoice, forms);
                        response['idcreditmemo'] = idVoidCreditMemo;

                        //Se copia los tax results de impuestos pero se relaciona al credit memo
                        copyTaxResults(idVoidCreditMemo, taxResults);
                        voidLatamTaxJSONResult(id_invoice);
                    }


                    //Modificando a cero los campos BASE AMOUNT/TOTAL/TOTAL BASE CURRENCY de los records del Tax Results
                    /*for (var i = 0; i < taxResults.length; i++) {
                        var id = taxResults[i]['id'];
                        record.submitFields({
                            type: 'customrecord_lmry_br_transaction',
                            id: id,
                            values: {
                                'custrecord_lmry_base_amount': 0, //LATAM - BASE AMOUNT
                                'custrecord_lmry_br_total': 0, //LATAM - TOTAL
                                'custrecord_lmry_total_base_currency': 0,//LATAM - TOTAL BASE CURRENCY
                                "custrecord_lmry_base_amount_local_currc": 0, //LATAM - BASE AMOUNT LOCAL CURRENCY
                                "custrecord_lmry_amount_local_currency": 0,//LATAM - AMOUNT LOCAL CURRENCY
                                "custrecord_lmry_gross_amt_local_curr": 0,//LATAM - GROSS AMT LOCAL CURRENCY
                                "custrecord_lmry_discount_amt_local_curr": 0,//LATAM - DISCOUNT AMT LOCAL CURRENCY
                                "custrecord_lmry_gross_amt": 0, //LATAM - GROSS AMOUNT ITEM
                                "custrecord_lmry_discount_amt": 0 //LATAM - DISCOUNT AMOUNT
                            }
                        });
                    }*/

                }
            } catch (err) {
                response['error'] = {
                    name: err.name,
                    message: err.message || err
                };
                log.error('LMRY_AnulacionInvoice_LBRY_V2 - [anularInvoice]', err);
                libraryEmail.sendemail(' [ anularInvoice ] ' + err, LMRY_script);
            }

            return response;
        }

        function createVoidCreditMemo(id_invoice, invoice, idWHTInvoice, forms) {
            var idCreditMemo = '';

            var form = forms["creditmemoform"];

            var postingperiod = invoice.postingperiod[0].value;
            var trandate = invoice.trandate;
            var country = invoice.custbody_lmry_subsidiary_country[0].value;
            var subsidiary = 1;
            // 2022.06.23 ONE WORLD/MID MARKET
            if (F_SUBSIDIAR == true || F_SUBSIDIAR == 'T') {
                subsidiary = invoice.subsidiary[0].value;
            }
            var tranid = invoice.tranid;
            var totalInvoice = parseFloat(invoice.fxamount);

            var departmentInvoice;
            if (invoice.department && invoice.department.length) {
                departmentInvoice = invoice.department[0].value
            }

            var classInvoice;
            if (invoice['class'] && invoice['class'].length) {
                classInvoice = invoice['class'][0].value
            }

            var locationInvoice;
            if (invoice.location && invoice.location.length) {
                locationInvoice = invoice.location[0].value
            }

            var config = obtenerDatosConfigVoidTransaction(subsidiary);
            log.error('creditMemo form', form);
            log.error('config', JSON.stringify(config));

            if (config && form) {
                //Creando el Credit Memo
                var recordCreditMemo = record.transform({
                    fromType: record.Type.INVOICE,
                    fromId: id_invoice,
                    toType: record.Type.CREDIT_MEMO,
                    isDynamic: true,
                    defaultValues: {
                        'customform': form
                    }
                });

                recordCreditMemo.setValue('custbody_lmry_reference_transaction', id_invoice);
                recordCreditMemo.setValue('custbody_lmry_reference_transaction_id', id_invoice);

                //seteando el campo memo del CM el tranid y el internal id del Invoice
                recordCreditMemo.setValue({
                    fieldId: 'memo',
                    value: 'Reference VOID ' + tranid + ' ' + '(' + id_invoice + ')'
                });

                cleanCreditMemoFields(recordCreditMemo);

                //Solo para Brasil
                if (country == 30) {
                    //seteando el campo memo del CM el tranid y el internal id del Invoice
                    recordCreditMemo.setValue({
                        fieldId: 'custbody_lmry_num_preimpreso',
                        value: id_invoice + '-DV'
                    });

                    var date = format.parse({
                        value: trandate,
                        type: format.Type.DATE
                    });

                    recordCreditMemo.setValue({
                        fieldId: 'trandate',
                        value: date
                    });

                    recordCreditMemo.setValue({
                        fieldId: 'postingperiod',
                        value: postingperiod
                    });
                }

                if (F_DEPTMANDATORY == 'T' || F_DEPTMANDATORY == true) {
                    //Si el departamento en el invoice esta vacio, entonces se coloca el valor del campo "departamento" del record personalizado
                    if (!departmentInvoice) {
                        if (config['department']) {
                            recordCreditMemo.setValue({
                                fieldId: 'department',
                                value: config['department']
                            })
                        }
                    }
                }

                if (F_CLASSMANDATORY == 'T' || F_CLASSMANDATORY == true) {
                    //Si la Clase en el invoice esta vacio, entonces se coloca el valor del campo "Clase" del record personalizado
                    if (!classInvoice) {
                        if (config['class']) {
                            recordCreditMemo.setValue({
                                fieldId: 'class',
                                value: config['class']
                            });
                        }
                    }
                }


                if (F_LOCMANDATORY == 'T' || F_LOCMANDATORY == true) {
                    //Si la localización en el invoice esta vacio, entonces se coloca el valor del campo "localización" del record personalizado
                    if (!locationInvoice) {
                        if (config['location']) {
                            recordCreditMemo.setValue({
                                fieldId: 'location',
                                value: config['location']
                            });
                        }
                    }
                }


                //log.error('CheckBox de remover lines ', removeLines);
                if (config['removeLines'] == true) {
                    //Removiendo las lineas del Credit Memo
                    removeAllItems(recordCreditMemo);

                    recordCreditMemo.insertLine({
                        sublistId: 'item',
                        line: 0
                    });

                    if (config['item']) {
                        recordCreditMemo.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            //line: 0,
                            value: config['item']
                        });
                    }

                    if (F_MULTPRICE == true || F_MULTPRICE == 'T') {
                        recordCreditMemo.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'price',
                            //line: 0,
                            value: -1
                        });
                    }

                    recordCreditMemo.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        //line: 0,
                        value: totalInvoice
                    });
                    recordCreditMemo.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        //line: 0,
                        value: totalInvoice
                    });

                    if (config['taxCode']) {
                        recordCreditMemo.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            //line: 0,
                            value: config['taxCode']
                        });
                    }

                    recordCreditMemo.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'tax1amt',
                        //line: 0,
                        value: 0.00
                    });

                    if (F_DEPARTMENTS == true || F_DEPARTMENTS == 'T') {
                        var department_line = departmentInvoice || config['department'];
                        if (department_line) {
                            recordCreditMemo.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'department',
                                //line: 0,
                                value: department_line
                            });
                        }
                    }

                    if (F_CLASSES == true || F_CLASSES == 'T') {
                        var class_line = classInvoice || config['class'];
                        if (class_line) {
                            recordCreditMemo.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'class',
                                //line: 0,
                                value: class_line
                            });
                        }
                    }

                    if (F_LOCATIONS == true || F_LOCATIONS == 'T') {
                        var location_line = locationInvoice || config['location'];
                        if (location_line) {
                            recordCreditMemo.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                //line: 0,
                                value: location_line
                            });
                        }
                    }
                    recordCreditMemo.commitLine({
                        sublistId: 'item'
                    });
                }


                //Invoice que se aplicaran
                var invoicesToApply = [Number(id_invoice)];
                //Si hubo retencion tambien se aplicar el invoice creado para cancelar la retencion.
                if (idWHTInvoice) {
                    invoicesToApply.push(Number(idWHTInvoice));
                }

                var numApply = recordCreditMemo.getLineCount({
                    sublistId: 'apply'
                });

                var countApplieds = 0;

                for (var i = numApply - 1; i >= 0; i--) {
                    
                    recordCreditMemo.selectLine({
                        sublistId: 'apply',
                        line: i
                    });

                    var lineTransaction = recordCreditMemo.getCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                        //line: i
                    });

                    if (invoicesToApply.indexOf(Number(lineTransaction)) != -1) {
                        recordCreditMemo.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            //line: i,
                            value: true
                        });

                        countApplieds++;
                        recordCreditMemo.commitLine({
                            sublistId: 'apply'
                        });
    
                    }

                    if (countApplieds == invoicesToApply.length) {
                        break;
                    }
                }

                var accountingbook = getAccountingBook(id_invoice);
                log.debug("accountingbook", JSON.stringify(accountingbook));
                setAccountingBook(recordCreditMemo, accountingbook);

                //Guardando el CreditMemo
                idCreditMemo = recordCreditMemo.save({
                    ignoreMandatoryFields: true,
                    disableTriggers: true,
                    enableSourcing: true
                });

                // Case: 5046712
                record.submitFields({
                    type: 'creditmemo',
                    id: idCreditMemo,
                    values: { custbody_lmry_document_type: '' },
                    options: {
                        ignoreMandatoryFields: true,
                        disableTriggers: true,
                        enableSourcing: true
                    }
                });

                log.error('idCreditMemo', idCreditMemo);
            }
            return idCreditMemo;
        }

        function cleanCreditMemoFields(recordObj) {
            recordObj.setValue('custbody_lmry_foliofiscal', ''); //LATAM - FISCAL FOLIO
            recordObj.setValue('custbody_lmry_num_preimpreso', '') //LATAM - PREPRINTED NUMBER
            recordObj.setValue('custbody_lmry_num_doc_ref', ''); //LATAM - DOCUMENT NUMBER REF
            recordObj.setValue('custbody_lmry_doc_ref_date', ''); //LATAM - DOCUMENT DATE REF
            recordObj.setValue('custbody_lmry_doc_serie_ref', ''); //LATAM - DOCUMENT SERIES REF
            recordObj.setValue('custbody_lmry_exchange_rate_doc_ref', ''); //LATAM - TYPE CHANGE DOC REF
            recordObj.setValue('custbody_lmry_doc_ref_type', ''); //LATAM - DOCUMENT TYPE REF
            // Case: 5046712
            //recordObj.setValue('custbody_lmry_document_type', ''); //LATAM - LEGAL DOCUMENT TYPE
            recordObj.setValue('custbody_lmry_serie_doc_cxc', ''); //LATAM - SERIE CXC
            recordObj.setValue('custbody_lmry_mx_document_design', ''); //LATAM - MX DOCUMENT DESIGN
            recordObj.setValue('custbody_lmry_paymentmethod', ''); //LATAM - PAYMENT METHOD
            recordObj.setValue('custbody_lmry_entity_bank', ''); //LATAM - ENTITY BANK
            recordObj.setValue('custbody_lmry_entity_bank_account', ''); //LATAM - ENTITY BANK ACCOUNT
            recordObj.setValue('custbody_lmry_entity_bank_code', ''); //LATAM - ENTITY BANK CODE
            recordObj.setValue('custbody_lmry_entityforeingbank', ''); //LATAM FOREIGN ENTITY BANK
            recordObj.setValue('custbody_lmry_foliofiscal_doc_ref', ''); //LATAM - FOLIO FISCAL REF
            recordObj.setValue('custbody_lmry_informacion_adicional', ''); //LATAM - ADDITIONAL INFORMATION
            recordObj.setValue('custbody_lmry_mx_uso_cfdi', ''); //LATAM - MX USECFDI
            recordObj.setValue('custbody_lmry_mx_paymentmethod', ''); //LATAM - MX EI PAYMENT METHOD
            recordObj.setValue('custbody_lmry_mx_tipo_relacion', ''); //LATAM - MX RELATIONTYPE
            recordObj.setValue('custbody_lmry_pe_estado_sf', ''); //LATAM - MX ESTADO SF
            recordObj.setValue('custbody_lmry_serie_doc_loc_cxc', ''); //LATAM - CXC LOCATION SERIES
            recordObj.setValue('custbody_lmry_carga_inicial', false); //LATAM - INITIAL LOAD?
            recordObj.setValue('custbody_lmry_apply_wht_code', false); // LATAM - APPLIED WHT CODE
            recordObj.setValue('custbody_psg_ei_template', ''); // E-DOCUMENT TEMPLATE
            recordObj.setValue('custbody_psg_ei_status', ''); // E-DOCUMENT STATUS
            recordObj.setValue('custbody_psg_ei_sending_method', ''); //E-DOCUMENT SENDING METHODS
            recordObj.setValue('custbody_psg_ei_generated_edoc', ''); //GENERATED E-DOCUMENT
        }

        function obtenerDatosConfigVoidTransaction(id_subsidiaria) {
            try {
                var config = {};
                //busqueda del record customrecord_lmry_config_voidtransaction para la config: Void Transaction

                var columns = ['custrecord_lmry_configvoid_subsidiary', 'custrecord_lmry_configvoid_item',
                    'custrecord_lmry_configvoid_taxcode', 'custrecord_lmry_configvoid_removelines'
                ];

                if (F_DEPARTMENTS == true || F_DEPARTMENTS == 'T') {
                    columns.push("custrecord_lmry_configvoid_department");
                }

                if (F_CLASSES == true || F_CLASSES == 'T') {
                    columns.push("custrecord_lmry_configvoid_class");
                }

                if (F_LOCATIONS == true || F_LOCATIONS == 'T') {
                    columns.push("custrecord_lmry_configvoid_location");
                }

                var searchConfigVoidTransaction = search.create({
                    type: 'customrecord_lmry_config_voidtransaction',
                    columns: columns,
                    filters: ['custrecord_lmry_configvoid_subsidiary', 'is', id_subsidiaria]
                });
                var searchResult = searchConfigVoidTransaction.run().getRange(0, 1);

                if (searchResult != '' && searchResult != null) {
                    config['item'] = searchResult[0].getValue({
                        name: 'custrecord_lmry_configvoid_item'
                    });
                    config['taxCode'] = searchResult[0].getValue({
                        name: 'custrecord_lmry_configvoid_taxcode'
                    });
                    config['department'] = searchResult[0].getValue({
                        name: 'custrecord_lmry_configvoid_department'
                    });
                    config['class'] = searchResult[0].getValue({
                        name: 'custrecord_lmry_configvoid_class'
                    });
                    config['location'] = searchResult[0].getValue({
                        name: 'custrecord_lmry_configvoid_location'
                    });
                    config['removeLines'] = searchResult[0].getValue({
                        name: 'custrecord_lmry_configvoid_removelines'
                    });
                }

                return config;
            } catch (err) {
                log.error('LMRY_AnulacionInvoice_LBRY_V2 - [obtenerDatosConfigVoidTransaction]', err);
                libraryEmail.sendemail(' [ obtenerDatosConfigVoidTransaction ] ' + err, LMRY_script);
            }
        }

        function getWithholdingTax(idTransaction, customSegments) {
            var whtObject = {};

            // 2022.06.23 ONE WORLD/MID MARKET
            var columns = [];
            if (F_SUBSIDIAR == true || F_SUBSIDIAR == 'T') {
                columns = ["internalid", "mainline", "trandate", "subsidiary", "exchangerate", "currency", "postingperiod",
                    "account", "fxamount", "item", "taxcode", "memo", "line",
                    search.createColumn({
                        name: "linesequencenumber",
                        sort: search.Sort.ASC
                    })
                ];
            } else {
                columns = ["internalid", "mainline", "trandate", "exchangerate", "currency", "postingperiod",
                    "account", "fxamount", "item", "taxcode", "memo", "line",
                    search.createColumn({
                        name: "linesequencenumber",
                        sort: search.Sort.ASC
                    })
                ];
            }
            if (F_DEPARTMENTS == true || F_DEPARTMENTS == 'T') {
                columns.push("department");
            }

            if (F_CLASSES == true || F_CLASSES == 'T') {
                columns.push("class");
            }

            if (F_LOCATIONS == true || F_LOCATIONS == 'T') {
                columns.push("location");
            }

            for (var i = 0; i < customSegments.length; i++) {
                var customSegmentId = customSegments[i];
                columns.push(customSegmentId, "line." + customSegmentId);
            }

            if (F_JOBS == true || F_JOBS == 'T') {
                columns.push("customerMain.internalid");
            } else {
                columns.push("customer.internalid");
            }

            var search_wht = search.create({
                type: "creditmemo",
                filters: [
                    ["createdfrom", "anyof", idTransaction], "AND",
                    ["memomain", "startswith", MEMO_WHT], "AND",
                    ["taxline", "is", "F"], "AND",
                    ["formulatext: {item.type.id}", "doesnotstartwith", "ShipItem"]
                ],
                columns: columns,
                settings: []
            });

            // 2022.06.23 ONE WORLD/MID MARKET            
            if (F_SUBSIDIAR == true || F_SUBSIDIAR == 'T') {
                search_wht.settings.push(
                    search.createSetting({
                        name: 'consolidationtype',
                        value: 'NONE'
                    })
                );
            }

            var results = search_wht.run().getRange(0, 1000);

            if (results && results.length) {
                var idCreditMemo = results[0].getValue('internalid');

                var customer = "";
                if (F_JOBS == true || F_JOBS == 'T') {
                    customer = results[0].getValue({
                        join: "customerMain",
                        name: "internalid"
                    });
                } else {
                    customer = results[0].getValue({
                        join: "customer",
                        name: "internalid"
                    });
                }

                // 2022.06.23 ONE WORLD/MID MARKET
                var subsidiary = 1;
                if (F_SUBSIDIAR == true || F_SUBSIDIAR == 'T') {
                    subsidiary = results[0].getValue('subsidiary');
                }
                var trandate = results[0].getValue('trandate');
                trandate = format.parse({
                    value: trandate,
                    type: format.Type.DATE
                });
                var postingperiod = results[0].getValue('postingperiod');
                var currency = results[0].getValue('currency');
                var exchangerate = results[0].getValue('exchangerate');
                var account = results[0].getValue('account');

                var department = results[0].getValue('department');
                var class_ = results[0].getValue('class');
                var location = results[0].getValue('location');

                whtObject = {
                    id: idCreditMemo,
                    customer: customer,
                    subsidiary: subsidiary,
                    trandate: trandate,
                    postingperiod: postingperiod,
                    currency: currency,
                    exchangerate: exchangerate,
                    account: account,
                    department: department,
                    'class': class_,
                    location: location,
                    lines: []
                };

                for (var i = 0; i < customSegments.length; i++) {
                    var customSegmentId = customSegments[i];
                    whtObject[customSegmentId] = results[0].getValue(customSegmentId);
                }

                for (var i = 0; i < results.length; i++) {
                    var mainline = results[i].getValue('mainline');
                    var item = results[i].getValue('item');
                    var amount = results[i].getValue('fxamount');
                    amount = Math.abs(parseFloat(amount));
                    var taxcode = results[i].getValue('taxcode');
                    var memo = results[i].getValue('memo');
                    var department_line = results[i].getValue('department');
                    var class_line = results[i].getValue('class');
                    var location_line = results[i].getValue('location');

                    if (mainline != '*' && item) {
                        var lineObj = {
                            item: item,
                            amount: amount,
                            taxcode: taxcode,
                            memo: memo,
                            department: department_line,
                            'class': class_line,
                            location: location_line
                        };

                        for (var s = 0; s < customSegments.length; s++) {
                            var customSegmentId = customSegments[s];
                            lineObj[customSegmentId] = results[i].getValue("line." + customSegmentId);
                        }

                        whtObject['lines'].push(lineObj);
                    }
                }
            }

            return whtObject;
        }

        function createVoidWHTInvoice(idTransaction, whtObject, customSegments, forms) {
            try {
                var idWHTInvoice = '';
                if (whtObject['id']) {
                    var form = forms["invoiceform"];

                    if (whtObject['customer'] && form) {
                        var invoiceObj = record.transform({
                            fromType: 'customer',
                            fromId: whtObject['customer'],
                            toType: 'invoice',
                            isDynamic: false,
                            defaultValues: {
                                'customform': form
                            }
                        });

                        //invoiceObj.setValue('customform', form);
                        invoiceObj.setValue('trandate', new Date());
                        // 2022.06.23 ONE WORLD/MID MARKET
                        if (F_SUBSIDIAR == true || F_SUBSIDIAR == 'T') {
                            invoiceObj.setValue('subsidiary', whtObject['subsidiary']);
                        }
                        invoiceObj.setValue('account', whtObject['account']);
                        invoiceObj.setValue('currency', whtObject['currency']);
                        invoiceObj.setValue('exchangerate', whtObject['exchangerate']);
                        invoiceObj.setValue('memo', MEMO_VOID_WHT);
                        invoiceObj.setValue('custbody_lmry_reference_transaction', idTransaction);
                        invoiceObj.setValue('custbody_lmry_reference_transaction_id', idTransaction);
                        invoiceObj.setValue('custbody_lmry_reference_entity', whtObject['customer']);
                        invoiceObj.setValue('terms', "");

                        var F_APPROVAL_INVOICE = runtime.getCurrentScript().getParameter({
                            name: "CUSTOMAPPROVALCUSTINVC"
                        });

                        if (F_APPROVAL_INVOICE && invoiceObj.getField({
                            fieldId: 'approvalstatus'
                        })) {
                            invoiceObj.setValue('approvalstatus', 2);
                        }


                        if ((F_DEPARTMENTS == 'T' || F_DEPARTMENTS == true) && whtObject['department']) {
                            invoiceObj.setValue('department', whtObject['department']);
                        }

                        if ((F_CLASSES == 'T' || F_CLASSES == true) && whtObject['class']) {
                            invoiceObj.setValue('class', whtObject['class']);
                        }

                        if ((F_LOCATIONS == 'T' || F_LOCATIONS == true) && whtObject['location']) {
                            invoiceObj.setValue('location', whtObject['location']);
                        }

                        for (var i = 0; i < customSegments.length; i++) {
                            var customSegmentId = customSegments[i];
                            if (invoiceObj.getField(customSegmentId) && whtObject[customSegmentId]) {
                                invoiceObj.setValue(customSegmentId, whtObject[customSegmentId]);
                            }
                        }


                        for (var i = 0; i < whtObject['lines'].length; i++) {
                            var line = whtObject['lines'][i];
                            invoiceObj.insertLine({
                                sublistId: 'item',
                                line: i
                            });
                            invoiceObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i,
                                value: line['item']
                            });

                            if (F_MULTPRICE) {
                                invoiceObj.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'price',
                                    line: i,
                                    value: -1
                                });
                            }

                            invoiceObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                line: i,
                                value: line['amount']
                            });
                            invoiceObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                line: i,
                                value: line['amount']
                            });
                            invoiceObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'tax1amt',
                                line: i,
                                value: 0.00
                            });
                            invoiceObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                line: i,
                                value: line['taxcode']
                            });
                            invoiceObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'description',
                                line: i,
                                value: "VOID - " + line['memo']
                            });

                            if ((F_DEPARTMENTS == 'T' || F_DEPARTMENTS == true) && line['department']) {
                                invoiceObj.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'department',
                                    line: i,
                                    value: line['department']
                                })
                            }

                            if ((F_CLASSES == 'T' || F_CLASSES == true) && line['class']) {
                                invoiceObj.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'class',
                                    line: i,
                                    value: line['class']
                                })
                            }

                            if ((F_LOCATIONS == 'T' || F_LOCATIONS == true) && line['location']) {
                                invoiceObj.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'location',
                                    line: i,
                                    value: line['location']
                                })
                            }


                            for (var s = 0; s < customSegments.length; s++) {
                                var customSegmentId = customSegments[s];
                                if (invoiceObj.getSublistField({ sublistId: "item", fieldId: customSegmentId, line: i }) && line[customSegmentId]) {
                                    invoiceObj.setSublistValue({ sublistId: "item", fieldId: customSegmentId, line: i, value: line[customSegmentId] });
                                }
                            }

                        }

                        idWHTInvoice = invoiceObj.save({
                            ignoreMandatoryFields: true,
                            disableTriggers: true,
                            enableSourcing: true
                        });
                    }
                }

                log.error('idWHTInvoice', idWHTInvoice);
                return idWHTInvoice;
            } catch (err) {
                log.error('[ createVoidWHTInvoice ]', err);
                libraryEmail.sendemail(' [ createVoidWHTInvoice ] ' + err, LMRY_script);
            }
        }

        function getTaxResults(recordId) {
            var taxResults = [];
            if (recordId) {
                var searchTaxResults = search.create({
                    type: 'customrecord_lmry_br_transaction',
                    filters: [
                        ['custrecord_lmry_br_transaction', 'anyof', recordId]
                    ],
                    columns: ['internalid', 'custrecord_lmry_tax_type']
                });

                var results = searchTaxResults.run().getRange(0, 1000);
                if (results) {
                    for (var i = 0; i < results.length; i++) {
                        taxResults.push({
                            taxtype: results[i].getValue('custrecord_lmry_tax_type'),
                            id: results[i].getValue('internalid')
                        });
                    }
                }
            }
            return taxResults;
        }

        function copyTaxResults(idCreditMemo, taxResults) {
            for (var i = 0; i < taxResults.length; i++) {
                var taxtype = taxResults[i]['taxtype'];
                if (Number(taxtype) == 4) { //Impuesto
                    var id = taxResults[i]['id'];
                    var taxResultObj = record.copy({
                        type: "customrecord_lmry_br_transaction",
                        id: id
                    });
                    taxResultObj.setValue('custrecord_lmry_br_transaction', idCreditMemo);
                    taxResultObj.setValue('custrecord_lmry_br_related_id', parseInt(idCreditMemo));
                    taxResultObj.save({
                        ignoreMandatoryFields: true,
                        disableTriggers: true,
                        enableSourcing: true
                    });
                }
            }
        }

        function voidWHTCreditMemo(idCreditMemo) {
            if (idCreditMemo) {
                var creditMemoObj = record.load({
                    type: "creditmemo",
                    id: idCreditMemo
                });

                var idInvoice = creditMemoObj.getValue('custbody_lmry_reference_transaction');

                var numApply = creditMemoObj.getLineCount({
                    sublistId: 'apply'
                });

                for (var i = 0; i < numApply; i++) {
                    var lineTransaction = creditMemoObj.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                        line: i
                    });

                    if (Number(lineTransaction) == Number(idInvoice)) {
                        creditMemoObj.setSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            line: i,
                            value: false
                        });
                        break;
                    }
                }

                creditMemoObj.save({
                    ignoreMandatoryFields: true,
                    disableTriggers: true,
                    enableSourcing: true
                });

                transaction.void({
                    type: "creditmemo",
                    id: idCreditMemo
                });
            }
        }

        function validateBeforeVoidInvoice(idInvoice) {
            var search_paymts = search.create({
                type: "transaction",
                filters: [

                    ["type", "anyof", "CustPymt", "CustCred"],
                    "AND", ["mainline", "is", "T"], "AND",
                    ["memomain", "doesnotstartwith", MEMO_WHT], "AND",
                    ["appliedtotransaction", "anyof", idInvoice]
                ],
                columns: ["internalid", "appliedtotransaction"]
            });


            var results = search_paymts.run().getRange(0, 10);

            if (results && results.length) {
                return false;
            }
            return true;
        }


        function removeAllItems(recordObj) {
            while (true) {
                var numberItems = recordObj.getLineCount({
                    sublistId: 'item'
                });
                if (numberItems) {
                    recordObj.removeLine({
                        sublistId: 'item',
                        line: numberItems - 1
                    });
                } else {
                    break;
                }
            }
        }

        function getForms(idSubsidiary) {
            var forms = {};
            if (idSubsidiary) {
                var search_setup = search.create({
                    type: 'customrecord_lmry_setup_tax_subsidiary',
                    filters: [
                        ['custrecord_lmry_setuptax_subsidiary', 'anyof', idSubsidiary], 'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid', 'custrecord_lmry_setuptax_form_invoice', 'custrecord_lmry_setuptax_form_creditmemo']
                });

                var results = search_setup.run().getRange(0, 10);
                if (results && results.length) {
                    forms['invoiceform'] = results[0].getValue('custrecord_lmry_setuptax_form_invoice') || '';
                    forms['creditmemoform'] = results[0].getValue('custrecord_lmry_setuptax_form_creditmemo') || '';
                }
            }

            return forms;
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

        function reversalJournal(recordId) {
            try {
                var result = {
                    trans: '',
                    fields: []
                };
                var lineFields = {
                    department: '',
                    class: '',
                    location: ''
                };
                var filters = [];
                var configFilters = [];
                var configuration = [];
                var custPymtAccountDetail = query.runSuiteQL({
                    query: "SELECT top 2 BUILTIN.DF( TransactionAccountingLine.Account ) AS Account,TransactionAccountingLine.Account,TransactionAccountingLine.Debit,TransactionAccountingLine.Credit,TransactionAccountingLine.Posting,TransactionLine.Memo,TransactionLine.id,TransactionLine.Transaction FROM accountingbook, TransactionLine,TransactionAccountingLine where TransactionLine.Transaction = TransactionAccountingLine.Transaction and TransactionAccountingLine.accountingbook=accountingbook.id  and   accountingbook.isprimary= 'T'   and TransactionAccountingLine.Transaction = '" + recordId + "' and (TransactionAccountingLine.Debit IS NOT NULL or TransactionAccountingLine.Credit IS NOT NULL ) ORDER BY TransactionLine.ID"
                }).results;
                // log.error("data custPymtAccountDetail", [custPymtAccountDetail[0], custPymtAccountDetail[1]]);
                var accountDebit = custPymtAccountDetail.filter(function (cuenta) { return cuenta.values[2] == null })[0].values[1];
                var accountCredit = custPymtAccountDetail.filter(function (cuenta) { return cuenta.values[3] == null })[0].values[1];
                log.debug("data custPymtAccountDetail", [accountDebit, accountCredit]);

                F_SUBSIDIAR = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
                F_LOCMANDATORY = runtime.getCurrentUser().getPreference({ name: 'LOCMANDATORY' });
                F_DEPTMANDATORY = runtime.getCurrentUser().getPreference({ name: 'DEPTMANDATORY' });
                F_CLASSMANDATORY = runtime.getCurrentUser().getPreference({ name: 'CLASSMANDATORY' });


                var paymentValues = getPaymentValues(recordId);

                //-------------- validate dept, class, loct
                lineFields['department'] = paymentValues.department;
                lineFields['class'] = paymentValues.class_;
                lineFields['location'] = paymentValues.location;

                if (F_SUBSIDIAR) filters.push(search.createFilter({
                    name: "custrecord_lmry_setuptax_subsidiary",
                    operator: search.Operator.IS,
                    values: paymentValues.subsidiary
                }));
                if ((lineFields['department'] == '' || lineFields['department'] == null) && F_DEPTMANDATORY) configFilters.push('custrecord_lmry_setuptax_department');
                if ((lineFields['class'] == '' || lineFields['class'] == null) && F_CLASSMANDATORY) configFilters.push('custrecord_lmry_setuptax_class');
                if ((lineFields['location'] == '' || lineFields['location'] == null) && F_LOCMANDATORY) configFilters.push('custrecord_lmry_setuptax_location');

                //---------------- setup tax subsidiary
                if (configFilters.length > 0) configuration = search.create({
                    type: "customrecord_lmry_setup_tax_subsidiary",
                    filters: [
                        filters
                    ],
                    columns: configFilters,
                }).run().getRange(0, 1);

                configFilters.forEach(function (fieldId) {
                    var configField = configuration[0].getValue(fieldId);
                    fieldId.replace('custrecord_lmry_setuptax_', '');
                    if (configField != null && configField != undefined && configField != '') {
                        lineFields[fieldId] = configField;
                    } else {
                        result['fields'].push(fieldId);
                    }
                });

                if (result['fields'].length > 0) return result;

                //------------------- Journal
                var revJournal = record.create({
                    type: record.Type.JOURNAL_ENTRY,
                    isDynamic: true
                });

                //------------------- Body
                if (F_SUBSIDIAR) revJournal.setValue({
                    fieldId: 'subsidiary',
                    value: paymentValues.subsidiary
                });
                revJournal.setValue({
                    fieldId: 'currency',
                    value: paymentValues.currency
                });
                revJournal.setValue({
                    fieldId: 'exchangerate',
                    value: paymentValues.exchangerate
                });
                revJournal.setValue({
                    fieldId: 'memo',
                    value: 'Latam - Journal Reverse'
                });
                revJournal.setValue({
                    fieldId: 'custbody_lmry_reference_entity',
                    value: paymentValues.customer
                });
                revJournal.setValue({
                    fieldId: 'approvalstatus',
                    value: 2
                });

                revJournal.setValue({
                    fieldId: 'custbody_lmry_reference_transaction',
                    value: recordId
                });

                var lineAmount = paymentValues.total;

                //------------------- debit
                revJournal.selectNewLine({
                    sublistId: 'line'
                });
                revJournal.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'account',
                    value: accountDebit
                });
                revJournal.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: "debit",
                    value: lineAmount
                });
                revJournal.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'entity',
                    value: paymentValues.customer
                });
                revJournal.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'memo',
                    value: 'Latam - Reversal journal'
                });

                for (var property in lineFields) {
                    if (lineFields[property] != '' && lineFields[property] != null && lineFields[property] != null) {
                        revJournal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: property,
                            value: lineFields[property]
                        });
                    }
                }
                revJournal.commitLine({
                    sublistId: 'line'
                });

                //------------------- credit
                revJournal.selectNewLine({
                    sublistId: 'line'
                });
                revJournal.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'account',
                    value: accountCredit
                });
                revJournal.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: "credit",
                    value: lineAmount
                })
                revJournal.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'entity',
                    value: paymentValues.customer
                });
                revJournal.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'memo',
                    value: 'Latam - Reversal journal'
                });

                for (var property in lineFields) {
                    if (lineFields[property] != '' && lineFields[property] != null && lineFields[property] != null) {
                        revJournal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: property,
                            value: lineFields[property]
                        });
                    }
                }

                revJournal.commitLine({
                    sublistId: 'line'
                });

                result['trans'] = revJournal.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });
                log.debug("reverse journal ", result);
                return result;
            } catch (error) {
                log.error('LMRY_AnulacionInvoice_LBRY_V2 - [reversalJournal]', error);
                libraryEmail.sendemail(' [ reversalJournal ] ' + error, LMRY_script);
            }
        }

        function voidLatamTaxJSONResult(id_invoice) {
            try {
                var seriesSearch = search.create({
                    type: "customrecord_lmry_ste_json_result",
                    filters: [
                        ["custrecord_lmry_ste_related_transaction", "is", id_invoice],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                    columns: [
                        search.createColumn({ name: "id", sort: search.Sort.ASC, label: "ID" }),
                        search.createColumn({ name: "custrecord_lmry_ste_tax_transaction" }),
                        search.createColumn({ name: "custrecord_lmry_ste_wht_transaction" })
                    ]
                });
                var results = seriesSearch.run().getRange(0, 1);
                var columns = seriesSearch.columns;
                if (results && results.length) {
                    //ID Tax Json
                    var idTaxJson = results[0].getValue(columns[0]);
                    //Json Tax Transaction
                    var jsonTaxTra = results[0].getValue(columns[1])
                    if (jsonTaxTra != "") {
                        jsonTaxTra = JSON.parse(jsonTaxTra);
                    }
                    //Json Wht Transaction
                    var jsonWthTaxTra = results[0].getValue(columns[2]);
                    if (jsonWthTaxTra != "") {
                        jsonWthTaxTra = JSON.parse(jsonWthTaxTra);
                    }

                    //JSON TAX TRANSACTION
                    if (jsonTaxTra.length > 0) {
                        for (var i = 0; i < jsonTaxTra.length; i++) {
                            jsonTaxTra[i]["baseAmount"] = 0;
                            jsonTaxTra[i]["taxAmount"] = 0;
                            jsonTaxTra[i]["discountAmount"] = 0;
                            jsonTaxTra[i]["grossAmount"] = 0;
                            jsonTaxTra[i]["lc_baseAmount"] = 0;
                            jsonTaxTra[i]["lc_taxAmount"] = 0;
                            jsonTaxTra[i]["lc_grossAmount"] = 0;
                            jsonTaxTra[i]["lc_discountAmount"] = 0;
                        }
                    }
                    //JSON WITHHOLDING TAX TRANSACTION
                    if (jsonWthTaxTra.length > 0) {
                        for (var i = 0; i < jsonWthTaxTra.length; i++) {
                            jsonWthTaxTra[i]["baseAmount"] = 0;
                            jsonWthTaxTra[i]["whtAmount"] = 0;
                            jsonWthTaxTra[i]["grossAmount"] = 0;
                            jsonWthTaxTra[i]["lc_baseAmount"] = 0;
                            jsonWthTaxTra[i]["lc_whtAmount"] = 0;
                            jsonWthTaxTra[i]["lc_grossAmount"] = 0;
                        }
                    }

                    record.submitFields({
                        type: 'customrecord_lmry_ste_json_result',
                        id: idTaxJson,
                        values: {
                            "custrecord_lmry_ste_tax_transaction": jsonTaxTra != "" ? JSON.stringify(jsonTaxTra) : jsonTaxTra,
                            "custrecord_lmry_ste_wht_transaction": jsonWthTaxTra != "" ? JSON.stringify(jsonWthTaxTra) : jsonWthTaxTra
                        }
                    });
                }
            } catch (error) {
                log.error('error', error);
                libraryEmail.sendemail(' [ voidLatamTaxJSONResult ] ' + error, LMRY_script);
            }

        }

        function getPaymentValues(paymentId) {
            var F_DEPARTMENTS = runtime.isFeatureInEffect({
                feature: "DEPARTMENTS"
            });
            var F_LOCATIONS = runtime.isFeatureInEffect({
                feature: "LOCATIONS"
            });
            var F_CLASSES = runtime.isFeatureInEffect({
                feature: "CLASSES"
            });

            var columns = ["fxamount", "subsidiary", "entity", "currency", "exchangerate"];

            if (F_DEPARTMENTS == "T" || F_DEPARTMENTS == true) {
                columns.push("department");
            }

            if (F_LOCATIONS == "T" || F_LOCATIONS == true) {
                columns.push("location");
            }

            if (F_CLASSES == "T" || F_CLASSES == true) {
                columns.push("class");
            }

            var paymentSearch = search.create({
                type: "customerpayment",
                filters: [
                    ["mainline", "is", "T"], "AND",
                    ["internalid", "anyof", paymentId]
                ],
                columns: columns
            });
            var results = paymentSearch.run().getRange(0, 1);
            if (results && results.length) {
                return {
                    subsidiary: results[0].getValue("subsidiary"),
                    customer: results[0].getValue("entity"),
                    currency: results[0].getValue("currency"),
                    exchangerate: results[0].getValue("exchangerate") || "",
                    total: parseFloat(results[0].getValue("fxamount")) || 0.00,
                    department: results[0].getValue("department") || "",
                    class_: results[0].getValue("class") || "",
                    location: results[0].getValue("location") || ""
                };
            }

            return null;
        }

        function getAccountingBook(id_invoice) {
            var books = {};
            F_MULTIBOOK = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });

            if (F_MULTIBOOK == true || F_MULTIBOOK == "T") {
                // Con Multibook
                var accountingObj = search.create({
                    type: "accountingtransaction",
                    filters: [
                        ["internalid", "is", id_invoice]
                    ],
                    columns: [
                        search.createColumn({
                            name: "accountingbook",
                            summary: "GROUP",
                            sort: search.Sort.ASC
                        }),
                        search.createColumn({
                            name: "exchangerate",
                            summary: "GROUP"
                        })
                    ]
                });
                var resultObj = accountingObj.run().getRange(0, 1000);
                if (resultObj && resultObj.length) {
                    for (var i = 0; i < resultObj.length; i++) {
                        var accountingbook = resultObj[i].getValue({ summary: "GROUP", name: "accountingbook" });
                        var exchangerate = resultObj[i].getValue({ summary: "GROUP", name: "exchangerate" });
                        books[accountingbook] = Number(exchangerate);
                    }
                }
            } else {
                // Sin multibook
                var exchangerate = search.lookupFields({
                    type: "invoice",
                    id: id_invoice,
                    columns: ["exchangerate"]
                }).exchangerate;

                books["1"] = Number(exchangerate);
            }

            return books;
        }

        function setAccountingBook(recordObj, books) {
            // Exchange Rate
            recordObj.setValue("exchangerate", books["1"]);

            // Accounting Book
            if (F_MULTIBOOK == true || F_MULTIBOOK == "T") {
                var lineasBook = recordObj.getLineCount({
                    sublistId: 'accountingbookdetail'
                });
                log.debug("lineasBook", lineasBook);

                for (var i = 0; i < lineasBook; i++) {
                    recordObj.selectLine({
                        sublistId: 'accountingbookdetail',
                        line: i
                    });
    
                    var lineabookMB = recordObj.getCurrentSublistValue({
                        sublistId: 'accountingbookdetail',
                        fieldId: 'accountingbook',
                        //line: i
                    });

                    log.debug("lineabookMB["+i+"]", lineabookMB);
                    if (books[lineabookMB]) {
                        recordObj.setCurrentSublistValue({
                            sublistId: 'accountingbookdetail',
                            fieldId: 'exchangerate',
                            //line: i,
                            value: books[lineabookMB]
                        });
                        recordObj.commitLine({
                            sublistId: 'accountingbookdetail'
                        });
                    }
                }
            }
        }

        function isThereCancellation(invoiceId){

            var idCreditmemo = [];
            var creditmemoSearchObj = search.create({
                type: "creditmemo",
                filters:
                [
                   ["type","anyof","CustCred"], 
                   "AND", 
                   ["createdfrom.internalid","anyof",invoiceId], 
                   "AND", 
                   ["mainline","is","T"],
                   "AND",
                   ["memo","startswith","Reference VOID"]
                ],
                columns:
                [
                   search.createColumn({
                      name: "internalid",
                      sort: search.Sort.DESC,
                      label: "Internal ID"
                   })
                ]
             });

             creditmemoSearchObj.run().each(function(result){              
                idCreditmemo.push(result.getValue("internalid"));
             });

             return idCreditmemo.length != 0;
        }

        return {
            anularInvoice: anularInvoice,
            validateBeforeVoidInvoice: validateBeforeVoidInvoice,
            reversalJournal: reversalJournal
        };

    });
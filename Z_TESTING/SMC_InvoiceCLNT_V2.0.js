/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
 ||   This script for Transaction Type Invoice                   ||
 ||                                                              ||
 ||  File Name: LMRY_InvoiceCLNT_V2.0.js                         ||
 ||                                                              ||
 ||  Version Date         Author        Remarks                  ||
 ||  2.0     Jun 20 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

define(['./Latam_Library/LMRY_Val_TransactionLBRY_V2.0', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0',
    './Latam_Library/LMRY_libNumberInWordsLBRY_V2.0', './WTH_Library/LMRY_TAX_TransactionLBRY_V2.0',
    './Latam_Library/LMRY_ExchangeRate_LBRY_V2.0', 'N/currency', 'N/record', 'N/log',
    'N/currentRecord', 'N/search', 'N/runtime', 'N/https', 'N/url', 'N/translation',
    './Latam_Library/LMRY_AlertTraductorSale_LBRY_V2.0', './Latam_Library/LMRY_WebService_LBRY_v2.0.js',
    './Latam_Library/LMRY_ST_Transaction_ConfigFields_LBRY_V2.0', './Latam_Library/LMRY_BR_ValidateDuplicate_LBRY_V2.0',
    './Latam_Library/LMRY_CO_Duplicate_Credit_Memos_CLTN_LBRY_V2.0', './Latam_Library/LMRY_libToolsFunctionsLBRY_V2.0.js',
],
    function (Library_Val, Library_Mail, Library_Number, Library_WHT_Transaction, library_ExchRate, currency, record, log, currentRecord, search, runtime, https, url, translation, library_translator, LR_webService, ST_ConfigFields, LbryBRDuplicate, Library_Duplicate_Clnt, Library_libTools) {

        var LMRY_script = 'LatamReady - Invoice CLNT V2.0';
        var LMRY_access = false;
        var LMRY_countr = new Array();
        var LMRY_swsubs = false;
        var LMRY_swinit = false;
        var LMRY_swpnro = false;
        var currentRCD = '';
        var Val_Campos = new Array();
        var Val_Campos_Linea = new Array();
        var objsetline = '';
        var fegetMatch = false;
        var licenses = [];
        var Language = '';
        var type = '';
        var arrelo_set;
        var flag_set_uni = false;
        var enty_ant = '';
        var subs_ant = '';
        var fea_set = false;
        var subsidiary = '';
        var idcurrencyUSD = 0;
        var flag_currencyUSD = false;
        var old_record = {};
        var old_record_lines = [];

        //CL CHANGE CURRENCY UF
        var jsonCurrencies = {};
        var fieldRateUF = '';

        // SUITETAX
        var ST_FEATURE = false;

        var subsi_OW = runtime.isFeatureInEffect({
            feature: "SUBSIDIARIES"
        });
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext - The mode in which the record is being accessed (create, copy, or edit)
         * @since 2015.2
         */
        function INVClnt_PageInit(scriptContext) {

            try {

                currentRCD = scriptContext.currentRecord;
                type = scriptContext.mode;
                subsidiary = currentRCD.getValue('subsidiary');
                licenses = Library_Mail.getLicenses(subsidiary);

                if (type == 'create' || type == 'copy') {
                    var lmry_exchange_rate_field = currentRCD.getField('custpage_lmry_exchange_rate');
                    if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
                        lmry_exchange_rate_field.isDisplay = false;
                    }
                    var lmry_basecurrency = currentRCD.getField('custpage_lmry_basecurrency');
                    if (lmry_basecurrency != null && lmry_basecurrency != '') {
                        lmry_basecurrency.isDisplay = false;
                    }

                    if (currentRCD.getValue('entity') != '' && currentRCD.getValue('entity') != null) {
                        ws_exchange_rate();
                    }
                }

                if (type == 'create') {
                    var status = currentRCD.getField('custpage_uni_set_status');
                    if (status != '' && status != null) {
                        status.isDisplay = false;
                    }
                }

                Language = runtime.getCurrentScript().getParameter({
                    name: 'LANGUAGE'
                });

                Language = Language.substring(0, 2);


                // Esta cargado el formulario
                LMRY_swinit = true;
                LMRY_swsubs = true;

                // Valida el Acceso
                ValidateAccessInv(currentRCD.getValue('subsidiary'));
                fegetMatch = Library_Mail.getmatchfe(LMRY_countr[0], licenses);


                // Desactiva el campo
                var al_country = currentRCD.getValue('custbody_lmry_subsidiary_country');
                /*
                if (al_country != '' && al_country != null) {
                    currentRCD.getField({
                        fieldId: 'custbody_lmry_subsidiary_country'
                    }).isDisabled = true;
                }
                */
                currentRCD.getField({
                    fieldId: 'custbody_lmry_subsidiary_country'
                }).isDisplay = false;

                if (Library_Mail.getAuthorization(117, licenses) == false) {
                    currentRCD.getField({
                        fieldId: 'custbody_lmry_reference_transaction'
                    }).isDisabled = true;
                    currentRCD.getField({
                        fieldId: 'custbody_lmry_reference_transaction_id'
                    }).isDisabled = true;
                }
                // Solo para cuando es nuevo y se copia
                if (type == 'create' || type == 'copy') {

                    //Cambios 30-04-2020
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_informacion_adicional',
                        value: ''
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_paymentmethod',
                        value: ''
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_webserviceresponse',
                        value: ''
                    });

                    //Validacion de que no se limpien los campos cuando el feature del seteo este activado y es sales order
                    var createdfrom = currentRCD.getValue('createdfrom');
                    if (!(LMRY_countr[0] == 'BR' && Library_Mail.getAuthorization(466, licenses) && createdfrom != null && createdfrom != '')) {
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_document_type',
                            value: ''
                        });
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_apply_wht_code',
                            value: true
                        });
                    }

                    // Procesado por el Numerador
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_scheduled_process',
                        value: false
                    });
                    //Campos de Panama
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_pa_batch_number',
                        value: ''
                    });

                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_pa_monto_letras',
                        value: ''
                    });

                    // Campos para El Salvador
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_wamt',
                        value: 0.00
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_sv_not_taxable_total_sal',
                        value: 0.00
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_sv_exempt_total_sales',
                        value: 0.00
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_sv_taxable_total_sales',
                        value: 0.00
                    });

                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_serie_doc_cxc',
                        value: ''
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_num_preimpreso',
                        value: ''
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_foliofiscal',
                        value: ''
                    });

                    // Documentos de Referencia
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_doc_serie_ref',
                        value: ''
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_num_doc_ref',
                        value: ''
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_doc_ref_date',
                        value: ''
                    });

                    // Campos WHT Colombia
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_co_reteica_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_co_reteiva_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_co_retefte_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_co_retecree_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_co_monto_letras',
                        value: ''
                    });

                    // Campos WHT Bolivia
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_bo_autoreteit_whtamount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_bo_reteiue_whtamount',
                        value: 0
                    });

                    // Campos WHT Paraguay
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_total_taxamount_spy',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_total_taxamount_rpy',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_subtotal_amount_spy',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_subtotal_amount_rpy',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_subtotal_amount_epy',
                        value: 0
                    });

                    // Campos WHT Ecuador
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_ec_reteir_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_ec_reteiva_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_ec_base_rate0',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_ec_base_rate12',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_ec_base_rate14',
                        value: 0
                    });

                    // Transferencia de IVA MX
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_schedule_transfer_of_iva',
                        value: ''
                    });

                    // Campos WHT Peru
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_rate',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wbase_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_code',
                        value: ''
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_code_des',
                        value: ''
                    });

                    if (type == 'create' || type == 'copy') {
                        // Seteo de CustomField WHT
                        SetCustomField_WHT_Code_Inv();
                    }

                }

                if (LMRY_countr[0] == 'MX' && LMRY_countr[2] == true && LMRY_access == true) {
                    if (scriptContext.mode == 'create' || scriptContext.mode == 'copy' || scriptContext.mode == 'edit') {
                        var fieldIVA = currentRCD.getField({
                            fieldId: 'custbody_lmry_schedule_transfer_of_iva'
                        });
                        if (fieldIVA != '' && fieldIVA != null) {
                            fieldIVA.isDisabled = true;
                        }
                    }
                }

                var subsi = currentRCD.getValue({
                    fieldId: 'subsidiary'
                });

                if (LMRY_countr[0] == 'AR') {
                    if ((scriptContext.mode == 'create' || scriptContext.mode == 'copy') && Library_Mail.getAuthorization(404, licenses)) {
                        if (subsi != null && subsi != '') {
                            library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                        }
                    }
                }
                if (LMRY_countr[0] == 'BR') {
                    if ((scriptContext.mode == 'create' || scriptContext.mode == 'copy') && Library_Mail.getAuthorization(321, licenses)) {
                        if (subsi != null && subsi != '') {
                            library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                        }
                    }
                }
                if (LMRY_countr[0] == 'CO') {
                    if ((scriptContext.mode == 'create' || scriptContext.mode == 'copy') && Library_Mail.getAuthorization(409, licenses)) {
                        if (subsi != null && subsi != '') {
                            library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                        }
                    }
                    if (scriptContext.mode == 'edit' && Library_Mail.getAuthorization(666, licenses)) {

                        if (Library_Mail.getAuthorization(27, licenses)) {
                            old_record = Library_Duplicate_Clnt.Old_Values_WHT(currentRCD);
                            old_record_lines = Library_Duplicate_Clnt.generate_oldrecordLines(currentRCD);
                        }
                        if (Library_Mail.getAuthorization(340, licenses)) {
                            old_record_lines = Library_Duplicate_Clnt.generate_oldrecordLines(currentRCD);
                        }
                    }
                }
                if (LMRY_countr[0] == 'CL') {
                    if ((scriptContext.mode == 'create' || scriptContext.mode == 'copy') && Library_Mail.getAuthorization(322, licenses)) {
                        if (subsi != null && subsi != '') {
                            library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                        }
                    }
                }
                if (LMRY_countr[0] == 'MX') {
                    if ((scriptContext.mode == 'create' || scriptContext.mode == 'copy') && Library_Mail.getAuthorization(289, licenses)) {
                        if (subsi != null && subsi != '') {
                            library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                        }
                    }
                }
                if (LMRY_countr[0] == 'PE') {
                    if ((scriptContext.mode == 'create' || scriptContext.mode == 'copy') && Library_Mail.getAuthorization(403, licenses)) {
                        if (subsi != null && subsi != '') {
                            library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                        }
                    }
                }

                //CL CHANGE CURRENCY UF
                if (LMRY_countr[0] == 'CL' && Library_Mail.getAuthorization(604, licenses) && (type == 'edit' || type == 'create' || type == 'copy')) {

                    var searchCurrencies = search.create({
                        type: 'currency',
                        columns: ['symbol', 'internalid', 'name'],
                        filters: [{
                            name: 'isinactive',
                            operator: 'is',
                            values: 'F'
                        }]
                    });

                    searchCurrencies = searchCurrencies.run().getRange(0, 1000);

                    for (var i = 0; i < searchCurrencies.length; i++) {
                        var idCurrency = searchCurrencies[i].getValue('internalid');
                        var name = searchCurrencies[i].getValue('name');
                        var symbol = searchCurrencies[i].getValue('symbol');
                        symbol = symbol.toUpperCase();

                        jsonCurrencies[idCurrency] = {
                            'symbol': symbol,
                            'name': name
                        };

                    }

                    var searchSetupTax = search.create({
                        type: 'customrecord_lmry_setup_tax_subsidiary',
                        columns: ['custrecord_lmry_setuptax_cl_rate_uf'],
                        filters: [{
                            name: 'isinactive',
                            operator: 'is',
                            values: 'F'
                        }, {
                            name: 'custrecord_lmry_setuptax_subsidiary',
                            operator: 'is',
                            values: subsidiary
                        }]
                    });

                    searchSetupTax = searchSetupTax.run().getRange(0, 1);

                    if (searchSetupTax && searchSetupTax.length && searchSetupTax[0].getValue('custrecord_lmry_setuptax_cl_rate_uf')) {
                        fieldRateUF = searchSetupTax[0].getValue('custrecord_lmry_setuptax_cl_rate_uf');
                    }

                    var currencyTransaction = currentRCD.getValue('currency');

                    //SOLO SI ES PESO CHILENO: CLP Y EXISTE EL CAMPO
                    if (jsonCurrencies[currencyTransaction]['symbol'] == 'CLP' && fieldRateUF && currentRCD.getField(fieldRateUF) && type != 'copy') {

                        var rateUF = currentRCD.getValue(fieldRateUF);
                        var createdFrom = currentRCD.getValue('createdfrom');
                        var tranDate = currentRCD.getValue('trandate');

                        if (!(parseFloat(rateUF) > 0)) {

                            var rateUF = currency.exchangeRate({
                                source: 'CLF',
                                target: 'CLP',
                                date: tranDate
                            });
                            currentRCD.setValue({
                                fieldId: fieldRateUF,
                                value: parseFloat(rateUF),
                                ignoreFieldChange: true
                            });

                        }


                    } // FIN SOLO SI ES PESO CHILENO

                } //FIN CL CHANGE CURRENCY UF

                //BR CFOF
                if (LMRY_countr[0] == 'BR' && LMRY_access && (scriptContext.mode == 'create' || scriptContext.mode == 'copy' || scriptContext.mode == 'edit')) {

                    var createdFrom = currentRCD.getValue('createdfrom');
                    var transactionType = currentRCD.getValue('custbody_lmry_br_transaction_type');

                    if (!transactionType || scriptContext.mode == 'copy') {
                        var typeStandard = currentRCD.getValue('type');
                        if (typeStandard) {
                            var searchTransactionType = search.create({ type: 'customrecord_lmry_trantype', filters: [{ name: 'name', operator: 'is', values: typeStandard }] });
                            searchTransactionType = searchTransactionType.run().getRange({ start: 0, end: 1 });

                            if (searchTransactionType && searchTransactionType.length) {
                                currentRCD.setValue('custbody_lmry_br_transaction_type', searchTransactionType[0].id);
                            }

                        }
                    }

                }//FIN BR CFOP


                // Termino cargado el formulario
                LMRY_swinit = false;

            } catch (err) {
                Library_Mail.sendemail2(' [ INVClnt_PageInit ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }

        }

        function fieldChanged(scriptContext) {

            ST_FEATURE = runtime.isFeatureInEffect({
                feature: "tax_overhauling"
            });

            currentRCD = scriptContext.currentRecord;
            var name = scriptContext.fieldId;
            var sublistName = scriptContext.sublistId;

            if (name == 'currency' && (type == 'create' || type == 'copy')) {

                var lmry_exchange_rate_field = currentRCD.getField('custpage_lmry_exchange_rate');
                if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
                    ws_exchange_rate();
                }
                return true;
            }

            if (name == 'custpage_lmry_exchange_rate' && (type == 'create' || type == 'copy')) {

                var lmry_exchange_rate = currentRCD.getValue('custpage_lmry_exchange_rate');
                if (lmry_exchange_rate != ' ' && lmry_exchange_rate != '' && lmry_exchange_rate != null) {
                    currentRCD.setValue('exchangerate', lmry_exchange_rate);
                }
                return true;
            }

            if (name == 'trandate' && (type == 'create' || type == 'copy')) {
                if (currentRCD.getValue('entity') != '' && currentRCD.getValue('entity') != null) {
                    ws_exchange_rate();
                }
                return true;
            }

            if (subsi_OW == 'T' || subsi_OW == true) {
                if (name == 'entity' && type == 'create') {
                    var cf = currentRCD.getValue('customform');
                    var ent = currentRCD.getValue('entity');

                    if (ent != '' && ent != null && ent != -1 && cf != '' && cf != null && cf != -1) {
                        var objSearch = search.lookupFields({
                            type: 'entity',
                            id: ent,
                            columns: ['subsidiary']
                        });

                        var sub = objSearch.subsidiary[0].value;

                        setWindowChanged(window, false);
                        window.location.href = window.location.href.split('?')[0] + '?whence=&cf=' + cf + '&entity=' + ent + '&subsidiary=' + sub;
                    }
                    return true;
                }

                if (name == 'subsidiary' && type == 'create') {
                    var cf = currentRCD.getValue('customform');
                    var ent = currentRCD.getValue('entity');
                    var sub = currentRCD.getValue('subsidiary');

                    if (ent != '' && ent != null && ent != -1 && cf != '' && cf != null && cf != -1 && sub != '' && sub != null && sub != -1) {

                        setWindowChanged(window, false);
                        window.location.href = window.location.href.split('?')[0] + '?whence=&cf=' + cf + '&entity=' + ent + '&subsidiary=' + sub;
                    }
                    return true;
                }
            } else {
                if (name == 'entity' && type == 'create') {
                    var cf = currentRCD.getValue('customform');
                    var ent = currentRCD.getValue('entity');

                    setWindowChanged(window, false);
                    window.location.href = window.location.href.split('?')[0] + '?whence=&cf=' + cf + '&entity=' + ent;
                    return true;
                }
            }

            //SETEO DE CFOP AUTOMATICO CUANDO ESTA LLENO EN EL ITEM
            if (LMRY_countr[0] == 'BR' && LMRY_countr[2] == true) {
                var flagCFOP = true;
                if (sublistName == 'item' && name == 'item') {

                    var idItem = currentRCD.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });
                    if (idItem) {
                        var typeTransaction = currentRCD.getValue('type');
                        var itemCFOP = search.lookupFields({
                            type: 'item',
                            id: idItem,
                            columns: ['custitem_lmry_br_cfop_inc', 'custitem_lmry_br_cfop_display_inc', 'custitem_lmry_br_cfop_out', 'custitem_lmry_br_cfop_display_out']
                        });

                        var currentCFOPDisplay = currentRCD.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_lmry_br_tran_outgoing_cfop_di'
                        });
                        var currentCFOP = currentRCD.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_lmry_br_tran_outgoing_cfop'
                        });

                        if (!currentCFOPDisplay && itemCFOP.custitem_lmry_br_cfop_display_out != null && itemCFOP.custitem_lmry_br_cfop_display_out != '') {
                            currentRCD.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_lmry_br_tran_outgoing_cfop_di',
                                value: itemCFOP.custitem_lmry_br_cfop_display_out,
                                ignoreFieldChange: true
                            });
                        }

                        if (!currentCFOP && itemCFOP['custitem_lmry_br_cfop_out'] && itemCFOP['custitem_lmry_br_cfop_out'].length > 0) {
                            flagCFOP = false;

                            var nameCFOP = search.lookupFields({
                                type: 'customrecord_lmry_br_cfop_codes',
                                id: itemCFOP.custitem_lmry_br_cfop_out[0].value,
                                columns: ['custrecord_lmry_br_cfop_description']
                            });
                            nameCFOP = nameCFOP.custrecord_lmry_br_cfop_description;
                            if (nameCFOP) {
                                currentRCD.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_lmry_br_tran_outgoing_cfop_di',
                                    value: nameCFOP,
                                    ignoreFieldChange: true
                                });
                            }

                            currentRCD.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_lmry_br_tran_outgoing_cfop',
                                value: itemCFOP.custitem_lmry_br_cfop_out[0].value,
                                ignoreFieldChange: true
                            });

                        }

                    }
                }

                if (sublistName == 'item' && name == 'custcol_lmry_br_tran_outgoing_cfop' && flagCFOP == true) {
                    var cfop = currentRCD.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_lmry_br_tran_outgoing_cfop'
                    });
                    if (cfop) {
                        var nameCFOP = search.lookupFields({
                            type: 'customrecord_lmry_br_cfop_codes',
                            id: cfop,
                            columns: ['custrecord_lmry_br_cfop_description']
                        });
                        nameCFOP = nameCFOP.custrecord_lmry_br_cfop_description;

                        if (nameCFOP) {
                            currentRCD.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_lmry_br_tran_outgoing_cfop_di',
                                value: nameCFOP,
                                ignoreFieldChange: true
                            });
                        }

                        currentRCD.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_lmry_br_tran_outgoing_cfop',
                            value: cfop,
                            ignoreFieldChange: true
                        });

                    }

                }

                flagCFOP = true;

            } //FIN CFOP

            return true;
        }

        function INVClnt_ValidateField(scriptContext) {

            try {

                ST_FEATURE = runtime.isFeatureInEffect({ feature: "tax_overhauling" });

                currentRCD = scriptContext.currentRecord;
                var name = scriptContext.fieldId;
                var sublistName = scriptContext.sublistId;
                var LMRY_parent = '';
                // Si es verdadero el formulario esta cargando

                if (LMRY_swinit == true) {
                    return true;
                }

                // if (sublistName == 'item' && name == 'taxcode' && LMRY_access == true && fegetMatch == true) {
                //   var inv_id = currentRCD.getCurrentSublistText({
                //     sublistId: sublistName,
                //     fieldId: 'taxcode'
                //   });
                //
                //   if (inv_id != '' && inv_id != null) {
                //     Library_Mail.setline(currentRCD, objsetline, inv_id);
                //   }
                //   return true;
                // }

                if (name == 'custbody_lmry_subsidiary_country') {

                    // Cambio de campo
                    LMRY_swinit = true;
                    var lmry_entity = currentRCD.getValue({
                        fieldId: 'entity'
                    });
                    if (lmry_entity == null || lmry_entity == '') {
                        return true;
                    }
                    var featuresubs = runtime.isFeatureInEffect({
                        feature: 'SUBSIDIARIES'
                    });

                    if (featuresubs == true || featuresubs == 'T') {
                        var subs = currentRCD.getValue({
                            fieldId: 'subsidiary'
                        });
                        if (subs == null || subs == '' || subs === undefined) {
                            return true;
                        }
                        var userid = runtime.getCurrentUser();
                        if (userid.subsidiary == subs) {
                            ValidateAccessInv(subs);
                            SetCustomField_WHT_Code_Inv(subs);
                        }

                    } else {
                        ValidateAccessInv(1);
                        SetCustomField_WHT_Code_Inv();
                    }
                    LMRY_swinit = false;
                    return true;
                }

                /* Validacion 04/02/22 */
                if (name == 'postingperiod') {

                    var period = currentRCD.getValue('postingperiod');
                    var subsidiary = currentRCD.getValue('subsidiary') ? currentRCD.getValue('subsidiary') : 1;
                    // Se optiene el Pre - Fijo de la subsidiaria
                    var urlStlt = url.resolveScript({
                        scriptId: 'customscript_lmry_get_val_period_stlt',
                        deploymentId: 'customdeploy_lmry_get_val_period_stlt',
                        returnExternalUrl: false
                    }) + '&period=' + period + '&subsidiary=' + subsidiary + '&country=' + LMRY_countr[0] + '&typetran=sales';

                    //corregir hard code falta url
                    var getStlt = https.get({
                        url: 'https://' + window.location.hostname + urlStlt
                    });

                    // Retorna el cuero del SuiteLet
                    var closedPeriod = getStlt.body;

                    log.error('closedPeriod', closedPeriod);
                    if (closedPeriod == 'T') {
                        currentRCD.setValue('custpage_lockedperiod', true);
                    } else {
                        currentRCD.setValue('custpage_lockedperiod', false);
                    }

                    // Sale de la funcion
                    return true;
                }
                /* Fin validacion 04/02/22 */

                // Muestra campos LMRY por Pais
                if (name == 'custbody_lmry_document_type' && LMRY_access == true) {

                    // Cambio de campo
                    LMRY_swinit = true;
                    if (LMRY_countr[0] == 'BR' && LbryBRDuplicate.isValidate(currentRCD, licenses)) {
                        var fieldPreim = currentRCD.getField('custbody_lmry_num_preimpreso');
                        fieldPreim.isDisabled = true;
                        currentRCD.setValue('tranid', Math.round(1e6 * Math.random()));
                    } else {
                        var fieldPreim = currentRCD.getField('custbody_lmry_num_preimpreso');
                        fieldPreim.isDisabled = false;
                    }

                    // Tipo de Documento - Parent
                    var lmry_DocTip = currentRCD.getValue('custbody_lmry_document_type');
                    if (lmry_DocTip != '' && lmry_DocTip != null && lmry_DocTip != -1) {
                        if (Val_Campos.length > 0) {
                            Library_Val.Val_Authorization(currentRCD, LMRY_countr[0], licenses);
                        }
                    }

                    var isSeriesCLActive = Library_Mail.getAuthorization(414, licenses);

                    if (name == 'custbody_lmry_document_type' &&
                        currentRCD.getValue('custbody_lmry_document_type') != '' &&
                        currentRCD.getValue('custbody_lmry_document_type') != null) {
                        if (LMRY_countr[0] == 'CL' && !isSeriesCLActive) {
                            correlativoChile(1);
                        }
                    }
                    // Cambio de campo
                    LMRY_swinit = false;

                    // Sale de la funcion
                    return true;
                }

                // Serie de impresion
                if (name == 'custbody_lmry_serie_doc_cxc') {
                    if (LMRY_countr[0] != 'BR' || !LbryBRDuplicate.isValidate(currentRCD, licenses)) {
                        GetNumberSequence();
                    }
                    // Sale de la funcion
                    return true;
                }

                // Tipo de Documento, Serie de impresion y Numero Preimpreso
                if ((name == 'custbody_lmry_document_type' || name == 'custbody_lmry_serie_doc_cxc' ||
                    name == 'custbody_lmry_num_preimpreso') && LMRY_swpnro == false) {
                    // Llama a la funcion de seteo del Tranid
                    INVSet_Field_tranid();

                    // Sale de la funcion
                    return true;
                }

                if (name == 'currency') {
                    var subsi = currentRCD.getValue({
                        fieldId: 'subsidiary'
                    });
                    var al_country = currentRCD.getValue({
                        fieldId: 'custbody_lmry_subsidiary_country'
                    });
                    if (subsi != null && subsi != '') {
                        if (LMRY_countr[0] == 'AR') {
                            if ((type == 'create' || type == 'copy') && Library_Mail.getAuthorization(404, licenses)) {
                                library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                            }
                        }
                        if (LMRY_countr[0] == 'BR') {
                            if ((type == 'create' || type == 'copy') && Library_Mail.getAuthorization(321, licenses)) {
                                library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                            }
                        }
                        if (LMRY_countr[0] == 'CO') {
                            if ((type == 'create' || type == 'copy') && Library_Mail.getAuthorization(409, licenses)) {
                                library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                            }
                        }
                        if (LMRY_countr[0] == 'CL') {
                            if ((type == 'create' || type == 'copy') && Library_Mail.getAuthorization(322, licenses)) {
                                library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                            }
                        }
                        if (LMRY_countr[0] == 'MX') {
                            if ((type == 'create' || type == 'copy') && Library_Mail.getAuthorization(289, licenses)) {
                                library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                            }
                        }
                        if (LMRY_countr[0] == 'PE') {
                            if ((type == 'create' || type == 'copy') && Library_Mail.getAuthorization(403, licenses)) {
                                library_ExchRate.autosetExchRate(currentRCD, al_country, 'sale');
                            }
                        }
                    }

                }


                //CL CHANGE CURRENCY UF
                if (LMRY_countr[0] == 'CL' && Library_Mail.getAuthorization(604, licenses) && Object.keys(jsonCurrencies).length) {

                    var currencyTransaction = currentRCD.getValue('currency');
                    var tranDate = currentRCD.getValue('trandate');

                    //SOLO SI EL CAMPO EXISTE
                    if (fieldRateUF && currentRCD.getField(fieldRateUF)) {

                        //SOLO PARA PESO CHILENO
                        if (jsonCurrencies[currencyTransaction]['symbol'] == 'CLP') {

                            //SETEO DE COLUMNA
                            if (sublistName == 'item' && name == 'custcol_lmry_prec_unit_so') {

                                var exchangeRateUF = currentRCD.getValue(fieldRateUF);
                                var amountUF = currentRCD.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_lmry_prec_unit_so'
                                });

                                if (parseFloat(exchangeRateUF) > 0 && parseFloat(amountUF) > 0) {
                                    var rate = parseFloat(exchangeRateUF) * parseFloat(amountUF);
                                    rate = parseFloat(rate).toFixed(0);

                                    currentRCD.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        value: rate
                                    });

                                }

                            }

                            //SETEO DEL TIPO DE CAMBIO AL CAMBIAR FECHA Y/O MONEDA
                            if ((name == 'currency' || name == 'trandate') && tranDate) {

                                var rateUF = currency.exchangeRate({
                                    source: 'CLF',
                                    target: 'CLP',
                                    date: tranDate
                                });

                                currentRCD.setValue({
                                    fieldId: fieldRateUF,
                                    value: parseFloat(rateUF),
                                    ignoreFieldChange: true
                                });

                            }

                        } else {
                            //CUANDO NO ES MONEDA PESO CHILENO
                            currentRCD.setValue({
                                fieldId: fieldRateUF,
                                value: 0,
                                ignoreFieldChange: true
                            });

                        }

                    } //SOLO SI EL CAMPO EXISTE

                } //FIN CL CHANGE CURRENCY UF

                if (ST_FEATURE == true || ST_FEATURE == 'T') {
                    if (type != "copy") {
                        ST_ConfigFields.setInvoicingIdentifier(currentRCD);
                    }
                }

                return true;

            } catch (err) {
                Library_Mail.sendemail2(' [ INVClnt_ValidateField ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }

            return true;
        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {

            if (scriptContext.sublistId == 'item' || scriptContext.sublistId == 'expense') {
                try {
                    if (Val_Campos_Linea.length > 0) {
                        if (Library_Val.Val_Line(scriptContext.currentRecord, Val_Campos_Linea, scriptContext.sublistId) == false) {
                            return false;
                        } else {
                            return true;
                        }
                    } else {
                        return true;
                    }
                } catch (err) {
                    Library_Mail.sendemail2(' [ validateLine ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
                }
            } else {
                return true;
            }

        }

        function INVClnt_SaveRecord(scriptContext) {
            try {

                var currentRCD = scriptContext.currentRecord;

                // var Arreglo_Guardar;
                // Valida el Acceso
                ValidateAccessInv(currentRCD.getValue('subsidiary'));

                /* Validacion 04/02/22 */
                var lockedPeriod = currentRCD.getValue("custpage_lockedperiod");
                log.error('lockedPeriod', lockedPeriod);
                if (lockedPeriod == true || lockedPeriod == 'T') {
                    return true;
                }
                /* Fin validacion 04/02/22 */

                if (Val_Campos.length > 0) {
                    if (Library_Val.Val_Mensaje(currentRCD, Val_Campos) == false)
                        return false;
                }

                //valida que no exista items negativos
              if (LMRY_countr[0] != 'PE' && LMRY_access == true){
                var existItemNeg = Library_Val.Val_Negative_Item(currentRCD);
                if (existItemNeg.length > 0) {
                    var urlInstancia = "" + url.resolveDomain({
                        hostType: url.HostType.APPLICATION,
                        accountId: runtime.accountid
                    });
                    var instancia = urlInstancia.split('.');
                    var notAllowInstans = ['5514786-sb1', '5514786']
                    if (notAllowInstans.includes(instancia[0])) {
                        var message = translation.get({
                            collection: "custcollection_lmry_validation_process",
                            key: "ALLOW_NEGATIVE_ITEM",
                        })();
                        alert(message);
                        return true
                    } else {
                        var message = translation.get({
                            collection: "custcollection_lmry_validation_process",
                            key: "NEGATIVE_ITEM",
                        })();
                        var alertItemNeg = "";
                        for (var i = 0; i < existItemNeg.length; i++) {
                            alertItemNeg = alertItemNeg + existItemNeg[i] + message + "\n";
                        }
                        alert(alertItemNeg);
                        return false;
                    }
                }
              }

                if (LMRY_countr[0] == 'BR') {
                    const excludedTypes = ["Group", "EndGroup", "Description"];
                    var isHybrid = currentRCD.getValue("custbody_lmry_tax_tranf_gratu");
                    isHybrid = (isHybrid == true || isHybrid == "T");
                    if (Library_Mail.getAuthorization(222, licenses) == true && !isHybrid) {
                        var numberItems = currentRCD.getLineCount({
                            sublistId: 'item'
                        });
                        if (numberItems) {
                            var catalog = -1,
                                badDiscountAmounts = 0;
                            for (var i = 0; i < numberItems; i++) {
                                var lineCatalog = currentRCD.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_lmry_br_service_catalog',
                                    line: i
                                });
                                var typeDiscount = currentRCD.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_lmry_col_sales_type_discount',
                                    line: i
                                });
                                var isTaxItem = currentRCD.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_lmry_ar_item_tributo',
                                    line: i
                                });
                                var itemType = currentRCD.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i }) || "";

                                if ((isTaxItem == "F" || isTaxItem == false) && excludedTypes.indexOf(itemType) == -1) {
                                    if (!typeDiscount) {
                                        if (catalog == -1) {
                                            catalog = lineCatalog
                                        }
                                        if (Number(catalog) != Number(lineCatalog)) {
                                            alert(library_translator.getAlert(0, Language, []));
                                            return false;
                                        }
                                    } else {
                                        var amount = currentRCD.getSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'amount',
                                            line: i
                                        });
                                        amount = parseFloat(amount);
                                        if (amount > 0) {
                                            badDiscountAmounts++;
                                        }
                                    }
                                }
                            }

                            if (badDiscountAmounts) {
                                var msg = {
                                    "en": "Warning:\nDiscounts amount should be in a negative value.\nClick OK to continue",
                                    "es": "Advertencia:\nLos montos de descuento deben ser negativos.\nClick Aceptar para continuar.",
                                    "pt": "Atenção\nOs valores de desconto devem ser negativos.\nClick OK para continuar."
                                }
                                return confirm(msg[Language] || msg["en"]);
                            }
                        }
                    }
                }
                if (scriptContext.mode == 'create' || scriptContext.mode == 'copy') {
                    // Inicializa campos WHT de sumatoria
                    SetCustomField_WHT_Init_Inv(scriptContext);
                }
                // Validaciones para transferencia gratuita
                var esTTG = currentRCD.getValue('custbody_lmry_tranf_gratuita');

                if (esTTG == true) {

                    //alert(Math.abs(parseFloat(nlapiGetFieldValue('discountrate'))));

                    if (Math.abs(parseFloat(currentRCD.getValue('discountrate'))) == 100) {
                        if (ValidaItemsTTG() == false) {
                            alert(library_translator.getAlert(1, Language, []));
                            // alert('Existen item que no están configurados para ser utilizados en una transferencia gratuita.');
                            return false;
                        }
                    } else {
                        alert(library_translator.getAlert(2, Language, []));
                        //alert('La transferencia gratuita debe tener un articulo de descuento al 100%.');
                        return false;
                    }

                }

                /* ************************************
                 * Solo si tiene acceso a LamtamReady
                 * se ejecutara la validacion de
                 * codigos de impuesto por Linea
                 ************************************ */

                if (LMRY_access == true && fegetMatch == true) {
                    //var currentRecord = scriptContext.currentRecord;
                    var sublistName = scriptContext.sublistId;
                    var fieldName = scriptContext.fieldId;

                    var numLines = currentRCD.getLineCount('item');
                    var inv_id = '';
                    var taxcode = '';
                    var inv_id_cad = new Array();
                    var taxcode_cad = new Array();

                    for (var i = 0; i < numLines; i++) {
                        inv_id = currentRCD.getSublistValue('item', 'custcol_lmry_invoicing_id', i);
                        taxcode = currentRCD.getSublistValue('item', 'taxcode', i);

                        inv_id_cad.push(inv_id);
                        taxcode_cad.push(taxcode);

                    }
                    if (!getMatch(inv_id_cad, taxcode_cad)) {
                        return false;
                    }
                }

                // Valida tranid repetido
                if (LMRY_countr[0] == 'BR' && !LbryBRDuplicate.validateDuplicate(currentRCD, licenses)) {
                    var tranID = currentRCD.getField('tranid');
                    switch (Language) {
                        case 'es':
                            alert('El campo "' + tranID.label + '" (tranid) ingresado ya existe, por favor ingresar uno diferente.');
                            break;
                        case 'pt':
                            alert('O campo "' + tranID.label + '" (tranid) inserido já existe, digite um diferente.');
                            break;
                        default:
                            alert('The field "' + tranID.label + '" (tranid) entered already exists, please enter a different one.');
                            break;
                    }
                    return false;
                }

                // Aplicacion automatica de retenciones

                if (LMRY_countr[0] == 'PE') {
                    // var type_app = scriptContext.mode;
                    // log.debug("type_app", type_app)
                    if (type == 'create' || type == 'edit') {
                        log.debug("Library_MailL", Library_Mail.getAuthorization(751, licenses))
                        if (Library_Mail.getAuthorization(751, licenses) == true) {
                            Library_libTools.INVClnt_Withholding(scriptContext);
                        }
                    }
                }

                // Solo para subsidiaria con acceso - Transaction Number Invoice
                var featuresByCountry = {
                    'AR': 114,
                    'BO': 101,
                    'BR': 305,
                    'CL': 414,
                    'CO': 387,
                    'CR': 388,
                    'DO': 524,
                    'EC': 102,
                    'SV': 105,
                    'GT': 390,
                    'MX': 132,
                    'PA': 391,
                    'PY': 108,
                    'PE': 66,
                    'UY': 392
                };

                var featureId = featuresByCountry[LMRY_countr[0]];

                if (LMRY_countr[2] == true && LMRY_access) {
                    /* *********************************************
                     * Verifica que este activo el feature Numerar
                     * Transaction Number Invoice:
                     **********************************************/
                    var swnumber = false;
                    var clnumber = false;

                    if (featureId && Library_Mail.getAuthorization(featuresByCountry[LMRY_countr[0]], licenses) == true) {
                        swnumber = true;
                    }
                    // *** No lleva numero de seria ***
                    if (LMRY_countr[0] == 'CL') {
                        var isSeriesCLActive = Library_Mail.getAuthorization(414, licenses);
                        if (Library_Mail.getAuthorization(111, licenses) == true && !isSeriesCLActive) {
                            clnumber = true;
                        }
                    }

                    /******************************************
                     * Valida  que no tenga lineas de impuesta
                     ******************************************/
                    if (!PY_TaxTransLine()) {
                        return false;
                    }

                    // Actualiza el numero de serie (PE, EC, SV, PY, MX, BR)
                    if (swnumber) {
                        var Auxserie = currentRCD.getValue('custbody_lmry_serie_doc_cxc');
                        var Auxnumer = currentRCD.getValue('custbody_lmry_num_preimpreso');

                        if (Auxserie != null && Auxserie != '' && Auxnumer != null && Auxnumer != '') {

                            var seriesSearch = search.create({
                                type: "customrecord_lmry_serie_impresion_cxc",
                                filters: [
                                    ["internalid", "anyof", Auxserie]
                                ],
                                columns: [
                                    search.createColumn({
                                        name: "formulanumeric",
                                        formula: "{custrecord_lmry_serie_numero_impres}"
                                    }),
                                    "custrecord_ei_preprinted_series"
                                ]
                            });
                            var results = seriesSearch.run().getRange(0, 1);
                            if (!results || !results.length) {
                                return;
                            }

                            var columns = seriesSearch.columns;

                            var actualNro = results[0].getValue(columns[0]);
                            var isEISeries = results[0].getValue(columns[1]);

                            if (LMRY_countr[0] == 'BR' && (isEISeries == true || isEISeries == 'T')) {
                                return true;
                            }


                            if (parseFloat(Auxnumer) > parseFloat(actualNro)) {
                                var id = record.submitFields({
                                    type: 'customrecord_lmry_serie_impresion_cxc',
                                    id: Auxserie,
                                    values: {
                                        'custrecord_lmry_serie_numero_impres': parseFloat(Auxnumer)
                                    }
                                });
                            }
                        }
                    }

                    // Actualiza el numero de serie (CL)
                    if (clnumber) {
                        correlativoChile(2);
                    }
                }
                // Solo para las facturas
                if (LMRY_access == true) {
                    UpdateTotalSales();
                }

                // LatamTax Brasil
                // if (LMRY_countr[0] == 'BR') {
                //     var wtax_wcod = currentRCD.getValue('custpage_4601_witaxcode');
                //     if (wtax_wcod != '' && wtax_wcod != null) { // Solo si tiene retenciones
                //         if (Library_Mail.getAuthorization(147, licenses) == true && Library_Mail.getAuthorization(416, licenses) == false) {
                //             Library_WHT_Transaction.afterSubmitTransaction(scriptContext, false, type);
                //         }
                //     }
                // }

                if (LMRY_countr[0] == "CO") {
                    if (!validateDuplicateInvoices(currentRCD)) {
                        return false;
                    }
                    if (Library_Mail.getAuthorization(666, licenses) == true && type == "edit") {
                        var msg = {
                            "en": "You cannot make changes to withholdings since the document is already issued electronically.",
                            "es": "No se puede realizar modificaciones en retenciones dado que el documento ya se encuentra emitido electrónicamente.",
                            "pt": "Você não pode fazer alterações nas retenções porque o documento já foi emitido eletronicamente."
                        }

                        if (Library_Duplicate_Clnt.Validate_EIDocument(currentRCD) && (Library_Duplicate_Clnt.Verification_Duplicate_Clnt(old_record, currentRCD) || Library_Duplicate_Clnt.Verification_Duplicate_Lines_Clnt(currentRCD, old_record_lines)) && Library_Mail.getAuthorization(27, licenses)) {
                            alert(msg[Language] || msg["en"]);
                            return false;
                        }
                        if (Library_Duplicate_Clnt.Validate_EIDocument(currentRCD) && Library_Duplicate_Clnt.Verification_Duplicate_Lines_Clnt(currentRCD, old_record_lines) && Library_Mail.getAuthorization(340, licenses)) {
                            alert(msg[Language] || msg["en"]);
                            return false;
                        }
                    }

                }

                /*****************************
                    Code: C0536
                    Date: 26/04/2022
                    Summary: Auto popula custcol_lmry_col_sales_discount por línea de item con el discountrate y amount de línea
                ******************************/
                if (LMRY_countr[0] == "MX" && Library_Mail.getAuthorization(898, licenses) == true) Library_libTools.setColSalesDiscount(currentRCD);
                /***************************************************************************/
                //Seteo de los Wht rule en las lineas - MX
                var featMx = Library_Mail.getAuthorization(30, licenses);
                var applWTH = currentRCD.getValue({ fieldId: 'custbody_lmry_apply_wht_code' });
                if (featMx && LMRY_countr[0] == 'MX' && (applWTH == 'T' || applWTH == true)) {
                    var tax_rule = currentRCD.getValue("custpage_lmry_wtax_rate");
                    if (tax_rule != null && tax_rule != '') {
                        var cantidad_items = currentRCD.getLineCount({
                            sublistId: 'item'
                        })
                        for (var i = 0; i < cantidad_items; i++) {
                            var orcdTemp = currentRCD.selectLine({
                                sublistId: 'item',
                                line: i
                            });
                            orcdTemp.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "custcol_4601_witaxapplies",
                                value: false
                            });
                        }
                    }
                }

            } catch (err) {
                Library_Mail.sendemail2(' [ INVClnt_SaveRecord ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
                return false
            }

            return true;
        }

        /***********************************************
         * Deben tener acceso a LatamReady para las
         * siguientes Transaccion Invoice solo para
         * los paises:
         *    Peru, El Salvador, Paraguay, Ecuador,
         *    Mexico y Argentina
         ***********************************************/
        function GetNumberSequence() {
            try {
                var currentRCD = currentRecord.get();
                // Solo para subsidiaria con acceso - Transaction Number Invoice
                var featuresByCountry = {
                    'AR': 114,
                    'BO': 101,
                    'BR': 305,
                    'CL': 414,
                    'CO': 387,
                    'CR': 388,
                    'DO': 524,
                    'EC': 102,
                    'SV': 105,
                    'GT': 390,
                    'MX': 132,
                    'PA': 391,
                    'PY': 108,
                    'PE': 66,
                    'UY': 392
                };

                var featureId = featuresByCountry[LMRY_countr[0]];



                if (featureId && LMRY_countr[2] == true && LMRY_access) {
                    // Verifica que no este vacio el numero de serie
                    var lmry_DocSer = currentRCD.getValue('custbody_lmry_serie_doc_cxc');

                    if (lmry_DocSer != '' && lmry_DocSer != null && lmry_DocSer != -1) {

                        // Verifica que no este vacio el numero preimpreso
                        var lmry_DocNum = currentRCD.getValue('custbody_lmry_num_preimpreso');
                        if (lmry_DocNum == '' || lmry_DocNum == null) {
                            /* *********************************************
                             * Verifica que este activo el feature Numerar
                             * Transaction Number Invoice:
                             * Para todos los paises excepto CL
                             **********************************************/
                            if (Library_Mail.getAuthorization(featureId, licenses) == false) {
                                return true;
                            }
                            // Trae el ultimo numero pre-impreso
                            var searchSeries = search.create({
                                type: "customrecord_lmry_serie_impresion_cxc",
                                filters: [
                                    ["internalid", "anyof", lmry_DocSer]
                                ],
                                columns: [
                                    search.createColumn({
                                        name: "formulanumeric",
                                        formula: "{custrecord_lmry_serie_numero_impres}"
                                    }),
                                    search.createColumn({
                                        name: "formulanumeric",
                                        formula: "{custrecord_lmry_serie_rango_fin}"
                                    }),
                                    "custrecord_lmry_serie_num_digitos",
                                    "custrecord_ei_preprinted_series"
                                ]
                            });

                            var results = searchSeries.run().getRange(0, 1);
                            if (!results || !results.length) {
                                return;
                            }
                            var columns = searchSeries.columns;
                            var nroConse = results[0].getValue(columns[0]) || "";
                            nroConse = Number(nroConse) + 1;
                            var maxPermi = results[0].getValue(columns[1]);
                            maxPermi = Number(maxPermi);
                            var digitos = results[0].getValue(columns[2]);
                            digitos = Number(digitos);
                            var isEISeries = results[0].getValue(columns[3]);


                            //Para Brazil, si la serie es de facturacion no se genera Numero Pre impreso
                            if (LMRY_countr[0] == 'BR' && (isEISeries == true || isEISeries == 'T')) {
                                return true;
                            }

                            // Valida el numero de digitos
                            if (digitos == '' || digitos == null) {
                                return true;
                            }

                            // SW para que no ingrese en un bucle
                            LMRY_swpnro = true;
                            // Crea el numero consecutivo
                            if (nroConse > maxPermi) {
                                alert(library_translator.getAlert(3, Language, [maxPermi]));
                                // alert('El ultimo numero para esta serie (' + maxPermi + ') ha sido utilizado. Verificar si existen numeros disponibles en esta serie');

                                // Asigna el numero pre-impero
                                currentRCD.setValue('custbody_lmry_num_preimpreso', '');
                            } else {
                                var longNumeroConsec = parseInt((nroConse + '').length);
                                var llenarCeros = '';
                                for (var i = 0; i < (digitos - longNumeroConsec); i++) {
                                    llenarCeros += '0';
                                }
                                nroConse = llenarCeros + nroConse;

                                // Asigna el numero pre-impero
                                currentRCD.setValue('custbody_lmry_num_preimpreso', nroConse);

                                // Llama a la funcion de seteo del Tranid
                                INVSet_Field_tranid();
                            }
                            // SW para que no ingrese en un bucle
                            LMRY_swpnro = false;
                        }
                    }
                }
            } catch (err) {
                currentRCD = currentRecord.get();
                Library_Mail.sendemail2(' [ GetNumberSequence ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }
        }

        /***********************************************
         * Funcion Set_Field_tranid que setea el campo
         * standart Tranid
         * Tipo de Documento, Serie de impresion y
         * Numero Preimpreso
         ***********************************************/
        function INVSet_Field_tranid() {
            // var currentRCD = scriptContext.currentRecord;
            try {
                var currentRCD = currentRecord.get();
                // Subsidiaria
                var subsidiaria = currentRCD.getValue('subsidiary');
                var lmry_DocTip = currentRCD.getValue('custbody_lmry_document_type');
                var lmry_DocNum = currentRCD.getValue('custbody_lmry_num_preimpreso');
                var lmry_DocSer = currentRCD.getText('custbody_lmry_serie_doc_cxc');
                var tranprefix = '';
                var texto = '';

                //Feature CL - Print Series
                var isSeriesCLActive = Library_Mail.getAuthorization(414, licenses);
                var hasSeries = LMRY_countr[0] != 'CL' || (LMRY_countr[0] == 'CL' && isSeriesCLActive);

                // Valida el campo subsidiary
                if (subsidiaria != '' && subsidiaria != null) {
                    // Validad contenido de campos
                    if (lmry_DocTip && lmry_DocTip != -1 && lmry_DocNum &&
                        ((hasSeries && lmry_DocSer && lmry_DocSer != -1) || LMRY_countr[0] == 'CL')) {

                        /* *********************************************
                         * Verifica que este activo el feature Numerar
                         * Transaction Number Invoice
                         **********************************************/
                        // Solo para subsidiaria con acceso
                        //ID de features de SET TRANID por pais.
                        var featuresByCountry = {
                            'AR': 5,
                            'BO': 49,
                            'BR': 10,
                            'CL': 11,
                            'CO': 65,
                            'CR': 3,
                            'DO': 522,
                            'EC': 58,
                            'SV': 19,
                            'GT': 23,
                            'MX': 25,
                            'PA': 59,
                            'PY': 40,
                            'PE': 9,
                            'UY': 131
                        };

                        var featureId = featuresByCountry[LMRY_countr[0]];

                        if (featureId && LMRY_countr[2] == true && LMRY_access) {

                            /* *********************************************
                             * Verifica que este activo el feature SET TRANID
                             **********************************************/
                            if (Library_Mail.getAuthorization(featureId, licenses) == false) {
                                return true;
                            }

                            // URL Del Pais
                            var urlpais = runtime.getCurrentScript().getParameter('custscript_lmry_netsuite_location');

                            // Se optiene el Pre - Fijo de la subsidiaria
                            var url_3 = url.resolveScript({
                                scriptId: 'customscript_lmry_get_country_stlt',
                                deploymentId: 'customdeploy_lmry_get_country_stlt',
                                returnExternalUrl: false
                            }) + '&sub=' + subsidiaria + '&opt=INV&cty=' + LMRY_countr[0];

                            //corregir hard code falta url
                            var get = https.get({
                                url: 'https://' + urlpais + url_3
                            });

                            // Retorna el cuero del SuiteLet
                            var tranprefix = get.body;

                            // Iniciales del tipo de documento
                            var tipini = search.lookupFields({
                                type: 'customrecord_lmry_tipo_doc',
                                id: lmry_DocTip,
                                columns: ['custrecord_lmry_doc_initials']
                            });
                            tipini = tipini.custrecord_lmry_doc_initials;
                            if (tipini == '' || tipini == null) {
                                tipini = '';
                            }

                            var texto = currentRCD.getValue('custbody_lmry_num_preimpreso');
                            if (hasSeries) {
                                texto = currentRCD.getText('custbody_lmry_serie_doc_cxc') + '-' + currentRCD.getValue('custbody_lmry_num_preimpreso');
                            }

                            texto = tipini.toUpperCase() + ' ' + texto;

                            if (tranprefix) {
                                texto = tranprefix + ' ' + texto;
                            }

                            currentRCD.setValue({
                                fieldId: 'tranid',
                                value: texto
                            });
                        } // Solo para subsidiaria con acceso
                    } // Validad contenido de campos
                } // Valida el campo subsidiary
                return true;
            } catch (err) {
                currentRCD = currentRecord.get();
                Library_Mail.sendemail2(' [ INVSet_Field_tranid ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }
        }


        /********************************************************
         * Valida si todos los items de la factura corresponden *
         * a una transferencia gratuita                         *
         *********************************************************/
        function ValidaItemsTTG() {
            try {
                var currentRCD = currentRecord.get();
                var recQY = currentRCD.getLineCount('item');
                for (var pos = 0; pos < recQY; pos++) {
                    var linttg = currentRCD.getSublistValue('item', 'custcol_lmry_col_es_ttg', pos);
                    if (linttg != true) {
                        return false;
                    }
                }
            } catch (err) {
                currentRCD = currentRecord.get();
                Library_Mail.sendemail2(' [ ValidaItemsTTG ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }
            return true;
        }

        /***********************************************
         * Funcion que actualiza los campos de cabecera
         * Totales Venta
         ***********************************************/
        function UpdateTotalSales() {

            try {
                var currentRCD = currentRecord.get();
                if (LMRY_countr[0] == 'PE' && LMRY_countr[2] == true) {

                    // Solo para Retenciones
                }
                // Solo para subsidiria de Bolivia y Paraguaya
                if ((LMRY_countr[0] == 'BO' || LMRY_countr[0] == 'PY') && LMRY_countr[2] == true) {
                    // Fecha en Letras Parametros: Fecha
                    var dateletras = Library_Number.stringdate(currentRCD.getValue('trandate'));
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_date_letter',
                        value: dateletras
                    });
                }

                // Solo para subsidiria de Panama
                if (LMRY_countr[0] == 'PA' && LMRY_countr[2] == true) {
                    // Guia de Remision
                    DocumentRef();
                }

                // Solo para Sub sidiaria Paraguaya
                if (LMRY_countr[0] == 'PY' && LMRY_countr[2] == true) {
                    PY_SumItems();
                }

                // Solo para Sub sidiaria de El Salvador
                if (LMRY_countr[0] == 'SV' && LMRY_countr[2] == true) {
                    SV_SumItems();
                }

            } catch (err) {
                currentRCD = currentRecord.get();
                Library_Mail.sendemail2(' [ UpdateTotalSales ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }
            return true;
        }

        /***********************************************
         * Realiza busqueda para varificar que no tenga
         * registros en LatamReady - Tax Trans Line
         ***********************************************/
        function PY_TaxTransLine() {

            try {
                var currentRCD = currentRecord.get();
                var customid = currentRCD.id;
                if (customid == '' || customid == null) {
                    return true;
                }


                //  Filtros del Query
                var filters = new Array();
                filters[0] = search.createFilter({
                    name: 'custrecord_lmry_tax_transactions_referen',
                    operator: search.Operator.ANYOF,
                    values: [customid]
                });
                var columns = new Array();
                columns[0] = search.createColumn({
                    name: 'internalid'
                });
                columns[1] = search.createColumn({
                    name: 'name'
                });
                var trandata = search.create({
                    type: 'customrecord_lmry_tax_transactions_line',
                    columns: columns,
                    filters: filters
                });
                trandata = trandata.run().getRange(0, 1000);
                if (trandata != '' && trandata != null) {
                    alert(library_translator.getAlert(4, Language, []));
                    //alert('Tiene que eliminar las lineas regitradas en LatamReady - Tax Trans Line.\nSe encuentra en el TAB Registros Relacionados.');
                    return false;
                }
            } catch (err) {
                currentRCD = currentRecord.get();
                Library_Mail.sendemail2(' [ PY_TaxTransLine ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }
            return true;

        }

        /***********************************************
         * Funcion que actualiza los campos de cabecera
         * Totales Venta
         ***********************************************/
        function DocumentRef() {
            try {
                var currentRCD = currentRecord.get();
                var numguia = currentRCD.getValue('custbody_lmry_num_doc_ref');

                if (numguia == '' || numguia == null) {
                    // Numero de Pedido
                    var numped = currentRCD.getValue('createdfrom');
                    if (numped != null && numped != '') {
                        //  Filtros del Query
                        var filters = new Array();
                        filters[0] = search.createFilter({
                            name: 'createdfrom',
                            operator: search.Operator.IS,
                            values: [numped]
                        });
                        var columns = new Array();
                        columns[0] = search.createColumn({
                            name: 'internalid'
                        });
                        columns[1] = search.createColumn({
                            name: 'tranid'
                        });
                        columns[2] = search.createColumn({
                            name: 'trandate'
                        });
                        var transacdata = search.create({
                            type: 'itemfulfillment',
                            columns: columns,
                            filters: filters
                        });

                        transacdata = transacdata.run().getRange(0, 1000);

                        // Mensaje al usuario
                        if (transacdata != null && transacdata.length != 0) {
                            var guianume = transacdata[0].getValue('tranid');
                            currentRCD.setValue({
                                fieldId: 'custbody_lmry_num_doc_ref',
                                value: guianume
                            });
                        }
                    } // Numero de Pedido
                } // Ultimo numero de guia

            } catch (err) {
                currentRCD = currentRecord.get();
                Library_Mail.sendemail2(' [ DocumentRef ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }
            return true;
        }

        /***********************************************
         * Realiza la suma de lineas segun el
         * impuesto - Paraguay
         ***********************************************/
        function PY_SumItems() {

            try {

                var currentRCD = currentRecord.get();

                // Latam Total Tax Amount S-PY
                var totaltax_spy = 0;
                // Latam Total Tax Amount R-PY
                var totaltax_rpy = 0;
                // Latam SubTotal Gross Amount S-PY
                var subtotal_spy = 0;
                // Latam SubTotal Gross Amount R-PY
                var subtotal_rpy = 0;
                // Latam SubTotal Gross Amount E-PY
                var subtotal_epy = 0;

                // Se suma los mismos codigos de impuesto
                // var recQY = nlapiGetLineItemCount('item');
                // 1.0
                var recQY = currentRCD.getLineCount('item');

                for (var pos = 0; pos < recQY; pos++) {
                    var lintax = currentRCD.getSublistText('item', 'taxcode', pos); // taxcode
                    var linamo = currentRCD.getSublistValue('item', 'grossamt', pos); // grossamount
                    var linrte = currentRCD.getSublistValue('item', 'tax1amt', pos); // taxamount

                    switch (lintax) {
                        case 'VAT_PY:S-PY':
                            totaltax_spy = parseFloat(totaltax_spy) + parseFloat(linrte);
                            subtotal_spy = parseFloat(subtotal_spy) + parseFloat(linamo);
                            break;
                        case 'VAT_PY:R-PY':
                            totaltax_rpy = parseFloat(totaltax_rpy) + parseFloat(linrte);
                            subtotal_rpy = parseFloat(subtotal_rpy) + parseFloat(linamo);
                            break;
                        case 'VAT_PY:E-PY':
                            subtotal_epy = parseFloat(subtotal_epy) + parseFloat(linamo);
                            break;
                    }
                }

                // Asigna los valores a los campos
                currentRCD.setValue({
                    fieldId: 'custbody_lmry_total_taxamount_spy',
                    value: totaltax_spy
                });
                currentRCD.setValue({
                    fieldId: 'custbody_lmry_total_taxamount_rpy',
                    value: totaltax_rpy
                });
                currentRCD.setValue({
                    fieldId: 'custbody_lmry_subtotal_amount_spy',
                    value: subtotal_spy
                });
                currentRCD.setValue({
                    fieldId: 'custbody_lmry_subtotal_amount_rpy',
                    value: subtotal_rpy
                });
                currentRCD.setValue({
                    fieldId: 'custbody_lmry_subtotal_amount_epy',
                    value: subtotal_epy
                });
            } catch (err) {
                currentRCD = currentRecord.get();
                Library_Mail.sendemail2(' [ PY_SumItems ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }
        }

        /***********************************************
         * Realiza la suma de lineas segun el
         * impuesto - El Salvador
         ***********************************************/
        function SV_SumItems() {
            try {

                var currentRCD = currentRecord.get();
                // Item Tax Code
                // LMRY Total Ventas No Sujetas
                var tv_ns = 0;
                // LMRY Total Ventas Exentas
                var tv_ex = 0;
                // LMRY Total Ventas Afectas
                var tv_af = 0;
                // LMRY Retenciones
                var tv_wt = 0;

                // Se suma los mismos codigos de impuesto
                var recQY = currentRCD.getLineCount('item');

                for (var pos = 0; pos < recQY; pos++) {
                    var linite = currentRCD.getSublistValue('item', 'item', pos);
                    var lintax = currentRCD.getSublistText('item', 'taxcode', pos);
                    var linamo = currentRCD.getSublistValue('item', 'amount', pos);
                    var linqty = currentRCD.getSublistValue('item', 'quantity', pos);

                    switch (lintax) {
                        case 'VAT_SV:NS-SV':
                            tv_ns = parseFloat(tv_ns) + parseFloat(linamo);
                            break;
                        case 'VAT_SV:E-SV':
                            if (linqty != 0) {
                                tv_ex = parseFloat(tv_ex) + parseFloat(linamo);
                                break;
                            }
                        case 'VAT_SV:UNDEF_SV':
                            // Solo para Retenciones
                            if (currentRCD.type == 'creditmemo' && linite == tv_tc) {
                                tv_wt = parseFloat(tv_wt) + parseFloat(linamo);
                            } else {
                                if (linqty != 0) {
                                    tv_ex = parseFloat(tv_ex) + parseFloat(linamo);
                                }
                            }
                            break;
                        case 'VAT_SV:S-SV':
                            tv_af = parseFloat(tv_af) + parseFloat(linamo);
                            break;
                        case 'VAT_SV:X-SV':
                            tv_af = parseFloat(tv_af) + parseFloat(linamo);
                            break;
                    }

                }

                // Para las retenciones
                var wtax_wamt = 0;
                var wtax_wcod = currentRCD.getText('custpage_4601_witaxcode');
                if (wtax_wcod != null && wtax_wcod != '') {
                    if (wtax_wcod.substring(wtax_wcod.length - 3) == '_GC') {
                        wtax_wamt = currentRCD.getText('custpage_4601_witaxamount');
                    }
                }
                // Solo para Retenciones
                if (currentRCD.type == 'creditmemo') {
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_wamt',
                        value: Math.abs(tv_wt)
                    });
                } else {
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_wamt',
                        value: wtax_wamt
                    });
                }

                /*---------------------------------------------------------------------------*/
                // Modificacion 2016-08-06
                // F=Individual Line Items - T=Total Amount
                var appliesto = currentRCD.getValue('custpage_4601_appliesto');

                // Se copia los valores de WHT
                var witaxcode = currentRCD.getValue('custpage_4601_witaxcode');
                if (appliesto == false) {
                    witaxcode == null;
                }
                if (witaxcode != null && witaxcode != '' && witaxcode != undefined) {
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_code',
                        value: witaxcode
                    });
                }

                // 2020.11.20Validacion de campos vacios
                var witaxrate = currentRCD.getValue('custpage_4601_witaxrate');
                if (appliesto == false) {
                    witaxrate == null;
                }
                if (witaxrate != '' && witaxrate != null && witaxrate != undefined) {
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_rate',
                        value: witaxrate
                    });
                } else {
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_rate',
                        value: 0
                    });
                }

                var witaxamount = currentRCD.getValue('custpage_4601_witaxamount');
                if (witaxamount != '' && witaxamount != null && witaxamount != undefined) {
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_amount',
                        value: witaxamount
                    });
                } else {
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wtax_amount',
                        value: 0
                    });
                }

                var witaxbaseamount = currentRCD.getValue('custpage_4601_witaxbaseamount');
                if (witaxbaseamount != '' && witaxbaseamount != null && witaxbaseamount != undefined) {
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wbase_amount',
                        value: witaxbaseamount
                    });
                } else {
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_wbase_amount',
                        value: 0
                    });
                }

                // Asigna los valores a los campos
                currentRCD.setValue({
                    fieldId: 'custbody_lmry_sv_not_taxable_total_sal',
                    value: tv_ns
                });
                currentRCD.setValue({
                    fieldId: 'custbody_lmry_sv_exempt_total_sales',
                    value: tv_ex
                });
                currentRCD.setValue({
                    fieldId: 'custbody_lmry_sv_taxable_total_sales',
                    value: tv_af
                });

            } catch (err) {
                currentRCD = currentRecord.get();
                Library_Mail.sendemail2(' [ SV_SumItems ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }
        }

        /***********************************************
         * Coloca el numero correlativo de Chile
         ***********************************************/
        function correlativoChile(opcion) {
            try {
                var currentRCD = currentRecord.get();
                // Valida si es OneWorld
                var featuresubs = runtime.isFeatureInEffect({
                    feature: 'SUBSIDIARIES'
                });

                /* *********************************************
                 * Verifica que este activo el feature Numerar
                 * Transaction Number Invoice
                 **********************************************/
                if (LMRY_countr[0] == 'CL') {
                    if (Library_Mail.getAuthorization(111, licenses) == false) {
                        return true;
                    }
                }

                var documentType = currentRCD.getValue('custbody_lmry_document_type');
                var subsidiaryID = currentRCD.getValue('subsidiary');

                if (!documentType) {
                    return true;
                }

                // Numero Correlativo para Chile
                var internalid = 0;
                var nroCorrela = 0;
                if (opcion == 1) {
                    //  Filtros del Query
                    var filters = new Array();
                    filters[0] = search.createFilter({
                        name: 'custrecord_lmry_cl_np_document_type',
                        operator: search.Operator.ANYOF,
                        values: [documentType]
                    });
                    if (featuresubs == true || featuresubs == true) {
                        filters[1] = search.createFilter({
                            name: 'custrecord_lmry_cl_np_subsidiary',
                            operator: search.Operator.ANYOF,
                            values: [subsidiaryID]
                        });
                    }
                    // Campos del Query
                    var columns = new Array();
                    columns[0] = search.createColumn({
                        name: 'internalid'
                    });
                    columns[1] = search.createColumn({
                        name: 'custrecord_lmry_cl_np_current_value'
                    });
                    // Realiza una busqueda en las transacciones Invoice
                    var transacdata = search.create({
                        type: 'customrecord_lmry_cl_number_preprinted',
                        columns: columns,
                        filters: filters
                    });

                    transacdata = transacdata.run().getRange(0, 1000);

                    if (transacdata != '' && transacdata != null) {
                        // Si existe registro
                        if (transacdata.length > 0) {
                            internalid = transacdata[0].getValue('internalid');
                            nroCorrela = transacdata[0].getValue('custrecord_lmry_cl_np_current_value');
                            //alert('No se encuentra configurado el numero correlativo para el campo [Latam - Numero Preimpreso]');

                            nroCorrela = (parseFloat(nroCorrela)) + 1;

                        }
                    }

                    if (!nroCorrela) {
                        alert(library_translator.getAlert(5, Language, []));
                    }


                    /* if (nroCorrela == 0) {
                       alert(library_translator.getAlert(5,Language,[]));
                       //alert('No se encuentra configurado el numero correlativo para el campo [Latam - Numero Preimpreso]');
                     }*/

                    // Setea el numero correlativo
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_num_preimpreso',
                        value: nroCorrela
                    });

                    INVSet_Field_tranid();

                }

                // Actualiza el numero correlativo
                if (opcion == 2) {
                    //  Filtros del Query
                    var filters = new Array();
                    filters[0] = search.createFilter({
                        name: 'custrecord_lmry_cl_np_document_type',
                        operator: search.Operator.ANYOF,
                        values: [documentType]
                    });
                    if (featuresubs == true || featuresubs == true) {
                        filters[1] = search.createFilter({
                            name: 'custrecord_lmry_cl_np_subsidiary',
                            operator: search.Operator.ANYOF,
                            values: [subsidiaryID]
                        });
                    }
                    // Campos del Query
                    var columns = new Array();
                    columns[0] = search.createColumn({
                        name: 'internalid'
                    });
                    columns[1] = search.createColumn({
                        name: 'custrecord_lmry_cl_np_current_value'
                    });
                    // Realiza una busqueda en las transacciones Invoice
                    var transacdata = search.create({
                        type: 'customrecord_lmry_cl_number_preprinted',
                        columns: columns,
                        filters: filters
                    });

                    transacdata = transacdata.run().getRange(0, 1000);
                    if (transacdata != '' && transacdata != null) {
                        // Si existe registro
                        if (transacdata.length > 0) {
                            internalid = transacdata[0].getValue('internalid');
                            nroCorrela = transacdata[0].getValue('custrecord_lmry_cl_np_current_value');

                            // Verifica el numero correlativo
                            var AuxiNumero = currentRCD.getValue('custbody_lmry_num_preimpreso');

                            if (parseFloat(nroCorrela) < parseFloat(AuxiNumero)) {
                                var id = record.submitFields({
                                    type: 'customrecord_lmry_cl_number_preprinted',
                                    id: internalid,
                                    values: {
                                        'custrecord_lmry_cl_np_current_value': parseFloat(AuxiNumero)
                                    }
                                });
                            }
                        }
                    }
                }

            } catch (err) {
                currentRCD = currentRecord.get();
                Library_Mail.sendemail2(' [ correlativoChile ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }

            return true;
        }

        /***********************************************
         * Funcion Inicializa campos WHT de sumatoria
         ***********************************************/
        function SetCustomField_WHT_Init_Inv(scriptContext) {
            try {
                var currentRCD = scriptContext.currentRecord;
                // Solo para subsidiria de Bolivia, Colombia y Paraguay
                if (LMRY_countr[0] != 'BO' && LMRY_countr[0] != 'CO' && LMRY_countr[0] != 'PY') {
                    return true;
                }

                if (LMRY_countr[2] == false) {
                    return true;
                }

                /* ******************************************
                 * 2020.06.01 : Se cambio de funcion de
                 * Validate_EIDocument por Verification_Duplicate_Clnt
                 * if (!Library_Duplicate_Clnt.Validate_EIDocument(currentRCD)) {
                 * ***************************************** */
                // Latam Colombia - Verify Withholding(Credit Memo)
                // Latam Colombia
                var checkDuplicateLicense = Library_Mail.getAuthorization(666, licenses) && type == "edit";
                var checkDuplicate = (Library_Duplicate_Clnt.Verification_Duplicate_Clnt(old_record, currentRCD) || Library_Duplicate_Clnt.Verification_Duplicate_Lines_Clnt(currentRCD, old_record_lines))
                if (!(!checkDuplicate && checkDuplicateLicense)) {
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_co_reteica_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_co_reteiva_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_co_retefte_amount',
                        value: 0
                    });
                    currentRCD.setValue({
                        fieldId: 'custbody_lmry_co_retecree_amount',
                        value: 0
                    });
                }

                // Latam Bolivia
                currentRCD.setValue({
                    fieldId: 'custbody_lmry_bo_autoreteit_whtamount',
                    value: 0
                });
                currentRCD.setValue({
                    fieldId: 'custbody_lmry_bo_reteiue_whtamount',
                    value: 0
                });
            } catch (err) {
                Library_Mail.sendemail2(' [ SetCustomField_WHT_Init_Inv ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }
            return true;
        }

        /***********************************************
         * Funcion setea los campos de cabecera
         ***********************************************/
        function SetCustomField_WHT_Code_Inv() {
            //var currentRCD = currentRecord.get();
            try {
                // Solo si tiene acceso al enabled feature
                if (!LMRY_access) {
                    return true;
                }

                // Solo para subsidiria de Bolivia, Colombia, Paraguay y Ecuador
                if (LMRY_countr[0] != 'BO' && LMRY_countr[0] != 'CO' && LMRY_countr[0] != 'PY' && LMRY_countr[0] != 'EC') {

                    return true;
                }

                if (LMRY_countr[2] == false) {
                    return true;
                }

                // Desactiva el campo
                var sub_country = currentRCD.getValue('custbody_lmry_subsidiary_country');

                if (sub_country == '' || sub_country == null) {
                    currentRCD.getField({
                        fieldId: 'custbody_lmry_subsidiary_country'
                    }).isDisabled = false;

                }

                // Localizacion CO : Colombia
                if (LMRY_countr[0] == 'CO') {
                    // Withholding Tax : Use Only at Main Level
                    if (Library_Mail.getAuthorization(27, licenses) == true) {
                        /* ******************************************
                         * 2020.06.01 : Solo limpiar campos al momento
                         * de crear o copiar la transaccion
                         ****************************************** */
                        if (type == 'create' || type == 'copy') {
                            // Latam Colombia
                            currentRCD.setValue({
                                fieldId: 'custbody_lmry_co_reteica',
                                value: ''
                            });
                            currentRCD.setValue({
                                fieldId: 'custbody_lmry_co_reteica_amount',
                                value: 0
                            });
                            currentRCD.setValue({
                                fieldId: 'custbody_lmry_co_reteiva',
                                value: ''
                            });
                            currentRCD.setValue({
                                fieldId: 'custbody_lmry_co_reteiva_amount',
                                value: 0
                            });
                            currentRCD.setValue({
                                fieldId: 'custbody_lmry_co_retefte',
                                value: ''
                            });
                            currentRCD.setValue({
                                fieldId: 'custbody_lmry_co_retefte_amount',
                                value: 0
                            });
                            currentRCD.setValue({
                                fieldId: 'custbody_lmry_co_autoretecree',
                                value: ''
                            });
                            currentRCD.setValue({
                                fieldId: 'custbody_lmry_co_retecree_amount',
                                value: 0
                            });
                        } // 2020.06.01 : Create and Copy
                    } // Withholding Tax : Use Only at Main Level
                } // Localizacion CO : Colombia

                // Latam Bolivia
                if (LMRY_countr[0] == 'BO') {
                    if (Library_Mail.getAuthorization(46, licenses) == true) {

                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_bo_autoreteit',
                            value: ''
                        });
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_bo_autoreteit_whtamount',
                            value: 0
                        });
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_bo_reteiue',
                            value: ''
                        });
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_bo_reteiue_whtamount',
                            value: 0
                        });

                    }
                }
                // Latam Ecuador
                if (LMRY_countr[0] == 'EC') {
                    if (Library_Mail.getAuthorization(41, licenses) == true) {

                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_ec_reteir',
                            value: ''
                        });
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_ec_reteir_amount',
                            value: 0
                        });
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_ec_reteiva',
                            value: ''
                        });
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_ec_reteiva_amount',
                            value: 0
                        });

                    }
                }

                // Latam Ecuador
                if (LMRY_countr[0] == 'PY') {
                    if (Library_Mail.getAuthorization(47, licenses) == true) {

                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_py_autoreteir',
                            value: ''
                        });
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_py_autoreteir_amount',
                            value: 0
                        });
                    }
                }


                // Busca al cliente
                var lmry_entity = currentRCD.getValue('entity');

                if (lmry_entity != '' && lmry_entity != null) {
                    // Seteo de campos
                    var rec_entity = search.lookupFields({
                        type: 'entity',
                        id: lmry_entity,
                        columns: ['custentity_lmry_co_reteica', 'custentity_lmry_co_reteiva',
                            'custentity_lmry_co_retefte', 'custentity_lmry_co_retecree',
                            'custentity_lmry_bo_autoreteit', 'custentity_lmry_bo_reteiue',
                            'custentity_lmry_ec_autoreteir', 'custentity_lmry_ec_reteiva'
                        ]
                    });

                    /**********************************
                     *    Valida que no este nulo
                     **********************************/
                    // Latam Colombia
                    if (rec_entity.custentity_lmry_co_reteica != '' && rec_entity.custentity_lmry_co_reteica != null) {
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_co_reteica',
                            value: rec_entity.custentity_lmry_co_reteica[0].value
                        });
                    }
                    if (rec_entity.custentity_lmry_co_reteiva != '' && rec_entity.custentity_lmry_co_reteiva != null) {
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_co_reteiva',
                            value: rec_entity.custentity_lmry_co_reteiva[0].value
                        });
                    }
                    if (rec_entity.custentity_lmry_co_retefte != '' && rec_entity.custentity_lmry_co_retefte != null) {
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_co_retefte',
                            value: rec_entity.custentity_lmry_co_retefte[0].value
                        });
                    }
                    if (rec_entity.custentity_lmry_co_retecree != '' && rec_entity.custentity_lmry_co_retecree != null) {
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_co_autoretecree',
                            value: rec_entity.custentity_lmry_co_retecree[0].value
                        });
                    }
                    // Latam Bolivia
                    if (rec_entity.custentity_lmry_bo_autoreteit != '' && rec_entity.custentity_lmry_bo_autoreteit != null) {
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_bo_autoreteit',
                            value: rec_entity.custentity_lmry_bo_autoreteit[0].value
                        });
                    }
                    if (rec_entity.custentity_lmry_bo_reteiue != '' && rec_entity.custentity_lmry_bo_reteiue != null) {
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_bo_reteiue',
                            value: rec_entity.custentity_lmry_bo_reteiue[0].value
                        });
                    }
                    // Latam Paraguay
                    if (rec_entity.custentity_lmry_py_autoreteir != '' && rec_entity.custentity_lmry_py_autoreteir != null) {
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_py_autoreteir',
                            value: rec_entity.custentity_lmry_py_autoreteir[0].value
                        });
                    }
                    if (rec_entity.custentity_lmry_py_reteiva != '' && rec_entity.custentity_lmry_py_reteiva != null) {
                        currentRCD.setValue({

                            fieldId: 'custbody_lmry_py_reteiva',
                            value: rec_entity.custentity_lmry_py_reteiva[0].value
                        });
                    }
                    // Latam Ecuador
                    if (rec_entity.custentity_lmry_ec_autoreteir != '' && rec_entity.custentity_lmry_ec_autoreteir != null) {
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_ec_reteir',
                            value: rec_entity.custentity_lmry_ec_autoreteir[0].value
                        });
                    }
                    if (rec_entity.custentity_lmry_ec_reteiva != '' && rec_entity.custentity_lmry_ec_reteiva != null) {
                        currentRCD.setValue({
                            fieldId: 'custbody_lmry_ec_reteiva',
                            value: rec_entity.custentity_lmry_ec_reteiva[0].value
                        });
                    }
                }
            } catch (err) {
                Library_Mail.sendemail2(' [ SetCustomField_WHT_Code_Inv ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }

            return true;
        }

        /***********************************************
         * Funcion para validar si esta configurado el
         * LatamReady - Invoicing Identifier
         * por tipo de impuesto
         ***********************************************/
        function getMatch(inv_id, taxcode) {

            try {

                var match = false;

                /* Registro Personalizado LatamReady - Tax Type by Invoicing ID */
                var country_m = currentRCD.getValue('custbody_lmry_subsidiary_country');

                var busqTaxTypeByInvID = search.create({
                    type: 'customrecord_lmry_taxtype_by_invoicingid',
                    columns: ['custrecord_lmry_inv_id', 'custrecord_lmry_tax_code_invid'],
                    filters: ['custrecord_lmry_taxtype_country', 'anyof', country_m]
                });

                var resultTaxTypeByInvID = busqTaxTypeByInvID.run().getRange(0, 100);

                if (inv_id != null && inv_id != '' && inv_id.length > 0) {

                    if (resultTaxTypeByInvID != null && resultTaxTypeByInvID != '') {

                        for (var j = 0; j < inv_id.length; j++) {

                            for (var g = 0; g < resultTaxTypeByInvID.length; g++) {

                                var rec_inv_id = resultTaxTypeByInvID[g].getValue('custrecord_lmry_inv_id');
                                var rec_code_invid = resultTaxTypeByInvID[g].getValue('custrecord_lmry_tax_code_invid');

                                if ((inv_id[j] == '' || inv_id[j] == null || taxcode[j] == '' || taxcode[j] == null) || (rec_inv_id == inv_id[j] && rec_code_invid == taxcode[j])) {

                                    match = true;
                                    break;
                                } else {
                                    match = false;
                                }
                            }
                            if (!match) {
                                alert(library_translator.getAlert(6, Language, [j + 1]));
                                //alert("Línea " + (j + 1) + ". No se encontró relación entre 'Tax Code' y 'Latam Col - Invoicing Identifier'. Ingrese a Setup > LatamReady - Tax Code > Tax Type by Invoicing ID");
                                return match;
                            }
                        }
                    } else {
                        match = true;
                    }
                } else {
                    match = true;
                }
            } catch (err) {
                Library_Mail.sendemail2(' [ getMatch ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }
            return match;
        }
        /* ------------------------------------------------------------------------------------------------------
         * A la variable featureId se le asigna el valore que le corresponde
         * --------------------------------------------------------------------------------------------------- */
        function ValidateAccessInv(ID) {
            try {

                if (ID == '' || ID == null) {
                    return true;
                }

                LMRY_access = false;
                LMRY_countr = Library_Mail.Get_Country_STLT(ID);
                LMRY_countr = activate_fe(LMRY_countr);

                if (LMRY_countr.length < 1) {
                    return true;
                }

                LMRY_access = Library_Mail.getCountryOfAccess(LMRY_countr, licenses);

                if (LMRY_countr[0] == '' || LMRY_countr[0] == null) {
                    return true;
                }

                // Solo si tiene acceso
                Val_Campos = '';
                if (LMRY_access == true) {
                    Val_Campos = Library_Val.Val_Authorization(currentRCD, LMRY_countr[0], licenses);
                    Val_Campos_Linea = Library_Val.Val_Line_Busqueda(currentRCD, LMRY_countr[0], licenses);
                }

                // Ya paso por esta validacion
                LMRY_swsubs = false;
            } catch (err) {
                Library_Mail.sendemail2(' [ ValidateAccessInv ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }

            return true;
        }

        function activate_fe(fe_countr) {
            var autfe = false;

            //Feature Other Flows (Invoice)
            var authorizations_fe = {
                'AR': 246,
                'BO': 247,
                'BR': 248,
                'CL': 249,
                'CO': 250,
                'CR': 251,
                'DO': 400,
                'EC': 252,
                'SV': 253,
                'GT': 254,
                'MX': 255,
                'NI': 407,
                'PA': 256,
                'PY': 257,
                'PE': 258,
                'UY': 259
            };

            if (authorizations_fe[fe_countr[0]]) {
                autfe = Library_Mail.getAuthorization(authorizations_fe[fe_countr[0]], licenses);
            }

            if (autfe == true) {
                fe_countr.push(true);
            } else {
                fe_countr.push(false);
            }
            return fe_countr;
        }

        function removeOtions(id, rcd) {
            var field = rcd.getField(id);
            if (field != null && field != '') {
                field.removeSelectOption({
                  value: null,
                });
            }
        }

        function addOptions(id, rcd, values) {

            var field = rcd.getField(id);
            if (field != null && field != '') {
                field.insertSelectOption({
                    value: ' ',
                    text: '\u2000'
                });

                field.insertSelectOption({
                    value: values[0]["compra"],
                    text: 'Compra',
                });

                field.insertSelectOption({
                    value: values[0]["venta"],
                    text: 'Venta',
                });
            }
        }

        function ws_exchange_rate() {

            try {

                var er_code_country;
                var wsSubsi = currentRCD.getValue('subsidiary');
                if (wsSubsi != '' && wsSubsi != null) {
                    var result = LR_webService.conection('clntInternal', 'getCountryCode', {
                        "subsidiary": wsSubsi
                    });
                    er_code_country = result.code;
                }

                if (er_code_country != '' && er_code_country != null) {

                    var fe_exrate = feature_ws_exchange_rate(er_code_country);

                    if (fe_exrate == true) {

                        var currencySearch = search.create({
                            type: search.Type.CURRENCY,
                            filters: ['symbol', 'is', 'USD'],
                            columns: 'internalid'
                        });
                        var currencySearch = currencySearch.run().getRange(0, 1000);
                        idcurrencyUSD = currencySearch[0].getValue('internalid');

                        if (currencySearch.length > 0) {

                            //Moneda Principal Inicio
                            var featuresubs = runtime.isFeatureInEffect({
                                feature: 'SUBSIDIARIES'
                            });

                            if (featuresubs == true || featuresubs == 'T') {
                                var primaryCurrency = search.lookupFields({
                                    type: 'subsidiary',
                                    id: currentRCD.getValue('subsidiary'),
                                    columns: ['currency']
                                });

                                var primaryCurrencyId = primaryCurrency.currency[0].value;
                            } else {
                                var primaryCurrencyId = Number(currentRCD.getValue('custpage_lmry_basecurrency'));
                            };

                            if (primaryCurrencyId != idcurrencyUSD && currentRCD.getValue('currency') == idcurrencyUSD) {

                                result_ws_exchange_rate(er_code_country, 1);
                                var lmry_exchange_rate_field = currentRCD.getField('custpage_lmry_exchange_rate');
                                if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
                                    lmry_exchange_rate_field.isDisplay = true;
                                }
                            } else if (primaryCurrencyId == idcurrencyUSD && currentRCD.getValue('currency') != idcurrencyUSD) {

                                var secondaryCurrency = search.lookupFields({
                                    type: 'currency',
                                    id: currentRCD.getValue('currency'),
                                    columns: ['symbol']
                                });

                                var codeCurrency = secondaryCurrency.symbol;

                                var codeCountry = {
                                    'PEN': 'PE',
                                    'CRC': 'CR',
                                    'ARS': 'AR',
                                    'BRL': 'BR',
                                    'MXN': 'MX',
                                    'COP': 'CO',
                                    'USD': 'US',
                                    'BOB': 'BO',
                                    'USD': 'EC',
                                    'USD': 'SV',
                                    'GTQ': 'GT',
                                    'NIO': 'NI',
                                    'PAB': 'PA',
                                    'PYG': 'PY',
                                    'DOP': 'DO',
                                    'UYU': 'UY',
                                    'CLP': 'CL'
                                };

                                var lmry_exchange_rate_field = currentRCD.getField('custpage_lmry_exchange_rate');
                                if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
                                    lmry_exchange_rate_field.isDisplay = true;
                                }
                                result_ws_exchange_rate(codeCountry[codeCurrency], 2);

                            } else {
                                var lmry_exchange_rate_field = currentRCD.getField('custpage_lmry_exchange_rate');
                                if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
                                    lmry_exchange_rate_field.isDisplay = false;
                                }
                            }
                        }
                    }
                }

            } catch (err) {
                Library_Mail.sendemail2(' [ ws_exchange_rate ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
            }

        }

        function result_ws_exchange_rate(er_code_country, exchange_rate_case) {

            var er_trandate = currentRCD.getValue('trandate');
            if (er_code_country != '' && er_code_country != null && er_trandate != '' && er_trandate != null) {

                if (exchange_rate_case == 1) {

                    var result = LR_webService.conection('clnt', 'getExchangeRate', {
                        "from": er_code_country,
                        "to": "US",
                        "date": er_trandate.getDate() + "/" + (er_trandate.getMonth() + 1) + "/" + er_trandate.getFullYear()
                    });

                } else if (exchange_rate_case == 2) {

                    var result = LR_webService.conection('clnt', 'getExchangeRate', {
                        "from": "US",
                        "to": er_code_country,
                        "date": er_trandate.getDate() + "/" + (er_trandate.getMonth() + 1) + "/" + er_trandate.getFullYear()
                    });
                }

                if (result.length > 0) {
                    removeOtions('custpage_lmry_exchange_rate', currentRCD);
                    addOptions('custpage_lmry_exchange_rate', currentRCD, result);
                }
            }
        }

        function validateDuplicateInvoices(recordObj) {
            var customer = recordObj.getValue({
                fieldId: 'entity'
            });
            var documentType = recordObj.getValue({
                fieldId: 'custbody_lmry_document_type'
            });
            documentType = Number(documentType);
            var serieDoc = recordObj.getValue({
                fieldId: 'custbody_lmry_serie_doc_cxc'
            });
            var numPreimpreso = recordObj.getValue({
                fieldId: 'custbody_lmry_num_preimpreso'
            }) || "";
            numPreimpreso = numPreimpreso.trim();
            var subsidiary = recordObj.getValue({
                fieldId: 'subsidiary'
            });

            if (customer && documentType > 0 && serieDoc && numPreimpreso) {
                var filters = [
                    ["mainline", "is", "T"], "AND",
                    ["voided", "is", "F"], "AND",
                    ["entity", "anyof", customer], "AND",
                    ["custbody_lmry_document_type", "anyof", documentType], "AND",
                    ["custbody_lmry_num_preimpreso", "is", numPreimpreso]
                ]

                var FEAT_SUBS = runtime.isFeatureInEffect({
                    feature: 'SUBSIDIARIES'
                });

                if ((FEAT_SUBS == true || FEAT_SUBS == "T") && subsidiary) {
                    filters.push("AND", ["subsidiary", "anyof", subsidiary]);
                }

                if (recordObj.id) {
                    filters.push("AND", ["internalid", "noneof", recordObj.id]);
                }

                var searchInvoices = search.create({
                    type: "invoice",
                    filters: filters,
                    columns: ["internalid"]
                });

                var results = searchInvoices.run().getRange(0, 10);

                if (results && results.length) {
                    var msg = {
                        'es': 'Este cliente posee un documento con el mismo tipo, serie y número.\nPor favor, cambie los datos especificados.',
                        'en': 'This customer already has a document with the same type, series and number.\nPlease change the mentioned values to proceed.',
                        'pt': 'Este cliente possui um documento com o mesmo tipo, série e número.\nPor favor, altere os dados especificados.'
                    };

                    alert(msg[Language] || msg["en"]);
                    return false;
                }
            }
            return true;
        }

        function feature_ws_exchange_rate(code_countr) {
            var autfe = false;
            var authorizations_fe = {
                'AR': 610,
                'BO': 611,
                'BR': 612,
                'CL': 613,
                'CO': 614,
                'CR': 615,
                'DO': 624,
                'EC': 616,
                'SV': 617,
                'GT': 618,
                'MX': 619,
                'NI': 620,
                'PA': 621,
                'PY': 622,
                'PE': 623,
                'UY': 625
            };

            if (authorizations_fe[code_countr]) {
                autfe = Library_Mail.getAuthorization(authorizations_fe[code_countr], licenses);
            }

            return autfe;
        }

        function onclick_event_co_wht_lines() {

            try {

                var currentRCD = currentRecord.get();

                var recordLog = record.create({ type: 'customrecord_lmry_co_wht_lines_log' });
                recordLog.setValue('custrecord_lmry_co_wht_lines_transaction', currentRCD.id);
                recordLog.setValue('custrecord_lmry_co_wht_lines_subsidiary', currentRCD.getValue('subsidiary'));
                recordLog.setValue('custrecord_lmry_co_wht_lines_user', runtime.getCurrentUser().id);
                recordLog.setValue('custrecord_lmry_co_wht_lines_status', '4');
                recordLog.setValue('custrecord_lmry_co_wht_lines_type', currentRCD.getValue('baserecordtype'));

                var idRecordLog = recordLog.save({ disableTriggers: true, ignoreMandatoryFields: true });

                log.debug('idRecordLog', idRecordLog);

                sleep(1000);

                window.location.href += '&cowht=' + currentRCD.id;


            } catch (err) {

                Library_Mail.sendemail2(' [ onclick_event_co_wht_lines ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');

            }

        }

        function sleep(milliseconds) {
            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > milliseconds) {
                    break;
                }
            }
        }

        return {
            pageInit: INVClnt_PageInit,
            fieldChanged: fieldChanged,
            //postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            //lineInit: lineInit,
            validateField: INVClnt_ValidateField,
            validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            saveRecord: INVClnt_SaveRecord,
            onclick_event_co_wht_lines: onclick_event_co_wht_lines
        };

    })

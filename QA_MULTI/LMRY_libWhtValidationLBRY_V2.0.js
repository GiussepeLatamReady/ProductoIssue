/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_libWhtValidationLBRY_V2.0.js                ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jun 20 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */

define(['./LMRY_libSendingEmailsLBRY_V2.0', './LMRY_libNumberInWordsLBRY_V2.0', 'N/log', 'N/record', 'N/search', 'N/runtime', 'N/format', './LMRY_CO_Duplicate_Credit_Memos_LBRY_V2.0'],

    function (Library_Mail, Library_Number, log, record, search, runtime, format, Library_Duplicate) {
        
        var LMRY_script = 'LMRY_libWhtValidationLBRY V2.0';
        var MEMO_WHT = 'Latam - WHT';
        var GENERATED_TRANSACTION = {
            'invoice': 'creditmemo', 'vendorbill': 'vendorcredit',
            'creditmemo': 'invoice', 'vendorcredit': 'vendorbill'
        };
        var FORMS = {
            'invoice': "custscript_lmry_wht_credit_memo",
            'vendorbill': "custscript_lmry_wht_vendor_credit",
            'creditmemo': "custscript_lmry_wht_invoice",
            'vendorcredit': "custscript_lmry_wht_vendor_bill"
        };
        var dynamicFields = {
            "custbody_lmry_co_retefte_amount": { base: "custpage_lmry_retefte_base", rate: "custpage_lmry_retefte_rate" },
            "custbody_lmry_co_reteiva_amount": { base: "custpage_lmry_reteiva_base", rate: "custpage_lmry_reteiva_rate" },
            "custbody_lmry_co_reteica_amount": { base: "custpage_lmry_reteica_base", rate: "custpage_lmry_reteica_rate" },
            "custbody_lmry_co_retecree_amount": { base: "custpage_lmry_retecree_base", rate: "custpage_lmry_retecree_rate" }
        };

        /* ------------------------------------------------------------------------------------------------------
         * Creacion del WHT Latam
         * -------------------------------------
         * -------------------------------------------------------------- */
        function Create_WHT_Latam(Transaction, ID, context) {
            var result = Library_Duplicate.Verification_Duplicate(context);
            log.debug('result', result);

            if (result.state == true) {
                log.debug('Son iguales');
                return true;
            }

            // Delete Journal
            Delete_JE(ID);

            if (Transaction == 'invoice') {
                // Delete Credit Memo
                Delete_CM('creditmemo', ID);
            }
            if (Transaction == 'vendorbill') {
                // Delete Vendor Credit
                Delete_CM('vendorcredit', ID);
            }

            // Abre la transaccion y actualiza campos
            var Obj_RCD = record.load({
                type: Transaction,
                id: ID
            });
            // Verifica si se va a generar WHT
            var createWHT = Obj_RCD.getValue({
                fieldId: 'custbody_lmry_apply_wht_code'
            });
            log.debug('createWHT', createWHT);

            if (createWHT == 'F' || createWHT == false) {
                createWHT = null;
                return true;
            }
            
            // Feature Set Period
            var featureSubs = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
            var subsidiary = featureSubs ? Obj_RCD.getValue({ fieldId: 'subsidiary' }) : 1;
            var licenses = Library_Mail.getLicenses(subsidiary);
            var fAccPeriod = Library_Mail.getAuthorization(1022, licenses);

            var setupTax = getSetupTax(featureSubs, subsidiary);
            
            var countryId = Obj_RCD.getValue({ fieldId: 'custbody_lmry_subsidiary_country' });
            log.debug('countryId', countryId);

            var array_wht = [];

            var valuesToSet = {};
            // Colombia
            if (countryId == "48") {
                var RETEICA = Obj_RCD.getValue({ fieldId: 'custbody_lmry_co_reteica' });
                if (RETEICA) array_wht.push(RETEICA);
                var RETEIVA = Obj_RCD.getValue({ fieldId: 'custbody_lmry_co_reteiva' });
                if (RETEIVA) array_wht.push(RETEIVA);
                var RETEFTE = Obj_RCD.getValue({ fieldId: 'custbody_lmry_co_retefte' });
                if (RETEFTE) array_wht.push(RETEFTE);
                var RETECRE = Obj_RCD.getValue({ fieldId: 'custbody_lmry_co_autoretecree' });
                if (RETECRE) array_wht.push(RETECRE);
            }

            // Bolivia
            if (countryId == "29") {
                var RETEIT = Obj_RCD.getValue({ fieldId: 'custbody_lmry_bo_autoreteit' });
                if (RETEIT) array_wht.push(RETEIT);
                if (Transaction == 'vendorbill' || Transaction == 'vendorcredit') {
                    var RETEIU = Obj_RCD.getValue({ fieldId: 'custbody_lmry_bo_reteiue' });
                    if (RETEIU) array_wht.push(RETEIU);
                }
            }

            // Paraguay
            if (countryId == "186") {
                var RETEIR = Obj_RCD.getValue({ fieldId: 'custbody_lmry_py_autoreteir' });
                if (RETEIR) array_wht.push(RETEIR);
                var RETEIV = Obj_RCD.getValue({ fieldId: 'custbody_lmry_py_reteiva' });
                if (RETEIV) array_wht.push(RETEIV);
            }

            // Ecuador
            if (countryId == "63") {
                var ECREIR = Obj_RCD.getValue({ fieldId: 'custbody_lmry_ec_reteir' });
                if (ECREIR) array_wht.push(ECREIR);
                var ECREIV = Obj_RCD.getValue({ fieldId: 'custbody_lmry_ec_reteiva' });
                if (ECREIV) array_wht.push(ECREIV);
            }

            log.debug('array_wht', array_wht);
            //Exchange RATE
            var exchangeRate = getExchangeRate(Obj_RCD);
            log.debug('getExchangeRate', exchangeRate);
            var dataWht = Search_WHT(Transaction, ID, Obj_RCD, array_wht, exchangeRate, setupTax);

            if (Transaction == 'invoice' || Transaction == 'vendorbill') {
                Create_WHT_1(ID, Obj_RCD, dataWht, fAccPeriod, setupTax);
            }

            if (Transaction == 'creditmemo' || Transaction == 'vendorcredit') {
                //Se obtienen los invoices/bills que se deben eliminar antes de generar las nuevas transacciones
                adjustWhts(Obj_RCD, dataWht, exchangeRate);
                var transToDelete = getTransactionsToDelete(ID, GENERATED_TRANSACTION[Transaction]);
                var transToApply = Create_WHT_2(ID, Obj_RCD, dataWht, fAccPeriod, setupTax);
                // Aplica la Bill y Invoice
                ApplyInvoice(ID, Transaction, transToApply, transToDelete);
            }

            var retentions = [];
            var retentionsValues = {};
            var discount = 0;
            for (var wht in dataWht) {
                if (!dataWht[wht].created) continue;
                if (dataWht[wht].type == "1") retentionsValues["ICA"] = { amount: dataWht[wht].local, id: wht };
                if (dataWht[wht].type == "2") retentionsValues["IVA"] = { amount: dataWht[wht].local, id: wht };
                if (dataWht[wht].type == "3") retentionsValues["FTE"] = { amount: dataWht[wht].local, id: wht };
                if (dataWht[wht].type == "4") retentionsValues["CREE"] = { amount: dataWht[wht].local, id: wht };

                valuesToSet[dataWht[wht].field] = dataWht[wht].local;

                if (countryId == "48" && (Transaction == 'invoice' || Transaction == 'creditmemo')) {
                    // Retencion aplicada directamente
                    if (dataWht[wht].kind == "1") {
                        discount += dataWht[wht].foreing;
                    }
                }
            }

            /* Case LR0014835 */
            if (!retentionsValues["ICA"]) valuesToSet["custbody_lmry_co_reteica_amount"] = 0;
            if (!retentionsValues["IVA"]) valuesToSet["custbody_lmry_co_reteiva_amount"] = 0;
            if (!retentionsValues["FTE"]) valuesToSet["custbody_lmry_co_retefte_amount"] = 0;
            if (!retentionsValues["CREE"]) valuesToSet["custbody_lmry_co_retecree_amount"] = 0;

            if (Object.keys(retentionsValues).length) {
                retentions.push(retentionsValues);
            }

            if (countryId == "48" && (Transaction == 'invoice' || Transaction == 'creditmemo')) {
                var monedaTexto = search.lookupFields({
                    type: search.Type.CURRENCY,
                    id: Obj_RCD.getValue({ fieldId: 'currency' }),
                    columns: ['name']
                });
                var imptotal = Obj_RCD.getValue({ fieldId: 'total' });
                imptotal = parseFloat(imptotal) - parseFloat(discount);
                var impletras = Library_Number.ConvNumeroLetraESP(imptotal, monedaTexto.name, '', 'Y');
                valuesToSet["custbody_lmry_pa_monto_letras"] = impletras;
            }

            if (retentions.length) {
                valuesToSet["custbody_lmry_installments_details"] = JSON.stringify(retentions);
            }
            log.debug('valuesToSet', valuesToSet);

            record.submitFields({
                type: Transaction,
                id: ID,
                values: valuesToSet,
                options: { enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true }
            });
        }

        /* ------------------------------------------------------------------------------------------------------
         * Realiza la busqueda en LatamReady WHT
         * --------------------------------------------------------------------------------------------------- */
        function Search_WHT(Transaction, ID, Obj_RCD, WHTID, exchangeRate, setupTax) {
            try {

                if (!WHTID.length) return {};
                /*if (WHTID == '' || WHTID == null) {
                    return { foreing: 0, local: 0 };
                }*/

                // Tipo de Transaccion
                var typetran = Obj_RCD.getValue({ fieldId: 'type' });
                log.debug('typetran', typetran);
                // Formato de Fechas
                var Field_DateTran = yyymmdd(Obj_RCD.getValue({ fieldId: 'trandate' }));
                log.debug('Field_DateTran', Field_DateTran);

                // Transaccion
                var savedsearch = search.load({ id: 'customsearch_lmry_wht_base' });

                savedsearch.columns.push(search.createColumn({ name: 'custrecord_lmry_wht_variable_rate' }));

                savedsearch.filters.push(search.createFilter({
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: 'F',
                }));
                savedsearch.filters.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: WHTID,
                }));

                var searchresult = savedsearch.run();

                var objResult = searchresult.getRange(0, 1000);
                log.debug('objResult', objResult);
                if (!objResult || !objResult.length) return {};

                var whtCodesData = {};
                log.debug('objResult length', objResult.length);
                for (var i = 0; i < objResult.length; i++) {
                    var columns = objResult[i].columns;
                    
                    // Internal ID
                    var Field_whtname = objResult[i].getValue('name');
                    var Field_Rate = 0;
                    if (objResult[i].getValue('custrecord_lmry_wht_coderate') != '' &&
                        objResult[i].getValue('custrecord_lmry_wht_coderate') != null) {
                        Field_Rate = parseFloat(objResult[i].getValue('custrecord_lmry_wht_coderate'));
                    }
                    var whtId = objResult[i].id;
                    var Field_whtkind = objResult[i].getValue('custrecord_lmry_wht_kind');
                    var Field_datfrom = objResult[i].getValue(columns[6]);
                    var Field_datuntil = objResult[i].getValue(columns[7]);
                    var Field_Custom = objResult[i].getValue(columns[4]);
                    var Field_Type = objResult[i].getValue('custrecord_lmry_wht_types');
                    var Field_crediacc = objResult[i].getValue('custrecord_lmry_wht_taxcredacc');
                    var Field_xliabacc = objResult[i].getValue('custrecord_lmry_wht_taxliabacc');

                    // Validacion de rango de fechas
                    if ((Field_datfrom == '' || Field_datfrom == null) ||
                        (Field_datuntil == '' || Field_datuntil == null) ||
                        (Field_datfrom > Field_DateTran || Field_DateTran > Field_datuntil)) {
                        continue;
                    }

                    var Field_Standar = '';
                    var Field_taxpoint = '';
                    var Available_onts = '';
                    var Field_itesales = '';

                    // Variables para Ventas
                    if (typetran == 'custinvc' || typetran == 'custcred') {
                        Field_Standar = objResult[i].getValue(columns[12]); // custrecord_lmry_wht_salebase
                        Field_taxpoint = objResult[i].getValue('custrecord_lmry_wht_saletaxpoint');
                        Available_onts = objResult[i].getValue('custrecord_lmry_wht_onsales');
                        Field_itesales = objResult[i].getValue('custrecord_lmry_wht_taxitem_sales');
                    }
                    // Variables para Compras
                    if (typetran == 'vendbill' || typetran == 'vendcred') {
                        Field_Standar = objResult[i].getValue(columns[16]); // custrecord_lmry_wht_purcbase
                        Field_taxpoint = objResult[i].getValue('custrecord_lmry_wht_purctaxpoint');
                        Available_onts = objResult[i].getValue('custrecord_lmry_wht_onpurchases');
                        Field_itesales = objResult[i].getValue('custrecord_lmry_wht_taxitem_purchase');
                    }

                    // Valida que la retencion sea a la transaccion, no al pago
                    if (Field_taxpoint != 1) {
                        continue;
                    }

                    // Valida si el campo standar esta configurado
                    if (Field_Standar == '' || Field_Standar == null ||
                        Available_onts == 'F' || Available_onts == false) {
                        continue;
                    }

                    var Field_cminbase = 0;
                    if (objResult[i].getValue('custrecord_lmry_wht_codeminbase') != '' &&
                        objResult[i].getValue('custrecord_lmry_wht_codeminbase') != null) {
                        Field_cminbase = parseFloat(objResult[i].getValue('custrecord_lmry_wht_codeminbase'));
                    }

                    var variable_rate = objResult[i].getValue("custrecord_lmry_wht_variable_rate");
                    var amount_wht = Number(Obj_RCD.getValue({ fieldId: Field_Custom })) || 0;
                    var dynamics = Obj_RCD.getValue({ fieldId: "custbody_lmry_features_active" });
                    var jsonFormat = dynamics ? JSON.parse(dynamics) : {};
                    var base_wht = dynamicFields[Field_Custom] ? (Number(jsonFormat[dynamicFields[Field_Custom].base]) || 0) : 0;
                    var rate_wht = dynamicFields[Field_Custom] ? (parseFloat(jsonFormat[dynamicFields[Field_Custom].rate]) || 0) : 0;
                    var apply_transaction = ['vendbill', 'vendcred'].indexOf(typetran) > -1;
                    log.debug("[variable_rate, amount_wht, base_wht, rate_wht, apply_transaction]", [variable_rate, amount_wht, base_wht, rate_wht, apply_transaction])
                    if (variable_rate && amount_wht && base_wht && rate_wht && apply_transaction) {
                        var surpass_minimum = base_wht >= Field_cminbase;
                        if (!surpass_minimum) continue;

                        var localamount = Obj_RCD.getValue({ fieldId: Field_Custom });
                        var foreingamount = round2(localamount);
                        foreingamount = foreingamount / exchangeRate;
                        foreingamount = round2(foreingamount);
                        var baseamount = round2(getBase(Field_Custom, Obj_RCD) / exchangeRate);

                        whtCodesData[whtId] = {
                            foreing: foreingamount,
                            local: localamount,
                            base: baseamount,
                            name: Field_whtname,
                            item: Field_itesales,
                            debit: Field_crediacc,
                            credit: Field_xliabacc,
                            field: Field_Custom,
                            kind: Field_whtkind,
                            type: Field_Type
                        };
                        continue;
                    }
                    log.debug('no tarifa variable', 'no');
                    
                    // Importe del campo Standart
                    var amount = 0;
                    var auximp = 0;
                    if (Field_Standar == 'subtotal' && (typetran == 'vendbill' || typetran == 'vendcred')) {
                        amount = parseFloat(Obj_RCD.getValue({ fieldId: 'total' })) - parseFloat(Obj_RCD.getValue({ fieldId: 'taxtotal' }));
                        amount = round2(amount);
                    } else {
                        amount = parseFloat(Obj_RCD.getValue({ fieldId: Field_Standar }));
                    }

                    /*if (Field_Standar == 'subtotal' && (typetran == 'custinvc' || typetran == 'custcred')) {
                        var discountamount = parseFloat(Obj_RCD.getValue({ fieldId: "discounttotal" })) || 0;
                        amount = round2(amount + discountamount);
                    }*/
                    var discountrate = Obj_RCD.getValue({ fieldId: "discountrate" }) || 0;
                    discountrate = parseFloat(discountrate);

                    if (setupTax["restrict"] && (typetran == 'custinvc' || typetran == 'custcred')) {
                        amount = getBaseWht(Field_Standar, Obj_RCD, exchangeRate, discountrate)
                    }
                    auximp = parseFloat(amount);

                    // Calculo de Campos
                    var amountresult = 0;
                    var amount_base = 0;
                    if (amount != '' && amount != null) {
                        if (setupTax["restrict"] && (typetran == 'custinvc' || typetran == 'custcred')) {
                            // Con tipo de cambio
                            amountresult = parseFloat(amount) * parseFloat(Field_Rate);
                            amountresult = parseFloat(amountresult) / 100;
                            //amountresult = amountresult * exchangeRate;
                            amountresult = round2(amountresult);

                            // Sin tipo de cambio
                            amount_base = parseFloat(amountresult) / exchangeRate;
                            amount_base = round2(amount_base);
                        } else {
                            // Sin tipo de cambio
                            amount_base = parseFloat(auximp) * parseFloat(Field_Rate);
                            amount_base = parseFloat(amount_base) / 100;
                            amount_base = round2(amount_base);
                            // Con tipo de cambio
                            amountresult = parseFloat(amount) * parseFloat(Field_Rate);
                            amountresult = parseFloat(amountresult) / 100;
                            amountresult = round2(amountresult);
                            amountresult = amountresult * exchangeRate;
                            amountresult = round2(amountresult);
                        }
                    }

                    // El importe debe ser mayor al minimo y mayor a cero
                    var tmpAmount = parseFloat(amount) * exchangeRate;
                    if ((tmpAmount >= parseFloat(Field_cminbase) && tmpAmount > 0) &&
                        parseFloat(amountresult) > 0) {

                        whtCodesData[whtId] = {
                            foreing: amount_base,
                            local: amountresult,
                            base: amount,
                            name: Field_whtname,
                            item: Field_itesales,
                            debit: Field_crediacc,
                            credit: Field_xliabacc,
                            field: Field_Custom,
                            kind: Field_whtkind,
                            type: Field_Type
                        };
                    }


                }
                
                return whtCodesData;
            } catch (err) {

                Library_Mail.sendemail('Search_WHT - Error: ' + err, LMRY_script);

                return {};
            }
        }

        /* ------------------------------------------------------------------------------------------------------
         * Applied to Invoice - Bill
         * Crea Transacciones en LatamReady WHT
         * --------------------------------------------------------------------------------------------------- */
        function Create_WHT_1(ID, Obj_RCD, WHTID, fAccPeriod, setupTax) {

            try {
                if (!Object.keys(WHTID).length) {
                    return true;
                }

                // Tipo de Transaccion
                var typetran = Obj_RCD.type;

                for (var wht in WHTID) {
                    /* ---------------------------------------------
                     * Create Credit Memo si Field_whtkind = 1
                     * ------------------------------------------ */
                    if (WHTID[wht].kind == "1") {
                        // Valida si el item que se va a popular estan configurado
                        if (WHTID[wht].item == '' || WHTID[wht].item == null) {
                            continue;
                        }

                        // Crea la transaccion para la retencion
                        var inRec = record.create({
                            type: GENERATED_TRANSACTION[typetran],
                            isDynamic: true
                        });

                        var Field_Formsdf = runtime.getCurrentScript().getParameter({ name: FORMS[typetran] });
                        // Formulario Personalizado
                        if (Field_Formsdf != '' && Field_Formsdf != null) {
                            inRec.setValue({
                                fieldId: 'customform',
                                value: Field_Formsdf
                            });
                        }
                        // Campos Standar de NetSuite
                        inRec.setValue({
                            fieldId: 'entity',
                            value: Obj_RCD.getValue({ fieldId: 'entity' })
                        });
                        inRec.setValue({
                            fieldId: 'subsidiary',
                            value: Obj_RCD.getValue({ fieldId: 'subsidiary' })
                        });
                        inRec.setValue({
                            fieldId: 'account',
                            value: Obj_RCD.getValue({ fieldId: 'account' })
                        });
                        if (WHTID[wht].name != '' && WHTID[wht].name != null) {
                            inRec.setValue({
                                fieldId: 'memo',
                                value: 'Latam - WHT ' + WHTID[wht].name
                            });
                        }
                        inRec.setValue({
                            fieldId: 'tranid',
                            value: 'LTMP-' + ID
                        });

                        var FormatoIn = Obj_RCD.getValue({ fieldId: 'trandate' });
                        var FormatoFecha = format.parse({ value: FormatoIn, type: format.Type.DATE });

                        inRec.setValue({
                            fieldId: 'trandate',
                            value: FormatoFecha
                        });

                        if (!fAccPeriod) {
                            inRec.setValue({
                                fieldId: 'postingperiod',
                                value: Obj_RCD.getValue({ fieldId: 'postingperiod' })
                            });
                        }

                        inRec.setValue({
                            fieldId: 'currency',
                            value: Obj_RCD.getValue({ fieldId: 'currency' })
                        });
                        inRec.setValue({
                            fieldId: 'exchangerate',
                            value: Obj_RCD.getValue({ fieldId: 'exchangerate' })
                        });

                        // Validacion si el Sales Rep esta acitvo
                        if (Obj_RCD.getValue({ fieldId: 'salesrep' }) != null &&
                            Obj_RCD.getValue({ fieldId: 'salesrep' }) != '') {
                            var booActive = search.lookupFields({
                                type: 'employee',
                                id: Obj_RCD.getValue({ fieldId: 'salesrep' }),
                                columns: ['isinactive', 'issalesrep']
                            });
                            var isinactive = booActive.isinactive;
                            var issalesrep = booActive.issalesrep;

                            // Valida si esta activo el empleado
                            if ((isinactive == 'F' || isinactive == false) &&
                                (issalesrep == 'T' || issalesrep == true)) {
                                inRec.setValue({
                                    fieldId: 'salesrep',
                                    value: Obj_RCD.getValue({ fieldId: 'salesrep' })
                                });
                            }
                        }

                        /***********************************************
                         * Segmentacion Contable de NetSuite
                         * Campos de cabecera obligatorios
                         * (Habilitados en prefencias de contabilidad)
                         **********************************************/

                        // Deparment
                        if (Obj_RCD.getValue({ fieldId: 'department' }) != '' &&
                            Obj_RCD.getValue({ fieldId: 'department' }) != null) {
                            inRec.setValue({ fieldId: 'department', value: Obj_RCD.getValue({ fieldId: 'department' }) });
                        }
                        // Class
                        if (Obj_RCD.getValue({ fieldId: 'class' }) != '' &&
                            Obj_RCD.getValue({ fieldId: 'class' }) != null) {
                            inRec.setValue({ fieldId: 'class', value: Obj_RCD.getValue({ fieldId: 'class' }) });
                        }
                        // Location
                        if (Obj_RCD.getValue({ fieldId: 'location' }) != '' &&
                            Obj_RCD.getValue({ fieldId: 'location' }) != null) {
                            inRec.setValue({ fieldId: 'location', value: Obj_RCD.getValue({ fieldId: 'location' }) });
                        }

                        // Field Head Department
                        var linDepar = Obj_RCD.getValue({
                            fieldId: 'department'
                        });
                        if (linDepar == '' || linDepar == null) {
                            linDepar = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'department', line: 0 });
                        }
                        if (linDepar == '' || linDepar == null) {
                            linDepar = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'department', line: 0 });
                        }
                        // Field Head Class
                        var linClass = Obj_RCD.getValue({
                            fieldId: 'class'
                        });
                        if (linClass == '' || linClass == null) {
                            linClass = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'class', line: 0 });
                        }
                        if (linClass == '' || linClass == null) {
                            linClass = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'class', line: 0 });
                        }
                        // Field Head Location
                        var linLocat = Obj_RCD.getValue({
                            fieldId: 'location'
                        });
                        if (linLocat == '' || linLocat == null) {
                            linLocat = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'location', line: 0 });
                        }
                        if (linLocat == '' || linLocat == null) {
                            linLocat = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'location', line: 0 });
                        }

                        // Flag para ejecutar WHT
                        inRec.setValue({
                            fieldId: 'custbody_lmry_apply_wht_code',
                            value: false
                        });
                        // Campos con los tipos de Retencion
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_reteica',
                            value: ""
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_reteiva',
                            value: ''
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_retefte',
                            value: ''
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_autoretecree',
                            value: ''
                        });
                        // Campos para los importes te retencion
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_reteica_amount',
                            value: 0
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_reteiva_amount',
                            value: 0
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_retefte_amount',
                            value: 0
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_retecree_amount',
                            value: 0
                        });

                        // Actualiza el campo transaccion de referencia
                        inRec.setValue({
                            fieldId: 'custbody_lmry_reference_transaction',
                            value: ID
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_reference_transaction_id',
                            value: ID
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_reference_entity',
                            value: Obj_RCD.getValue({ fieldId: 'entity' })
                        });

                        inRec.setValue({
                            fieldId: 'custbody_lmry_wht_base_amount',
                            value: WHTID[wht].base
                        });

                        // Lineas
                        inRec.selectNewLine({ sublistId: 'item' });
                        inRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', /*line: 0,*/ value: WHTID[wht].item });
                        inRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', /*line: 0,*/ value: 1 });
                        //inRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', /*line: 0,*/ value: Obj_RCD.getValue({ fieldId: 'location' }) });
                        inRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', /*line: 0,*/ value: -1 });
                        // Importe a insertaar
                        inRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', /*line: 0,*/ value: WHTID[wht].foreing });
                        

                        // 2019-08-09 Transaction Line TaxCode
                        if (setupTax["taxcode"] != '' && setupTax["taxcode"] != null) {
                            inRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', /*line: 0,*/ value: setupTax["taxcode"] });
                        }
                        // Campos de cabecera obligatorios (Habilitados en prefencias de contabilidad)
                        if (linDepar != '' && linDepar != null) {
                            inRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'department', /*line: 0,*/ value: linDepar });
                        }
                        if (linClass != '' && linClass != null) {
                            inRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', /*line: 0,*/ value: linClass });
                        }
                        if (linLocat != '' && linLocat != null) {
                            inRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', /*line: 0,*/ value: linLocat });
                        }

                        inRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_base_amount', /*line: 0,*/ value: WHTID[wht].base });
                        inRec.commitLine({ sublistId: 'item' });

                        // Aplicado a
                        var inLin = inRec.getLineCount({ sublistId: 'apply' });

                        // = = = = = = = = = = = = = = = = = = = = = = = = = = =
                        // 2021.02.26 : Desmarca el apply se ubiera uno asignado
                        // =  = = = = = = = = = = = = = = = = = = = = = = = = = =
                        for (var i = 0; i < inLin; i++) {
                            var idTran = inRec.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i });
                            if (idTran) {
                                inRec.selectLine({ sublistId: 'apply', line: i });
                                inRec.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', /*line: i,*/ value: false });
                                inRec.commitLine({ sublistId: 'apply' });
                            }
                        }

                        // 2021.02.25 : Se aplica la retencion a la transaccion
                        for (var i = 0; i < inLin; i++) {
                            var idTran = inRec.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
                            if (ID == idTran) {
                                inRec.selectLine({ sublistId: 'apply', line: i });
                                if (inRec.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i }) == 'F') {
                                    inRec.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', /*line: i,*/ value: 'T' });
                                } else {
                                    inRec.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', /*line: i,*/ value: true });
                                }
                                //inRec.setSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i, value: WHTID[wht].foreing });
                                inRec.commitLine({ sublistId: 'apply' });
                                break;
                            }
                        }

                        /* * * * * * * * * * * * * * * * * * * * * * * * * * *
                         * Fecha : 08 de Mayo de 2020
                         * Se agrego el siguiente parametro disableTriggers:true
                         * para evita le ejecucion de users events.
                         * * * * * * * * * * * * * * * * * * * * * * * * * * */

                        // Graba el Credit Memo
                        var newrec = inRec.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });

                        // Actualiza campos de cabecera
                        record.submitFields({
                            type: GENERATED_TRANSACTION[typetran],
                            id: newrec,
                            values: {
                                'tranid': 'LWHT ' + newrec
                            },
                            options: { enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true }
                        });

                        log.debug("newrec", newrec);
                        WHTID[wht].created = true;
                    }

                    /* ---------------------------------------------
                     * Create Journal si Field_whtkind = 2
                     * ------------------------------------------ */
                    if (WHTID[wht].kind == "2") {
                        var jeRec = record.create({
                            type: record.Type.JOURNAL_ENTRY,
                            isDynamic: true
                        })
                        // Formulario Personalizado
                        var Field_Formsdf = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_wht_journal_entry' });
                        if (Field_Formsdf != '' && Field_Formsdf != null) {
                            jeRec.setValue({ fieldId: 'customform', value: Field_Formsdf });
                        }
                        // Campos Standar de NetSuite
                        jeRec.setValue({
                            fieldId: 'subsidiary',
                            value: Obj_RCD.getValue({ fieldId: 'subsidiary' })
                        });
                        jeRec.setValue({
                            fieldId: 'trandate',
                            value: Obj_RCD.getValue({ fieldId: 'trandate' })
                        });
                        if (!fAccPeriod) {
                            jeRec.setValue({
                                fieldId: 'postingperiod',
                                value: Obj_RCD.getValue({ fieldId: 'postingperiod' })
                            });
                        }
                        // Tipo de cambio de la transaccion Origen
                        jeRec.setValue({
                            fieldId: 'currency',
                            value: Obj_RCD.getValue({ fieldId: 'currency' })
                        });
                        jeRec.setValue({
                            fieldId: 'exchangerate',
                            value: Obj_RCD.getValue({ fieldId: 'exchangerate' })
                        });

                        /***********************************************
                         * Segmentacion Contable de NetSuite
                         * Campos de cabecera obligatorios
                         * (Habilitados en prefencias de contabilidad)
                         **********************************************/
                        jeRec.setValue({
                            fieldId: 'department',
                            value: Obj_RCD.getValue({ fieldId: 'department' })
                        });
                        jeRec.setValue({
                            fieldId: 'class',
                            value: Obj_RCD.getValue({ fieldId: 'class' })
                        });
                        jeRec.setValue({
                            fieldId: 'location',
                            value: Obj_RCD.getValue({ fieldId: 'location' })
                        });

                        // Field Head Department
                        var linDepar = Obj_RCD.getValue({
                            fieldId: 'department'
                        });
                        if (linDepar == '' || linDepar == null) {
                            linDepar = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'department', line: 0 });
                        }
                        if (linDepar == '' || linDepar == null) {
                            linDepar = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'department', line: 0 });
                        }
                        // Field Head Class
                        var linClass = Obj_RCD.getValue({
                            fieldId: 'class'
                        });
                        if (linClass == '' || linClass == null) {
                            linClass = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'class', line: 0 });
                        }
                        if (linClass == '' || linClass == null) {
                            linClass = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'class', line: 0 });
                        }
                        // Field Head Location
                        var linLocat = Obj_RCD.getValue({
                            fieldId: 'location'
                        });
                        if (linLocat == '' || linLocat == null) {
                            linLocat = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'location', line: 0 });
                        }
                        if (linLocat == '' || linLocat == null) {
                            linLocat = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'location', line: 0 });
                        }
                        jeRec.setValue('bookje', false);
                        // Campos Latam Ready
                        jeRec.setValue({
                            fieldId: 'custbody_lmry_reference_transaction',
                            value: ID
                        });
                        jeRec.setValue({
                            fieldId: 'custbody_lmry_reference_transaction_id',
                            value: ID
                        });
                        jeRec.setValue({
                            fieldId: 'custbody_lmry_reference_entity',
                            value: Obj_RCD.getValue({ fieldId: 'entity' })
                        });

                        // Linea de debito
                        jeRec.selectNewLine({ sublistId: 'line' });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: WHTID[wht].debit });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: WHTID[wht].foreing });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: Obj_RCD.getValue({ fieldId: 'entity' }) });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: 'Latam - WHT ' + WHTID[wht].name });
                        // Departament, Class, Location
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: linDepar });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: linClass });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: linLocat });
                        jeRec.commitLine({ sublistId: 'line' });

                        //Linea de credito
                        jeRec.selectNewLine({ sublistId: 'line' });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: WHTID[wht].credit });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: WHTID[wht].foreing });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: Obj_RCD.getValue({ fieldId: 'entity' }) });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: 'Latam - WHT ' + WHTID[wht].name });
                        // Departament, Class, Location
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: linDepar });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: linClass });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: linLocat });
                        jeRec.commitLine({ sublistId: 'line' });

                        var journalApprovalFeat = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
                        if ((journalApprovalFeat == 'T' || journalApprovalFeat == true) && jeRec.getField({ fieldId: "approvalstatus" })) {
                            jeRec.setValue({ fieldId: 'approvalstatus', value: 2 });
                        }
                        /* * * * * * * * * * * * * * * * * * * * * * * * * * *
                            * Fecha : 08 de Mayo de 2020
                            * Se agrego el siguiente parametro disableTriggers:true
                            * para evita le ejecucion de users events.
                            * * * * * * * * * * * * * * * * * * * * * * * * * * */
                        // Graba el Journal
                        var newrec = jeRec.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });
                        record.submitFields({
                            type: record.Type.JOURNAL_ENTRY,
                            id: newrec,
                            values: { memo: 'Latam - WHT ' + WHTID[wht].name },
                            options: { disableTriggers: true }
                        });

                        WHTID[wht].created = true;
                    }
                }
                
            } catch (err) {
                // Debug
                Library_Mail.sendemail('Create_WHT_1 - Error: ' + err, LMRY_script);
            }
        }

        /* ------------------------------------------------------------------------------------------------------
         * Applied to Credit Memo - Bill Credit
         * Crea Transacciones en LatamReady WHT
         * --------------------------------------------------------------------------------------------------- */
        function Create_WHT_2(ID, Obj_RCD, WHTID, fAccPeriod, setupTax) {

            try {
                var retentions = [];
                if (!Object.keys(WHTID).length) {
                    return retentions;
                }

                // Tipo de Transaccion
                var typetran = Obj_RCD.type;

                for (var whtId in WHTID) {
                    /* ---------------------------------------------
                     * Create Credit Memo si Field_whtkind = 1
                     * ------------------------------------------ */
                    if (WHTID[whtId].kind == 1) {
                        // Valida si el item que se va a popular estan configurado
                        if (WHTID[whtId].item == '' || WHTID[whtId].item == null) {
                            continue;
                        }

                        // Crea la transaccion para la retencion
                        var inRec = record.create({
                            type: GENERATED_TRANSACTION[typetran]
                        });

                        var Field_Formsdf = runtime.getCurrentScript().getParameter({ name: FORMS[typetran] });
                        // Formulario Personalizado
                        if (Field_Formsdf != '' && Field_Formsdf != null) {
                            inRec.setValue({
                                fieldId: 'customform',
                                value: Field_Formsdf
                            });
                        }

                        var labelApproval = GENERATED_TRANSACTION[typetran] == "invoice" ? "CUSTOMAPPROVALCUSTINVC" : "CUSTOMAPPROVALVENDORBILL";
                        var approval = runtime.getCurrentScript().getParameter({ name: labelApproval });
                        var approvalField = inRec.getField({ fieldId: "approvalstatus" });
                        // Approval Status
                        if (approval && approvalField) {
                            inRec.setValue({
                                fieldId: "approvalstatus",
                                value: "2"
                            });
                        }
                        // Campos Standar de NetSuite
                        inRec.setValue({
                            fieldId: 'entity',
                            value: Obj_RCD.getValue({ fieldId: 'entity' })
                        });
                        inRec.setValue({
                            fieldId: 'subsidiary',
                            value: Obj_RCD.getValue({ fieldId: 'subsidiary' })
                        });
                        inRec.setValue({
                            fieldId: 'account',
                            value: Obj_RCD.getValue({ fieldId: 'account' })
                        });
                        if (WHTID[whtId].name != '' && WHTID[whtId].name != null) {
                            inRec.setValue({
                                fieldId: 'memo',
                                value: 'Latam - WHT ' + WHTID[whtId].name
                            });
                        }
                        inRec.setValue({
                            fieldId: 'tranid',
                            value: 'LTMP-' + ID
                        });

                        var FormatoIn = Obj_RCD.getValue({ fieldId: 'trandate' });
                        var FormatoFecha = format.parse({ value: FormatoIn, type: format.Type.DATE });

                        inRec.setValue({
                            fieldId: 'trandate',
                            value: FormatoFecha
                        });

                        if (!fAccPeriod) {
                            inRec.setValue({
                                fieldId: 'postingperiod',
                                value: Obj_RCD.getValue({ fieldId: 'postingperiod' })
                            });
                        }

                        inRec.setValue({
                            fieldId: 'currency',
                            value: Obj_RCD.getValue({ fieldId: 'currency' })
                        });
                        inRec.setValue({
                            fieldId: 'exchangerate',
                            value: Obj_RCD.getValue({ fieldId: 'exchangerate' })
                        });

                        // Validacion si el Sales Rep esta acitvo
                        if (Obj_RCD.getValue({ fieldId: 'salesrep' }) != null &&
                            Obj_RCD.getValue({ fieldId: 'salesrep' }) != '') {
                            var booActive = search.lookupFields({
                                type: 'employee',
                                id: Obj_RCD.getValue({ fieldId: 'salesrep' }),
                                columns: ['isinactive', 'issalesrep']
                            });
                            var isinactive = booActive.isinactive;
                            var issalesrep = booActive.issalesrep;

                            // Valida si esta activo el empleado
                            if ((isinactive == 'F' || isinactive == false) &&
                                (issalesrep == 'T' || issalesrep == true)) {
                                inRec.setValue({
                                    fieldId: 'salesrep',
                                    value: Obj_RCD.getValue({ fieldId: 'salesrep' })
                                });
                            }
                        }

                        /***********************************************
                         * Segmentacion Contable de NetSuite
                         * Campos de cabecera obligatorios
                         * (Habilitados en prefencias de contabilidad)
                         **********************************************/

                        // Deparment
                        if (Obj_RCD.getValue({ fieldId: 'department' }) != '' &&
                            Obj_RCD.getValue({ fieldId: 'department' }) != null) {
                            inRec.setValue({ fieldId: 'department', value: Obj_RCD.getValue({ fieldId: 'department' }) });
                        }
                        // Class
                        if (Obj_RCD.getValue({ fieldId: 'class' }) != '' &&
                            Obj_RCD.getValue({ fieldId: 'class' }) != null) {
                            inRec.setValue({ fieldId: 'class', value: Obj_RCD.getValue({ fieldId: 'class' }) });
                        }
                        // Location
                        if (Obj_RCD.getValue({ fieldId: 'location' }) != '' &&
                            Obj_RCD.getValue({ fieldId: 'location' }) != null) {
                            inRec.setValue({ fieldId: 'location', value: Obj_RCD.getValue({ fieldId: 'location' }) });
                        }

                        // Field Head Department
                        var linDepar = Obj_RCD.getValue({
                            fieldId: 'department'
                        });
                        if (linDepar == '' || linDepar == null) {
                            linDepar = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'department', line: 0 });
                        }
                        if (linDepar == '' || linDepar == null) {
                            linDepar = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'department', line: 0 });
                        }
                        // Field Head Class
                        var linClass = Obj_RCD.getValue({
                            fieldId: 'class'
                        });
                        if (linClass == '' || linClass == null) {
                            linClass = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'class', line: 0 });
                        }
                        if (linClass == '' || linClass == null) {
                            linClass = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'class', line: 0 });
                        }
                        // Field Head Location
                        var linLocat = Obj_RCD.getValue({
                            fieldId: 'location'
                        });
                        if (linLocat == '' || linLocat == null) {
                            linLocat = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'location', line: 0 });
                        }
                        if (linLocat == '' || linLocat == null) {
                            linLocat = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'location', line: 0 });
                        }

                        // Flag para ejecutar WHT
                        inRec.setValue({
                            fieldId: 'custbody_lmry_apply_wht_code',
                            value: false
                        });
                        // Campos con los tipos de Retencion
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_reteica',
                            value: ""
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_reteiva',
                            value: ''
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_retefte',
                            value: ''
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_autoretecree',
                            value: ''
                        });
                        // Campos para los importes te retencion
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_reteica_amount',
                            value: 0
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_reteiva_amount',
                            value: 0
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_retefte_amount',
                            value: 0
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_co_retecree_amount',
                            value: 0
                        });

                        // Actualiza el campo transaccion de referencia
                        inRec.setValue({
                            fieldId: 'custbody_lmry_reference_transaction',
                            value: ID
                        });
                        inRec.setValue({
                            fieldId: 'custbody_lmry_reference_transaction_id',
                            value: ID
                        });

                        inRec.setValue({
                            fieldId: 'custbody_lmry_wht_base_amount',
                            value: WHTID[whtId].base
                        });

                        // Lineas
                        inRec.setSublistValue({ sublistId: 'item', fieldId: 'item', line: 0, value: WHTID[whtId].item });
                        inRec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: 0, value: 1 });
                        /*inRec.setSublistValue({ sublistId: 'item', fieldId: 'location', line: 0, value: Obj_RCD.getValue({ fieldId: 'location' }) });*/
                        inRec.setSublistValue({ sublistId: 'item', fieldId: 'price', line: 0, value: -1 });
                        // Importe a insertaar
                        inRec.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: 0, value: WHTID[whtId].foreing });
                        

                        // 2019-08-09 Transaction Line TaxCode
                        if (setupTax["taxcode"] != '' && setupTax["taxcode"] != null) {
                            inRec.setSublistValue({ sublistId: 'item', fieldId: 'taxcode', line: 0, value: setupTax["taxcode"] });
                        }
                        // Campos de cabecera obligatorios (Habilitados en prefencias de contabilidad)
                        if (linDepar != '' && linDepar != null) {
                            inRec.setSublistValue({ sublistId: 'item', fieldId: 'department', line: 0, value: linDepar });
                        }
                        if (linClass != '' && linClass != null) {
                            inRec.setSublistValue({ sublistId: 'item', fieldId: 'class', line: 0, value: linClass });
                        }
                        if (linLocat != '' && linLocat != null) {
                            inRec.setSublistValue({ sublistId: 'item', fieldId: 'location', line: 0, value: linLocat });
                        }

                        inRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_base_amount', line: 0, value: WHTID[whtId].base });

                        // Aplicado a
                        var inLin = inRec.getLineCount({ sublistId: 'apply' });

                        // = = = = = = = = = = = = = = = = = = = = = = = = = = =
                        // 2021.02.26 : Desmarca el apply se ubiera uno asignado
                        // =  = = = = = = = = = = = = = = = = = = = = = = = = = =
                        for (var i = 0; i < inLin; i++) {
                            var idTran = inRec.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i });
                            if (idTran) {
                                inRec.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i, value: false });
                            }
                        }

                        // 2021.02.25 : Se aplica la retencion a la transaccion
                        for (var i = 0; i < inLin; i++) {
                            var idTran = inRec.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
                            if (ID == idTran) {
                                if (inRec.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i }) == 'F') {
                                    inRec.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i, value: 'T' });
                                } else {
                                    inRec.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i, value: true });
                                }
                                inRec.setSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i, value: WHTID[whtId].foreing });
                                break;
                            }
                        }

                        /* * * * * * * * * * * * * * * * * * * * * * * * * * *
                         * Fecha : 08 de Mayo de 2020
                         * Se agrego el siguiente parametro disableTriggers:true
                         * para evita le ejecucion de users events.
                         * * * * * * * * * * * * * * * * * * * * * * * * * * */

                        // Graba el Credit Memo
                        var newrec = inRec.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });

                        // Actualiza campos de cabecera
                        record.submitFields({
                            type: GENERATED_TRANSACTION[typetran],
                            id: newrec,
                            values: {
                                'tranid': 'LWHT ' + newrec
                            },
                            options: { enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true }
                        });

                        WHTID[whtId].created = true;
                        retentions.push(newrec);
                    }

                    /* ---------------------------------------------
                     * Create Journal si Field_whtkind = 2
                     * ------------------------------------------ */
                    if (WHTID[whtId].kind == 2) {
                        var jeRec = record.create({
                            type: record.Type.JOURNAL_ENTRY,
                            isDynamic: true
                        })
                        // Formulario Personalizado
                        var Field_Formsdf = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_wht_journal_entry' });
                        if (Field_Formsdf != '' && Field_Formsdf != null) {
                            jeRec.setValue({ fieldId: 'customform', value: Field_Formsdf });
                        }
                        // Campos Standar de NetSuite
                        jeRec.setValue({
                            fieldId: 'subsidiary',
                            value: Obj_RCD.getValue({ fieldId: 'subsidiary' })
                        });
                        jeRec.setValue({
                            fieldId: 'trandate',
                            value: Obj_RCD.getValue({ fieldId: 'trandate' })
                        });
                        if (!fAccPeriod) {
                            jeRec.setValue({
                                fieldId: 'postingperiod',
                                value: Obj_RCD.getValue({ fieldId: 'postingperiod' })
                            });
                        }
                        // Tipo de cambio de la transaccion Origen
                        jeRec.setValue({
                            fieldId: 'currency',
                            value: Obj_RCD.getValue({ fieldId: 'currency' })
                        });
                        jeRec.setValue({
                            fieldId: 'exchangerate',
                            value: Obj_RCD.getValue({ fieldId: 'exchangerate' })
                        });

                        /***********************************************
                         * Segmentacion Contable de NetSuite
                         * Campos de cabecera obligatorios
                         * (Habilitados en prefencias de contabilidad)
                         **********************************************/
                        jeRec.setValue({
                            fieldId: 'department',
                            value: Obj_RCD.getValue({ fieldId: 'department' })
                        });
                        jeRec.setValue({
                            fieldId: 'class',
                            value: Obj_RCD.getValue({ fieldId: 'class' })
                        });
                        jeRec.setValue({
                            fieldId: 'location',
                            value: Obj_RCD.getValue({ fieldId: 'location' })
                        });

                        // Field Head Department
                        var linDepar = Obj_RCD.getValue({
                            fieldId: 'department'
                        });
                        if (linDepar == '' || linDepar == null) {
                            linDepar = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'department', line: 0 });
                        }
                        if (linDepar == '' || linDepar == null) {
                            linDepar = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'department', line: 0 });
                        }
                        // Field Head Class
                        var linClass = Obj_RCD.getValue({
                            fieldId: 'class'
                        });
                        if (linClass == '' || linClass == null) {
                            linClass = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'class', line: 0 });
                        }
                        if (linClass == '' || linClass == null) {
                            linClass = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'class', line: 0 });
                        }
                        // Field Head Location
                        var linLocat = Obj_RCD.getValue({
                            fieldId: 'location'
                        });
                        if (linLocat == '' || linLocat == null) {
                            linLocat = Obj_RCD.getSublistValue({ sublistId: 'item', fieldId: 'location', line: 0 });
                        }
                        if (linLocat == '' || linLocat == null) {
                            linLocat = Obj_RCD.getSublistValue({ sublistId: 'expense', fieldId: 'location', line: 0 });
                        }
                        jeRec.setValue('bookje', false);
                        // Campos Latam Ready
                        jeRec.setValue({
                            fieldId: 'custbody_lmry_reference_transaction',
                            value: ID
                        });
                        jeRec.setValue({
                            fieldId: 'custbody_lmry_reference_transaction_id',
                            value: ID
                        });
                        jeRec.setValue({
                            fieldId: 'custbody_lmry_reference_entity',
                            value: Obj_RCD.getValue({ fieldId: 'entity' })
                        });

                        // Linea de debito
                        jeRec.selectNewLine({ sublistId: 'line' });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: WHTID[whtId].credit });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: WHTID[whtId].foreing });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: Obj_RCD.getValue({ fieldId: 'entity' }) });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: 'Latam - WHT ' + WHTID[whtId].name });
                        // Departament, Class, Location
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: linDepar });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: linClass });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: linLocat });
                        jeRec.commitLine({ sublistId: 'line' });

                        //Linea de credito
                        jeRec.selectNewLine({ sublistId: 'line' });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: WHTID[whtId].debit });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: WHTID[whtId].foreing });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: Obj_RCD.getValue({ fieldId: 'entity' }) });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: 'Latam - WHT ' + WHTID[whtId].name });
                        // Departament, Class, Location
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: linDepar });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: linClass });
                        jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: linLocat });
                        jeRec.commitLine({ sublistId: 'line' });

                        var journalApprovalFeat = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
                        if ((journalApprovalFeat == 'T' || journalApprovalFeat == true) && jeRec.getField({ fieldId: "approvalstatus" })) {
                            jeRec.setValue({ fieldId: 'approvalstatus', value: 2 });
                        }
                        /* * * * * * * * * * * * * * * * * * * * * * * * * * *
                         * Fecha : 08 de Mayo de 2020
                         * Se agrego el siguiente parametro disableTriggers:true
                         * para evita le ejecucion de users events.
                         * * * * * * * * * * * * * * * * * * * * * * * * * * */
                        // Graba el Journal
                        var newrec = jeRec.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });
                        record.submitFields({
                            type: record.Type.JOURNAL_ENTRY,
                            id: newrec,
                            values: { memo: 'Latam - WHT ' + WHTID[whtId].name },
                            options: { disableTriggers: true }
                        });
                        
                        WHTID[whtId].created = true;
                    }
                }

                return retentions;
            } catch (err) {
                // Debug
                Library_Mail.sendemail('Create_WHT_2 - Error: ' + err, LMRY_script);
                return [];
            }
        }

        /* ------------------------------------------------------------------------------------------------------
         * Aplica la Bill y Invoice => Credit Memo / Vendor Credit
         * --------------------------------------------------------------------------------------------------- */
        function ApplyInvoice(idTransaction, typeTransaction, transToApply, transToDelete) {
            try {
                log.debug('ApplyInvoice : idTransaction - ' + idTransaction, 'typeTransaction - ' + typeTransaction);

                var recTransaction = record.load({ type: typeTransaction, id: idTransaction, isDynamic: true });
                var numberApply = recTransaction.getLineCount({ sublistId: 'apply' });

                var applied = "";
                for (var i = 0; i < numberApply; i++) {
                    var apply = recTransaction.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i });
                    var recID = recTransaction.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
                    //Se desaplican los invoice/bills para poder eliminarlos despues
                    if (transToDelete.indexOf(Number(recID)) != -1) {
                        recTransaction.selectLine({ sublistId: 'apply', line: i });
                        recTransaction.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: false });
                    } else {
                        if (apply == 'T' || apply == true) {
                            recTransaction.selectLine({ sublistId: 'apply', line: i });
                            recTransaction.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: false });
                            applied = recID;
                        }
                    }
                }

                var appliedcount = 0;
                for (var i = numberApply - 1; i >= 0; i--) {
                    if (appliedcount == transToApply.length) break;

                    var apply = recTransaction.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i });
                    var recID = recTransaction.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
                    //se aplican las nuevas transacciones
                    if (transToApply.indexOf(Number(recID)) != -1) {
                        recTransaction.selectLine({ sublistId: 'apply', line: i });
                        recTransaction.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                        appliedcount++;
                    }
                }

                for (var i = 0; i < numberApply; i++) {
                    var apply = recTransaction.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i });
                    var recID = recTransaction.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });

                    //Se aplica los invoice/bills de la devolucion
                    if (applied == recID) {
                        recTransaction.selectLine({ sublistId: 'apply', line: i });
                        recTransaction.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                        break;
                    }
                    
                }

                /* * * * * * * * * * * * * * * * * * * * * * * * * * *
                 * Fecha : 08 de Mayo de 2020
                 * Se agrego el siguiente parametro disableTriggers:true
                 * para evita le ejecucion de users events.
                 * * * * * * * * * * * * * * * * * * * * * * * * * * */
                recTransaction.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });

                //Se eliminan las transacciones aplicadas antiguas
                for (var i = 0; i < transToDelete.length; i++) {
                    record.delete({
                        type: GENERATED_TRANSACTION[typeTransaction],
                        id: transToDelete[i]
                    });
                }
            } catch (err) {
                Library_Mail.sendemail('ApplyInvoice - Error: ' + err, LMRY_script);
            }

            return true;
        }

        function adjustWhts(recordObj, whts, exchangerate) {
            var createdfrom = recordObj.getValue('createdfrom');
            if (createdfrom) {
                var recordtype;
                search.create({
                    type:"transaction",
                    filters:[
                        ["internalid","anyof",createdfrom]
                    ],
                    columns:["recordtype"]
                }).run().each(function(result){
                    recordtype = result.getValue(result.columns[0]);
                });
                if (recordtype != "invoice" && recordtype != "vendorbill") return false;
                var numberApply = recordObj.getLineCount({ sublistId: 'apply' });
                var alreadyapplied = 0;
                var applied = 0;
                for (var i = numberApply - 1; i >= 0; i--) {
                    var recID = recordObj.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
                    //Se desaplican los invoice/bills para poder eliminarlos despues
                    if (createdfrom == recID) {
                        applied = recordObj.getSublistValue({ sublistId: 'apply', fieldId: 'due', line: i });
                        alreadyapplied = recordObj.getSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i });
                        break;
                    }
                }
                applied = Number(applied);
                alreadyapplied = Number(alreadyapplied);

                if (applied == alreadyapplied) {
                    var total = recordObj.getValue('total');
                    var accumulated = 0;
                    var contador = 0;
                    var whtTransaction = {};
                    for (var wht in whts) {
                        if (whts[wht].kind == "2") continue;
                        whtTransaction[wht] = whts[wht];
                    }

                    for (var wht in whtTransaction) {
                        accumulated += round2(whtTransaction[wht].foreing);
                        contador++;
                        if (contador == Object.keys(whtTransaction).length) {
                            var difference = round2(total - applied - accumulated);
                            if (difference) {
                                whts[wht].foreing += difference;
                                whts[wht].local = whts[wht].foreing * exchangerate;
                            }
                        }
                    }
                }
            }
        }

        function getTransactionsToDelete(idTransaction, typeTransaction) {
            var transactions = [];
            var searchTransactions = search.create({
                type: typeTransaction,
                filters: [
                    ['mainline', 'is', 'T'], 'AND',
                    ['custbody_lmry_reference_transaction_id', 'equalto', idTransaction], 'AND',
                    ['memo', 'startswith', MEMO_WHT]
                ],
                columns: ['internalid']
            });

            var results = searchTransactions.run().getRange(0, 1000);

            if (results && results.length) {
                for (var i = 0; i < results.length; i++) {
                    var internalid = results[i].getValue('internalid');
                    transactions.push(Number(internalid));
                }
            }
            return transactions;
        }

        function getExchangeRate(recordObj) {
            /*******************************************************************************************
             * Obtención del ExchangeRate de la transaccion o Multibook para la conversión a moneda base
             *******************************************************************************************/
            var featureMB = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });
            var featureSubs = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
            var exchangeRate = 1;
            var currency = recordObj.getValue({
                fieldId: 'currency'
            });
            var exchangerateTran = recordObj.getValue({
                fieldId: 'exchangerate'
            });
            var subsidiary = recordObj.getValue({
                fieldId: 'subsidiary'
            });

            var currencySetup = 0;
            var searchSetupSubsidiary = search.create({
                type: "customrecord_lmry_setup_tax_subsidiary",
                filters: [['isinactive', 'is', 'F']],
                columns: ['custrecord_lmry_setuptax_subsidiary', 'custrecord_lmry_setuptax_currency']
            });
            if (featureSubs) {
                searchSetupSubsidiary.filters.push(search.createFilter({
                    name: 'custrecord_lmry_setuptax_subsidiary',
                    operator: 'is',
                    values: subsidiary
                }));
            }
            searchSetupSubsidiary = searchSetupSubsidiary.run().getRange({
                start: 0,
                end: 1000
            });


            if (searchSetupSubsidiary.length != null && searchSetupSubsidiary.length != '') {
                currencySetup = searchSetupSubsidiary[0].getValue({
                    name: 'custrecord_lmry_setuptax_currency'
                });
            }

            if (featureSubs && featureMB) { // OneWorld y Multibook
                var currencySubs = search.lookupFields({
                    type: 'subsidiary',
                    id: subsidiary,
                    columns: ['currency']
                });
                currencySubs = currencySubs.currency[0].value;

                var lineasBook = recordObj.getLineCount({
                    sublistId: 'accountingbookdetail'
                });

                if (currencySubs != currencySetup && currencySetup != '' && currencySetup != null) {
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
                                break;
                            }
                        }
                    }
                } else { // No esta configurado Setup Tax Subsidiary
                    exchangeRate = exchangerateTran;
                }
            } else { // No es OneWorld o no tiene Multibook
                exchangeRate = exchangerateTran;
            }
            return exchangeRate;
        }

        /* ------------------------------------------------------------------------------------------------------
         * Formatea el campo fecha en YYYYMMDD
         * --------------------------------------------------------------------------------------------------- */
        function yyymmdd(date) {

            if (date == '' || date == null) {
                return '';
            }

            var year = date.getFullYear();

            var month = "" + (date.getMonth() + 1);

            if (month.length < 2)
                month = "0" + month;

            var date = "" + date.getDate();
            if (date.length < 2)
                date = "0" + date;

            var fe = '' + year + "" + month + "" + date;

            return fe;
        }

        function round2(num) {
            if (num >= 0) {
                return parseFloat(Math.round(parseFloat(num) * 1e2 + 1e-8) / 1e2);
            } else {
                return parseFloat(Math.round(parseFloat(num) * 1e2 - 1e-8) / 1e2);
            }
        }

        function createFields(serverWidget, form, recordObj, type) {
            if (runtime.executionContext === runtime.ContextType.USER_INTERFACE) {
                var fieldNames = [
                    { name: "custpage_lmry_retefte_base", type: serverWidget.FieldType.CURRENCY, label: "Latam - CO ReteFTE New Base" },
                    { name: "custpage_lmry_retefte_rate", type: serverWidget.FieldType.PERCENT, label: "Latam - CO ReteFTE New Rate" },
                    { name: "custpage_lmry_reteiva_base", type: serverWidget.FieldType.CURRENCY, label: "Latam - CO ReteIVA New Base" },
                    { name: "custpage_lmry_reteiva_rate", type: serverWidget.FieldType.PERCENT, label: "Latam - CO ReteIVA New Rate" },
                    { name: "custpage_lmry_reteica_base", type: serverWidget.FieldType.CURRENCY, label: "Latam - CO ReteICA New Base" },
                    { name: "custpage_lmry_reteica_rate", type: serverWidget.FieldType.PERCENT, label: "Latam - CO ReteICA New Rate" },
                    { name: "custpage_lmry_retecree_base", type: serverWidget.FieldType.CURRENCY, label: "Latam - CO ReteCREE New Base" },
                    { name: "custpage_lmry_retecree_rate", type: serverWidget.FieldType.PERCENT, label: "Latam - CO ReteCREE New Rate" }
                ]
                var valueData = recordObj.getValue("custbody_lmry_features_active");

                var dataJSON = valueData ? JSON.parse(valueData) : {};
                for (var i = 0; i < fieldNames.length; i++) {
                    var fieldObj = form.addField({ id: fieldNames[i].name, type: fieldNames[i].type, label: fieldNames[i].label });
                    fieldObj.setHelpText(fieldNames[i].name);
                    if (dataJSON[fieldNames[i].name]) {
                        fieldObj.defaultValue = dataJSON[fieldNames[i].name];
                    } else {
                        if (type == "view") fieldObj.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                    }
                }
            }
        }

        function setFieldValues(recordObj) {
            if (runtime.executionContext === runtime.ContextType.USER_INTERFACE) {
                var rfte_amount = recordObj.getValue("custbody_lmry_co_retefte_amount");
                var riva_amount = recordObj.getValue("custbody_lmry_co_reteiva_amount");
                var rica_amount = recordObj.getValue("custbody_lmry_co_reteica_amount");
                var rcree_amount = recordObj.getValue("custbody_lmry_co_retecree_amount");
                var rfte_base = Number(rfte_amount) ? recordObj.getValue("custpage_lmry_retefte_base") : 0;
                var rfte_rate = Number(rfte_amount) ? recordObj.getValue("custpage_lmry_retefte_rate") : 0;
                var riva_base = Number(riva_amount) ? recordObj.getValue("custpage_lmry_reteiva_base") : 0;
                var riva_rate = Number(riva_amount) ? recordObj.getValue("custpage_lmry_reteiva_rate") : 0;
                var rica_base = Number(rica_amount) ? recordObj.getValue("custpage_lmry_reteica_base") : 0;
                var rica_rate = Number(rica_amount) ? recordObj.getValue("custpage_lmry_reteica_rate") : 0;
                var rcree_base = Number(rcree_amount) ? recordObj.getValue("custpage_lmry_retecree_base") : 0;
                var rcree_rate = Number(rcree_amount) ? recordObj.getValue("custpage_lmry_retecree_rate") : 0;
                var dataJSON = {};
                if (rfte_base) dataJSON["custpage_lmry_retefte_base"] = rfte_base;
                if (rfte_rate) dataJSON["custpage_lmry_retefte_rate"] = rfte_rate;
                if (riva_base) dataJSON["custpage_lmry_reteiva_base"] = riva_base;
                if (riva_rate) dataJSON["custpage_lmry_reteiva_rate"] = riva_rate;
                if (rica_base) dataJSON["custpage_lmry_reteica_base"] = rica_base;
                if (rica_rate) dataJSON["custpage_lmry_reteica_rate"] = rica_rate;
                if (rcree_base) dataJSON["custpage_lmry_retecree_base"] = rcree_base;
                if (rcree_rate) dataJSON["custpage_lmry_retecree_rate"] = rcree_rate;

                if (Object.keys(dataJSON).length) {
                    recordObj.setValue("custbody_lmry_features_active", JSON.stringify(dataJSON));
                } else {
                    recordObj.setValue("custbody_lmry_features_active", "");
                }
            }
        }

        function getBase(key, recordObj) {
            var JsonValues = recordObj.getValue("custbody_lmry_features_active");
            JsonValues = JsonValues ? JSON.parse(JsonValues) : {};
            var jsonBase = {
                "custbody_lmry_co_retefte_amount": "custpage_lmry_retefte_base",
                "custbody_lmry_co_reteiva_amount": "custpage_lmry_reteiva_base",
                "custbody_lmry_co_reteica_amount": "custpage_lmry_reteica_base",
                "custbody_lmry_co_retecree_amount": "custpage_lmry_retecree_base"
            }
            return JsonValues[jsonBase[key]] || 0;
        }

        function getSetupTax(featureSubs, subsidiary) {
            var setupTax = {};
            var filters = [
                ["isinactive", "is", "F"]
            ]
            if (featureSubs) {
                filters.push("AND", ["custrecord_lmry_setuptax_subsidiary", "anyof", subsidiary]);
            }
            var search_lsts = search.create({
                type: "customrecord_lmry_setup_tax_subsidiary",
                filters: filters,
                columns: ["custrecord_lmry_setuptax_tax_code", "custrecord_lmry_setuptax_restrict_round"]
            });
            var result_lsts = search_lsts.run();
            var object_lsts = result_lsts.getRange(0, 10);
            if (object_lsts && object_lsts.length) {
                setupTax["taxcode"] = object_lsts[0].getValue('custrecord_lmry_setuptax_tax_code');
                setupTax["restrict"] = object_lsts[0].getValue('custrecord_lmry_setuptax_restrict_round');
            }
            return setupTax;
        }

        /* ------------------------------------------------------------------------------------------------------
         * Elimina los Journal Entry creados
         * --------------------------------------------------------------------------------------------------- */
        function Delete_JE(ID) {

            try {
                // Valida que el Internal ID no este vacio
                if (ID == '' || ID == null) {
                    return true;
                }
                // Filtros
                var filters = new Array();
                filters[0] = search.createFilter({
                    name: 'mainline',
                    operator: search.Operator.IS,
                    values: ['T']
                });
                filters[1] = search.createFilter({
                    name: 'custbody_lmry_reference_transaction_id',
                    operator: search.Operator.EQUALTO,
                    values: [ID]
                });

                // Columnas
                var columns = new Array();
                columns[0] = search.createColumn({
                    name: 'internalid',
                });
                // Realiza un busqueda para mostrar los campos
                var searchjournal = search.create({
                    type: search.Type.JOURNAL_ENTRY,
                    columns: columns,
                    filters: filters
                }).run().getRange(0, 1000);

                if (searchjournal && searchjournal.length) {
                    // Auxiliar ID
                    var alreadyDeleted = [];
                    for (var i = 0; i < searchjournal.length; i++) {
                        var idjournal = searchjournal[i].getValue('internalid');
                        if (alreadyDeleted.indexOf(idjournal) == -1) {
                            record.delete({
                                type: record.Type.JOURNAL_ENTRY,
                                id: idjournal
                            });
                            alreadyDeleted.push(idjournal);
                        }
                    }
                }
            } catch (err) {
                Library_Mail.sendemail('Delete_JE - Error: ' + err, LMRY_script);
            }
        }

        /* ------------------------------------------------------------------------------------------------------
         * Elimina los Credit Memos creados
         * --------------------------------------------------------------------------------------------------- */
        function Delete_CM(type, ID) {
            try {
                // Valida que el Internal ID no este vacio
                if (ID == '' || ID == null) {
                    return true;
                }
                /* Se realiza una busqueda para ver que campos se ocultan */
                // Filtros
                var filters = new Array();
                filters[0] = search.createFilter({
                    name: 'mainline',
                    operator: search.Operator.IS,
                    values: ['T']
                });
                filters[1] = search.createFilter({
                    name: 'custbody_lmry_reference_transaction_id',
                    operator: search.Operator.EQUALTO,
                    values: [ID]
                });
                filters[2] = search.createFilter({
                    name: 'memo',
                    operator: search.Operator.STARTSWITH,
                    values: ['Latam - WHT']
                });

                // Columnas
                var columns = new Array();
                columns[0] = search.createColumn({
                    name: 'internalid'
                });

                // Realiza un busqueda para mostrar los campos
                var searchcremem = search.create({
                    type: type,
                    columns: columns,
                    filters: filters
                }).run().getRange(0, 1000);

                if (searchcremem && searchcremem.length) {
                    for (var i = 0; i < searchcremem.length; i++) {
                        var idcremem = searchcremem[i].getValue('internalid');
                        record.delete({ type: type, id: idcremem });
                    }
                }
            } catch (err) {
                // Debug
                Library_Mail.sendemail('Delete_CM - ' + type + ' - Error: ' + err, LMRY_script);
            }
        }

        /* ------------------------------------------------------------------------------------------------------
         * Raliza una busqueda de dato2 en el arreglo dato1
         * --------------------------------------------------------------------------------------------------- */
        function seekarray(dato1, dato2) {
            var swresult = false;
            for (var i = 0; i < dato1.length; i++) {
                if (parseInt(dato1[i]) == parseInt(dato2)) {
                    swresult = true;
                    break;
                }
            }
            return swresult;
        }

        function getBaseWht(base, recordObj, exchangerate, discountrate) {
            var omitTypeItem = ["Group", "EndGroup"];
            var result = 0;
            var items = recordObj.getLineCount({ sublistId: "item" });
            for (var i = 0; i < items; i++) {
                var itemType = recordObj.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i });
                if (omitTypeItem.indexOf(itemType) != -1) continue;
                var amount = recordObj.getSublistValue({ sublistId: "item", fieldId: "amount", line: i });
                var rate = recordObj.getSublistValue({ sublistId: "item", fieldId: "taxrate1", line: i }) || 0;
                rate = parseFloat(rate);
                
                if (base == "subtotal") {
                    result += amount * ((100 + discountrate) / 100) * exchangerate;
                }
                if (base == "taxtotal") {
                    result += amount * ((100 + discountrate) / 100) * exchangerate * (rate / 100);
                }
                if (base == "total") {
                    result += amount * ((100 + discountrate) / 100) * exchangerate * (1 + rate / 100);
                }
            }
            
            return result;
        }

        return {
            Create_WHT_Latam: Create_WHT_Latam,
            Search_WHT: Search_WHT,
            Create_WHT_1: Create_WHT_1,
            Create_WHT_2: Create_WHT_2,
            ApplyInvoice: ApplyInvoice,
            Delete_JE: Delete_JE,
            Delete_CM: Delete_CM,
            seekarray: seekarray,
            yyymmdd: yyymmdd,
            getExchangeRate: getExchangeRate,
            getTransactionsToDelete: getTransactionsToDelete,
            round2: round2,
            createFields: createFields,
            setFieldValues: setFieldValues
        }
    });
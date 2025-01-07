/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_EntityURET_V2.0.js				            ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     17 ago 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

define(['N/search', 'N/runtime', 'N/ui/serverWidget', 'N/log', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_HideViewLBRY_V2.0', './Latam_Library/LMRY_UniversalSetting_LBRY'],

    function (search, runtime, serverWidget, log, Library_Mail, Library_HideView, library_Uni_Setting) {

        var LMRY_script = 'LMRY Entity URET V2.0';
        var LMRY_access = false;
        var LMRY_countr = new Array();
        var RCD = '';
        var isURET = '';
        var FORM = '';
        var licenses = [];
        var multiselect_br_exempt = '';
        var listBRExempt = {};


        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {
            try {
                isURET = scriptContext.type;
                FORM = scriptContext.form;
                RCD = scriptContext.newRecord;
                var LMRY_Result = new Array();

                var subsidiary = RCD.getValue('subsidiary');
                licenses = Library_Mail.getLicenses(subsidiary);

                var country = new Array();
                country[0] = '';
                country[1] = '';


                if (isURET == 'create') {
                    try {

                        var subsidiari = RCD.getValue({
                            fieldId: 'subsidiary'
                        });

                        if (subsidiari == '' || subsidiari == null) {
                            var userS = runtime.getCurrentUser();
                            subsidiari = userS.subsidiary;
                        }

                        if (subsidiari != '' && subsidiari != null) {
                            var filters = new Array();
                            filters[0] = search.createFilter({
                                name: 'internalid',
                                operator: search.Operator.ANYOF,
                                values: [subsidiari]
                            });
                            var columns = new Array();
                            columns[0] = search.createColumn({
                                name: 'country'
                            });

                            var getfields = search.create({
                                type: 'subsidiary',
                                columns: columns,
                                filters: filters
                            });
                            getfields = getfields.run().getRange(0, 1000);

                            if (getfields != '' && getfields != null) {
                                country[0] = getfields[0].getValue('country');
                                country[1] = getfields[0].getText('country');
                            }
                        }
                    } catch (err) {

                        country[0] = runtime.getCurrentScript().getParameter({
                            name: 'custscript_lmry_country_code_stlt'
                        });
                        country[1] = runtime.getCurrentScript().getParameter({
                            name: 'custscript_lmry_country_desc_stlt'
                        });
                    }

                    if (FORM != '' && FORM != null) {
                        Library_HideView.HideSubTab(FORM, country[1], RCD.type, licenses);
                    }
                }

                // Valida el Acceso
                LMRY_Result = ValidateAccessE(FORM, RCD.getValue({
                    fieldId: 'subsidiary'
                }));

                //Filtrado de campo "LATAM - BR EXEMPT TAX" de acuerdo al tipo de documento de identidad
                if (LMRY_Result[0] == 'BR' && LMRY_Result[2] && runtime.executionContext == 'USERINTERFACE') {
                    // 2020.12.16 : Only Customer
                    if ((isURET != 'view' && isURET != 'print') && RCD.type == 'customer') {

                        multiselect_br_exempt = FORM.addField({
                            id: 'custpage_br_exempt',
                            type: 'multiselect',
                            label: 'LATAM - BR EXEMPT TAX'
                        });

                        FORM.insertField({
                            field: multiselect_br_exempt,
                            nextfield: 'custentity_lmry_br_exempt_tax'
                        });

                        var docid = RCD.getValue('custentity_lmry_sunat_tipo_doc_id');
                        filtrarBRExempt(docid);

                        var exempt = RCD.getValue('custentity_lmry_br_exempt_tax');

                        if (exempt != null && exempt != '') {
                            RCD.setValue('custpage_br_exempt', exempt);
                        }

                        var exemptField = FORM.getField({
                            id: 'custentity_lmry_br_exempt_tax'
                        });

                        exemptField.updateDisplayType({
                            displayType: 'hidden'
                        });
                    }
                    // Only Customer
                }

                if (['edit', 'view', 'create', 'copy'].indexOf(scriptContext.type) > -1 && (RCD.type == 'customer')) {
                    //var form = scriptContext.form;
                    //var RCD = scriptContext.newRecord;
                    var isSuiteTax = runtime.isFeatureInEffect({ feature: 'tax_overhauling' });

                    var country = RCD.getValue({ fieldId: 'custentity_lmry_subsidiary_country' });
                    if (country == '30' && isSuiteTax) {
                        var info_tax = RCD.getValue({ fieldId: 'custentity_lmry_ei_entity_regtax' });
                        var array = new Array();
                        if (info_tax != null && info_tax != '') {
                            array = JSON.parse(info_tax);
                        }
                        var sublist = FORM.getSublist({
                            id: 'taxregistration'
                        });

                        sublist.addField({
                            id: 'custpage_col_muni_subs',
                            type: serverWidget.FieldType.TEXT,
                            label: 'Latam - Municipal Subscription'
                        });
                        sublist.addField({
                            id: 'custpage_col_insc_stadual',
                            type: serverWidget.FieldType.TEXT,
                            label: 'Latam - State Tax Subscription'
                        });

                        if (array.length > 0) {
                            for (var i = 0; i < sublist.lineCount; i++) {

                                var nexuid = sublist.getSublistValue({
                                    id: 'nexus',
                                    line: i
                                });
                                for (var j = 0; j < array.length; j++) {
                                    if (array[j].nexus == nexuid) {
                                        sublist.setSublistValue({
                                            id: 'custpage_col_muni_subs',
                                            line: i,
                                            value: array[j].muni
                                        });
                                        sublist.setSublistValue({
                                            id: 'custpage_col_insc_stadual',
                                            line: i,
                                            value: array[j].stadual
                                        });
                                        break;
                                    }
                                }
                            }
                        } else {
                            for (var i = 0; i < sublist.lineCount; i++) {
                                sublist.setSublistValue({
                                    id: 'custpage_col_muni_subs',
                                    line: i,
                                    value: ' '
                                });
                                sublist.setSublistValue({
                                    id: 'custpage_col_insc_stadual',
                                    line: i,
                                    value: ' '
                                });
                            }
                        }

                    }
                }


                //SOLO COLOMBIA Y CUSTOMER
                if (['edit', 'view', 'create', 'copy'].indexOf(scriptContext.type) > -1 && (RCD.type == 'customer') && RCD.getValue('custentity_lmry_subsidiary_country') == '48') {

                    var featurelang = runtime.getCurrentScript().getParameter({ name: 'LANGUAGE' });
                    featurelang = featurelang.substring(0, 2);

                    var agenteRetencion = FORM.getField('custentity_lmry_es_agente_retencion');

                    if (featurelang == 'es') {
                        agenteRetencion.label = 'Latam - CO Retenciones Masivas por Líneas';
                    } else {
                        agenteRetencion.label = 'Latam - CO Massive WHT by Lines';
                    }

                }

                //custpage de la SUNAT solo para PERU
                if ((isURET == 'create' || isURET == 'edit' || isURET == 'view') && LMRY_countr[0] == 'PE' && LMRY_access == true && RCD.type == 'customer') {
                    var lmry_exchange_rate = FORM.addField({
                        id: 'custpage_lmry_sunat_link_consulta_ruc',
                        label: 'Latam - Consulta RUC - SUNAT',
                        type: serverWidget.FieldType.INLINEHTML
                    }).defaultValue = '<p class="smallgraytextnolink" style="font-size:12px;">' + 'LATAM - CONSULTA RUC - SUNAT' + '</p><p style="font-weight:bold;font-size:12px">' + '<a href="http://www.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias" target="_blank" >http://www.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias</a>' + '</p>';
                }


                var featureCheck = Library_Mail.getAuthorization(733, licenses);

                if (featureCheck && Library_Mail.getAuthorization(26, licenses)) {
                    var person_type = RCD.getValue('custentity_lmry_pa_person_type')
                    var document_type = RCD.getValue('custentity_lmry_sunat_tipo_doc_id')
                    var entitycountry = RCD.getValue('custentity_lmry_country');
                    var documentTypeScriptId, entitycountryScriptId;
                    if (document_type) {
                        documentTypeScriptId = search.lookupFields({
                            type: 'customrecord_lmry_tipo_doc_iden',
                            id: document_type,
                            columns: ["scriptid"]
                        }).scriptid.toLowerCase();
                    }

                    if (entitycountry) {
                        entitycountryScriptId = search.lookupFields({
                            type: 'customrecord_lmry_mx_country',
                            id: entitycountry,
                            columns: ["scriptid"]
                        }).scriptid.toLowerCase();
                    }
                    var tax_number = RCD.getValue('vatregnumber')
                    var digit_verifier = RCD.getValue('custentity_lmry_digito_verificator')
                    //entityCountry = 21 y documentytpe = 12
                    if (entitycountryScriptId == "value_21_t1038906_417" && LMRY_Result[0] == 'CO' && person_type == 5 && documentTypeScriptId == "value_12_t1038906_417" && !isNaN(tax_number) && tax_number.length == 9 && digit_verifier == "") {
                        if (isURET == 'view' && RCD.type == 'customer') {
                            var featurelang = runtime.getCurrentScript().getParameter({ name: 'LANGUAGE' });
                            featurelang = featurelang.substring(0, 2);
                            var lblBtn = 'Verifier Digit';
                            if (featurelang == 'es') {
                                lblBtn = 'Digito Verificador';
                            }
                            if (featurelang == 'pt') {
                                lblBtn = "Dígito Verificador";
                            }
                            FORM.clientScriptModulePath = "./LMRY_EntityCLNT_V2.0.js";
                            FORM.addButton({
                                id: 'custpage_veri_digit',
                                label: lblBtn,
                                functionName: "generateVerifierDigit()"
                            });
                        }
                    }

                }
            } catch (err) {
                Library_Mail.sendemail('[beforeLoad] ' + err, LMRY_script);
            }
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
            try {
                var type = scriptContext.type;
                // 2020.12.18 - Validacion para oldRecord
                if (type != 'view' && type != 'create') {
                    var ObjRecord = scriptContext.newRecord;
                    var objrecordold = scriptContext.oldRecord;
                    var isSuiteTax = runtime.isFeatureInEffect({ feature: 'tax_overhauling' });
                    // Latam Entity - Subsidiary Country = 30 Brasil
                    var country = objrecordold.getValue({ fieldId: 'custentity_lmry_subsidiary_country' });
                    // Valida que no sea Contact
                    if ((country == '30' && isSuiteTax) && ObjRecord.type != 'contact') {
                        var numLines = ObjRecord.getLineCount({
                            sublistId: 'taxregistration'
                        });
                        var info_tax = new Array();

                        for (var i = 0; i < numLines; i++) {

                            var nexuid = ObjRecord.getSublistValue({
                                sublistId: 'taxregistration',
                                fieldId: 'nexus',
                                line: i
                            });

                            var cnpj = ObjRecord.getSublistValue({
                                sublistId: 'taxregistration',
                                fieldId: 'taxregistrationnumber',
                                line: i
                            });
                            var muni = ObjRecord.getSublistValue({
                                sublistId: 'taxregistration',
                                fieldId: 'custpage_col_muni_subs',
                                line: i
                            });

                            var stadual = ObjRecord.getSublistValue({
                                sublistId: 'taxregistration',
                                fieldId: 'custpage_col_insc_stadual',
                                line: i
                            });

                            var _muni, _nexu, _stadual, _cnpj;

                            if (muni != '' && muni != null) {
                                _muni = muni;
                            } else {
                                _muni = ' ';
                            }
                            if (nexuid != '' && nexuid != null) {
                                _nexu = nexuid;
                            } else {
                                _nexu = ' ';
                            }
                            if (stadual != '' && stadual != null) {
                                _stadual = stadual;
                            } else {
                                _stadual = ' ';
                            }
                            if (cnpj != '' && cnpj != null) {
                                _cnpj = cnpj;
                            } else {
                                _cnpj = ' ';
                            }

                            info_tax[i] = {
                                nexus: _nexu,
                                muni: _muni,
                                stadual: _stadual,
                                cnpj: _cnpj
                            }
                        }
                        var info_tax = JSON.stringify(info_tax);
                        log.error("info_tax: ", info_tax);
                        ObjRecord.setValue({ fieldId: 'custentity_lmry_ei_entity_regtax', value: info_tax });
                    }
                }
            } catch (err2) {
                log.error('beforeSubmit', err2);
            }

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {

        }

        function ValidateAccessE(FORM, ID) {
            try {
                var LMRY_Result = new Array();

                if (isURET == 'view') {
                    Library_Mail.onFieldsHide(1, FORM, true);
                }

                // Inicializa variables Locales y Globales
                LMRY_access = false;
                LMRY_countr = Library_Mail.Validate_Country(ID);

                // Verifica que el arreglo este lleno
                if (LMRY_countr.length < 1) {
                    LMRY_Result[2] = LMRY_access;
                    return LMRY_Result;
                }
                if ((isURET == 'view' || isURET == 'edit' || isURET == 'copy') && (FORM != '' && FORM != null)) {
                    Library_HideView.HideSubTab(FORM, LMRY_countr[1], FORM.type, licenses);
                }
                LMRY_access = Library_Mail.getCountryOfAccess(LMRY_countr, licenses);

                // Solo si tiene acceso
                if (LMRY_access == true) {
                    if (isURET == 'view') {
                        Library_Mail.onFieldsDisplayE(FORM, LMRY_countr[1], true);
                    }
                }

                if (isURET == 'view' || isURET == 'edit') {
                    // 2020.12.16 : LatamReady - Automatic Set
                    if ((RCD.type != 'customer') || (!library_Uni_Setting.search_entity(licenses))) {
                        var sublist = FORM.getSublist({
                            id: 'recmachcustrecord_lmry_us_entity'
                        });
                        try {
                            sublist.displayType = serverWidget.SublistDisplayType.HIDDEN;
                        } catch (err) {
                            log.error('Only Information', 'LatamReady - Automatic Set : HIDDEN');
                        }
                    }
                    // Only Customer
                }



                // Asigna Valores
                LMRY_Result[0] = LMRY_countr[0];
                LMRY_Result[1] = LMRY_countr[1];
                LMRY_Result[2] = LMRY_access;

            } catch (err) {
                Library_Mail.sendemail(' [ ValidateAccessE ] ' + err, LMRY_script);
            }

            return LMRY_Result;
        }


        function cargarCustpage() {

            //Búsqueda record "LatamReady - Setup WHT Sub Type"

            var searchBRExempt = search.create({
                type: "customrecord_lmry_ar_wht_type",
                filters: [
                    ["custrecord_lmry_withholding_country", "anyof", "30"],
                    "AND",
                    ["custrecord_lmry_type", "anyof", "8"]
                ],
                columns: ["internalid", "name", "custrecord_lmry_iden_docu"]
            });

            var results = searchBRExempt.run().getRange(0, 30);
            if (results && results.length) {
                for (var i = 0; i < results.length; i++) {
                    var identity = results[i].getValue('custrecord_lmry_iden_docu');
                    var docTag = results[i].getValue('name');
                    if (identity) {
                        listBRExempt[docTag] = {};
                        listBRExempt[docTag]['identity'] = results[i].getValue('custrecord_lmry_iden_docu');
                        listBRExempt[docTag]['id'] = results[i].getValue('internalid');

                    }
                }
            }
            return results;

        }

        //Logíca para filtrado de campo LATAM - BR EXEMPT TAX
        function filtrarBRExempt(docid) {
            var results = cargarCustpage();
            var flag = false;
            multiselect_br_exempt.addSelectOption({
                value: 0,
                text: '&nbsp;'
            });

            /*Setea el campo LATAM - BR EXEMPT TAX si encuentra el documento de identidad configurado
            en el record "LatamReady - Setup WHT Sub Type" */
            if (Object.keys(listBRExempt).length && docid) {
                for (var taxTag in listBRExempt) {
                    if (listBRExempt[taxTag]['identity'] == docid) {
                        flag = true;
                        multiselect_br_exempt.addSelectOption({
                            value: listBRExempt[taxTag]['id'],
                            text: taxTag
                        });

                    }
                }
            }

            /*Al no encontrar un tipo de documento de identidad configurado en el record "LatamReady - Setup WHT Sub Type"
            se llenará el campo LATAM - BR EXEMPT TAX con todos los impuestos existentes */
            if (flag == false) {
                if (results && results.length) {
                    for (var i = 0; i < results.length; i++) {
                        multiselect_br_exempt.addSelectOption({
                            value: results[i].getValue('internalid'),
                            text: results[i].getValue('name')
                        });

                    }
                }
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            // afterSubmit: afterSubmit
        };

    });
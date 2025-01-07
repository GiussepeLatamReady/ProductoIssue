/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_VendorPaymentURET_V2.0.js                   ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jul 11 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

define(['N/transaction', 'N/config', 'N/ui/serverWidget', 'N/record', 'N/runtime', 'N/search', 'N/format',
    './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_libWhtPaymentLBRY_V2.0',
    './Latam_Library/LMRY_libDIOTLBRY_V2.0', './Latam_Library/LMRY_HideViewLBRY_V2.0',
    './Latam_Library/LMRY_GLImpact_LBRY_V2.0', './WTH_Library/LMRY_TransferenciaIVA_LBRY_V2.0',
    './Latam_Library/LMRY_Automatic_Installment_LBRY_v2.0', './Latam_Library/LMRY_MX_ST_DIOT_LBRY_V2.0',
    './Latam_Library/LMRY_ValidateClosePeriod_LBRY_V2.0', './WTH_Library/LMRY_PE_WHT_Payment_LBRY_V2.0',
    './Latam_Library/LMRY_Custom_ExchangeRate_Field_LBRY_V2.0.js'
],

    function (transaction, config, serverWidget, record, runtime, search, format, library, library1, libraryDIOT, Library_HideView,
        libraryGLImpact, lbry_traslado_IVA, lbry_installment, ST_Library_DIOT, LibraryValidatePeriod, Library_PE_WHT, Library_ExchangeRate_Field) {

        var LMRY_script = 'LatamReady - Vendor Payment URET V2.0';
        var recordObj = null;
        var form = '';
        var type = '';
        var isURET = true;
        var scriptObj = runtime.getCurrentScript();
        var exchangeCertificado = 1;
        var ST_FEATURE = false;

        //Declaracion de Variables
        var featureLang = runtime.getCurrentScript().getParameter({
            name: 'LANGUAGE'
        });
        featureLang = featureLang.substring(0, 2);

        var valorporc = null;
        var WTHolding = null;
        var valorporcA = null;
        var WTHoldingA = null;
        var valorporcB = null;
        var WTHoldingB = null;
        var correlativo = null;
        var correlativo1 = null;
        var correlativo2 = null;
        var correlativoA = null;
        var correlativoB = null;
        var fechaObtenida = null;
        var auxiliarTieneDosTasas = '00';
        var numeroActual = null;
        var cantDigitos = null;
        var idValorActual = null;
        var montoBaseRetencion = 0;
        /**
         * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
         * @appliedtorecord recordType
         *
         * @param {String} type Operation types: create, edit, view, copy, print, email
         * @param {nlobjForm} form Current form
         * @param {nlobjRequest} request Request object
         * @returns {Void}
         */
        function beforeLoad(context) {
            try {
                var id_bill = '';
                recordObj = context.newRecord;
                type = context.type;
                var typeDoc = recordObj.type;

                var form = context.form;
                form.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';
                var country = new Array();
                country[0] = '';
                country[1] = '';
                var subsidiary = recordObj.getValue({
                    fieldId: 'subsidiary'
                });

                licenses = library.getLicenses(subsidiary);

                /* Validacion 04/02/22 */
                // Campo - Valida Periodo cerrado
                var LockedPeriodField = form.addField({
                    id: 'custpage_lockedperiod',
                    label: 'Locked Period',
                    type: serverWidget.FieldType.CHECKBOX
                });
                LockedPeriodField.defaultValue = 'F';
                LockedPeriodField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
                /* Fin validacion 04/02/22 */

                if (context.type == 'create') {

                    var companyInformation = config.load({
                        type: config.Type.COMPANY_INFORMATION
                    });

                    var baseCurrency = companyInformation.getValue({
                        fieldId: 'basecurrency'
                    });

                    var lmry_basecurrency = form.addField({
                        id: 'custpage_lmry_basecurrency',
                        label: 'Latam - Base Currency',
                        type: serverWidget.FieldType.TEXT
                    }).defaultValue = baseCurrency;

                    Library_ExchangeRate_Field.ws_field(form);
                }

                // Solo al momento de crear
                if (context.type == 'create') {
                    try {

                        if (runtime.executionContext == 'USERINTERFACE') {
                            var id_bill = context.request.parameters.bill;
                        }

                        if (subsidiary == '' || subsidiary == null) {
                            var userS = runtime.getCurrentUser();
                            subsidiary = userS.subsidiary;
                        }

                        if (subsidiary != '' && subsidiary != null) {
                            var filters = new Array();
                            filters[0] = search.createFilter({
                                name: 'internalid',
                                operator: search.Operator.ANYOF,
                                values: [subsidiary]
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

                    if (form != '' && form != null) {
                        Library_HideView.HideSubTab(form, country[1], recordObj.type, licenses);
                    }
                }

                // Diferente de Print and Email
                if (type != 'print' && type != 'email') {
                    // Valida que tenga acceso
                    var LMRY_Result = ValidateAccess(subsidiary, form, licenses);

                    // Solo para Peru
                    if (LMRY_Result[0] == 'PE' && recordObj.getValue({
                        fieldId: 'custbody_lmry_serie_retencion'
                    }) != null) {
                        if (library.getAuthorization(1, licenses) == true) {
                            onClick(type, form);
                        }
                    }

                    // Solo para Mexico
                    if (LMRY_Result[0] == 'MX') {
                        // Lista de estado de proceso
                        var procesado = recordObj.getValue({
                            fieldId: 'custbody_lmry_schedule_transfer_of_iva'
                        });
                        // Verifica si esta procesado y si esta activo el feature de bloqueo de transaccion
                        if (procesado == 1) {
                            if (library.getAuthorization(97, licenses)) {
                                form.removeButton('edit');
                            }
                        }
                    }
                }
                // Si es nuevo, editado o copiado
                if ((type == 'create' || type == 'edit') &&
                    runtime.executionContext == 'USERINTERFACE') {

                    // Valida el campo Subsidiary Country


                    var valor_Field = recordObj.getValue('custbody_lmry_subsidiary_country');
                    var dat_Field = recordObj.getField('custbody_lmry_subsidiary_country');

                    if (valor_Field != '') {
                        if (dat_Field != null && dat_Field != '') {
                            var Field = form.getField('custbody_lmry_subsidiary_country');
                            Field.updateDisplayType({
                                displayType: 'disabled'
                            });
                        }
                    }
                    // Solo al momento de editar
                    /*if (type == 'edit') {
                      if (LMRY_Result[2]) {
                        // Entity
                        var entity = form.getField({
                          id: 'entity'
                        });
                        if (entity != null && entity != '') {
                          entity.updateDisplayType({
                            displayType: 'disabled'
                          });
                        }
          
                        // Subsidiary
                        var subsidiary = form.getField({
                          id: 'subsidiary'
                        });
                        if (subsidiary != null && subsidiary != '') {
                          subsidiary.updateDisplayType({
                            displayType: 'disabled'
                          });
                        } // Subsidiary
                      }
          
                    }*/

                    /************************************* MODIFICACIÓN ***********************************************************
                       - Fecha: 07/05/2020
                       - Descripción: Deshabilita el campo Entity, en caso este activado el feature Disable Entity
                    **************************************************************************************************************/

                    if (type == 'edit' || (type == 'create' && id_bill != null && id_bill != '')) {
                        if (LMRY_Result[2] && library.disableField(typeDoc, LMRY_Result[0], licenses)) {

                            var entity = form.getField({
                                id: 'entity'
                            });

                            if (entity != null && entity != '') {
                                entity.updateDisplayType({
                                    displayType: 'disabled'
                                });
                            }
                            if (type == 'edit') {
                                var subsidiaria = form.getField({
                                    id: 'subsidiary'
                                });

                                if (subsidiaria != null && subsidiaria != '') {
                                    subsidiaria.updateDisplayType({
                                        displayType: 'disabled'
                                    });
                                }
                            }


                        }
                    }

                    // ********************************************FIN MODIFICACIÓN ***********************************************
                }

                if (type == 'view' && runtime.executionContext == 'USERINTERFACE') {
                    // Lógica GL Impact
                    var btnGl = libraryGLImpact.featureGLImpact(recordObj, 'vendorpayment');
                    if (btnGl == 1) {
                        if (featureLang == 'es') {
                            form.addButton({
                                id: 'custpage_id_button_imp',
                                label: 'IMPRIMIR GL',
                                functionName: 'onclick_event_gl_impact()'
                            });
                        } else {
                            form.addButton({
                                id: 'custpage_id_button_imp',
                                label: 'PRINT GL',
                                functionName: 'onclick_event_gl_impact()'
                            });
                        }

                    }
                }
            } catch (err) {
                recordObj = context.newRecord;
                library.sendemail2(' [ beforeLoad ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
            }

        }

        /**
         * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
         * @appliedtorecord recordType
         *
         * @param {String} type Operation types: create, edit, delete, xedit
         *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
         *                      pack, ship (IF)
         *                      markcomplete (Call, Task)
         *                      reassign (Case)
         *                      editforecast (Opp, Estimate)
         * @returns {Void}
         */
        function beforeSubmit(context) {
            try {
                recordObj = context.newRecord;
                type = context.type;
                var form = context.form;
                var subsidiary = recordObj.getValue({
                    fieldId: 'subsidiary'
                });

                licenses = library.getLicenses(subsidiary);

                var LMRY_RecoID = recordObj.id;
                var LMRY_Result = ValidateAccess(subsidiary, form, licenses);

                /* Validacion 04/02/22 */
                // Libreria - Valida Periodo cerrado
                if (LibraryValidatePeriod.validatePeriod(recordObj.getValue('postingperiod'), licenses, LMRY_Result[0], 'purchase')) return true;
                /* Fin validacion 04/02/22 */

                if (type == 'delete') {

                    // Solo para Peru - Retenciones
                    if (LMRY_Result[0] == 'PE') {
                        if (library.getAuthorization(1, licenses) == true) {
                            var serieCompr = recordObj.getValue({
                                fieldId: 'custbody_lmry_serie_retencion'
                            });
                            if (serieCompr != null && serieCompr != '') {
                                //RECUPERA EL VALOR ACTUAL
                                buscaCorrelativo(serieCompr);

                                //ELIMINANDO DATOS DEL TIPO DE REGISTRO
                                var filters = new Array();
                                filters[0] = search.createFilter({
                                    name: 'custrecord_lmry_pago_relacionado',
                                    operator: search.Operator.ANYOF,
                                    values: [LMRY_RecoID]
                                });
                                filters[1] = search.createFilter({
                                    name: 'isinactive',
                                    operator: 'is',
                                    values: 'F'
                                });

                                var transacdata = search.create({
                                    type: 'customrecord_lmry_comprobante_retencion',
                                    columns: ['internalid', 'custrecord_lmry_comp_retencion'],
                                    filters: filters
                                });

                                var transacresult = transacdata.run().getRange(0, 1000);

                                /*
                                #######################################################
                                        MODIFICACACION REALIZADA EL DIA 10-08-2017
                                #######################################################
                                */
                                if (transacresult != null && transacresult != '') {

                                    //NUMERO CORRELATIVO A ELIMINAR
                                    var numEliminado;

                                    for (var cuenta = 0; cuenta < transacresult.length; cuenta++) {
                                        var columns = transacresult[cuenta].columns;
                                        //numEliminado = nlapiLookupField('customrecord_lmry_comprobante_retencion',transacdata[cuenta].getValue('internalid'),'custrecord_lmry_comp_retencion');
                                        numEliminado = parseFloat(transacresult[cuenta].getValue(columns[1]));

                                        //ELIMINACION POR EL ID INTERNO DE LA LISTA COMPROB RETENCION
                                        var featureRecord = record.delete({
                                            type: 'customrecord_lmry_comprobante_retencion',
                                            id: transacresult[cuenta].getValue(columns[0])
                                        });
                                    }

                                    //COMPARA SI EL NUMERO DE RETENCION A ELIMINAR ES EL ACTUAL
                                    if (numEliminado == numeroActual) {

                                        //TRAE LOS VALORES DE LA BUSQUEDA DE LOS ULTIMOS 4 MESES
                                        var busqueda = search.load({
                                            id: 'customsearch_lmry_ultimas_reten'
                                        });
                                        var filtersBu = search.createFilter({
                                            name: 'custrecord_lmry_serie_retencion',
                                            operator: search.Operator.ANYOF,
                                            values: [serieCompr]
                                        });
                                        busqueda.filters.push(filtersBu);
                                        /* ********************************************************
                                         * 28.04.2020 Validacion para identificar si la busqueda
                                         * tiene resultados
                                         * old => if (results != null && results.length > 0) {
                                         ******************************************************* */
                                        var results = busqueda.run().getRange(0, 1000);
                                        if (results != null && results != '') {
                                            var bandera = true;
                                            //ES EL NUEVO VALOR DEL NUMERO CORRELATIVO
                                            var numeroCorrelativo;

                                            //COMPARA ITERATIVAMENTE HASTA ENCONTRAR EL 1ER DISTINTO
                                            for (var i = 0; bandera && i < results.length; i++) {
                                                numeroCorrelativo = parseFloat(results[i].getValue('custrecord_lmry_comp_retencion'));
                                                if (numeroCorrelativo != numEliminado) {
                                                    bandera = false;
                                                }
                                            }

                                            var registroAux = record.load({
                                                type: 'customrecord_lmry_serie_compro_retencion',
                                                id: idValorActual[0].value
                                            });
                                            registroAux.setValue({
                                                fieldId: 'custrecord_lmry_valor_actual',
                                                value: numeroCorrelativo
                                            });

                                            registroAux.save();
                                        }
                                    }
                                }

                                //######################################################


                                //QUITANDO VALORES DE RETENCION A LAS TRANSACCIONES APLICADAS
                                var cantAplic = recordObj.getLineCount({
                                    sublistId: 'apply'
                                });
                                for (var cuentaDocAplicado = 0; cuentaDocAplicado < cantAplic; cuentaDocAplicado++) {
                                    var aplicar = recordObj.getSublistValue({
                                        sublistId: 'apply',
                                        fieldId: 'apply',
                                        line: cuentaDocAplicado
                                    });
                                    if (aplicar == 'T' || aplicar == true) {
                                        var vendorBillIdx = recordObj.getSublistValue({
                                            sublistId: 'apply',
                                            fieldId: 'internalid',
                                            line: cuentaDocAplicado
                                        });
                                        // CARGAMOS LOS DATOS DE LA TRANSACCION
                                        var recSOx = 0;
                                        var searchVendor = search.lookupFields({
                                            type: 'vendorbill',
                                            id: vendorBillIdx,
                                            columns: ['entity', 'account']
                                        });
                                        var tipotranrelated = '';
                                        if (searchVendor.entity != null || searchVendor.account != null) {
                                            recSOx = record.load({
                                                type: 'vendorbill',
                                                id: vendorBillIdx
                                            });
                                            encontroTransaccion = true;
                                        } else {
                                            var creditEntity = search.lookupFields({
                                                type: 'vendorcredit',
                                                id: vendorBillIdx,
                                                columns: ['entity']
                                            });
                                            if (creditEntity.entity != null) {
                                                recSOx = record.load({
                                                    type: 'vendorcredit',
                                                    id: vendorBillIdx
                                                });
                                                encontroTransaccion = true;
                                            } else {
                                                var expenseEntity = search.lookupFields({
                                                    type: 'expensereport',
                                                    id: vendorBillIdx,
                                                    columns: ['entity']
                                                });
                                                if (expenseEntity.entity != null) {
                                                    recSOx = record.load({
                                                        type: 'expensereport',
                                                        id: vendorBillIdx
                                                    });
                                                    tipotranrelated = 'expensereport';
                                                    encontroTransaccion = true;
                                                } else {
                                                    encontroTransaccion = false;
                                                }
                                            }
                                        }
                                        if (tipotranrelated != 'expensereport') {
                                            var cantItemx = recSOx.getLineCount({
                                                sublistId: 'item'
                                            });
                                            for (var a = 0; a < cantItemx; a++) {
                                                recSOx.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_4601_witaxapplies',
                                                    line: a,
                                                    value: false
                                                });
                                                recSOx.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_4601_witaxcode',
                                                    line: a,
                                                    value: ''
                                                });
                                                recSOx.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_4601_witaxrate',
                                                    line: a,
                                                    value: ''
                                                });
                                                recSOx.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_4601_witaxbaseamount',
                                                    line: a,
                                                    value: ''
                                                });
                                                recSOx.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_4601_witaxamount',
                                                    line: a,
                                                    value: ''
                                                });
                                            }
                                        }

                                        var cantExpnx = recSOx.getLineCount({
                                            sublistId: 'expense'
                                        });

                                        for (var b = 0; b < cantExpnx; b++) {
                                            recSOx.setSublistValue({
                                                sublistId: 'expense',
                                                fieldId: 'custcol_4601_witaxapplies',
                                                line: b,
                                                value: false
                                            });
                                            recSOx.setSublistValue({
                                                sublistId: 'expense',
                                                fieldId: 'custcol_4601_witaxcode',
                                                line: b,
                                                value: ''
                                            });
                                            recSOx.setSublistValue({
                                                sublistId: 'expense',
                                                fieldId: 'custcol_4601_witaxrate',
                                                line: b,
                                                value: ''
                                            });
                                            recSOx.setSublistValue({
                                                sublistId: 'expense',
                                                fieldId: 'custcol_4601_witaxbaseamount',
                                                line: b,
                                                value: ''
                                            });
                                            recSOx.setSublistValue({
                                                sublistId: 'expense',
                                                fieldId: 'custcol_4601_witaxamount',
                                                line: b,
                                                value: ''
                                            });
                                        }
                                        recSOx.save();
                                    }
                                }
                            }
                        }
                    }

                    if (LMRY_Result[0] == 'MX' && (library.getAuthorization(243, licenses) == true || library.getAuthorization(814, licenses) == true)) {
                        lbry_traslado_IVA.deleteTransactionIVA(context);
                    }

                } //FIN DELETE


                // Diferente Delete y View
                if (type != 'delete' && type != 'view') {
                    /**********************************************************************
                    * Title : Uso de Installment para llenado de campos
                    * User  : Richard Galvez Lopez
                    * Date  : 05/03/2020
                    /**********************************************************************/
                    if (runtime.isFeatureInEffect('installments')) {
                        if (library.getAuthorization(439, licenses) == true) {
                            lbry_installment.updateInstallment(context.newRecord);
                        }
                    }
                    /**********************************************************************/
                } // Diferente Delete y View

            } catch (err) {
                recordObj = context.newRecord;
                library.sendemail2(' [ beforeSubmit ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
            }
        }

        /**
         * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
         * @appliedtorecord recordType
         *
         * @param {String} type Operation types: create, edit, delete, xedit,
         *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
         *                      pack, ship (IF only)
         *                      dropship, specialorder, orderitems (PO only)
         *                      paybills (vendor payments)
         * @returns {Void}
         */
        function afterSubmit(context) {
            try {
                type = context.type;
                recordObj = context.newRecord;
                var form = context.form;

                ST_FEATURE = runtime.isFeatureInEffect({
                    feature: "tax_overhauling"
                });

                var subsidiary = recordObj.getValue({
                    fieldId: 'subsidiary'
                });

                licenses = library.getLicenses(subsidiary);

                var LMRY_Result = ValidateAccess(subsidiary, form, licenses);

                /* Validacion 04/02/22 */
                // Libreria - Valida Periodo cerrado
                if (LibraryValidatePeriod.validatePeriod(recordObj.getValue('postingperiod'), licenses, LMRY_Result[0], 'purchase')) return true;
                /* Fin validacion 04/02/22 */

                if (['create', 'edit', 'paybills'].indexOf(type) > -1) {
                    if (type == 'create') {
                        if (recordObj.id == '' || recordObj.id == null || recordObj.id == 0) {
                            return true;
                        }
                        recordObj = record.load({
                            type: recordObj.type,
                            id: recordObj.id,
                            isDynamic: false
                        });

                    }

                    if (LMRY_Result[0] == 'MX') {
                        if (library.getAuthorization(151, licenses) == true) {
                            if (ST_FEATURE === true || ST_FEATURE === "T") {
                                ST_Library_DIOT.CalculoDIOT(recordObj);
                            } else {
                                libraryDIOT.CalculoDIOT(recordObj);
                            }
                        } else {
                            if (library.getAuthorization(814, licenses) == true || library.getAuthorization(243, licenses) == true) {
                                if (ST_FEATURE === true || ST_FEATURE === "T") {
                                    ST_Library_DIOT.CalculoDIOT(recordObj);
                                } else {
                                    libraryDIOT.CalculoDIOT(recordObj);
                                }
                            }
                        }

                        if (library.getAuthorization(243, licenses) == true || library.getAuthorization(814, licenses) == true) {
                            lbry_traslado_IVA.afterSubmitTrasladoIva(context);
                        }

                    }

                    var internalID = recordObj.id;

                    // Para Colombia, Bolivia y Paraguay - Enabled Feature WHT Latam
                    /*if (LMRY_Result[0] == 'CO' || LMRY_Result[0] == 'BO' || LMRY_Result[0] == 'PY') {
                      if (library.getAuthorization(27) == true || library.getAuthorization(46) == true || library.getAuthorization(47) == true) {
                        library1.Create_WHT_Payment_Latam('vendorpayment', recordObj.id);
                      }
                    }*/

                    // Solo para Peru - Retenciones en compras
                    if ((type == 'create') && LMRY_Result[0] == 'PE') {
                        Library_PE_WHT.createWHT(internalID);
                    }
                }

                //RETENCIONES BRAZIL, VOID PAYMENT - VOID JOURNAL
                if ((type == 'edit' || type == 'delete') && LMRY_Result[0] == 'BR' && library.getAuthorization(464, licenses) == true) {

                    var memoWHT = '';
                    if (type == 'edit') {
                        var recordWHT = record.load({
                            type: recordObj.type,
                            id: recordObj.id,
                            isDynamic: false
                        });
                        memoWHT = recordWHT.getValue('voided');
                    }

                    if ((memoWHT == true || memoWHT == 'T') || type == 'delete') {

                        var searchBRLog = search.create({
                            type: 'customrecord_lmry_br_wht_purchase_log',
                            columns: ['custrecord_lmry_br_wht_log_ids', 'custrecord_lmry_br_wht_log_journal', 'custrecord_lmry_br_wht_log_id_br', 'custrecord_lmry_br_wht_journal_reclassif'],
                            filters: [{
                                name: 'custrecord_lmry_br_wht_log_id_payment',
                                operator: 'is',
                                values: recordObj.id
                            }]
                        })

                        var resultBRLog = searchBRLog.run().getRange({
                            start: 0,
                            end: 1
                        });

                        if (resultBRLog != null && resultBRLog.length == 1) {
                            var journal = resultBRLog[0].getValue('custrecord_lmry_br_wht_log_journal');
                            var journal_reclassif = resultBRLog[0].getValue('custrecord_lmry_br_wht_journal_reclassif');
                            var billsMultaInteres = resultBRLog[0].getValue('custrecord_lmry_br_wht_log_ids');
                            var brTransaction = resultBRLog[0].getValue('custrecord_lmry_br_wht_log_id_br');

                            if (journal) {
                                if (type == 'delete') {
                                    record.delete({
                                        type: 'journalentry',
                                        id: journal
                                    });
                                } else {
                                    transaction.void({
                                        type: 'journalentry',
                                        id: journal
                                    });
                                }
                            }

                            if (journal_reclassif) {
                                if (type == 'delete') {
                                    record.delete({
                                        type: 'journalentry',
                                        id: journal_reclassif
                                    });
                                } else {
                                    transaction.void({
                                        type: 'journalentry',
                                        id: journal_reclassif
                                    });
                                }
                            }

                            if (billsMultaInteres) {
                                billsMultaInteres = billsMultaInteres.split('|');
                                for (var i = 0; i < billsMultaInteres.length - 1; i++) {
                                    if (type == 'delete') {
                                        record.delete({
                                            type: 'vendorbill',
                                            id: billsMultaInteres[i]
                                        });
                                    } else {
                                        transaction.void({
                                            type: 'vendorbill',
                                            id: billsMultaInteres[i]
                                        });
                                    }
                                }
                            }

                            if (brTransaction) {
                                var brTransaction = brTransaction.split('|');
                                for (var i = 0; i < brTransaction.length - 1; i++) {
                                    var brTransactionAux = brTransaction[i].split(';');

                                    var recordBR = search.lookupFields({
                                        type: 'customrecord_lmry_br_transaction_fields',
                                        id: brTransactionAux[2],
                                        columns: ['custrecord_lmry_br_multa', 'custrecord_lmry_br_interes']
                                    });

                                    var newMulta = '',
                                        newInteres = '';

                                    (parseFloat(recordBR.custrecord_lmry_br_multa) > 0) ? newMulta = recordBR.custrecord_lmry_br_multa : newMulta = 0;
                                    (parseFloat(recordBR.custrecord_lmry_br_interes) > 0) ? newInteres = recordBR.custrecord_lmry_br_interes : newInteres = 0;

                                    if (parseFloat(brTransactionAux[0]) > 0) {
                                        newMulta = parseFloat(recordBR.custrecord_lmry_br_multa) - parseFloat(brTransactionAux[0]);
                                    }

                                    if (parseFloat(brTransactionAux[1]) > 0) {
                                        newInteres = parseFloat(recordBR.custrecord_lmry_br_interes) - parseFloat(brTransactionAux[1]);
                                    }

                                    record.submitFields({
                                        type: 'customrecord_lmry_br_transaction_fields',
                                        id: brTransactionAux[2],
                                        values: {
                                            custrecord_lmry_br_multa: newMulta,
                                            custrecord_lmry_br_interes: newInteres
                                        }
                                    });

                                }
                            }

                        } //FIN SI EL PAGO ESTA EN EL BR WHT PURCHASE LOG


                    } //FIN SI ES VOIDED

                } // FIN SI ES BRAZIL WHT PURCHASE


            } catch (err) {
                recordObj = context.newRecord;
                library.sendemail2(' [ afterSubmit ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
            }
            return true;
        }

        /* ------------------------------------------------------------------------------------------------------
         * Funciones solo para Peru - Retenciones:
         *  LatamReady - Serie Comprob Retencion
         * 		- buscaCorrelativo
         * 		- asignaCorrelativo
         * 		- buscaImpuestos
         * 		- validaFecha
         * --------------------------------------------------------------------------------------------------- */
        function buscaCorrelativo(idSerie) {
            var seriecompret = search.lookupFields({
                type: 'customrecord_lmry_serie_compro_retencion',
                id: idSerie,
                columns: ['custrecord_lmry_valor_actual', 'custrecord_lmry_cant_digitos', 'internalid']
            });
            numeroActual = parseFloat(seriecompret.custrecord_lmry_valor_actual);
            cantDigitos = seriecompret.custrecord_lmry_cant_digitos;
            idValorActual = seriecompret.internalid;
        }

        /* ------------------------------------------------------------------------------------------------------
         * A la variable featureId se le asigna el valore que le corresponde
         * --------------------------------------------------------------------------------------------------- */
        function ValidateAccess(ID, form, licenses) {
            var LMRY_access = false;
            var LMRY_countr = new Array();
            var LMRY_Result = new Array();
            try {
                // Oculta todos los campos de cabecera Latam
                if (type == 'view') {
                    library.onFieldsHide([2], form, isURET);
                }

                // Inicializa variables Locales y Globales
                LMRY_countr = library.Validate_Country(ID);
                // Verifica que el arreglo este lleno
                if (LMRY_countr.length < 1) {
                    return true;
                }
                if ((type == 'view' || type == 'edit') && (form != '' && form != null)) {
                    Library_HideView.HideSubTab(form, LMRY_countr[1], recordObj.type, licenses);
                }
                LMRY_access = library.getCountryOfAccess(LMRY_countr, licenses);

                // Solo si tiene acceso
                if (LMRY_access == true) {
                    // Solo en ver
                    if (type == 'view') {
                        library.onFieldsDisplayBody(form, LMRY_countr[1], 'custrecord_lmry_on_bill_payment', isURET);
                    }

                    // valida si es agente de rentencion
                    var EsAgente = IsAgenteReten(ID);
                    if (EsAgente == 'F' || EsAgente == 'f' || EsAgente == false) {

                        // Oculta el campo
                        var Field = recordObj.getField({
                            fieldId: 'custbody_lmry_serie_retencion'
                        });
                        if (Field != null && Field != '') {
                            Field.isDisplay = false;
                        }
                    }
                }

                // Asigna Valores
                LMRY_Result[0] = LMRY_countr[0];
                LMRY_Result[1] = LMRY_countr[1];
                LMRY_Result[2] = LMRY_access;
            } catch (err) {
                library.sendemail2(' [ ValidateAccess ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
            }

            return LMRY_Result;
        }

        function IsAgenteReten(IdSubsidiary) {
            var IsAgente = 'F';
            //if ( request.getMethod() == 'GET' ) {

            var featuresubs = runtime.isFeatureInEffect({
                feature: 'SUBSIDIARIES'
            });
            if (featuresubs == true) {
                if (IdSubsidiary != '' && IdSubsidiary != null) {
                    IsAgente = search.lookupFields({
                        type: 'subsidiary',
                        id: IdSubsidiary,
                        columns: ['custrecord_lmry_agente_de_retencion']
                    });
                    IsAgente = IsAgente.custrecord_lmry_agente_de_retencion;
                }
            } else {
                IsAgente = scriptObj.getParameter({
                    name: 'custscript_lmry_agente_de_retencion'
                });
            }

            return IsAgente;
        }

        function onClick(type, form) {
            if ((runtime.executionContext === runtime.ContextType.USER_INTERFACE) && (type == 'view')) {

                form.addButton({
                    id: 'custpage_Add',
                    label: 'Imprimir Comp. Retencion',
                    functionName: 'onclick_event_pagoProv()'
                });
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        }
    });
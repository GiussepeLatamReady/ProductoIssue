/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for Transaction Vendor Bill                    ||
||                                                              ||
||  File Name: LMRY_VendorBillCLNT_V2.0.js                      ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Set 22 2017  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search', 'N/currentRecord', 'N/url', 'N/translation', 'N/https', 'N/runtime', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0',
  './Latam_Library/LMRY_libNumberInWordsLBRY_V2.0', './Latam_Library/LMRY_Val_TransactionLBRY_V2.0',
  './Latam_Library/LMRY_ExchangeRate_LBRY_V2.0', './Latam_Library/LMRY_AlertTraductorPurchase_LBRY_V2.0',
  './Latam_Library/LMRY_Automatic_Installment_LBRY_v2.0', './Latam_Library/LMRY_Validate_TranID_LBRY', './Latam_Library/LMRY_WebService_LBRY_v2.0.js',
  './Latam_Library/LMRY_ST_Transaction_ConfigFields_LBRY_V2.0', './Latam_Library/LMRY_BR_ValidateDuplicate_LBRY_V2.0', './Latam_Library/LMRY_libToolsFunctionsLBRY_V2.0', './Latam_Library/LMRY_KofaxIntegrations_LBRY_V2.0'
],

  function (log, record, search, currentRecord, url, translation, https, runtime, library, library1, library2, library_ExchRate, libAlert, lbry_installment, lbry_valTranID, LR_webService, ST_ConfigFields, LbryBRDuplicate, libtools, kofaxLibrary) {

    //comentado
    var scriptObj = runtime.getCurrentScript();
    var LMRY_script = 'LatamReady - Vendor Bill CLNT V2.0';
    var LMRY_access = false;
    var LMRY_countr = new Array();
    var Val_Campos = new Array();
    var Val_Campos_Linea = new Array();
    // Primera carga del pageInit
    var booPageIni = false;
    // Numero interno del PreImpreso
    var co_internalid = 0;
    var Field = null;
    var recordObj;
    var flag = false;
    var type = '';
    var mode = '';
    var Language = '';
    var licenses = [];
    //POPUP
    var current_sublist = '';
    var current_line = '';
    var idcurrencyUSD = 0;
    var flag_currencyUSD = false;

    // Suitetax
    var ST_FEATURE = false;

    var featuresubs = runtime.isFeatureInEffect({
      feature: 'SUBSIDIARIES'
    });

    // Validacion si tiene activado el Feature

    /**
     * The recordType (internal id) corresponds to the "Applied To" record in your
     * script deployment.
     *
     * @appliedtorecord recordType
     *
     * @param {String}
     *            type Access mode: create, copy, edit
     * @returns {Void}
     */


    function pageInit(context) {
      try {

        // Primera encarg
        booPageIni = true;

        Language = scriptObj.getParameter({
          name: 'LANGUAGE'
        });
        Language = Language.substring(0, 2);
        type = context.mode;
        mode = type;
        recordObj = context.currentRecord;

        var subsidiaria = recordObj.getValue({
          fieldId: 'subsidiary'
        });

        licenses = library.getLicenses(subsidiaria);

        if (type == 'create' || type == 'copy') {
          var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
          lmry_exchange_rate_field.isDisplay = false;
          var lmry_basecurrency = recordObj.getField('custpage_lmry_basecurrency');
          lmry_basecurrency.isDisplay = false;

          if (recordObj.getValue('entity') != '' && recordObj.getValue('entity') != null) {
            ws_exchange_rate();
          }
        }

        if (type == 'create') {
          var status = recordObj.getField('custpage_uni_set_status');
          if (status != '' && status != null) {
            status.isDisplay = false;
          }
        }

        // Valida el Access
        ValidateAccessVB(subsidiaria);

        if (!library.getAuthorization(117, licenses)) { //CO - Retenciones Manuales
          Field = recordObj.getField({
            fieldId: 'custbody_lmry_reference_transaction'
          });
          if (Field != '' && Field != null) {
            Field.isDisabled = true;
          }
          Field = recordObj.getField({ // - Argentina
            fieldId: 'custbody_lmry_reference_transaction_id'
          });
          if (Field != '' && Field != null) {
            Field.isDisabled = true;
          }
        }

        //Desactiva nuevo campo Latam - Porcentaje Detraccion - Peru
        if (LMRY_countr[0] == 'PE' && LMRY_countr[2] == true && LMRY_access == true) {
          Field = recordObj.getField({
            fieldId: 'custbody_lmry_porcentaje_detraccion'
          });
          if (Field != '' && Field != null) {
            Field.isDisabled = true;
          }
        }

        /* *****************************
         * implementado el 2021.10.20
         * Solo para CL - Chile
         * *************************** */
        if (LMRY_countr[0] == 'CL' && LMRY_countr[2] == true && LMRY_access == true) {
          visibleFieldsByTypeReport(LMRY_countr[1], '');
        }

        var purchase_order = recordObj.getValue('createdfromstatus');

        /* *****************************
         * Para cuando sea create o copia
         * Se movio el de sitio 2022.02.28
         * *************************** */
        if (type == 'create' || type == 'copy') {
          // Campo aplica LatamReady WHT
          recordObj.setValue({
            fieldId: 'custbody_lmry_apply_wht_code',
            value: true
          });

          // Procesado por el Numerador
          recordObj.setValue({
            fieldId: 'custbody_lmry_scheduled_process',
            value: false
          });
        }

        /* *****************************
         * Solo para cuando sea copia
         * if (type == 'create' || type == 'copy') {
         * Se eliminio el create 2022.02.23
         * *************************** */
        if (type == 'copy') {
          // Tipo de Documento - Serie  - Numero - Folio

          if (!(purchase_order != null && purchase_order != '' && library.getAuthorization(432, licenses) == true && LMRY_countr[0] == 'BR')) {
            recordObj.setValue({
              fieldId: 'custbody_lmry_document_type',
              value: ''
            });
            recordObj.setValue({
              fieldId: 'custbody_lmry_serie_doc_cxp',
              value: ''
            });
            recordObj.setValue({
              fieldId: 'custbody_lmry_num_preimpreso',
              value: ''
            });
            recordObj.setValue({
              fieldId: 'custbody_lmry_paymentmethod',
              value: ''
            });
            recordObj.setValue({
              fieldId: 'custbody_lmry_via_transp_cl',
              value: ''
            });
          }

          recordObj.setValue({
            fieldId: 'custbody_lmry_foliofiscal',
            value: ''
          });
          // Campos WHT Peru
          recordObj.setValue({
            fieldId: 'custbody_lmry_wtax_rate',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_wtax_amount',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_wbase_amount',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_wtax_code',
            value: ''
          });
          // Campos WHT Colombia
          recordObj.setValue({
            fieldId: 'custbody_lmry_co_reteica_amount',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_co_reteiva_amount',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_co_retefte_amount',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_co_retecree_amount',
            value: 0
          });
          // Campos WHT Bolivia
          recordObj.setValue({
            fieldId: 'custbody_lmry_bo_autoreteit_whtamount',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_bo_reteiue_whtamount',
            value: 0
          });
          // Campos WHT Paraguay
          recordObj.setValue({
            fieldId: 'custbody_lmry_py_autoreteir_amount',
            value: 0
          });
          // Campos WHT Ecuador
          recordObj.setValue({
            fieldId: 'custbody_lmry_ec_reteir_amount',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_ec_reteiva_amount',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_ec_base_rate0',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_ec_base_rate12',
            value: 0
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_ec_base_rate14',
            value: 0
          });
          // Retenciones
          recordObj.setValue({
            fieldId: 'custbody_lmry_serie_retencion',
            value: ''
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_preimpreso_retencion',
            value: ''
          });
          // Campos Chile
          recordObj.setValue({
            fieldId: 'custbody_lmry_cl_period',
            value: ''
          });
          // Entregas a rendir
          recordObj.setValue({
            fieldId: 'custbody_lmry_type_report',
            value: '',
            ignoreFieldChange: true
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_numero_er',
            value: ''
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_numero_cc',
            value: ''
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_numero_sr',
            value: ''
          });
          // Monto en letras
          recordObj.setValue({
            fieldId: 'custbody_lmry_pa_monto_letras',
            value: ''
          });

          // Transferencia de IVA MX
          recordObj.setValue({
            fieldId: 'custbody_lmry_schedule_transfer_of_iva',
            value: ''
          });

        } // Solo Copy

        /* *****************************
         * Se cambio la posicion para 
         * que se ejecute en create
         * y copy el create 2022.07.01
         * *************************** */
        if (type == 'create' || type == 'copy') {
          // Seteo de CustomField WHT
          kofaxLibrary.SetCustomField_WHT_Code_VB(recordObj, LMRY_countr, licenses);

          // Seteo del factor solo Chile
          if (recordObj.getValue({
            fieldId: 'custbody_lmry_cl_period'
          }) == '') {
            SetFieldFactor(recordObj);
          }
        } // Solo Create y Copy

        /* ***********************************************
         * Se movio de lugar 2022.02.28
         * Solo localizaciones Peruanas
         *********************************************** */
        if (LMRY_countr[0] == 'PE' && LMRY_countr[2] == true && LMRY_access == true) {
          var tipo_id_transac = recordObj.getValue({
            fieldId: 'custbody_lmry_transaction_type_doc'
          });
          if (tipo_id_transac != '' && tipo_id_transac != null && type == 'copy') {
            recordObj.setValue({
              fieldId: 'custbody_lmry_document_type',
              value: ''
            });
            recordObj.setValue({
              fieldId: 'custbody_lmry_concepto_detraccion',
              value: ''
            });
            recordObj.setValue({
              fieldId: 'custbody_lmry_porcentaje_detraccion',
              value: ''
            });
            Field = recordObj.getField({
              fieldId: 'custbody_lmry_concepto_detraccion'
            });
            if (Field != '' && Field != null) {
              Field.isDisabled = true;
            }
          }
          if (type == 'edit' || type == 'copy') {
            // Validar que el tipo de documento no este vacio
            var tipo_ids = recordObj.getValue({
              fieldId: 'custbody_lmry_document_type'
            });
            if (tipo_ids != null && tipo_ids != '' && tipo_ids != -1) {
              var detraccion = search.lookupFields({
                type: 'customrecord_lmry_tipo_doc',
                id: tipo_ids,
                columns: ['custrecord_lmry_aplica_detracc']
              });
              if (detraccion.custrecord_lmry_aplica_detracc == true &&
                detraccion.custrecord_lmry_aplica_detracc != null) {
                Field = recordObj.getField({
                  fieldId: 'custbody_lmry_concepto_detraccion'
                });
                if (Field != '' && Field != null) {
                  Field.isDisabled = false;
                }
              } else {
                Field = recordObj.getField({
                  fieldId: 'custbody_lmry_concepto_detraccion'
                });
                if (Field != '' && Field != null) {
                  Field.isDisabled = true;
                }
              }
            }
          }
        } // Solo localizaciones Peruanas

        /* ***********************************************
         * Desactiva el campo Latam - subsidiary Country
         *********************************************** */
        Field = recordObj.getField({
          fieldId: 'custbody_lmry_subsidiary_country'
        });
        if (Field != '' && Field != null) {
          Field.isDisabled = true;
        }
        /* ***********************************************
         * Activar el campo Latam - subsidiary Country,
         * solo si esta vacio
         *********************************************** */
        if (recordObj.getValue({
          fieldId: 'custbody_lmry_subsidiary_country'
        }) == '') {
          Field = recordObj.getField({
            fieldId: 'custbody_lmry_subsidiary_country'
          });
          if (Field != '' && Field != null) {
            Field.isDisabled = false;
          }
        }

        // Transferencia de IVA (SuiteGL)
        if (LMRY_countr[0] == 'MX' && LMRY_countr[2] == true) {
          if (context.mode == 'create' || context.mode == 'copy' || context.mode == 'edit') {
            var fieldIVA = recordObj.getField({
              fieldId: 'custbody_lmry_schedule_transfer_of_iva'
            });

            if (fieldIVA != '' && fieldIVA != null) {
              fieldIVA.isDisabled = true;
            }
          }
        }

        var al_country = recordObj.getValue({
          fieldId: 'custbody_lmry_subsidiary_country'
        });

        if (LMRY_countr[0] == 'AR') {
          if ((context.mode == 'create' || context.mode == 'copy') && library.getAuthorization(532, licenses)) {
            if (subsidiaria != null && subsidiaria != '') {
              library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
            }
          }
        }
        if (LMRY_countr[0] == 'BR') {
          if ((context.mode == 'create' || context.mode == 'copy') && library.getAuthorization(529, licenses)) {
            if (subsidiaria != null && subsidiaria != '') {
              library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
            }
          }
        }
        if (LMRY_countr[0] == 'CO') {
          if ((context.mode == 'create' || context.mode == 'copy') && library.getAuthorization(533, licenses)) {
            if (subsidiaria != null && subsidiaria != '') {
              library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
            }
          }
        }
        if (LMRY_countr[0] == 'CL') {
          if ((context.mode == 'create' || context.mode == 'copy') && library.getAuthorization(530, licenses)) {
            if (subsidiaria != null && subsidiaria != '') {
              library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
            }
          }
        }
        if (LMRY_countr[0] == 'MX') {
          if ((context.mode == 'create' || context.mode == 'copy') && library.getAuthorization(528, licenses)) {
            if (subsidiaria != null && subsidiaria != '') {
              library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
            }
          }
        }
        if (LMRY_countr[0] == 'PE') {
          if ((context.mode == 'create' || context.mode == 'copy') && library.getAuthorization(531, licenses)) {
            if (subsidiaria != null && subsidiaria != '') {
              library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
            }
          }
        }

        //CFOP
        if (LMRY_countr[0] == 'BR' && LMRY_access && (context.mode == 'create' || context.mode == 'copy' || context.mode == 'edit')) {

          var createdFrom = recordObj.getValue('createdfrom');
          var transactionType = recordObj.getValue('custbody_lmry_br_transaction_type');

          if (!transactionType || context.mode == 'copy') {
            var typeStandard = recordObj.getValue('type');
            if (typeStandard) {
              var searchTransactionType = search.create({ type: 'customrecord_lmry_trantype', filters: [{ name: 'name', operator: 'is', values: typeStandard }] });
              searchTransactionType = searchTransactionType.run().getRange({ start: 0, end: 1 });

              if (searchTransactionType && searchTransactionType.length) {
                recordObj.setValue('custbody_lmry_br_transaction_type', searchTransactionType[0].id);
              }

            }
          }

        }

        /**********************************************************************
        * Title : Uso de Installment para llenado de campos
        * User  : Richard Galvez Lopez
        * Date  : 05/03/2020
        /**********************************************************************/
        if (runtime.isFeatureInEffect('installments')) {
          if (library.getAuthorization(439, licenses))
            setTimeout(function () {
              lbry_installment.disabledStandarBRBoleto(context.currentRecord);
            },
              1);
        }
        /**********************************************************************/

        /*****************************************************************************
            Title: Facturas de Compras - Monotributistas y Exentos
            Countries: Argentina
            Feature: AUTOCOMPLETE FIELDS (BILL & BILL CREDIT) - (744)
            Libraries: LMRY_libToolsFunctionsLBRY_V2.0.js
            Date: 13/01/2022
        ******************************************************************************/
        if (LMRY_countr[0] == 'AR') {
          if (library.getAuthorization(744, licenses)) {
            libtools.setLegalDocumentType(recordObj);
          }
        }/*****************************************************************************/

      } catch (err) {
        library.sendemail2(' [ VBClnt_PageInit ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }

      // Primera encarg
      booPageIni = false;
    }


    /**
     * The recordType (internal id) corresponds to the "Applied To" record in your
     * script deployment.
     *
     * @appliedtorecord recordType
     *
     * @returns {Boolean} True to continue save, false to abort save
     */
    function saveRecord(context) {

      try {
        recordObj = context.currentRecord;

        /* Validacion 04/02/22 */
        var lockedPeriod = recordObj.getValue("custpage_lockedperiod");
        log.error('lockedPeriod', lockedPeriod);
        if (lockedPeriod == true || lockedPeriod == 'T') {
          return true;
        }
        /* Fin validacion 04/02/22 */

        var subsidiaria = recordObj.getValue({
          fieldId: 'subsidiary'
        });
        licenses = library.getLicenses(subsidiaria);
        //Seteo de los tax rule en las lineas - UY
        var tax_rule = recordObj.getValue("custpage_tax_rule") || "";
        if (LMRY_countr[0] == 'UY') {
          var cant_items = recordObj.getLineCount({
            sublistId: 'item'
          });
          if (cant_items > 0) {
            for (var k = 0; k < cant_items; k++) {
              log.debug('seteo items');
              var orcdTemp = recordObj.selectLine({
                sublistId: 'item',
                line: k
              });
              orcdTemp.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_br_tax_rule',
                value: tax_rule
                // ignoreFieldChange: true
              });
              orcdTemp.commitLine({
                sublistId: 'item'
              });
            }
          }
          //cambiar los expenses
          var cant_exp = recordObj.getLineCount({
            sublistId: 'expense'
          });
          if (cant_exp > 0) {
            for (var k = 0; k < cant_exp; k++) {
              log.debug('seteo expenses');
              var orcdTemp = recordObj.selectLine({
                sublistId: 'expense',
                line: k
              });
              orcdTemp.setCurrentSublistValue({
                sublistId: 'expense',
                fieldId: 'custcol_lmry_br_tax_rule',
                value: tax_rule
                // ignoreFieldChange: true
              });
              orcdTemp.commitLine({
                sublistId: 'expense'
              });
            }
          }
        }

        //Seteo de los Wht rule en las lineas - MX
        var featMx = library.getAuthorization(958, licenses);
        var tax_rule = recordObj.getValue("custpage_wht_rule");
        var applWTH = recordObj.getValue({ fieldId: 'custbody_lmry_apply_wht_code' });

        if (featMx && LMRY_countr[0] == 'MX' && (applWTH == 'T' || applWTH == true)) {
          var cant_items = recordObj.getLineCount({
            sublistId: 'item'
          });
          if (cant_items > 0) {
            for (var k = 0; k < cant_items; k++) {
              log.debug('seteo items');
              var orcdTemp = recordObj.selectLine({
                sublistId: 'item',
                line: k
              });
              orcdTemp.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_wht_rule',
                value: tax_rule
                // ignoreFieldChange: true
              });
              orcdTemp.commitLine({
                sublistId: 'item'
              });
            }
          }
          //cambiar los expenses
          var cant_exp = recordObj.getLineCount({
            sublistId: 'expense'
          });
          if (cant_exp > 0) {
            for (var k = 0; k < cant_exp; k++) {
              log.debug('seteo expenses');
              var orcdTemp = recordObj.selectLine({
                sublistId: 'expense',
                line: k
              });
              orcdTemp.setCurrentSublistValue({
                sublistId: 'expense',
                fieldId: 'custcol_lmry_wht_rule',
                value: tax_rule
                // ignoreFieldChange: true
              });
              orcdTemp.commitLine({
                sublistId: 'expense'
              });
            }
          }
          if (tax_rule != null && tax_rule != '') {
            var cantidad_items = recordObj.getLineCount({
              sublistId: 'item'
            });
            var cantidad_expenses = recordObj.getLineCount({
              sublistId: 'expense'
            });
            for (var i = 0; i < cantidad_items; i++) {
              var orcdTemp = recordObj.selectLine({
                sublistId: 'item',
                line: i
              });
              orcdTemp.setCurrentSublistValue({
                sublistId: "item",
                fieldId: "custcol_4601_witaxapplies",
                value: false,
              });
            }
            for (var i = 0; i < cantidad_expenses; i++) {
              var orcdTemp = recordObj.selectLine({
                sublistId: 'expense',
                line: i
              });
              orcdTemp.setCurrentSublistValue({
                sublistId: "expense",
                fieldId: "custcol_4601_witaxapplies",
                value: false,
              });
            }
          }
        }
        //MANEJO DE POPUPS AL GUARDAR EL BILL
        if (window['custBody'] != null) {
          if (!window['custBody'].closed) {
            alert('Debe cerrar el popup del BR Transaction Fields');
            return false;
          }
        }

        if (window['custCol'] != null) {
          if (!window['custCol'].closed) {
            alert('Debe cerrar el popup del Tax Result');
            recordObj.selectLine({
              sublistId: current_sublist,
              line: current_line
            });
            return false;
          }
        } //

        // Valida el Acceso
        ValidateAccessVB(subsidiaria);
        //valida que no exista items negativos
        var existItemNeg = library2.Val_Negative_Item(recordObj);
        if (existItemNeg.length > 0) {
          var urlInstancia = "" + url.resolveDomain({
                hostType: url.HostType.APPLICATION,
                accountId: runtime.accountid
            });
          var instancia = urlInstancia.split('.');          
          var notAllowInstans = ['5514786-sb1','5514786']          
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

        if (Val_Campos.length > 0) {
          if (library2.Val_Mensaje(recordObj, Val_Campos) == false)
            return false;
        }
        // Inicializa campos WHT de sumatoria
        if (context.mode == 'create' || context.mode == 'copy') {
          SetCustomField_WHT_Init_VB(recordObj);
        }


        /* ****************************************************** */
        // Validacion de Cuenta para PERU
        /* ****************************************************** */
        //        if(type == 'create' && LMRY_countr[0] == 'PE'){
        //          var valida = ValidateAccount(recordObj);
        //          if(!valida){
        //            return false;
        //          }
        //        }
        /* ****************************************************** */


        //Solo localizaciones Mexicanas
        if (type == 'edit' && LMRY_countr[0] == 'MX') {
          if (flag && library.getAuthorization(337, licenses)) {
            var searchPay = search.create({
              type: 'vendorpayment',
              columns: ['internalid'],
              filters: [
                ['voided', 'is', 'F'], 'AND', ['appliedtotransaction.internalidnumber', 'equalto', recordObj.id]
              ]
            });
            searchPay = searchPay.run().getRange(0, 1000);
            if (searchPay != '' && searchPay != null) {
              alert(libAlert.getAlert(0, Language, []));
              return false;
            }

          }
        }
        // Solo localizaciones Colombianas
        if (LMRY_countr[0] == 'CO' && LMRY_countr[2] == true && LMRY_access == true) {
          // Latam - Tipo de Documento Fiscal
          var docufisc = recordObj.getValue({
            fieldId: 'custbody_lmry_document_type'
          });

          /* Valida que no sea Nulo */
          if (docufisc == '' || docufisc == null || docufisc == -1) {
            return true;
          }

          // Bill - Latam - Serie CXC - Colombia
          // Verifica que no este vacio la Serie y Preimpreso
          var lmry_DocSer = recordObj.getValue({
            fieldId: 'custbody_lmry_serie_doc_cxc'
          });
          var lmry_DocNro = recordObj.getValue({
            fieldId: 'custbody_lmry_num_preimpreso'
          });
          if ((lmry_DocSer != '' && lmry_DocSer != null && lmry_DocSer != -1) &&
            (lmry_DocNro != '' && lmry_DocNro != null)) {

            // Solo si el feature Transaction Number Bill
            var featureId = library.getAuthorization(553, licenses);
            if (featureId && LMRY_countr[2] == true && LMRY_access) {
              // Actualiza el numero correlativo
              var wtax_type = search.lookupFields({
                type: 'customrecord_lmry_serie_impresion_cxc',
                id: lmry_DocSer,
                columns: ['custrecord_lmry_serie_numero_impres']
              });
              var actualNro = parseInt(wtax_type.custrecord_lmry_serie_numero_impres);
              if (parseFloat(lmry_DocNro) > parseFloat(actualNro)) {
                var id = record.submitFields({
                  type: 'customrecord_lmry_serie_impresion_cxc',
                  id: lmry_DocSer,
                  values: {
                    'custrecord_lmry_serie_numero_impres': parseFloat(lmry_DocNro)
                  }
                });
              } // Actualiza el numero correlativo
            } // Solo si el feature Transaction Number Bill
          } else {
            // Latam - CO Tipo Documento Equivalente - Preferencias Generales de Empresa
            var tipodocu = scriptObj.getParameter({
              name: 'custscript_lmry_co_tipo_fiscal_de'
            });

            /* Valida que no sea Nulo */
            if (tipodocu == '' || tipodocu == null) {
              return true;
            }

            // Graba el numero PreImpreso correlativo
            var Auxnumer = recordObj.getValue({
              fieldId: 'custbody_lmry_num_preimpreso'
            });
            if (docufisc == tipodocu && Auxnumer != null && Auxnumer != '' && co_internalid > 0) {
              var nroConse = search.lookupFields({
                type: 'customrecord_lmry_co_de_numero',
                id: co_internalid,
                columns: ['custrecord_lmry_co_de_numero']
              });
              if (parseFloat(Auxnumer) > parseFloat(nroConse.custrecord_lmry_co_de_numero)) {
                var otherId = record.submitFields({
                  type: 'customrecord_lmry_co_de_numero',
                  id: co_internalid,
                  values: {
                    'custrecord_lmry_co_de_numero': parseFloat(Auxnumer)
                  }
                });
              }
            }
          } // Bill - Latam - Serie CXC - Colombia
        } // Solo localizaciones Mexicanas
        else if (LMRY_countr[0] == 'MX' && LMRY_countr[2] == true && LMRY_access == true) {
          var entityID = recordObj.getValue({
            fieldId: 'entity'
          });

          var entityCountry = search.lookupFields({
            type: "vendor",
            id: entityID,
            columns: ["custentity_lmry_country.custrecord_lmry_mx_country"]
          })["custentity_lmry_country.custrecord_lmry_mx_country"];

          var isExtranjero = true;

          if (entityCountry && entityCountry.length) {
            entityCountry = entityCountry[0].value;
            if (entityCountry == 157) {//Mexico
              isExtranjero = false;
            }
          }

          var opeType = recordObj.getValue({
            fieldId: 'custbody_lmry_mx_operation_type'
          });

          if (opeType) {
            var aplica = search.lookupFields({
              type: 'customrecord_lmry_mx_operation_type',
              id: opeType,
              columns: ['custrecord_lmry_mx_aplica_nacional', 'custrecord_lmry_mx_aplica_extranjero']
            });

            if (isExtranjero) {
              if (aplica.custrecord_lmry_mx_aplica_extranjero == false) {
                alert(libAlert.getAlert(1, Language, []));
                return false;
              }
            } else {
              if (aplica.custrecord_lmry_mx_aplica_nacional == false) {
                alert(libAlert.getAlert(2, Language, []));
                return false;
              }
            }

          }

        } // Solo localizaciones Peruanas
        else if (LMRY_access == true && LMRY_countr[0] == 'PE') {

          if (library.getAuthorization(61, licenses)) { // Peru - Validación de campos
            //Validacion Campo "Latam PE Operation Type Sunat"
            var conceptDetracc = recordObj.getValue({
              fieldId: 'custbody_lmry_concepto_detraccion'
            });
            if (conceptDetracc != 12 && conceptDetracc != '' && conceptDetracc != null) { // 12 - SIN DETRACCION
              var opeTypeSunat = recordObj.getValue({
                fieldId: 'custbody_lmry_pe_operation_type_sunat'
              });
              if (opeTypeSunat == '' || opeTypeSunat == null) {
                alert(libAlert.getAlert(3, Language, []));
                return false;
              }
            }
            // Valida campo Latam - Subsidiary Country no este vacio
            if (recordObj.getValue({
              fieldId: 'custbody_lmry_subsidiary_country'
            }) == null || recordObj.getValue({
              fieldId: 'custbody_lmry_subsidiary_country'
            }) == '') {
              alert(libAlert.getAlert(4, Language, []));
              // Sale de la funcion
              return false;
            }
            // Valida campo Latam - Tipo de Transaccion no este vacio
            if (recordObj.getValue({
              fieldId: 'custbody_lmry_transaction_type_doc'
            }) == null || recordObj.getValue({
              fieldId: 'custbody_lmry_transaction_type_doc'
            }) == '') {
              alert(libAlert.getAlert(5, Language, []));
              // Sale de la funcion
              return false;
            }
            // Valida campo Latam - Tipo de Documento Fiscal no este vacio
            if (recordObj.getValue({
              fieldId: 'custbody_lmry_document_type'
            }) == null || recordObj.getValue({
              fieldId: 'custbody_lmry_document_type'
            }) == '') {
              alert(libAlert.getAlert(6, Language, []));
              // Sale de la funcion
              return false;
            } else {
              //Si esta seleccionado obtiene el id del tipo de transaccion
              var tipo_id = recordObj.getValue({
                fieldId: 'custbody_lmry_document_type'
              });
              //Verifica, para este id, en el registro personalizado Latam Tipo Comprobante Fiscal si el campo Obligacion de Serie y Preimpreso esta marcado
              var dato = search.lookupFields({
                type: 'customrecord_lmry_tipo_doc',
                id: tipo_id,
                columns: ['custrecord_lmry_mandatory_ser_pre']
              });
              //Si esta marcado los campos Latam - Serie y Latam - Preimpreso seran obligatorios
              if (dato.custrecord_lmry_mandatory_ser_pre) {
                // valida campo Latam - Serie CxP no este vacio
                if (recordObj.getValue({
                  fieldId: 'custbody_lmry_serie_doc_cxp'
                }) == null || recordObj.getValue({
                  fieldId: 'custbody_lmry_serie_doc_cxp'
                }) == '') {
                  alert(libAlert.getAlert(7, Language, []));
                  // Sale de la funcion
                  return false;
                }

                // valida campo Latam - Numero Preimpreso no este vacio
                if (recordObj.getValue({
                  fieldId: 'custbody_lmry_num_preimpreso'
                }) == null || recordObj.getValue({
                  fieldId: 'custbody_lmry_num_preimpreso'
                }) == '') {
                  alert(libAlert.getAlert(8, Language, []));
                  // Sale de la funcion
                  return false;
                }
              }
            }

          }

          // if (LMRY_countr[2] == true) {
          //     if (!validaDocumentosIguales()) {
          //         return false;
          //     }
          // }
          // Valida periodo contable
          var periodo = recordObj.getText({
            fieldId: 'postingperiod'
          });
          return confirm(libAlert.getAlert(9, Language, [periodo.toUpperCase()]));
          /*return confirm('Esta transaccion se contabilizara en el periodo ' +
            periodo.toUpperCase() + '.\n' + "Desea continuar?");*/
        }//solo localizaciones Bolivianas
        else if (LMRY_access == true && LMRY_countr[0] == 'BO') {
          check_vendor = recordObj.getValue('custbody_lmry_bo_config_vendor_line')
          var lic_alert = library.getAuthorization(994, licenses);;
          if (lic_alert && check_vendor) {
            num_lin_item = recordObj.getLineCount('item')
            num_lin_expense = recordObj.getLineCount('expense')
            folio = '';
            //recorrido de items
            for (var i = 0; i < num_lin_item; i++) {
              folio = recordObj.getSublistValue('item', 'custcol_lmry_foliofiscal', i)
              if (folio) break;
            }
            //recorrido de expense
            for (var i = 0; i < num_lin_expense; i++) {
              if (folio) break;
              folio = recordObj.getSublistValue('expense', 'custcol_lmry_foliofiscal', i)
              if (folio) break;
            }

            if (!folio) {
              alert(libAlert.getAlert(24, Language, []));
              return false;
            }
          }
        }






        // Valida tranid repetido
        if (LMRY_countr[0] == 'BR' && !LbryBRDuplicate.validateDuplicate(recordObj, licenses)) {
          var tranID = recordObj.getField('tranid');
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

        // Serie de impresion BR
        if (LMRY_countr[0] == 'BR' && library.getAuthorization(650, licenses)) {

          var Auxserie = recordObj.getValue('custbody_lmry_serie_doc_cxc');
          var Auxnumer = recordObj.getValue('custbody_lmry_num_preimpreso');

          if (Auxserie != null && Auxserie != '' && Auxnumer != null && Auxnumer != '') {

            var nroConse = search.lookupFields({
              type: 'customrecord_lmry_serie_impresion_cxc',
              id: Auxserie,
              columns: ['custrecord_lmry_serie_numero_impres', 'custrecord_ei_preprinted_series']
            });

            var actualNro = nroConse.custrecord_lmry_serie_numero_impres;
            var isEISeries = nroConse.custrecord_ei_preprinted_series;

            if (isEISeries == false || isEISeries == 'F') {
              if (Number(Auxnumer) > Number(actualNro)) {
                record.submitFields({
                  type: 'customrecord_lmry_serie_impresion_cxc',
                  id: Auxserie,
                  values: {
                    'custrecord_lmry_serie_numero_impres': Number(Auxnumer)
                  }
                });
              }
            }

          }

        }
        //validacion del unique tranid
        var features = {
          'AR': 689,
          'CL': 686,
          'CR': 690,
          'EC': 685,
          'GT': 691,
          'PA': 692,
          'PE': 684,
          'UY': 683,
          'CO': 687,
          'MX': 688
        };
        var miUniqueTranid = library.getAuthorization(features[LMRY_countr[0]], licenses);
        if (miUniqueTranid && (LMRY_countr[0] == 'UY' || LMRY_countr[0] == 'PE' || LMRY_countr[0] == 'EC' ||
          LMRY_countr[0] == 'CL' || LMRY_countr[0] == 'CO' || LMRY_countr[0] == 'MX' ||
          LMRY_countr[0] == 'AR' || LMRY_countr[0] == 'CR' || LMRY_countr[0] == 'GT' ||
          LMRY_countr[0] == 'PA')
        ) {
          if (!validaDocumentosIguales(licenses)) {
            return false;
          }
        }

        /* -------------------------------------------------------------------------------- */
        /* Fecha: 29/10/2021                                                                */
        /* Valida duplicado de TranID en base al feature 'VALIDATE TRANID (VENDOR BILL)'    */
        /* -------------------------------------------------------------------------------- */
        if (!lbry_valTranID.validateTranID(recordObj, LMRY_countr[0], licenses)) {
          var tranID = recordObj.getField('tranid');
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

        if (LMRY_access == true) {
          // Guarda Monto en Letras
          var imptotal = recordObj.getValue({
            fieldId: 'total'
          });
          var impletras = library1.ConvNumeroLetraESP(imptotal, '', '', 'Y');
          recordObj.setValue({
            fieldId: 'custbody_lmry_pa_monto_letras',
            value: impletras
          });

          /* *******************************************
           * Valida si la serie de retencion ya existe
           ****************************************** */
          // Validacion si tiene activado el Feature
          // Bolivia
          if (LMRY_countr[0] == 'BO') {
            if (!library.getAuthorization(69, licenses)) {
              return true;
            }
          } // Colombia
          else if (LMRY_countr[0] == 'CO') {
            if (!library.getAuthorization(72, licenses)) {
              return true;
            }
          } // Costa Rica
          else if (LMRY_countr[0] == 'CR') {
            if (!library.getAuthorization(75, licenses)) {
              return true;
            }
          } // El Salvador
          else if (LMRY_countr[0] == 'SV') {
            if (!library.getAuthorization(78, licenses)) {
              return true;
            }
          } // Mexico
          else if (LMRY_countr[0] == 'MX') {
            if (!library.getAuthorization(81, licenses)) {
              return true;
            }
          } // Panama
          else if (LMRY_countr[0] == 'PA') {
            if (!library.getAuthorization(85, licenses)) {
              return true;
            }
          } // Paraguay
          else if (LMRY_countr[0] == 'PY') {
            if (!library.getAuthorization(88, licenses)) {
              return true;
            }
          } // Peru
          else if (LMRY_countr[0] == 'PE') {
            if (!library.getAuthorization(91, licenses)) {
              return true;
            }
          } // Uruguay
          else if (LMRY_countr[0] == 'UY') {
            if (!library.getAuthorization(94, licenses)) {
              return true;
            }
          }

        }

        /*****************************************************************************
            Title: Facturas de Compras - Monotributistas y Exentos
            Countries: Argentina
            Feature: AUTOCOMPLETE FIELDS (BILL & BILL CREDIT) - (744)
            Libraries: LMRY_libToolsFunctionsLBRY_V2.0.js
            Date: 13/01/2022
        ******************************************************************************/
        if (LMRY_countr[0] == 'AR') {
          if (library.getAuthorization(744, licenses)) {
            if (libtools.validateTaxCode(recordObj) != true) {
              switch (Language) {
                case 'es':
                  alert('El código de impuesto no corresponde para este proveedor. Por favor, seleccionar "' + libtools.validateTaxCode(recordObj) + '" en gastos y artículos.');
                  break;
                case 'pt':
                  alert('O código de imposto não se aplica a este fornecedor. Favor selecionar "' + libtools.validateTaxCode(recordObj) + '" em custos e itens.');
                  break;
                default:
                  alert('The taxcode does not match with this vendor. Please select "' + libtools.validateTaxCode(recordObj) + '" in expenses and items.');
                  break;
              }
              return false;
            }
          }
        }//*********************************************************

        /*****************************************************************************
            Code: C0243-S0006
            Feature: MANUAL PERCEPTIONS (A-P) - (875)
            Date: 06/05/2022
        ******************************************************************************/
        if (LMRY_countr[0] == 'AR' && library.getAuthorization(875, licenses)) libtools.setBaseAmount(recordObj);
        /****************************************************************************/

      } catch (err) {
        log.error('SaveRecord', err);
        library.sendemail2(' [ SaveRecord - lblname ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
        //alert('Save Record: ' + err);
      }

      return true;
    }

    function fieldChanged(context) {

      try {

        ST_FEATURE = runtime.isFeatureInEffect({
          feature: "tax_overhauling"
        });

        var recordObj = context.currentRecord;
        var name = context.fieldId;
        var record_type = recordObj.getValue('baserecordtype');

        if (name == 'currency' && (type == 'create' || type == 'copy')) {
          var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
          if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
            ws_exchange_rate();
          }

          return true;
        }

        if (name == 'custpage_lmry_exchange_rate' && (type == 'create' || type == 'copy')) {

          var lmry_exchange_rate = recordObj.getValue('custpage_lmry_exchange_rate');
          if (lmry_exchange_rate != ' ' && lmry_exchange_rate != '' && lmry_exchange_rate != null) {
            recordObj.setValue('exchangerate', lmry_exchange_rate);
          }
          return true;
        }

        if (name == 'trandate' && (type == 'create' || type == 'copy')) {
          if (recordObj.getValue('entity') != '' && recordObj.getValue('entity') != null) {
            ws_exchange_rate();
          }
          return true;
        }

        if (featuresubs == true || featuresubs == 'T') {
          if (name == 'entity' && type == 'create') {
            var cf = recordObj.getValue('customform');
            var ent = recordObj.getValue('entity');

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
            var cf = recordObj.getValue('customform');
            var ent = recordObj.getValue('entity');
            var sub = recordObj.getValue('subsidiary');

            if (ent != '' && ent != null && ent != -1 && cf != '' && cf != null && cf != -1 && sub != '' && sub != null && sub != -1) {

              setWindowChanged(window, false);
              window.location.href = window.location.href.split('?')[0] + '?whence=&cf=' + cf + '&entity=' + ent + '&subsidiary=' + sub;
            }
            return true;
          }
        } else {
          if (name == 'entity' && type == 'create') {
            var cf = recordObj.getValue('customform');
            var ent = recordObj.getValue('entity');

            setWindowChanged(window, false);
            window.location.href = window.location.href.split('?')[0] + '?whence=&cf=' + cf + '&entity=' + ent;
            return true;
          }
        }

        //POP-UP BRAZIL
        var purchase_order = recordObj.getValue('createdfromstatus');
        if ((name == 'custcol_lmry_br_popup' || name == 'custbody_lmry_br_popup') && (type == 'create' || type == 'edit' || type == 'copy' || (purchase_order != null && purchase_order != ''))) {
          //290, brazil: 262, activate bill
          if (library.getAuthorization(290, licenses) == false || library.getAuthorization(262, licenses) == false) {
            return true;
          }

          var n_country = recordObj.getText('custbody_lmry_subsidiary_country');

          if (n_country == null || n_country == '') {
            return true;
          }

          n_country = n_country.substring(0, 3).toUpperCase();

          if (n_country == 'BRA') {

            if (name == 'custcol_lmry_br_popup') {

              var current_sublist_check = context.sublistId;

              if (validate_open_window(context, 'custCol')) {
                current_sublist = context.sublistId;
                current_line = context.line;
                new_window(context, 'custCol', current_sublist, record_type, n_country);
              }

              recordObj.setCurrentSublistValue({
                sublistId: current_sublist_check,
                fieldId: 'custcol_lmry_br_popup',
                value: false,
                ignoreFieldChange: true
              });

            } else {
              if (validate_open_window(context, 'custBody')) {
                new_window(context, 'custBody', '', record_type, n_country);
              }

              recordObj.setValue({
                fieldId: 'custbody_lmry_br_popup',
                value: false,
                ignoreFieldChange: true
              });
            }

          }
        }

        if (LMRY_countr[0] == 'BR' && LMRY_access == true) {

          var flagCFOP = true;
          // Validacion para la SubLista Item - Field Item
          if (context.sublistId == 'item' && context.fieldId == 'item') {

            var idItem = recordObj.getCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'item'
            });

            if (idItem) {
              var typeTransaction = recordObj.getValue('type');
              var itemCFOP = search.lookupFields({
                type: 'item',
                id: idItem,
                columns: ['custitem_lmry_br_cfop_inc', 'custitem_lmry_br_cfop_display_inc', 'custitem_lmry_br_cfop_out', 'custitem_lmry_br_cfop_display_out']
              });

              var currentCFOPDisplay = recordObj.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_br_tran_outgoing_cfop_di'
              });
              var currentCFOP = recordObj.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_br_tran_outgoing_cfop'
              });

              if (!currentCFOPDisplay && itemCFOP.custitem_lmry_br_cfop_display_inc != null && itemCFOP.custitem_lmry_br_cfop_display_inc != '') {
                recordObj.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_lmry_br_tran_outgoing_cfop_di',
                  value: itemCFOP.custitem_lmry_br_cfop_display_inc,
                  ignoreFieldChange: true
                });
              }

              if (!currentCFOP && itemCFOP['custitem_lmry_br_cfop_inc'] && itemCFOP['custitem_lmry_br_cfop_inc'].length > 0) {
                flagCFOP = false;

                var nameCFOP = search.lookupFields({
                  type: 'customrecord_lmry_br_cfop_codes',
                  id: itemCFOP.custitem_lmry_br_cfop_inc[0].value,
                  columns: ['custrecord_lmry_br_cfop_description']
                });

                nameCFOP = nameCFOP.custrecord_lmry_br_cfop_description;

                if (nameCFOP) {
                  recordObj.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_lmry_br_tran_outgoing_cfop_di',
                    value: nameCFOP,
                    ignoreFieldChange: true
                  });
                }

                recordObj.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_lmry_br_tran_outgoing_cfop',
                  value: itemCFOP.custitem_lmry_br_cfop_inc[0].value,
                  ignoreFieldChange: true
                });

              }


            }
          }

          if (context.sublistId == 'item' && context.fieldId == 'custcol_lmry_br_tran_outgoing_cfop' && flagCFOP == true) {
            var cfop = recordObj.getCurrentSublistValue({
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
                recordObj.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_lmry_br_tran_outgoing_cfop_di',
                  value: nameCFOP,
                  ignoreFieldChange: true
                });
              }
              recordObj.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_br_tran_outgoing_cfop',
                value: cfop,
                ignoreFieldChange: true
              });
            }
          }

          flagCFOP = true;
          return true;

        }
        /**********************************************************************
        * Title : Uso de Installment para llenado de campos
        * User  : Richard Galvez Lopez
        * Date  : 05/03/2020
        /**********************************************************************/
        if (runtime.isFeatureInEffect('installments')) {

          if (library.getAuthorization(439, licenses))
            lbry_installment.installmentFieldChanged(context);

        }
        /**********************************************************************/

      } catch (err) {
        log.error('[fieldChanged]', err);
      }

      return true;

    }

    function validate_open_window(scriptContext, section) {
      if (window[section] == null) {
        return true;
      } else {
        if (!window[section].closed) {
          alert('The window is open.');
          return false;
        } else {
          return true;
        }
      }
    }

    function new_window(scriptContext, section, currentSublist, recordType, country) {

      if (section == 'custCol') {

        var new_suitelet = url.resolveScript({
          scriptId: 'customscript_lmry_taxpurchase_stlt',
          deploymentId: 'customdeploy_lmry_taxpurchase_stlt',
          params: {
            'param_sublist': currentSublist,
            'param_recordtype': recordType
          }
        });

      } else {

        new_suitelet = url.resolveScript({
          scriptId: 'customscript_lmry_taxpurchase_body_stlt',
          deploymentId: 'customdeploy_lmry_taxpurchase_body_stlt',
          params: {
            'param_recordtype': recordType,
            'param_country': country
          }
        });
      }

      window[section] = window.open(new_suitelet);

    }

    /* **************************************************************
     * Muestra campos adicionales por el campo Latam - Report Type
     *  - custbody_lmry_numero_er lista => LatamReady - Número ER
     *  - custbody_lmry_numero_cc lista => LatamReady - Número CC
     *  - custbody_lmry_numero_sr lista => LatamReady - Número SR
     * implementado el 2021.10.20 - displayFieldsByTypeReport
     * ************************************************************ */
    function visibleFieldsByTypeReport(Country, parent) {
      log.debug('visibleFieldsByTypeReport - Country, parent', Country + ' - ' + parent);

      // Oculta campos
      var numerecc = recordObj.getField('custbody_lmry_numero_cc');
      numerecc.isVisible = false;
      var numereer = recordObj.getField('custbody_lmry_numero_er');
      numereer.isVisible = false;
      var numeresr = recordObj.getField('custbody_lmry_numero_sr');
      numeresr.isVisible = false;

      // Latam - Report Type
      var parent = recordObj.getValue({ fieldId: 'custbody_lmry_type_report' });
      if (parent != '' && parent != null && parent != -1) {
        /* Se realiza una busqueda para ver que campos se ocultan */
        var filters = new Array();
        filters[0] = search.createFilter({
          name: 'isinactive',
          operator: search.Operator.IS,
          values: 'F'
        });
        filters[1] = search.createFilter({
          name: 'custrecord_lmry_section',
          operator: search.Operator.ANYOF,
          values: [2]
        });
        filters[2] = search.createFilter({
          name: 'custrecord_lmry_parent_er',
          operator: search.Operator.ANYOF,
          values: [parent]
        });
        var columns = new Array();
        columns[0] = search.createColumn({ name: 'name' });
        columns[1] = search.createColumn({ name: 'custrecord_lmry_country' });
        // LatamReady - Setup Fields View
        var hidefields = search.create({
          type: 'customrecord_lmry_fields',
          columns: columns,
          filters: filters
        });
        hidefields = hidefields.run().getRange(0, 1000);
        if (hidefields != null && hidefields != '') {
          for (var i = 0; i < hidefields.length; i++) {
            var namefield = hidefields[i].getValue('name');
            var counfield = hidefields[i].getText('custrecord_lmry_country');
            counfield = library.DeleteChar(counfield);
            // Valida Paises
            if (counfield == Country) {
              var Field = recordObj.getField({ fieldId: namefield });
              if (Field) {
                Field.isVisible = true;
                // Termina el for
                break;
              }
            } // Valida Paises
          }
        }

      } // Latam - Report Type

    } // visibleFieldsByTypeReport

    /**
     * The recordType (internal id) corresponds to the "Applied To" record in your
     * script deployment.
     *
     * @appliedtorecord recordType
     *
     * @param {String}
     *            type Sublist internal id
     * @param {String}
     *            name Field internal id
     * @returns {Boolean} True to continue changing field value, false to abort
     *          value |
     */
    function validateField(context) {
      try {

        ST_FEATURE = runtime.isFeatureInEffect({
          feature: "tax_overhauling"
        });

        var lblname = context.fieldId;

        /* Validacion 04/02/22 */
        if (context.fieldId == 'postingperiod') {

          var period = recordObj.getValue('postingperiod');
          var subsidiary = recordObj.getValue('subsidiary') ? recordObj.getValue('subsidiary') : 1;
          // Se optiene el Pre - Fijo de la subsidiaria
          var urlStlt = url.resolveScript({
            scriptId: 'customscript_lmry_get_val_period_stlt',
            deploymentId: 'customdeploy_lmry_get_val_period_stlt',
            returnExternalUrl: false
          }) + '&period=' + period + '&subsidiary=' + subsidiary + '&country=' + LMRY_countr[0] + '&typetran=purchase';

          //corregir hard code falta url
          var getStlt = https.get({
            url: 'https://' + window.location.hostname + urlStlt
          });

          // Retorna el cuero del SuiteLet
          var closedPeriod = getStlt.body;

          log.error('closedPeriod', closedPeriod);
          if (closedPeriod == 'T') {
            recordObj.setValue('custpage_lockedperiod', true);
          } else {
            recordObj.setValue('custpage_lockedperiod', false);
          }

          // Sale de la funcion
          return true;
        }
        /* Fin validacion 04/02/22 */

        // Validacion en el campo Latam - Subsidiary Country
        if (context.fieldId == 'custbody_lmry_subsidiary_country') {

          // ejecutnado funcion
          booPageIni = true;

          recordObj = context.currentRecord;
          var type = context.mode;

          // Cambio de campo
          var lmry_entity = recordObj.getValue({
            fieldId: 'entity'
          });
          if (lmry_entity == null || lmry_entity == '') {
            // ejecutnado funcion
            booPageIni = false;

            // Sale de la funcion
            return true;
          }

          // Validacion de One World Edition o Mid Market Edition
          if (featuresubs == true || featuresubs == 'T') {
            var valuesubs = recordObj.getValue({
              fieldId: 'subsidiary'
            });

            if (valuesubs == null || valuesubs == '' || valuesubs == undefined) {
              // ejecutnado funcion
              booPageIni = false;
              // Sale de la funcion
              return true;
            }

            var userid = runtime.getCurrentUser();
            if (userid.subsidiary == valuesubs) {
              ValidateAccessVB(valuesubs);
              kofaxLibrary.SetCustomField_WHT_Code_VB(recordObj, LMRY_countr, licenses);
            }

          } else {
            ValidateAccessVB(1);
            // Seteo de campos WHT
            kofaxLibrary.SetCustomField_WHT_Code_VB(recordObj, LMRY_countr, licenses);
          }
          // ejecutnado funcion
          booPageIni = false;

          // Sale de la funcion
          return true;
        }

        // Validacion en el campo Standart Currency
        if (lblname == 'currency') {
          var subsi = recordObj.getValue({
            fieldId: 'subsidiary'
          });
          var al_country = recordObj.getValue({
            fieldId: 'custbody_lmry_subsidiary_country'
          });

          if (subsi != null && subsi != '') {
            if (LMRY_countr[0] == 'AR') {
              if ((mode == 'create' || mode == 'copy') && library.getAuthorization(532, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
            if (LMRY_countr[0] == 'BR') {
              if ((mode == 'create' || mode == 'copy') && library.getAuthorization(529, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
            if (LMRY_countr[0] == 'CO') {
              if ((mode == 'create' || mode == 'copy') && library.getAuthorization(533, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
            if (LMRY_countr[0] == 'CL') {
              if ((mode == 'create' || mode == 'copy') && library.getAuthorization(530, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
            if (LMRY_countr[0] == 'MX') {
              if ((mode == 'create' || mode == 'copy') && library.getAuthorization(528, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
            if (LMRY_countr[0] == 'PE') {
              if ((mode == 'create' || mode == 'copy') && library.getAuthorization(531, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
          }

        }

        /* *******************************
         * Solo localizaciones Brasileñas
         * Serie de impresion CXC
         ******************************* */
        if (context.fieldId == 'custbody_lmry_serie_doc_cxc' && LMRY_countr[0] == 'BR') {
          recordObj = context.currentRecord;
          if (!LbryBRDuplicate.isValidate(recordObj, licenses)) {
            GetNumberSequenceBR(recordObj, licenses);
          }
        }

        if (context.fieldId == 'custbody_lmry_document_type') {
          if (LMRY_countr[0] == 'BR' && LbryBRDuplicate.isValidate(recordObj, licenses)) {
            var fieldPreim = recordObj.getField('custbody_lmry_num_preimpreso');
            fieldPreim.isDisabled = true;
            recordObj.setValue('tranid', Math.round(1e6 * Math.random()));
          } else {
            var fieldPreim = recordObj.getField('custbody_lmry_num_preimpreso');
            fieldPreim.isDisabled = false;
          }
        }

        /* *******************************
         * Solo si tiene acceso a los
         * Features LatamReady
         ******************************* */
        if (LMRY_access == true && booPageIni == false) {

          // ejecutnado funcion
          booPageIni = true;


          var type = context.mode;

          /* *******************************
           * Solo localizaciones Chilenas
           ******************************* */
          if (LMRY_countr[0] == 'CL' && LMRY_countr[2] == true && LMRY_access == true) {
            // Valida el campo Vendor
            if (context.fieldId == 'entity') {
              // Tipo de Documento - Parent
              var identity = recordObj.getValue({
                fieldId: 'entity'
              });
              if (identity == '' || identity == null) {
                recordObj.setValue({
                  fieldId: 'custbody_lmry_cl_period',
                  value: ''
                });
              }
              // ejecutnado funcion
              booPageIni = false;

              // Sale de la funcion
              return true;
            } // Valida el campo Vendor

            // Setear por defecto 	el campo LATAM - CL UPDATE FACTOR BY PERIOD
            if (context.fieldId == 'trandate' || context.fieldId == 'postingperiod') {

              SetFieldFactor(recordObj);

              // ejecutnado funcion
              booPageIni = false;

              // Sale de la funcion
              return true;
            }
          }

          /* *******************************
           * Solo localizaciones diferentes
           * a Ecuador
           * Latam - Serie de Retencion
           ******************************* */
          if (context.fieldId == 'custbody_lmry_serie_retencion' && LMRY_countr[0] != 'EC' && LMRY_countr[2] == true) {
            recordObj = context.currentRecord;
            var type = context.mode;

            // Valida la Serie de retencion
            var idRetencion = recordObj.getValue({
              fieldId: 'custbody_lmry_serie_retencion'
            });
            if (idRetencion == null || idRetencion == '' || idRetencion == -1) {
              recordObj.setValue({
                fieldId: 'custbody_lmry_preimpreso_retencion',
                value: ''
              });

              // ejecutnado funcion
              booPageIni = false;

              // Sale de la funcion
              return true;
            }

            var columnFrom = search.lookupFields({
              type: 'customrecord_lmry_serie_compro_retencion',
              id: idRetencion,
              columns: ['custrecord_lmry_valor_actual', 'custrecord_lmry_cant_digitos']
            });
            var numeroActual = parseFloat(columnFrom.custrecord_lmry_valor_actual) + 1;
            var cantDigitos = parseFloat(columnFrom.custrecord_lmry_cant_digitos);
            var texto = '';
            for (var cuenta = 0; cuenta < cantDigitos; cuenta++) {
              texto = '0' + texto;
            }
            numeroActual = texto + numeroActual;
            numeroActual = numeroActual.substring(numeroActual.length - cantDigitos, numeroActual.length);

            // Serie de Retencion
            recordObj.setValue({
              fieldId: 'custbody_lmry_preimpreso_retencion',
              value: numeroActual
            });

            // ejecutnado funcion
            booPageIni = false;

            // Sale de la funcion
            return true;
          }

          /* *******************************
           * Solo localizaciones Peruanas
           ******************************* */
          if (LMRY_countr[0] == 'PE' && LMRY_countr[2] == true) {
            // Si hay Cambios en LATAM - TIPO DE TRANSACCION, se resetea LATAM - TIPO DE DOCUMENTO FISCAL
            if (context.fieldId == 'custbody_lmry_transaction_type_doc') {
              var tipo_id_transac = recordObj.getValue({
                fieldId: 'custbody_lmry_transaction_type_doc'
              });
              if (tipo_id_transac != '' && tipo_id_transac != null && tipo_id_transac != -1) {
                recordObj.setValue({
                  fieldId: 'custbody_lmry_document_type',
                  value: ''
                });
                recordObj.setValue({
                  fieldId: 'custbody_lmry_concepto_detraccion',
                  value: ''
                });
                recordObj.setValue({
                  fieldId: 'custbody_lmry_porcentaje_detraccion',
                  value: ''
                });
                Field = recordObj.getField({
                  fieldId: 'custbody_lmry_concepto_detraccion'
                });
                if (Field != '' && Field != null) {
                  Field.isDisabled = true;
                }
              }

              // ejecutnado funcion
              booPageIni = false;

              // Sale de la funcion
              //return true;
            } //

            //Valida Latam - Tipo de Documento Fiscal
            if (context.fieldId == 'custbody_lmry_document_type') {

              var documentType = recordObj.getValue({
                fieldId: 'custbody_lmry_document_type'
              });
              //Verifica si es Factura
              if (documentType != null && documentType != '' && documentType != -1) {

                //Si Latam Tipo Transaccion es Factura de Proveedor
                var id_transac = recordObj.getValue({
                  fieldId: 'custbody_lmry_transaction_type_doc'
                });

                if (id_transac == 1) {
                  //Setea por defecto el campo Latam Concepto Detraccion con valor SIN DETRACCION
                  var record_type = search.lookupFields({
                    type: 'customrecord_lmry_tipo_doc',
                    id: documentType,
                    columns: ['custrecord_lmry_aplica_detracc', 'custrecord_lmry_default_concepto_detracc']
                  });
                  var detraccion2 = record_type.custrecord_lmry_aplica_detracc;
                  //var idtipoDetrac = nlapiLookupField('customrecord_lmry_concepto_detraccion',conceptoDetrac,'customrecord_lmry_concepto_detraccion.internalid')

                  //Si es Factura se habilita y Setea por defecto el campo Latam Concepto Detraccion con valor SIN DETRACCION
                  if (detraccion2 == true && detraccion2 != null) {
                    var conceptoDetrac = record_type.custrecord_lmry_default_concepto_detracc[0].value;
                    recordObj.setValue({
                      fieldId: 'custbody_lmry_concepto_detraccion',
                      value: conceptoDetrac
                    });
                    Field = recordObj.getField({
                      fieldId: 'custbody_lmry_concepto_detraccion'
                    });
                    if (Field != '' && Field != null) {
                      Field.isDisabled = false;
                    }
                  } else {
                    recordObj.setValue({
                      fieldId: 'custbody_lmry_concepto_detraccion',
                      value: 12
                    });
                    Field = recordObj.getField({
                      fieldId: 'custbody_lmry_concepto_detraccion'
                    });
                    if (Field != '' && Field != null) {
                      Field.isDisabled = true;
                    }
                  }
                } else {
                  recordObj.setValue({
                    fieldId: 'custbody_lmry_concepto_detraccion',
                    value: 12
                  });
                  Field = recordObj.getField({
                    fieldId: 'custbody_lmry_concepto_detraccion'
                  });
                  if (Field != '' && Field != null) {
                    Field.isDisabled = true;
                  }
                }

              } else {
                recordObj.setValue({
                  fieldId: 'custbody_lmry_concepto_detraccion',
                  value: 12
                });
                Field = recordObj.getField({
                  fieldId: 'custbody_lmry_concepto_detraccion'
                });
                if (Field != '' && Field != null) {
                  Field.isDisabled = true;
                }
              }

              // ejecutnado funcion
              booPageIni = false;

              // Sale de la funcion
              //return true;
            } //
          } // Solo localizaciones Peruanas

          /* *******************************
           * Solo localizaciones Colombianas
           ******************************* */
          if (LMRY_countr[0] == 'CO' && LMRY_countr[2] == true) {
            // Valida Latam - Tipo de Documento Fiscal
            if (context.fieldId == 'custbody_lmry_document_type') {
              // Latam - Tipo de Documento Fiscal
              var subsidia = recordObj.getValue({
                fieldId: 'subsidiary'
              });
              // Latam - Tipo de Documento Fiscal
              var docufisc = recordObj.getValue({
                fieldId: 'custbody_lmry_document_type'
              });

              /* Valida que no sea Nulo */
              if (docufisc == '' || docufisc == null || docufisc == -1) {
                // ejecutnado funcion
                booPageIni = false;

                // Sale de la funcion
                return true;
              }

              // Latam - CO Tipo Documento Equivalente - Preferencias Generales de Empresa
              var tipodocu = scriptObj.getParameter({
                name: 'custscript_lmry_co_tipo_fiscal_de'
              });

              /* Valida que no sea Nulo */
              if (tipodocu == '' || tipodocu == null) {
                // ejecutnado funcion
                booPageIni = false;

                // Sale de la funcion
                return true;
              }

              /* Solo si los dos campos son iguales muestra el boton */
              if (docufisc == tipodocu) {
                // Internal ID
                co_internalid = 0;
                //  Filtros de la consulta
                var filters = new Array();
                filters[0] = search.createFilter({
                  name: 'custrecord_lmry_co_de_tipo_doc',
                  operator: search.Operator.IS,
                  values: docufisc
                });
                filters[1] = search.createFilter({
                  name: 'custrecord_lmry_co_de_subsidia',
                  operator: search.Operator.IS,
                  values: subsidia
                });
                var preimpreso = search.create({
                  type: 'customrecord_lmry_co_de_numero',
                  columns: ['internalid', 'custrecord_lmry_co_de_numero', 'custrecord_lmry_co_de_rango_ini', 'custrecord_lmry_co_de_rango_fin', 'custrecord_lmry_co_de_digitos'],
                  filters: filters
                });
                var preimpreso = preimpreso.run().getRange(0, 1000);
                if (preimpreso != '' && preimpreso != null) {
                  if (preimpreso.length > 0) {
                    // Internal ID
                    co_internalid = preimpreso[0].getValue('internalid');

                    // Genera el Numero PreImpreso
                    var nroConse = parseInt(preimpreso[0].getValue('custrecord_lmry_co_de_numero')) + 1;
                    var maxPermi = parseInt(preimpreso[0].getValue('custrecord_lmry_co_de_rango_fin'));
                    var digitos = parseInt(preimpreso[0].getValue('custrecord_lmry_co_de_digitos'));
                    if (nroConse > maxPermi) {
                      alert(libAlert.getAlert(11, Language, [maxPermi]));

                      recordObj.setValue({
                        fieldId: 'custbody_lmry_num_preimpreso',
                        value: ''
                      });
                    } else {
                      var longNumeroConsec = parseInt((nroConse + '').length);
                      var llenarCeros = '';
                      for (var i = 0; i < (digitos - longNumeroConsec); i++) {
                        llenarCeros += '0';
                      }
                      nroConse = llenarCeros + nroConse;
                      recordObj.setValue({
                        fieldId: 'custbody_lmry_num_preimpreso',
                        value: nroConse
                      });
                    }
                  }
                }
              }
              // ejecutnado funcion
              booPageIni = false;

              // Sale de la funcion
              //return true;
            } // Valida Latam - Tipo de Documento Fiscal

            // Valida Latam - Serie CxC
            if (context.fieldId == 'custbody_lmry_serie_doc_cxc') {
              GetNumberSequence();

              // ejecutnado funcion
              booPageIni = false;
            } // Valida Latam - Serie CxC
          } // Solo localizaciones Colombiana

          /* ****************************************************** */
          // Solo para la localizaciones de los siguientes paises:
          //  - Peru
          //  - Chile
          //  - EC
          //  - Uruguay
          //  - Brasil
          //  - Argentina
          // agregando los paises 9/29/2021
          //  - Mexico
          //  - Guatemala
          //  - Costa Rica
          //  - Colombia
          //  - Paraguay
          /* ****************************************************** */
          if (LMRY_countr[2] == true && (LMRY_countr[0] == 'PE' ||
            LMRY_countr[0] == 'CL' || LMRY_countr[0] == 'EC' ||
            LMRY_countr[0] == 'UY' || LMRY_countr[0] == 'AR' ||
            LMRY_countr[0] == 'CO' || LMRY_countr[0] == 'MX' ||
            LMRY_countr[0] == 'CR' || LMRY_countr[0] == 'GT' ||
            LMRY_countr[0] == 'PA' || LMRY_countr[0] == 'BR')) {

            // Solo para Peru
            if (LMRY_countr[0] == 'PE' && context.fieldId == 'custbody_lmry_transaction_type_doc') {
              var value = recordObj.getValue({
                fieldId: 'custbody_lmry_transaction_type_doc'
              }); // busca valor conforme nombre del campo

              /* Valida que no sea Nulo */
              if (value == '' || value == null) {
                // ejecutnado funcion
                booPageIni = false;

                // Sale de la funcion
                return true;
              }

              /* Se realiza una busqueda para ver que campos se ocultan */
              // Filtros
              var filters = new Array();
              filters[0] = search.createFilter({
                name: 'custrecord_lmry_id_transaction',
                operator: search.Operator.IS,
                values: value
              });

              // Realiza un busqueda para mostrar los campos
              var hidefields = search.create({
                type: 'customrecord_lmry_transaction_fields',
                columns: ['custrecord_lmry_id_fields'],
                filters: filters
              });
              hidefields = hidefields.run().getRange(0, 1000);
              if (hidefields != null && hidefields != '') {
                for (var i = 0; i < hidefields.length; i++) {
                  var namefield = hidefields[i].getText('custrecord_lmry_id_fields');
                  if (namefield != '' && namefield != null) {
                    Field = recordObj.getField({
                      fieldId: namefield
                    });
                    if (Field != '' && Field != null) {
                      Field.isDisplay = true;
                    }
                  }
                }
              }
              // ejecutnado funcion
              booPageIni = false;

              // Sale de la funcion
              //return true;
            }

            /* ****************************************************** */
            // Popula el campos standart "tranid" con el concadenado
            // de los campos:
            //  - custbody_lmry_document_type
            //  - custbody_lmry_serie_doc_cxp
            //  - custbody_lmry_num_preimpreso
            /* ****************************************************** */
            // Tipo de Documento
            var features = {
              'AR': 689,
              'CL': 686,
              'CR': 690,
              'EC': 685,
              'GT': 691,
              'PA': 692,
              'PE': 684,
              'UY': 683,
              'CO': 687,
              'MX': 688
            };

            /**
             * Code: C0583
             * Summary: Exclude subsidiary and vendor from the concatenation process or trigger the process
             * Date: 23/06/2022
             */
            var featuresExclude = {
              'AR': 916,
              'CO': 917,
              'MX': 918
            };

            if (context.fieldId == 'custbody_lmry_document_type') {
              if (LMRY_countr[0] != 'BR' || !LbryBRDuplicate.isValidate(recordObj, licenses) ||
                (featuresExclude[LMRY_countr[0]] != undefined &&
                  library.getAuthorization(featuresExclude[LMRY_countr[0]], licenses))) {
                var tipDoc = recordObj.getValue({
                  fieldId: 'custbody_lmry_document_type'
                });
                if (tipDoc != '' && tipDoc != null && tipDoc != -1) {
                  if (Val_Campos.length > 0 && LMRY_access == true) {
                    library2.Val_Authorization(recordObj, LMRY_countr[0], licenses);
                  }
                  var tipini = search.lookupFields({
                    type: 'customrecord_lmry_tipo_doc',
                    id: tipDoc,
                    columns: ['custrecord_lmry_doc_initials']
                  });
                  if (tipini.custrecord_lmry_doc_initials == '' || tipini.custrecord_lmry_doc_initials == null) {
                    tipini.custrecord_lmry_doc_initials = '';
                  }
                  var texto = '';

                  if (library.getAuthorization(features[LMRY_countr[0]], licenses) &&
                    (featuresExclude[LMRY_countr[0]] == undefined ||
                      library.getAuthorization(featuresExclude[LMRY_countr[0]], licenses) != true)) {
                    var idsubsi = recordObj.getValue({
                      fieldId: 'subsidiary'
                    });
                    var idprove = recordObj.getValue({
                      fieldId: 'entity'
                    });
                    var presubsi = search.lookupFields({
                      type: 'subsidiary',
                      id: idsubsi,
                      columns: ['tranprefix']
                    });
                    //Latam - Prefix Vendor
                    var preprove = search.lookupFields({
                      type: 'vendor',
                      id: idprove,
                      columns: ['custentity_lmry_prefijo_prov']
                    });

                    presubsi = presubsi.tranprefix;
                    preprove = preprove.custentity_lmry_prefijo_prov;
                    if (preprove.length > 12) {
                      preprove = preprove.slice(0, 12);
                    }
                    texto += preprove.toUpperCase() + ' ' + presubsi.toUpperCase() + ' ';

                  }

                  texto += tipini.custrecord_lmry_doc_initials.toUpperCase() + ' ' +
                    recordObj.getValue({
                      fieldId: 'custbody_lmry_serie_doc_cxp'
                    }) + '-' +
                    recordObj.getValue({
                      fieldId: 'custbody_lmry_num_preimpreso'
                    });
                  recordObj.setValue({
                    fieldId: 'tranid',
                    value: texto
                  });
                }
              }

              // ejecutnado funcion
              booPageIni = false;

              // Sale de la funcion
              return true;
            }

            /*********************** MODIFICACIÓN *****************************************************
                - Fecha: 20/10/2021
                - Descripción: Autocompletar campos Series y Preprinted
                - País: Argentina
                - Feature: AUTOMATIC SET TRANSACTION NUMBER (BILL AND BILL CREDIT)
            ******************************************************************************************/

            if (context.fieldId == 'custbody_lmry_serie_doc_cxp') {
              if (LMRY_countr[0] == 'AR' && library.getAuthorization(707, licenses) == true) {
                recordObj = context.currentRecord;
                var subsidiary = recordObj.getValue('subsidiary');
                var codeSeries = recordObj.getValue('custbody_lmry_serie_doc_cxp');
                var completedSeries = libtools.completeSeries(codeSeries, subsidiary);
                recordObj.setValue({
                  fieldId: 'custbody_lmry_serie_doc_cxp',
                  value: completedSeries,
                  ignoreFieldChange: true
                });
              }
            }
            else if (context.fieldId == 'custbody_lmry_num_preimpreso') {
              if (LMRY_countr[0] == 'AR' && library.getAuthorization(707, licenses) == true) {
                recordObj = context.currentRecord;
                var subsidiary = recordObj.getValue('subsidiary');
                var codePreprinted = recordObj.getValue('custbody_lmry_num_preimpreso');
                var completedPreprinted = libtools.completePreprinted(codePreprinted, subsidiary);
                recordObj.setValue({
                  fieldId: 'custbody_lmry_num_preimpreso',
                  value: completedPreprinted,
                  ignoreFieldChange: true
                });
              }
            }

            // Serie de Impresion - Numero preimpreso
            if (context.fieldId == 'custbody_lmry_serie_doc_cxp' ||
              context.fieldId == 'custbody_lmry_num_preimpreso' ||
              context.fieldId == 'entity' ||
              context.fieldId == 'subsidiary'
            ) {
              var tipDoc = recordObj.getValue({
                fieldId: 'custbody_lmry_document_type'
              });
              if (tipDoc != '' && tipDoc != null && tipDoc != -1) {
                var tipini = search.lookupFields({
                  type: 'customrecord_lmry_tipo_doc',
                  id: tipDoc,
                  columns: ['custrecord_lmry_doc_initials']
                });
                if (tipini.custrecord_lmry_doc_initials == '' ||
                  tipini.custrecord_lmry_doc_initials == null) {
                  tipini.custrecord_lmry_doc_initials = '';
                }
                var texto = '';
                if (library.getAuthorization(features[LMRY_countr[0]], licenses) &&
                  (featuresExclude[LMRY_countr[0]] == undefined ||
                    library.getAuthorization(featuresExclude[LMRY_countr[0]], licenses) != true)) {
                  var idsubsi = recordObj.getValue({
                    fieldId: 'subsidiary'
                  });
                  var idprove = recordObj.getValue({
                    fieldId: 'entity'
                  });
                  var presubsi = search.lookupFields({
                    type: 'subsidiary',
                    id: idsubsi,
                    columns: ['tranprefix']
                  });
                  var preprove = search.lookupFields({
                    type: 'vendor',
                    id: idprove,
                    columns: ['custentity_lmry_prefijo_prov']
                  });

                  presubsi = presubsi.tranprefix;
                  preprove = preprove.custentity_lmry_prefijo_prov;
                  if (preprove.length > 12) {
                    preprove = preprove.slice(0, 12);
                  }
                  texto += preprove.toUpperCase() + ' ' + presubsi.toUpperCase() + ' ';

                }
                texto += tipini.custrecord_lmry_doc_initials.toUpperCase() + ' ' +
                  recordObj.getValue({
                    fieldId: 'custbody_lmry_serie_doc_cxp'
                  }) + '-' +
                  recordObj.getValue({
                    fieldId: 'custbody_lmry_num_preimpreso'
                  });
                recordObj.setValue({
                  fieldId: 'tranid',
                  value: texto
                });
              }
              // ejecutnado funcion
              booPageIni = false;

              // Sale de la funcion
              return true;
            }



          } // Solo para la localizaciones

          /* **************************************************************
           * Muestra campos adicionales por el campo Latam - Report Type
           *  - custbody_lmry_numero_er lista => LatamReady - Número ER
           *  - custbody_lmry_numero_cc lista => LatamReady - Número CC
           *  - custbody_lmry_numero_sr lista => LatamReady - Número SR
           * implementado el 2021.10.20
           * ************************************************************ */
          if (context.fieldId == 'custbody_lmry_type_report' && LMRY_access == true) {
            var parent = recordObj.getValue({ fieldId: 'custbody_lmry_type_report' });
            if (parent != '' && parent != null && parent != -1) {
              // Tipo de Documento - Parent
              visibleFieldsByTypeReport(LMRY_countr[1], parent);
            }
          }

        } // Solo si tiene acceso a los features

        if (ST_FEATURE == true || ST_FEATURE == 'T') {
          if (type != "copy") {
            ST_ConfigFields.setInvoicingIdentifier(recordObj);
            return true;
          }
        }


      } catch (err) {
        alert(err);
        console.error(err);
        recordObj = context.currentRecord;
        library.sendemail2(' [ ValidateField - Field (' + context.fieldId + ')] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }

      // ejecutnado funcion
      booPageIni = false;

      // Sale de la funcion
      return true;

    }


    function validateLine(context) {
      try {
        var form = context.sublistId;
        var type = context.mode;
        recordObj = context.currentRecord;

        // //Variable global Tipo Documento Fiscal
        // var tipodocG = scriptObj.getParameter({
        //   name: 'custscript_lmry_type_doc_fiscal_er2'
        // });
        // //Variable global Codigo de Impuesto
        // var taxcodeG = scriptObj.getParameter({
        //   name: 'custscript_lmry_taxcode_default'
        // });

        //VALIDACION POPUP: ADD A LA LINEA ESTE CERRADO EL POPUP
        if (library.getAuthorization(290, licenses) == true && LMRY_countr[0] == 'BR' && window['custCol'] != null) {
          //if(form == current_sublist && current_line == ){
          var objRecord = context.currentRecord;
          var lineActual = objRecord.getCurrentSublistIndex(form);

          if (lineActual == current_line && form == current_sublist && !window['custCol'].closed) {
            alert('Debe cerrar el popup del Tax Result');
            return false;
          }
          //}
        }

        if (LMRY_access == true) {
          if (form == 'expense' || form == 'item') {

            flag = true;
            //Mandatory

            try {
              if (Val_Campos_Linea.length > 0) {
                if (library2.Val_Line(recordObj, Val_Campos_Linea, form) == false) {
                  return false;
                } else {
                  return true;
                }
              }
            } catch (err) {
              library.sendemail2(' [ validateLine ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
            }

            /* ****************************************************************
             * Se setea las fechas de vencimiento para las lineas de detalle
             * de los expense y de item.
             * Solo cuando sea pais peru y este activo el registro de compras
             * ************************************************************* */
            if (form == 'expense' && LMRY_countr[0] == 'PE' && library.getAuthorization(1, licenses)) {
              recordObj.setCurrentSublistValue({
                sublistId: 'expense',
                fieldId: 'custcol_lmry_col_duedate',
                value: recordObj.getValue({
                  fieldId: 'duedate'
                })
              });
              //nlapiSetCurrentLineItemValue('expense', 'custcol_lmry_col_duedate', nlapiGetFieldValue('duedate'), true, true);
            } else if (form == 'item' && LMRY_countr[0] == 'PE' && library.getAuthorization(1, licenses)) {
              recordObj.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_col_duedate',
                value: recordObj.getValue({
                  fieldId: 'duedate'
                })
              });
              //nlapiSetCurrentLineItemValue('item', 'custcol_lmry_col_duedate', nlapiGetFieldValue('duedate'), true, true);
            }

            // Validacion si tiene activado el Feature
            // Bolivia
            else if (LMRY_countr[0] == 'BO') {
              if (!library.getAuthorization(69, licenses)) {
                return true;
              }
            } // Colombia
            else if (LMRY_countr[0] == 'CO') {
              if (!library.getAuthorization(72, licenses)) {
                return true;
              }
            } // Costa Rica
            else if (LMRY_countr[0] == 'CR') {
              if (!library.getAuthorization(75, licenses)) {
                return true;
              }
            } // El Salvador
            else if (LMRY_countr[0] == 'SV') {
              if (!library.getAuthorization(78, licenses)) {
                return true;
              }
            } // Mexico
            else if (LMRY_countr[0] == 'MX') {
              if (!library.getAuthorization(81, licenses)) {
                return true;
              }
            } // Panama
            else if (LMRY_countr[0] == 'PA') {
              if (!library.getAuthorization(85, licenses)) {
                return true;
              }
            } // Paraguay
            else if (LMRY_countr[0] == 'PY') {
              if (!library.getAuthorization(88, licenses)) {
                return true;
              }
            } // Peru
            else if (LMRY_countr[0] == 'PE') {
              if (!library.getAuthorization(91, licenses)) {
                return true;
              }
            } // Uruguay
            else if (LMRY_countr[0] == 'UY') {
              if (!library.getAuthorization(94, licenses)) {
                return true;
              }
            }
            //Comentado por issue: Se limpiaban campos del item.
            // var tipodoc_cab = recordObj.getValue({
            //   fieldId: 'custbody_lmry_document_type'
            // });

            // if (LMRY_countr[0] == 'PE' && LMRY_countr[2] == true) {

            //   if (tipodoc_cab != null && tipodoc_cab != '' && tipodoc_cab != -1 && tipodocG != null && tipodocG != '' && taxcodeG != null && taxcodeG != '') {

            //     if (form == 'expense') {
            //       if (tipodoc_cab == tipodocG) {
            //         recordObj.setCurrentSublistValue({
            //           sublistId: 'expense',
            //           fieldId: 'taxcode',
            //           value: taxcodeG
            //         });
            //         //nlapiSetCurrentLineItemValue('expense', 'taxcode', taxcodeG, false, true);
            //         return true;
            //       }
            //     }

            //     if (form == 'item') {
            //       if (tipodoc_cab == tipodocG) {
            //         recordObj.setCurrentSublistValue({
            //           sublistId: 'item',
            //           fieldId: 'taxcode',
            //           value: taxcodeG
            //         });
            //         //nlapiSetCurrentLineItemValue('item', 'taxcode', taxcodeG, false, true);
            //         return true;
            //       }
            //     }

            //   }
            // }

          }
        }

      } catch (err) {
        recordObj = context.currentRecord;
        library.sendemail2(' [ validateLine ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
      return true;
    }

    /* ---------------------------------------------------------------------------
     * Funcion Valida si el periodo esta registrado en el registro perosnalizado
     * LatamReady - CL Periodo Factor Actualiza
     * Custom Body : Latam - CL Update factor by period
     * ------------------------------------------------------------------------ */
    function SetFieldFactor(recordObj) {
      if (LMRY_countr[0] == 'CL' && LMRY_countr[2] == true && LMRY_access == true) {
        var postperi = recordObj.getValue({
          fieldId: 'postingperiod'
        });
        if (postperi != '' && postperi != null) {
          // Filtros
          var filters = new Array();
          filters[0] = search.createFilter({
            name: 'custrecord_lmry_cl_period_fact_actual',
            operator: search.Operator.ANYOF,
            values: [postperi]
          });
          // Realiza la busqueda
          var searchbus = search.create({
            type: 'customrecord_lmry_cl_period_fact_actual',
            columns: ['internalid'],
            filters: filters
          });
          searchbus = searchbus.run().getRange(0, 10);
          // Asigna el campo
          if (searchbus != null && searchbus != '' && searchbus.length > 0) {
            // Cantidad del resultado de la busqueda
            var regfield = searchbus[0].getValue('internalid');
            recordObj.setValue({
              fieldId: 'custbody_lmry_cl_period',
              value: regfield
            });
          } else {
            recordObj.setValue({
              fieldId: 'custbody_lmry_cl_period',
              value: ''
            });
          }
        }
      }
      // Sale de la funcion
      return true;
    }


    /* ------------------------------------------------------------------------------------------------------
     * Funcion Inicializa campos WHT de sumatoria
     * --------------------------------------------------------------------------------------------------- */
    function SetCustomField_WHT_Init_VB(recordObj) {
      // Solo para subsidiria de Bolivia, Colombia, Paraguay y Ecuador
      if (LMRY_countr[0] != 'BO' && LMRY_countr[0] != 'CO' && LMRY_countr[0] != 'PY' && LMRY_countr[0] != 'EC') {
        return true;
      }

      if (LMRY_countr[2] == false) {
        return true;
      }

      // Latam Colombia
      recordObj.setValue({
        fieldId: 'custbody_lmry_co_reteica_amount',
        value: 0
      });
      recordObj.setValue({
        fieldId: 'custbody_lmry_co_reteiva_amount',
        value: 0
      });
      recordObj.setValue({
        fieldId: 'custbody_lmry_co_retefte_amount',
        value: 0
      });
      recordObj.setValue({
        fieldId: 'custbody_lmry_co_retecree_amount',
        value: 0
      });
      // Latam Bolivia
      recordObj.setValue({
        fieldId: 'custbody_lmry_bo_autoreteit_whtamount',
        value: 0
      });
      recordObj.setValue({
        fieldId: 'custbody_lmry_bo_reteiue_whtamount',
        value: 0
      });
      // Latam Paraguay
      recordObj.setValue({
        fieldId: 'custbody_lmry_py_autoreteir_amount',
        value: 0
      });
      recordObj.setValue({
        fieldId: 'custbody_lmry_py_reteiva_amount',
        value: 0
      });
      // Latam Ecuador
      recordObj.setValue({
        fieldId: 'custbody_lmry_ec_reteir_amount',
        value: 0
      });
      recordObj.setValue({
        fieldId: 'custbody_lmry_ec_reteiva_amount',
        value: 0
      });

      // Sale de la funcion
      return true;
    }

    /***********************************************
     * Deben tener acceso a LatamReady para las
     * siguientes Transaccion Bill solo para
     * los paises:
     *    Colombia
     ***********************************************/
    function GetNumberSequence() {
      try {
        var currentRCD = currentRecord.get();
        // Solo si el feature Transaction Number Bill
        var featureId = library.getAuthorization(553, licenses);
        if (featureId && LMRY_countr[2] == true && LMRY_access) {
          // Verifica que no este vacio el numero de serie
          var lmry_DocSer = currentRCD.getValue('custbody_lmry_serie_doc_cxc');
          if (lmry_DocSer != '' && lmry_DocSer != null && lmry_DocSer != -1) {

            // Verifica que no este vacio el numero preimpreso
            var lmry_DocNum = currentRCD.getValue('custbody_lmry_num_preimpreso');
            if (lmry_DocNum == '' || lmry_DocNum == null) {
              // Trae el ultimo numero pre-impreso
              var wtax_type = search.lookupFields({
                type: 'customrecord_lmry_serie_impresion_cxc',
                id: lmry_DocSer,
                columns: ['custrecord_lmry_serie_impresion', 'custrecord_lmry_serie_numero_impres', 'custrecord_lmry_serie_rango_fin', 'custrecord_lmry_serie_num_digitos', 'custrecord_ei_preprinted_series']
              });
              var nroConse = parseInt(wtax_type.custrecord_lmry_serie_numero_impres) + 1;
              var maxPermi = parseInt(wtax_type.custrecord_lmry_serie_rango_fin);
              //var serieImp = currentRCD.getText("custbody_lmry_serie_doc_cxc")
              var serieImp = wtax_type.custrecord_lmry_serie_impresion || "";

              // Valida el numero de digitos
              var digitos = parseInt(wtax_type.custrecord_lmry_serie_num_digitos);
              if (digitos == '' || digitos == null) {
                return true;
              }

              // Crea el numero consecutivo
              if (nroConse > maxPermi) {
                // alert(library_translator.getAlert(3, Language, [maxPermi]));
                alert('El ultimo numero para esta serie (' + maxPermi + ') ha sido utilizado. Verificar si existen numeros disponibles en esta serie');
                // Asigna la serie de impresion
                currentRCD.setValue('custbody_lmry_serie_doc_cxp', '');
                // Asigna el numero pre-impero
                currentRCD.setValue('custbody_lmry_num_preimpreso', '');
              } else {
                var longNumeroConsec = parseInt((nroConse + '').length);
                var llenarCeros = '';
                for (var i = 0; i < (digitos - longNumeroConsec); i++) {
                  llenarCeros += '0';
                }
                nroConse = llenarCeros + nroConse;

                // Asigna la serie de impresion
                if (serieImp) currentRCD.setValue('custbody_lmry_serie_doc_cxp', serieImp);
                // Asigna el numero pre-impero
                currentRCD.setValue('custbody_lmry_num_preimpreso', nroConse);

                /* ****************************************************** */
                // Popula el campos standart "tranid" con el concadenado
                // de los campos:
                //  - custbody_lmry_document_type
                //  - custbody_lmry_serie_doc_cxp
                //  - custbody_lmry_num_preimpreso
                /* ****************************************************** */
                // Tipo de Documento
                var tipDoc = recordObj.getValue({
                  fieldId: 'custbody_lmry_serie_doc_cxc'
                });
                if (tipDoc != '' && tipDoc != null && tipDoc != -1) {
                  var tipDoc = recordObj.getValue({
                    fieldId: 'custbody_lmry_document_type'
                  });
                  var tipini = search.lookupFields({
                    type: 'customrecord_lmry_tipo_doc',
                    id: tipDoc,
                    columns: ['custrecord_lmry_doc_initials']
                  });
                  if (tipini.custrecord_lmry_doc_initials == '' || tipini.custrecord_lmry_doc_initials == null) {
                    tipini.custrecord_lmry_doc_initials = '';
                  }
                  var texto = tipini.custrecord_lmry_doc_initials.toUpperCase() + ' ' +
                    recordObj.getText({
                      fieldId: 'custbody_lmry_serie_doc_cxc'
                    }) + '-' +
                    recordObj.getValue({
                      fieldId: 'custbody_lmry_num_preimpreso'
                    });
                  recordObj.setValue({
                    fieldId: 'tranid',
                    value: texto
                  });
                } // Tipo de Documento
              } // Crea el numero consecutivo
            }
          }
        }
      } catch (err) {
        currentRCD = currentRecord.get();
        library.sendemail2(' [ GetNumberSequence ] ' + err, LMRY_script, currentRCD, 'tranid', 'entity');
      }
    }

    /* ------------------------------------------------------------------------------------------------------
     * Valida si el tipo de documento tiene una Cta Contable asignada
     * --------------------------------------------------------------------------------------------------- */
    function ValidateAccount(recordObj) {
      var swexits = false;
      try {
        var proveedor = recordObj.getValue({
          fieldId: 'entity'
        });
        var tipDoc = recordObj.getValue({
          fieldId: 'custbody_lmry_document_type'
        });
        if (proveedor == '' || proveedor == null || tipDoc == '' || tipDoc == null || tipDoc == -1) {
          return swexits;
        }
        var tipoMoneda = recordObj.getValue({
          fieldId: 'currency'
        });
        var esPersona = search.lookupFields({
          type: 'vendor',
          id: proveedor,
          columns: ['isperson']
        });
        //if (esPersona != null && esPersona != '') {
        var esEmpresa;
        if (esPersona.isperson == false || esPersona.isperson == 'F') {
          esEmpresa = 'T';
        } else {
          esEmpresa = 'F';
        }

        var filter = new Array();
        filter[0] = search.createFilter({
          name: 'isinactive',
          operator: search.Operator.IS,
          values: 'F'
        });
        filter[1] = search.createFilter({
          name: 'custrecord_config_es_empresa',
          operator: search.Operator.IS,
          values: esEmpresa
        });
        filter[2] = search.createFilter({
          name: 'custrecord_config_moneda',
          operator: search.Operator.IS,
          values: tipoMoneda
        });
        filter[3] = search.createFilter({
          name: 'custrecord_config_tipo_doc_cxp',
          operator: search.Operator.IS,
          values: tipDoc
        });

        var searchresults = search.create({
          type: 'customrecord_lmry_config_acc_vendor',
          columns: ['custrecord_config_cuenta_contable'],
          filters: filter
        });
        var searchresults = searchresults.run().getRange(0, 1000);
        if (searchresults == null || searchresults == '') {
          swexits = false;
          //recordObj.setValue({fieldId:'entity', value:''});
          //nlapiSetFieldValue('entity', '');
          alert('No se ha configurado una cuenta contable para este tipo de documento');
        } else {
          recordObj.setValue({
            fieldId: 'account',
            value: searchresults[0].getValue('custrecord_config_cuenta_contable')
          });
          swexits = true;
        }
        //}

      } catch (err) {
        library.sendemail2(' [ ValidateAccount ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
      return swexits;
    }

    /*
     * Valida que el documento sea el unico
     */
    function validaDocumentosIguales(licenses) {
      var exist = true;
      try {
        var recordObj = currentRecord.get();
        var idtransac = recordObj.id;
        var proveedor = recordObj.getValue({
          fieldId: 'entity'
        });
        tipoDoc = recordObj.getValue({
          fieldId: 'custbody_lmry_document_type'
        });
        var nroSerie = recordObj.getValue({
          fieldId: 'custbody_lmry_serie_doc_cxp'
        });
        var nroDoc = recordObj.getValue({
          fieldId: 'custbody_lmry_num_preimpreso'
        });
        var subsidia = recordObj.getValue({
          fieldId: 'subsidiary'
        });

        if (proveedor != '' &&
          (tipoDoc != '' && tipoDoc != null && tipoDoc != -1) &&
          (nroSerie != '' && nroSerie != null && nroSerie != -1) &&
          (nroDoc != '' && nroDoc != null)) {

          var exclusionDocument = libtools.validateExclusionDocument(tipoDoc);
          var filters = new Array();
          filters.push(search.createFilter({
            name: 'mainline',
            operator: search.Operator.IS,
            values: 'T'
          }));
          filters.push(
            search.createFilter({ name: 'entity', operator: search.Operator.IS, values: proveedor })
          );
          if (library.getAuthorization(829, licenses) == true && exclusionDocument) filters.pop();
          filters.push(search.createFilter({
            name: 'custbody_lmry_document_type',
            operator: search.Operator.IS,
            values: tipoDoc
          }));
          filters.push(search.createFilter({
            name: 'custbody_lmry_serie_doc_cxp',
            operator: search.Operator.IS,
            values: nroSerie
          }));
          filters.push(search.createFilter({
            name: 'custbody_lmry_num_preimpreso',
            operator: search.Operator.IS,
            values: nroDoc
          }));
          // Valida si es OneWorld
          if (featuresubs) {
            filters.push(search.createFilter({
              name: 'subsidiary',
              operator: search.Operator.IS,
              values: subsidia
            }));
          }
          var searchresults = search.create({
            type: 'vendorbill',
            columns: ['internalid', 'entity'],
            filters: filters
          });
          var searchresults = searchresults.run().getRange(0, 1000);
          if (searchresults != null && searchresults != '') {
            //prefijo actual
            var prefix = recordObj.getValue({
              fieldId: 'entity'
            });
            var oldpref = search.lookupFields({
              type: 'vendor',
              id: prefix,
              columns: ['custentity_lmry_prefijo_prov']
            });
            oldpref = oldpref.custentity_lmry_prefijo_prov;
            //prefijo nuevo
            var prefixid = searchresults[0].getValue('entity');
            var newpref = search.lookupFields({
              type: 'vendor',
              id: prefixid,
              columns: ['custentity_lmry_prefijo_prov']
            });
            newpref = newpref.custentity_lmry_prefijo_prov;


            // Se valida que no sea el mismo registro
            if (idtransac == searchresults[0].getValue('internalid')) {
              exist = true;
            } else {
              if (library.getAuthorization(829, licenses)) {
                if (exclusionDocument) {
                  log.debug('Entro al feature de validación', 'validateExclusionDocument');
                  var msgErrorDuplicate = {
                    'en': "The field 'Reference No.' (tranid) entered already exists, please enter a different one",
                    'es': "El campo 'Número de referencia' (tranid) introducido ya existe, por favor introduzca uno diferente",
                    'pt': "O campo 'Número de referência' (tranid) inserido já existe, por favor insira um diferente"
                  };
                  alert(msgErrorDuplicate[Language] || msgErrorDuplicate['en']);
                  exist = false;
                  return exist;
                }
              }
              if (oldpref == newpref) {
                alert(libAlert.getAlert(14, Language, []));
                exist = false;
              } else {
                exist = true;
              }

            }
          }
        }
      } catch (err) {
        library.sendemail2(' [ validaDocumentosIguales ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
      return exist;
    }

    /* ------------------------------------------------------------------------------------------------------
     * A la variable FeatureID se le asigna el valore que le corresponde y si tiene activo
     * el enabled feature access.
     * --------------------------------------------------------------------------------------------------- */
    function ValidateAccessVB(subsiID) {
      try {
        if (subsiID == '' || subsiID == null) {
          return true;
        }

        // Inicializa variables Locales y Globales
        LMRY_access = false;
        LMRY_countr = library.Get_Country_STLT(subsiID);
        LMRY_countr = activate_fe(LMRY_countr, licenses);


        // Verifica que el arreglo este lleno
        if (LMRY_countr.length < 1) {
          return true;
        }

        LMRY_access = library.getCountryOfAccess(LMRY_countr, licenses);

        if (LMRY_countr[0] == '' || LMRY_countr[0] == null) {
          return true;
        }

        // Solo si tiene acceso
        Val_Campos = '';
        if (LMRY_access == true) {
          Val_Campos = library2.Val_Authorization(recordObj, LMRY_countr[0], licenses);
          Val_Campos_Linea = library2.Val_Line_Busqueda(recordObj, LMRY_countr[0], licenses);

        }
      } catch (err) {
        library.sendemail2(' [ ValidateAccessVB ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }

      return true;
    }

    function activate_fe(fe_countr, licenses) {
      var autfe = false;

      var authorizations_fe = {
        'AR': 260,
        'BO': 261,
        'BR': 262,
        'CL': 263,
        'CO': 264,
        'CR': 265,
        'EC': 266,
        'SV': 267,
        'GT': 268,
        'MX': 269,
        'PA': 270,
        'PY': 271,
        'PE': 272,
        'UY': 273,
        'NI': 408,
        'DO': 401
      };

      if (authorizations_fe[fe_countr[0]]) {
        autfe = library.getAuthorization(authorizations_fe[fe_countr[0]], licenses);
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
      field.removeSelectOption({
        value: null,
      });
    }

    function addOptions(id, rcd, values) {

      var field = rcd.getField(id);
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

    function ws_exchange_rate() {

      try {

        var er_code_country;
        var wsSubsi = recordObj.getValue('subsidiary');
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
                  id: recordObj.getValue('subsidiary'),
                  columns: ['currency']
                });

                var primaryCurrencyId = primaryCurrency.currency[0].value;
              } else {
                var primaryCurrencyId = Number(recordObj.getValue('custpage_lmry_basecurrency'));
              };

              if (primaryCurrencyId != idcurrencyUSD && recordObj.getValue('currency') == idcurrencyUSD) {

                result_ws_exchange_rate(er_code_country, 1);
                var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
                lmry_exchange_rate_field.isDisplay = true;
              } else if (primaryCurrencyId == idcurrencyUSD && recordObj.getValue('currency') != idcurrencyUSD) {

                var secondaryCurrency = search.lookupFields({
                  type: 'currency',
                  id: recordObj.getValue('currency'),
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

                var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
                lmry_exchange_rate_field.isDisplay = true;
                result_ws_exchange_rate(codeCountry[codeCurrency], 2);

              } else {
                var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
                lmry_exchange_rate_field.isDisplay = false;
              }
            }
          }
        }

      } catch (err) {
        Library_Mail.sendemail2(' [ ws_exchange_rate ] ' + err, LMRY_script, recordObj, 'tranid', 'entity');
      }

    }

    function result_ws_exchange_rate(er_code_country, exchange_rate_case) {

      var er_trandate = recordObj.getValue('trandate');
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
          removeOtions('custpage_lmry_exchange_rate', recordObj);
          addOptions('custpage_lmry_exchange_rate', recordObj, result);
        }
      }
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
        autfe = library.getAuthorization(authorizations_fe[code_countr], licenses);
      }

      return autfe;
    }

    function GetNumberSequenceBR(currentRCD, licenses) {
      try {

        if (LMRY_countr[0] != 'BR' || library.getAuthorization(650, licenses) == false) {
          return true;
        }

        // Verifica que no este vacio el numero de serie
        var lmry_DocSer = currentRCD.getValue('custbody_lmry_serie_doc_cxc');
        log.error('lmry_DocSer', lmry_DocSer);
        if (lmry_DocSer != '' && lmry_DocSer != null && lmry_DocSer != -1) {

          // Verifica que no este vacio el numero preimpreso
          var lmry_DocNum = currentRCD.getValue('custbody_lmry_num_preimpreso');
          if (lmry_DocNum == '' || lmry_DocNum == null) {

            // Trae el ultimo numero pre-impreso
            var wtax_type = search.lookupFields({
              type: 'customrecord_lmry_serie_impresion_cxc',
              id: lmry_DocSer,
              columns: ['custrecord_lmry_serie_impresion', 'custrecord_lmry_serie_numero_impres', 'custrecord_lmry_serie_rango_fin', 'custrecord_lmry_serie_num_digitos', 'custrecord_ei_preprinted_series']
            });
            var nroConse = Number(wtax_type.custrecord_lmry_serie_numero_impres) + 1;
            var maxPermi = Number(wtax_type.custrecord_lmry_serie_rango_fin);
            var digitos = Number(wtax_type.custrecord_lmry_serie_num_digitos);
            var isEISeries = wtax_type.custrecord_ei_preprinted_series;
            var serieImp = wtax_type.custrecord_lmry_serie_impresion;


            //Para Brazil, si la serie es de facturacion no se genera Numero Pre impreso
            if (LMRY_countr[0] == 'BR' && (isEISeries == true || isEISeries == 'T')) {
              return true;
            }

            // Valida el numero de digitos
            if (digitos == '' || digitos == null) {
              digitos = 0;
            }

            // Crea el numero consecutivo
            if (nroConse > maxPermi) {
              //alert(library_translator.getAlert(3, Language, [maxPermi]));
              var alertJson = {
                'es': 'El ultimo numero para esta serie (LatamReady) ha sido utilizado. Verificar si existen numeros disponibles en esta serie',
                'pt': 'O último número desta série (LatamReady) foi usado. Verifique se há números disponíveis nesta série',
                'en': 'The last number for this series (LatamReady) has been used. Check if there are numbers available in this series',
              };
              var alertmsg = alertJson[Language] || alertJson['en'];

              alertmsg = alertmsg.replace('LatamReady', maxPermi);

              alert(alertmsg);

              // Asigna la serie de impresion
              currentRCD.setValue('custbody_lmry_serie_doc_cxp', '');
              // Asigna el numero pre-impero
              currentRCD.setValue('custbody_lmry_num_preimpreso', '');
            } else {
              var longNumeroConsec = Number((nroConse + '').length);
              var llenarCeros = '';
              for (var i = 0; i < (digitos - longNumeroConsec); i++) {
                llenarCeros += '0';
              }
              nroConse = llenarCeros + nroConse;

              // Asigna la serie de impresion
              if (serieImp) currentRCD.setValue('custbody_lmry_serie_doc_cxp', serieImp);
              // Asigna el numero pre-impero
              currentRCD.setValue('custbody_lmry_num_preimpreso', nroConse);

              // Llama a la funcion de seteo del Tranid
              kofaxLibrary.Set_Field_tranid(currentRCD, LMRY_countr, licenses);
            }
          }
        }

      } catch (err) {
        library.sendemail2(' [ GetNumberSequenceBR ] ' + err, LMRY_script, currentRCD, 'transactionnumber', 'entity');
      }
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

        library.sendemail2(' [ onclick_event_co_wht_lines ] ' + err, LMRY_script, currentRCD, 'transactionnumber', 'entity');

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
      pageInit: pageInit,
      fieldChanged: fieldChanged,
      //postSourcing: postSourcing,
      //sublistChanged: sublistChanged,
      //lineInit: lineInit,
      validateField: validateField,
      //funcionCancel: funcionCancel,
      validateLine: validateLine,
      /*validateInsert: validateInsert,
      validateDelete: validateDelete,*/
      saveRecord: saveRecord,
      onclick_event_co_wht_lines: onclick_event_co_wht_lines,
    };

  });
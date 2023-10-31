/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_VendorCreditCLNT_V2.0.js                    ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jun 20 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */


define(['N/log', 'N/record', 'N/runtime', 'N/search', 'N/https', 'N/translation', 'N/currentRecord', 'N/url', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0',
  './Latam_Library/LMRY_libNumberInWordsLBRY_V2.0', './Latam_Library/LMRY_Val_TransactionLBRY_V2.0', './Latam_Library/LMRY_ExchangeRate_LBRY_V2.0', './Latam_Library/LMRY_AlertTraductorPurchase_LBRY_V2.0',
  './Latam_Library/LMRY_ST_Transaction_ConfigFields_LBRY_V2.0', './Latam_Library/LMRY_WebService_LBRY_v2.0.js', './Latam_Library/LMRY_BR_ValidateDuplicate_LBRY_V2.0', './Latam_Library/LMRY_Validate_TranID_LBRY',
  './Latam_Library/LMRY_libToolsFunctionsLBRY_V2.0', './Latam_Library/LMRY_KofaxIntegrations_LBRY_V2.0'
],

  function (log, record, runtime, search, https, translation, currentRecord, url, library, library1, library2, library_ExchRate, libAlert,
    ST_ConfigFields, LR_webService, LbryBRDuplicate, lbry_valTranID, libtools, kofaxLibrary) {

    var scriptObj = runtime.getCurrentScript();
    var LMRY_script = 'LatamReady - Vendor Credit CLNT V2.0';
    var LMRY_access = false;
    var LMRY_countr = new Array();
    var tipoDoc = '';
    var Val_Campos = new Array();
    var Val_Campos_Linea = new Array();
    var recordObj = null;
    var flag = false;
    var Language = '';
    var type = '';
    var licenses = [];
    var LMRY_swsubs = false;
    var LMRY_swinit = false;
    var LMRY_swpnro = false;
    var idcurrencyUSD = 0;
    var whtCodes;

    var ST_FEATURE = false;

    var featuresubs = runtime.isFeatureInEffect({
      feature: 'SUBSIDIARIES'
    });

    // Primera carga del pageInit
    var booPageIni = false;
    /**
     * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
     * @appliedtorecord recordType
     *
     * @param {String} type Access mode: create, copy, edit
     * @returns {Void}
     */

    function pageInit(context) {

      try {
        recordObj = context.currentRecord;
        type = context.mode;

        booPageIni = true;
        Language = scriptObj.getParameter({
          name: 'LANGUAGE'
        });

        Language = Language.substring(0, 2);
        LMRY_swinit = true;
        LMRY_swsubs = true;
        // Valida el Acceso
        var subsidiaria = recordObj.getValue({
          fieldId: 'subsidiary'
        });

        licenses = library.getLicenses(subsidiaria);

        if (type == 'create') {
          var status = recordObj.getField('custpage_uni_set_status');
          if (status != '' && status != null) {
            status.isDisplay = false;
          }
        }

        Validate_Access(subsidiaria, recordObj);

        if (type == 'create' || type == 'copy') {
          var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
          if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
            lmry_exchange_rate_field.isDisplay = false;
        }
          var lmry_basecurrency = recordObj.getField('custpage_lmry_basecurrency');
          if (lmry_basecurrency != null && lmry_basecurrency != '') {
            lmry_basecurrency.isDisplay = false;
        }

          if (recordObj.getValue('entity') != '' && recordObj.getValue('entity') != null) {
            ws_exchange_rate();
          }
        }

        // Desactiva el campo
        var fieldObj = recordObj.getField({
          fieldId: 'custbody_lmry_subsidiary_country'
        });
        if (fieldObj != '' && fieldObj != null) {
          fieldObj.isDisabled = true;
        }

        if (library.getAuthorization(117, licenses) == false) {
          fieldObj = recordObj.getField({
            fieldId: 'custbody_lmry_reference_transaction'
          });
          if (fieldObj != '' && fieldObj != null) {
            fieldObj.isDisabled = true;
          }
          fieldObj = recordObj.getField({
            fieldId: 'custbody_lmry_reference_transaction_id'
          });
          if (fieldObj != '' && fieldObj != null) {
            fieldObj.isDisabled = true;
          }
        }

        if (library.getAuthorization(27, licenses) && LMRY_countr[0] == 'CO') { //CO - Retenciones Manuales
          whtCodes = getWHTCodes();
          displayFields(recordObj, 'custbody_lmry_co_reteica', whtCodes);
          displayFields(recordObj, 'custbody_lmry_co_reteiva', whtCodes);
          displayFields(recordObj, 'custbody_lmry_co_retefte', whtCodes);
          displayFields(recordObj, 'custbody_lmry_co_autoretecree', whtCodes);
        }

        if (type == 'create' || type == 'copy') {
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
          recordObj.setValue({
            fieldId: 'custbody_lmry_scheduled_process',
            value: false
          });
          // 2022.07.04 - Se agrego esta opcion
          // Aplicar Latam WHT Code
          recordObj.setValue({
            fieldId: 'custbody_lmry_apply_wht_code',
            value: true
          });
        }


        // Solo para cuando es nuevo y se copia
        if (type == 'copy') {
          // Tipo de Documento - Serie  - Numero - Folio
          recordObj.setValue({
            fieldId: 'tranid',
            value: ''
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_transaction_type_doc',
            value: ''
          });
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
            fieldId: 'custbody_lmry_foliofiscal',
            value: ''
          });
          // Documentos de Referencia
          recordObj.setValue({
            fieldId: 'custbody_lmry_doc_serie_ref',
            value: ''
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_num_doc_ref',
            value: ''
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_doc_ref_date',
            value: ''
          });
          // Campos WHT Ecuador
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

          // Monto en letras
          recordObj.setValue({
            fieldId: 'custbody_lmry_pa_monto_letras',
            value: ''
          });
          // JSON de retenciones
          recordObj.setValue({
            fieldId: 'custbody_lmry_features_active',
            value: ''
          });

        }

        if (type == 'create') {
          // Seteo de CustomField WHT
          kofaxLibrary.SetCustomField_WHT_Code_VC(recordObj, LMRY_countr, licenses);
        }

        //Logica de Tipo de Cambio Automatica
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


        //BR CFOP        
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


        // Solo localizaciones Peruanas
        if (LMRY_countr[0] == 'PE' && LMRY_access == true) {

          var tipTra = scriptObj.getParameter({
            name: 'custscript_lrmy_bill_credit'
          });
          if (tipTra != null && tipTra != '') {
            recordObj.setValue({
              fieldId: 'custbody_lmry_transaction_type_doc',
              value: parseInt(tipTra)
            });
            fieldObj = recordObj.getField({
              fieldId: 'custbody_lmry_transaction_type_doc'
            });
            if (fieldObj != '' && fieldObj != null) {
              fieldObj.isDisabled = true;
            }
          }


          // Muestra los campos por transaccion
          Get_Fields_PE(recordObj);

          LMRY_swinit = false;
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
            libtools.setLegalDocumentType(recordObj);
          }
        }/*****************************************************************************/

      } catch (err) {
        recordObj = context.currentRecord;
        library.sendemail2(' [ PageInit ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }

      booPageIni = false;
    }

    /**
     * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
     * @appliedtorecord recordType
     *
     * @returns {Boolean} True to continue save, false to abort save
     */
    function saveRecord(context) {
      try {

        recordObj = context.currentRecord;
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
        /* Validacion 04/02/22 */
        var lockedPeriod = recordObj.getValue("custpage_lockedperiod");
        log.error('lockedPeriod', lockedPeriod);
        if (lockedPeriod == true || lockedPeriod == 'T') {
          return true;
        }
        /* Fin validacion 04/02/22 */

        // if(type == 'create' && LMRY_countr[0] == 'PE'){
        //   var valida = ValidateAccount(recordObj);
        //   if(!valida){
        //     return false;
        //   }
        // }
        if (type == 'edit' && LMRY_countr[0] == 'MX') {
          if (flag && library.getAuthorization(151, licenses) == true) {
            var aplicadoID = 0;
            var cantApply = recordObj.getLineCount({
              sublistId: 'apply'
            });
            for (var i = 0; i < cantApply; i++) {
              var aplica = recordObj.getSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                line: i
              });
              if (aplica == 'T' || aplica == true) {
                aplicadoID = recordObj.getSublistValue({
                  sublistId: 'apply',
                  fieldId: 'internalid',
                  line: i
                });
                break;
              }
            }
            if (aplicadoID != 0) {
              var searchPay = search.create({
                type: 'vendorpayment',
                columns: ['internalid'],
                filters: [
                  ['voided', 'is', 'F'], 'AND', ['appliedtotransaction.internalidnumber', 'equalto', aplicadoID]
                ]
              });
              searchPay = searchPay.run().getRange(0, 1000);
              if (searchPay != '' && searchPay != null) {
                alert(libAlert.getAlert(12, Language, []));
                return false;
              }
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

        // Valida el Acceso
        var subsidiaria = recordObj.getValue({
          fieldId: 'subsidiary'
        });

        Validate_Access(subsidiaria, recordObj);

        if (Val_Campos.length > 0) {
          if (library2.Val_Mensaje(recordObj, Val_Campos) == false)
            return false;
        }
        // Inicializa campos WHT de sumatoria
        if (context.mode == 'create' || context.mode == 'copy') {
          SetCustomField_WHT_Init_VC(recordObj);
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
        }

        // Solo localizaciones Peruanas
        if (LMRY_countr[0] == 'PE') {
          if (library.getAuthorization(1, licenses) == true) {
            // Valida si existe un documento igual
            //  if (!validaDocumentosIguales()) {
            //      return false;
            //  }

            /*
             * ECM 23-07-13: Se actualiza campo oculto para que nunca cambie tipo de cambio de la
             * instancia a pesar de dar OK en mensaje estandar.
             */
            recordObj.setValue({
              fieldId: 'updatecurrency',
              value: ''
            });

            // Valida periodo contable
            var periodo = recordObj.getText({
              fieldId: 'postingperiod'
            });
            return confirm(libAlert.getAlert(15, Language, [periodo.toUpperCase()]));
          }
        }

        // Solo localizaciones Colombianas
        if (LMRY_countr[0] == 'CO' && LMRY_access == true) {
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

            // Solo si el feature Transaction Number Bill Credit
            var featureId = library.getAuthorization(865, licenses);
            if (featureId && LMRY_access) {
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
            } // Solo si el feature Transaction Number Bill Credit
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
          } // Bill Credit - Latam - Serie CXC - Colombia
        }

        //SOlo localizaciones Bolivianas
        if (LMRY_countr[0] == 'BO' && LMRY_access == true) {
          check_vendor = recordObj.getValue('custbody_lmry_bo_config_vendor_line')
          var lic_alert = library.getAuthorization(994, licenses);;
          if (lic_alert && check_vendor) {
            num_lin_item = recordObj.getLineCount('item')
            num_lin_expense = recordObj.getLineCount('expense')
            folio = ''
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
        if (LMRY_countr[0] == 'BR' && library.getAuthorization(667, licenses)) {

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
          'AR': 699,
          'CL': 696,
          'CR': 700,
          'EC': 695,
          'GT': 701,
          'PA': 702,
          'PE': 694,
          'UY': 693,
          'CO': 697,
          'MX': 698
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

        //////////////////////////////////////////////////////////////////////////////////
        /* Fecha de modificación: 28/10/2021                                            */
        /* Valida duplicado de TranID en base al feature VALIDATE TRANID (VENDOR BILL)  */
        //////////////////////////////////////////////////////////////////////////////////
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

        /*****************************************************************************
            Code: C0243-S0006
            Feature: MANUAL PERCEPTIONS (A-P) - (875)
            Date: 06/05/2022
        ******************************************************************************/
        if (LMRY_countr[0] == 'AR' && library.getAuthorization(875, licenses)) libtools.setBaseAmount(recordObj);
        /****************************************************************************/

      } catch (err) {
        recordObj = context.currentRecord;
        library.sendemail2(' [ saveRecord ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
      return true;
    }

    /**
     * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
     * @appliedtorecord recordType
     *
     * @param {String} type Sublist internal id
     * @param {String} name Field internal id
     * @param {Number} linenum Optional line item number, starts from 1
     * @returns {Boolean} True to continue changing field value, false to abort value change
     */
    function validateField(context) {
      try {

        ST_FEATURE = runtime.isFeatureInEffect({
          feature: "tax_overhauling"
        });

        var sublist = context.sublistId;
        var lblname = context.fieldId;
        var linenum = context.line;
        recordObj = context.currentRecord;

        /* Validacion 04/02/22 */
        if (lblname == 'postingperiod') {

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

        // Valida acceso y Seteo de CustomField WHT
        if (lblname == 'custbody_lmry_subsidiary_country') {

          booPageIni = true;

          var lmry_country = recordObj.getValue({
            fieldId: 'custbody_lmry_subsidiary_country'
          });
          if (lmry_country == null || lmry_country == '') {
            return true;
          }

          if (featuresubs == true || featuresubs == 'T') {
            var subs = recordObj.getValue({
              fieldId: 'subsidiary'
            });
            if (subs != '' && subs != null && subs !== undefined) {
              Validate_Access(subs, recordObj);
              kofaxLibrary.SetCustomField_WHT_Code_VC(recordObj, LMRY_countr, licenses);
            }
          } else {
            Validate_Access(1, recordObj);
            kofaxLibrary.SetCustomField_WHT_Code_VC(recordObj, LMRY_countr, licenses);
          }

          booPageIni = false;
          return true;
        }

        if (lblname == 'custbody_lmry_document_type' && booPageIni == false) {

          if (LMRY_countr[0] == 'BR' && LbryBRDuplicate.isValidate(recordObj, licenses)) {
            var fieldPreim = recordObj.getField('custbody_lmry_num_preimpreso');
            fieldPreim.isDisabled = true;
            recordObj.setValue('tranid', Math.round(1e6 * Math.random()));
          } else {
            var fieldPreim = recordObj.getField('custbody_lmry_num_preimpreso');
            fieldPreim.isDisabled = false;
          }

          booPageIni = true;
          var tipDoc = recordObj.getValue({
            fieldId: 'custbody_lmry_document_type'
          });
          if (tipDoc != '' && tipDoc != null && tipDoc != -1) {

            if (Val_Campos.length > 0 && LMRY_access == true) {
              library2.Val_Authorization(recordObj, LMRY_countr[0], licenses);
            }
          }

          booPageIni = false;
          return true;
        }

        //Logica de Tipo de Cambio Automatica
        if (lblname == 'currency') {
          var subsi = recordObj.getValue({
            fieldId: 'subsidiary'
          });
          var al_country = recordObj.getValue({
            fieldId: 'custbody_lmry_subsidiary_country'
          });
          if (subsi != null && subsi != '') {
            if (LMRY_countr[0] == 'AR') {
              if ((type == 'create' || type == 'copy') && library.getAuthorization(532, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
            if (LMRY_countr[0] == 'BR') {
              if ((type == 'create' || type == 'copy') && library.getAuthorization(529, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
            if (LMRY_countr[0] == 'CO') {
              if ((type == 'create' || type == 'copy') && library.getAuthorization(533, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
            if (LMRY_countr[0] == 'CL') {
              if ((type == 'create' || type == 'copy') && library.getAuthorization(530, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
            if (LMRY_countr[0] == 'MX') {
              if ((type == 'create' || type == 'copy') && library.getAuthorization(528, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
            if (LMRY_countr[0] == 'PE') {
              if ((type == 'create' || type == 'copy') && library.getAuthorization(531, licenses)) {
                library_ExchRate.autosetExchRate(recordObj, al_country, 'purchase');
              }
            }
          }

        }

        /* *******************************
         * Solo localizaciones Brasileñas
         * Serie de impresion CXC
         ******************************* */
        if (lblname == 'custbody_lmry_serie_doc_cxc' && LMRY_countr[0] == 'BR') {
          if (!LbryBRDuplicate.isValidate(recordObj, licenses)) {
            GetNumberSequenceBR(recordObj, licenses);
          }
        }

        if (LMRY_countr[0] == 'CO') {
          // Valida Latam - Serie CxC
          if (context.fieldId == 'custbody_lmry_serie_doc_cxc') {
            GetNumberSequence();

            // ejecutando funcion
            booPageIni = false;
          } // Valida Latam - Serie CxC
        }

        // Solo si esta esta activo el Feature del pais
        if (LMRY_access == true && booPageIni == false) {
          booPageIni = true;
          Validate_Field(sublist, lblname, linenum, recordObj);
          booPageIni = false;
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

        /* ****************************************************** */
        // Popula el campos standart "tranid" con el concadenado
        // de los campos:
        //  - custbody_lmry_document_type
        //  - custbody_lmry_serie_doc_cxp
        //  - custbody_lmry_num_preimpreso
        //  - tranprefix - subsidiary
        //  - custentity_lmry_prefijo_prov - vendor
        /* ****************************************************** */
        var features = {
          'AR': 699,
          'CL': 696,
          'CR': 700,
          'EC': 695,
          'GT': 701,
          'PA': 702,
          'PE': 694,
          'UY': 693,
          'CO': 697,
          'MX': 698
        };

        /**
         * Code: C0583
         * Summary: Exclude subsidiary and vendor from the concatenation process or trigger the process
         * Date: 15/06/2022
         */
        var featuresExclude = {
          'AR': 916,
          'CO': 917,
          'MX': 918
        };

        if (((LMRY_countr[0] == 'PE' || LMRY_countr[0] == 'CL' || LMRY_countr[0] == 'EC' ||
          LMRY_countr[0] == 'UY' || LMRY_countr[0] == 'AR' || LMRY_countr[0] == 'CO' ||
          LMRY_countr[0] == 'MX' || LMRY_countr[0] == 'CR' || LMRY_countr[0] == 'GT' ||
          LMRY_countr[0] == 'PA') &&
          library.getAuthorization(features[LMRY_countr[0]], licenses)) ||
          (featuresExclude[LMRY_countr[0]] != undefined &&
            library.getAuthorization(featuresExclude[LMRY_countr[0]], licenses))) {
          if (context.fieldId == 'custbody_lmry_document_type') {
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
              if (featuresExclude[LMRY_countr[0]] == undefined || library.getAuthorization(featuresExclude[LMRY_countr[0]], licenses) != true) texto += preprove.toUpperCase() + ' ' + presubsi.toUpperCase() + ' ';
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
            return true;
          }

          // Serie de Impresion - Numero preimpreso
          if (context.fieldId == 'custbody_lmry_serie_doc_cxp' ||
            context.fieldId == 'custbody_lmry_num_preimpreso' ||
            context.fieldId == 'entity' ||
            context.fieldId == 'subsidiary') {

            var tipDoc = recordObj.getValue({ fieldId: 'custbody_lmry_document_type' });
            if (tipDoc != '' && tipDoc != null && tipDoc != -1) {
              var tipini = search.lookupFields({
                type: 'customrecord_lmry_tipo_doc',
                id: tipDoc,
                columns: ['custrecord_lmry_doc_initials']
              });
              if (tipini.custrecord_lmry_doc_initials == '' || tipini.custrecord_lmry_doc_initials == null) {
                tipini.custrecord_lmry_doc_initials = '';
              }
              var texto = '';
              var idsubsi = recordObj.getValue({ fieldId: 'subsidiary' });
              var idprove = recordObj.getValue({ fieldId: 'entity' });
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
              if (featuresExclude[LMRY_countr[0]] == undefined || library.getAuthorization(featuresExclude[LMRY_countr[0]], licenses) != true) texto += preprove.toUpperCase() + ' ' + presubsi.toUpperCase() + ' ';
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
            // Sale de la funcion
            return true;
          }
        }

        if (ST_FEATURE == true || ST_FEATURE == "T") {
          if (type != "copy") {
            ST_ConfigFields.setInvoicingIdentifier(recordObj);
            return true;
          }
        }

      } catch (err) {
        recordObj = context.currentRecord;
        alert(err);
        console.error(err);
        library.sendemail2(' [ validateField ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
      return true;
    }

    function validateLine(context) {
      if (context.sublistId == 'item' || context.sublistId == 'expense') {
        flag = true;
        try {
          if (Val_Campos_Linea.length > 0) {
            if (library2.Val_Line(context.currentRecord, Val_Campos_Linea, context.sublistId) == false) {
              return false;
            } else {
              return true;
            }
          }
        } catch (err) {
          recordObj = context.currentRecord;
          library.sendemail2(' [ validateLine ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
        }
      }
      return true;
    }


    /* ------------------------------------------------------------------------------------------------------
     * Funcion Muestra Fields for Transaccions
     * --------------------------------------------------------------------------------------------------- */
    function Get_Fields_PE(recordObj) {
      var value = recordObj.getValue({
        fieldId: 'custbody_lmry_transaction_type_doc'
      }); // busca valor conforme nombre del campo

      /* Se realiza una busqueda para ver que campos se ocultan */
      //library.onFieldsHide([2],recordObj,false);

      /* Valida que no sea Nulo */
      if (value == '' || value == null) {
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
      var hidefields = hidefields.run().getRange(0, 1000);
      if (hidefields != null && hidefields != '') {
        for (var i = 0; i < hidefields.length; i++) {
          var namefield = hidefields[i].getText('custrecord_lmry_id_fields');
          if (namefield != '' && namefield != null) {
            Field = recordObj.getField({
              fieldId: namefield
            });
            if (Field != null && Field != '') {
              Field.isDisplay = true;
            }
            //nlapiSetFieldDisplay(namefield, true);
          }
        }
      }
    }

    /* ------------------------------------------------------------------------------------------------------
     * Funcion setea los campos de cabecera
     * --------------------------------------------------------------------------------------------------- */
    function Get_Entity_Subsidiary() {
      try {
        // Valida si la subsidiaria tiene activa la funcionalidad

        var url = url.resolveScript({
          scriptId: 'customscript_lmry_get_subsidiary_stlt',
          deploymentId: 'customdeploy_lmry_get_subsidiary_stlt',
          returnExternalUrl: true
        });
        url += '&id=' + currentRecord.getValue({
          fieldId: 'entity'
        });
        var get = https.get({
          url: url
        });
        bod = get.body;

        // Valida si tiene acceso
        Validate_Access(bod, currentRecord.get());

        // Solo para Peru
        if (LMRY_countr[0] == 'PE' && LMRY_access == true) {

          var tipTra = scriptObj.getParameter({
            name: 'custscript_lrmy_bill_credit'
          });
          currentRecord.setValue({
            fieldId: 'custbody_lmry_transaction_type_doc',
            value: tipTra
          });
          Field = currentRecord.getField({
            fieldId: 'custbody_lmry_transaction_type_doc'
          });
          if (Field != '' && Field != null) {
            Field.isDisabled = true;
          }
        }
      } catch (err) {
        library.sendemail2(' [ Get_Entity_Subsidiary ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
      return true;
    }

    /*
     *  Valida el cambio de campo
     */
    function Validate_Field(sublist, lblname, linenum, recordObj) {
      // Setea campos Latam
      try {
        /* ********************************************************
         * Transaccion Vendor Credit solo para los paises:
         * Peru, Chile y Ecuador
         * y que tenga acceso a LatamReady
         ******************************************************* */
        if (LMRY_countr[0] != 'PE' && LMRY_countr[0] != 'CL' && LMRY_countr[0] != 'EC' && LMRY_countr[0] != 'UY') {
          return true;
        }

        /*if (lblname == 'entity' && recordObj.getValue({
            fieldId: 'entity'
          }) != '') {
          ValidateAccount(recordObj);
          return true;
        }*/

        if (LMRY_countr[0] == 'PE' && lblname == 'custbody_lmry_transaction_type_doc') {
          Get_Fields_PE(recordObj);
        }

        if (lblname == 'custbody_lmry_serie_doc_cxp' || lblname == 'custbody_lmry_num_preimpreso' || lblname == 'custbody_lmry_document_type') {

          var tipDoc = recordObj.getValue({
            fieldId: 'custbody_lmry_document_type'
          });
          if (tipDoc != '' && tipDoc != null && tipDoc != -1) {
            var tipini = search.lookupFields({
              type: 'customrecord_lmry_tipo_doc',
              id: tipDoc,
              columns: ['custrecord_lmry_doc_initials']
            });
            if (tipini.custrecord_lmry_doc_initials == '' || tipini.custrecord_lmry_doc_initials == null) {
              tipini.custrecord_lmry_doc_initials = '';
            }
            var texto = tipini.custrecord_lmry_doc_initials.toUpperCase() + ' ' +
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

            // Sale de la funcion
            return true;
          }
        }
        if (sublist == 'item' && lblname == 'item') {
          var proveedor = recordObj.getValue({
            fieldId: 'entity'
          });
          if (proveedor == '' || proveedor == null) {
            alert(libAlert.getAlert(13, Language, []));
            return false;
          } else {
            return true;
          }
        }
      } catch (err) {
        library.sendemail2(' [ Validate_Field ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }

      return true;
    }

    /* ------------------------------------------------------------------------------------------------------
     * Funcion Inicializa campos WHT de sumatoria
     * --------------------------------------------------------------------------------------------------- */
    function SetCustomField_WHT_Init_VC(recordObj) {
      // Solo para subsidiria de Bolivia, Colombia y Paraguay
      if (LMRY_countr[0] != 'BO' && LMRY_countr[0] != 'CO' && LMRY_countr[0] != 'PY') {
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
    }


    /*
     * Valida si el tipo de documento tiene una Cta Contable asignada
     */
    function ValidateAccount(recordObj) {
      var swexits = false;
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
        /*recordObj.setValue({fieldId:'entity', value:''});
        alert('No se ha configurado una cuenta contable para este tipo de documento');*/
        // nlapiSetFieldValue('entity', '');
        // swexits = false;

        alert('No se ha configurado una cuenta contable para este tipo de documento');

      } else {
        recordObj.setValue({
          fieldId: 'account',
          value: searchresults[0].getValue('custrecord_config_cuenta_contable')
        });
        swexits = true;
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
          filters.push(search.createFilter({
            name: 'entity',
            operator: search.Operator.IS,
            values: proveedor
          }));
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
            type: 'vendorcredit',
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
     * Al momento de cambiar el campo entity se va hacer una recarga a la paguina pasando de datos
     * subsidiary, customform y entity.
     * --------------------------------------------------------------------------------------------------- */
    function fieldChanged(scriptContext) {

      ST_FEATURE = runtime.isFeatureInEffect({
        feature: "tax_overhauling"
      });

      recordObj = scriptContext.currentRecord;
      var name = scriptContext.fieldId;
      var sublist = scriptContext.sublistId;

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
      }

      if (LMRY_countr[0] == 'CO' && library.getAuthorization(27, licenses)) {
        if (['custbody_lmry_co_reteica', 'custbody_lmry_co_reteiva', 'custbody_lmry_co_retefte', 'custbody_lmry_co_autoretecree'].indexOf(name) > -1) {
          displayFields(recordObj, name, whtCodes);
        }
      }

      //SETEO DE CFOP AUTOMATICO CUANDO ESTA LLENO EN EL ITEM
      if (LMRY_countr[0] == 'BR' && LMRY_access == true) {
        var flagCFOP = true;
        if (sublist == 'item' && name == 'item') {
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

        if (sublist == 'item' && name == 'custcol_lmry_br_tran_outgoing_cfop' && flagCFOP == true) {
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

      } //FIN CFOP
      return true;
    }

    /* ------------------------------------------------------------------------------------------------------
     * A la variable featureId se le asigna el valore que le corresponde
     * --------------------------------------------------------------------------------------------------- */
    function Validate_Access(subsiID) {
      try {
        // Oculta todos los campos LMRY
        //library.onFieldsHide(2, recordObj);

        if (subsiID == '' || subsiID == null) {
          return true;
        }

        // Inicializa variables Locales y Globales
        LMRY_access = false;
        LMRY_countr = library.Get_Country_STLT(subsiID);

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
          //library.onFieldsDisplayBody(recordObj, LMRY_countr[1], 'custrecord_lmry_on_vendor_credit', false);
          Val_Campos = library2.Val_Authorization(recordObj, LMRY_countr[0], licenses);
          Val_Campos_Linea = library2.Val_Line_Busqueda(recordObj, LMRY_countr[0], licenses);
        }

        // Ya paso por esta validacion
        LMRY_swsubs = false;
      } catch (err) {
        library.sendemail2(' [ Validate_Access ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
      return true;
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
                if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
                  lmry_exchange_rate_field.isDisplay = true;
              }
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
                if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
                  lmry_exchange_rate_field.isDisplay = true;
              }
                result_ws_exchange_rate(codeCountry[codeCurrency], 2);

              } else {
                var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
                if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
                  lmry_exchange_rate_field.isDisplay = false;
              }
              }
            }
          }
        }

      } catch (err) {
        library.sendemail2(' [ ws_exchange_rate ] ' + err, LMRY_script, recordObj, 'tranid', 'entity');
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

        if (LMRY_countr[0] != 'BR' || library.getAuthorization(667, licenses) == false) {
          return true;
        }

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

    function GetNumberSequence() {
      try {
        var currentRCD = currentRecord.get();
        // Solo si el feature Transaction Number Bill Credit
        var featureId = library.getAuthorization(865, licenses);
        if (featureId && LMRY_access) {
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
              var serieImp = currentRCD.getText("custbody_lmry_serie_doc_cxc");

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

    function getWHTCodes() {
      var whtCodes = {};
      var searchWht = search.create({
        type: "customrecord_lmry_wht_code",
        columns: [
          "internalid", "custrecord_lmry_wht_variable_rate"
        ],
        filters: [
          ["isinactive", "is", "F"]
        ]
      }).run().getRange(0, 1000);

      if (searchWht && searchWht.length) {
        for (var i = 0; i < searchWht.length; i++) {
          var internalid = searchWht[i].getValue("internalid");
          var rateVariable = searchWht[i].getValue("custrecord_lmry_wht_variable_rate");
          whtCodes[internalid] = rateVariable;
        }
      }
      console.log("whtCodes", JSON.stringify(whtCodes));
      return whtCodes;
    }

    function displayFields(recordObj, field, whtCodes) {
      var jsonAux = {
        "custbody_lmry_co_retefte": ["custpage_lmry_retefte_base", "custpage_lmry_retefte_rate"],
        "custbody_lmry_co_reteiva": ["custpage_lmry_reteiva_base", "custpage_lmry_reteiva_rate"],
        "custbody_lmry_co_reteica": ["custpage_lmry_reteica_base", "custpage_lmry_reteica_rate"],
        "custbody_lmry_co_autoretecree": ["custpage_lmry_retecree_base", "custpage_lmry_retecree_rate"]
      }

      var whtCode = recordObj.getValue(field);
      if (whtCode != null) {
        if (whtCodes[whtCode]) {
          if (recordObj.getField(jsonAux[field][0])) recordObj.getField(jsonAux[field][0]).isDisplay = true;
          if (recordObj.getField(jsonAux[field][1])) recordObj.getField(jsonAux[field][1]).isDisplay = true;
        } else {
          if (recordObj.getField(jsonAux[field][0])) recordObj.getField(jsonAux[field][0]).isDisplay = false;
          if (recordObj.getField(jsonAux[field][1])) recordObj.getField(jsonAux[field][1]).isDisplay = false;
        }
      }
    }

    return {
      pageInit: pageInit,
      fieldChanged: fieldChanged,
      /*postSourcing: postSourcing,
      sublistChanged: sublistChanged,
      lineInit: lineInit,*/
      validateField: validateField,
      //funcionCancel: funcionCancel,
      validateLine: validateLine,
      /*validateInsert: validateInsert,
      validateDelete: validateDelete,*/
      saveRecord: saveRecord,
    };

  });
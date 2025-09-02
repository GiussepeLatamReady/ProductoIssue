/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_CustomerPaymentURET_V2.0.js                 ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jul 20 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/log', 'N/config', 'N/ui/serverWidget', 'N/record', 'N/search', 'N/runtime', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_HideViewLBRY_V2.0', './Latam_Library/LMRY_GLImpact_LBRY_V2.0',
  './WTH_Library/LMRY_TransferenciaIVA_LBRY_V2.0', './WTH_Library/LMRY_BR_WHT_CustPaymnt_LBRY', './Latam_Library/LMRY_UniversalSetting_LBRY', './Latam_Library/LMRY_ValidateClosePeriod_LBRY_V2.0', './Latam_Library/LMRY_GT_IvaReverse_LBRY_V2.0.js',
  './Latam_Library/LMRY_Custom_ExchangeRate_Field_LBRY_V2.0.js', './Latam_Library/LMRY_Custom_ExchangeRate_LBRY_V2.0.js',
  './Latam_Library/LMRY_BR_Redirect_Payments_LBRY_V2.0'
],

  function (log, config, serverWidget, record, search, runtime, library, library_HideView, libraryGLImpact, lbry_traslado_IVA, lbry_br_custpaymt, library_Uni_Setting, LibraryValidatePeriod, ivaReverse, Library_ExchangeRate_Field, Library_ExchangeRate,Library_RedirecPayment) {

    var LMRY_script = "LatamReady - Customer Payment URET V2.0";
    var recordObj = '';
    var isUret = true;
    var licenses = [];

    var subsi_OW = runtime.isFeatureInEffect({
      feature: "SUBSIDIARIES"
    });

    var form = '';

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

        var type = scriptContext.type;
        var id_inv = '';
        form = scriptContext.form;
        recordObj = scriptContext.newRecord;

        var type_interface = runtime.executionContext;
        if (type_interface == 'MAPREDUCE') {
          return true;
        }

        var LMRY_Result = new Array();
        var subsidiari = recordObj.getValue({
          fieldId: 'subsidiary'
        });

        var typeDoc = recordObj.type;

        licenses = library.getLicenses(subsidiari);

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

        if (scriptContext.type == 'create' || scriptContext.type == "copy") {

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

        var country = new Array();
        country[0] = '';
        country[1] = '';

        if (type == 'create') {
          try {

            if (runtime.executionContext == 'USERINTERFACE') {
              id_inv = scriptContext.request.parameters.inv;
            }

            var subsidiari = recordObj.getValue({
              fieldId: 'subsidiary'
            });

            var customer = recordObj.getValue({
              fieldId: 'customer'
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

          if (form != '' && form != null) {
            library_HideView.HideSubTab(form, country[1], recordObj.type, licenses);
          }
        }

        // Si es nuevo, editado o copiado
        if ((type == 'create' || type == 'edit' || type == 'view') &&
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

          if (subsi_OW == true || subsi_OW == 'T') {
            LMRY_Result = ValidAccessCPU(recordObj.getValue({
              fieldId: 'subsidiary'
            }), form, type, licenses);
          } else {
            LMRY_Result = ValidAccessCPU(1, form, type, licenses);
          }

          /************************************* MODIFICACIÓN ***********************************************************
             - Fecha: 07/05/2020
             - Descripción: Deshabilita el campo Customer, en caso este activado el feature Disable Customer
          **************************************************************************************************************/

          if (type == 'edit' || (type == 'create' && id_inv != null && id_inv != '')) {

            if (LMRY_Result[2] && library.disableField(typeDoc, LMRY_Result[0], licenses)) {
              // customer
              var customer = form.getField({
                id: 'customer'
              });

              if (customer != null && customer != '') {
                customer.updateDisplayType({
                  displayType: 'disabled'
                });

              }

              //Se bloqueará el campo subsidiaria
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

          // Solo al momento de ver
          if (type == 'view') {
            // Solo para Mexico
            if (LMRY_Result[0] == 'MX') {
              // Lista de estado de proceso
              var procesado = recordObj.getValue({
                fieldId: 'custbody_lmry_schedule_transfer_of_iva'
              });

              // Verifica si esta procesado y si esta activo el feature de bloqueo de transaccion
              if (procesado == 1) {
                if (library.getAuthorization(97, licenses) == true) {
                  form.removeButton('edit');
                }
              }
            }

            // Obtiene el idioma del entorno
            var featurelang = runtime.getCurrentScript().getParameter({
              name: 'LANGUAGE'
            });
            featurelang = featurelang.substring(0, 2);

            // Lógica GL Impact
            var btnGl = libraryGLImpact.featureGLImpact(recordObj, 'customerpayment');
            //log.error('btnGl', btnGl);
            if (btnGl == 1) {
              if (featurelang == 'es') {
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
              form.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';
            }
          }

        }

        // Si es nuevo, editado o copiado
        if (type == 'create' || type == 'edit' || type == 'copy') {
          var paymentMethod = recordObj.getValue({
            fieldId: 'custbody_lmry_paymentmethod'
          });

          if (paymentMethod == '' || paymentMethod == null) {
            var intEntity = recordObj.getValue({
              fieldId: 'customer'
            });

            if (intEntity != '' && intEntity != null) {
              var intPayment = search.lookupFields({
                type: 'customer',
                id: intEntity,
                columns: ['custentity_lmry_paymentmethod']
              });

              if (intPayment.custentity_lmry_paymentmethod != '' && intPayment.custentity_lmry_paymentmethod != null) {
                recordObj.setValue({
                  fieldId: 'custbody_lmry_paymentmethod',
                  value: intPayment.custentity_lmry_paymentmethod[0].value
                });
              }
            }
          }
        }

        /** TEST */
        if (type == 'view') {
          if (LMRY_Result[0] == 'GT' && library.getAuthorization(871, licenses) == true) {
            form.addButton({
              id: 'custpage_id_button_ivarev',
              label: 'IVA REVERSE',
              functionName: 'onclick_event_iva_reverse()'
            });
            form.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';
            ivaReverse.disableButton(scriptContext);
          }
        }

      } catch (error) {
        recordObj = scriptContext.newRecord;
        library.sendemail2(' [ beforeLoad ] ' + error, LMRY_script, recordObj, 'tranid', 'customer');
      }
    }

    /* ------------------------------------------------------------------------------------------------------
     * A la variable featureId se le asigna el valore que le corresponde
     * --------------------------------------------------------------------------------------------------- */
    function ValidAccessCPU(ID, CR, type, licenses) {

      try {
        var LMRY_access = false;
        var LMRY_countr = new Array();
        var LMRY_Result = new Array();

        // Oculta todos los campos LMRY
        if (type == 'view') {
          library.onFieldsHide([2], CR, isUret);
        }


        LMRY_countr = library.Validate_Country(ID);

        // Verifica que el arreglo este lleno
        if (LMRY_countr.length < 1) {
          LMRY_Result[2] = LMRY_access;
          return LMRY_Result;
        }

        if ((type == 'view' || type == 'edit') && (CR != '' && CR != null)) {
          library_HideView.HideSubTab(CR, LMRY_countr[1], recordObj.type, licenses);
        }
        LMRY_access = library.getCountryOfAccess(LMRY_countr, licenses);
        //log.error('LMRY_access',LMRY_access);
        // Solo si tiene acceso
        if (LMRY_access == true) {

          if (type == 'view') {
            library.onFieldsDisplayBody(CR, LMRY_countr[1], 'custrecord_lmry_on_customer_payment', isUret);
            var lmry_DocTip = recordObj.getValue({
              fieldId: 'custbody_lmry_document_type'
            });
            if (lmry_DocTip != '' && lmry_DocTip != null) {
              // Visualiza campos LMRY
              library.onFieldsDisplayParent(CR, LMRY_countr[1], lmry_DocTip, isUret);
            }
          }
        }

        // Asigna Valores
        LMRY_Result[0] = LMRY_countr[0];
        LMRY_Result[1] = LMRY_countr[1];
        LMRY_Result[2] = LMRY_access;

      } catch (error) {
        library.sendemail2(' [ ValidAccessCPU ] ' + error, LMRY_script, recordObj, 'tranid', 'customer');
      }

      return LMRY_Result;

    }

    function beforeSubmit(scriptContext) {

      var newRecord = scriptContext.newRecord;
      try {
        var subsidiary = newRecord.getValue('subsidiary');
        var form = scriptContext.form;
        var type = scriptContext.type;

        var type_interface = runtime.executionContext;
        if (type_interface == 'MAPREDUCE') {
          return true;
        }

        licenses = library.getLicenses(subsidiary);
        var LMRY_Result = ValidAccessCPU(subsidiary, form, type, licenses);

        //Tipo de cambio nuevo por defecto
        if (scriptContext.type == "create") {
          if (newRecord.getValue('customer') != '' && newRecord.getValue('customer') != null) {
            Library_ExchangeRate.ws_exchange_rate_uret(newRecord, licenses);
          }
        }

        /* Validacion 04/02/22 */
        // Libreria - Valida Periodo cerrado
        if (LibraryValidatePeriod.validatePeriod(newRecord.getValue('postingperiod'), licenses, LMRY_Result[0], 'sales')) return true;
        /* Fin validacion 04/02/22 */

        if (scriptContext.type == scriptContext.UserEventType.DELETE) {
          if (LMRY_Result[0] == 'MX' && library.getAuthorization(243, licenses) == true) {
            lbry_traslado_IVA.deleteTransactionIVA(scriptContext);
          }

          if (LMRY_Result[0] == 'BR') {
            lbry_br_custpaymt.beforeDeletePayment(newRecord);
          }
        }

        var type_event = scriptContext.type;
        //Universal Setting se realiza solo al momento de crear
        if (type_event == 'create' && (type_interface == 'USERINTERFACE' || type_interface == 'CSVIMPORT')) {

          var type_document = newRecord.getValue('custbody_lmry_document_type');

          if (library_Uni_Setting.auto_universal_setting(licenses, false)) {
            //Solo si el campo LATAM - LEGAL DOCUMENT TYPE se encuentra vacío
            if (type_document == '' || type_document == null) {
              library_Uni_Setting.automatic_setfield(newRecord, false);
              library_Uni_Setting.set_preimpreso(newRecord, LMRY_Result, licenses);
              library_Uni_Setting.set_template(newRecord, licenses);
            }
          }
        }


      } catch (err) {
        log.error('[ beforeSubmit ]', err);
        library.sendemail2(' [ beforeSubmit ] ' + err, LMRY_script, newRecord, 'tranid', 'customer');
      }

      if(!Library_RedirecPayment.validatePaymentSave(LMRY_Result[0],subsidiary,false,type_event)) {
        throw Library_RedirecPayment.getTranslations().LMRY_VALIDATE;
      }
    }

    function afterSubmit(scriptContext) {
      var type = scriptContext.type;
      var newRecord = scriptContext.newRecord;
      try {
        var subsidiary = newRecord.getValue('subsidiary');
        var form = scriptContext.form;
        var type_interface = runtime.executionContext;
        if (type_interface == 'MAPREDUCE') {
          return true;
        }

        licenses = library.getLicenses(subsidiary);
        var LMRY_Result = ValidAccessCPU(subsidiary, form, type, licenses);

        /* Validacion 04/02/22 */
        // Libreria - Valida Periodo cerrado
        if (LibraryValidatePeriod.validatePeriod(newRecord.getValue('postingperiod'), licenses, LMRY_Result[0], 'sales')) return true;
        /* Fin validacion 04/02/22 */

        // Tipo de evento del users events
        var type_event = scriptContext.type;

        //Universal Setting se realiza solo al momento de crear
        if (type_event == 'create' && (type_interface == 'USERINTERFACE' || type_interface == 'CSVIMPORT')) {
          if (library_Uni_Setting.auto_universal_setting(licenses, false)) {
            //Seteo de campos perteneciente a record anexado
            library_Uni_Setting.automatic_setfieldrecord(newRecord);
          }
        }

        if (type == 'create' || type == 'edit') {
          if (LMRY_Result[0] == 'MX' && library.getAuthorization(243, licenses) == true) {
            lbry_traslado_IVA.afterSubmitTrasladoIva(scriptContext);
          }
        }


        if (LMRY_Result[0] == 'BR') {
          if (type == 'edit') {
            var memo = search.lookupFields({
              type: 'customerpayment',
              id: newRecord.id,
              columns: ['memo']
            }).memo;

            if (memo == 'VOID') {
              lbry_br_custpaymt.voidPayment(newRecord);
            }
          }

          if (type == "delete") {
            lbry_br_custpaymt.deleteOtherChargesTransactions(scriptContext.oldRecord);
          }
        }

      } catch (err) {
        log.error(' [ afterSubmit ] ', err);
        library.sendemail2(' [ afterSubmit ] ' + err, LMRY_script, newRecord, 'tranid', 'customer');
      }
    }

    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    };
  });

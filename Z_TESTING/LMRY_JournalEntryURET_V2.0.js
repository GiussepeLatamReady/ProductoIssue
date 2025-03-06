/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_JournalEntryURET_V2.0.js                    ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jul 20 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

define(['N/suiteAppInfo', 'N/config', 'N/log', 'N/ui/serverWidget', 'N/record', 'N/search', 'N/runtime', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0',
  './Latam_Library/LMRY_HideViewLBRY_V2.0', './Latam_Library/LMRY_CusTransferIvaLBRY_V2.0', './Latam_Library/LMRY_GLImpact_LBRY_V2.0',
  './Latam_Library/LMRY_Custom_ExchangeRate_Field_LBRY_V2.0.js', './Latam_Library/LMRY_libDIOTLBRY_V2.0'
],

  function (suiteAppInfo, config, log, serverWidget, record, search, runtime, library, library_HideView, Library_CusTransfer, libraryGLImpact, Library_ExchangeRate_Field, Library_DIOT) {

    var LMRY_script = "LatamReady - Journal Entry URET V2.0";
    var recordObj = '';
    var isUret = true;
    var allLicenses = {};
    var licenses = [];

    var subsi_OW = runtime.isFeatureInEffect({
      feature: "SUBSIDIARIES"
    });

    // Obtiene el idioma del entorno
    var featurelang = runtime.getCurrentScript().getParameter({
      name: 'LANGUAGE'
    });
    featurelang = featurelang.substring(0, 2);

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
        var form = scriptContext.form;
        recordObj = scriptContext.newRecord;
        var LMRY_Result = '';

        var LMRY_countr = new Array();
        var country = new Array();
        country[0] = '';
        country[1] = '';
        allLicenses = library.getAllLicenses();

        

        var subsidiary = getSubsidiaryID(scriptContext);
        var countryName = getSubsidiaryCountryName(subsidiary);
        log.error("subsidiary",subsidiary)
        log.error("countryName",countryName)
        if (allLicenses[subsidiary] != null && allLicenses[subsidiary] != '') {
          licenses = allLicenses[subsidiary];
        } else {
          licenses = [];
        }

        if (type == 'create') {
          if (scriptContext.form != '' && scriptContext.form != null) {
            library_HideView.HideSubTab(scriptContext.form, countryName, recordObj.type, licenses);
            //library_HideView.HideColumn(scriptContext.form, country[1], recordObj.type);
          }
        }

        if (scriptContext.type == 'create' || scriptContext.type == 'copy') {

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

        if (subsi_OW == true || subsi_OW == 'T') {
          LMRY_Result = ValidateAccessJE(subsidiary, scriptContext.form, isUret, type);
        } else {
          LMRY_Result = ValidateAccessJE(1, scriptContext.form, isUret, type);
        }
        if (type == 'view' || type == 'edit'|| type == 'create') {
          if (!validateAdvanceHV(LMRY_Result[0], licenses)) {
            library_HideView.HideColumn(scriptContext.form, countryName, recordObj.type, licenses);
          }
          if (LMRY_Result[0] == 'PE') {
            Journal_add(type, form);
          }

          if (type == 'view') {
            // Lógica GL Impact
            var btnGl = libraryGLImpact.featureGLImpact(recordObj, 'journalentry');
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

        if (runtime.executionContext == 'USERINTERFACE' && LMRY_Result[0] == 'CO') {
          var isSuiteAppInstalledCO = suiteAppInfo.isSuiteAppInstalled({
            suiteAppId: "com.latamready.lmrycolocalization"
          });
          if ((library.getAuthorization(720, licenses) == true || library.getAuthorization(721, licenses) == true) && !isSuiteAppInstalledCO) {
            var formObj = scriptContext.form;
            var reteica = formObj.getField('custbody_lmry_co_reteica');
            if (reteica) {
              reteica.updateDisplayType({
                displayType: 'hidden'
              });
            }
            var reteiva = formObj.getField('custbody_lmry_co_reteiva');
            if (reteiva) {
              reteiva.updateDisplayType({
                displayType: 'hidden'
              });
            }
            var retefte = formObj.getField('custbody_lmry_co_retefte');
            if (retefte) {
              retefte.updateDisplayType({
                displayType: 'hidden'
              });
            }
            var retecree = formObj.getField('custbody_lmry_co_autoretecree');
            if (retecree) {
              retecree.updateDisplayType({
                displayType: 'hidden'
              });
            }
          }
          if (!(library.getAuthorization(720, licenses) == true || library.getAuthorization(721, licenses) == true) && !isSuiteAppInstalledCO) {
            var formObj = scriptContext.form;
            var sublistItem = formObj.getSublist({
              id: 'line'
            });
            if (sublistItem && JSON.stringify(sublistItem) != '{}') {
              var itemFieldCREE = sublistItem.getField({
                id: 'custcol_lmry_co_autoretecree'
              });
              if (itemFieldCREE) {
                if (JSON.stringify(itemFieldCREE) != '{}') {
                  itemFieldCREE.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                  });
                }
              }
              var itemFieldIVA = sublistItem.getField({
                id: 'custcol_lmry_co_reteiva'
              });
              if (itemFieldIVA) {
                if (JSON.stringify(itemFieldIVA) != '{}') {
                  itemFieldIVA.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                  });
                }
              }
              var itemFieldICA = sublistItem.getField({
                id: 'custcol_lmry_co_reteica'
              });
              if (itemFieldICA) {
                if (JSON.stringify(itemFieldICA) != '{}') {
                  itemFieldICA.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                  });
                }
              }
              var itemFieldFTE = sublistItem.getField({
                id: 'custcol_lmry_co_retefte'
              });
              if (itemFieldFTE) {
                if (JSON.stringify(itemFieldFTE) != '{}') {
                  itemFieldFTE.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                  });
                }
              }
            }
          }
        }

        
              
      } catch (error) {
        log.error("[beforeload] error",error)
        log.error("[beforeload] error stack",error.stack)
        library.sendemail(' [ beforeLoad ] ' + error, LMRY_script);
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
        var LMRY_Result = '';
        recordObj = scriptContext.newRecord;

        allLicenses = library.getAllLicenses();
        var subsidiary = recordObj.getValue('subsidiary');
        if (allLicenses[subsidiary] != null && allLicenses[subsidiary] != '') {
          licenses = allLicenses[subsidiary];
        } else {
          licenses = [];
        }

        if (type == 'delete') {
          if (subsi_OW == true || subsi_OW == 'T') {
            LMRY_Result = ValidateAccessJE(recordObj.getValue({
              fieldId: 'subsidiary'
            }), scriptContext.form, isUret, type);
          } else {
            LMRY_Result = ValidateAccessJE(1, scriptContext.form, isUret, type);
          }

          if (LMRY_Result[0] == 'PE') {
            if (library.getAuthorization(96, licenses) == true) {
              var cantidadFacturas = recordObj.getLineCount({
                sublistId: 'line'
              });

              for (var i = 0; i < cantidadFacturas; i++) {
                var facturaDetraccion = recordObj.getSublistValue({
                  sublistId: 'line',
                  fieldId: 'custcol_lmry_factura_prov_detraccion',
                  line: i
                });

                if (facturaDetraccion != null && facturaDetraccion != '') {
                  record.submitFields({
                    type: 'vendorbill',
                    id: facturaDetraccion,
                    values: {
                      'custbody_lmry_doc_detraccion_date': null,
                      'custbody_lmry_num_comprobante_detrac': '',
                      'custbody_lmry_reference_transaction': null,
                      'custbody_lmry_reference_transaction_id': ''
                    },
                    options: {
                      disableTriggers: true
                    }
                  });
                }
              }
            }
          }
        }

      } catch (error) {
        library.sendemail(' [ beforeSubmit ] ' + error, LMRY_script);
      }

      return true;
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

      try {
        var type = scriptContext.type;
        recordObj = scriptContext.newRecord;
        var LMRY_Result = '';

        allLicenses = library.getAllLicenses();
        var subsidiary = recordObj.getValue('subsidiary');
        if (allLicenses[subsidiary] != null && allLicenses[subsidiary] != '') {
          licenses = allLicenses[subsidiary];
        } else {
          licenses = [];
        }

        if (['create', 'edit', 'copy'].indexOf(type) != -1) {
          if (subsi_OW == true || subsi_OW == 'T') {
            LMRY_Result = ValidateAccessJE(recordObj.getValue({
              fieldId: 'subsidiary'
            }), scriptContext.form, isUret, type);
          } else {
            LMRY_Result = ValidateAccessJE(1, scriptContext.form, isUret, type);
          }

          if (LMRY_Result[0] == 'MX') {
            var reverseJournal = recordObj.getValue('reversaldate');
            if (library.getAuthorization(151, licenses) == true) {
              if (!(reverseJournal == null || reverseJournal == '')) {
                Library_DIOT.deleteMxTransFieldsforJournal(recordObj.id);
              } else {
                Library_DIOT.CalculoDIOT(recordObj);
              }
            }
            if (type == 'create') {
              if (library.getAuthorization(21, licenses) == true) {
                // Solo para pagos anulados
                var voidpayment = recordObj.getValue({
                  fieldId: 'createdfrom'
                });
                if (voidpayment != '' && voidpayment != null) {
                  var typeTransac = search.lookupFields({
                    type: 'transaction',
                    id: voidpayment,
                    columns: ['type']
                  });
                  // Transaction Vendor Payment
                  if (typeTransac.type == 'VendPymt') {
                    Library_CusTransfer.CreateJournalEntry(voidpayment);
                  }
                  if (typeTransac.type == 'CustPymt') {
                    Library_CusTransfer.CreateJournalEntry(voidpayment);
                  }
                }
              }
            }
          }
        }

      } catch (error) {
        library.sendemail(' [ ValidateAccessJE ] ' + error, LMRY_script);
      }

    }


    /* ------------------------------------------------------------------------------------------------------
     * A la variable featureId se le asigna el valore que le corresponde
     * --------------------------------------------------------------------------------------------------- */
    function ValidateAccessJE(ID, CR, isUret, type) {

      try {

        var LMRY_access = false;
        var LMRY_countr = new Array();
        var LMRY_Result = new Array();

        // Inicializa variables Locales y Globales
        LMRY_countr = library.Validate_Country(ID);
        LMRY_access = library.getCountryOfAccess(LMRY_countr, licenses); 
        //log.error('LMRY_countr[1]', LMRY_countr[1]);

        // Verifica que el arreglo este lleno
        if (LMRY_countr.length < 1) {
          LMRY_Result[2] = LMRY_access;
          return LMRY_Result;
        }

        if (type == 'view' && !validateAdvanceHV(LMRY_countr[0], licenses)) {
          // Oculta todos los campos LMRY
          library.onFieldsHide([2], CR, isUret);
          // Solo si tiene acceso
          if (LMRY_access == true) {            
            //log.error('CR - LMRY_countr[1] - isUret', CR + ' - ' + LMRY_countr[1] + ' - ' + isUret);
             library.onFieldsDisplayBody(CR, LMRY_countr[1], 'custrecord_lmry_on_journal', isUret);            
          }
          
        }

        if ((type == 'view' || type == 'edit') && (CR != '' && CR != null)) {
          if (!validateAdvanceHV(LMRY_countr[0], licenses)) {
            library_HideView.HideSubTab(CR, LMRY_countr[1], recordObj.type, licenses);
            if (type == 'view') {
              library_HideView.HideColumn(CR, LMRY_countr[1], recordObj.type, licenses);
            }
          }
        }               

        // Asigna Valores
        LMRY_Result[0] = LMRY_countr[0];
        LMRY_Result[1] = LMRY_countr[1];
        LMRY_Result[2] = LMRY_access;

        //log.error('LMRY_Result', LMRY_Result);

      } catch (error) {
        library.sendemail(' [ ValidateAccessJE ] ' + error, LMRY_script);
      }

      return LMRY_Result;

    }

    /* ------------------------------------------------------------------------------------------------------
     * A la variable featureId se le asigna el valore que le corresponde
     * --------------------------------------------------------------------------------------------------- */
    function Journal_add(type, form) {

      try {

        // Verifica si tiene permiso a Feature Detraciones
        if (library.getAuthorization(96, licenses) != true) {
          return true;
        }

        // Verifica que este marcado es Latam - Es detraccion
        var detraccion = recordObj.getValue({
          fieldId: 'custbody_lmry_es_detraccion'
        });
        if (detraccion == 'F' || detraccion == false) {
          return true;
        }

        // Verifica que no halla sido procesado
        var estadoDetracc = recordObj.getValue({
          fieldId: 'custbody_lmry_estado_detraccion'
        });
        if (estadoDetracc == 'Procesado') {
          return true;
        }

        // Verifica la interface de usuario
        if (runtime.executionContext == 'userinterface'.toUpperCase() && type == 'view') {
          // Internal ID
          var detracButton = form.addButton({
            id: 'custpage_procdetr',
            label: 'Procesa Detraccion',
            functionName: 'PE_Procesa_Retenciones()'
          });
          if (journalProcesando()) {
            detracButton.isDisabled = true;
          }
          form.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';
        }

      } catch (error) {
        library.sendemail(' [ Journal_add ] ' + error, LMRY_script);
      }

    }

    function journalProcesando() {
      var salida = false;
      try {
        var busqueda = search.create({
          type: 'journalentry',
          columns: ['internalid'],
          filters: [
            ['custbody_lmry_estado_detraccion', 'is', 'Procesando']
          ]
        });
        busqueda = busqueda.run().getRange(0, 1);
        if (busqueda != null && busqueda != '') {
          salida = true;
        }
      } catch (error) {
        log.error('error [journalProcesando] ', error);
      }
      return salida;
    }

    function validateAdvanceHV(country, licenses) {
      var result = false;
      var feature_hv = {
        'CO': 1107,
        'CL': 1108
      }
      if (country && feature_hv[country] && library.getAuthorization(feature_hv[country], licenses)) {
        result = true;
      }

      return result;
    }

    function getSubsidiaryCountryName(subsidiary){
      var subsdiaryName;
      try {
        
        if (subsidiary) {
          search.create({
            type: 'subsidiary',
            columns: ["country"],
            filters: 
              [
                ["internalid","anyof",subsidiary],
                "AND",
                ["isinactive","is","F"]
              ] 
            
          }).run().each(function(result){
            subsdiaryName = result.getText('country');
          });
        }
      } catch (error) {
        subsdiaryName = runtime.getCurrentScript().getParameter({
          name: 'custscript_lmry_country_desc_stlt'
        });
      }
      return subsdiaryName;
    }

    function getSubsidiaryID(scriptContext){
      var request = scriptContext.request;
      var type = scriptContext.type;
      var subsidiaryID;
      if (type == "create") {
        if (request) subsidiaryID = request.parameters.subsidiary;
        if (subsidiaryID) recordObj.setValue({ fieldId: 'subsidiary', value: subsidiaryID });
        if (subsidiaryID) runtime.getCurrentUser().subsidiary;
      }else{
        subsidiaryID = recordObj.getValue('subsidiary');
      }
      return subsidiaryID;
    }

    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    };

  });
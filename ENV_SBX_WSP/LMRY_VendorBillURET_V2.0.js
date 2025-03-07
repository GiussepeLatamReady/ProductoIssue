/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for Transaction Vendor Bill                    ||
||                                                              ||
||  File Name: LMRY_VendorBillURET_V2.0.js                      ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jun 14 2018  LatamReady    User Event 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

define(['require', './Latam_Library/LMRY_UniversalSetting_Purchase_LBRY', 'N/record', 'N/runtime', 'N/search', 'N/log', 'N/config', 'N/https', 'N/url', 'N/ui/serverWidget',
    './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_libWhtValidationLBRY_V2.0',
    './Latam_Library/LMRY_libDIOTLBRY_V2.0', './WTH_Library/LMRY_TAX_TransactionLBRY_V2.0',
    './WTH_Library/LMRY_ST_Tax_TransactionLBRY_V2.0', './Latam_Library/LMRY_GLImpact_LBRY_V2.0',
    './Latam_Library/LMRY_HideViewLBRY_V2.0', './Latam_Library/LMRY_HideView3LBRY_V2.0',
    './WTH_Library/LMRY_Country_WHT_Lines_LBRY_V2.0', './Latam_Library/LMRY_ExchangeRate_LBRY_V2.0',
    './WTH_Library/LMRY_RetencionesEcuador_LBRY', './WTH_Library/LMRY_GT_Withholding_Line_LBRY_V2.0', './WTH_Library/LMRY_BR_GLImpact_Popup_LBRY',
    './WTH_Library/LMRY_TransferIva_LBRY', './Latam_Library/LMRY_MX_STE_Purchases_Tax_Transaction_LBRY_V2.0',
    './Latam_Library/LMRY_MX_ST_DIOT_LBRY_V2.0', "./Latam_Library/LMRY_CL_ST_Purchases_Tax_Transaction_LBRY_V2.0",
    './WTH_Library/LMRY_EC_BaseAmounts_TaxCode_LBRY', './Latam_Library/LMRY_BR_ValidateDuplicate_LBRY_V2.0',
    './WTH_Library/LMRY_New_Country_WHT_Lines_LBRY', './Latam_Library/LMRY_CO_STE_Purchase_Tax_Transaction_LBRY_V2.0',
    './WTH_Library/LMRY_CO_STE_WHT_Total_LBRY_V2.0', './Latam_Library/LMRY_TranID_CSV_LBRY_V2.0',
    './Latam_Library/LMRY_AR_ST_Purchase_Tax_Transaction_LBRY_V2.0', './Latam_Library/LMRY_AR_ST_Purchases_Perception_LBRY_V2.0',
    './Latam_Library/LMRY_AR_ST_WHT_TransactionFields_LBRY_V2.0', './Latam_Library/LMRY_ValidateClosePeriod_LBRY_V2.0', './WTH_Library/LMRY_UY_WHT_Total_LBRY_V2.0.js',
    './WTH_Library/LMRY_CO_STE_Bill_WHT_Lines_LBRY_V2.0', 'N/error', './Latam_Library/LMRY_CL_ST_Purchases_WHT_Transaction_LBRY_V2.0', './Latam_Library/LMRY_MX_LatamTax_Purchase_LBRY_V2.0',
    './Latam_Library/LMRY_PA_ST_Purchases_Tax_Transaction_LBRY_V2.0', './Latam_Library/LMRY_PE_IGVNoDomiciliciado_LBRY',
    './Latam_Library/LMRY_MX_Withholding_Purchase_LBRY_V2.0', './Latam_Library/LMRY_BR_UPDATE_Flete_Transaction_Field_LBRY_2.0', './Latam_Library/LMRY_Log_LBRY_V2.0', './WTH_Library/LMRY_BO_Taxes_LBRY_V2.0',
    './WTH_Library/LMRY_MX_STE_Bill_WHT_Total_LBRY_V2.0', './Latam_Library/LMRY_MX_CREATE_JsonTaxResult_LBRY_V2.0',
    './Latam_Library/LMRY_PE_STE_Purchases_Tax_Transaction_LBRY_V2.0', './WTH_Library/LMRY_CR_STE_WhtTransactionOnPurchaseByTotal_LBRY_V2.0', './Latam_Library/LMRY_BO_libWhtLines_LMRY_V2.0',
    './Latam_Library/LMRY_Custom_ExchangeRate_Field_LBRY_V2.0.js','./Latam_Library/LMRY_KofaxIntegrations_LBRY_V2.0'
  ],

  function(require, library_Uni_Setting, record, runtime, search, log, config, https, url, serverWidget, library, library1, libraryDIOT, Library_WHT_Transaction, ST_Library_Transaction,
    libraryGLImpact, Library_HideView, library_hideview3, libWHTLines, library_ExchRate, Library_RetencionesEcuador, Library_WHT_GT, library_GLImpact_Popup,
    LibraryTransferIva, MX_ST_TaxLibrary, MX_ST_DIOT_Library, CL_ST_TaxLibrary, libraryEcBaseAmounts, Library_BRDup, libraryNewWHTLines,
    CO_STE_TaxLibrary, CO_STE_WhtLibrary_Total, libraryTranIdCSV, AR_ST_TaxLibrary, AR_ST_Perception, AR_ST_TransFields, LibraryValidatePeriod, library_UY_Retencion,
    CO_STE_WhtLibrary_Lines, errorAPI, CL_ST_WhtLibrary_Total, MX_TaxLibrary, PA_ST_TaxLibrary, libraryIGVNoDom, MX_WhtLibrary, libraryFleteGlobales, libLog, libBoTaxes,
    MX_STE_WhtLibrary_Total, libraryMxJsonResult, PE_STE_TaxLibrary, CR_STE_WhtLibrary_Total, BO_libWHTLines, Library_ExchangeRate_Field,kofaxModule) {

    var scriptObj = runtime.getCurrentScript();
    var type = '';
    var LMRY_script = 'LatamReady - Vendor Bill URET V2.0';
    var isURET = true;
    var recordObj = null;
    var licenses = [];
    var switchThrow = false,
      msgThrow = {
        msgName: 'ERROR_NAME',
        msgError: {
          en: 'ERROR_MSG'
        }
      };

    var ST_FEATURE = false;

    function beforeLoad(context) {
      try {

        ST_FEATURE = runtime.isFeatureInEffect({
          feature: 'tax_overhauling'
        });
        var type_interface = runtime.executionContext;
        recordObj = context.newRecord;
        type = context.type;
        var country = new Array();
        country[0] = '';
        country[1] = '';
        var form = context.form;
        var subsidiary = recordObj.getValue({
          fieldId: 'subsidiary'
        });

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

        if (context.type == 'create' || context.type == 'copy') {

          library.cleanFieldsTransaction(recordObj);

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

        if (context.type != 'print' && context.type != 'email') {
          if (context.type == 'create') {
            form.addField({
              id: 'custpage_uni_set_status',
              label: 'Set Estatus',
              type: serverWidget.FieldType.CHECKBOX
            }).defaultValue = 'F';
          }
        }

        if (context.type != 'print' && context.type != 'email') {
          licenses = library.getLicenses(subsidiary);
          if (licenses == null || licenses == '') {
            licenses = [];
            library_hideview3.PxHide(form, '', recordObj.type);
            if (context.type != "create") {
              library_hideview3.PxHideSubTab(form, '', recordObj.type);
            }
            library_hideview3.PxHideColumn(form, '', recordObj.type);
          }
        }

        if (context.type != 'print' && context.type != 'email') {
          try {
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
            libLog.doLog("[ beforeLoad ]", err);
          }

          // Form Hide and View
          if (form != '' && form != null) {
            var hide_transaction = library.getHideView(country, 2, licenses);
            var hide_sublist = library.getHideView(country, 5, licenses);
            var hide_column = library.getHideView(country, 3, licenses);

            if (library.getCountryOfAccess(country, licenses)) {
              if (hide_transaction == true) {
                library_hideview3.PxHide(form, country[0], recordObj.type);
              }
              if (hide_sublist == true) {
                library_hideview3.PxHideSubTab(form, country[0], recordObj.type);
              }
              if (hide_column == true) {
                library_hideview3.PxHideColumn(form, country[0], recordObj.type);
              }
            } else {
              if (hide_transaction == true) {
                library_hideview3.PxHide(form, '', recordObj.type);
              }
              if (hide_sublist == true) {
                library_hideview3.PxHideSubTab(form, '', recordObj.type);
              }
              if (hide_column == true) {
                library_hideview3.PxHideColumn(form, '', recordObj.type);
              }
            }
          } // Form Hide and View
        }

        /* * * * * * * * * * * * * * * * * * * * * * * * * * *
         * Fecha : 21 de abril de 2020
         * Se agrego que todas las validacion de localizacion
         * esten dentro de la condicional :
         *    if (type != 'print' && type != 'email')
         * * * * * * * * * * * * * * * * * * * * * * * * * * */
        if (type != 'print' && type != 'email') {
          // Valida que tenga acceso
          var LMRY_Result = ValidateAccessVB(subsidiary);

          // LatamTax - SuiteTax
          if (ST_FEATURE == true || ST_FEATURE == 'T') {

            if (['create', 'edit', 'copy', 'view'].indexOf(type) != -1) {
              switch (LMRY_Result[0]) {
                /*case "MX":
                    MX_ST_TaxLibrary.disableInvoicingIdentifier(context);
                    break;*/
                case "CO":
                  if (library.getAuthorization(643, licenses) == true) {
                    CO_STE_TaxLibrary.setupFields(context);
                  }
                  break;
                case "AR":
                  AR_ST_TaxLibrary.disableInvoicingIdentifier(context);
                  break;
                case "CL":
                  CL_ST_TaxLibrary.disableInvoicingIdentifier(context);
                  break;
                case "PA":
                  PA_ST_TaxLibrary.disableInvoicingIdentifier(context);
                  break;
                case "PE":
                  if (library.getAuthorization(644, licenses) == true) {
                    PE_STE_TaxLibrary.disableInvoicingIdentifier(context);
                  }
                  break;
                case "CR":
                  if (library.getAuthorization(995, licenses) == true) {
                    CR_STE_WhtLibrary_Total.setWhtRuleField(context)
                  }
                  break;
              }
            }

            if (["copy", "xcopy"].indexOf(type) != -1) {
              switch (LMRY_Result[0]) {
                case "MX":
                  MX_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                  break;
                case "CO":
                  if (library.getAuthorization(643, licenses) == true) {
                    CO_STE_TaxLibrary.deleteTaxDetailLines(recordObj);
                  }
                  break;
                case "AR":
                  AR_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                  break;
                case "CL":
                  CL_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                  if (library.getAuthorization(628, licenses) == true) {
                    CL_ST_WhtLibrary_Total.deleteTaxItemLines(recordObj);
                  }
                  break;
                case "PA":
                  PA_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                  break;
                case "PE":
                  if (library.getAuthorization(644, licenses) == true) {
                    PE_STE_TaxLibrary.deleteTaxDetailLines(recordObj);
                  }
                  break;
              }
            }

            if (["create", "copy"].indexOf(type) != -1) {
              var createdFrom = recordObj.getValue({
                fieldId: 'createdfrom'
              });
              if (createdFrom) {
                switch (LMRY_Result[0]) {
                  case "MX":
                    MX_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                    break;
                  case "CO":
                    if (library.getAuthorization(643, licenses) == true) {
                      CO_STE_TaxLibrary.deleteTaxDetailLines(recordObj);
                    }
                    break;
                  case "AR":
                    AR_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                    break;
                  case "CL":
                    CL_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                    if (library.getAuthorization(628, licenses) == true) {
                      CL_ST_WhtLibrary_Total.deleteTaxItemLines(recordObj);
                    }
                    break;
                  case "PA":
                    PA_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                    break;
                  case "PE":
                    if (library.getAuthorization(644, licenses) == true) {
                      PE_STE_TaxLibrary.deleteTaxDetailLines(recordObj);
                    }
                    break;
                }
              }
            }
          } // LatamTax - SuiteTax

          // Solo para Mexico
          if (LMRY_Result[0] == 'MX' && LMRY_Result[3] == true) {
            // Lista de estado de proceso
            var procesado = recordObj.getValue({
              fieldId: 'custbody_lmry_schedule_transfer_of_iva'
            });
            // Verifica si esta procesado y si esta activo el feature de bloqueo de transaccion
            if (procesado == 1) {
              if (library.getAuthorization(97, licenses)) {
                // Elimina el boton de edicion
                form.removeButton('edit');
              }
            }
          } // Fin Solo para Mexico

          // Solo localizacion CO
          if (LMRY_Result[0] == 'CO') {
            if (library.getAuthorization(340, licenses) || library.getAuthorization(720, licenses)) {
              var formObj = context.form;
              var reteica = formObj.getField('custbody_lmry_co_reteica');
              var reteiva = formObj.getField('custbody_lmry_co_reteiva');
              var retefte = formObj.getField('custbody_lmry_co_retefte');
              var retecree = formObj.getField('custbody_lmry_co_autoretecree');
              reteica.updateDisplayType({
                displayType: 'hidden'
              });
              reteiva.updateDisplayType({
                displayType: 'hidden'
              });
              retefte.updateDisplayType({
                displayType: 'hidden'
              });
              retecree.updateDisplayType({
                displayType: 'hidden'
              });
              if (library.getAuthorization(720, licenses) && type_interface == 'USERINTERFACE' && (type == 'create' || type == 'edit' || type == 'copy')) {
                createCOLineFieldsWHT(formObj, recordObj, type);
              }
            }

            if (!library.getAuthorization(720, licenses)) {
              var formObj = context.form;
              var itemFieldCREE = formObj.getSublist({
                id: 'item'
              }).getField({
                id: 'custcol_lmry_co_autoretecree'
              });
              var itemFieldIVA = formObj.getSublist({
                id: 'item'
              }).getField({
                id: 'custcol_lmry_co_reteiva'
              });
              var itemFieldICA = formObj.getSublist({
                id: 'item'
              }).getField({
                id: 'custcol_lmry_co_reteica'
              });
              var itemFieldFTE = formObj.getSublist({
                id: 'item'
              }).getField({
                id: 'custcol_lmry_co_retefte'
              });
              if (JSON.stringify(itemFieldCREE) != '{}') itemFieldCREE.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
              });
              if (JSON.stringify(itemFieldIVA) != '{}') itemFieldIVA.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
              });
              if (JSON.stringify(itemFieldICA) != '{}') itemFieldICA.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
              });
              if (JSON.stringify(itemFieldFTE) != '{}') itemFieldFTE.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
              });

              var expenseFieldCREE = formObj.getSublist({
                id: 'expense'
              }).getField({
                id: 'custcol_lmry_co_autoretecree'
              });
              var expenseFieldIVA = formObj.getSublist({
                id: 'expense'
              }).getField({
                id: 'custcol_lmry_co_reteiva'
              });
              var expenseFieldICA = formObj.getSublist({
                id: 'expense'
              }).getField({
                id: 'custcol_lmry_co_reteica'
              });
              var expenseFieldFTE = formObj.getSublist({
                id: 'expense'
              }).getField({
                id: 'custcol_lmry_co_retefte'
              });
              if (JSON.stringify(expenseFieldCREE) != '{}') expenseFieldCREE.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
              });
              if (JSON.stringify(expenseFieldIVA) != '{}') expenseFieldIVA.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
              });
              if (JSON.stringify(expenseFieldICA) != '{}') expenseFieldICA.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
              });
              if (JSON.stringify(expenseFieldFTE) != '{}') expenseFieldFTE.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
              });
            }

            if (library.getAuthorization(27, licenses)) {
              library1.createFields(serverWidget, form, recordObj, type);
            }
          } // Fin Solo localizacion CO

          /* **************************************************************
           * Muestra campos adicionales por el campo Latam - Report Type
           *  - custbody_lmry_numero_er lista => LatamReady - Número ER
           *  - custbody_lmry_numero_cc lista => LatamReady - Número CC
           *  - custbody_lmry_numero_sr lista => LatamReady - Número SR
           * implementado el 2021.10.20
           * ************************************************************ */
          // Solo localizacion CL
          log.debug('LMRY_Result', LMRY_Result);
          if (LMRY_Result[0] == 'CL') {
            // Solo cuando es View
            if (context.type == 'view') {
              var Country = LMRY_Result[1];
              var filparent = recordObj.getValue('custbody_lmry_type_report');
              log.debug('filparent', filparent);
              if (filparent != '' && filparent != null) {
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
                  values: [filparent]
                });
                var columns = new Array();
                columns[0] = search.createColumn({
                  name: 'name'
                });
                columns[1] = search.createColumn({
                  name: 'custrecord_lmry_country'
                });
                // LatamReady - Setup Fields View
                var hidefields = search.create({
                  type: 'customrecord_lmry_fields',
                  columns: columns,
                  filters: filters
                });
                hidefields = hidefields.run().getRange(0, 1000);
                log.debug('hidefields.length', 'antes');
                if (hidefields != null && hidefields != '') {
                  var formObj = context.form;
                  log.debug('hidefields.length', hidefields.length);
                  for (var i = 0; i < hidefields.length; i++) {
                    var namefield = hidefields[i].getValue('name');
                    var counfield = hidefields[i].getText('custrecord_lmry_country');
                    counfield = library.DeleteChar(counfield);
                    log.debug('namefield', namefield);
                    // Valida Paises
                    if (counfield == Country) {
                      log.debug('namefield', namefield);
                      // Latam - Número CC
                      if (namefield != 'custbody_lmry_numero_cc') {
                        var DisplayField = formObj.getField('custbody_lmry_numero_cc');
                        DisplayField.updateDisplayType({
                          displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                      }
                      // Latam - Número ER
                      if (namefield != 'custbody_lmry_numero_er') {
                        var DisplayField = formObj.getField('custbody_lmry_numero_er');
                        DisplayField.updateDisplayType({
                          displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                      }
                      // Latam - Número SR
                      if (namefield != 'custbody_lmry_numero_sr') {
                        var DisplayField = formObj.getField('custbody_lmry_numero_sr');
                        DisplayField.updateDisplayType({
                          displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                      }
                      break;
                    } // Valida Paises
                  }
                }
              } // Latam - Report Type
            } else {
              // Latam - Número CC
              var numerecc = recordObj.getField('custbody_lmry_numero_cc');
              numerecc.isDisplay = true;
              // Latam - Número ER
              var numereer = recordObj.getField('custbody_lmry_numero_er');
              numereer.isDisplay = true;
              // Latam - Número SR
              var numeresr = recordObj.getField('custbody_lmry_numero_sr');
              numeresr.isDisplay = true;
            } // Solo cuando es View
          } // Solo localizacion CL

          // Solo en el evento View
          if (type == 'view') {

            var featurelang = runtime.getCurrentScript().getParameter({
              name: 'LANGUAGE'
            });

            featurelang = featurelang.substring(0, 2);

            //Boton UPDATE WHT
            if (LMRY_Result[0] == 'CO' && library.getAuthorization(720, licenses)) {
              createCoButtonUpDateWhx(context);
            }

            // Logica GL Impact
            var btnGl = libraryGLImpact.featureGLImpact(recordObj, 'vendorbill');
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

            /* ***************************************************
             * CO - Print withholdings in GL Impact	(09.11.2020)
             * Validacion del activo Feature Print WithHoldings :
             * - 552 : ... in GL Impact (A/P and A/R)
             * - 811 : ... in GL Impact Summarize (A/P and A/R)
             * ************************************************* */
            var featPrintgl = library.getAuthorization(552, licenses);
            var featPrintglSumm = library.getAuthorization(811, licenses);
            if (featPrintgl || featPrintglSumm) {
              var whtamount = parseFloat(recordObj.getValue({
                  fieldId: 'custbody_lmry_co_reteica_amount'
                })) +
                parseFloat(recordObj.getValue({
                  fieldId: 'custbody_lmry_co_reteiva_amount'
                })) +
                parseFloat(recordObj.getValue({
                  fieldId: 'custbody_lmry_co_retefte_amount'
                })) +
                parseFloat(recordObj.getValue({
                  fieldId: 'custbody_lmry_co_retecree_amount'
                }));

              // 2020.06.01 : Impresion con y sin Retencion
              var nameBtnes = '';
              var nameBtnen = '';
              if (whtamount > 0) {
                // PDF con retenciones
                nameBtnes = 'CO-IMPRIMIR GL WHT';
                nameBtnen = 'CO-PRINT GL WHT';
              } else {
                // PDF sin retenciones
                nameBtnes = 'CO-IMPRIMIR GL';
                nameBtnen = 'CO-PRINT GL';
              } // 2020.06.01 : Impresion con y sin Retencion

              // Creacion del Boton para impresion GL IMPACT
              if (featurelang == 'es') {
                form.addButton({
                  id: 'custpage_id_button_imp',
                  label: nameBtnes,
                  functionName: 'onclick_event_co_wht_gl_impact()'
                });
              } else {
                form.addButton({
                  id: 'custpage_id_button_imp',
                  label: nameBtnen,
                  functionName: 'onclick_event_co_wht_gl_impact()'
                });
              }
              form.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';
            } // CO - Print withholdings in GL Impact

            //Bolivia Retenciones PDF 09/01/2022
            var featPdfPrint = library.getAuthorization(997, licenses);
            if (featPdfPrint && LMRY_Result[0] == 'BO') {
              var whtamount = parseFloat(recordObj.getValue({
                  fieldId: 'custbody_lmry_bo_autoreteit_whtamount'
                })) +
                parseFloat(recordObj.getValue({
                  fieldId: 'custbody_lmry_bo_reteiue_whtamount'
                }))
              var nameBtnes = '';
              var nameBtnen = '';

              if (whtamount > 0) {
                // PDF con retenciones
                nameBtnes = 'BO-IMPRIMIR GL WHT';
                nameBtnen = 'BO-PRINT GL WHT';

              } else {
                // PDF sin retenciones
                nameBtnes = 'BO-IMPRIMIR GL';
                nameBtnen = 'BO-PRINT GL';
              }
              // Creacion del Boton para impresion GL IMPACT
              if (featurelang == 'es') {
                form.addButton({
                  id: 'custpage_id_bo_button_imp',
                  label: nameBtnes,
                  functionName: 'onclick_event_bo_wht_gl_impact()'
                });
              } else {
                form.addButton({
                  id: 'custpage_id_bo_button_imp',
                  label: nameBtnen,
                  functionName: 'onclick_event_bo_wht_gl_impact()'
                });
              }
              form.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';
            }

            // BR - Update CFOP	(11.11.2020)
            if (LMRY_Result[0] == 'BR' && library.getAuthorization(554, licenses)) {
              if (featurelang == 'es') {
                form.addButton({
                  id: 'custpage_id_button_update_cfop',
                  label: 'ACTUALIZAR CFOP',
                  functionName: 'onclick_event_update_cfop()'
                });
              } else if (featurelang == 'pt') {
                form.addButton({
                  id: 'custpage_id_button_update_cfop',
                  label: 'ATUALIZAR CFOP',
                  functionName: 'onclick_event_update_cfop()'
                });
              } else {
                form.addButton({
                  id: 'custpage_id_button_update_cfop',
                  label: 'UPDATE CFOP',
                  functionName: 'onclick_event_update_cfop()'
                });
              }
              form.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';
            }


            // Solo para Colombia
            if (LMRY_Result[0] == 'CO' && LMRY_Result[2] == true && LMRY_Result[3] == true) {
              // LATAM - LEGAL DOCUMENT TYPE
              var docufisc = recordObj.getValue({
                fieldId: 'custbody_lmry_document_type'
              });

              // Latam - CO Tipo Documento Equivalente - Preferencias Generales de Empresa
              var tipodocu = scriptObj.getParameter({
                name: 'custscript_lmry_co_tipo_fiscal_de'
              });

              if (docufisc && tipodocu) {

                form.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';

                /* Solo si los dos campos son iguales muestra el boton */
                if (docufisc == tipodocu) {
                  form.addButton({
                    id: 'custpage_Add_Button',
                    label: 'Imprimir DE',
                    functionName: 'onclick_event()'
                  });
                }

              }

            } // Solo para Colombia

            // Solo para Peru
            if (LMRY_Result[0] == 'PE' && LMRY_Result[2] == true && LMRY_Result[3] == true) {
              // busca valor conforme nombre del campo
              var value = recordObj.getValue({
                fieldId: 'custbody_lmry_transaction_type_doc'
              });
              if (value !== '' && value !== null) {
                /* Se realiza una busqueda para ver que campos se ocultan */
                // Filtros
                var filters = new Array();
                filters[0] = search.createFilter({
                  name: 'custrecord_lmry_id_transaction',
                  operator: search.Operator.IS,
                  values: value
                });

                // Realiza un busqueda para mostrar los campos
                var hidefieldsSearch = search.create({
                  type: 'customrecord_lmry_transaction_fields',
                  columns: ['custrecord_lmry_id_fields'],
                  filters: filters
                });

                var hidefields = hidefieldsSearch.run().getRange(0, 1000);
                if (hidefields != null && hidefields != '') {
                  for (var i = 0; i < hidefields.length; i++) {
                    // Campos a mostrar
                    var namefield = hidefields[i].getText('custrecord_lmry_id_fields');
                    if (namefield != '' && namefield != null) {
                      var Field = recordObj.getField({
                        fieldId: namefield
                      });
                      if (Field != null && Field != '') {
                        Field.isDisplay = true;
                      }
                    } // Campos a mostrar
                  }
                } // Realiza un busqueda para mostrar los campos

              } // busca valor conforme nombre del campo

            } // Solo para Peru

          } // Fin Solo en el evento View

          /* * * * * * * * * * * * * * * * * * * * * * * * * * *
           * Fecha : 21 de abril de 2020
           * Se agrego que todas las validacion sean dentro
           * de la condicional :
           *    if (type == 'create')
           * * * * * * * * * * * * * * * * * * * * * * * * * * */
          if (type == 'create' || type == 'copy') {
            /* *** Logica de Tipo de Cambio Automatico *** */
            if (LMRY_Result[0] == 'MX') {
              if (library.getAuthorization(528, licenses)) {
                library_ExchRate.createFieldURET(context, serverWidget);
              }
            }
            if (LMRY_Result[0] == 'BR') {
              if (library.getAuthorization(529, licenses)) {
                library_ExchRate.createFieldURET(context, serverWidget);
              }
            }
            if (LMRY_Result[0] == 'CO') {
              if (library.getAuthorization(533, licenses)) {
                library_ExchRate.createFieldURET(context, serverWidget);
              }
            }
            if (LMRY_Result[0] == 'CL') {
              if (library.getAuthorization(530, licenses)) {
                library_ExchRate.createFieldURET(context, serverWidget);
              }
            }
            if (LMRY_Result[0] == 'PE') {
              if (library.getAuthorization(531, licenses)) {
                library_ExchRate.createFieldURET(context, serverWidget);
              }
            }
            if (LMRY_Result[0] == 'AR') {
              if (library.getAuthorization(532, licenses)) {
                library_ExchRate.createFieldURET(context, serverWidget);
              }
            }
            /* *** Fin Logica de Tipo de Cambio Automatico *** */

          } // Fin if (type == 'create')

          /* * * * * * * * * * * * * * * * * * * * * * * * * * *
           * Fecha : 16 de abril de 2020
           * Se agrego la validacion que la localizacion este
           * activado. LMRY_Result[2] == true
           * 262 =  br - activate bill (05/06/2020)
           * * * * * * * * * * * * * * * * * * * * * * * * * * */
          // HIDE AND VIEW POPUP
          if (LMRY_Result[0] == 'BR' && LMRY_Result[2] == true && library.getAuthorization(262, licenses)) {
            var pop_cabecera = form.getField('custbody_lmry_br_popup');
            if (library.getAuthorization(290, licenses) == false) {

              // CustBody - Valida si existe campo
              if (pop_cabecera != '' && pop_cabecera != null) {
                pop_cabecera.updateDisplayType({
                  displayType: 'hidden'
                });
              }

              // *** Validacion para ITEM ***
              var sublist_item = form.getSublist('item');
              var pop_columna = sublist_item.getField({
                id: 'custcol_lmry_br_popup'
              });

              // CustCol - Valida si el JSON esta lleno
              if (typeof(pop_columna) == 'object') {
                // CustCol - Valida si el JSON esta lleno
                if (JSON.stringify(pop_columna) != '{}') {
                  pop_columna.updateDisplayType({
                    displayType: 'hidden'
                  });
                } // Fin - CustCol - Valida si el JSON esta lleno
              }

              // *** Validacion para EXPENSE ***
              var sublist_expense = form.getSublist('expense');
              var pop_columna = sublist_expense.getField({
                id: 'custcol_lmry_br_popup'
              });

              // CustCol - Valida si el JSON esta lleno
              if (typeof(pop_columna) == 'object') {
                // CustCol - Valida si el JSON esta lleno
                if (JSON.stringify(pop_columna) != '{}') {
                  pop_columna.updateDisplayType({
                    displayType: 'hidden'
                  });
                } // Fin - CustCol - Valida si el JSON esta lleno
              }

            } else {
              var id_br = recordObj.id;
              //YA ESTA CREADA LA PO
              if (id_br != null && id_br != '' && id_br != undefined) {
                var search_br = search.create({
                  type: 'customrecord_lmry_br_transaction_fields',
                  filters: [{
                    name: 'custrecord_lmry_br_related_transaction',
                    operator: 'is',
                    values: id_br
                  }]
                });
                search_br = search_br.run().getRange({
                  start: 0,
                  end: 1
                });

                if (search_br != null && search_br.length > 0) {
                  // CustBody - Valida si existe campo
                  if (pop_cabecera != '' && pop_cabecera != null) {
                    pop_cabecera.updateDisplayType({
                      displayType: 'hidden'
                    });
                  }
                }
              }
            }

            // Solo en el evento Type Copy
            if (type == 'copy') {
              // CustBody - Valida si existe campo
              var json_cabecera = form.getField('custbody_lmry_br_json');
              if (json_cabecera != '' && json_cabecera != null) {
                recordObj.setValue('custbody_lmry_br_json', '');

                // Validacion en la lista ITEM
                var sublist_item = form.getSublist('item');
                var json_columna = sublist_item.getField({
                  id: 'custcol_lmry_br_json'
                });
                // Valida si es Objeto
                if (typeof(json_columna) == 'object') {
                  // CustCol - Valida si el JSON esta lleno
                  if (JSON.stringify(json_columna) != '{}') {
                    // Limpia la columna JSON
                    for (var i = 0; i < recordObj.getLineCount({
                        sublistId: 'item'
                      }); i++) {
                      recordObj.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_lmry_br_json',
                        line: i,
                        value: ''
                      });
                    }
                  } // Fin - CustCol - Valida si el JSON esta lleno
                } // Fin - Valida si es Objeto

                // Validacion en la lista EXPENSE
                var sublist_expense = form.getSublist('expense');
                var json_columna = sublist_expense.getField({
                  id: 'custcol_lmry_br_json'
                });
                // Valida si es Objeto
                if (typeof(json_columna) == 'object') {
                  // CustCol - Valida si el JSON esta lleno
                  if (JSON.stringify(json_columna) != '{}') {
                    // Limpia la columna JSON
                    for (var i = 0; i < recordObj.getLineCount({
                        sublistId: 'expense'
                      }); i++) {
                      recordObj.setSublistValue({
                        sublistId: 'expense',
                        fieldId: 'custcol_lmry_br_json',
                        line: i,
                        value: ''
                      });
                    }
                  } // Fin - CustCol - Valida si el JSON esta lleno
                } // Fin - Valida si es Objeto
              }
            } // Fin - Type Copy

          } // Fin HIDE AND VIEW POPUP

          if (LMRY_Result[0] == 'BR') {
            var recordObj = context.newRecord;
            if (type == 'copy' || type == 'xcopy') {
              if (ST_FEATURE === true || ST_FEATURE === "T") {
                ST_Library_Transaction.cleanLinesforCopy(recordObj, licenses);
              } else {
                Library_WHT_Transaction.cleanLinesforCopy(recordObj, licenses);
              }
            }

            log.debug("transformid", recordObj.getValue("transformid"));
            if (type == 'create') {
              var transformid = recordObj.getValue({
                fieldId: 'transformid'
              });

              //Si el bill es creado desde un PO
              if (transformid) {
                if (ST_FEATURE === true || ST_FEATURE === "T") {
                  ST_Library_Transaction.cleanLinesforCopy(recordObj, licenses);
                } else {
                  Library_WHT_Transaction.cleanLinesforCopy(recordObj, licenses);
                }
              }
            }
          }

          //SETEO DEL CUSTBODY LATAMREADY - BR TRANSACTION TYPE PARA FILTRAR LA COLUMNA CFOP
          if (LMRY_Result[0] == 'BR' && LMRY_Result[2] == true && (type == 'create' || type == 'edit' || type == 'copy')) {
            var transactionType = recordObj.getValue('custbody_lmry_br_transaction_type');
            var createdFrom = recordObj.getValue('createdfrom');
            //EL CREATEDFROM YA NO ESTA, AHORA SOLO CON EL COPY PUEDE SER TRANSFORMACION DESDE PO
            if ((transactionType == '' || transactionType == null) || type == 'copy') {
              var typeStandard = recordObj.getValue('type');
              if (typeStandard != null && typeStandard != '') {
                var searchTransactionType = search.create({
                  type: 'customrecord_lmry_trantype',
                  columns: ['internalid'],
                  filters: [{
                    name: 'name',
                    operator: 'is',
                    values: typeStandard
                  }]
                });
                var resultTransactionType = searchTransactionType.run().getRange({
                  start: 0,
                  end: 1
                });
                if (resultTransactionType != null && resultTransactionType.length > 0) {
                  recordObj.setValue('custbody_lmry_br_transaction_type', resultTransactionType[0].getValue('internalid'));
                }

              }
            }
          }

          /******************************************************************************************************************************
            Code: C0956
            Date: 01/08/2023
            Summary: Seteo del campo Custbody LATAMREADY - BR TRANSACTION TYPE para el filtrado de Retenciones por Línea V2 de Colombia
          *******************************************************************************************************************************/
          if (LMRY_Result[0] == 'CO' && LMRY_Result[2] == true && (type == 'create' || type == 'edit' || type == 'copy')) {
            var transactionType = recordObj.getValue('custbody_lmry_br_transaction_type');
            if (transactionType == '' || transactionType == null) {
              var typeStandard = recordObj.getValue('type');
              if (typeStandard != null && typeStandard != '') {
                var searchTransactionType = search.create({ type: 'customrecord_lmry_trantype', filters: [{ name: 'name', operator: 'is', values: typeStandard }] });
                searchTransactionType = searchTransactionType.run().getRange({ start: 0, end: 1 });
                if (searchTransactionType && searchTransactionType.length) {
                  recordObj.setValue('custbody_lmry_br_transaction_type', searchTransactionType[0].id);
                }
              }
            }
          }

          //BOTON MAP REDUCE RETENCION CO
          if (LMRY_Result[0] == 'CO' && library.getAuthorization(340, licenses) && type == 'view') {

            libraryNewWHTLines.beforeLoad(recordObj, form, context, 'vendor');

          } // Fin Boton CO Lineas

        } // Fin if (type != 'print' && type != 'email')

        if (context.type == 'create' || context.type == 'copy' || context.type == 'edit' || context.type == 'view') {
          if (LMRY_Result[0] === "BR" && library.getAuthorization(877, licenses)) {
            libraryFleteGlobales.createCustpage(context);
          }
        }

        //LATAM - TAX RULE - RETENCION URUGUAY
        if ((type == 'create' || type == 'edit' || type == 'copy' || type == 'view') && LMRY_Result[0] == 'UY') {
          var taxSelect = form.addField({
            id: 'custpage_tax_rule',
            type: serverWidget.FieldType.SELECT,
            label: 'LATAM - TAX RULE'
          });
          taxSelect.addSelectOption({
            value: '',
            text: '&nbsp;'
          });
          var TaxRuleSearchObj = search.create({
            type: "customrecord_lmry_br_tax_rules",
            filters: [
              ["custrecord_lmry_taxrule_country", "anyof", "231"]
            ],
            columns: ['internalid', 'name']
          });
          TaxRuleSearchObj = TaxRuleSearchObj.run().getRange(0, 1000);
          if (TaxRuleSearchObj != null && TaxRuleSearchObj != '') {

            for (var i = 0; i < TaxRuleSearchObj.length; i++) {
              var taxID = TaxRuleSearchObj[i].getValue('internalid');
              var taxNM = TaxRuleSearchObj[i].getValue('name');
              taxSelect.addSelectOption({
                value: taxID,
                text: taxNM
              });
            }
          }
          var cantidad_items = recordObj.getLineCount({
            sublistId: 'item'
          });
          if (cantidad_items > 0) {
            var tax_rule_item = recordObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_lmry_br_tax_rule',
              line: 0
            }) || "";
            taxSelect.defaultValue = tax_rule_item;
          } else {
            var cantidad_exp = recordObj.getLineCount({
              sublistId: 'expense'
            });
            if (cantidad_exp > 0) {
              var tax_rule_item = recordObj.getSublistValue({
                sublistId: 'expense',
                fieldId: 'custcol_lmry_br_tax_rule',
                line: 0
              }) || "";
              taxSelect.defaultValue = tax_rule_item;
            }
          }


        }
        //FIN LATAM - TAX RULE - RETENCION URUGUAY

        //LATAM - TAX RULE - RETENCION Totales Mexico
        var featWhtMx = library.getAuthorization(958, licenses);
        if ((type == 'create' || type == 'edit' || type == 'copy' || type == 'view') && LMRY_Result[0] == 'MX' && featWhtMx) {
          var taxSelect = form.addField({
            id: 'custpage_wht_rule',
            type: serverWidget.FieldType.SELECT,
            label: 'LATAM - WHT RULE'
          });

          form.insertField({
            field: taxSelect,
            nextfield: "custbody_lmry_apply_wht_code"
          });

          taxSelect.addSelectOption({
            value: '',
            text: '&nbsp;'
          });
          var TaxRuleSearchObj = search.create({
            type: "customrecord_lmry_wht_rules",
            filters: [
              ["custrecord_lmry_whtrule_country", "anyof", "157"]
            ],
            columns: ['internalid', 'name']
          });
          TaxRuleSearchObj = TaxRuleSearchObj.run().getRange(0, 1000);
          if (TaxRuleSearchObj != null && TaxRuleSearchObj != '') {

            for (var i = 0; i < TaxRuleSearchObj.length; i++) {
              var taxID = TaxRuleSearchObj[i].getValue('internalid');
              var taxNM = TaxRuleSearchObj[i].getValue('name');
              taxSelect.addSelectOption({
                value: taxID,
                text: taxNM
              });
            }
          }
          var cantidad_items = recordObj.getLineCount({
            sublistId: 'item'
          });
          if (cantidad_items > 0) {
            var tax_rule_item = recordObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_lmry_wht_rule',
              line: 0
            });
            taxSelect.defaultValue = tax_rule_item;
          } else {
            var cantidad_exp = recordObj.getLineCount({
              sublistId: 'expense'
            });
            if (cantidad_exp > 0) {
              var tax_rule_item = recordObj.getSublistValue({
                sublistId: 'expense',
                fieldId: 'custcol_lmry_wht_rule',
                line: 0
              });
              taxSelect.defaultValue = tax_rule_item;
            }
          }


        }

        if (type == "copy" && LMRY_Result[0] == "BO" && library.getAuthorization(828, licenses)) {
          libBoTaxes.resetLines(recordObj);
        }
        if (type == "copy" && LMRY_Result[0] == "MX" && library.getAuthorization(671, licenses) && (ST_FEATURE == false || ST_FEATURE == "F")) {
          MX_TaxLibrary.resetLines(recordObj);
        }

      } catch (err) {
        recordObj = context.newRecord;
        log.error("[ beforeLoad ]", err);
        library.sendemail2('[ beforeLoad ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
        libLog.doLog("[ beforeLoad ]", err);
      }
      return true;
    }

    /**********************************
     * beforeSubmit = Se ejecuta antes
     * de grabar la transaccion
     *********************************/
    function beforeSubmit(context) {

      try {

        ST_FEATURE = runtime.isFeatureInEffect({
          feature: 'tax_overhauling'
        });

        recordObj = context.newRecord;
        type = context.type;
        var type_interface = runtime.executionContext;
        var form = context.form;
        var subsidiary = recordObj.getValue({
          fieldId: 'subsidiary'
        });
        var LMRY_Intern = recordObj.id;

        licenses = library.getLicenses(subsidiary);

        // Valida que tenga acceso
        var LMRY_Result = ValidateAccessVB(subsidiary);

        /* Validacion 04/02/22 */
        // Libreria - Valida Periodo cerrado
        if (LibraryValidatePeriod.validatePeriod(recordObj.getValue('postingperiod'), licenses, LMRY_Result[0], 'purchase')) return true;
        /* Fin validacion 04/02/22 */

        var exchrate = false;
        switch (LMRY_Result[0]) {
          case 'AR':
            if ((context.type == 'create' || context.type == 'copy') && library.getAuthorization(532, licenses)) {
              exchrate = true;
            }
            break;
          case 'BR':
            if ((context.type == 'create' || context.type == 'copy') && library.getAuthorization(529, licenses)) {
              exchrate = true;
            }
            break;
          case 'CO':
            if ((context.type == 'create' || context.type == 'copy') && library.getAuthorization(533, licenses)) {
              exchrate = true;
            }
            break;
          case 'CL':
            if ((context.type == 'create' || context.type == 'copy') && library.getAuthorization(530, licenses)) {
              exchrate = true;
            }
            break;
          case 'MX':
            if ((context.type == 'create' || context.type == 'copy') && library.getAuthorization(528, licenses)) {
              exchrate = true;
            }
            break;
          case 'PE':
            if ((context.type == 'create' || context.type == 'copy') && library.getAuthorization(531, licenses)) {
              exchrate = true;
            }
            break;
          default:
            break;
        }
        if (exchrate) {
          library_ExchRate.setExchRate(context);
        }

        var featuresExecuteIntegrationByCountry = {
          "AR": 1058,
          "CL": 1059,
          "CO": 1060,
          "EC": 1062,
          "GT": 1063,
          "MX": 1064,
          "PA": 1065,
          "PE": 1066,
          "UY": 1067
        };
        var featureExecuteIntegration = false;
        if (featuresExecuteIntegrationByCountry.hasOwnProperty(LMRY_Result[0])) {
          featureExecuteIntegration = library.getAuthorization(featuresExecuteIntegrationByCountry[LMRY_Result[0]], licenses);
        }

        /**
         * Modificacion - Integracion Kofax autoseteo campos cabecera para generacion de retenciones
         */
        var type_interface = runtime.executionContext;
        if ((type == 'create' || type == 'edit') && type_interface != 'USERINTERFACE') {
          if (["AR", "CO", "PE", "MX", "CL", "PA"].indexOf(LMRY_Result[0]) != -1) {
            
                if (type == 'create') {
                  kofaxModule.SetCustomField_WHT_Code_VB(recordObj, LMRY_Result, licenses);
                }
                //recordObj.setValue("custbody_lmry_apply_wht_code", true);
                if (featureExecuteIntegration == 'F' || featureExecuteIntegration == false) {
                  libraryTranIdCSV.generateTranID(recordObj, LMRY_Result[0], licenses);
                }     
              
          }
        }

        //Nueva logica Country WHT Lineas
        if (LMRY_Result[0] == 'CO') {
          if (type === 'create' || (type === 'edit')) {
              libraryNewWHTLines.beforeSubmitTransaction(context, licenses);
          } 

          if (library.getAuthorization(27, licenses)) {
            library1.setFieldValues(recordObj);
          }
        } else {
          libWHTLines.beforeSubmitTransaction(context, licenses);
        }

        if (context.type == 'create' || context.type == 'copy' || context.type == 'edit' || context.type == 'view') {
          if (LMRY_Result[0] === "BR" && library.getAuthorization(877, licenses)) {
            libraryFleteGlobales.insertItemFlete(context);
          }
        }

        // Nueva logica Retenciones Guatemala
        Library_WHT_GT.beforeSubmitTransaction(context, licenses);

        // Nueva logica de Colombia
        // switch (LMRY_Result[0]) {
        //   case 'AR':
        //     if (library.getAuthorization(200, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        //   case 'BO':
        //     if (library.getAuthorization(152, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        //   /*case 'BR':
        //     if (library.getAuthorization(147) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;*/
        //   case 'CL':
        //     if (library.getAuthorization(201, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        //   case 'CO':
        //     if (library.getAuthorization(150, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        //   case 'CR':
        //     if (library.getAuthorization(203, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        // //   case 'EC':
        // //     if (library.getAuthorization(153, licenses) == true) {
        // //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        // //     }
        // //     break;
        //   case 'SV':
        //     if (library.getAuthorization(205, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        //   case 'GT':
        //     if (library.getAuthorization(207, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        //   case 'MX':
        //     if (library.getAuthorization(209, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        //   case 'PA':
        //     if (library.getAuthorization(211, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        //   case 'PY':
        //     if (library.getAuthorization(213, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        //   case 'PE':
        //     if (library.getAuthorization(214, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        //   case 'UY':
        //     if (library.getAuthorization(216, licenses) == true) {
        //       Library_WHT_Transaction.beforeSubmitTransaction(context);
        //     }
        //     break;
        // }

        //NUEVO CASO RETENCIONES ECUADOR
        if (LMRY_Result[0] == 'EC' && library.getAuthorization(153, licenses) == true) {
          Library_RetencionesEcuador.beforeSubmitTransaction(context, LMRY_Result, context.type);
        }
        var subsidiaryCountry = recordObj.getValue("custbody_lmry_subsidiary_country");
        log.debug("subsidiaryCountry", subsidiaryCountry);
        if (LMRY_Result[0] == "BR" && Number(subsidiaryCountry) == 30) {
          if (["create", "edit", "copy"].indexOf(context.type) != -1) {
            if (context.type == 'edit') {
              if (ST_FEATURE === true || ST_FEATURE === "T") {
                ST_Library_Transaction.cleanLinesforCopy(recordObj);
              } else {
                cleanLinesforCopy(recordObj);
              }
            }
          }
        }


        if (type == 'create' && (type_interface == 'USERINTERFACE' || type_interface == 'USEREVENT' || type_interface == 'CSVIMPORT') && (ST_FEATURE == false || ST_FEATURE == "F")) {

          var type_document = recordObj.getValue('custbody_lmry_document_type');

          if (library_Uni_Setting.auto_universal_setting_purchase(licenses, false)) {
            //Solo si el campo LATAM - LEGAL DOCUMENT TYPE se encuentra vacío
            if (type_interface == 'USERINTERFACE') {
              if (recordObj.getValue('custpage_uni_set_status') == 'F' && (type_document == '' || type_document == null)) {
                //Seteo campos cabecera, numero pre impreso y template
                library_Uni_Setting.automatic_setfield_purchase(recordObj, false);
                library_Uni_Setting.set_preimpreso_purchase(recordObj, LMRY_Result, licenses);
                library_Uni_Setting.set_template_purchase(recordObj, licenses);
                recordObj.setValue('custpage_uni_set_status', 'T');
              }

            } else if (type_interface == 'CSVIMPORT' || type_interface == 'USEREVENT') {
              var check_csv = recordObj.getValue('custbody_lmry_scheduled_process');
              //Check box para controlar el seteo automático en el record anexado
              if ((check_csv == false || check_csv == 'F') && (type_document == '' || type_document == null)) {
                //Seteo campos cabecera, numero pre impreso y template
                library_Uni_Setting.automatic_setfield_purchase(recordObj, false);
                library_Uni_Setting.set_preimpreso_purchase(recordObj, LMRY_Result, licenses);
                library_Uni_Setting.set_template_purchase(recordObj, licenses);

                if (check_csv == 'F') {
                  recordObj.setValue('custbody_lmry_scheduled_process', 'T');
                } else {
                  recordObj.setValue('custbody_lmry_scheduled_process', true);
                }
              }
            }
            //Seteo de campos perteneciente a record anexado
            library_Uni_Setting.set_inv_identifier_purchase(recordObj);
          }
        }

        if (type == "delete") {
          if (ST_FEATURE == true || ST_FEATURE == "T") {
            switch (LMRY_Result[0]) {
              case "MX":
                MX_ST_TaxLibrary.deleteTaxResult(LMRY_Intern);
                if (library.getAuthorization(958, licenses) == true) {
                  MX_STE_WhtLibrary_Total.deleteRelatedRecords(LMRY_Intern);
                }
                break;
              case "CO":
                if (library.getAuthorization(643, licenses) == true) {
                  CO_STE_TaxLibrary.deleteRelatedRecords(LMRY_Intern);
                }
                
                if (library.getAuthorization(340, licenses) == true) {
                  CO_STE_WhtLibrary_Lines.deleteRelatedRecords(LMRY_Intern)

                  if (library.getAuthorization(27, licenses) == true) {
                    CO_STE_WhtLibrary_Total.deleteRelatedRecords(LMRY_Intern, "vendorbill");
                  }
                }
                
                break;
              case "AR":
                AR_ST_TaxLibrary.deleteTaxResult(LMRY_Intern);
                if (library.getAuthorization(138, licenses) == true) {
                  AR_ST_TransFields.deleteTransactionFields(LMRY_Intern);
                }
                break;
              case "CL":
                CL_ST_TaxLibrary.deleteTaxResult(LMRY_Intern);
                break;
              case "PA":
                PA_ST_TaxLibrary.deleteTaxResult(LMRY_Intern);
                break;
              case "PE":
                if (library.getAuthorization(644, licenses) == true) {
                  PE_STE_TaxLibrary.deleteTaxResult(LMRY_Intern);
                }
                break;
              case "CR":
                if (library.getAuthorization(995, licenses) == true) {
                  CR_STE_WhtLibrary_Total.deleteRelatedRecords(LMRY_Intern, "vendorbill");
                }
                break;
            }
          }

          //BORRADO DE RETENCION PARA URUGUAY
          var applWTH = recordObj.getValue({
            fieldId: 'custbody_lmry_apply_wht_code'
          });
          if (LMRY_Result[0] == 'UY' && (applWTH == 'T' || applWTH == true)) {
            if (library.getAuthorization(756, licenses)) {
              library_UY_Retencion.documentsToDelete(recordObj);
            }
          }
        }

        if (['create', 'edit', 'copy', 'view'].indexOf(context.type) != -1) {
          if (ST_FEATURE == true || ST_FEATURE == "T") {
            switch (LMRY_Result[0]) {
              case "CR":
                if (library.getAuthorization(995, licenses)) {
                  CR_STE_WhtLibrary_Total.setWhtRuleInLines(context);
                }
                break;
            }
          }
        }

        //SETEO DE CAMPOS BASE 0%, 12% Y 14%
        var eventsEC = ['create', 'copy', 'edit'];
        if (eventsEC.indexOf(type) != -1) {
          if (LMRY_Result[0] == 'EC' && library.getAuthorization(42, licenses)) {
            libraryEcBaseAmounts.setBaseAmounts(recordObj, '1');
          }

          /**
           * Code: C0592
           * Summary: Exclude subsidiary and vendor from the concatenation process or trigger the process
           * Date: 15/06/2022
           */

          var featureTranid = {
            'AR': {
              'validate': 505,
              'strict': 689,
              'exclude': 916
            },
            'CO': {
              'validate': 509,
              'strict': 687,
              'exclude': 917
            },
            'MX': {
              'validate': 514,
              'strict': 688,
              'exclude': 918
            }
          };

          if (type_interface == 'CSVIMPORT') {
            if (LMRY_Result[0] == 'AR' || featureTranid[LMRY_Result[0]] != undefined) {
              var isGeneratedTranID = libraryTranIdCSV.generateTranID(recordObj, LMRY_Result[0], licenses);
              // Si no ha generado tranID por duplicado entonces no genera la transacción por CSV
              if (!isGeneratedTranID && (
                  library.getAuthorization(featureTranid[LMRY_Result[0]]['validate'], licenses) ||
                  library.getAuthorization(featureTranid[LMRY_Result[0]]['strict'], licenses) ||
                  (LMRY_Result[0] == 'AR' && library.getAuthorization(829, licenses)))) {
                switchThrow = true;
                msgThrow['msgName'] = 'ERROR_DUPLICATE_TRANID_FOUND';
                msgThrow['msgError'] = {
                  'en': "The field 'Reference No.' (tranid) entered already exists, please enter a different one",
                  'es': "El campo 'Número de referencia' (tranid) introducido ya existe, por favor introduzca uno diferente",
                  'pt': "O campo 'Número de referência' (tranid) inserido já existe, por favor insira um diferente"
                };
              }
            }
          }
        }

        if (LMRY_Result[0] == "CO") {
          if (library.getAuthorization(720, licenses) == true) {
            if (context.type == 'edit') {
                recordObj.setValue('custbody_lmry_scheduled_process', false);
            }
            if (type_interface == 'USERINTERFACE') {
                setCOLineValueWTH(recordObj);
            }
          }
        }

        /* *******************************
         * Solo localizaciones Costa Rica
         * Serie de impresion CXC
         * Fecha : 2023.11.22
         ******************************* */
        if (LMRY_Result[0] == "CR" && type_interface == 'CSVIMPORT') {
          if (recordObj.getValue('custbody_lmry_serie_doc_cxp') == '' && recordObj.getValue('custbody_lmry_serie_doc_cxc') != ''){
            var nameCxc = search.lookupFields({
              type: "customrecord_lmry_serie_impresion_cxc",
              id: recordObj.getValue('custbody_lmry_serie_doc_cxc'),
              columns: ["name"]
            }).name;
            recordObj.setValue({ fieldId: 'custbody_lmry_serie_doc_cxp', value: nameCxc });
          }
        }

        /*******************************************
         * (C0578) Seteo de campos Wtax 10/06/2022
         *******************************************/
        setWithholdingValues(LMRY_Result[0], recordObj, licenses);

        if (["create", "edit", "copy", "delete"].indexOf(context.type) != -1 && LMRY_Result[0] == "BO" && library.getAuthorization(828, licenses)) {
          if (context.type == "delete") {
            libBoTaxes.deleteTaxResults(recordObj);
          }

          if (["create", "edit", "copy"].indexOf(context.type) != -1) {
            libBoTaxes.setUndefTaxLines(recordObj);
          }
        }

        if (LMRY_Result[0] == "MX" && library.getAuthorization(671, licenses) && context.type == 'delete' && (ST_FEATURE == false || ST_FEATURE == "F")) {
          libraryMxJsonResult._inactiveTaxResult(recordObj.id, taxType = 4)
        }

      } catch (err) {
        recordObj = context.newRecord;
        library.sendemail2('[ beforeSubmit ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
        libLog.doLog("[ beforeSubmit ]", err);
      }

      if (switchThrow) {
        var language = (runtime.getCurrentScript().getParameter({
          name: 'LANGUAGE'
        })).substring(0, 2);
        throw errorAPI.create({
          name: msgThrow['msgName'],
          message: (msgThrow['msgError'][language] || msgThrow['msgError']['en'])
        });
      };

      return true;
    }

    /**********************************
     * afterSubmit = Se ejecuta despues
     * de grabar la transaccion
     *********************************/
    function afterSubmit(context) {
      try {

        ST_FEATURE = runtime.isFeatureInEffect({
          feature: "tax_overhauling"
        });
        // Tipo de Contexto en el que se ejecuta, puedemn ser: USEREVENT, MAPREDUCE, USERINTERFACE, etc
        var type_interface = runtime.executionContext;
        // type = tipo Create, Edit , Delete
        type = context.type;
        // newRecord = Referencia al registro
        recordObj = context.newRecord;
        // id = Internal ID de la transaccion
        var LMRY_Intern = recordObj.id;
        // form = Formulario en ejecucion
        var form = context.form;
        // Subsidiaria de la transaccion
        var subsidiary = recordObj.getValue({
          fieldId: 'subsidiary'
        });

        licenses = library.getLicenses(subsidiary);
        // Validacion de Acceso a Features
        var LMRY_Result = ValidateAccessVB(subsidiary);

        /* Validacion 04/02/22 */
        // Libreria - Valida Periodo cerrado
        if (LibraryValidatePeriod.validatePeriod(recordObj.getValue('postingperiod'), licenses, LMRY_Result[0], 'purchase')) return true;
        /* Fin validacion 04/02/22 */

        //Universal Setting se realiza solo al momento de crear
        if (type == 'create' && (type_interface == 'USERINTERFACE' || type_interface == 'USEREVENT' || type_interface == 'CSVIMPORT') && (ST_FEATURE == false || ST_FEATURE == "F")) {

          if (type_interface == 'USERINTERFACE') {
            //Mediante el custpage se conoce que el seteo de cabecera fue realizado por Universal Setting
            if (recordObj.getValue('custpage_uni_set_status') == 'T') {
              //Seteo de campos perteneciente a record anexado
              library_Uni_Setting.automatic_setfieldrecord_purchase(recordObj);
            }
          } else if (type_interface == 'CSVIMPORT' || type_interface == 'USEREVENT') {
            //Mediante el siguiente campo se conoce si seteo de cabecera fue realizado por Universal Setting
            var check_csv = recordObj.getValue('custbody_lmry_scheduled_process');

            if (check_csv == 'T' || check_csv == true) {
              //Seteo de campos perteneciente a record anexado
              library_Uni_Setting.automatic_setfieldrecord_purchase(recordObj);

              if (check_csv == 'T') {
                recordObj.setValue('custbody_lmry_scheduled_process', 'F');
              } else {
                recordObj.setValue('custbody_lmry_scheduled_process', false);
              }
            }
          }
        }

        // Para validar si ingresa al log
        // log.debug({
        //   title: 'afterSubmit',
        //   details: 'context.type: ' + context.type + ' - ' + LMRY_Intern
        // });

        // Se ejecuta si se elimina el registro
        if (type == 'delete') {
          // Para Argentina - AR - WHT Payment
          if (LMRY_Result[0] == 'AR') {
            if (ST_FEATURE == false || ST_FEATURE == "F") {
              if (library.getAuthorization(138, licenses)) {
                // Elimina registros
                DeleteGroupLine(LMRY_Intern);
              }
            }
          }
          // Para Colombia Enabled Feature WHT Latam
          if (LMRY_Result[0] == 'CO') {
            if (library.getAuthorization(27, licenses)) {

              // Elimina registros
              library1.Delete_JE(LMRY_Intern);
              // Delete Credit Memo
              library1.Delete_CM('vendorcredit', LMRY_Intern);


            }
          }
          // Bolivia - Enabled Feature WHT Latam
          if (LMRY_Result[0] == 'BO') {
            if (library.getAuthorization(46, licenses)) {
              // Elimina registros
              library1.Delete_JE(LMRY_Intern);
              // Delete Credit Memo
              library1.Delete_CM('vendorcredit', LMRY_Intern);
            }
          }
          // Paraguay - Enabled Feature WHT Latam
          if (LMRY_Result[0] == 'PY') {
            if (library.getAuthorization(47, licenses)) {
              // Elimina registros
              library1.Delete_JE(LMRY_Intern);
              // Delete Credit Memo
              library1.Delete_CM('vendorcredit', LMRY_Intern);
            }
          }
        }

        if (LMRY_Result[0] == "BR") {
          var ft_global_amount = library.getAuthorization(877, licenses);
          if (["create", "edit", "copy"].indexOf(context.type) != -1 && ft_global_amount == true) {
            libraryFleteGlobales.updateBrTransactionField(context);
          }
        }


        if (type == 'create' || type == 'edit' || type == 'copy') {
          var transactionType = 'vendorbill';
          //LatamTAX BR
          if (type == 'edit' && LMRY_Result[0] == 'BR' && (library.getAuthorization(147, licenses) || library.getAuthorization(527, licenses))) {
            record.submitFields({
              type: transactionType,
              id: LMRY_Intern,
              values: {
                'custbody_lmry_scheduled_process': false,
              },
              options: {
                disableTriggers: true
              }
            });

            validateDeleteTaxResultesBR(context);
          }

          if (LMRY_Result[0] == 'CO') {
            if(type==='create'||(type==='edit') ){
            var flagEntity = libraryNewWHTLines.searchEntity(recordObj.getValue('entity'), 'vendor');

            if (!flagEntity) {
                libraryNewWHTLines.newAfterSubmitTransaction(context, type, LMRY_Intern, transactionType, licenses, false);
            }  
            }

            

        } else {
            libWHTLines.afterSubmitTransaction(context, type, LMRY_Intern, transactionType, licenses);
        }

        }

        // Solo si la transaccion es Creada, Editada y/o Copiada
        if (type == 'create' || type == 'edit' || type == 'copy') {

          if (LMRY_Result[0] == 'MX' && library.getAuthorization(243, licenses) == true && !library.getAuthorization(671, licenses) == true) {
            if (ST_FEATURE == false || ST_FEATURE == "F") {
              LibraryTransferIva.generateMXTransField(context);
            }
          }

          // LatamTax - SuiteTax
          if (ST_FEATURE == true || ST_FEATURE == "T") {

            var ST_RecordObj = record.load({
              type: "vendorbill",
              id: recordObj.id
            });

            var ST_Context = {
              type: context.type,
              newRecord: ST_RecordObj
            };

            switch (LMRY_Result[0]) {

              case "MX":
                if (library.getAuthorization(671, licenses) == true) {
                  MX_ST_TaxLibrary.setTaxTransaction(context);
                }
                if (library.getAuthorization(958, licenses) == true) {
                  MX_STE_WhtLibrary_Total.setWHTTransaction(context);
                }
                break;

              case "CO":
                if (library.getAuthorization(643, licenses) == true) {
                  CO_STE_TaxLibrary.setTaxTransaction(context);
                }
                if (library.getAuthorization(340, licenses) == true) {
                    if(isEditAmounts(context.newRecord, context.oldRecord,context)){
                        CO_STE_WhtLibrary_Lines.setWHTTransaction(context, licenses);
                    }
                }
                if (library.getAuthorization(27, licenses) == true) {
                    if(isEditAmounts(context.newRecord, context.oldRecord,context)){
                  CO_STE_WhtLibrary_Total.setWHTTotalTransaction(context, licenses);
                    }
                }
                break;

              case "AR":
                if (library.getAuthorization(678, licenses) == true) {
                  AR_ST_TaxLibrary.setTaxTransaction(context);
                }
                if (library.getAuthorization(218, licenses) == true) {
                  AR_ST_Perception.applyPerception(context);
                }
                if (library.getAuthorization(138, licenses) == true) {
                  AR_ST_TransFields.setTransactionFields(context);
                }
                break;

              case "CL":
                if (library.getAuthorization(627, licenses) == true) {
                  CL_ST_TaxLibrary.setTaxTransaction(context);
                }
                if (library.getAuthorization(628, licenses) == true) {
                  CL_ST_WhtLibrary_Total.setWHTTransaction(context);
                }
                break;

              case "PA":
                if (library.getAuthorization(709, licenses) == true) {
                  PA_ST_TaxLibrary.setTaxTransaction(context);
                }
                break;

              case "PE":
                if (library.getAuthorization(644, licenses) == true) {
                  PE_STE_TaxLibrary.setTaxTransaction(context);
                }
                break;
              case "CR":
                if (library.getAuthorization(995, licenses)) {
                  CR_STE_WhtLibrary_Total.setWHTTotalTransaction(context, licenses);
                }
                break;

            }

          } else {
            switch (LMRY_Result[0]) {
              case "MX":
                if (library.getAuthorization(671, licenses) == true) {
                  if (type == 'create' || type == 'copy') {
                    MX_TaxLibrary.calculateTaxPurchase(recordObj.id, recordObj.type);
                  } else if (type == 'edit') {
                    var JSON_Search = search.create({
                      type: "customrecord_lmry_ste_json_result",
                      columns: ["internalid"],
                      filters: [
                        ["custrecord_lmry_ste_related_transaction", "IS", recordObj.id]
                      ]
                    }).run().getRange(0, 10);

                    if (JSON_Search != null && JSON_Search.length > 0) {
                      MX_TaxLibrary.calculateTaxPurchase(recordObj.id, recordObj.type);
                    }
                  }
                }
                break;
            }
          }

        }

        if (type == 'create' && LMRY_Result[0] == 'BR') {
          Library_BRDup.assignPreprinted(recordObj, licenses);
        }

        if (["create", "edit", "copy"].indexOf(type) != -1 && LMRY_Result[0] == 'BO' && library.getAuthorization(828, licenses)) {
          libBoTaxes.calculateBoTaxes(recordObj, type);
        }

        if (type == 'create' || type == 'edit') {
          // Nueva logica Retenciones Guatemala
          Library_WHT_GT.afterSubmitTransaction(type, recordObj.id, recordObj.type, licenses);

          // Para Mexico
          if (LMRY_Result[0] == 'MX') {
            if (library.getAuthorization(151, licenses) == true) {
              // Abre la transaccion solo al crear
              if (type == 'create') {
                recordObj = record.load({
                  type: recordObj.type,
                  id: recordObj.id,
                  isDynamic: false
                });
              }
              // para carga de la DIOT
              if (ST_FEATURE === true || ST_FEATURE === "T") {
                MX_ST_DIOT_Library.CalculoDIOT(recordObj);
              } else {
                if (library.getAuthorization(671, licenses) == false) {
                  libraryDIOT.CalculoDIOT(recordObj);
                }
              }
            }
            if (library.getAuthorization(20, licenses) == true) {
              // Libera transaccion
              //27-01-21: Se renombro el campo y se usa para los anticipos BR
              /*var otherId = record.submitFields({
                type: 'vendorbill',
                id: LMRY_Intern,
                values: {
                  'custbody_lmry_diot_iva_procesado': 2
                }
              });*/
            }
          }
          // *************************   Modificacion 6 de Setiembre 2019    ********************
          // Decripcion: Si hay acceso y los VendorBill estan aprobados se genera las retenciones


          //variable approvalStatus del campo APPROVAL STATUS del BILL
          var approvalStatus = 0;
          approvalStatus = recordObj.getValue({
            fieldId: 'approvalstatus'
          });

          // Para Colombia - Enabled Feature WHT Latam
          if (LMRY_Result[0] == 'CO') {
            if (library.getAuthorization(27, licenses) && approvalStatus == 2) {
              // Aplicacion de WHT Latam
              if (ST_FEATURE == false || ST_FEATURE == "F") {
                library1.Create_WHT_Latam('vendorbill', LMRY_Intern, context);
              }
            }
          }
          // Para Colombia - Enabled Feature WHT Latam
          if (LMRY_Result[0] == 'BO') {
            if (library.getAuthorization(46, licenses) && approvalStatus == 2) {
              // Aplicacion de WHT Latam
              BO_libWHTLines.createWHTbyLines(LMRY_Intern, 'vendorbill');
            }
          }
          // Para Paraguay - Enabled Feature WHT Latam
          if (LMRY_Result[0] == 'PY') {
            if (library.getAuthorization(47, licenses) && approvalStatus == 2) {
              // Aplicacion de WHT Latam
              library1.Create_WHT_Latam('vendorbill', LMRY_Intern);
            }
          }
          //******************* Fin de Modificacion 6 de Setiembre 2019 ***************************

        }

        /******************************
         * Nueva logica de colombia
         * para los siguientes paises
         ******************************/
        // switch (LMRY_Result[0]) {
        //   case 'AR':
        //     if (library.getAuthorization(200, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        //   case 'BO':
        //     if (library.getAuthorization(152, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        //   /*case 'BR':
        //     if (library.getAuthorization(147) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;*/
        //   case 'CL':
        //     if (library.getAuthorization(201, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        //   case 'CO':
        //     if (library.getAuthorization(150, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        //   case 'CR':
        //     if (library.getAuthorization(203, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        // //   case 'EC':
        // //     if (library.getAuthorization(153, licenses) == true) {
        // //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        // //     }
        // //     break;
        //   case 'SV':
        //     if (library.getAuthorization(205, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        // //   case 'GT':
        // //     if (library.getAuthorization(207, licenses) == true) {
        // //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        // //     }
        // //     break;
        //   case 'MX':
        //     if (library.getAuthorization(209, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        //   case 'PA':
        //     if (library.getAuthorization(211, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        //   case 'PY':
        //     if (library.getAuthorization(213, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        //   case 'PE':
        //     if (library.getAuthorization(214, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        //   case 'UY':
        //     if (library.getAuthorization(216, licenses) == true) {
        //       Library_WHT_Transaction.afterSubmitTransaction(context, true);
        //     }
        //     break;
        // }

        // Solo al momento de Crear o Editar
        if (type == 'create' || type == 'edit') {
          /***********************************
           * Solo si tiene el Feature activo
           * AR - PERCEPCIONES PURCHASE
           ***********************************/
          if (LMRY_Result[0] == 'AR' && library.getAuthorization(218, licenses)) {
            // Logica Percepcion Opus
            var arreglo_item = new Array();
            var arreglo_amount = new Array();
            var arreglo_class = new Array();
            var arreglo_location = new Array();
            var arreglo_department = new Array();

            // Solo para la sublista Items
            var cantidad_items = recordObj.getLineCount({
              sublistId: 'item'
            });
            if (cantidad_items > 0) {
              for (var i = 0; i < cantidad_items; i++) {
                var columna_tributo = recordObj.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_lmry_ar_item_tributo',
                  line: i
                });
                if (columna_tributo) {
                  var name_item = recordObj.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                  });
                  var amount = recordObj.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i
                  });
                  var clase = recordObj.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'class',
                    line: i
                  });
                  var departamento = recordObj.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'department',
                    line: i
                  });
                  var ubicacion = recordObj.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: i
                  });
                  arreglo_item.push(name_item);
                  arreglo_class.push(clase);
                  arreglo_department.push(departamento);
                  arreglo_location.push(ubicacion);
                  arreglo_amount.push(amount);
                }
              }

              /***********************************
               * Trae los regitros configurados
               * en el registro personalizado
               * LatamReady - Percepcion Purchase
               **********************************/
              var search_opus = search.create({
                type: 'customrecord_lmry_percepcion_purchase',
                columns: ['custrecord_lmry_percepcion_item1', 'custrecord_lmry_percepcion_item2',
                  'custrecord_lmry_percepcion_taxcode', 'custrecord_lmry_percepcion_subsidiary'
                ],
                filters: [{
                  name: 'isinactive',
                  operator: 'is',
                  values: ['F']
                }]
              });
              // Trae los primeros 1000 registros
              var result_opus = search_opus.run().getRange(0, 1000);
              // Solo si esta configurado
              if (result_opus != null && result_opus.length > 0) {
                /**************************************
                 * Actualiza el Vendor Bill - Grabado
                 *************************************/
                var mirror_record = record.load({
                  type: recordObj.type,
                  id: recordObj.id,
                  isDynamic: false
                });

                // Barrido del arreglo arreglo_item
                for (var j = 0; j < arreglo_item.length; j++) {
                  // Seteo de Segmentacion
                  for (var k = 0; k < result_opus.length; k++) {
                    // Solo si el item es de percepcion
                    if (arreglo_item[j] == result_opus[k].getValue("custrecord_lmry_percepcion_item1")) {
                      var amount = parseFloat(arreglo_amount[j]) * (-1);
                      mirror_record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: cantidad_items,
                        value: result_opus[k].getValue("custrecord_lmry_percepcion_item2")
                      });
                      mirror_record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_lmry_ar_item_tributo',
                        line: cantidad_items,
                        value: false
                      });
                      mirror_record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        line: cantidad_items,
                        value: amount
                      });
                      mirror_record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: cantidad_items,
                        value: '1'
                      });
                      mirror_record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        line: cantidad_items,
                        value: arreglo_amount[j]
                      });
                      mirror_record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxcode',
                        line: cantidad_items,
                        value: result_opus[k].getValue("custrecord_lmry_percepcion_taxcode")
                      });
                      if (arreglo_location[j] != null && arreglo_location[j] != '') {
                        mirror_record.setSublistValue({
                          sublistId: 'item',
                          fieldId: 'location',
                          line: cantidad_items,
                          value: arreglo_location[j]
                        });
                      }
                      if (arreglo_class[j] != null && arreglo_class[j] != '') {
                        mirror_record.setSublistValue({
                          sublistId: 'item',
                          fieldId: 'class',
                          line: cantidad_items,
                          value: arreglo_class[j]
                        });
                      }
                      if (arreglo_department[j] != null && arreglo_department[j] != '') {
                        mirror_record.setSublistValue({
                          sublistId: 'item',
                          fieldId: 'department',
                          line: cantidad_items,
                          value: arreglo_department[j]
                        });
                      }
                      // Siguiente Linea
                      cantidad_items++;
                    } // //Fin :  Solo si el item es de percepcion
                  } // Fin : Segmentacion
                } // Fin : arreglo_item

                // Graba Record
                mirror_record.save({
                  ignoreMandatoryFields: true,
                  disableTriggers: true,
                  enableSourcing: true
                });
              } // Solo si esta configurado
            } // Solo si tiene Items
          } // Solo Feature 218

          /***********************************
           * Solo si tiene el Feature activo
           * AR - WHT Payment
           ***********************************/
          if (LMRY_Result[0] == 'AR') {
            if (ST_FEATURE == false || ST_FEATURE == "F") {
              if (library.getAuthorization(138, licenses)) {
                GroupLine(context, LMRY_Intern);
              }
            }
          } // Solo AR - SUM TAX CODE GROUP
        } // Solo Crear o Editar


        //GL IMPACT POPUP
        if ((type == 'create' || type == 'edit') && LMRY_Result[0] == 'BR' && library.getAuthorization(290, licenses) == true) {
          library_GLImpact_Popup.afterSubmit_GLpopup(context);
        }

        /*********************** MODIFICACIÓN *****************************************************
          - Fecha: 23/10/2020, nueva modificacion: 14/06/2022
          - Descripción: Cálculo de IGV y creación de Journal
        ******************************************************************************************/

        if ((type == 'create' || type == 'edit' || type == 'copy') && LMRY_Result[0] == 'PE' && LMRY_Result[2] == true) {
          if(isEditAmounts(context.newRecord, context.oldRecord,context)){
            // if (type == 'edit') {
            //   libraryIGVNoDom.deleteJournalIGV(LMRY_Intern);
            // }
  
            // //Elimina el registro LatamReady - PE Transaction Fields anexado a la transacción
            // libraryIGVNoDom.deleteTransactionFields(LMRY_Intern);
  
            //Realiza el calculo del IGV y creación del Journal
            libraryIGVNoDom.calcularIGV(recordObj);
          }
          

        }

        //GENERAR RETENCION POR CABECERA URUGUAY
        var featWhtUy = library.getAuthorization(756, licenses);
        var applWTH = recordObj.getValue({
          fieldId: 'custbody_lmry_apply_wht_code'
        });
        if ((type == 'create' || type == 'edit' || type == 'copy') && LMRY_Result[0] == 'UY' && featWhtUy && (applWTH == 'T' || applWTH == true)) {
          library_UY_Retencion.afterSubmitTransaction(recordObj, context.type);
        }

        //GENERAR RETENCION POR CABECERA MEXICO
        if (ST_FEATURE == false || ST_FEATURE == "F") {
          var featWhtMx = library.getAuthorization(958, licenses);
          var applWTH = recordObj.getValue({
            fieldId: 'custbody_lmry_apply_wht_code'
          });
          if ((type == 'create' || type == 'edit' || type == 'copy') && LMRY_Result[0] == 'MX' && featWhtMx && (applWTH == 'T' || applWTH == true)) {
            // feature 671
            var taxRule = recordObj.getValue('custpage_wht_rule');
            var cantidad_items = recordObj.getLineCount({
              sublistId: 'item'
            });
            if (cantidad_items > 0 && taxRule != '') {
              taxRule = recordObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_wht_rule',
                line: 0
              });
            } else {
              var cantidad_exp = recordObj.getLineCount({
                sublistId: 'expense'
              });
              if (cantidad_exp > 0 && taxRule != '') {
                taxRule = recordObj.getSublistValue({
                  sublistId: 'expense',
                  fieldId: 'custcol_lmry_wht_rule',
                  line: 0
                });
              }
            }
            if (taxRule != null && taxRule != '') {
              MX_WhtLibrary.calculateWhtPurchase(recordObj.id, recordObj.type, taxRule);
            }
          }
        }
        //FIN GENERAR RETENCION POR CABECERA MEXICO

      } catch (err) {
        recordObj = context.newRecord;
        log.error("[afterSubmit]", err);
        library.sendemail2('[ afterSubmit ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
        libLog.doLog("[ afterSubmit ]", err);
      }
      return true;
    }

    /* ------------------------------------------------------------------------------------------------------
     * Elimina la agrupacion del registro personalizado LatamReady - Setup Tax Code Group.
     * --------------------------------------------------------------------------------------------------- */
    function DeleteGroupLine(recordID) {
      try {
        /**********************************
         * Valida si no existe en el record
         * LatamReady - Transaction Fields
         * en el caso de existir Elimina
         **********************************/
        var tax_group = search.create({
          type: 'customrecord_lmry_transactions_fields',
          columns: ['internalid', 'custrecord_lmry_transaction_f'],
          filters: [{
            name: 'custrecord_lmry_transaction_f_id',
            operator: 'equalto',
            values: recordID
          }]
        });
        // Trae los primeros 1000 registros
        var result_tax = tax_group.run().getRange(0, 1000);

        // Valida si ya se grabo
        if (result_tax != null && result_tax.length > 0) {
          // Para validar si ingresa al log
          // log.debug({
          //   title: 'DeleteGroupLine : result_tax',
          //   details: result_tax[0].getValue('internalid')
          // });

          // Eliminacion de Records
          for (var delLine = 0; delLine < result_tax.length; delLine++) {
            // Elimina el del regisotr personalizado
            var delRecord = record.delete({
              type: 'customrecord_lmry_transactions_fields',
              id: result_tax[delLine].getValue('internalid'),
            });
          } // Eliminacion de Records

          // Para validar si ingresa al log
          // log.debug({
          //   title: 'Delete Record Line',
          //   details: delRecord
          // });

        } // Valida si ya se grabo
      } catch (err) {
        log.error("[ beforeSubmit - DeleteGroupLine ]", err);
        library.sendemail2('[ beforeSubmit - DeleteGroupLine ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
        libLog.doLog("[ beforeSubmit - DeleteGroupLine ]", err);
      }
      return true;
    }

    /* ------------------------------------------------------------------------------------------------------
     * Realiza la agrupacion de las lienas de la transacion segun la configuracion del registros
     * personalizado LatamReady - Setup Tax Code Group.
     * --------------------------------------------------------------------------------------------------- */
    function GroupLine(context, Record_ID) {
      try {
        // Registro Actualiza
        var recordObj = context.newRecord;

        // Si edita lo elimina
        if (context.type != 'create') {
          // Elimina registros
          DeleteGroupLine(Record_ID);
        }

        // Declaracion de Arreglos
        var arr_DatFil = [];
        var arr_PosFil = -1;

        /***********************************
         * Trae los regitros configurados
         * en el registro personalizado
         * LatamReady - Setup Tax Code Group
         **********************************/
        var tax_group = search.create({
          type: "customrecord_lmry_setup_taxcode_group",
          filters: [{
            name: 'isinactive',
            operator: 'is',
            values: ['F']
          }],
          columns: ["internalid", "custrecord_lmry_setup_taxcode_country",
            search.createColumn({
              name: "custrecord_lmry_setup_taxcode_group",
              sort: search.Sort.ASC
            }), "custrecord_lmry_setup_taxcode",
            search.createColumn({
              name: "custrecord_lmry_setup_id_custbody",
              join: "custrecord_lmry_setup_taxcode_group"
            }),
            search.createColumn({
              name: "custrecord_lmry_setup_amount_to",
              join: "custrecord_lmry_setup_taxcode_group"
            })
          ]
        });

        // Trae los primeros 1000 registros
        var result_grps = tax_group.run().getRange(0, 1000);
        // Solo si esta configurado TAX Group
        if (result_grps != null && result_grps.length > 0) {
          // Inicio Barrido del grupo de impuestos
          for (var TaxLine = 0; TaxLine < result_grps.length; TaxLine++) {
            // Declaracion de JSON y Arreglo Tax Group
            var arr_DatCol = {};
            arr_DatCol["TaxGroup"] = ''; // Latam - Tax Code Group
            arr_DatCol["TaxCodes"] = ''; // Latam - Tax Code
            arr_DatCol["TaxField"] = ''; // Latam - Setup ID Custbody
            arr_DatCol["TaxBase"] = ''; // Latam - Setup Amount To
            arr_DatCol["TaxAmoun"] = 0; // Amount

            // Captura Columnas
            var arr_Fields = result_grps[TaxLine].columns;

            // TaxLine = Filas del TAX Group
            arr_DatCol.TaxGroup = result_grps[TaxLine].getValue(arr_Fields[2]); // Latam - Tax Code Group
            arr_DatCol.TaxCodes = result_grps[TaxLine].getValue(arr_Fields[3]); // Latam - Tax Code
            arr_DatCol.TaxField = result_grps[TaxLine].getValue(arr_Fields[4]); // Latam - Setup ID Custbody
            arr_DatCol.TaxBase = result_grps[TaxLine].getValue(arr_Fields[5]); // Latam - Setup Amount To
            arr_DatCol.TaxAmoun = 0; // Amount

            if (!arr_DatCol.TaxBase) {
              continue;
            }

            var baseBill = '';
            switch (arr_DatCol.TaxBase) {
              case "1":
                baseBill = 'grossamt';
                break;
              case "2":
                baseBill = 'tax1amt';
                break;
              case "3":
                baseBill = 'amount';
                break;
            }

            // arr_RowSws = switch de si existen lienas
            var arr_RowSws = false;

            /*******************************
             * Solo para la sublista Items
             *******************************/
            var cantidad_items = recordObj.getLineCount({
              sublistId: 'item'
            });
            if (cantidad_items > 0) {
              for (var ItemLine = 0; ItemLine < cantidad_items; ItemLine++) {
                var lin_taxcode = recordObj.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'taxcode',
                  line: ItemLine
                });
                var lin_amounts = recordObj.getSublistValue({
                  sublistId: 'item',
                  fieldId: baseBill,
                  line: ItemLine
                });
                // Compara codigos de impuesto
                if (arr_DatCol.TaxCodes == lin_taxcode) {
                  arr_RowSws = true;
                  arr_DatCol.TaxAmoun = parseFloat(arr_DatCol.TaxAmoun) + parseFloat(lin_amounts);
                }
              }
            } // Solo para la sublista Items

            /*******************************
             * Solo para la sublista Expense
             *******************************/
            var cantidad_expen = recordObj.getLineCount({
              sublistId: 'expense'
            });
            if (cantidad_expen > 0) {
              for (var ExpeLine = 0; ExpeLine < cantidad_expen; ExpeLine++) {
                var lin_taxcode = recordObj.getSublistValue({
                  sublistId: 'expense',
                  fieldId: 'taxcode',
                  line: ExpeLine
                });
                var lin_amounts = recordObj.getSublistValue({
                  sublistId: 'expense',
                  fieldId: baseBill,
                  line: ExpeLine
                });
                // Compara codigos de impuesto
                if (arr_DatCol.TaxCodes == lin_taxcode) {
                  arr_RowSws = true;
                  arr_DatCol.TaxAmoun = parseFloat(arr_DatCol.TaxAmoun) + parseFloat(lin_amounts);
                }
              }
            } // Solo para la sublista Expense

            // Solo si a capturado valores
            if (arr_RowSws == true) {
              // Incrementa las Filas
              arr_PosFil = arr_PosFil + 1;

              // arr_DatCol = Filas de la agrupacion
              arr_DatFil[arr_PosFil] = arr_DatCol;
            }
          } // Fin Barrido del grupo de impuestos

          /**********************************
           * Realiza la agrupacion por
           * Tax Code Group, Suma importes
           * Solo si existe informacion
           **********************************/
          //arr_DatFil[0].TaxGroup != '' && arr_DatFil[0].TaxGroup != null
          if (arr_DatFil.length > 0 && arr_DatFil != null) {
            var aux_DatCol = {};
            aux_DatCol["TaxGroup"] = ''; // Latam - Tax Code Group
            var aux_PosFil = -1;
            var aux_DatFil = [];
            // Carga el arreglo con el JSON
            aux_DatFil[aux_PosFil] = aux_DatCol;
            for (var nCols = 0; nCols < arr_DatFil.length; nCols++) {
              if (aux_DatFil[aux_PosFil].TaxGroup != arr_DatFil[nCols].TaxGroup) {
                var aux_DatCol = {};
                aux_DatCol["TaxGroup"] = arr_DatFil[nCols].TaxGroup; // Latam - Tax Code Group
                aux_DatCol["TaxCodes"] = ''; // Latam - Tax Code
                aux_DatCol["TaxField"] = ''; // Latam - Setup ID Custbody
                aux_DatCol["TaxAmoun"] = 0; // Amount

                // Incrementa Fila
                aux_PosFil = aux_PosFil + 1;

                // Carga el arreglo con el JSON
                aux_DatFil[aux_PosFil] = aux_DatCol;
              }
              aux_DatFil[aux_PosFil].TaxGroup = arr_DatFil[nCols].TaxGroup; // Latam - Tax Code Group
              aux_DatFil[aux_PosFil].TaxField = arr_DatFil[nCols].TaxField; // Latam - Setup ID Custbody
              aux_DatFil[aux_PosFil].TaxAmoun = parseFloat(aux_DatFil[aux_PosFil].TaxAmoun) +
                parseFloat(arr_DatFil[nCols].TaxAmoun); // Amount
            }

            /**********************************
             * Graba  en el record
             * LatamReady - Transaction Fields
             * los importes acumula
             **********************************/
            var Record_TFS = '';

            // Crea el registro nuevo
            Record_TFS = record.create({
              type: 'customrecord_lmry_transactions_fields',
              isDynamic: true
            });

            // Latam - Related Transaction
            Record_TFS.setValue({
              fieldId: 'custrecord_lmry_transaction_f',
              value: recordObj.id
            });
            Record_TFS.setValue({
              fieldId: 'custrecord_lmry_transaction_f_id',
              value: recordObj.id
            });
            // Latam - Exento
            Record_TFS.setValue({
              fieldId: 'custrecord_lmry_transaction_f_exento',
              value: 0
            });
            // Latam - IVA
            Record_TFS.setValue({
              fieldId: 'custrecord_lmry_transaction_f_iva',
              value: 0
            });
            // Latam - Neto Gravado
            Record_TFS.setValue({
              fieldId: 'custrecord_lmry_transaction_f_gravado',
              value: 0
            });
            // Latam - Neto No Gravado
            Record_TFS.setValue({
              fieldId: 'custrecord_lmry_transaction_f_no_gravado',
              value: 0
            });

            // Actualiza los campos de Record
            for (var nCols = 0; nCols < aux_DatFil.length; nCols++) {
              // nCols = Fila del arreglo
              // [nCols][2] = Latam - Setup ID Custbody
              // [nCols][3] = Amount
              Record_TFS.setValue({
                fieldId: aux_DatFil[nCols].TaxField,
                value: Math.round(parseFloat(aux_DatFil[nCols].TaxAmoun) * 100) / 100
              });
            }

            // Graba el record
            Record_TFS.save({
              ignoreMandatoryFields: true,
              disableTriggers: true,
              enableSourcing: true
            });
          } // Solo si se cargo Tax
        } // Solo si tiene Items
      } catch (errmsg) {
        recordObj = context.newRecord;
        log.error("[ afterSubmit - GroupLine ]", errmsg);
        library.sendemail2('[ afterSubmit - GroupLine ] ' + errmsg, LMRY_script, recordObj, 'transactionnumber', 'entity');
        libLog.doLog("[ afterSubmit - GroupLine ]", errmsg);
      }
    }

    /* ------------------------------------------------------------------
     * A la variable FeatureID se le asigna el valore que le corresponde
     *  y si tiene activo el enabled feature access.
     * --------------------------------------------------------------- */
    function ValidateAccessVB(ID) {
      var LMRY_access = false;
      var LMRY_countr = new Array();
      var LMRY_Result = new Array();

      try {

        // Inicializa variables Locales y Globales
        LMRY_countr = library.Validate_Country(ID);

        // Verifica que el arreglo este lleno
        if (LMRY_countr.length < 1) {
          LMRY_Result[0] = '';
          LMRY_Result[1] = '-None-';
          LMRY_Result[2] = LMRY_access;
          return true;
        }

        LMRY_access = library.getCountryOfAccess(LMRY_countr, licenses);

        // Asigna Valores
        LMRY_Result[0] = LMRY_countr[0]; //MX
        LMRY_Result[1] = LMRY_countr[1]; //Mexico
        LMRY_Result[2] = LMRY_access;
        LMRY_Result = activate_fe(LMRY_Result, licenses);
      } catch (err) {
        log.error("[ ValidateAccessVB ]", err);
        library.sendemail2('[ ValidateAccessVB ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
        libLog.doLog("[ ValidateAccessVB ]", err);
      }

      return LMRY_Result;
    }

    /* ------------------------------------------------------------------
     * Funcion activate_fe para activar features del bill.
     * --------------------------------------------------------------- */
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

    function cleanLinesforCopy(RCD_TRANS) {
      try {
        var numLineas = RCD_TRANS.getLineCount({
          sublistId: 'item'
        });

        var featureSuiteTax = runtime.isFeatureInEffect({
          feature: 'tax_overhauling'
        });

        var featureMultiPrice = runtime.isFeatureInEffect({
          feature: 'multprice'
        });

        for (var i = 0; i < numLineas; i++) {

          var base_amount = RCD_TRANS.getSublistValue('item', 'custcol_lmry_br_base_amount', i); //base_amount es el nuevo net
          if (base_amount) {
            var quantityItem = RCD_TRANS.getSublistValue('item', 'quantity', i);
            quantityItem = parseFloat(quantityItem);
            var rateItem = parseFloat(base_amount) / quantityItem;

            if (featureMultiPrice == true || featureMultiPrice == 'T') {
              RCD_TRANS.setSublistValue('item', 'price', i, -1);
            }
            RCD_TRANS.setSublistValue('item', 'rate', i, round2(rateItem));
            RCD_TRANS.setSublistValue('item', 'amount', i, round2(base_amount));
            RCD_TRANS.setSublistValue('item', 'grossamt', i, round2(base_amount));
            RCD_TRANS.setSublistValue('item', 'custcol_lmry_br_base_amount', i, '');
            RCD_TRANS.setSublistValue('item', 'custcol_lmry_br_total_impuestos', i, '');
            if (featureSuiteTax === false || featureSuiteTax === "F") {
              RCD_TRANS.setSublistValue('item', 'tax1amt', i, 0);
            } else {
              RCD_TRANS.setSublistValue('item', 'taxamount', i, 0);

              RCD_TRANS.removeLine({
                sublistId: 'taxdetails',
                line: 0
              });
            }

          }
        }

        //deleteTaxLines(RCD_TRANS);

      } catch (err) {
        log.error('[cleanLinesforCopy]', err);
        libLog.doLog("[cleanLinesforCopy]", err);
      }
      return true;
    }

    function round2(num) {
      var e = (num >= 0) ? 1e-6 : -1e-6;
      return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
    }

    function setWithholdingValues(country, recordObj, licenses) {
      // Validacion de Features & Country
      var swFeature = false;

      if (country == 'PE' && library.getAuthorization(136, licenses)) {
        swFeature = true;
      }
      if (country == 'BR' && library.getAuthorization(140, licenses)) {
        swFeature = true;
      }
      if (country == 'GT' && library.getAuthorization(133, licenses)) {
        swFeature = true;
      }

      // Panama
      if (country == 'PA' && library.getAuthorization(137, licenses) == true) {
        swFeature = true;
      }

      if(country == "CL" && library.getAuthorization(98, licenses) == true){
        swFeature = true;
      }

      if (swFeature == true && ['USEREVENT', 'SCHEDULED'].indexOf(runtime.executionContext) == -1) {
        var whtAppliesTo = recordObj.getValue({
          fieldId: 'custbody_4601_appliesto'
        }) || "";
        log.debug("whtAppliesTo", whtAppliesTo);
        var whtBaseAmount = 0.00;
        var whtTaxAmount = 0.00;

        var whtTaxCodeGlobal = "";
        var whtTaxRateGlobal = "";
        var allSameWtCode = true;

        var numItems = recordObj.getLineCount({
          sublistId: "item"
        });
        for (var i = 0; i < numItems; i++) {
          var appliesLine = recordObj.getSublistValue({
            sublistId: "item",
            line: i,
            fieldId: "custcol_4601_witaxapplies"
          }) || false;
          var taxLine = recordObj.getSublistValue({
            sublistId: "item",
            line: i,
            fieldId: "custcol_4601_witaxline"
          }) || false;
          if ((appliesLine == true || appliesLine == "T") && (taxLine == false || taxLine == "F")) {

            var whtTaxCode = recordObj.getSublistValue({
              sublistId: "item",
              line: i,
              fieldId: "custcol_4601_witaxcode"
            }) || "";
            var whtTaxRate = recordObj.getSublistValue({
              sublistId: "item",
              line: i,
              fieldId: "custcol_4601_witaxrate"
            }) || "";

            if (whtTaxCode) {
              if (whtTaxCodeGlobal) {
                if (whtTaxCodeGlobal != whtTaxCode) {
                  allSameWtCode = false;
                }
              } else {
                whtTaxCodeGlobal = whtTaxCode;
                whtTaxRateGlobal = whtTaxRate;
              }
            }

            var whtBaseAmtLine = recordObj.getSublistValue({
              sublistId: "item",
              line: i,
              fieldId: "custcol_4601_witaxbaseamount"
            }) || 0.00;
            whtBaseAmtLine = parseFloat(whtBaseAmtLine);
            whtBaseAmount = round2(whtBaseAmount + whtBaseAmtLine);
            var whtTaxAmtLine = recordObj.getSublistValue({
              sublistId: "item",
              line: i,
              fieldId: "custcol_4601_witaxamount"
            }) || 0.00;
            whtTaxAmtLine = parseFloat(whtTaxAmtLine);
            whtTaxAmount = round2(whtTaxAmount + whtTaxAmtLine);
          }
        }

        var numexpenses = recordObj.getLineCount({
          sublistId: "expense"
        });
        log.debug("numexpenses", numexpenses);
        for (var i = 0; i < numexpenses; i++) {
          var appliesLine = recordObj.getSublistValue({
            sublistId: "expense",
            line: i,
            fieldId: "custcol_4601_witaxapplies"
          }) || false;
          var taxLine = recordObj.getSublistValue({
            sublistId: "expense",
            line: i,
            fieldId: "custcol_4601_witaxline"
          }) || false;
          if ((appliesLine == true || appliesLine == "T") && (taxLine == false || taxLine == "F")) {

            var whtTaxCode = recordObj.getSublistValue({
              sublistId: "expense",
              line: i,
              fieldId: "custcol_4601_witaxcode_exp"
            }) || "";
            var whtTaxRate = recordObj.getSublistValue({
              sublistId: "expense",
              line: i,
              fieldId: "custcol_4601_witaxrate_exp"
            }) || "";

            if (whtTaxCode) {
              if (whtTaxCodeGlobal) {
                if (whtTaxCodeGlobal != whtTaxCode) {
                  allSameWtCode = false;
                }
              } else {
                whtTaxCodeGlobal = whtTaxCode;
                whtTaxRateGlobal = whtTaxRate;
              }
            }

            var whtBaseAmtLine = recordObj.getSublistValue({
              sublistId: "expense",
              line: i,
              fieldId: "custcol_4601_witaxbamt_exp"
            }) || 0.00;
            whtBaseAmtLine = parseFloat(whtBaseAmtLine);
            whtBaseAmount = round2(whtBaseAmount + whtBaseAmtLine);
            var whtTaxAmtLine = recordObj.getSublistValue({
              sublistId: "expense",
              line: i,
              fieldId: "custcol_4601_witaxamt_exp"
            }) || 0.00;
            whtTaxAmtLine = parseFloat(whtTaxAmtLine);
            whtTaxAmount = round2(whtTaxAmount + whtTaxAmtLine);
          }
        }

        if (!allSameWtCode && (whtAppliesTo == "F" || !whtAppliesTo)) {
          whtTaxCodeGlobal = "";
          whtTaxRateGlobal = "";
        }


        if (whtAppliesTo == "T" || whtAppliesTo == true) {
          whtTaxAmount = round2(Math.abs(whtBaseAmount) * parseFloat(whtTaxRateGlobal) / 100) || "";
        }

        var whtTaxName = "";
        if (Number(whtTaxCodeGlobal)) {
          whtTaxName = search.lookupFields({
            type: 'customrecord_4601_witaxcode',
            id: whtTaxCodeGlobal,
            columns: ['custrecord_4601_wtc_witaxtype.custrecord_4601_wtt_name']
          })["custrecord_4601_wtc_witaxtype.custrecord_4601_wtt_name"];
        }

        log.debug("[whtTaxCode,whtTaxName,whtTaxRate,whtTaxAmount,whtBaseAmount]", [whtTaxCodeGlobal, whtTaxName, whtTaxRateGlobal, whtTaxAmount, whtBaseAmount].join(","));

        recordObj.setValue('custbody_lmry_wtax_code', whtTaxCodeGlobal);
        recordObj.setValue('custbody_lmry_wtax_code_des', whtTaxName);
        recordObj.setValue('custbody_lmry_wtax_rate', whtTaxRateGlobal);
        recordObj.setValue('custbody_lmry_wtax_amount', Math.abs(whtTaxAmount));
        recordObj.setValue('custbody_lmry_wbase_amount', Math.abs(whtBaseAmount));

      }
    }

    function validateDeleteTaxResultesBR(context) {
      var validDelete = true;
      var recordObj = context.newRecord;
      var type = context.type;

      if (type === "edit") {
        var brTransactionSearch = search.create({
          type: 'customrecord_lmry_br_transaction_fields',
          columns: 'custrecord_lmry_br_block_taxes',
          filters: [
            ['custrecord_lmry_br_related_transaction', 'anyof', recordObj.id], 'AND', ['custrecord_lmry_br_block_taxes', 'anyof', 1]
          ]
        });
        var results = brTransactionSearch.run().getRange(0, 1);

        if (results && results.length) {
          validDelete = false;
        }

        if (validDelete) {
          var memo = search.lookupFields({
            type: "transaction",
            id: recordObj.id,
            columns: ["memo"]
          }).memo


          if (memo == "VOID") {
            validDelete = false;
          }
        }

        if (validDelete) {
          deleteTaxResult(recordObj);
        }
      }
    }

    function createCoButtonUpDateWhx(scriptContext) {
      var form = scriptContext.form;
      var type = scriptContext.type;

      if (type == "view" && runtime.ContextType.USER_INTERFACE) {
        var recordObj = scriptContext.newRecord;
        var numtransaction = recordObj.getLineCount({
          sublistId: 'item'
        });
        var retelength = 0;
        //log.debug("numtransaction",numtransaction);
        for (var i = 0; i < numtransaction; i++) {
          var retecree = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_lmry_co_autoretecree',
            line: i
          });
          var retefte = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_lmry_co_retefte',
            line: i
          });
          var reteica = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_lmry_co_reteica',
            line: i
          });
          var reteiva = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_lmry_co_reteiva',
            line: i
          });
          if (retecree || retefte || reteica || reteiva) {
            retelength = 1;
            log.debug("una columna esta llena");
            break;
          }
        }
        log.debug("recordType", JSON.stringify(recordObj.type)); //es el recordType
        form.addButton({
          id: 'custpage_id_button_ud_whx',
          label: 'UPDATE WHT',
          functionName: "onClick_updatecowht(" + JSON.stringify(recordObj.type) + ")"
        });

        form.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';

        if (retelength > 0) {
          form.getButton({
            id: 'custpage_id_button_ud_whx'
          }).isDisabled = true;
        }
        
      }
      
    }
    function isEditAmounts(newRecord, oldRecord,context) {
      var state = false;
      if(context.type==='create'){
        log.debug('Estado de la Transaccion1','En creacion')
        return true
      }
      if(!newRecord || !oldRecord){
        log.debug('Estado de la Transaccion2','No comparable')
        return true
      };
      if(oldRecord.getValue('approvalstatus')!==newRecord.getValue('approvalstatus')){
        log.debug('Estado de la Transaccion3','Estado de aprobacion modificado');
        return true;
      }
      const nroItemsNew = newRecord.getLineCount({
        sublistId: 'item'
      });
      const nroItemsOld = oldRecord.getLineCount({
        sublistId: 'item'
      });
      if (nroItemsNew !== nroItemsOld){
        log.debug('Estado de la Transaccion4','Modificada');
        return true;
      }
      
      for (var index = 0; index < nroItemsNew; index++) {
        var newRecordItem = newRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          line: index
        });

        var oldRecordItem = oldRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          line: index
        });

        if (newRecordItem !== oldRecordItem || newRecordItem === null || oldRecordItem === null) state = true;

        var newRecordAmount = newRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'grossamt',
          line: index
        });

        var oldRecordAmount = oldRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'grossamt',
          line: index
        });
        
        if (newRecordAmount !== oldRecordAmount || newRecordAmount === null || oldRecordAmount === null) state = true;

      }

      const nroExpenseNew = newRecord.getLineCount({
        sublistId: 'expense'
      });

      const nroExpenseOld = oldRecord.getLineCount({
        sublistId: 'expense'
      });

      if (nroExpenseNew !== nroExpenseOld){
        log.debug('Estado de la Transaccion5','Modificada');
        return true;
      } 


      for (var index = 0; index < nroExpenseNew; index++) {
        var newRecordAccount = newRecord.getSublistValue({
          sublistId: 'expense',
          fieldId: 'account',
          line: index
        });

        var oldRecordAccount = oldRecord.getSublistValue({
          sublistId: 'expense',
          fieldId: 'account',
          line: index
        });

        if (newRecordAccount !== oldRecordAccount || newRecordAccount === null || oldRecordAccount === null) state = true;

        var newRecordAmountE = newRecord.getSublistValue({
          sublistId: 'expense',
          fieldId: 'grossamt',
          line: index
        });

        var oldRecordAmountE = oldRecord.getSublistValue({
          sublistId: 'expense',
          fieldId: 'grossamt',
          line: index
        });

        if (newRecordAmountE !== oldRecordAmountE || newRecordAmountE === null || oldRecordAmountE === null) state = true;

      }
      if(state===false){
        log.debug('Estado de la Transaccion6','Sin modificacion');
      }else{
        log.debug('Estado de la Transaccion7','Modificada');
      }
      return state

    }

    function deleteTaxResult(recordObj) {
      try {
        var internalID = recordObj.id;
        var searchTaxResult = search.create({
          type: "customrecord_lmry_br_transaction",
          filters:
            [
              ["custrecord_lmry_br_transaction", "anyof", internalID],
              "AND",
              ["custrecord_lmry_br_transaction.mainline", "is", "T"],
              "AND",
              ["custrecord_lmry_tax_type", "anyof", "4"]
            ],
          columns:
            [
              search.createColumn({ name: "internalid", label: "Internal ID" }),
              search.createColumn({ name: "custrecord_lmry_total_item", label: "Latam - Total / Line" }),
              search.createColumn({
                name: "custrecord_lmry_ntax_tax_calculator",
                join: "CUSTRECORD_LMRY_NTAX",
                label: "Latam - Is Tax Calculator?"
              }),
              search.createColumn({
                name: "custrecord_lmry_ccl_tax_calculator",
                join: "CUSTRECORD_LMRY_CCL",
                label: "Latam - Is Tax Calculator?"
              })
            ]
        });
        var resultTaxResult = searchTaxResult.run().getRange(0, 1000);
        if (resultTaxResult.length > 0) {
          for (var i = 0; i < resultTaxResult.length; i++) {
            var col = resultTaxResult[i].columns;
            var idTaxResult = resultTaxResult[i].getValue(col[0]);
            var memoTax = resultTaxResult[i].getValue(col[1]);
            if (memoTax) {
              if (memoTax == 'Tax Calculator') {
                var isTaxCalcNT = resultTaxResult[i].getValue(col[2]);
                var isTaxCalcCCL = resultTaxResult[i].getValue(col[3]);
                if (isTaxCalcNT == true || isTaxCalcNT == 'T' || isTaxCalcCCL == true || isTaxCalcCCL == 'T') {
                  record.delete({
                    type: 'customrecord_lmry_br_transaction',
                    id: idTaxResult
                  });
                }
              }
              else {
                record.delete({
                  type: 'customrecord_lmry_br_transaction',
                  id: idTaxResult
                });
              }
            }
          }
          //ITEMS
          var numLineItems = recordObj.getLineCount({
            sublistId: 'item'
          });
          var flagTaxRuleItem = false;
          for (var i = 0; i < numLineItems; i++) {
            var colTaxRuleItem = recordObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_lmry_br_tax_rule',
              line: i
            });
            var colItemTributo = recordObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_lmry_ar_item_tributo',
              line: i
            });
            if ((colTaxRuleItem == '' || colTaxRuleItem == null || colTaxRuleItem == undefined) && (colItemTributo == 'F' || colItemTributo == false)) {
              flagTaxRuleItem = true;
              break;
            }
          }
          //EXPENSES
          var numLineExpenses = recordObj.getLineCount({
            sublistId: 'expense'
          });
          var flagTaxRuleExpense = false;
          for (var i = 0; i < numLineExpenses; i++) {
            var colTaxRuleExpense = recordObj.getSublistValue({
              sublistId: 'expense',
              fieldId: 'custcol_lmry_br_tax_rule',
              line: i
            });
            if (colTaxRuleExpense == '' || colTaxRuleExpense == null || colTaxRuleExpense == undefined) {
              flagTaxRuleExpense = true;
              break;
            }
          }
          //Carga y guardado para actualizar líneas de GL Impact
          if (flagTaxRuleItem || flagTaxRuleExpense) {
            var rc = record.load({
              type: 'vendorbill',
              id: internalID
            })
            rc.save({ disableTriggers: true, ignoreMandatoryFields: true });
          }
        }
      } catch (err) {
        log.error("[ deleteTaxResults ]", err);
        library.sendemail(' [ deleteTaxResults ] ' + err, LMRY_script);
      }
    }

    function createCOLineFieldsWHT(formObj, recordObj, type) {
      try {
        var FEATURE_SUBSIDIARY = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
        var subsidiary = recordObj.getValue('subsidiary');
        var typeTransaction = recordObj.type;
        var jsonTransaction = { invoice: '1', creditmemo: '8', vendorbill: '4', vendorcredit: '7' };
        var reteCreeNts = [], reteIcaNts = [], reteIvaNts = [], reteFteNts = [];

        var filters = [
          ["isinactive", "is", "F"],
          "AND",
          ["custrecord_lmry_ntax_subsidiary_country", "anyof", "48"],
          "AND",
          ["custrecord_lmry_ntax_sub_type", "anyof", ["20", "84", "85", "21", "83", "19", "82", "18"]],//ReteCree,ReteFte,ReteICA,ReteIVA
          "AND",
          ["custrecord_lmry_ntax_gen_transaction", "anyof", "5"],
          "AND",
          ["custrecord_lmry_ntax_taxtype", "anyof", "1"],
          "AND",
          ["custrecord_lmry_ntax_transactiontypes", "anyof", jsonTransaction[typeTransaction]]
        ];

        if (FEATURE_SUBSIDIARY == true || FEATURE_SUBSIDIARY == 'T') {
          filters.push("AND", ["custrecord_lmry_ntax_subsidiary", "anyof", subsidiary]);
        }


        var ntSearch = search.create({
          type: "customrecord_lmry_national_taxes",
          filters: filters,
          columns: ["internalid", "custrecord_lmry_ntax_sub_type", search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
            label: "Name"
          })]
        });

        var results = ntSearch.run().getRange(0, 1000);

        if (results && results.length) {
          for (var i = 0; i < results.length; i++) {
            var id = results[i].getValue("internalid");
            var name = results[i].getValue("name");
            var subType = results[i].getValue("custrecord_lmry_ntax_sub_type");
            if (id && name && subType) {
              if (subType == 20 || subType == 84) {
                reteCreeNts.push({ id: id, name: name });
              }

              if (subType == 85 || subType == 21) {
                reteFteNts.push({ id: id, name: name });
              }

              if (subType == 83 || subType == 19) {
                reteIcaNts.push({ id: id, name: name });
              }

              if (subType == 82 || subType == 18) {
                reteIvaNts.push({ id: id, name: name });
              }
            }
          }
        }

        //----ITEMS----
        if (typeTransaction == 'invoice' || typeTransaction == 'creditmemo' || typeTransaction == 'vendorbill' || typeTransaction == 'vendorcredit') {
          var itemSublist = formObj.getSublist({
            id: 'item'
          });

          //RETECREE
          var itemFieldCREE = itemSublist.getField({
            id: 'custcol_lmry_co_autoretecree'
          });

          if (itemFieldCREE) {
            itemFieldCREE.updateDisplayType({
              displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var custpage_lmry_co_autoretecree = itemSublist.addField({
              id: 'custpage_lmry_co_autoretecree',
              type: serverWidget.FieldType.SELECT,
              label: 'Latam - CO ReteCREE detail'
            });
            custpage_lmry_co_autoretecree.addSelectOption({
              value: '',
              text: '&nbsp;'
            });
            if (reteCreeNts.length > 0) {
              for (var i = 0; i < reteCreeNts.length; i++) {
                var retecreeID = reteCreeNts[i].id;;
                var retecreeName = reteCreeNts[i].name;
                custpage_lmry_co_autoretecree.addSelectOption({
                  value: retecreeID,
                  text: retecreeName
                });
              }
            }
          }

          //RETEFTE
          var itemFieldFTE = itemSublist.getField({
            id: 'custcol_lmry_co_retefte'
          });
          if (itemFieldFTE) {
            itemFieldFTE.updateDisplayType({
              displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var custpage_lmry_co_retefte = itemSublist.addField({
              id: 'custpage_lmry_co_retefte',
              type: serverWidget.FieldType.SELECT,
              label: 'Latam - CO ReteFte detail'
            });
            custpage_lmry_co_retefte.addSelectOption({
              value: '',
              text: '&nbsp;'
            });
            if (reteFteNts.length > 0) {
              for (var i = 0; i < reteFteNts.length; i++) {
                var retefteID = reteFteNts[i].id;
                var retefteName = reteFteNts[i].name;
                custpage_lmry_co_retefte.addSelectOption({
                  value: retefteID,
                  text: retefteName
                });
              }
            }
          }

          //RETEICA
          var itemFieldICA = itemSublist.getField({
            id: 'custcol_lmry_co_reteica'
          });
          if (itemFieldICA) {
            itemFieldICA.updateDisplayType({
              displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var custpage_lmry_co_reteica = itemSublist.addField({
              id: 'custpage_lmry_co_reteica',
              type: serverWidget.FieldType.SELECT,
              label: 'Latam - CO ReteICA detail'
            });
            custpage_lmry_co_reteica.addSelectOption({
              value: '',
              text: '&nbsp;'
            });
            if (reteIcaNts.length > 0) {
              for (var i = 0; i < reteIcaNts.length; i++) {
                var reteicaID = reteIcaNts[i].id;
                var reteicaName = reteIcaNts[i].name;
                custpage_lmry_co_reteica.addSelectOption({
                  value: reteicaID,
                  text: reteicaName
                });
              }
            }
          }

          //RETEIVA
          var itemFieldIVA = itemSublist.getField({
            id: 'custcol_lmry_co_reteiva'
          });

          if (itemFieldIVA) {
            itemFieldIVA.updateDisplayType({
              displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var custpage_lmry_co_reteiva = itemSublist.addField({
              id: 'custpage_lmry_co_reteiva',
              type: serverWidget.FieldType.SELECT,
              label: 'Latam - CO ReteIVA detail'
            });
            custpage_lmry_co_reteiva.addSelectOption({
              value: '',
              text: '&nbsp;'
            });
            if (reteIvaNts.length > 0) {
              for (var i = 0; i < reteIvaNts.length; i++) {
                var reteivaID = reteIvaNts[i].id;
                var reteivaName = reteIvaNts[i].name;
                custpage_lmry_co_reteiva.addSelectOption({
                  value: reteivaID,
                  text: reteivaName
                });
              }
            }
          }
          //Llenar campos custpage si existen campo lleno de wht details
          if (type == "create" || type == 'edit' || type == 'copy') {
            var numItems = recordObj.getLineCount({
              sublistId: 'item'
            });

            for (var i = 0; i < numItems; i++) {
              var colReteCree = recordObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_co_autoretecree',
                line: i
              });

              if (colReteCree) {
                itemSublist.setSublistValue({
                  id: 'custpage_lmry_co_autoretecree',
                  line: i,
                  value: colReteCree
                });
              }


              var colReteFte = recordObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_co_retefte',
                line: i
              });

              if (colReteFte) {

                itemSublist.setSublistValue({
                  id: 'custpage_lmry_co_retefte',
                  line: i,
                  value: colReteFte
                });
              }

              var colReteIca = recordObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_co_reteica',
                line: i
              });

              if (colReteIca) {

                itemSublist.setSublistValue({
                  id: 'custpage_lmry_co_reteica',
                  line: i,
                  value: colReteIca
                });
              }


              var colReteIva = recordObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_lmry_co_reteiva',
                line: i
              });

              if (colReteIva) {

                itemSublist.setSublistValue({
                  id: 'custpage_lmry_co_reteiva',
                  line: i,
                  value: colReteIva
                });
              }

            }
          }
        }
        //----EXPENSES----
        if (typeTransaction == 'vendorbill' || typeTransaction == 'vendorcredit') {
          var expenseSublist = formObj.getSublist({
            id: 'expense'
          });

          //RETECREE
          var expenseFieldCREE = expenseSublist.getField({
            id: 'custcol_lmry_co_autoretecree'
          });

          if (expenseFieldCREE) {
            expenseFieldCREE.updateDisplayType({
              displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            var custpage_lmry_co_retecree_exp = expenseSublist.addField({
              id: 'custpage_lmry_co_retecree_exp',
              type: serverWidget.FieldType.SELECT,
              label: 'Latam - CO ReteCREE detail'
            });

            custpage_lmry_co_retecree_exp.addSelectOption({
              value: '',
              text: '&nbsp;'
            });
            if (reteCreeNts.length > 0) {
              for (var i = 0; i < reteCreeNts.length; i++) {
                var retecreeExpID = reteCreeNts[i].id;
                var retecreeExpName = reteCreeNts[i].name;
                custpage_lmry_co_retecree_exp.addSelectOption({
                  value: retecreeExpID,
                  text: retecreeExpName
                });
              }
            }
          }

          //RETEFTE
          var expenseFieldFTE = expenseSublist.getField({
            id: 'custcol_lmry_co_retefte'
          });
          if (expenseFieldFTE) {
            expenseFieldFTE.updateDisplayType({
              displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var custpage_lmry_co_retefte_exp = expenseSublist.addField({
              id: 'custpage_lmry_co_retefte_exp',
              type: serverWidget.FieldType.SELECT,
              label: 'Latam - CO ReteFte detail'
            });
            custpage_lmry_co_retefte_exp.addSelectOption({
              value: '',
              text: '&nbsp;'
            });
            if (reteFteNts.length > 0) {
              for (var i = 0; i < reteFteNts.length; i++) {
                var retefteExpID = reteFteNts[i].id;
                var retefteExpName = reteFteNts[i].name;
                custpage_lmry_co_retefte_exp.addSelectOption({
                  value: retefteExpID,
                  text: retefteExpName
                });
              }
            }
          }

          //RETEICA
          var expenseFieldICA = expenseSublist.getField({
            id: 'custcol_lmry_co_reteica'
          });
          if (expenseFieldICA) {
            expenseFieldICA.updateDisplayType({
              displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var custpage_lmry_co_reteica_exp = expenseSublist.addField({
              id: 'custpage_lmry_co_reteica_exp',
              type: serverWidget.FieldType.SELECT,
              label: 'Latam - CO ReteICA detail'
            });
            custpage_lmry_co_reteica_exp.addSelectOption({
              value: '',
              text: '&nbsp;'
            });
            if (reteIcaNts.length > 0) {
              for (var i = 0; i < reteIcaNts.length; i++) {
                var reteicaExpID = reteIcaNts[i].id;
                var reteicaExpName = reteIcaNts[i].name;
                custpage_lmry_co_reteica_exp.addSelectOption({
                  value: reteicaExpID,
                  text: reteicaExpName
                });
              }
            }
          }

          //RETEIVA
          var expenseFieldIVA = expenseSublist.getField({
            id: 'custcol_lmry_co_reteiva'
          });
          if (expenseFieldIVA) {
            expenseFieldIVA.updateDisplayType({
              displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var custpage_lmry_co_reteiva_exp = expenseSublist.addField({
              id: 'custpage_lmry_co_reteiva_exp',
              type: serverWidget.FieldType.SELECT,
              label: 'Latam - CO ReteIVA detail'
            });
            custpage_lmry_co_reteiva_exp.addSelectOption({
              value: '',
              text: '&nbsp;'
            });
            if (reteIvaNts.length > 0) {
              for (var i = 0; i < reteIvaNts.length; i++) {
                var reteivaExpID = reteIvaNts[i].id;
                var reteivaExpName = reteIvaNts[i].name;
                custpage_lmry_co_reteiva_exp.addSelectOption({
                  value: reteivaExpID,
                  text: reteivaExpName
                });
              }
            }
          }

          if (type == "create" || type == 'edit' || type == 'copy') {
            var numExpenses = recordObj.getLineCount({
              sublistId: 'expense'
            });

            for (var i = 0; i < numExpenses; i++) {
              var expReteCree = recordObj.getSublistValue({
                sublistId: 'expense',
                fieldId: 'custcol_lmry_co_autoretecree',
                line: i
              });
              if (expReteCree) {
                expenseSublist.setSublistValue({
                  id: 'custpage_lmry_co_retecree_exp',
                  line: i,
                  value: expReteCree
                });
              }

              var expReteFte = recordObj.getSublistValue({
                sublistId: 'expense',
                fieldId: 'custcol_lmry_co_retefte',
                line: i
              });
              if (expReteFte) {
                expenseSublist.setSublistValue({
                  id: 'custpage_lmry_co_retefte_exp',
                  line: i,
                  value: expReteFte
                });
              }

              var expReteIca = recordObj.getSublistValue({
                sublistId: 'expense',
                fieldId: 'custcol_lmry_co_reteica',
                line: i
              });
              if (expReteIca) {
                expenseSublist.setSublistValue({
                  id: 'custpage_lmry_co_reteica_exp',
                  line: i,
                  value: expReteIca
                });
              }

              var expReteIva = recordObj.getSublistValue({
                sublistId: 'expense',
                fieldId: 'custcol_lmry_co_reteiva',
                line: i
              });
              if (expReteIva) {
                expenseSublist.setSublistValue({
                  id: 'custpage_lmry_co_reteiva_exp',
                  line: i,
                  value: expReteIva
                });
              }
            }
          }
        }

      } catch (error) {
        log.error('createCOLineFieldsWHT', error);
        libLog.doLog("[createCOLineFieldsWHT]", error);
      }
    }

    function setCOLineValueWTH(recordObj) {
      try {
        var typeTransaction = recordObj.type;

        if (typeTransaction == 'invoice' || typeTransaction == 'creditmemo' || typeTransaction == 'vendorbill' || typeTransaction == 'vendorcredit') {
          var numItems = recordObj.getLineCount({
            sublistId: 'item'
          });
          for (var i = 0; i < numItems; i++) {
            var custpageReteCree = recordObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'custpage_lmry_co_autoretecree',
              line: i
            }) || "";
            recordObj.setSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_lmry_co_autoretecree',
              line: i,
              value: custpageReteCree
            });

            var custpageReteFte = recordObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'custpage_lmry_co_retefte',
              line: i
            }) || "";
            recordObj.setSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_lmry_co_retefte',
              line: i,
              value: custpageReteFte
            });

            var custpageReteIca = recordObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'custpage_lmry_co_reteica',
              line: i
            }) || "";
            recordObj.setSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_lmry_co_reteica',
              line: i,
              value: custpageReteIca
            });

            var custpageReteIva = recordObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'custpage_lmry_co_reteiva',
              line: i
            }) || "";
            recordObj.setSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_lmry_co_reteiva',
              line: i,
              value: custpageReteIva
            });
          }
        }

        if (typeTransaction == 'vendorbill' || typeTransaction == 'vendorcredit') {
          var numExpenses = recordObj.getLineCount({
            sublistId: 'expense'
          });
          for (var i = 0; i < numExpenses; i++) {
            var custpageReteCreeExp = recordObj.getSublistValue({
              sublistId: 'expense',
              fieldId: 'custpage_lmry_co_retecree_exp',
              line: i
            }) || "";
            recordObj.setSublistValue({
              sublistId: 'expense',
              fieldId: 'custcol_lmry_co_autoretecree',
              line: i,
              value: custpageReteCreeExp
            });

            var custpageReteFteExp = recordObj.getSublistValue({
              sublistId: 'expense',
              fieldId: 'custpage_lmry_co_retefte_exp',
              line: i
            }) || "";
            recordObj.setSublistValue({
              sublistId: 'expense',
              fieldId: 'custcol_lmry_co_retefte',
              line: i,
              value: custpageReteFteExp
            });

            var custpageReteIcaExp = recordObj.getSublistValue({
              sublistId: 'expense',
              fieldId: 'custpage_lmry_co_reteica_exp',
              line: i
            }) || "";
            recordObj.setSublistValue({
              sublistId: 'expense',
              fieldId: 'custcol_lmry_co_reteica',
              line: i,
              value: custpageReteIcaExp
            });

            var custpageReteIvaExp = recordObj.getSublistValue({
              sublistId: 'expense',
              fieldId: 'custpage_lmry_co_reteiva_exp',
              line: i
            }) || "";
            recordObj.setSublistValue({
              sublistId: 'expense',
              fieldId: 'custcol_lmry_co_reteiva',
              line: i,
              value: custpageReteIvaExp
            });
          }
        }

      } catch (error) {
        log.error('setCOLineValueWTH', error);
        libLog.doLog("[setCOLineValueWTH]", error);
      }
    }

    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    };
  });
/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_VendorCreditURET_V2.0.js                    ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jun 14 2018  LatamReady    User Event 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/ui/serverWidget', 'N/search', 'N/runtime', 'N/log', 'N/config', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_libWhtValidationLBRY_V2.0',
    './Latam_Library/LMRY_libDIOTLBRY_V2.0', './Latam_Library/LMRY_GLImpact_LBRY_V2.0',
    './WTH_Library/LMRY_TAX_TransactionLBRY_V2.0', './WTH_Library/LMRY_New_Country_WHT_Lines_LBRY',
    './Latam_Library/LMRY_HideView3LBRY_V2.0', './Latam_Library/LMRY_ExchangeRate_LBRY_V2.0',
    './Latam_Library/LMRY_MX_STE_Purchases_Tax_Transaction_LBRY_V2.0', './Latam_Library/LMRY_MX_ST_DIOT_LBRY_V2.0',
    './WTH_Library/LMRY_EC_BaseAmounts_TaxCode_LBRY', './Latam_Library/LMRY_BR_ValidateDuplicate_LBRY_V2.0',
    './Latam_Library/LMRY_CO_STE_Purchase_Tax_Transaction_LBRY_V2.0', './WTH_Library/LMRY_CO_STE_WHT_Total_LBRY_V2.0', './Latam_Library/LMRY_TranID_CSV_LBRY_V2.0',
    './Latam_Library/LMRY_AR_ST_Purchase_Tax_Transaction_LBRY_V2.0', './Latam_Library/LMRY_AR_ST_Purchases_Perception_LBRY_V2.0',
    './Latam_Library/LMRY_AR_ST_WHT_TransactionFields_LBRY_V2.0', './Latam_Library/LMRY_ValidateClosePeriod_LBRY_V2.0', './WTH_Library/LMRY_UY_WHT_Total_LBRY_V2.0.js',
    './WTH_Library/LMRY_CO_STE_BillCredit_WHT_Lines_LBRY_V2.0', 'N/error', './Latam_Library/LMRY_UniversalSetting_Purchase_LBRY',
    './Latam_Library/LMRY_CL_ST_Purchases_Tax_Transaction_LBRY_V2.0', './Latam_Library/LMRY_CL_ST_Purchases_WHT_Transaction_LBRY_V2.0', './Latam_Library/LMRY_MX_LatamTax_Purchase_LBRY_V2.0',
    './Latam_Library/LMRY_PA_ST_Purchases_Tax_Transaction_LBRY_V2.0', './WTH_Library/LMRY_TransferIva_LBRY', './Latam_Library/LMRY_MX_Withholding_Purchase_LBRY_V2.0',
    './WTH_Library/LMRY_BO_Taxes_LBRY_V2.0', './WTH_Library/LMRY_MX_STE_BillCredit_WHT_Total_LBRY_V2.0', './Latam_Library/LMRY_PE_STE_Purchases_Tax_Transaction_LBRY_V2.0', './Latam_Library/LMRY_MX_CREATE_JsonTaxResult_LBRY_V2.0',
    './WTH_Library/LMRY_CR_STE_WhtTransactionOnPurchaseByTotal_LBRY_V2.0', './Latam_Library/LMRY_BO_libWhtLines_LMRY_V2.0', './Latam_Library/LMRY_Custom_ExchangeRate_Field_LBRY_V2.0.js'
  ],

  function(record, serverWidget, search, runtime, log, config, library, library1, libraryDIOT,
    libraryGLImpact, Library_WHT_Transaction, libWHTLines, library_hideview3, library_ExchRate,
    MX_ST_TaxLibrary, ST_Library_DIOT, libraryEcBaseAmounts, Library_BRDup, CO_STE_TaxLibrary,
    CO_STE_WhtLibrary_Total, libraryTranIdCSV, AR_ST_TaxLibrary, AR_ST_Perception, AR_ST_TransFields, LibraryValidatePeriod, library_UY_Retencion,
    CO_STE_WhtLibrary_Lines, errorAPI, library_Uni_Setting, CL_ST_TaxLibrary, CL_ST_WhtLibrary_Total, MX_TaxLibrary, PA_ST_TaxLibrary, libraryTransferIva, MX_WhtLibrary, libBoTaxes,
    MX_STE_WhtLibrary_Total, PE_STE_TaxLibrary, libraryMxJsonResult, CR_STE_WhtLibrary_Total, BO_libWHTLines, Library_ExchangeRate_Field) {

    var LMRY_script = 'LatamReady - Vendor Credit URET V2.0';
    var type = '';
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
          feature: "tax_overhauling"
        });

        var type_interface = runtime.executionContext;
        if (type_interface == 'MAPREDUCE') {
          return true;
        }

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

        //Carga el Array de licencias
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
          try {
            if (subsidiary == '' || subsidiary == null || subsidiary === undefined) {
              var userS = runtime.getCurrentUser();
              subsidiary = userS.subsidiary;
            }

            if (subsidiary != '' && subsidiary != null && subsidiary !== undefined) {
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

            //Se obtiene el feature de General Preferencpara saber si se debe de ocultar
            //Las columnas, los Cust Bodys y las Sublist.
            var hide_transaction = library.getHideView(country, 2, licenses);
            var hide_sublist = library.getHideView(country, 5, licenses);
            var hide_column = library.getHideView(country, 3, licenses);

            //Nombre de la transaccion
            var typeCreate = recordObj.type;

            //Proceso para hacer HideView para el create
            //getCountryOfAccess Verifica si el feature localizacion de LatamReady Feature está activado.
            if (library.getCountryOfAccess(country, licenses)) {
              if (hide_column == true) {
                //Oculta los campos Column
                library_hideview3.PxHideColumn(form, country[0], typeCreate);
              }

              if (hide_sublist == true) {
                //Oculta los campos Cust Record
                library_hideview3.PxHideSubTab(form, country[0], typeCreate);
              }

              if (hide_transaction == true) {
                //Oculta los campos Body
                library_hideview3.PxHide(form, country[0], typeCreate);
              }
              //Si no está activado se mostrara los campos globales.
            } else {
              if (hide_column == true) {
                //Oculta los campos Column
                library_hideview3.PxHideColumn(form, '', typeCreate);
              }

              if (hide_sublist == true) {
                //Oculta los campos Cust Record
                library_hideview3.PxHideSubTab(form, '', typeCreate);
              }

              if (hide_transaction == true) {
                //Oculta los campos Body
                library_hideview3.PxHide(form, '', typeCreate);
              }
            }

          }
        }

        /* * * * * * * * * * * * * * * * * * * * * * * * * * *
         * Fecha : 21 de abril de 2020
         * Se agrego que todas las validacion de localizacion
         * esten dentro de la condicional :
         *    if (type != 'print' && type != 'email')
         * * * * * * * * * * * * * * * * * * * * * * * * * * */
        if (type != 'print' && type != 'email') {

          var LMRY_Result = ValidateAccess(subsidiary, form, recordObj);



          if (ST_FEATURE == true || ST_FEATURE == "T") {

            if (['create', 'edit', 'copy', 'view'].indexOf(type) != -1) {
              switch (LMRY_Result[0]) {
                case "MX":
                  if (library.getAuthorization(671, licenses) == true) {
                    MX_ST_TaxLibrary.setupFields(context);
                  }
                  break;
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
                  if (library.getAuthorization(671, licenses) == true) {
                    MX_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                  }
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
                    if (library.getAuthorization(671, licenses) == true) {
                      MX_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                    }
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

          }

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

          // Solo if (type == 'view')
          if (type == 'view') {
            if (LMRY_Result[0] == 'PE') {
              if (library.getAuthorization(1, licenses) == true) {
                // Tipo de Transaccion
                var Field = recordObj.getField({
                  fieldId: 'custbody_lmry_transaction_type_doc'
                });
                if (Field != null && Field != '') {
                  Field.isDisplay = true;
                }

                // Solo localizaciones Peruanas
                var value = recordObj.getValue({
                  fieldId: 'custbody_lmry_transaction_type_doc'
                });

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
                var hidefieldsSearch = search.create({
                  type: 'customrecord_lmry_transaction_fields',
                  columns: ['custrecord_lmry_id_fields'],
                  filters: filters
                });
                var hidefields = hidefieldsSearch.run().getRange(0, 1000);

                if (hidefields != null && hidefields != '') {
                  for (var i = 0; i < hidefields.length; i++) {
                    var namefield = hidefields[i].getText('custrecord_lmry_id_fields');
                    if (namefield != '' && namefield != null) {
                      var Field = recordObj.getField({
                        fieldId: namefield
                      });
                      if (Field != null && Field != '') {
                        Field.isDisplay = true;
                      }
                    }
                  }
                  var Field = recordObj.getField({
                    fieldId: 'custbody_lmry_transaction_type_doc'
                  });
                  if (Field != null && Field != '') {
                    Field.isDisplay = true;
                  }
                }
              }
            }

            if (LMRY_Result[0] == 'CO' && library.getAuthorization(720, licenses)) {
              createCoButtonUpDateWhx(context);
            }

            // Logica GL Impact
            var featurelang = runtime.isFeatureInEffect({
              feature: 'LANGUAGE'
            });
            var btnGl = libraryGLImpact.featureGLImpact(recordObj, 'vendorcredit');
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
            var featPrintglSumm = library.getAuthorization(811, licenses)
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

          } // Fin Lógica GL Impact

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
          // Solo if (type == 'edit')
          if (type == 'edit') {
            var country = recordObj.getValue({
              fieldId: 'custbody_lmry_subsidiary_country'
            });
            if (country == '') {
              var Field = recordObj.getField({
                fieldId: 'custbody_lmry_subsidiary_country'
              });
              if (Field != null && Field != '') {
                Field.isDisabled = false;
              }
            }
          } // Fin if (type == 'edit')

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

          if (type == 'copy' || type == 'xcopy') {
            Library_WHT_Transaction.cleanLinesforCopy(recordObj, licenses);
          }

          if (type == 'create') {
            var createdFrom = recordObj.getValue({
              fieldId: 'createdfrom'
            });

            //Si el bill credit es creado desde un Bill
            if (createdFrom) {
              Library_WHT_Transaction.cleanLinesforCopy(recordObj, licenses);
            }
          }

          //SETEO DEL CUSTBODY LATAMREADY - BR TRANSACTION TYPE PARA FILTRAR LA COLUMNA CFOP
          if (LMRY_Result[0] == 'BR' && LMRY_Result[2] == true && (type == 'create' || type == 'edit' || type == 'copy')) {
            var transactionType = recordObj.getValue('custbody_lmry_br_transaction_type');
            var createdFrom = recordObj.getValue('createdfrom');
            if (transactionType == '' || transactionType == null || (createdFrom != '' && createdFrom != null)) {
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

                  recordObj.setValue({
                    fieldId: 'custbody_lmry_br_transaction_type',
                    value: resultTransactionType[0].getValue('internalid')
                  });

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
            var createdFrom = recordObj.getValue('createdfrom');
            if (transactionType == '' || transactionType == null || (createdFrom != '' && createdFrom != null)) {
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

        } // Fin if (type != 'print' && type != 'email')

        //LATAM - TAX RULE - RETENCION URUGUAY // si es retencion no se muestra el  campo
        var memo = recordObj.getValue({
          fieldId: 'memo'
        });
        if ((type == 'create' || type == 'edit' || type == 'copy' || type == 'view') && LMRY_Result[0] == 'UY' && memo != 'UY Retencion - Purchase') {
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
            });
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
              });
              taxSelect.defaultValue = tax_rule_item;
            }
          }
          var taxRule = recordObj.getValue('custpage_tax_rule');
          log.error('taxRule beforeload', taxRule);
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
        //FIN LATAM - TAX RULE - RETENCION Totales Mexico

        var createFrom = recordObj.getValue({
          fieldId: "createdfrom"
        });

        if (type == "create" && createFrom && LMRY_Result[0] == "BO" && library.getAuthorization(828, licenses)) {
          libBoTaxes.resetLines(recordObj);
        }

        if (type == "copy" && LMRY_Result[0] == "MX" && library.getAuthorization(671, licenses) && (ST_FEATURE == false || ST_FEATURE == "F")) {
          MX_TaxLibrary.resetLines(recordObj);
        }

      } catch (err) {
        recordObj = context.newRecord;
        library.sendemail2(' [ BeforeLoad ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }

    }


    function beforeSubmit(context) {

      try {
        
        ST_FEATURE = runtime.isFeatureInEffect({
          feature: "tax_overhauling"
        });

        var typeInterfaces = runtime.executionContext;
        recordObj = context.newRecord;
        type = context.type;
        var LMRY_Intern = recordObj.id;
        var form = context.form;

        var subsidiary = recordObj.getValue({
          fieldId: 'subsidiary'
        });

        licenses = library.getLicenses(subsidiary);
        var LMRY_Result = ValidateAccess(subsidiary, form, recordObj);

        //Electronic Invoicing - AUTOMATIC SETTING AFTER SAVING
        var featuresAfterSavingByCountry = {
          "AR": 1008,
          "BR": 1009,
          "CL": 1010,
          "CO": 1011,
          "CR": 1012,
          "EC": 1013,
          "GT": 1014,
          "MX": 1015,
          "PA": 1016,
          "PY": 1017,
          "PE": 1018,
          "UY": 1019,
          "DO": 1020,
          "BO": 1021
        };

        var featureAfterSaving = false;
        if (featuresAfterSavingByCountry.hasOwnProperty(LMRY_Result[0])) {
          featureAfterSaving = library.getAuthorization(featuresAfterSavingByCountry[LMRY_Result[0]], licenses);
        }

        /* Validacion 04/02/22 */
        // Libreria - Valida Periodo cerrado
        if (LibraryValidatePeriod.validatePeriod(recordObj.getValue('postingperiod'), licenses, LMRY_Result[0], 'purchase')) return true;
        /* Fin validacion 04/02/22 */

        //Nueva logica Country WHT Lineas
        libWHTLines.beforeSubmitTransaction(context, licenses);

        //Logica de Tipo de Cambio Automatico
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
            require(["./Latam_Library/LMRY_KofaxIntegrations_LBRY_V2.0", './Latam_Library/LMRY_TranID_CSV_LBRY_V2.0.js'],
              function(kofaxModule, csvModule) {
                if (type == 'create') {
                  kofaxModule.SetCustomField_WHT_Code_VC(recordObj, LMRY_Result, licenses);
                }        
                //recordObj.setValue("custbody_lmry_apply_wht_code", true);
                if (featureExecuteIntegration == 'F' || featureExecuteIntegration == false) {
                  csvModule.generateTranID(recordObj, LMRY_Result[0], licenses);
                }
              });
          }
        }

        // Nueva logica de colombia
        switch (LMRY_Result[0]) {
          case 'AR':
            if (library.getAuthorization(200, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
          case 'BO':
            if (library.getAuthorization(152, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
            /*case 'BR':
              if (library.getAuthorization(147, licenses)) == true) {
                Library_WHT_Transaction.beforeSubmitTransaction(context);
              }
              break;*/
          case 'CL':
            if (library.getAuthorization(201, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
          case 'CO':
            if (library.getAuthorization(150, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
          case 'CR':
            if (library.getAuthorization(203, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
            // case 'EC':
            //   if (library.getAuthorization(153, licenses) == true) {
            //     Library_WHT_Transaction.beforeSubmitTransaction(context);
            //   }
            //   break;
          case 'SV':
            if (library.getAuthorization(205, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
          case 'GT':
            if (library.getAuthorization(207, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
          case 'MX':
            if (library.getAuthorization(209, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
          case 'PA':
            if (library.getAuthorization(211, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
          case 'PY':
            if (library.getAuthorization(213, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
          case 'PE':
            if (library.getAuthorization(214, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
          case 'UY':
            if (library.getAuthorization(216, licenses) == true) {
              Library_WHT_Transaction.beforeSubmitTransaction(context);
            }
            break;
        }

        if (LMRY_Result[0] == "BR") {
          if (["create", "edit", "copy"].indexOf(context.type) != -1) {
            if (context.type == 'edit') {
              cleanLinesforCopy(recordObj);
            }
          }
        }

        if (LMRY_Result[0] == "MX" && library.getAuthorization(671, licenses) && context.type == 'delete' && (ST_FEATURE == false || ST_FEATURE == "F")) {
          libraryMxJsonResult._inactiveTaxResult(recordObj.id, taxType = 4)
        }
        
        /* Validacion 05/04/22 */
        //Universal Setting se realiza solo al momento de crear
        if (type == 'create' && (typeInterfaces == 'USERINTERFACE' || typeInterfaces == 'USEREVENT' || typeInterfaces == 'CSVIMPORT') && (ST_FEATURE == false || ST_FEATURE == "F")) {
          var type_document = recordObj.getValue('custbody_lmry_document_type');
          if (library_Uni_Setting.auto_universal_setting_purchase(licenses, false)) {
            //Solo si el campo LATAM - LEGAL DOCUMENT TYPE se encuentra vacío
            if (typeInterfaces == 'USERINTERFACE') {
              
              if (recordObj.getValue('custpage_uni_set_status') == 'F' && (type_document == '' || type_document == null)) {
                //Seteo campos cabecera, numero pre impreso y template
                if (featureAfterSaving == true || featureAfterSaving == 'T') {
                  library_Uni_Setting.automatic_setfield_purchase(recordObj, true);
                } else{
                  library_Uni_Setting.automatic_setfield_purchase(recordObj, false);
                  library_Uni_Setting.set_preimpreso_purchase(recordObj, LMRY_Result, licenses);
                }
                
                library_Uni_Setting.setear_datos_bill(recordObj);
                library_Uni_Setting.set_template_purchase(recordObj, licenses);
                recordObj.setValue('custpage_uni_set_status', 'T');
              }
            } else if (typeInterfaces == 'CSVIMPORT' || typeInterfaces == 'USEREVENT') {
              
              var check_csv = recordObj.getValue('custbody_lmry_scheduled_process');
              //Check box para controlar el seteo automático en el record anexado
              if ((check_csv == false || check_csv == 'F') && (type_document == '' || type_document == null)) {
                //Seteo campos cabecera, numero pre impreso y template
              
                if (featureAfterSaving == true || featureAfterSaving == 'T') {
                  library_Uni_Setting.automatic_setfield_purchase(recordObj, true);
                } else{
                  library_Uni_Setting.automatic_setfield_purchase(recordObj, false);
                  library_Uni_Setting.set_preimpreso_purchase(recordObj, LMRY_Result, licenses);
                }
                library_Uni_Setting.setear_datos_bill(recordObj);
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
        /* Fin validacion 05/04/22 */
        if (type == "delete") {
          if (ST_FEATURE == true || ST_FEATURE == "T") {
            switch (LMRY_Result[0]) {
              case "MX":
                if (library.getAuthorization(671, licenses) == true) {
                  MX_ST_TaxLibrary.deleteRelatedRecords(LMRY_Intern);
                }
                if (library.getAuthorization(958, licenses) == true) {
                  MX_STE_WhtLibrary_Total.deleteRelatedRecords(LMRY_Intern);
                }
                break;
              case "CO":
                if (library.getAuthorization(643, licenses) == true) {
                  CO_STE_TaxLibrary.deleteRelatedRecords(LMRY_Intern);
                }
                if (library.getAuthorization(340, licenses) == true) {
                  CO_STE_WhtLibrary_Lines.deleteRelatedRecords(LMRY_Intern);
                }
                if (library.getAuthorization(27, licenses) == true) {
                  CO_STE_WhtLibrary_Total.deleteRelatedRecords(LMRY_Intern, "vendorcredit");
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
                  CR_STE_WhtLibrary_Total.deleteRelatedRecords(LMRY_Intern, "vendorcredit");
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

        var eventsEC = ['create', 'copy', 'edit'];
        if (eventsEC.indexOf(context.type) != -1) {

          if (LMRY_Result[0] == 'EC') {
            //SETEO DE CAMPOS BASE 0%, 12% Y 14%
            if (library.getAuthorization(42, licenses)) {
              libraryEcBaseAmounts.setBaseAmounts(recordObj, '1');
            }
          }

          /**
           * Code: C0583|C0592
           * Summary: Exclude subsidiary and vendor from the concatenation process or trigger the process
           * Date: 15/06/2022
           */

          var featureTranid = {
            'AR': {
              'validate': 505,
              'strict': 699,
              'exclude': 916
            },
            'CO': {
              'validate': 509,
              'strict': 697,
              'exclude': 917
            },
            'MX': {
              'validate': 514,
              'strict': 698,
              'exclude': 918
            }
          };
          if (typeInterfaces == 'CSVIMPORT') {
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
                }
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

          if (library.getAuthorization(27, licenses)) {
            library1.setFieldValues(recordObj);
          }
        }

        if (["create", "edit", "copy", "delete"].indexOf(context.type) != -1 && LMRY_Result[0] == "BO" && library.getAuthorization(828, licenses)) {

          if (context.type == "delete") {
            libBoTaxes.deleteTaxResults(recordObj);
          }

          if (["create", "edit", "copy"].indexOf(context.type) != -1) {
            libBoTaxes.setUndefTaxLines(recordObj);
          }
        }
      } catch (err) {
        recordObj = context.newRecord;
        library.sendemail2(' [ BeforeSubmit ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }

      if (switchThrow) {
        var language = (runtime.getCurrentScript().getParameter({
          name: 'LANGUAGE'
        })).substring(0, 2);
        throw errorAPI.create({
          name: msgThrow['msgName'],
          message: (msgThrow['msgError'][language] || msgThrow['msgError']['en'])
        })
      };
    }


    function afterSubmit(context) {
      try {
        
        ST_FEATURE = runtime.isFeatureInEffect({
          feature: "tax_overhauling"
        });

        recordObj = context.newRecord;
        type = context.type;
        var type_interface = runtime.executionContext;
        var form = context.form;
        var LMRY_Intern = recordObj.id;
        var subsidiary = recordObj.getValue({
          fieldId: 'subsidiary'
        });

        licenses = library.getLicenses(subsidiary);
        var LMRY_Result = ValidateAccess(subsidiary, form, recordObj);

        
        //Electronic Invoicing - AUTOMATIC SETTING AFTER SAVING
        var featuresAfterSavingByCountry = {
          "AR": 1008,
          "BR": 1009,
          "CL": 1010,
          "CO": 1011,
          "CR": 1012,
          "EC": 1013,
          "GT": 1014,
          "MX": 1015,
          "PA": 1016,
          "PY": 1017,
          "PE": 1018,
          "UY": 1019,
          "DO": 1020,
          "BO": 1021
        };

        var featureAfterSaving = false;
        if (featuresAfterSavingByCountry.hasOwnProperty(LMRY_Result[0])) {
          featureAfterSaving = library.getAuthorization(featuresAfterSavingByCountry[LMRY_Result[0]], licenses);
        }


        /* Validacion 04/02/22 */
        // Libreria - Valida Periodo cerrado
        if (LibraryValidatePeriod.validatePeriod(recordObj.getValue('postingperiod'), licenses, LMRY_Result[0], 'purchase')) return true;
        /* Fin validacion 04/02/22 */
        /* Validacion 05/04/22 */
        //Universal Setting se realiza solo al momento de crear
        if (type == 'create' && (type_interface == 'USERINTERFACE' || type_interface == 'USEREVENT' || type_interface == 'CSVIMPORT') && (ST_FEATURE == false || ST_FEATURE == "F")) {
          var type_document = recordObj.getValue('custbody_lmry_document_type');
          if (type_interface == 'USERINTERFACE') {
            //Mediante el custpage se conoce que el seteo de cabecera fue realizado por Universal Setting
            if (recordObj.getValue('custpage_uni_set_status') == 'T') {
              if (featureAfterSaving == true || featureAfterSaving == 'T') {
                if (type_document == '' || type_document == null) {
                  library_Uni_Setting.automaticSetfieldPurchaseDocument(recordObj);
                  library_Uni_Setting.set_preimpreso_purchase(recordObj, LMRY_Result, licenses,true);
                }          
              }
              //Seteo de campos perteneciente a record anexado
              library_Uni_Setting.automatic_setfieldrecord_purchase(recordObj);
            }
          } else if (type_interface == 'CSVIMPORT' || type_interface == 'USEREVENT') {
            //Mediante el siguiente campo se conoce si seteo de cabecera fue realizado por Universal Setting
            var check_csv = recordObj.getValue('custbody_lmry_scheduled_process');
            if (check_csv == 'T' || check_csv == true) {
              if (featureAfterSaving == true || featureAfterSaving == 'T') {
                if (type_document == '' || type_document == null) {
                  library_Uni_Setting.automaticSetfieldPurchaseDocument(recordObj);
                  library_Uni_Setting.set_preimpreso_purchase(recordObj, LMRY_Result, licenses,true);
                }          
              }
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
        /* Fin validacion 05/04/22 */
        if (type == 'delete') {
          // Para Colombia, Bolivia y Paraguay - Enabled Feature WHT Latam
          if (LMRY_Result[0] == 'CO') {
            if (library.getAuthorization(27, licenses)) {
              // Elimina registros
              library1.Delete_JE(LMRY_Intern);
              // Delete Credit Memo
              library1.Delete_CM('vendorbill', LMRY_Intern);
            }
          }
          if (LMRY_Result[0] == 'BO') {
            if (library.getAuthorization(46, licenses)) {
              // Elimina registros
              library1.Delete_JE(LMRY_Intern);
              // Delete Credit Memo
              library1.Delete_CM('vendorbill', LMRY_Intern);
            }
          }
          if (LMRY_Result[0] == 'PY') {
            if (library.getAuthorization(47, licenses)) {
              // Elimina registros
              library1.Delete_JE(LMRY_Intern);
              // Delete Credit Memo
              library1.Delete_CM('vendorbill', LMRY_Intern);
            }
          }
        }

        if (type == 'edit' && LMRY_Result[0] == 'BR' && library.getAuthorization(527, licenses)) {
          record.submitFields({
            type: 'vendorcredit',
            id: LMRY_Intern,
            values: {
              'custbody_lmry_scheduled_process': false,
            },
            options: {
              disableTriggers: true
            }
          });

          var TaxCalObj = search.create({
            type: 'customrecord_lmry_br_transaction',
            columns: ['internalid'],
            filters: [
              ['custrecord_lmry_total_item', 'is', 'Tax Calculator'], 'AND',
              ['custrecord_lmry_br_transaction', 'is', LMRY_Intern]
            ]
          });
          TaxCalObj = TaxCalObj.run().getRange(0, 1);

          if (TaxCalObj == null || TaxCalObj == '') {
            Library_WHT_Transaction.deleteTaxResults(recordObj);
          }

        }

        if (type == 'create' || type == 'edit' || type == 'copy') {

          var transactionType = 'vendorcredit';
          var mapreduceFlag = type_interface == 'MAPREDUCE';
          libWHTLines.newAfterSubmitTransaction(context, type, LMRY_Intern, transactionType, licenses, mapreduceFlag);

          if (ST_FEATURE == true || ST_FEATURE == "T") {

            var ST_RecordObj = record.load({
              type: "vendorcredit",
              id: recordObj.id
            });

            var ST_Context = {
              type: context.type,
              newRecord: ST_RecordObj
            };

            switch (LMRY_Result[0]) {

              case "MX":
                if (library.getAuthorization(671, licenses) == true) {
                  MX_ST_TaxLibrary.setTaxTransaction(context, licenses);
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
                  CO_STE_WhtLibrary_Lines.setWHTTransaction(context, licenses);
                }
                if (library.getAuthorization(27, licenses) == true) {
                  CO_STE_WhtLibrary_Total.setWHTTotalTransaction(context, licenses);
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
                // Creación del MX Transaction fields
                if (library.getAuthorization(243, licenses) == true && !library.getAuthorization(671, licenses) == true) {
                  libraryTransferIva.generateMXTransField(context);
                }
                break;
            }
          }

        }

        if (["create", "edit", "copy"].indexOf(type) != -1 && LMRY_Result[0] == 'BO' && library.getAuthorization(828, licenses)) {
          libBoTaxes.calculateBoTaxes(recordObj, type);
        }


        if (type == 'create' || type == 'edit') {
          if (type == 'create') {
            recordObj = record.load({
              type: recordObj.type,
              id: recordObj.id
            });
          }
          if (LMRY_Result[0] == 'MX') {
            if (library.getAuthorization(151, licenses) == true) {
              if (ST_FEATURE == true || ST_FEATURE == "T") {
                ST_Library_DIOT.CalculoDIOT(recordObj);
              } else {
                if (library.getAuthorization(671, licenses) == false) {
                  libraryDIOT.CalculoDIOT(recordObj);
                }
              }
            }
          }
          // Para Colombia, Bolivia y Paraguay - Enabled Feature WHT Latam
          if (LMRY_Result[0] == 'CO') {
            if (library.getAuthorization(27, licenses)) {
              // Realiza la redireccion de cuentas
              if (ST_FEATURE == false || ST_FEATURE == "F") {
                library1.Create_WHT_Latam('vendorcredit', LMRY_Intern, context);
              }
            }
          }
          if (LMRY_Result[0] == 'BO') {
            if (library.getAuthorization(46, licenses)) {
              // Realiza la redireccion de cuentas
              BO_libWHTLines.createWHTbyLines(LMRY_Intern, 'vendorcredit');
            }
          }
          if (LMRY_Result[0] == 'PY') {
            if (library.getAuthorization(47, licenses)) {
              // Realiza la redireccion de cuentas
              library1.Create_WHT_Latam('vendorcredit', LMRY_Intern);
            }
          }
        }

        // Nueva logica de colombia
        switch (LMRY_Result[0]) {
          case 'AR':
            if (library.getAuthorization(200, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
          case 'BO':
            if (library.getAuthorization(152, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
            /*case 'BR':
              if (library.getAuthorization(147, licenses) == true) {
                Library_WHT_Transaction.afterSubmitTransaction(context, true);
              }
              break;*/
          case 'CL':
            if (library.getAuthorization(201, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
          case 'CO':
            if (library.getAuthorization(150, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
          case 'CR':
            if (library.getAuthorization(203, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
            // case 'EC':
            //   if (library.getAuthorization(153, licenses) == true) {
            //     Library_WHT_Transaction.afterSubmitTransaction(context, true);
            //   }
            //   break;
          case 'SV':
            if (library.getAuthorization(205, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
          case 'GT':
            if (library.getAuthorization(207, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
          case 'MX':
            if (library.getAuthorization(209, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
          case 'PA':
            if (library.getAuthorization(211, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
          case 'PY':
            if (library.getAuthorization(213, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
          case 'PE':
            if (library.getAuthorization(214, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
          case 'UY':
            if (library.getAuthorization(216, licenses) == true) {
              Library_WHT_Transaction.afterSubmitTransaction(context, true);
            }
            break;
        }

        //Logica Percepcion Opus
        var arreglo_item = new Array();
        var arreglo_amount = new Array();
        var arreglo_class = new Array();
        var arreglo_location = new Array();
        var arreglo_department = new Array();

        if (type == 'create' || type == 'edit') {
          if (LMRY_Result[0] == 'AR' && library.getAuthorization(218, licenses)) {
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
            }

            var mirror_record = record.load({
              type: recordObj.type,
              id: recordObj.id,
              isDynamic: false
            });

            var search_opus = search.create({
              type: 'customrecord_lmry_percepcion_purchase',
              columns: ['custrecord_lmry_percepcion_item1',
                'custrecord_lmry_percepcion_item2', 'custrecord_lmry_percepcion_taxcode', 'custrecord_lmry_percepcion_subsidiary'
              ],
              filters: []
            });

            var result_opus = search_opus.run().getRange(0, 1000);

            if (result_opus != null && result_opus.length > 0) {
              for (var j = 0; j < arreglo_item.length; j++) {
                for (var k = 0; k < result_opus.length; k++) {
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

                    cantidad_items++;
                  }
                }

              }
            }

            mirror_record.save();

          }
        }


        if (type == 'create' || type == 'edit') {
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
        }

        if (LMRY_Result[0] == "BR") {
          if ('create' == type) {
            Library_BRDup.assignPreprinted(recordObj, licenses);
          }
        }

        //RETENCION POR CABECERA PARA URUGUAY
        var featWhtUy = library.getAuthorization(756, licenses);
        var applWTH = recordObj.getValue({
          fieldId: 'custbody_lmry_apply_wht_code'
        });
        if ((type == 'create' || type == 'edit' || type == 'copy') && LMRY_Result[0] == 'UY' && featWhtUy && (applWTH == 'T' || applWTH == true)) {
          // feature 756
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
        log.error("afterSubmit",err);
        recordObj = context.newRecord;
        library.sendemail2(' [ VCUret_AfterSubmit ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
    }

    /* ------------------------------------------------------------------------------------------------------
     * A la variable featureId se le asigna el valore que le corresponde
     * --------------------------------------------------------------------------------------------------- */
    function ValidateAccess(ID, form, recordObj) {
      var LMRY_access = false;
      var LMRY_countr = new Array();
      var LMRY_Result = new Array();
      //Nombre de la transaccion
      var typeAccess = recordObj.type;

      try {

        // Inicializa variables Locales y Globales
        var featureId = '0';
        LMRY_countr = library.Validate_Country(ID);

        // Verifica que el arreglo este lleno
        if (LMRY_countr.length < 1) {
          LMRY_Result[0] = '';
          LMRY_Result[1] = '-None-';
          LMRY_Result[2] = LMRY_access;
          return LMRY_Result;
        }

        LMRY_access = library.getCountryOfAccess(LMRY_countr, licenses);

        // Asigna Valores
        LMRY_Result[0] = LMRY_countr[0];
        LMRY_Result[1] = LMRY_countr[1];
        LMRY_Result[2] = LMRY_access;
      } catch (err) {
        library.sendemail2(' [ ValidateAccess ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }

      return LMRY_Result;
    }

    /* ------------------------------------------------------------------------------------------------------
     * Realiza la agrupacion de las lienas de la transacion segun la configuracion del registros
     * personalizado LatamReady - Setup Tax Code Group.
     * --------------------------------------------------------------------------------------------------- */
    function GroupLine(context, Record_ID) {
      try {
        // Registro Actualiza
        var recordObj = context.newRecord

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
            arr_DatCol["TaxAmoun"] = 0; // Amount
            arr_DatCol["TaxBase"] = ''; // Latam - Setup Amount To

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
            Record_TFS.save({
              ignoreMandatoryFields: true,
              disableTriggers: true,
              enableSourcing: true
            });
          } // Solo si se cargo Tax
        } // Solo si tiene Items
      } catch (errmsg) {
        recordObj = context.newRecord;
        library.sendemail2('[ afterSubmit - GroupLine ] ' + errmsg, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
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
        library.sendemail2('[ beforeSubmit - DeleteGroupLine ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
      return true;
    }

    function cleanLinesforCopy(RCD_TRANS) {
      try {
        var numLineas = RCD_TRANS.getLineCount({
          sublistId: 'item'
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
            RCD_TRANS.setSublistValue('item', 'tax1amt', i, 0);
            RCD_TRANS.setSublistValue('item', 'grossamt', i, round2(base_amount));
            RCD_TRANS.setSublistValue('item', 'custcol_lmry_br_base_amount', i, '');
            RCD_TRANS.setSublistValue('item', 'custcol_lmry_br_total_impuestos', i, '');
          }

        }

        //deleteTaxLines(RCD_TRANS);

      } catch (error) {
        log.error('[cleanLinesforCopy]', error);
      }
      return true;
    }

    function round2(num) {
      var e = (num > 0) ? 1e-6 : -1e-6;
      return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
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

    function createCOLineFieldsWHT(formObj, recordObj, type) {
        try {
          var FEATURE_SUBSIDIARY = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
          var subsidiary = recordObj.getValue('subsidiary');
          var typeTransaction = recordObj.type;
          var jsonTransaction = { invoice: '1', creditmemo: '8', vendorbill: '4', vendorcredit: '7' };
  
          //Búsqueda de National ReteCree
          var searchNTReteCree = search.create({
            type: "customrecord_lmry_national_taxes",
            filters:
              [
                ["isinactive", "is", "F"],
                "AND",
                ["custrecord_lmry_ntax_subsidiary_country", "anyof", "48"],
                "AND",
                ["custrecord_lmry_ntax_sub_type", "anyof", "20", "84"],
                "AND",
                ["custrecord_lmry_ntax_gen_transaction", "anyof", "5"],
                "AND",
                ["custrecord_lmry_ntax_taxtype", "anyof", "1"],
                "AND",
                ["custrecord_lmry_ntax_transactiontypes", "anyof", jsonTransaction[typeTransaction]]
              ],
            columns:
              [
                search.createColumn({ name: "internalid", label: "Internal ID" }),
                search.createColumn({
                  name: "name",
                  sort: search.Sort.ASC,
                  label: "Name"
                })
              ]
          });
          if (FEATURE_SUBSIDIARY == true || FEATURE_SUBSIDIARY == 'T') {
            searchNTReteCree.filters.push(search.createFilter({ name: 'custrecord_lmry_ntax_subsidiary', operator: 'anyof', values: subsidiary }));
          }
          var resultNTReteCree = searchNTReteCree.run().getRange(0, 1000);
  
          //Búsqueda de National ReteFte
          var searchNTReteFte = search.create({
            type: "customrecord_lmry_national_taxes",
            filters:
              [
                ["isinactive", "is", "F"],
                "AND",
                ["custrecord_lmry_ntax_subsidiary_country", "anyof", "48"],
                "AND",
                ["custrecord_lmry_ntax_sub_type", "anyof", "85", "21"],
                "AND",
                ["custrecord_lmry_ntax_gen_transaction", "anyof", "5"],
                "AND",
                ["custrecord_lmry_ntax_taxtype", "anyof", "1"],
                "AND",
                ["custrecord_lmry_ntax_transactiontypes", "anyof", jsonTransaction[typeTransaction]]
              ],
            columns:
              [
                search.createColumn({ name: "internalid", label: "Internal ID" }),
                search.createColumn({
                  name: "name",
                  sort: search.Sort.ASC,
                  label: "Name"
                })
              ]
          });
          if (FEATURE_SUBSIDIARY == true || FEATURE_SUBSIDIARY == 'T') {
            searchNTReteFte.filters.push(search.createFilter({ name: 'custrecord_lmry_ntax_subsidiary', operator: 'anyof', values: subsidiary }));
          }
          var resultNTReteFte = searchNTReteFte.run().getRange(0, 1000);
  
          //Búsqueda de National ReteIca
          var searchNTReteIca = search.create({
            type: "customrecord_lmry_national_taxes",
            filters:
              [
                ["isinactive", "is", "F"],
                "AND",
                ["custrecord_lmry_ntax_subsidiary_country", "anyof", "48"],
                "AND",
                ["custrecord_lmry_ntax_sub_type", "anyof", "83", "19"],
                "AND",
                ["custrecord_lmry_ntax_gen_transaction", "anyof", "5"],
                "AND",
                ["custrecord_lmry_ntax_taxtype", "anyof", "1"],
                "AND",
                ["custrecord_lmry_ntax_transactiontypes", "anyof", jsonTransaction[typeTransaction]]
              ],
            columns:
              [
                search.createColumn({ name: "internalid", label: "Internal ID" }),
                search.createColumn({
                  name: "name",
                  sort: search.Sort.ASC,
                  label: "Name"
                })
              ]
          });
          if (FEATURE_SUBSIDIARY == true || FEATURE_SUBSIDIARY == 'T') {
            searchNTReteIca.filters.push(search.createFilter({ name: 'custrecord_lmry_ntax_subsidiary', operator: 'anyof', values: subsidiary }));
          }
          var resultNTReteIca = searchNTReteIca.run().getRange(0, 1000);
  
          //Búsqueda de National ReteIva
          var searchNTReteIva = search.create({
            type: "customrecord_lmry_national_taxes",
            filters:
              [
                ["isinactive", "is", "F"],
                "AND",
                ["custrecord_lmry_ntax_subsidiary_country", "anyof", "48"],
                "AND",
                ["custrecord_lmry_ntax_sub_type", "anyof", "82", "18"],
                "AND",
                ["custrecord_lmry_ntax_gen_transaction", "anyof", "5"],
                "AND",
                ["custrecord_lmry_ntax_taxtype", "anyof", "1"],
                "AND",
                ["custrecord_lmry_ntax_transactiontypes", "anyof", jsonTransaction[typeTransaction]]
              ],
            columns:
              [
                search.createColumn({ name: "internalid", label: "Internal ID" }),
                search.createColumn({
                  name: "name",
                  sort: search.Sort.ASC,
                  label: "Name"
                })
              ]
          });
          if (FEATURE_SUBSIDIARY == true || FEATURE_SUBSIDIARY == 'T') {
            searchNTReteIva.filters.push(search.createFilter({ name: 'custrecord_lmry_ntax_subsidiary', operator: 'anyof', values: subsidiary }));
          }
          var resultNTReteIva = searchNTReteIva.run().getRange(0, 1000);
  
          //----ITEMS----
          if (typeTransaction == 'invoice' || typeTransaction == 'creditmemo' || typeTransaction == 'vendorbill' || typeTransaction == 'vendorcredit') {
            var itemSublist = formObj.getSublist({
              id: 'item'
            });
  
            //RETECREE
            var itemFieldCREE = itemSublist.getField({
              id: 'custcol_lmry_co_autoretecree'
            });
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
            if (resultNTReteCree.length > 0) {
              for (var i = 0; i < resultNTReteCree.length; i++) {
                var retecreeID = resultNTReteCree[i].getValue('internalid');
                var retecreeName = resultNTReteCree[i].getValue('name');
                custpage_lmry_co_autoretecree.addSelectOption({
                  value: retecreeID,
                  text: retecreeName
                });
              }
            }
  
            //RETEFTE
            var itemFieldFTE = itemSublist.getField({
              id: 'custcol_lmry_co_retefte'
            });
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
            if (resultNTReteFte.length > 0) {
              for (var i = 0; i < resultNTReteFte.length; i++) {
                var retefteID = resultNTReteFte[i].getValue('internalid');
                var retefteName = resultNTReteFte[i].getValue('name');
                custpage_lmry_co_retefte.addSelectOption({
                  value: retefteID,
                  text: retefteName
                });
              }
            }
  
            //RETEICA
            var itemFieldICA = itemSublist.getField({
              id: 'custcol_lmry_co_reteica'
            });
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
            if (resultNTReteIca.length > 0) {
              for (var i = 0; i < resultNTReteIca.length; i++) {
                var reteicaID = resultNTReteIca[i].getValue('internalid');
                var reteicaName = resultNTReteIca[i].getValue('name');
                custpage_lmry_co_reteica.addSelectOption({
                  value: reteicaID,
                  text: reteicaName
                });
              }
            }
  
            //RETEIVA
            var itemFieldIVA = itemSublist.getField({
              id: 'custcol_lmry_co_reteiva'
            });
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
            if (resultNTReteIva.length > 0) {
              for (var i = 0; i < resultNTReteIva.length; i++) {
                var reteivaID = resultNTReteIva[i].getValue('internalid');
                var reteivaName = resultNTReteIva[i].getValue('name');
                custpage_lmry_co_reteiva.addSelectOption({
                  value: reteivaID,
                  text: reteivaName
                });
              }
            }
            //Llenar campos custpage si existen campo lleno de wht details
            if (type == 'edit' || type == 'copy') {
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
            if (resultNTReteCree.length > 0) {
              for (var i = 0; i < resultNTReteCree.length; i++) {
                var retecreeExpID = resultNTReteCree[i].getValue('internalid');
                var retecreeExpName = resultNTReteCree[i].getValue('name');
                custpage_lmry_co_retecree_exp.addSelectOption({
                  value: retecreeExpID,
                  text: retecreeExpName
                });
              }
            }
  
            //RETEFTE
            var expenseFieldFTE = expenseSublist.getField({
              id: 'custcol_lmry_co_retefte'
            });
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
            if (resultNTReteFte.length > 0) {
              for (var i = 0; i < resultNTReteFte.length; i++) {
                var retefteExpID = resultNTReteFte[i].getValue('internalid');
                var retefteExpName = resultNTReteFte[i].getValue('name');
                custpage_lmry_co_retefte_exp.addSelectOption({
                  value: retefteExpID,
                  text: retefteExpName
                });
              }
            }
  
            //RETEICA
            var expenseFieldICA = expenseSublist.getField({
              id: 'custcol_lmry_co_reteica'
            });
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
            if (resultNTReteIca.length > 0) {
              for (var i = 0; i < resultNTReteIca.length; i++) {
                var reteicaExpID = resultNTReteIca[i].getValue('internalid');
                var reteicaExpName = resultNTReteIca[i].getValue('name');
                custpage_lmry_co_reteica_exp.addSelectOption({
                  value: reteicaExpID,
                  text: reteicaExpName
                });
              }
            }
  
            //RETEIVA
            var expenseFieldIVA = expenseSublist.getField({
              id: 'custcol_lmry_co_reteiva'
            });
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
            if (resultNTReteIva.length > 0) {
              for (var i = 0; i < resultNTReteIva.length; i++) {
                var reteivaExpID = resultNTReteIva[i].getValue('internalid');
                var reteivaExpName = resultNTReteIva[i].getValue('name');
                custpage_lmry_co_reteiva_exp.addSelectOption({
                  value: reteivaExpID,
                  text: reteivaExpName
                });
              }
            }
  
            if (type == 'edit' || type == 'copy') {
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
              });
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
              });
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
              });
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
              });
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
              });
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
              });
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
              });
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
              });
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
        }
    }

    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    };
  });
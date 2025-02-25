/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for Transaction Credit Memo                    ||
||                                                              ||
||  File Name: LMRY_CreditMemoURET_V2.0.js                      ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jul 20 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */


define(['N/currency', 'N/log', 'N/config', 'N/ui/serverWidget', 'N/record', 'N/search', 'N/runtime',
    './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_HideViewLBRY_V2.0', './Latam_Library/LMRY_libWhtValidationLBRY_V2.0',
    './Latam_Library/LMRY_libNumberInWordsLBRY_V2.0', './Latam_Library/LMRY_libRedirectAccountsLBRY_V2.0',
    './WTH_Library/LMRY_TAX_TransactionLBRY_V2.0', './WTH_Library/LMRY_AutoPercepcionDesc_LBRY_V2.0', './Latam_Library/LMRY_GLImpact_LBRY_V2.0',
    './WTH_Library/LMRY_New_Country_WHT_Lines_LBRY', './Latam_Library/LMRY_HideView3LBRY_V2.0', './Latam_Library/LMRY_ExchangeRate_LBRY_V2.0',
    './Latam_Library/LMRY_UniversalSetting_LBRY', './WTH_Library/LMRY_TAX_Withholding_LBRY_V2.0', './WTH_Library/LMRY_ST_Tax_TransactionLBRY_V2.0',
    './WTH_Library/LMRY_ST_Tax_Withholding_LBRY_V2.0', './Latam_Library/LMRY_CL_ST_Sales_Tax_Transaction_LBRY_V2.0', './WTH_Library/LMRY_EC_BaseAmounts_TaxCode_LBRY',
    './Latam_Library/LMRY_BR_ValidateDuplicate_LBRY_V2.0', './Latam_Library/LMRY_CO_Duplicate_Credit_Memos_LBRY_V2.0',
    './Latam_Library/LMRY_MX_STE_Sales_Tax_Transaction_LBRY_V2.0', './Latam_Library/LMRY_CO_STE_Sales_Tax_Transaction_LBRY_V2.0',
    './Latam_Library/LMRY_PE_MapAndSaveFields_LBRY_v2.0', './WTH_Library/LMRY_CO_STE_CreditMemo_WHT_Lines_LBRY_V2.0',
    './WTH_Library/LMRY_CO_STE_WHT_Total_LBRY_V2.0', './WTH_Library/LMRY_TransferIva_LBRY',
    './WTH_Library/LMRY_MX_STE_CreditMemo_WHT_Total_LBRY_V2.0', './Latam_Library/LMRY_AR_ST_Sales_Tax_Transaction_LBRY_V2.0', './Latam_Library/LMRY_ValidateClosePeriod_LBRY_V2.0',
    './WTH_Library/LMRY_PE_Detractions_LBRY_V2.0', './Latam_Library/LMRY_AR_ST_Sales_Perception_LBRY_V2.0',
    './Latam_Library/LMRY_AR_ST_WHT_TransactionFields_LBRY_V2.0', 'N/format', './Latam_Library/LMRY_PA_ST_Sales_Tax_Transaction_LBRY_V2.0',
    './WTH_Library/LMRY_MX_TAX_Withholding_LBRY_V2.0.js', './WTH_Library/LMRY_BR_WHT_Rule_Purchase_LBRY_V2.0', './WTH_Library/LMRY_MX_Withholding_Sales_LBRY_V2.0',
    './Latam_Library/LMRY_libToolsFunctionsLBRY_V2.0', './WTH_Library/LMRY_BO_Taxes_LBRY_V2.0',
    './WTH_Library/LMRY_TransferIva_Subtype_LBRY', './Latam_Library/LMRY_PE_STE_Sales_Tax_Transaction_LBRY_V2.0', './WTH_Library/LMRY_CR_STE_WhtTransactionOnSalesByTotal_LBRY_V2.0',
    './Latam_Library/LMRY_Custom_ExchangeRate_Field_LBRY_V2.0.js'
  ],

  function(currency, log, config, serverWidget, record, search, runtime, libraryMail, library_HideView, libraryValidation, libraryNumber,
    libraryRedirect, Library_WHT_Transaction, Library_AutoPercepcionDesc, libraryGLImpact, libWHTLines, library_hideview3, library_ExchRate, library_Uni_Setting, Library_Tax_WHT,
    ST_TAX_Transaction, ST_WHT_Transaction, CL_ST_TaxLibrary, libraryEcBaseAmounts, Library_BRDup, Library_Duplicate,
    MX_STE_TaxLibrary, CO_STE_TaxLibrary, PE_libMapTransactions, CO_STE_WhtLibrary_Lines, CO_STE_WhtLibrary_Total, libraryTransferIva,
    MX_ST_WhtLibrary_Total, AR_ST_TaxLibrary, LibraryValidatePeriod, library_PE_Detraction, AR_ST_PerceptionLibrary,
    AR_ST_TransFields, format, PA_ST_TaxLibrary, libraryTaxWithholding, library_BR_minimum, TaxWithholdingSales, libTools, libBoTaxes,
    LibraryTransferIvaSubtype, PE_STE_TaxLibrary, CR_STE_WhtLibrary_Total, Library_ExchangeRate_Field) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    var LMRY_script = "LatamReady - Credit Memo URET V2.0";
    var recordObj = '';
    var isUret = true;
    var form = '';
    var licenses = [];
    var statusError = false;

    // SuiteTax
    var ST_FEATURE = false;
    var featureMB = false;
    const GroupTypeItemss = ["Group", "EndGroup", "Discount"];

    var wtaxRate = 'custbody_lmry_wtax_rate';
    var idCustomPage_Record = 'custpage_lmry_wtax_rate';

    function beforeLoad(scriptContext) {

      try {

        var featuresubs = runtime.isFeatureInEffect({
          feature: 'SUBSIDIARIES'
        });

        // SuiteTax
        ST_FEATURE = runtime.isFeatureInEffect({
          feature: 'tax_overhauling'
        });

        recordObj = scriptContext.newRecord;
        var type = scriptContext.type;
        form = scriptContext.form;
        typeC = recordObj.type;

        // Obtiene la interface que se esta ejecutando
        var type_interface = runtime.executionContext;

        // Sale del proceso si es MAPREDUCE
        /*if (['USERINTERFACE', "CSVIMPORT"].indexOf(type_interface) == -1) {
          return true;
        }*/

        var LMRY_countr = new Array();
        var country = new Array();
        country[0] = '';
        country[1] = '';

        /* Carga las licencias de todos los paises */
        var subsidiary = recordObj.getValue({
          fieldId: 'subsidiary'
        });

        if (scriptContext.type != 'print' && scriptContext.type != 'email') {
          licenses = libraryMail.getLicenses(subsidiary);
          if (licenses == null || licenses == '') {
            licenses = [];
            library_hideview3.PxHide(form, '', typeC);
            if (scriptContext.type != "create") {
              library_hideview3.PxHideSubTab(form, '', typeC);
            }
            library_hideview3.PxHideColumn(form, '', typeC);
          }
        }

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

        if (scriptContext.type == 'create') {

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


        if (type != 'print' && type != 'email') {
          try {
            var subsidiari = recordObj.getValue({
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

          if (form != '' && form != null) {
            //Se obtiene el feature de General Preferencpara saber si se debe de ocultar
            //Las columnas, los Cust Bodys y las Sublist.
            var hide_transaction = libraryMail.getHideView(country, 2, licenses);
            var hide_sublist = libraryMail.getHideView(country, 5, licenses);
            var hide_column = libraryMail.getHideView(country, 3, licenses);

            if (libraryMail.getCountryOfAccess(country, licenses)) {
              if (hide_column == true) {
                //Oculta los campos Column
                library_hideview3.PxHideColumn(form, country[0], typeC);
              }

              if (hide_sublist == true) {
                //Oculta los campos Cust Record
                library_hideview3.PxHideSubTab(form, country[0], typeC);
              }

              if (hide_transaction == true && featuresubs) {
                //Oculta los campos Body
                library_hideview3.PxHide(form, country[0], typeC);
              }
            } else {
              if (hide_column == true) {
                //Oculta los campos Column
                library_hideview3.PxHideColumn(form, '', typeC);
              }

              if (hide_sublist == true) {
                //Oculta los campos Record
                library_hideview3.PxHideSubTab(form, '', typeC);
              }

              if (hide_transaction == true && featuresubs) {
                //Oculta los campos Body
                library_hideview3.PxHide(form, '', typeC);
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
          //Se crea custpage para controlar el seteo automatico en el record anexado
          if (scriptContext.type == 'create') {
            form.addField({
              id: 'custpage_uni_set_status',
              label: 'Set Estatus',
              type: serverWidget.FieldType.CHECKBOX
            }).defaultValue = 'F';
          }

          if (featuresubs == true || featuresubs == 'T') {
            var subsidiary = recordObj.getValue({
              fieldId: 'subsidiary'
            });
            var LMRY_Result = Validate_Access_CM(subsidiary, form, typeC, type, recordObj);
          } else {
            var LMRY_Result = Validate_Access_CM(1, form, typeC, type, recordObj);
          }

          if (LMRY_Result[0] == 'BR') {
            if (type == 'create') {
              var numLines = recordObj.getLineCount({
                sublistId: 'item'
              });

              var hasCatalog = false;

              for (var i = 0; i < numLines; i++) {
                var catalog = recordObj.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_lmry_br_service_catalog',
                  line: i
                });
                if (catalog) {
                  hasCatalog = true;
                  break;
                }
              }

              if (hasCatalog) {
                var createdFrom = recordObj.getValue({
                  fieldId: 'createdfrom',
                });

                //Si se crea una transaccion desde otra, se limpian los valores para calculo de impuesto BR.
                if (createdFrom) {
                  if (ST_FEATURE == true || ST_FEATURE == "T") {
                    ST_TAX_Transaction.cleanLinesforCopy(recordObj, licenses);
                  } else {
                    Library_WHT_Transaction.cleanLinesforCopy(recordObj, licenses);
                  }
                }
              }

            }
          }

          // LatamTax - SuiteTax
          if (ST_FEATURE == true || ST_FEATURE == "T") {

            if (["create", "edit", "copy", "view"].indexOf(scriptContext.type) != -1) {
              switch (LMRY_Result[0]) {
                /*case "MX":
                    MX_STE_TaxLibrary.disableInvoicingIdentifier(scriptContext);
                    break;*/
                case "CO":
                  if (libraryMail.getAuthorization(645, licenses) == true) {
                    CO_STE_TaxLibrary.setupFields(scriptContext);
                  }
                  break;
                case "AR":
                  AR_ST_TaxLibrary.disableInvoicingIdentifier(scriptContext);
                  break;
                case "CL":
                  CL_ST_TaxLibrary.disableInvoicingIdentifier(scriptContext);
                  break;
                case "PA":
                  PA_ST_TaxLibrary.disableInvoicingIdentifier(scriptContext);
                  break;
                case "PE":
                  if (libraryMail.getAuthorization(646, licenses) == true) {
                    PE_STE_TaxLibrary.disableInvoicingIdentifier(scriptContext);
                  }
                  break;
                case "CR":
                  if (libraryMail.getAuthorization(996, licenses) == true) {
                    CR_STE_WhtLibrary_Total.setWthRuleField(scriptContext);
                  }
                  break;
              }
            }

            if (["copy", "xcopy"].indexOf(scriptContext.type) != -1) {
              switch (LMRY_Result[0]) {
                case "MX":
                  MX_STE_TaxLibrary.deleteTaxDetailLines(recordObj);
                  break;
                case "CO":
                  if (libraryMail.getAuthorization(645, licenses) == true) {
                    CO_STE_TaxLibrary.deleteTaxDetailLines(recordObj);
                  }
                  break;
                case "AR":
                  AR_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                  break;
                case "CL":
                  CL_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                  break;
                case "PA":
                  PA_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                  break;
                case "PE":
                  if (libraryMail.getAuthorization(646, licenses) == true) {
                    PE_STE_TaxLibrary.deleteTaxDetailLines(recordObj);
                  }
                  break;
              }
            }

            if (["copy", "create"].indexOf(scriptContext.type) != -1) {
              var createdFrom = recordObj.getValue({
                fieldId: "createdfrom"
              });
              if (createdFrom) {
                switch (LMRY_Result[0]) {
                  case "MX":
                    MX_STE_TaxLibrary.deleteTaxDetailLines(recordObj);
                    break;
                  case "CO":
                    if (libraryMail.getAuthorization(645, licenses) == true) {
                      CO_STE_TaxLibrary.deleteTaxDetailLines(recordObj);
                    }
                    break;
                  case "AR":
                    AR_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                    break;
                  case "CL":
                    CL_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                    break;
                  case "PA":
                    PA_ST_TaxLibrary.deleteTaxDetailLines(recordObj);
                    break;
                  case "PE":
                    if (libraryMail.getAuthorization(646, licenses) == true) {
                      PE_STE_TaxLibrary.deleteTaxDetailLines(recordObj);
                    }
                    break;
                }
              }
            }

          }

          if (LMRY_Result[0] == 'CO') {
            if (libraryMail.getAuthorization(340, licenses) || libraryMail.getAuthorization(721, licenses)) {
              var formObj = scriptContext.form;
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
              if (libraryMail.getAuthorization(721, licenses) && type_interface == 'USERINTERFACE' && (type == 'create' || type == 'edit' || type == 'copy')) {
                createCOLineFieldsWHT(formObj, recordObj, type);
              }
            }

            if (!libraryMail.getAuthorization(721, licenses)) {
              var formObj = scriptContext.form;
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
            }
          }

          if (LMRY_Result[0] == 'CL') {
            if (libraryMail.getAuthorization(414, licenses)) {
              var fieldSerie = form.getField({
                id: 'custbody_lmry_serie_doc_cxc'
              });

              if (fieldSerie) {
                fieldSerie.updateDisplayType({
                  displayType: serverWidget.FieldDisplayType.NORMAL
                });
              }
            }
          }
          //Solo para Mexico
          if (LMRY_Result[0] == 'MX') {
            //Addendas por feature y campo
            hideAddendaSubtabs(scriptContext);
          }


          if (LMRY_Result[0] == 'PE') {
            if (libraryMail.getAuthorization(568, licenses)) {
              var createdFrom = recordObj.getValue({
                fieldId: 'createdfrom'
              });

              // Transacion relaciona de forma standar
              if (createdFrom != null && createdFrom != '') {
                var invoiceData = search.lookupFields({
                  type: 'invoice',
                  id: createdFrom,
                  columns: ['custbody_lmry_concepto_detraccion', 'custbody_lmry_porcentaje_detraccion']
                });
                if (invoiceData.custbody_lmry_concepto_detraccion != null && invoiceData.custbody_lmry_concepto_detraccion != '') {
                  recordObj.setValue({
                    fieldId: 'custbody_lmry_concepto_detraccion',
                    value: invoiceData.custbody_lmry_concepto_detraccion[0].value
                  });
                }
                if (invoiceData.custbody_lmry_porcentaje_detraccion) {
                  recordObj.setValue({
                    fieldId: 'custbody_lmry_porcentaje_detraccion',
                    value: invoiceData.custbody_lmry_porcentaje_detraccion
                  });
                }

                /* * * * * * * * * * * * * * * * * * * * * * * * * * *
                 * Fecha : 18 de Agosto de 2021
                 * Se agrego asociar la transaccion origen con el CM
                 *    Latam - Transaction Reference
                 *    Latam - Transaction Reference ID
                 * * * * * * * * * * * * * * * * * * * * * * * * * * */
                recordObj.setValue({
                  fieldId: 'custbody_lmry_reference_transaction',
                  value: createdFrom
                });
                recordObj.setValue({
                  fieldId: 'custbody_lmry_reference_transaction_id',
                  value: createdFrom
                });
              } // Transacion relaciona de forma standar

            }

          }

          //Boton UPDATE WHT
          if (LMRY_Result[0] == 'CO' && libraryMail.getAuthorization(721, licenses)) {
            createCoButtonUpDateWhx(scriptContext);
          }

          // Lógica GL Impact
          if (type == 'view') {
            // Obtiene el idioma del entorno
            var featurelang = runtime.getCurrentScript().getParameter({
              name: 'LANGUAGE'
            });
            featurelang = featurelang.substring(0, 2);

            var formulario = scriptContext.form;

            var btnGl = libraryGLImpact.featureGLImpact(recordObj, 'creditmemo');
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
            var featPrintgl = libraryMail.getAuthorization(552, licenses);
            var featPrintglSumm = libraryMail.getAuthorization(811, licenses)
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
            if (LMRY_Result[0] == 'AR' && libraryMail.getAuthorization(1029, licenses)) {
              form.addButton({
                id: 'custpage_button_AR_perception',
                label: featurelang == 'es' ? 'AGIP Percepciones' : 'AGIP Perception',
                functionName: 'generatePerception()'
              });
              form.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';
            }

          } // Fin Lógica GL Impact

          /* * * * * * * * * * * * * * * * * * * * * * * * * * *
           * Fecha : 21 de abril de 2020
           * Se agrego que todas las validacion sean dentro
           * de la condicional :
           *    if (scriptContext.type == 'create')
           * * * * * * * * * * * * * * * * * * * * * * * * * * */
          if (scriptContext.type == 'create' || scriptContext.type == 'copy') {
            /* *** Logica de Tipo de Cambio Automatico *** */
            if (LMRY_Result[0] == 'MX') {
              if (libraryMail.getAuthorization(289, licenses)) {
                library_ExchRate.createFieldURET(scriptContext, serverWidget);
              }
            }
            if (LMRY_Result[0] == 'BR') {
              if (libraryMail.getAuthorization(321, licenses)) {
                library_ExchRate.createFieldURET(scriptContext, serverWidget);
              }
            }
            if (LMRY_Result[0] == 'CO') {
              if (libraryMail.getAuthorization(409, licenses)) {
                library_ExchRate.createFieldURET(scriptContext, serverWidget);
              }
            }
            if (LMRY_Result[0] == 'CL') {
              if (libraryMail.getAuthorization(322, licenses)) {
                library_ExchRate.createFieldURET(scriptContext, serverWidget);
              }
            }
            if (LMRY_Result[0] == 'PE') {
              if (libraryMail.getAuthorization(403, licenses)) {
                library_ExchRate.createFieldURET(scriptContext, serverWidget);
              }
            }
            if (LMRY_Result[0] == 'AR') {
              if (libraryMail.getAuthorization(404, licenses)) {
                library_ExchRate.createFieldURET(scriptContext, serverWidget);
              }
            }
            /* *** Fin Logica de Tipo de Cambio Automatico *** */

          } // Fin if (scriptContext.type == 'create')

          var createdFrom = recordObj.getValue('createdfrom');

          //SETEO DEL CUSTBODY LATAMREADY - BR TRANSACTION TYPE PARA FILTRAR LA COLUMNA CFOP
          if (LMRY_Result[0] == 'BR' && LMRY_Result[2] == true && (scriptContext.type == 'create' || scriptContext.type == 'edit' || scriptContext.type == 'copy')) {
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
                  log.debug('1');
                  recordObj.setValue({
                    fieldId: 'custbody_lmry_br_transaction_type',
                    value: resultTransactionType[0].getValue('internalid')
                  });
                }

              }
            }
          } //FIN CFOP BR

          /******************************************************************************************************************************
            Code: C0956
            Date: 01/08/2023
            Summary: Seteo del campo Custbody LATAMREADY - BR TRANSACTION TYPE para el filtrado de Retenciones por Línea V2 de Colombia
          *******************************************************************************************************************************/
          if (LMRY_Result[0] == 'CO' && LMRY_Result[2] == true && (scriptContext.type == 'create' || scriptContext.type == 'edit' || scriptContext.type == 'copy')) {
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

          //CL CHANGE CURRENCY UF: SOLO TRANSFORM Y MAKE COPY
          if (LMRY_Result[0] == 'CL' && libraryMail.getAuthorization(604, licenses) && ((scriptContext.type == 'create' && createdFrom) || scriptContext.type == 'copy')) {

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

            var jsonCurrencies = {};
            var fieldRateUF = '';

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

            var currencyTransaction = recordObj.getValue('currency');
            var tranDate = recordObj.getValue('trandate');

            if (jsonCurrencies[currencyTransaction]['symbol'] == 'CLP' && fieldRateUF && recordObj.getField(fieldRateUF)) {

              var rateUF = currency.exchangeRate({
                source: 'CLF',
                target: 'CLP',
                date: tranDate
              });
              recordObj.setValue(fieldRateUF, parseFloat(rateUF));

              for (var i = 0; i < recordObj.getLineCount({
                  sublistId: 'item'
                }); i++) {

                var amountUF = recordObj.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_lmry_prec_unit_so',
                  line: i
                });
                var quantity = recordObj.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'quantity',
                  line: i
                });

                if (parseFloat(amountUF) > 0 && parseFloat(rateUF) > 0) {

                  amountUF = parseFloat(amountUF) * parseFloat(rateUF);
                  amountUF = parseFloat(amountUF).toFixed(0);

                  recordObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: i,
                    value: amountUF
                  });

                  amountUF = parseFloat(quantity) * parseFloat(amountUF);

                  recordObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i,
                    value: amountUF
                  });

                }

              }


            }

          } //FIN CL CHANGE CURRENCY

          /******************************************
           * Cambio de Orden al script 15/09/2022   *
           ******************************************/
          if (scriptContext.type == 'create' || scriptContext.type == 'copy' || scriptContext.type == 'edit' || scriptContext.type == 'view') {
            if (LMRY_Result[0] === "MX" && libraryMail.getAuthorization(30, licenses)) {
              Crear_Wht_Rule(recordObj, scriptContext)
            }
            if (scriptContext.type == "copy" && LMRY_Result[0] === "MX" && libraryMail.getAuthorization(672, licenses)) {
              libraryTaxWithholding.resetLines(recordObj);
            }
          }

          var createdFrom = recordObj.getValue("createdfrom");

          if (scriptContext.type == "create" && createdFrom && LMRY_Result[0] == "BO" && libraryMail.getAuthorization(827, licenses)) {
            libBoTaxes.resetLines(recordObj);
          }

          var crea = recordObj.getValue('createdfrom') || "";
          log.debug("crea", crea)
          if (crea != "") {
            if (scriptContext.type == "create" && LMRY_Result[0] === "MX" && libraryMail.getAuthorization(672, licenses)) {
              libraryTaxWithholding.resetLines(recordObj);
            }
          }

        } // Fin if (type != 'print' && type != 'email')


      } catch (err) {
        log.error("error BeforeLoad", err);
        recordObj = scriptContext.newRecord;
        libraryMail.sendemail2(' [ BeforeLoad ] ' + err, LMRY_script, recordObj, 'tranid', 'entity');
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

        // SuiteTax
        ST_FEATURE = runtime.isFeatureInEffect({
          feature: 'tax_overhauling'
        });

        var ORCD = scriptContext.oldRecord;

        recordObj = scriptContext.newRecord;
        var type = scriptContext.type;
        var LMRY_Intern = recordObj.id;
        form = scriptContext.form;
        var type_interface = runtime.executionContext;
        var type_event = scriptContext.type;
        //Nombre de la transaccion
        var typeC = recordObj.type;
        // Sale del proceso si es MAPREDUCE
        if (type_interface == 'MAPREDUCE') {
          return true;
        }

        var subsidiary = recordObj.getValue({
          fieldId: 'subsidiary'
        });
        licenses = libraryMail.getLicenses(subsidiary);
        var LMRY_Result = Validate_Access_CM(subsidiary, form, typeC, type, recordObj);

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
          featureAfterSaving = libraryMail.getAuthorization(featuresAfterSavingByCountry[LMRY_Result[0]], licenses);
        }

        /* Validacion 04/02/22 */
        // Libreria - Valida Periodo cerrado
        if (LibraryValidatePeriod.validatePeriod(recordObj.getValue('postingperiod'), licenses, LMRY_Result[0], 'sales')) return true;
        /* Fin validacion 04/02/22 */
        log.error('type_event', type_event);
        log.error('type_interface', type_interface);
        //Universal Setting se realiza solo al momento de crear
        if (type_event == 'create' && (["USERINTERFACE","USEREVENT","CSVIMPORT","RESTWEBSERVICES","RESTLET","WEBSERVICES"].indexOf(type_interface) != -1) && (ST_FEATURE == false || ST_FEATURE == "F")) {
          var al_country = recordObj.getValue('custbody_lmry_subsidiary_country');
          var type_document = recordObj.getValue('custbody_lmry_document_type');
          log.error('type_document', type_document);
          var band = true;
          log.error('feat', (library_Uni_Setting.auto_universal_setting(licenses, false)));
          if (library_Uni_Setting.auto_universal_setting(licenses, false)) {
            //Solo si el campo LATAM - LEGAL DOCUMENT TYPE se encuentra vacío
            if (type_interface == 'USERINTERFACE') {
              log.error('pasa', 'interfaz');
              log.error('type_document', type_document);
              if (recordObj.getValue('custpage_uni_set_status') == 'F' && (type_document == '' || type_document == null)) {
                //Seteo campos cabecera, numero pre impreso y template
                if (featureAfterSaving == true || featureAfterSaving == 'T') {
                  library_Uni_Setting.automatic_setfield(recordObj, true);
                } else{
                  library_Uni_Setting.automatic_setfield(recordObj, false);
                  library_Uni_Setting.set_preimpreso(recordObj, LMRY_Result, licenses);
                }

                library_Uni_Setting.setear_datos_invoice(recordObj);
                library_Uni_Setting.set_template(recordObj, licenses);
                recordObj.setValue('custpage_uni_set_status', 'T');
                band = false;
              }
            } else if (type_interface == 'USEREVENT' && (type_document == '' || type_document == null)) {
              log.error('pasa', 'USER EVENT CONTEXTO')
              //Seteo campos cabecera, numero pre impreso y template
              if (featureAfterSaving == true || featureAfterSaving == 'T') {
                library_Uni_Setting.automatic_setfield(recordObj, true);
              } else{
                library_Uni_Setting.automatic_setfield(recordObj, false);
                library_Uni_Setting.set_preimpreso(recordObj, LMRY_Result, licenses);
              }
              library_Uni_Setting.setear_datos_invoice(recordObj);
              library_Uni_Setting.set_template(recordObj, licenses);
              band = false;

            } else if (["CSVIMPORT","RESTWEBSERVICES","RESTLET","WEBSERVICES"].indexOf(type_interface) != -1) {
              var check_csv = recordObj.getValue('custbody_lmry_scheduled_process');
              log.error('pasa', 'mass');
              log.error('check_csv', check_csv);
              log.error('type_document', type_document);
              log.error('featureAfterSaving', featureAfterSaving);
              //Check box para controlar el seteo automático en el record anexado
              if ((check_csv == false || check_csv == 'F') && (type_document == '' || type_document == null)) {
                //Seteo campos cabecera, numero pre impreso y template
                if (featureAfterSaving == true || featureAfterSaving == 'T') {
                  library_Uni_Setting.automatic_setfield(recordObj, true);
                } else{
                  library_Uni_Setting.automatic_setfield(recordObj, false);
                  library_Uni_Setting.set_preimpreso(recordObj, LMRY_Result, licenses);
                }
                library_Uni_Setting.setear_datos_invoice(recordObj);
                library_Uni_Setting.set_template(recordObj, licenses);

                if (check_csv == 'F') {
                  recordObj.setValue('custbody_lmry_scheduled_process', 'T');
                } else {
                  recordObj.setValue('custbody_lmry_scheduled_process', true);
                }
                band = false;
              }
            }
            log.error('change', (recordObj.getValue('custbody_lmry_scheduled_process')));

            //Seteo de campo de columna Invoice Identifier
            library_Uni_Setting.set_inv_identifier(recordObj);

          }

          var id_country = recordObj.getValue('custbody_lmry_subsidiary_country');
          /**
           * Seteo de campos ref en caso no este activo el automatic set
           * Reference Fields in Credit Memo
           * 08/03/2022
           */

          var featureReferenceCamp = {
            'AR': 831,
            'BO': 832,
            'BR': 833,
            'CL': 834,
            'CO': 835,
            'CR': 836,
            'EC': 837,
            'SV': 838,
            'GU': 839,
            'MX': 840,
            'NI': 841,
            'PA': 842,
            'PY': 843,
            'PE': 844,
            'DO': 845,
            'UY': 846,
          }

          if (libraryMail.getAuthorization(featureReferenceCamp[LMRY_Result[0]], licenses)) {
            setearDatosRef(recordObj);
          } else if (band && id_country == 48) {
            setearFolioCO(recordObj);
          }
        }

        //Logica de Tipo de Cambio Automatico
        var exchrate = false;
        switch (LMRY_Result[0]) {
          case 'AR':
            if ((scriptContext.type == 'create' || scriptContext.type == 'copy') && libraryMail.getAuthorization(404, licenses)) {
              exchrate = true;
            }
            break;
          case 'BR':
            if ((scriptContext.type == 'create' || scriptContext.type == 'copy') && libraryMail.getAuthorization(321, licenses)) {
              exchrate = true;
            }
            break;
          case 'CO':
            if ((scriptContext.type == 'create' || scriptContext.type == 'copy') && libraryMail.getAuthorization(409, licenses)) {
              exchrate = true;
            }
            break;
          case 'CL':
            if ((scriptContext.type == 'create' || scriptContext.type == 'copy') && libraryMail.getAuthorization(322, licenses)) {
              exchrate = true;
            }
            break;
          case 'MX':
            if ((scriptContext.type == 'create' || scriptContext.type == 'copy') && libraryMail.getAuthorization(289, licenses)) {
              exchrate = true;
            }
            break;
          case 'PE':
            if ((scriptContext.type == 'create' || scriptContext.type == 'copy') && libraryMail.getAuthorization(403, licenses)) {
              exchrate = true;
            }
            break;
          default:
            break;
        }
        if (exchrate) {
          library_ExchRate.setExchRate(scriptContext);
        }

        // Nueva logica de Country WHT Lines
        if (ST_FEATURE == false || ST_FEATURE == "F") {
          libWHTLines.beforeSubmitTransaction(scriptContext, licenses);
        }

        //log.debug('WTH CO', LMRY_Result[0]);
        switch (LMRY_Result[0]) {
          //   case 'AR':
          //     if (libraryMail.getAuthorization(200, licenses) == true) {
          //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
          //     }
          //     break;
          //   case 'BO':
          //     if (libraryMail.getAuthorization(152, licenses) == true) {
          //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
          //     }
          //     break;
          case 'BR':
            if (libraryMail.getAuthorization(147, licenses) == true) {
              if (ST_FEATURE == true || ST_FEATURE == "T") {
                ST_TAX_Transaction.beforeSubmitTransaction(scriptContext);
              } else {
                Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
              }
            }
            break;
            //   case 'CL':
            //     if (libraryMail.getAuthorization(201, licenses) == true) {
            //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            //     }
            //     break;
            //   case 'CO':
            //     if (libraryMail.getAuthorization(150, licenses) == true) {
            //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            //     }
            //     break;
            //   case 'CR':
            //     if (libraryMail.getAuthorization(203, licenses) == true) {
            //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            //     }
            //     break;
            // //   case 'EC':
            // //     if (libraryMail.getAuthorization(153, licenses) == true) {
            // //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            // //     }
            // //     break;
            //   case 'SV':
            //     if (libraryMail.getAuthorization(205, licenses) == true) {
            //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            //     }
            //     break;
            //   case 'GT':
            //     if (libraryMail.getAuthorization(207, licenses) == true) {
            //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            //     }
            //     break;
            //   case 'MX':
            //     if (libraryMail.getAuthorization(209, licenses) == true) {
            //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            //     }
            //     break;
            //   case 'PA':
            //     if (libraryMail.getAuthorization(211) == true) {
            //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            //     }
            //     break;
            //   case 'PY':
            //     if (libraryMail.getAuthorization(213, licenses) == true) {
            //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            //     }
            //     break;
            //   case 'PE':
            //     if (libraryMail.getAuthorization(214, licenses) == true) {
            //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            //     }
            //     break;
            //   case 'UY':
            //     if (libraryMail.getAuthorization(216, licenses) == true) {
            //       Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
            //     }
            //     break;

        }

        /*************************************
         * Auto Percepcions para Argentina,
         * Brasil y Paraguay
         *************************************/

        if (recordObj.getValue('memo') != 'VOID') {
          var swAutoPe = false;
          if (LMRY_Result[0] == 'AR') {
            swAutoPe = libraryMail.getAuthorization(142, licenses);
          }
          if (LMRY_Result[0] == 'BR') {
            swAutoPe = libraryMail.getAuthorization(143, licenses);
          }
          if (LMRY_Result[0] == 'BO') {
            swAutoPe = libraryMail.getAuthorization(230, licenses);
          }
          if (LMRY_Result[0] == 'PE') {
            swAutoPe = libraryMail.getAuthorization(231, licenses);
          }
          if (LMRY_Result[0] == 'CL') {
            swAutoPe = libraryMail.getAuthorization(232, licenses);
          }
          if (LMRY_Result[0] == 'CO') {
            swAutoPe = libraryMail.getAuthorization(233, licenses);
          }
          if (LMRY_Result[0] == 'CR') {
            swAutoPe = libraryMail.getAuthorization(234, licenses);
          }
          if (LMRY_Result[0] == 'EC') {
            swAutoPe = libraryMail.getAuthorization(235, licenses);
          }
          if (LMRY_Result[0] == 'SV') {
            swAutoPe = libraryMail.getAuthorization(236, licenses);
          }
          if (LMRY_Result[0] == 'GT') {
            swAutoPe = libraryMail.getAuthorization(237, licenses);
          }
          if (LMRY_Result[0] == 'MX') {
            swAutoPe = libraryMail.getAuthorization(238, licenses);
          }
          if (LMRY_Result[0] == 'PA') {
            swAutoPe = libraryMail.getAuthorization(239, licenses);
          }
          if (LMRY_Result[0] == 'PY') {
            swAutoPe = libraryMail.getAuthorization(240, licenses);
          }
          if (LMRY_Result[0] == 'UY') {
            swAutoPe = libraryMail.getAuthorization(241, licenses);
          }

          // Si hay acceso Procesa
          /*if (ST_FEATURE == false || ST_FEATURE == "F") {
            if (swAutoPe) {
              // Realiza la redireccion de cuentas
              Library_AutoPercepcionDesc.autoperc_beforeSubmit(scriptContext, LMRY_Result[0], scriptContext.type);
            }
          }*/
        }

        if (scriptContext.type == 'delete') {
          // LatamTax - SuiteTax
          if (ST_FEATURE == true || ST_FEATURE == "T") {
            switch (LMRY_Result[0]) {
              case "MX":
                MX_STE_TaxLibrary.deleteTaxResult(LMRY_Intern);
                if (libraryMail.getAuthorization(30, licenses) == true) {
                  MX_ST_WhtLibrary_Total.deleteRelatedRecords(LMRY_Intern);
                }
                break;
              case "CO":
                if (libraryMail.getAuthorization(645, licenses) == true) {
                  CO_STE_TaxLibrary.deleteRelatedRecords(LMRY_Intern);
                }
                if (libraryMail.getAuthorization(340, licenses) == true) {
                  CO_STE_WhtLibrary_Lines.deleteRelatedRecords(LMRY_Intern);
                }
                if (libraryMail.getAuthorization(27, licenses) == true) {
                  CO_STE_WhtLibrary_Total.deleteRelatedRecords(LMRY_Intern, "creditmemo");
                }
                break;
              case "AR":
                AR_ST_TaxLibrary.deleteTaxResult(LMRY_Intern);
                if (libraryMail.getAuthorization(540, licenses) == true) {
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
                if (libraryMail.getAuthorization(646, licenses) == true) {
                  PE_STE_TaxLibrary.deleteTaxResult(LMRY_Intern);
                }
                break;
              case "CR":
                if (libraryMail.getAuthorization(996, licenses) == true) {
                  CR_STE_WhtLibrary_Total.deleteRecords(LMRY_Intern, 'creditmemo');
                }
                break;
            }
          }

          //Detraction PE
          if (LMRY_Result[0] == 'PE') {
            if (libraryMail.getAuthorization(750, licenses)) {
              library_PE_Detraction.documentsToDelete(recordObj);
            }
          }
        }

        if (['create', 'edit', 'copy', 'view'].indexOf(scriptContext.type) != -1) {
          if (ST_FEATURE == true || ST_FEATURE == 'T') {
            switch (LMRY_Result[0]) {
              case "CR":
                if (libraryMail.getAuthorization(996, licenses) == true) {
                  CR_STE_WhtLibrary_Total.setWHTRuleLine(scriptContext);
                }
                break;
            }
          }
        }

        if (LMRY_Result[0] == "BR") {
          if (["create", "edit", "copy"].indexOf(scriptContext.type) != -1) {
            setBRDiscountAmount(recordObj);
          }

          if (scriptContext.type == "delete") {
            if (libraryMail.getAuthorization(416, licenses)) {
              if (ST_FEATURE == true || ST_FEATURE == "T") {
                ST_WHT_Transaction.deleteGeneratedRecords(recordObj);
              } else {
                Library_Tax_WHT.deleteGeneratedRecords(recordObj);
              }
            }
          }
        }

        //SETEO DE CAMPOS BASE 0%, 12% Y 14%
        var eventsEC = ['create', 'copy', 'edit'];
        if (LMRY_Result[0] == 'EC' && libraryMail.getAuthorization(42, licenses) && eventsEC.indexOf(scriptContext.type) != -1) {
          libraryEcBaseAmounts.setBaseAmounts(recordObj, '2');
        }

        if (LMRY_Result[0] == "CO" && libraryMail.getAuthorization(666, licenses) && scriptContext.type == 'edit' && type_interface != 'USERINTERFACE') {

          //feature cabecera
          if (libraryMail.getAuthorization(27, licenses)) {
            var rete_change_wht = Library_Duplicate.Verification_Duplicate_Fields(Library_Duplicate.Old_Values_WHT(ORCD), recordObj);
            var lines_change = Library_Duplicate.Verification_Duplicate_Lines(recordObj, ORCD);
            if (Library_Duplicate.Validate_EIDocument(recordObj) && (rete_change_wht || lines_change)) {
              statusError = true;
            }
          }

          //if feature lineas
          if (libraryMail.getAuthorization(340, licenses)) {
            var lines_change = Library_Duplicate.Verification_Duplicate_Lines(recordObj, ORCD);
            if (Library_Duplicate.Validate_EIDocument(recordObj) && lines_change) {
              statusError = true;
            }
          }
        }

        if (LMRY_Result[0] == "CO") {
          if (libraryMail.getAuthorization(721, licenses) == true) {
            if (scriptContext.type == 'edit') {
                recordObj.setValue('custbody_lmry_scheduled_process', false);
            }
            if (type_interface == 'USERINTERFACE') {
                setCOLineValueWTH(recordObj);
            }
          }
        }

        if (scriptContext.type == 'create' || scriptContext.type == 'copy' || scriptContext.type == 'edit' || scriptContext.type == 'view') {
          if (LMRY_Result[0] == "MX" && libraryMail.getAuthorization(30, licenses)) {
            //Se setea el valor del cust page en el campo departmen
            var getRule = recordObj.getValue(idCustomPage_Record); //0
            getRule = Number(getRule) || "";

            var numLines = recordObj.getLineCount({
              sublistId: 'item'
            });

            for (var i = 0; i < numLines; i++) {
              var itemType = recordObj.getSublistValue({
                sublistId: "item",
                fieldId: "itemtype",
                line: i
              }) || "";
              if (GroupTypeItemss.indexOf(itemType) == -1) {
                recordObj.setSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_lmry_wht_rule',
                  line: i,
                  value: getRule
                });
              }
            }
          }
        }

        if (["create", "edit", "copy", "delete"].indexOf(scriptContext.type) != -1 && LMRY_Result[0] == "BO" && libraryMail.getAuthorization(827, licenses)) {
          if (scriptContext.type == "delete") {
            libBoTaxes.deleteTaxResults(recordObj);
          }

          if (["create", "edit", "copy"].indexOf(scriptContext.type) != -1) {
            libBoTaxes.setUndefTaxLines(recordObj);
          }
        }

        if (scriptContext.type == "delete" && LMRY_Result[0] == 'MX' && libraryMail.getAuthorization(672, licenses) == true) {
          var id_delete = recordObj.id;
          log.debug("id_delete", id_delete);
          libraryTaxWithholding._inactiveRelatedRecord(id_delete);
        }


      } catch (err) {
        log.error("error BeforeSubmit", err);
        recordObj = scriptContext.newRecord;
        libraryMail.sendemail2(' [ BeforeSubmit ] ' + err, LMRY_script, recordObj, 'tranid', 'entity');
      }

      if (statusError) {

        var Language = runtime.getCurrentScript().getParameter({
          name: 'LANGUAGE'
        });

        Language = Language.substring(0, 2);

        var msg = {
          "en": "You cannot make changes to withholdings since the document is already issued electronically.",
          "es": "No se puede realizar modificaciones en retenciones dado que el documento ya se encuentra emitido electrónicamente.",
          "pt": "Você não pode fazer alterações nas retenções porque o documento já foi emitido eletronicamente."
        }

        throw msg[Language] || msg["en"];
      } else {
        return true
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
      try {

        //SuiteTax
        ST_FEATURE = runtime.isFeatureInEffect({
          feature: 'tax_overhauling'
        });
        featureMB = runtime.isFeatureInEffect({
          feature: "MULTIBOOK"
        });
        var ORCD = scriptContext.oldRecord;

        recordObj = scriptContext.newRecord;
        var type = scriptContext.type;
        var LMRY_Intern = recordObj.id;
        form = scriptContext.form;
        var typeC = recordObj.type;
        var type_interface = runtime.executionContext;
        var type_document = recordObj.getValue('custbody_lmry_document_type');
        log.error('type_document 2', type_document);
        // Sale del proceso si es MAPREDUCE
        if (type_interface == 'MAPREDUCE') {
          return true;
        }

        var subsidiary = recordObj.getValue({
          fieldId: 'subsidiary'
        });
        licenses = libraryMail.getLicenses(subsidiary);
        var LMRY_Result = Validate_Access_CM(subsidiary, form, typeC, type, recordObj);


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
          featureAfterSaving = libraryMail.getAuthorization(featuresAfterSavingByCountry[LMRY_Result[0]], licenses);
        }

        /* Validacion 04/02/22 */
        // Libreria - Valida Periodo cerrado
        if (LibraryValidatePeriod.validatePeriod(recordObj.getValue('postingperiod'), licenses, LMRY_Result[0], 'sales')) return true;
        /* Fin validacion 04/02/22 */

        var type_event = scriptContext.type;
        log.error('type_event 2', type_event);
        log.error('type_interface 2', type_interface);
        log.error('featureAfterSaving 2', featureAfterSaving);
        //Universal Setting se realiza solo al momento de crear
        if (type_event == 'create' && ["USERINTERFACE","USEREVENT","CSVIMPORT","RESTWEBSERVICES","RESTLET","WEBSERVICES"].indexOf(type_interface) != -1 && (ST_FEATURE == false || ST_FEATURE == "F")) {
          if (type_interface == 'USERINTERFACE') {
            //Mediante el custpage se conoce que el seteo de cabecera fue realizado por Universal Setting
            if (recordObj.getValue('custpage_uni_set_status') == 'T') {
              if (featureAfterSaving == true || featureAfterSaving == 'T') {
                if (type_document == '' || type_document == null) {

                  library_Uni_Setting.automaticSetFieldDocument(recordObj);
                  library_Uni_Setting.set_preimpreso(recordObj, LMRY_Result, licenses, true);
                }
              }
              //Seteo de campos perteneciente a record anexado
              library_Uni_Setting.automatic_setfieldrecord(recordObj);
            }
          } else if (type_interface == 'USEREVENT' && (type_document == '' || type_document == null)) {
            var al_country = recordObj.getValue('custbody_lmry_subsidiary_country');
            if (featureAfterSaving == true || featureAfterSaving == 'T') {
              library_Uni_Setting.automaticSetFieldDocument(recordObj);
              library_Uni_Setting.set_preimpreso(recordObj, LMRY_Result, licenses,true);
            }

            if (library_Uni_Setting.auto_universal_setting(licenses, false)) {
              //Seteo de campos perteneciente a record anexado
              library_Uni_Setting.automatic_setfieldrecord(recordObj);
            }
          } else if (["CSVIMPORT","RESTWEBSERVICES","RESTLET","WEBSERVICES"].indexOf(type_interface) != -1) {
            //Mediante el siguiente campo se conoce si seteo de cabecera fue realizado por Universal Setting
            var check_csv = recordObj.getValue('custbody_lmry_scheduled_process');
            log.error('check_csv 2', check_csv);
            if (check_csv == 'T' || check_csv == true) {
              log.error('pasa tf', 'pasa tf');
              if (featureAfterSaving == true || featureAfterSaving == 'T') {
                library_Uni_Setting.automaticSetFieldDocument(recordObj);
                library_Uni_Setting.set_preimpreso(recordObj, LMRY_Result, licenses,true);
              }
              //Seteo de campos perteneciente a record anexado
              library_Uni_Setting.automatic_setfieldrecord(recordObj);
              if (check_csv == 'T') {
                recordObj.setValue('custbody_lmry_scheduled_process', 'F');
              } else {
                recordObj.setValue('custbody_lmry_scheduled_process', false);
              }
            }
          }

        }
        log.error('change 2', (recordObj.getValue('custbody_lmry_scheduled_process')));
        if (type == 'delete') {
          // Para Colombia, Bolivia y Paraguay - Enabled Feature WHT Latam
          switch (LMRY_Result[0]) {
            case 'CO':
              if (libraryMail.getAuthorization(27, licenses) == true) {
                // Elimina registros
                libraryValidation.Delete_JE(LMRY_Intern);

                // Delete invoice
                libraryValidation.Delete_CM('invoice', LMRY_Intern);
              }
              break;
            case 'BO':
              if (libraryMail.getAuthorization(46, licenses) == true) {
                // Elimina registros
                libraryValidation.Delete_JE(LMRY_Intern);

                // Delete invoice
                libraryValidation.Delete_CM('invoice', LMRY_Intern);
              }
              break;
            case 'PY':
              if (libraryMail.getAuthorization(47, licenses) == true) {
                // Elimina registros
                libraryValidation.Delete_JE(LMRY_Intern);

                // Delete invoice
                libraryValidation.Delete_CM('invoice', LMRY_Intern);
              }
              break;
          }

          // Sale de la funcion
          return true;
        }

        if (type == 'create' || type == 'edit' || type == 'copy') {
          if (ST_FEATURE == false || ST_FEATURE == "F") {
            var transactionType = 'creditmemo';
            libWHTLines.newAfterSubmitTransaction(scriptContext, type, LMRY_Intern, transactionType, licenses, false);
          }

          // Creación del MX Transaction fields
          if (LMRY_Result[0] == 'MX' && (libraryMail.getAuthorization(243, licenses) == true || libraryMail.getAuthorization(972, licenses) == true)) {
            if (libraryMail.getAuthorization(672, licenses) == false && ST_FEATURE == false || ST_FEATURE == "F") {
              libraryTransferIva.generateMXTransField(scriptContext);
            }
          }
        }


        if (["create", "edit", "copy"].indexOf(scriptContext.type) != -1 && LMRY_Result[0] == 'BO' && libraryMail.getAuthorization(827, licenses)) {
          libBoTaxes.calculateBoTaxes(recordObj, scriptContext.type);
        }

        if (type == 'create' || type == 'edit') {
          var currency = recordObj.getValue({
            fieldId: 'currency'
          });
          // Subsidiria de Peru, Republica Dominicana, Mexico y Ecuador
          if (LMRY_Result[0] == 'PE' || LMRY_Result[0] == 'MX' || LMRY_Result[0] == 'EC' || LMRY_Result[0] == 'DO') {

            if (currency == '' || currency == null) {
              return true;
            }
            //	Se realiza la busqueda de los campos symbol y name por el id de la moneda
            var monedaTexto = search.lookupFields({
              type: search.Type.CURRENCY,
              id: currency,
              columns: ['name', 'symbol']
            });
            //	Se realiza la busqueda de los campos symbol y name por el id de la moneda
            var mon_name = monedaTexto.name;
            var mon_symb = monedaTexto.symbol;
            //log.debug('monedaTexto', mon_name + ';' + mon_symb);

            // Guarda Monto en Letras
            var imptotal = recordObj.getValue({
              fieldId: 'total'
            });
            var impletras = libraryNumber.ConvNumeroLetraESP(imptotal, mon_name, '', 'Y');

            // Actualiza solo el campo - Latam - Monto en Letras (Custom Body)
            //log.debug('monto', impletras);
            record.submitFields({
              type: 'creditmemo',
              id: LMRY_Intern,
              values: {
                'custbody_lmry_pa_monto_letras': impletras
              }
            });
          }

          // Subsidiria de Peru, Panama, Mexico y Ecuador
          if (LMRY_Result[0] == 'PA') {
            // Guarda Monto en Letras
            var imptotal = recordObj.getValue({
              fieldId: 'total'
            });
            var impletras = libraryNumber.ConvNumeroLetraESP(imptotal, '', '', 'Y');

            // Actualiza solo el campo - Latam - Monto en Letras (Custom Body)
            record.submitFields({
              type: 'creditmemo',
              id: LMRY_Intern,
              values: {
                'custbody_lmry_pa_monto_letras': impletras
              }
            });
          }

          // Subsidiaria Paraguay
          if (LMRY_Result[0] == 'PY') {

            //log.debug('currency', currency);
            if (currency == '' || currency == null) {
              return true;
            }

            var monedaTexto = search.lookupFields({
              type: search.Type.CURRENCY,
              id: currency,
              columns: ['name', 'symbol']
            });
            var mon_name = monedaTexto.name;
            var mon_symb = monedaTexto.symbol;

            // Restamos el custbody_lmry_wtax_wamt al monto Total por que NS despues de grabar el documento recien le
            // Guarda Monto
            var imptotal = 0.00;
            imptotal = parseFloat(recordObj.getValue({
              fieldId: 'total'
            }));
            imptotal = imptotal.toFixed(2);

            // Monto en Letras Parametros: Importe, Moneda, Simbolo y concadenador
            var impletras = libraryNumber.ConvNumeroLetraESP(imptotal, mon_name, mon_symb, 'Y');

            // Actualiza solo el campo - Latam - Monto en Letras (Custom Body)
            record.submitFields({
              type: 'creditmemo',
              id: LMRY_Intern,
              values: {
                'custbody_lmry_pa_monto_letras': impletras
              }
            });
          }

          // Solo para Colombia
          if (LMRY_Result[0] == 'CO') {
            //log.debug('currency', currency);
            if (currency == '' || currency == null) {
              return true;
            }
            //	Se realiza la busqueda de los campos symbol y name por el id de la moneda
            var monedaTexto = search.lookupFields({
              type: search.Type.CURRENCY,
              id: currency,
              columns: ['name', 'symbol']
            });
            var mon_name = monedaTexto.name;
            var mon_symb = monedaTexto.symbol;
            //log.debug('monedaTexto', mon_name + ';' + mon_symb);
            // Guarda Monto en Letras
            var imptotal = recordObj.getValue({
              fieldId: 'total'
            });

            // Monto en Letras Parametros: Importe, Moneda, Simbolo y concadenador
            var impletras = libraryNumber.ConvNumeroLetraESP(imptotal, mon_name, mon_symb, 'Y');

            // Actualiza solo el campo - Latam - CO Amount in Words (Custom Body)
            //log.debug('monto antes setvalue', impletras);
            // recordObj.setValue({
            //   fieldId: 'custbody_lmry_co_monto_letras',
            //   value: impletras
            // });

            record.submitFields({
              type: 'creditmemo',
              id: LMRY_Intern,
              values: {
                'custbody_lmry_co_monto_letras': impletras
              }
            });

          }

          // Solo para El Salvador
          if (LMRY_Result[0] == 'SV') {

            if (currency == '' || currency == null) {
              return true;
            }
            //	Se realiza la busqueda de los campos symbol y name por el id de la moneda
            var monedaTexto = search.lookupFields({
              type: search.Type.CURRENCY,
              id: currency,
              columns: ['name', 'symbol']
            });
            var mon_name = monedaTexto.name;
            var mon_symb = monedaTexto.symbol;

            // Guarda Monto en Letras
            // var imptotal = recordObj.getValue({
            //   fieldId: 'total'
            // });

            var imptotal = 0.00;
            imptotal = parseFloat(recordObj.getValue({
              fieldId: 'total'
            }));
            // Monto en Letras Parametros: Importe, Moneda, Simbolo y concadenador
            // var impletras = libraryNumber.ConvNumeroLetraESP(imptotal, mon_name, mon_symb, 'Y');

            var impletras = libraryNumber.ConvNumeroLetraESP(imptotal, mon_name, mon_symb, 'CON');

            record.submitFields({
              type: 'creditmemo',
              id: LMRY_Intern,
              values: {
                'custbody_lmry_pa_monto_letras': impletras
              }
            });

            // recordObj.setValue({
            //   fieldId: 'custbody_lmry_pa_monto_letras',
            //   value: impletras
            // });

          }

          // Solo para Mexico
          if (LMRY_Result[0] == 'MX') {
            /*************************************************
             * Custom Record : LatamReady - Features
             * 22 = Redireccion de Cuentas
             *************************************************/
            if (libraryMail.getAuthorization(22, licenses) == true) {
              if (ST_FEATURE == false || ST_FEATURE == "F") {
                // Elimina los asientos
                libraryValidation.Delete_JE(LMRY_Intern);

                // Realiza la redireccion de cuentas
                libraryRedirect.Create_Redirect_CM(LMRY_Intern);
              }
            }
          }

          // Solo para Colombia y Bolivia - Enabled Feature WHT Latam
          /*************************************************
           * Custom Record : LatamReady - Features
           * 27 = Latam - WHT for Colombia
           * 46 = Latam - WHT for Bolivia
           *************************************************/
          switch (LMRY_Result[0]) {
            case 'CO':
              if (ST_FEATURE == false || ST_FEATURE == "F") {
                if (libraryMail.getAuthorization(27, licenses) == true) {
                  libraryValidation.Create_WHT_Latam('creditmemo', LMRY_Intern, scriptContext);
                }
              }
              break;
            case 'BO':
              if (libraryMail.getAuthorization(46, licenses) == true) {
                libraryValidation.Create_WHT_Latam('creditmemo', LMRY_Intern);
              }
              break;
            default:

          }
        }

        // Nueva logica de colombia
        //log.debug('WTH CO', LMRY_Result[0]);
        if (LMRY_Result[0] == "BR") {
          if (["create", "edit", "copy"].indexOf(scriptContext.type) != -1) {
            if ('create' == scriptContext.type) {
              Library_BRDup.assignPreprinted(recordObj, licenses);
            }
            var recordBR = record.load({
              type: "creditmemo",
              id: scriptContext.newRecord.id
            })
            if (libraryMail.getAuthorization(147, licenses) == true) {
              var context = {
                type: scriptContext.type,
                newRecord: recordBR
              };
              if (ST_FEATURE == true || ST_FEATURE == "T") {
                ST_TAX_Transaction.afterSubmitTransaction(context, true);
              } else {
                Library_WHT_Transaction.afterSubmitTransaction(context, true);
              }
            }
            recordBR.save({
              ignoreMandatoryFields: true,
              disableTriggers: true,
              enableSourcing: true
            });

            if (libraryMail.getAuthorization(416, licenses)) {
              recordObj = scriptContext.newRecord;
              if (ST_FEATURE == true || ST_FEATURE == "T") {
                ST_WHT_Transaction.LatamTaxWithHoldingBR(recordObj, type);
              } else {
                Library_Tax_WHT.LatamTaxWithHoldingBR(recordObj, type);
              }
            }

            /* *******************************************************************
             * C0570 - LatamTax BR Ventas - Reconocimiento mínimos de Retención:
             * - 921 : LATAM WHT (SALES)
             * ****************************************************************** */
            if (libraryMail.getAuthorization(921, licenses)) {
              library_BR_minimum.createWithholdingTax(recordBR, library_BR_minimum.getSetupSubsi(subsidiary));
            }

          }
        }

        // LatamTax - SuiteTax
        if (["create", "edit", "copy"].indexOf(scriptContext.type) != -1) {
          // Suite TAX
          if (ST_FEATURE == true || ST_FEATURE == "T") {

            var ST_RecordObj = record.load({
              type: "creditmemo",
              id: recordObj.id
            });

            var ST_Context = {
              type: scriptContext.type,
              newRecord: ST_RecordObj
            };

            switch (LMRY_Result[0]) {

              case "MX":
                if (libraryMail.getAuthorization(672, licenses) == true) {
                  MX_STE_TaxLibrary.setTaxTransaction(scriptContext);
                }
                if (libraryMail.getAuthorization(30, licenses) == true) {
                  MX_ST_WhtLibrary_Total.setWHTTransaction(scriptContext);
                }
                break;

              case "CO":
                if (libraryMail.getAuthorization(645, licenses) == true) {
                  CO_STE_TaxLibrary.setTaxTransaction(scriptContext);
                }
                if (libraryMail.getAuthorization(340, licenses) == true) {
                  CO_STE_WhtLibrary_Lines.setWHTLineTransaction(scriptContext, licenses);
                }
                if (libraryMail.getAuthorization(27, licenses) == true) {
                  CO_STE_WhtLibrary_Total.setWHTTotalTransaction(scriptContext, licenses);
                }
                break;

              case "AR":
                if (libraryMail.getAuthorization(679, licenses) == true) {
                  AR_ST_TaxLibrary.setTaxTransaction(scriptContext);
                }
                if (libraryMail.getAuthorization(142, licenses) == true) {
                  AR_ST_PerceptionLibrary.applyPerception(scriptContext);
                }
                if (libraryMail.getAuthorization(540, licenses) == true) {
                  AR_ST_TransFields.setTransactionFields(scriptContext);
                }
                break;

              case "CL":
                if (libraryMail.getAuthorization(606, licenses) == true) {
                  CL_ST_TaxLibrary.setTaxTransaction(scriptContext);
                }
                break;

              case "PA":
                if (libraryMail.getAuthorization(708, licenses) == true) {
                  PA_ST_TaxLibrary.setTaxTransaction(scriptContext);
                }
                break;

              case "PE":
                if (libraryMail.getAuthorization(646, licenses) == true) {
                  PE_STE_TaxLibrary.setTaxTransaction(scriptContext);
                }
                break;

              case "CR":
                if (libraryMail.getAuthorization(996, licenses) == true) {
                  CR_STE_WhtLibrary_Total.setWHTTotalTransaction(scriptContext, licenses);
                }
                break;
            }
            // Fin - Suite TAX
          } else {
            // Legacy Taxes
            var currentRCD = record.load({
              type: "creditmemo",
              id: recordObj.id,
              isDynamic: true
            })
            var actionType = scriptContext.type;
            if (["create", "edit"].indexOf(actionType) != -1) {
              switch (LMRY_Result[0]) {
                case "MX":
                  var Crear_TaxResult = libraryMail.getAuthorization(969, licenses) || false;
                  var Global_Disc = libraryMail.getAuthorization(898, licenses) || false;
                  if (libraryMail.getAuthorization(672, licenses) == true) {
                    libraryTaxWithholding.LatamTaxWithHoldingMX(currentRCD, Crear_TaxResult, actionType, Global_Disc);
                  }
                  if (libraryMail.getAuthorization(30, licenses) == true) {
                    TaxWithholdingSales.LatamWithHoldingSalesMX(currentRCD, actionType, Crear_TaxResult);
                  }
                  LibraryTransferIvaSubtype.generateMXTransField(currentRCD, scriptContext);
                  break;
              }
            }
          } // Fin - Legacy Taxes

        }

        if (ST_FEATURE == false || ST_FEATURE == "F") {
          if (type == 'create' || type == 'edit') {
            if (LMRY_Result[0] == 'AR' && libraryMail.getAuthorization(540, licenses)) {
              GroupLine(scriptContext, LMRY_Intern);
            }
          }
        }

        //EC TRANSACTION FIELDS
        if ((type == 'create' || type == 'edit') && LMRY_Result[0] == 'EC' && (libraryMail.getAuthorization(630, licenses) || libraryMail.getAuthorization(639, licenses))) {
          ECsetAmounts(LMRY_Intern);
        }

        // Detraction (Credit Memo)
        if (['create', 'edit'].indexOf(type) != -1 && LMRY_Result[0] == 'PE' && libraryMail.getAuthorization(568, licenses)) {

          var invoiceApplied = 0;
          if (type == 'edit') {
            var journalApply = 0;
            // Abre Transaccion Credit Memo
            var recObj = record.load({
              type: 'creditmemo',
              id: LMRY_Intern
            });
            var c_invoices = recObj.getLineCount({
              sublistId: 'apply'
            });

            for (var i = 0; i < c_invoices; i++) {
              var tranId = recObj.getSublistValue({
                sublistId: 'apply',
                fieldId: 'trantype',
                line: i
              });
              if (tranId == 'Journal') {
                journalApply = recObj.getSublistValue({
                  sublistId: 'apply',
                  fieldId: 'doc',
                  line: i
                });
              } else {
                var applied = recObj.getSublistValue({
                  sublistId: 'apply',
                  fieldId: 'apply',
                  line: i
                });
                if (applied == true || applied == 'T') {
                  invoiceApplied = recObj.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    line: i
                  });
                }
              }
              recObj.setSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                line: i,
                value: false
              });
            }
            recObj.save({
              disableTriggers: true
            });

            if (journalApply) {
              record.delete({
                type: 'journalentry',
                id: journalApply
              });
            }

          }

          var featureSub = runtime.isFeatureInEffect({
            feature: 'SUBSIDIARIES'
          });

          var featureAprove = runtime.getCurrentScript().getParameter({
            name: 'CUSTOMAPPROVALJOURNAL'
          });

          var JEamount = 0;
          var idJournal = 0;
          var detractionAccount = 0;
          var percent = recordObj.getValue('custbody_lmry_porcentaje_detraccion') || 0;
          percent = parseFloat(percent) / 100;
          // var baseAmount = recordObj.getValue("total") || 0.00;
          // baseAmount = parseFloat(baseAmount);
          // JEamount = baseAmount * parseFloat(percent) / 100;
          // JEamount = parseFloat(Math.round(JEamount * 100 + 1e-3)) / 100;
          var numItems = recordObj.getLineCount({
            sublistId: "item"
          });
          for (var i = 0; i < numItems; i++) {
            var grossAmount = recordObj.getSublistValue({
              sublistId: "item",
              fieldId: "grossamt",
              line: i
            }) || 0.00;
            grossAmount = parseFloat(grossAmount);
            var whtAmtLine = grossAmount * percent;
            whtAmtLine = Math.round(whtAmtLine * 1e2 + 1e-3) / 1e2;
            JEamount = Math.round((JEamount + whtAmtLine) * 1e2 + 1e-3) / 1e2;
          }
          var searchSetupSubsidiary = search.create({
            type: "customrecord_lmry_setup_tax_subsidiary",
            filters: [
              ['isinactive', 'is', 'F']
            ],
            columns: ['custrecord_lmry_setuptax_pe_det_account']
          });
          if (featureSub) {
            searchSetupSubsidiary.filters.push(search.createFilter({
              name: 'custrecord_lmry_setuptax_subsidiary',
              operator: 'is',
              values: [recordObj.getValue('subsidiary')]
            }));
          }
          searchSetupSubsidiary = searchSetupSubsidiary.run().getRange(0, 1);

          if (searchSetupSubsidiary != null && searchSetupSubsidiary != '') {
            detractionAccount = searchSetupSubsidiary[0].getValue('custrecord_lmry_setuptax_pe_det_account') || 0;
          }

          if (JEamount > 0 && detractionAccount) {
            // Crea transaccion Journal Entry
            var newJournal = record.create({
              type: record.Type.JOURNAL_ENTRY
            });

            if (featureSub) {
              newJournal.setValue('subsidiary', recordObj.getValue('subsidiary'));
            }
            newJournal.setValue('trandate', recordObj.getValue('trandate'));
            newJournal.setValue('postingperiod', recordObj.getValue('postingperiod'));
            if (LMRY_Intern) {
              newJournal.setValue('custbody_lmry_reference_transaction', LMRY_Intern);
              newJournal.setValue('custbody_lmry_reference_transaction_id', LMRY_Intern);
            }
            newJournal.setValue('custbody_lmry_es_detraccion', false);
            if (featureAprove == 'T' || featureAprove == true) {
              newJournal.setValue('approvalstatus', 2);
            }
            newJournal.setValue('currency', recordObj.getValue('currency'));
            newJournal.setValue('exchangerate', recordObj.getValue('exchangerate'));
            newJournal.setValue('memo', 'Detraccion - Nota de Credito ID: ' + LMRY_Intern);

            // Segmentation
            var lineDep = recordObj.getValue('department');
            var lineCla = recordObj.getValue('class');
            var lineLoc = recordObj.getValue('location');
            // Line from
            newJournal.setSublistValue('line', 'account', 0, detractionAccount);
            newJournal.setSublistValue('line', 'credit', 0, JEamount);
            newJournal.setSublistValue('line', 'memo', 0, 'Detraction Amount');
            newJournal.setSublistValue('line', 'entity', 0, recordObj.getValue('entity'));
            if (lineDep != null && lineDep != '' && lineDep != undefined) {
              newJournal.setSublistValue('line', 'department', 0, lineDep);
            }
            if (lineCla != null && lineCla != '' && lineCla != undefined) {
              newJournal.setSublistValue('line', 'class', 0, lineCla);
            }
            if (lineLoc != null && lineLoc != '' && lineLoc != undefined) {
              newJournal.setSublistValue('line', 'location', 0, lineLoc);
            }
            // Line to
            newJournal.setSublistValue('line', 'account', 1, recordObj.getValue('account'));
            newJournal.setSublistValue('line', 'debit', 1, JEamount);
            newJournal.setSublistValue('line', 'memo', 1, 'Detraction Amount');
            newJournal.setSublistValue('line', 'entity', 1, recordObj.getValue('entity'));
            if (lineDep != null && lineDep != '' && lineDep != undefined) {
              newJournal.setSublistValue('line', 'department', 1, lineDep);
            }
            if (lineCla != null && lineCla != '' && lineCla != undefined) {
              newJournal.setSublistValue('line', 'class', 1, lineCla);
            }
            if (lineLoc != null && lineLoc != '' && lineLoc != undefined) {
              newJournal.setSublistValue('line', 'location', 1, lineLoc);
            }
            idJournal = newJournal.save({
              enableSourcing: true,
              ignoreMandatoryFields: true,
              dissableTriggers: true
            });
          }

          // Abre Transaccion Credit Memo
          var recObj = record.load({
            type: 'creditmemo',
            id: LMRY_Intern
          })
          var c_invoices = recObj.getLineCount({
            sublistId: 'apply'
          });

          /* * * * * * * * * * * * * * * * * * * * * * * * * * *
           * Fecha : 18 de Agosto de 2021
           * Se agrego asociar la transaccion origen con el CM
           *    Latam - Transaction Reference ID
           * * * * * * * * * * * * * * * * * * * * * * * * * * */
          var IDCreatedFrom = recObj.getValue('createdfrom');
          if (IDCreatedFrom == '' || IDCreatedFrom == null) {
            IDCreatedFrom = recObj.getValue('custbody_lmry_reference_transaction_id');
            if (IDCreatedFrom != '' && IDCreatedFrom != null) {
              recObj.setValue('createdfrom', IDCreatedFrom);
            }
          }

          if (!invoiceApplied && IDCreatedFrom != null && IDCreatedFrom != '') {
            invoiceApplied = IDCreatedFrom;
          }

          for (var i = 0; i < c_invoices; i++) {
            var tranId = recObj.getSublistValue({
              sublistId: 'apply',
              fieldId: 'doc',
              line: i
            });
            if (tranId == idJournal) {
              recObj.setSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                line: i,
                value: true
              });
              recObj.setSublistValue({
                sublistId: 'apply',
                fieldId: 'amount',
                line: i,
                value: JEamount
              });
            }
            if (tranId == invoiceApplied) {
              recObj.setSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                line: i,
                value: true
              });
              recObj.setSublistValue({
                sublistId: 'apply',
                fieldId: 'amount',
                line: i,
                value: recObj.getValue('total') - JEamount
              });
            }
          }

          recObj.save({
            disableTriggers: true
          });
        }

        /*****************************************************
         Update Transaction Fields Peru
         -----------------------------------------------------
         User : Richard Galvez Lopez
         Date : 18/11/2021
        ******************************************************/
        PE_libMapTransactions.updateTransactionFields(scriptContext);
        /*****************************************************/

        if (["create", "edit", "copy"].indexOf(scriptContext.type) != -1) {
          //Detraction PE
          if (LMRY_Result[0] == 'PE') {
            if (libraryMail.getAuthorization(750, licenses)) {
              library_PE_Detraction.afterSubmitTransaction(recordObj, scriptContext.type);
            }
          }
        }
        /*****************************************************
         Adjustment Journal - Argentina | Colombia
         Code: S0029
         Date: 17/06/2022
        ******************************************************/
        if (featureMB) {
          if (LMRY_Result[0] == 'AR') {
            if (libraryMail.getAuthorization(919, licenses)) {
              libTools.createAdjustmentJournal(recordObj, scriptContext.type);
            }
          }
          if (LMRY_Result[0] == 'CO') {
            if (libraryMail.getAuthorization(920, licenses)) {
              libTools.createAdjustmentJournal(recordObj, scriptContext.type);
            }
          }
        }
        /*****************************************************/

      } catch (err) {
        log.error('error AfterSubmit', err);
        recordObj = scriptContext.newRecord;
        libraryMail.sendemail2(' [ AfterSubmit ] ' + err, LMRY_script, recordObj, 'tranid', 'entity');
      }
      return true;
    }

    /* ------------------------------------------------------------------------------------------------------
     * A la variable featureId se le asigna el valor que le corresponde
     * --------------------------------------------------------------------------------------------------- */
    function Validate_Access_CM(ID, form, typeC, type, recordObj) {

      try {

        var LMRY_access = false;
        var LMRY_countr = new Array();
        var LMRY_Result = new Array();

        // Inicializa variables Locales y Globales
        LMRY_countr = libraryMail.Validate_Country(ID);

        // Verifica que el arreglo este lleno
        if (LMRY_countr.length < 1) {
          LMRY_Result[0] = '';
          LMRY_Result[1] = '-None-';
          LMRY_Result[2] = LMRY_access;
          return LMRY_Result;
        }

        LMRY_access = libraryMail.getCountryOfAccess(LMRY_countr, licenses);

        // Asigna Valores
        LMRY_Result[0] = LMRY_countr[0];
        LMRY_Result[1] = LMRY_countr[1];
        LMRY_Result[2] = LMRY_access;

      } catch (err) {
        libraryMail.sendemail2(' [ Validate_Access_CM ] ' + err, LMRY_script, recordObj, 'tranid', 'entity');
      }

      return LMRY_Result;
    }

    function GroupLine(context, Record_ID) {
      var recordObj = context.newRecord;

      if (context.type != 'create') {
        DeleteGroupLine(Record_ID);
      }

      // Declaracion de Arreglos
      var arr_DatFil = [];
      var arr_PosFil = -1;

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

      var result_grps = tax_group.run().getRange(0, 1000);

      if (result_grps != null && result_grps.length > 0) {
        for (var TaxLine = 0; TaxLine < result_grps.length; TaxLine++) {
          // Declaracion de JSON y Arreglo Tax Group
          var arr_DatCol = {};
          arr_DatCol["TaxGroup"] = ''; // Latam - Tax Code Group
          arr_DatCol["TaxCodes"] = ''; // Latam - Tax Code
          arr_DatCol["TaxField"] = ''; // Latam - Setup ID Custbody
          arr_DatCol["TaxBase"] = ''; // Latam - Setup Amount To
          arr_DatCol["TaxAmoun"] = 0; // Amount

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

    }

    function DeleteGroupLine(recordID) {

      var tax_group = search.create({
        type: 'customrecord_lmry_transactions_fields',
        columns: ['internalid', 'custrecord_lmry_transaction_f'],
        filters: [{
          name: 'custrecord_lmry_transaction_f_id',
          operator: 'equalto',
          values: recordID
        }]
      });

      var result_tax = tax_group.run().getRange(0, 1000);

      if (result_tax != null && result_tax.length > 0) {
        for (var delLine = 0; delLine < result_tax.length; delLine++) {
          var delRecord = record.delete({
            type: 'customrecord_lmry_transactions_fields',
            id: result_tax[delLine].getValue('internalid'),
          });
        } // Eliminacion de Records

      }

    }

    function ECsetAmounts(RecordID) {

      var recordObj = record.load({
        type: 'creditmemo',
        id: RecordID
      });

      var jsonAmounts = {
        'gross': {
          'field': 'custrecord_lmry_ec_gross_amount',
          'amount': 0
        },
        'tax': {
          'field': 'custrecord_lmry_ec_tax_amount',
          'amount': 0
        },
        'net': {
          'field': 'custrecord_lmry_ec_net_amount',
          'amount': 0
        }
      };
      var jsonLineAMounts = {};

      var cItems = recordObj.getLineCount({
        sublistId: 'item'
      });

      if (cItems > 0) {
        for (var i = 0; i < cItems; i++) {
          var netAmount = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'amount',
            line: i
          });
          var grossAmount = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'grossamt',
            line: i
          });
          var taxAmount = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'tax1amt',
            line: i
          });

          jsonAmounts['gross']['amount'] += parseFloat(grossAmount);
          jsonAmounts['net']['amount'] += parseFloat(netAmount);
          jsonAmounts['tax']['amount'] += parseFloat(taxAmount);

          var applyWHT = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_lmry_apply_wht_tax',
            line: i
          });
          var catalog = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_lmry_ec_concept_ret',
            line: i
          });
          var lineUniqueKey = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'lineuniquekey',
            line: i
          });
          var taxLine = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_4601_witaxline',
            line: i
          });
          var itemType = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'itemtype',
            line: i
          });
          var item = recordObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            line: i
          });
          var itemText = recordObj.getSublistText({
            sublistId: 'item',
            fieldId: 'item',
            line: i
          });

          jsonLineAMounts[i] = {
            'gross': grossAmount,
            'tax': taxAmount,
            'net': netAmount,
            'applywht': applyWHT,
            'catalog': catalog,
            'lineuniquekey': lineUniqueKey,
            'taxline': taxLine,
            'itemtype': itemType,
            'item': item,
            'itemtext': itemText
          };

        }
      }

      var searchEC = search.create({
        type: 'customrecord_lmry_ec_transaction_fields',
        filters: [{
          name: 'custrecord_lmry_ec_related_transaction',
          operator: 'is',
          values: RecordID
        }, {
          name: 'isinactive',
          operator: 'is',
          values: 'F'
        }]
      });
      searchEC = searchEC.run().getRange(0, 1);

      if (searchEC && searchEC.length) {
        var ecTransaction = record.load({
          type: 'customrecord_lmry_ec_transaction_fields',
          id: searchEC[0].id
        });
      } else {
        var ecTransaction = record.create({
          type: 'customrecord_lmry_ec_transaction_fields'
        });
      }

      ecTransaction.setValue('custrecord_lmry_ec_related_transaction', RecordID);
      ecTransaction.setValue('custrecord_lmry_ec_lines_amount', JSON.stringify(jsonLineAMounts));

      for (var i in jsonAmounts) {
        ecTransaction.setValue(jsonAmounts[i]['field'], jsonAmounts[i]['amount']);
      }

      ecTransaction.save({
        disableTriggers: true,
        ignoreMandatoryFields: true
      });


    }

    function setBRDiscountAmount(recordObj) {
      const GroupTypeItems = ["Group", "EndGroup"];
      var numberItems = recordObj.getLineCount({
        sublistId: "item"
      });
      if (numberItems) {
        var discountAmount = 0.00,
          currentItemLine = -1,
          isGroupLine = false;
        for (var i = 0; i < numberItems; i++) {
          var typeDiscount = recordObj.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_lmry_col_sales_type_discount",
            line: i
          });

          var itemType = recordObj.getSublistValue({
            sublistId: "item",
            fieldId: "itemtype",
            line: i
          });


          if (typeDiscount) {
            if (Number(typeDiscount) == 1) {
              var amount = recordObj.getSublistValue({
                sublistId: "item",
                fieldId: "amount",
                line: i
              }) || 0.00;
              discountAmount += parseFloat(amount);
            }
          } else {
            if (currentItemLine != -1 && !isGroupLine) {
              recordObj.setSublistValue({
                sublistId: "item",
                fieldId: "custcol_lmry_col_sales_discount",
                value: Math.abs(discountAmount),
                line: currentItemLine
              });
            }
            currentItemLine = i;
            discountAmount = 0.00;

            if (GroupTypeItems.indexOf(itemType) != -1) {
              isGroupLine = true;
            } else {
              isGroupLine = false;
            }
          }

        }

        if (currentItemLine != -1 && discountAmount && !isGroupLine) {
          recordObj.setSublistValue({
            sublistId: "item",
            fieldId: "custcol_lmry_col_sales_discount",
            value: Math.abs(discountAmount),
            line: currentItemLine
          });
        }
      }
    }

    function setearFolioCO(recordCreditMemo) {
      try {
        //Seteo de Folio Fiscal (Invoice) en el campo Folio Fiscal Ref (Credit Memo)
        var type_transaction = recordCreditMemo.type;
        var idTrans = '';
        var cont = 0;

        idTrans = recordCreditMemo.getValue('createdfrom');

        if (idTrans != '' && idTrans != null) {
          var invoiceID = '';
          var type = search.lookupFields({
            type: "transaction",
            id: idTrans,
            columns: ['type', 'createdfrom', 'createdfrom.type']
          });

          if (type.type[0].value == 'CustInvc') {
            invoiceID = idTrans;
          } else if (type.type[0].value == 'RtnAuth' && type['createdfrom'][0]) {
            var createdFrom = '';
            createdFrom = type['createdfrom.type'][0].value;
            invoiceID = type['createdfrom'][0].value;

            if (createdFrom != 'CustInvc') {
              return false;
            }
          } else {
            return false;
          }

          if (invoiceID != '') {
            var dataInvoice = search.lookupFields({
              type: 'invoice',
              id: invoiceID,
              columns: ['custbody_lmry_foliofiscal']
            });

            var document_folio_ref = dataInvoice.custbody_lmry_foliofiscal;
            if (document_folio_ref != null && document_folio_ref != '') {
              recordCreditMemo.setValue('custbody_lmry_foliofiscal_doc_ref', document_folio_ref);
            }
          }
        }

      } catch (err) {
        log.error('setearFolioCO', err);
      }
    }

    function setearDatosRef(recordCreditMemo) {
      try {
        //Seteo de Folio Fiscal (Invoice) en el campo Folio Fiscal Ref (Credit Memo)
        var type_transaction = recordCreditMemo.type;
        var idTrans = '';
        var cont = 0;

        idTrans = recordCreditMemo.getValue('createdfrom');

        if (idTrans != '' && idTrans != null) {
          var invoiceID = '';
          var type = search.lookupFields({
            type: "transaction",
            id: idTrans,
            columns: ['type', 'createdfrom', 'createdfrom.type']
          });

          if (type.type[0].value == 'CustInvc') {
            invoiceID = idTrans;
          } else if (type.type[0].value == 'RtnAuth' && type['createdfrom'][0]) {
            var createdFrom = '';
            createdFrom = type['createdfrom.type'][0].value;
            invoiceID = type['createdfrom'][0].value;

            if (createdFrom != 'CustInvc') {
              return false;
            }
          } else {
            return false;
          }

          if (invoiceID != '') {
            var dataInvoice = search.lookupFields({
              type: "invoice",
              id: invoiceID,
              columns: [
                "custbody_lmry_document_type",
                "trandate",
                "custbody_lmry_serie_doc_cxc",
                "custbody_lmry_num_preimpreso",
                'custbody_lmry_foliofiscal'
              ],
            });

            var document_type_ref = dataInvoice.custbody_lmry_document_type.length > 0 ? dataInvoice.custbody_lmry_document_type[0].value : null;
            var document_series_ref = dataInvoice.custbody_lmry_serie_doc_cxc.length > 0 ? dataInvoice.custbody_lmry_serie_doc_cxc[0].text : null;
            var tranDate = dataInvoice.trandate;
            log.debug("tranDate", tranDate);
            var document_number_ref = dataInvoice.custbody_lmry_num_preimpreso;
            var document_folio_ref = dataInvoice.custbody_lmry_foliofiscal;
            if (Number(document_type_ref) && document_type_ref != null)
              recordCreditMemo.setValue('custbody_lmry_doc_ref_type', document_type_ref);

            if (document_series_ref != "" && document_series_ref != null)
              recordCreditMemo.setValue('custbody_lmry_doc_serie_ref', document_series_ref);

            if (tranDate != "" && tranDate != null) {
              var _TranDate = format.parse({
                value: tranDate,
                type: format.Type.DATE
              })
              recordCreditMemo.setValue('custbody_lmry_doc_ref_date', _TranDate);
            }

            if (document_number_ref != "" && document_number_ref != null)
              recordCreditMemo.setValue('custbody_lmry_num_doc_ref', document_number_ref);

            if (document_folio_ref != null && document_folio_ref != '') {
              recordCreditMemo.setValue('custbody_lmry_foliofiscal_doc_ref', document_folio_ref);
            }
          }
        }
      } catch (err) {
        log.error("setearDatosRef", err);
      }
    }

    function Crear_Wht_Rule(recordObj, scriptContext) {
      var countrysubsi = recordObj.getValue({
        fieldId: 'custbody_lmry_subsidiary_country'
      });
      var form = scriptContext.form;

      //Se crea el cust page
      var record_custpage = form.addField({
        id: idCustomPage_Record,
        label: 'Latam - WHT RULE',
        type: serverWidget.FieldType.SELECT
      });

      //Se agrega al formulario
      form.insertField({ //Inserta un campo delante de otro campo.
        field: record_custpage,
        nextfield: wtaxRate
      })

      //Se ocultan los campos dependiendo del tipo de ejecucion del cust record
      //var cp_Record=form.getField(idCustomPage_Record);
      // if (scriptContext.type == "view") {
      //     record_custpage.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
      // }

      //Se verifica que el campo susbidiaria no este vacio
      if (countrysubsi == null) {

      } else {
        //Se ejecuta la busqueda de departamentos por Subsi
        var rulesSearchObj = search.create({
          type: "customrecord_lmry_wht_rules",
          filters: [
            ["custrecord_lmry_whtrule_country", "anyof", countrysubsi],
            "AND",
            ["isinactive", "is", "F"]
          ],
          columns: [
            search.createColumn({
              name: "name",
              sort: search.Sort.ASC,
              label: "Name"
            }),
            search.createColumn({
              name: "custrecord_lmry_whtrule_country",
              label: "Latam - Country"
            }),
            search.createColumn({
              name: "internalid",
              label: "Internal ID"
            })
          ]
        });
        //Se guardan los ids y names de los resultados
        var resultRulesSearch = rulesSearchObj.run().getRange(0, 100);
        record_custpage.addSelectOption({
          value: "0",
          text: "&nbsp;"
        });
        for (var i = 0; i < resultRulesSearch.length; i++) {
          var idRS = resultRulesSearch[i].id;
          var nameRS = resultRulesSearch[i].getValue('name');

          //Se agregan los departamentos a la seleccion del cust page
          record_custpage.addSelectOption({
            value: idRS,
            text: nameRS
          });

          log.debug({
            title: idRS,
            details: nameRS
          });
        }

      }

      var numLines = recordObj.getLineCount({
        sublistId: "item"
      });
      for (var i = 0; i < numLines; i++) {
        var itemType = recordObj.getSublistValue({
          sublistId: "item",
          fieldId: "itemtype",
          line: i
        }) || "";
        var value = recordObj.getSublistValue({
          sublistId: "item",
          line: i,
          fieldId: "custcol_lmry_wht_rule"
        });
        value = Number(value) || "";

        if (GroupTypeItemss.indexOf(itemType) == -1) {
          recordObj.setValue({
            fieldId: idCustomPage_Record,
            value: value,
            ignoreFieldChange: true
          })
          // record_custpage.defaultValue = value;
          break;
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

    function hideAddendaSubtabs(context) {
      try {
        var form = context.form;

        if (runtime.executionContext != "USERINTERFACE") {
          return;
        }

        if (!libraryMail.getAuthorization("1001", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_transac_costco"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1002", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_coppel_transaction"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1035", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_add_chedraui_city_fre"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1036", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_soriana_transaction"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1037", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_addenda_transaction"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1038", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_vkwg_transaction"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1039", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_walmart_transaction"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1040", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_casa_transaction"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1041", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_add_amz_transaction"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1042", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_audi_transaction"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1043", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_addenda_w_transaction"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1044", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_add_transac_loreal"
          }).displayType = 'hidden';
        }
        if (!libraryMail.getAuthorization("1045", licenses)) {
          form.getSublist({
            id: "recmachcustrecord_lmry_mx_addenda_g_transaction"
          }).displayType = 'hidden';
        }
      } catch (err) {
        log.error("[hideAddendaSubtabs]", err);
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

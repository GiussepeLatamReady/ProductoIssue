/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_RecordSalesURET_V2.0.js		                  ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     1 oct 2018  LatamReady    Use Script 2.0            ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
define(['N/config', 'N/currency', 'N/record', 'N/runtime', 'N/search', 'N/ui/serverWidget',
  'N/log', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0',
  './Latam_Library/LMRY_HideViewLBRY_V2.0', './WTH_Library/LMRY_TAX_TransactionLBRY_V2.0',
  './Latam_Library/LMRY_HideView3LBRY_V2.0', './Latam_Library/LMRY_SalesOrderButtonLBRY_V2.0',
  './Latam_Library/LMRY_GLImpact_LBRY_V2.0', './Latam_Library/LMRY_PE_MapAndSaveFields_LBRY_v2.0',
  './WTH_Library/LMRY_MX_TAX_Withholding_LBRY_V2.0', './Latam_Library/LMRY_BR_UPDATE_Flete_Transaction_Field_LBRY_2.0',
  './Latam_Library/LMRY_MX_STE_Sales_Tax_Transaction_LBRY_V2.0',
  './Latam_Library/LMRY_Custom_ExchangeRate_Field_LBRY_V2.0.js', './WTH_Library/LMRY_AutoPercepcionDesc_LBRY_V2.0'
],

  function (config, currencyModule, record, runtime, search, serverWidget, log,
    Library_Mail, Library_HideView, Library_WHT_Transaction, library_hideview3,
    library_SalesOrder, libraryGLImpact, PE_libMapTransactions, libraryTaxWithholding, libraryFleteGlobales,
    MX_STE_TaxLibrary, Library_ExchangeRate_Field, Library_AutoPercepcionDesc) {

    var LMRY_script = 'LMRY Record Sales URET V2.0';
    var OBJ_FORM = '';
    var RCD_OBJ = '';
    var RCD = '';
    var LMRY_access = false;
    var LMRY_countr = new Array();
    var RCD = '';
    var isURET = '';
    var FORM = '';
    var licenses = [];
    // SuiteTax
    var ST_FEATURE = false;

    var country_code = {
      11: 'AR',
      29: 'BO',
      30: 'BR',
      45: 'CL',
      48: 'CO',
      49: 'CR',
      63: 'EC',
      208: 'SV',
      91: 'GT',
      157: 'MX',
      173: 'PA',
      186: 'PY',
      174: 'PE',
      231: 'UY'
    };
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
        var lblBotonCompra = '';
        isURET = scriptContext.type;
        OBJ_FORM = scriptContext.form;
        RCD_OBJ = scriptContext.newRecord;
        var country = new Array();
        country[0] = '';
        country[1] = '';
        // SuiteTax
        ST_FEATURE = runtime.isFeatureInEffect({
          feature: 'tax_overhauling'
        });

        var subsidiary = RCD_OBJ.getValue('subsidiary');
        licenses = Library_Mail.getLicenses(subsidiary);
        if (licenses == null || licenses == '') {
          licenses = [];
          library_hideview3.PxHide(OBJ_FORM, '', RCD_OBJ.type);
          // Cambio realizado el 12/08/2022
          if (scriptContext.type != 'create') {
            library_hideview3.PxHideSubTab(OBJ_FORM, '', RCD_OBJ.type);
          }
          library_hideview3.PxHideColumn(OBJ_FORM, '', RCD_OBJ.type);
        }

        if (scriptContext.type == 'create' || scriptContext.type == 'copy') {

          var companyInformation = config.load({
            type: config.Type.COMPANY_INFORMATION
          });

          var baseCurrency = companyInformation.getValue({
            fieldId: 'basecurrency'
          });

          var lmry_basecurrency = OBJ_FORM.addField({
            id: 'custpage_lmry_basecurrency',
            label: 'Latam - Base Currency',
            type: serverWidget.FieldType.TEXT
          }).defaultValue = baseCurrency;

          Library_ExchangeRate_Field.ws_field(OBJ_FORM);
        }

        var Language = runtime.getCurrentScript().getParameter({
          name: 'LANGUAGE'
        });
        Language = Language.substring(0, 2);
        if (Language == 'es') {
          var lblBoton = 'Orden de Venta CLP';
          lblBotonCompra = 'Crear Orden de Compra';

        } else {
          var lblBoton = 'Sales Order CLP';
          lblBotonCompra = 'Create Purchase Order';
        }

        //Logica Print GL  sales order
        if (scriptContext.type == 'view') {
          var btnGl = libraryGLImpact.featureGLImpact(RCD_OBJ, 'salesorder');

          if (btnGl == 1) {
            if (Language == 'es') {
              OBJ_FORM.addButton({
                id: 'custpage_id_button_imp',
                label: 'IMPRIMIR GL',
                functionName: 'onclick_event_gl_impact()'
              });
            } else {
              OBJ_FORM.addButton({
                id: 'custpage_id_button_imp',
                label: 'PRINT GL',
                functionName: 'onclick_event_gl_impact()'
              });
            }
            OBJ_FORM.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';
          }


          // CO - Print withholdings in GL Impact	(09.11.2020)
          // recordObj => OBJ_FORM (17/09/2021)
          if (Library_Mail.getAuthorization(552, licenses)) {
            var whtamount = parseFloat(RCD_OBJ.getValue({
              fieldId: 'custbody_lmry_co_reteica_amount'
            })) +
              parseFloat(RCD_OBJ.getValue({
                fieldId: 'custbody_lmry_co_reteiva_amount'
              })) +
              parseFloat(RCD_OBJ.getValue({
                fieldId: 'custbody_lmry_co_retefte_amount'
              })) +
              parseFloat(RCD_OBJ.getValue({
                fieldId: 'custbody_lmry_co_retecree_amount'
              }));
            if (whtamount > 0) {
              if (Language == 'es') {
                OBJ_FORM.addButton({
                  id: 'custpage_id_button_imp',
                  label: 'CO-IMPRIMIR GL WHT',
                  functionName: 'onclick_event_co_wht_gl_impact()'
                });
              } else {
                OBJ_FORM.addButton({
                  id: 'custpage_id_button_imp',
                  label: 'CO-PRINT GL WHT',
                  functionName: 'onclick_event_co_wht_gl_impact()'
                });
              }
              OBJ_FORM.clientScriptModulePath = './Latam_Library/LMRY_GLImpact_CLNT_V2.0.js';
            }
          }
        }

        if (scriptContext.type != 'print' && scriptContext.type != 'email') {
          try {

            var subsidiari = RCD_OBJ.getValue({
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

          if (OBJ_FORM != '' && OBJ_FORM != null) {
            //Se obtiene el feature de General Preferencpara saber si se debe de ocultar
            //Las columnas, los Cust Bodys y las Sublist.
            var hide_transaction = Library_Mail.getHideView(country, 2, licenses);
            var hide_sublist = Library_Mail.getHideView(country, 5, licenses);
            var hide_column = Library_Mail.getHideView(country, 3, licenses);

            var TypeCH = RCD_OBJ.type;
            //Proceso para hacer HideView para el create
            //getCountryOfAccess Verifica si el feature localizacion de LatamReady Feature está activado.
            if (Library_Mail.getCountryOfAccess(country, licenses)) {
              if (hide_sublist == true) {
                //Oculta los campos Cust Record
                library_hideview3.PxHideSubTab(OBJ_FORM, country[0], TypeCH);
              }
              if (hide_column == true) {
                //Oculta los campos Column
                library_hideview3.PxHideColumn(OBJ_FORM, country[0], TypeCH);
              }
              if (hide_transaction == true) {
                //Oculta los campos Body
                library_hideview3.PxHide(OBJ_FORM, country[0], TypeCH);
              }
              //Si no está activado se mostrara los campos globales.
            } else {
              if (hide_sublist == true) {
                //Oculta los campos Cust Record
                library_hideview3.PxHideSubTab(OBJ_FORM, '', TypeCH);
              }
              if (hide_column == true) {
                //Oculta los campos Column
                library_hideview3.PxHideColumn(OBJ_FORM, '', TypeCH);
              }
              if (hide_transaction == true) {
                //Oculta los campos Body
                library_hideview3.PxHide(OBJ_FORM, '', TypeCH);
              }
            }
          }
        }

        if (isURET == 'view' || isURET == 'edit') {
          var subsidiary = RCD_OBJ.getValue('subsidiary');
          var country = RCD_OBJ.getValue('custbody_lmry_subsidiary_country');
          country = country_code[country];

          if (country == 'CL') {
            var searchObj = search.create({
              type: 'customrecord_lmry_setup_tax_subsidiary',
              columns: ['custrecord_lmry_setuptax_currency'],
              filters: [
                ['isinactive', 'is', 'F'], 'AND', ['custrecord_lmry_setuptax_subsidiary', 'is', subsidiary]
              ]
            });
            searchObj = searchObj.run().getRange(0, 1);

            if (searchObj != null && searchObj != '') {
              var currency = searchObj[0].getValue('custrecord_lmry_setuptax_currency');
              /* Solo si los dos campos son iguales muestra el boton */
              if (currency != RCD_OBJ.getValue('currency') && Library_Mail.getAuthorization(398, licenses)) {
                if (RCD_OBJ.getValue('custbody_lmry_reference_transaction') == '' && 'closed' != RCD_OBJ.getValue('statusRef')) {
                  OBJ_FORM.clientScriptModulePath = './LMRY_RecordSalesCLNT_V2.0.js';
                  OBJ_FORM.addButton({
                    id: 'custpage_button',
                    label: lblBoton,
                    functionName: 'transformCLP()'
                  });
                } else {
                  OBJ_FORM.removeButton('createsalesord');
                  OBJ_FORM.removeButton('createcashsale');
                  OBJ_FORM.removeButton('createinvoice');
                }
              }
            }
          }
        }

        if (isURET != 'print' && isURET != 'email') {
          RSUret_ValidateAccess(RCD_OBJ.getValue({
            fieldId: 'subsidiary'
          }), OBJ_FORM, isURET, RCD_OBJ);

          if (ST_FEATURE == true || ST_FEATURE == "T") {

            if (["copy", "xcopy"].indexOf(scriptContext.type) != -1) {
              switch (LMRY_countr[0]) {
                case "MX":
                  MX_STE_TaxLibrary.deleteTaxDetailLines(RCD_OBJ);
                  break;
              }
            }

            if (["copy", "create"].indexOf(scriptContext.type) != -1) {
              switch (LMRY_countr[0]) {
                case "MX":
                  MX_STE_TaxLibrary.deleteTaxDetailLines(RCD_OBJ);
                  break;
              }
            }

          }

          if (LMRY_countr[0] == 'BR') {
            //Si se copia la transaccion. Se limpian los valores para calculo de impuesto BR.
            if (scriptContext.type == 'copy' || scriptContext.type == 'xcopy') {
              Library_WHT_Transaction.cleanLinesforCopy(RCD_OBJ, licenses);
            }


            if (scriptContext.type == 'create') {
              var createdFrom = RCD_OBJ.getValue({
                fieldId: 'createdfrom',
              });

              //Si se crea una transaccion desde otra, se limpian los valores para calculo de impuesto BR.
              if (createdFrom) {
                Library_WHT_Transaction.cleanLinesforCopy(RCD_OBJ, licenses);
              }
            }
          }

        }

        if (isURET == 'view') {
          var recordID = RCD_OBJ.id;

          switch (LMRY_countr[0]) {
            //Pedimentos, en caso ya se haya registrado en el record "LatamReady - MX Pedimento Details"
            case 'MX':
              if (searchPediments(recordID)) {
                OBJ_FORM.removeButton('edit');
              }
              break;

            case 'CL':
              if (library_SalesOrder.validateStock(RCD_OBJ)) {
                OBJ_FORM.clientScriptModulePath = './LMRY_RecordSalesCLNT_V2.0.js';
                OBJ_FORM.addButton({
                  id: 'custpage_id_button_purchaseorder',
                  label: lblBotonCompra,
                  functionName: 'onclick_event_purchaseorder()'
                });
              }
              break;
          }
        }


        //BOTON SO CONVERTIR A MONEDA BASE
        if (isURET == 'view' && LMRY_countr[0] == 'CO' && Library_Mail.getAuthorization(597, licenses)) {

          var currencySO = RCD_OBJ.getValue('currency');
          var countrySO = RCD_OBJ.getValue('custbody_lmry_subsidiary_country');

          var searchCurrency = search.create({
            type: 'customrecord_lmry_currency_by_country',
            columns: ['custrecord_lmry_currency'],
            filters: [{
              name: 'custrecord_lmry_currency_country_local',
              operator: 'is',
              values: countrySO
            }, {
              name: 'custrecord_lmry_is_country_base_currency',
              operator: 'is',
              values: 'T'
            },
            {
              name: 'isinactive',
              operator: 'is',
              values: 'F'
            }
            ]
          });

          var resultCurrency = searchCurrency.run().getRange(0, 1);

          if (resultCurrency && resultCurrency.length) {
            if (currencySO != resultCurrency[0].getValue('custrecord_lmry_currency')) {

              var loadStyles = OBJ_FORM.addField({
                id: 'custpage_load',
                type: serverWidget.FieldType.INLINEHTML,
                label: '&nbsp;'
              });

              /*var scanHtml = '<link rel="stylesheet" type="text/css" ' +
              'href="https://system.netsuite.com/core/media/media.nl?id=525995&c=TSTDRV1038906&h=c53facdfa100b5224533&_xt=.css">';*/
              var scanHtml = '<link rel="stylesheet" type="text/css" ';
              scanHtml += 'href="https://system.netsuite.com/core/media/media.nl?id=1092475&c=TSTDRV1038906&h=1vw9x4iUHxzr-xbLf5q1asedcauEaVko4pXGehMLSEaqVmYt&_xt=.css">';
              scanHtml += '<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>';
              scanHtml += '<script type="text/javascript" src="https://system.netsuite.com/core/media/media.nl?id=1092476&c=TSTDRV1038906&h=fjxqIMdDM0eXEcY98ekrnjGQNCd4B_jGnRrX6i63OC1PUwxp&_xt=.js"></script>';

              loadStyles.defaultValue = scanHtml;

              var currCountryValue = resultCurrency[0].getValue('custrecord_lmry_currency');
              var currCountryText = resultCurrency[0].getText('custrecord_lmry_currency');

              OBJ_FORM.clientScriptModulePath = './LMRY_RecordSalesCLNT_V2.0.js';
              if (Language == 'es') {
                OBJ_FORM.addButton({
                  id: 'custpage_id_button_change',
                  label: 'Cambiar Moneda',
                  functionName: 'onclick_event_changecurrency(' + currCountryValue + ',"' + currCountryText + '")'
                });
              } else {
                OBJ_FORM.addButton({
                  id: 'custpage_id_button_change',
                  label: 'Change Currency',
                  functionName: 'onclick_event_changecurrency(' + currCountryValue + ',"' + currCountryText + '")'
                });
              }
            }
          }

        }

        if (scriptContext.type == 'create' || scriptContext.type == 'copy' || scriptContext.type == 'edit' || scriptContext.type == 'view') {
          if (LMRY_countr[0] === "BR" && Library_Mail.getAuthorization(877, licenses)) {
            libraryFleteGlobales.createCustpage(scriptContext);
          }
        }

        if (isURET != 'print' && isURET != 'email') {

          var createdFrom = RCD_OBJ.getValue('createdfrom');

          //SETEO DEL CUSTBODY LATAMREADY - BR TRANSACTION TYPE PARA FILTRAR LA COLUMNA CFOP
          if (LMRY_countr[0] == 'BR' && LMRY_access == true && (isURET == 'create' || isURET == 'edit' || isURET == 'copy')) {
            var transactionType = RCD_OBJ.getValue('custbody_lmry_br_transaction_type');
            if (!transactionType) {
              var typeStandard = RCD_OBJ.getValue('type');
              if (typeStandard) {
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
                if (resultTransactionType && resultTransactionType.length) {
                  RCD_OBJ.setValue('custbody_lmry_br_transaction_type', resultTransactionType[0].getValue('internalid'));
                }

              }
            }
          }

          //CL CHANGE CURRENCY UF: SOLO TRANSFORM Y MAKE COPY
          if (LMRY_countr[0] == 'CL' && Library_Mail.getAuthorization(604, licenses) && ((isURET == 'create' && createdFrom) || isURET == 'copy')) {

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

            var currencyTransaction = RCD_OBJ.getValue('currency');
            var tranDate = RCD_OBJ.getValue('trandate');

            if (jsonCurrencies[currencyTransaction]['symbol'] == 'CLP' && fieldRateUF && RCD_OBJ.getField(fieldRateUF)) {

              var rateUF = currencyModule.exchangeRate({
                source: 'CLF',
                target: 'CLP',
                date: tranDate
              });
              RCD_OBJ.setValue(fieldRateUF, parseFloat(rateUF));

              for (var i = 0; i < RCD_OBJ.getLineCount({
                sublistId: 'item'
              }); i++) {

                var amountUF = RCD_OBJ.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'custcol_lmry_prec_unit_so',
                  line: i
                });
                var quantity = RCD_OBJ.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'quantity',
                  line: i
                });

                if (parseFloat(amountUF) > 0 && parseFloat(rateUF) > 0) {

                  amountUF = parseFloat(amountUF) * parseFloat(rateUF);
                  amountUF = parseFloat(amountUF).toFixed(0);

                  RCD_OBJ.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: i,
                    value: amountUF
                  });

                  amountUF = parseFloat(quantity) * parseFloat(amountUF);

                  RCD_OBJ.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i,
                    value: amountUF
                  });

                }

              }


            }

          } //FIN CL CHANGE CURRENCY

        }

        if (scriptContext.type == "copy" && LMRY_countr[0] == "MX" && Library_Mail.getAuthorization(672, licenses) == true) {
          libraryTaxWithholding.resetLines(RCD_OBJ);
        }

        if (LMRY_countr[0] == 'AR') {
          //Library_AutoPercepcionDesc.removePerceptionLines(RCD_OBJ);
        }


      } catch (err) {
        Library_Mail.sendemail(' [ beforeLoad ] ' + err, LMRY_script);
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
        RCD_OBJ = scriptContext.newRecord;
        var subsidiary = RCD_OBJ.getValue('subsidiary');

        // SuiteTax
        ST_FEATURE = runtime.isFeatureInEffect({
          feature: 'tax_overhauling'
        });

        licenses = Library_Mail.getLicenses(subsidiary);

        LMRY_countr = Library_Mail.Validate_Country(subsidiary);

        if (ST_FEATURE == true || ST_FEATURE == "T") {
          if (scriptContext.type == "delete") {
            switch (LMRY_countr[0]) {
              case "MX":
                if (Library_Mail.getAuthorization(672, licenses) == true) {
                  MX_STE_TaxLibrary.deleteTaxResult(RCD_OBJ.id);
                }
                break;
            }
          }
        }

        if (scriptContext.type == 'create' || scriptContext.type == 'copy' || scriptContext.type == 'edit' || scriptContext.type == 'view') {
          if (LMRY_countr[0] === "BR" && Library_Mail.getAuthorization(877, licenses)) {
            libraryFleteGlobales.insertItemFlete(scriptContext);
          }
        }

        if (LMRY_countr[0] == 'BR') {
          if (Library_Mail.getAuthorization(147, licenses) == true) {
            Library_WHT_Transaction.beforeSubmitTransaction(scriptContext);
          }
        }

        if (scriptContext.type == "delete" && LMRY_countr[0] == "MX" && Library_Mail.getAuthorization(672, licenses) == true) {
          var id_delete = RCD_OBJ.id;
          log.debug("id_delete", id_delete);
          libraryTaxWithholding._inactiveRelatedRecord(id_delete);
        }
        var type = RCD_OBJ.getValue('baserecordtype');
        if (LMRY_countr[0] == 'CL' && type == 'salesorder') {
          //BUSQUEDA PARA LLENADO DE CAMPOS AUTOMATICOS PARA FACTURACION
          var jsonTxCode = {}
          var searchTxCode = search.create({
            type: "customrecord_lmry_taxtype_by_invoicingid",
            filters: [
              ["custrecord_lmry_taxtype_country", "anyof", "45"],
              "AND",
              ["isinactive", "is", "F"]
            ],
            columns: [
              search.createColumn({
                name: "custrecord_lmry_tax_code_invid",
                label: "Latam - Tax Code by Inv ID"
              }),
              search.createColumn({
                name: "custrecord_lmry_inv_id",
                label: "Latam - Invoicing ID"
              })
            ]
          });
          var runSearch = searchTxCode.run().getRange(0, 1000);
          for (var i = 0; i < runSearch.length; i++) {
            var columns = runSearch[i].columns
            jsonTxCode[runSearch[i].getValue(columns[0])] = runSearch[i].getValue(columns[1]);
          }
          var lineas = RCD_OBJ.getLineCount("item")
          for (var i = 0; i < lineas; i++) {
            var txcode = RCD_OBJ.getSublistValue("item", "taxcode", i);
            var inviden = RCD_OBJ.getSublistValue("item", "custcol_lmry_invoicing_id", i);
            if (jsonTxCode[txcode] && !inviden) {
              RCD_OBJ.setSublistValue("item", "custcol_lmry_invoicing_id", i, jsonTxCode[txcode])
            }
          }
        }

        var LMRY_Result = ValidateAccessTransaction(RCD_OBJ);
        if (scriptContext.type != 'delete') {
          // Para todos los paises que tengan acceso
          log.debug('LMRY_Result', LMRY_Result);
          if (LMRY_Result[2] == true && RCD_OBJ.getValue({ fieldId: 'memo' }) != 'VOID') {
            /*************************************
           * Auto Percepcions para Argentina,
           *************************************/
            /*var swAutoPe = false;
            if (LMRY_Result[0] == 'AR') {
              swAutoPe = Library_Mail.getAuthorization(142, licenses);
            }
            // Si hay acceso Procesa
            if (ST_FEATURE == false || ST_FEATURE == "F") {
              if (swAutoPe) {
                // Realiza el seteo de percepciones
                Library_AutoPercepcionDesc.autoperc_beforeSubmit(scriptContext, LMRY_Result[0], scriptContext.type);
              }
            }*/

          }
        }

      } catch (err) {
        Library_Mail.sendemail(' [ beforeSubmit ] ' + err, LMRY_script);
        log.error('Error', err)
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
        var RCD_OBJ = scriptContext.newRecord;
        var subsidiary = RCD_OBJ.getValue('subsidiary');

        // SuiteTax
        ST_FEATURE = runtime.isFeatureInEffect({
          feature: 'tax_overhauling'
        });

        licenses = Library_Mail.getLicenses(subsidiary);

        LMRY_countr = Library_Mail.Validate_Country(subsidiary);

        if (LMRY_countr[0] == 'BR') {
          if (Library_Mail.getAuthorization(147, licenses) == true) {
            Library_WHT_Transaction.afterSubmitTransaction(scriptContext, true);
          }

          if (["create", "edit", "copy"].indexOf(scriptContext.type) != -1 && Library_Mail.getAuthorization(877, licenses)) {
            libraryFleteGlobales.updateBrTransactionField(scriptContext);
          }
        }

        /*if(LMRY_countr[0] == 'AR' && Library_Mail.getAuthorization(142, licenses) && ["create", "edit", "copy"].indexOf(scriptContext.type) != -1){
          Library_AutoPercepcionDesc.autopercAfterSubmit(scriptContext, LMRY_countr[0], scriptContext.type);
        }*/

        /*****************************************************
         Update Transaction Fields Peru
         -----------------------------------------------------
         User : Richard Galvez Lopez
         Date : 18/11/2021
        ******************************************************/
        PE_libMapTransactions.updateTransactionFields(scriptContext);
        /*****************************************************/

        if (["create", "edit", "copy"].indexOf(scriptContext.type) != -1) {
          // Suite Taxes
          if (ST_FEATURE == true || ST_FEATURE == "T") {

            switch (LMRY_countr[0]) {
              case "MX":
                if (Library_Mail.getAuthorization(672, licenses) == true) {
                  MX_STE_TaxLibrary.setTaxTransaction(scriptContext);
                }
                break;
            }

          } else {
            // Legacy Taxes
            var typeTransaction = RCD_OBJ.getValue('baserecordtype');
            //log.debug('typeTransaction', typeTransaction);
            if (typeTransaction == "salesorder") {
              var currentRCD = record.load({
                type: "salesorder",
                id: RCD_OBJ.id,
                isDynamic: true
              });
            } else if (typeTransaction == "estimate") {
              var currentRCD = record.load({
                type: 'estimate',
                id: RCD_OBJ.id,
                isDynamic: true
              });
            }
            var actionType = scriptContext.type;
            if (["create", "edit"].indexOf(actionType) != -1) {
              switch (LMRY_countr[0]) {
                case "MX":
                  var Crear_TaxResult = Library_Mail.getAuthorization(969, licenses) || false;
                  var Global_Disc = Library_Mail.getAuthorization(898, licenses) || false;
                  if (Library_Mail.getAuthorization(672, licenses) == true) {
                    log.debug("Crear_TaxResult", Crear_TaxResult);
                    libraryTaxWithholding.LatamTaxWithHoldingMX(currentRCD, Crear_TaxResult, actionType, Global_Disc);
                  }
                  break;
              }
            }
          } // Fin - Legacy Taxes
        }

        var actionType = scriptContext.type;
        if (LMRY_countr[0] == 'AR' && (actionType == 'create' || actionType == 'edit' || actionType == 'copy')) {

          //Library_AutoPercepcionDesc.processDiscount(scriptContext);
          if (Library_Mail.getAuthorization(142, licenses)) {
            // Realiza el seteo de percepciones
            Library_AutoPercepcionDesc.processPerception(scriptContext, LMRY_countr[0], scriptContext.type);
          }

        }

      } catch (err) {
        log.error('err', err);
        Library_Mail.sendemail(' [ afterSubmit ] ' + err, LMRY_script);
      }
    }

    function RSUret_ValidateAccess(ID, OBJ_FORM, isURET, RCD_OBJ) {
      try {

        // Inicializa variables Locales y Globales
        LMRY_access = false;
        LMRY_countr = Library_Mail.Validate_Country(ID);
        //Nombre de la transaccion
        var typeT = RCD_OBJ.type;
        // Verifica que el arreglo este lleno
        if (LMRY_countr.length < 1) {
          return true;
        }

        // Solo si tiene acceso
        //getCountryOfAccess Verifica si el feature localizacion de LatamReady Feature está activado.
        LMRY_access = Library_Mail.getCountryOfAccess(LMRY_countr, licenses);


      } catch (err) {
        Library_Mail.sendemail(' [ RSUret_ValidateAccess ] ' + err, LMRY_script);
      }
      return true;
    }

    function searchPediments(obj_ped) {
      try {

        //Busca si la transacción ya se registró en el record LatamReady - MX Pediments Detail
        var search_ped = search.create({
          type: 'customrecord_lmry_mx_pedimento_details',
          filters: [{
            name: 'custrecord_lmry_mx_ped_trans_ref',
            operator: 'is',
            values: obj_ped
          }],
          columns: ['internalid']
        });

        var result_ped = search_ped.run().getRange({
          start: 0,
          end: 1
        });

        if (result_ped != null && result_ped.length > 0) {
          return true;
        } else {
          return false;
        }

      } catch (err) {
        log.error('searchPediments', err);
        Library_Mail.sendemail2(' [ searchPediments ] ' + err, LMRY_script, RCD_OBJ, 'tranid', 'entity');
      }
    }

    function ValidateAccessTransaction(RCD) {
      try {

        var ID = RCD.getValue({ fieldId: 'subsidiary'});
        var LMRY_countr = Library_Mail.Validate_Country(ID);
        var LMRY_access = false;
        var LMRY_Result = ['', '-None-', LMRY_access];

        if (LMRY_countr.length < 1) {
          return LMRY_Result;
        }

        LMRY_access = Library_Mail.getCountryOfAccess(LMRY_countr, licenses);
        LMRY_Result[0] = LMRY_countr[0];
        LMRY_Result[1] = LMRY_countr[1];
        LMRY_Result[2] = LMRY_access;
      } catch (err) {
        Library_Mail.sendemail2('[ ValidateAccessInv ] ' + err, LMRY_script, RCD, 'tranid', 'entity');

      }

      return LMRY_Result;
    }

    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    };

  });
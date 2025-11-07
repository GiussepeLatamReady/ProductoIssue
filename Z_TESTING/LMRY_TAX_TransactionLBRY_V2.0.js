/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_TAX_TransactionLBRY_V2.0.js		              ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jul 05 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

define(['N/log', 'N/util', 'N/record', 'N/search', 'N/runtime', 'N/format', 'N/suiteAppInfo', 'N/error', '../Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', "./LMRY_TAX_Withholding_LBRY_V2.0.js", '../Latam_Library/LMRY_Log_LBRY_V2.0.js'],
  function (log, util, record, search, runtime, format, suiteAppInfo, error, library, libraryWHT, lbryLog) {

    var LMRY_script = 'LMRY_TAX_TransactionLBRY_V2.0.js';
    var licenses = [];
    const GroupTypeItems = ["Group", "EndGroup"];
    var transactionTypes = {
      'invoice': 1,
      'creditmemo': 8,
      'salesorder': 2,
      'estimate': 10
    };

    var FEAT_SUBS = false;
    var FEAT_CUSTOMSEGMENTS = false;
    var DEPTMANDATORY = false;
    var LOCMANDATORY = false;
    var CLASSMANDATORY = false;
    var FEAT_MULTIBOOK = false;
    var FEAT_MULTPRICE = false;
    var IS_HYBRID = false;
    var HAS_DEDUCTION = false;

    /**************************************************************************
     * Funcion que elimina los Journal y Registros del récord "LatamReady - Tax
     * Results" en caso se elimine la transacción
     * Llamada desde el User Event del Invoice, Credit Memo, Bill y Bill Credit
     *************************************************************************/
    function beforeSubmitTransaction(scriptContext) {
      try {
        if (scriptContext.type == scriptContext.UserEventType.DELETE) {
          var recordOld = scriptContext.oldRecord;
          var recordId = recordOld.id;

          var country = recordOld.getText({
            fieldId: 'custbody_lmry_subsidiary_country'
          });

          if (country != '' && country != null) {
            country = country.substring(0, 3).toUpperCase();
          }
          var flag = validarPais(country);
          if (flag == true) {
            deleteAll(recordOld);
          }
        }
      } catch (err) {
        log.error("[ Before Submit ]", err);
        library.sendemail(' [ Before Submit ] ' + err, LMRY_script);
        lbryLog.doLog({ title: "[ beforeSubmitTransaction] ", message: err, relatedScript: LMRY_script });
      }
    }

    /*********************************************************************************************************
     * Funcion que realiza el calculo de las retenciones o impuestos.
     * Para Brasil : Llamada desde el Cliente del Invoice, Sales Order y Estimate
     *               Llamada desde el User Event del Invoice, Sales Order y Estimate
     ********************************************************************************************************/
    function afterSubmitTransaction(scriptContext, isUret, typeClnt) {
      log.error("[afterSubmitTransaction]","start")
      var recordObj = scriptContext.newRecord;
      try {
        var userObj = runtime.getCurrentUser();
        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
        var type = '';

        if (isUret) {
          type = scriptContext.type;
        } else {
          type = typeClnt;
        }

        if (type == 'create' || type == 'edit' || type == 'copy') {
          var subsidiary = 1;
          FEAT_SUBS = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
          if (FEAT_SUBS == true || FEAT_SUBS == "T") {
            subsidiary = recordObj.getValue({
              fieldId: 'subsidiary'
            });
          }

          licenses = library.getLicenses(subsidiary);
          log.error("isUret",isUret)
          if (isUret) {
            recordId = scriptContext.newRecord.id;
            transactionType = scriptContext.newRecord.type;
            calcularIBPT(recordId, transactionType, recordObj);
          }
          if (!validateMemo(recordObj)) {
            return recordObj;
          }

          var recordId = '';
          var transactionType = '';
          var wtax_wcod = '';

          if (isUret) {
            recordId = scriptContext.newRecord.id;
            transactionType = scriptContext.newRecord.type;
            if (runtime.executionContext != 'MAPREDUCE') {
              if (["invoice", "creditmemo"].indexOf(transactionType) == -1) {

                recordObj = record.load({
                  type: transactionType,
                  id: recordId,
                  isDynamic: false
                });
              }
            } else {
              libraryWHT.deleteGeneratedRecords(recordObj);
            }

            wtax_wcod = scriptContext.newRecord.getValue({
              fieldId: 'custpage_4601_witaxcode'
            });
          } else {
            recordId = scriptContext.currentRecord.id;
            transactionType = scriptContext.currentRecord.type;
            recordObj = scriptContext.currentRecord;
            wtax_wcod = recordObj.getValue({
              fieldId: 'custpage_4601_witaxcode'
            });
          }

          wtax_wcod = Number(wtax_wcod);

          if (recordObj.getValue('voided') == 'T') {
            return recordObj;
          }

          var idCountry = recordObj.getValue({
            fieldId: 'custbody_lmry_subsidiary_country'
          });

          idCountry = Number(idCountry);

          //Solo para Brasil
          if (idCountry != 30) {
            return recordObj;
          }

          // Consulta el campo de Retenciones
          if (wtax_wcod) {
            return recordObj;
          }

          FEAT_MULTIBOOK = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });
          FEAT_MULTPRICE = runtime.isFeatureInEffect({ feature: 'multprice' });

          FEAT_CUSTOMSEGMENTS = runtime.isFeatureInEffect({ feature: "customsegments" });

          DEPTMANDATORY = runtime.getCurrentUser().getPreference({ name: "DEPTMANDATORY" });
          LOCMANDATORY = runtime.getCurrentUser().getPreference({ name: "LOCMANDATORY" });
          CLASSMANDATORY = runtime.getCurrentUser().getPreference({ name: "CLASSMANDATORY" });


          IS_HYBRID = false;
          if (library.getAuthorization(722, licenses) && !library.getAuthorization(999, licenses)) {
            IS_HYBRID = recordObj.getValue("custbody_lmry_tax_tranf_gratu");
            IS_HYBRID = (IS_HYBRID == true || IS_HYBRID == "T");
          }

          log.debug("IS_HYBRID", IS_HYBRID);

          var isTaxCalculator = checkIsTaxCalculator(recordObj);
          log.debug("isTaxCalculator", isTaxCalculator);


          if (isTaxCalculator && !IS_HYBRID) {
            return recordObj;
          }

          if (type == "edit") {
            if (!isTaxCalculator || IS_HYBRID) {
              deleteAll(recordObj);
            }
          }

          var taxResults = [];

          /**********************************************************
           * Busqueda en el record: LatamReady - Setup Tax Subsidiary
           **********************************************************/
          var setupTax = getSetupTaxSubsidiary(recordObj);
          log.debug("setupTax", JSON.stringify(setupTax));

          if (!setupTax) {
            var errorObj = error.create({
              name: 'LMRY_SETUPTAX_IS_MISSING',
              message: "The record LatamReady - Setup Tax Subsidiary was not configured.",
              notifyOff: false
            });
            throw errorObj;
          }

          // Se valida si la transaccion tiene deducciones
          var deductiondocTypes = setupTax.deductionDocs;
          // Pertenece al tipo de documento, feature DEDUCTION INVOICE activo, Flujo 3
          if (deductiondocTypes.indexOf(recordObj.getValue("custbody_lmry_document_type")) != -1 && library.getAuthorization(999, licenses) && setupTax.taxFlow == 4 && transactionType == "invoice") {
            HAS_DEDUCTION = true;
          }
          log.debug("HAS_DEDUCTION", HAS_DEDUCTION);

          // Si se debe filtrar por Location y el Location de la transaccion está vacio, no realiza el flujo
          if (setupTax.filterLoc && !recordObj.getValue("location")) {
            return recordObj;
          }

          if (isUret == false && (setupTax.taxFlow == 2 || setupTax.taxFlow == 4)) { // si es un CLNT y parte del gross (flujo 1 y flujo 3)
            return recordObj;
          }

          /*******************************************************************************************
           * Obtención del ExchangeRate de la transaccion o Multibook para la conversión a moneda base
           *******************************************************************************************/
          var exchangeRate = getExchangeRate(recordObj, setupTax.currency);
          log.debug("exchangeRate", exchangeRate);

          //Se obtiene la concatenacion de los libros contables para Servicios/Inventory - Item. Para Sin Multibook 0&ExchangeRate
          // var concatAccountBooks = concatenarAccountingBooks(recordObj);

          var discountAmounts = getDiscountAmounts(recordObj);
          log.debug("discountAmounts", JSON.stringify(discountAmounts));

          if (type == "edit") {
            resetLines(recordObj, setupTax);
          }

          var mvaRecords = {};
          if (setupTax.taxFlow == 4) {
            mvaRecords = getmvaRecords(recordObj);
            log.debug("mvaRecords", JSON.stringify(mvaRecords));
          }

          var customSegments = [];
          if (FEAT_CUSTOMSEGMENTS == true || FEAT_CUSTOMSEGMENTS == "T") {
            customSegments = getCustomSegments();
            log.debug("customSegments", customSegments);
          }

          var nts = getNationalTaxes(recordObj, setupTax);
          log.debug("nts", JSON.stringify(nts));
          var taxResults = calculateTaxesByItem(recordObj, nts, setupTax, mvaRecords, discountAmounts, exchangeRate, customSegments);

          var ccs = getContributoryClasses(recordObj, setupTax);
          log.debug("ccs", JSON.stringify(ccs));
          var ccTaxResults = calculateTaxesByItem(recordObj, ccs, setupTax, mvaRecords, discountAmounts, exchangeRate, customSegments);
          taxResults = taxResults.concat(ccTaxResults);
          log.debug("taxResults", JSON.stringify(taxResults));

          var amounts = updateLines(recordObj, setupTax, taxResults);
          log.debug("amounts", JSON.stringify(amounts));

          //Se actualiza los montos gross de los tax results
          taxResults.forEach(function (tr) {
            if (amounts.hasOwnProperty(tr.position)) {
              var grossAmt = amounts[tr.position].grossAmt || 0.00;
              var lc_grossAmount = grossAmt;

              if (exchangeRate != 1) {
                lc_grossAmount = grossAmt * exchangeRate;
              }

              tr.grossAmount = grossAmt;
              tr.lc_grossAmount = lc_grossAmount;
            }
          });

          if (setupTax.taxFlow == 4) {
            addTaxItems(recordObj, taxResults, setupTax.department, setupTax.class_, setupTax.location);
          }

          var steId = createSteTaxRecord(recordObj, taxResults);
          log.debug("steId", steId);

          if (runtime.executionContext != 'MAPREDUCE') {
            setEiTaxesEncryptionKey(recordObj, taxResults);
          }

          if (isUret) { // Si es Flujo 1 o 3 o no tiene retenciones
            if (runtime.executionContext != 'MAPREDUCE') {
              /* ********************************************************
               * 2025.02.13 => se confirma la aplicacion a la transaccion
               * Hace que siempre se aplique al 100%.
               * Se cancelo el proceso la aplicacion.
               * ******************************************************* */
              // if (transactionType == 'creditmemo' && false) {
              //   var transactionId = recordObj.getValue('createdfrom');
              //   var numberApply = recordObj.getLineCount('apply');
              //   for (var i = 0; i < numberApply; i++) {
              //     var lineId = recordObj.getSublistValue('apply', 'internalid', i);
              //     if (Number(lineId) == transactionId) {
              //       recordObj.setSublistValue('apply', 'apply', i, true);
              //     }
              //   }
              // } // Credit Memo

              if (["invoice", "creditmemo"].indexOf(transactionType) == -1) {
                recordObj.save({ ignoreMandatoryFields: true, disableTriggers: true, enableSourcing: true });
              }
            }
          }

          if (isUret && (library.getAuthorization(596, licenses) || runtime.executionContext == "MAPREDUCE")) {
            createTaxResults(recordObj, taxResults);
          }
        } // Fin If create, edit o copy
      } catch (err) {
        log.error("[ afterSubmitTransaction ]", err);
        library.sendemail(' [ After Submit ] ' + err, LMRY_script);
        lbryLog.doLog({ title: "[ afterSubmitTransaction ] ", message: err, relatedScript: LMRY_script });
      }

      return recordObj;
    }

    /********************************************************
         * Funcion que realiza el cálculo de los tributos
         aproximados
         * Parámetros :
         *      recordId : ID de la transacción
         *      transactionType : Tipo de transacción
         *      recordObj : Objeto de la transacción
         ********************************************************/

    function calcularIBPT(recordId, transactionType, recordObj) {
      try {

        var idCountry = recordObj.getValue({ fieldId: 'custbody_lmry_subsidiary_country' });
        var fecha = recordObj.getValue({ fieldId: "trandate" });
        fecha = format.format({ value: fecha, type: format.Type.DATE });

        //Suma de tributos aproximados Federal Nacional
        var sumFedNac = 0;
        //Suma de tributos aproximados Federal Importación
        var sumFedImp = 0;
        //Suma de tributos aproximados Estadual
        var sumEst = 0;
        //Suma de tributos aproximados Municipal
        var sumMun = 0;
        var exchangeRate = 1;
        log.error("idCountry",idCountry)
        if (idCountry == 30 && transactionType == 'invoice') {

          var cantidad_items = recordObj.getLineCount({ sublistId: 'item' });
          var catalogs = [];
          
          //D2129
          var items = [];
          for (var i = 0; i < cantidad_items; i++) {
            var catalogLine = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_br_service_catalog', line: i }) || "";
            catalogLine = Number(catalogLine);
            if (catalogLine && catalogs.indexOf(catalogLine) == -1) {
              catalogs.push(catalogLine);
            }
            //D2129
            var iditem = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }) || "";
            iditem = Number(iditem);
            if (iditem && items.indexOf(iditem) == -1) {
              items.push(iditem);
            }
          }
          var originJson = {};

          var itemOriginSearch = search.create({
            type: 'serviceitem',
            filters: [
              ["isinactive", "is", "F"], "AND",
              ["internalid", "anyof", items]
            ],
            columns: ["internalid", "custitem_smc_br_origem_do_item"]
          });

          var resultsItemOrigin = itemOriginSearch.run().getRange(0, 1000);
          if (resultsItemOrigin && resultsItemOrigin.length) {
            for (var i = 0; i < resultsItemOrigin.length; i++) {
              var itemOrigin = resultsItemOrigin[i].getValue("custitem_smc_br_origem_do_item") || "";
              var itemId = resultsItemOrigin[i].getValue("internalid") || "";
              //1: nacional
              //2: importado
              originJson[itemId] = Number(itemOrigin);
            }
          }
          log.error("catalogs",catalogs)
          if (catalogs.length) {
            var catalogLawItem = {};
            var catalogSearch = search.create({
              type: 'customrecord_lmry_br_catalog_item',
              filters: [
                ["isinactive", "is", "F"], "AND",
                ["internalid", "anyof", catalogs]
              ],
              columns: ["internalid", "custrecord_lmry_br_catalog_law_item"]
            });

            var results = catalogSearch.run().getRange(0, 1000);
            if (results && results.length) {
              for (var i = 0; i < results.length; i++) {
                var catalogId = results[i].getValue("internalid");
                var lawItem = results[i].getValue("custrecord_lmry_br_catalog_law_item") || "";
                lawItem = lawItem.trim();
                lawItem = lawItem.replace(/\./g, '');

                if (!catalogLawItem.hasOwnProperty(catalogId) && lawItem) {
                  catalogLawItem[catalogId] = { lawItem: lawItem }; //Relacion cada catalogo con su codigo
                }
              }
            }

            log.error("catalogLawItem", JSON.stringify(catalogLawItem));

            if (Object.keys(catalogLawItem).length) {
              var ibpt = {};
              var orFilter = [];

              var subsidiary = 1;
              if (FEAT_SUBS == true || FEAT_SUBS == "T") subsidiary = recordObj.getValue({ fieldId: 'subsidiary' });
              if (library.getAuthorization(993, licenses)) {
                var subsidiarySrch = search.create({
                  type: "subsidiary",
                  filters: [
                    ["internalid", "anyof", subsidiary]
                  ],
                  columns: [
                    search.createColumn({
                      name: "custrecord_lmry_addr_prov",
                      join: "address"
                    })
                  ]
                });
                if (subsidiarySrch) subsidiarySrch = subsidiarySrch.run().getRange(0, 1);
                var province = '';
                if (subsidiarySrch.length > 0) province = subsidiarySrch[0].getValue({
                  name: 'custrecord_lmry_addr_prov',
                  join: 'address'
                });
                if (!province || province == '') province = "@NONE@";
              }

              for (var k in catalogLawItem) {
                orFilter.push("OR", ["name", "is", catalogLawItem[k].lawItem]);
              }

              orFilter = orFilter.slice(1);

              var searchIBPT = search.create({
                type: 'customrecord_lmry_br_ibpt',
                columns: ['name', 'custrecord_lmry_ibpt_porc_fed_nac', 'custrecord_lmry_ibpt_porc_fed_imp', 'custrecord_lmry_ibpt_porc_est', 'custrecord_lmry_ibpt_porc_mun'],
                filters: [
                  ["isinactive", "is", "F"], "AND",
                  ["custrecord_lmry_ibpt_date_from", "onorbefore", fecha], "AND",
                  ["custrecord_lmry_ibpt_date_to", "onorafter", fecha], "AND",
                  orFilter
                ]
              });

              if (library.getAuthorization(993, licenses)) {
                searchIBPT = search.create({
                  type: 'customrecord_lmry_br_ibpt',
                  columns: ['name', 'custrecord_lmry_ibpt_porc_fed_nac', 'custrecord_lmry_ibpt_porc_fed_imp', 'custrecord_lmry_ibpt_porc_est', 'custrecord_lmry_ibpt_porc_mun'],
                  filters: [
                    ["custrecord_lmry_ibpt_province", "anyof", province], "AND",
                    ["isinactive", "is", "F"], "AND",
                    ["custrecord_lmry_ibpt_date_from", "onorbefore", fecha], "AND",
                    ["custrecord_lmry_ibpt_date_to", "onorafter", fecha], "AND",
                    orFilter
                  ]
                });
              }

              var resultIBPT = searchIBPT.run().getRange(0, 1000);
              if (resultIBPT && resultIBPT.length) {
                for (var i = 0; i < resultIBPT.length; i++) {
                  var codeIBPT = resultIBPT[i].getValue("name") || "";
                  codeIBPT = codeIBPT.trim();
                  //Porcentaje Federal Nacional
                  var porcFedNac = resultIBPT[i].getValue("custrecord_lmry_ibpt_porc_fed_nac") || 0.00;
                  porcFedNac = parseFloat(porcFedNac);

                  //Porcentaje Federal de Importación
                  var porcFedImp = resultIBPT[i].getValue("custrecord_lmry_ibpt_porc_fed_imp") || 0.00;
                  porcFedImp = parseFloat(porcFedImp);

                  //Porcentaje Estadual
                  var porcEst = resultIBPT[i].getValue("custrecord_lmry_ibpt_porc_est") || 0.00;
                  porcEst = parseFloat(porcEst);

                  //Porcentaje Municipal
                  var porcMun = resultIBPT[i].getValue("custrecord_lmry_ibpt_porc_mun");
                  porcMun = parseFloat(porcMun);


                  if (codeIBPT) {
                    //relaciona el catalogo con sus valores ibpt
                    ibpt[codeIBPT] = {
                      porcFedNac: porcFedNac,
                      porcFedImp: porcFedImp,
                      porcEst: porcEst,
                      porcMun: porcMun
                    };
                  }
                }
              }

              log.error("ibpt", JSON.stringify(ibpt));

              if (Object.keys(ibpt).length) {
                exchangeRate = calcularExchangeRate(recordObj);

                for (var i = 0; i < cantidad_items; i++) {
                  var catalogLine = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_br_service_catalog', line: i }) || "";
                  var netamtItem = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }) || 0.00;
                  netamtItem = parseFloat(netamtItem);
                  var baseAmount = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_br_base_amount', line: i }) || 0.00;
                  baseAmount = parseFloat(baseAmount);
                  var itemInLine = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });

                  if (baseAmount) {
                    netamtItem = round2(baseAmount);
                  }

                  if (catalogLine && catalogLawItem.hasOwnProperty(catalogLine) && ibpt.hasOwnProperty(catalogLawItem[catalogLine].lawItem)) {
                    var ibptValues = ibpt[catalogLawItem[catalogLine].lawItem];
                    //D2129
                    if (originJson[itemInLine] == 1) {
                      //Porcentaje Federal Nacional
                      var monto_fed_nac = parseFloat(netamtItem) * (parseFloat(ibptValues.porcFedNac) / 100);
                      sumFedNac = parseFloat(sumFedNac) + round2(monto_fed_nac);
                    } else if (originJson[itemInLine] == 2) {
                      //Porcentaje Federal de Importación
                      var monto_fed_imp = parseFloat(netamtItem) * (parseFloat(ibptValues.porcFedImp) / 100);
                      sumFedImp = parseFloat(sumFedImp) + round2(monto_fed_imp);
                    }

                    //Porcentaje Estadual
                    var monto_est = parseFloat(netamtItem) * (parseFloat(ibptValues.porcEst) / 100);
                    sumEst = parseFloat(sumEst) + round2(monto_est);

                    //Porcentaje Municipal
                    var monto_mun = parseFloat(netamtItem) * (parseFloat(ibptValues.porcMun) / 100);
                    sumMun = parseFloat(sumMun) + round2(monto_mun);
                  }
                } // Fin for items

                sumFedNac = round2(sumFedNac * parseFloat(exchangeRate));
                sumFedImp = round2(sumFedImp * parseFloat(exchangeRate));
                sumEst = round2(sumEst * parseFloat(exchangeRate));
                sumMun = round2(sumMun * parseFloat(exchangeRate));

                log.error("[sumFedNac, sumFedImp, sumEst, sumMun]", [sumFedNac, sumFedImp, sumEst, sumMun].join(","));

                //Seteo de campos en el Transaction fields
                var searchTransFields = search.create({
                  type: 'customrecord_lmry_br_transaction_fields',
                  columns: ['internalid', 'custrecord_lmry_br_trib_fed_nac', 'custrecord_lmry_br_trib_fed_imp', 'custrecord_lmry_br_trib_est', 'custrecord_lmry_br_trib_mun'],
                  filters: ['custrecord_lmry_br_related_transaction', 'anyof', recordId]
                });

                var resultTransFields = searchTransFields.run().getRange(0, 2);
                if (resultTransFields != null && resultTransFields.length > 0) {
                  for (var i = 0; i < resultTransFields.length; i++) {
                    var internalID = resultTransFields[i].getValue("internalid");

                    record.submitFields({
                      type: 'customrecord_lmry_br_transaction_fields',
                      id: internalID,
                      values: {
                        custrecord_lmry_br_trib_fed_nac: sumFedNac,
                        custrecord_lmry_br_trib_fed_imp: sumFedImp,
                        custrecord_lmry_br_trib_est: sumEst,
                        custrecord_lmry_br_trib_mun: sumMun
                      },
                      options: {
                        ignoreMandatoryFields: true,
                        enableSourcing: true,
                        disableTriggers: true
                      }
                    });
                  }

                } else {
                  //Si no existe record Transaction Fields, lo crea
                  var new_setrecord = record.create({ type: 'customrecord_lmry_br_transaction_fields', isDynamic: true });

                  new_setrecord.setValue('custrecord_lmry_br_related_transaction', recordId);
                  new_setrecord.setValue('custrecord_lmry_br_trib_fed_nac', sumFedNac);
                  new_setrecord.setValue('custrecord_lmry_br_trib_fed_imp', sumFedImp);
                  new_setrecord.setValue('custrecord_lmry_br_trib_est', sumEst);
                  new_setrecord.setValue('custrecord_lmry_br_trib_mun', sumMun);

                  new_setrecord.save({ ignoreMandatoryFields: true, disableTriggers: true, enableSourcing: true });
                }
              }
            }
          }
        }

      } catch (err) {
        log.error("[ calcularIBPT ]", err);
        library.sendemail(' [ calcularIBPT ] ' + err, LMRY_script);
        lbryLog.doLog({ title: "[ calcularIBPT ] ", message: err, relatedScript: LMRY_script });
      }
    }

    function calcularExchangeRate(recordObj) {
      try {
        //Feature subsidiaria
        var featureSubs = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
        var subsidiary = '';
        var exchange_rate = 1;

        if (featureSubs) {
          subsidiary = recordObj.getValue({ fieldId: 'subsidiary' });
        } else {
          subsidiary = recordObj.getValue({ fieldId: 'custbody_lmry_subsidiary_country' });
        }

        var filtros = new Array();
        filtros[0] = search.createFilter({ name: 'isinactive', operator: 'is', values: ['F'] });

        if (featureSubs) {
          filtros[1] = search.createFilter({ name: 'custrecord_lmry_setuptax_subsidiary', operator: 'is', values: [subsidiary] });
        }

        var searchSetupSubsidiary = search.create({ type: "customrecord_lmry_setup_tax_subsidiary", filters: filtros, columns: ['custrecord_lmry_setuptax_currency'] });

        var resultSearchSub = searchSetupSubsidiary.run().getRange(0, 1000);

        if (resultSearchSub.length != null && resultSearchSub.length != '' && resultSearchSub.length > 0) {
          var currencySetup = resultSearchSub[0].getValue({ name: 'custrecord_lmry_setuptax_currency' });
          exchange_rate = getExchangeRate(recordObj, currencySetup);
        }

        return exchange_rate;

      } catch (err) {
        log.error("[ calcularExchangeRate ]", err);
        library.sendemail(' [ calcularExchangeRate ] ' + err, LMRY_script);
        lbryLog.doLog({ title: "[ calcularExchangeRate ] ", message: err, relatedScript: LMRY_script });
      }
    }

    /********************************************************
     * Funcion que valida si el flujo debe correr en el pais
     * Parámetros :
     *      country : 3 primeras letras del pais
     *      createWHT : check "LatamReady - Applied WHT Code"
     ********************************************************/
    function validarPais(country) {
      try {
        if (country.toUpperCase() == "ARG" || country.toUpperCase() == "BOL" || country.toUpperCase() == "BRA" || country.toUpperCase() == "CHI" || country.toUpperCase() == "COL" || country.toUpperCase() == "COS" || country.toUpperCase() == "ECU" ||
          country.toUpperCase() == "EL " || country.toUpperCase() == "GUA" || country.toUpperCase() == "MEX" || country.toUpperCase() == "PAN" || country.toUpperCase() == "PAR" || country.toUpperCase() == "PER" || country.toUpperCase() == "URU") {
          return true;
        }
      } catch (err) {
        library.sendemail(' [ validarPais ] ' + err, LMRY_script);
      }
      return false;
    }

    /******************************************************************
     * Funcion que elimina los registros asociados a la transaccion del
     * récord "LatamReady - Tax Results" y los journals
     * Parámetros :
     *      recordId : ID de la transacción
     *****************************************************************/
    function deleteAll(recordObj) {
      try {
        if (library.getAuthorization(596, licenses) || runtime.executionContext == "MAPREDUCE") {
          deleteJsonResult(recordObj);
          deleteTaxResults(recordObj);
        } else {
          inactiveJsonResult(recordObj);
          inactiveTaxResults(recordObj);
        }

        deleteTaxLines(recordObj);
      } catch (err) {
        log.error("[ deleteAll ]", err);
        library.sendemail(' [ deleteAll ] ' + err, LMRY_script);
        lbryLog.doLog({ title: "[ deleteAll ] ", message: err, relatedScript: LMRY_script });
      }
    }

    function deleteJsonResult(recordObj) {
      if (Number(recordObj.id)) {
        var steSearch = search.create({
          type: "customrecord_lmry_ste_json_result",
          filters: [
            ["isinactive", "is", "F"], "AND",
            ["custrecord_lmry_ste_related_transaction", "anyof", Number(recordObj.id)]
          ],
          columns: ["internalid"]
        });
        var results = steSearch.run().getRange(0, 1000);
        if (results && results.length > 0) {
          for (var i = 0; i < results.length; i++) {
            var internalid = results[i].getValue('internalid');
            record.delete({
              type: 'customrecord_lmry_ste_json_result',
              id: Number(internalid)
            });
          }
        }
      }
    }

    function deleteTaxResults(recordObj) {
      if (recordObj.id) {
        try {
          var filters = [
            ['custrecord_lmry_br_transaction', 'is', recordObj.id], "AND",
            ['custrecord_lmry_tax_type', 'anyof', "4"]
          ];

          var type = recordObj.getValue('baserecordtype');

          //BR
          if (type == 'vendorbill') {
            filters.push('AND', ['custrecord_lmry_created_from_script', 'is', '1']);
          }

          var searchTaxResults = search.create({
            type: 'customrecord_lmry_br_transaction',
            filters: filters,
            columns: ['internalid']
          });

          var results = searchTaxResults.run().getRange(0, 1000);
          if (results) {
            for (var i = 0; i < results.length; i++) {
              var internalid = results[i].getValue('internalid');
              record.delete({
                type: 'customrecord_lmry_br_transaction',
                id: internalid
              });
            }
          }
        } catch (err) {
          log.error("[ deleteTaxResults ]", err);
          library.sendemail(' [ deleteTaxResults ] ' + err, LMRY_script);
          lbryLog.doLog({ title: "[ deleteTaxResults ] ", message: err, relatedScript: LMRY_script });
        }
      }
    }

    function inactiveJsonResult(recordObj) {
      if (Number(recordObj.id)) {
        var steSearch = search.create({
          type: "customrecord_lmry_ste_json_result",
          filters: [
            ["isinactive", "is", "F"], "AND",
            ["custrecord_lmry_ste_related_transaction", "anyof", Number(recordObj.id)]
          ],
          columns: ["internalid"]
        });
        var results = steSearch.run().getRange(0, 1000);
        if (results && results.length > 0) {
          for (var i = 0; i < results.length; i++) {
            var internalid = results[i].getValue('internalid');
            record.submitFields({
              type: "customrecord_lmry_ste_json_result",
              id: Number(internalid),
              values: {
                "isinactive": true
              },
              options: {
                enableSourcing: true, ignoreMandatoryFields: true,
                disableTriggers: true
              }
            })
          }
        }
      }
    }

    function inactiveTaxResults(recordObj) {
      if (recordObj.id) {
        var searchTaxResults = search.create({
          type: 'customrecord_lmry_br_transaction',
          filters: [
            ["isinactive", "is", "F"], "AND",
            ["custrecord_lmry_br_transaction", "anyof", recordObj.id], "AND",
            ["custrecord_lmry_tax_type", "anyof", "4"]
          ],
          columns: ['internalid']
        });

        var results = searchTaxResults.run().getRange(0, 1000);
        if (results && results.length > 0) {
          for (var i = 0; i < results.length; i++) {
            var tr_id = results[i].getValue('internalid');
            record.submitFields({
              type: "customrecord_lmry_br_transaction",
              id: Number(tr_id),
              values: {
                "isinactive": true
              },
              options: {
                enableSourcing: true, ignoreMandatoryFields: true,
                disableTriggers: true
              }
            })
          }
        }
      }
    }

    /********************************************************
     * Concatena los libros contables en caso tenga Multibook
     ********************************************************/
    function concatenarAccountingBooks(recordObj) {
      var auxBookMB = 0;
      var auxExchangeMB = recordObj.getValue({
        fieldId: 'exchangerate'
      });

      if (FEAT_MULTIBOOK == true || FEAT_MULTIBOOK == "T") {
        var lineasBook = recordObj.getLineCount({
          sublistId: 'accountingbookdetail'
        });
        if (lineasBook != null & lineasBook != '') {
          for (var j = 0; j < lineasBook; j++) {
            var lineaBook = recordObj.getSublistValue({
              sublistId: 'accountingbookdetail',
              fieldId: 'accountingbook',
              line: j
            });
            var lineaExchangeRate = recordObj.getSublistValue({
              sublistId: 'accountingbookdetail',
              fieldId: 'exchangerate',
              line: j
            });
            auxBookMB = auxBookMB + '|' + lineaBook;
            auxExchangeMB = auxExchangeMB + '|' + lineaExchangeRate;
          }
        }
      } // Fin Multibook
      return auxBookMB + '&' + auxExchangeMB;
    }

    function cleanLinesforCopy(RCD_TRANS, LICENSES) {
      try {
        var numLineas = RCD_TRANS.getLineCount({
          sublistId: 'item'
        });

        var featureMultiPrice = runtime.isFeatureInEffect({ feature: 'multprice' });

        RCD_TRANS.setValue({ fieldId: 'custbody_lmry_informacion_adicional', value: '' });

        var featureCopy = false;
        if (LICENSES) {
          featureCopy = library.getAuthorization(320, LICENSES);
        }

        for (var i = 0; i < numLineas; i++) {

          var isItemTax = RCD_TRANS.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_ar_item_tributo', line: i });
          var typeDiscount = RCD_TRANS.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_col_sales_type_discount', line: i });
          var itemType = RCD_TRANS.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });

          if ((!isItemTax || isItemTax == 'F') && !typeDiscount && GroupTypeItems.indexOf(itemType) == -1) {
            RCD_TRANS.setSublistValue('item', 'custcol_lmry_br_taxc_rsp', i, '');

            if (library.getAuthorization(866, LICENSES) == false) {
              if (RCD_TRANS.getSublistField({ sublistId: 'item', fieldId: 'custcol_lmry_br_freight_val', line: i })) {
                RCD_TRANS.setSublistValue('item', 'custcol_lmry_br_freight_val', i, '');
              }

              if (RCD_TRANS.getSublistField({ sublistId: 'item', fieldId: 'custcol_lmry_br_insurance_val', line: i })) {
                RCD_TRANS.setSublistValue('item', 'custcol_lmry_br_insurance_val', i, '');
              }

              if (RCD_TRANS.getSublistField({ sublistId: 'item', fieldId: 'custcol_lmry_br_expens_val', line: i })) {
                RCD_TRANS.setSublistValue('item', 'custcol_lmry_br_expens_val', i, '');
              }
            }

            if (featureCopy == true) {
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
                RCD_TRANS.setSublistValue('item', 'taxrate1', i, '0%');
                RCD_TRANS.setSublistValue('item', 'tax1amt', i, 0);
                RCD_TRANS.setSublistValue('item', 'grossamt', i, round2(base_amount));
                RCD_TRANS.setSublistValue('item', 'custcol_lmry_br_base_amount', i, '');
                RCD_TRANS.setSublistValue('item', 'custcol_lmry_br_total_impuestos', i, '');
              }
            }
          }
        }

        deleteTaxLines(RCD_TRANS);

      } catch (err) {
        log.error("[ cleanLinesforCopy ]", err);
        library.sendemail(' [ cleanLinesforCopy ] ' + err, LMRY_script);
        lbryLog.doLog({ title: "[ cleanLinesforCopy] ", message: err, relatedScript: LMRY_script });
      }
    }

    function deleteTaxLines(recordObj) {
      var ST_FEATURE = runtime.isFeatureInEffect({ feature: 'tax_overhauling' });
      var subsi = recordObj.getValue("subsidiary");

      var Arr_id_items = [];

      var ItemSearch = search.create({
        type: "customrecord_lmry_br_items_of_amount",
        filters:
          [
            ["custrecord_lmry_br_ai_subsidiary", "anyof", subsi]
          ],
        columns:
          [
            search.createColumn('custrecord_lmry_br_ai_other_expens'),
            search.createColumn('custrecord_lmry_br_ai_insurance'),
            search.createColumn('custrecord_lmry_br_ai_discount'),
            search.createColumn('custrecord_lmry_br_ai_freight'),
            search.createColumn('custrecord_lmry_br_ai_other_expens_sale'),
            search.createColumn('custrecord_lmry_br_ai_insurance_sale'),
            search.createColumn('custrecord_lmry_ai_discount_sale'),
            search.createColumn('custrecord_lmry_br_ai_freight_sale')
          ]
      });

      var ItemSearchResult = ItemSearch.run().getRange(0, 1000);

      for (var i = 0; i < ItemSearchResult.length; i++) {
        Arr_id_items.push(ItemSearchResult[i].getValue('custrecord_lmry_br_ai_freight_sale'));
        Arr_id_items.push(ItemSearchResult[i].getValue('custrecord_lmry_ai_discount_sale'));
        Arr_id_items.push(ItemSearchResult[i].getValue('custrecord_lmry_br_ai_insurance_sale'));
        Arr_id_items.push(ItemSearchResult[i].getValue('custrecord_lmry_br_ai_other_expens_sale'));
        Arr_id_items.push(ItemSearchResult[i].getValue('custrecord_lmry_br_ai_freight'));
        Arr_id_items.push(ItemSearchResult[i].getValue('custrecord_lmry_br_ai_discount'));
        Arr_id_items.push(ItemSearchResult[i].getValue('custrecord_lmry_br_ai_insurance'));
        Arr_id_items.push(ItemSearchResult[i].getValue('custrecord_lmry_br_ai_other_expens'));
      }

      Arr_id_items = Arr_id_items.filter(function (i) { return i; });

      log.debug('Arr_id_items', Arr_id_items);
      if (Arr_id_items.length > 0) {
        while (true) {
          var idxRemove = -1;
          var currentNumberLine = recordObj.getLineCount({
            sublistId: 'item'
          });
          for (var i = currentNumberLine - 1; i >= 0; i--) {
            var itemaux = recordObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              line: i
            });

            if (itemaux && Arr_id_items.indexOf(itemaux) != -1) {
              continue;
            }
            var isItemTax = recordObj.getSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_lmry_ar_item_tributo',
              line: i
            });
            if (isItemTax || isItemTax == 'T') {
              idxRemove = i;
              break;
            }
          }

          if (idxRemove > -1) {
            recordObj.removeLine({
              sublistId: 'item',
              line: idxRemove
            });
            if (ST_FEATURE == "T" || ST_FEATURE == true) {
              recordObj.removeLine({
                sublistId: 'taxdetails',
                line: idxRemove
              });
            }
          } else {
            break;
          }
        }
      }
    }

    function round2(num) {
      var e = (num >= 0) ? 1e-6 : -1e-6;
      return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
    }

    function round4(num) {
      var e = (num >= 0) ? 1e-6 : -1e-6;
      return parseFloat(Math.round(parseFloat(num) * 1e4 + e) / 1e4);
    }

    function round(num, d) {
      d = d || 2;
      var q = Math.pow(10, d);
      var e = (parseFloat(num) >= 0) ? 1e-6 : -1e-6;
      return Math.round(parseFloat(num) * q + e) / q;
    }

    function getExchangeRate(recordObj, currencySetup) {
      var exchangerate = 1;
      var featureMB = runtime.isFeatureInEffect({
        feature: "MULTIBOOK"
      });

      var featureSubs = runtime.isFeatureInEffect({
        feature: "SUBSIDIARIES"
      });

      var tran_exchangerate = recordObj.getValue({ fieldId: 'exchangerate' })

      if (featureSubs && featureMB) {

        var subsidiary = recordObj.getValue('subsidiary');
        var currencySubs = search.lookupFields({
          type: 'subsidiary',
          id: subsidiary,
          columns: ['currency']
        }).currency[0].value;

        var numLines = recordObj.getLineCount({
          sublistId: 'accountingbookdetail'
        });

        var tran_exchangerate = recordObj.getValue({
          fieldId: 'exchangerate'
        });

        if (currencySetup && currencySetup != currencySubs) {
          if (numLines) {
            for (var i = 0; i < numLines; i++) {
              var currencyMB = recordObj.getSublistValue({
                sublistId: 'accountingbookdetail',
                fieldId: 'currency',
                line: i
              });

              if (Number(currencyMB) == Number(currencySetup)) {
                exchangerate = recordObj.getSublistValue({
                  sublistId: 'accountingbookdetail',
                  fieldId: 'exchangerate',
                  line: i
                });
                break;
              }
            }
          }
        } else {
          exchangerate = tran_exchangerate
        }
      } else {
        exchangerate = tran_exchangerate
      }

      return exchangerate;
    }


    function setEiTaxesEncryptionKey(recordObj, taxResults) {
      //245636: LatamReady Electronic Invoicing
      var documentType = recordObj.getValue('custbody_lmry_document_type');
      if (Number(documentType) == 847) {
        if (suiteAppInfo.isBundleInstalled({ bundleId: 245636 }) || suiteAppInfo.isBundleInstalled({ bundleId: 243159 })) {
          try {
            require(["/SuiteBundles/Bundle 245636/EI_Library/LMRY_EI_OTH_SERV_LBRY_V2.0"], function (library_ei) {
              library_ei.encryptionKey(recordObj, taxResults);
            });
          } catch (err) {
            log.error('[After Submit - EI_Library]', err)
            lbryLog.doLog({ title: "[ set_EI_TelecommunicationsTaxes ] ", message: err, relatedScript: LMRY_script });
          }
        }
      }
    }

    function getDiscountAmounts(recordObj) {
      var ft_global_amount = library.getAuthorization(877, licenses);
      var discountAmounts = {};
      if (ft_global_amount == true) {
        log.debug('mensaje', 'entro ft getDiscount');
        var numItems = recordObj.getLineCount({ sublistId: "item" });
        var discountAmount = 0.00, currentItemPosition = -1;
        for (var i = 0; i < numItems; i++) {
          var ColDiscount = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_col_sales_discount", line: i });
          if (ColDiscount != '' && ColDiscount != null) {
            //if (Number(typeDiscount) == 0) {
            //var amount = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_col_sales_discount", line: i }) || 0.00;
            discountAmount = parseFloat(ColDiscount);
            //}
            //} else {

            //if (currentItemPosition != -1) {
            discountAmounts[String(i)] = Math.abs(discountAmount);
            //}
            currentItemPosition = i;
            discountAmount = 0.00;

          }
        }
      } else {
        if (HAS_DEDUCTION) {
          var numItems = recordObj.getLineCount({ sublistId: "item" });
          for (var i = 0; i < numItems; i++) {
            var ColDiscount = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_col_sales_discount", line: i });
            var ApplyDiscount = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_cargo_o_descuent", line: i });
            if (ColDiscount && (ApplyDiscount == true || ApplyDiscount == "T")) {
              discountAmounts[String(i)] = Math.abs(ColDiscount);
            }
          }
        } else {
          var numItems = recordObj.getLineCount({ sublistId: "item" });
          var discountAmount = 0.00, currentItemPosition = -1;
          for (var i = 0; i < numItems; i++) {
            var typeDiscount = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_col_sales_type_discount", line: i });
            if (typeDiscount) {
              if (Number(typeDiscount) == 1) {
                var amount = recordObj.getSublistValue({ sublistId: "item", fieldId: "amount", line: i }) || 0.00;
                discountAmount += parseFloat(amount);
              }
            } else {

              if (currentItemPosition != -1) {
                discountAmounts[String(currentItemPosition)] = Math.abs(discountAmount);
              }
              currentItemPosition = i;
              discountAmount = 0.00;

            }
          }
          if (currentItemPosition != -1) {
            discountAmounts[String(currentItemPosition)] = Math.abs(discountAmount);
          }
        }
      }
      return discountAmounts;
    }


    function validateMemo(recordObj) {
      var MEMOS = ["Reference VOID", "(LatamTax -  WHT)", "Latam - Interest and Penalty", "Voided Latam - WHT"];
      var memo = recordObj.getValue("memo");
      for (var i = 0; i < MEMOS.length; i++) {
        if (memo.substring(0, MEMOS[i].length) == MEMOS[i]) {
          return false;
        }
      }

      return true;
    }

    function getmvaRecords(recordObj) {
      var mvaRecords = {};
      var filters = [
        ["isinactive", "is", "F"]
      ];

      var FEAT_SUBS = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });

      if (FEAT_SUBS) {
        var subsidiary = recordObj.getValue("subsidiary");
        filters.push("AND", ["custrecord_lmry_br_mva_subsidiary", "anyof", subsidiary]);
      }

      var mvaSearch = search.create({
        type: "customrecord_lmry_br_mva",
        filters: filters,
        columns: ["internalid", "custrecord_lmry_br_mva_rate",
          "custrecord_lmry_br_mva_ncm", "custrecord_lmry_br_mva_subtype", "custrecord_lmry_br_mva_taxrate",
          "custrecord_lmry_br_mva_subtype_substi", "custrecord_lmry_br_mva_taxrate_substi"
        ]
      });

      var results = mvaSearch.run().getRange(0, 1000);
      if (results && results.length) {
        for (var i = 0; i < results.length; i++) {
          var internalId = results[i].getValue("internalid");
          var mvaRate = results[i].getValue("custrecord_lmry_br_mva_rate");
          mvaRate = parseFloat(mvaRate) || 0.00;
          var mcnCode = results[i].getValue("custrecord_lmry_br_mva_ncm");
          var taxSubtype = results[i].getValue("custrecord_lmry_br_mva_subtype");
          var taxRate = results[i].getValue("custrecord_lmry_br_mva_taxrate") || 0.00;
          taxRate = parseFloat(taxRate);
          var substiTaxSubtype = results[i].getValue("custrecord_lmry_br_mva_subtype_substi");
          var substiTaxRate = results[i].getValue("custrecord_lmry_br_mva_taxrate_substi") || 0.00;
          substiTaxRate = parseFloat(substiTaxRate);

          mvaRecords[mcnCode] = mvaRecords[mcnCode] || [];
          mvaRecords[mcnCode].push({
            mvaId: internalId,
            mvaRate: mvaRate,
            mcnCode: mcnCode,
            taxSubtype: taxSubtype,
            taxRate: taxRate,
            substiTaxSubtype: substiTaxSubtype,
            substiTaxRate: substiTaxRate
          });
        }
      }

      return mvaRecords;
    }

    function addTaxItems(recordObj, taxResults, departmentSetup, classSetup, locationSetup) {
      var FEAT_DEPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
      var FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
      var FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });
      var DEPTMANDATORY = runtime.getCurrentUser().getPreference({ name: "DEPTMANDATORY" });
      var LOCMANDATORY = runtime.getCurrentUser().getPreference({ name: "LOCMANDATORY" });
      var CLASSMANDATORY = runtime.getCurrentUser().getPreference({ name: "CLASSMANDATORY" });

      var department = recordObj.getValue("department") || "";
      var class_ = recordObj.getValue("class") || "";
      var location = recordObj.getValue("location") || "";

      var taxItems = {}
      for (var i = 0; i < taxResults.length; i++) {
        var taxResult = taxResults[i];
        var subTypeId = taxResult.subType.value;
        var subType = taxResult.subType.text;
        var taxItem = taxResult.taxItem
        var taxAmount = taxResult.taxAmount;
        var taxCode = taxResult.taxCode;
        var isTaxNotIncluded = taxResult.br_isTaxNotIncluded;

        if (isTaxNotIncluded && taxItem) {
          var key = subTypeId + "-" + taxItem;
          if (!taxItems[key]) {
            taxItems[key] = {
              subTypeId: subTypeId,
              subType: subType,
              item: taxItem,
              taxCode: taxCode,
              amount: 0.00
            }
          }

          taxItems[key]["amount"] = taxItems[key]["amount"] + parseFloat(taxAmount);
        }
      }

      for (var k in taxItems) {
        var lineNum = recordObj.getLineCount('item');
        var tax = taxItems[k];
        var subType = tax["subType"];
        var item = tax["item"];
        var amount = tax["amount"];
        amount = round2(amount);
        var taxCode = tax["taxCode"] || "";

        if (amount > 0) {
          recordObj.insertLine({ sublistId: 'item', line: lineNum });
          recordObj.setSublistValue({ sublistId: 'item', fieldId: 'item', line: lineNum, value: item });
          recordObj.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: lineNum, value: 1 });
          recordObj.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: lineNum, value: amount });
          recordObj.setSublistValue({ sublistId: 'item', fieldId: 'amount', line: lineNum, value: amount });
          recordObj.setSublistValue({ sublistId: 'item', fieldId: 'tax1amt', line: lineNum, value: 0.00 });
          recordObj.setSublistValue({ sublistId: 'item', fieldId: 'grossamt', line: lineNum, value: amount });
          recordObj.setSublistValue({ sublistId: 'item', fieldId: 'taxcode', line: lineNum, value: taxCode });
          var description = subType + ' (LatamTax) ';
          recordObj.setSublistValue({ sublistId: 'item', fieldId: 'description', line: lineNum, value: description });
          recordObj.setSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_ar_item_tributo', line: lineNum, value: true });
          if (FEAT_DEPT == "T" || FEAT_DEPT == true) {
            recordObj.setSublistValue({ sublistId: 'item', fieldId: 'department', line: lineNum, value: department });
            if ((DEPTMANDATORY == "T" || DEPTMANDATORY == true) && !department) {
              recordObj.setSublistValue({ sublistId: 'item', fieldId: 'department', line: lineNum, value: departmentSetup });
            }
          }

          if (FEAT_CLASS == "T" || FEAT_CLASS == true) {
            recordObj.setSublistValue({ sublistId: 'item', fieldId: 'class', line: lineNum, value: class_ });
            if ((CLASSMANDATORY == "T" || CLASSMANDATORY == true) && !class_) {
              recordObj.setSublistValue({ sublistId: 'item', fieldId: 'class', line: lineNum, value: classSetup });
            }
          }

          if (FEAT_LOC == "T" || FEAT_LOC == true) {
            recordObj.setSublistValue({ sublistId: 'item', fieldId: 'location', line: lineNum, value: location });
            if ((LOCMANDATORY == "T" || LOCMANDATORY == true) && !location) {
              recordObj.setSublistValue({ sublistId: 'item', fieldId: 'location', line: lineNum, value: locationSetup });
            }
          }
        }
      }
    }

    function getCatalogFilters(recordObj, serviceCatalogField, nfceCatalogField) {
      var filters = [];
      var numItems = recordObj.getLineCount({ sublistId: "item" });
      var serviceCatalogs = [], nfceCatalogs = [];
      for (var i = 0; i < numItems; i++) {
        var serviceCatalog = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_service_catalog", line: i }) || "";
        serviceCatalog = Number(serviceCatalog);
        var nfceCatalog = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_nfce_catalog", line: i }) || "";
        nfceCatalog = Number(nfceCatalog);

        if (serviceCatalog && serviceCatalogs.indexOf(serviceCatalog) == -1) {
          serviceCatalogs.push(serviceCatalog);
        }

        if (nfceCatalog && nfceCatalogs.indexOf(nfceCatalog) == -1) {
          nfceCatalogs.push(nfceCatalog);
        }
      }

      if (serviceCatalogs.length) {
        filters.push([serviceCatalogField, "anyof", serviceCatalogs]);
      }

      if (nfceCatalogs.length && IS_HYBRID) {

        for (var i = 0; i < nfceCatalogs.length; i++) {
          filters.push("OR", [nfceCatalogField, "equalto", nfceCatalogs[i]])
        }

        if (!serviceCatalogs.length) {
          filters = filters.slice(1);
        }
      }

      return filters;
    }

    function checkIsTaxCalculator(recordObj) {
      var numItems = recordObj.getLineCount({ sublistId: "item" });
      for (var i = 0; i < numItems; i++) {
        var catalog = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_br_service_catalog', line: i });
        if (catalog) {
          return false;
        }
      }
      return true;
    }

    function getSetupTaxSubsidiary(recordObj) {
      var filters = [
        ["isinactive", "is", "F"]
      ];

      if (FEAT_SUBS == true || FEAT_SUBS == "T") {
        var subsidiary = recordObj.getValue("subsidiary");
        filters.push("AND", ["custrecord_lmry_setuptax_subsidiary", "anyof", subsidiary]);
      }

      var searchSetupSubsidiary = search.create({
        type: "customrecord_lmry_setup_tax_subsidiary",
        filters: filters,
        columns: [
          'custrecord_lmry_setuptax_subsidiary', 'custrecord_lmry_setuptax_depclassloc', 'custrecord_lmry_setuptax_account',
          'custrecord_lmry_setuptax_type_rounding', 'custrecord_lmry_setuptax_department', 'custrecord_lmry_setuptax_class',
          'custrecord_lmry_setuptax_location', 'custrecord_lmry_setuptax_currency', 'custrecord_lmry_setuptax_form_journal',
          'custrecord_lmry_setuptax_br_taxfromgross', 'custrecord_lmry_setuptax_br_filterloc', 'custrecord_lmry_setuptax_deduction_doc',
          'custrecord_lmry_setuptax_ac_seg_incoline'
        ]
      });

      var results = searchSetupSubsidiary.run().getRange(0, 10);
      if (results && results.length) {
        var clasificacionCC = results[0].getValue({
          name: 'custrecord_lmry_setuptax_depclassloc'
        });
        var acountCC = results[0].getValue({
          name: 'custrecord_lmry_setuptax_account'
        });
        var rounding = results[0].getValue({
          name: 'custrecord_lmry_setuptax_type_rounding'
        });
        var department = results[0].getValue({
          name: 'custrecord_lmry_setuptax_department'
        });
        var class_ = results[0].getValue({
          name: 'custrecord_lmry_setuptax_class'
        });
        var location = results[0].getValue({
          name: 'custrecord_lmry_setuptax_location'
        });
        var currency = results[0].getValue({
          name: 'custrecord_lmry_setuptax_currency'
        });
        currency = Number(currency);

        var taxFlow = results[0].getValue({
          name: 'custrecord_lmry_setuptax_br_taxfromgross'
        }) || 1;
        taxFlow = Number(taxFlow);

        var filterLoc = results[0].getValue({
          name: 'custrecord_lmry_setuptax_br_filterloc'
        });

        var deductionDocs = results[0].getValue({
          name: 'custrecord_lmry_setuptax_deduction_doc'
        });
        if (deductionDocs) {
          deductionDocs = deductionDocs.split(',');
        } else {
          deductionDocs = [];
        }

        var ac_seg_incoline = results[0].getValue({
          name: 'custrecord_lmry_setuptax_ac_seg_incoline'
        })
        return {
          clasificacionCC: clasificacionCC,
          acountCC: acountCC,
          rounding: rounding,
          department: department,
          class_: class_,
          location: location,
          taxFlow: taxFlow,
          currency: currency,
          filterLoc: filterLoc,
          deductionDocs: deductionDocs,
          ac_seg_incoline: ac_seg_incoline
        };
      }

      return null;
    }

    function getContributoryClasses(recordObj, setupTax) {
      var ccs = [];
      var date = recordObj.getText("trandate")
      var transactionTypeId = transactionTypes[recordObj.type];
      var entity = recordObj.getValue("entity");
      var documentType = recordObj.getValue("custbody_lmry_document_type");

      var documents = ["@NONE@"];
      if (documentType) {
        documents.push(documentType);
      }

      var location = recordObj.getValue("location");
      var province = recordObj.getValue('custbody_lmry_province');
      var city = recordObj.getValue('custbody_lmry_city');
      var district = recordObj.getValue('custbody_lmry_district');

      var applyWht = recordObj.getValue("custbody_lmry_apply_wht_code");

      var filters = [
        ['isinactive', 'is', 'F'], 'AND',
        ['custrecord_lmry_ar_ccl_fechdesd', 'onorbefore', date], 'AND',
        ['custrecord_lmry_ar_ccl_fechhast', 'onorafter', date], 'AND',
        ['custrecord_lmry_ccl_transactiontypes', 'anyof', transactionTypeId], 'AND',
        ['custrecord_lmry_ar_ccl_entity', 'anyof', entity], 'AND',
        ['custrecord_lmry_ccl_appliesto', 'anyof', "2"], 'AND',//Lineas
        ['custrecord_lmry_ccl_taxtype', 'anyof', '4'], 'AND',//Calculo de impuestos
        ['custrecord_lmry_ccl_gen_transaction', 'anyof', '2'], 'AND',//SuiteGl
        ['custrecord_lmry_ccl_fiscal_doctype', 'anyof', documents]
      ];


      if (setupTax.filterLoc) {
        filters.push('AND', ['custrecord_lmry_ar_ccl_location', 'anyof', location]);
      }

      if (FEAT_SUBS == true || FEAT_SUBS == "T") {
        var subsidiary = recordObj.getValue("subsidiary");
        filters.push('AND', ['custrecord_lmry_ar_ccl_subsidiary', 'anyof', subsidiary])
      }

      var provinces = ['@NONE@'];
      if (province) {
        provinces.push(province);
      }

      var cities = ['@NONE@'];
      if (city) {
        cities.push(city)
      }

      var districts = ['@NONE@'];
      if (district) {
        districts.push(district);
      }

      filters.push('AND', [
        [
          ["custrecord_lmry_ccl_is_tax_by_location", "is", "F"]
        ]
        , "OR", [
          ["custrecord_lmry_ccl_is_tax_by_location", "is", "T"],
          'AND', ["custrecord_lmry_ccl_province", "anyof", provinces],
          'AND', ["custrecord_lmry_ccl_city", "anyof", cities],
          'AND', ["custrecord_lmry_ccl_district", "anyof", districts]
        ]
      ]);

      var catalogFilters = getCatalogFilters(recordObj, "custrecord_lmry_br_ccl_catalog", "custrecord_lmry_ccl_nfce_catalog_id");
      if (catalogFilters.length) {
        filters.push("AND", catalogFilters);
      }

      if (!IS_HYBRID) {
        filters.push("AND", ["custrecord_lmry_ccl_is_hybrid", "is", "F"]);
      }

      var ccSearch = search.create({
        type: "customrecord_lmry_ar_contrib_class",
        filters: filters,
        columns: ["custrecord_lmry_br_ccl_catalog", 'custrecord_lmry_br_exclusive', 'custrecord_lmry_ccl_appliesto', 'custrecord_lmry_ar_ccl_taxrate', 'custrecord_lmry_amount', 'internalid', 'custrecord_lmry_sub_type', 'custrecord_lmry_ccl_minamount', 'custrecord_lmry_br_ccl_account1', 'custrecord_lmry_br_ccl_account2', 'custrecord_lmry_ccl_gen_transaction', 'custrecord_lmry_ar_ccl_department',
          'custrecord_lmry_ar_ccl_class', 'custrecord_lmry_ar_ccl_location', 'custrecord_lmry_ccl_applies_to_item', 'custrecord_lmry_ccl_applies_to_account', 'custrecord_lmry_ccl_addratio', 'custrecord_lmry_ccl_description',
          'custrecord_lmry_ccl_maxamount', 'custrecord_lmry_ccl_accandmin_with', 'custrecord_lmry_ccl_not_taxable_minimum', 'custrecord_lmry_ccl_base_amount', 'custrecord_lmry_ccl_set_baseretention', 'custrecord_lmry_br_ccl_rate_suma', 'custrecord_lmry_br_receita',
          'custrecord_lmry_ar_ccl_isexempt', 'custrecord_lmry_br_taxsituation', 'custrecord_lmry_br_nature_revenue', "custrecord_lmry_ccl_is_tax_by_location",
          'custrecord_lmry_sub_type.custrecord_lmry_is_tax_not_included', 'custrecord_lmry_ccl_is_substitution', 'custrecord_lmry_ar_ccl_taxitem', 'custrecord_lmry_ar_ccl_taxcode', 'custrecord_lmry_ccl_config_segment',
          'custrecord_lmry_br_ccl_regimen_catalog', 'custrecord_lmry_ccl_nfce_catalog_id', 'custrecord_lmry_ccl_hybrid_part', 'custrecord_lmry_ccl_is_hybrid', 'custrecord_lmry_ccl_related_document_typ', 'custrecord_lmry_ccl_is_baseamt_reduction',
          'custrecord_lmry_ccl_subtypes_base_reduct', 'custrecord_lmry_ccl_apply_deduction', 'custrecord_lmry_ccl_br_apply_reinf']
      });

      var results = ccSearch.run().getRange(0, 1000);
      if (results && results.length) {
        for (var i = 0; i < results.length; i++) {
          var id = results[i].getValue("internalid");
          var taxRate = results[i].getValue("custrecord_lmry_ar_ccl_taxrate") || 0.00;
          taxRate = parseFloat(taxRate);
          var telecomTaxRate = results[i].getValue("custrecord_lmry_br_ccl_rate_suma") || 0.00;
          telecomTaxRate = parseFloat(telecomTaxRate);
          var subTypeId = results[i].getValue("custrecord_lmry_sub_type");
          subTypeId = Number(subTypeId);
          var subTypeText = results[i].getText("custrecord_lmry_sub_type");
          var appliesTo = results[i].getValue("custrecord_lmry_ccl_appliesto");
          var appliesToText = results[i].getText("custrecord_lmry_ccl_appliesto");
          var genTran = results[i].getValue("custrecord_lmry_ccl_gen_transaction");
          var genTranText = results[i].getText("custrecord_lmry_ccl_gen_transaction");
          var minim = results[i].getValue("custrecord_lmry_ccl_minamount") || 0.00;
          minim = parseFloat(minim);
          var debitAccount = results[i].getValue("custrecord_lmry_br_ccl_account1");
          var debitAccountText = results[i].getText("custrecord_lmry_br_ccl_account1");
          var creditAccount = results[i].getValue("custrecord_lmry_br_ccl_account2");
          var creditAccountText = results[i].getText("custrecord_lmry_br_ccl_account2");
          var department = results[i].getValue("custrecord_lmry_ar_ccl_department");
          var class_ = results[i].getValue("custrecord_lmry_ar_ccl_class");
          var location = results[i].getValue("custrecord_lmry_ar_ccl_location");
          var catalog = results[i].getValue("custrecord_lmry_br_ccl_catalog") || "";
          var catalogText = results[i].getText("custrecord_lmry_br_ccl_catalog") || "";
          var ratio = results[i].getValue("custrecord_lmry_ccl_addratio") || 1;
          ratio = parseFloat(ratio);
          var maxim = results[i].getValue("custrecord_lmry_ccl_maxamount") || 0.00;
          maxim = parseFloat(maxim);
          var notTaxableMin = results[i].getValue("custrecord_lmry_ccl_not_taxable_minimum") || 0.00;
          notTaxableMin = parseFloat(notTaxableMin);
          var howBaseAmount = results[i].getValue("custrecord_lmry_ccl_base_amount");
          howBaseAmount = Number(howBaseAmount);
          var baseRetention = results[i].getValue("custrecord_lmry_ccl_set_baseretention") || 0.00;
          baseRetention = parseFloat(baseRetention);
          var description = results[i].getValue("custrecord_lmry_ccl_description") || "";
          var isTeleComTax = results[i].getValue("custrecord_lmry_br_exclusive");
          var receita = results[i].getValue("custrecord_lmry_br_receita");
          var receitaText = results[i].getText("custrecord_lmry_br_receita");
          var isExempt = results[i].getValue("custrecord_lmry_ar_ccl_isexempt");
          var taxSituation = results[i].getValue("custrecord_lmry_br_taxsituation");
          var taxSituationText = results[i].getText("custrecord_lmry_br_taxsituation");
          var natureRevenue = results[i].getValue("custrecord_lmry_br_nature_revenue");
          var natureRevenueText = results[i].getText("custrecord_lmry_br_nature_revenue");
          var regimenCatalog = results[i].getValue("custrecord_lmry_br_ccl_regimen_catalog");
          var regimenCatalogText = results[i].getText("custrecord_lmry_br_ccl_regimen_catalog");
          var isTaxByLocation = results[i].getValue("custrecord_lmry_ccl_is_tax_by_location");
          var isTaxNotIncluded = results[i].getValue({
            join: "custrecord_lmry_sub_type",
            name: "custrecord_lmry_is_tax_not_included"
          });

          var isSubstitutionTax = results[i].getValue("custrecord_lmry_ccl_is_substitution");

          var taxItem = results[i].getValue("custrecord_lmry_ar_ccl_taxitem");
          var taxCode = results[i].getValue("custrecord_lmry_ar_ccl_taxcode");
          var segments = results[i].getValue("custrecord_lmry_ccl_config_segment");
          if (segments) {
            segments = JSON.parse(segments);
          }

          var nfceCatalog = results[i].getValue("custrecord_lmry_ccl_nfce_catalog_id");
          nfceCatalog = Number(nfceCatalog);
          var isHybridTax = results[i].getValue("custrecord_lmry_ccl_is_hybrid");

          var hybridPercent = results[i].getValue("custrecord_lmry_ccl_hybrid_part");
          hybridPercent = parseFloat(hybridPercent) || 1;

          var relatedDocType = results[i].getValue("custrecord_lmry_ccl_related_document_typ") || "";
          var relatedDocTypeText = results[i].getText("custrecord_lmry_ccl_related_document_typ") || "";
          var isBaseReduction = results[i].getValue('custrecord_lmry_ccl_is_baseamt_reduction');
          var reductSubtypes = results[i].getValue('custrecord_lmry_ccl_subtypes_base_reduct') || "";
          if (reductSubtypes) {
            reductSubtypes = reductSubtypes.split(/\u0005|\,/g).map(Number);
          }
          var isDeduction = results[i].getValue("custrecord_lmry_ccl_apply_deduction");

          var isApplyReinf = results[i].getValue("custrecord_lmry_ccl_br_apply_reinf");
          isApplyReinf = (isApplyReinf == true || isApplyReinf == "T");

          if ((applyWht == true || applyWht == "T") && (isTaxByLocation == true || isTaxByLocation == "T")) {
            continue;
          }

          if ((!debitAccount || !creditAccount) && (!isSubstitutionTax || !isTaxNotIncluded)) {
            continue;
          }

          ccs.push({
            recordType: "cc",
            recordId: id,
            taxRate: taxRate,
            telecomTaxRate: telecomTaxRate,
            subTypeId: subTypeId,
            subTypeText: subTypeText,
            appliesTo: appliesTo,
            appliesToText: appliesToText,
            genTran: genTran,
            genTranText: genTranText,
            minim: minim,
            creditAccount: creditAccount,
            creditAccountText: creditAccountText,
            debitAccount: debitAccount,
            debitAccountText: debitAccountText,
            department: department,
            class_: class_,
            location: location,
            segments: segments,
            catalog: catalog,
            catalogText: catalogText,
            ratio: ratio,
            description: description,
            maxim: maxim,
            notTaxableMin: notTaxableMin,
            howBaseAmount: howBaseAmount,
            baseRetention: baseRetention,
            isTeleComTax: isTeleComTax,
            receita: receita,
            receitaText: receitaText,
            isExempt: isExempt,
            taxSituation: taxSituation,
            taxSituationText: taxSituationText,
            natureRevenue: natureRevenue,
            natureRevenueText: natureRevenueText,
            regimenCatalog: regimenCatalog,
            regimenCatalogText: regimenCatalogText,
            isTaxNotIncluded: isTaxNotIncluded,
            isSubstitutionTax: isSubstitutionTax,
            taxItem: taxItem,
            taxCode: taxCode,
            nfceCatalog: nfceCatalog,
            isHybridTax: isHybridTax,
            hybridPercent: hybridPercent,
            relatedDocType: relatedDocType,
            relatedDocTypeText: relatedDocTypeText,
            isBaseReduction: isBaseReduction,
            reductSubtypes: reductSubtypes,
            isDeduction: isDeduction,
            isApplyReinf: isApplyReinf
          });
        }
      }

      return ccs;
    }

    function getNationalTaxes(recordObj, setupTax) {
      var nts = [];
      var date = recordObj.getText("trandate");
      var transactionTypeId = transactionTypes[recordObj.type];
      var documentType = recordObj.getValue("custbody_lmry_document_type");
      var documents = ["@NONE@"];
      if (documentType) {
        documents.push(documentType);
      }


      var location = recordObj.getValue("location");
      var province = recordObj.getValue('custbody_lmry_province');
      var city = recordObj.getValue('custbody_lmry_city');
      var district = recordObj.getValue('custbody_lmry_district');

      var entity = recordObj.getValue("entity");
      var exemptTaxes = search.lookupFields({
        type: "customer",
        id: entity,
        columns: ["custentity_lmry_br_exempt_tax"]
      }).custentity_lmry_br_exempt_tax || ""

      if (exemptTaxes && exemptTaxes.length) {
        exemptTaxes = exemptTaxes.map(function (v) {
          return v.value;
        })
      }

      var applyWht = recordObj.getValue("custbody_lmry_apply_wht_code");

      var filters = [
        ["isinactive", "is", "F"], "AND",
        ["custrecord_lmry_ntax_datefrom", "onorbefore", date], "AND",
        ["custrecord_lmry_ntax_dateto", "onorafter", date], "AND",
        ["custrecord_lmry_ntax_transactiontypes", "anyof", transactionTypeId], "AND",
        ["custrecord_lmry_ntax_taxtype", "anyof", "4"], "AND",//Calculo de Impuestos
        ["custrecord_lmry_ntax_appliesto", "anyof", "2"], "AND",//Lineas
        ["custrecord_lmry_ntax_gen_transaction", "anyof", "2"]//SuiteGL
      ];

      filters.push("AND", ["custrecord_lmry_ntax_fiscal_doctype", "anyof", documents]);

      if (setupTax.filterLoc) {
        filters.push("AND", ["custrecord_lmry_ntax_location", "anyof", location]);
      }

      if (FEAT_SUBS == true || FEAT_SUBS == "T") {
        var subsidiary = recordObj.getValue("subsidiary");
        filters.push("AND", ["custrecord_lmry_ntax_subsidiary", "anyof", subsidiary]);
      }

      if (exemptTaxes && exemptTaxes.length) {
        filters.push("AND", ["custrecord_lmry_ntax_sub_type", "noneof", exemptTaxes]);
      }

      var provinces = ['@NONE@'];
      if (province) {
        provinces.push(province);
      }

      var cities = ['@NONE@'];
      if (city) {
        cities.push(city)
      }

      var districts = ['@NONE@'];
      if (district) {
        districts.push(district);
      }

      filters.push('AND', [
        [
          ["custrecord_lmry_ntax_is_tax_by_location", "is", "F"]
        ]
        , "OR", [
          ["custrecord_lmry_ntax_is_tax_by_location", "is", "T"],
          "AND", ["custrecord_lmry_ntax_province", "anyof", provinces],
          "AND", ["custrecord_lmry_ntax_city", "anyof", cities],
          "AND", ["custrecord_lmry_ntax_district", "anyof", districts]
        ]
      ]);

      var catalogFilters = getCatalogFilters(recordObj, "custrecord_lmry_ntax_catalog", "custrecord_lmry_nt_nfce_catalog_id");
      if (catalogFilters.length) {
        filters.push("AND", catalogFilters);
      }

      if (!IS_HYBRID) {
        filters.push("AND", ["custrecord_lmry_nt_is_hybrid", "is", "F"]);
      }


      var ntSearch = search.create({
        type: 'customrecord_lmry_national_taxes',
        filters: filters,
        columns: ['custrecord_lmry_br_ntax_exclusive', 'custrecord_lmry_ntax_taxrate', 'custrecord_lmry_ntax_appliesto', 'custrecord_lmry_ntax_catalog', 'custrecord_lmry_ntax_amount', 'internalid', 'custrecord_lmry_ntax_sub_type', 'custrecord_lmry_ntax_minamount', 'custrecord_lmry_ntax_debit_account', 'custrecord_lmry_ntax_credit_account', 'custrecord_lmry_ntax_gen_transaction', 'custrecord_lmry_ntax_department',
          'custrecord_lmry_ntax_class', 'custrecord_lmry_ntax_location', 'custrecord_lmry_ntax_applies_to_item', 'custrecord_lmry_ntax_applies_to_account', 'custrecord_lmry_ntax_addratio', 'custrecord_lmry_ntax_description',
          'custrecord_lmry_ntax_maxamount', 'custrecord_lmry_ntax_accandmin_with', 'custrecord_lmry_ntax_not_taxable_minimum', 'custrecord_lmry_ntax_base_amount', 'custrecord_lmry_ntax_set_baseretention', 'custrecord_lmry_br_ntax_rate_suma', 'custrecord_lmry_ntax_br_receita', 'custrecord_lmry_ntax_isexempt',
          'custrecord_lmry_br_ntax_tax_situation', 'custrecord_lmry_br_ntax_nature_revenue',
          'custrecord_lmry_ntax_is_tax_by_location', 'custrecord_lmry_ntax_config_segment',
          'custrecord_lmry_ntax_sub_type.custrecord_lmry_is_tax_not_included', 'custrecord_lmry_nt_is_substitution', 'custrecord_lmry_ntax_taxitem', 'custrecord_lmry_ntax_taxcode', 'custrecord_lmry_br_ntax_regimen_catalog',
          'custrecord_lmry_nt_is_hybrid', 'custrecord_lmry_nt_hybrid_part', 'custrecord_lmry_nt_nfce_catalog_id', 'custrecord_lmry_nt_related_document_typ', 'custrecord_lmry_nt_is_baseamt_reduction', 'custrecord_lmry_nt_subtypes_base_reduct',
          'custrecord_lmry_ntax_apply_deduction', 'custrecord_lmry_nt_br_apply_reinf'
        ]
      });

      var results = ntSearch.run().getRange(0, 1000);

      if (results && results.length) {

        for (var i = 0; i < results.length; i++) {
          var id = results[i].getValue('internalid');
          var taxRate = results[i].getValue('custrecord_lmry_ntax_taxrate') || 0.00;
          taxRate = parseFloat(taxRate);
          var telecomTaxRate = results[i].getValue("custrecord_lmry_br_ntax_rate_suma") || 0.00;
          telecomTaxRate = parseFloat(telecomTaxRate);
          var appliesTo = results[i].getValue('custrecord_lmry_ntax_appliesto');
          var appliesToText = results[i].getText("custrecord_lmry_ntax_appliesto");
          var subTypeId = results[i].getValue('custrecord_lmry_ntax_sub_type');
          subTypeId = Number(subTypeId);
          var subTypeText = results[i].getText('custrecord_lmry_ntax_sub_type');
          var minim = results[i].getValue('custrecord_lmry_ntax_minamount') || 0.00;
          minim = parseFloat(minim);
          var debitAccount = results[i].getValue('custrecord_lmry_ntax_debit_account');
          var debitAccountText = results[i].getText('custrecord_lmry_ntax_debit_account');
          var creditAccount = results[i].getValue('custrecord_lmry_ntax_credit_account');
          var creditAccountText = results[i].getText('custrecord_lmry_ntax_credit_account');
          var genTran = results[i].getValue('custrecord_lmry_ntax_gen_transaction');
          var genTranText = results[i].getText("custrecord_lmry_ntax_gen_transaction");
          var department = results[i].getValue('custrecord_lmry_ntax_department');
          var class_ = results[i].getValue('custrecord_lmry_ntax_class');
          var location = results[i].getValue('custrecord_lmry_ntax_location');
          var catalog = results[i].getValue('custrecord_lmry_ntax_catalog') || "";
          var catalogText = results[i].getText('custrecord_lmry_ntax_catalog') || "";
          var ratio = results[i].getValue('custrecord_lmry_ntax_addratio') || 1;
          ratio = parseFloat(ratio);
          var description = results[i].getValue('custrecord_lmry_ntax_description') || "";
          var maxim = results[i].getValue('custrecord_lmry_ntax_maxamount') || 0.00;
          maxim = parseFloat(maxim);
          var notTaxableMin = results[i].getValue('custrecord_lmry_ntax_not_taxable_minimum') || 0.00;
          notTaxableMin = parseFloat(notTaxableMin);
          var howBaseAmount = results[i].getValue('custrecord_lmry_ntax_base_amount');
          howBaseAmount = Number(howBaseAmount);
          var baseRetention = results[i].getValue('custrecord_lmry_ntax_set_baseretention') || 0.00;
          baseRetention = parseFloat(baseRetention);

          var isTeleComTax = results[i].getValue('custrecord_lmry_br_ntax_exclusive');
          var receita = results[i].getValue('custrecord_lmry_ntax_br_receita');
          var receitaText = results[i].getText('custrecord_lmry_ntax_br_receita');
          var isExempt = results[i].getValue('custrecord_lmry_ntax_isexempt');
          var taxSituation = results[i].getValue('custrecord_lmry_br_ntax_tax_situation');
          var taxSituationText = results[i].getText('custrecord_lmry_br_ntax_tax_situation');
          var natureRevenue = results[i].getValue('custrecord_lmry_br_ntax_nature_revenue');
          var natureRevenueText = results[i].getText('custrecord_lmry_br_ntax_nature_revenue');
          var regimenCatalog = results[i].getValue('custrecord_lmry_br_ntax_regimen_catalog');
          var regimenCatalogText = results[i].getText('custrecord_lmry_br_ntax_regimen_catalog');
          var isTaxByLocation = results[i].getValue('custrecord_lmry_ntax_is_tax_by_location');
          var isApplyReinf = results[i].getValue("custrecord_lmry_nt_br_apply_reinf");
          isApplyReinf = (isApplyReinf == "T" || isApplyReinf == true);

          var isTaxNotIncluded = results[i].getValue({
            join: "custrecord_lmry_ntax_sub_type",
            name: "custrecord_lmry_is_tax_not_included"
          });

          var isSubstitutionTax = results[i].getValue("custrecord_lmry_nt_is_substitution");
          var taxItem = results[i].getValue("custrecord_lmry_ntax_taxitem");
          var taxCode = results[i].getValue("custrecord_lmry_ntax_taxcode");
          var segments = results[i].getValue("custrecord_lmry_ntax_config_segment");
          if (segments) {
            segments = JSON.parse(segments);
          }
          var nfceCatalog = results[i].getValue("custrecord_lmry_nt_nfce_catalog_id") || "";
          nfceCatalog = Number(nfceCatalog);
          var isHybridTax = results[i].getValue("custrecord_lmry_nt_is_hybrid");
          var hybridPercent = results[i].getValue("custrecord_lmry_nt_hybrid_part");
          hybridPercent = parseFloat(hybridPercent) || 1;
          var relatedDocType = results[i].getValue("custrecord_lmry_nt_related_document_typ") || "";
          var relatedDocTypeText = results[i].getText("custrecord_lmry_nt_related_document_typ") || "";
          var isBaseReduction = results[i].getValue('custrecord_lmry_nt_is_baseamt_reduction');
          var reductSubtypes = results[i].getValue('custrecord_lmry_nt_subtypes_base_reduct') || "";
          if (reductSubtypes) {
            reductSubtypes = reductSubtypes.split(/\u0005|\,/g).map(Number);
          }
          var isDeduction = results[i].getValue("custrecord_lmry_ntax_apply_deduction");

          if ((applyWht == true || applyWht == "T") && (isTaxByLocation == true || isTaxByLocation == "T")) {
            continue;
          }

          if ((!debitAccount || !creditAccount) && (!isSubstitutionTax || !isTaxNotIncluded)) {
            continue;
          }

          nts.push({
            recordType: "nt",
            recordId: id,
            taxRate: taxRate,
            telecomTaxRate: telecomTaxRate,
            subTypeId: subTypeId,
            subTypeText: subTypeText,
            appliesTo: appliesTo,
            appliesToText: appliesToText,
            genTran: genTran,
            genTranText: genTranText,
            minim: minim,
            creditAccount: creditAccount,
            creditAccountText: creditAccountText,
            debitAccount: debitAccount,
            debitAccountText: debitAccountText,
            department: department,
            class_: class_,
            location: location,
            segments: segments,
            catalog: catalog,
            catalogText: catalogText,
            ratio: ratio,
            description: description,
            maxim: maxim,
            notTaxableMin: notTaxableMin,
            howBaseAmount: howBaseAmount,
            baseRetention: baseRetention,
            isTeleComTax: isTeleComTax,
            receita: receita,
            receitaText: receitaText,
            isExempt: isExempt,
            taxSituation: taxSituation,
            taxSituationText: taxSituationText,
            natureRevenue: natureRevenue,
            natureRevenueText: natureRevenueText,
            regimenCatalog: regimenCatalog,
            regimenCatalogText: regimenCatalogText,
            isTaxByLocation: isTaxByLocation,
            isTaxNotIncluded: isTaxNotIncluded,
            isSubstitutionTax: isSubstitutionTax,
            taxItem: taxItem,
            taxCode: taxCode,
            nfceCatalog: nfceCatalog,
            isHybridTax: isHybridTax,
            hybridPercent: hybridPercent,
            relatedDocType: relatedDocType,
            relatedDocTypeText: relatedDocTypeText,
            isBaseReduction: isBaseReduction,
            reductSubtypes: reductSubtypes,
            isDeduction: isDeduction,
            isApplyReinf: isApplyReinf
          });
        }
      }

      return nts;
    }

    function calculateTaxesByItem(recordObj, taxRecords, setupTax, mvaRecords, discountAmounts, exchangeRate, customSegments) {
      var taxResultsTotal = [];
      if (taxRecords.length) {
        var department = recordObj.getValue("department");
        var class_ = recordObj.getValue("class");
        var location = recordObj.getValue("location");

        var segments = {};
        customSegments.forEach(function (seg) {
          var s = recordObj.getValue(seg) || "";
          if (s) {
            segments[seg] = s;
          }
        });

        var numItems = recordObj.getLineCount({ sublistId: "item" });
        for (var i = 0; i < numItems; i++) {
          var isTaxItem = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_ar_item_tributo', line: i });
          var typeDiscount = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_col_sales_type_discount', line: i });
          var itemType = recordObj.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i }) || "";
          var departmentLine = recordObj.getSublistValue({ sublistId: "item", fieldId: "department", line: i }) || "";
          var classLine = recordObj.getSublistValue({ sublistId: "item", fieldId: "class", line: i }) || "";
          var locationLine = recordObj.getSublistValue({ sublistId: "item", fieldId: "location", line: i }) || "";
          if ((isTaxItem == true || isTaxItem == "T") || typeDiscount) {
            continue;
          }

          if (GroupTypeItems.indexOf(itemType) != -1) {
            continue;
          }

          var itemId = recordObj.getSublistValue({ sublistId: "item", fieldId: "item", line: i }) || "";
          var itemText = recordObj.getSublistText({ sublistId: "item", fieldId: "item", line: i }) || "";
          var netAmt = recordObj.getSublistValue({ sublistId: "item", fieldId: "amount", line: i }) || 0.00;
          netAmt = parseFloat(netAmt);
          var grossAmt = recordObj.getSublistValue({ sublistId: "item", fieldId: "grossamt", line: i }) || 0.00;
          grossAmt = parseFloat(grossAmt);

          if (netAmt <= 0) {
            continue;
          }

          var discountAmt = 0.00;
          if (HAS_DEDUCTION) {
            discountAmt = discountAmounts[i] || 0.00;
          } else {
            //Flujo 0 y 3
            if (setupTax.taxFlow == 1 || setupTax.taxFlow == 4) {
              discountAmt = discountAmounts[i] || 0.00;
            }
          }


          var lineUniqueKey = recordObj.getSublistValue({ sublistId: "item", fieldId: "lineuniquekey", line: i }) || "";
          var catalogLine = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_service_catalog", line: i }) || "";
          var mcnCode = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_tran_mcn", line: i }) || "";
          var nfceCatalogLine = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_nfce_catalog", line: i }) || "";
          nfceCatalogLine = Number(nfceCatalogLine);

          var isHybridLine = false;
          if (nfceCatalogLine && catalogLine) {
            isHybridLine = true;
          }

          var currentTaxes = [], taxResultsByLine = [];
          if (!IS_HYBRID) {
            //los del mismo catalog de servicio
            currentTaxes = taxRecords.filter(function (tax) {
              return Number(tax.catalog) == Number(catalogLine);
            });
          } else {
            currentTaxes = taxRecords.filter(function (tax) {
              var flag = (Number(tax.catalog) == Number(catalogLine)) || (Number(tax.nfceCatalog) == Number(nfceCatalogLine));
              if (isHybridLine) {
                return tax.isHybridTax && flag;
              } else {
                return !tax.isHybridTax && flag;
              }
            });
          }

          //1. Impuestos normales
          var taxes1 = getPhase1Taxes(currentTaxes);

          var baseAmt1;
          //Flujo 1 y 3
          if (setupTax.taxFlow == 2 || setupTax.taxFlow == 4) {
            if (HAS_DEDUCTION) {
              baseAmt1 = grossAmt;
            } else {
              baseAmt1 = round2(grossAmt - discountAmt);
            }
          } else if (setupTax.taxFlow == 1 || setupTax.taxFlow == 3) {//Flujo 0 y 2
            var sumTaxRates = getSumTaxRates(currentTaxes);
            var net = round2(netAmt - discountAmt);
            baseAmt1 = net / (1 - sumTaxRates);
          } else if (setupTax.taxFlow == 5) { //Flujo 4. Mejora del flujo 2
            baseAmt1 = calculateGrossFromNetWithPhasedTaxes(netAmt, currentTaxes);
          }

          log.debug("baseAmt1", baseAmt1);

          var taxResults1 = [];
          for (var t = 0; t < taxes1.length; t++) {
            var baseAmt = baseAmt1;
            if (HAS_DEDUCTION && taxes1[t].isDeduction) {
              baseAmt = round2(baseAmt1 - discountAmt);
            }
            if (IS_HYBRID && taxes1[t].isHybridTax) {
              baseAmt = baseAmt1 * taxes1[t].hybridPercent;
            }

            var taxResult = getTaxResult({
              baseAmt: baseAmt,
              tax: taxes1[t],
              discountAmt: discountAmt,
              exchangeRate: exchangeRate,
              position: i,
              itemId: itemId,
              itemText: itemText,
              lineUniqueKey: lineUniqueKey,
              department: department,
              class_: class_,
              location: location,
              segments: segments,
              setupTax: setupTax,
              departmentLine: departmentLine,
              classLine: classLine,
              locationLine: locationLine
            });

            if (taxResult) {
              taxResults1.push(taxResult);
            }
          }

          taxResultsByLine = taxResultsByLine.concat(taxResults1);

          //2. Impuestos reducibles
          var taxes2 = getPhase2Taxes(currentTaxes);

          var taxResults2 = [];
          for (var t = 0; t < taxes2.length; t++) {
            var sumTaxes = 0.00;
            if (taxes2[t].reductSubtypes && taxes2[t].reductSubtypes.length) {
              taxResults1.filter(function (tr) {
                var flag = taxes2[t].reductSubtypes.indexOf(tr.subType.value) != -1;
                if (flag && IS_HYBRID && taxes2[t].isHybridTax) {
                  flag = (taxes2[t].catalog && tr.serviceCatalog.value == taxes2[t].catalog) || (taxes2[t].nfceCatalog && tr.br_nfceCatalog == taxes2[t].nfceCatalog)
                }

                return flag;
              }).forEach(function (tr) {
                sumTaxes += (tr.taxAmount || 0.00);
              });
            }

            var baseAmt2 = baseAmt1 - sumTaxes;
            if (IS_HYBRID && taxes2[t].isHybridTax) {
              var baseAmt = baseAmt1 * taxes2[t].hybridPercent;
              baseAmt2 = baseAmt - sumTaxes;
            }

            var taxResult = getTaxResult({
              baseAmt: baseAmt2,
              tax: taxes2[t],
              discountAmt: discountAmt,
              exchangeRate: exchangeRate,
              position: i,
              itemId: itemId,
              itemText: itemText,
              lineUniqueKey: lineUniqueKey,
              department: department,
              class_: class_,
              location: location,
              segments: segments,
              setupTax: setupTax,
              departmentLine: departmentLine,
              classLine: classLine,
              locationLine: locationLine
            });

            if (taxResult) {
              taxResults2.push(taxResult);
            }
          }

          taxResultsByLine = taxResultsByLine.concat(taxResults2);

          //3. Impuestos de telecomunicaciones
          var taxes3 = getPhase3Taxes(currentTaxes);
          var beforeTaxResults = taxResults1.concat(taxResults2);

          var sumTaxes = 0.00
          beforeTaxResults.forEach(function (tr) {
            sumTaxes += (tr.taxAmount || 0.00);
          });

          var baseAmt3 = baseAmt1 - sumTaxes;
          var taxResults3 = [];
          for (var t = 0; t < taxes3.length; t++) {
            if (IS_HYBRID && taxes3[t].isHybridTax) {
              var sumByCatalog = 0.00;
              beforeTaxResults.filter(function (tr) {
                return (taxes3[t].catalog && tr.serviceCatalog.value == taxes3[t].catalog) || (tr.br_nfceCatalog && tr.br_nfceCatalog == taxes3[t].nfceCatalog)
              }).forEach(function (tr) {
                sumByCatalog += (tr.taxAmount || 0.00);
              });
              var baseAmt = baseAmt1 * taxes3[t].hybridPercent;
              baseAmt3 = baseAmt - sumByCatalog;
            }

            var taxResult = getTaxResult({
              baseAmt: baseAmt3,
              tax: taxes3[t],
              discountAmt: discountAmt,
              exchangeRate: exchangeRate,
              position: i,
              itemId: itemId,
              itemText: itemText,
              lineUniqueKey: lineUniqueKey,
              department: department,
              class_: class_,
              location: location,
              segments: segments,
              setupTax: setupTax,
              departmentLine: departmentLine,
              classLine: classLine,
              locationLine: locationLine
            });

            if (taxResult) {
              taxResults3.push(taxResult);
            }
          }

          taxResultsByLine = taxResultsByLine.concat(taxResults3);

          //Impuestos de Sustitucion
          if (setupTax.taxFlow == 4 && mvaRecords.hasOwnProperty(mcnCode)) {
            var stTaxResults = getSubstitutionTaxes({
              grossAmt: grossAmt,
              discountAmt: discountAmt,
              taxes: currentTaxes,
              taxResults: taxResultsByLine,
              exchangeRate: exchangeRate,
              position: i,
              itemId: itemId,
              itemText: itemText,
              lineUniqueKey: lineUniqueKey,
              mvaRecords: mvaRecords[mcnCode]
            });

            taxResultsByLine = taxResultsByLine.concat(stTaxResults);
          }

          taxResultsTotal = taxResultsTotal.concat(taxResultsByLine);
        }
      }

      return taxResultsTotal;
    }


    function getSumTaxRates(taxes) {
      var sumTaxRates = 0.00;
      for (var i = 0; i < taxes.length; i++) {
        if (!taxes[i].isTeleComTax) {
          sumTaxRates += taxes[i].taxRate;
        } else {
          sumTaxRates += (taxes[i].telecomTaxRate / 100);
        }
      }
      return sumTaxRates;
    }

    function calculateGrossFromNetWithPhasedTaxes(netAmount, taxes) {
      var sumRate1 = 0, sumRate2 = 0, sumRate3 = 0;
      var taxes1 = getPhase1Taxes(taxes);
      taxes1.forEach(function (t) {
        sumRate1 += t.taxRate;
      });

      var taxes2 = getPhase2Taxes(taxes);
      taxes2.forEach(function (t) {
        sumRate2 += t.taxRate;
      });

      var taxes3 = getPhase3Taxes(taxes);
      taxes3.forEach(function (t) {
        sumRate3 += t.taxRate;
      });

      return netAmount / (1 - sumRate1 - sumRate2 * (1 - sumRate1) - sumRate3 * (1 - sumRate1 - sumRate2 * (1 - sumRate1)));
    }

    function getTaxResult(options) {
      var baseAmt = options.baseAmt;
      var exchangeRate = options.exchangeRate;
      var tax = options.tax;
      var setupTax = options.setupTax;

      var notTaxableMin = tax.notTaxableMin / exchangeRate;
      var minim = tax.minim / exchangeRate;
      var maxim = tax.maxim / exchangeRate;
      var baseRetention = tax.baseRetention / exchangeRate;

      baseAmt = baseAmt - notTaxableMin;

      if (minim < baseAmt && (!maxim || baseAmt <= maxim)) {
        if (tax.howBaseAmount) {
          if (tax.howBaseAmount == 2 || tax.howBaseAmount == 5) {
            baseAmt = baseAmt - minim;
          } else if (tax.howBaseAmount == 3) {
            baseAmt = minim;
          } else if (tax.howBaseAmount == 4) {
            baseAmt = maxim;
          }
        }

        // if (IS_HYBRID && tax.isHybridTax) {
        //     baseAmt = baseAmt * tax.hybridPercent;
        // }

        if (baseAmt > 0) {
          var taxAmount = (baseAmt * tax.ratio * tax.taxRate) + baseRetention;
          if ((taxAmount > 0 && round2(taxAmount) > 0) || tax.isExempt) {
            var lc_baseAmount = baseAmt;
            var lc_taxAmount = taxAmount;
            var lc_discountAmount = options.discountAmt || 0.00;

            if (exchangeRate != 1) {
              lc_baseAmount = round2(baseAmt) * exchangeRate;
              lc_taxAmount = round2(taxAmount) * exchangeRate;
              lc_discountAmount = round2(options.discountAmt) * exchangeRate;
            }

            var department = "", class_ = "", location = "";
            if (setupTax.clasificacionCC) {
              if (DEPTMANDATORY == true || DEPTMANDATORY == "T") {
                if (setupTax.ac_seg_incoline == true || setupTax.ac_seg_incoline == "T") {
                  department = options.departmentLine || tax.department || setupTax.department || "";
                } else {
                  department = tax.department || setupTax.department || "";
                }
              } else {
                if (setupTax.ac_seg_incoline == true || setupTax.ac_seg_incoline == "T") {
                  department = options.departmentLine || tax.department || options.department || "";
                } else {
                  department = tax.department || options.department || "";
                }
              }
              if (CLASSMANDATORY == true || CLASSMANDATORY == "T") {
                if (setupTax.ac_seg_incoline == true || setupTax.ac_seg_incoline == "T") {
                  class_ = options.classLine || tax.class_ || setupTax.class_ || "";
                } else {
                  class_ = tax.class_ || setupTax.class_ || "";
                }
              } else {
                if (setupTax.ac_seg_incoline == true || setupTax.ac_seg_incoline == "T") {
                  class_ = options.classLine || tax.class_ || options.class_ || "";
                } else {
                  class_ = tax.class_ || options.class_ || "";
                }
              }

              if (LOCMANDATORY == true || LOCMANDATORY == "T") {
                if (setupTax.ac_seg_incoline == true || setupTax.ac_seg_incoline == "T") {
                  location = options.locationLine || tax.location || setupTax.location || "";
                } else {
                  location = tax.location || setupTax.location || "";
                }
              } else {
                if (setupTax.ac_seg_incoline == true || setupTax.ac_seg_incoline == "T") {
                  location = options.locationLine || tax.location || options.location || "";
                } else {
                  location = tax.location || options.location || "";
                }
              }
            } else {
              if (DEPTMANDATORY == true || DEPTMANDATORY == "T") {
                if (setupTax.ac_seg_incoline == true || setupTax.ac_seg_incoline == "T") {
                  department = options.departmentLine || tax.department || setupTax.department || "";
                } else {
                  department = tax.department || setupTax.department || "";
                }
              }
              if (CLASSMANDATORY == true || CLASSMANDATORY == "T") {
                if (setupTax.ac_seg_incoline == true || setupTax.ac_seg_incoline == "T") {
                  class_ = options.classLine || tax.class_ || setupTax.class_ || "";
                } else {
                  class_ = tax.class_ || setupTax.class_ || "";
                }
              }
              if (LOCMANDATORY == true || LOCMANDATORY == "T") {
                if (setupTax.ac_seg_incoline == true || setupTax.ac_seg_incoline == "T") {
                  location = options.locationLine || tax.location || setupTax.location || "";
                } else {
                  location = tax.location || setupTax.location || "";
                }
              }
            }

            var csegments = {};
            if (FEAT_CUSTOMSEGMENTS == true || FEAT_CUSTOMSEGMENTS == "T") {
              csegments = util.extend(csegments, options.segments);
              csegments = util.extend(csegments, tax.segments);
            }

            var taxResult = {
              taxType: { value: "4", text: "Calculo de Impuestos" },
              appliesTo: { value: tax.appliesTo, text: tax.appliesToText },
              isExempt: tax.isExempt,
              subType: { value: tax.subTypeId, text: tax.subTypeText },
              lineUniqueKey: options.lineUniqueKey,
              serviceCatalog: { value: tax.catalog, text: tax.catalogText },
              br_nfceCatalog: tax.nfceCatalog,
              baseAmount: baseAmt,
              taxAmount: taxAmount,
              taxRate: tax.taxRate,
              taxCode: tax.taxCode,
              discountAmount: options.discountAmt,
              generatedTransaction: { value: tax.genTran, text: tax.genTranText },
              item: { value: options.itemId, text: options.itemText },
              department: department,
              "class": class_,
              location: location,
              customSegments: csegments,
              generateImpact: true,
              position: options.position,
              description: tax.description,
              br_isSubstitutionTax: false,
              br_isTaxNotIncluded: tax.isTaxNotIncluded,
              taxItem: tax.taxItem,
              lc_baseAmount: lc_baseAmount,
              lc_taxAmount: lc_taxAmount,
              lc_discountAmount: lc_discountAmount,
              br_applyReinf: tax.isApplyReinf
            };

            if (tax.debitAccount) {
              taxResult.debitAccount = { value: tax.debitAccount, text: tax.debitAccountText };
            }

            if (tax.creditAccount) {
              taxResult.creditAccount = { value: tax.creditAccount, text: tax.creditAccountText };
            }

            if (tax.receita) {
              taxResult.br_receita = { value: tax.receita, text: tax.receitaText };
            }
            if (tax.taxSituation) {
              taxResult.br_taxSituation = { value: tax.taxSituation, text: tax.taxSituationText };
            }

            if (tax.natureRevenue) {
              taxResult.br_natureRevenue = { value: tax.natureRevenue, text: tax.natureRevenueText };
            }
            if (tax.regimenCatalog) {
              taxResult.br_regimenCatalog = { value: tax.regimenCatalog, text: tax.regimenCatalogText };
            }

            if (tax.relatedDocType) {
              taxResult.br_relatedDocType = { value: tax.relatedDocType, text: tax.relatedDocTypeText };
            }

            if (tax.recordType == "cc") {
              taxResult.contributoryClass = tax.recordId;
            } else {
              taxResult.nationalTax = tax.recordId;
            }

            return taxResult;
          }
        }
      }

      return null;
    }

    function getCustomSegments() {
      var customSegments = [];
      var segmentSearch = search.create({
        type: "customrecord_lmry_setup_cust_segm",
        filters: [
          ["isinactive", "is", "F"]
        ],
        columns: ["internalid", "custrecord_lmry_setup_cust_segm"]
      });

      var results = segmentSearch.run().getRange(0, 1000);
      var segmentIds = [];
      if (results && results.length) {
        for (var i = 0; i < results.length; i++) {
          var name = results[i].getValue("custrecord_lmry_setup_cust_segm") || "";
          name = name.trim();
          if (name) {
            segmentIds.push(name);
          }
        }

        if (segmentIds.length) {
          var filterSegments = [];
          for (var i = 0; i < segmentIds.length; i++) {
            filterSegments.push("OR", ["scriptid", "is", segmentIds[i]]);
          }
          filterSegments = filterSegments.slice(1);

          var customSegmentSearch = search.create({
            type: "customsegment",
            filters: [
              ["isinactive", "is", "F"], "AND",
              ["glimpact", "is", "T"], "AND",
              filterSegments
            ],
            columns: ["internalid", "scriptid"]
          });

          var results = customSegmentSearch.run().getRange(0, 1000);
          if (results && results.length) {
            for (var i = 0; i < results.length; i++) {
              var segmentId = results[i].getValue("scriptid");
              customSegments.push(segmentId);
            }
          }
        }
      }

      return customSegments;
    }

    function getSubstitutionTaxes(options) {
      var stTaxResults = [];
      var mvaRecords = options.mvaRecords;
      var grossAmt = options.grossAmt;
      var exchangeRate = options.exchangeRate;
      var discountAmt = options.discountAmt;
      if (mvaRecords.length && options.taxResults.length && !discountAmt) {
        var stTaxes = {};
        options.taxes.forEach(function (tax) {
          if (tax.isSubstitutionTax) {
            mvaRecords.filter(function (m) {
              return Number(m.substiTaxSubtype) == Number(tax.subTypeId) && round4(m.substiTaxRate) == round4(tax.taxRate);
            }).forEach(function (m) {
              if (!stTaxes.hasOwnProperty(m.mvaId)) {
                stTaxes[m.mvaId] = [];
              }
              stTaxes[m.mvaId].push(tax);
            });
          }
        });

        if (Object.keys(stTaxes).length) {
          var totalTaxesNotIncluded = 0.00;
          options.taxResults.forEach(function (tr) {
            if (tr.br_isTaxNotIncluded) {
              totalTaxesNotIncluded += (tr.taxAmount || 0.00);
            }
          });

          options.taxResults.forEach(function (tr) {
            mvaRecords.filter(function (m) {
              return Number(m.taxSubtype) == Number(tr.subType.value) && round4(m.taxRate) == round4(tr.taxRate);
            }).forEach(function (m) {
              if (stTaxes.hasOwnProperty(m.mvaId)) {
                var taxRate = tr.taxRate;
                var mvaRate = m.mvaRate;
                var baseSt = (grossAmt + totalTaxesNotIncluded) * (1 + mvaRate);
                baseSt = round2(baseSt);
                if (baseSt) {
                  stTaxes[m.mvaId].forEach(function (tax) {
                    var stTaxRate = tax.taxRate;
                    var stTaxAmount = baseSt * stTaxRate - grossAmt * taxRate;
                    if (stTaxAmount > 0 && round2(stTaxAmount) > 0) {

                      var lc_baseAmount = baseSt;
                      var lc_taxAmount = stTaxAmount;
                      var lc_grossAmount = grossAmt;

                      if (exchangeRate != 1) {
                        lc_baseAmount = baseSt * exchangeRate;
                        lc_taxAmount = stTaxAmount * exchangeRate;
                        lc_grossAmount = grossAmt * exchangeRate;
                      }

                      var taxResult = {
                        taxType: { value: "4", text: "Calculo de Impuestos" },
                        appliesTo: { value: tax.appliesTo, text: tax.appliesToText },
                        isExempt: tax.isExempt,
                        subType: { value: tax.subTypeId, text: tax.subTypeText },
                        lineUniqueKey: options.lineUniqueKey,
                        serviceCatalog: { value: tax.catalog, text: tax.catalogText },
                        br_nfceCatalog: tax.nfceCatalog,
                        baseAmount: baseSt,
                        taxAmount: stTaxAmount,
                        taxRate: tax.taxRate,
                        taxCode: tax.taxCode,
                        generatedTransaction: { value: tax.genTran, text: tax.genTranText },
                        item: { value: options.itemId, text: options.itemText },
                        generateImpact: false,
                        position: options.position,
                        description: tax.description,
                        br_isSubstitutionTax: true,
                        br_isTaxNotIncluded: true,
                        taxItem: tax.taxItem,
                        lc_baseAmount: lc_baseAmount,
                        lc_taxAmount: lc_taxAmount,
                        lc_grossAmount: lc_grossAmount
                      };

                      if (tax.receita) {
                        taxResult.br_receita = { value: tax.receita, text: tax.receitaText };
                      }
                      if (tax.taxSituation) {
                        taxResult.br_taxSituation = { value: tax.taxSituation, text: tax.taxSituationText };
                      }

                      if (tax.natureRevenue) {
                        taxResult.br_natureRevenue = { value: tax.natureRevenue, text: tax.natureRevenueText };
                      }
                      if (tax.regimenCatalog) {
                        taxResult.br_regimenCatalog = { value: tax.regimenCatalog, text: tax.regimenCatalogText };
                      }

                      if (tax.relatedDocType) {
                        taxResult.br_relatedDocType = { value: tax.relatedDocType, text: tax.relatedDocTypeText };
                      }

                      if (tax.recordType == "cc") {
                        taxResult.contributoryClass = tax.recordId;
                      } else {
                        taxResult.nationalTax = tax.recordId;
                      }

                      stTaxResults.push(taxResult);
                    }
                  });
                }
              }
            });
          });
        }
      }
      return stTaxResults;
    }

    function updateLines(recordObj, setupTax, taxResults) {
      var amounts = {};
      var numItems = recordObj.getLineCount({ sublistId: "item" });
      for (var i = 0; i < numItems; i++) {
        var netAmt = recordObj.getSublistValue({ sublistId: "item", fieldId: "amount", line: i }) || 0.00;
        netAmt = parseFloat(netAmt);
        var grossAmt = recordObj.getSublistValue({ sublistId: "item", fieldId: "grossamt", line: i }) || 0.00;
        grossAmt = parseFloat(grossAmt);
        var quantity = recordObj.getSublistValue({ sublistId: "item", fieldId: "quantity", line: i }) || 0.00;
        quantity = parseFloat(quantity);
        var isTaxItem = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_ar_item_tributo", line: i }) || false;
        var typeDiscount = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_col_sales_type_discount', line: i });
        var itemType = recordObj.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i }) || "";

        if (netAmt > 0 && (isTaxItem == false || isTaxItem == "F") && !typeDiscount && GroupTypeItems.indexOf(itemType) == -1) {
          var taxTotalLine = 0.00;
          taxResults.filter(function (tr) {
            return Number(tr.position) == i && !tr.isExempt && !tr.br_isTaxNotIncluded && !tr.br_isSubstitutionTax;
          }).forEach(function (tr) {
            taxTotalLine += (tr.taxAmount || 0.00);
          });

          taxTotalLine = round2(taxTotalLine) || 0.00;
          if (setupTax.taxFlow == 1) { //Flujo 0
            var newGrossAmt = round2(netAmt + taxTotalLine);
            recordObj.setSublistValue({ sublistId: "item", fieldId: "tax1amt", line: i, value: taxTotalLine });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_base_amount", line: i, value: netAmt });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_total_impuestos", line: i, value: taxTotalLine })

            amounts[i] = { netAmt: netAmt, taxAmt: taxTotalLine, grossAmt: newGrossAmt };
          } else if (setupTax.taxFlow == 2) {//Flujo 1
            var newNetAmt = grossAmt;
            if (taxTotalLine) {
              newNetAmt = round2(grossAmt - taxTotalLine);
            }

            var newRate = newNetAmt / quantity;

            if (FEAT_MULTPRICE == true || FEAT_MULTPRICE == "T") {
              recordObj.setSublistValue({ sublistId: "item", fieldId: "price", line: i, value: -1 });
            }
            recordObj.setSublistValue({ sublistId: "item", fieldId: "rate", line: i, value: newRate });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "amount", line: i, value: newNetAmt });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "tax1amt", line: i, value: taxTotalLine });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_base_amount", line: i, value: grossAmt });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_total_impuestos", line: i, value: taxTotalLine });

            amounts[i] = { netAmt: newNetAmt, taxAmt: taxTotalLine, grossAmt: grossAmt };
          } else if (setupTax.taxFlow == 3 || setupTax.taxFlow == 5) {//Flujo 2
            var newNetAmt = netAmt;
            if (taxTotalLine) {
              newNetAmt = round2(netAmt + taxTotalLine);
            }
            var newRate = newNetAmt / quantity;

            if (FEAT_MULTPRICE == true || FEAT_MULTPRICE == "T") {
              recordObj.setSublistValue({ sublistId: "item", fieldId: "price", line: i, value: -1 });
            }

            recordObj.setSublistValue({ sublistId: "item", fieldId: "rate", line: i, value: newRate });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "amount", line: i, value: newNetAmt });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "tax1amt", line: i, value: 0.00 });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "grossamt", line: i, value: newNetAmt });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_base_amount", line: i, value: netAmt });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_total_impuestos", line: i, value: taxTotalLine })

            amounts[i] = { netAmt: newNetAmt, taxAmt: 0.00, grossAmt: newNetAmt }
          } else if (setupTax.taxFlow == 4) {//Flujo 3
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_base_amount", line: i, value: grossAmt });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_total_impuestos", line: i, value: taxTotalLine });

            amounts[i] = { netAmt: grossAmt, taxAmt: 0.00, grossAmt: grossAmt };
          }
        }
      }

      return amounts;
    }

    function createSteTaxRecord(recordObj, taxResults) {
      var steId = [];
      var condition = true;
      var contador = 0;
      var taxTemp = [];
      var taxResultsCopy = JSON.parse(JSON.stringify(taxResults));
      while (condition) {
        taxTemp.push(taxResultsCopy[contador]);
        if (JSON.stringify(taxTemp).length > 950000 || (contador == taxResultsCopy.length - 1)) {
          taxResultsCopy.splice(0, contador + 1);
          contador = -1;
          var steRecord = record.create({
            type: "customrecord_lmry_ste_json_result"
          });
          steRecord.setValue({ fieldId: "custrecord_lmry_ste_related_transaction", value: recordObj.id });
          steRecord.setValue({ fieldId: "custrecord_lmry_ste_related_trans_id", value: String(recordObj.id) });
          if (FEAT_SUBS == true || FEAT_SUBS == "T") {
            var subsidiary = recordObj.getValue("subsidiary");
            steRecord.setValue({ fieldId: "custrecord_lmry_ste_subsidiary", value: subsidiary });
          }

          if (library.getAuthorization(596, licenses) || runtime.executionContext == "MAPREDUCE") {
            steRecord.setValue({ fieldId: "custrecord_lmry_ste_taxresult_generated", value: true });
          } else {
            steRecord.setValue({ fieldId: "custrecord_lmry_ste_taxresult_generated", value: false });
          }

          steRecord.setValue({ fieldId: "custrecord_lmry_ste_subsidiary_country", value: 30 });//Brasil
          steRecord.setValue({ fieldId: "custrecord_lmry_ste_transaction_date", value: recordObj.getValue("trandate") });
          steRecord.setValue({ fieldId: "custrecord_lmry_ste_tax_transaction", value: JSON.stringify(taxTemp) });
          steId.push(steRecord.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true }));
          taxTemp = [];
        }
        if (!taxResultsCopy.length) condition = false;
        contador++;
      }

      return steId;
    }

    function createTaxResults(recordObj, taxResults) {
      taxResults.forEach(function (tr) {
        var recordTr = record.create({
          type: 'customrecord_lmry_br_transaction'
        });

        recordTr.setValue({ fieldId: 'custrecord_lmry_br_related_id', value: String(recordObj.id) });
        recordTr.setValue({ fieldId: 'custrecord_lmry_br_transaction', value: recordObj.id });
        recordTr.setValue({ fieldId: 'custrecord_lmry_br_type', value: tr.subType.text });
        recordTr.setValue({ fieldId: 'custrecord_lmry_br_type_id', value: tr.subType.value });

        recordTr.setValue({ fieldId: 'custrecord_lmry_base_amount', value: round4(tr.baseAmount) });
        recordTr.setValue({ fieldId: 'custrecord_lmry_br_total', value: round4(tr.taxAmount) });
        recordTr.setValue({ fieldId: 'custrecord_lmry_br_percent', value: tr.taxRate });

        recordTr.setValue({ fieldId: 'custrecord_lmry_total_item', value: 'Line - Item' });
        recordTr.setValue({ fieldId: 'custrecord_lmry_item', value: tr.item.value });
        recordTr.setValue({ fieldId: 'custrecord_lmry_br_positem', value: tr.position });
        recordTr.setValue({ fieldId: 'custrecord_lmry_lineuniquekey', value: tr.lineUniqueKey });

        if (tr.hasOwnProperty("contributoryClass")) { // Entidad - Totales || Entidad - Items || Entidad - Expenses
          recordTr.setValue({ fieldId: 'custrecord_lmry_ccl', value: tr.contributoryClass });
          recordTr.setValue({ fieldId: 'custrecord_lmry_br_ccl', value: tr.contributoryClass });
        } else if (tr.hasOwnProperty("nationalTax")) {
          recordTr.setValue({ fieldId: 'custrecord_lmry_ntax', value: tr.nationalTax });
          recordTr.setValue({ fieldId: 'custrecord_lmry_br_ccl', value: tr.nationalTax });
        }
        // recordSummary.setValue({ fieldId: 'custrecord_lmry_accounting_books', value: concatAccountBooks});
        recordTr.setValue({ fieldId: 'custrecord_lmry_tax_description', value: tr.description || "" });
        recordTr.setValue({ fieldId: 'custrecord_lmry_total_base_currency', value: round4(tr.lc_taxAmount) });
        recordTr.setValue({ fieldId: 'custrecord_lmry_tax_type', value: '4' });
        if (tr.hasOwnProperty("br_receita")) {
          recordTr.setValue({ fieldId: 'custrecord_lmry_br_receta', value: tr.br_receita.value });
        }
        if (tr.hasOwnProperty("br_taxSituation")) {
          recordTr.setValue({ fieldId: 'custrecord_lmry_br_tax_taxsituation', value: tr.br_taxSituation.value });
        }
        if (tr.hasOwnProperty("br_natureRevenue")) {
          recordTr.setValue({ fieldId: 'custrecord_lmry_br_tax_nature_revenue', value: tr.br_natureRevenue.value });
        }
        if (tr.hasOwnProperty("br_regimenCatalog")) {
          recordTr.setValue({ fieldId: 'custrecord_lmry_br_regimen_asoc_catalog', value: tr.br_regimenCatalog.value });
        }
        recordTr.setValue({ fieldId: "custrecord_lmry_gross_amt", value: tr.grossAmount });

        if (tr.discountAmount) {
          recordTr.setValue({ fieldId: "custrecord_lmry_discount_amt", value: tr.discountAmount });
        }
        recordTr.setValue({ fieldId: "custrecord_lmry_base_amount_local_currc", value: tr.lc_baseAmount });
        recordTr.setValue({ fieldId: "custrecord_lmry_amount_local_currency", value: tr.lc_taxAmount })
        recordTr.setValue({ fieldId: "custrecord_lmry_gross_amt_local_curr", value: tr.lc_grossAmount });

        if (tr.lc_discountAmount) {
          recordTr.setValue({ fieldId: "custrecord_lmry_discount_amt_local_curr", value: tr.lc_discountAmount });
        }

        if (tr.br_isSubstitutionTax) {
          recordTr.setValue({ fieldId: "custrecord_lmry_is_substitution_tax_resu", value: tr.br_isSubstitutionTax });
        }

        if (tr.hasOwnProperty("br_relatedDocType")) {
          recordTr.setValue({ fieldId: "custrecord_lmry_br_tr_document_type", value: tr.br_relatedDocType.value });
        }

        if (tr.br_applyReinf) {
          recordTr.setValue({ fieldId: "custrecord_lmry_br_apply_reinf", value: tr.br_applyReinf });
        }

        recordTr.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });
      });
    }


    function resetLines(recordObj, setupTax) {
      var numItems = recordObj.getLineCount({ sublistId: "item" });
      for (var i = 0; i < numItems; i++) {
        var netAmt = recordObj.getSublistValue({ sublistId: "item", fieldId: "amount", line: i }) || 0.00;
        netAmt = parseFloat(netAmt);
        var grossAmt = recordObj.getSublistValue({ sublistId: "item", fieldId: "grossamt", line: i }) || 0.00;
        grossAmt = parseFloat(grossAmt);
        var quantity = recordObj.getSublistValue({ sublistId: "item", fieldId: "quantity", line: i }) || 0.00;
        quantity = parseFloat(quantity);
        var oldBaseAmt = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_base_amount", line: i }) || 0.00;
        oldBaseAmt = parseFloat(oldBaseAmt);
        var isTaxItem = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_lmry_ar_item_tributo", line: i }) || false;
        var typeDiscount = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_col_sales_type_discount', line: i });
        var itemType = recordObj.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i }) || "";

        if (netAmt > 0 && (isTaxItem == false || isTaxItem == "F") && !typeDiscount && GroupTypeItems.indexOf(itemType) == -1) {

          if ([1, 2, 4].indexOf(setupTax.taxFlow) !== -1) {//Flujo 0,1,3

            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_base_amount", line: i, value: "" });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_total_impuestos", line: i, value: "" });

          } else if ((setupTax.taxFlow == 3 || setupTax.taxFlow == 5) && oldBaseAmt) {//Flujo 2 (oldBaseAmt = Old Net Amt)

            var newNetAmt = oldBaseAmt;
            var newRate = newNetAmt / quantity;

            if (FEAT_MULTPRICE == true || FEAT_MULTPRICE == "T") {
              recordObj.setSublistValue({ sublistId: "item", fieldId: "price", line: i, value: -1 });
            }

            recordObj.setSublistValue({ sublistId: "item", fieldId: "rate", line: i, value: newRate });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "amount", line: i, value: newNetAmt });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "tax1amt", line: i, value: 0.00 });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "grossamt", line: i, value: newNetAmt });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_base_amount", line: i, value: "" });
            recordObj.setSublistValue({ sublistId: "item", fieldId: "custcol_lmry_br_total_impuestos", line: i, value: "" })
          }
        }
      }
    }


    function getPhase1Taxes(taxes) {
      if (!taxes) return [];
      return taxes.filter(function (tax) {
        return !tax.isSubstitutionTax && !tax.isTeleComTax && !tax.isBaseReduction;
      });
    }

    function getPhase2Taxes(taxes) {
      if (!taxes) return [];
      return taxes.filter(function (tax) {
        return !tax.isSubstitutionTax && !tax.isTeleComTax && tax.isBaseReduction;
      });
    }

    function getPhase3Taxes(taxes) {
      if (!taxes) return [];
      return taxes.filter(function (tax) {
        return !tax.isSubstitutionTax && tax.isTeleComTax;
      });
    }

    return {
      beforeSubmitTransaction: beforeSubmitTransaction,
      afterSubmitTransaction: afterSubmitTransaction,
      cleanLinesforCopy: cleanLinesforCopy,
      deleteTaxResults: deleteTaxResults,
      deleteTaxLines: deleteTaxLines
    };

  });
/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       Jul 2018        LatamReady
 * File : LMRY_TAX_TransactionPLGN.js
 */
var objContext = nlapiGetContext();

var LMRY_script = 'LatamReady - LatamTAX Plug-in';
var featureMB = false;
var featureSubs = false;
var featureDep = false;
var featureLoc = false;
var featureCla = false;
var arreglo_SumaBaseBR = new Array();
var arreglo_IndiceBaseBR = new Array();
var fecha = new Date();
var subsidiary = '';
var entity = 0;
var FEAT_ACC_MAPPING = false;
var reverse = '';
var FEAT_CUSTOMSEGMENTS = false;
var FEAT_SUITETAX = false;
var customSegments = [];
var Json_GMA = {};
var licenses = [];
const GroupTypeItems = ["Group", "EndGroup"];

function customizeGlImpact(transactionRecord, standardLines, customLines, book) {

    try {

        var country = transactionRecord.getFieldText("custbody_lmry_subsidiary_country");
        if (country != '' && country != null) {
            country = country.substring(0, 3).toUpperCase();
        }

        var transactionType = transactionRecord.getRecordType();

        if (!validateMemo(transactionRecord)) {
            return true;
        }

        if (!transactionRecord.id) {
            return;
        }

        //FEATURES 3.0
        licenses = getLicenses(transactionRecord.getFieldValue('subsidiary'));

        var flag = validarPais(country, transactionType, licenses);
        if (flag == false) {
            return true;
        }
        var usageRemaining = objContext.getRemainingUsage();
        nlapiLogExecution("ERROR", "Unidades de memoria", usageRemaining);

        //Obteniendo features de localizacion
        featureDep = objContext.getSetting('FEATURE', 'DEPARTMENTS');
        featureLoc = objContext.getSetting('FEATURE', 'LOCATIONS');
        featureCla = objContext.getSetting('FEATURE', 'CLASSES');

        //Obteniendo features de instancia
        featureSubs = objContext.getFeature('SUBSIDIARIES');
        featureMB = objContext.getFeature('MULTIBOOK');

        entity = transactionRecord.getFieldValue("entity");
        fecha = transactionRecord.getFieldValue("trandate");
        reverse = transactionRecord.getFieldValue("custbody_lmry_br_reverse_gl_impact");
        if (!reverse) {
            reverse = 0;
        }

        FEAT_ACC_MAPPING = objContext.getFeature('coaclassificationmanagement');
        FEAT_CUSTOMSEGMENTS = objContext.getFeature("customsegments");
        FEAT_SUITETAX = objContext.getFeature("tax_overhauling");

        if (featureSubs) {
            subsidiary = transactionRecord.getFieldValue("subsidiary");
        } else {
            subsidiary = 1;
        }

        //Obtiene el Global Account Mapping
        if (featureMB == true || featureMB == 'T') {
            obtainsAccounts(book.getId());
        }

        var idTransaction = nlapiGetRecordId();

        nlapiLogExecution("DEBUG", "transactionType", transactionType);
        var isTaxCalculator = checkIsTaxCalculator(transactionRecord);
        nlapiLogExecution("DEBUG", "isTaxCalculator", isTaxCalculator);

        customSegments = getCustomSegments();
        nlapiLogExecution("ERROR", "customSegments", JSON.stringify(customSegments));

        /**********************************************************
         * Busqueda en el record: LatamReady - Setup Tax Subsidiary
         **********************************************************/
        var clasificacionCC = false,
            summary = false,
            accountCC = false,
            rounding = "",
            depSetup = "",
            classSetup = "",
            locSetup = "";
        var currencySetup = "";
        var taxCalculationForm = 1;
        var filterLoc = false;
        var apTaxFlow = 1;
        var filtros = new Array();
        var checkLineUnique = false;
        filtros[0] = new nlobjSearchFilter("isinactive", null, "is", ['F']);
        if (featureSubs) {
            filtros[1] = new nlobjSearchFilter("custrecord_lmry_setuptax_subsidiary", null, "is", [subsidiary]);
        }
        var columnas = new Array();
        columnas[0] = new nlobjSearchColumn("custrecord_lmry_setuptax_subsidiary");
        columnas[1] = new nlobjSearchColumn("custrecord_lmry_setuptax_depclassloc");
        columnas[2] = new nlobjSearchColumn("custrecord_lmry_setuptax_summarized_gl");
        columnas[3] = new nlobjSearchColumn("custrecord_lmry_setuptax_account");
        columnas[4] = new nlobjSearchColumn("custrecord_lmry_setuptax_type_rounding");
        columnas[5] = new nlobjSearchColumn("custrecord_lmry_setuptax_department");
        columnas[6] = new nlobjSearchColumn("custrecord_lmry_setuptax_class");
        columnas[7] = new nlobjSearchColumn("custrecord_lmry_setuptax_location");
        columnas[8] = new nlobjSearchColumn("custrecord_lmry_setuptax_currency");
        columnas[9] = new nlobjSearchColumn("custrecord_lmry_setuptax_br_taxfromgross");
        columnas[10] = new nlobjSearchColumn("custrecord_lmry_setuptax_br_filterloc");
        columnas[11] = new nlobjSearchColumn("custrecord_lmry_setuptax_br_ap_flow");
        columnas[12] = new nlobjSearchColumn("custrecord_lmry_add_lineunique_glimpact");

        var searchSetupSubsidiary = nlapiCreateSearch("customrecord_lmry_setup_tax_subsidiary", filtros, columnas);
        var resultSearchSub = searchSetupSubsidiary.runSearch().getResults(0, 1000);

        if (resultSearchSub.length != null && resultSearchSub.length > 0) {
            clasificacionCC = resultSearchSub[0].getValue("custrecord_lmry_setuptax_depclassloc");
            summary = resultSearchSub[0].getValue("custrecord_lmry_setuptax_summarized_gl");
            accountCC = resultSearchSub[0].getValue("custrecord_lmry_setuptax_account");
            rounding = resultSearchSub[0].getValue("custrecord_lmry_setuptax_type_rounding");
            depSetup = resultSearchSub[0].getValue("custrecord_lmry_setuptax_department");
            classSetup = resultSearchSub[0].getValue("custrecord_lmry_setuptax_class");
            locSetup = resultSearchSub[0].getValue("custrecord_lmry_setuptax_location");
            currencySetup = resultSearchSub[0].getValue("custrecord_lmry_setuptax_currency");
            taxCalculationForm = resultSearchSub[0].getValue("custrecord_lmry_setuptax_br_taxfromgross") || 1;
            taxCalculationForm = Number(taxCalculationForm);
            filterLoc = resultSearchSub[0].getValue("custrecord_lmry_setuptax_br_filterloc");
            apTaxFlow = resultSearchSub[0].getValue("custrecord_lmry_setuptax_br_ap_flow") || 1;
            checkLineUnique = resultSearchSub[0].getValue("custrecord_lmry_add_lineunique_glimpact");

            //nlapiLogExecution('ERROR', 'filterLoc', filterLoc);
        }

        if (!isTaxCalculator) {
            //Se cargan valores de cabecera del Custom Segments.
            var transactionSegments = {}
            for (var i = 0; i < customSegments.length; i++) {
                if (transactionRecord.getFieldValue(customSegments[i])) {
                    transactionSegments[customSegments[i]] = transactionRecord.getFieldValue(customSegments[i]);
                }
            }

            // Variables de Preferencias Generales
            var prefDep = objContext.getPreference('DEPTMANDATORY');
            var prefLoc = objContext.getPreference('LOCMANDATORY');
            var prefClas = objContext.getPreference('CLASSMANDATORY');
            var prefDepLine = objContext.getPreference('DEPTSPERLINE');
            var prefClassLine = objContext.getPreference('CLASSESPERLINE');

            //nlapiLogExecution("ERROR", 'prefDep , prefLoc , prefClas', prefDep + ' , ' + prefLoc + ' , ' + prefClas);
            var salesTransactionTypes = ["invoice", "creditmemo", "salesorder", "estimate"];

            //Transaccion de ventas y estado 2 : Calculo de impuestos
            if (salesTransactionTypes.indexOf(transactionType) != -1) {
                //Busqueda del record tax result json
                if (transactionRecord.id) {
                    var steSearch = nlapiCreateSearch("customrecord_lmry_ste_json_result", [
                        ["isinactive", "is", "F"], "AND",
                        ["custrecord_lmry_ste_related_transaction", "anyof", transactionRecord.id]
                    ], [
                        new nlobjSearchColumn("internalid"),
                        new nlobjSearchColumn("custrecord_lmry_ste_tax_transaction")
                    ]);

                    var results = steSearch.runSearch().getResults(0, 1);
                    if (results && results.length) {
                        var taxResults = results[0].getValue("custrecord_lmry_ste_tax_transaction");
                        if (taxResults) {
                            taxResults = JSON.parse(taxResults);
                            var glLines = {};
                            var exchangeRateBook = getExchangeRateByBook(transactionRecord, book);
                            nlapiLogExecution("DEBUG", "exchangeRateBook", exchangeRateBook);
                            taxResults.forEach(function (tr, i) {
                                var debitAccount = tr.debitAccount.value;
                                var creditAccount = tr.creditAccount.value;

                                if (transactionType == "creditmemo" && Number(reverse) != 1) {
                                    debitAccount = tr.creditAccount.value;
                                    creditAccount = tr.debitAccount.value;
                                }

                                var taxAmount = tr.taxAmount;
                                if (exchangeRateBook != 1) {
                                    taxAmount = tr.taxAmount * exchangeRateBook;
                                }

                                if (debitAccount && creditAccount && taxAmount && !tr.br_isSubstitutionTax && !tr.br_isTaxNotIncluded) {
                                    var department = tr.department || "";
                                    var class_ = tr["class"] || "";
                                    var location = tr.location || "";
                                    if (!book.isPrimary()) {
                                        debitAccount = getAccount(debitAccount, department, class_, location);
                                        creditAccount = getAccount(creditAccount, department, class_, location);
                                    }

                                    var memo = "";
                                    if (checkLineUnique == 'T' || checkLineUnique == true) {
                                        if (tr.contributoryClass) {
                                            memo = tr.subType.text + ' (LatamTax - Contributory Class) - (ID Item: ' + (tr.item.value || "") + ') - (Line Unique Key: ' + tr.lineUniqueKey + ')';
                                        } else if (tr.nationalTax) {
                                            memo = tr.subType.text + ' (LatamTax - National Taxes) - (ID Item: ' + (tr.item.value || "") + ') - (Line Unique Key: ' + tr.lineUniqueKey + ')';
                                        }
                                    } else {
                                        if (tr.contributoryClass) {
                                            memo = tr.subType.text + ' (LatamTax - Contributory Class) - (ID Item: ' + (tr.item.value || "") + ')';
                                        } else if (tr.nationalTax) {
                                            memo = tr.subType.text + ' (LatamTax - National Taxes) - (ID Item: ' + (tr.item.value || "") + ')';
                                        }
                                    }

                                    if (summary == "F" || summary == false) {//Detallado
                                        glLines[i] = {
                                            debitAccount: debitAccount,
                                            creditAccount: creditAccount,
                                            amount: taxAmount,
                                            department: department,
                                            class_: class_,
                                            location: location,
                                            csegments: tr.customSegments,
                                            memo: memo
                                        };
                                    } else {//Summarized
                                        var keyGroup = [tr.subType.value, debitAccount, creditAccount, department || 0, class_ || 0, location || 0];
                                        customSegments.forEach(function (s) {
                                            keyGroup.push(tr.customSegments[s] || 0);
                                        });

                                        keyGroup = keyGroup.join("-");
                                        if (!glLines.hasOwnProperty(keyGroup)) {
                                            glLines[keyGroup] = {
                                                debitAccount: debitAccount,
                                                creditAccount: creditAccount,
                                                amount: 0.00,
                                                department: department,
                                                class_: class_,
                                                location: location,
                                                csegments: tr.customSegments,
                                                memo: memo //Si hay solo 1 linea agrupada, el memo es igual al detallado
                                            };
                                        } else {
                                            glLines[keyGroup].memo = tr.subType.text + ' (Summarized - Items)';//memo si es mas de 1 linea
                                        }
                                        glLines[keyGroup].amount = glLines[keyGroup].amount + taxAmount;
                                    }
                                }
                            });

                            nlapiLogExecution("DEBUG", "glLines", JSON.stringify(glLines));
                            for (var key in glLines) {
                                var line = glLines[key];
                                var amount = round2(line.amount);
                                if (amount) {
                                    var newLineDebit = customLines.addNewLine();
                                    newLineDebit.setDebitAmount(parseFloat(amount));
                                    newLineDebit.setAccountId(Number(line.debitAccount));
                                    newLineDebit.setMemo(line.memo);
                                    newLineDebit.setEntityId(Number(entity));

                                    if ((featureDep == true || featureDep == "T") && (prefDepLine == true || prefDepLine == "T") && Number(line.department)) {
                                        newLineDebit.setDepartmentId(Number(line.department));
                                    }

                                    if ((featureCla == true || featureCla == "T") && (prefClassLine == true || prefClassLine == "T") && Number(line.class_)) {
                                        newLineDebit.setClassId(Number(line.class_));
                                    }

                                    if ((featureLoc == true || featureLoc == "T") && Number(line.location)) {
                                        newLineDebit.setLocationId(Number(line.location));
                                    }

                                    for (var segmentId in line.csegments) {
                                        if (Number(line.csegments[segmentId])) {
                                            newLineDebit.setSegmentValueId(segmentId, Number(line.csegments[segmentId]));
                                        }
                                    }

                                    var newLineCredit = customLines.addNewLine();
                                    newLineCredit.setCreditAmount(parseFloat(amount));
                                    newLineCredit.setAccountId(Number(line.creditAccount));
                                    newLineCredit.setMemo(line.memo);
                                    newLineCredit.setEntityId(Number(entity));

                                    if ((featureDep == true || featureDep == "T") && (prefDepLine == true || prefDepLine == "T") && Number(line.department)) {
                                        newLineCredit.setDepartmentId(Number(line.department));
                                    }

                                    if ((featureCla == true || featureCla == "T") && (prefClassLine == true || prefClassLine == "T") && Number(line.class_)) {
                                        newLineCredit.setClassId(Number(line.class_));
                                    }

                                    if ((featureLoc == true || featureLoc == "T") && Number(line.location)) {
                                        newLineCredit.setLocationId(Number(line.location));
                                    }

                                    for (var segmentId in line.csegments) {
                                        if (Number(line.csegments[segmentId])) {
                                            newLineCredit.setSegmentValueId(segmentId, Number(line.csegments[segmentId]));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                //Purchase Automatico Flow
                nlapiLogExecution("ERROR", "getAuthorization(527) ", getAuthorization(527, licenses));
                if (getAuthorization(527, licenses) == true && (transactionRecord.id != null && transactionRecord.id != '')) {
                    var exchangeRateBook = getExchangeRateByBook(transactionRecord, book);
                    nlapiLogExecution("ERROR", "exchangeRateBook", exchangeRateBook);
                    var filters = [];
                    filters.push(new nlobjSearchFilter("custrecord_lmry_br_transaction", null, "is", transactionRecord.id));
                    filters.push(new nlobjSearchFilter("custrecord_lmry_tax_type", null, "anyof", '4'));

                    var columns = [];
                    columns.push(new nlobjSearchColumn("custrecord_lmry_br_type"));
                    columns.push(new nlobjSearchColumn("custrecord_lmry_br_total"));
                    columns.push(new nlobjSearchColumn("custrecord_lmry_br_positem"));
                    columns.push(new nlobjSearchColumn("custrecord_lmry_item"));
                    columns.push(new nlobjSearchColumn("custrecord_lmry_ccl"));
                    columns.push(new nlobjSearchColumn("custrecord_lmry_ntax"));
                    columns.push(new nlobjSearchColumn("custrecord_lmry_br_is_import_tax_result"));
                    columns.push(new nlobjSearchColumn("custrecord_lmry_ccl_br_nivel_contabiliz", "custrecord_lmry_ccl"));
                    columns.push(new nlobjSearchColumn("custrecord_lmry_nt_br_nivel_contabiliz", "custrecord_lmry_ntax"));
                    columns.push(new nlobjSearchColumn("custrecord_lmry_is_substitution_tax_resu"));
                    columns.push(new nlobjSearchColumn("custrecord_lmry_is_tax_not_included", "custrecord_lmry_br_type_id"));

                    var search_taxResults = nlapiCreateSearch("customrecord_lmry_br_transaction", filters, columns);
                    var results = search_taxResults.runSearch().getResults(0, 1000);
                    nlapiLogExecution("ERROR", "results ", results.length);
                    if (results && results.length) {
                        for (var i = 0; i < results.length; i++) {
                            var subtype = results[i].getValue('custrecord_lmry_br_type');
                            var amount = results[i].getValue('custrecord_lmry_br_total');
                            amount = round2(round2(amount) * exchangeRateBook);

                            if (parseFloat(amount) <= 0) {
                                continue;
                            }
                            var item = results[i].getValue('custrecord_lmry_item');
                            var position = parseInt(results[i].getValue("custrecord_lmry_br_positem")) + 1;
                            var ccl = results[i].getValue('custrecord_lmry_ccl');
                            var ntax = results[i].getValue('custrecord_lmry_ntax');
                            var isImportTax = results[i].getValue("custrecord_lmry_br_is_import_tax_result");
                            var isTaxSubstitution = results[i].getValue("custrecord_lmry_is_substitution_tax_resu");
                            var isTaxNotIncluded = results[i].getValue("custrecord_lmry_is_tax_not_included", "custrecord_lmry_br_type_id");
                            var creditAcc = '';
                            var debitAcc = '';
                            var glimpact = '';
                            var segmentConfig = '';
                            var labelmemo = '';

                            if (Number(apTaxFlow) == 4) {
                                if ((isTaxSubstitution == "T" || isTaxSubstitution == true) || (isTaxNotIncluded == "T" || isTaxNotIncluded == true)) {
                                    continue;
                                }
                            }

                            nlapiLogExecution("ERROR", "ccl ", ccl);
                            if (ccl != null && ccl != '') {
                                //nlapiLogExecution("ERROR", "entro ccl ", ccl);
                                var importTaxLevel = results[i].getValue("custrecord_lmry_ccl_br_nivel_contabiliz", "custrecord_lmry_ccl");
                                if ((isImportTax == "T" || isImportTax == true) && Number(importTaxLevel) != 1) {
                                    continue;
                                }

                                var cust_fields = ['custrecord_lmry_br_ccl_account2', 'custrecord_lmry_br_ccl_account1', 'custrecord_lmry_ccl_gl_impact', 'custrecord_lmry_ccl_config_segment'];
                                var dataCC = nlapiLookupField('customrecord_lmry_ar_contrib_class', ccl, cust_fields);
                                if (reverse == 1) {
                                    debitAcc = dataCC.custrecord_lmry_br_ccl_account2;
                                    creditAcc = dataCC.custrecord_lmry_br_ccl_account1;
                                } else {
                                    debitAcc = dataCC.custrecord_lmry_br_ccl_account1;
                                    creditAcc = dataCC.custrecord_lmry_br_ccl_account2;
                                }
                                glimpact = dataCC.custrecord_lmry_ccl_gl_impact;
                                segmentConfig = dataCC.custrecord_lmry_ccl_config_segment;
                                labelmemo = 'Contributory Class';
                            } else if (ntax != null && ntax != '') {
                                var importTaxLevel = results[i].getValue("custrecord_lmry_nt_br_nivel_contabiliz", "custrecord_lmry_ntax");
                                if ((isImportTax == "T" || isImportTax == true) && Number(importTaxLevel) != 1) {
                                    continue;
                                }

                                var cust_fields = ['custrecord_lmry_ntax_credit_account', 'custrecord_lmry_ntax_debit_account', 'custrecord_lmry_ntax_gl_impact', 'custrecord_lmry_ntax_config_segment'];
                                var dataNT = nlapiLookupField('customrecord_lmry_national_taxes', ntax, cust_fields);
                                if (reverse == 1) {
                                    debitAcc = dataNT.custrecord_lmry_ntax_credit_account;
                                    creditAcc = dataNT.custrecord_lmry_ntax_debit_account;
                                } else {
                                    debitAcc = dataNT.custrecord_lmry_ntax_debit_account;
                                    creditAcc = dataNT.custrecord_lmry_ntax_credit_account;
                                }
                                glimpact = dataNT.custrecord_lmry_ntax_gl_impact;
                                segmentConfig = dataNT.custrecord_lmry_ntax_config_segment;
                                labelmemo = 'National Taxes';
                            } else {
                                continue;
                            }
                            /*nlapiLogExecution("ERROR", "debitAcc ", debitAcc);
                            nlapiLogExecution("ERROR", "creditAcc ", creditAcc);
                            nlapiLogExecution("ERROR", "glimpact ", glimpact);
                            nlapiLogExecution("ERROR", "segmentConfig ", segmentConfig);*/

                            if (segmentConfig) {
                                segmentConfig = JSON.parse(segmentConfig);
                            } else {
                                segmentConfig = {};
                            }

                            if (glimpact == false || glimpact == 'F') {
                                continue;
                            }

                            var department = transactionRecord.getLineItemValue("item", "department", position) || transactionRecord.getFieldValue("department") || "0";
                            var class_ = transactionRecord.getLineItemValue("item", "class", position) || transactionRecord.getFieldValue("class") || "0";
                            var location = transactionRecord.getLineItemValue("item", "location", position) || transactionRecord.getFieldValue("location") || "0";

                            if (clasificacionCC == true || clasificacionCC == 'T') { // Segmentacion de la Clase Contributiva
                                var dep1 = elegirSegmentacion(prefDep, department, transactionRecord.getFieldValue("department"), depSetup, transactionRecord.getFieldValue("department"));
                                var cla1 = elegirSegmentacion(prefClas, class_, transactionRecord.getFieldValue("class"), classSetup, transactionRecord.getFieldValue("class"));
                                var loc1 = elegirSegmentacion(prefLoc, location, transactionRecord.getFieldValue("location"), locSetup, transactionRecord.getFieldValue("location"));
                            } else { // Segmentacion de la Transaccion
                                var dep1 = elegirSegmentacion(prefDep, transactionRecord.getFieldValue("department"), department, depSetup, '');
                                var cla1 = elegirSegmentacion(prefClas, transactionRecord.getFieldValue("class"), class_, classSetup, '');
                                var loc1 = elegirSegmentacion(prefLoc, transactionRecord.getFieldValue("location"), location, locSetup, '');
                            }

                            // Cuenta dependiendo del Libro Contable
                            if (!book.isPrimary()) {
                                debitAcc = getAccount(debitAcc, dep1, cla1, loc1);
                                creditAcc = getAccount(creditAcc, dep1, cla1, loc1);
                            }

                            var newLineDebit = customLines.addNewLine();
                            newLineDebit.setDebitAmount(amount);
                            newLineDebit.setAccountId(parseFloat(debitAcc));
                            newLineDebit.setMemo(subtype + ' (LatamTax - ' + labelmemo + ')');
                            if (dep1 != '' && dep1 != null && dep1 != 0 && (prefDepLine == true || prefDepLine == 'T')) {
                                newLineDebit.setDepartmentId(parseInt(dep1));
                            }
                            if (cla1 != '' && cla1 != null && cla1 != 0 && (prefClassLine == true || prefClassLine == 'T')) {
                                newLineDebit.setClassId(parseInt(cla1));
                            }
                            if (loc1 != '' && loc1 != null && loc1 != 0) {
                                newLineDebit.setLocationId(parseInt(loc1));
                            }

                            if (customSegments.length) {
                                for (var s = 0; s < customSegments.length; s++) {
                                    var segmentId = customSegments[s];
                                    var segmentValue = segmentConfig[segmentId] || transactionSegments[segmentId] || "";

                                    if (segmentValue) {
                                        newLineDebit.setSegmentValueId(segmentId, parseInt(segmentValue));
                                    }
                                }
                            }

                            newLineDebit.setEntityId(parseInt(entity));

                            var newLineCredit = customLines.addNewLine();
                            newLineCredit.setCreditAmount(amount);
                            newLineCredit.setAccountId(parseFloat(creditAcc));
                            newLineCredit.setMemo(subtype + ' (LatamTax - ' + labelmemo + ')');
                            if (dep1 != '' && dep1 != null && dep1 != 0 && (prefDepLine == true || prefDepLine == 'T')) {
                                newLineCredit.setDepartmentId(parseInt(dep1));
                            }
                            if (cla1 != '' && cla1 != null && cla1 != 0 && (prefClassLine == true || prefClassLine == 'T')) {
                                newLineCredit.setClassId(parseInt(cla1));
                            }
                            if (loc1 != '' && loc1 != null && loc1 != 0) {
                                newLineCredit.setLocationId(parseInt(loc1));
                            }

                            if (customSegments.length) {
                                for (var s = 0; s < customSegments.length; s++) {
                                    var segmentId = customSegments[s];
                                    var segmentValue = segmentConfig[segmentId] || transactionSegments[segmentId] || "";

                                    if (segmentValue) {
                                        newLineCredit.setSegmentValueId(segmentId, parseInt(segmentValue));
                                    }
                                }
                            }

                            newLineCredit.setEntityId(parseInt(entity));


                        }
                    }
                }

            }
            /*************************************************************************************
             * Logica del Tax Calculator BR - FE
             *************************************************************************************/
        } else {
            agregarTaxCalculatorBR(transactionRecord, customLines, book, rounding, summary, checkLineUnique);
        }
        //nlapiLogExecution("ERROR", "Unidades de memoria", usageRemaining);
    } catch (err) {
        //nlapiLogExecution('ERROR', 'customizeGlImpact', err);
        sendemail(' [ customizeGlImpact ] ' + err, LMRY_script);
    }
}

/********************************************************
 * Funcion que valida si el flujo debe correr en el pais
 * Parámetros :
 *      country : 3 primeras letras del pais
 *      createWHT : check "LatamReady - Applied WHT Code"
 *      transactionType :  tipo de Transaccion
 ********************************************************/
function validarPais(country, transactionType, licenses) {
    try {
        if (country.toUpperCase() == "BRA") {
            var salesTransaction = ["invoice", "creditmemo", "salesorder", "estimate"];
            //Sales automatic flow
            if (salesTransaction.indexOf(transactionType) != -1) {
                return getAuthorization(147, licenses) == true;
                //item fulfillment taxes
            } else if (transactionType == "itemfulfillment") {
                return getAuthorization(629, licenses) == true;
            } else if (transactionType == "itemreceipt") {
                return getAuthorization(735, licenses) == true;
            } else {
                //purchase automatic flow
                return getAuthorization(527, licenses) == true;
            }
        }

        return false;
    } catch (err) {
        //nlapiLogExecution('ERROR', 'validarPais', err);
        sendemail(' [ validarPais ] ' + err, LMRY_script);
    }
}

/***********************************************************************************
 * Funcion que selecciona la segmentación de las líneas en el GL Impact dependiendo
 * de la configuración en el récord "LatamReady - Setup Tax Subsidiary"
 * Parámetros :
 *      pref : segmentacion obligatoria en Preferencias Generales
 *      valor1 / valor2 : Segmentacion de la transaccion o CC/NT segun configuracion
 *      valorSetup : segmentación del Setup Tax Subsidiary
 *      valorDefecto : segmentación de la transacción
 ***********************************************************************************/
function elegirSegmentacion(pref, valor1, valor2, valorSetup, valorDefecto) {

    try {
        if (valor1 != null && valor1 != '') {
            return valor1;
        } else {
            if (pref == 'T' || pref == true) {
                if (valor2 == null || valor2 == '') {
                    return valorSetup;
                } else {
                    return valor2;
                }
            } else {
                if (valorDefecto != '' && valorDefecto != null) {
                    return valorDefecto;
                }
            }
        }
        return '';
    } catch (err) {
        //nlapiLogExecution('ERROR', 'elegirSegmentacion', err);
        sendemail(' [ elegirSegmentacion ] ' + err, LMRY_script);
    }
}
/*****************************************************************
 * Funcion que extrae los impuestos de las lineas para el Suite GL
 * (Tax Calculator - FE - Brasil)
 * Parámetros :
 *      transactionRecord : transaccion
 *      customLines , book : parametros de la funcion principal
 *****************************************************************/
function agregarTaxCalculatorBR(transactionRecord, customLines, book, rounding, summary, checkLineUnique) {

    try {

        if (transactionRecord.getId()) {
            var exchangeRateBook = getExchangeRateByBook(transactionRecord, book);
            nlapiLogExecution("DEBUG", "exchangeRateBook", exchangeRateBook);
            var configTaxes = getTaxCalculatorConfigTaxes(transactionRecord);
            nlapiLogExecution('ERROR', 'configTaxes', JSON.stringify(configTaxes));
            var taxResults = getTaxCalculatorTaxResults(transactionRecord, configTaxes, summary);
            nlapiLogExecution('ERROR', 'taxResults', JSON.stringify(taxResults));

            if (summary == "T" || summary == true) {
                for (var kGroup in taxResults["summary"]) {
                    var taxResult = taxResults["summary"][kGroup];
                    var debitAccount = taxResult["debitaccount"];
                    var creditAccount = taxResult["creditaccount"];

                    var amount = parseFloat(taxResult["total"]) || 0.00;

                    if (exchangeRateBook != 1) {
                        amount = round2(amount) * exchangeRateBook;
                    }

                    var summarized = (taxResult["items"].length > 1);
                    var idItem = taxResult["items"][0] || "";
                    var lineuniquekey = taxResult["lineuniquekeys"][0] || "";
                    if (amount && debitAccount && creditAccount) {
                        var typeItem = taxResult["itemtype"];
                        var subtype = taxResult["subtype"];
                        var scenario = taxResult["scenario"];
                        var department = taxResult["department"];
                        var class_ = taxResult["class"];
                        var location = taxResult["location"];
                        var csegments = taxResult["csegments"];
                        agregarLineaTaxCalculator(customLines, typeItem, subtype, scenario, idItem, amount, debitAccount, creditAccount, book, summarized, department, class_, location, csegments, lineuniquekey, checkLineUnique);
                    }
                }
            } else {
                for (var i = 0; i < taxResults["lines"].length; i++) {
                    var taxResult = taxResults["lines"][i];
                    var debitAccount = taxResult["debitaccount"];
                    var creditAccount = taxResult["creditaccount"];

                    var amount = parseFloat(taxResult["amount"]) || 0.00;

                    if (exchangeRateBook != 1) {
                        amount = round2(amount) * exchangeRateBook;
                    }

                    var idItem = taxResult["item"] || "";
                    var lineuniquekey = taxResult["lineuniquekey"] || "";
                    if (amount && debitAccount && creditAccount) {
                        var typeItem = taxResult["itemtype"];
                        var subtype = taxResult["subtype"];
                        var scenario = taxResult["scenario"];
                        var department = taxResult["department"];
                        var class_ = taxResult["class"];
                        var location = taxResult["location"];
                        var csegments = taxResult["csegments"];

                        agregarLineaTaxCalculator(customLines, typeItem, subtype, scenario, idItem, amount, debitAccount, creditAccount, book, false, department, class_, location, csegments, lineuniquekey, checkLineUnique);
                    }
                }
            }

        }
    } catch (err) {
        //nlapiLogExecution('ERROR', 'agregarTaxCalculatorBR', err);
        sendemail(' [ agregarTaxCalculatorBR ] ' + err, LMRY_script);
    }
}

/* ******************************************************************** * 
 * Para la configuracion de cuentas para item de Servicio 
 * Requerimiento C0552 TAX Configuration BR - InvPart & Service
 * para la utilizacion del Tax Calculator
 * ******************************************************************** */
function getTaxCalculatorTaxResults(transactionRecord, configTaxes, summary) {
    var taxResults = { "summary": {}, "lines": [] };
    var filters = [
        new nlobjSearchFilter("custrecord_lmry_br_transaction", null, "is", transactionRecord.id),
        new nlobjSearchFilter("custrecord_lmry_tax_type", null, "anyof", '4'),
        new nlobjSearchFilter("custrecord_lmry_total_item", null, "startswith", "Tax Calculator")
    ];

    var columns = [
        new nlobjSearchColumn("custrecord_lmry_br_type"),
        new nlobjSearchColumn("custrecord_lmry_br_total"),
        new nlobjSearchColumn("custrecord_lmry_br_positem"),
        new nlobjSearchColumn("custrecord_lmry_item"),
        new nlobjSearchColumn("type", "custrecord_lmry_item", null),
        new nlobjSearchColumn("custitem_lmry_br_tax_scenario", "custrecord_lmry_item", null),
        new nlobjSearchColumn("custrecord_lmry_lineuniquekey")
    ];

    var search_taxResults = nlapiCreateSearch("customrecord_lmry_br_transaction", filters, columns);
    var results = search_taxResults.runSearch().getResults(0, 1000);

    if (results && results.length) {
        for (var i = 0; i < results.length; i++) {
            var subtype = results[i].getValue('custrecord_lmry_br_type');
            var amount = results[i].getValue('custrecord_lmry_br_total') || 0.00;
            amount = parseFloat(amount);
            var item = results[i].getValue('custrecord_lmry_item');
            var position = parseInt(results[i].getValue("custrecord_lmry_br_positem")) + 1;
            var lineUnique = results[i].getValue('custrecord_lmry_lineuniquekey');
            var typeItemField = results[i].getValue("type", "custrecord_lmry_item", null);
            var typeItem = 1;
            if (typeItemField == "Service") {
                typeItem = 2;
            }
            var scenario = results[i].getValue("custitem_lmry_br_tax_scenario", "custrecord_lmry_item", null);
            if (scenario == null || scenario == '') {
                scenario = '0';
            }

            if (configTaxes[subtype + ";" + typeItem + ";" + scenario] && amount) {

                var department = configTaxes[subtype + ";" + typeItem + ";" + scenario]["department"] || transactionRecord.getLineItemValue("item", "department", position) || transactionRecord.getFieldValue("department") || "0";
                var class_ = configTaxes[subtype + ";" + typeItem + ";" + scenario]["class"] || transactionRecord.getLineItemValue("item", "class", position) || transactionRecord.getFieldValue("class") || "0";
                var location = configTaxes[subtype + ";" + typeItem + ";" + scenario]["location"] || transactionRecord.getLineItemValue("item", "location", position) || transactionRecord.getFieldValue("location") || "0";

                var groupCols = [subtype, department, class_, location];
                var csegments = {};
                if (customSegments.length) {
                    for (var s = 0; s < customSegments.length; s++) {
                        var segmentId = customSegments[s];
                        var segmentValue = configTaxes[subtype + ";" + typeItem + ";" + scenario][segmentId] || transactionRecord.getLineItemValue("item", segmentId, position) || transactionRecord.getFieldValue(segmentId) || "0";
                        groupCols.push(segmentValue);
                        csegments[segmentId] = segmentValue;
                    }
                }

                if (summary == 'T' || summary == true) {
                    var kGroup = groupCols.join("-");
                    if (!taxResults['summary'][kGroup + ";" + typeItem + ";" + scenario]) {
                        taxResults['summary'][kGroup + ";" + typeItem + ";" + scenario] = {
                            "debitaccount": configTaxes[subtype + ";" + typeItem + ";" + scenario]["debitaccount"], "creditaccount": configTaxes[subtype + ";" + typeItem + ";" + scenario]["creditaccount"],
                            "itemtype": typeItem, "subtype": subtype, "scenario": scenario, "total": 0.00, "items": [], "department": department,
                            "class": class_, "location": location, "csegments": csegments, "lineuniquekeys": []
                        };
                    }
                    taxResults['summary'][kGroup + ";" + typeItem + ";" + scenario]["total"] += amount;
                    taxResults['summary'][kGroup + ";" + typeItem + ";" + scenario]["items"].push(item);
                    taxResults['summary'][kGroup + ";" + typeItem + ";" + scenario]["lineuniquekeys"].push(lineUnique);
                } else {
                    taxResults['lines'].push({
                        "itemtype": typeItem, "subtype": subtype, "scenario": scenario, "debitaccount": configTaxes[subtype + ";" + typeItem + ";" + scenario]["debitaccount"], "creditaccount": configTaxes[subtype + ";" + typeItem + ";" + scenario]["creditaccount"],
                        'amount': parseFloat(amount), 'item': item, "department": department, "class": class_, "location": location, "csegments": csegments,
                        'lineuniquekey': lineUnique
                    });
                }
            }
        }
    }

    return taxResults;
}

/************************************************************************************
 * Funcion que agrega las lineas al Suite GL dependiendo del impuesto
 * (Tax Calculator - FE - Brasil)
 * Parámetros :
 *      customLines , book : parametros de la funcion principal
 *      typeTax : tipo de impuesto
 *      idItemBR, retencionBR, debitAccountTaxBR, creditAccountTaxBR : datos del item
 ************************************************************************************/
/* ******************************************************************** * 
 * Para la configuracion de cuentas para item de Servicio 
 * Requerimiento C0552 TAX Configuration BR - InvPart & Service
 * para la utilizacion del Tax Calculator
 * ******************************************************************** */
function agregarLineaTaxCalculator(customLines, typeItem, typeTax, scenario, idItemBR, retencionBR, debitAccountTaxBR, creditAccountTaxBR, book, summarized, department, class_, location, csegments, lineuniquekey, checkLineUnique) {

    try {
        var FEAT_DEPT = objContext.getFeature("departments");
        var FEAT_CLASS = objContext.getFeature("classes");
        var FEAT_LOC = objContext.getFeature("locations");

        var PREF_CLASSESPERLINE = objContext.getPreference("CLASSESPERLINE");
        var PREF_DEPTSPERLINE = objContext.getPreference("DEPTSPERLINE");


        // Si es diferente del Libro Primario, busca la cuenta
        if (!book.isPrimary()) {
            debitAccountTaxBR = getAccount(debitAccountTaxBR, department, class_, location);
            creditAccountTaxBR = getAccount(creditAccountTaxBR, department, class_, location);
        }
        var typeItemName;
        switch (typeItem) {
            case 1:
                typeItemName = "InvtPart";
                break;
            case 2:
                typeItemName = "Service";
                break;
        }

        var memo = '';
        if (summarized) {
            memo = typeTax + ' (Tax Calculator) - (Summarized - Items ' + typeItemName + 's)';
        } else {
            memo = typeTax + ' (Tax Calculator) - (ID Item ' + typeItemName + ': ' + idItemBR + ')';
            if (checkLineUnique == true || checkLineUnique == 'T') {
                memo += ' - (Line Unique Key: ' + lineuniquekey + ')';
            }
        }
        if (scenario != '0') {
            memo += ' - (ID Scenario: ' + scenario + ')';
        }


        var amount = round2(retencionBR);
        if (amount) {
            var newLineDebit = customLines.addNewLine();
            newLineDebit.setDebitAmount(parseFloat(amount));
            newLineDebit.setAccountId(parseFloat(debitAccountTaxBR));
            newLineDebit.setMemo(memo);
            nlapiLogExecution("DEBUG", "entity", entity);
            if (entity) {
                newLineDebit.setEntityId(parseInt(entity));
            }

            if (Number(department) && (FEAT_DEPT == "T" || FEAT_DEPT == true) && (PREF_DEPTSPERLINE == "T" || PREF_DEPTSPERLINE == true)) {
                newLineDebit.setDepartmentId(parseInt(department));
            }

            if (Number(class_) && (FEAT_CLASS == "T" || FEAT_CLASS == true) && (PREF_CLASSESPERLINE == "T" || PREF_CLASSESPERLINE == true)) {
                newLineDebit.setClassId(parseInt(class_));
            }

            if (Number(location) && (FEAT_LOC == "T" || FEAT_LOC == true)) {
                newLineDebit.setLocationId(parseInt(location));
            }

            for (var i = 0; i < customSegments.length; i++) {
                var segmentId = customSegments[i];
                var segmentValue = csegments[segmentId];
                if (Number(segmentValue)) {
                    newLineDebit.setSegmentValueId(segmentId, parseInt(segmentValue));
                }
            }

            var newLineCredit = customLines.addNewLine();
            newLineCredit.setCreditAmount(parseFloat(amount));
            newLineCredit.setAccountId(parseFloat(creditAccountTaxBR));
            newLineCredit.setMemo(memo);
            if (entity) {
                newLineCredit.setEntityId(parseInt(entity));
            }

            if (Number(department) && (FEAT_DEPT == "T" || FEAT_DEPT == true) && (PREF_DEPTSPERLINE == "T" || PREF_DEPTSPERLINE == true)) {
                newLineCredit.setDepartmentId(parseInt(department));
            }

            if (Number(class_) && (FEAT_CLASS == "T" || FEAT_CLASS == true) && (PREF_CLASSESPERLINE == "T" || PREF_CLASSESPERLINE == true)) {
                newLineCredit.setClassId(parseInt(class_));
            }

            if (Number(location) && (FEAT_LOC == "T" || FEAT_LOC == true)) {
                newLineCredit.setLocationId(parseInt(location));
            }

            for (var i = 0; i < customSegments.length; i++) {
                var segmentId = customSegments[i];
                var segmentValue = csegments[segmentId];
                if (Number(segmentValue)) {
                    newLineCredit.setSegmentValueId(segmentId, parseInt(segmentValue));
                }
            }
        }

    } catch (err) {
        //nlapiLogExecution('ERROR', 'agregarLineaTaxCalculator', err);
        sendemail(' [ agregarLineaTaxCalculator ] ' + err, LMRY_script);
    }
}

/********************************************************************
 * Funcion que devuelve la cuenta configurada para el Libro Contable
 * Parámetros :
 *      cuentaSource : Cuenta configurada en la CC o NT
 *      currentBook : Id del Libro Contable
 ********************************************************************/
function devolverCuenta(cuentaSource, currentBook) {

    try {

        if (FEAT_ACC_MAPPING == true || FEAT_ACC_MAPPING == 'T') {
            var filtros_gam = new Array();
            filtros_gam[0] = new nlobjSearchFilter('sourceaccount', null, 'anyof', cuentaSource);
            filtros_gam[1] = new nlobjSearchFilter('accountingbook', null, 'anyof', currentBook);
            filtros_gam[2] = new nlobjSearchFilter('effectivedate', null, 'onorbefore', fecha);
            //filtros_gam[3] = new nlobjSearchFilter('enddate', null, 'onorafter', fecha);
            if (featureSubs) {
                filtros_gam[3] = new nlobjSearchFilter('subsidiary', null, 'anyof', subsidiary);
            }

            var columnas_gam = new Array();
            columnas_gam[0] = new nlobjSearchColumn("internalid");
            columnas_gam[1] = new nlobjSearchColumn("destinationaccount");
            columnas_gam[2] = new nlobjSearchColumn("enddate");

            var search_gam = nlapiCreateSearch('globalaccountmapping', filtros_gam, columnas_gam);
            var result_gam = search_gam.runSearch().getResults(0, 1000);

            if (result_gam && result_gam.length) {
                for (var m = 0; m < result_gam.length; m++) {
                    var fechaFinAcc = result_gam[m].getValue("enddate");
                    if (fechaFinAcc == '' || fechaFinAcc == null) {
                        return result_gam[m].getValue('destinationaccount');
                    } else {
                        if (yyymmdd(fecha) <= yyymmdd(fechaFinAcc)) {
                            return result_gam[m].getValue('destinationaccount');
                        }
                    }
                }
            }
        }

        return cuentaSource;

    } catch (err) {
        //nlapiLogExecution('ERROR', 'devolverCuenta', err);
        sendemail(' [ devolverCuenta ] ' + err, LMRY_script);
    }
}

function getAccount(cuentaSource, dep, cla, loc) {
    try {
        for (line in Json_GMA) {
            if (line == cuentaSource) {
                if (Json_GMA[line].department != 0 && Json_GMA[line].department != null && Json_GMA[line].department != '' && Json_GMA[line].department != undefined) {
                    if (Json_GMA[line].department != dep) {
                        return cuentaSource;
                    }
                }
                if (Json_GMA[line].class != 0 && Json_GMA[line].class != null && Json_GMA[line].class != '' && Json_GMA[line].class != undefined) {
                    if (Json_GMA[line].class != cla) {
                        return cuentaSource;
                    }
                }
                if (Json_GMA[line].location != 0 && Json_GMA[line].location != null && Json_GMA[line].location != '' && Json_GMA[line].location != undefined) {
                    if (Json_GMA[line].location != loc) {
                        return cuentaSource;
                    }
                }
                var fechafin = Json_GMA[line].enddate;
                if (fechafin == '' || fechafin == null) {
                    return Json_GMA[line].destination;
                } else {
                    if (yyymmdd(fecha) <= yyymmdd(fechafin)) {
                        return Json_GMA[line].destination;
                    }
                }
            }
        }
    } catch (err) {
        nlapiLogExecution('ERROR', 'getAccount', err);
        throw ' [ getAccount ] ' + err;
    }
    return cuentaSource;
}

/********************************************************************
 * Funcion que devuelve el JSON de cuentas para el Libro Contable
 * Parámetros :
 *      currentBook : Id del Libro Contable
 ********************************************************************/
function obtainsAccounts(currentBook) {
    try {
        if (FEAT_ACC_MAPPING == true || FEAT_ACC_MAPPING == 'T') {
            var filtros_gam = new Array();
            filtros_gam[0] = new nlobjSearchFilter('effectivedate', null, 'onorbefore', fecha);
            filtros_gam[1] = new nlobjSearchFilter('accountingbook', null, 'is', currentBook);
            if (featureSubs) {
                filtros_gam[2] = new nlobjSearchFilter('subsidiary', null, 'anyof', subsidiary);
            }

            var aux = 4;
            var columnas_gam = new Array();
            columnas_gam[0] = new nlobjSearchColumn("internalid");
            columnas_gam[1] = new nlobjSearchColumn("destinationaccount");
            columnas_gam[2] = new nlobjSearchColumn("enddate");
            columnas_gam[3] = new nlobjSearchColumn("sourceaccount");
            if (featureDep == 'T' || featureDep == true) {
                columnas_gam[aux] = new nlobjSearchColumn("department");
                aux++;
            }
            if (featureCla == 'T' || featureCla == true) {
                columnas_gam[aux] = new nlobjSearchColumn("class");
                aux++;
            }
            if (featureLoc == 'T' || featureLoc == true) {
                columnas_gam[aux] = new nlobjSearchColumn("location");
                aux++;
            }


            var search_gam = nlapiCreateSearch('globalaccountmapping', filtros_gam, columnas_gam);
            var result_gam = search_gam.runSearch().getResults(0, 1000);
            if (result_gam != null && result_gam.length > 0) {
                for (var i = 0; i < result_gam.length; i++) {
                    Json_GMA[result_gam[i].getValue('sourceaccount')] = {
                        'destination': result_gam[i].getValue('destinationaccount'),
                        'enddate': result_gam[i].getValue('enddate')
                    }
                    if (featureDep == 'T' || featureDep == true) {
                        Json_GMA[result_gam[i].getValue('sourceaccount')]['department'] = result_gam[i].getValue('department');
                    }
                    if (featureCla == 'T' || featureCla == true) {
                        Json_GMA[result_gam[i].getValue('sourceaccount')]['class'] = result_gam[i].getValue('class');
                    }
                    if (featureLoc == 'T' || featureLoc == true) {
                        Json_GMA[result_gam[i].getValue('sourceaccount')]['location'] = result_gam[i].getValue('location');
                    }
                }
            }
        }
    } catch (err) {
        nlapiLogExecution('ERROR', 'getCuenta', err);
        throw ' [ getCuenta ] ' + err;
    }
}

/*******************************************************
 * Funcion que cambia el '&lt;g' o '&gt;g' por '>' 0 '<'
 * (FE - Brasil)
 * Parámetros :
 *      xml : cadena a la que se le realizara el cambio
 ******************************************************/
function replaceXML(xml) {
    xml = xml.replace(/</g, '<');
    xml = xml.replace(/>/g, '>');
    xml = xml.replace(/&lt;/g, '<');
    xml = xml.replace(/&gt;/g, '>');
    return xml;
}

/***********************************************
 * Funcion que da formato al campo fecha YYMMDD
 * Parámetros :
 *      date : fecha
 **********************************************/
function yyymmdd(dateString) {

    if (dateString == '' || dateString == null) {
        return '';
    }

    var date = new Date(dateString);

    var year = date.getFullYear();

    var month = "" + (date.getMonth() + 1);

    if (month.length < 2)
        month = "0" + month;

    var date = "" + date.getDate();
    if (date.length < 2)
        date = "0" + date;

    var fe = '' + year + "" + month + "" + date;

    return fe;
}


function getCustomSegments() {
    var customSegments = [];
    if (FEAT_CUSTOMSEGMENTS == true || FEAT_CUSTOMSEGMENTS == "T") {

        var searchSegmentRecords = nlapiCreateSearch("customrecord_lmry_setup_cust_segm",
            [
                ["isinactive", "is", "F"]
            ],
            [
                new nlobjSearchColumn("internalid"),
                new nlobjSearchColumn("custrecord_lmry_setup_cust_segm")
            ]);

        var results = searchSegmentRecords.runSearch().getResults(0, 1000);
        var segment_ids = [];

        for (var i = 0; i < results.length; i++) {
            var segment_id = results[i].getValue("custrecord_lmry_setup_cust_segm") || "";
            segment_id = segment_id.trim();
            if (segment_id) {
                segment_ids.push(segment_id);
            }
        }

        if (segment_ids.length) {
            var filterSegments = [];

            for (var i = 0; i < segment_ids.length; i++) {
                filterSegments.push("OR", ["scriptid", "is", segment_ids[i]])
            }

            filterSegments = filterSegments.slice(1);

            var filters = [
                ["isinactive", "is", "F"], "AND",
                ["glimpact", "is", "T"], "AND",
                filterSegments
            ];

            var searchSegments = nlapiCreateSearch("customsegment", filters,
                [
                    new nlobjSearchColumn("internalid").setSort(false),
                    new nlobjSearchColumn("scriptid")]);

            var results = searchSegments.runSearch().getResults(0, 1000);

            for (var i = 0; i < results.length; i++) {
                var segment_id = results[i].getValue("scriptid");
                customSegments.push(segment_id);
            }
        }
    }
    return customSegments;
}

function getExchangeRateByBook(transactionRecord, book) {
    var exchangeRate_mb = 1;
    if (book.isPrimary()) {
        exchangeRate_mb = transactionRecord.getFieldValue("exchangerate");
    } else {
        var bookId = book.getId();
        for (var line = 1; line <= transactionRecord.getLineItemCount('accountingbookdetail'); line++) {
            if (bookId == transactionRecord.getLineItemValue('accountingbookdetail', 'bookid', line)) {
                exchangeRate_mb = transactionRecord.getLineItemValue('accountingbookdetail', 'exchangerate', line);
                break;
            }
        }
    }
    return exchangeRate_mb;
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


/* ******************************************************************** * 
 * Para la configuracion de cuentas para item de Servicio 
 * Requerimiento C0552 TAX Configuration BR - InvPart & Service
 * para la utilizacion del Tax Calculator
 * ******************************************************************** */
function getTaxCalculatorConfigTaxes(transactionRecord) {
    var configTaxes = {}
    var typeTransactions = {
        "sales": ["invoice", "creditmemo", "salesorder"], "purchase": ["vendorbill", "vendorcredit", "purchaseorder"]
    };
    var type = transactionRecord.getFieldValue("baserecordtype");
    var subsidiary = transactionRecord.getFieldValue("subsidiary")
    nlapiLogExecution("ERROR", "typeTransaction", type);
    // Filtros
    var filters = [];
    if (typeTransactions["sales"].indexOf(type) != -1) {
        filters.push(new nlobjSearchFilter("custrecord_lmry_br_config_debitaccount", null, "noneof", "@NONE@"));
        filters.push(new nlobjSearchFilter("custrecord_lmry_br_config_creditaccount", null, "noneof", "@NONE@"));
    } else if (typeTransactions["purchase"].indexOf(type) != -1) {
        filters.push(new nlobjSearchFilter("custrecord_lmry_br_config_debitacc_purch", null, "noneof", "@NONE@"));
        filters.push(new nlobjSearchFilter("custrecord_lmry_br_config_creditacc_purc", null, "noneof", "@NONE@"));
    } else if (type == "itemfulfillment") {
        filters.push(new nlobjSearchFilter("custrecord_lmry_br_config_shipm_credtacc", null, "noneof", "@NONE@"));
        filters.push(new nlobjSearchFilter("custrecord_lmry_br_config_tror_bridgeacc", null, "noneof", "@NONE@"));
    } else if (type == "itemreceipt") {
        filters.push(new nlobjSearchFilter("custrecord_lmry_br_config_recpt_debitacc", null, "noneof", "@NONE@"));
        filters.push(new nlobjSearchFilter("custrecord_lmry_br_config_tror_bridgeacc", null, "noneof", "@NONE@"));
    }

    //filters.push(new nlobjSearchFilter("custrecord_lmry_br_config_typeitem", null, "anyof", "1")); //InvtPart
    filters.push(new nlobjSearchFilter("isinactive", null, "is", 'F'));
    if (featureSubs == 'T' || featureSubs) {
        filters.push(new nlobjSearchFilter("custrecord_lmry_br_config_subsidiary", null, "anyof", subsidiary));
    }
    // Columnas
    var columns = [
        //columnas.push(new nlobjSearchColumn("custrecord_lmry_br_config_typeitem"));
        new nlobjSearchColumn("custrecord_lmry_br_config_subtype"),
        new nlobjSearchColumn("custrecord_lmry_br_config_typeitem"),
        new nlobjSearchColumn("custrecord_lmry_br_config_scenario"),
        new nlobjSearchColumn("custrecord_lmry_br_config_debitaccount"),
        new nlobjSearchColumn("custrecord_lmry_br_config_creditaccount"),
        new nlobjSearchColumn("custrecord_lmry_br_config_debitacc_purch"),
        new nlobjSearchColumn("custrecord_lmry_br_config_creditacc_purc"),
        new nlobjSearchColumn("custrecord_lmry_br_config_shipm_credtacc"),
        new nlobjSearchColumn("custrecord_lmry_br_config_tror_bridgeacc"),
        new nlobjSearchColumn("custrecord_lmry_br_config_recpt_debitacc"),
        new nlobjSearchColumn("custrecord_lmry_br_config_department"),
        new nlobjSearchColumn("custrecord_lmry_br_config_class"),
        new nlobjSearchColumn("custrecord_lmry_br_config_location"),
        new nlobjSearchColumn("custrecord_lmry_br_config_customsegments"),
        new nlobjSearchColumn("custrecord_lmry_br_config_cm_debitaccoun"),
        new nlobjSearchColumn("custrecord_lmry_br_config_cm_creditaccou"),
        new nlobjSearchColumn("custrecord_lmry_br_config_bc_debitacc_pu"),
        new nlobjSearchColumn("custrecord_lmry_br_config_bc_creditacc_p")
    ];

    var searchTaxConfigs = nlapiCreateSearch("customrecord_lmry_tax_config_br", filters, columns);
    var results = searchTaxConfigs.runSearch().getResults(0, 1000);
    if (results && results.length) {
        for (var i = 0; i < results.length; i++) {
            var subtype = results[i].getText("custrecord_lmry_br_config_subtype").trim();
            var typeItem = results[i].getValue("custrecord_lmry_br_config_typeitem");
            var scenario = results[i].getValue("custrecord_lmry_br_config_scenario");
            var debitAccount;
            var creditAccount;
            var debitAccounCreditMemo = results[i].getValue("custrecord_lmry_br_config_cm_debitaccoun") || '';
            var creditAccountCreditMemo = results[i].getValue("custrecord_lmry_br_config_cm_creditaccou") || '';
            var debitAccounBillCredit = results[i].getValue("custrecord_lmry_br_config_bc_debitacc_pu") || '';
            var creditAccountBillCredit = results[i].getValue("custrecord_lmry_br_config_bc_creditacc_p") || '';

            if (scenario == null || scenario == '') {
                scenario = '0';
            }

            var logAccountCredit = { 'debitAccounCreditMemo': debitAccounCreditMemo, 'creditAccountCreditMemo': creditAccountCreditMemo };
            nlapiLogExecution("ERROR", "logAccountCredit", JSON.stringify(logAccountCredit));

            if (typeTransactions["sales"].indexOf(type) != -1) {
                debitAccount = results[i].getValue("custrecord_lmry_br_config_debitaccount");
                creditAccount = results[i].getValue("custrecord_lmry_br_config_creditaccount");
                if (type == 'creditmemo' && debitAccounCreditMemo != '' && creditAccountCreditMemo != '') {
                    debitAccount = debitAccounCreditMemo;
                    creditAccount = creditAccountCreditMemo;
                }
            } else if (typeTransactions["purchase"].indexOf(type) != -1) {
                debitAccount = results[i].getValue("custrecord_lmry_br_config_debitacc_purch");
                creditAccount = results[i].getValue("custrecord_lmry_br_config_creditacc_purc");
                if (type == 'vendorcredit' && debitAccounBillCredit != '' && creditAccountBillCredit != '') {
                    debitAccount = debitAccounBillCredit;
                    creditAccount = creditAccountBillCredit;
                }
            } else if (type == "itemfulfillment") {
                debitAccount = results[i].getValue("custrecord_lmry_br_config_tror_bridgeacc");
                creditAccount = results[i].getValue("custrecord_lmry_br_config_shipm_credtacc");
            } else if (type == "itemreceipt") {
                debitAccount = results[i].getValue("custrecord_lmry_br_config_recpt_debitacc");
                creditAccount = results[i].getValue("custrecord_lmry_br_config_tror_bridgeacc");
            }

            var department = results[i].getValue("custrecord_lmry_br_config_department");
            var class_ = results[i].getValue("custrecord_lmry_br_config_class");
            var location = results[i].getValue("custrecord_lmry_br_config_location");
            var objSegments = results[i].getValue("custrecord_lmry_br_config_customsegments");
            if (objSegments) {
                objSegments = JSON.parse(objSegments);
            }

            if (debitAccount && creditAccount) {
                configTaxes[subtype + ";" + typeItem + ";" + scenario] = {
                    'debitaccount': debitAccount,
                    'creditaccount': creditAccount,
                    'department': department,
                    'class': class_,
                    'location': location
                };

                if (objSegments && Object.keys(objSegments).length) {
                    for (var s = 0; s < customSegments.length; s++) {
                        var segmentId = customSegments[s];
                        if (objSegments[segmentId]) {
                            configTaxes[subtype + ";" + typeItem + ";" + scenario][segmentId] = objSegments[segmentId]
                        }
                    }
                }
            }
        }
    }
    return configTaxes;
}

function validateMemo(transactionRecord) {
    var MEMOS = ["Reference VOID", "(LatamTax -  WHT)", "Latam - Interest and Penalty", "Voided Latam - WHT"];
    var memo = transactionRecord.getFieldValue("memo");
    for (var i = 0; i < MEMOS.length; i++) {
        if (memo.substring(0, MEMOS[i].length) == MEMOS[i]) {
            return false;
        }
    }

    return true;
}

function checkIsTaxCalculator(transactionRecord) {
    var typeTransactions = {
        "sales": ["invoice", "creditmemo", "salesorder", "estimate"], "purchase": ["vendorbill", "vendorcredit", "purchaseorder", "itemfulfillment"],
        "other": ["itemreceipt"]
    };
    var type = transactionRecord.getFieldValue("baserecordtype");
    var numItems = transactionRecord.getLineItemCount("item");
    nlapiLogExecution("DEBUG", "numItems", numItems);
    var countryVendor = '';

    if (type == 'vendorbill') {
        countryVendor = nlapiLookupField('vendor', entity, ['custentity_lmry_countrycode']);
        countryVendor = countryVendor.custentity_lmry_countrycode;
    }

    if (typeTransactions["sales"].indexOf(type) != -1) {
        for (var i = 1; i <= numItems; i++) {
            var catalog = transactionRecord.getLineItemValue("item", "custcol_lmry_br_service_catalog", i);
            if (catalog) {
                return false;
            }
        }
    } else if (typeTransactions["purchase"].indexOf(type) != -1) {
        for (var i = 1; i <= numItems; i++) {
            var brTaxRule = transactionRecord.getLineItemValue("item", "custcol_lmry_br_tax_rule", i);
            nlapiLogExecution("DEBUG", "brTaxRule", brTaxRule);
            if (brTaxRule) {
                if (type == 'vendorbill') {
                    
                    var dataTaxRule = nlapiLookupField('customrecord_lmry_br_tax_rules', brTaxRule, ['custrecord_lmry_taxrule_tax_calculator']);
                    nlapiLogExecution("DEBUG", "dataTaxRule", dataTaxRule);
                    var taxrule_taxcalculator = dataTaxRule.custrecord_lmry_taxrule_tax_calculator;
                    nlapiLogExecution("DEBUG", "taxrule_taxcalculator", taxrule_taxcalculator);
                    if (!countryVendor || countryVendor == '1058' || (taxrule_taxcalculator == false || taxrule_taxcalculator == 'F')) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }
    } else if (typeTransactions["other"].indexOf(type) != -1) {
        return true;
    } else {
        return false;
    }
    return true;
}
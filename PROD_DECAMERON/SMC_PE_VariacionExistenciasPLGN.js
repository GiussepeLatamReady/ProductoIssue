/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       19 Nov 2019     LatamReady
 * File : SMC_PE_VariacionExistenciasPLGN.js
 */
var objContext = nlapiGetContext();
var FEAT_SUBSI = objContext.getFeature('SUBSIDIARIES');
var FEAT_MULTIBOOK = objContext.getFeature('MULTIBOOK');
var FEAT_DEPT = objContext.getFeature("departments");
var FEAT_CLASS = objContext.getFeature("classes");
var FEAT_LOC = objContext.getFeature("locations");
var DEPTSPERLINE = objContext.getPreference('DEPTSPERLINE');
var CLASSESPERLINE = objContext.getPreference('CLASSESPERLINE');
var FEAT_MAPPING = objContext.getFeature('coaclassificationmanagement');


var LMRY_script = 'LMRY_PE_VariacionExistenciasPLGN.js';


function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    try {

        var country = transactionRecord.getFieldValue("custbody_lmry_subsidiary_country");
        country = Number(country);
        if (country == 174) {//Peru
            nlapiLogExecution("DEBUG", "bookId", book.getId());
            nlapiLogExecution("DEBUG", "isPrimary", book.isPrimary());
            var type = transactionRecord.getRecordType();
            nlapiLogExecution("DEBUG", "typeTransaction", type);

            var licenses = getLicenses(transactionRecord.getFieldValue('subsidiary'));
            //FEATURE 415: PE - VARIACIÓN EXISTENCIAS (SUITE GL)
            if (getAuthorization(415, licenses) != true) {
                return;
            }

            var createdFrom = transactionRecord.getFieldValue('createdfrom');
            nlapiLogExecution('ERROR', 'createdFrom', createdFrom);
            // CREADO DESDE UN VENDOR RETURN AUTHORIZATION
            if (["vendorcredit", "itemfulfillment", "itemreceipt"].indexOf(type) != -1 && !Number(createdFrom)) {
                return;
            }

            if (type == 'vendorcredit' || type == 'itemfulfillment') {
                var typeFrom = nlapiLookupField('vendorreturnauthorization', createdFrom, ['type']);
                nlapiLogExecution("DEBUG", "typefrom", typeFrom);

                if (!typeFrom) {
                    return;
                }
            }

            if (type == 'vendorbill' || type == 'vendorcredit') {
                var hasPOs = false;
                var numItems = transactionRecord.getLineItemCount("item");
                for (var i = 1; i <= numItems; i++) {
                    //Para comprobar que los items del Vendor Bill O Bill Credit proviene del Purchase Order
                    var generateAccruals = transactionRecord.getLineItemValue("item", "generateaccruals", i);
                    nlapiLogExecution("DEBUG", "generateAccruals", generateAccruals);
                    if (generateAccruals == true || generateAccruals == "T") {
                        hasPOs = true;
                        break;
                    }
                }

                if (!hasPOs) {
                    return;
                }
            }
            
            // Tipo de Cambio segun libro para todo el proceso
            var exchangeRate = getExchangeRate(transactionRecord, book);
            nlapiLogExecution("DEBUG", "landedcost - exchangeRate", exchangeRate);

            var allAccounts = [];
            var subsidiaryAccounts = {};

            if (FEAT_SUBSI == true || FEAT_SUBSI == "T") {
                var subsidiary = transactionRecord.getFieldValue("subsidiary");
                var result = nlapiLookupField('subsidiary', subsidiary, ['custrecord_lmry_pe_cuenta_compras', 'custrecord_lmry_pe_cuenta_variacion_exis', 'custrecord_lmry_pe_cuenta_defecto_compra', 'custrecord_lmry_pe_cuenta_defecto_devolu', 'custrecord_lmry_pe_cuenta_fact_noemitida']);
                subsidiaryAccounts.compras = result.custrecord_lmry_pe_cuenta_compras || "";
                subsidiaryAccounts.variacionExistencias = result.custrecord_lmry_pe_cuenta_variacion_exis || "";
                subsidiaryAccounts.defaultCompra = result.custrecord_lmry_pe_cuenta_defecto_compra || "";
                subsidiaryAccounts.defaultDevolucion = result.custrecord_lmry_pe_cuenta_defecto_devolu || "";
                subsidiaryAccounts.facturaNoEmitida = result.custrecord_lmry_pe_cuenta_fact_noemitida || "";
            } else {
                //load Netsuite configuration page
                var companyInfo = nlapiLoadConfiguration('companyinformation');
                subsidiaryAccounts.compras = companyInfo.getFieldValue('custrecord_lmry_pe_cuenta_compras');
                subsidiaryAccounts.variacionExistencias = companyInfo.getFieldValue('custrecord_lmry_pe_cuenta_variacion_exis');
                subsidiaryAccounts.defaultCompra = companyInfo.getFieldValue('custrecord_lmry_pe_cuenta_defecto_compra');
                subsidiaryAccounts.defaultDevolucion = companyInfo.getFieldValue('custrecord_lmry_pe_cuenta_defecto_devolu');
                subsidiaryAccounts.facturaNoEmitida = companyInfo.getFieldValue('custrecord_lmry_pe_cuenta_fact_noemitida');
            }

            for (var key in subsidiaryAccounts) {
                if (Number(subsidiaryAccounts[key]) && allAccounts.indexOf(Number(subsidiaryAccounts[key])) == -1) {
                    allAccounts.push(Number(subsidiaryAccounts[key]));
                }
            }
            nlapiLogExecution("DEBUG", "subsidiaryAccounts", JSON.stringify(subsidiaryAccounts));

            // Valida que tenga las cuenta configuradas
            if (!subsidiaryAccounts.variacionExistencias){
                nlapiLogExecution("DEBUG", "Revisar los campos", 'One World Edition (subsidiaria), Mid Market Edition (Company Information)');
                nlapiLogExecution("DEBUG", "Revisar los campos", 'Latam - pe cuenta variacion existencias, Latam - pe cuenta factura no emitida, Latam - pe cuenta de compras');
            }

            /* ********************************* */
            /* Iteracion de las lineas de Items  */
            /* ********************************* */
            var items = {}, lines = [];
            var numItems = transactionRecord.getLineItemCount("item");
            if (type == "vendorbill" || type == "vendorcredit") {
                for (var i = 1; i <= numItems; i++) {
                    // Para comprobar que los items del Vendor Bill O Bill Credit proviene del Purchase Order
                    var generateAccruals = transactionRecord.getLineItemValue("item", "generateaccruals", i);
                    if (generateAccruals == true || generateAccruals == "T") {
                        var itemId = transactionRecord.getLineItemValue("item", "item", i);
                        var amount = transactionRecord.getLineItemValue("item", "amount", i) || 0.00;
                        amount = parseFloat(amount);

                        var itemType = transactionRecord.getLineItemValue("item", "itemtype", i);
                        var department = transactionRecord.getLineItemValue("item", "department", i) || "";
                        var class_ = transactionRecord.getLineItemValue("item", "class", i) || "";
                        var location = transactionRecord.getLineItemValue("item", "location", i) || "";
                        if (!items.hasOwnProperty(itemId)) {
                            items[itemId] = {};
                        }

                        if (amount && (itemType == "InvtPart" || itemType == "Assembly")) {
                            lines.push({
                                itemId: itemId,
                                amount: amount,
                                itemType: itemType,
                                department: department,
                                class_: class_,
                                location: location
                            });
                        }
                    }
                }
            } else if (type == "itemreceipt" || type == "itemfulfillment") {
              
                for (var i = 1; i <= numItems; i++) {
                    var itemId   = transactionRecord.getLineItemValue("item", "item", i);
                    var quantity = transactionRecord.getLineItemValue("item", "quantity", i) || 0.00;
                        quantity = parseFloat(quantity);
                    var rate = transactionRecord.getLineItemValue("item", "rate", i) || 0.00;
                        rate = parseFloat(rate);
                    var amount   = round2(quantity * rate);
                    var itemType = transactionRecord.getLineItemValue("item", "itemtype", i);
                    var department = transactionRecord.getLineItemValue("item", "department", i) || "";
                    var class_   = transactionRecord.getLineItemValue("item", "class", i) || "";
                    var location = transactionRecord.getLineItemValue("item", "location", i) || "";

                    if (!items.hasOwnProperty(itemId)) {
                        items[itemId] = {};
                    }

                    /* ****************************************
                    * Funcion para extraer las cuentas de
                    * la sublist item columna landedcost
                    * Fecha : 23/10/2023
                    * Landed Cost : Acumulado
                    * ************************************** */
                    var landedCost = transactionRecord.getLineItemValue("item", "custcol_smc_json", i) || "";
                    var landedAmount = 0;
                    nlapiLogExecution("DEBUG", "landedcost-1", landedCost);
                    if (landedCost && type == "itemreceipt") {
                        // Landed Cost : JSon
                        landedCost = JSON.parse(landedCost);
                        for (var j = 0; j < landedCost.length; j++) {
                            // Landed Cost : Acumulado
                            landedAmount += landedCost[j].amount || 0;
                           
                            // Landed Cost : Account Credit & Debit
                            if (Number(landedCost[j].accocredit) && Number(landedCost[j].accondebit)){
                                allAccounts.push(Number(landedCost[j].accocredit));
                                allAccounts.push(Number(landedCost[j].accondebit));    
                            }
                            
                        } // Landed Cost : JSon
                        
                        // Landed Cost : Acumulado x Tipo de cambio
                        if (exchangeRate != 1) {
                            landedAmount = landedAmount * exchangeRate;
                            landedAmount = round2(landedAmount)
                        }

                    } // Landed Cost : Acumulado
                    
                    if (amount && (itemType == "InvtPart" || itemType == "Assembly")) {
                        lines.push({
                            itemId: itemId,
                            amount: amount,
                            itemType: itemType,
                            department: department,
                            class_: class_,
                            location: location,
                            landedAmount: landedAmount
                        });
                    }
                }
            }

            nlapiLogExecution("DEBUG", "lines", lines);

            setAccountItems(items, allAccounts);
            
            nlapiLogExecution("DEBUG", "setAccountItems - allAccounts", JSON.stringify(allAccounts));
            nlapiLogExecution("DEBUG", "setAccountItems - items", JSON.stringify(items));
            
            // Obtiene el Global Account Mapping
            var Json_GMA = {};
            if (FEAT_MAPPING == true || FEAT_MAPPING == "T") {
                Json_GMA = obtainsAccountsGMA(book.getId(), allAccounts, transactionRecord.getFieldValue('subsidiary'), transactionRecord.getFieldValue('trandate'));
                nlapiLogExecution("DEBUG", "obtainsAccountsGMA", JSON.stringify(Json_GMA));
            }
            
            //Obtiene el Item Account Mapping
            var Json_IMA = {};
            if (FEAT_MAPPING == true || FEAT_MAPPING == "T") {
                Json_IMA = obtainsAccountsIMA(book.getId(), allAccounts, transactionRecord.getFieldValue('subsidiary'), transactionRecord.getFieldValue('trandate'));
                nlapiLogExecution("DEBUG", "obtainsAccountsIMA", JSON.stringify(Json_IMA));
            }
    
            // Array Account 6-9
            var accounts69Array = [];

            /* ****************************************
            * Funcion para extraer las cuentas de
            * la sublist item columna landedcost
            * Fecha : 23/10/2023
            * Landed Cost : Insert Line
            * ************************************** */
            if (type == "itemreceipt"){
                // Iteracion Item line
                for (var i = 1; i <= numItems; i++) {
                    var itemId   = transactionRecord.getLineItemValue("item", "item", i);
                    var landedCost = transactionRecord.getLineItemValue("item", "custcol_smc_json", i) || "";
                    var landedAmoun2 = 0;
                    if (landedCost) {
                       // Landed Cost : JSon
                       landedCost = JSON.parse(landedCost);   
                       for (var j = 0; j < landedCost.length; j++) {
                            // Landed Cost : Linea 
                            landedAmoun2 = landedCost[j].amount || 0;

                            // Landed Cost ; Linea x Tipo de cambio
                            if (exchangeRate != 1) {
                                landedAmoun2 = landedAmoun2 * exchangeRate;
                                landedAmoun2 = round2(landedAmoun2)
                            }

                            nlapiLogExecution('DEBUG', 'landedCost : Account', 
                                              'accocredit : ' + landedCost[j].accocredit + 
                                              ', accondebit : ' + landedCost[j].accondebit + 
                                              ', amount : ' + landedAmoun2);

                            // Landed Cost : Account Credit & Debit
                            if (landedCost[j].accocredit!='' && landedCost[j].accondebit!=''){
                                var lcAccCre = landedCost[j].accocredit;
                                var lcAccDeb = landedCost[j].accondebit;
                                
                                // Cuentas Multibook
                                var setAccCre = getAccount(Json_GMA, Json_IMA, lcAccCre, department, class_, location, transactionRecord.getFieldValue('trandate'));
                                var setAccDeb = getAccount(Json_GMA, Json_IMA, lcAccDeb, department, class_, location, transactionRecord.getFieldValue('trandate'));
                                
                                nlapiLogExecution('DEBUG', 'landedCost : Mapping Account', 
                                                 'setAccCre : ' + setAccCre + 
                                                 ', setAccDeb : ' + setAccDeb + 
                                                 ', amount : ' + landedAmoun2);

                                // Landed Cost : Account Credit
                                var newCreditLandedCost = customLines.addNewLine();
                                newCreditLandedCost.setAccountId(Number(setAccCre));
                                newCreditLandedCost.setCreditAmount(parseFloat(landedAmoun2));
                                newCreditLandedCost.setMemo('Landed Cost (Item ID: ' + itemId + ')');
                               
                                // Landed Cost : Account Debit
                                var newDebitLandedCost = customLines.addNewLine();
                                newDebitLandedCost.setAccountId(Number(setAccDeb));    
                                newDebitLandedCost.setDebitAmount(parseFloat(landedAmoun2));
                                newDebitLandedCost.setMemo('Landed Cost (Item ID: ' + itemId + ')');

                                // Landed Cost : Segmentacion Deparment
                                if ((FEAT_DEPT == true || FEAT_DEPT == "T") && (DEPTSPERLINE == true || DEPTSPERLINE == "T") && department) {
                                    newCreditLandedCost.setDepartmentId(Number(department));
                                    newDebitLandedCost.setDepartmentId(Number(department));
                                }

                                // Landed Cost : Segmentacion Class
                                if ((FEAT_CLASS == true || FEAT_CLASS == "T") && (CLASSESPERLINE == true || CLASSESPERLINE == "T") && class_) {
                                    newCreditLandedCost.setClassId(Number(class_));
                                    newDebitLandedCost.setClassId(Number(class_));
                                }

                                // Landed Cost : Segmentacion Location
                                if ((FEAT_LOC == true || FEAT_LOC == "T") && location) {
                                    newCreditLandedCost.setLocationId(Number(location));
                                    newDebitLandedCost.setLocationId(Number(location));
                                }

                                // Landed Cost : Cuenta 6-9
                                var lineDebit = {
                                    book: book.getId(),
                                    department: department || "",
                                    "class": class_ || "",
                                    location: location || "",
                                    amount: landedAmoun2,
                                    memo: "LandedCost : Espejo 6-9"
                                };
                                var lineCredit = JSON.parse(JSON.stringify(lineDebit));
                                lineDebit.columna = "debit";
                                lineCredit.columna = "credit";
                                lineDebit.account = lcAccDeb;
                                lineCredit.account = lcAccCre;

                                accounts69Array.push(lineDebit, lineCredit);
                            } // Landed Cost : Account Credit & Debit
                        } // Landed Cost : JSon
                    }
                } // Iteracion Item line
            } // Landed Cost : Insert Line


            var defaultAccount = "";
            if (type == "vendorbill" || type == "itemreceipt") {
                defaultAccount = subsidiaryAccounts.defaultCompra || "";
            } else if (type == "vendorcredit" || type == "itemfulfillment") {
                defaultAccount = subsidiaryAccounts.defaultDevolucion || "";
            } else if (type == "inventoryadjustment") {
                defaultAccount = subsidiaryAccounts.defaultCompra || "";
            }

            defaultAccount = Number(defaultAccount);

            if (type == "vendorbill" || type == "vendorcredit") {
                var factNoEmitAccount = subsidiaryAccounts.facturaNoEmitida || "";
                factNoEmitAccount = Number(factNoEmitAccount);
                nlapiLogExecution("DEBUG", "defaultAccount, factNoEmitAccount", [defaultAccount, factNoEmitAccount].join("-"));

                if (defaultAccount) {
                    for (var i = 0; i < lines.length; i++) {
                        var itemId = lines[i].itemId;
                        var amount = lines[i].amount || 0.00;
                        if (exchangeRate != 1) {
                            amount = amount * exchangeRate;
                        }
                        amount = round2(amount);

                        var department = lines[i].department || "";
                        department = Number(department);
                        var class_ = lines[i].class_ || "";
                        class_ = Number(class_);
                        var location = lines[i].location || "";
                        location = Number(location);
                        // Si no esta configurada en la subsidiaria, se toma del item
                        if (!factNoEmitAccount && items.hasOwnProperty(itemId)) {
                            factNoEmitAccount = items[itemId].cuentaFactNoEmit || "";
                            factNoEmitAccount = Number(factNoEmitAccount);
                        }

                        // Valores para Espejo 6-9
                        var lineDebit = {
                            book: book.getId(),
                            department: department || "",
                            "class": class_ || "",
                            location: location || "",
                            amount: amount,
                            memo: "Espejo 6-9"
                        };

                        var lineCredit = JSON.parse(JSON.stringify(lineDebit));
                        lineDebit.columna = "debit";
                        lineCredit.columna = "credit";

                        if (amount && factNoEmitAccount) {
                            var newDebitLine = customLines.addNewLine();
                            var newCreditLine = customLines.addNewLine();

                            newDebitLine.setDebitAmount(parseFloat(amount));
                            newCreditLine.setCreditAmount(parseFloat(amount));

                            factNoEmitAccount = getAccount(Json_GMA, Json_IMA, factNoEmitAccount, department, class_, location, transactionRecord.getFieldValue('trandate'));
                            defaultAccount = getAccount(Json_GMA, Json_IMA, defaultAccount, department, class_, location, transactionRecord.getFieldValue('trandate'));
                            
                            //nlapiLogExecution("DEBUG", "type - " + type, 'factNoEmitAccount : ' + factNoEmitAccount + ' , defaultAccount : ' + defaultAccount);
                            if (type == "vendorbill") {
                                newDebitLine.setAccountId(Number(factNoEmitAccount));
                                newCreditLine.setAccountId(Number(defaultAccount));

                                lineDebit.account = factNoEmitAccount;
                                lineCredit.account = defaultAccount;
                            } else if (type == "vendorcredit") {
                                newDebitLine.setAccountId(Number(defaultAccount));
                                newCreditLine.setAccountId(Number(factNoEmitAccount));

                                lineDebit.account = defaultAccount;
                                lineCredit.account = factNoEmitAccount;
                            }

                            if ((FEAT_DEPT == true || FEAT_DEPT == "T") && (DEPTSPERLINE == true || DEPTSPERLINE == "T") && department) {
                                newDebitLine.setDepartmentId(department);
                                newCreditLine.setDepartmentId(department);
                            }

                            if ((FEAT_CLASS == true || FEAT_CLASS == "T") && (CLASSESPERLINE == true || CLASSESPERLINE == "T") && class_) {
                                newDebitLine.setClassId(class_);
                                newCreditLine.setClassId(class_);
                            }

                            if ((FEAT_LOC == true || FEAT_LOC == "T") && location) {
                                newDebitLine.setLocationId(location);
                                newCreditLine.setLocationId(location);
                            }

                            accounts69Array.push(lineDebit, lineCredit);
                        }
                    }
                }
            } else if (type == "itemfulfillment" || type == "itemreceipt") {
                var cuentaVarExist = subsidiaryAccounts.variacionExistencias;
                cuentaVarExist = Number(cuentaVarExist);
                var cuentaCompras = subsidiaryAccounts.compras;
                cuentaCompras = Number(cuentaCompras);
                var factNoEmitAccount = subsidiaryAccounts.facturaNoEmitida;
                factNoEmitAccount = Number(factNoEmitAccount);
                if (defaultAccount) {
                    for (var i = 0; i < lines.length; i++) {
                        var itemId = lines[i].itemId;
                        var amount = lines[i].amount || 0.00;
                        if (exchangeRate != 1) {
                            amount = amount * exchangeRate;
                        }
                        amount = round2(amount);

                        var department = lines[i].department || "";
                        department = Number(department);
                        var class_ = lines[i].class_ || "";
                        class_ = Number(class_);
                        var location = lines[i].location || "";
                        location = Number(location);

                        if (items.hasOwnProperty(itemId)) {
                            if (!cuentaVarExist) {
                                cuentaVarExist = items[itemId].cuentaVarExist || "";
                                cuentaVarExist = Number(cuentaVarExist);
                            }
                            if (!cuentaCompras) {
                                cuentaCompras = items[itemId].cuentaCompras || "";
                                cuentaCompras = Number(cuentaCompras);
                            }
                            if (!factNoEmitAccount) {
                                factNoEmitAccount = items[itemId].cuentaFactNoEmit || "";
                                factNoEmitAccount = Number(factNoEmitAccount);
                            }
                        }

                        if (amount) {
                            if (cuentaVarExist) {
                                var lineDebit = {
                                    book: book.getId(),
                                    department: department || "",
                                    "class": class_ || "",
                                    location: location || "",
                                    amount: amount,
                                    memo: "Espejo 6-9"
                                };
                                var lineCredit = JSON.parse(JSON.stringify(lineDebit));
                                lineDebit.columna = "debit";
                                lineCredit.columna = "credit";

                                var newDebitLine1 = customLines.addNewLine();
                                var newCreditLine1 = customLines.addNewLine();

                                newDebitLine1.setDebitAmount(parseFloat(amount));
                                newCreditLine1.setCreditAmount(parseFloat(amount));

                                cuentaVarExist = getAccount(Json_GMA, Json_IMA, cuentaVarExist, department, class_, location, transactionRecord.getFieldValue('trandate'));
                                defaultAccount = getAccount(Json_GMA, Json_IMA, defaultAccount, department, class_, location, transactionRecord.getFieldValue('trandate'));
                                
                                // nlapiLogExecution("DEBUG", "type - " + type, 'cuentaVarExist : ' + cuentaVarExist + ' , defaultAccount : ' + defaultAccount);
                                if (type == "itemreceipt") {
                                    // Landed Cost : Acumulado Debit (Calculo)
                                    newDebitLine1.setDebitAmount(parseFloat(amount) + parseFloat(lines[i].landedAmount));

                                    newDebitLine1.setAccountId(Number(defaultAccount));
                                    newCreditLine1.setAccountId(Number(cuentaVarExist));

                                    lineDebit.account = defaultAccount;
                                    lineCredit.account = cuentaVarExist;
                                } else if (type == "itemfulfillment") {
                                    newDebitLine1.setAccountId(Number(cuentaVarExist));
                                    newCreditLine1.setAccountId(Number(defaultAccount));

                                    lineDebit.account = cuentaVarExist;
                                    lineCredit.account = defaultAccount;
                                }

                                if ((FEAT_DEPT == true || FEAT_DEPT == "T") && (DEPTSPERLINE == true || DEPTSPERLINE == "T") && department) {
                                    newDebitLine1.setDepartmentId(department);
                                    newCreditLine1.setDepartmentId(department);
                                }

                                if ((FEAT_CLASS == true || FEAT_CLASS == "T") && (CLASSESPERLINE == true || CLASSESPERLINE == "T") && class_) {
                                    newDebitLine1.setClassId(class_);
                                    newCreditLine1.setClassId(class_);
                                }

                                if ((FEAT_LOC == true || FEAT_LOC == "T") && location) {
                                    newDebitLine1.setLocationId(location);
                                    newCreditLine1.setLocationId(location);
                                }

                                accounts69Array.push(lineDebit, lineCredit);
                            }
                            
                            if (cuentaCompras && factNoEmitAccount) {
                                var lineDebit = {
                                    book: book.getId(),
                                    department: department || "",
                                    "class": class_ || "",
                                    location: location || "",
                                    amount: amount,
                                    memo: "Espejo 6-9"
                                };
                                var lineCredit = JSON.parse(JSON.stringify(lineDebit));
                                lineDebit.columna = "debit";
                                lineCredit.columna = "credit";

                                var newDebitLine2 = customLines.addNewLine();
                                var newCreditLine2 = customLines.addNewLine();

                                newDebitLine2.setDebitAmount(parseFloat(amount));
                                newCreditLine2.setCreditAmount(parseFloat(amount));

                                cuentaCompras = getAccount(Json_GMA, Json_IMA, cuentaCompras, department, class_, location, transactionRecord.getFieldValue('trandate'));
                                factNoEmitAccount = getAccount(Json_GMA, Json_IMA, factNoEmitAccount, department, class_, location, transactionRecord.getFieldValue('trandate'));

                                // nlapiLogExecution("DEBUG", "type - " + type, 'cuentaCompras : ' + cuentaCompras + ' , factNoEmitAccount : ' + factNoEmitAccount);
                                if (type == "itemreceipt") {
                                    // Landed Cost : Acumulado Credit (Calculo)
                                    newCreditLine2.setCreditAmount(parseFloat(amount) + parseFloat(lines[i].landedAmount));

                                    newDebitLine2.setAccountId(Number(cuentaCompras));
                                    newCreditLine2.setAccountId(Number(factNoEmitAccount));

                                    lineDebit.account = cuentaCompras;
                                    lineCredit.account = factNoEmitAccount;
                                } else if (type == "itemfulfillment") {
                                    newDebitLine2.setAccountId(Number(factNoEmitAccount));
                                    newCreditLine2.setAccountId(Number(cuentaCompras));

                                    lineDebit.account = factNoEmitAccount;
                                    lineCredit.account = cuentaCompras;
                                }

                                if ((FEAT_DEPT == true || FEAT_DEPT == "T") && (DEPTSPERLINE == true || DEPTSPERLINE == "T") && department) {
                                    newDebitLine2.setDepartmentId(department);
                                    newCreditLine2.setDepartmentId(department);
                                }

                                if ((FEAT_CLASS == true || FEAT_CLASS == "T") && (CLASSESPERLINE == true || CLASSESPERLINE == "T") && class_) {
                                    newDebitLine2.setClassId(class_);
                                    newCreditLine2.setClassId(class_);
                                }

                                if ((FEAT_LOC == true || FEAT_LOC == "T") && location) {
                                    newDebitLine2.setLocationId(location);
                                    newCreditLine2.setLocationId(location);
                                }
                                
                                accounts69Array.push(lineDebit, lineCredit);
                            }
                        }
                    }
                }
            }

            // nlapiLogExecution("DEBUG", "accounts69Array", JSON.stringify(accounts69Array));
            customizeGlImpactEspejo69(transactionRecord, standardLines, customLines, book, accounts69Array,Json_GMA,Json_IMA);
        }
    } catch (err) {
        nlapiLogExecution("ERROR", "[ customizeGlImpact ]", JSON.stringify({ message : err.message || err, line : err.line }));
        sendemail(' [ customizeGlImpact ] ' + err, LMRY_script);
    }
}

function obtainsAccountsGMA(currentBook, accounts, lmrySubsidiaryId, fechaTransaction) {
    var Json_GMA = {};
    try {
        if (!accounts.length) {
            return Json_GMA;
        }
        var filtros_gam = new Array();
        filtros_gam[0] = new nlobjSearchFilter("effectivedate", null, "onorbefore", fechaTransaction);
        filtros_gam[1] = new nlobjSearchFilter("accountingbook", null, "is", currentBook);
        filtros_gam[2] = new nlobjSearchFilter("sourceaccount", null, "anyof", accounts);
        if (FEAT_SUBSI == "T" || FEAT_SUBSI == true) {
            filtros_gam[3] = new nlobjSearchFilter("subsidiary", null, "anyof", lmrySubsidiaryId);
        }

        var aux = 4;
        var columnas_gam = new Array();
        columnas_gam[0] = new nlobjSearchColumn("internalid");
        columnas_gam[1] = new nlobjSearchColumn("destinationaccount");
        columnas_gam[2] = new nlobjSearchColumn("enddate");
        columnas_gam[3] = new nlobjSearchColumn("sourceaccount");
        if (FEAT_DEPT == "T" || FEAT_DEPT == true) {
            columnas_gam[aux] = new nlobjSearchColumn("department");
            aux++;
        }
        if (FEAT_CLASS == "T" || FEAT_CLASS == true) {
            columnas_gam[aux] = new nlobjSearchColumn("class");
            aux++;
        }
        if (FEAT_LOC == "T" || FEAT_LOC == true) {
            columnas_gam[aux] = new nlobjSearchColumn("location");
            aux++;
        }

        var search_gam = nlapiCreateSearch("globalaccountmapping", filtros_gam, columnas_gam);
        var result_gam = search_gam.runSearch().getResults(0, 1000);
        if (result_gam != null && result_gam.length > 0) {
            for (var i = 0; i < result_gam.length; i++) {
                Json_GMA[result_gam[i].getValue("sourceaccount")] = {
                    "destination": result_gam[i].getValue("destinationaccount"),
                    "enddate": result_gam[i].getValue("enddate")
                }
                if (FEAT_DEPT == "T" || FEAT_DEPT == true) {
                    Json_GMA[result_gam[i].getValue("sourceaccount")]["department"] = result_gam[i].getValue("department");
                }
                if (FEAT_CLASS == "T" || FEAT_CLASS == true) {
                    Json_GMA[result_gam[i].getValue("sourceaccount")]["class"] = result_gam[i].getValue("class");
                }
                if (FEAT_LOC == "T" || FEAT_LOC == true) {
                    Json_GMA[result_gam[i].getValue("sourceaccount")]["location"] = result_gam[i].getValue("location");
                }
            }
        }

    } catch (err) {
        nlapiLogExecution("ERROR", "obtainsAccountsGMA", err);
        throw " [ obtainsAccountsGMA ] " + err;
    }
    return Json_GMA;
}

function obtainsAccountsIMA(currentBook, accounts, lmrySubsidiaryId, fechaTransaction) {
    var Json_IMA = {};
    try {
        if (!accounts.length) {
            return Json_IMA;
        }
        var filtros_iam = new Array();
        filtros_iam[0] = new nlobjSearchFilter("effectivedate", null, "onorbefore", fechaTransaction);
        filtros_iam[1] = new nlobjSearchFilter("accountingbook", null, "is", currentBook);
        filtros_iam[2] = new nlobjSearchFilter("sourceaccount", null, "anyof", accounts);
        if (FEAT_SUBSI == "T" || FEAT_SUBSI == true) {
            filtros_iam[3] = new nlobjSearchFilter("subsidiary", null, "anyof", lmrySubsidiaryId);
        }

        var aux = 4;
        var columnas_iam = new Array();
        columnas_iam[0] = new nlobjSearchColumn("internalid");
        columnas_iam[1] = new nlobjSearchColumn("destinationaccount");
        columnas_iam[2] = new nlobjSearchColumn("enddate");
        columnas_iam[3] = new nlobjSearchColumn("sourceaccount");
        if (FEAT_DEPT == "T" || FEAT_DEPT == true) {
            columnas_iam[aux] = new nlobjSearchColumn("department");
            aux++;
        }
        if (FEAT_CLASS == "T" || FEAT_CLASS == true) {
            columnas_iam[aux] = new nlobjSearchColumn("class");
            aux++;
        }
        if (FEAT_LOC == "T" || FEAT_LOC == true) {
            columnas_iam[aux] = new nlobjSearchColumn("location");
            aux++;
        }

        var search_iam = nlapiCreateSearch("itemaccountmapping", filtros_iam, columnas_iam);
        var result_iam = search_iam.runSearch().getResults(0, 1000);
        if (result_iam != null && result_iam.length > 0) {
            for (var i = 0; i < result_iam.length; i++) {
                Json_IMA[result_iam[i].getValue("sourceaccount")] = {
                    "destination": result_iam[i].getValue("destinationaccount"),
                    "enddate": result_iam[i].getValue("enddate")
                }
                if (FEAT_DEPT == "T" || FEAT_DEPT == true) {
                    Json_IMA[result_iam[i].getValue("sourceaccount")]["department"] = result_iam[i].getValue("department");
                }
                if (FEAT_CLASS == "T" || FEAT_CLASS == true) {
                    Json_IMA[result_iam[i].getValue("sourceaccount")]["class"] = result_iam[i].getValue("class");
                }
                if (FEAT_LOC == "T" || FEAT_LOC == true) {
                    Json_IMA[result_iam[i].getValue("sourceaccount")]["location"] = result_iam[i].getValue("location");
                }
            }
        }

    } catch (err) {
        nlapiLogExecution("ERROR", "obtainsAccountsIMA", err);
        throw " [ obtainsAccountsIMA ] " + err;
    }
    return Json_IMA;
}

function getAccount(Json_GMA, Json_IMA, cuentaSource, dep, cla, loc, fechaTransaction) {
    try {
        for (line in Json_GMA) {
           
            if (line == cuentaSource) {
                
                if (Json_GMA[line].department != 0 && Json_GMA[line].department != null && Json_GMA[line].department != "" && Json_GMA[line].department != undefined) {
                    if (Json_GMA[line].department != dep) {
                        return cuentaSource;
                    }
                }
                if (Json_GMA[line].class != 0 && Json_GMA[line].class != null && Json_GMA[line].class != "" && Json_GMA[line].class != undefined) {
                    if (Json_GMA[line].class != cla) {
                        return cuentaSource;
                    }
                }
                if (Json_GMA[line].location != 0 && Json_GMA[line].location != null && Json_GMA[line].location != "" && Json_GMA[line].location != undefined) {
                    if (Json_GMA[line].location != loc) {
                        return cuentaSource;
                    }
                }
                var fechafin = Json_GMA[line].enddate;
                if (fechafin == "" || fechafin == null) {
                    return Json_GMA[line].destination;
                } else {
                    if (yyymmdd(fechaTransaction) <= yyymmdd(fechafin)) {
                        return Json_GMA[line].destination;
                    }
                }
            }
        
        }
        for (line in Json_IMA) {
            if (line == cuentaSource) {
                
                if (Json_IMA[line].department != 0 && Json_IMA[line].department != null && Json_IMA[line].department != "" && Json_IMA[line].department != undefined) {
                    if (Json_IMA[line].department != dep) {
                        return cuentaSource;
                    }
                }
                if (Json_IMA[line].class != 0 && Json_IMA[line].class != null && Json_IMA[line].class != "" && Json_IMA[line].class != undefined) {
                    if (Json_IMA[line].class != cla) {
                        return cuentaSource;
                    }
                }
                if (Json_IMA[line].location != 0 && Json_IMA[line].location != null && Json_IMA[line].location != "" && Json_IMA[line].location != undefined) {
                    if (Json_IMA[line].location != loc) {
                        return cuentaSource;
                    }
                }
                var fechafin = Json_IMA[line].enddate;
                if (fechafin == "" || fechafin == null) {
                    return Json_IMA[line].destination;
                } else {
                    if (yyymmdd(fechaTransaction) <= yyymmdd(fechafin)) {
                        return Json_IMA[line].destination;
                    }
                }
            }
        }
    } catch (err) {
        nlapiLogExecution("ERROR", "getAccount", err);
        throw " [ getAccount ] " + err;
    }
    return Number(cuentaSource);
}

function setAccountItems(items, allAccounts) {
    var itemKeys = Object.keys(items);
    if (itemKeys.length) {
        var columns = [
            new nlobjSearchColumn("internalid"),
            new nlobjSearchColumn("custitem_lmry_pe_cuenta_fact_noemitida"),
            new nlobjSearchColumn("custitem_lmry_cta_compras_desc"),
            new nlobjSearchColumn("custitem_lmry_pe_cta_varexist")
        ];
        var itemSearch = nlapiCreateSearch("item", [["internalid", "anyof", itemKeys]], columns);

        var results = itemSearch.runSearch().getResults(0, 1000);
        if (results) {
            for (var i = 0; i < results.length; i++) {
                var id = results[i].getValue("internalid");
                if (items.hasOwnProperty(id)) {
                    items[id].cuentaFactNoEmit = results[i].getValue("custitem_lmry_pe_cuenta_fact_noemitida") || "";
                    items[id].cuentaCompras = results[i].getValue("custitem_lmry_cta_compras_desc") || "";
                    items[id].cuentaVarExist = results[i].getValue("custitem_lmry_pe_cta_varexist") || "";
                    if (Number(items[id].cuentaFactNoEmit) && allAccounts.indexOf(Number(items[id].cuentaFactNoEmit)) == -1) {
                        allAccounts.push(Number(items[id].cuentaFactNoEmit));
                    }
                    if (Number(items[id].cuentaCompras) && allAccounts.indexOf(Number(items[id].cuentaCompras)) == -1) {
                        allAccounts.push(Number(items[id].cuentaCompras));
                    }
                    if (Number(items[id].cuentaVarExist) && allAccounts.indexOf(Number(items[id].cuentaVarExist)) == -1) {
                        allAccounts.push(Number(items[id].cuentaVarExist));
                    }
                }
            }
        }
    }
}

function getExchangeRate(transactionRecord, book) {
    var exchangeRate = transactionRecord.getFieldValue("exchangerate");
    if (FEAT_MULTIBOOK == "T" || FEAT_MULTIBOOK == true) {
        if (!book.isPrimary()) {
            var bookId = book.getId();
            var numBooks = transactionRecord.getLineItemCount("accountingbookdetail");
            //Se busca el exchange del Libro actual
            for (var i = 1; i <= numBooks; i++) {
                var currentBookId = transactionRecord.getLineItemValue("accountingbookdetail", "bookid", i);
                if (Number(bookId) == Number(currentBookId)) {
                    exchangeRate = transactionRecord.getLineItemValue("accountingbookdetail", "exchangerate", i);
                    exchangeRate = parseFloat(exchangeRate);
                    break;
                }
            }
        }
    }

    return exchangeRate;
}

function round2(num) {
    var e = (num >= 0) ? 1e-6 : -1e-6;
    return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
}

/* ------------------------------------------------------------------------------------------------------
 * Formatea el campo fecha en YYYYMMDD
 * --------------------------------------------------------------------------------------------------- */
function yyymmdd(date) {
	if ( date=='' || date==null) {
		return '';
	}
	var yy = '';
	var mm = '';
	var dd = '';

	if (date.length==8) {
		if ( date[1]=='/' && date[3]=='/' ) {
			yy = date[4]+date[5]+date[6]+date[7];
			mm = '0'+date[2];
			dd = '0'+date[0];
		}
	}
	if (date.length==9) {
		if ( date[1]=='/' && date[4]=='/' ) {
			yy = date[5]+date[6]+date[7]+date[8];
			mm = date[2]+date[3];
			dd = '0'+date[0];
		}
		if ( date[2]=='/' && date[4]=='/' ) {
			yy = date[5]+date[6]+date[7]+date[8];
			mm = '0'+date[3];
			dd = date.substring(0,2);
		}
	}
	if (date.length==10) {
		yy = date.substring(6,10);
		mm = date.substring(3,5);
		dd = date.substring(0,2);
	}
	var fe = '' + yy + mm + dd;

	return fe;
}
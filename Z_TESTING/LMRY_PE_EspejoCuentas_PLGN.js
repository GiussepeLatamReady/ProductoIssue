/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       22 April 2022     LatamReady
 * File : LMRY_PE_EspejoCuentas_PLGN.js
 */
var objContext = nlapiGetContext();

var LMRY_script = 'LatamReady - PE Espejo Cuentas 6-9';
var featureMB = objContext.getFeature('MULTIBOOK');
var featureOW = objContext.getFeature('SUBSIDIARIES');
var featureDep = objContext.getSetting('FEATURE', 'DEPARTMENTS');
var featureCla = objContext.getSetting('FEATURE', 'CLASSES');
var featureLoc = objContext.getSetting('FEATURE', 'LOCATIONS');
var FEAT_ACC_MAPPING = objContext.getFeature('coaclassificationmanagement');

var filterDepartment = false;

function customizeGlImpact(transactionRecord, standardLines, customLines, book) {

    try {
        nlapiLogExecution("DEBUG", "execute", "start");
        if (featureOW) {
            var country = transactionRecord.getFieldText("custbody_lmry_subsidiary_country");
            var subsidiaria = transactionRecord.getFieldValue('subsidiary');
        } else {
            //load Netsuite configuration page
            var companyInfo = nlapiLoadConfiguration('companyinformation');
            //get field values
            var country = companyInfo.getFieldText('country');
            var subsidiaria = 1
        }
        country = validarAcentos(country);
        country = country.substring(0, 3).toUpperCase();

        var type = transactionRecord.getRecordType();
        type = type.toLowerCase();

        // var subsidiaria = transactionRecord.getFieldValue('subsidiary');
        var licenses = getLicenses(subsidiaria);
        var typeTransaction = ['vendorbill', 'journalentry', 'customerpayment', 'expensereport', 'check', 'deposit', 'vendorcredit', 'itemreceipt', 'itemfulfillment', 'inventoryadjustment'];

        if (getAuthorization(500, licenses) == false || country != 'PER' || typeTransaction.indexOf(type) == -1) {
            return true;
        }

        filterDepartment = getAuthorization(864, licenses);
        //nlapiLogExecution("DEBUG", "filterDepartment", filterDepartment);

        if (filterDepartment == true && (featureDep == 'F' || featureDep == false)) {
            return true;
        }

        // SOLO PARA JOURNAL
        if (type == 'journalentry') {
            var cargaInicial = transactionRecord.getFieldValue('custbody_lmry_carga_inicial');
            if (cargaInicial == true || cargaInicial == 'T') {
                return true;
            }
        }

        var typefrom = "";
        if (type == 'itemfulfillment') {
            typefrom = transactionRecord.getFieldValue('ordertype');
            if (typefrom != 'VendAuth' && typefrom != 'TrnfrOrd') return true;
        }

        var hasAccountMapping = !book.isPrimary() && (FEAT_ACC_MAPPING == true || FEAT_ACC_MAPPING == "T");
        nlapiLogExecution("DEBUG", "currentBook", book.getId());
        //se inicializa denuevo le json de items
        var items = [];
        if (type == "vendorbill") {
            items = getItems(transactionRecord);
        }

        nlapiLogExecution("DEBUG", "items", JSON.stringify(items));


        var jsonAccounting = getTransactionLines(transactionRecord, book);
        nlapiLogExecution("DEBUG", "jsonAccounting", JSON.stringify(jsonAccounting));



        var jsonCuentas = getAccountConfig(transactionRecord, jsonAccounting);
        nlapiLogExecution("DEBUG", "jsonCuentas", JSON.stringify(jsonCuentas));

        var globalAccountMappings = {}, itemAccountMapping = {};
        nlapiLogExecution("DEBUG", "hasAccountMapping", hasAccountMapping);
        if (hasAccountMapping) {
            globalAccountMappings = getGlobalAccountMappings(transactionRecord, book, jsonAccounting, jsonCuentas);
            nlapiLogExecution("DEBUG", "globalAccountMappings", JSON.stringify(globalAccountMappings));
            itemAccountMapping = getItemAccountMapping(transactionRecord, book, jsonAccounting, jsonCuentas);
            nlapiLogExecution("DEBUG", "itemAccountMapping", JSON.stringify(itemAccountMapping));

        }

        var JsonItem = {};
        var processWithoutPO = validatePluginNoPO(subsidiaria);
       
        if (items.length && (transactionRecord.getFieldValue('ordertype') == 'PurchOrd')) {
            var cantidad = Math.ceil(items.length / 1000);
            for (var i = 0; i < cantidad; i++) {
                var Arraux = items.slice(1000 * (i), 1000 * (i + 1));
                var filters = [
                    ["internalid", "anyof", Arraux],
                    "AND",
                    [[["generateaccruals", "is", "T"], "AND", ["type", "anyof", "Service"]], "OR", [["type", "anyof", "InvtPart", "Group", "Kit", "Assembly"]]]
                ]

                var columns = [];
                columns[0] = new nlobjSearchColumn("internalid")
                var serviceitemSearch = nlapiSearchRecord("item", null, filters, columns);

                for (var i = 0; serviceitemSearch != null && i < serviceitemSearch.length; i++) {
                    var searchresult = serviceitemSearch[i];
                    var id = searchresult.getValue('internalid')
                    if (!JsonItem[id]) JsonItem[id] = true;
                }
            }
        }

        nlapiLogExecution("DEBUG", "JsonItem", JSON.stringify(JsonItem));

        //MANDATORY SEGMENTACION
        var mandatoryDepartment = nlapiGetContext().getPreference('DEPTMANDATORY');
        var mandatoryClass = nlapiGetContext().getPreference('CLASSMANDATORY');
        var mandatoryLocation = nlapiGetContext().getPreference('LOCMANDATORY');

        //nlapiLogExecution("ERROR","mandatorySegmentacion",mandatoryDepartment + "-" + mandatoryClass + "-" + mandatoryLocation);

        //CREADO DE LINEAS GL
        var currentBook = book.getId();

        if (jsonAccounting.hasOwnProperty(currentBook)) {
            for (var i = 0; i < jsonAccounting[currentBook].length; i++) {
                var department = jsonAccounting[currentBook][i].department || "";
                var class_ = jsonAccounting[currentBook][i]["class"] || "";
                var location = jsonAccounting[currentBook][i].location || "";
                var amount = jsonAccounting[currentBook][i].amount || 0.00;
                amount = parseFloat(amount);
                var item = jsonAccounting[currentBook][i].item || "";

                var account = jsonAccounting[currentBook][i].account;
                nlapiLogExecution("DEBUG", "account obj", JSON.stringify(jsonAccounting[currentBook][i]));
                if (amount <= 0.00) {
                    nlapiLogExecution("DEBUG", "amount", "stop");
                    continue;
                }
                //se comprueba si existe el item de la linea en el json de articulos con el devengo activado
                if (JsonItem[item]) {
                    nlapiLogExecution("DEBUG", "JsonItem", "stop");
                    continue;
                }


                var primaryAccount = account;
                if (hasAccountMapping) {
                    primaryAccount = transformToPrimaryBookAccount(account, globalAccountMappings, itemAccountMapping, customDepartment, customDepartment, customLocation);
                    nlapiLogExecution("DEBUG", "account", account);
                    nlapiLogExecution("DEBUG", "primaryAccount", primaryAccount);
                }


                var configObj = jsonCuentas[primaryAccount];
                
                if (filterDepartment) {
                    configObj = jsonCuentas[primaryAccount + ";" + department] || jsonCuentas[primaryAccount + ";"] || "";
                }
                nlapiLogExecution("DEBUG", "configObj", JSON.stringify(configObj));
                if (!configObj) {
                    nlapiLogExecution("DEBUG", "configObj", "stop");
                    continue;
                }

                var newLineDebit = '', newLineCredit = '';

                var debitAccount = configObj.debit;
                var creditAccount = configObj.credit;

                var customDepartment = department;
                var customClass = class_;
                var customLocation = location;
                var customMemo = jsonAccounting[currentBook][i].memo;

                if ((mandatoryDepartment == true || mandatoryDepartment == 'T') && !customDepartment) {
                    customDepartment = configObj['department'];
                }

                if ((mandatoryClass == true || mandatoryClass == 'T') && !customClass) {
                    customClass = configObj['class'];
                }

                if ((mandatoryLocation == true || mandatoryLocation == 'T') && !customLocation) {
                    customLocation = configObj['location'];
                }

                if (hasAccountMapping) {
                    debitAccount = getAccountMappingByAccount(debitAccount, globalAccountMappings, itemAccountMapping, customDepartment, customClass, customLocation);
                    creditAccount = getAccountMappingByAccount(creditAccount, globalAccountMappings, itemAccountMapping, customDepartment, customClass, customLocation);
                }

                if (!debitAccount && !creditAccount) {
                    nlapiLogExecution("DEBUG", "Account diferents", "stop");
                    continue;
                }
                nlapiLogExecution("DEBUG", "Creacion de linea", "start");
                nlapiLogExecution("DEBUG", "Column", jsonAccounting[currentBook][i]['columna']);
                if (jsonAccounting[currentBook][i]['columna'] == 'debit') {
                    newLineDebit = customLines.addNewLine();
                    newLineCredit = customLines.addNewLine();
                    
                    newLineDebit.setAccountId(parseFloat(debitAccount));
                    newLineCredit.setAccountId(parseFloat(creditAccount));
                } else {
                    newLineCredit = customLines.addNewLine();
                    newLineDebit = customLines.addNewLine();

                    newLineCredit.setAccountId(parseFloat(debitAccount));
                    newLineDebit.setAccountId(parseFloat(creditAccount));
                }
                newLineDebit.setDebitAmount(parseFloat(amount));
                newLineCredit.setCreditAmount(parseFloat(amount));
                nlapiLogExecution("DEBUG", "amount line", amount);
                nlapiLogExecution("DEBUG", "currentBook line", book.getId());
                if (customDepartment) {
                    newLineDebit.setDepartmentId(parseFloat(customDepartment));
                    newLineCredit.setDepartmentId(parseFloat(customDepartment));
                }

                if (customClass) {
                    newLineDebit.setClassId(parseFloat(customClass));
                    newLineCredit.setClassId(parseFloat(customClass));
                }

                if (customLocation) {
                    newLineDebit.setLocationId(parseFloat(customLocation));
                    newLineCredit.setLocationId(parseFloat(customLocation));
                }
                nlapiLogExecution("DEBUG", "Creacion de linea", "end");
                /*if(customMemo){
                  newLineDebit.setMemo(customMemo);
                  newLineCredit.setMemo(customMemo);
                }*/
                  

            }
            
        }
        nlapiLogExecution("DEBUG", "execute", "end");

    } catch (err) {
        nlapiLogExecution('Error', 'Error', err);
        sendemail(' [ customizeGlImpact ] ' + err, LMRY_script);
    }

}


function getAccountConfig(transactionRecord, jsonAccounting) {

    var accountIds = [];
    for (var key in jsonAccounting) {
        for (var i = 0; i < jsonAccounting[key].length; i++) {
            var account = jsonAccounting[key][i].account;
            account = Number(account);
            if (account && accountIds.indexOf(account) == -1) {
                accountIds.push(account);
            }
        }
    }

    var jsonCuentas = {};
    if (accountIds.length) {
        var subsidiary = transactionRecord.getFieldValue("subsidiary");
        var filtrosCuentas = [];
        
        filtrosCuentas[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
        filtrosCuentas[1] = new nlobjSearchFilter('custrecord_lmry_pe_espejo_subsidiary', null, 'is', subsidiary);        
        filtrosCuentas[2] = new nlobjSearchFilter("custrecord_lmry_pe_espejo_sourceacc", null, "anyof", accountIds);
        //filtrosCuentas[2] = new nlobjSearchFilter ('isinactive',null,'is','F');

        var columnasCuentas = [];
        columnasCuentas[0] = new nlobjSearchColumn('internalid');
        columnasCuentas[1] = new nlobjSearchColumn('custrecord_lmry_pe_espejo_sourceacc');
        columnasCuentas[2] = new nlobjSearchColumn('custrecord_lmry_pe_espejo_debitacc');
        columnasCuentas[3] = new nlobjSearchColumn('custrecord_lmry_pe_espejo_creditacc');
        columnasCuentas[4] = new nlobjSearchColumn('custrecord_lmry_pe_espejo_department');
        columnasCuentas[5] = new nlobjSearchColumn('custrecord_lmry_pe_espejo_class');
        columnasCuentas[6] = new nlobjSearchColumn('custrecord_lmry_pe_espejo_location');
        //columnasCuentas[7] = new nlobjSearchColumn('custrecord_lmry_pe_espejo_groupamounts');

        var searchCuentas = nlapiCreateSearch("customrecord_lmry_pe_espejo_cuentas", filtrosCuentas, columnasCuentas);
        searchCuentas = searchCuentas.runSearch();
        var iteratorCount = 0;
        var iteratorCondition = false;

        while (!iteratorCondition) {
            var resultCuentas = searchCuentas.getResults(iteratorCount, iteratorCount + 1000);
            if (resultCuentas != null && resultCuentas.length > 0) {
                for (var i = 0; i < resultCuentas.length; i++) {
                    var sourceAccount = resultCuentas[i].getValue('custrecord_lmry_pe_espejo_sourceacc');
                    var debitAccount = resultCuentas[i].getValue('custrecord_lmry_pe_espejo_debitacc') || "";
                    var creditAccount = resultCuentas[i].getValue('custrecord_lmry_pe_espejo_creditacc') || "";
                    var department = resultCuentas[i].getValue('custrecord_lmry_pe_espejo_department') || "";
                    var class_ = resultCuentas[i].getValue('custrecord_lmry_pe_espejo_class') || "";
                    var location = resultCuentas[i].getValue('custrecord_lmry_pe_espejo_location') || "";

                    if (filterDepartment) {
                        jsonCuentas[sourceAccount + ";" + department] = {
                            sourceAccount: sourceAccount, debit: debitAccount, 'credit': creditAccount,
                            department: department, 'class': class_, 'location': location
                        };
                    } else {
                        jsonCuentas[sourceAccount] = {
                            sourceAccount: sourceAccount, debit: debitAccount, 'credit': creditAccount,
                            department: department, 'class': class_, 'location': location
                        };
                    }
                }

            } else {
                iteratorCondition = true;
            }
            if (iteratorCondition) {
                break;
            } else {
                iteratorCount += 1000;
            }
        }
    }

    return jsonCuentas;
}


function getTransactionLines(transactionRecord, book) {
    var type = transactionRecord.getRecordType();
    type = type.toLowerCase();

    var jsonAccounting = {};

    if (featureMB == true || featureMB == 'T') {
        //BUSQUEDA POR INTERFAZ: MULTIBOOKING
        var searchAccounting = nlapiLoadSearch('accountingtransaction', 'customsearch_lmry_pe_espejocuentas');
        searchAccounting.addFilter(new nlobjSearchFilter('internalid', null, 'is', transactionRecord.getId()));

        if (featureDep == 'T' || featureDep == true) {
            searchAccounting.addColumn(new nlobjSearchColumn('department', 'transaction'));
        }
        if (featureCla == 'T' || featureCla == true) {
            searchAccounting.addColumn(new nlobjSearchColumn('class', 'transaction'));
        }
        if (featureLoc == 'T' || featureLoc == true) {
            searchAccounting.addColumn(new nlobjSearchColumn('location', 'transaction'));
        }
        if (type == 'vendorbill') {
            searchAccounting.addColumn(new nlobjSearchColumn('item', 'transaction'));
        }

        iteratorCount = 0;
        iteratorCondition = false;

        searchAccounting = searchAccounting.runSearch();
        while (!iteratorCondition) {
            var resultAccounting = searchAccounting.getResults(iteratorCount, iteratorCount + 1000);

            if (resultAccounting != null && resultAccounting.length > 0) {
                var columnas = resultAccounting[0].getAllColumns();
                for (var i = 0; i < resultAccounting.length; i++) {
                    var libro = resultAccounting[i].getValue('accountingbook');
                    var account = resultAccounting[i].getValue('account');
                    var departmentLinea = '';//resultAccounting[i].getValue(columnas[4]);
                    var classLinea = '';//resultAccounting[i].getValue(columnas[5]);
                    var locationLinea = '';//resultAccounting[i].getValue(columnas[6]);
                    var memoLinea = resultAccounting[i].getValue('memo', 'transaction');
                    var item = '';
                    if (featureDep == 'T' || featureDep == true) {
                        departmentLinea = resultAccounting[i].getValue('department', 'transaction');
                        if (type == 'deposit' && (departmentLinea == "" || departmentLinea == null)) {
                            var deparmentCabecera = transactionRecord.getFieldValue('department');
                            departmentLinea = deparmentCabecera;
                        }
                    }
                    if (featureCla == 'T' || featureCla == true) {
                        classLinea = resultAccounting[i].getValue('class', 'transaction');
                    }
                    if (featureLoc == 'T' || featureLoc == true) {
                        locationLinea = resultAccounting[i].getValue('location', 'transaction');
                    }

                    if (type == 'vendorbill') {
                        item = resultAccounting[i].getValue('item', 'transaction');
                    }

                    var amount = 0;
                    var columna = '';

                    if (resultAccounting[i].getValue('debitamount') != null && resultAccounting[i].getValue('debitamount') != '') {
                        amount = resultAccounting[i].getValue('debitamount') || 0.00;
                        columna = 'debit';
                    } else {
                        amount = resultAccounting[i].getValue('creditamount') || 0.00;
                        columna = 'credit';
                    }

                    amount = parseFloat(amount);

                    if (!jsonAccounting.hasOwnProperty(libro)) {
                        jsonAccounting[libro] = [];
                    }

                    jsonAccounting[libro].push({ 'account': account, 'columna': columna, 'amount': amount, 'department': departmentLinea, 'class': classLinea, 'location': locationLinea, 'memo': memoLinea, 'item': item })

                }
            } else {
                iteratorCondition = true;
            }

            if (iteratorCondition) {
                break;
            } else {
                iteratorCount += 1000;
            }
        }
    } else {

        var searchAccounting = nlapiLoadSearch('transaction', 'customsearch_lmry_pe_espejocuentas_sinmb');
        searchAccounting.addFilter(new nlobjSearchFilter('internalid', null, 'is', transactionRecord.getId()));

        if (featureDep == 'T' || featureDep == true) {
            searchAccounting.addColumn(new nlobjSearchColumn('department'));
        }
        if (featureCla == 'T' || featureCla == true) {
            searchAccounting.addColumn(new nlobjSearchColumn('class'));
        }
        if (featureLoc == 'T' || featureLoc == true) {
            searchAccounting.addColumn(new nlobjSearchColumn('location'));
        }

        if (type == 'vendorbill') {
            searchAccounting.addColumn(new nlobjSearchColumn('item'));
        }

        var iteratorCount = 0;
        var iteratorCondition = false;

        searchAccounting = searchAccounting.runSearch();
        while (!iteratorCondition) {
            var resultTran = searchAccounting.getResults(iteratorCount, iteratorCount + 1000);

            if (resultTran != null && resultTran.length > 0) {
                for (var i = 0; i < resultTran.length; i++) {
                    var account = resultTran[i].getValue('account');
                    var departmentLinea = '';
                    var classLinea = '';
                    var locationLinea = '';
                    if (featureDep == 'T' || featureDep == true) {
                        departmentLinea = resultTran[i].getValue('department');
                        if (type == 'deposit' && (departmentLinea == "" || departmentLinea == null)) {
                            var deparmentCabecera = transactionRecord.getFieldValue('department');
                            departmentLinea = deparmentCabecera;
                        }
                    }
                    if (featureCla == 'T' || featureCla == true) {
                        classLinea = resultTran[i].getValue('class');
                    }
                    if (featureLoc == 'T' || featureLoc == true) {
                        locationLinea = resultTran[i].getValue('location');
                    }
                    var memoLinea = resultTran[i].getValue('memo');
                    var amount = 0;
                    var columna = '';

                    if (resultTran[i].getValue('debitamount') != null && resultTran[i].getValue('debitamount') != '') {
                        amount = resultTran[i].getValue('debitamount') || 0.00;
                        columna = 'debit';
                    } else {
                        amount = resultTran[i].getValue('creditamount') || 0.00;
                        columna = 'credit';
                    }
                    var item = "";
                    if (type == 'vendorbill') {
                        item = resultTran[i].getValue('item');
                    }

                    amount = parseFloat(amount);

                    if (!jsonAccounting.hasOwnProperty("1")) {
                        jsonAccounting["1"] = [];
                    }

                    jsonAccounting["1"].push({ 'account': account, 'columna': columna, 'amount': amount, 'department': departmentLinea, 'class': classLinea, 'location': locationLinea, 'memo': memoLinea, 'item': item })

                }
            } else {
                iteratorCondition = true;
            }

            if (iteratorCondition) {
                break;
            } else {
                iteratorCount += 1000;
            }
        }
    }


    return jsonAccounting;
}


function getItems(transactionRecord) {
    var items = [];
    var numItems = transactionRecord.getLineItemCount('item');

    for (var i = 1; i <= numItems; i++) {
        var item = transactionRecord.getLineItemValue('item', 'item', i) || "";
        item = Number(item);
        if (item && items.indexOf(item) == -1) {
            items.push(item);
        }
    }

    return items;
}


function getGlobalAccountMappings(transactionRecord, book, jsonAccounting, jsonCuentas) {
    var accountMappings = [];
    var accountIds = [];

    for (var key in jsonAccounting) {
        for (var i = 0; i < jsonAccounting[key].length; i++) {
            var account = jsonAccounting[key][i].account;
            account = Number(account);
            if (account && accountIds.indexOf(account) == -1) {
                accountIds.push(account);
            }
        }
    }

    for (var key in jsonCuentas) {
        var debitAccount = jsonCuentas[key].debit;
        debitAccount = Number(debitAccount);
        var creditAccount = jsonCuentas[key].credit;
        creditAccount = Number(creditAccount);

        if (debitAccount && accountIds.indexOf(debitAccount) == -1) {
            accountIds.push(debitAccount);
        }
        if (creditAccount && accountIds.indexOf(creditAccount) == -1) {
            accountIds.push(creditAccount);
        }
    }


    if (accountIds.length) {
        var date = transactionRecord.getFieldValue("trandate");
        var filters = [
            ["sourceaccount", "anyof", accountIds], "AND",
            ["accountingbook", "anyof", book.getId()], "AND",
            ["effectivedate", "onorbefore", date], "AND",
            [
                ["enddate", "isempty", ""], "OR",
                [
                    ["enddate", "isnotempty", ""], "AND",
                    ["enddate", "onorafter", date]
                ]
            ]
        ]

        if (featureOW == true || featureOW == "T") {
            var subsidiary = transactionRecord.getFieldValue("subsidiary");
            filters.push("AND", ["subsidiary", "anyof", subsidiary]);
        }

        var columns = [new nlobjSearchColumn("internalid"), new nlobjSearchColumn("sourceaccount"), new nlobjSearchColumn("destinationaccount")];
        if (featureDep == true == featureDep == "T") {
            columns.push(new nlobjSearchColumn("department"));
        }
        if (featureCla == true == featureCla == "T") {
            columns.push(new nlobjSearchColumn("class"));
        }
        if (featureLoc == true == featureLoc == "T") {
            columns.push(new nlobjSearchColumn("location"));
        }

        var searchGlobalAccount = nlapiCreateSearch("globalaccountmapping", filters, columns);

        var results = searchGlobalAccount.runSearch().getResults(0, 1000);

        for (var i = 0; i < results.length; i++) {
            var sourceAccount = results[i].getValue("sourceaccount");
            sourceAccount = String(sourceAccount);
            var department = results[i].getValue("department") || "";
            var class_ = results[i].getValue("class") || "";
            var location = results[i].getValue("location") || "";

            var destinationAccount = results[i].getValue("destinationaccount");
            if (destinationAccount) {
                accountMappings.push({ sourceAccount: sourceAccount, destinationAccount: destinationAccount, department: department, "class": class_, location: location });
            }
        }
    }
    return accountMappings;
}



function getItemAccountMapping(transactionRecord, book, jsonAccounting, jsonCuentas) {
    var itemAccountMapping = [];

    var accountIds = [];

    for (var key in jsonAccounting) {
        for (var i = 0; i < jsonAccounting[key].length; i++) {
            var account = jsonAccounting[key][i].account;
            account = Number(account);
            if (account && accountIds.indexOf(account) == -1) {
                accountIds.push(account);
            }
        }
    }

    for (var key in jsonCuentas) {
        var debitAccount = jsonCuentas[key].debit;
        debitAccount = Number(debitAccount);
        var creditAccount = jsonCuentas[key].credit;
        creditAccount = Number(creditAccount);

        if (debitAccount && accountIds.indexOf(debitAccount) == -1) {
            accountIds.push(debitAccount);
        }
        if (creditAccount && accountIds.indexOf(creditAccount) == -1) {
            accountIds.push(creditAccount);
        }
    }

    if (accountIds.length) {
        var date = transactionRecord.getFieldValue("trandate");
        var filters = [
            ["sourceaccount", "anyof", accountIds], "AND",
            ["accountingbook", "anyof", book.getId()], "AND",
            ["effectivedate", "onorbefore", date], "AND",
            [
                ["enddate", "isempty", ""], "OR",
                [
                    ["enddate", "isnotempty", ""], "AND",
                    ["enddate", "onorafter", date]
                ]
            ]
        ]

        if (featureOW == true || featureOW == "T") {
            var subsidiary = transactionRecord.getFieldValue("subsidiary");
            filters.push("AND", ["subsidiary", "anyof", subsidiary]);
        }

        var columns = [new nlobjSearchColumn("internalid"), new nlobjSearchColumn("sourceaccount"), new nlobjSearchColumn("destinationaccount")];
        if (featureDep == true == featureDep == "T") {
            columns.push(new nlobjSearchColumn("department"));
        }
        if (featureCla == true == featureCla == "T") {
            columns.push(new nlobjSearchColumn("class"));
        }
        if (featureLoc == true == featureLoc == "T") {
            columns.push(new nlobjSearchColumn("location"));
        }
        var searchItemAccount = nlapiCreateSearch("itemaccountmapping", filters, columns);

        var results = searchItemAccount.runSearch().getResults(0, 1000);

        for (var i = 0; i < results.length; i++) {
            var sourceAccount = results[i].getValue("sourceaccount");
            sourceAccount = String(sourceAccount);
            var department = results[i].getValue("department") || "";
            var class_ = results[i].getValue("class") || "";
            var location = results[i].getValue("location") || "";

            var destinationAccount = results[i].getValue("destinationaccount");
            if (destinationAccount) {
                itemAccountMapping.push({ sourceAccount: sourceAccount, destinationAccount: destinationAccount, department: department, "class": class_, location: location });
            }
        }
    }
    return itemAccountMapping;
}


function validarAcentos(s) {
    var AccChars = "ŠŽšžŸÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïðñòóôõöùúûüýÿ&°–—ªº·";
    var RegChars = "SZszYAAAAAACEEEEIIIIDNOOOOOUUUUYaaaaaaceeeeiiiidnooooouuuuyyyo--ao.";

    s = s.toString();
    for (var c = 0; c < s.length; c++) {
        for (var special = 0; special < AccChars.length; special++) {
            if (s.charAt(c) == AccChars.charAt(special)) {
                s = s.substring(0, c) + RegChars.charAt(special) + s.substring(c + 1, s.length);
            }
        }
    }
    return s;
}

function round2(num) {
    var e = (num >= 0) ? 1e-6 : -1e-6;
    return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
}

function getAccountMappingByAccount(account, globalAccountMapping, itemAccountMapping, depLine, classLine, locationLine) {
    var results = globalAccountMapping.filter(function (mapping) {
        var sourceAccount = mapping.sourceAccount;
        var department = mapping.department || "";
        var class_ = mapping.class || "";
        var location = mapping.location || "";

        if (sourceAccount != account) {
            return false;
        }

        if ((featureDep == true || featureDep == "T") && department && department != depLine) {
            return false;
        }
        if ((featureCla == true || featureCla == "T") && class_ && class_ != classLine) {
            return false;
        }
        if ((featureLoc == true || featureLoc == "T") && location && location != locationLine) {
            return false;
        }

        return true;
    });

    if (results.length) {
        return results[0].destinationAccount;
    } else {
        results = itemAccountMapping.filter(function (mapping) {
            var sourceAccount = mapping.sourceAccount;
            var department = mapping.department || "";
            var class_ = mapping.class || "";
            var location = mapping.location || "";

            if (sourceAccount != account) {
                return false;
            }

            if ((featureDep == true || featureDep == "T") && department && department != depLine) {
                return false;
            }
            if ((featureCla == true || featureCla == "T") && class_ && class_ != classLine) {
                return false;
            }
            if ((featureLoc == true || featureLoc == "T") && location && location != locationLine) {
                return false;
            }

            return true;
        });
        if (results.length) {
            return results[0].destinationAccount;
        }
    }

    return account;
}


function transformToPrimaryBookAccount(accountId, globalAccountMappings, itemAccountMapping, depLine, classLine, locationLine) {

    var results = globalAccountMappings.filter(function (mapping) {
        var destinationAccount = mapping.destinationAccount;
        var department = mapping.department || "";
        var class_ = mapping.class || "";
        var location = mapping.location || "";

        if (accountId != destinationAccount) {
            return false;
        }

        if ((featureDep == true || featureDep == "T") && department && department != depLine) {
            return false;
        }
        if ((featureCla == true || featureCla == "T") && class_ && class_ != classLine) {
            return false;
        }
        if ((featureLoc == true || featureLoc == "T") && location && location != locationLine) {
            return false;
        }

        return true;
    });


    if (results.length) {
        return results[0].destinationAccount;
    } else {
        results = itemAccountMapping.filter(function (mapping) {
            var destinationAccount = mapping.destinationAccount;
            var department = mapping.department || "";
            var class_ = mapping.class || "";
            var location = mapping.location || "";

            if (accountId != destinationAccount) {
                return false;
            }

            if ((featureDep == true || featureDep == "T") && department && department != depLine) {
                return false;
            }
            if ((featureCla == true || featureCla == "T") && class_ && class_ != classLine) {
                return false;
            }
            if ((featureLoc == true || featureLoc == "T") && location && location != locationLine) {
                return false;
            }

            return true;
        });
        if (results.length) {
            return results[0].destinationAccount;
        }
    }

    return accountId;
}

function validatePluginNoPO(subsidiary){
    var accountFilters = [];
    var accountColumns = [];
    var processWithoutPO = false
    accountFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
    accountFilters[1] = new nlobjSearchFilter('custrecord_lmry_setuptax_subsidiary', null, 'is', subsidiary);
    
    accountColumns[0] = new nlobjSearchColumn('custrecord_lmry_setup_active_plugin_bill');
    var accountSearch = nlapiCreateSearch("customrecord_lmry_setup_tax_subsidiary", accountFilters, accountColumns);
    accountSearch = accountSearch.runSearch();
    var accountResults = accountSearch.getResults(0, 1);
    if (accountResults && accountResults.length > 0) {
        processWithoutPO = accountResults[0].getValue('custrecord_lmry_setup_active_plugin_bill');
    }
    return processWithoutPO === "T" || processWithoutPO === true;
}
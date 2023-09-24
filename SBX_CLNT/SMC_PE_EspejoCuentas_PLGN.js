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

        if (hasAccountMapping) {
            globalAccountMappings = getGlobalAccountMappings(transactionRecord, book, jsonAccounting, jsonCuentas);
            nlapiLogExecution("DEBUG", "globalAccountMappings", JSON.stringify(globalAccountMappings));
            itemAccountMapping = getItemAccountMapping(transactionRecord, book, jsonAccounting, jsonCuentas);
            nlapiLogExecution("DEBUG", "itemAccountMapping", JSON.stringify(itemAccountMapping));

        }

        var JsonItem = {};
        //se hace una busqueda para saber que articulos deberia de aparecer
        if (items.length && transactionRecord.getFieldValue('ordertype') == 'PurchOrd') {
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
                nlapiLogExecution("DEBUG", "serviceitemSearch", serviceitemSearch);
                for (var i = 0; serviceitemSearch != null && i < serviceitemSearch.length; i++) {
                    var searchresult = serviceitemSearch[i];
                    var id = searchresult.getValue('internalid')
                    if (!JsonItem[id]) JsonItem[id] = true;
                }
            }
        }

        //MANDATORY SEGMENTACION
        var mandatoryDepartment = nlapiGetContext().getPreference('DEPTMANDATORY');
        var mandatoryClass = nlapiGetContext().getPreference('CLASSMANDATORY');
        var mandatoryLocation = nlapiGetContext().getPreference('LOCMANDATORY');

        //nlapiLogExecution("ERROR","mandatorySegmentacion",mandatoryDepartment + "-" + mandatoryClass + "-" + mandatoryLocation);

        //CREADO DE LINEAS GL
        var currentBook = book.getId();
        nlapiLogExecution("DEBUG", "currentBook", currentBook);

        for (var key in jsonAccounting) {
            var trBook = key.split(";")[0];
            if (jsonAccounting[key].length && trBook && trBook == currentBook) {

                for (var j = 0; j < jsonAccounting[key].length; j++) {

                    if ((mandatoryDepartment == true || mandatoryDepartment == 'T') && (jsonAccounting[key][j]['department'] == '' || jsonAccounting[key][j]['department'] == null)) {
                        continue;
                    }

                    if ((mandatoryClass == true || mandatoryClass == 'T') && (jsonAccounting[key]['class'] == '' || jsonAccounting[key][j]['class'] == null)) {
                        continue;
                    }

                    if ((mandatoryLocation == true || mandatoryLocation == 'T') && (jsonAccounting[key][j]['location'] == '' || jsonAccounting[key][j]['location'] == null)) {
                        continue;
                    }

                    if (!jsonAccounting[key][j]['amount']) {
                        continue;
                    }
                    //se comprueba si existe el item de la linea en el json de articulos con el devengo activado
                    if (JsonItem[jsonAccounting[key][j]["item"]]) continue;


                    var primaryAccount = key.split(";")[1];
                    if (hasAccountMapping) {
                        primaryAccount = transformToPrimaryBookAccount(primaryAccount, globalAccountMappings, itemAccountMapping);
                    }

                    var accountKey = primaryAccount;
                    if (filterDepartment) {
                        accountKey = primaryAccount + ";" + jsonAccounting[key][j]['department'];
                    }

                    if (!jsonCuentas.hasOwnProperty(accountKey)) {
                        continue;
                    }

                    var newLineDebit = '', newLineCredit = '';

                    var debitAccount = jsonCuentas[accountKey].debit;
                    var creditAccount = jsonCuentas[accountKey].credit;

                    if (hasAccountMapping) {
                        debitAccount = globalAccountMappings[debitAccount] || itemAccountMapping[debitAccount] || debitAccount;
                        creditAccount = globalAccountMappings[creditAccount] || itemAccountMapping[creditAccount] || creditAccount;
                    }

                    if (!debitAccount && !creditAccount) {
                        continue;
                    }


                    if (jsonAccounting[key][j]['columna'] == 'debit') {
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

                    var amount = jsonAccounting[key][j]['amount'] || 0.00;
                    amount = parseFloat(amount);

                    if (amount <= 0.00) {
                        continue;
                    }

                    newLineDebit.setDebitAmount(parseFloat(amount));
                    newLineCredit.setCreditAmount(parseFloat(amount));

                    var customDepartment = jsonAccounting[key][j]['department'];
                    var customClass = jsonAccounting[key][j]['class'];
                    var customLocation = jsonAccounting[key][j]['location'];
                    var customMemo = jsonAccounting[key][j]['memo'];

                    if ((mandatoryDepartment == true || mandatoryDepartment == 'T') && !customDepartment) {
                        customDepartment = jsonCuentas[accountKey]['department'];
                    }

                    if ((mandatoryClass == true || mandatoryClass == 'T') && !customClass) {
                        customClass = jsonCuentas[accountKey]['class'];
                    }

                    if ((mandatoryLocation == true || mandatoryLocation == 'T') && !customLocation) {
                        customLocation = jsonCuentas[accountKey]['location'];
                    }

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

                    /*if(customMemo){
                      newLineDebit.setMemo(customMemo);
                      newLineCredit.setMemo(customMemo);
                    }*/


                }


            }
        }


    } catch (err) {
        nlapiLogExecution('Error', 'Error', err);
        sendemail(' [ customizeGlImpact ] ' + err, LMRY_script);
    }

}


function getAccountConfig(transactionRecord, jsonAccounting) {

    var accountIds = [];
    for (var key in jsonAccounting) {
        var account = key.split(";")[1];
        account = Number(account);
        if (account && accountIds.indexOf(account) == -1) {
            accountIds.push(account);
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
                    if (filterDepartment) {
                        var department = resultCuentas[i].getValue('custrecord_lmry_pe_espejo_department');
                        jsonCuentas[sourceAccount + ";" + department] = {
                            'debit': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_debitacc'), 'credit': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_creditacc'),
                            'department': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_department'), 'class': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_class'), 'location': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_location')
                        };
                    } else {
                        jsonCuentas[sourceAccount] = {
                            'debit': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_debitacc'), 'credit': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_creditacc'),
                            'department': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_department'), 'class': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_class'), 'location': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_location')
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
                    var cuenta = resultAccounting[i].getValue('account');
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
                        amount = resultAccounting[i].getValue('debitamount');
                        columna = 'debit';
                    } else {
                        amount = resultAccounting[i].getValue('creditamount');
                        columna = 'credit';
                    }

                    if (filterDepartment) {
                        if (departmentLinea) {
                            if (jsonAccounting[libro + ";" + cuenta + ";" + departmentLinea] == null || jsonAccounting[libro + ";" + cuenta + ";" + departmentLinea] == undefined) {
                                jsonAccounting[libro + ";" + cuenta + ";" + departmentLinea] = [];
                            }

                            jsonAccounting[libro + ";" + cuenta + ";" + departmentLinea].push({ 'columna': columna, 'amount': amount, 'department': departmentLinea, 'class': classLinea, 'location': locationLinea, 'memo': memoLinea, 'item': item });
                            //var contador = Object.keys(jsonAccounting[libro + ";" + cuenta]).length;

                        } else {
                            if (jsonAccounting[libro + ";" + cuenta + ";"] == null || jsonAccounting[libro + ";" + cuenta + ";"] == undefined) {
                                jsonAccounting[libro + ";" + cuenta + ";"] = [];
                            }
                            jsonAccounting[libro + ";" + cuenta + ";"].push({ 'columna': columna, 'amount': amount, 'department': departmentLinea, 'class': classLinea, 'location': locationLinea, 'memo': memoLinea, 'item': item });
                        }
                    } else {
                        if (jsonAccounting[libro + ";" + cuenta] == null || jsonAccounting[libro + ";" + cuenta] == undefined) {
                            jsonAccounting[libro + ";" + cuenta] = [];
                        }

                        jsonAccounting[libro + ";" + cuenta].push({ 'columna': columna, 'amount': amount, 'department': departmentLinea, 'class': classLinea, 'location': locationLinea, 'memo': memoLinea, 'item': item });
                        //var contador = Object.keys(jsonAccounting[libro + ";" + cuenta]).length;
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
                    var cuenta = resultTran[i].getValue('account');
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
                        amount = resultTran[i].getValue('debitamount');
                        columna = 'debit';
                    } else {
                        amount = resultTran[i].getValue('creditamount');
                        columna = 'credit';
                    }
                    var item = "";
                    if (type == 'vendorbill') {
                        item = resultTran[i].getValue('item');

                    }
                    if (filterDepartment) {
                        if (departmentLinea) {
                            if (jsonAccounting[1 + ";" + cuenta + ";" + departmentLinea] == null || jsonAccounting[1 + ";" + cuenta + ";" + departmentLinea] == undefined) {
                                jsonAccounting[1 + ";" + cuenta + ";" + departmentLinea] = [];
                            }

                            jsonAccounting[1 + ";" + cuenta + ";" + departmentLinea].push({ 'columna': columna, 'amount': amount, 'department': departmentLinea, 'class': classLinea, 'location': locationLinea, 'memo': memoLinea, 'item': item });
                            //var contador = Object.keys(jsonAccounting[libro + ";" + cuenta]).length;

                        } else {
                            if (jsonAccounting[1 + ";" + cuenta + ";"] == null || jsonAccounting[1 + ";" + cuenta + ";"] == undefined) {
                                jsonAccounting[1 + ";" + cuenta + ";"] = [];
                            }
                            jsonAccounting[1 + ";" + cuenta + ";"].push({ 'columna': columna, 'amount': amount, 'department': departmentLinea, 'class': classLinea, 'location': locationLinea, 'memo': memoLinea, 'item': item });

                        }
                    } else {

                        if (jsonAccounting[1 + ";" + cuenta] == null || jsonAccounting[1 + ";" + cuenta] == undefined) {
                            jsonAccounting[1 + ";" + cuenta] = [];
                        }

                        jsonAccounting[1 + ";" + cuenta].push({ 'columna': columna, 'amount': amount, 'department': departmentLinea, 'class': classLinea, 'location': locationLinea, 'memo': memoLinea, 'item': item });
                        //var contador = Object.keys(jsonAccounting[libro + ";" + cuenta]).length;
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


    return jsonAccounting;
}


function getItems(transactionRecord) {
    var items = [];
    var numItems = transactionRecord.getLineItemCount({
        sublistId: 'item'
    });

    for (var i = 0; i < numItems; i++) {
        var item = transactionRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }) || "";
        item = Number(item);
        if (item && items.indexOf(item) == -1) {
            items.push(item);
        }
    }

    return items;
}


function getGlobalAccountMappings(transactionRecord, book, jsonAccounting, jsonCuentas) {
    var accountMappings = {};

    for (var key in jsonAccounting) {
        var account = key.split(";")[1];
        if (account && !accountMappings.hasOwnProperty(account)) {
            accountMappings[account] = account;
        }
    }

    for (var key in jsonCuentas) {
        var debitAccount = jsonCuentas[key].debit;
        var creditAccount = jsonCuentas[key].credit;
        if (debitAccount && !accountMappings.hasOwnProperty(debitAccount)) {
            accountMappings[debitAccount] = debitAccount;
        }
        if (creditAccount && !accountMappings.hasOwnProperty(creditAccount)) {
            accountMappings[creditAccount] = creditAccount;
        }
    }

    var accountIds = Object.keys(accountMappings);
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
        var searchGlobalAccount = nlapiCreateSearch("globalaccountmapping", filters, columns);

        var results = searchGlobalAccount.runSearch().getResults(0, 1000);

        for (var i = 0; i < results.length; i++) {
            var sourceAccount = results[i].getValue("sourceaccount");
            sourceAccount = String(sourceAccount);
            var destinationAccount = results[i].getValue("destinationaccount");
            if (accountMappings.hasOwnProperty(sourceAccount) && destinationAccount) {
                accountMappings[sourceAccount] = destinationAccount;
            }
        }
    }
    return accountMappings;
}



function getItemAccountMapping(transactionRecord, book, jsonAccounting, jsonCuentas) {
    var itemAccountMapping = {};

    for (var key in jsonAccounting) {
        var account = key.split(";")[1];
        if (account && !itemAccountMapping.hasOwnProperty(account)) {
            itemAccountMapping[account] = account;
        }
    }

    for (var key in jsonCuentas) {
        var debitAccount = jsonCuentas[key].debit;
        var creditAccount = jsonCuentas[key].credit;
        if (debitAccount && !itemAccountMapping.hasOwnProperty(debitAccount)) {
            itemAccountMapping[debitAccount] = debitAccount;
        }
        if (creditAccount && !itemAccountMapping.hasOwnProperty(creditAccount)) {
            itemAccountMapping[creditAccount] = creditAccount;
        }
    }

    var accountIds = Object.keys(itemAccountMapping);
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
        var searchItemAccount = nlapiCreateSearch("itemaccountmapping", filters, columns);

        var results = searchItemAccount.runSearch().getResults(0, 1000);

        for (var i = 0; i < results.length; i++) {
            var sourceAccount = results[i].getValue("sourceaccount");
            sourceAccount = String(sourceAccount);
            var destinationAccount = results[i].getValue("destinationaccount");
            if (itemAccountMapping.hasOwnProperty(sourceAccount) && destinationAccount) {
                itemAccountMapping[sourceAccount] = destinationAccount;
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


function getExchangeRateByBook(transactionRecord, book) {
    var exchangeRateBook = transactionRecord.getFieldValue("exchangerate");
    var type = transactionRecord.getRecordType();
    type = type.toLowerCase();
    if (type == "expensereport") {
        exchangeRateBook = transactionRecord.getFieldValue("expensereportexchangerate");
    }

    if (!exchangeRateBook) {
        exchangeRateBook = nlapiLookupField(type, 37240377, ["exchangerate"]).exchangerate
    }


    if ((featureMB == true || featureMB == "T") && !book.isPrimary()) {
        var bookId = book.getId();
        for (var i = 1; i <= transactionRecord.getLineItemCount('accountingbookdetail'); i++) {
            if (bookId == transactionRecord.getLineItemValue('accountingbookdetail', 'bookid', i)) {
                exchangeRateBook = transactionRecord.getLineItemValue('accountingbookdetail', 'exchangerate', i);
                break;
            }
        }
    }
    return exchangeRateBook;
}



function round2(num) {
    var e = (num >= 0) ? 1e-6 : -1e-6;
    return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
}


function transformToPrimaryBookAccount(accountId, globalAccountMappings, itemAccountMapping) {

    for (var key in globalAccountMappings) {
        if (globalAccountMappings[key] == accountId && key != accountId) {
            return key;
        }
    }

    for (var key in itemAccountMapping) {
        if (itemAccountMapping[key] == accountId && key != accountId) {
            return key;
        }
    }
    
    return accountId;
}
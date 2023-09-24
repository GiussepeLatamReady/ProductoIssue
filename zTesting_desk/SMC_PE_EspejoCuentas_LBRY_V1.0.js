/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       13 May 2020     LatamReady
 * File : LMRY_PE_EspejoCuentas_LBRY_V1.0.js
 */
 var objContext = nlapiGetContext();

 var LMRY_script = 'LatamReady - PE Espejo Cuentas 6-9 LBRY V1';
 var featureMB = objContext.getFeature('MULTIBOOK');
 var featureOW = objContext.getFeature('SUBSIDIARIES');
 var featureDep = objContext.getSetting('FEATURE', 'DEPARTMENTS');
 var featureCla = objContext.getSetting('FEATURE', 'CLASSES');
 var featureLoc = objContext.getSetting('FEATURE', 'LOCATIONS');
 
 
 function customizeGlImpactEspejo69(transactionRecord, standardLines, customLines, book, accounts69Array, globalAccountMappings, itemAccountMapping) {
 
     try {
         var FEAT_MAPPING = objContext.getFeature('coaclassificationmanagement');
         var hasAccountMapping = !book.isPrimary() && (FEAT_ACC_MAPPING == true || FEAT_ACC_MAPPING == "T");

         if (featureOW) {
             var country = transactionRecord.getFieldText("custbody_lmry_subsidiary_country");
         } else {
             //load Netsuite configuration page
             var companyInfo = nlapiLoadConfiguration('companyinformation');
 
             //get field values
             var country = companyInfo.getFieldText('country');
         }
         country = validarAcentos(country);
         country = country.substring(0, 3).toUpperCase();
 
         var type = transactionRecord.getRecordType();
         type = type.toLowerCase();
 
         var subsidiaria = transactionRecord.getFieldValue('subsidiary');
         var licenses = getLicenses(subsidiaria);
         var typeTransaction = ['vendorbill', 'journalentry', 'customerpayment', 
         'expensereport', 'check', 'deposit', 'vendorcredit', 
         'itemreceipt', 'itemfulfillment'];
 
         nlapiLogExecution('DEBUG','Feature',getAuthorization(500,licenses));
 
         if (getAuthorization(500, licenses) == false || country != 'PER' || typeTransaction.indexOf(type) == -1) {
             return true;
         }
 
         // SOLO PARA JOURNAL
         if (type == 'journalentry') {
             var cargaInicial = transactionRecord.getFieldValue('custbody_lmry_carga_inicial');
             if (cargaInicial == true || cargaInicial == 'T') {
                 return true;
             }
         }
 
         var allAccount = [];
         for (var i = 0; i < accounts69Array.length; i++) {
             if (allAccount.indexOf(accounts69Array[i].account) == -1) {
                 allAccount.push(accounts69Array[i].account);
             }
         }
         var jsonCuentas = {};
         var jsonAccounting = {};
 
         var filtrosCuentas = [];
         filtrosCuentas[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
         filtrosCuentas[1] = new nlobjSearchFilter('custrecord_lmry_pe_espejo_subsidiary', null, 'is', subsidiaria);
         if (allAccount.length) filtrosCuentas[2] = new nlobjSearchFilter('custrecord_lmry_pe_espejo_sourceacc', null, 'anyof', allAccount);
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
         var resultCuentas = searchCuentas.runSearch().getResults(0, 1000);
 
         if (resultCuentas != null && resultCuentas.length > 0) {
             for (var i = 0; i < resultCuentas.length; i++) {
                 var sourceAccount = resultCuentas[i].getValue('custrecord_lmry_pe_espejo_sourceacc');
                 jsonCuentas[sourceAccount] = {
                     'debit': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_debitacc'), 'credit': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_creditacc'),
                     'department': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_department'), 'class': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_class'), 'location': resultCuentas[i].getValue('custrecord_lmry_pe_espejo_location')
                 };
             }
 
         } else {
             return true;
         }
 
         //nlapiLogExecution('ERROR','jsonCuentas',JSON.stringify(jsonCuentas));
         if (featureMB == true || featureMB == 'T') {
             //BUSQUEDA POR INTERFAZ: MULTIBOOKING
             for (var i = 0; i < accounts69Array.length; i++){
                var cuenta = accounts69Array[i].account
                var libro = accounts69Array[i].book
                var columna = accounts69Array[i].columna
                var amount = accounts69Array[i].amount
                var departmentLinea = accounts69Array[i].department
                var classLinea = accounts69Array[i].class
                var locationLinea = accounts69Array[i].location
                var memoLinea = accounts69Array[i].memo

                if (jsonCuentas[cuenta] != null && jsonCuentas[cuenta] != undefined) {
                    if (jsonAccounting[libro + ";" + cuenta] == null || jsonAccounting[libro + ";" + cuenta] == undefined) {
                        jsonAccounting[libro + ";" + cuenta] = [];
                    }

                    jsonAccounting[libro + ";" + cuenta].push({ 'columna': columna, 
                    'amount': amount, 
                    'department': jsonCuentas[cuenta]['department'] || departmentLinea || "", 
                    'class': jsonCuentas[cuenta]['class'] || classLinea || "", 
                    'location': jsonCuentas[cuenta]['location'] || locationLinea || "", 'memo': memoLinea });
                    //var contador = Object.keys(jsonAccounting[libro + ";" + cuenta]).length;
                }
            }
         } else {
            for (var i = 0; i < accounts69Array.length; i++){
                var cuenta = accounts69Array[i].account
                var columna = accounts69Array[i].columna
                var amount = accounts69Array[i].amount
                var departmentLinea = accounts69Array[i].department
                var classLinea = accounts69Array[i].class
                var locationLinea = accounts69Array[i].location
                var memoLinea = accounts69Array[i].memo

                if (jsonCuentas[cuenta] != null && jsonCuentas[cuenta] != undefined) {
                    if (jsonAccounting[1 + ";" + cuenta] == null || jsonAccounting[1 + ";" + cuenta] == undefined) {
                        jsonAccounting[1 + ";" + cuenta] = [];
                    }

                    jsonAccounting[1 + ";" + cuenta].push({ 'columna': columna, 
                    'amount': amount, 
                    'department': jsonCuentas[cuenta]['department'] || departmentLinea || "", 
                    'class': jsonCuentas[cuenta]['class'] || classLinea || "", 
                    'location': jsonCuentas[cuenta]['location'] || locationLinea || "", 'memo': memoLinea });
                    //var contador = Object.keys(jsonAccounting[libro + ";" + cuenta]).length;
                }
            }
                     
         }
 
 
         nlapiLogExecution("DEBUG","jsonAccounting",JSON.stringify(jsonAccounting));
 
         //MANDATORY SEGMENTACION
         var currentBook = book.getId();
         var mandatoryDepartment = nlapiGetContext().getPreference('DEPTMANDATORY');
         var mandatoryClass = nlapiGetContext().getPreference('CLASSMANDATORY');
         var mandatoryLocation = nlapiGetContext().getPreference('LOCMANDATORY');
 
         //nlapiLogExecution("ERROR","mandatorySegmentacion",mandatoryDepartment + "-" + mandatoryClass + "-" + mandatoryLocation);
 
         //CREADO DE LINEAS GL
         nlapiLogExecution("DEBUG","jsonCuentas",JSON.stringify(jsonCuentas));
         for (var i in jsonCuentas) {
             if (jsonAccounting[currentBook + ";" + i] != null && jsonAccounting[currentBook + ";" + i] != undefined) {
 
                 for (var j = 0; j < jsonAccounting[currentBook + ";" + i].length; j++) {
 
                     if ((mandatoryDepartment == true || mandatoryDepartment == 'T') && (jsonAccounting[currentBook + ";" + i][j]['department'] == '' || jsonAccounting[currentBook + ";" + i][j]['department'] == null) && (jsonCuentas[i]['department'] == '' || jsonCuentas[i]['department'] == null)) {
                         continue;
                     }
 
                     if ((mandatoryClass == true || mandatoryClass == 'T') && (jsonAccounting[currentBook + ";" + i][j]['class'] == '' || jsonAccounting[currentBook + ";" + i][j]['class'] == null) && (jsonCuentas[i]['class'] == '' || jsonCuentas[i]['class'] == null)) {
                         continue;
                     }
 
                     if ((mandatoryLocation == true || mandatoryLocation == 'T') && (jsonAccounting[currentBook + ";" + i][j]['location'] == '' || jsonAccounting[currentBook + ";" + i][j]['location'] == null) && (jsonCuentas[i]['location'] == '' || jsonCuentas[i]['location'] == null)) {
                         continue;
                     }
 
                     if (!jsonAccounting[currentBook + ";" + i][j]['amount']) {
                         continue;
                     }

                    var primaryAccount = j.split(";")[1];
                    if (hasAccountMapping) {
                        primaryAccount = transformToPrimaryBookAccount(primaryAccount, globalAccountMappings, itemAccountMapping);
                    }
                    var accountKey = primaryAccount;

                    var debitAccount = jsonCuentas[accountKey].debit;
                    var creditAccount = jsonCuentas[accountKey].credit;

                    if (hasAccountMapping) {
                        debitAccount = globalAccountMappings[debitAccount] || itemAccountMapping[debitAccount] || debitAccount;
                        creditAccount = globalAccountMappings[creditAccount] || itemAccountMapping[creditAccount] || creditAccount;
                    }
 
                     var newLineDebit = '', newLineCredit = '';
 
                     if (jsonAccounting[currentBook + ";" + i][j]['columna'] == 'debit') {
                         newLineDebit = customLines.addNewLine();
                         newLineCredit = customLines.addNewLine();
 
                         newLineDebit.setAccountId(parseFloat(debitAccount));
                         newLineCredit.setAccountId(parseFloat(creditAccount));
                     } else {
                         newLineCredit = customLines.addNewLine();
                         newLineDebit = customLines.addNewLine();
 
                         newLineCredit.setAccountId(parseFloat(jsonCuentas[i]['debit']));
                         newLineDebit.setAccountId(parseFloat(jsonCuentas[i]['credit']));
                     }
 
                     newLineDebit.setDebitAmount(parseFloat(jsonAccounting[currentBook + ";" + i][j]['amount']));
                     newLineCredit.setCreditAmount(parseFloat(jsonAccounting[currentBook + ";" + i][j]['amount']));
 
                     var customDepartment = jsonAccounting[currentBook + ";" + i][j]['department'];
                     var customClass = jsonAccounting[currentBook + ";" + i][j]['class'];
                     var customLocation = jsonAccounting[currentBook + ";" + i][j]['location'];
                     var customMemo = jsonAccounting[currentBook + ";" + i][j]['memo'];
 
                     if ((mandatoryDepartment == true || mandatoryDepartment == 'T') && !customDepartment) {
                         customDepartment = jsonCuentas[i]['department'];
                     }
 
                     if ((mandatoryClass == true || mandatoryClass == 'T') && !customClass) {
                         customClass = jsonCuentas[i]['class'];
                     }
 
                     if ((mandatoryLocation == true || mandatoryLocation == 'T') && !customLocation) {
                         customLocation = jsonCuentas[i]['location'];
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
 
                     if(customMemo){
                       newLineDebit.setMemo(customMemo);
                       newLineCredit.setMemo(customMemo);
                     }
 
                 }
 
 
             }
         }
 
         var usageRemaining = objContext.getRemainingUsage();
         nlapiLogExecution("DEBUG", "Uso de memoria", usageRemaining);
 
     } catch (err) {
         nlapiLogExecution('Error', 'Error', err);
         sendemail(' [ customizeGlImpact ] ' + err, LMRY_script);
     }
 
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

 function transformToPrimaryBookAccount(accountId, globalAccountMappings, itemAccountMapping) {

    for (var key in globalAccountMappings) {
        if (globalAccountMappings[key].destination == accountId && key != accountId) {
            return key;
        }
    }

    for (var key in itemAccountMapping) {
        if (itemAccountMapping[key].destination == accountId && key != accountId) {
            return key;
        }
    }
    
    return accountId;
}
 
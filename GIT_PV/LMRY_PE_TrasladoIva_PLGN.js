/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_PE_TrasladoIva_PLGN.js                      ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  1.0     Dic 30 2019  LatamReady    Use Script 1.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

var objContext = nlapiGetContext();
var LMRY_script = 'LatamReady - PE Traslado IVA PLGN';
var lmryTypeTransaction = '';
var lmryIdTransaction = '';
var lmrySubsidiaryId = '';
var fechaTransaction = new Date();
var currencyTran = '';
var featuresubs = '';
var featuremultibook = '';
var entityID = '';
var approved = '';
var accountIVA = 0;
var Json_GMA = {};

var featureDep = '';
var featureLoc = '';
var featureCla = '';

function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    try {
        //Obteniendo features de localizacion
        featureDep = nlapiGetContext().getSetting('FEATURE', 'DEPARTMENTS');
        featureLoc = nlapiGetContext().getSetting('FEATURE', 'LOCATIONS');
        featureCla = nlapiGetContext().getSetting('FEATURE', 'CLASSES');
        //Obteniendo valor del tipo de transaccion
        lmryTypeTransaction = transactionRecord.getRecordType();
        lmryIdTransaction = transactionRecord.getId();
        lmryTypeTransaction = lmryTypeTransaction.toLocaleUpperCase();
        fechaTransaction = transactionRecord.getFieldValue("trandate");
        entityID = transactionRecord.getFieldValue("entity");
        currencyTran = transactionRecord.getFieldValue("currency");

        approved = transactionRecord.getFieldValue("approvalstatus");
        if (approved != 2 && approved != null && approved != '' && approved != ' ') {
            return true;
        }

        conceptoDetraccion = transactionRecord.getFieldValue("custbody_lmry_concepto_detraccion");
        nlapiLogExecution('ERROR', 'conceptoDetraccion', conceptoDetraccion);
        if (conceptoDetraccion != 12 && conceptoDetraccion != null && conceptoDetraccion != '' && conceptoDetraccion != ' ') {
            return true;
        }

        featuresubs = nlapiGetContext().getFeature('SUBSIDIARIES');
        featuremultibook = nlapiGetContext().getFeature('MULTIBOOK');

        if (featuresubs == 'T' || featuresubs == true) {
            lmrySubsidiaryId = transactionRecord.getFieldValue('subsidiary');
            var licenses = getLicenses(lmrySubsidiaryId);
            var featureActive = getAuthorization(503, licenses);

            if (!featureActive) {
                return true;
            }

        }

        // Busqueda Cuenta IVA
        var filtros_setup = new Array();
        filtros_setup[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
        if (featuresubs == 'T' || featuresubs == true) {
            filtros_setup[1] = new nlobjSearchFilter('custrecord_lmry_setuptax_subsidiary', null, 'is', lmrySubsidiaryId);
        }
        var columnas_setup = new Array();
        columnas_setup[0] = new nlobjSearchColumn("custrecord_lmry_setuptax_pe_vat_account");

        var search_setup = nlapiCreateSearch('customrecord_lmry_setup_tax_subsidiary', filtros_setup, columnas_setup);
        var result_setup = search_setup.runSearch().getResults(0, 1000);
        if (result_setup != null && result_setup.length > 0) {
            accountIVA = result_setup[0].getValue('custrecord_lmry_setuptax_pe_vat_account');
        }

        if (accountIVA == 0) {
            return true;
        }

        //Obtiene Tipo de Cambio
        var exchange = 1;
        var lineas = transactionRecord.getLineItemCount('accountingbookdetail');
        for (var i = 0; i < lineas; i++) {

            var idbook = transactionRecord.getLineItemValue('accountingbookdetail', 'accountingbook', i + 1);
            if (book.getId() == idbook) {
                exchange = transactionRecord.getLineItemValue('accountingbookdetail', 'exchangerate', i + 1);
                /*if (transactionRecord.getLineItemValue('accountingbookdetail', 'currency', i + 1) == currencyTran) {
                    swCurr = true;
                }*/
            }
        }
        if (book.isPrimary()) {
            exchange = transactionRecord.getFieldValue('exchangerate');
        }


        //Busqueda de Cuentas CL Impact
        /*var transactionSearch = nlapiSearchRecord("transaction",null,
            [
                ["mainline","is","F"],
                "AND", 
                ["taxline","is","T"]
            ], 
            [
                new nlobjSearchColumn("account"), 
                new nlobjSearchColumn("debitfxamount"), 
                new nlobjSearchColumn("entity"), 
                new nlobjSearchColumn("department"), 
                new nlobjSearchColumn("class"), 
                new nlobjSearchColumn("location")
            ]
        );*/
        var search_account = nlapiLoadSearch('vendorbill', 'customsearch_lmry_pe_traslado_iva');
        search_account.addFilter(new nlobjSearchFilter('internalid', null, 'is', lmryIdTransaction));
        var result_account = search_account.runSearch().getResults(0, 1000);

        //Json con los Datos del GL Impact
        var JsonData = [];
        for (var i = 0; i < result_account.length; i++) {

            //Lineas del Invoice
            JsonData.push({
                'account': result_account[i].getValue('account'),
                'debitamount': result_account[i].getValue('debitfxamount'),
                'entity': result_account[i].getValue('entity'),
            });
            if (featureDep == 'T' || featureDep == true) {
                JsonData[i]['department'] = result_account[i].getValue('department');
            }
            if (featureCla == 'T' || featureCla == true) {
                JsonData[i]['class'] = result_account[i].getValue('class');
            }
            if (featureLoc == 'T' || featureLoc == true) {
                JsonData[i]['location'] = result_account[i].getValue('location');
            }

        }

        //Obtiene el Global Account Mapping
        if (featuremultibook) {
            obtainsAccounts(book.getId());
        }

        //Recorrido de los datos del Json con los datos del GL Impact
        for (var i = 0; i < JsonData.length; i++) {
            var accountTC = JsonData[i].account;
            var depTC = JsonData[i].department;
            var claTC = JsonData[i].class;
            var locTC = JsonData[i].location;

            var amountIVA = parseFloat(JsonData[i].debitamount);
            //var entity = JsonData[i].entity;

            //Valida Global Account Mapping
            if (featuremultibook) {
                accountTC = getAccount(accountTC, depTC, claTC, locTC);
                accountIVA = getAccount(accountIVA, depTC, claTC, locTC);
            }
            //if (!swCurr) {
            amountIVA *= exchange;
            //}
            amountIVA = parseFloat(Math.round(amountIVA * 100)) / 100;

            if (!amountIVA) {
                continue;
            }

            //Creación de líneas en el GL Impact
            var newLine1 = customLines.addNewLine();
            newLine1.setAccountId(parseInt(accountTC));
            newLine1.setCreditAmount(amountIVA);
            newLine1.setMemo('Traslado de IVA');
            if (depTC) {
                newLine1.setDepartmentId(parseInt(depTC));
            }
            if (claTC) {
                newLine1.setClassId(parseInt(claTC));
            }
            if (locTC) {
                newLine1.setLocationId(parseInt(locTC));
            }
            /*if (entity) {
                newLine1.setEntityId(parseInt(entity));
            }*/

            //Creación de líneas en el GL Impact
            var newLine2 = customLines.addNewLine();
            newLine2.setAccountId(parseInt(accountIVA));
            newLine2.setDebitAmount(amountIVA);
            newLine2.setMemo('Traslado de IVA');
            if (depTC) {
                newLine2.setDepartmentId(parseInt(depTC));
            }
            if (claTC) {
                newLine2.setClassId(parseInt(claTC));
            }
            if (locTC) {
                newLine2.setLocationId(parseInt(locTC));
            }
            /*if (entity) {
                newLine2.setEntityId(parseInt(entity));
            }*/
        }
    } catch (err) {
        nlapiLogExecution('ERROR', 'ERROR', err);
    }
}

function obtainsAccounts(currentBook) {
    try {
        var filtros_gam = new Array();
        filtros_gam[0] = new nlobjSearchFilter('effectivedate', null, 'onorbefore', fechaTransaction);
        filtros_gam[1] = new nlobjSearchFilter('accountingbook', null, 'is', currentBook);
        if (featuresubs) {
            filtros_gam[2] = new nlobjSearchFilter('subsidiary', null, 'anyof', lmrySubsidiaryId);
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
        
    } catch (err) {
        nlapiLogExecution('ERROR', 'getCuenta', err);
        throw ' [ getCuenta ] ' + err;
    }
}

function getAccount(cuentaSource, dep, cla, loc) {
    try {
        for (line in Json_GMA) {
            if (line == cuentaSource) {
                nlapiLogExecution('ERROR', 'Json_GMA['+line+']', JSON.stringify(Json_GMA[line]));
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
                    if (yyymmdd(fechaTransaction) <= yyymmdd(fechafin)) {
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
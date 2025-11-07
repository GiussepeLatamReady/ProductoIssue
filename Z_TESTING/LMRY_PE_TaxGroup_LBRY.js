/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 * @Name LMRY_PE_TaxGroup_LBRY.js
 * @Author piero.flores@latamready.com
 */
define(['N/record', 'N/runtime', 'N/log', 'N/search', 'N/currency'], function (record, runtime, log, search, currency) {

    function getNationalCurrency(recordForeign) {
        var cambio = 1;

        try {
            var subsidiaryID = recordForeign.getValue('subsidiary');
            var accBookList = recordForeign.getLineCount({ sublistId: 'accountingbookdetail' });
            var currentExchange = Number(recordForeign.getValue('expensereportexchangerate')) || 1;
            var currencyTransactionId = recordForeign.getValue('expensereportcurrency'); // internalid de currency
            var tranDate = recordForeign.getValue('trandate'); // suele ser Date ya

            // 1) Buscar moneda nacional desde customrecord
            var nationalCurrencyId = null;
            var setupRs = search.create({
                type: 'customrecord_lmry_setup_tax_subsidiary',
                filters: [
                    ['custrecord_lmry_setuptax_subsidiary', 'anyof', subsidiaryID], 'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['custrecord_lmry_setuptax_currency']
            }).run().getRange({ start: 0, end: 1 });

            if (setupRs && setupRs.length > 0) {
                nationalCurrencyId = setupRs[0].getValue('custrecord_lmry_setuptax_currency'); // internalid de currency
            }

            if (!nationalCurrencyId || !currencyTransactionId || currencyTransactionId === nationalCurrencyId) {
                return cambio; // igual a 1 o al exchangerate de cabecera si prefieres
            }

            // 2) Determinar si Subsidiary currency = national
            var subCurObj = search.lookupFields({
                type: 'subsidiary',
                id: subsidiaryID,
                columns: ['currency']
            });

            var subsidiaryCurrencyId = null;
            if (subCurObj && (subCurObj.currency).length) {
                subsidiaryCurrencyId = subCurObj.currency[0].value;
            }

            var isMultibookingEnabled = runtime.isFeatureInEffect({ feature: 'MULTIBOOK' });

            if (subsidiaryCurrencyId && String(subsidiaryCurrencyId) === String(nationalCurrencyId)) {
                // Si la moneda de la subsidiaria ya es la nacional, usa el tipo de cambio de cabecera
                cambio = currentExchange;
                return cambio;
            }

            if (isMultibookingEnabled) {
                var found = false;
                for (var i = 0; i < accBookList; i++) {
                    var bookCurrencyId = recordForeign.getSublistValue({
                        sublistId: 'accountingbookdetail',
                        fieldId: 'currency',
                        line: i
                    });
                    if (String(bookCurrencyId) === String(nationalCurrencyId)) {
                        var exchangeValue = Number(recordForeign.getSublistValue({
                            sublistId: 'accountingbookdetail',
                            fieldId: 'exchangerate',
                            line: i
                        })) || currentExchange;
                        cambio = exchangeValue;
                        found = true;
                        break;
                    }
                }
                if (!found) cambio = currentExchange;
            } else {
                // Usar N/currency.exchangeRate con códigos correctos
                var src = search.lookupFields({
                    type: 'currency',
                    id: currencyTransactionId,
                    columns: ['currencycode', 'symbol']
                });
                var tgt = search.lookupFields({
                    type: 'currency',
                    id: nationalCurrencyId,
                    columns: ['currencycode', 'symbol']
                });

                var sourceCode = (src && (src.currencycode || src.symbol)) || 'USD';
                var targetCode = (tgt && (tgt.currencycode || tgt.symbol)) || 'PEN';

                var rate = currency.exchangeRate({
                    source: String(sourceCode),
                    target: String(targetCode),
                    date: tranDate instanceof Date ? tranDate : new Date(tranDate)
                });

                cambio = Number(rate) || currentExchange;
            }

        } catch (e) {
            log.error('getNationalCurrency error', e);
        }

        return cambio;
    }

    function getTaxGroups() {
        var taxGroups = {};

        var filtersVat = [
            ['isinactive', 'is', 'F'], 'AND',
            ['country', 'anyof', 'PE']
        ];

        var searchIndCode = search.create({
            type: 'salestaxitem',
            filters: filtersVat,
            columns: ['taxtype', 'internalid']
        });

        var index = {};

        searchIndCode.run().each(function (r) {
            var id = r.getValue({ name: 'internalid' });
            var typeVal = r.getValue({ name: 'taxtype' });
            index[id] = typeVal;
            return true;
        });

        var paged = search.create({
            type: 'taxgroup',
            filters: filtersVat,
            columns: ['internalid']
        }).runPaged({ pageSize: 1000 });

        paged.pageRanges.forEach(function (r) {
            var page = paged.fetch({ index: r.index });
            page.data.forEach(function (result) {
                var id = result.getValue('internalid');
                if (!id) return;

                taxGroups[id] = {};

                // Cargar el taxgroup y leer su sublista de tax items
                var tg = record.load({ type: 'taxgroup', id: id });

                var lines = tg.getLineCount({ sublistId: 'taxitem' });
                for (var i = 0; i < lines; i++) {
                    // NOTA: ajusta estos fieldIds según tu cuenta si difieren
                    var basis = Number(tg.getSublistValue({ sublistId: 'taxitem', fieldId: 'basis', line: i })) || 0;
                    var rate = Number(tg.getSublistValue({ sublistId: 'taxitem', fieldId: 'rate', line: i })) || 0;
                    var taxItemId = tg.getSublistValue({ sublistId: 'taxitem', fieldId: 'taxitem', line: i });
                    var taxName = tg.getSublistValue({ sublistId: 'taxitem', fieldId: 'taxname', line: i }) || '';
                    var taxType = tg.getSublistValue({ sublistId: 'taxitem', fieldId: 'taxtype', line: i }) || '';

                    if (!taxItemId) {
                        // intenta con posibles variantes si tu cuenta usa otros ids
                        taxItemId = tg.getSublistValue({ sublistId: 'taxitem', fieldId: 'taxitemnkey', line: i }) ||
                            tg.getSublistValue({ sublistId: 'taxitem', fieldId: 'taxcode', line: i });
                    }

                    taxGroups[id][taxItemId] = {
                        basis: basis,
                        rate: rate,
                        name: [taxType, taxName].join(':'),
                        taxtype: index[taxItemId]
                    };
                }
            });
        });

        return taxGroups;
    }

    function getTransactionLine(transactionId) {
        var transactionLines = [];
        search.create({
            type: "transaction",
            settings: [{ "name": "consolidationtype", "value": "NONE" }, { "name": "includeperiodendtransactions", "value": "F" }],
            filters:
                [
                    ["internalid", "anyof", transactionId],
                    "AND",
                    ["taxline", "is", "F"],
                    "AND",
                    ["mainline", "is", "F"],
                    "AND",
                    ["taxitem", "noneof", "@NONE@"]
                ],
            columns:
                [
                    search.createColumn({ name: "lineuniquekey", label: "Line Unique Key" }),
                    search.createColumn({
                        name: "internalid",
                        join: "taxItem",
                        label: "Internal ID"
                    }),
                    search.createColumn({ name: "custcol_nondeductible_account", label: "Expense Account" }),
                    search.createColumn({ name: "amount", label: "Amount" })
                ]
        }).run().each(function (result) {
            transactionLines.push({
                lineKey: result.getValue(result.columns[0]),
                taxGroupId: result.getValue(result.columns[1]),
                expenseAccount: result.getValue(result.columns[2]),
                expenseAmount: result.getValue(result.columns[3]),
            })
            return true;
        });
        return transactionLines;
    }

    function getTaxTransaction(recordObj, group) {
        try {
            var calculatedGroup = {};
            var nationalExchange = getNationalCurrency(recordObj);
            var transactionLines = getTransactionLine(recordObj.id);
            log.error("nationalExchange", nationalExchange)
            log.error("transactionLines", transactionLines)
            for (var i = 0; i < transactionLines.length; i++) {
                var taxGroupId = transactionLines[i].taxGroupId;
                var lineKey = transactionLines[i].lineKey;
                var expenseAccount = transactionLines[i].expenseAccount;
                var expenseAmount = Number(transactionLines[i].expenseAmount) || 0;
                log.error("taxGroupId", taxGroupId)

                if (!taxGroupId || !Object.prototype.hasOwnProperty.call(group, taxGroupId)) {
                    log.error("contunue", "stop")
                    continue;
                }
                log.error("group", group)
                if (!calculatedGroup[lineKey]) calculatedGroup[lineKey] = {};

                var taxCodesInGroup = group[taxGroupId];
                log.error("taxCodesInGroup", taxCodesInGroup)
                for (var taxCodeId in taxCodesInGroup) {
                    if (!Object.prototype.hasOwnProperty.call(taxCodesInGroup, taxCodeId)) continue;

                    var cfg = taxCodesInGroup[taxCodeId];
                    var basis = Number(cfg.basis) || 0;          // %
                    var percentage = Number(cfg.rate) || 0;      // %
                    var taxName = cfg.name || '';
                    var taxType = cfg.taxtype || '';

                    var calculated = (expenseAmount * (basis / 100) * (percentage / 100));

                    calculatedGroup[lineKey][taxCodeId] = {
                        tax_name: taxName,
                        percentage: percentage,
                        basis: basis,
                        calculated_amount: calculated,
                        position: String(i),
                        taxtype: taxType,
                        base: expenseAmount,
                        total: (expenseAmount + calculated),
                        nationalbase: (expenseAmount * nationalExchange),
                        nationalcalculated: (calculated * nationalExchange),
                        nationaltotal: ((expenseAmount + calculated) * nationalExchange),
                        expenseacc: Number(expenseAccount) || null,
                        expenseid: recordObj.id
                    };
                    log.error("calculatedGroup", calculatedGroup)
                }
            }
            return calculatedGroup;

        } catch (e) {
            log.error('Error in getTaxTransaction', e);
            return {};
        }
    }

    function getTaxes(recordObj) {
        deletePreviousTaxRecords(recordObj.id);
        var subsidiary = recordObj.getValue('subsidiary');
        var taxGroups = getTaxGroups(subsidiary);
        var finalGroup = getTaxTransaction(recordObj, taxGroups);
        createTaxResult(finalGroup);
        return finalGroup;
    }

    function createTaxResult(groupPerLine,uniquelinekey) {
        try {

            for (var taxcodeid in groupPerLine) {
                if (groupPerLine.hasOwnProperty(taxcodeid)) {
                    var groupPerTax = groupPerLine[taxcodeid];

                    var taxResult = record.create({ type: 'customrecord_lmry_br_transaction' });

                    taxResult.setValue('custrecord_lmry_br_related_id', String(groupPerTax.expenseid));
                    taxResult.setValue('custrecord_lmry_br_transaction', groupPerTax.expenseid);
                    taxResult.setValue('custrecord_lmry_base_amount', groupPerTax.base);
                    taxResult.setValue('custrecord_lmry_account', groupPerTax.expenseacc);
                    taxResult.setValue('custrecord_lmry_lineuniquekey', uniquelinekey);
                    taxResult.setValue('custrecord_lmry_br_positem', groupPerTax.position);
                    taxResult.setValue('custrecord_lmry_ste_tax_type_result', groupPerTax.taxtype);
                    taxResult.setValue('custrecord_lmry_ste_tax_code_result', taxcodeid);
                    taxResult.setValue('custrecord_lmry_br_percent', groupPerTax.percentage);
                    taxResult.setValue('custrecord_lmry_tax_rate', groupPerTax.calculated_amount);
                    taxResult.setValue('custrecord_lmry_br_total', groupPerTax.calculated_amount);
                    taxResult.setValue('custrecord_lmry_total_base_currency', groupPerTax.nationalcalculated);
                    taxResult.setValue('custrecord_lmry_base_amount_local_currc', groupPerTax.nationalbase);
                    taxResult.setValue('custrecord_lmry_amount_local_currency', groupPerTax.nationalcalculated);
                    taxResult.setValue('custrecord_lmry_gross_amt_local_curr', groupPerTax.nationaltotal);
                    taxResult.setValue('custrecord_lmry_tax_description', 'LR - Tax Group');

                    taxResult.save();
                }
            }
        } catch (err) {
            log.error('[createTaxResult]', err);
        };
    }

    function deletePreviousTaxRecords(expenseId) {

        const taxResultDelete = []
        try {
            
            var s = search.create({
                type: 'customrecord_lmry_br_transaction',
                filters: [
                    ['custrecord_lmry_br_transaction', 'is', expenseId], 'AND',
                    ['custrecord_lmry_tax_description', 'is', 'LR - Tax Group']
                ],
                columns: ['internalid']
            });

            var totalDeleted = 0;

            s.run().each(function (res) {
                var recId = res.getValue('internalid');
                taxResultDelete.push(recId);
                return true;
            });
        } catch (err) {
            log.error('[deletePreviousTaxRecords]', err);
        }
        return taxResultDelete;
    }


    return {
        getTaxes: getTaxes,
        getTaxGroups: getTaxGroups,
        getTaxTransaction: getTaxTransaction,
        deletePreviousTaxRecords: deletePreviousTaxRecords,
        createTaxResult: createTaxResult
    };
});




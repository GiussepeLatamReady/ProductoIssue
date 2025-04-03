/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Name LMRY_CO_Header_WHT_calculation_LBRY_V2.1.js
 * @Author LatamReady - Giussepe Delgado
 * @Date 29/01/2024
 */

define([
    'N/log',
    'N/search',
    'N/record',
    'N/runtime',
    'N/format',
    'N/currency'
], (log, search, record, runtime, format, Ncurrency) => {

    let features = {};
    const calculateHeaderWHT = (id) => {
        const transaction = getTransaction(id);
        createTaxResults(transaction);
    }


    const getTransaction = (id) => {
        getFeatures();
        deleteTaxResults(id);
        let transaction = {
            id: id,
            wht: {
                ica: {},
                iva: {},
                fte: {},
                cree: {}
            },
            sumSubtotal: 0,
            sumTotal: 0,
            sumTaxtotal: 0

        };
        
        let searchFilters = [
            ["internalid", "anyof", id],
            "AND",
            ["mainline", "is", "T"]
        ];

        let searchColumns = new Array();
        searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{internalid}' }));
        searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{recordType}' }));
        
        search.create({
            type: 'transaction',
            filters: searchFilters,
            columns: searchColumns
        }).run().each(result => {
            transaction.recordtype = result.getValue(result.columns[1]);
        });
        

        let recordObj = record.load({ type: transaction.recordtype, id: id });
        
        transaction.variable = recordObj.getValue({ fieldId: 'custbody_lmry_features_active' })

        transaction.total = parseFloat(recordObj.getValue({ fieldId: 'total' }));
        transaction.taxtotal = parseFloat(recordObj.getValue({ fieldId: 'taxtotal' }));
        transaction.subtotal = transaction.total - transaction.taxtotal;
        transaction.discountTotal = parseFloat(recordObj.getValue("discounttotal"));
        transaction.exchangeRate = parseFloat(getExchangeRate(recordObj));
        transaction.items = getItemsData(recordObj);

        if (transaction.recordtype == "vendorbill" || transaction.recordtype == "vendorcredit") {
            const expense = getExpense(recordObj);
            if (Object.keys(expense).length) {
                transaction.expense = expense;
            }
        }
        
        if (transaction.items) {
            transaction.sumSubtotal = transaction.items.sumSubtotal;
            transaction.sumTotal = transaction.items.sumTotal;
            transaction.sumTaxtotal = transaction.items.sumTaxtotal;

        }
        
        if(transaction.expense) {
            transaction.sumSubtotal += transaction.expense.sumSubtotal;
            transaction.sumTotal += transaction.expense.sumTotal;
            transaction.sumTaxtotal += transaction.expense.sumTaxtotal;
        }
        transaction.discountRate = transaction.subtotal/transaction.sumSubtotal;
        deleteProperty(transaction);
        
        applyGlobalDiscount(transaction);

        const relatedRecords = getRelatedRecord(id);
        log.error("relatedRecords",relatedRecords)
        relatedRecords.forEach(retention => {

            let nameWht = getRetentionName(retention.memo);
            let whtObject = getWhtCode(nameWht);
            if (whtObject.id) {
                assignToWht(transaction, whtObject.subtype, whtObject);
            }

        });
        setLineFactor(transaction);
        setAmountsRetention(transaction,recordObj);

        transaction.relatedRecords = [...relatedRecords];
        setTransactionWht(transaction);
        

        return transaction;
    }

    const deleteProperty = transaction => {
       if (transaction.items) {
        delete transaction.items.sumSubtotal;
        delete transaction.items.sumTaxtotal;
        delete transaction.items.sumTotal;
       }
       if (transaction.expense) {
        delete transaction.expense.sumSubtotal;
        delete transaction.expense.sumTaxtotal;
        delete transaction.expense.sumTotal;
       }
    };

    const setAmountsRetention = (transaction,recordObj) => {
        if (Object.keys(transaction.wht.ica).length!=0) transaction.wht.ica.amount = parseFloat(recordObj.getValue("custbody_lmry_co_reteica_amount"));
        if (Object.keys(transaction.wht.iva).length!=0) transaction.wht.iva.amount = parseFloat(recordObj.getValue("custbody_lmry_co_reteiva_amount"));
        if (Object.keys(transaction.wht.fte).length!=0) transaction.wht.fte.amount = parseFloat(recordObj.getValue("custbody_lmry_co_retefte_amount"));
        if (Object.keys(transaction.wht.cree).length!=0) transaction.wht.cree.amount = parseFloat(recordObj.getValue("custbody_lmry_co_retecree_amount"));
        
        if (transaction.variable && (transaction.recordtype == "vendorbill" ||transaction.recordtype == "vendorcredit" )) {
            transaction.variable = JSON.parse(transaction.variable);
            if (Object.keys(transaction.wht.ica).length!=0 && transaction.wht.ica.variable) {
                
                transaction.wht.ica.baseamount = transaction.variable.custpage_lmry_reteica_base;
                transaction.wht.ica.rate = parseFloat(transaction.variable.custpage_lmry_reteica_rate)/100;
            }
            if (Object.keys(transaction.wht.iva).length!=0 && transaction.wht.iva.variable) {
                
                transaction.wht.iva.baseamount = transaction.variable.custpage_lmry_reteiva_base;
                transaction.wht.iva.rate = parseFloat(transaction.variable.custpage_lmry_reteiva_rate)/100;
            }
            if (Object.keys(transaction.wht.fte).length!=0 && transaction.wht.fte.variable) {
                
                transaction.wht.fte.baseamount = transaction.variable.custpage_lmry_retefte_base;
                transaction.wht.fte.rate = parseFloat(transaction.variable.custpage_lmry_retefte_rate)/100;
            }
            if (Object.keys(transaction.wht.cree).length!=0 &&transaction.wht.cree.variable) {
                
                transaction.wht.cree.baseamount = transaction.variable.custpage_lmry_retecree_base;
                transaction.wht.cree.rate = parseFloat(transaction.variable.custpage_lmry_retecree_rate)/100;
            }
        }
         
    };


    //Calcula el factor de cada item para su posterior prorrateo
    const setLineFactor = transaction => {

        const whtBaseKey = {
            "total":"sumTotal",
            "subtotal": "sumSubtotal",
            "taxtotal": "sumTaxtotal"
        }
        const typeBase = transaction.recordtype == "vendorbill" ||transaction.recordtype == "vendorcredit" ? "puchasebase":"salesbase";
        if (Object.keys(transaction.items ?? {}).length) {
            for (let itemKey in transaction.items) {
                transaction.items[itemKey].factor = {};
                for (let wht of Object.values(transaction.wht)) {
                    if (Object.keys(wht).length) {
                        const whtBaseType = wht[typeBase];
                        if (transaction[whtBaseKey[whtBaseType]]) {
                            transaction.items[itemKey].factor[wht.key] = transaction.items[itemKey][whtBaseType]/transaction[whtBaseKey[whtBaseType]];
                        }else{
                            transaction.items[itemKey].factor[wht.key] = 0;
                        }
                    }
                }
            }
        }
        if (Object.keys(transaction.expense ?? {}).length) {
            for (let expenseKey in transaction.expense) {
                transaction.expense[expenseKey].factor = {}
                for (let wht of Object.values(transaction.wht)) {
                    if (Object.keys(wht).length) {
                        const whtBaseType = wht[typeBase];
                        if (transaction[whtBaseKey[whtBaseType]]) {
                            transaction.expense[expenseKey].factor[wht.key] = transaction.expense[expenseKey][whtBaseType] / transaction[whtBaseKey[whtBaseType]];
                        } else {
                            transaction.expense[expenseKey].factor[wht.key] = 0;
                        }
                    }
                    
                }
            }
        }
    };

    const createTaxResults = transaction => {
        const createAndSaveRecord = (amount, itemType, retention, item) => {
            if (Object.keys(retention).length === 0) return;

            const recordSummary = record.create({ type: 'customrecord_lmry_br_transaction', isDynamic: false });

            let baseAmount = parseFloat(amount);
            let retentionAmount = parseFloat(amount * retention.rate);
            let retentionAmounttLocal = parseFloat(item.factor[retention.key]*retention.amount);
            const commonValues = {
                custrecord_lmry_br_related_id: String(transaction.id),
                custrecord_lmry_br_transaction: transaction.id,
                custrecord_lmry_br_type: retention.subtype,
                custrecord_lmry_br_type_id: retention.subtypeId,
                custrecord_lmry_total_item: `Line - ${itemType}`,
                custrecord_lmry_item: itemType === 'Item' ? item.id : undefined,
                custrecord_lmry_account: itemType === 'Expense' ? item.account : undefined,

                custrecord_lmry_base_amount: round(baseAmount),
                custrecord_lmry_br_total: round(retentionAmount),
                custrecord_lmry_br_percent: parseFloat(retention.rate), 

                custrecord_lmry_total_base_currency: round(retentionAmounttLocal).toFixed(4),

                custrecord_lmry_base_amount_local_currc: round(baseAmount * transaction.exchangeRate),
                custrecord_lmry_amount_local_currency: round(retentionAmounttLocal),

                custrecord_lmry_tax_type: '1',
                custrecord_lmry_lineuniquekey: item.lineuniquekey,
                custrecord_lmry_co_wht_applied: retention.relatedTransaction.id,
                custrecord_lmry_co_date_wht_applied: formatDate(retention.relatedTransaction.trandate),
                custrecord_lmry_co_acc_exo_concept: item.account,
            };

            if (retention.variable && retention.amount && transaction.variable) {
                retentionAmount = round(parseFloat(retention.amount) * item.factor[retention.key]);
                baseAmount = round(parseFloat(retention.baseamount) * item.factor[retention.key]);


                commonValues.custrecord_lmry_base_amount = (baseAmount / transaction.exchangeRate).toFixed(4);
                commonValues.custrecord_lmry_br_total = (retentionAmount / transaction.exchangeRate).toFixed(4);

                commonValues.custrecord_lmry_total_base_currency = retentionAmount;
                commonValues.custrecord_lmry_base_amount_local_currc = baseAmount;
                commonValues.custrecord_lmry_amount_local_currency = retentionAmount;
            }

            for (const fieldId in commonValues) {
                if (commonValues[fieldId] !== undefined) {
                    recordSummary.setValue({ fieldId, value: commonValues[fieldId] });
                }
            }

            const idRecordSummary = recordSummary.save({ disableTriggers: true, ignoreMandatoryFields: true });
        };
        if (transaction.items) {
            for (let item of Object.values(transaction.items)) {
                for (let retention of Object.values(transaction.wht)) {
                    const typeBase = transaction.recordtype == "vendorbill" ||transaction.recordtype == "vendorcredit" ? "puchasebase":"salesbase";
                    const whtBase = retention[typeBase];
                    if (item[whtBase]) {
                        createAndSaveRecord(item[whtBase], 'Item', retention, item);
                    }
                }
            }
        }
        
        if (transaction.expense) {
            for (let expense of Object.values(transaction.expense)) {
                for (let retention of Object.values(transaction.wht)) {
                    const typeBase=transaction.recordtype == "vendorbill" ||transaction.recordtype == "vendorcredit" ? "puchasebase":"salesbase";
                    const whtBase = retention[typeBase];
                    if (expense[whtBase]) {
                        createAndSaveRecord(expense[whtBase], 'Expense', retention, expense);
                    }
                    
                }
            }
        }
    };


    const buildTaxResults = (transaction) => {
        const taxResults = [];
        if (transaction.items) {
            for (let item of Object.values(transaction.items)) {
                for (let retention of Object.values(transaction.wht)) {
                    const typeBase = transaction.recordtype == "vendorbill" ||transaction.recordtype == "vendorcredit" ? "puchasebase":"salesbase";
                    const whtBase = retention[typeBase];
                    if (item[whtBase]) {

                        const taxResultObj = {
                            amount:item[whtBase],
                            itemType:'Item',
                            retention, 
                            item,
                            transactionID: transaction.id,
                            variableRate: transaction.variable,
                            exchangeRate: transaction.exchangeRate
                        }

                        taxResults.push(taxResultObj);
                    }
                }
            }
        }
        if (transaction.expense) {
            for (let expense of Object.values(transaction.expense)) {
                for (let retention of Object.values(transaction.wht)) {
                    const typeBase=transaction.recordtype == "vendorbill" ||transaction.recordtype == "vendorcredit" ? "puchasebase":"salesbase";
                    const whtBase = retention[typeBase];
                    if (expense[whtBase]) {
                        //createAndSaveRecord(expense[whtBase], 'Expense', retention, expense);
                        const taxResultObj = {
                            amount:expense[whtBase],
                            itemType:'Expense',
                            retention, 
                            item: expense,
                            transactionID: transaction.id,
                            variableRate: transaction.variable,
                            exchangeRate: transaction.exchangeRate
                        }

                        taxResults.push(taxResultObj);
                    }
                    
                }
            }
        }
        return taxResults;
    }

    const createTaxResult = ({amount, itemType, retention, item,exchangeRate,variableRate,transactionID}) => {

        if (Object.keys(retention).length === 0) return;

        const recordSummary = record.create({ type: 'customrecord_lmry_br_transaction', isDynamic: false });

        let baseAmount = parseFloat(amount);
        let retentionAmount = parseFloat(amount * retention.rate);
        let retentionAmounttLocal = parseFloat(item.factor[retention.key]*retention.amount);
        const commonValues = {
            custrecord_lmry_br_related_id: String(transactionID),
            custrecord_lmry_br_transaction: transactionID,
            custrecord_lmry_br_type: retention.subtype,
            custrecord_lmry_br_type_id: retention.subtypeId,
            custrecord_lmry_total_item: `Line - ${itemType}`,
            custrecord_lmry_item: itemType === 'Item' ? item.id : undefined,
            custrecord_lmry_account: itemType === 'Expense' ? item.account : undefined,

            custrecord_lmry_base_amount: round(baseAmount),
            custrecord_lmry_br_total: round(retentionAmount),
            custrecord_lmry_br_percent: parseFloat(retention.rate), 

            custrecord_lmry_total_base_currency: round(retentionAmounttLocal).toFixed(4),

            custrecord_lmry_base_amount_local_currc: round(baseAmount * exchangeRate),
            custrecord_lmry_amount_local_currency: round(retentionAmounttLocal),

            custrecord_lmry_tax_type: '1',
            custrecord_lmry_lineuniquekey: item.lineuniquekey,
            custrecord_lmry_co_wht_applied: retention.relatedTransaction.id,
            custrecord_lmry_co_date_wht_applied: formatDate(retention.relatedTransaction.trandate),
            custrecord_lmry_co_acc_exo_concept: item.account,
        };

        if (retention.variable && retention.amount && variableRate) {
            retentionAmount = round(parseFloat(retention.amount) * item.factor[retention.key]);
            baseAmount = round(parseFloat(retention.baseamount) * item.factor[retention.key]);


            commonValues.custrecord_lmry_base_amount = (baseAmount / exchangeRate).toFixed(4);
            commonValues.custrecord_lmry_br_total = (retentionAmount / exchangeRate).toFixed(4);

            commonValues.custrecord_lmry_total_base_currency = retentionAmount;
            commonValues.custrecord_lmry_base_amount_local_currc = baseAmount;
            commonValues.custrecord_lmry_amount_local_currency = retentionAmount;
        }

        for (const fieldId in commonValues) {
            if (commonValues[fieldId] !== undefined) {
                recordSummary.setValue({ fieldId, value: commonValues[fieldId] });
            }
        }

        const idRecordSummary = recordSummary.save({ disableTriggers: true, ignoreMandatoryFields: true });
    };

    const setTransactionWht = transaction => {
        transaction.relatedRecords.forEach(record => {
            if (transaction.wht[record.key]) {
                transaction.wht[record.key].relatedTransaction = {
                    id: record.id,
                    trandate: record.trandate
                };
            }
        });
    }
  

    const getRetentionName = text => {
        const match = text.match(/Latam - WHT(?: Reclasification)?\s?(\S.*)/);
        return match ? match[1].trim() : "Retention name not found";
    };

    const assignToWht = (transaction, subtype, objeto) => {
        const whtKey = subtypeToKey(subtype);
        objeto.key = whtKey;
        transaction.wht[whtKey] = objeto;
    };

    const subtypeToKey = (subtype) => {
        return subtype.replace(/.*(?:cree|fte|ica|iva).*/i, (match) => match.toLowerCase().match(/cree|fte|ica|iva/)[0]);
    };

   

    const round = amount => {
        amount = amount.toFixed(8);
        return parseFloat(amount.toString().replace(/\.?0+$/, ''));
    };

    const applyGlobalDiscount = (transaction) => {
        if (transaction.discountTotal && transaction.discountTotal !=0) {
            Object.values(transaction.items).forEach(item => {
                ['subtotal', 'taxtotal', 'total'].forEach(prop => item[prop] = round(item[prop] * transaction.discountRate));
            });
            if (transaction.expense) {
                Object.values(transaction.expense).forEach(item => {
                    ['subtotal', 'taxtotal', 'total'].forEach(prop => item[prop] = round(item[prop] * transaction.discountRate));
                });
            }
        }
    };
      

    const getFeatures = () => {
        features.multibook = isValid(runtime.isFeatureInEffect({ feature: "MULTIBOOK" }));
        features.subsidiary = isValid(runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" }));
    }



    const getWhtCode = (nameWht) => {
        let whtCode = {
            id: null,
            name: null,
            rate: 0,
            salesbase: null,
            puchasebase: null,
            subtype: null,
        };
        if (nameWht != "Retention name not found") {
            let searchFilters = [
                ["formulatext: TRIM({name})","is",nameWht],
                "OR",
                ["formulatext: TRIM({custrecord_lmry_wht_codedesc})","is",nameWht]
            ];

            let searchColumns = new Array();
            searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{internalid}' }));
            searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{name}' }));
            searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{custrecord_lmry_wht_coderate}' }));
            searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{custrecord_lmry_wht_salebase.custrecord_lmry_wht_internalid}' }));
            searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{custrecord_lmry_wht_purcbase.custrecord_lmry_wht_internalid}' }));
            searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{custrecord_lmry_wht_types.custrecord_lmry_wht_subtype}' }));
            searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{custrecord_lmry_wht_types.custrecord_lmry_wht_subtype.id}' }));
            searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{custrecord_lmry_wht_variable_rate}' }));

            search.create({
                type: 'customrecord_lmry_wht_code',
                filters: searchFilters,
                columns: searchColumns
            }).run().each(result => {
                whtCode.id = result.getValue(result.columns[0]) || null;
                whtCode.name = result.getValue(result.columns[1]) || " ";
                whtCode.rate = result.getValue(result.columns[2]) || 0;
                whtCode.salesbase = result.getValue(result.columns[3]) || " ";
                whtCode.puchasebase = result.getValue(result.columns[4]) || " ";
                whtCode.subtype = result.getValue(result.columns[5]) || " ";
                whtCode.subtypeId = result.getValue(result.columns[6]) || " ";
                whtCode.variable = result.getValue(result.columns[7]);
                whtCode.variable = whtCode.variable == "T" || whtCode.variable == true
            });
            whtCode.rate = parseFloat(whtCode.rate) / 100;

        }
        return whtCode;

    }

    const getRelatedRecord = (id,isLine) => {

        let transaction = {};
        let searchFilters = [
            ["custbody_lmry_reference_transaction", "anyof", id],
            "AND",
            ["mainline", "is", "T"]
        ];

        let searchColumns = new Array();
        searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{internalid}' }));
        searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{tranid}' }));
        searchColumns.push(search.createColumn({ name: 'formulatext', formula: "TO_CHAR({trandate},'YYYY-MM-DD')" }));
        searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{memomain}' }));
        searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{amount}' }));
        searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{recordType}' }));
        let settings = [];
        if (features.subsidiary) {
            settings = [search.createSetting({ name: 'consolidationtype', value: 'NONE' })];
        }
        search.create({
            type: 'transaction',
            filters: searchFilters,
            columns: searchColumns,
            settings: settings
        }).run().each(result => {
            const transactionId = result.getValue(result.columns[0]);
            transaction[transactionId] = {
                id: result.getValue(result.columns[0]),
                tranid: result.getValue(result.columns[1]),
                trandate: result.getValue(result.columns[2]),
                memo: result.getValue(result.columns[3]),
                amount: result.getValue(result.columns[4]),
                key: getKey(result.getValue(result.columns[3])),
                recordType: result.getValue(result.columns[5]),
            }
            return true
        });
        let transactionList = Object.values(transaction);
        log.error("transactionList",transactionList)
        return filterTransactionsHeaderByMemo(transactionList);
        
       


    }

    const getKey = (memo) => {
        const nameWht = getRetentionName(memo);
        log.error("nameWht [getKey]",nameWht)
        let subTypeKey;
        if (nameWht != "Retention name not found") {
            let searchFilters = [
                ["formulatext: TRIM({name})","is",nameWht],
                "OR",
                ["formulatext: TRIM({custrecord_lmry_wht_codedesc})","is",nameWht]
            ];

            let searchColumns = new Array();
            searchColumns.push(search.createColumn({ name: 'formulatext', formula: '{custrecord_lmry_wht_types.custrecord_lmry_wht_subtype}' }));

            search.create({
                type: 'customrecord_lmry_wht_code',
                filters: searchFilters,
                columns: searchColumns
            }).run().each(result => {
                log.error("result [getKey]",result)
                subTypeKey = result.getValue(result.columns[0]) || "";
            });
        }
        log.error("subTypeKey [getKey]",subTypeKey);
        log.error("subtypeToKey [getKey]",subtypeToKey(subTypeKey));
        return subTypeKey ? subtypeToKey(subTypeKey): "";
    }
    
    const formatDate = (dateString) => {

        const [year, month, day] = dateString.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        return format.parse({
            value: date,
            type: format.Type.DATE
        });
    };

    /**
     * Filtra las transacciones por la cabecera del memo, buscando primero por "Latam - WHT Reclasification"
     * y, si no se encuentra ninguno, busca por "Latam - WHT".
     * 
     * @param {Object} transactions - Objeto que contiene las transacciones a filtrar.
     * @returns {Array} Un array de transacciones filtradas según la condición del memo.
     */
    const filterTransactionsHeaderByMemo = transactions => {
        let filteredTransactions = [];
        const typeRetention = {
            iva:{withRecla:[],withOutRecla:[]},
            ica:{withRecla:[],withOutRecla:[]},
            fte:{withRecla:[],withOutRecla:[]},
            cree:{withRecla:[],withOutRecla:[]}
        };
        transactions.forEach(transaction =>{
            Object.keys(typeRetention).forEach(key => {
                if (transaction.memo.startsWith("Latam - WHT Reclasification")) {
                    if (transaction.key) {
                        typeRetention[transaction.key].withRecla.push(transaction);
                    } 
                }else{
                    if (transaction.key) {
                        typeRetention[transaction.key].withOutRecla.push(transaction);
                    }
                }     
            });
        });
        Object.keys(typeRetention).forEach(key => {
            if (typeRetention[key].withRecla.length) typeRetention[key].withRecla.sort((a,b) => Number(b.id) - Number(a.id));
            if (typeRetention[key].withOutRecla.length) typeRetention[key].withOutRecla.sort((a,b) => Number(b.id) - Number(a.id));
        });

        Object.keys(typeRetention).forEach(key => {
            if (typeRetention[key].withRecla.length) {
                filteredTransactions.push(typeRetention[key].withRecla[0])
            }else if(typeRetention[key].withOutRecla.length){
                filteredTransactions.push(typeRetention[key].withOutRecla[0])
            }
        });
        log.error("filteredTransactions",filteredTransactions)
        return filteredTransactions;
    
    };

    const getExchangeRate = (recordObj) => {
        const exchangerateTran = recordObj.getValue({ fieldId: 'exchangerate' });
        const transactionCurrency = recordObj.getValue({ fieldId: 'currency' });
        const transactionDate = recordObj.getValue({ fieldId: 'trandate' });
        const subsidiary = recordObj.getValue({ fieldId: 'subsidiary' });

        if (!features.subsidiary) return exchangerateTran;

        let searchSetupSubsidiary = search.create({
            type: "customrecord_lmry_setup_tax_subsidiary",
            filters: [
                ['isinactive', 'is', 'F'],
            ],
            columns: ['custrecord_lmry_setuptax_currency']
        });

        if (features.subsidiary) {
            searchSetupSubsidiary.filters.push(search.createFilter({
                name: 'custrecord_lmry_setuptax_subsidiary',
                operator: 'is',
                values: subsidiary
            }));
        }

        searchSetupSubsidiary = searchSetupSubsidiary.run().getRange({
            start: 0,
            end: 1000
        });

        let currencySetup = 0;

        if (searchSetupSubsidiary.length) {
            currencySetup = searchSetupSubsidiary.length ? searchSetupSubsidiary[0].getValue('custrecord_lmry_setuptax_currency') : 0;
        }

        //currencySetup = currencySetup === 0 ? currencyLocal : currencySetup;

        //if (!features.multibook || currencySetup === 0) return exchangerateTran;

        if (transactionCurrency === currencySetup) return 1;

        if (features.multibook) {
            const lineasBook = recordObj.getLineCount({ sublistId: 'accountingbookdetail' });
            for (let i = 0; i < lineasBook; i++) {
                const lineaCurrencyMB = recordObj.getSublistValue({
                    sublistId: 'accountingbookdetail',
                    fieldId: 'currency',
                    line: i
                });

                if (lineaCurrencyMB === currencySetup) {
                    return recordObj.getSublistValue({
                        sublistId: 'accountingbookdetail',
                        fieldId: 'exchangerate',
                        line: i
                    });
                }
            }
        } else {

            const { currency: [{ value: currencySubs }] } = search.lookupFields({
                type: 'subsidiary',
                id: subsidiary,
                columns: ['currency']
            });


            
            if (currencySubs === currencySetup) {
                return exchangerateTran
            } else {
                return Ncurrency.exchangeRate({
                    source: transactionCurrency,
                    target: currencySetup,
                    date: transactionDate
                });
            };

        }
    };



    const isValid = (bool) => {
        return (bool === "T" || bool === true);
    }

    const getItemsData = (recordObj) => {
        let items = {
            sumSubtotal:0,
            sumTaxtotal:0,
            sumTotal:0
        };
        const itemIDs = new Set();
        const itemsLines = recordObj.getLineCount({ sublistId: 'item' });
        for (let i = 0; i < itemsLines; i++) {
            const itemType = recordObj.getSublistValue({ sublistId: 'item', fieldId: "itemtype", line: i });

            if(itemType=="Group" || itemType=="EndGroup") continue;

            const id = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            const lineuniquekey = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: i });
            const total = Math.abs(recordObj.getSublistValue({ sublistId: 'item', fieldId: 'grossamt', line: i })) || 0;
            const subtotal = Math.abs(recordObj.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i })) || 0;
            const taxtotal = parseFloat(total) - parseFloat(subtotal);

            items[lineuniquekey] = {
                id: id,
                subtotal: subtotal,
                total: total,
                taxtotal: taxtotal,
                lineuniquekey: lineuniquekey,
                //account: getItemAccount(id),
                itemType: itemType
            }

            if (items[lineuniquekey].itemType == "Discount" || items[lineuniquekey].itemType == "Descuento") {
                items[lineuniquekey].subtotal *= -1;
                items[lineuniquekey].taxtotal *= -1;
                items[lineuniquekey].total *= -1;
                
            }

            items.sumSubtotal += items[lineuniquekey].subtotal;
            items.sumTaxtotal += items[lineuniquekey].taxtotal;
            items.sumTotal += items[lineuniquekey].total;
            itemIDs.add(id);
        }

        const accountIDs = getItemAccount(itemIDs);
        Object.keys(items).forEach(lineuniquekey => {
            const {id} = items[lineuniquekey];
            if (accountIDs[id]) {
                items[lineuniquekey].account = accountIDs[id];
            }
        });

        return items;
    }

    const getExpense = (recordObj) => {
        let expense = {
            sumSubtotal:0,
            sumTaxtotal:0,
            sumTotal:0
        };
        const itemsLines = recordObj.getLineCount({ sublistId: 'expense' });
        for (let i = 0; i < itemsLines; i++) {
            const lineuniquekey = recordObj.getSublistValue({ sublistId: 'expense', fieldId: 'lineuniquekey', line: i });
            const total = Math.abs(recordObj.getSublistValue({ sublistId: 'expense', fieldId: 'grossamt', line: i })) || 0;
            const subtotal = Math.abs(recordObj.getSublistValue({ sublistId: 'expense', fieldId: 'amount', line: i })) || 0;
            const taxtotal = parseFloat(total) - parseFloat(subtotal);
            expense[lineuniquekey] = {
                subtotal: subtotal,
                total: total,
                taxtotal: taxtotal,
                amount: recordObj.getSublistValue({ sublistId: 'expense', fieldId: 'amount', line: i }),
                lineuniquekey: lineuniquekey,
                account: recordObj.getSublistValue({ sublistId: 'expense', fieldId: 'account', line: i })
            }

            expense.sumSubtotal += expense[lineuniquekey].subtotal;
            expense.sumTaxtotal += expense[lineuniquekey].taxtotal;
            expense.sumTotal += expense[lineuniquekey].total;

        }
        return expense;
    }

    /**
     * Obtiene el ID de la cuenta asociada a un artículo específico basándose en su tipo.
     * 
     * @param {string|number} id - El ID interno del artículo a buscar.
     * @returns {string} El ID de la cuenta asociada al artículo.
     */
    const getItemAccount = (ids) => {
        let accountIDs = {};
        const idList = Array.from(ids);

        if (idList.length) {
            let searchFilters = [
                ["internalid", "anyof", idList]
            ];
    
            let searchColumns = new Array();
            searchColumns.push(search.createColumn({ name: 'formulatext', formula: "CASE WHEN {type}='Inventory Item' THEN {assetaccount.id} ELSE  NVL({expenseaccount.id},{incomeaccount.id}) END" }));
            search.create({
                type: 'item',
                filters: searchFilters,
                columns: searchColumns
            }).run().each(result => {
                const itemID = result.id;
                const accountID = result.getValue(result.columns[0])
                accountIDs[itemID] = accountID;
                return true;
            });
        }
        
        return accountIDs;
    }

    const deleteTaxResults = (id) => {
        let searchRecordLog = search.create({
            type: 'customrecord_lmry_br_transaction',
            filters: [
                ['custrecord_lmry_br_transaction', 'is', id]
            ],
            columns: [
                'internalid'
            ]
        })
        searchRecordLog.run().each(function (result) {
            let idTax = result.getValue(result.columns[0]);

            record.delete({
                type: 'customrecord_lmry_br_transaction',
                id: idTax,
                isDynamic: true
            });
            return true;
        });
    }
    return { calculateHeaderWHT,getTransaction,buildTaxResults,createTaxResult};
});

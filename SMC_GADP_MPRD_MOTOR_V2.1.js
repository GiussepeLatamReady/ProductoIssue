/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * @Name LMRY_CO_Header_WHT_calculation_Auto_MPRD_V2.1.js
 * @Author LatamReady - Giussepe Delgado
 * @Date 02/01/2024
 */
define([
    "N/record",
    "N/runtime",
    "N/search",
    "N/log",
    './CO_Library_Mensual/SMC_CO_Header_WHT_calculation_LBRY_V2.1',
    "N/format"
],

    (record, runtime, search, log, lbryWHTHeader, format) => {


        const getInputData = (inputContext) => {
            try {
                const sales = getTransactions("general");
                //const purchases = getTransactions("purchases");
                log.error("transactions",sales)
                const transactions = sales
                return transactions;
            } catch (error) {
                log.error("Error [getInputData]", error);
                return [{
                    code: "ERROR",
                    message: error.message
                }];
            }
        }

        const map = (mapContext) => {

            const value = JSON.parse(mapContext.value);
            log.error("value [map]",value)
            if (value.code === "ERROR") {
                mapContext.write({
                    key: value.code,
                    value: value
                });
            } else {

                const data = value;
                try {
                    if (data["id"]) {
                        const transaction = lbryWHTHeader.getTransaction(data.id);
                        const taxResults = lbryWHTHeader.buildTaxResults(transaction);
                        log.error("transaction [map]",transaction)
                        log.error("taxResults [map]",taxResults)

                        
                        taxResults.forEach(taxResult => {
                            mapContext.write({
                                key: taxResult.item.lineuniquekey,
                                value: {
                                    code: "OK",
                                    transaction: data,
                                    taxResult
                                }
                            });
                        });           
                            
                    }
                } catch (error) {
                    log.error("Error [map]", error);
                    log.error("Error [map] data.id", data.id);
                    data.state = "Error";
                    mapContext.write({
                        key: mapContext.key,
                        value: {
                            code: "ERROR",
                            message: error.message,
                            transaction: data
                        }
                    });
                }

            }

        }

        const reduce = (reduceContext) => {

            const { values, key } = reduceContext;
            const data = values.map(value => JSON.parse(value));
            log.error("data [reduce]",data)
            if (data[0].code == "ERROR") {
                data[0].transaction.state = "Error";
                reduceContext.write({
                    key: data[0].transaction.id,
                    value: {
                        code: "ERROR",
                        message: data[0].message,
                        transaction: data[0].transaction
                    }
                });
            } else {
                try {
                    log.error("transaction id",data[0].transaction.id)
                    data.forEach(({ taxResult }) => {
                        lbryWHTHeader.createTaxResult(taxResult);
                    });
                    data[0].transaction.state = "Procesada con exito";
                    reduceContext.write({
                        key: data[0].transaction.id,
                        value: {
                            code: "OK",
                            transaction: data[0].transaction
                        }
                    });
                } catch (error) {
                    log.error('Error [REDUCE]', error)
                    log.error('Error [REDUCE] id ', data[0].transaction.id)
                    data[0].transaction.state = "Error";
                    reduceContext.write({
                        key: data[0].transaction.id,
                        value: {
                            code: "ERROR",
                            message: error.message,
                            transaction: data[0].transaction
                        }
                    });
                }
            }

        }

        const summarize = (summarizeContext) => {
            const data = [];
            const transactionIDs = new Set();
            summarizeContext.output.iterator().each(function (key, value) {

                value = JSON.parse(value);
                const { id } = value.transaction;
                if (!transactionIDs.has(id)) {
                    data.push(value);
                    transactionIDs.add(id);
                }

                return true;
            });

            try {
                log.error("data [summarize]",data)
                log.error("transactionIDs [summarize]",transactionIDs)
                //Agrupar transacciones
                const groupedTransactions = data.reduce((transactions, element) => {

                    const { transaction } = element;
                    const { subsidiary, typeProcess } = transaction;
                    const key = `${subsidiary}-${typeProcess}`;
                    if (!transactions[key]) transactions[key] = [];
                    transactions[key].push(element);
                    return transactions;
                }, {})

                Object.values(groupedTransactions).forEach(transactions => {
                    const errors = transactions.filter(transaction => transaction.code === "ERROR");
                    //log.error("errors",errors)
                    if (errors.length) {
                        //log.error("errors entro","entrosss")
                        //if (transactions.length != errors.length) {
                        const message = errors[0].message;
                        createRecordLog(transactions, "Ocurrió un error", message)
                        //}
                    } else {
                        createRecordLog(transactions, "Finalizado", 'Las transacciones han sido procesadas con exito') 
                    }
                });
            } catch (error) {
                log.error('Error [summarize]', error)
            }

        }
        const getTransactions = (typeProcess) => {

            const internalids = [
                "4505745",
                "4345724"
            ];

            let filters = [
                ["mainline", "is", "T"],
                "AND",
                ["custbody_lmry_reference_transaction", "anyof", internalids],
                "AND",
                ["subsidiary.country", "anyof", "CO"]
            ];
            

            let columns = [];
            columns.push(search.createColumn({ name: 'formulatext', formula: '{custbody_lmry_reference_transaction.internalid}', sort: search.Sort.DESC }));
            columns.push(search.createColumn({ name: 'formulatext', formula: '{subsidiary.id}' }));



            let searchTransactionsWht = search.create({
                type: "transaction",
                filters: filters,
                columns: columns
            });
            let transactions = {};
            let pageData = searchTransactionsWht.runPaged({ pageSize: 1000 });
            if (pageData) {
                pageData.pageRanges.forEach(function (pageRange) {
                    let page = pageData.fetch({ index: pageRange.index });
                    page.data.forEach(function (result) {
                        const id = result.getValue(result.columns[0]);
                        //const memo = result.getValue(result.columns[1]);
                        const subsidiary = result.getValue(result.columns[1]);

                        transactions[id] = { id, subsidiary, typeProcess };

                    });
                });
            }

            return Object.values(transactions);
        }

        const getStartDate = (endDate) => {
            const year = endDate.getFullYear()
            let startDate;
            const accountingperiodSearchObj = search.create({
                type: "accountingperiod",
                filters:
                    [
                        ["isyear", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "periodname", label: "Name" }),
                        search.createColumn({ name: "startdate", label: "Start Date" })
                    ]
            });

            accountingperiodSearchObj.run().each(result => {
                const columns = result.columns;
                const name = result.getValue(columns[0]);

                if (name.includes(year)) {
                    startDate = result.getValue(columns[1]);
                }
                return true;
            })
            return startDate;
        }
        const isFirstExecution = (typeProcess) => {

            const filters = [
                ["custrecord_lmry_co_hwht_log_exect", "is", "SCHEDULE"],
                "AND",
                ["custrecord_lmry_co_hwht_log_state", "is", "Finalizado"],
                "AND",
                ["custrecord_lmry_co_hwht_log_process", "is", typeProcess]
            ];
            const columns = ["internalid"];
            const recordCount = search.create({
                type: "customrecord_lmry_co_head_wht_cal_log",
                filters: filters,
                columns: columns
            }).runPaged().count;
            return recordCount == 0;
        }

        const createRecordLog = (data, statusGeneral, processDetail) => {
            const employeeSystem = runtime.getCurrentScript().getParameter({
                name: 'custscript_lmry_employee_manager'
            });
            const { subsidiary, startDate, endDate, typeProcess } = data[0].transaction;
            const ids = data.map(({ transaction }) => ({ id: transaction.id, state: transaction.state }));
            let recordlog = record.create({
                type: 'customrecord_lmry_co_head_wht_cal_log'
            });
            recordlog.setValue({ fieldId: 'custrecord_lmry_co_hwht_log_subsi', value: subsidiary });
            recordlog.setValue({ fieldId: 'custrecord_lmry_co_hwht_log_state', value: statusGeneral });
            recordlog.setValue({ fieldId: 'custrecord_lmry_co_hwht_log_employee', value: employeeSystem });
            recordlog.setValue({ fieldId: 'custrecord_lmry_co_hwht_log_transactions', value: JSON.stringify(ids) });
            recordlog.setValue({ fieldId: 'custrecord_lmry_co_hwht_log_process', value: typeProcess });
            recordlog.setValue({ fieldId: 'custrecord_lmry_co_hwht_log_whttype', value: "header" });
            recordlog.setValue({ fieldId: 'custrecord_lmry_co_hwht_log_period', value: startDate || " " });
            recordlog.setValue({ fieldId: 'custrecord_lmry_co_hwht_log_period_fin', value: endDate });
            recordlog.setValue({ fieldId: 'custrecord_lmry_co_hwht_log_exect', value: "SCHEDULE" });
            recordlog.setValue({ fieldId: 'custrecord_lmry_co_hwht_log_details', value: processDetail });
            recordlog.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });

        }

        const formatDate = (date) => {
            let parseDate = format.parse({ value: date, type: format.Type.DATE });
            parseDate = format.format({ type: format.Type.DATE, value: parseDate });
            return parseDate;
        }

        return { getInputData, map, reduce, summarize }

    });
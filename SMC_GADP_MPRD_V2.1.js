/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * @Name SMC_GADP_MPRD_V2.1.js
 * @Author LatamReady - Giussepe Delgado
 * @Date 02/01/2024
 */
define([
    "N/record",
    "N/runtime",
    "N/file",
    "N/search",
    "N/format",
    "N/log",
    "N/url",
    "N/translation",
    "N/suiteAppInfo",
    'N/config'
],

    (record, runtime, file, search, format, log, url, translation, suiteAppInfo, config) => {

        // let scriptParameters = {};



        const getInputData = () => {

            try {

                let transactions = getTransaction();
                log.error("Cantidad de transacciones",transactions.length)
                //loadcsv();
                return transactions;
            } catch (error) {

                log.error("getinputdata error", error)
                return [["isError", error.message]];
            }

        }

        const map = (context) => {
            let transaction = JSON.parse(context.value);
            try {
                if (context.value.indexOf("isError") != -1) {
                    context.write({
                        key: context.key,
                        value: context.value
                    });
                } else {
                    //log.error("transaction map",transaction)
                    referenceTransaction(transaction);
                    context.write({
                        key: context.key,
                        value: transaction
                    });
                }
            } catch (error) {
                log.error("error map transaction", transaction);
                log.error("error map", error);
                context.write({
                    key: context.key,
                    value: ["isError " + transaction.internalid + " - " + transaction.transaction, error.message]
                });
            }
        }

        function reduce(context) {
            try {
                if (context.values[0].indexOf("isError") != -1) {
                    context.write({
                        key: context.key,
                        value: context.values[0]
                    });
                } else {


                    /*
                    let objItem = new Object();
                    let arrItems = context.values;
                    arrItems.forEach(function (item) {
                        item = JSON.parse(item);
                        updateQuantityAndTotalCost(item);
                        if (Object.keys(objItem).length === 0) {
                            objItem = item;
                        } else {
                            objItem.quantity += item.quantity;
                            objItem.totalCost += item.totalCost;
                        }
                    });

                    if (objItem.quantity == 0) {
                        objItem.unitCost = 0.00;
                    } else {
                        objItem.unitCost = roundMethod(objItem.totalCost / objItem.quantity);
                    }             
                    objItem.quantity = objItem.quantity.toFixed(0);
                    objItem.unitCost = objItem.unitCost.toFixed(2);
                    objItem.totalCost = objItem.totalCost.toFixed(2);

                    if (objItem.totalCost == "-0.00") {
                        objItem.totalCost = "0.00"
                    }
                    if (Object.keys(objItem).length !== 0) {
                        context.write({
                            key: context.key,
                            value: objItem
                        });
                    }
                    */
                }
            } catch (error) {
                log.error("error reduce", error);
                context.write({
                    key: context.key,
                    value: ["isError", error.message]
                });
            }
        }


        const summarize = (context) => {
            try {
                //setConfiguration();
                let arrTransactions = new Array();

                context.output.iterator().each(function (key, value) {
                    arrTransactions.push(value);
                    return true;
                });
                const title = "internalid,Creditmemo,Creditmemo (Main)" + '\n'
                let fileContent = arrTransactions.map(transaction => transaction + '\n').join('');
                //log.error("fileContent",fileContent)
                fileContent = `${title}${fileContent}\r\n`
                saveFile(fileContent, "retenciones.csv", "3101091")
                //log.error("arrTransactions", arrTransactions)

            } catch (error) {
                log.error("error Summarize", error);

            }

        }

        const saveFile = (fileContent, nameFile, folderId) => {

            if (!folderId) return;
            const fileGenerate = file.create({
                name: nameFile,
                fileType: file.Type.CSV,
                contents: fileContent,
                encoding: file.Encoding.UTF8,
                folder: folderId
            });

            return fileGenerate.save();
        };

        const getTransaction = () => {
            const invoices = [];
            search.create({
                type: "transaction",
                //settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
                filters:
                    [
                        ["subsidiary","anyof","7","8"],
                        "AND",
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["mainline", "is", "T"],
                        "AND",
                        ["applyingtransaction.memomain", "startswith", "Latam - WHT"],
                        "AND",
                        ["postingperiod", "abs", "224"],
                        "AND",
                        ["applyingtransaction.custbody_lmry_reference_transaction", "anyof", "@NONE@"]
                    ],
                columns:
                    [
                        "internalid",
                        "applyingTransaction.internalid",
                        "applyingTransaction.memomain"
                    ]
            }).run().each(result => {
                const {getValue,columns} = result;
                const internalid = getValue(columns[0]);
                const invoice = {
                    invoiceID:internalid,
                    apply:getValue(columns[1]),
                    apply_memo:getValue(columns[2]),
                }
                if (invoice.apply_memo.startsWith("Latam - WHT")) invoices.push(invoice)
                return true;
            });
            return invoices;
        }


        const referenceTransaction = (transaction) => {
            const {invoiceID,apply} = transaction;
            record.submitFields({
                type: "creditmemo",
                id: apply,
                values: {
                    custbody_lmry_reference_transaction: invoiceID
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true,
                    disableTriggers: true
                }
            });
        }

        const parseCsvToArray = (csvText) => {
            // Separa el contenido en líneas (considerando diferentes saltos de línea)
            let lines = csvText.split(/\r\n|\n/);
            let result = [];

            if (lines.length === 0) {
                return result;
            }

            // La primera línea contiene los encabezados
            let headers = lines[0].split(',');

            // Recorre las líneas restantes
            for (let i = 1; i < lines.length; i++) {
                let line = lines[i].trim();
                // Si la línea está vacía, la omite
                if (line === '') {
                    continue;
                }

                // Separa los valores de la línea
                let values = line.split(',');
                let obj = {};

                // Crea un objeto asignando cada valor a su respectivo encabezado
                for (let j = 0; j < headers.length; j++) {
                    // Si lo deseas, aquí puedes transformar el nombre de la propiedad
                    // Ejemplo: headers[j].trim().toLowerCase() para usar minúsculas
                    obj[headers[j].trim()] = values[j] ? values[j].trim() : '';
                }

                result.push(obj);
            }
            log.error("result", result)
            return result;
        }

        const getInfoData = (transaction) => {
            //log.error("transaction", transaction)
            let objTransaction = {};

            objTransaction[transaction.internalid] = {
                index: transaction.index,
                tranid_old: transaction.transaction
            };
            search.create({
                type: "transaction",
                filters: [
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['internalid', 'is', transaction.internalid]
                ],
                columns: ['internalid', 'tranid', 'entity', 'applyingTransaction.type', 'applyingTransaction.fxamount', 'applyingTransaction.tranid', 'applyingTransaction.internalid', 'applyingTransaction.memo']
            }).run().each(result => {
                //log.error("result", result)
                const { getValue, getText, columns } = result;
                let internalid = getValue("internalid");

                objTransaction[internalid].tranid_new = getValue('tranid');
                objTransaction[internalid].entity = getValue('entity');
                let ObjApply = {
                    type: getText(columns[3]),
                    amount: getValue(columns[4]),
                    tranid: getValue(columns[5]),
                    internalid: getValue(columns[6]),
                    memo: getValue(columns[7])
                }

                if (!objTransaction[internalid].apply) objTransaction[internalid].apply = [];
                objTransaction[internalid].apply.push(ObjApply)
                return true;
            })

            let payment = objTransaction[transaction.internalid].apply.find(tx => tx.type === "Payment").internalid;
            let taxResult = [];

            if (payment) {
                search.create({
                    type: "transaction",
                    filters: [
                        ['mainline', 'is', 'T'],
                        'AND',
                        ['internalid', 'anyof', payment]
                    ],
                    columns: ['internalid', 'CUSTRECORD_LMRY_BR_TRANSACTION.internalid']
                }).run().each(result => {
                    //log.error("result", result)
                    const { getValue, getText, columns } = result;

                    if (getValue(columns[1])) {
                        taxResult.push(getValue(columns[1]));
                    }
                    return true;
                })
            }

            objTransaction[transaction.internalid].statusTaxResult = taxResult.length != 0;
            //objTransaction[transaction.internalid].taxResult = taxResult;

            //log.error("taxResult",taxResult)
            //log.error("objTransaction",objTransaction)
            return objTransaction
        }


        const generateFile = (objTransaction, internalid) => {

            const transaction = objTransaction[internalid];
            const { index, tranid_new, apply, statusTaxResult } = transaction;

            let payment = apply.find(tx => tx.type === "Payment");
            let creditMemo = apply.find(tx => tx.type === "Credit Memo");
            if (!payment) {
                payment = {}
                payment.tranid = "No tiene pago";
                payment.amount = 0;
                payment.memo = "----";
            }
            if (!creditMemo) {
                creditMemo = {}
                creditMemo.tranid = "No tiene retencion";
                creditMemo.amount = 0;
                creditMemo.memo = "----";
            }
            return `${index},${tranid_new},${payment.tranid},${payment.amount},${payment.memo},${creditMemo.tranid},${creditMemo.amount},${creditMemo.memo},${statusTaxResult}`;
        }


        return { getInputData, map, summarize };
    });
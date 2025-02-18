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
                log.error("transactions",transactions)
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
                    //transaction = addItems(transaction);
                    //log.error("transaction",transaction)
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


        const summarize = (context) => {
            try {
                //setConfiguration();
                let arrTransactions = new Array();

                context.output.iterator().each(function (key, value) {
                    arrTransactions.push(value);
                    return true;
                });
                const title = "Id Interno,Tranid,Items Inactivos" + '\n'
                let fileContent = arrTransactions.map(transaction => transaction + '\n').join('');
                //log.error("fileContent",fileContent)
                fileContent = `${title}${fileContent}\r\n`
                //saveFile(fileContent, "items_inactivos.csv", "3101091")
                //log.error("arrTransactions", arrTransactions)

            } catch (error) {
                log.error("error Summarize", error);

            }

        }

        return { getInputData, map, summarize };
    });
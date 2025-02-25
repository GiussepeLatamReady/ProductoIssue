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
                    setTransactionFields(transaction)
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

        const getTransaction = () => {
            const transactions =[];
            let columns = [];
            columns.push("internalid");
            columns.push(search.createColumn({ name: 'formulatext', formula: '{tranid}', sort: search.Sort.DESC }));
            
            search.create({
                type: search.Type.INVOICE,
                filters: [
                    ['mainline', 'is', 'T'],  // Solo linea principal
                    'AND',
                    ['subsidiary', 'anyof', "60"]],
                columns: columns
            }).run().each(result => {
                const {columns,getValue} = result;
                transactions.push({
                    internalid: getValue(columns[0]),
                    tranid: getValue(columns[1])
                })
                return true;
            });

            return transactions
        }

        const setTransactionFields = (transaction) => {
            search.create({
                type: "customrecord_lmry_br_transaction_fields",
                filters: [
                    ["custrecord_lmry_br_related_transaction","anyof",transaction.id],
                    "AND",
                    ['isinactive', 'is', 'F'],  // Solo linea principal
                    'AND',
                    ['subsidiary', 'anyof', "60"]],
                columns: [
                    "custrecord_lmry_br_trib_fed_nac",
                    "custrecord_lmry_br_trib_fed_imp",
                    "custrecord_lmry_br_trib_est",
                    "custrecord_lmry_br_trib_mun"
                ]
            }).run().each(result => {
                const {columns,getValue} = result;
                transaction.nacional = getValue(columns[0]);
                transaction.importacion = getValue(columns[1]);
                transaction.estadual = getValue(columns[2]);
                transaction.municipal = getValue(columns[3]);
            })
        }

        const generateFile = (transactions) => {

            const lines = items.map(item => [
                item.period, // 1. Periodo.
                item.catalogueCode, // 2. Código del catálogo utilizado.
                item.typeOfExistence, // 3. Tipo de existencia.
                item.codeOfExistence, // 4. Código propio de la existencia.
                item.catalogueCode, // 5. Repetido: Código del catálogo utilizado.
                item.correspondingStockCode, // 6. Código de Existencia correspondiente.
                item.existenceDescription, // 7. Descripción de la existencia.
                item.unitOfMeasureCode, // 8. Código de la Unidad de medida.
                item.valuationMethodCode, // 9. Código del método de valuación.
                item.quantity, // 10. Cantidad de la existencia.
                item.unitCost, // 11. Costo unitario de la existencia.
                item.totalCost, // 12. Costo total.
                "1", // 13. Indica el estado de la operación. Siempre "1" en este caso.
                "" // 14. Campos de libre utilización.
            ].join(",") + '\n');
            
            return lines.join('');
        };

        return { getInputData, map, summarize };
    });
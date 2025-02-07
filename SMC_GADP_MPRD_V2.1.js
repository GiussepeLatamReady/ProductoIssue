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
                
                let transactions = loadcsv();
                //loadcsv();
                return transactions;
            } catch (error) {

                log.error("getinputdata error", error)
                return [["isError", error.message]];
            }

        }

        const map = (context) => {
            try {
                if (context.value.indexOf("isError") != -1) {
                    context.write({
                        key: context.key,
                        value: context.value
                    });
                } else {
                    let transaction = JSON.parse(context.value);
                    //getInfoData(transaction);
                    //addItemDetails(transaction);
                    context.write({
                        key: transaction.index,
                        value: transaction
                    });
                }
            } catch (error) {
                log.error("error map", error);
                context.write({
                    key: context.key,
                    value: ["isError", error.message]
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
                    arrTransactions.push(JSON.parse(value));
                    return true;
                });
                log.error("arrTransactions",arrTransactions)

            } catch (error) {
                log.error("error Summarize", error);

            }


        }

        const loadcsv = () => {
            const csvFile = file.load({
                id: '3918704'
            });

            const csvContent = csvFile.getContents();
            log.error("csvContent",csvContent)
            return parseCsvToArray(csvContent)
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
                    obj[ headers[j].trim() ] = values[j] ? values[j].trim() : '';
                }
                
                result.push(obj);
            }
            log.error("result",result)
            return result;
        }
        
        const getInfoData = (transaction) => {
            log.error("transaction",transaction)
            search.create({
                type: "transaction",
                filters: [['mainline', 'is', 'T'],  
                          'AND',
                          ['tranid', 'is', transaction.transaction]], 
                columns: ['internalid']
            }).run().each(result => {
                log.error("result",result)
                const {getValue,columns} = result;
                transaction["internalid"] = getValue(columns[0]);
                log.error("internalid",getValue(columns[0]))
            })
        }
        return { getInputData, map, summarize };
    });
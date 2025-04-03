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
    'N/config',
    './WTH_Library/LMRY_BR_WHT_CustPaymnt_LBRY'
],

    (
        record,
        runtime,
        file,
        search,
        format,
        log,
        url,
        translation,
        suiteAppInfo,
        config,
        lbryBRPayment) => {

        // let scriptParameters = {};



        const getInputData = () => {

            try {

                //const deleteRecor = deleteRecord();
                let transactionsIds = getTransactionIDs();
                //transactionsIds = idsWithoutPedimentos(transactionsIds);
                log.error("Cantidad de transacciones:", transactionsIds.length)
                //return deleteRecor;
                return transactionsIds;
            } catch (error) {

                log.error("getinputdata error", error)
                return [["isError", error.message]];
            }

        }

        const deleteRecord = () => {
            const deleteRecord = []
            const transactionSearchObj = search.create({
                type: "customrecord_lmry_mx_pedimento_details",
                filters:
                    [["internalid","anyof","T"]],
                columns:
                    [
                        "internalid"
                    ]
            })

            let pageData = transactionSearchObj.runPaged({ pageSize: 1000 });
            if (pageData) {
                pageData.pageRanges.forEach(function (pageRange) {
                    let page = pageData.fetch({ index: pageRange.index });
                    page.data.forEach(function (result) {
                        const internalid = result.getValue(result.columns[0]);
                        deleteRecord.push(internalid);
                        
                    });
                });
            }
            log.error("deleteRecord",deleteRecord.length)
            return deleteRecord;
        }

        const map = (context) => {
            let transactionID = JSON.parse(context.value);
            try {
                if (context.value.indexOf("isError") != -1) {
                    context.write({
                        key: context.key,
                        value: context.value
                    });
                } else {
                    /*
                    record.delete({
                        type:"customrecord_lmry_mx_pedimento_details",
                        id: transactionID
                    });
                    
                    context.write({
                        key: transactionID,
                        value: {
                            transactionID: transactionID
                        }
                    });
                    */
                    
                    //if (!existPedimento(transactionID)) {
                    const recordDetail = getTransactionDetails(transactionID);
                    //log.error("recordDetail", recordDetail)

                    if (recordDetail.length) {
                        //log.error("recordDetail map", recordDetail)
                        context.write({
                            key: transactionID,
                            value: {
                                recordDetail: recordDetail
                            }
                        });
                    }
                    

                    //}
                    
                }
            } catch (error) {
                log.error("error map transaction", transactionID);
                log.error("error map", error);
                context.write({
                    key: context.key,
                    value: ["isError " + transactionID.internalid + " - " + transactionID.transaction, error.message]
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


                /*
                let arrRecordsDetail = new Array();
                context.output.iterator().each(function (key, value) {
                    arrRecordsDetail.push(value);
                    return true;
                });
                log.error("summarize array",arrRecordsDetail.length);
                */
                
                //setConfiguration();
                let arrRecordsDetail = new Array();
                context.output.iterator().each(function (key, value) {
                    arrRecordsDetail = arrRecordsDetail.concat(JSON.parse(value).recordDetail);
                    return true;
                });

                const header = [
                    "Latam - MX Transaction Reference",
                    "Type",
                    "Latam - MX Subsidiary",
                    "Latam - MX Pedimento Item",
                    "Latam - MX Pedimento Quantity",
                    "Latam - MX Pedimento Location",
                    "New Latam - MX Pedimento Quantity",
                    "Internalid",
                    "Latam - MX Nro Pedimento",
                    "Latam - MX Pedimento Date",
                    "Latam - MX Aduana",
                    "Latam - MX Source Transaction Reference",
                    "Latam - MX Date",
                    "Latam - MX Pedimento EI"
                ]


                const jsonPedimentos = getPedimentos();
                //log.error("jsonPedimentos",jsonPedimentos)
                const jsonData = getData();
                const addPedimentos = []
                //log.error("jsonData",jsonData)
                //log.error("arrRecordsDetail",arrRecordsDetail)
                log.error("arrRecordsDetail LENGTH",arrRecordsDetail.length)
                arrRecordsDetail.forEach(transaction => {
                    const { id, itemID, locationID ,location,item} = transaction;
                    const key = id + "-" + locationID + "-" + itemID;
                    const keyData = location.trim() + "|" + item.trim();
                    if (jsonPedimentos[key] && jsonPedimentos[key].length) {
                        //log.error("jsonPedimentos[key] 2",jsonPedimentos[key])
                        transaction.pedimentos = jsonPedimentos[key][0].quantity || 0;
                        transaction.internalidPedimento = jsonPedimentos[key][0].internalid;

                        transaction.correlativo = jsonPedimentos[key][0].correlativo;
                        transaction.date = jsonPedimentos[key][0].date;
                        transaction.aduana = jsonPedimentos[key][0].aduana;
                        transaction.referenceSource = jsonPedimentos[key][0].referenceSource;
                        transaction.trandate = jsonPedimentos[key][0].trandate;
                        transaction.ei = jsonPedimentos[key][0].ei;
                        jsonPedimentos[key][0].revised = true;
                        if (jsonPedimentos[key].length>1 ) {
                            for (let i = 1; i < jsonPedimentos[key].length; i++) {
                                const addline = JSON.parse(JSON.stringify(transaction))
                                addline.pedimentos = jsonPedimentos[key][i].quantity || 0;
                                addline.internalidPedimento = jsonPedimentos[key][i].internalid;
    
                                addline.correlativo = jsonPedimentos[key][i].correlativo;
                                addline.date = jsonPedimentos[key][i].date;
                                addline.aduana = jsonPedimentos[key][i].aduana;
                                addline.referenceSource = jsonPedimentos[key][i].referenceSource;
                                addline.trandate = jsonPedimentos[key][i].trandate;
                                addline.ei = jsonPedimentos[key][i].ei;
                                addPedimentos.push(addline)
                                jsonPedimentos[key][i].revised = true;
                            }
                        }
                        
                    } else {
                        transaction.pedimentos = 0;
                        transaction.internalidPedimento = "";
                        if (jsonData[keyData]) {
                            //log.error("keyData",keyData)
                            //log.error("jsonData[keyData]",jsonData[keyData])
                            transaction.correlativo = jsonData[keyData].numero || "";
                            transaction.date = jsonData[keyData].trandate || "";
                            transaction.aduana = jsonData[keyData].aduana || "";
                            transaction.referenceSource = "";
                            transaction.trandate = "";
                            transaction.ei = "F";
                        }else{
                            transaction.correlativo = "";
                            transaction.date = "";
                            transaction.aduana = "";
                            transaction.referenceSource = "";
                            transaction.trandate = "";
                            transaction.ei = "F";
                        }
                        
                    }
                    
                });
                /*
                arrRecordsDetail = arrRecordsDetail.concat(addPedimentos);
                //arrRecordsDetail = addPedimentos;
                arrRecordsDetail.sort((a, b) => Number(a.id) - Number(b.id));

                const sumPedimentos = {};
                arrRecordsDetail.forEach(transaction => {
                    const { id, itemID, locationID} = transaction;
                    const key = id + "-" + locationID + "-" + itemID;
                    if (!sumPedimentos[key]) {
                        sumPedimentos[key] = {}
                        sumPedimentos[key].pedimentos = 0;
                        sumPedimentos[key].quantity = transaction.quantity;
                    }

                    sumPedimentos[key].pedimentos += transaction.pedimentos;
                    //sumPedimentos[key].quantity = transaction.quantity;
                });

                
                let arrResult = arrRecordsDetail.filter(transaction => {
                    const { id, itemID, locationID} = transaction;
                    const key = id + "-" + locationID + "-" + itemID;
                    const line = sumPedimentos[key];
                    return line.pedimentos != transaction.quantity
                });
                */
                let pedimentosNotAsign = Object.values(jsonPedimentos).flat();
                log.error("pedimentosNotAsign LENGTH",pedimentosNotAsign.length)
                pedimentosNotAsign = pedimentosNotAsign.filter(pedimento => pedimento.revised == false);
                pedimentosNotAsign = pedimentosNotAsign.map(pedimento => {
                    const objPedimento = {
                        id: pedimento.reference,
                        type: "",
                        subsidiary: "",
                        item: pedimento.item,
                        quantity: "",
                        location: pedimento.location,
                        pedimentos: pedimento.quantity,
                        internalidPedimento: pedimento.internalid,
                        correlativo : pedimento.numero || "",
                        date : pedimento.trandate || "",
                        aduana : pedimento.aduana || "",
                        referenceSource : "",
                        trandate : "",
                        ei : "F"
                    }
                    return objPedimento;
                } )
                
                //arrResult = arrResult.filter(transaction => transaction.quantity != 0);
                //let arrResult = arrRecordsDetail;
                //filter(transaction => transaction.pedimentos == 0); // No tienen pedimentos
                //filter(transaction => transaction.pedimentos != 0 && transaction.pedimentos != transaction.quantity); // inconsistencias
                /*
                arrResult.forEach(transaction => {
                    delete transaction.locationID;
                    delete transaction.itemID;
                });
                */
                /*
                arrResult.forEach(transaction => {
                    record.submitFields({
                        type: "customrecord_lmry_mx_pedimento_details",
                        id: transaction.internalidPedimento,
                        values: {
                            custrecord_lmry_mx_ped_quantity: transaction.quantity
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                            disableTriggers: true
                        }
                    });
                });
                */
                /*
                const deleteped = []
                arrResult.forEach(transaction => {
                    record.delete({
                        type:"customrecord_lmry_mx_pedimento_details",
                        id: transaction.internalidPedimento
                    });
                    deleteped.push(transaction.internalidPedimento)
                });
                log.error("deleteped cant",deleteped.length)
                */
                arrResult = pedimentosNotAsign.map(transaction => Object.values(transaction).join("\t"));


                const title = header.join('\t') + '\n';
                let fileContent = arrResult.map(recordDetail => recordDetail + '\n').join('');
                fileContent = `${title}${fileContent}\r\n`;
                saveFile(fileContent, "lr_ajuste_pedimento.csv", "3101091")



                //log.error("cantiadad filnal de transaccion que tiene tax result", uniqueTransactions.length)

                //log.debug("arrTransactions", arrTransactions)
                
                log.debug("end", "end")
            } catch (error) {
                log.error("error Summarize", error);
                log.error("error Summarize STACK", error.stack);
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

        const getTransactionIDs = () => {
            let jsonData = {};
            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["subsidiary", "anyof", "2"],
                        "AND",
                        ["item.custitem_lmry_mx_pediment", "is", "T"],
                        "AND",
                        ["type", "anyof", "ItemShip", "ItemRcpt", "InvAdjst", "WorkOrd", "InvWksht"],
                        "AND",
                        ["formulatext: CASE WHEN {recordType} = 'itemreceipt' AND {quantity} < 0 THEN 0 ELSE 1 END", "is", "1"],
                        "AND",
                        ["formulatext: CASE WHEN {transferlocation} = {location}  THEN 0 ELSE 1 END", "is", "1"],
                        /*
                        "AND",
                        ["item", "anyof", "7407"],
                        "AND",
                        ["location", "anyof", "19"]
                        
                        */
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "Internal ID"
                        })
                    ]
            });

            let pageData = transactionSearchObj.runPaged({ pageSize: 1000 });
            if (pageData) {
                pageData.pageRanges.forEach(function (pageRange) {
                    let page = pageData.fetch({ index: pageRange.index });
                    page.data.forEach(function (result) {
                        let id = result.getValue(result.columns[0]);
                        jsonData[id] = true;
                    });
                });
            }
            return Object.keys(jsonData);
        }

        const getPedimentos = () => {
            const jsonPedimentos = {}
            const transactionSearchObj = search.create({
                type: "customrecord_lmry_mx_pedimento_details",
                filters:
                    [
                        //["custrecord_lmry_mx_ped_item","anyof","7429"]
                    ],
                columns:
                    [
                        "custrecord_lmry_mx_ped_quantity",//0
                        "custrecord_lmry_mx_ped_item",//1
                        "custrecord_lmry_mx_ped_location",//2
                        "custrecord_lmry_mx_ped_trans",//3
                        "internalid",//4
                        "custrecord_lmry_mx_ped_num",//5
                        "custrecord_lmry_mx_ped_date",//6
                        "custrecord_lmry_mx_ped_aduana",//7
                        "custrecord_lmry_mx_ped_trans_ref",//8
                        "custrecord_lmry_date",//9
                        "custrecord_lmry_mx_ped_ei"
                    ]
            })

            let pageData = transactionSearchObj.runPaged({ pageSize: 1000 });
            if (pageData) {
                pageData.pageRanges.forEach(function (pageRange) {
                    let page = pageData.fetch({ index: pageRange.index });
                    page.data.forEach(function (result) {
                        const itemID = result.getValue(result.columns[1]);
                        const locationID = result.getValue(result.columns[2]);
                        const transactionID = result.getValue(result.columns[3]);
                        const key = transactionID + "-" + locationID + "-" + itemID;
                        const unitPedimento = {}
                        if (!jsonPedimentos[key]) {
                            jsonPedimentos[key] = []
                        }
                        
                        unitPedimento.quantity = parseFloat(result.getValue(result.columns[0]));
                        unitPedimento.internalid = result.getValue(result.columns[4])|| "";
                        unitPedimento.correlativo = result.getValue(result.columns[5]) || "";
                        unitPedimento.date = result.getValue(result.columns[6]) || "";
                        unitPedimento.aduana = result.getText(result.columns[7]) || "";
                        unitPedimento.referenceSource = result.getValue(result.columns[8]) || "";
                        unitPedimento.reference = result.getValue(result.columns[3]) || "";
                        unitPedimento.trandate = result.getValue(result.columns[9]) || "";
                        unitPedimento.ei = isValid(result.getValue(result.columns[10]));
                        unitPedimento.item = result.getText(result.columns[1]);
                        unitPedimento.location = result.getText(result.columns[2]);
                        unitPedimento.revised = false;
                        jsonPedimentos[key].push(unitPedimento);
                    });
                });
            }
            return jsonPedimentos;
        }
        const isValid = (check) =>{
            return check === true || check === "T" ? "T" :"F";
        }
        const idsWithoutPedimentos = (ids) => {
            let jsonData = {};
            var transactionSearchObj = search.create({
                type: "customrecord_lmry_mx_pedimento_details",
                filters:
                    [
                        ["custrecord_lmry_mx_ped_trans", "anyof", ids]
                    ],
                columns:
                    ["custrecord_lmry_mx_ped_trans"]
            });
            let pageData = transactionSearchObj.runPaged({ pageSize: 1000 });
            if (pageData) {
                pageData.pageRanges.forEach(function (pageRange) {
                    let page = pageData.fetch({ index: pageRange.index });
                    page.data.forEach(function (result) {
                        let id = result.getValue(result.columns[0]);
                        jsonData[id] = true;
                    });
                });
            }

            const set = new Set(Object.keys(jsonData));

            return ids.filter(id => !set.has(id))

        }

        const existPedimento = (idTransaction, itemId, locationId) => {
            let quantity = 0;
            search.create({
                type: "customrecord_lmry_mx_pedimento_details",
                filters:
                    [
                        ["custrecord_lmry_mx_ped_trans", "anyof", idTransaction],
                        "AND",
                        ["custrecord_lmry_mx_ped_item", "anyof", itemId],
                        "AND",
                        ["custrecord_lmry_mx_ped_location", "anyof", locationId]
                    ],
                columns:
                    ["custrecord_lmry_mx_ped_quantity"]
            }).run().each(result => {
                quantity += parseFloat(result.getValue(result.columns[0]));
                return true;
            });

            return quantity;
        }

        const getTransactionDetails = (id) => {
            let recordDetails = [];
            //let recordDetailsJson = []
            var transactionSearchObj = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["subsidiary", "anyof", "2"],
                        "AND",
                        ["item.custitem_lmry_mx_pediment", "is", "T"],
                        "AND",
                        ["type", "anyof", "ItemShip", "ItemRcpt", "InvAdjst", "WorkOrd", "InvWksht"],
                        "AND",
                        ["formulatext: CASE WHEN {recordType} = 'itemreceipt' AND {quantity}< 0 THEN 0 ELSE 1 END", "is", "1"],
                        "AND",
                        ["formulatext: CASE WHEN {transferlocation} = {location}  THEN 0 ELSE 1 END", "is", "1"],
                        "AND",
                        ["internalid", "anyof", id]
                        /*
                        "AND",
                        ["item", "anyof", "7081"],
                        "AND",
                        ["location", "anyof", "19"]
                        
                        */
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "Internal ID"
                        }),
                        search.createColumn({
                            name: "type",
                            summary: "GROUP",
                            label: "Type"
                        }),
                        search.createColumn({
                            name: "subsidiary",
                            summary: "GROUP",
                            label: "Latam - MX Subsidiary"
                        }),
                        search.createColumn({
                            name: "item",
                            summary: "GROUP",
                            label: "Latam - MX Pedimento Item"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: "CASE WHEN {recordType} = 'itemfulfillment' THEN -{inventoryDetail.quantity} ELSE {inventoryDetail.quantity} END",
                            label: "Formula (Numeric)"
                        }),
                        search.createColumn({
                            name: "location",
                            summary: "GROUP",
                            label: "Latam - MX Pedimento Location"
                        })
                    ]
            });
            let pageData = transactionSearchObj.runPaged({ pageSize: 1000 });
            if (pageData) {
                pageData.pageRanges.forEach(function (pageRange) {
                    let page = pageData.fetch({ index: pageRange.index });
                    page.data.forEach(function (result) {
                        const { getValue, getText, columns } = result;
                        const gv = (i) => getValue(columns[i]);
                        const gt = (i) => getText(columns[i]);
                        const transaction = {
                            id: gv(0),
                            type: gt(1),
                            subsidiary: gt(2),
                            item: gt(3),
                            quantity: Number(gv(4)),
                            location: gt(5),
                            itemID: gv(3),
                            locationID: gv(5)
                            //pedimentos: existPedimento(id,gv(3),gv(5))
                        }
                        recordDetails.push(transaction)
                    });
                });
            }

            return recordDetails;
        }
        const getData = () => {
            const csvFile = file.load({
                id: '5582594'
            });

            const csvContent = csvFile.getContents();
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
            let headers = lines[0].split('\t');
            log.error("headers",headers)
            // Recorre las líneas restantes
            for (let i = 1; i < lines.length; i++) {
                let line = lines[i].trim();
                // Si la línea está vacía, la omite
                if (line === '') {
                    continue;
                }

                // Separa los valores de la línea
                let values = line.split('\t');
                let obj = {};

                // Crea un objeto asignando cada valor a su respectivo encabezado
                for (let j = 0; j < headers.length; j++) {
                    // Si lo deseas, aquí puedes transformar el nombre de la propiedad
                    // Ejemplo: headers[j].trim().toLowerCase() para usar minúsculas
                    obj[headers[j].trim()] = values[j] ? values[j].trim() : '';
                }

                result.push(obj);
            }
            const jsonData = {};
            result.forEach(line =>{
                const {item,location} = line;

                const key = location + "|" + item
                jsonData[key] = line;
            })
            return jsonData;
        }

        const getInfoData = (transaction) => {

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
                columns: [
                    'internalid',
                    'tranid',
                    'entity',
                    'applyingTransaction.type',
                    'applyingTransaction.fxamount',
                    'applyingTransaction.tranid',
                    'applyingTransaction.internalid',
                    'applyingTransaction.memo',
                    'applyingTransaction.exchangerate',
                    'subsidiary',
                    'applyingTransaction.entity', //10
                    'applyingTransaction.currency', //11
                    'applyingTransaction.postingperiod', //12
                    'applyingTransaction.trandate', //13
                    'applyingTransaction.department', //14
                    'applyingTransaction.class', //15
                    'applyingTransaction.location', //16
                ]
            }).run().each(result => {
                //log.debug("result", result)
                const { getValue, getText, columns } = result;
                let internalid = getValue("internalid");

                objTransaction[internalid].tranid_new = getValue('tranid');
                objTransaction[internalid].entity = getValue('entity');
                objTransaction[internalid].subsidiary = getValue('subsidiary');
                let ObjApply = {
                    type: getText(columns[3]),
                    amount: getValue(columns[4]),
                    tranid: getValue(columns[5]),
                    internalid: getValue(columns[6]),
                    memo: getValue(columns[7]),
                    exchangerate: getValue(columns[8]),

                    customer: getValue(columns[10]),
                    currency: getText(columns[11]),
                    period: getText(columns[12]),
                    date: getValue(columns[13]),
                    department: getText(columns[14]),
                    "class": getText(columns[15]),
                    location: getText(columns[16]),
                    subsidiary: getValue('subsidiary'),
                    subsidiaryName: getText('subsidiary')
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
                    //log.debug("result", result)
                    const { getValue, getText, columns } = result;

                    if (getValue(columns[1])) {
                        taxResult.push(getValue(columns[1]));
                    }
                    return true;
                })
            }

            objTransaction[transaction.internalid].statusTaxResult = taxResult.length != 0;
            //objTransaction[transaction.internalid].taxResult = taxResult;

            //log.debug("taxResult",taxResult)
            //log.debug("objTransaction",objTransaction)
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

        function getSetupTaxSubsidiary(idSubsidiary) {
            var setupTaxSubsidiary = {};
            if (idSubsidiary) {
                var search_setup = search.create({
                    type: 'customrecord_lmry_setup_tax_subsidiary',
                    filters: [
                        ['custrecord_lmry_setuptax_subsidiary', 'anyof', idSubsidiary], 'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'internalid', 'custrecord_lmry_setuptax_form_custpaymt', 'custrecord_lmry_setuptax_form_journal', 'custrecord_lmry_setuptax_form_creditmemo',
                        'custrecord_lmry_setuptax_reclass_subtyps', "custrecord_lmry_setuptax_form_invoice", "custrecord_lmry_setuptax_br_document", "custrecord_lmry_setuptax_currency",
                        "custrecord_lmry_setuptax_br_tax_code", "custrecord_lmry_br_ar_interes_item", "custrecord_lmry_br_ar_multa_item", "custrecord_lmry_setuptax_br_full_wht_sal"
                    ]
                });

                var results = search_setup.run().getRange(0, 10);
                if (results && results.length) {
                    setupTaxSubsidiary["currency"] = results[0].getValue("custrecord_lmry_setuptax_currency") || "";
                    setupTaxSubsidiary['paymentform'] = results[0].getValue('custrecord_lmry_setuptax_form_custpaymt') || '';
                    setupTaxSubsidiary['journalform'] = results[0].getValue('custrecord_lmry_setuptax_form_journal') || '';
                    setupTaxSubsidiary["invoiceform"] = results[0].getValue("custrecord_lmry_setuptax_form_invoice") || "";
                    setupTaxSubsidiary["creditmemoForm"] = results[0].getValue("custrecord_lmry_setuptax_form_creditmemo") || "";
                    setupTaxSubsidiary["document"] = results[0].getValue("custrecord_lmry_setuptax_br_document") || "";
                    setupTaxSubsidiary["taxcode"] = results[0].getValue("custrecord_lmry_setuptax_br_tax_code") || "";
                    setupTaxSubsidiary["interestItem"] = results[0].getValue("custrecord_lmry_br_ar_interes_item") || "";
                    setupTaxSubsidiary["penaltyItem"] = results[0].getValue("custrecord_lmry_br_ar_multa_item") || "";
                    setupTaxSubsidiary["fullwht"] = results[0].getValue("custrecord_lmry_setuptax_br_full_wht_sal");


                    var subtypes = results[0].getValue('custrecord_lmry_setuptax_reclass_subtyps');
                    if (subtypes) {
                        setupTaxSubsidiary['reclassSubtypes'] = subtypes = subtypes.split(/\u0005|\,/g);
                    }
                }
            }

            return setupTaxSubsidiary;
        }

        function setLine(paymentId, accountingBookString, taxresultObj, payment, transaction) {

            /*
            var recordTaxResult = record.copy({
                type: 'customrecord_lmry_br_transaction',
                id: taxresultObj['sourceid'],
                isDynamic: false
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_related_id',
                value: String(paymentId)
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_transaction',
                value: String(paymentId)
            });


            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_base_amount',
                value: round4(taxresultObj['baseAmount'])
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_br_total',
                value: round4(taxresultObj['fxamount'])
            });


            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_total_base_currency',
                value: round4(taxresultObj['amount'])
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_base_amount_local_currc',
                value: taxresultObj['locCurrBaseAmount']
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_amount_local_currency',
                value: taxresultObj['amount']
            });

            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_related_applied_transact',
                value: taxresultObj['idapplytransaction']
            });


            recordTaxResult.setValue({
                fieldId: 'custrecord_lmry_accounting_books',
                value: accountingBookString
            });

            if (taxresultObj["installmentnumber"]) {
                recordTaxResult.setValue({
                    fieldId: "custrecord_lmry_related_installm_num",
                    value: taxresultObj["installmentnumber"]
                });
            }

            
            const setValue = ({fieldId,value}) => {
                
            }

            */
            return `${String(transaction)}\t${String(payment.tranid)}\t${String(paymentId)}\t${String(paymentId)}\t${round4(taxresultObj['baseAmount'])}\t${round4(taxresultObj['fxamount'])}\t${round4(taxresultObj['amount'])}\t${taxresultObj['locCurrBaseAmount']}\t${taxresultObj['amount']}\t${taxresultObj['idapplytransaction']}\t${accountingBookString}${taxresultObj["installmentnumber"] ? `\t${taxresultObj["installmentnumber"]}` : ''}`;

        }

        function setLinesJournal(generatedJournal) {
            const linesBuild = []
            const { subsidiary, trandate, currency, exchangerate, custbody_lmry_reference_transaction, memo, postingperiod, department, class_, location, lines } = generatedJournal;
            const extractLastSegment = input => input.split(':').pop().trim();
            linesBuild.push(`${String(extractLastSegment(subsidiary))}\t${String(trandate)}\t${String(currency)}\t${String(exchangerate)}\t${String(custbody_lmry_reference_transaction)}\t${String(memo)}\t${String(postingperiod)}\t${String(department)}\t${String(class_)}\t${String(location)}`)
            //log.error("lines",lines);
            lines.forEach((line) => {
                const { account, memo, department, class_, location, debit, credit } = line;

                linesBuild.push(
                    `${""}\t${""}\t${""}\t${""}\t${""}\t${""}\t${""}\t${""}\t${""}\t${""}\t${account}\t${debit || ""}\t${credit || ""}\t${memo}\t${department}\t${class_}\t${location}`
                );
            })
            return linesBuild;
        }

        function round4(num) {
            var e = (num >= 0) ? 1e-6 : -1e-6;
            return parseFloat(Math.round(parseFloat(num) * 1e4 + e) / 1e4);
        }

        const getName = (obj) => {
            return {
                "custrecord_lmry_br_related_id": "Latam - Related ID",
                "custrecord_lmry_br_transaction": "Latam - Related Transaction",
                "custrecord_lmry_br_type": "Latam - Sub Type",
                "custrecord_lmry_base_amount": "Latam - Base Amount",
                "custrecord_lmry_br_total": "Latam - Total",
                "custrecord_lmry_total_base_currency": "Latam - Total Base Currency",
                "custrecord_lmry_br_percent": "Latam - Percentage",
                "custrecord_lmry_total_item": "Latam - Total / Line",
                "custrecord_lmry_item": "Latam - Item",
                "custrecord_lmry_account": "Latam - Expense Account",
                "custrecord_lmry_ccl": "Latam - Contributory Class",
                "custrecord_lmry_ntax": "Latam - National Tax",
                "custrecord_lmry_br_ccl": "Latam - ID Contributory Class",
                "custrecord_lmry_tax_description": "Latam - Description",
                "custrecord_lmry_accounting_books": "Latam - Accounting Books",
                "custrecord_lmry_ec_wht_taxcode": "Latam - EC Cod. Retencion Impuesto",
                "custrecord_lmry_ec_rate_rpt": "Latam - EC Rate RPT",
                "custrecord_lmry_tax_type": "Latam - Tax Type",
                "custrecord_lmry_reversed": "Latam - Reversed",
                "custrecord_lmry_created_from_script": "Latam - Created from Script",
                "custrecord_lmry_br_type_id": "Latam - Sub Type List",
                "custrecord_lmry_lineuniquekey": "Latam - Line Unique Key",
                "custrecord_lmry_pe_amount_exceeded": "Latam - PE Amount Exceeded",
                "custrecord_lmry_tax_rate": "Latam - Tax Rate",
                "custrecord_lmry_ste_tax_type_result": "Latam - STE Tax Type",
                "custrecord_lmry_ste_tax_code_result": "Latam - STE Tax Code",
                "custrecord_lmry_br_id_receita": "Latam - BR Id Receita",
                "custrecord_lmry_br_receta": "Latam - BR Receita",
                "custrecord_lmry_br_period_receta": "Latam - BR Id Periodicity",
                "custrecord_lmry_br_tax_nature_revenue": "Latam BR - Nature of Revenue",
                "custrecord_lmry_br_tax_naturerevenue_cod": "Latam BR - Nature of Revenue Code",
                "custrecord_lmry_br_tax_taxsituation": "Latam BR - Tax Situation",
                "custrecord_lmry_br_tax_taxsituation_cod": "Latam BR - Tax Situation Code",
                "custrecord_lmry_br_id_tribute": "Latam - BR Tribute Id",
                "custrecord_lmry_br_base_calc_credit": "Latam - BR Base of Credit Calculate",
                "custrecord_lmry_br_base_credit_code": "Latam - BR Base of Credit Calculate Code",
                "custrecord_lmry_br_item_type": "Latam - BR Item Type",
                "custrecord_lmry_br_item_type_code": "Latam - BR Item Type Code",
                "custrecord_lmry_br_regimen_asoc_catalog": "Latam BR - Catalog Associated Regimen",
                "custrecord_lmry_br_regimen_asoc_cat_code": "Latam BR - Catalog Associated Regimen Code",
                "custrecord_lmry_br_val_cust_exp": "Latam - BR Value of Customs Expenditure",
                "custrecord_lmry_br_finan_trans": "Latam - BR Financial Transaction Tax Amo",
                "custrecord_lmry_br_subtype_code": "Latam - BR Sub Type Code",
                "custrecord_lmry_br_operacion_veh": "Latam - BR Type of Operation Vehicle",
                "custrecord_lmry_br_cnpj_concesionaria": "Latam - BR CNPJ Concessionaire",
                "custrecord_lmry_related_applied_transact": "Latam - BR Related Applied Transaction",
                "custrecord_lmry_related_installm_num": "Latam - BR Related Installment Number",
                "custrecord_lmry_discount_amt": "Latam - Discount amount",
                "custrecord_lmry_gross_amt": "Latam - Gross Amount Item",
                "custrecord_lmry_br_difal_alicuota": "Latam - BR Alicuota ICMS Origen",
                "custrecord_lmry_br_difal_alicuota_des": "Latam - BR Alicuota ICMS Destination",
                "custrecord_lmry_br_apply_report": "Latam - BR Aplica Libro Legal",
                "custrecord_lmry_br_is_import_tax_result": "Latam - BR Is Import Tax?",
                "custrecord_lmry_br_base_no_tributada": "Latam BR - Base No Tributada",
                "custrecord_lmry_is_substitution_tax_resu": "Latam BR - Is Tax Substitution?",
                "custrecord_lmry_res_fa_tax_rate": "Latam - BR FA Tax Rate",
                "custrecord_lmry_res_fixasset": "Latam - BR Fixed Asset",
                "custrecord_lmry_is_export_tax_result": "Latam - BR Is Export Tax?",
                "custrecord_lmry_br_tr_document_type": "Latam BR - Fiscal Document Type",
                "custrecord_lmry_br_icms_op": "Latam - BR ICMS Operation",
                "custrecord_lmry_br_icms_dif": "Latam - BR ICMS Deferred",
                "custrecord_lmry_br_icms_dif_perc": "Latam - BR Percentage of Deferred ICMS",
                "custrecord_lmry_br_apply_reinf": "Latam - BR Apply REINF",
                "custrecord_lmry_br_positem": "Latam - Item / Expense Position",
                "custrecord_lmry_br_taxcalc_rsp": "Latam - BR Tax Calculator Response",
                "custrecord_lmry_base_amount_local_currc": "Latam - Base Amount Local Currency",
                "custrecord_lmry_amount_local_currency": "Latam - Amount Local Currency",
                "custrecord_lmry_gross_amt_local_curr": "Latam - Gross Amt Local Currency",
                "custrecord_lmry_discount_amt_local_curr": "Latam - Discount Amt Local Currency",
                "custrecord_lmry_br_difal_amount": "Latam - BR Difal Amount",
                "custrecord_lmry_base_no_tributad_loc_cur": "Latam - Base No Tributada Local Currency",
                "custrecord_lmry_res_fa_tax_amount": "Latam - BR FA Tax Amount",
                "custrecord_lmry_pe_amount_exceeded_local": "Latam - PE Amount Exceeded Local Currency",
                "custrecord_lmry_remaining_amt_local_cr": "Latam - Local Amount Remaining",
                "custrecord_lmry_co_wht_applied": "Latam - Retention Applied",
                "custrecord_lmry_co_date_wht_applied": "Latam - Date Retention Applied",
                "custrecord_lmry_co_acc_exo_concept": "Latam - Account Exogenous Concept"
            }

        }

        function getReclassWhtTaxResults(idInvoice, installmentNumber, amountPaid, firstPayment, setupTax, localExchangeRate) {
            var paymentTaxResults = [];
            var key = idInvoice;
            if (installmentNumber) {
                key = idInvoice + '-' + installmentNumber;
            }

            var reclassSubtypes = setupTax.reclassSubtypes;
            var fullwht = setupTax.fullwht;

            if (reclassSubtypes && reclassSubtypes.length) {


                var invoiceWhtTaxResults = getWhtTaxResults(idInvoice, reclassSubtypes);


                if (invoiceWhtTaxResults.length) {
                    //var accountingbooks = getPaymentAccountingBooks(idPayment);
                    var invoiceObj = getInvoiceAmounts(idInvoice);


                    var totalInvoice = invoiceObj["total"];
                    var whtTotal = invoiceObj["whtAmount"];
                    var partialAmount = invoiceObj["total"];
                    var partialWhtAmount = invoiceObj["whtAmount"];

                    var iFactorAmount = 1, iFactorBase = 1;

                    var factor = 1;

                    //Si es primer pago y el check se encuentra activo se crea tax results por monto total de retención
                    if (fullwht) {
                        if (firstPayment && !firstPayment.hasOwnProperty(key)) {
                            //Segundo pago con check activado, no se crea tax results

                            return false;
                        }
                    } else {
                        // Se obtiene el factor de prorrateo para pagos parciales

                        if (installmentNumber && invoiceObj[String(installmentNumber)]) {
                            partialAmount = invoiceObj[String(installmentNumber)]["total"];
                            partialWhtAmount = invoiceObj[String(installmentNumber)]["whtAmount"];
                            var installmentAmount = invoiceObj[String(installmentNumber)]["total"];
                            var installmentWHT = invoiceObj[String(installmentNumber)]["whtAmount"];
                            iFactorBase = installmentAmount / totalInvoice;
                            iFactorAmount = installmentWHT / whtTotal;

                        }

                        var amountRemaining = round2(parseFloat(partialAmount) - parseFloat(partialWhtAmount));



                        if (parseFloat(amountPaid) != parseFloat(amountRemaining)) {
                            factor = parseFloat(amountPaid) / parseFloat(amountRemaining);
                        }
                    }



                    for (var i = 0; i < invoiceWhtTaxResults.length; i++) {

                        //Montos en moneda transaccion
                        var baseAmount = invoiceWhtTaxResults[i].baseAmount || 0.00;
                        baseAmount = parseFloat(baseAmount);
                        baseAmount = baseAmount * iFactorBase * factor;

                        var whtAmount = invoiceWhtTaxResults[i].fxamount || 0.00;
                        whtAmount = parseFloat(whtAmount);
                        whtAmount = whtAmount * iFactorAmount * factor;

                        var localCurBaseAmt = baseAmount;
                        var localCurrAmt = whtAmount;

                        if (localExchangeRate != 1) {
                            localCurBaseAmt = round2(baseAmount) * localExchangeRate;
                            localCurrAmt = round2(whtAmount) * localExchangeRate;
                        }

                        var taxresultObj = {
                            'sourceid': invoiceWhtTaxResults[i]['internalid'],
                            'subtype': invoiceWhtTaxResults[i]['subtype'],
                            'subtypeid': invoiceWhtTaxResults[i]['subtypeid'],
                            'baseAmount': baseAmount,
                            'fxamount': whtAmount,
                            'amount': localCurrAmt,
                            'locCurrBaseAmount': localCurBaseAmt,
                            //'idtransaction': idPayment,
                            'idapplytransaction': idInvoice,
                            //'accountingbooks': accountingbooks,
                            "installmentnumber": installmentNumber,
                            "iditem": invoiceWhtTaxResults[i]["iditem"],
                            "taxItem": invoiceWhtTaxResults[i]["taxitem"],
                        };


                        paymentTaxResults.push(taxresultObj);
                        //savePaymentTaxResult(taxresultObj);
                    }
                }
            }

            return paymentTaxResults;
        }
        function round2(num) {
            var e = (num >= 0) ? 1e-6 : -1e-6;
            return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
        }
        function getWhtTaxResults(idtransaction, subtypes) {
            var taxresults = [];
            var search_taxresults = search.create({
                type: 'customrecord_lmry_br_transaction',
                filters: [
                    ['isinactive', 'is', 'F'], 'AND',
                    ['custrecord_lmry_br_transaction', 'anyof', idtransaction], 'AND',
                    ['custrecord_lmry_tax_type', 'anyof', "1"], 'AND',
                    ['custrecord_lmry_br_type_id', 'anyof', subtypes], "AND",
                    ["custrecord_lmry_is_export_tax_result", "is", "F"], "AND",
                    [
                        ["custrecord_lmry_ccl.custrecord_lmry_ccl_wht_tax_point", "anyof", ["@NONE@", "1"]], "OR",
                        ["custrecord_lmry_ntax.custrecord_lmry_ntax_wht_tax_point", "anyof", ["@NONE@", "1"]] //Retencion aplicado a la factura
                    ]
                ],
                columns: [
                    'internalid', 'custrecord_lmry_br_type_id', 'custrecord_lmry_base_amount', 'custrecord_lmry_br_total',
                    'custrecord_lmry_total_base_currency', 'custrecord_lmry_base_amount_local_currc', 'custrecord_lmry_amount_local_currency',
                    'custrecord_lmry_br_percent', 'custrecord_lmry_ccl', 'custrecord_lmry_ntax', 'custrecord_lmry_item',
                    search.createColumn({
                        name: "custrecord_lmry_ar_ccl_taxitem",
                        join: "CUSTRECORD_LMRY_CCL"
                    }),
                    search.createColumn({
                        name: "custrecord_lmry_ntax_taxitem",
                        join: "CUSTRECORD_LMRY_NTAX"
                    })
                ]
            });

            var columns = search_taxresults.columns;

            var results = search_taxresults.run().getRange(0, 1000);

            if (results) {
                for (var i = 0; i < results.length; i++) {
                    var typeRecord = 'ccl';
                    var idrecordtax = results[i].getValue('custrecord_lmry_ccl') || '';
                    var taxitem = results[i].getValue(columns[11]);

                    if (!idrecordtax) {
                        typeRecord = 'ntax';
                        idrecordtax = results[i].getValue('custrecord_lmry_ntax');
                        taxitem = results[i].getValue(columns[12]);
                    }

                    var taxresultObj = {
                        'internalid': results[i].getValue('internalid'),
                        'subtype': results[i].getText('custrecord_lmry_br_type_id'),
                        'subtypeid': results[i].getValue('custrecord_lmry_br_type_id'),
                        'baseAmount': results[i].getValue('custrecord_lmry_base_amount'),
                        'fxamount': results[i].getValue('custrecord_lmry_br_total'),
                        'amount': results[i].getValue('custrecord_lmry_amount_local_currency'),
                        'taxRate': results[i].getValue('custrecord_lmry_br_percent'),
                        'typeRecord': typeRecord,
                        'idRecord': idrecordtax,
                        'locCurrBaseAmount': results[i].getValue('custrecord_lmry_base_amount_local_currc'),
                        'iditem': results[i].getValue('custrecord_lmry_item') || "",
                        'taxitem': taxitem
                    };

                    taxresults.push(taxresultObj);
                }
            }

            return taxresults;
        }

        function getInvoiceAmounts(idInvoice) {
            var invoiceObj = {};

            var columns = [
                "internalid",
                "fxamount",
                "applyingtransaction",
                "applyingTransaction.fxamount"
            ];

            var FEAT_INSTALLMENTS = runtime.isFeatureInEffect({ feature: "installments" });
            if (FEAT_INSTALLMENTS == true || FEAT_INSTALLMENTS == "T") {
                columns.push("installment.installmentnumber", "installment.fxamount");
            }

            var searchWHT = search.create({
                type: "invoice",
                filters:
                    [
                        ["internalid", "anyof", idInvoice], "AND",
                        ["applyingtransaction.type", "anyof", "CustCred"], "AND",
                        //["applyingtransaction.memomain", "startswith", MEMO_WHT], "AND",
                        ["applyingtransaction.custbody_lmry_reference_transaction", "anyof", idInvoice], "AND",
                        ["applyingtransaction.mainline", "is", "T"]
                    ],
                columns: columns,
                settings: [search.createSetting({ name: 'consolidationtype', value: 'NONE' })]
            });

            var results = searchWHT.run().getRange(0, 10);
            if (results && results.length) {
                var total = results[0].getValue("fxamount") || 0.00;
                var whtAmount = results[0].getValue({ name: "fxamount", join: "applyingtransaction" }) || 0.00;
                invoiceObj["total"] = parseFloat(total);
                invoiceObj["whtAmount"] = Math.abs(parseFloat(whtAmount));
                var idCreditMemo = results[0].getValue("applyingtransaction");

                var numberInstallments = 0;
                if (FEAT_INSTALLMENTS == "T" || FEAT_INSTALLMENTS == true) {
                    for (var i = 0; i < results.length; i++) {
                        var installmentNumber = results[i].getValue({ name: "installmentnumber", join: "installment" }) || "";
                        if (installmentNumber) {
                            var installmentTotal = results[i].getValue({ name: "fxamount", join: "installment" }) || 0.00;
                            invoiceObj[String(installmentNumber)] = { "total": parseFloat(installmentTotal) };
                            numberInstallments++;
                        }
                    }
                }

                if (numberInstallments && idCreditMemo) {
                    var whtRecord = record.load({
                        type: "creditmemo",
                        id: idCreditMemo
                    });

                    var numApply = whtRecord.getLineCount({ sublistId: "apply" });

                    for (var i = 0; i < numApply; i++) {
                        var internalid = whtRecord.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
                        var installmentNumber = whtRecord.getSublistValue({ sublistId: "apply", fieldId: "installmentnumber", line: i });
                        var amount = whtRecord.getSublistValue({ sublistId: "apply", fieldId: "amount", line: i }) || 0.00;
                        var isApplied = whtRecord.getSublistValue({ sublistId: "apply", fieldId: "apply", line: i });

                        if ((isApplied == true || isApplied == "T") && installmentNumber && invoiceObj[String(installmentNumber)]) {
                            invoiceObj[String(installmentNumber)]["whtAmount"] = parseFloat(amount);
                        }
                    }
                }
            }

            return invoiceObj;
        }

        function createReclassJournalEntry(idPayment, paymentObj, paymentTaxResults, setupTax, featureGroup) {
            var idjournal = '';
            var reclassSubtypes = setupTax.reclassSubtypes;
            var form = setupTax.journalform;
            var journalRecord = {}
            if (form) {
                if (paymentTaxResults.length) {

                    var FEAT_DPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
                    var FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });
                    var FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });

                    var subsidiary = paymentObj.subsidiary;
                    var subsidiaryName = paymentObj.subsidiaryName;
                    var customer = paymentObj.customer;
                    var currency = paymentObj.currency;
                    var postingperiod = paymentObj.period;
                    var exchangerate = paymentObj.exchangerate;
                    var trandate = paymentObj.date;
                    //trandate = format.parse({ value: trandate, type: format.Type.DATE });
                    var department = paymentObj.department;
                    var class_ = paymentObj["class"];
                    var location = paymentObj.location;


                    //Se obtienen las cuentas de reclasificacion por subtype
                    var reclassAccounts = getReclassAccounts(subsidiary, reclassSubtypes);
                    //log.debug('reclassAccounts', JSON.stringify(reclassAccounts));

                    //Se obtienen las cuentas actuales de retencion por subtype.
                    var subtypeAccounts = getSubtypeAccounts(paymentTaxResults);
                    //log.debug('subtypeAccounts', JSON.stringify(subtypeAccounts));

                    if (Object.keys(reclassAccounts).length && Object.keys(subtypeAccounts).length) {


                        journalRecord["customform"] = form;
                        journalRecord["subsidiary"] = subsidiaryName;
                        journalRecord["trandate"] = trandate;
                        journalRecord["currency"] = currency;
                        journalRecord["exchangerate"] = exchangerate;
                        journalRecord["custbody_lmry_reference_transaction"] = paymentObj.tranid;
                        journalRecord["custbody_lmry_reference_transaction_id"] = idPayment;
                        journalRecord["memo"] = 'Reclassification - WHT';

                        if (postingperiod) {
                            journalRecord["postingperiod"] = postingperiod;
                        }

                        if ((FEAT_DPT == "T" || FEAT_DPT == true)) {
                            journalRecord["department"] = department;
                        }

                        if ((FEAT_CLASS == "T" || FEAT_CLASS == true)) {
                            journalRecord["class_"] = class_;
                        }

                        if ((FEAT_LOC == "T" || FEAT_LOC == true)) {
                            journalRecord["location"] = location;
                        }

                        var approvalFeature = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });

                        if (approvalFeature) {
                            journalRecord["approvalstatus"] = 2;
                        }


                        var whtLines = [];

                        paymentTaxResults.forEach(function (tr) {
                            var subType = tr.subtypeid;
                            var whtAmount = tr.fxamount || 0.00;
                            var invoiceId = tr.idapplytransaction;

                            var memo = tr.subtype + ' (Reclassification - WHT) -' + invoiceId;

                            if (tr.installmentnumber) {
                                memo = memo + "-" + tr.installmentnumber;
                            }

                            var whtLineObj = null;

                            if (featureGroup) {
                                var foundLines = whtLines.filter(function (line) {
                                    return line.subType == subType;
                                });
                                whtLineObj = foundLines[0];

                                if (whtLineObj) {
                                    whtLineObj.whtAmount = whtLineObj.whtAmount + whtAmount;
                                } else {
                                    whtLines.push({
                                        whtAmount: whtAmount,
                                        subType: subType,
                                        memo: memo,
                                        invoiceId: invoiceId
                                    });
                                }
                            } else {
                                whtLines.push({
                                    whtAmount: whtAmount,
                                    subType: subType,
                                    memo: memo,
                                    invoiceId: invoiceId
                                });
                            }

                        });

                        journalRecord["lines"] = [];
                        whtLines.forEach(function (line) {
                            var subtype = line.subType;
                            var invoiceId = line.invoiceId;
                            var memo = line.memo;

                            if (subtypeAccounts[String(subtype)] && reclassAccounts[String(subtype)]) {
                                var accountcredit = subtypeAccounts[String(subtype)];
                                var accountdebit = reclassAccounts[String(subtype)]['account'];
                                if (accountcredit && accountdebit) {
                                    var amount = line.whtAmount;
                                    amount = round2(amount);
                                    if (amount) {
                                        //Credit


                                        let line = {};
                                        line['account'] = getNameAccount(accountcredit);
                                        line['credit'] = amount;
                                        line['custcol_lmry_pe_transaction_reference'] = invoiceId;
                                        line['memo'] = memo;

                                        if ((FEAT_DPT == "T" || FEAT_DPT == true) && department) {
                                            line['department'] = department;

                                        }
                                        if ((FEAT_CLASS == "T" || FEAT_CLASS == true) && class_) {
                                            line['class_'] = class_;
                                        }

                                        if ((FEAT_LOC == "T" || FEAT_LOC == true) && location) {
                                            line['location'] = location;
                                        }
                                        //journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accountcredit });
                                        //journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: amount });
                                        //journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_pe_transaction_reference', value: invoiceId });
                                        //journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: memo });
                                        /*
                                        if ((FEAT_DPT == "T" || FEAT_DPT == true) && department) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: department });
                                        }
                                        
                                        if ((FEAT_CLASS == "T" || FEAT_CLASS == true) && class_) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: class_ });
                                        }
                                        
                                        if ((FEAT_LOC == "T" || FEAT_LOC == true) && location) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: location });
                                        }
                                       
                                        journalRecord.commitLine({ sublistId: 'line' });
                                         */

                                        journalRecord["lines"].push(line);
                                        // Debit
                                        line = {};
                                        line['account'] = getNameAccount(accountdebit);
                                        line['debit'] = amount;
                                        line['custcol_lmry_pe_transaction_reference'] = invoiceId;
                                        line['memo'] = memo;

                                        if ((FEAT_DPT == "T" || FEAT_DPT == true) && department) {
                                            line['department'] = department;
                                        }

                                        if ((FEAT_CLASS == "T" || FEAT_CLASS == true) && class_) {
                                            line['class_'] = class_;
                                        }

                                        if ((FEAT_LOC == "T" || FEAT_LOC == true) && location) {
                                            line['location'] = location;
                                        }
                                        journalRecord["lines"].push(line);

                                        //Debit
                                        /*
                                        journalRecord.selectNewLine({ sublistId: 'line' });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accountdebit });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: amount });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_pe_transaction_reference', value: invoiceId });
                                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: memo });

                                        if ((FEAT_DPT == "T" || FEAT_DPT == true) && department) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: department });
                                        }

                                        if ((FEAT_CLASS == "T" || FEAT_CLASS == true) && class_) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: class_ });
                                        }

                                        if ((FEAT_LOC == "T" || FEAT_LOC == true) && location) {
                                            journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: location });
                                        }

                                        journalRecord.commitLine({ sublistId: 'line' });
                                        */

                                    }
                                }
                            }

                        });

                        /*
                        var FEAT_MULTIBOOK = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });
                        if (FEAT_MULTIBOOK == true || FEAT_MULTIBOOK == "T") {
                            var accountingBooks = paymentObj["books"];
                            var numBooks = journalRecord.getLineCount({ sublistId: "accountingbookdetail" });
                            for (var i = 0; i < numBooks; i++) {
                                journalRecord.selectLine({ sublistId: "accountingbookdetail", line: i });
                                var bookId = journalRecord.getCurrentSublistValue({ sublistId: "accountingbookdetail", fieldId: "bookid" });
                                bookId = String(bookId);
                                if (accountingBooks.hasOwnProperty(bookId) && accountingBooks[bookId].exchangeRate) {
                                    var bookExchangeRate = accountingBooks[bookId].exchangeRate;
                                    bookExchangeRate = parseFloat(bookExchangeRate);
                                    journalRecord.setCurrentSublistValue({ sublistId: "accountingbookdetail", fieldId: "exchangerate", value: bookExchangeRate });
                                }
                            }
                        }

                       

                        if (journalRecord.getLineCount({ sublistId: "line" })) {
                            idjournal = journalRecord.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true,
                                disableTriggers: true
                            });
                        }
                             */
                    }
                }
            }

            return journalRecord;
        }

        function getNameAccount(idAccount) {
            try {
                var accountData = search.lookupFields({
                    type: search.Type.ACCOUNT,
                    id: idAccount,
                    columns: ['number', 'name']
                });
                if (accountData) {
                    return `${accountData.number} ${accountData.name}`;
                }
            } catch (error) {
                log.error('Error en getNameAccount', error);
            }

            return null;
        }

        function getReclassAccounts(subsidiary, subtypes) {
            var reclassaccounts = {};
            var filters = [
                ['isinactive', 'is', 'F'], 'AND',
                ['custrecord_lmry_br_wht_reclass_subsi', 'anyof', subsidiary], 'AND',
                ['custrecord_lmry_br_wht_reclass_subtype', 'anyof', subtypes]
            ];

            var search_reclass = search.create({
                type: 'customrecord_lmry_br_wht_reclass_account',
                filters: filters,
                columns: [
                    'internalid',
                    'custrecord_lmry_br_wht_reclass_subtype',
                    'custrecord_lmry_br_wht_reclass_accdeb'
                ]
            });

            var results = search_reclass.run().getRange(0, 1000);

            if (results) {
                for (var i = 0; i < results.length; i++) {
                    var internalid = results[i].getValue('internalid');
                    var subtype = results[i].getValue('custrecord_lmry_br_wht_reclass_subtype');
                    var account = results[i].getValue('custrecord_lmry_br_wht_reclass_accdeb') || '';
                    reclassaccounts[String(subtype)] = { 'internalid': internalid, 'account': account };
                }
            }

            return reclassaccounts;
        }

        function getSubtypeAccounts(taxResults) {
            var subtypeAccounts = {};

            var invoices = [], itemBySubtype = {};

            for (var i = 0; i < taxResults.length; i++) {
                var idInvoice = taxResults[i]["idapplytransaction"];
                var taxItem = taxResults[i]["taxItem"];
                var subtype = taxResults[i]["subtypeid"];

                if (idInvoice && invoices.indexOf(Number(idInvoice)) == -1) {
                    invoices.push(Number(idInvoice));
                }

                if (taxItem && !itemBySubtype[String(subtype)]) {
                    itemBySubtype[String(subtype)] = taxItem;
                }
            }

            //log.debug("invoices", invoices);
            //log.debug('itemBySubtype', JSON.stringify(itemBySubtype));

            if (invoices.length) {
                var searchCreditMemos = search.create({
                    type: "creditmemo",
                    filters: [
                        ["appliedtotransaction", "anyof", invoices], "AND",
                        ["mainline", "is", "T"], "AND",
                        //["memo", "startswith", MEMO_WHT]
                        ["custbody_lmry_reference_transaction", "anyof", invoices]
                    ],
                    columns: ["internalid"]
                });

                var results = searchCreditMemos.run().getRange(0, 1000);

                var idCreditMemos = [];
                for (var i = 0; i < results.length; i++) {
                    var idCreditMemo = results[i].getValue("internalid");
                    if (idCreditMemos.indexOf(Number(idCreditMemo)) == -1) {
                        idCreditMemos.push(Number(idCreditMemo));
                    }
                }

                if (idCreditMemos.length) {
                    var searchAccounts = search.create({
                        type: "creditmemo",
                        filters: [
                            ["internalid", "anyof", idCreditMemos], "AND",
                            ["mainline", "is", "F"], "AND",
                            ["cogs", "is", "F"], "AND",
                            ["taxline", "is", "F"], "AND",
                            ["formulatext: {item.type.id}", "isnot", "ShipItem"], "AND",
                            ["item", "noneof", "@NONE@"]
                        ],
                        columns: [
                            search.createColumn({
                                name: "item",
                                summary: "GROUP"
                            }),
                            search.createColumn({
                                name: "account",
                                summary: "GROUP"
                            })
                        ]
                    });

                    var results = searchAccounts.run().getRange(0, 1000);
                    var columns = searchAccounts.columns;
                    for (var i = 0; i < results.length; i++) {
                        var taxItem = results[i].getValue(columns[0]);
                        var account = results[i].getValue(columns[1]);

                        if (Number(account)) {
                            for (var subType in itemBySubtype) {
                                if (Number(taxItem) == Number(itemBySubtype[subType])) {
                                    subtypeAccounts[String(subType)] = account;
                                }
                            }
                        }
                    }
                }
            }

            return subtypeAccounts;
        }

        return { getInputData, map, summarize };
    });
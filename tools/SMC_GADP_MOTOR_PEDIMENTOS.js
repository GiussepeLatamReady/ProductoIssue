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
    "N/format"
],

    (record, runtime, search, log, format) => {


        const getInputData = (inputContext) => {
            try {
                const transactionsIds = [
                    {
                        itemfulfillmentId: 5279835,
                        creditmemos: ["5504478", "5504596"]
                    }

                    // ,
                    // {
                    //     itemfulfillmentId: 5289009,
                    //     creditmemos: ["5504631"]
                    // },
                    // {
                    //     itemfulfillmentId: 5303210,
                    //     creditmemos: ["5504758", "5504871"]
                    // },
                    // {
                    //     itemfulfillmentId: 5311091,
                    //     creditmemos: ["5504884"]
                    // },
                ];
                return transactionsIds;
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
            log.error("value [map]", value)
            if (value.code === "ERROR") {
                mapContext.write({
                    key: value.code,
                    value: value
                });
            } else {

                const dataObj = value;
                log.error("dataObj", dataObj)
                try {

                    const itemsFulfillment = getItems(dataObj.itemfulfillmentId, false);
                    log.error("itemsFulfillment", itemsFulfillment.length)
                    const itemids = itemsFulfillment.map(item => item.itemid);
                    const pedimentosByItem = getPedimentos_test(itemids, dataObj.itemfulfillmentId);

                    //log.error("pedimentosByItem", pedimentosByItem)

                    const pedimentoDetails = [];
                    let count = 10000;
                    dataObj.creditmemos.forEach(transaction => {
                        const dataTransaction = search.lookupFields({
                            type: "creditmemo",
                            id: transaction,
                            columns: [
                                'subsidiary',
                                'createdfrom',
                                'trandate',
                                'location'
                            ]
                        });
                        const creditmemo = {
                            id:transaction,
                            location: dataTransaction['location'][0]?.value,
                            subsidiary: dataTransaction['subsidiary'][0]?.value
                        }
                        log.error("creditmemo "+ transaction, creditmemo);
                        const items = getItems(transaction, true, "CustCred", creditmemo.location);

                        log.error("items muestra", items.slice(0, 5));
                        log.error("items cantidad", items.length);

                       
                        log.error("items muestra 41352 "+ transaction, items.filter(item => item.itemid == "41352"));
                        
                        for (let i = 0; i < items.length; i++) {
                            const item = items[i];
                            //log.error("item.itemid", item.itemid);
                            const pedimentoList = pedimentosByItem[item.itemid];
                            if (item.itemid == "41352") {
                                log.error("pedimentoList 41352", pedimentoList);
                            }
                            if (!pedimentoList) continue;
                            for (let i = 0; i < pedimentoList.length; i++) {
                                const pedimento = pedimentoList[i];
                                if (Number(pedimento.quantity) == Number(item.quantity)) {
                                    count++;
                                    pedimento.quantity = 0;
                                    const pedimentoUnit = {
                                        id: count + " " + transaction,
                                        custrecord_lmry_mx_ped_trans: transaction,
                                        custrecord_lmry_date: formatDate(item.date),
                                        custrecord_lmry_mx_ped_num: pedimento.num,
                                        custrecord_lmry_mx_ped_date: formatDate(pedimento.dat),
                                        custrecord_lmry_mx_ped_item: item.itemid,
                                        custrecord_lmry_mx_ped_location: creditmemo.location,
                                        custrecord_lmry_mx_ped_quantity: Number(item.quantity),
                                        custrecord_lmry_transaction_id: transaction,
                                        custrecord_lmry_mx_ped_observ: "LR_ADJUSTMENT",
                                        type:"Total"
                                    }
                                    pedimentoDetails.push(pedimentoUnit);
                                    break;
                                }
                                if (Number(pedimento.quantity) > Number(item.quantity)) {
                                    count++;
                                    pedimento.quantity -= Number(item.quantity);
                                    const pedimentoUnit = {
                                        id: count + " " + transaction,
                                        custrecord_lmry_mx_ped_trans: transaction,
                                        custrecord_lmry_date: formatDate(item.date),
                                        custrecord_lmry_mx_ped_num: pedimento.num,
                                        custrecord_lmry_mx_ped_date: formatDate(pedimento.dat),
                                        custrecord_lmry_mx_ped_item: item.itemid,
                                        custrecord_lmry_mx_ped_location: creditmemo.location,
                                        custrecord_lmry_mx_ped_quantity: Number(item.quantity),
                                        custrecord_lmry_transaction_id: transaction,
                                        custrecord_lmry_mx_ped_observ: "LR_ADJUSTMENT",
                                        type:"Pedimentos mayor a transaccion",
                                        pedimento_restante:pedimento.quantity
                                    }
                                    pedimentoDetails.push(pedimentoUnit);
                                    break;
                                }
                                if (Number(pedimento.quantity) < Number(item.quantity) && Number(pedimento.quantity) > 0 ) {
                                    count++;
                                    
                                    const pedimentoUnit = {
                                        id: count + " " + transaction,
                                        custrecord_lmry_mx_ped_trans: transaction,
                                        custrecord_lmry_date: formatDate(item.date),
                                        custrecord_lmry_mx_ped_num: pedimento.num,
                                        custrecord_lmry_mx_ped_date: formatDate(pedimento.dat),
                                        custrecord_lmry_mx_ped_item: item.itemid,
                                        custrecord_lmry_mx_ped_location: creditmemo.location,
                                        custrecord_lmry_mx_ped_quantity: pedimento.quantity,
                                        custrecord_lmry_transaction_id: transaction,
                                        custrecord_lmry_mx_ped_observ: "LR_ADJUSTMENT",
                                        type:"Pedimentos menor a transaccion"
                                    }
                                    pedimento.quantity = 0;
                                    pedimentoDetails.push(pedimentoUnit);
                                }
                            }
                        }
                    })
                    log.error("pedimentoDetails",pedimentoDetails.length)
                    pedimentoDetails.forEach(pedimento => {
                        mapContext.write({
                            key: mapContext.key,
                            value: {
                                code: "OK",
                                pedimento,
                                transactionId: dataObj.itemfulfillmentId
                            }
                        });
                    });

                    /*

                    const itemfulfillmentId = getFulfillment(transactionId);

                    const pedimentosListids = getPedimentoIds(itemfulfillmentId);

                    taxResults.forEach(taxResult => {
                        mapContext.write({
                            key: taxResult.item.lineuniquekey,
                            value: {
                                code: "OK",
                                transaction: transactionId,
                                taxResult
                            }
                        });
                    });           
                    */

                } catch (error) {
                    log.error("Error [map]", error);
                    log.error("Error [map] stack", error.stack);
                    log.error("Error [map] data.id", transactionId.id);
                    transactionId.state = "Error";
                    mapContext.write({
                        key: mapContext.key,
                        value: {
                            code: "ERROR",
                            message: error.message,
                            transactionId: transactionId
                        }
                    });
                }

            }

        }

        const reduce = (reduceContext) => {

            const { values, key } = reduceContext;
            const data = values.map(value => JSON.parse(value));
            // log.error("data [reduce]", data)
            if (data[0].code == "ERROR") {
                reduceContext.write({
                    key: data[0].transactionId,
                    value: {
                        code: "ERROR",
                        message: data[0].message,
                        transaction: data[0].transaction
                    }
                });
            } else {
                try {
                    log.error("Item fullfilment", data[0].transactionId)
                    log.error("pedimentosIDs", data.map(obj => obj.pedimento.id))
                    data.forEach(({ pedimento }) => {
                        log.error("pedimento", pedimento)
                        createPedimentoDetail(pedimento);
                    });
                    /*
                    reduceContext.write({
                        key: data[0].transactionId,
                        value: {
                            code: "OK",
                            transaction: data[0].transactionId
                        }
                    });*/
                } catch (error) {
                    log.error('Error [REDUCE]', error)
                    log.error('Error [REDUCE] id ', data[0].transaction.id)
                    data[0].transaction.state = "Error";
                    reduceContext.write({
                        key: data[0].transactionId,
                        value: {
                            code: "ERROR",
                            message: error.message,
                            transaction: data[0].transactionId
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
                log.error("data [summarize]", data)
                log.error("transactionIDs [summarize]", transactionIDs)
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

        function getPedimentos(item_id, location_id, lote_id, salesOrderID, locationDefault) {

            if (item_id === null || location_id === null) return [];
            let Filter_Pedimento = [];

            let Filter_Item = search.createFilter({
                name: "custrecord_lmry_mx_ped_item",
                operator: search.Operator.IS,
                values: item_id,
            });

            location_id = location_id || locationDefault;

            if (!salesOrderID) {
                let Filter_Location = search.createFilter({
                    name: "custrecord_lmry_mx_ped_location",
                    operator: search.Operator.IS,
                    values: location_id,
                });
                Filter_Pedimento.push(Filter_Location);
            }

            Filter_Pedimento.push(Filter_Item);

            if (lote_id) {
                let Filter_Inventory = search.createFilter({
                    name: "custrecord_lmry_mx_ped_lote_serie",
                    operator: search.Operator.ANYOF,
                    values: lote_id,
                });
                Filter_Pedimento.push(Filter_Inventory);
            }

            if (salesOrderID) {
                let Filter_Inventory = search.createFilter({
                    name: "custrecord_lmry_mx_ped_trans",
                    operator: search.Operator.ANYOF,
                    values: salesOrderID,
                });
                Filter_Pedimento.push(Filter_Inventory);
            }
            let search_pedimento_details = search.create({
                type: "customrecord_lmry_mx_pedimento_details",
                filters: Filter_Pedimento,
                columns: [
                    search.createColumn({
                        name: "custrecord_lmry_mx_ped_num",
                        summary: "GROUP",
                        label: "Latam - MX Nro Pedimento",
                    }),
                    search.createColumn({
                        name: "custrecord_lmry_mx_ped_quantity",
                        summary: "SUM",
                        label: "Latam - MX Pedimento Quantity",
                    }),
                    search.createColumn({
                        name: "custrecord_lmry_mx_ped_date",
                        summary: "GROUP",
                        label: "Latam - MX Pedimento Date",
                        sort: search.Sort.ASC,
                    }),
                    search.createColumn({
                        name: "custrecord_lmry_mx_ped_aduana",
                        summary: "GROUP",
                        label: "Latam - MX Aduana",
                    }),
                ],
            });

            let result_pedimento_details = search_pedimento_details
                .run()
                .getRange(0, 1000);
            return result_pedimento_details;
        }

        function getPedimentos_test(listItems, itemfulfillmentId, location_id) {

            if (!listItems.length) return {};
            let Filter_Pedimento = [];

            let Filter_Item = search.createFilter({
                name: "custrecord_lmry_mx_ped_item",
                operator: search.Operator.ANYOF,
                values: listItems,
            });

            Filter_Pedimento.push(Filter_Item);
            if (location_id) {
                let Filter_Location = search.createFilter({
                    name: "custrecord_lmry_mx_ped_location",
                    operator: search.Operator.IS,
                    values: location_id,
                });
                Filter_Pedimento.push(Filter_Location);
            }


            if (itemfulfillmentId) {
                let Filter_Inventory = search.createFilter({
                    name: "custrecord_lmry_mx_ped_trans",
                    operator: search.Operator.ANYOF,
                    values: itemfulfillmentId,
                });
                Filter_Pedimento.push(Filter_Inventory);
            }
            const pedimentosByItem = {};
            search.create({
                type: "customrecord_lmry_mx_pedimento_details",
                filters: Filter_Pedimento,
                columns: [
                    search.createColumn({
                        name: "custrecord_lmry_mx_ped_num",
                        summary: "GROUP",
                        label: "Latam - MX Nro Pedimento",
                    }),
                    search.createColumn({
                        name: "custrecord_lmry_mx_ped_quantity",
                        summary: "SUM",
                        label: "Latam - MX Pedimento Quantity",
                    }),
                    search.createColumn({
                        name: "custrecord_lmry_mx_ped_date",
                        summary: "GROUP",
                        label: "Latam - MX Pedimento Date",
                        sort: search.Sort.ASC,
                    }),
                    search.createColumn({
                        name: "custrecord_lmry_mx_ped_aduana",
                        summary: "GROUP",
                        label: "Latam - MX Aduana",
                    }),
                    search.createColumn({
                        name: "custrecord_lmry_mx_ped_item",
                        summary: "GROUP",
                        label: "Latam - MX Pedimento Item",
                    })
                ],
            }).run().each(result => {
                const { columns, getValue } = result;
                const pedimento = {
                    num: getValue(columns[0]),
                    quantity: Math.abs(Number(getValue(columns[1]))),
                    dat: getValue(columns[2]),
                    aduana: getValue(columns[3]),
                    item: getValue(columns[4]),
                }
                if (!pedimentosByItem[pedimento.item]) {
                    pedimentosByItem[pedimento.item] = [];
                }
                pedimentosByItem[pedimento.item].push(pedimento);
                return true;
            });

            return pedimentosByItem;
        }
        function getItems(shipmentID, isReceipt, type, locationDefault) {

            let FEAT_INVENTORY = runtime.isFeatureInEffect({ feature: "advbinseriallotmgmt" });
            const listItems = [];
            //Filtro por transacción
            let Filter_Trans = search.createFilter({ name: 'internalid', operator: search.Operator.ANYOF, values: shipmentID });

            /* Busqueda personalizada LatamReady - MX Pediment Lines*/
            // Devuelve las líneas de item de las transacciones que cuentan con check activado de pedimento
            let search_items_ped = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "NONE" }],
                filters:
                    [
                        ["type", "anyof", "ItemShip", "ItemRcpt", "InvAdjst", "InvTrnfr"],
                        "AND",
                        ["custcol_lmry_mx_pediment", "is", "T"],
                        "AND",
                        ["item.type", "noneof", "Kit"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "trandate", label: "Date" }),
                        search.createColumn({ name: "type", label: "Type" }),
                        search.createColumn({ name: "tranid", label: "Document Number" }),
                        search.createColumn({ name: "location", label: "Location" }),
                        search.createColumn({ name: "quantity", label: "Quantity" }),
                        search.createColumn({ name: "item", label: "Item" }),
                        search.createColumn({
                            name: "internalid",
                            join: "inventoryDetail",
                            label: "Internal ID"
                        }),
                        search.createColumn({
                            name: "quantity",
                            join: "inventoryDetail",
                            label: "Quantity"
                        }),
                        search.createColumn({
                            name: "inventorynumber",
                            join: "inventoryDetail",
                            label: " Number"
                        })
                    ]
            });

            search_items_ped.filters.push(Filter_Trans);
            search_items_ped.columns.push(search.createColumn({
                name: "purchasedescription",
                join: "item"
            }));
            let colFields = search_items_ped.columns;
            let lastColumn = colFields.length - 1;

            let result_items_ped = search_items_ped.run().getRange(0, 1000);
            if (result_items_ped.length > 0) {
                for (let i = 0; i < result_items_ped.length; i++) {
                    const pedimentoItem = {};
                    let ITEM_ID = "" + result_items_ped[i].getValue(colFields[5]);
                    let ITEM_NAME = "" + result_items_ped[i].getText(colFields[5]);
                    let LOCATION_ID = "" + result_items_ped[i].getValue(colFields[3]);
                    let INVENTORY_DETAIL = "";
                    let INVENTORY_NUMBER;

                    if (FEAT_INVENTORY == true || FEAT_INVENTORY == 'T') {
                        INVENTORY_DETAIL = "" + result_items_ped[i].getValue(colFields[6]);
                        INVENTORY_NUMBER = "" + result_items_ped[i].getValue(colFields[8]);
                    }

                    let ITEM_DESCRIPTION = result_items_ped[i].getValue(colFields[lastColumn]) || "";
                    if (ITEM_DESCRIPTION.length > 300) {
                        ITEM_DESCRIPTION = ITEM_DESCRIPTION.substring(0, 297) + "...";
                    }
                    pedimentoItem.itemid = ITEM_ID;


                    if (ITEM_DESCRIPTION != '' && ITEM_DESCRIPTION != null) {
                        pedimentoItem.itemDescription = ITEM_DESCRIPTION;
                    }
                    if (!LOCATION_ID && type != "InvTrnfr") LOCATION_ID = locationDefault;
                    pedimentoItem.location = LOCATION_ID;
                    pedimentoItem.date = result_items_ped[i].getValue(colFields[0]);

                    if (INVENTORY_DETAIL != "") {
                        //Si el item es de tipo lote/serie
                        if (result_items_ped[i].getValue(colFields[8])) {
                            pedimentoItem.lote = INVENTORY_NUMBER;
                        }
                        pedimentoItem.quantity = result_items_ped[i].getValue(colFields[7]);
                    } else {
                        pedimentoItem.quantity = result_items_ped[i].getValue(colFields[4]);
                    }

                    if (type == "InvTrnfr") {
                        if (pedimentoItem.location == locationDefault) {
                            listItems.push(pedimentoItem);
                        }
                    } else {
                        listItems.push(pedimentoItem);
                    }

                }
            }

            //busqueda pedimentos de tipo kit package
            let recordShipment;
            if (type == "InvTrnfr") return listItems;
            if (type == "CustCred") {
                recordShipment = record.load({
                    type: "creditmemo",
                    id: shipmentID,
                    isDynamic: false,
                });
            } else {
                recordShipment = record.load({
                    type: !isReceipt ? search.Type.ITEM_FULFILLMENT : search.Type.ITEM_RECEIPT,
                    id: shipmentID,
                    isDynamic: false,
                });
            }


            let numItems = recordShipment.getLineCount({ sublistId: "item" });
            let index = 0;
            let kitItemxPediment = {};
            for (let i = 0; i < numItems; i++) {

                const pedimentoItem = {};
                if (recordShipment.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i }) === "Kit") {
                    kitItemxPediment[recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'kitlineid', line: i })] = recordShipment.getSublistText({ sublistId: "item", fieldId: "custcol_lmry_mx_pediment", line: i });
                }
                if (recordShipment.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i }) === "Kit" || recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'kitmemberof', line: i }) === "") continue;
                if (kitItemxPediment[recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'kitmemberof', line: i })] === "F") continue;

                let trandate = recordShipment.getValue("trandate");
                let itemID = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                let location = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                let quantity = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                let itemDescription = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'itemdescription', line: i });

                let inventoryDetail = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetail', line: i });
                if (inventoryDetail) {
                    let inventorydetailRecord = recordShipment.getSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: i });
                    let cLineas = inventorydetailRecord.getLineCount({ sublistId: 'inventoryassignment' });
                    for (let j = 0; j < cLineas; j++) {
                        const pedimentoItema = {};
                        let lote = inventorydetailRecord.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: j });

                        let loteQuantity = inventorydetailRecord.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
                        if (Number(itemID))
                            pedimentoItema.itemid = itemID;

                        if (itemDescription != null && itemDescription != "") {
                            if (itemDescription.length > 300) {
                                itemDescription = itemDescription.substring(0, 297) + "...";
                            }
                            pedimentoItema.itemDescription = itemDescription;
                        }

                        if (Number(location))
                            pedimentoItema.location = location;

                        if (trandate != null && trandate != "")
                            pedimentoItema.date = trandate;

                        if (Number(lote))
                            pedimentoItema.lote = lote;

                        if (Number(loteQuantity)) {
                            pedimentoItema.quantity = Math.round(loteQuantity);

                        } else {
                            pedimentoItema.quantity = Math.round(quantity);

                        }
                        listItems.push(pedimentoItema);
                    }
                } else {
                    if (Number(itemID))
                        pedimentoItem.itemid = itemID;

                    if (itemDescription != null && itemDescription != "") {
                        if (itemDescription.length > 300) {
                            itemDescription = itemDescription.substring(0, 297) + "...";
                        }
                        pedimentoItem.itemDescription = itemDescription;
                    }

                    if (Number(location))
                        pedimentoItem.location = location;

                    if (trandate != null && trandate != "")
                        pedimentoItem.date = trandate;

                    // if (Number(lote))
                    //     SubTabla.setSublistValue({ id: 'custpage_lote', line: index, value: loteText });
                    if (Number(quantity))
                        pedimentoItem.quantity = Math.round(quantity);
                    listItems.push(pedimentoItem);

                }

            }
            return listItems;
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

        const formatDate2 = (date) => {
            let parseDate = format.parse({ value: date, type: format.Type.DATE });
            //parseDate = format.format({ type: format.Type.DATE, value: parseDate });
            return parseDate;
        }

        const createPedimentoDetail = (pedimento) => {
            let ped_details = record.create({ type: 'customrecord_lmry_mx_pedimento_details', isDynamic: true });
            for (const fieldId in pedimento) {
                const value = fieldId == "custrecord_lmry_date" || fieldId == "custrecord_lmry_mx_ped_date" ? formatDate2(pedimento[fieldId]) : pedimento[fieldId];
                if (value && (fieldId != "id"&& fieldId != "type"&& fieldId != "pedimento_restante")) ped_details.setValue({ fieldId, value });
            }
            ped_details.save();

        }

        return { getInputData, map, reduce }

    });
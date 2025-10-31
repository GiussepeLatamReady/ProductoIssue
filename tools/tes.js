let runtime; require(["N/runtime"], function (runt) { runtime = runt; });
let record; require(["N/record"], function (rec) { record = rec; })
let search; require(["N/search"], function (sear) { search = sear; });
let query; require(["N/query"], function (que) { query = que; })
let currentRecord; require(["N/currentRecord"], function (current) { currentRecord = current; })
let recordObj = currentRecord.get();
function isAutomaticPedimentos(idSubsidiary) {
    var featPedimentos = false;
    var featureSubs = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
    if (featureSubs == true || featureSubs == 'T') {
        if (idSubsidiary) {
            search.create({
                type: 'customrecord_lmry_setup_tax_subsidiary',
                columns: ['custrecord_lmry_setuptax_pediment_automa'],
                filters: [
                    ['custrecord_lmry_setuptax_subsidiary', 'anyof', idSubsidiary],
                    "AND",
                    ["isinactive", "is", "F"]
                ]
            }).run().each(function (result) {
                featPedimentos = result.getValue('custrecord_lmry_setuptax_pediment_automa');
                featPedimentos = featPedimentos === "T" || featPedimentos === true;
            });
        }
    }
    return featPedimentos;
}

function getPedimentoMXtransaction(idPO) {

    if (Number(idPO) === 0 || idPO === undefined) return [];
    var consulta = 'SELECT TOP 1 CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento, CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento_aduana, CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento_fifo, CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento_lifo     FROM         CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS        WHERE          CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_transaction_related = ' + idPO + ' and       (CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento IS NOT NULL OR CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento_fifo IS NOT NULL OR CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento_lifo IS NOT NULL)';

    var nroPedimentoandAduana = query.runSuiteQL({
        query: consulta,
    }).asMappedResults();
    return nroPedimentoandAduana;
}

function searchPediments(recordId) {
    try {
        var search_ped = search.create({
            type: 'customrecord_lmry_mx_pedimento_details',
            filters: [{ name: 'custrecord_lmry_mx_ped_trans', operator: 'anyof', values: recordId }],
            columns: ['internalid']
        });

        var result_ped = search_ped.run().getRange({ start: 0, end: 1 });

        if (result_ped != null && result_ped.length > 0) {
            return false;
        } else {
            return true;
        }

    } catch (error) {
        log.error('searchPediments', error);
        //libraryMail.sendemail('[searchPediments] ' + error, LMRY_script);
    }
}

function getItems(recordObj) {
    //busqueda pedimentos de tipo kit package

    var recordShipment = recordObj;
    var listItems = [];

    var numItems = recordShipment.getLineCount({ sublistId: "item" });
    console.log("numItems",numItems)
    var kitItemxPediment = {};
    for (var i = 0; i < numItems; i++) {
        var pedimentoItem = {};
        if (recordShipment.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i }) === "Kit" &&
            (recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: i }) == 'T' ||
                recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: i }) == true)) {

            kitItemxPediment[recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'kitlineid', line: i })] = recordShipment.getSublistText({ sublistId: "item", fieldId: "custcol_lmry_mx_pediment", line: i });
        }
        if (recordShipment.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i }) === "Kit" || recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'kitmemberof', line: i }) === "") continue;

        var checkPediment = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_mx_pediment', line: i });
        var trandate = recordShipment.getValue("trandate");
        var itemID = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
        var location = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
        var quantity = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
        var itemDescription = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'itemdescription', line: i });

        var inventoryDetail = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailavail', line: i });
        if (inventoryDetail == 'T' || inventoryDetail == true) {
            recordShipment.selectLine({
                sublistId: 'item',
                line: i
            });
            var inventorydetailRecord = recordShipment.getCurrentSublistSubrecord({
                sublistId: 'item', fieldId: 'inventorydetail'
            });
            var cLineas = inventorydetailRecord.getLineCount({ sublistId: 'inventoryassignment' });
            for (var j = 0; j < cLineas; j++) {
                var pedimentoItema = {};
                var lote = inventorydetailRecord.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: j });

                var loteQuantity = inventorydetailRecord.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
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

                if (checkPediment === "T" || checkPediment === true) {
                    pedimentoItema.checkPediment = true;
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

            if (checkPediment === "T" || checkPediment === true) {
                pedimentoItem.checkPediment = true;
            }
            listItems.push(pedimentoItem);

        }

    }
    for (var i = 0; i < numItems; i++) {

        if (recordShipment.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i }) === "Kit" || recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'kitmemberof', line: i }) !== "") continue;
        if (recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: i }) === false || recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: i }) === 'F') continue;
        var trandate = recordShipment.getValue("trandate");
        var checkPediment = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'custcol_lmry_mx_pediment', line: i });
        var itemID = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
        var location = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
        var quantity = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
        var itemDescription = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'itemdescription', line: i });

        var inventoryDetail = recordShipment.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailavail', line: i });
        if (inventoryDetail == 'T' || inventoryDetail == true) {

            recordShipment.selectLine({
                sublistId: 'item',
                line: i
            });
            var inventorydetailRecord = recordShipment.getCurrentSublistSubrecord({
                sublistId: 'item', fieldId: 'inventorydetail'
            });
            var cLineas = inventorydetailRecord.getLineCount({ sublistId: 'inventoryassignment' });
            for (var j = 0; j < cLineas; j++) {
                var pedimentoItema = {};
                var lote = inventorydetailRecord.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: j });

                var loteQuantity = inventorydetailRecord.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j });
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
                if (checkPediment === "T" || checkPediment === true) {
                    pedimentoItema.checkPediment = true;
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

            if (checkPediment === "T" || checkPediment === true) {
                pedimentoItem.checkPediment = true;
            }
            listItems.push(pedimentoItem);

        }

    }
    console.log("listItems",listItems)
    return listItems;
}
function getPedimentos(item_id, location_id, lote_id, isFifo) {

        if (item_id === null || location_id === null) return [];
        var Filter_Pedimento = [];

        var Filter_Item = search.createFilter({
            name: "custrecord_lmry_mx_ped_item",
            operator: search.Operator.IS,
            values: item_id,
        });

        var Filter_Location = search.createFilter({
            name: "custrecord_lmry_mx_ped_location",
            operator: search.Operator.IS,
            values: location_id,
        });

        Filter_Pedimento.push(Filter_Item);
        Filter_Pedimento.push(Filter_Location);

        if (lote_id) {
            var Filter_Inventory = search.createFilter({
                name: "custrecord_lmry_mx_ped_lote_serie",
                operator: search.Operator.ANYOF,
                values: lote_id,
            });
            Filter_Pedimento.push(Filter_Inventory);
        }

        var search_pedimento_details = search.create({
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
                    sort: !isFifo ? search.Sort.DESC : search.Sort.ASC,
                }),
                search.createColumn({
                    name: "custrecord_lmry_mx_ped_aduana",
                    summary: "GROUP",
                    label: "Latam - MX Aduana",
                }),
            ],
        });

        var result_pedimento_details = search_pedimento_details
            .run()
            .getRange(0, 1000);
        return result_pedimento_details;
    }

function isValidItemsTransaction(recordObj) {
    var message = 'ok';
    var items = getItems(recordObj);
    if (items.length === 0) message = 'Error no hay lineas seleccionadas';
    items = items.filter(function (itemline) {
        return itemline.checkPediment;
    })
    items.forEach(function (itemLine) {
        console.log("itemLine: ",itemLine)
        var listPediment = getPedimentos(itemLine.itemid, itemLine.location, itemLine.lote, false);
        console.log("listPediment: ",listPediment)
        var sumQuantityDisp = 0;
        var quantitytotal = itemLine.quantity;
        //console.log("listPediment: ",listPediment)
        for (var i = 0; i < listPediment.length; i++) {
            var jsonPediment1 = JSON.parse(JSON.stringify(listPediment[i]));
            var ped_quantity = Number(jsonPediment1.values["SUM(custrecord_lmry_mx_ped_quantity)"]);
            var aduana = jsonPediment1.values["GROUP(custrecord_lmry_mx_ped_aduana)"][0].value;
            if (aduana) {
                sumQuantityDisp += ped_quantity;
            }
        }
        console.log("quantitytotal: ",quantitytotal)
        console.log("sumQuantityDisp: ",sumQuantityDisp)
        if (quantitytotal > sumQuantityDisp) {
            console.log("error 1: ","Error no hay suficiente stock ")
            message = 'Error no hay suficiente stock ';
        } else {
            for (var i = 0; i < listPediment.length; i++) {
                var jsonPediment = JSON.parse(JSON.stringify(listPediment[i]));
                var ped_quantity = Number(jsonPediment.values["SUM(custrecord_lmry_mx_ped_quantity)"]);
                var aduana = Number(jsonPediment.values["GROUP(custrecord_lmry_mx_ped_aduana)"][0].value);

                if (aduana > 0 && ped_quantity > 0) {

                    if (ped_quantity == quantitytotal) {


                        quantitytotal = quantitytotal - ped_quantity;
                        break;
                    };
                    if (ped_quantity > quantitytotal) {

                        quantitytotal = quantitytotal - ped_quantity;
                        break;
                    };
                    if (ped_quantity < quantitytotal) {

                        quantitytotal = quantitytotal - ped_quantity;
                    }

                } else {
                    continue;
                }
            }
             console.log("quantitytotal 2: ",quantitytotal)
            if (quantitytotal > 0){
                console.log("error 2: ","Error no hay suficiente stock ")
                 message = ' Error no hay suficiente stock';
                }
        };
    });
    return message;
}

function translateAlert(textInit) {
    var Language = runtime.getCurrentScript().getParameter({ name: 'LANGUAGE' });
    Language = Language.substring(0, 2);
    fetch("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=" + Language + "&q=" + textInit)
        .then(function (response) {
            return response.text();
        })
        .then(function (text) {
            alert(JSON.parse(text)[0][0][0]);
        }
        );
}

function mainProcess() {

    var featPedimentos = isAutomaticPedimentos(recordObj.getValue("subsidiary"))
    if (featPedimentos) {
        var idPurchaseOrder = recordObj.getValue("createdfrom");
        // if (libtools.searchPediments(recordObj.id)) {
        var mxTransaction = getPedimentoMXtransaction(idPurchaseOrder);
        if (mxTransaction.length > 0) {
            if (Number(recordObj.id) != 0) {
                if (!searchPediments(recordObj.id)) {
                    console.log("hay pedimentos")
                    return true;
                }
            }

            const mensaje = isValidItemsTransaction(recordObj);
            //console.log("mensaje:", mensaje)
            if (mensaje !== "ok") {
                translateAlert(mensaje);
                if (mensaje.indexOf('Error') !== -1) {
                    console.log("mensaje translate:", mensaje)
                }
            }

        }
        // }

    }
}
mainProcess()
/**
*@NApiVersion 2.1
*@NScriptType Restlet
*@Name LMRY_MX_Pedimentos_resltet.js
*/
define([
    "N/log", 
    "N/search", 
    "N/record", 
    'N/runtime', 
    'N/format', 
    'N/query',
    'N/email', 
    './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0'
],
    function (
        log, 
        search, 
        record, 
        runtime, 
        format, 
        query,
        email, 
        library_mail
    ) {

        function get(parameters) {
            const translation = getTranslations();

            try {
                log.error("get",get)
                const idRecord = parameters.idRecord;
                deletePedimentoDetails(idRecord);
                const type = search.lookupFields({
                    type: 'transaction',
                    id: idRecord,
                    columns: ['type']
                }).type[0].value;
                let dataTransaction;
                let isReceipt = true;
                let flagTransfer = false;
                let fromLocation;
                let salesOrderID; // varaible para mapear el pedimento desde un return autorization
                if (type == "InvAdjst") {
                    dataTransaction = search.lookupFields({
                        type: search.Type.INVENTORY_ADJUSTMENT,
                        id: idRecord,
                        columns: [
                            'subsidiary',
                            'createdfrom',
                            'trandate'
                        ]
                    });
                    dataTransaction['createdfrom'] = [{ value: idRecord }];
                    dataTransaction['isAdjustment'] = true;
                    return createPedimentoForInventoryAdj(dataTransaction, idRecord, translation);
                } else {
                    isReceipt = type === "ItemRcpt" ? true : false;
                    //INVENTORY_ADJUSTMENT
                    dataTransaction = search.lookupFields({
                        type: !isReceipt ? search.Type.ITEM_FULFILLMENT : search.Type.ITEM_RECEIPT,
                        id: idRecord,
                        columns: [
                            'subsidiary',
                            'createdfrom',
                            'trandate',
                            'transferlocation'
                        ]
                    });
                    const transactionOgirinType = search.lookupFields({
                        type: 'transaction',
                        id: dataTransaction['createdfrom'][0]?.value,
                        columns: ['type', 'transferlocation']
                    });
                    if (transactionOgirinType.type[0].value == 'TrnfrOrd') {
                        flagTransfer = true;
                        fromLocation = transactionOgirinType.transferlocation[0].value
                    }

                    salesOrderID = getTransactionOrigin(dataTransaction['createdfrom'][0]?.value)

                }

                const { isAutomatic, automaticType } = getAutomaticType(dataTransaction['createdfrom'][0]?.value);
                log.error("isAutomatic",isAutomatic)
                if (isAutomatic) {
                    const items = getItems(idRecord, isReceipt);
                    log.error("items",items)
                    if (items.length === 0) return translation.NO_LINES_SELECTED;
                    let listSelected = [];
                    let listSendEmail = [];

                    if (flagTransfer && isReceipt == true) {
                        const jsonPedimentos = getInfoMXtransaction(dataTransaction['createdfrom'][0]?.value)[0].custrecord_lmry_mx_pedimento_transfer;
                        const auxJson = JSON.parse(jsonPedimentos);
                        if (typeof auxJson === 'object')
                            listSelected = auxJson;
                    } else{
                        items.forEach((itemLine) => {
                            const listPediment = getPedimentos(itemLine.itemid, itemLine.location, itemLine.lote, salesOrderID);
                            log.error("listPediment",listPediment)
                            let sumQuantityDisp = 0;
                            let quantitytotal = itemLine.quantity;
                            log.error("itemLine.itemid",itemLine.itemid)
                            for (let i = 0; i < listPediment.length; i++) {
                                const jsonPediment = JSON.parse(JSON.stringify(listPediment[i]));
                                let ped_quantity = Number(jsonPediment.values["SUM(custrecord_lmry_mx_ped_quantity)"]);
                                let aduana = jsonPediment.values["GROUP(custrecord_lmry_mx_ped_aduana)"][0]?.value;
                                log.error("Pedimento",{
                                    location: itemLine.location,
                                    lote: itemLine.lote,
                                    aduana: aduana,
                                    ped_quantity: ped_quantity
                                })
                                if (aduana) {
                                    sumQuantityDisp += ped_quantity;
                                }
                            }

                            if (salesOrderID) sumQuantityDisp *= (-1); //modificacion permite validar la cantidad para el return aut...
                            
                            if (quantitytotal > sumQuantityDisp) {
                                log.error("Stock insuficiente","la cantidad de la transaccion es mayor que existencia de pedimentos")
                                log.error("cantidad de la transaccion",quantitytotal)
                                log.error("cantidad de la existencias",sumQuantityDisp)
                                throw translation.INSUFFICIENT_STOCK;
                            } else {
                                let addCount = 0;
                                for (let i = 0; i < listPediment.length; i++) {
                                    const jsonPediment = JSON.parse(JSON.stringify(listPediment[i]));
                                    let ped_quantity = Math.abs(Number(jsonPediment.values["SUM(custrecord_lmry_mx_ped_quantity)"]));
                                    let aduana = Number(jsonPediment.values["GROUP(custrecord_lmry_mx_ped_aduana)"][0]?.value);
                                    let datePediment = jsonPediment.values["GROUP(custrecord_lmry_mx_ped_date)"]
                                    if (aduana > 0 && ped_quantity> 0) {
                                        itemLine['datePediment'] = datePediment;
                                        
                                        if (ped_quantity == quantitytotal) {
                                            
                                            listSelected.push({ pediment: jsonPediment, nroItems: quantitytotal, itemLine });
                                            quantitytotal = quantitytotal - ped_quantity;
                                            addCount++;
                                            break;
                                        };
                                        if (ped_quantity > quantitytotal) {
                                            
                                            listSelected.push({ pediment: jsonPediment, nroItems: quantitytotal, itemLine });
                                            quantitytotal = quantitytotal - ped_quantity;
                                            addCount++;
                                            break;
                                        };
                                        if (ped_quantity < quantitytotal) {
                                           
                                            listSelected.push({ pediment: jsonPediment, nroItems: ped_quantity, itemLine });
                                            quantitytotal = quantitytotal - ped_quantity;
                                            addCount++;
                                        }
    
                                    } else {
                                        log.debug("Aduana y numero pedimentos","No hay existencias")
                                        continue;
                                    }
                                }

                                if (quantitytotal > 0 && addCount !== 0){ 
                                    for (let i = listSelected.length - 1; i >= listSelected.length - addCount; i--) {
                                        let line = listSelected[i];
                                        line["obs"] = "Insufficient Stock";
                                        line["stop"] = true;
                                    }
                                } //throw translation.INSUFFICIENT_STOCK;
                            };
                        });
                    }
                    listSendEmail = listSendEmail.concat(createPedimenetByList(listSelected, dataTransaction, idRecord, isReceipt, flagTransfer && isReceipt ? fromLocation : null));

                    sendEmail(listSendEmail,dataTransaction['subsidiary'][0].value,idRecord)

                    if (flagTransfer && isReceipt == false) {
                        const jsonPedimentos = getInfoMXtransaction(dataTransaction['createdfrom'][0]?.value);
                        if (Number(jsonPedimentos[0].id))
                            record.submitFields({
                                type: 'customrecord_lmry_mx_transaction_fields',
                                id: jsonPedimentos[0].id,
                                values: {
                                    custrecord_lmry_mx_pedimento_transfer: JSON.stringify(listSelected)
                                },
                            });
                    }
                    log.debug("Suceess","Creacion de pedimentos con exito")
                    return translation.PEDIMENTO_SUCCESS;
                } else {
                    let respuesta;
                    if (flagTransfer && isReceipt) {
                        const jsonPedimentos = getInfoMXtransaction(dataTransaction['createdfrom'][0]?.value).custrecord_lmry_mx_pedimento_transfer;
                        respuesta = createPedimentoDetailRecord(dataTransaction, idRecord, isReceipt, flagTransfer, jsonPedimentos, translation);
                    } else {
                        respuesta = createPedimentoDetailRecord(dataTransaction, idRecord, isReceipt, flagTransfer, null, translation);
                    }
                    return respuesta;
                }

            } catch (error) {
                log.error({
                    title: 'error',
                    details: error
                });
                if (typeof error == 'string') return error;
                library_mail.sendemail2(' [ pedimentosReslet ] ' + error, 'lmry_MX_pedimentos_resltet', null, 'tranid', 'entity');
                return translation.PEDIMENTO_ERROR_DETAIL;
            }
        }

        function getTranslations() {
            var language = runtime.getCurrentScript().getParameter({ name: "LANGUAGE" }).substring(0, 2);
            language = ["es", "pt"].indexOf(language) != -1 ? language : "en";

            var translatedFields = {
                "es": {
                    "NO_LINES_SELECTED": "No hay líneas seleccionadas",
                    "INSUFFICIENT_STOCK": "Error no hay suficiente stock",
                    "PEDIMENTO_SUCCESS": "Pedimento creado con éxito",
                    "PEDIMENTO_ERROR_DETAIL": "Error al crear el pedimento Detail",
                    "PEDIMENTO_EXISTS": "Ya existen pedimentos",
                    "NO_MX_TRANSACTION": "No hay Mx Transaction",
                    "DEAR": "Estimado",
                    "MSG_PEDIMENTOS": "Resultado detallado de asignacion de pedimentos",
                    "ENVIROMENT": "Tipo de ambiente",
                    "ACCOUNT_ID": "Id del ambiente",
                    "TRANID": "Transacción",
                    "SUBSIDIARY": "Subsidiaria",
                    "ITEMS": "Articulos",
                    "ITEM": "Articulo",
                    "QUANTITY": "Cantidad",
                    "FLOW": "Flujo",
                    "OBS": "Observación",
                    "ENTRY": "→ Entrada",
                    "EXIT": "← Salida",
                    "NOT_ASSIGNED": "Pedimento no asignado, revise sus configuraciones",
                    "LOCATION": "Locación"
                },
                "en": {
                    "NO_LINES_SELECTED": "No lines selected",
                    "INSUFFICIENT_STOCK": "Error not enough stock",
                    "PEDIMENTO_SUCCESS": "Pedimento created successfully",
                    "PEDIMENTO_ERROR_DETAIL": "Error creating pedimento Detail",
                    "PEDIMENTO_EXISTS": "Pedimentos already exist",
                    "NO_MX_TRANSACTION": "No Mx Transaction",
                    "DEAR": "Dear",
                    "MSG_PEDIMENTOS": "Detailed result of pediment assignment",
                    "ENVIROMENT": "Environment type",
                    "ACCOUNT_ID": "Environment ID",
                    "TRANID": "Transaction",
                    "SUBSIDIARY": "Subsidiary",
                    "ITEMS": "Items",
                    "ITEM": "Item",
                    "QUANTITY": "Quantity",
                    "FLOW": "Customs Entry Flow",
                    "OBS": "Observation",
                    "ENTRY": "→ Entry",
                    "EXIT": "← Exit",
                    "NOT_ASSIGNED": "Petition not assigned, check your settings",
                    "LOCATION": "Location"
                },
                "pt": {
                    "NO_LINES_SELECTED": "Nenhuma linha selecionada",
                    "INSUFFICIENT_STOCK": "Erro não há estoque suficiente",
                    "PEDIMENTO_SUCCESS": "Pedimento criado com sucesso",
                    "PEDIMENTO_ERROR_DETAIL": "Erro ao criar o pedimento Detalhe",
                    "PEDIMENTO_EXISTS": "Já existem pedimentos",
                    "NO_MX_TRANSACTION": "Não há Transação Mx",
                    "DEAR": "Estimado",
                    "MSG_PEDIMENTOS": "Resultado detalhado da atribuição de pedimentos",
                    "ENVIROMENT": "Tipo de ambiente",
                    "ACCOUNT_ID": "ID do ambiente",
                    "TRANID": "Transação",
                    "SUBSIDIARY": "Subsidiária",
                    "ITEMS": "Artigos",
                    "ITEM": "Artigo",
                    "QUANTITY": "Quantidade",
                    "FLOW": "Fluxo",
                    "OBS": "Observação",
                    "ENTRY": "→ Entrada",
                    "EXIT": "← Saída",
                    "NOT_ASSIGNED": "Pedimento não atribuída, verifique suas configurações",
                    "LOCATION": "Localização"
                }
            };

            return translatedFields[language];
        }

        function getItems(shipmentID, isReceipt) {
            let FEAT_INVENTORY = runtime.isFeatureInEffect({ feature: "advbinseriallotmgmt" });
            const listItems = [];
            //Filtro por transacción
            let Filter_Trans = search.createFilter({ name: 'internalid', operator: search.Operator.ANYOF, values: shipmentID });

            /* Busqueda personalizada LatamReady - MX Pediment Lines*/
            // Devuelve las líneas de item de las transacciones que cuentan con check activado de pedimento
            let search_items_ped = search.load({ id: 'customsearch_lmry_mx_ped_receipt_lines' });

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
                    listItems.push(pedimentoItem);
                }
            }

            //busqueda pedimentos de tipo kit package

            let recordShipment = record.load({
                type: !isReceipt ? search.Type.ITEM_FULFILLMENT : search.Type.ITEM_RECEIPT,
                id: shipmentID,
                isDynamic: false,
            });

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

        function getTransactionOrigin(createdFromId) {

            if (!createdFromId) return 0;
            // Obtener la transacción origen y el tipo desde la Return Authorization
            const returnAuth = search.lookupFields({
                type: "transaction",
                id: createdFromId,
                columns: ['createdfrom', 'type']
            });
            const salesOrderOrInvoiceId = returnAuth?.createdfrom?.[0]?.value || null;
            const returnAuthType = returnAuth?.type?.[0]?.value || null;
            if (returnAuthType !=="RtnAuth") return 0;
            
            if (salesOrderOrInvoiceId) {
                // Obtener la transacción final (Sales Order o Invoice)
                const finalTransaction = search.lookupFields({
                    type: "transaction",
                    id: salesOrderOrInvoiceId,
                    columns: ['createdfrom', 'type']
                });
        
                const salesOrderId = finalTransaction?.createdfrom?.[0]?.value || null;
                const finalTransactionType = finalTransaction?.type?.[0]?.value || null;

                // Si la transacción es una factura (CustInvc), devolver la Sales Order original
                if (finalTransactionType === "CustInvc" || finalTransactionType === "CashSale") {
                    return salesOrderId ? salesOrderId : 0;
                }
        
                // Si no es una factura, devolver la transacción creada desde la Return Authorization
                return salesOrderOrInvoiceId;
            }
        
            // Si no hay transacción creada desde la Return Authorization, devolver 0
            return 0;
        }
        
        /**
         * 
         * @param {*} item_id 
         * @param {*} location_id 
         * @param {*} lote_id 
         * @returns {Array<Object>}
         */
        function getPedimentos(item_id, location_id, lote_id, salesOrderID) {

            if (item_id === null || location_id === null) return [];
            let Filter_Pedimento = [];

            let Filter_Item = search.createFilter({
                name: "custrecord_lmry_mx_ped_item",
                operator: search.Operator.IS,
                values: item_id,
            });
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
                    name: "custrecord_lmry_mx_ped_trans_ref",
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
        function getAutomaticType(idRecordOrigin) {
            const typeAutomatic = { isAutomatic: false, automaticType: null };
            if (!Number(idRecordOrigin)) return typeAutomatic;
            getInfoMXtransaction(idRecordOrigin, true).forEach(mxRecord => {
                if (mxRecord.custrecord_lmry_mx_pedimento_fifo === 'T') {
                    typeAutomatic.automaticType = 1;
                    typeAutomatic.isAutomatic = true;
                }
                if (mxRecord.custrecord_lmry_mx_pedimento_lifo === 'T') {
                    typeAutomatic.automaticType = 2;
                    typeAutomatic.isAutomatic = true;
                }
                if (mxRecord.custrecord_lmry_mx_pedimento != null) {
                    typeAutomatic.automaticType = null;
                    typeAutomatic.isAutomatic = false;
                }
            });

            return typeAutomatic;
        }

        /**
         * Mejora Pedimentos v2 - Funcion de creacion de Pedimento Detail a partir de un Inbound Shipment
         * @param {object} dataTransaction 
         * @param {number} idRecord 
         * @param {boolean} isReceipt 
         */
        function createPedimentoDetailRecord(dataTransaction, idRecord, isReceipt, flagTransfer, resultItems, translation) {

            let idPurchaseOrder = dataTransaction['createdfrom'][0]?.value;
            if (Number(idPurchaseOrder) === 0) return 'Error falta ID';
            if (!existPediments(idRecord)) return translation.PEDIMENTO_EXISTS;

            let purchaseOrder = getInfoMXtransaction(idPurchaseOrder);
            if (purchaseOrder.length > 0) {
                let idSubsidiary = dataTransaction['subsidiary'][0].value;
                let idItemReciept = idRecord;
                //Filtra por la transacción
                let Filter_Trans = search.createFilter({ name: 'internalid', operator: search.Operator.ANYOF, values: idItemReciept });

                /* Busqueda personalizada LatamReady - MX Pediment Lines*/
                // Devuelve las líneas de item de las transacciones que cuentan con check activado de pedimento
                let search_items_ped = search.load({ id: 'customsearch_lmry_mx_ped_receipt_lines' });

                search_items_ped.filters.push(Filter_Trans);

                let result_items_ped = search_items_ped.run().getRange(0, 1000);
                if (result_items_ped.length === 0) return translation.NO_LINES_SELECTED;
                if (flagTransfer && isReceipt) {
                    if (typeof resultItems === 'object')
                        result_items_ped = resultItems;
                }

                const listSendEmail = [];

                for (let i = 0; i < result_items_ped.length; i++) {

                    let colFields = result_items_ped[i].columns;
                    let ITEM_ID = "" + result_items_ped[i].getValue(colFields[5]);
                    let dateLine = result_items_ped[i].getValue(colFields[0]);
                    let locationLine = result_items_ped[i].getValue(colFields[3]);

                    let FEAT_INVENTORY = runtime.isFeatureInEffect({ feature: "advbinseriallotmgmt" });
                    let INVENTORY_DETAIL = "" + result_items_ped[i].getValue(colFields[6]);

                    // validar para poder guardar los datos
                    let ped_details = record.create({ type: 'customrecord_lmry_mx_pedimento_details', isDynamic: true });

                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_subsidiary', value: idSubsidiary });
                    if (!dataTransaction['isAdjustment']) {
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_trans_ref', value: idPurchaseOrder });
                    }

                    ped_details.setValue({ fieldId: 'custrecord_lmry_source_transaction_id', value: idPurchaseOrder });

                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_trans', value: idItemReciept });

                    ped_details.setValue({ fieldId: 'custrecord_lmry_transaction_id', value: idItemReciept });

                    ped_details.setValue({
                        fieldId: 'custrecord_lmry_date', value: new Date()
                    });

                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_item', value: ITEM_ID });
                   
                    var pedimentoDate = purchaseOrder[0].custrecord_lmry_mx_tf_pedimento_date;
                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_date', value: format.parse({ value: pedimentoDate, type: "date" }) });
                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_num', value: purchaseOrder[0].custrecord_lmry_mx_pedimento });

                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_location', value: locationLine });
                    let quantity;
                    let loteSerie;
                    if ((FEAT_INVENTORY === "T" || FEAT_INVENTORY === true) && INVENTORY_DETAIL != "" && result_items_ped[i].getValue(colFields[8])) {
                        loteSerie = result_items_ped[i].getValue(colFields[8]);
                        if (Number(loteSerie)) {
                            ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_lote_serie', value: loteSerie });
                        }
                        quantity = result_items_ped[i].getValue(colFields[7]);
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_quantity', value: quantity * (isReceipt ? 1 : -1) });
                    } else {

                        quantity = result_items_ped[i].getValue(colFields[4]);
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_quantity', value: quantity * (isReceipt ? 1 : -1) });
                        
                    }

                    if (Number(purchaseOrder[0].custrecord_lmry_mx_pedimento_aduana)) {
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_aduana', value: purchaseOrder[0].custrecord_lmry_mx_pedimento_aduana });
                    }

                    // Graba record Latam - MX Pedimento Details
                    /*
                    if ((FEAT_INVENTORY === "T" || FEAT_INVENTORY === true) && INVENTORY_DETAIL != "" && result_items_ped[i].getValue(colFields[8])) {
                        ped_details.save();
                    }else{
                        
                        if (!listSendEmail.filter(line => line.item == ITEM_ID && line.location == locationLine).length) {
                            ped_details.save();
                        }else{
                            inventoryStatus = false;
                        }
                            
                        ped_details.save();
                    }
                    */
                    ped_details.save();
                    listSendEmail.push(
                        {
                            item: ITEM_ID,
                            pedimento: purchaseOrder[0].custrecord_lmry_mx_pedimento || "",
                            lote: loteSerie || "",
                            quantity,
                            isReceipt,
                            location: locationLine,
                            aduana: purchaseOrder[0].custrecord_lmry_mx_pedimento_aduana
                        }
                    )
                    
                    
                }
                sendEmail(listSendEmail,idSubsidiary,idRecord)
                if (flagTransfer && !isReceipt) {
                    const jsonPedimentos = getInfoMXtransaction(dataTransaction['createdfrom'][0]?.value);
                    if (Number(jsonPedimentos[0].id))
                        record.submitFields({
                            type: 'customrecord_lmry_mx_transaction_fields',
                            id: jsonPedimentos[0].id,
                            values: {
                                custrecord_lmry_mx_pedimento_transfer: JSON.stringify(result_items_ped)
                            },
                        });
                }
                return translation.PEDIMENTO_SUCCESS;
            }
            return translation.NO_MX_TRANSACTION;

        }

        


        function createPedimentoForInventoryAdj(dataTransaction, inventoryAdjustmentID, translation) {
            if (Number(inventoryAdjustmentID) === 0) return 'Error falta ID';
            if (!existPediments(inventoryAdjustmentID)) return translation.PEDIMENTO_EXISTS;
            let listSendEmail = [];
            const mxTransactionFields = getInfoMXtransaction(inventoryAdjustmentID);

            const quantityItem = getQuantityItems(inventoryAdjustmentID);


            const idSubsidiary = dataTransaction['subsidiary'][0].value;
            const FEAT_INVENTORY = runtime.isFeatureInEffect({ feature: "advbinseriallotmgmt" });
            //Filtra por la transacción
            const Filter_Trans = search.createFilter({ name: 'internalid', operator: search.Operator.ANYOF, values: inventoryAdjustmentID });

            /* Busqueda personalizada LatamReady - MX Pediment Lines*/
            // Devuelve las líneas de item de las transacciones que cuentan con check activado de pedimento
            //let search_items_ped = search.load({ id: 'customsearch_lmry_mx_ped_receipt_lines' });

            const search_items_ped = search.create({
                type: "transaction",
                settings: [{"name":"consolidationtype","value":"NONE"}],
                filters:
                    [
                        ["type", "anyof", "InvAdjst"],
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


            if (search_items_ped.runPaged().count === 0) return translation.NO_LINES_SELECTED;
            search_items_ped.run().each(result => {
                const { columns, getValue } = result;
                let inventoryStatus = true;
                const get = (i) => getValue(columns[i]);
                const itemID = "" + get(5);
                const locationLine = get(3);
                const loteSerie = get(8);
                let INVENTORY_DETAIL = "" + get(6);
                INVENTORY_DETAIL = (FEAT_INVENTORY === "T" || FEAT_INVENTORY === true) && INVENTORY_DETAIL
                const quantity = Number(INVENTORY_DETAIL && loteSerie ? get(7) : get(4));
                
                if (quantityItem[itemID] > 0) {
                    if (mxTransactionFields.length > 0) {
                        const pedimentoDate = mxTransactionFields[0].custrecord_lmry_mx_tf_pedimento_date;
                        // validar para poder guardar los datos
                        let ped_details = record.create({ type: 'customrecord_lmry_mx_pedimento_details', isDynamic: true });
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_subsidiary', value: idSubsidiary });
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_trans', value: inventoryAdjustmentID });
                        ped_details.setValue({ fieldId: 'custrecord_lmry_transaction_id', value: inventoryAdjustmentID });
                        ped_details.setValue({ fieldId: 'custrecord_lmry_date', value: new Date() });
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_item', value: itemID });
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_location', value: locationLine });
                        if (INVENTORY_DETAIL && Number(loteSerie)) {
                            ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_lote_serie', value: loteSerie });
                        }
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_quantity', value: Math.abs(quantity) });

                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_date', value: format.parse({ value: pedimentoDate, type: "date" }) });
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_num', value: mxTransactionFields[0].custrecord_lmry_mx_pedimento });
                        if (Number(mxTransactionFields[0].custrecord_lmry_mx_pedimento_aduana)) {
                            ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_aduana', value: mxTransactionFields[0].custrecord_lmry_mx_pedimento_aduana });
                        }
                        
                        ped_details.save();

                        listSendEmail.push(
                            {
                                item: itemID,
                                pedimento: mxTransactionFields[0].custrecord_lmry_mx_pedimento || "",
                                lote: INVENTORY_DETAIL && Number(loteSerie) ? loteSerie : "",
                                quantity: Math.abs(quantity),
                                isReceipt: true,
                                location: locationLine,
                                aduana: mxTransactionFields[0].custrecord_lmry_mx_pedimento_aduana || ""
                            }
                        )

                        
                    }else{
                        listSendEmail.push(
                            {
                                item: itemID,
                                pedimento: "",
                                lote: "",
                                quantity: Math.abs(quantity),
                                isReceipt: true,
                                location: locationLine,
                                obs: translation.NOT_ASSIGNED
                            }
                        )
                    }
                } else if (quantityItem[itemID] < 0) {
                    let listSelected = [];
                    const listPediment = getPedimentos(itemID, locationLine, loteSerie, null);
                    let sumQuantityDisp = 0;
                    let quantitytotal = quantity;
                    let itemLine = {
                        itemid: itemID,
                        location: locationLine,
                        lote: loteSerie || "",
                        date: get(0)
                    }
                    for (let i = 0; i < listPediment.length; i++) {
                        const jsonPediment = JSON.parse(JSON.stringify(listPediment[i]));
                        let ped_quantity = Number(jsonPediment.values["SUM(custrecord_lmry_mx_ped_quantity)"]);
                        let aduana = jsonPediment.values["GROUP(custrecord_lmry_mx_ped_aduana)"][0]?.value;
                        if (aduana) {
                            sumQuantityDisp += ped_quantity;
                        }
                    }
                    if (quantitytotal > sumQuantityDisp) {
                        //throw translation.INSUFFICIENT_STOCK;
                    } else {
                        let addCount = 0;
                        for (let i = 0; i < listPediment.length; i++) {
                            const jsonPediment = JSON.parse(JSON.stringify(listPediment[i]));
                            let ped_quantity = Number(jsonPediment.values["SUM(custrecord_lmry_mx_ped_quantity)"]);
                            let aduana = Number(jsonPediment.values["GROUP(custrecord_lmry_mx_ped_aduana)"][0]?.value);
                            let pedimentoNro = jsonPediment.values["GROUP(custrecord_lmry_mx_ped_num)"];
                            if (aduana > 0 && ped_quantity > 0) {

                                if (ped_quantity == quantitytotal) {

                                    listSelected.push({ pediment: jsonPediment, nroItems: quantitytotal, itemLine });
                                    addCount++;
                                    quantitytotal = quantitytotal - ped_quantity;
                                    break;
                                };
                                if (ped_quantity > quantitytotal) {
                                    listSelected.push({ pediment: jsonPediment, nroItems: quantitytotal, itemLine });
                                    addCount++;
                                    quantitytotal = quantitytotal - ped_quantity;
                                    break;
                                };
                                if (ped_quantity < quantitytotal) {
                                    listSelected.push({ pediment: jsonPediment, nroItems: quantitytotal, itemLine });
                                    addCount++;
                                    quantitytotal = quantitytotal - ped_quantity;
                                }

                            } else {
                                continue;
                            }
                        }
                        if (quantitytotal > 0 && addCount !== 0) {
                            for (let i = listSelected.length - 1; i >= listSelected.length - addCount; i--) {
                                let line = listSelected[i];
                                line["obs"] = translation.INSUFFICIENT_STOCK;
                                line["stop"] = true;
                            }
                        }
                    };

                    listSendEmail = listSendEmail.concat(createPedimenetByList(listSelected, dataTransaction, inventoryAdjustmentID, false, false, true));
                }
                return true;
            });
            sendEmail(listSendEmail, idSubsidiary, inventoryAdjustmentID)

            return translation.PEDIMENTO_SUCCESS;


            return translation.NO_MX_TRANSACTION;

        }


        const getQuantityItems = (idRecord) => {

            const quantityItem = {}
            const recordObj = record.load({
              type: "inventoryadjustment",
              id: idRecord,
              isDynamic: true,
            });
            
            const itemCount = recordObj.getLineCount({
              sublistId: 'inventory'
            });
          
            for (let i = 0; i < itemCount; i++) {
          
              const item = recordObj.getSublistValue({
                sublistId: 'inventory',
                fieldId: 'item',
                line: i
              });
          
              const quantity = recordObj.getSublistValue({
                sublistId: 'inventory',
                fieldId: 'adjustqtyby',
                line: i
              });
          
              quantityItem[item] = Number(quantity);
          
            }
            return quantityItem;
          }

        function existPediments(idRecord) {
            try {

                //Busca si la transacción ya se registró en el record LatamReady - MX Pediments Detail
                let search_ped = search.create({
                    type: 'customrecord_lmry_mx_pedimento_details',
                    filters: [{ name: 'custrecord_lmry_mx_ped_trans', operator: 'is', values: idRecord }],
                    columns: ['internalid']
                });
                let result_ped = search_ped.run().getRange({ start: 0, end: 1 });

                if (result_ped != null && result_ped.length > 0) {
                    return false;
                } else {
                    return true;
                }

            } catch (err) {
                log.error('existPediments', err);

            }
        }
        function getInfoMXtransaction(idPO, isAutomatic) {

            if (Number(idPO) === 0 || idPO === undefined) return [];
            let consulta = `
            SELECT TOP 1
            id,     
            CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento,
            CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento_aduana,
            CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento_fifo,
            CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento_lifo,
            CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento_transfer,
            CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_tf_pedimento_date
            FROM        
            CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS       
            WHERE         
            CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_transaction_related = ${idPO}  
            ${isAutomatic === null ? `and      
            CUSTOMRECORD_LMRY_MX_TRANSACTION_FIELDS.custrecord_lmry_mx_pedimento IS NOT NULL`: ''}
            `;

            let nroPedimentoandAduana = query.runSuiteQL({
                query: consulta,
            }).asMappedResults();
            return nroPedimentoandAduana;
        }
        function createPedimenetByList(listSelected, dataTransaction, idRecord, isReceipt, transferlocation,isAdjustment) {

            const listSendEmail = [];
            
            listSelected.forEach((pedimentSelect) => {
                const { pediment: jsonPediment, nroItems: quantity, itemLine: itemLineInfo} = pedimentSelect;
                let inventoryStatus = true;
                if (!pedimentSelect.stop) {
    
                    let ped_details = record.create({ type: 'customrecord_lmry_mx_pedimento_details', isDynamic: true });
    
                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_subsidiary', value: dataTransaction['subsidiary'][0].value });
                    
                    if (!isAdjustment) {
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_trans_ref', value: dataTransaction['createdfrom'][0].value });
    
                        ped_details.setValue({ fieldId: 'custrecord_lmry_source_transaction_id', value: dataTransaction['createdfrom'][0].value });
                    }
                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_trans', value: idRecord });
    
                    ped_details.setValue({ fieldId: 'custrecord_lmry_transaction_id', value: idRecord });
    
                    let fecha1 = format.parse({ value: dataTransaction['trandate'], type: format.Type.DATE });
    
                    ped_details.setValue({ fieldId: 'custrecord_lmry_date', value: fecha1 });
    
                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_item', value: itemLineInfo.itemid });
    
                    let fecha2 = format.parse({ value: itemLineInfo.date, type: format.Type.DATE });
    
                    if (isReceipt) {
                        fecha2 = format.parse({ value: itemLineInfo.datePediment, type: format.Type.DATE });
                    }
                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_date', value: fecha2 });
    
                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_num', value: jsonPediment.values["GROUP(custrecord_lmry_mx_ped_num)"] });
    
                    if (transferlocation) {
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_location', value: transferlocation });
                    } else {
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_location', value: itemLineInfo.location });
                    }
    
    
                    ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_quantity', value: Math.abs(quantity) * (!isReceipt ? -1 : 1) });
    
                    let lote = itemLineInfo.lote;
    
                    if (lote != null && lote != '') {
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_lote_serie', value: lote });
                    }
    
                    if (Number(jsonPediment.values["GROUP(custrecord_lmry_mx_ped_aduana)"][0]?.value)) {
                        ped_details.setValue({ fieldId: 'custrecord_lmry_mx_ped_aduana', value: Number(jsonPediment.values["GROUP(custrecord_lmry_mx_ped_aduana)"][0]?.value) });
                    }
                    ped_details.save();
                    listSendEmail.push(
                        {
                            item: itemLineInfo.itemid,
                            pedimento: jsonPediment.values["GROUP(custrecord_lmry_mx_ped_num)"] || "",
                            lote: itemLineInfo.lote || "",
                            quantity: Math.abs(quantity),
                            isReceipt,
                            obs: pedimentSelect.obs || "",
                            location: itemLineInfo.location,
                            aduana: Number(jsonPediment.values["GROUP(custrecord_lmry_mx_ped_aduana)"][0]?.value) || ""
                        }
                    )
                }

                
            });
            return listSendEmail;
        }

        const sendEmail = (listItems,subsidiaryID,idRecord) => {

            const userID = runtime.getCurrentUser().id;
            let userName;
            let userEmail;
            const searchEmployee = search.create({
                type: "employee",
                columns: ["firstname","email","lastname"],
                filters: [{ name: "internalid", operator: "anyof", values: userID }]
            });
    
            searchEmployee.run().each((result) => {
                userName = result.getValue("firstname") + " " + result.getValue("lastname");
                userEmail = result.getValue("email");
            });

            const subsidiaryName = search.lookupFields({
                type: search.Type.SUBSIDIARY,
                id: subsidiaryID,
                columns: ['legalname']
            }).legalname;

            const {tranid} = search.lookupFields({
                type: "transaction",
                id: idRecord,
                columns: [
                    "tranid"
                ]
            });

            assignmentDetails(listItems)
            const emailBodyContent = buildMailBody(
                {
                    userName,
                    subsidiaryName,
                    tranid
                },
                listItems
            );

            if (userEmail && listItems.length) {
                email.send({
                    author: userID,
                    recipients: [userEmail],
                    subject: "LatamReady - Pedimentos",
                    body: emailBodyContent
                });
            }
            
        }

        // asigna los nombre de los item y lotes para cda linea
        const assignmentDetails = (listItems) => {
            if (!listItems.length) return false;
            const FEAT_INVENTORY = runtime.isFeatureInEffect({ feature: "advbinseriallotmgmt" });
            const itemsID = listItems.map(line => line.item);
            const jsonItems = {};
            const jsonLotes = {};

            search.create({
                type: "item",
                filters:
                    [
                        ["internalid", "anyof", itemsID]
                    ],
                columns:
                    ["internalid","itemid"]
            }).run().each(result =>{
                const internalid = result.getValue("internalid");
                jsonItems[internalid] = result.getValue("itemid") || "";
                return true;
            });
            
            if (FEAT_INVENTORY) {
                const lotesID = listItems
                    .filter(line => line.lote)
                    .map(line => line.lote);

                if (lotesID.length) {
                    search.create({
                        type: "inventorynumber",
                        filters:
                            [
                                ["internalid", "anyof", lotesID]
                            ],
                        columns:
                            ["internalid", "inventorynumber"]
                    }).run().each(result => {
                        const internalid = result.getValue("internalid");
                        jsonLotes[internalid] = result.getValue("inventorynumber") || "";
                        return true;
                    });
                }
                
            }

            const locationIDs = listItems.filter(line => line.location).map(line => line.location);
            const jsonLocation = {};
            if (locationIDs.length) {
                search.create({
                    type: "location",
                    filters:
                        [
                            ["internalid", "anyof", locationIDs]
                        ],
                    columns:
                        ["internalid", "name"]
                }).run().each(result => {
                    const internalid = result.getValue("internalid");
                    jsonLocation[internalid] = result.getValue("name") || "";
                    return true;
                });
            }

            const aduanaIDs = listItems.filter(line => line.aduana).map(line => line.aduana);
            const jsonAduana = {};
            if (aduanaIDs.length) {
                search.create({
                    type: "customrecord_lmry_mx_aduana",
                    filters:
                        [
                            ["internalid", "anyof", aduanaIDs]
                        ],
                    columns:
                        ["internalid", "name"]
                }).run().each(result => {
                    const internalid = result.getValue("internalid");
                    jsonAduana[internalid] = result.getValue("name") || "";
                    return true;
                });
            }

            
            listItems.forEach(line => {
                if (jsonItems[line.item]) line.item = jsonItems[line.item];
                if (line.lote && jsonLotes[line.lote]) line.lote = jsonLotes[line.lote];
                if (line.location && jsonLocation[line.location]) line.location = jsonLocation[line.location];
                if (line.aduana && jsonAduana[line.aduana]) line.aduana = jsonAduana[line.aduana];
            })
        }

        const buildMailBody = (dataGeneral,listItems) => {
            
            const { userName, tranid, subsidiaryName } = dataGeneral;

            const translations = getTranslations();
            const body = `
                    <div style="color: #483838; margin-bottom: 2.5rem" class="container-body">
                      <div style="text-align: center">
                        <img src="https://tstdrv1930452.app.netsuite.com/core/media/media.nl?id=81015&c=TSTDRV1930452&h=58hbjHzF0ZDtq-F905Nr-8LibSvzYGEq0aTFdlmqxQL-noK9" alt="" class="imgBanner" />
                        <p style="font-size: 18px">
                            <strong>${translations.DEAR}: </strong>${userName}
                        </p>
                      </div>
                      <p style="margin-bottom: 25px">
                        ${translations.MSG_PEDIMENTOS}
                      </p>
                      <br/>
                      <p style="font-weight: bold;">General details</p>
                      <div style="border-radius: 5px; border: 1px solid #64748b; background-color: #f8fafc; padding: 16px; color: #64748b; word-break: break-all; margin-bottom: 16px;">
                          <p style="font-weight: bold; margin: 0; margin-bottom: 5px">
                          ${translations.ENVIROMENT}
                          </p>
                        <p style="margin: 0">${runtime.envType}</p>
                      </div>
                      <div style="border-radius: 5px; border: 1px solid #64748b; background-color: #f8fafc; padding: 16px; color: #64748b; word-break: break-all; margin-bottom: 16px;">
                          <p style="font-weight: bold; margin: 0; margin-bottom: 5px">
                          ${translations.ACCOUNT_ID}
                          </p>
                          <p style="margin: 0">${runtime.accountId}</p>
                      </div>
                      <div style="border-radius: 5px; border: 1px solid #64748b; background-color: #f8fafc; padding: 16px; color: #64748b; word-break: break-all; margin-bottom: 16px;">
                          <p style="font-weight: bold; margin: 0; margin-bottom: 5px">
                          ${translations.TRANID}
                          </p>
                          <p style="margin: 0">${tranid}</p>
                      </div><div style="border-radius: 5px; border: 1px solid #64748b; background-color: #f8fafc; padding: 16px; color: #64748b; word-break: break-all; margin-bottom: 16px;">
                          <p style="font-weight: bold; margin: 0; margin-bottom: 5px">
                          ${translations.SUBSIDIARY}
                          </p>
                          <p style="margin: 0">${subsidiaryName}</p>
                      </div>

                      <br/>
                      <p style="font-weight: bold;">${translations.ITEMS}</p>
                      
                      <div class="scroll" style="overflow-x:auto; overflow-y: scroll; min-height: auto; max-height: 400px; margin-bottom: 2.5rem;">
                                  <table style="width: 100%; font-size: 14px; text-align: left; border-collapse: collapse;">
                                      <thead>
                                          <tr style="background-color: #fef2f2">
                                              <th style="padding: 10px">N°</th>
                                              <th style="padding: 10px">${translations.ITEM}</th>
                                              <th style="padding: 10px">Lote</th>
                                              <th style="padding: 10px">${translations.LOCATION}</th>
                                              <th style="padding: 10px">Aduana</th>
                                              <th style="padding: 10px">N° Pedimento</th>
                                              <th style="padding: 10px">${translations.QUANTITY}</th>
                                              <th style="padding: 10px">${translations.FLOW}</th>
                                              <th style="padding: 10px">${translations.OBS}</th>
                                          </tr>
                                      </thead>
                                      <tbody >
                                        ${listItems
                                            .map((lineItem, index) => {
                                                const textColor = lineItem.pedimento ? "#55a113" : "#ff0000";
                                                return `<tr>
                                                                        <td style="padding: 10px; color: ${textColor}; font-weight: bold;">${index + 1}</td>
                                                                        <td style="padding: 10px; color: ${textColor}; font-weight: bold;">${lineItem.item}</td>
                                                                        <td style="padding: 10px; color: ${textColor}; font-weight: bold;">${lineItem.lote || ""}</td>
                                                                        <td style="padding: 10px; color: ${textColor}; font-weight: bold;">${lineItem.location || ""}</td>
                                                                        <td style="padding: 10px; color: ${textColor}; font-weight: bold;">${lineItem.aduana || ""}</td>
                                                                        <td style="padding: 10px; color: ${textColor}; font-weight: bold;">${lineItem.pedimento || ""}</td>    
                                                                        <td style="padding: 10px; color: ${textColor}; font-weight: bold;">${lineItem.quantity}</td>
                                                                        <td style="padding: 10px; color: ${textColor}; font-weight: bold;">${lineItem.isReceipt ? translations.ENTRY : translations.EXIT}</td>
                                                                        <td style="padding: 10px; color: ${textColor}; font-weight: bold;">${lineItem.obs || ""}</td>
                                                                    </tr>`;
                                            })
                                            .join("")}
                                      </tbody>
                                  </table>
                              </div>
                    </div>`;
    
            return _emailTemplate(body);
        };

        const _emailTemplate = (body) => {
            try {
                const html = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8" />
                        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                        <link href="https://fonts.googleapis.com/css2?family=Montserrat&display=swap" rel="stylesheet" />
                        <style>
                            .container-body {
                                padding: 0 1.5rem;
                            }
                    
                            .fontSize {
                                font-size: 16px;
                            }
                    
                            .imgBanner {
                                width: 290px;
                                height: 234px;
                            }
                    
                            .iconSocial {
                                width: 30px;
                                height: 30px;
                            }
                    
                            @media screen and (max-width: 600px) {
                                .container-body {
                                    padding: 0 10px;
                                }
                    
                                .fontSize {
                                    font-size: 14px;
                                }
                    
                                .imgBanner {
                                    width: 240px;
                                    height: 184px;
                                }
                    
                                .iconSocial {
                                    width: 25px;
                                    height: 25px;
                                }
                            }
                        </style>
                    </head>
                    <body>
                        <div style="border: 1px solid #fef3f3; border-radius: 10px; overflow: hidden; max-width: 700px; margin: auto; font-family: 'Montserrat', sans-serif;" class="fontSize">
                            <div>
                                <img width="100%" src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=921&c=TSTDRV1038915&h=c493217843d184e7f054" style="display: block" />
                                <div class="container-body" style="margin-top: 15px">
                                    <table style="width: 100%">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <a style="border: 1px solid #d50303; color: #d50303; padding: 5px 10px; border-radius: 5px; text-decoration: none; font-weight: bold;" href="http://www.latamready.com/#contac" target="_blank">Contact us</a>
                                                </td>
                                                <td style="text-align: right">
                                                    <a href="https://www.latamready.com/" target="_blank" style="text-decoration: none; margin-right: 5px">
                                                        <img class="iconSocial" src="https://tstdrv1930452.app.netsuite.com/core/media/media.nl?id=81019&c=TSTDRV1930452&h=cJ2X1VY4nFbUzf385R7F5olJqkVQM8nCil2SstjTV7tl7VP1" alt="" />
                                                    </a>
                                                    <a href="https://twitter.com/LatamReady" target="_blank" style="text-decoration: none; margin-right: 5px">
                                                        <img class="iconSocial" src="https://tstdrv1930452.app.netsuite.com/core/media/media.nl?id=81013&c=TSTDRV1930452&h=E96ec-7rY3GokgxHrdHLrJm-YrTH0Y_ZNfB5FetfrXV3bwQn" alt="" />
                                                    </a>
                                                    <a href="https://www.linkedin.com/company/9207808" target="_blank" style="text-decoration: none; margin-right: 5px">
                                                        <img class="iconSocial" src="https://tstdrv1930452.app.netsuite.com/core/media/media.nl?id=81012&c=TSTDRV1930452&h=vcrpc7uakujhp6v4PU71cM-SOccTb4XyWAGOqrf5FWcmTFGf" alt="" />
                                                    </a>
                                                    <a href="https://www.facebook.com/LatamReady-337412836443120/" target="_blank" style="text-decoration: none; margin-right: 5px">
                                                        <img class="iconSocial" src="https://tstdrv1930452.app.netsuite.com/core/media/media.nl?id=81010&c=TSTDRV1930452&h=7hfzz7JtKpfMxiYei9LFmIaBvSmKmolDe5EddHl7gfCXzsyx" alt="" />
                                                    </a>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <!-- cuerpo -->
                            ${body}
                            <!-- fin de cuerpo -->
                            <div>
                                <div style="margin-bottom: 16px; text-align: center">
                                    <a href="https://www.latamready.com/" target="_blank" style="text-decoration: none; margin-right: 5px">
                                        <img class="iconSocial" src="https://tstdrv1930452.app.netsuite.com/core/media/media.nl?id=81019&c=TSTDRV1930452&h=cJ2X1VY4nFbUzf385R7F5olJqkVQM8nCil2SstjTV7tl7VP1" alt="" />
                                    </a>
                                    <a href="https://twitter.com/LatamReady" target="_blank" style="text-decoration: none; margin-right: 5px">
                                        <img class="iconSocial" src="https://tstdrv1930452.app.netsuite.com/core/media/media.nl?id=81013&c=TSTDRV1930452&h=E96ec-7rY3GokgxHrdHLrJm-YrTH0Y_ZNfB5FetfrXV3bwQn" alt="" />
                                    </a>
                                    <a href="https://www.linkedin.com/company/9207808" target="_blank" style="text-decoration: none; margin-right: 5px">
                                        <img class="iconSocial" src="https://tstdrv1930452.app.netsuite.com/core/media/media.nl?id=81012&c=TSTDRV1930452&h=vcrpc7uakujhp6v4PU71cM-SOccTb4XyWAGOqrf5FWcmTFGf" alt="" /></a>
                                    <a href="https://www.facebook.com/LatamReady-337412836443120/" target="_blank" style="text-decoration: none; margin-right: 5px">
                                        <img class="iconSocial" src="https://tstdrv1930452.app.netsuite.com/core/media/media.nl?id=81010&c=TSTDRV1930452&h=7hfzz7JtKpfMxiYei9LFmIaBvSmKmolDe5EddHl7gfCXzsyx" alt="" />
                                    </a>
                                </div>
                                <img style="display: block" width="100%" src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=918&c=TSTDRV1038915&h=7f0198f888bdbb495497" alt="" />
                            </div>
                        </div>
                    </body>
                    </html>
                `;
    
                return html;
            } catch (error) {}
        };

        const deletePedimentoDetails = (transactionID) => {
            const recordIDs = [];
            
            search.create({
                type: "customrecord_lmry_mx_pedimento_details",
                filters: [
                    ["custrecord_lmry_mx_ped_trans","anyof",transactionID]
                ], 
                columns: ["internalid"],
            }).run().each(result =>{
                recordIDs.push(result.getValue("internalid"));
                return true;
            });

            recordIDs.forEach(internalid=> record.delete({ type: "customrecord_lmry_mx_pedimento_details", id: internalid }));
        }


        return {
            get: get,
        };
    });
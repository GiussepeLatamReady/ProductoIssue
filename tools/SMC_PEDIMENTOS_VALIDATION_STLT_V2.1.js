/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @Name SMC_PEDIMENTOS_VALIDATION_V2.1.js
 * @Author LatamReady - Giussepe Delgado
 * @Date 29/01/2024
 */
define([
    'N/log',
    'N/search',
    'N/redirect',
    'N/runtime',
    'N/ui/serverWidget',
    'N/url',
    'N/task'
],
    (log, search, redirect, runtime, serverWidget, url, task) => {
        const CLIENT_SCRIPT_PATH = "./SMC_PEDIMENTOS_VALIDATION_CLNT_V2.1.js";

        const onRequest = (context) => {
            const scriptContext = {
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId,
                params: context.request.parameters,
                method: context.request.method,
                response: context.response
            };

            const handler = new SuiteletFormManager({
                params: scriptContext.params,
                method: scriptContext.method
            });

            scriptContext.method === "GET" ? processGETRequest(handler, scriptContext) : processPOSTRequest(handler, scriptContext);
        };

        const processGETRequest = (handler, { params, response }) => {
            try {

                const status = Number(params.status);
                const { form, active } = handler.createForm();
                if (active) {

                    status ? handler.setFormValues() : handler.loadFormValues();
                    handler.createTransactionSublist();
                    if (status) handler.loadTransactionSublist();
                    form.clientScriptModulePath = CLIENT_SCRIPT_PATH;
                }

                response.writePage(form);

            } catch (err) {
                log.error("[ onRequest - GET ]", err);
            }
        };

        const processPOSTRequest = (handler, { params, scriptId, deploymentId }) => {
            try {
                const status = Number(params.custpage_status);
                redirect.toSuitelet({
                    scriptId,
                    deploymentId,
                    parameters: handler.getRedirectParams()
                });
            } catch (err) {
                log.error("[ onRequest - POST ]", err);
            }
        };

        class SuiteletFormManager {
            constructor(options) {
                this.params = options.params || {};
                this.method = options.method;
                let language = runtime.getCurrentScript().getParameter({ name: "LANGUAGE" }).substring(0, 2);
                language = language === "es" ? language : "en";
                this.translations = this.getTranslations(language);
                this.subsidiaries = [];
                this.deploy = runtime.getCurrentScript().deploymentId;
                this.names = this.getNames(this.deploy);
            }

            getNames(deploy) {
                let nameList = {
                    customdeploy_lmry_co_head_wht_calc_stlt: {
                        scriptid: 'customscript_lmry_co_head_calc_stlt_log',
                        deployid: 'customdeploy_lmry_co_head_calc_stlt_log',
                        scriptMapReduce: 'customscript_lmry_co_head_wht_calc_mprd',
                        deployMapReduce: 'customdeploy_lmry_co_head_wht_calc_mprd',
                        paramuser: 'custscript_lmry_co_head_wht_calc_user',
                        paramstate: 'custscript_lmry_co_head_wht_calc_state'
                    }
                };
                return nameList[deploy];
            }

            createForm() {

                this.form = serverWidget.createForm({
                    title: 'LatamReady - MX Validacion de Pedimentos'
                });


                this.setupFormWithSubsidiaries();
                this.addFormButtons();

                return { form: this.form, active: true };
            }


            setupFormWithSubsidiaries() {

                this.addGroup('mainGroup', this.translations.LMRY_PRIMARY_INFO);
                //this.addSelectField('custpage_transaction', "Articulos de inventario", 'mainGroup').isMandatory();
                this.addCustomField('custpage_transaction', serverWidget.FieldType.TEXT, "Internalid de la transacción", 'mainGroup').setHelpText({ help: 'custpage_transaction' });
                //this.addSelectField('custpage_locations', "Locaciones", 'mainGroup').isMandatory();


                this.addHiddenField('custpage_status', 'Status');
                this.addHiddenField('custpage_log_id', 'Log ID');
                this.addHiddenField('custpage_deploy_id', 'Deploy ID', runtime.getCurrentScript().deploymentId);
            }

            addGroup(groupId, label) {
                this.form.addFieldGroup({
                    id: groupId,
                    label: label
                });
            }

            addCustomField(id, type, label, container) {
                let field = this.form.addField({
                    id: id,
                    type: type,
                    label: label,
                    container: container
                });
                return {
                    field: field,
                    isMandatory: function () {
                        this.field.isMandatory = true;
                        return this;
                    },
                    setHelpText: function (help) {
                        this.field.setHelpText(help);
                        return this;
                    }
                };
            }


            addDateField(id, label, container) {
                return this.addCustomField(id, serverWidget.FieldType.DATE, label, container).setHelpText({ help: id });
            }
            addSelectField(id, label, container) {
                return this.addCustomField(id, serverWidget.FieldType.SELECT, label, container).setHelpText({ help: id });
            }

            addHiddenField(id, label, defaultValue = '') {
                let field = this.form.addField({
                    id: id,
                    type: serverWidget.FieldType.TEXT,
                    label: label
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
                if (defaultValue) field.defaultValue = defaultValue;
            }

            addFormButtons() {
                if (!Number(this.params.status)) {
                    this.form.addSubmitButton({ label: this.translations.LMRY_FILTER });
                } else {
                    this.form.addButton({
                        id: 'btn_reload',
                        label: "Actualizar",
                        functionName: 'reload'
                    });
                    this.form.addButton({
                        id: 'btn_back',
                        label: "Atras",
                        functionName: 'back'
                    });
                    // Deshabilitar campos si es necesario
                    this.disableFields();

                }
                
                // Deshabilitar campos si es necesario
               
            }


            disableFields() {
                const fieldsToDisable = ['custpage_transaction'];
                fieldsToDisable.forEach(fieldId => {
                    let field = this.form.getField({ id: fieldId });
                    if (field) {
                        field.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    }
                });
            }


            areThereSubsidiaries() {
                let anySubsidiaryActive = false;


                if (this.FEAT_SUBS) {
                    this.subsidiaries = this.getSubsidiaries();


                    this.subsidiaries.forEach(subsidiary => {
                        subsidiary.active = true;
                        if (subsidiary.active) {
                            anySubsidiaryActive = true;
                        }
                    });
                } else {

                    const licenses = LibraryMail.getLicenses(1);
                    const isAuthorized = LibraryMail.getAuthorization(26, licenses);
                    this.subsidiaries = [{
                        value: 1,
                        text: 'Company',
                        active: isAuthorized
                    }];
                    anySubsidiaryActive = isAuthorized;
                }

                return anySubsidiaryActive;
            }



            getSubsidiaries() {

                let searchSubs = search.create({
                    type: search.Type.SUBSIDIARY,
                    filters: [['isinactive', 'is', 'F'], 'AND', ['country', 'is', 'CO']],
                    columns: ['internalid', 'name']
                });

                return searchSubs.run().getRange(0, 1000).map(result => ({
                    value: result.getValue('internalid'),
                    text: result.getValue('name'),
                    active: false
                }));
            }

            createTransactionSublist() {
                this.form.addTab({
                    id: 'transactions_tab',
                    label: "Transacciones"
                });

                this.form.addTab({
                    id: 'pedimentos_tab',
                    label: "Registros de detalles de pedimentos"
                });

                this.sublist = this.form.addSublist({
                    id: 'custpage_results_list',
                    label: "transacciones",
                    tab: 'transactions_tab',
                    type: serverWidget.SublistType.LIST
                });

                this.sublist_ped = this.form.addSublist({
                    id: 'custpage_results_list_ped',
                    label: "Registros de detalles de pedimentos",
                    tab: 'pedimentos_tab',
                    type: serverWidget.SublistType.LIST
                });


                const fields = [
                    { id: 'tranid', label: "Transacción", type: serverWidget.FieldType.TEXT },
                    { id: 'type_transaction', label: "Tipo de transaccion", type: serverWidget.FieldType.TEXT },
                    { id: 'lbl_item', label: "Articulo", type: serverWidget.FieldType.TEXT },
                    { id: 'lbl_location', label: "Locación", type: serverWidget.FieldType.TEXT },
                    { id: 'quantity', label: "Cantidad en la transaccion", type: serverWidget.FieldType.TEXT },
                    { id: 'quantity_ped', label: "Cantidad en el registro de pedimentos", type: serverWidget.FieldType.TEXT },
                    { id: 'observation', label: "Observacion", type: serverWidget.FieldType.TEXT }
                ];
                const fields_ped = [
                    { id: 'tranid_p', label: "Transacción", type: serverWidget.FieldType.TEXT },
                    { id: 'correlativo_p', label: "N° Pedimento", type: serverWidget.FieldType.TEXT },
                    { id: 'lbl_item_p', label: "Articulo", type: serverWidget.FieldType.TEXT },
                    { id: 'lbl_location_p', label: "Locación", type: serverWidget.FieldType.TEXT },
                    { id: 'quantity_ped_p', label: "Cantidad en el registro de pedimentos", type: serverWidget.FieldType.TEXT },
                    { id: 'observation_p', label: "Observacion", type: serverWidget.FieldType.TEXT }
                ];


                fields.forEach(fieldInfo => {
                    this.sublist.addField(fieldInfo);
                });
                fields_ped.forEach(fieldInfo => {
                    this.sublist_ped.addField(fieldInfo);
                });

            }

            loadFormValues() {
                //this.fillItems();
                //this.fillLocations();
            }


            setFormValues() {
                let {
                    transactionID
                } = this.params;
                let form = this.form;


                //this.fillItems();
                //this.fillLocations();

                form.updateDefaultValues({
                    custpage_status: '1',
                    custpage_transaction: this.getTranid(transactionID)
                });
            }

            fillItems() {

                const itemsField = this.form.getField({ id: 'custpage_items' });
                search.create({
                    type: search.Type.ITEM,
                    filters: [
                        ["isinactive", "is", "F"],
                        "AND",
                        ["custitem_lmry_mx_pediment", "is", "T"]
                    ],
                    columns: ['internalid', 'name']
                }).run().each(result => {
                    const gv = (i) => result.getValue(result.columns[i]);
                    itemsField.addSelectOption({ value: gv(0), text: gv(1) });
                });
            }

            fillLocations() {

                const locationsField = this.form.getField({ id: 'custpage_locations' });
                search.create({
                    type: search.Type.LOCATION,
                    filters: [
                        ["subsidiary", "anyof", "2"]
                    ],
                    columns: ['internalid', 'name']
                }).run().each(result => {
                    const gv = (i) => result.getValue(result.columns[i]);
                    locationsField.addSelectOption({ value: gv(0), text: gv(1) });
                });
            }

            loadTransactionSublist() {

                try {


                    let { finalPedimentoDetail, finalTransactions } = this.getTransactions();
                    //log.error("finalPedimentoDetail", finalPedimentoDetail);
                    //log.error("finalTransactions", finalTransactions);
                    let sublist = this.form.getSublist({ id: 'custpage_results_list' });

                    finalTransactions.forEach((transaction, i) => {
                        const { id, type, typeID, item, location, total, recordType, pedimentos, obs } = transaction;
                        const tranUrl = url.resolveRecord({ recordType, recordId: id, isEditMode: false });
                        const setSublistValue = (colId, value) => sublist.setSublistValue({ id: colId, line: i, value });
                        setSublistValue("tranid", `<a class="dottedlink" href="${tranUrl}" target="_blank">${this.getTranid(id)}</a>`);
                        setSublistValue("type_transaction", type);
                        setSublistValue("lbl_item", item);
                        setSublistValue("lbl_location", location);
                        setSublistValue("quantity", total);
                        setSublistValue("quantity_ped", pedimentos);
                        setSublistValue("observation", obs);
                    });

                    let sublist_ped = this.form.getSublist({ id: 'custpage_results_list_ped' });

                    finalPedimentoDetail.forEach((transaction, i) => {
                        const { internalid, correlativo, quantity, item, location, total, recordType, pedimentos, obs } = transaction;
                        const tranUrl = url.resolveRecord({ recordType: "customrecord_lmry_mx_pedimento_details", recordId: internalid, isEditMode: false });
                        const setSublistValue = (colId, value) => sublist_ped.setSublistValue({ id: colId, line: i, value });
                        setSublistValue("tranid_p", `<a class="dottedlink" href="${tranUrl}" target="_blank">${internalid}</a>`);
                        setSublistValue("correlativo_p", correlativo);
                        setSublistValue("lbl_item_p", item);
                        setSublistValue("lbl_location_p", location);
                        //setSublistValue("quantity", total);
                        setSublistValue("quantity_ped_p", quantity);
                        setSublistValue("observation_p", obs);
                    });

                    if (finalTransactions.length) {
                        sublist.label = `${sublist.label} (${finalTransactions.length})`;
                    }
                    if (finalPedimentoDetail.length) {
                        sublist_ped.label = `${sublist_ped.label} (${finalPedimentoDetail.length})`;
                    }
                } catch (error) {
                    log.error("error load", error)
                }
            }

            getTransactions() {
                try {


                    const jsonITems = {};
                    let {
                        transactionID
                    } = this.params;



                    search.create({
                        type: "transaction",
                        filters:
                            [
                                ["internalid", "anyof", transactionID]
                            ],
                        columns:
                            [
                                search.createColumn({
                                    name: "item",
                                    label: "Latam - MX Pedimento Item"
                                }),
                                search.createColumn({
                                    name: "location",
                                    label: "Latam - MX Pedimento Location"
                                })
                            ]
                    }).run().each(result => {

                        const item = result.getValue(result.columns[0]);
                        const location = result.getValue(result.columns[1]);
                        jsonITems[item] = {
                            item,
                            location
                        };
                        return true;
                    });
                    const transactions = [];

                    const sumTransactions = {};
                    const items = Object.keys(jsonITems);
                    //log.error("items",items)
                    let locations = Object.keys(jsonITems).map(itemID => jsonITems[itemID].location);

                    locations = [...new Set(locations)]
                    //log.error("locations",locations)
                    const transactionSearchObj = search.create({
                        type: "transaction",
                        settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                        filters:
                            [
                                ["subsidiary", "anyof", "2"],
                                "AND",
                                ["item.custitem_lmry_mx_pediment", "is", "T"],
                                "AND",
                                ["type", "anyof", "InvAdjst", "InvCount", "InvDistr", "StatChng", "InvTrnfr", "InvWksht", "ItemShip", "ItemRcpt", "WorkOrd"],
                                "AND",
                                ["formulatext: CASE WHEN {recordType} = 'itemreceipt' AND {quantity}< 0 THEN 0 ELSE 1 END", "is", "1"],
                                "AND",
                                ["formulatext: CASE WHEN {transferlocation} = {location}  THEN 0 ELSE 1 END", "is", "1"],
                                "AND",
                                ["item", "anyof", items],
                                "AND",
                                ["location", "anyof", locations]
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
                                }),
                                search.createColumn({
                                    name: "formulatext",
                                    summary: "GROUP",
                                    formula: "{recordType}",
                                    label: "Formula (Text)"
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
                                    locationID: gv(5),
                                    revised: false,
                                    typeID: gv(1),
                                    recordType: gv(6)
                                    //pedimentos: existPedimento(id,gv(3),gv(5))
                                }
                                const key = transaction.id + "-" + transaction.locationID + "-" + transaction.itemID;
                                if (!sumTransactions[key]) sumTransactions[key] = 0;
                                sumTransactions[key] = transaction.quantity;
                                transactions.push(transaction);
                            });
                        });
                    }

                    const jsonPedimentos = this.getPedimentos(items, locations)
                    /*
                    transactions.forEach(transaction => {
                        const { id, itemID, locationID, location, item } = transaction;
                        const key = id + "-" + locationID + "-" + itemID;
                        if (jsonPedimentos[key] && jsonPedimentos[key].list && jsonPedimentos[key].list.length) {
                            transaction.pedimentos = jsonPedimentos[key].total || 0;
                            transaction.revised = jsonPedimentos[key].total == sumTransactions[key]
                            transaction.total = sumTransactions[key];
                            if (!transaction.revised) {
                                if (transaction.total > transaction.pedimentos) {
                                    transaction.obs = `El articulo ${transaction.item} en la locacion ${transaction.location} no tiene la cantidad suficiente en el registro de pedimentos. Se recomienda revisar los registros asociados`
                                }
                                if (transaction.total < transaction.pedimentos) {
                                    transaction.obs = `El articulo ${transaction.item} en la locacion ${transaction.location} a excedido la cantidad existencias en el registro de pedimentos. Debe modificar el record de pedimentoss`
                                }
                            }
                        } else {
                            transaction.pedimentos = 0;
                            transaction.obs = "La transacción no tiene pedimentos";
                            transaction.total = sumTransactions[key];
                        }
                    });
                    */
                    //log.error("sumTransactions[key]", sumTransactions)
                    for (let i = 0; i < transactions.length; i++) {
                        const transaction = transactions[i];
                        const { id, itemID, locationID, location, item } = transaction;
                        const key = id + "-" + locationID + "-" + itemID;
                        if (jsonPedimentos[key] && jsonPedimentos[key].list && jsonPedimentos[key].list.length) {
                            transaction.pedimentos = jsonPedimentos[key].total || 0;
                            transaction.revised = jsonPedimentos[key].total == sumTransactions[key]
                            transaction.total = sumTransactions[key];
                            //log.error("jsonPedimentos[key].total",jsonPedimentos[key].total);
                            //log.error("sumTransactions[key]",sumTransactions[key])
                            //log.error("key",key)
                            if (!transaction.revised) {
                                if (transaction.total > transaction.pedimentos) {
                                    transaction.obs = `El articulo ${transaction.item} en la locacion ${transaction.location} no tiene la cantidad suficiente en el registro de pedimentos. Se recomienda revisar los registros asociados`
                                }
                                if (transaction.total < transaction.pedimentos) {
                                    transaction.obs = `El articulo ${transaction.item} en la locacion ${transaction.location} a excedido la cantidad existencias en el registro de pedimentos.Se debe modificar el record de pedimentos relacionados`
                                }
                            }
                        } else {
                            transaction.pedimentos = 0;
                            transaction.obs = "La transacción no tiene pedimentos";
                            transaction.total = sumTransactions[key];
                        }
                    }

                    const finalTransactions = transactions.filter(transaction => !transaction.revised && transaction.total != 0);
                    log.error("finalTransactions",finalTransactions)
                    const finalPedimentoDetail = [];

                    for (const key in jsonPedimentos) {
                        const listPedimentos = jsonPedimentos[key].list;
                        /*
                        listPedimentos.forEach(pedimentoDetail => {
                            if (!pedimentoDetail.reference) {
                                pedimentoDetail.obs = "Pedimento no relacionado a una transaccion. Se recomienda eliminarla."
                                finalPedimentoDetail.push(pedimentoDetail)
                            }
                        });
                        */
                        for (let i = 0; i < listPedimentos.length; i++) {
                            const pedimentoDetail = listPedimentos[i];
                            if (!pedimentoDetail.reference) {
                                pedimentoDetail.obs = "Pedimento no relacionado a una transaccion. Se recomienda eliminarla."
                                finalPedimentoDetail.push(pedimentoDetail)
                            }
                        }
                    }

                    return {
                        finalPedimentoDetail,
                        finalTransactions
                    }
                } catch (error) {
                    log.error("error", error)
                    log.error("error stack", error.stack)
                    return {
                        finalPedimentoDetail: [],
                        finalTransactions: []
                    }
                }
            }

            getTranid(internalId) {
                return search.lookupFields({
                    type: 'transaction',
                    id: internalId,
                    columns: ['tranid']
                }).tranid;
            }

            getPedimentos(items, locations) {
                const jsonPedimentos = {}
                const transactionSearchObj = search.create({
                    type: "customrecord_lmry_mx_pedimento_details",
                    filters:
                        [
                            ["custrecord_lmry_mx_ped_item", "anyof", items],
                            "AND",
                            ["custrecord_lmry_mx_ped_location", "anyof", locations],
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
                                jsonPedimentos[key] = {};
                                jsonPedimentos[key].list = [];
                                jsonPedimentos[key].total = 0;
                            }

                            unitPedimento.quantity = parseFloat(result.getValue(result.columns[0]));
                            unitPedimento.internalid = result.getValue(result.columns[4]) || "";
                            unitPedimento.correlativo = result.getValue(result.columns[5]) || "";
                            unitPedimento.date = result.getValue(result.columns[6]) || "";
                            unitPedimento.aduana = result.getText(result.columns[7]) || "";
                            unitPedimento.referenceSource = result.getValue(result.columns[8]) || "";
                            unitPedimento.reference = result.getValue(result.columns[3]) || "";
                            unitPedimento.trandate = result.getValue(result.columns[9]) || "";
                            //unitPedimento.ei = this.isValid(result.getValue(result.columns[10]));
                            unitPedimento.item = result.getText(result.columns[1]);
                            unitPedimento.location = result.getText(result.columns[2]);
                            unitPedimento.revised = false;
                            jsonPedimentos[key].total += unitPedimento.quantity;
                            jsonPedimentos[key].list.push(unitPedimento);
                        });
                    });
                }
                return jsonPedimentos;
            }

            isValid(check) {
                return check === true || check === "T" ? "T" : "F";
            }
            getTransactionsMain(ids, jsonData) {

                let reclasificationIds = ids.filter(id => jsonData[id]);
                let retentionIds = ids.filter(id => !jsonData[id]);

                //reclasificationIds = this.getReclasificationIds(reclasificationIds)
                return [
                    ...this.getSearch(reclasificationIds, true),
                    ...this.getSearch(retentionIds, false)

                ];
            }

            getSearch(ids, isReclasification) {
                if (ids.length == 0) {
                    return ids;
                }
                let data = [];
                let filters = [
                    ["internalid", "anyof", ids],
                    "AND",
                    ["mainline", "is", "T"]

                ];

                if (!isReclasification) {
                    filters.push('AND', ["custrecord_lmry_br_transaction.internalid", "anyof", "@NONE@"]);
                }

                let columns = [];
                columns.push(search.createColumn({ name: 'formulatext', formula: '{internalid}', sort: search.Sort.DESC }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{type}' }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{entity}' }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{recordType}' }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{custbody_lmry_document_type}' }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{tranid}' }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{fxamount}' }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{currency}' }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{entity.id}' }));

                // Se agrego las columnas de retenciones
                columns.push(search.createColumn({ name: 'formulatext', formula: '{custbody_lmry_co_reteiva}' }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{custbody_lmry_co_reteica}' }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{custbody_lmry_co_retefte}' }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{custbody_lmry_co_autoretecree}' }));


                let settings = [];
                if (this.FEAT_SUBS) {
                    settings = [search.createSetting({ name: 'consolidationtype', value: 'NONE' })];
                }
                let searchTransactions = search.create({
                    type: "transaction",
                    filters: filters,
                    columns: columns,
                    settings: settings
                });


                let pageData = searchTransactions.runPaged({ pageSize: 1000 });
                if (pageData) {
                    pageData.pageRanges.forEach(function (pageRange) {
                        let page = pageData.fetch({ index: pageRange.index });
                        page.data.forEach(function (result) {
                            const columns = result.columns;
                            let transaction = {};
                            transaction.id = result.getValue(columns[0]) || " ";
                            transaction.legalDocument = result.getValue(columns[4]) || " ";
                            transaction.entityName = result.getValue(columns[2]) || " ";
                            transaction.entityValue = result.getValue(columns[8]) || " ";
                            transaction.tranid = result.getValue(columns[5]) || " - ";
                            transaction.type = result.getValue(columns[1]) || " ";
                            transaction.recordType = result.getValue(columns[3]) || " ";
                            transaction.amount = Math.abs(result.getValue(columns[6])) || 0;
                            transaction.currency = result.getValue(columns[7]) || " ";

                            // Se agrego las columnas de retenciones
                            transaction.co_reteiva = result.getValue(columns[9]) || " ";
                            transaction.co_reteica = result.getValue(columns[10]) || " ";
                            transaction.co_retefte = result.getValue(columns[11]) || " ";
                            transaction.co_retecre = result.getValue(columns[12]) || " ";
                            transaction.isReclasification = isReclasification ? "T" : "F";
                            data.push(transaction);
                        });
                    });
                }


                return data;
            }

            getIdsFilterTaxResult = ids => {
                if (ids.length == 0) {
                    return ids;
                }
                let transactionIds = {}
                let searchRecordLog = search.create({
                    type: 'customrecord_lmry_br_transaction',
                    filters: [
                        ['custrecord_lmry_br_transaction', 'anyof', ids],
                        "AND",
                        ["custrecord_lmry_co_wht_applied", "anyof", "@NONE@"]
                    ],
                    columns: [
                        'custrecord_lmry_br_transaction.internalid'
                    ]
                })

                let pageData = searchRecordLog.runPaged({ pageSize: 1000 });
                if (pageData) {
                    pageData.pageRanges.forEach(function (pageRange) {
                        let page = pageData.fetch({ index: pageRange.index });
                        page.data.forEach(function (result) {
                            const id = result.getValue(result.columns[0]);
                            transactionIds[id] = true;
                        });
                    });
                }

                return Object.keys(transactionIds);

            }

            getReclasificationIds(ids) {
                if (ids.length == 0) {
                    return ids;
                }
                let transactionIds = {}
                let searchRecordLog = search.create({
                    type: 'customrecord_lmry_br_transaction',
                    filters: [
                        ['custrecord_lmry_br_transaction', 'anyof', ids],
                        "AND",
                        ["custrecord_lmry_co_wht_applied", "noneof", "@NONE@"]
                    ],
                    columns: [
                        'custrecord_lmry_br_transaction.internalid',
                        'custrecord_lmry_co_wht_applied.memomain'
                    ]
                })

                let pageData = searchRecordLog.runPaged({ pageSize: 1000 });
                if (pageData) {
                    pageData.pageRanges.forEach(function (pageRange) {
                        let page = pageData.fetch({ index: pageRange.index });
                        page.data.forEach(function (result) {
                            let id = result.getValue(result.columns[0]);
                            let memo = result.getValue(result.columns[1]);
                            if (memo.startsWith("Latam - WHT Reclasification")) {
                                transactionIds[id] = true;
                            }
                        });
                    });
                }
                const correctIds = Object.keys(transactionIds);
                if (correctIds.length) ids = ids.filter(id => !correctIds.includes(id));//Se retira las transacciones que han generado el tax result correctamente
                return ids;
            }


            getPeriods(subsidiaryValue, initialPeriod, finalPeriod) {

                const periodlookup1 = search.lookupFields({
                    type: 'accountingperiod',
                    id: initialPeriod,
                    columns: ['startdate']
                });

                const periodlookup2 = search.lookupFields({
                    type: 'accountingperiod',
                    id: finalPeriod,
                    columns: ['enddate']
                });

                let periodIds = new Array();

                let searchFilters = new Array();
                searchFilters.push({ name: 'isyear', operator: 'is', values: false });
                searchFilters.push({ name: 'isquarter', operator: 'is', values: false });

                if (this.FEAT_SUBS && this.FEAT_CALENDAR) {

                    searchFilters.push({ name: 'fiscalCalendar', operator: 'is', values: this.getFiscalCalendar(subsidiaryValue) });
                }
                searchFilters.push({ name: 'startdate', operator: 'onorafter', values: periodlookup1.startdate });
                searchFilters.push({ name: 'enddate', operator: 'onorbefore', values: periodlookup2.enddate });

                let searchColumns = new Array();
                searchColumns.push({ name: 'internalid', sort: search.Sort.ASC, summary: 'GROUP' });

                search.create({
                    type: 'accountingperiod',
                    filters: searchFilters,
                    columns: searchColumns
                }).run().each(result => {
                    periodIds.push(result.getValue(result.columns[0]));
                    return true;
                });


                return this.generatePeriodFormula(periodIds);
            }

            generatePeriodFormula(idsPeriod) {
                const periodsString = idsPeriod.map(id => `'${id}'`).join(', ');
                return `CASE WHEN {custbody_lmry_reference_transaction.postingperiod.id} IN (${periodsString}) THEN 1 ELSE 0 END`;
            }

            getFiscalCalendar(subsidiaryValue) {
                let subsidiary = search.lookupFields({
                    type: search.Type.SUBSIDIARY,
                    id: subsidiaryValue,
                    columns: ['fiscalCalendar']
                })
                return subsidiary.fiscalCalendar[0].value;
            }

            getRedirectParams() {
                let params = this.params;
                return {
                    transactionID: params.custpage_transaction || '',
                    status: '1'
                };
            }

            getTranslations(country) {
                const translatedFields = {
                    "es": {
                        "LMRY_MESSAGE": "Mensaje",
                        "LMRY_MESSAGE_LICENSE": "AVISO: Actualmente la licencia para este módulo está vencida, por favor contacte al equipo comercial de LatamReady.",
                        "LMRY_MESSAGE_CONTACT": "También puedes contactar con nosotros a",
                        "LMRY_PRIMARY_INFO": "Informacion primaria",
                        "LMRY_SUBSIDIARY": "Subsidiaria",
                        "LMRY_WTH_TYPE": "Tipo de retención",
                        "LMRY_PERIOD_INTERVAL": "Intervalo de periodos",
                        "LMRY_START_DATE": "Fecha de inicio",
                        "LMRY_END_DATE": "Fecha final",
                        "LMRY_PERIOD": "Periodo contable",
                        "LMRY_START_PERIOD": "Periodo contable inicial",
                        "LMRY_FINAL_PERIOD": "Perido contable final",
                        "LMRY_FILTER": "Filtrar",
                        "LMRY_PROCESS": "Procesar",
                        "LMRY_BACK": "Atras",
                        "LMRY_RESTART": "Reiniciar",
                        "LMRY_PERIOD_TYPE": "Tipo de período",
                        "LMRY_TRANSACTIONS": "Transacciones",
                        "LMRY_RESULTS": "Resultados",
                        "LMRY_APPLY": "Aplicar",
                        "LMRY_DOCUMENT_NUMBER": "Nùmero de Documento",
                        "LMRY_INTERNALID": "ID Interno",
                        "LMRY_TRANSACTION_TYPE": "Tipo de transaccion",
                        "LMRY_FISCAL_DOCUMENT": "Numero de documento fiscal",
                        "LMRY_AMOUNT": "Importe",
                        "LMRY_SELECT_ALL": "Seleccionar todo",
                        "LMRY_DESELECT_ALL": "Deseleccionar todo",
                        "LMRY_WHT_HEADER": "Cabecera",
                        "LMRY_WHT_LINE": "Linea",
                        "LMRY_DATE_RANGE": "Rango de fechas",
                        "LMRY_TYPE_PROCESS": "Proceso",
                        "LMRY_SALES": "Ventas",
                        "LMRY_PURCHASES": "Compras",
                        "LMRY_ENTITY": "Entidad",
                        "LMRY_CURRENCY": "Moneda",
                        "LMRY_VIEW_LOG": "Ver registro",
                        "LMRY_RETEICA": "ReteICA",
                        "LMRY_RETEIVA": "ReteIVA",
                        "LMRY_RETEFTE": "ReteFte",
                        "LMRY_RETECRE": "ReteCre",
                        "LMRY_RECLASIFICATION": "Reclasificación"
                    },
                    "en": {
                        "LMRY_MESSAGE": "Message",
                        "LMRY_MESSAGE_LICENSE": "NOTICE: Currently the license for this module is expired, please contact the LatamReady sales team.",
                        "LMRY_MESSAGE_CONTACT": "You can also contact us through",
                        "LMRY_PRIMARY_INFO": "Primary information",
                        "LMRY_SUBSIDIARY": "Subsidiary",
                        "LMRY_WTH_TYPE": "Withholding type",
                        "LMRY_PERIOD_INTERVAL": "Period interval",
                        "LMRY_START_DATE": "Start date",
                        "LMRY_END_DATE": "End date",
                        "LMRY_PERIOD": "Accounting period",
                        "LMRY_START_PERIOD": "Initial Accounting period",
                        "LMRY_FINAL_PERIOD": "Final Accounting period",
                        "LMRY_FILTER": "Filter",
                        "LMRY_PROCESS": "Process",
                        "LMRY_BACK": "Back",
                        "LMRY_RESTART": "Restart",
                        "LMRY_PERIOD_TYPE": "Type of period",
                        "LMRY_TRANSACTIONS": "Transactions",
                        "LMRY_RESULTS": "Results",
                        "LMRY_APPLY": "Apply",
                        "LMRY_DOCUMENT_NUMBER": "Document Number",
                        "LMRY_INTERNALID": "Internal ID",
                        "LMRY_TRANSACTION_TYPE": "Transaction type",
                        "LMRY_FISCAL_DOCUMENT": "Fiscal document number",
                        "LMRY_AMOUNT": "Amount",
                        "LMRY_SELECT_ALL": "Select all",
                        "LMRY_DESELECT_ALL": "Deselect all",
                        "LMRY_WHT_HEADER": "Header",
                        "LMRY_WHT_LINE": "Line",
                        "LMRY_DATE_RANGE": "Date range",
                        "LMRY_TYPE_PROCESS": "Process",
                        "LMRY_SALES": "Sales",
                        "LMRY_PURCHASES": "Purchases",
                        "LMRY_ENTITY": "Entity",
                        "LMRY_CURRENCY": "Currency",
                        "LMRY_VIEW_LOG": "View Log",
                        "LMRY_RETEICA": "ReteICA",
                        "LMRY_RETEIVA": "ReteIVA",
                        "LMRY_RETEFTE": "ReteFte",
                        "LMRY_RETECRE": "ReteCre",
                        "LMRY_RECLASIFICATION": "Reclasification"
                    }
                }
                return translatedFields[country];
            }


            toLogSuitelet() {
                const params = {
                    executionType: "UI"
                }
                redirect.toSuitelet({
                    scriptId: this.names.scriptid,
                    deploymentId: this.names.deployid,
                    parameters: params
                });
            }

            runMapReduce({ state, user }) {
                const licenses = this.FEAT_SUBS
                    ? LibraryMail.getAllLicenses()[this.params.custpage_subsidiary]
                    : LibraryMail.getLicenses(1);

                const featureLatam = LibraryMail.getAuthorization(26, licenses);
                const { scriptMapReduce: MPRD_SCRIPT_ID, deployMapReduce: MPRD_DEPLOY_ID } = this.names;
                const parameters = featureLatam ? {
                    custscript_lmry_co_head_wht_calc_user: user,
                    custscript_lmry_co_head_wht_calc_state: state
                } : {};

                task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: MPRD_SCRIPT_ID,
                    deploymentId: MPRD_DEPLOY_ID,
                    params: parameters
                }).submit();
            }



            setParams(parameters) {
                this.params = parameters;
            }

        }

        return { onRequest, SuiteletFormManager };
    });
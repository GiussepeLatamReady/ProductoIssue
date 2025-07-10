/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @Name SMC_Update_Bundles_STLT.js
 */
define([
    'N/log',
    'N/search',
    'N/redirect',
    'N/runtime',
    'N/ui/serverWidget',
    'N/url',
    'N/task',
    'N/record',
],
    (log, search, redirect, runtime, serverWidget, url, task,record ) => {
        const CLIENT_SCRIPT_PATH = "./SMC_Update_Bundles_CLNT.js";

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

                handler.getData();
                const form = handler.createForm();

                handler.createFilesSublist();
                handler.loadFilesSublist();
                handler.createBundlesSublist();
                handler.loadBundlesSublist();

                //log.error("this.form",this.form)



                response.writePage(form);

            } catch (err) {
                log.error("[ onRequest - GET ]", err);
            }
        };

        const processPOSTRequest = (handler, { params, scriptId, deploymentId }) => {
            try {

                handler.runSchedule();
                redirect.toSuitelet({
                    scriptId,
                    deploymentId
                });

            } catch (err) {
                log.error("[ onRequest - POST ]", err);
            }
        };

        class SuiteletFormManager {
            constructor(options) {
                this.params = options.params || {};
                this.deploy = runtime.getCurrentScript().deploymentId;
                //this.form = {};
            }

            createForm() {

                this.form = serverWidget.createForm({
                    title: 'LatamReady - Update File Bundles'
                });
                this.form.addButton({
                    label: "Refresh",
                    id: "custpage_add_file",
                    functionName: "reload()"
                });
                /*
                this.form.addButton({
                    label: "Add File",
                    id: "custpage_add_file",
                    functionName: "addFile"
                });
                this.form.addButton({
                    label: "Add Bundle",
                    id: "custpage_add_bundle",
                    functionName: "addBundle"
                });

                
                this.addGroup('mainGroup', "File configuration");
                this.addTextField('custpage_new_file', "File Name", 'mainGroup')
                this.addGroup('mainConfig', "Bundle Configuration");
                this.addTextField('custpage_bundle_cliente', "Bundle Client Id", 'mainConfig')
                this.addTextField('custpage_bundle_environment', "Bundle Environment Id", 'mainConfig')
                */

                let myInlineHtml = this.form.addField({
                    id: 'custpage_lmry_v_message',
                    label: " ",
                    type: serverWidget.FieldType.INLINEHTML
                }).updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW
                }).updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });
                const status = this.data.status;
                log.error("this.data", this.data)
                const messageHtml = `
                <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background: #f4f4f4;
                                margin: 0;
                                padding: 0;
                            }
                            .container {
                                max-width: 400px;
                                margin: 40px auto;
                                padding: 20px;
                                border-radius: 6px;
                                background: #fff;
                                text-align: center;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            }
                            .status-complete {
                                color: #28a745;
                                border-left: 5px solid #28a745;
                            }
                            .status-processing {
                                color: #ffc107;
                                border-left: 5px solid #ffc107;
                            }
                            .status-label {
                                font-size: 18px;
                                font-weight: bold;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 8px;
                            }
                            .icon {
                                font-size: 20px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container ${status === 'complete' ? 'status-complete' : 'status-processing'}">
                            <div class="status-label">
                                <span class="icon">
                                    ${status === 'complete' ? '✔️' : '⏳'}
                                </span>
                                ${status === 'complete' ? 'Complete' : 'Processing'}
                            </div>
                        </div>
                    </body>
                </html>
                    `;
                myInlineHtml.defaultValue = messageHtml;
                this.form.addSubmitButton({ label: "Update Files" });
                this.form.clientScriptModulePath = CLIENT_SCRIPT_PATH;
                return this.form
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


            addTextField(id, label, container) {
                return this.addCustomField(id, serverWidget.FieldType.TEXT, label, container).setHelpText({ help: id });
            }

            addHtmlField(id, label, container) {
                return this.addCustomField(id, serverWidget.FieldType.INLINEHTML, label, container);
            }

            createFilesSublist() {
                this.form.addTab({
                    id: 'transactions_tab',
                    label: "Files Tab"
                });

                this.sublist = this.form.addSublist({
                    id: 'custpage_results_list',
                    label: "Files",
                    tab: 'transactions_tab',
                    type: serverWidget.SublistType.LIST
                });


                const fields = [
                    { id: 'apply', label: "Apply", type: serverWidget.FieldType.CHECKBOX, displayType: serverWidget.FieldDisplayType.DISABLED },
                    { id: 'sublist_filename', label: "File Name", type: serverWidget.FieldType.TEXT }
                ];


                fields.forEach(fieldInfo => {
                    let field = this.sublist.addField(fieldInfo);
                    if (fieldInfo.displayType) {
                        field.updateDisplayType({ displayType: fieldInfo.displayType });
                    }
                });

                return this.sublist;
            }

            loadFilesSublist() {

                let sublist = this.form.getSublist({ id: 'custpage_results_list' });

                this.data.filenames.forEach((filename, i) => {
                    const setSublistValue = (colId, value) => sublist.setSublistValue({ id: colId, line: i, value });
                    setSublistValue("apply", "T");
                    setSublistValue("sublist_filename", filename);
                })

                if (this.data.filenames.length) {
                    sublist.label = `${sublist.label} (${this.data.filenames.length})`;
                }

            }

            createBundlesSublist() {
                this.form.addTab({
                    id: 'bundles_tab',
                    label: "Bundles Tab"
                });

                this.sublist = this.form.addSublist({
                    id: 'custpage_results_list_bundles',
                    label: "Bundles",
                    tab: 'bundles_tab',
                    type: serverWidget.SublistType.LIST
                });


                const fields = [
                    { id: 'sublist_bundle_id_client', label: "Client Id", type: serverWidget.FieldType.TEXT },
                    { id: 'sublist_bundle_id_enviroment', label: "Test environment id", type: serverWidget.FieldType.TEXT }
                ];


                fields.forEach(fieldInfo => {
                    let field = this.sublist.addField(fieldInfo);
                    if (fieldInfo.displayType) {
                        field.updateDisplayType({ displayType: fieldInfo.displayType });
                    }
                });

                return this.sublist;
            }

            loadBundlesSublist() {

                let sublist = this.form.getSublist({ id: 'custpage_results_list_bundles' });

                let j = 0;
                for (const bundleId in this.data.bundles) {
                    const bundle_map = this.data.bundles[bundleId];
                    const setSublistValue = (colId, value) => sublist.setSublistValue({ id: colId, line: j, value });
                    setSublistValue("sublist_bundle_id_client", bundleId);
                    if (bundle_map) {
                        setSublistValue("sublist_bundle_id_enviroment", this.data.bundles[bundleId]);
                    }
                    j++;
                }

                if (Object.keys(this.data.bundles).length) {
                    sublist.label = `${sublist.label} (${Object.keys(this.data.bundles).length})`;
                }

            }

            getData() {
                this.data = {
                    filenames: [],
                    bundles: {},
                    status: "Nole"
                };
                const fileSearch = search.create({
                    type: 'customrecord_smc_update_bundles',
                    columns: [
                        'custrecord_smc_filenames',
                        'custrecord_smc_bundles',
                        'custrecord_smc_status'
                    ]
                });

                fileSearch.run().each((result) => {
                    try {
                        let filenames = result.getValue('custrecord_smc_filenames')
                        if (filenames) this.data.filenames = JSON.parse(filenames);
                    } catch (error) {
                        log.error("error [getData filenames]", error)
                    }

                    try {
                        let bundles = result.getValue('custrecord_smc_bundles')
                        if (bundles) this.data.bundles = JSON.parse(bundles);
                    } catch (error) {
                        log.error("error [getData bundles]", error)
                    }
                    this.data.status = result.getValue('custrecord_smc_status') || ""
                });
            }

            runSchedule() {
                record.submitFields({
                    type: "customrecord_smc_update_bundles",
                    id: "1",
                    values: {
                        custrecord_smc_status: "processing",
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                        disableTriggers: true
                    }
                });
                task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: "customscript_smc_update_bundles_schdl",
                    deploymentId: "customdeploy_smc_update_bundles_schdl"
                }).submit();
            }

        }

        return { onRequest, SuiteletFormManager };
    });
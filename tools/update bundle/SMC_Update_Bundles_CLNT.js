/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @Name SMC_Update_Bundles_CLNT.js
 * @Author LatamReady - Giussepe Delgado
 * @Date 29/01/2024
 */
define(['N/runtime',
    'N/search',
    'N/record',
    'N/format',
    'N/ui/message',
    'N/url',
    'N/currentRecord'],
    (runtime, search, record, format, message, urlApi, currentRecord) => {
        const STLT_ID = 'customscript_lmry_co_head_wht_calc_stlt';
        let DEPLOY_ID, handler;

        const pageInit = context => {
            handler = new ClientUIManager({ deployid: DEPLOY_ID });
            handler.pageInit(context);
        };

        const saveRecord = context => handler.saveRecord(context);

        const back = () => {
            const urlSuitelet = urlApi.resolveScript({
                scriptId: STLT_ID,
                deploymentId: DEPLOY_ID,
                returnExternalUrl: false
            });
            window.location.href = urlSuitelet;
        };

        const backLog = () => {
            const urlSuitelet = urlApi.resolveScript({
                scriptId: "customscript_lmry_co_head_calc_stlt_log",
                deploymentId: "customdeploy_lmry_co_head_calc_stlt_log",
                returnExternalUrl: false
            });
            window.location.href = urlSuitelet;
        };

        const createRecord = () => {
            const urlSuitelet = urlApi.resolveScript({
                scriptId: "customscript_lmry_co_head_calc_stlt_log",
                deploymentId: "customdeploy_lmry_co_head_calc_stlt_log",
                returnExternalUrl: false
            });
            window.location.href = urlSuitelet;
        };


        const reload = () => {

            const urlSuitelet = urlApi.resolveScript({
                scriptId: "customscript_smc_update_bundle_sltl",
                deploymentId: "customdeploy_smc_update_bundle_sltl",
                returnExternalUrl: false
            });
            window.location.href = urlSuitelet;

        }

        class ClientUIManager {
            constructor(options) {

            }

            pageInit(scriptContext) {
                
            }

            saveRecord(context) {
                try {
                    /*
                    this.currentRecord = context.currentRecord;
                    let recordObj = context.currentRecord;
                    const whtType = recordObj.getValue({ fieldId: 'custpage_wht_type' });

                    if(!whtType) return true;

                    let status = recordObj.getValue({ fieldId: 'custpage_status' });
                    status = Number(status);
                    if (!status) {
                        if (!this.validateMandatoryFields()) {
                            return false;
                        }
                        
                    } else {
                        if (!this.validateSublist()) {
                            return false;
                        }

                        if (!this.validateExecution()) {
                            return false;
                        }

                        if (!this.createRecordLog()) {
                            return false;
                        }
                    }
                        */

                    if (!this.validateExecution()) {
                        return false;
                    }
                } catch (err) {
                    //this.handleError('[ saveRecord ]', err);
                    return false;
                }

                return true;
            }




            validateExecution() {
                let mprd_scp = 'customscript_smc_update_bundles_schdl';
                let mprd_dep = 'customdeploy_smc_update_bundles_schdl';
                let search_executions = search.create({
                    type: 'scheduledscriptinstance',
                    filters: [
                        ['status', 'anyof', 'PENDING', 'PROCESSING'],
                        'AND',
                        ['script.scriptid', 'is', mprd_scp],
                        'AND',
                        ['scriptdeployment.scriptid', 'is', mprd_dep]
                    ],
                    columns: [
                        'status'
                    ]
                });

                let results = search_executions.run().getRange(0, 1);

                if (results && results.length) {
                    let myMsg = message.create({
                        title: "Alert",
                        message: "Please wait a moment, the process is in progress.",
                        type: message.Type.INFORMATION,
                        duration: 4000
                    });
                    myMsg.show();
                    return false;
                }

                return true;
            }



        }

        return { pageInit, saveRecord, back, backLog, reload, ClientUIManager };
    });
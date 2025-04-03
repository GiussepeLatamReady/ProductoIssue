/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @Name LMRY_CO_Header_WHT_calculation_CLNT_V2.1.js
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
        const STLT_ID = 'customscript_smc_validation_pedimentos';
        let DEPLOY_ID, handler;

        const pageInit = context => {
            const recordObj = context.currentRecord;
            DEPLOY_ID = recordObj.getValue('custpage_deploy_id');
            handler = new ClientUIManager({ deployid: DEPLOY_ID });
            handler.pageInit(context);
        };

        const validateField = context => handler.validateField(context);

        const saveRecord = context => handler.saveRecord(context);

        const back = () => {
            const urlSuitelet = urlApi.resolveScript({
                scriptId: STLT_ID,
                deploymentId: DEPLOY_ID,
                returnExternalUrl: false
            });
            window.location.href = urlSuitelet;
        };

        const toggleCheckBoxes = isApplied => {
            const recordObj = currentRecord.get();
            const numberLines = recordObj.getLineCount({ sublistId: 'custpage_results_list' });
            for (let i = 0; i < numberLines; i++) {
                recordObj.selectLine({ sublistId: 'custpage_results_list', line: i });
                recordObj.setCurrentSublistValue({ sublistId: 'custpage_results_list', fieldId: 'apply', value: isApplied });
            }
        };

        const reload = () => {

            var _record = currentRecord.get();

            var path = urlApi.resolveRecord({
                recordType: _record.type,
                recordId: _record.id,
                isEditMode: false,
            });

            setWindowChanged(window, false);
            window.location.href = path;

        }

        class ClientUIManager {
            constructor(options) {
                
                let language = runtime.getCurrentScript().getParameter({ name: "LANGUAGE" }).substring(0, 2);
                language = language === "es" ? language : "en";
                this.deploy = options.deployid;
                this.names = this.getNames(this.deploy);
                this.translations = this.getTranslations(language);

            }


            getNames(deploy) {
                let nameList = {
                    customdeploy_lmry_co_head_wht_calc_stlt: {
                        scriptmprd: 'customscript_lmry_co_head_wht_calc_mprd',
                        deploymprd: 'customdeploy_lmry_co_head_wht_calc_mprd'
                    }
                };
                return nameList[deploy];
            }

            pageInit(scriptContext) {
                
                
            }
            validateField(scriptContext) {
                
                return true;
            }

            saveRecord(context) {
                try {
                    this.currentRecord = context.currentRecord;
                    let recordObj = context.currentRecord;
                    let status = recordObj.getValue({ fieldId: 'custpage_status' });
                    status = Number(status);
                    if (!status) {
                        if (!this.validateMandatoryFields()) {
                            return false;
                        }
                        
                    } 
                } catch (err) {
                    console.log("horror")
                    console.log(err)
                    return false;
                }

                return true;
            }



            validateMandatoryFields() {
                const recordObj = this.currentRecord;
                const fieldsObj = {};
                //const periodTypeValue = this.currentRecord.getValue({ fieldId: 'custpage_ period _type' });
                let mandatoryFields = [
                    'custpage_transaction'
                ];
                
                const isFieldInvalid = (fieldId) => {
                    const value = recordObj.getValue({ fieldId });
                    fieldsObj[fieldId] = value;
                    if (value == 0 || !value) {
                        const fieldLabel = recordObj.getField({ fieldId }).label;
                        alert(`${this.translations.LMRY_VALIDATE_VALUES} ${fieldLabel}`);
                        return true;
                    }
                    return false;
                };


                return !mandatoryFields.some(isFieldInvalid);
            }



            getTranslations(country) {
                const translatedFields = {
                    "es": {
                      "LMRY_VALIDATE_VALUES": "Ingrese un valor para:",
                      "LMRY_PROCESS_ACTIVATE": "Espere un momento por favor, el proceso se encuentra en curso.",
                      "LMRY_FILTER_TRANSACTIONS": "No hay transacciones Filtradas",
                      "LMRY_SELECTED_TRANSACTIONS": "No hay transacciones Seleccionadas",
                      "LMRY_ALERT": "Alerta",
                      "LMRY_VALIDATE_PERIODS": "El período inicial no puede ser mayor que el período final",
                    },
                    "en": {
                      "LMRY_VALIDATE_VALUES": "Enter a value for:",
                      "LMRY_PROCESS_ACTIVATE": "Please wait a moment, the process is in progress.",
                      "LMRY_FILTER_TRANSACTIONS": "No Filtered Transactions",
                      "LMRY_SELECTED_TRANSACTIONS": "No Selected Transactions",
                      "LMRY_ALERT": "Alert",
                      "LMRY_VALIDATE_PERIODS": "Initial period can't be bigger than final period",
                    }
                  };
                return translatedFields[country];
            }

        }

        return { pageInit, saveRecord, back, toggleCheckBoxes, reload, ClientUIManager };
    });
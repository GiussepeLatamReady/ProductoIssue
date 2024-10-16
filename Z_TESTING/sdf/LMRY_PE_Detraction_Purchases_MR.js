/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                    ||
||                                                             ||
||  File Name: LMRY_PE_Detraction_Purchases_MR.js     	       ||
||                                                             ||
||  Version Date         Author        Remarks                 ||
||  2.1     Nov 30 2023  LatamReady    Use Script 2.1          ||
\= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/format', 'N/log', 'N/record', 'N/search', 'N/runtime', 'SuiteApps/com.latamready.lmrylocalizationcore/lib/licenses/LR_Licenses_LIB', '../constants/LR_PE_FEATURES_CONST'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{search} search
 */
    function (format, log, record, search, runtime, Lib_Licenses, PE_FEAT) {

        let contextObj = null;
        let parameters = {};
        //Features
        let FEATURE_SUBSIDIARY = false;
        let FOREIGNCURRENCYMANAGEMENT = false;
        let CUSTOMAPPROVALJOURNAL = false;

        const featureValues = {
            T: true,
            F: false
        };

        let LMRY_script = 'LatamReady - Detraction Purchases MR';

        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        function getInputData() {

            try {
                getParametersAndFeatures();
                let dataTransactions = getTransactions();
                log.debug('dataTransactions', dataTransactions);
                return dataTransactions;
            } catch (error) {
                log.error('error getInputData', error);
                record.submitFields({
                    type: 'customrecord_lr_pe_detraction_batch',
                    id: parameters.pState,
                    values: {
                        'custrecord_lr_pe_det_status': '7',
                        'custrecord_lr_pe_det_details': error
                    },
                    options: {
                        enableSourcing: true,
                        ignoreMandatoryFields: true,
                        disableTriggers: true
                    }
                });
            }

        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        function map(mapContext) {

            try {
                getParametersAndFeatures();
                let idTransaction = mapContext.key;
                let currentData = mapContext.value;
                currentData = JSON.parse(currentData);
                //Obtener la fecha del Bill
                let infoBill = search.lookupFields({
                    type: 'vendorbill',
                    id: idTransaction,
                    columns: ['trandate']
                });
                let dateBill = infoBill.trandate;
                currentData['dateBill'] = dateBill;
                //Obtener el id de la cuenta de Detracción del Bill Credit
                let infoTransaction = getInformationTransaction(idTransaction);
                if (Object.keys(infoTransaction).length > 0) {
                    let detractionAccount = infoTransaction.account;
                    if (Number(detractionAccount)) {
                        currentData['detractionAccount'] = detractionAccount;
                    }
                    let mainName = infoTransaction.mainname;
                    if (Number(mainName)) {
                        currentData['mainName'] = mainName;
                    }
                }
                let bankAccounts = getBankAccount(currentData.subsidiary);
                if (Object.keys(bankAccounts).length > 0) {
                    currentData['bankAccount'] = bankAccounts.bankAccount;
                    currentData['bankCommision'] = bankAccounts.bankCommision;
                }
                //Obtener valores del Setup Tax Subsidiary
                let setupValues = getSetupTaxSubsidiary(currentData.subsidiary);

                if (Object.keys(setupValues).length > 0) {
                    let baseCurrency = setupValues.currency;
                    if (Number(baseCurrency)) {
                        currentData['baseCurrency'] = baseCurrency;
                    }
                    let form = setupValues.journalForm;
                    if (Number(form)) {
                        currentData['form'] = Number(form);
                    }
                    let roundingAcc = setupValues.setupRoundingAccount;
                    if (Number(roundingAcc)) {
                        currentData['roundingAcc'] = Number(roundingAcc);
                    }
                    let { setupVatAccount, department, _class, location } = setupValues;
                    if (Number(setupVatAccount)) {
                        currentData['setupVatAccount'] = Number(setupVatAccount);
                    }

                    if (department) {
                        currentData['setup_department'] = department;
                    }

                    if (_class) {
                        currentData['setup_class'] = _class;
                    }

                    if (location) {
                        currentData['setup_location'] = location;
                    }
                }
                mapContext.write({
                    key: idTransaction,
                    value: currentData
                });

            } catch (error) {
                log.error('error map', error);
                record.submitFields({
                    type: 'customrecord_lr_pe_detraction_batch',
                    id: parameters.pState,
                    values: {
                        'custrecord_lr_pe_det_status': '7',
                        'custrecord_lr_pe_det_details': error
                    },
                    options: {
                        enableSourcing: true,
                        ignoreMandatoryFields: true,
                        disableTriggers: true
                    }
                });
            }

        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        function reduce(reduceContext) {

        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        function summarize(summaryContext) {
            try {
                getParametersAndFeatures();
                let transactions = [];
                let infoGlobal = {};
                summaryContext.output.iterator().each(function (key, value) {
                    let information = JSON.parse(value);
                    let payJson = {};
                    payJson[key] = {
                        typeRounding: information.typeRounding,
                        roundingAmount: information.roundingAmount,
                        decimalAmount: information.decimalAmount,
                        idTax: information.idTax,
                        depositNumber: information.depositNumber,
                        detractionAccount: information.detractionAccount,
                        mainName: information.mainName,
                        dateBill: information.dateBill
                    }
                    transactions.push(payJson);
                    //Global Information
                    if (Object.keys(infoGlobal).length === 0) {
                        infoGlobal = {
                            department: information.department,
                            _class: information._class,
                            location: information.location,
                            commision: information.commision,
                            period: information.period,
                            date: information.date,
                            subsidiary: information.subsidiary,
                            roundingAcc: information.roundingAcc,
                            baseCurrency: information.baseCurrency,
                            form: information.form,
                            bankAccount: information.bankAccount,
                            bankCommision: information.bankCommision,
                            rateJrnl: information.rateJrnl,
                            bookInfo: information.bookInfo,
                            setupVatAccount: information.setupVatAccount,
                            setup_department: information.setup_department,
                            setup_class: information.setup_class,
                            setup_location: information.setup_location
                        }
                    }
                    return true;
                });
                let idJournal = createJournal(transactions, infoGlobal);

                if (idJournal) {
                    //Actualizar saldo restante
                    updateTaxResult(transactions);
                    //Actualizar campos del Bill
                    updateBill(transactions, infoGlobal, idJournal);
                    //Actualizar Record Detraction Log
                    updateDetractionLog(idJournal);
                    //Creación Journal IVA
                    executeJournalIVA(transactions, infoGlobal, idJournal, parameters);
                    //Actualizar Journal de Pago
                    updateProcess(idJournal, infoGlobal);
                }

            } catch (error) {
                log.error('error summarize', error);
                record.submitFields({
                    type: 'customrecord_lr_pe_detraction_batch',
                    id: parameters.pState,
                    values: {
                        'custrecord_lr_pe_det_status': '7',
                        'custrecord_lr_pe_det_details': error
                    },
                    options: {
                        enableSourcing: true,
                        ignoreMandatoryFields: true,
                        disableTriggers: true
                    }
                });
            }
        }

        const getSetupTaxSubsidiary = (subsidiary) => {
            try {
                let jsonSetupTax = {};
                let searchSetupTax = search.create({
                    type: 'customrecord_lmry_setup_tax_subsidiary',
                    filters: [
                        { name: 'isinactive', operator: 'is', values: 'F' }
                    ],
                    columns: [
                        'custrecord_lmry_setuptax_currency',
                        'custrecord_lmry_setuptax_form_journal',
                        'custrecord_lmry_setuptax_det_rnd_acc_ap',
                        'custrecord_lmry_setuptax_pe_vat_account',
                        'custrecord_lmry_setuptax_department',
                        'custrecord_lmry_setuptax_class',
                        'custrecord_lmry_setuptax_location'
                    ],
                });

                if (FEATURE_SUBSIDIARY == true || FEATURE_SUBSIDIARY == 'T') {
                    searchSetupTax.filters.push(search.createFilter({ name: 'custrecord_lmry_setuptax_subsidiary', operator: 'is', values: subsidiary }));
                }
                let resultSetupTax = searchSetupTax.run().getRange(0, 1);
                if (resultSetupTax && resultSetupTax.length) {
                    let currency = resultSetupTax[0].getValue('custrecord_lmry_setuptax_currency');
                    let journalForm = resultSetupTax[0].getValue('custrecord_lmry_setuptax_form_journal');
                    let setupRoundingAccount = resultSetupTax[0].getValue('custrecord_lmry_setuptax_det_rnd_acc_ap');
                    let setupVatAccount = resultSetupTax[0].getValue('custrecord_lmry_setuptax_pe_vat_account');
                    let department = resultSetupTax[0].getValue('custrecord_lmry_setuptax_department');
                    let _class = resultSetupTax[0].getValue('custrecord_lmry_setuptax_class');
                    let location = resultSetupTax[0].getValue('custrecord_lmry_setuptax_location');
                    jsonSetupTax = {
                        'currency': currency,
                        'journalForm': journalForm,
                        'setupRoundingAccount': setupRoundingAccount,
                        'setupVatAccount': setupVatAccount,
                        'department': department,
                        '_class': _class,
                        'location': location
                    }
                }
                return jsonSetupTax;
            } catch (error) {
                log.error("[getSetupTaxSubsidiary]", error);
                return {};
            }
        }

        const getParametersAndFeatures = () => {
            //Parameters
            contextObj = runtime.getCurrentScript();
            //Parámetro global
            let globalParameter = contextObj.getParameter({
                name: 'custscript_lmry_detraction_param_comp'
            });
            if (globalParameter && globalParameter !== '') parameters = JSON.parse(globalParameter);

            //Features
            FEATURE_SUBSIDIARY = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
            FOREIGNCURRENCYMANAGEMENT = runtime.isFeatureInEffect({ feature: "FOREIGNCURRENCYMANAGEMENT" });
            CUSTOMAPPROVALJOURNAL = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
            if (['T', 'F'].indexOf(FEATURE_SUBSIDIARY) > -1) FEATURE_SUBSIDIARY = featureValues[FEATURE_SUBSIDIARY];
            if (['T', 'F'].indexOf(FOREIGNCURRENCYMANAGEMENT) > -1) FOREIGNCURRENCYMANAGEMENT = featureValues[FOREIGNCURRENCYMANAGEMENT];
            if (['T', 'F'].indexOf(CUSTOMAPPROVALJOURNAL) > -1) CUSTOMAPPROVALJOURNAL = featureValues[CUSTOMAPPROVALJOURNAL];
        }

        const getTransactions = () => {
            let transactionJson = {};
            let columns = [];
            if (FEATURE_SUBSIDIARY) {
                columns = ['custrecord_lr_pe_det_vendorbill', 'custrecord_lr_pe_det_number', 'custrecord_lr_pe_det_department', 'custrecord_lr_pe_det_class', 'custrecord_lr_pe_det_location', 'custrecord_lr_pe_det_commission', 'custrecord_lr_pe_det_batch', 'custrecord_lr_pe_det_period', 'custrecord_lr_pe_det_date', 'custrecord_lr_pe_det_book_context', 'custrecord_lr_pe_det_subsidiary']
            } else {
                columns = ['custrecord_lr_pe_det_vendorbill', 'custrecord_lr_pe_det_number', 'custrecord_lr_pe_det_department', 'custrecord_lr_pe_det_class', 'custrecord_lr_pe_det_location', 'custrecord_lr_pe_det_commission', 'custrecord_lr_pe_det_batch', 'custrecord_lr_pe_det_period', 'custrecord_lr_pe_det_date', 'custrecord_lr_pe_det_book_context']
            }
            let dataLog = search.lookupFields({
                type: 'customrecord_lr_pe_detraction_batch',
                id: parameters.pState,
                columns: columns
            });

            let transactionContext = JSON.parse(dataLog.custrecord_lr_pe_det_vendorbill);
            let depositContext = JSON.parse(dataLog.custrecord_lr_pe_det_number);
            //Book
            let bookContext = JSON.parse(dataLog.custrecord_lr_pe_det_book_context);
            let bookInformation = {};
            for (let key in bookContext) {
                if (key !== 'rateJrnl') {
                    bookInformation[key] = bookContext[key]
                }
            }
            for (let key in transactionContext) {

                if (!transactionJson[key]) {
                    transactionJson[key] = {
                        typeRounding: transactionContext[key].typeRounding,
                        roundingAmount: transactionContext[key].roundingAmount,
                        decimalAmount: transactionContext[key].decimalAmount,
                        idTax: transactionContext[key].idTax,
                        department: (dataLog.custrecord_lr_pe_det_department.length > 0) ? dataLog.custrecord_lr_pe_det_department[0].value : '',
                        _class: (dataLog.custrecord_lr_pe_det_class.length > 0) ? dataLog.custrecord_lr_pe_det_class[0].value : '',
                        location: (dataLog.custrecord_lr_pe_det_location.length > 0) ? dataLog.custrecord_lr_pe_det_location[0].value : '',
                        commision: dataLog.custrecord_lr_pe_det_commission,
                        batchNumber: dataLog.custrecord_lr_pe_det_batch,
                        period: dataLog.custrecord_lr_pe_det_period[0].value,
                        date: dataLog.custrecord_lr_pe_det_date,
                        subsidiary: (FEATURE_SUBSIDIARY && dataLog.custrecord_lr_pe_det_subsidiary.length) ? dataLog.custrecord_lr_pe_det_subsidiary[0].value : '1',
                        depositNumber: depositContext[key],
                        rateJrnl: bookContext.rateJrnl,
                        bookInfo: bookInformation,
                    }
                }
            }
            return transactionJson;
        }

        const getInformationTransaction = (idTransaction) => {
            let dataCredit = {};
            let data = search.create({
                type: "TRANSACTION",
                filters:
                    [
                        ["mainline", "is", "F"],
                        "AND",
                        ["item", "noneof", "@NONE@"],
                        "AND",
                        ["createdfrom", "anyof", idTransaction],
                        "AND",
                        ["shipping", "is", "F"],
                        "AND",
                        ["taxline", "is", "F"],
                        "AND",
                        ["cogs", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "account", label: "Account" }),
                        search.createColumn({ name: "mainname", label: "Main Line Name" })
                    ]
            });

            let result = data.run().getRange(0, 1);

            if (result && result.length > 0) {
                dataCredit['account'] = result[0].getValue('account');
                dataCredit['mainname'] = result[0].getValue('mainname');
                dataCredit['trandate'] = result[0].getValue('trandate');
            }
            return dataCredit;
        }

        const getBankAccount = (subsidiary) => {
            let jsonAccount = {};
            let data = search.create({
                type: 'customrecord_lmry_pe_detraction_account',
                filters: [
                    { name: 'isinactive', operator: 'is', values: 'F' }
                ],
                columns: [
                    'custrecord_lmry_pe_detract_bank_acc_cm_p', 'custrecord_lmry_pe_detract_bank_acc_p'
                ]
            });
            if (FEATURE_SUBSIDIARY) {
                data.filters.push(search.createFilter({ name: 'custrecord_lmry_pe_detraction_subsidiary', operator: 'is', values: subsidiary }));
            }
            let result = data.run().getRange(0, 1);
            if (result && result.length > 0) {
                jsonAccount = {
                    bankAccount: result[0].getValue('custrecord_lmry_pe_detract_bank_acc_p'),
                    bankCommision: result[0].getValue('custrecord_lmry_pe_detract_bank_acc_cm_p')
                }
            }
            return jsonAccount;
        }

        const createJournal = (transactions, infoGlobal) => {
            let idJournal = '';
            let journalObj = record.create({ type: 'journalentry', isDynamic: true });
            //Llenar campos cabecera
            if (Number(infoGlobal.form)) {
                journalObj.setValue('customform', Number(infoGlobal.form));
            }
            if (FEATURE_SUBSIDIARY) {
                journalObj.setValue('subsidiary', infoGlobal.subsidiary);
            }
            let fecha = format.parse({ type: format.Type.DATE, value: infoGlobal.date });
            journalObj.setValue('trandate', fecha);
            journalObj.setValue('postingperiod', infoGlobal.period);
            journalObj.setValue('currency', infoGlobal.baseCurrency);
            journalObj.setValue('exchangerate', infoGlobal.rateJrnl);
            journalObj.setValue('memo', 'Latam - Payment Detraction (Purchase)');
            if (CUSTOMAPPROVALJOURNAL && journalObj.getField({ fieldId: 'approvalstatus' })) {
                journalObj.setValue('approvalstatus', 2);
            }
            //Llenar campos de línea
            let contador = 0;
            for (let elemento of transactions) {
                for (let id in elemento) {
                    let detalles = elemento[id];
                    //Línea Debit
                    journalObj.selectNewLine({
                        sublistId: 'line'
                    });
                    journalObj.setCurrentSublistValue('line', 'account', detalles['detractionAccount']);
                    journalObj.setCurrentSublistValue('line', 'debit', detalles['roundingAmount']);
                    journalObj.setCurrentSublistValue('line', 'entity', detalles['mainName']);
                    journalObj.setCurrentSublistValue('line', 'custcol_lmry_factura_prov_detraccion', id);
                    journalObj.setCurrentSublistValue('line', 'custcol_lmry_es_detraccion_masiva', true);
                    journalObj.setCurrentSublistValue('line', 'custcol_lmry_fecha_detraccion', detalles['dateBill']);
                    journalObj.setCurrentSublistValue('line', 'custcol_lmry_numero_detraccion', detalles['depositNumber']);
                    if (Number(infoGlobal.department)) {
                        journalObj.setCurrentSublistValue('line', 'department', Number(infoGlobal.department));
                    }
                    if (Number(infoGlobal._class)) {
                        journalObj.setCurrentSublistValue('line', 'class', Number(infoGlobal._class));
                    }
                    if (Number(infoGlobal.location)) {
                        journalObj.setCurrentSublistValue('line', 'location', Number(infoGlobal.location));
                    }
                    journalObj.commitLine({
                        sublistId: 'line'
                    });
                    contador++;
                    //Línea Credit
                    journalObj.selectNewLine({
                        sublistId: 'line'
                    });
                    journalObj.setCurrentSublistValue('line', 'account', infoGlobal.bankAccount);
                    journalObj.setCurrentSublistValue('line', 'credit', detalles['roundingAmount']);
                    if (Number(infoGlobal.department)) {
                        journalObj.setCurrentSublistValue('line', 'department', Number(infoGlobal.department));
                    }
                    if (Number(infoGlobal._class)) {
                        journalObj.setCurrentSublistValue('line', 'class', Number(infoGlobal._class));
                    }
                    if (Number(infoGlobal.location)) {
                        journalObj.setCurrentSublistValue('line', 'location', Number(infoGlobal.location));
                    }
                    journalObj.commitLine({
                        sublistId: 'line'
                    });
                    //Líneas adicionales de decimales
                    if (detalles['typeRounding'] === '2') {
                        if (Number(detalles['decimalAmount']) !== 0) {
                            let decimal = Number(detalles['decimalAmount']);
                            let isPositive = (Number(detalles['decimalAmount']) > 0) ? true : false;
                            //Primera línea decimal
                            journalObj.selectNewLine({
                                sublistId: 'line'
                            });
                            journalObj.setCurrentSublistValue('line', 'account', detalles['detractionAccount']);
                            if (isPositive) {
                                journalObj.setCurrentSublistValue('line', 'debit', Math.abs(decimal));
                            } else {
                                journalObj.setCurrentSublistValue('line', 'credit', Math.abs(decimal));
                            }
                            if (Number(infoGlobal.department)) {
                                journalObj.setCurrentSublistValue('line', 'department', Number(infoGlobal.department));
                            }
                            if (Number(infoGlobal._class)) {
                                journalObj.setCurrentSublistValue('line', 'class', Number(infoGlobal._class));
                            }
                            if (Number(infoGlobal.location)) {
                                journalObj.setCurrentSublistValue('line', 'location', Number(infoGlobal.location));
                            }
                            journalObj.commitLine({
                                sublistId: 'line'
                            });
                            //Segunda línea decimal
                            journalObj.selectNewLine({
                                sublistId: 'line'
                            });
                            journalObj.setCurrentSublistValue('line', 'account', infoGlobal.roundingAcc);
                            if (isPositive) {
                                journalObj.setCurrentSublistValue('line', 'credit', Math.abs(decimal));
                            } else {
                                journalObj.setCurrentSublistValue('line', 'debit', Math.abs(decimal));
                            }
                            if (Number(infoGlobal.department)) {
                                journalObj.setCurrentSublistValue('line', 'department', Number(infoGlobal.department));
                            }
                            if (Number(infoGlobal._class)) {
                                journalObj.setCurrentSublistValue('line', 'class', Number(infoGlobal._class));
                            }
                            if (Number(infoGlobal.location)) {
                                journalObj.setCurrentSublistValue('line', 'location', Number(infoGlobal.location));
                            }
                            journalObj.commitLine({
                                sublistId: 'line'
                            });
                        }
                    }
                    contador++;
                }
            }
            //Línea de Comisión
            if (contador > 0) {
                let comision = Number(infoGlobal.commision);
                if (comision > 0) {
                    //1ra Línea
                    journalObj.selectNewLine({
                        sublistId: 'line'
                    });
                    journalObj.setCurrentSublistValue('line', 'account', infoGlobal.bankCommision);
                    journalObj.setCurrentSublistValue('line', 'debit', comision);
                    if (Number(infoGlobal.department)) {
                        journalObj.setCurrentSublistValue('line', 'department', Number(infoGlobal.department));
                    }
                    if (Number(infoGlobal._class)) {
                        journalObj.setCurrentSublistValue('line', 'class', Number(infoGlobal._class));
                    }
                    if (Number(infoGlobal.location)) {
                        journalObj.setCurrentSublistValue('line', 'location', Number(infoGlobal.location));
                    }
                    journalObj.commitLine({
                        sublistId: 'line'
                    });
                    //Segunda línea
                    journalObj.selectNewLine({
                        sublistId: 'line'
                    });
                    journalObj.setCurrentSublistValue('line', 'account', infoGlobal.bankAccount);
                    journalObj.setCurrentSublistValue('line', 'credit', comision);
                    if (Number(infoGlobal.department)) {
                        journalObj.setCurrentSublistValue('line', 'department', Number(infoGlobal.department));
                    }
                    if (Number(infoGlobal._class)) {
                        journalObj.setCurrentSublistValue('line', 'class', Number(infoGlobal._class));
                    }
                    if (Number(infoGlobal.location)) {
                        journalObj.setCurrentSublistValue('line', 'location', Number(infoGlobal.location));
                    }
                    journalObj.commitLine({
                        sublistId: 'line'
                    });
                }
            }
            //Actualización de montos de los libros
            if (FOREIGNCURRENCYMANAGEMENT) {
                let accountingBooks = infoGlobal.bookInfo;
                let countbooks = journalObj.getLineCount({ sublistId: "accountingbookdetail" });
                for (let i = 0; i < countbooks; i++) {
                    journalObj.selectLine({ sublistId: "accountingbookdetail", line: i });
                    let bookId = journalObj.getCurrentSublistValue({ sublistId: "accountingbookdetail", fieldId: "bookid" });
                    if (accountingBooks.hasOwnProperty(bookId) && accountingBooks[bookId].rate) {
                        let bookExchangeRate = accountingBooks[bookId].rate;
                        bookExchangeRate = parseFloat(bookExchangeRate);
                        journalObj.setCurrentSublistValue({ sublistId: "accountingbookdetail", fieldId: "exchangerate", value: bookExchangeRate });
                    }
                }
            }
            idJournal = journalObj.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });
            return idJournal;
        }

        const updateTaxResult = (transactions) => {
            for (let elemento of transactions) {
                for (let id in elemento) {
                    let detalles = elemento[id];
                    let recordTax = record.load({
                        type: 'customrecord_lmry_br_transaction',
                        id: detalles['idTax']
                    });
                    let remainingAmount = Number(recordTax.getValue('custrecord_lmry_remaining_amt_local_cr'));
                    let pay = Number(detalles['roundingAmount']);
                    let payDecimal = 0;
                    if (Number(detalles['typeRounding']) === 2) {
                        payDecimal = Number(detalles['decimalAmount']);
                    }
                    let auxAmount = round2(pay + payDecimal);
                    let newRemainingAmount = remainingAmount - auxAmount;
                    newRemainingAmount = round2(newRemainingAmount);
                    //Actualización del saldo
                    recordTax.setValue({
                        fieldId: 'custrecord_lmry_remaining_amt_local_cr',
                        value: newRemainingAmount
                    });
                    recordTax.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true,
                        disableTriggers: true
                    });
                }
            }
        }

        const round2 = (num) => {
            let e = (num >= 0) ? 1e-6 : -1e-6;
            return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
        }

        const updateDetractionLog = (idJournal) => {
            record.submitFields({
                type: 'customrecord_lr_pe_detraction_batch',
                id: parameters.pState,
                values: {
                    'custrecord_lr_pe_det_status': '5',
                    'custrecord_lr_pe_det_journals': idJournal
                },
                options: {
                    enableSourcing: true,
                    ignoreMandatoryFields: true,
                    disableTriggers: true
                }
            });
        }

        const updateBill = (transactions, infoGlobal, idJournal) => {
            for (let elemento of transactions) {
                for (let id in elemento) {
                    let detalles = elemento[id];
                    let fechaDetrac = format.parse({ type: format.Type.DATE, value: infoGlobal.date });
                    let numberDetrac = detalles['depositNumber'];
                    record.submitFields({
                        type: 'vendorbill',
                        id: id,
                        values: {
                            'custbody_lmry_doc_detraccion_date': fechaDetrac,
                            'custbody_lmry_num_comprobante_detrac': numberDetrac,
                            'custbody_lmry_reference_transaction': idJournal,
                            'custbody_lmry_reference_transaction_id': idJournal
                        },
                        options: {
                            enableSourcing: true,
                            ignoreMandatoryFields: true,
                            disableTriggers: true
                        }
                    });
                }
            }
        }

        const executeJournalIVA = (transactions, infoGlobal, parameters) => {
            const { FeatureManager } = Lib_Licenses;
            let subsididiaryGlobal = infoGlobal.subsidiary;
            let featureManager = new FeatureManager(subsididiaryGlobal);
            if (featureManager.isActive(PE_FEAT.IVA_REDIRECT)) {
                let ivaAccount = infoGlobal.setupVatAccount;
                if (ivaAccount) {
                    transferIva(transactions, infoGlobal);
                }
            }
        }

        const transferIva = (transactions, infoGlobal) => {
            for (let elemento of transactions) {
                for (let billID in elemento) {
                    runProcessIva(billID, infoGlobal)
                }
            }
        }

        const getLines = billID => {
            const recordLoad = record.load({ type: "vendorbill", id: billID });
            const jsonLines = {};
            const itemsLines = recordLoad.getLineCount({ sublistId: 'item' });

            for (let i = 0; i < itemsLines; i++) {
                const lineuniquekey = recordLoad.getSublistValue({ sublistId: 'item', fieldId: "lineuniquekey", line: i });

                if (!jsonLines[lineuniquekey]) {
                    const [iditem, department, location, _class, taxcode, taxamount] = [
                        "item", "department", "location", "class", "taxcode", "tax1amt"
                    ].map(fieldId => recordLoad.getSublistValue({ sublistId: 'item', fieldId, line: i }));

                    jsonLines[lineuniquekey] = {
                        department,
                        location,
                        class: _class,
                        taxcode,
                        debitamount: Number(taxamount),
                        item: iditem,
                        sublist:"item",
                        lineuniquekey:lineuniquekey
                    };
                }
            }

            const itemsExpense = recordLoad.getLineCount({ sublistId: 'expense' });

            for (let i = 0; i < itemsExpense; i++) {
                const lineuniquekey = recordLoad.getSublistValue({ sublistId: 'expense', fieldId: "lineuniquekey", line: i });

                if (!jsonLines[lineuniquekey]) {
                    const [iditem, department, location, _class, taxcode, taxamount] = [
                        "account", "department", "location", "class", "taxcode", "tax1amt"
                    ].map(fieldId => recordLoad.getSublistValue({ sublistId: 'expense', fieldId, line: i }));

                    jsonLines[lineuniquekey] = {
                        department,
                        location,
                        class: _class,
                        taxcode,
                        debitamount: Number(taxamount),
                        item: iditem,
                        sublist:"expense",
                        lineuniquekey:lineuniquekey
                    };
                }
            }
            return jsonLines;
        };

        const groupLines = (jsonLines, setupTaxSubsidiary) => {

            let departmentMandatory = runtime.getCurrentUser().getPreference({ name: "DEPTMANDATORY" });
            let classMandatory = runtime.getCurrentUser().getPreference({ name: "CLASSMANDATORY" });
            let locationMandatory = runtime.getCurrentUser().getPreference({ name: "LOCMANDATORY" });
            let groupTaxcode = orderLines(jsonLines);
            // Asignar valores de departamento, clase y ubicación
            let groupedLines = [];
            for (let key in groupTaxcode) {
                if (departmentMandatory == true || departmentMandatory == "T") {
                    if (setupTaxSubsidiary.department) {
                        groupTaxcode[key]["department"] = setupTaxSubsidiary.department;
                    }
                } else {
                    groupTaxcode[key]["department"] = "";
                }
                if (classMandatory == true || classMandatory == "T") {
                    if (setupTaxSubsidiary.class) {
                        groupTaxcode[key]["class"] = setupTaxSubsidiary.class;
                    }
                } else {
                    groupTaxcode[key]["class"] = "";
                }
                if (locationMandatory == true || locationMandatory == "T") {
                    if (setupTaxSubsidiary.location) {
                        groupTaxcode[key]["location"] = setupTaxSubsidiary.location;
                    }
                } else {
                    groupTaxcode[key]["location"] = "";
                }
                groupedLines.push(groupTaxcode[key]);
            }

            return groupedLines;
        }


        const orderLines = (jsonLines) => {
            let sortedKeys = [];
            for (let lineuniquekey in jsonLines) {
                if (jsonLines.hasOwnProperty(lineuniquekey)) {
                    sortedKeys.push(lineuniquekey);
                }
            }
            // Ordenar las claves por 'lineuniquekey' ascendente y dar prioridad a 'item' sobre 'expense'
            sortedKeys.sort(function (a, b) {
                let lineA = jsonLines[a];
                let lineB = jsonLines[b];

                // Comparar por sublista primero (priorizar 'item' sobre 'expense')
                if (lineA.sublist !== lineB.sublist) {
                    return lineA.sublist === 'item' ? -1 : 1;
                }

                // Si las sublistas son iguales, comparar por 'lineuniquekey' ascendente
                let lineUniquekeyA = parseInt(lineA.lineuniquekey, 10);
                let lineUniquekeyB = parseInt(lineB.lineuniquekey, 10);

                return lineUniquekeyA - lineUniquekeyB;
            });
            let groupTaxcode = {};

            // Agrupar usando el arreglo de claves ordenadas
            for (let i = 0; i < sortedKeys.length; i++) {
                let lineuniquekey = sortedKeys[i];
                let item = jsonLines[lineuniquekey];
                let key = item.taxcode;

                if (!groupTaxcode[key]) {
                    groupTaxcode[key] = item;
                } else {
                    groupTaxcode[key].debitamount += item.debitamount;
                }
            }
            return groupTaxcode;
        }

        const joinDetailsLines = (groupedLines, billID) => {
            const taxlineDetail = {};

            const billSearchObj = search.create({
                type: "vendorbill",
                filters: [
                    ["internalid", "is", billID],
                    "AND",
                    ["mainline", "is", "F"],
                    "AND",
                    ["taxline", "is", "T"]
                ],
                columns: [
                    'internalid',
                    'account',
                    'currency',
                    'exchangerate',
                    'custbody_lmry_concepto_detraccion',
                    'item'
                ]
            });

            billSearchObj.run().each(result => {
                const taxcodeID = result.getValue('item');
                if (!taxlineDetail[taxcodeID]) {
                    taxlineDetail[taxcodeID] = {
                        account: result.getValue('account'),
                        concept_detraction: result.getValue('custbody_lmry_concepto_detraccion'),
                        currency: result.getValue('currency'),
                        exchangerate: result.getValue('exchangerate')
                    };
                }
                return true;
            });

            // Asignar los detalles a las líneas agrupadas
            groupedLines.forEach(line => {
                const taxcodeID = line.taxcode;
                const details = taxlineDetail[taxcodeID] || {};

                line.account = details.account || '';
                line.concept_detraction = details.concept_detraction || '';
                line.currency = details.currency || '';
                line.exchangerate = details.exchangerate || '';
            });

            return groupedLines;
        };

        const createJournalTransferIgv = (groupedLines, billID, infoGlobal) => {
            //groupedLines, billID, infoGlobal
            const { subsidiary, date, period, setupVatAccount, form } = infoGlobal;
            const featureAprove = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
            const concepDetraction = groupedLines[0]?.concept_detraction;

            if (concepDetraction && concepDetraction != 12) {
                const newJournal = record.create({ type: record.Type.JOURNAL_ENTRY });
                if (Number(form)) {
                    newJournal.setValue('customform', Number(form));
                }
                let featureOW = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" })
                if (featureOW && subsidiary) newJournal.setValue('subsidiary', subsidiary);

                if (date) {
                    const detractionDateFormat = format.parse({ value: date, type: format.Type.DATE });
                    newJournal.setValue('trandate', detractionDateFormat);
                    newJournal.setValue('postingperiod', period);
                }

                if (billID) {
                    newJournal.setValue('custbody_lmry_reference_transaction', billID);
                    newJournal.setValue('custbody_lmry_reference_transaction_id', billID);
                }

                newJournal.setValue('custbody_lmry_es_detraccion', false);

                if (featureAprove === 'T' || featureAprove === true) {
                    newJournal.setValue('approvalstatus', 2);
                }

                newJournal.setValue('currency', groupedLines[0].currency);
                newJournal.setValue('exchangerate', groupedLines[0].exchangerate);
                newJournal.setValue('memo', `Traslado de IVA - Bill ID: ${billID}`);

                let linejournal = 0;

                groupedLines.forEach(line => {
                    const debitfxamount = line.debitamount;

                    if (debitfxamount) {
                        const { department, class: _class, location } = line;

                        // Line from
                        newJournal.setSublistValue('line', 'account', linejournal, line.account);
                        newJournal.setSublistValue('line', 'credit', linejournal, debitfxamount.toFixed(2));
                        newJournal.setSublistValue('line', 'memo', linejournal, 'Tax amount redirect');
                        newJournal.setSublistValue('line', 'custcol_lmry_es_detraccion_masiva', linejournal, false);

                        if (department) newJournal.setSublistValue('line', 'department', linejournal, department);
                        if (_class) newJournal.setSublistValue('line', 'class', linejournal, _class);
                        if (location) newJournal.setSublistValue('line', 'location', linejournal, location);

                        // Line to
                        newJournal.setSublistValue('line', 'account', linejournal + 1, setupVatAccount);
                        newJournal.setSublistValue('line', 'debit', linejournal + 1, debitfxamount.toFixed(2));
                        newJournal.setSublistValue('line', 'memo', linejournal + 1, 'Tax amount redirect');
                        newJournal.setSublistValue('line', 'custcol_lmry_es_detraccion_masiva', linejournal + 1, false);

                        if (department) newJournal.setSublistValue('line', 'department', linejournal + 1, department);
                        if (_class) newJournal.setSublistValue('line', 'class', linejournal + 1, _class);
                        if (location) newJournal.setSublistValue('line', 'location', linejournal + 1, location);

                        linejournal += 2;
                    }
                });

                if (linejournal !== 0) {


                    const idJournal = newJournal.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true,
                        dissableTriggers: true
                    });
                }
            }
        };

        const runProcessIva = (billID, infoGlobal) => {

            const { setup_department, setup_class, setup_location } = infoGlobal
            const setupTaxSubsidiary = {
                "department": setup_department,
                "location": setup_location,
                "class": setup_class,
            }

            const transactionLines = getLines(billID);
            let groupedLines = groupLines(transactionLines, setupTaxSubsidiary);
            groupedLines = joinDetailsLines(groupedLines, billID);
            createJournalTransferIgv(groupedLines, billID, infoGlobal);
        };

        const updateProcess = (idJournal, infoGlobal) => {
            const { FeatureManager } = Lib_Licenses;
            let subsididiaryGlobal = infoGlobal.subsidiary;
            let featureManager = new FeatureManager(subsididiaryGlobal);
            if (!featureManager.isActive(PE_FEAT.IVA_REDIRECT)) return false;
            if (!infoGlobal.setupVatAccount) return false;
            let asientoDiario = record.load({ type: record.Type.JOURNAL_ENTRY, id: idJournal, isDynamic: true });
            asientoDiario.setValue('custbody_lmry_estado_detraccion', 'Procesado');
            let lineas = asientoDiario.getLineCount('line');
            for (let i = 0; i < lineas; i++) {
                asientoDiario.selectLine({ sublistId: 'line', line: i });
                asientoDiario.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_es_detraccion_masiva', value: false });
                asientoDiario.commitLine({ sublistId: 'line' });
            }
            asientoDiario.save({
                enableSourcing: true,
                ignoreMandatoryFields: true,
                disableTriggers: true
            });
        }

        return {
            getInputData: getInputData,
            map: map,
            // reduce: reduce,
            summarize: summarize
        };

    });
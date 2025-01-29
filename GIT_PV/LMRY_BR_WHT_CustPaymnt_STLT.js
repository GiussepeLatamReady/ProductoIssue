/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_BR_WHT_CustPaymnt_STLT.js        	          ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     8 Apr  2020  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/log', 'N/ui/serverWidget', 'N/search', 'N/runtime', 'N/error', 'N/redirect', 'N/task', 'N/url', 'N/format', 'N/currency', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', "./Latam_Library/LMRY_Log_LBRY_V2.0"],
    function (log, serverWidget, search, runtime, error, redirect, task, url, format, currencyApi, library_mail, libLog) {
        var ID_COUNTRY = 30; //Brazil
        var TYPE_TRANSACTION = 7; //Invoice
        var ID_FEATURE = 141; // Feature BR - WHT Payment

        var SCRIPT_ID = 'customscript_lmry_br_custpayments_stlt';
        var DEPLOY_ID = 'customdeploy_lmry_br_custpayments_stlt';
        var SCRIPT_ID_LOG = 'customscript_lmry_br_custpaymt_log_stlt';
        var DEPLOY_ID_LOG = 'customdeploy_lmry_br_custpaymt_log_stlt';
        var MR_SCRIPT_ID = 'customscript_lmry_br_custpayments_mprd';
        var MR_DEPLOYMENT_ID = 'customdeploy_lmry_br_custpayments_mprd';
        var EXPORT_WHT_MR_SCRIPT_ID = "customscript_lmry_br_exportwht_mprd";
        var EXPORT_WHT_MR_DEPLOY_ID = "customdeploy_lmry_br_exportwht_mprd";
        var CLIENT_SCRIPT = './Latam_Library/LMRY_BR_WHT_CustPaymnt_CLNT.js';
        var LANGUAGE = '';
        var FEAT_SUBS = true;
        var FEAT_MULTIBOOK = true;
        var FEAT_JOBS = false;
        var FEAT_DPT = false;
        var FEAT_LOC = false;
        var FEAT_CLASS = false;
        var DEPTMANDATORY = false;
        var LOCMANDATORY = false;
        var CLASSMANDATORY = false;
        var FEAT_INSTALLMENTS = false;
        var FEAT_FOREIGN_BOOKS = false;
        var LMRY_script = 'LatamReady - BR WHT Customer Payment STLT';
        var LIC_BY_SUBSIDIARY = {};

        function onRequest(context) {
            LANGUAGE = runtime.getCurrentScript().getParameter({ name: "LANGUAGE" });
            LANGUAGE = LANGUAGE.substring(0, 2);
            FEAT_SUBS = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
            FEAT_MULTIBOOK = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });
            FEAT_JOBS = runtime.isFeatureInEffect({ feature: "JOBS" });
            FEAT_DPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
            FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
            FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });

            DEPTMANDATORY = runtime.getCurrentUser().getPreference({ name: "DEPTMANDATORY" });
            LOCMANDATORY = runtime.getCurrentUser().getPreference({ name: "LOCMANDATORY" });
            CLASSMANDATORY = runtime.getCurrentUser().getPreference({ name: "CLASSMANDATORY" });

            FEAT_INSTALLMENTS = runtime.isFeatureInEffect({ feature: "installments" });

            FEAT_FOREIGN_BOOKS = runtime.isFeatureInEffect({ feature: "foreigncurrencymanagement" });

            if (context.request.method == 'GET') {
                try {
                    LIC_BY_SUBSIDIARY = library_mail.getAllLicenses();
                    
                    var form = createForm();
                    var localCurrency = getLocalCurrency();
                    var sublist = createApplySublist(form);                    
                    setValues(context, form, localCurrency);

                    var status = context.request.parameters.status;
                    
                    if (!status) {
                        var idEnt = context.request.parameters.idE;
                        if (idEnt) {
                            addCustomer(form, idEnt);
                        } 
                                                
                        form.getField({ id: "custpage_currency" }).defaultValue = localCurrency;
                        form.getField({ id: "custpage_exchangerate" }).defaultValue = 1.0;
                        form.getField({ id: 'custpage_memo' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                        form.getField({ id: "custpage_exchangerate" }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                        form.getField({ id: 'custpage_status' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                        form.addSubmitButton({ label: getText('filter') });

                    } else if (status == '1') {
                      
                        if (FEAT_SUBS == true || FEAT_SUBS == "T") {
                            var subsidiaryId = context.request.parameters.subsidiary;

                            var searchSetupBR = search.create({
                                type: 'customrecord_lmry_setup_tax_subsidiary',
                                filters: [
                                    ['custrecord_lmry_setuptax_subsidiary', 'anyof', subsidiaryId] // Cambia 'anyof' por 'is' si es necesario
                                ],
                                columns: ['custrecord_lmry_setuptax_dcto_pay']
                            });
                            
                            var resultSetupBR = searchSetupBR.run().getRange({ start: 0, end: 1 }); // Solo necesitamos el primer resultado
                            
                            if (resultSetupBR && resultSetupBR.length > 0) {
                                var value = resultSetupBR[0].getValue({ name: 'custrecord_lmry_setuptax_dcto_pay' });
                                if (value == 'F' || value == false) {
                                    var sublist = form.getSublist({ id: 'custpage_list_apply' });
                                    var field_discount = sublist.getField({ id: 'discount' });
                                    field_discount.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                                }
                            }
                            var subsCurrency = search.lookupFields({
                                type: "subsidiary",
                                id: subsidiaryId,
                                columns: ["currency"]
                            }).currency[0].value;

                            var currencyId = context.request.parameters.currency;

                            if (Number(subsCurrency) == Number(currencyId)) {
                                form.getField({ id: "custpage_exchangerate" }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                            }

                            if ((FEAT_MULTIBOOK == true || FEAT_MULTIBOOK == "T") && (FEAT_FOREIGN_BOOKS == true || FEAT_FOREIGN_BOOKS == "T")) {
                                createBookSublist(form, context);
                            }
                        }

                        disableFields(form);
                        var transactions = getTransactions(context);
                        
                        loadTransactions(transactions, sublist,context);
                        form.addSubmitButton({ label: getText('save') });

                        form.addButton({
                            id: 'button_cancel',
                            label: getText('cancel'),
                            functionName: 'cancel'
                        });
                    }

                    form.clientScriptModulePath = CLIENT_SCRIPT;
                    context.response.writePage(form);
                } catch (err) {
                    log.error("[ onRequest - GET ]", err);
                    library_mail.sendemail('[ onRequest - GET ]' + err, LMRY_script);
                    libLog.doLog({ title: "[ onRequest  - GET ]", message: err });
                }
            } else {              
                try {

                    var fieldNames = ['status', 'subsidiary', 'customer', 'araccount', 'date', 'period', 'document', 'undepfunds', 'bankaccount', 'department', 'class', 'location', 'paymentmethod', 'memo', 'currency', 'exchangerate'];

                    var params = {}
                    for (var i = 0; i < fieldNames.length; i++) {
                        params[fieldNames[i]] = context.request.parameters['custpage_' + fieldNames[i]];
                    }
                    if (context.request.parameters['idS']) {
                        params["idS"] = context.request.parameters['idS'];
                    }
                    if (!params['status']) {
                        params['status'] = '1';
                        redirect.toSuitelet({
                            scriptId: SCRIPT_ID,
                            deploymentId: DEPLOY_ID,
                            parameters: params
                        });

                    } else if (params['status'] == '1') {

                        var idlog = context.request.parameters.custpage_idlog;
                        
                        if (idlog) {
                            var task_mr = task.create({
                                taskType: task.TaskType.MAP_REDUCE,
                                scriptId: MR_SCRIPT_ID,
                                deploymentId: MR_DEPLOYMENT_ID,
                                params: {
                                    'custscript_lmry_br_custpayment_log': idlog
                                }
                            });
                            task_mr.submit();
                        }

                        redirect.toSuitelet({
                            scriptId: SCRIPT_ID_LOG,
                            deploymentId: DEPLOY_ID_LOG
                        });
                    }


                } catch (err) {
                    log.error("[ onRequest - POST ]", err);
                    library_mail.sendemail('[ onRequest - POST ]' + err, LMRY_script);
                    libLog.doLog({ title: "[ onRequest  - POST ]", message: err });
                }
            }
        }


        function createForm() {
            var form = serverWidget.createForm({
                title: getText('title')
            });

            form.addFieldGroup({
                id: 'main_group',
                label: getText('primaryinformation')
            });

            if (FEAT_SUBS == true || FEAT_SUBS == 'T') {
                var objFieldSubsidiary = {
                    id: 'custpage_subsidiary',
                    type: serverWidget.FieldType.SELECT,
                    label: getText('subsidiary'),
                    container: 'main_group'
                }

                var field_subsidiary = form.addField(objFieldSubsidiary);

                field_subsidiary.isMandatory = true;
            }

            form.addField({
                id: 'custpage_customer',
                type: serverWidget.FieldType.SELECT,
                label: getText('customer'),
                container: 'main_group'
            }).isMandatory = true;


            form.addField({
                id: 'custpage_currency',
                type: serverWidget.FieldType.SELECT,
                label: getText('currency'),
                container: 'main_group'
            }).isMandatory = true;

            form.addField({
                id: 'custpage_exchangerate',
                type: serverWidget.FieldType.FLOAT,
                label: getText('exchangerate'),
                container: 'main_group'
            }).isMandatory = true;


            form.addField({
                id: 'custpage_araccount',
                type: serverWidget.FieldType.SELECT,
                label: getText('araccount'),
                container: 'main_group'
            }).isMandatory = true;

            var accountGroup = form.addFieldGroup({
                id: 'account_group',
                label: 'Account',
                container: 'main_group'
            });
            accountGroup.isBorderHidden = true;
            accountGroup.isSingleColumn = true;
            form.addField({
                id: 'custpage_undepfunds',
                type: serverWidget.FieldType.RADIO,
                label: getText('undepfunds'),
                container: 'account_group',
                source: 'T'
            });

            form.addField({
                id: 'custpage_undepfunds',
                type: serverWidget.FieldType.RADIO,
                label: getText('bankaccount'),
                container: 'account_group',
                source: 'F'
            });

            form.addField({
                id: 'custpage_bankaccount',
                type: serverWidget.FieldType.SELECT,
                label: "&nbsp;",
                container: 'account_group',
            });

            form.addField({
                id: 'custpage_date',
                type: serverWidget.FieldType.DATE,
                label: getText('date'),
                container: 'main_group'
            }).isMandatory = true;

            form.addField({
                id: 'custpage_period',
                type: serverWidget.FieldType.SELECT,
                label: getText('period'),
                container: 'main_group'
            }).isMandatory = true;

            form.addField({
                id: 'custpage_document',
                type: serverWidget.FieldType.SELECT,
                label: getText('document'),
                container: 'main_group'
            }).isMandatory = true;

            form.addField({
                id: 'custpage_memo',
                type: serverWidget.FieldType.TEXT,
                label: getText('memo'),
                container: 'main_group'
            });

            form.addFieldGroup({
                id: 'clasiffication_group',
                label: getText('classification')
            });

            if (FEAT_DPT == true || FEAT_DPT == 'T') {
                var field_department = form.addField({
                    id: 'custpage_department',
                    type: serverWidget.FieldType.SELECT,
                    label: getText('department'),
                    container: 'clasiffication_group'
                });

                field_department.isMandatory = (DEPTMANDATORY == true || DEPTMANDATORY == 'T');
            }

            if (FEAT_CLASS == true || FEAT_CLASS == 'T') {
                var field_class = form.addField({
                    id: 'custpage_class',
                    type: serverWidget.FieldType.SELECT,
                    label: getText('class'),
                    container: 'clasiffication_group'
                });

                field_class.isMandatory = (CLASSMANDATORY == true || CLASSMANDATORY == 'T');
            }


            if (FEAT_LOC == true || FEAT_LOC == 'T') {
                var field_location = form.addField({
                    id: 'custpage_location',
                    type: serverWidget.FieldType.SELECT,
                    label: getText('location'),
                    container: 'clasiffication_group'
                });

                field_location.isMandatory = (LOCMANDATORY == true || LOCMANDATORY == 'T');
            }

            form.addField({
                id: 'custpage_paymentmethod',
                type: serverWidget.FieldType.SELECT,
                label: getText('paymentmethod'),
                container: 'clasiffication_group'
            });

            form.addField({
                id: 'custpage_status',
                type: serverWidget.FieldType.TEXT,
                label: 'Status',
                container: 'main_group'
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            form.addField({
                id: 'custpage_idlog',
                type: serverWidget.FieldType.TEXT,
                label: 'ID Log'
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            return form;
        }

        function createApplySublist(form) {
            form.addTab({
                id: 'apply_tab',
                label: getText('apply')
            });

            form.addTab({ id: 'apply_adv', label: getText('advance') });

            var sublist = form.addSublist({
                id: 'custpage_list_apply',
                label: getText('invoices'),
                tab: 'apply_tab',
                type: serverWidget.SublistType.LIST
            });

            sublist.addField({
                id: 'apply',
                label: getText('apply'),
                type: serverWidget.FieldType.CHECKBOX
            });

            sublist.addField({
                id: 'date',
                label: getText('date'),
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'type',
                label: getText('type'),
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'internalid',
                label: getText('internalid'),
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'tranid',
                label: getText('tranid'),
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: "installnum",
                label: getText("installnum"),
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'customer',
                label: getText('customer'),
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'memo',
                label: getText('memo'),
                type: serverWidget.FieldType.TEXTAREA
            })

            sublist.addField({
                id: 'document',
                label: getText('document_line'),
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'currency',
                label: getText('currency'),
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'advance',
                label: getText('advance'),
                type: serverWidget.FieldType.CURRENCY
            });

            sublist.addField({
                id: 'totalamount',
                label: getText('totalamount'),
                type: serverWidget.FieldType.CURRENCY
            });

            var field_amountdue = sublist.addField({
                id: 'amountdue',
                label: getText('amountdue'),
                type: serverWidget.FieldType.CURRENCY
            });

            field_amountdue.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
            field_amountdue.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });


            var field_payment = sublist.addField({
                id: 'payment',
                label: getText('payment'),
                type: serverWidget.FieldType.CURRENCY
            });
            field_payment.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });

            //C0815
            var field_discount = sublist.addField({
                id: 'discount',
                label: getText('discount'),
                type: serverWidget.FieldType.CURRENCY
            });
            field_discount.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });

            var field_interest = sublist.addField({
                id: 'interest',
                label: getText('interest'),
                type: serverWidget.FieldType.CURRENCY
            });
            field_interest.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });

            var field_penalty = sublist.addField({
                id: 'penalty',
                label: getText('penalty'),
                type: serverWidget.FieldType.CURRENCY
            });
            field_penalty.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });

            sublist.addButton({
                id: 'button_paidall',
                label: getText('paidall'),
                functionName: 'toggleCheckBoxes(true)'
            });

            sublist.addButton({
                id: 'button_clear',
                label: getText('clear'),
                functionName: 'toggleCheckBoxes(false)'
            });

            return sublist;
        }

        function setValues(context, form, localCurrency) {
            var status = context.request.parameters.status;
            var subsidiary = context.request.parameters.subsidiary;
            subsidiary = Number(subsidiary);
            var customer = context.request.parameters.customer;
            customer = Number(customer);
            var araccount = context.request.parameters.araccount;
            araccount = Number(araccount);
            var date = context.request.parameters.date ? context.request.parameters.date : new Date() ;
            
            var period = context.request.parameters.period ? context.request.parameters.period : getPeriodByDate(date);
            period = Number(period);
            

            var dateParse = format.parse({ value: date, type: format.Type.DATE });
            
            var dateFormat = format.format({ type: format.Type.DATE, value: dateParse });
            
            date = dateFormat;
            var currency = context.request.parameters.currency;
            var exchangeRate = context.request.parameters.exchangerate;
            var document = context.request.parameters.document;
            document = Number(document);
            var undepfunds = context.request.parameters.undepfunds;
            var bankaccount = context.request.parameters.bankaccount;
            bankaccount = Number(bankaccount);
            var department = context.request.parameters.department;
            department = Number(department);
            var class_ = context.request.parameters.class;
            class_ = Number(class_);
            var location = context.request.parameters.location;
            location = Number(location);
            var paymentMethod = context.request.parameters.paymentmethod;
            paymentMethod = Number(paymentMethod);


            log.debug('params', JSON.stringify(context.request.parameters));
            subsidiary = context.request.parameters.idS ? Number(context.request.parameters.idS):subsidiary;
            
            addSubsidiaries(form, subsidiary);
            addDocuments(form, document,context);
            addPaymentMethods(form, paymentMethod);
            //addCurrencies(form);
            if (status == '1') {
                addCustomer(form, customer);
                if (araccount) {
                    var name = search.lookupFields({
                        type: 'account', id: araccount,
                        columns: 'name'
                    }).name;

                    if (name) {
                        var field_araccount = form.getField({ id: 'custpage_araccount' })
                        field_araccount.addSelectOption({ value: araccount, text: name });
                        field_araccount.defaultValue = araccount;
                    }
                }

                if (period) {

                    var name = search.lookupFields({
                        type: 'accountingperiod',
                        id: period,
                        columns: 'periodname'
                    }).periodname;

                    if (name) {
                        var field_period = form.getField({ id: 'custpage_period' });
                        field_period.addSelectOption({ value: period, text: name });
                        field_period.defaultValue = period;
                    }
                }


                if (undepfunds == 'F' && bankaccount) {
                    var name = search.lookupFields({
                        type: 'account',
                        id: bankaccount,
                        columns: 'name'
                    }).name;

                    if (name) {
                        var field_bankaccount = form.getField({ id: 'custpage_bankaccount' });
                        field_bankaccount.addSelectOption({ value: bankaccount, text: name });
                        field_bankaccount.defaultValue = bankaccount;
                    }
                }

                if(currency){
                    var currencyName = search.lookupFields({
                        type : "currency",
                        id : currency,
                        columns: "name"
                    }).name;

                    var currencyField = form.getField({ id: 'custpage_currency' });
                    currencyField.addSelectOption({ value : currency, text : currencyName});
                    currencyField.defaultValue = currencyName;
                }

                if (FEAT_DPT && department) {
                    var name = search.lookupFields({
                        type: 'department',
                        id: department,
                        columns: 'name'
                    }).name;

                    if (name) {
                        var field_department = form.getField({ id: 'custpage_department' });
                        field_department.addSelectOption({ value: department, text: name });
                        field_department.defaultValue = department;
                    }
                }

                if (FEAT_CLASS && class_) {
                    var name = search.lookupFields({
                        type: 'classification',
                        id: class_,
                        columns: 'name'
                    }).name;

                    if (name) {
                        var field_class = form.getField({ id: 'custpage_class' });
                        field_class.addSelectOption({ value: class_, text: name });
                        field_class.defaultValue = class_
                    }
                }

                if (FEAT_LOC && location) {
                    var name = search.lookupFields({
                        type: 'location',
                        id: location,
                        columns: 'name'
                    }).name;

                    if (name) {
                        var field_location = form.getField({ id: 'custpage_location' });
                        field_location.addSelectOption({ value: location, text: name });
                        field_location.defaultValue = location;
                    }
                }

                customer && (form.getField({ id: 'custpage_customer' }).defaultValue = customer);
                date && (form.getField({ id: 'custpage_date' }).defaultValue = date);
                document && (form.getField({ id: 'custpage_document' }).defaultValue = document);
                exchangeRate && (form.getField({ id: 'custpage_exchangerate' }).defaultValue = exchangeRate);
                undepfunds && (form.getField({ id: 'custpage_undepfunds' }).defaultValue = undepfunds);
                paymentMethod && (form.getField({ id: 'custpage_paymentmethod' }).defaultValue = paymentMethod);

                form.getField({ id: 'custpage_status' }).defaultValue = '1';

                createApplySublistAdvances(form, subsidiary, currency, araccount, date, customer);
            }
        }

        function createApplySublistAdvances(form, subsidiary, currency, araccount, date, customer) {

            var cAdvance = 0;

            var subAdvance = form.addSublist({ id: 'custpage_id_advances', type: serverWidget.SublistType.LIST, label: getText('credits'), tab: 'apply_adv' });
            subAdvance.addField({ id: 'custpage_id_che_ad', label: getText('apply'), type: 'checkbox' });
            subAdvance.addField({ id: 'custpage_id_dat_ad', label: getText('date'), type: 'date' });
            subAdvance.addField({ id: 'custpage_id_typ_ad', label: getText('type'), type: 'text' });
            subAdvance.addField({ id: 'custpage_id_int_ad', label: getText('internalid'), type: 'text' });
            subAdvance.addField({ id: 'custpage_id_tra_ad', label: getText('tranid'), type: 'text' });
            subAdvance.addField({ id: 'custpage_id_doc_ad', label: getText('document_line'), type: 'text' });
            subAdvance.addField({ id: 'custpage_id_amo_ad', label: getText('totalamount'), type: 'currency' });

            //BUSQUEDA DE CREDIT MEMO SIN APLICAR
            var filtrosAnticipo = [];
            filtrosAnticipo[0] = search.createFilter({ name: 'currency', operator: 'is', values: currency });
            filtrosAnticipo[1] = search.createFilter({ name: 'account', operator: 'is', values: araccount });
            filtrosAnticipo[2] = search.createFilter({ name: 'trandate', operator: 'onorbefore', values: date });
            filtrosAnticipo[3] = search.createFilter({ name: 'subsidiary', operator: 'is', values: subsidiary });
            filtrosAnticipo[4] = search.createFilter({ name: 'entity', operator: 'is', values: customer });
            filtrosAnticipo[5] = search.createFilter({ name: 'appliedtotransaction', operator: 'anyof', values: "@NONE@" });
            filtrosAnticipo[6] = search.createFilter({ name: 'custbody_lmry_br_amount_advance', operator: 'anyof', values: '1' });
            filtrosAnticipo[7] = search.createFilter({ name: 'mainline', operator: 'is', values: 'T' });

            var searchAnticipo = search.create({
                type: 'creditmemo', columns: ['internalid', 'trandate', search.createColumn({ name: 'formulatext', formula: "{tranid}" }), 'custbody_lmry_document_type', 'fxamount', 'type'],
                filters: filtrosAnticipo
            });

            var resultAnticipo = searchAnticipo.run().getRange({ start: 0, end: 1000 });

            if (resultAnticipo && resultAnticipo.length) {
                var columnsAnticipo = resultAnticipo[0].columns;
                for (var i = 0; i < resultAnticipo.length; i++) {
                    subAdvance.setSublistValue({ id: 'custpage_id_int_ad', line: cAdvance, value: resultAnticipo[i].getValue(columnsAnticipo[0]) });

                    var tranidAnticipo = resultAnticipo[i].getValue(columnsAnticipo[2]);
                    if (tranidAnticipo) {
                        subAdvance.setSublistValue({ id: 'custpage_id_tra_ad', line: cAdvance, value: tranidAnticipo });
                    }

                    var dateAnticipo = resultAnticipo[i].getValue(columnsAnticipo[1]);
                    if (dateAnticipo) {
                        subAdvance.setSublistValue({ id: 'custpage_id_dat_ad', line: cAdvance, value: dateAnticipo });
                    }

                    var docAnticipo = resultAnticipo[i].getText(columnsAnticipo[3]);
                    if (docAnticipo) {
                        subAdvance.setSublistValue({ id: 'custpage_id_doc_ad', line: cAdvance, value: docAnticipo });
                    }

                    var amountAnticipo = resultAnticipo[i].getValue(columnsAnticipo[4]);
                    subAdvance.setSublistValue({ id: 'custpage_id_amo_ad', line: cAdvance, value: Math.abs(parseFloat(amountAnticipo)) });

                    var typeAnticipo = resultAnticipo[i].getValue(columnsAnticipo[5]);
                    subAdvance.setSublistValue({ id: 'custpage_id_typ_ad', line: cAdvance, value: typeAnticipo });

                    cAdvance++;
                }
            }

            //BUSQUEDA DE JOURNAL SIN APLICAR
            var filtrosJournal = [];
            filtrosJournal[0] = search.createFilter({ name: 'currency', operator: 'is', values: currency });
            filtrosJournal[1] = search.createFilter({ name: 'trandate', operator: 'onorbefore', values: date });
            filtrosJournal[2] = search.createFilter({ name: 'subsidiary', operator: 'is', values: subsidiary });
            filtrosJournal[3] = search.createFilter({ name: 'account', operator: 'is', values: araccount });
            filtrosJournal[4] = search.createFilter({ name: 'name', operator: 'is', values: customer });
            filtrosJournal[5] = search.createFilter({ name: 'appliedtotransaction', operator: 'anyof', values: "@NONE@" });
            filtrosJournal[6] = search.createFilter({ name: 'custbody_lmry_br_amount_advance', operator: 'anyof', values: '1' });

            var journalApprovalFeat = runtime.getCurrentScript().getParameter({ name: "CUSTOMAPPROVALJOURNAL" });
            if (journalApprovalFeat == "T" || journalApprovalFeat == true) {
                filtrosJournal[7] = search.createFilter({ name: 'approvalstatus', operator: 'anyof', values: ['2'] });
            }

            var searchJournal = search.create({
                type: 'journalentry', columns: ['internalid', 'trandate', search.createColumn({ name: 'formulatext', formula: "{tranid}" }), 'fxamount', 'type'],
                filters: filtrosJournal
            });

            var resultJournal = searchJournal.run().getRange({ start: 0, end: 1000 });

            if (resultJournal && resultJournal.length) {
                var columnsJournal = resultJournal[0].columns;
                for (var i = 0; i < resultJournal.length; i++) {
                    subAdvance.setSublistValue({ id: 'custpage_id_int_ad', line: cAdvance, value: resultJournal[i].getValue(columnsJournal[0]) });

                    var tranidAnticipo = resultJournal[i].getValue(columnsJournal[2]);
                    if (tranidAnticipo) {
                        subAdvance.setSublistValue({ id: 'custpage_id_tra_ad', line: cAdvance, value: tranidAnticipo });
                    }

                    var dateAnticipo = resultJournal[i].getValue(columnsJournal[1]);
                    if (dateAnticipo) {
                        subAdvance.setSublistValue({ id: 'custpage_id_dat_ad', line: cAdvance, value: dateAnticipo });
                    }

                    var amountAnticipo = resultJournal[i].getValue(columnsJournal[3]);
                    subAdvance.setSublistValue({ id: 'custpage_id_amo_ad', line: cAdvance, value: Math.abs(parseFloat(amountAnticipo)) });

                    var typeAnticipo = resultJournal[i].getValue(columnsJournal[4]);
                    subAdvance.setSublistValue({ id: 'custpage_id_typ_ad', line: cAdvance, value: typeAnticipo });

                    cAdvance++;
                }
            }

        }


        function disableFields(form) {
            var FIELDS = ['custpage_subsidiary', 'custpage_customer', 'custpage_araccount', 'custpage_date', 'custpage_period', 'custpage_document',
                'custpage_bankaccount', 'custpage_department', 'custpage_class', 'custpage_location', 'custpage_paymentmethod', 'custpage_currency'];

            for (var i = 0; i < FIELDS.length; i++) {
                var field = form.getField({ id: FIELDS[i] });
                if (field) {
                    field.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                }
            }
        }

        function addCustomer(form, customer) {
            var field_customer = form.getField({ id: 'custpage_customer' });
            var result = search.lookupFields({
                type: 'customer',
                id: customer,
                columns: ['internalid', 'companyname', 'isperson', 'firstname', 'middlename', 'lastname', 'entityid']
            });

            if (result['internalid']) {
                var isperson = result['isperson'];
                var firstname = result['firstname'];
                var middlename = result['middlename'];
                var lastname = result['lastname'];
                var entityid = result['entityid'];
                var companyname = result['companyname'];

                var name = entityid + " " + ((companyname) ? companyname : "");

                if (isperson) {
                    name = entityid + " " + firstname + " " + ((middlename) ? (middlename + " ") : "") + lastname;
                }

                /*if (!name) {
                    name = result.getValue('entityid');
                }*/

                field_customer.addSelectOption({ value: customer, text: name });
            }
        }


        function addDocuments(form, document,context) {
            var field_document = form.getField({ id: 'custpage_document' });
            if (!document) {
                //field_document.addSelectOption({ value: 0, text: '&nbsp;' });

                filters = [
                    ['isinactive', 'is', 'F'], 'AND',
                    ['custrecord_lmry_country_applied', 'anyof', ID_COUNTRY], 'AND',
                    ['custrecord_lmry_tipo_transaccion', 'anyof', TYPE_TRANSACTION]
                ]
                var subsidiaryId = context.request.parameters.idS;
                if (!subsidiaryId) {
                    filters.push('AND',['custrecord_lmry_document_apply_wht', 'is', 'T'])
                }
                
                var search_documents = search.create({
                    type: 'customrecord_lmry_tipo_doc',
                    filters: filters,
                    columns: ['internalid', search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC
                    })]
                });

                var results = search_documents.run().getRange(0, 1000);

                if (results) {
                    for (var i = 0; i < results.length; i++) {
                        var id = results[i].getValue('internalid');
                        var name = results[i].getValue('name');
                        field_document.addSelectOption({ value: id, text: name });
                    }
                }
            } else {
                var name = search.lookupFields({
                    type: 'customrecord_lmry_tipo_doc',
                    id: document,
                    columns: 'name'
                }).name;

                if (name) {
                    field_document.addSelectOption({ value: document, text: name });
                }
            }
        }


        function addPaymentMethods(form, paymentMethod) {
            var field_paymentmethod = form.getField({ id: 'custpage_paymentmethod' });
            if (!paymentMethod) {
                var search_methods = search.create({
                    type: 'customrecord_lmry_paymentmethod',
                    filters: [
                        ['isinactive', 'is', 'F'], 'AND', ['custrecord_lmry_country_pm', 'anyof', ID_COUNTRY]
                    ],
                    columns: ['internalid', 'name']
                });

                var results = search_methods.run().getRange(0, 1000);

                field_paymentmethod.addSelectOption({ value: 0, text: '&nbsp;' });

                if (results && results.length) {
                    for (var i = 0; i < results.length; i++) {
                        var id = results[i].getValue('internalid');
                        var name = results[i].getValue('name');
                        field_paymentmethod.addSelectOption({ value: id, text: name });
                    }
                }
            } else {
                var name = search.lookupFields({
                    type: 'customrecord_lmry_paymentmethod',
                    id: paymentMethod,
                    columns: ['internalid', 'name']
                }).name;

                field_paymentmethod.addSelectOption({ value: paymentMethod, text: name });
            }
        }

        function addSubsidiaries(form, subsidiary) {
            var field_subsidiary = form.getField('custpage_subsidiary');
            if (!subsidiary) {
                
                var search_subsidiaries = search.create({
                    type: 'subsidiary',
                    filters: [
                        ['isinactive', 'is', 'F'], 'AND',
                        ['country', 'anyof', 'BR']
                    ],
                    columns: ['internalid', 'name']
                });

                field_subsidiary.addSelectOption({ value: 0, text: '&nbsp;' });

                var results = search_subsidiaries.run().getRange(0, 1000);
                if (results && results.length) {
                    for (var i = 0; i < results.length; i++) {
                        var id = results[i].getValue('internalid');
                        var name = results[i].getValue('name');
                        if (LIC_BY_SUBSIDIARY[String(id)] && LIC_BY_SUBSIDIARY[String(id)].indexOf(ID_FEATURE) != -1) {
                            
                            field_subsidiary.addSelectOption({ value: id, text: name });
                        }
                    }
                }
            } else {
                
                if (LIC_BY_SUBSIDIARY[String(subsidiary)] && LIC_BY_SUBSIDIARY[String(subsidiary)].indexOf(ID_FEATURE) != -1) {
                    var name = search.lookupFields({
                        type: 'subsidiary',
                        id: subsidiary,
                        columns: 'name'
                    }).name;
                    
                    if (name) {
                        
                        field_subsidiary.addSelectOption({ value: subsidiary, text: name });
                    }
                }
            }

        }

        function getLocalCurrency() {
            var search_currency = search.create({
                type: 'customrecord_lmry_currency_by_country',
                filters: [
                    ['isinactive', 'is', 'F'], 'AND',
                    ['custrecord_lmry_is_country_base_currency', 'is', 'T'], 'AND',
                    ['custrecord_lmry_currency_country_local', 'anyof', ID_COUNTRY]
                ],
                columns: ['internalid', 'custrecord_lmry_currency']
            });

            var results = search_currency.run().getRange(0, 1000);
            if (results && results.length) {
                return results[0].getValue('custrecord_lmry_currency');
            } else {
                var errorObj = error.create({
                    name: 'CURRENCY_ISNT_CONFIGURED',
                    message: "The record LatamReady - Currency by Country is not configured for this country.",
                    notifyOff: false
                });
                throw errorObj;
            }
        }

        function getTransactions(context) {
            var transactions = [];
            var subsidiary = context.request.parameters.subsidiary;
            subsidiary = Number(subsidiary);
            var customer = context.request.parameters.customer;
            customer = Number(customer);
            var currency = context.request.parameters.currency;
            currency = Number(currency);
            var araccount = context.request.parameters.araccount;
            araccount = Number(araccount);
            var date = context.request.parameters.date;
            var document = context.request.parameters.document;
            document = Number(document);
            var byTransaction = context.request.parameters.byTransaction;
            
            var idTransaction = context.request.parameters.idTransaction;
            var idS = context.request.parameters.idS
            var search_transactions = search.load({
                id: 'customsearch_lmry_br_wht_invoices_to_pay'
            });

            if (FEAT_INSTALLMENTS == "T" || FEAT_INSTALLMENTS == true) {
                search_transactions.columns.push(
                    search.createColumn({
                        name: "installmentnumber",
                        join: "installment",
                        sort: search.Sort.ASC
                    }),
                    search.createColumn({
                        name: "fxamountremaining",
                        join: "installment"
                    }),
                    search.createColumn({
                        name: "fxamount",
                        join: "installment"
                    }),
                    search.createColumn({
                        name: "fxamountpaid",
                        join: "installment"
                    }));
            }


            var filters = search_transactions.filters;
            
            if (byTransaction || idS!="-1") {
                filters.splice(3, 1);
            }
            
            
            if (subsidiary) {
                filters.push(search.createFilter({ name: 'subsidiary', operator: 'anyof', values: [subsidiary] }));
            }

            if (customer) {
                if (FEAT_JOBS == 'T' || FEAT_JOBS == true) {
                    filters.push(search.createFilter({ name: 'internalid', join: 'customermain', operator: 'anyof', values: [customer] }));
                } else {
                    filters.push(search.createFilter({ name: "internalid", join: "customer", operator: "anyof", "values": [customer] }));
                }
            }

            if (currency) {
                filters.push(search.createFilter({ name: 'currency', operator: 'anyof', values: [currency] }));
            }

            if (araccount) {
                filters.push(search.createFilter({ name: 'account', operator: 'anyof', values: [araccount] }));
            }

            if (date) {
                filters.push(search.createFilter({ name: 'trandate', operator: 'onorbefore', values: [date] }));
            }

            if (document) {
                filters.push(search.createFilter({ name: 'custbody_lmry_document_type', operator: 'anyof', values: [document] }));
            }

            var invoiceApprovalFeat = runtime.getCurrentScript().getParameter({ name: "CUSTOMAPPROVALCUSTINVC" });
            if (invoiceApprovalFeat == "T" || invoiceApprovalFeat == true) {
                filters.push(search.createFilter({ name: 'approvalstatus', operator: 'anyof', values: ['2'] }));
            }

            var results = search_transactions.run().getRange(0, 1000);
            var columns = search_transactions.columns;

            //JSON: cantidad de installments
            /*var jsonCInstallments = {};
 
            if(results != null && results.length > 0){
              for(var i = 0; i < results.length; i++){
                var auxID = results[i].getValue(columns[0]);
                if(!jsonCInstallments[auxID]){
                  jsonCInstallments[auxID] = 1;
                }else{
                  jsonCInstallments[auxID] = parseFloat(jsonCInstallments[auxID]) + 1;
                }
              }
            }*/


            //LLENADO DE JSON: SUBLISTA
            if (results && results.length) {
                for (var i = 0; i < results.length; i++) {

                    /*var auxAnticipo = parseFloat(results[i].getValue(columns[13]))/parseFloat(jsonCInstallments[results[i].getValue(columns[0])]);
                    auxAnticipo = parseFloat(auxAnticipo).toFixed(2);*/

                    var transaction = {
                        'internalid': results[i].getValue(columns[0]),
                        'currency': results[i].getText(columns[2]),
                        'tranid': results[i].getValue(columns[3]),
                        'date': results[i].getValue(columns[4]),
                        'memo': results[i].getValue(columns[5]) || '',
                        'customer': results[i].getText(columns[6]),
                        'document': results[i].getText(columns[7]),
                        'amountdue': parseFloat(results[i].getValue(columns[8])) || 0.00,
                        'totalamount': parseFloat(results[i].getValue(columns[9])) || 0.00,
                        'amtPaidTotal': parseFloat(results[i].getValue(columns[10])) || 0.00,
                        'amountpaid': parseFloat(results[i].getValue(columns[10])) || 0.00,
                        'type': getText('invoice'),
                        'amountwht': 0.00,
                        'advance': results[i].getValue(columns[12]),
                        'amountadvance': results[i].getValue(columns[13])
                    };

                    

                    if (FEAT_INSTALLMENTS == "T" || FEAT_INSTALLMENTS == true) {
                        transaction["installnum"] = results[i].getValue(columns[14]) || "";
                        if (transaction["installnum"]) {
                            transaction["amountdue"] = parseFloat(results[i].getValue(columns[15])) || 0.00;
                            transaction["totalamount"] = parseFloat(results[i].getValue(columns[16])) || 0.00;
                            transaction["amountpaid"] = parseFloat(results[i].getValue(columns[17])) || 0.00;
                        }
                    }

                    if (parseFloat(transaction["amountdue"])) {
                        transactions.push(transaction);
                    }
                }
            }

            transactions = removeInvoicesWithCreditMemos(transactions);
            if (byTransaction) {
                transactions = moveTransactionToFirst(transactions,idTransaction);
            }
            
            return transactions;
        }

        function moveTransactionToFirst(transactions, idTransaction) {
            
            var index = -1;
            for (var i = 0; i < transactions.length; i++) {
                if (transactions[i].internalid === idTransaction) {
                    index = i;
                    break;
                }
            }

            if (index !== -1) {
                var transaction = transactions.splice(index, 1)[0]; 
                transactions.unshift(transaction); 
            }
            
            return transactions;
        }

        function removeInvoicesWithCreditMemos(transactions) {

            var appliedInvoices = [];
            for (var i = 0; i < transactions.length; i++) {
                var id = Number(transactions[i]["internalid"]);
                if (transactions[i]["amtPaidTotal"] > 0.00 && appliedInvoices.indexOf(id) == -1) {
                    appliedInvoices.push(id);
                }
            }

            if (appliedInvoices.length) {

                var search_credmemos = search.load({
                    id: 'customsearch_lmry_br_wht_creditmemos'
                });

                search_credmemos.filters.push(search.createFilter({ name: 'appliedtotransaction', operator: 'anyof', values: appliedInvoices }));

                var excludedInvoices = [];
                var results = search_credmemos.run().getRange(0, 1000);
                if (results) {
                    for (var i = 0; i < results.length; i++) {
                        var idTransaction = results[i].getValue('appliedtotransaction');
                        excludedInvoices.push(Number(idTransaction));
                    }
                }

                transactions = transactions.filter(function (v) {
                    return excludedInvoices.indexOf(Number(v["internalid"])) == -1;
                });
            }

            return transactions;
        }

        function loadTransactions(transactions, sublist, context) {
            var numInstallments = 0;

            for (var i = 0; i < transactions.length; i++) {
                var transaction = transactions[i];
                if (transaction['internalid']) {
                    
                    var idTransaction = context.request.parameters.idTransaction;
                    if (idTransaction && (idTransaction == transaction['internalid'])) {
                        sublist.setSublistValue({ id: 'apply', line: i, value: 'T' });
                    }else{
                        sublist.setSublistValue({ id: 'apply', line: i, value: 'F' });
                    }
                    

                    var url_invoice = url.resolveRecord({
                        recordType: 'invoice',
                        recordId: transaction['internalid'],
                        isEditMode: false
                    });

                    var baselink = '<a class="dottedlink" href ="' + url_invoice + '" target="_blank">#TEXT</a>';
                    

                    if (transaction['date']) {
                        sublist.setSublistValue({ id: 'date', line: i, value: baselink.replace('#TEXT', transaction['date']) });
                    }

                    if (transaction['type']) {
                        sublist.setSublistValue({ id: 'type', line: i, value: baselink.replace('#TEXT', transaction['type']) });
                    }

                    if (transaction['internalid']) {
                        sublist.setSublistValue({ id: 'internalid', line: i, value: transaction['internalid'] });
                    }

                    if (transaction['tranid']) {
                        sublist.setSublistValue({ id: 'tranid', line: i, value: transaction['tranid'] });
                    }

                    if (transaction["installnum"]) {
                        sublist.setSublistValue({ id: 'installnum', line: i, value: transaction["installnum"] });
                        numInstallments++;
                    }

                    if (transaction['customer']) {
                        sublist.setSublistValue({ id: 'customer', line: i, value: transaction['customer'] });
                    }

                    if (transaction['memo']) {
                        sublist.setSublistValue({ id: 'memo', line: i, value: transaction['memo'] });
                    }

                    if (transaction['document']) {
                        sublist.setSublistValue({ id: 'document', line: i, value: transaction['document'] });
                    }

                    if (transaction['currency']) {
                        sublist.setSublistValue({ id: 'currency', line: i, value: transaction['currency'] });
                    }

                    //Anticipo
                    sublist.setSublistValue({ id: 'advance', line: i, value: 0 });

                    if ((transaction['advance'] == true || transaction['advance'] == 'T') && transaction['amountadvance'] && !transaction["installnum"]) {
                        sublist.setSublistValue({ id: 'advance', line: i, value: transaction['amountadvance'] });
                    }

                    //
                    if (transaction['totalamount']) {
                        sublist.setSublistValue({ id: 'totalamount', line: i, value: transaction['totalamount'] });
                    }

                    sublist.setSublistValue({ id: 'amountdue', line: i, value: transaction['amountdue'] || 0.00 });
                }
            }

            if (!numInstallments) {
                var field_installnum = sublist.getField({ id: "installnum" });
                field_installnum.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
            }
        }


        var TEXT_BY_LANGUAGE = {
            'title': { 'en': 'LatamReady - BR Customer Payment', 'es': 'LatamReady - BR Pago a Cliente', 'pt': 'LatamReady - BR Pagamento do Cliente' },
            'primaryinformation': { 'en': 'Primary Information', 'es': 'Información Primaria', 'pt': 'Informações principais' },
            'subsidiary': { 'en': 'Subsidiary', 'es': 'Subsidiaria', 'pt': 'Subsidiária' },
            'customer': { 'en': 'Customer', 'es': 'Cliente', 'pt': 'Cliente' },
            'currency': { 'en': 'Currency', 'es': 'Moneda', 'pt': 'Moeda' },
            'exchangerate': { 'en': 'Exchange Rate', 'es': 'Tipo de Cambio', 'pt': 'Taxa de câmbio' },
            'araccount': { 'en': 'A/R Account', 'es': 'CUENTA DE CUENTAS POR COBRAR', 'pt': 'CONTA DO CR' },
            'undepfunds': { 'en': 'Undep. Funds', 'es': 'FONDOS SIN DEPOSITAR', 'pt': 'FUNDOS NÃO-DEPOSITADOS' },
            'bankaccount': { 'en': 'Account', 'es': 'Cuenta', 'pt': 'Conta' },
            'date': { 'en': 'Date', 'es': 'Fecha', 'pt': 'Data' },
            'period': { 'en': 'Posting Period', 'es': 'PERÍODO CONTABLE', 'pt': 'PERÍODO DE POSTAGEM' },
            'memo': { 'en': 'Memo', 'es': 'Nota', 'pt': 'Nota' },
            'classification': { 'en': 'Classification', 'es': 'Clasificación', 'pt': 'Classificação' },
            'department': { 'en': 'Department', 'es': 'Departamento', 'pt': 'Departamento' },
            'class': { 'en': 'Class', 'es': 'Clase', 'pt': 'CENTRO DE CUSTO' },
            'location': { 'en': 'Location', 'es': 'UBICACIÓN', 'pt': 'LOCALIDADE' },
            'paymentmethod': { 'en': 'Latam - Payment Method', 'es': 'Latam - Método de pago', 'pt': 'LATAM - MÉTODO DE PAGAMENTO' },
            'filter': { 'en': 'Filter', 'es': 'Filtrar', 'pt': 'Filtrar' },
            'apply': { 'en': 'Apply', 'es': 'Aplicar', 'pt': 'Aplicar' },
            'internalid': { 'en': 'internalid' },
            'tranid': { 'en': 'Ref No.', 'es': '', 'pt': 'Nº DE REFERÊNCIA' },
            'type': { 'en': 'Type', 'es': 'Tipo', 'pt': 'Tipo' },
            'document': { 'en': 'Latam - Legal Document Type' },
            'document_line': { 'en': 'Fiscal Document' },
            'advance': { 'en': 'Advance', 'es': 'Anticipo' },
            'totalamount': { 'en': 'Total Amt.' },
            'amountdue': { 'en': 'Amt. Due' },
            'payment': { 'en': 'Payment', 'es': 'Pago', 'pt': 'Pagamento' },
            'invoices': { 'en': 'Invoices', 'es': 'Facturas de Venta', 'pt': 'Faturas' },
            'invoice': { 'en': 'Invoice', 'es': 'Factura de Venta', 'pt': 'Fatura' },
            'save': { 'en': 'Save', 'es': 'Guardar', 'pt': 'Salvar' },
            'paidall': { 'en': 'Paid All', 'es': 'Pagar todo', 'pt': 'Pagar tudo' },
            'clear': { 'en': 'Clear', 'es': 'Limpiar', 'pt': 'Limpar' },
            'cancel': { 'en': 'Cancel', 'es': 'Cancelar', 'pt': 'Cancelar' },
            'interest': { 'en': 'Interest', 'es': 'Intereses', 'pt': 'Juros' },
            'penalty': { 'en': 'Penalty', 'es': 'Multas', 'pt': 'Multas' },
            "installnum": { 'en': 'Installment Number', "es": "Número de cuota", "pt": "NÚMERO DE PRESTAÇÕES" },
            'credits': { 'en': 'Credits and Journals', 'es': 'Notas de Credito y Asientos Diarios' },
            "accountingBooks": { 'en': 'Accounting Books', 'es': "Libro Contables", "pt": "Livros contábeis" },
            "bookName": { 'en': "Book Name", "es": "Nombre del Libro", "pt": "NOME DO LIVRO" },
            "baseCurrency": { "en": "Base Currency", "es": "Moneda Base", "pt": "MOEDA BASE" },
            "bookId": { "en": "Book ID", "es": "ID del Libro", "pt": "ID do LIVRO" },
            "discount": { "en": "Discount", "es": "Descuento", "pt": "Desconto" }

        };

        function getText(key) {
            if (TEXT_BY_LANGUAGE[key]) {
                return TEXT_BY_LANGUAGE[key][LANGUAGE] || TEXT_BY_LANGUAGE[key]['en'];
            }
            return '';
        }

        function addCurrencies(form, localCurrency) {
            var currencyField = form.getField({ id: "custpage_currency" });
            if (currencyField) {
                currencyField.addSelectOption({ value: 0, text: "&nbsp;" });
                var currencySearch = search.create({
                    type: "currency",
                    filters: [
                        ["isinactive", "is", "F"], "AND",
                        [
                            ["symbol", "is", "USD"], "OR",
                            ["symbol", "is", "BRL"]
                        ]
                    ],
                    columns: ["internalid", "name"]
                });

                var results = currencySearch.run().getRange(0, 10);
                if (results) {
                    for (var i = 0; i < results.length; i++) {
                        var id = results[i].getValue("internalid");
                        var name = results[i].getValue("name");
                        currencyField.addSelectOption({ value: id, text: name });
                    }
                }
            }
        }

        function createBookSublist(form, context) {
            
            var subsidiary = context.request.parameters.subsidiary || "";
            var currencyId = context.request.parameters.currency;
            var trandate = context.request.parameters.date || new Date();

            
            if (subsidiary && currencyId && trandate) {
                form.addTab({
                    id: "book_tab",
                    label: getText("accountingBooks")
                });

                var sublist = form.addSublist({
                    id: "custpage_list_book",
                    label: getText("accountingBooks"),
                    tab: "book_tab",
                    type: serverWidget.SublistType.LIST
                });

                sublist.addField({
                    id: "custpage_bookid",
                    label: getText("bookId"),
                    type: serverWidget.FieldType.TEXT
                })

                sublist.addField({
                    id: "custpage_bookname",
                    label: getText("bookName"),
                    type: serverWidget.FieldType.TEXT
                });

                sublist.addField({
                    id: "custpage_bookcurrency",
                    label: getText("baseCurrency"),
                    type: serverWidget.FieldType.TEXT
                });

                sublist.addField({
                    id: "custpage_bookcurrency_id",
                    label: getText("baseCurrency"),
                    type: serverWidget.FieldType.TEXT
                }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                sublist.addField({
                    id: "custpage_book_exchangerate",
                    label: getText("exchangerate"),
                    type: serverWidget.FieldType.FLOAT
                }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });

                var bookSearch = search.create({
                    type: "accountingbook",
                    filters: [
                        ["status", "anyof", "ACTIVE"], "AND",
                        ["subsidiary", "anyof", subsidiary], "AND",
                        ["isprimary", "is", "F"]
                    ],
                    columns: ["internalid", search.createColumn({
                        name: "isprimary",
                        sort: search.Sort.DESC
                    }), "name", "currency"]
                });

                var trandate = format.parse({
                    value: trandate,
                    type: format.Type.DATE
                })

                var results = bookSearch.run().getRange(0, 1000);
                for (var i = 0; i < results.length; i++) {
                    var bookId = results[i].getValue("internalid");
                    var bookName = results[i].getValue("name");
                    var bookCurrency = results[i].getValue("currency")
                    var bookCurrencyText = results[i].getText("currency");
                    if (bookId) {
                        sublist.setSublistValue({ id: "custpage_bookid", value: bookId, line: i });
                        if (bookName) {
                            sublist.setSublistValue({ id: "custpage_bookname", value: bookName, line: i });
                        }
                        if (bookCurrency) {
                            sublist.setSublistValue({ id: "custpage_bookcurrency", value: bookCurrencyText, line: i });
                            sublist.setSublistValue({ id: "custpage_bookcurrency_id", value: bookCurrency, line: i });

                            var bookExchangeRate = currencyApi.exchangeRate({
                                date: trandate,
                                source: currencyId,
                                target: bookCurrency
                            });

                            if (bookExchangeRate) {
                                bookExchangeRate = parseFloat(bookExchangeRate);
                                sublist.setSublistValue({ id: "custpage_book_exchangerate", value: bookExchangeRate, line: i });
                            }
                        }
                    }
                }

                return sublist;
            }
        }

        function getAccountingPeriods() {
            var periods = [];
            var search_periods = search.load({
                id: 'customsearch_lmry_open_accounting_period'
            });
    
            var columns = search_periods.columns;
            var results = search_periods.run().getRange(0, 1000);
            if (results && results.length) {
                for (var i = 0; i < results.length; i++) {
                    var id = results[i].getValue(columns[0]);
                    var name = results[i].getValue(columns[1]);
                    var startdate = results[i].getValue(columns[2]);
                    startdate = format.parse({ value: startdate, type: format.Type.DATE });
                    var enddate = results[i].getValue(columns[3]);
                    enddate = format.parse({ value: enddate, type: format.Type.DATE });
    
                    periods.push({
                        value: id,
                        text: name,
                        startDate: startdate,
                        endDate: enddate
                    });
                }
            }
            return periods;
        }
    
        function getPeriodByDate(date) {
            var periods = getAccountingPeriods();
            var period = 0;
            for (var i = 0; i < periods.length; i++) {
                if (periods[i]['startDate'] <= date && date <= periods[i]['endDate'].getTime()) {
                    period = periods[i]['value'];
                    break;
                }
            }
            return period;
        }


        return {
            onRequest: onRequest
        }
    });

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_PE_BillPayment_STLT.js                      ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Set 22 2017  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define(['N/url', 'N/record', 'N/currency', 'N/task', 'N/log', 'N/xml', 'N/ui/serverWidget', 'N/search', 'N/runtime', 'N/redirect', 'N/email', 'N/config', 'N/format',
    './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_PE_Massive_BillPayments_LBRY'
],
    /**
     * 
     * @param {object} record 
     * @param {object} currency 
     * @param {object} task 
     * @param {object} log 
     * @param {object} xml 
     * @param {object} serverWidget 
     * @param {object} search 
     * @param {object} runtime 
     * @param {object} redirect 
     * @param {*} _email 
     * @param {*} _config 
     * @param {object} format
     * @param {object} library 
     * @returns 
     */
    function (url, record, currency, task, log, xml, serverWidget, search, runtime, redirect, _email, _config, format, library, libraryBill) {
        // Nombre del Script
        var LMRY_script = "LatamReady - PE BILL PAYMENT STLT";
        var Language = runtime.getCurrentScript().getParameter({ name: 'LANGUAGE' });
        Language = Language.substring(0, 2);
        const labels = {
            'es': {
                LblMsg1: 'AVISO: Actualmente la licencia para este módulo está vencida, por favor contacte al equipo comercial de LatamReady',
                LblMsg2: 'También puedes contactar con nosotros a través de',
                LblMsg3: 'Importante: El acceso no está permitido',
                LblGroup1: 'Información Primaria',
                LblTittleMsg: 'Mensaje',
                LblMulti: 'Multibooking',
                LblCust: 'Cliente',
                LblBook: 'Libro',
                LblSub: 'Subsidiaria',
                LblBaseCur: 'Moneda Base',
                LblCur: 'Moneda',
                LblAPAccount: 'Cuenta A/R',
                LblBnkAccount: 'Cuenta Bancaria',
                LblActPrd: 'Periodo Contable',
                LblGroup2: 'Classificación',
                LblDpt: 'Departmento',
                LblPyMtd: 'LATAM - Método de Pago',
                LblClass: 'Clase',
                LblLct: 'Ubicación',
                LblIDProcess: 'ID Proceso',
                TabTrans: 'Transacciones',
                LblTrans: 'Transacción',
                LblApply: 'Aplicar',
                LblInternalID: 'ID Interna',
                LblSublist: 'Sublista',
                LblTotalAm: 'Monto Total',
                LblDueAm: 'Monto Adeudado',
                LblPay: 'Pago',
                Lblegal: 'LATAM - Tipo de Documento Legal',
                LblName: 'Nombre',
                LblDate: 'Fecha',
                BtnBack: 'Atrás',
                BtnSave: 'Guardar',
                LblFiscal: 'Documento Fiscal',
                BtnFilter: 'Filtrar',
                LblExRate: 'Tipo de Cambio',
                LblExRateJ: 'Tipo de Cambio Libro Diario',
                BtnMarkAll: 'Marcar Todo',
                BtnDesmarkAll: 'Desmarcar Todo',
                LblDocType: 'Tipo de Documento',
                BtnReset: 'Reiniciar',
                LblForm: 'Latam PE - Pagos de Bills'
            },
            'pt': {
                LblMsg1: 'AVISO: Atualmente a licença para este módulo expirou, entre em contato com a equipe comercial da LatamReady',
                LblMsg2: 'Você também pode nos contatar através de',
                LblMsg3: 'Importante: o acesso não é permitido',
                LblGroup1: 'Informação Primária',
                LblTittleMsg: 'Mensagem',
                LblMulti: 'Multibooking',
                LblCust: 'Cliente',
                LblBook: 'Livro',
                LblSub: 'Subsidiária',
                LblBaseCur: 'Moeda Base',
                LblCur: 'Moeda',
                LblAPAccount: 'Conta A/R',
                LblBnkAccount: 'Conta bancária',
                LblActPrd: 'Período contábil',
                LblGroup2: 'Classificação',
                LblDpt: 'Departmento',
                LblPyMtd: 'LATAM - Forma de Pagamento',
                LblClass: 'Classe',
                LblLct: 'Localização',
                LblIDProcess: 'ID do processo',
                TabTrans: 'Transações',
                LblTrans: 'Transação',
                LblApply: 'Aplicar',
                LblInternalID: 'ID Interno',
                LblSublist: 'Sublista',
                LblTotalAm: 'Montante Total',
                LblDueAm: 'Quantia Devida',
                LblPay: 'Pagamento',
                Lblegal: 'LATAM - Tipo de Documento Legal',
                LblName: 'Nome',
                LblDate: 'Data',
                BtnBack: 'Voltar',
                BtnSave: 'Salve',
                LblFiscal: 'Documento Fiscal',
                BtnFilter: 'Filtro',
                LblExRate: 'Taxa de Cambio',
                LblExRateJ: 'Taxa de Cambio Entrada no Diário',
                BtnMarkAll: 'Marcar Tudo',
                BtnDesmarkAll: 'Desmarcar Tudo',
                LblDocType: 'Tipo de documento',
                BtnReset: 'Redefinir',
                LblForm: 'Latam PE - Pagamento do Bill'
            },
            default: {
                LblMsg1: 'NOTICE: Currently the license for this module is expired, please contact the commercial team of LatamReady',
                LblMsg2: 'You can also contact us through',
                LblMsg3: 'Important: Access is not allowed',
                LblGroup1: 'Primary Information',
                LblTittleMsg: 'Message',
                LblMulti: 'Multibooking',
                LblCust: 'Customer',
                LblBook: 'Book',
                LblSub: 'Subsidiary',
                LblBaseCur: 'Base currency',
                LblCur: 'Currency',
                LblAPAccount: 'A/P Account',
                LblBnkAccount: 'Bank Account',
                LblActPrd: 'Accounting Period',
                LblGroup2: 'Classification',
                LblDpt: 'Department',
                LblPyMtd: 'LATAM - Payment Method',
                LblClass: 'Class',
                LblLct: 'Location',
                LblIDProcess: 'Process ID',
                TabTrans: 'Transactions',
                LblTrans: 'Transaction',
                LblApply: 'Apply',
                LblInternalID: 'Internal ID',
                LblSublist: 'Sublist',
                LblTotalAm: 'Total amount',
                LblDueAm: 'Amount due',
                LblPay: 'Payment',
                Lblegal: 'LATAM - Legal document type',
                LblName: 'Name',
                LblDate: 'Date',
                BtnBack: 'Back',
                BtnSave: 'Save',
                LblFiscal: 'Fiscal Document',
                BtnFilter: 'Filter',
                LblExRate: 'Exchange Rate',
                LblExRateJ: 'Exchange Rate Journal Entry',
                BtnMarkAll: 'Mark all',
                BtnDesmarkAll: 'Desmark all',
                LblDocType: 'Document type',
                BtnReset: 'Reset',
                LblForm: 'Latam PE - Bill Payments',
            },
            get: function (languaje, name) {
                if (!name) throw "Se require un nombre para el label";
                if (languaje !== "pt" && languaje !== "es") return this["default"][name];
                return this[languaje][name];
            }
        };
        function onRequest(context) {
            try {
                if (context.request.method == 'GET') {
                    var subsidiarys = [];

                    subsidiarys = obtenerSubsidiarias(0);
                    // Verifica si el pais tiene acceso
                    if (subsidiarys.length == 0) {

                        var form = serverWidget.createForm({ title: labels.get(Language, "LblForm") });

                        // Mensaje para el cliente
                        var myInlineHtml = form.addField({
                            id: 'custpage_lmry_v_message',
                            label: labels.get(Language, "LblTittleMsg"),
                            type: serverWidget.FieldType.INLINEHTML
                        });

                        myInlineHtml.layoutType = serverWidget.FieldLayoutType.OUTSIDEBELOW;
                        myInlineHtml.updateBreakType({
                            breakType: serverWidget.FieldBreakType.STARTCOL
                        });

                        var strhtml = "<html>";
                        strhtml += "<table border='0' class='table_fields' cellspacing='0' cellpadding='0'>" +
                            "<tr>" +
                            "</tr>" +
                            "<tr>" +
                            "<td class='text'>" +
                            "<div style=\"color: gray; font-size: 12pt; margin-top: 10px; padding: 5px; border-top: 1pt solid silver\">" +
                            labels.get(Language, "LblMsg1") + ".</br>" + labels.get(Language, "LblMsg2") + "www.Latamready.com" +
                            "</div>" +
                            "</td>" +
                            "</tr>" +
                            "</table>" +
                            "</html>";
                        myInlineHtml.defaultValue = strhtml;

                        // Dibuja el formularios
                        context.response.writePage(form);

                        // Termina el SuiteLet
                        return true;
                    }

                    var isOneWorld = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });

                    // Parametros del Redirect

                    var requestSubsidiaryID = context.request.parameters.custparam_subsi;
                    var requestPayeeID = context.request.parameters.custparam_payee;
                    var requestCurrencyID = context.request.parameters.custparam_curre;
                    var requestAccountID = context.request.parameters.custparam_accon;
                    var requestDate = context.request.parameters.custparam_date;
                    var requestBankID = context.request.parameters.custparam_bacco;
                    var requestPeriodID = context.request.parameters.custparam_acper;
                    var requestExchangerate = context.request.parameters.custparam_exrat;
                    var requestExchangerateJournal = context.request.parameters.custparam_exrat_journal;
                    var requestDepartmentID = context.request.parameters.custparam_depar;
                    var requestClassID = context.request.parameters.custparam_class;
                    var requestLocationID = context.request.parameters.custparam_locat;
                    var requestMethodID = context.request.parameters.custparam_metho;
                    var requestDocID = context.request.parameters.custparam_doc;
                    //activacion de enable features
                    var enab_dep = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
                    var enab_loc = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
                    var enab_clas = runtime.isFeatureInEffect({ feature: "CLASSES" });


                    if (requestExchangerate == 1) {
                        requestExchangerateJournal = 1;
                    }

                    var form = serverWidget.createForm({ title: labels.get(Language, "LblForm") });
                    form.addFieldGroup({
                        id: 'group_pi',
                        label: labels.get(Language, "LblGroup1")
                    });

                    //Subsidiary --one world
                    if (isOneWorld == true) {

                        var fieldSubsidiary = form.addField({
                            id: 'custpage_id_subsi',
                            label: labels.get(Language, "LblSub"),
                            type: serverWidget.FieldType.SELECT,
                            container: 'group_pi'
                        });

                        //Añade las subsidiarias que cuenten con localización
                        obtenerSubsidiarias(fieldSubsidiary);

                        fieldSubsidiary.isMandatory = true;

                        // Seteo en el rellamado
                        if (requestSubsidiaryID != '' && requestSubsidiaryID != null) {
                            fieldSubsidiary.defaultValue = requestSubsidiaryID;
                            var featureNoDomi = libraryBill.getFeatSetupTaxSubsidiary(requestSubsidiaryID, 'custrecord_lmry_pago_no_domi')
                        }

                        var fieldAccoundPay = form.addField({
                            id: 'custpage_id_account_pay',
                            label: labels.get(Language, "LblAPAccount"),
                            type: serverWidget.FieldType.SELECT,
                            container: 'group_pi'
                        });
                        fieldAccoundPay.isMandatory = true;

                    } else {
                        var fieldAccoundPay = form.addField({
                            id: 'custpage_id_account_pay',
                            label: labels.get(Language, "LblAPAccount"),
                            type: serverWidget.FieldType.SELECT,
                            container: 'group_pi'
                        });
                        fieldAccoundPay.isMandatory = true;
                        var filterAccPay = { name: 'isinactive', operator: 'is', values: 'F' }
                        getCustomSearch('customsearch_lmry_pe_account_payable', filterAccPay, fieldAccoundPay);
                    }

                    var fieldCurrency = form.addField({
                        id: 'custpage_id_curren',
                        label: labels.get(Language, "LblCur"),
                        type: serverWidget.FieldType.SELECT,
                        container: 'group_pi'
                    });
                    fieldCurrency.isMandatory = true;

                    // Seteo en el rellamado
                    if (requestCurrencyID != '' && requestCurrencyID != null) {
                        fieldCurrency.defaultValue = requestCurrencyID;
                    }

                    if (isOneWorld == true) {
                        var fieldBank = form.addField({
                            id: 'custpage_id_bank',
                            label: labels.get(Language, "LblBnkAccount"),
                            type: serverWidget.FieldType.SELECT,
                            container: 'group_pi'
                        });
                        fieldBank.isMandatory = true;
                    } else {
                        var fieldBank = form.addField({
                            id: 'custpage_id_bank',
                            label: labels.get(Language, "LblBnkAccount"),
                            type: serverWidget.FieldType.SELECT,
                            container: 'group_pi'
                        });
                        fieldBank.isMandatory = true;
                        var filterBank = { name: 'isinactive', operator: 'is', values: 'F' }
                        getCustomSearch('customsearch_lmry_pe_bank_account', filterBank, fieldBank);
                    }
                    if (requestBankID != '' && requestBankID != null) {
                        fieldBank.defaultValue = requestBankID;
                    }


                    var fieldDate = form.addField({
                        id: 'custpage_id_date',
                        label: labels.get(Language, "LblDate"),
                        type: serverWidget.FieldType.DATE,
                        source: 'date',
                        container: 'group_pi'
                    });

                    if (requestDate != null && requestDate != '') {
                        fieldDate.defaultValue = requestDate;
                    }

                    var fieldPeriod = form.addField({
                        id: 'custpage_id_period',
                        label: labels.get(Language, "LblActPrd"),
                        type: serverWidget.FieldType.SELECT,
                        container: 'group_pi'
                    });
                    fieldPeriod.isMandatory = true;

                    // Seteo en el rellamado
                    if (requestPeriodID != '' && requestPeriodID != null) {
                        fieldPeriod.defaultValue = requestPeriodID;
                    }

                    var fieldExchangeRate = form.addField({
                        id: 'custpage_id_rate',
                        label: labels.get(Language, "LblExRate"),
                        type: serverWidget.FieldType.FLOAT,
                        source: 'exchangerate',
                        container: 'group_pi'
                    });
                    fieldExchangeRate.isMandatory = true;

                    // Seteo en el rellamado
                    if (requestExchangerate != '' && requestExchangerate != null) {
                        fieldExchangeRate.defaultValue = requestExchangerate;
                    }
                    /**
                     * Modificacion - Habilitacion de campo Exchange Rate Journal
                     */
                    var fieldExchangeRate_journal = form.addField({
                        id: 'custpage_id_rate_journal',
                        label: labels.get(Language, "LblExRateJ"),
                        type: serverWidget.FieldType.FLOAT,
                        source: 'exchangerate',
                        container: 'group_pi'
                    });
                    // Seteo en el rellamado

                    var fieldDoc = form.addField({
                        id: 'custpage_id_doc',
                        label: labels.get(Language, "Lblegal"),
                        type: serverWidget.FieldType.SELECT,
                        container: 'group_pi'
                    });

                    fieldDoc.isMandatory = true;

                    var legalFilters = [];
                    legalFilters[0] = search.createFilter({
                        name: 'isinactive',
                        operator: search.Operator.IS,
                        values: 'F'
                    });
                    legalFilters[1] = search.createFilter({
                        name: 'internalid',
                        operator: search.Operator.IS,
                        values: 354
                    });

                    var search_Subs = search.create({
                        type: 'customrecord_lmry_tipo_doc',
                        filters: legalFilters,
                        columns: ['internalid', 'name']
                    });
                    var resul_sub = search_Subs.run();
                    var lengt_sub = resul_sub.getRange({
                        start: 0,
                        end: 1
                    });

                    if (lengt_sub != null && lengt_sub.length > 0) {

                        // Llenado de listbox
                        var legalID = lengt_sub[0].getValue('internalid');
                        var legalNM = lengt_sub[0].getValue('name');

                        //field_legal.insertSelectOption({value: legalID,text: legalNM});
                        //	objRecord.setValue({fieldId: 'custpage_id_doc',value: legalID,ignoreFieldChange: false});

                        fieldDoc.addSelectOption({
                            value: legalID,
                            text: legalNM
                        });

                    }

                    if (requestDocID != '' && requestDocID != null) {
                        fieldDoc.defaultValue = requestDocID;
                    }

                    if (isOneWorld) {
                        var fieldPayee = form.addField({
                            id: 'custpage_id_payee',
                            label: 'PAYEE',
                            type: serverWidget.FieldType.SELECT,
                            container: 'group_pi'
                        });
                    } else {
                        var fieldPayee = form.addField({
                            id: 'custpage_id_payee',
                            label: 'PAYEE',
                            source: 'vendor',
                            type: serverWidget.FieldType.SELECT,
                            container: 'group_pi'
                        });
                    }
                    fieldPayee.isMandatory = true;

                    // Seteo en el rellamado
                    if (requestPayeeID != '' && requestPayeeID != null) {
                        fieldPayee.defaultValue = requestPayeeID;
                    }

                    var fieldMemo = form.addField({
                        id: 'id_memo',
                        label: 'MEMO',
                        type: serverWidget.FieldType.TEXT,
                        container: 'group_pi'
                    });
                    if (requestPayeeID == '' || requestPayeeID == null) {
                        fieldMemo.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                    } else {
                        if (featureNoDomi) {
                            fieldMemo.isMandatory = true;
                        }
                    }
                    if (requestPayeeID != '' && requestPayeeID != null) {
                        var fieldStatus = form.addField({
                            id: 'id_state',
                            label: labels.get(Language, "LblIDProcess"),
                            type: serverWidget.FieldType.TEXT,
                            container: 'group_pi'
                        });
                        fieldStatus.defaultValue = 'PENDIENTE';
                        fieldStatus.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                    }

                    form.addFieldGroup({ id: 'group_cla', label: labels.get(Language, "LblGroup2") });

                    //Activacion de enable features
                    var isEnableDep = runtime.isFeatureInEffect({
                        feature: "DEPARTMENTS"
                    });

                    var isEnableLoc = runtime.isFeatureInEffect({
                        feature: "LOCATIONS"
                    });

                    var isEnableClass = runtime.isFeatureInEffect({
                        feature: "CLASSES"
                    });

                    //activacion de Accounting Preferences
                    var user = runtime.getCurrentUser();
                    var pref_dep = user.getPreference({
                        name: "DEPTMANDATORY"
                    });

                    var pref_loc = user.getPreference({
                        name: "LOCMANDATORY"
                    });

                    var pref_clas = user.getPreference({
                        name: "CLASSMANDATORY"
                    });

                    // Solo para One World
                    if (isOneWorld == true) {
                        if (isEnableDep == true) {
                            var fieldDepartment = form.addField({
                                id: 'custpage_id_depart',
                                label: labels.get(Language, "LblDpt"),
                                type: serverWidget.FieldType.SELECT,
                                container: 'group_cla'
                            });
                            if (pref_dep == true) {
                                fieldDepartment.isMandatory = true;
                            }
                        }
                        var fieldPayMethod = form.addField({
                            id: 'custpage_id_method',
                            label: labels.get(Language, "LblPyMtd"),
                            type: serverWidget.FieldType.SELECT,
                            container: 'group_cla'
                        });
                        fieldPayMethod.isMandatory = true;

                        if (isEnableLoc == true) {
                            var fieldLocation = form.addField({
                                id: 'custpage_id_location',
                                label: labels.get(Language, "LblLct"),
                                type: serverWidget.FieldType.SELECT,
                                container: 'group_cla'
                            });
                            if (pref_loc == true) {
                                fieldLocation.isMandatory = true;
                            }
                        }
                        if (isEnableClass == true) {
                            var fieldClass = form.addField({
                                id: 'custpage_id_class',
                                label: labels.get(Language, "LblClass"),
                                type: serverWidget.FieldType.SELECT,
                                container: 'group_cla'
                            });
                            if (pref_clas == true) {
                                fieldClass.isMandatory = true;
                            }
                        }

                        //  Cargas la ubicacion
                        if (requestSubsidiaryID != '' && requestSubsidiaryID != null) {
                            if (featureNoDomi) {
                                fieldExchangeRate_journal.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                            }

                            var featureExchangeRateJEFromBill = getFeatBySubsidiary(requestSubsidiaryID, 1006);
                            if (!featureExchangeRateJEFromBill) {
                                fieldExchangeRate_journal.defaultValue = Number(requestExchangerateJournal) ? requestExchangerateJournal : requestExchangerate;
                            }

                            // Internal ID de la subsidiaria
                            if (isEnableClass == true) {
                                fieldClass.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });
                            }
                            if (isEnableLoc == true) {
                                fieldLocation.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });
                            }
                            if (isEnableDep == true) {
                                fieldDepartment.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });
                            }

                            //fieldClass.updateDisplayType({displayType:serverWidget.FieldDisplayType.DISABLED});
                            fieldSubsidiary.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            if (requestDate != null && requestDate != "") {
                                fieldDate.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });
                            }


                            fieldPeriod.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            fieldExchangeRate.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            fieldExchangeRate_journal.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            fieldDoc.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var subs = requestSubsidiaryID;

                            //Recargado de Select Payee
                            var field_payee = fieldPayee;
                            field_payee.addSelectOption({
                                value: 0,
                                text: ' '
                            });

                            var filtros_payee = new Array();
                            filtros_payee[0] = search.createFilter({
                                name: 'isinactive',
                                operator: 'is',
                                values: 'F'
                            });
                            filtros_payee[1] = search.createFilter({
                                name: 'formulanumeric',
                                formula: '{msesubsidiary.internalid}',
                                operator: search.Operator.EQUALTO,
                                values: subs
                            });

                            var m1 = search.create({
                                type: search.Type.VENDOR,
                                filters: filtros_payee,
                                columns: ['internalid', 'entityid', 'isperson', 'lastname', 'firstname', 'companyname', 'middlename']
                            });

                            var m2 = m1.run();
                            var m3 = m2.getRange({
                                start: 0,
                                end: 1000
                            });

                            var contador = 0;
                            var bandera = true;

                            if (m3 != null && m3.length > 0) {
                                while (bandera) {
                                    m3 = m2.getRange({
                                        start: contador,
                                        end: contador + 1000
                                    });
                                    for (var i = 0; i < m3.length; i++) {
                                        var valores1, textos1 = "";
                                        valores1 = m3[i].getValue({
                                            name: 'internalid'
                                        });
                                        if (m3[i].getValue({
                                            name: 'isperson'
                                        })) {
                                            textos1 = m3[i].getValue({
                                                name: 'firstname'
                                            }) + " ";
                                            if (m3[i].getValue({
                                                name: 'middlename'
                                            }) != null && m3[i].getValue({
                                                name: 'middlename'
                                            }) != '') {
                                                textos1 = textos1 + m3[i].getValue({
                                                    name: 'middlename'
                                                }).substring(0, 1) + " ";
                                            }
                                            textos1 += m3[i].getValue({
                                                name: 'lastname'
                                            });
                                        } else {
                                            textos1 = m3[i].getValue({
                                                name: 'companyname'
                                            }) != null && m3[i].getValue({
                                                name: 'companyname'
                                            }) != "" ? m3[i].getValue({
                                                name: 'companyname'
                                            }) : m3[i].getValue({
                                                name: 'entityid'
                                            });
                                        }
                                        field_payee.addSelectOption({
                                            value: valores1,
                                            text: textos1
                                        });
                                    }
                                    if (m3.length != 1000) {
                                        bandera = false;
                                        contador += m3.length;
                                    } else {
                                        contador += 1000;
                                    }
                                }

                                if (requestPayeeID != null && requestPayeeID != '') {
                                    field_payee.defaultValue = requestPayeeID;
                                    field_payee.updateDisplayType({
                                        displayType: serverWidget.FieldDisplayType.DISABLED
                                    });
                                }
                            }

                            //Recargado de campo A/P Account
                            var field_acc_payable = fieldAccoundPay;
                            var filter_Acc_Pay = { name: 'subsidiary', operator: 'anyof', values: subs }
                            getCustomSearch('customsearch_lmry_pe_account_payable', filter_Acc_Pay, field_acc_payable);

                            //Recargado de campo Bank ACCOUNT
                            var field_bank = fieldBank;
                            var filter_Bank = { name: 'subsidiary', operator: 'anyof', values: subs }
                            getCustomSearch('customsearch_lmry_pe_bank_account', filter_Bank, field_bank);

                            if (requestBankID != null && requestBankID != '') {
                                field_bank.defaultValue = requestBankID;
                                field_bank.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });
                            }

                            //Reseteo campo date
                            var field_date = fieldDate;
                            if (requestDate != null && requestDate != '') {
                                field_date.defaultValue = requestDate;
                                field_date.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });
                            }

                            //Reseteo campo accounting period
                            var field_accounting_period = fieldPeriod;
                            getCustomSearch('customsearch_lmry_pe_accounting_period', '', field_accounting_period);

                            if (requestPeriodID != null && requestPeriodID != '') {
                                field_accounting_period.defaultValue = requestPeriodID;
                                field_accounting_period.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });
                            }

                            //Reseteo campo currency
                            var vendor = requestPayeeID;
                            var field_currency = fieldCurrency;
                            field_currency.addSelectOption({
                                value: 0,
                                text: ' '
                            });

                            var array_currency = new Array();
                            var b = search.createFilter({
                                name: 'internalid',
                                operator: 'anyof',
                                values: [vendor]
                            });

                            var a = search.create({
                                type: search.Type.VENDOR,
                                filters: b,
                                columns: [{
                                    name: 'currency'
                                },
                                {
                                    name: 'currency',
                                    join: 'vendorcurrencybalance'
                                }
                                ]
                            });
                            var run_search = a.run().getRange({
                                start: 0,
                                end: 1000
                            });

                            //Agrega la moneda principal
                            if (run_search.length > 0) {
                                var col = run_search[0].columns;
                                array_currency.push(run_search[0].getText(col[0]));
                            }
                            //Agrega las monedas secundarias
                            for (var i = 0; i < run_search.length; i++) {
                                var col = run_search[i].columns;
                                if (array_currency[0] != run_search[i].getValue(col[1])) {
                                    array_currency.push(run_search[i].getValue(col[1]));
                                }
                            }

                            var array_currency_internal = new Array();

                            //Sort: porque al leer la busqueda lo iteraba por nombre no por id
                            var c = search.create({
                                type: search.Type.CURRENCY,
                                columns: [{
                                    name: 'internalid',
                                    sort: search.Sort.ASC
                                },
                                {
                                    name: 'name'
                                }
                                ]
                            });
                            var run_c = c.run().getRange({
                                start: 0,
                                end: 1000
                            });

                            if (run_c != null && run_c.length > 0) {
                                for (var i = 0; i < array_currency.length; i++) {
                                    for (var j = 0; j < run_c.length; j++) {
                                        if (run_c[j].getValue({
                                            name: 'name'
                                        }) == array_currency[i]) {
                                            array_currency_internal.push(run_c[j].getValue({
                                                name: 'internalid'
                                            }));
                                        }
                                    }
                                }
                            }

                            for (var k = 0; k < array_currency_internal.length; k++) {
                                field_currency.addSelectOption({
                                    value: array_currency_internal[k],
                                    text: array_currency[k]
                                });
                            }

                            if (requestCurrencyID != null && requestCurrencyID != '') {
                                field_currency.defaultValue = requestCurrencyID;
                                field_currency.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });
                            }

                            // Carga el departamento filtrado por subsidiaria
                            if (isEnableDep == true) {
                                var field_depart = fieldDepartment;
                                field_depart.addSelectOption({
                                    value: 0,
                                    text: ' '
                                });

                                var Search_depart = search.create({
                                    type: search.Type.DEPARTMENT,
                                    columns: ['internalid', 'name'],
                                    filters: [{
                                        name: 'subsidiary',
                                        operator: 'anyof',
                                        values: [subs]
                                    }]
                                });

                                var Result_dept = Search_depart.run().getRange({
                                    start: 0,
                                    end: 1000
                                });

                                if (Result_dept != null) {
                                    for (var i = 0; i < Result_dept.length; i++) {
                                        field_depart.addSelectOption({
                                            value: Result_dept[i].getValue({
                                                name: 'internalid'
                                            }),
                                            text: Result_dept[i].getValue({
                                                name: 'name'
                                            })
                                        });
                                    }

                                    // Seteo en el rellamado
                                    if (requestDepartmentID != '' && requestDepartmentID != null) {
                                        field_depart.defaultValue = requestDepartmentID;
                                        field_depart.updateDisplayType({
                                            displayType: serverWidget.FieldDisplayType.DISABLED
                                        });
                                    }
                                }
                            }

                            // Carga el Class filtrado por subsidiaria
                            if (isEnableClass == true) {
                                var field_clas = fieldClass;
                                field_clas.addSelectOption({
                                    value: 0,
                                    text: ' '
                                });

                                var Search_clas = search.create({
                                    type: search.Type.CLASSIFICATION,
                                    columns: ['internalid', 'name'],
                                    filters: [{
                                        name: 'subsidiary',
                                        operator: 'anyof',
                                        values: [subs]
                                    }]
                                });

                                var Result_class = Search_clas.run().getRange({
                                    start: 0,
                                    end: 1000
                                });

                                if (Result_class != null) {
                                    for (var i = 0; i < Result_class.length; i++) {
                                        field_clas.addSelectOption({
                                            value: Result_class[i].getValue({
                                                name: 'internalid'
                                            }),
                                            text: Result_class[i].getValue({
                                                name: 'name'
                                            })
                                        });
                                    }

                                    // Seteo en el rellamado
                                    if (requestClassID != '' && requestClassID != null) {
                                        field_clas.defaultValue = requestClassID;
                                        field_clas.updateDisplayType({
                                            displayType: serverWidget.FieldDisplayType.DISABLED
                                        });
                                    }
                                }
                            }

                            if (isEnableLoc == true) {
                                // Carga el location filtrado por subsidiaria
                                var field_loc = fieldLocation;
                                field_loc.addSelectOption({
                                    value: 0,
                                    text: ' '
                                });

                                var Search_loc = search.create({
                                    type: search.Type.LOCATION,
                                    columns: ['internalid', 'name'],
                                    filters: [{
                                        name: 'subsidiary',
                                        operator: 'anyof',
                                        values: [subs]
                                    }]
                                });

                                var Result_loc = Search_loc.run().getRange({
                                    start: 0,
                                    end: 1000
                                });

                                if (Result_loc != null) {
                                    for (var i = 0; i < Result_loc.length; i++) {
                                        field_loc.addSelectOption({
                                            value: Result_loc[i].getValue({
                                                name: 'internalid'
                                            }),
                                            text: Result_loc[i].getValue({
                                                name: 'name'
                                            })
                                        });
                                    }

                                    // Seteo en el rellamado
                                    if (requestLocationID != '' && requestLocationID != null) {
                                        field_loc.defaultValue = requestLocationID;
                                        field_loc.updateDisplayType({
                                            displayType: serverWidget.FieldDisplayType.DISABLED
                                        });
                                    }
                                }
                            }
                            // Carga el LATAM - PAYMENT METHOD filtrado por subsidiaria
                            var field_met = fieldPayMethod;
                            field_met.addSelectOption({
                                value: 0,
                                text: ' '
                            });

                            if (subs != '' && subs != null) {
                                // Pais de la subsidiaria
                                var rcd_country = search.lookupFields({
                                    type: search.Type.SUBSIDIARY,
                                    id: subs,
                                    columns: ['country']
                                });
                                var country = rcd_country.country[0].text;
                                var Search_met = search.create({
                                    type: 'customrecord_lmry_paymentmethod',
                                    columns: ['internalid', 'name', 'custrecord_lmry_country_pm'],
                                    filters: [{
                                        name: 'isinactive',
                                        operator: 'is',
                                        values: 'F'
                                    }]
                                });

                                var Result_met = Search_met.run().getRange({
                                    start: 0,
                                    end: 1000
                                });

                                if (Result_met != null) {
                                    for (var i = 0; i < Result_met.length; i++) {
                                        var res_cont = Result_met[i].getText({
                                            name: 'custrecord_lmry_country_pm'
                                        });
                                        if (country == res_cont) {
                                            field_met.addSelectOption({
                                                value: Result_met[i].getValue({
                                                    name: 'internalid'
                                                }),
                                                text: Result_met[i].getValue({
                                                    name: 'name'
                                                })
                                            });
                                        }
                                    }

                                    // Seteo en el rellamado
                                    if (requestMethodID != '' && requestMethodID != null) {
                                        field_met.defaultValue = requestMethodID;
                                        field_met.updateDisplayType({
                                            displayType: serverWidget.FieldDisplayType.DISABLED
                                        });
                                    }
                                }
                            }
                        }
                    } else {
                        //Mismarket Edition
                        if (isEnableDep == true) {
                            var fieldDepartment = form.addField({
                                id: 'custpage_id_depart',
                                label: labels.get(Language, "LblDpt"),
                                type: serverWidget.FieldType.SELECT,
                                source: 'department',
                                container: 'group_cla'
                            });
                            if (pref_dep == true) {
                                fieldDepartment.isMandatory = true;
                            }
                        }

                        var fieldPayMethod = form.addField({
                            id: 'custpage_id_method',
                            label: labels.get(Language, "LblPyMtd"),
                            type: serverWidget.FieldType.SELECT,
                            //source: 'customrecord_lmry_paymentmethod',
                            container: 'group_cla'
                        });
                        fieldPayMethod.isMandatory = true;

                        var Search_met = search.create({
                            type: 'customrecord_lmry_paymentmethod',
                            columns: ['internalid', 'name'],
                            filters: [
                                ['custrecord_lmry_country_pm', 'is', 174], 'AND',
                                ['isinactive', 'is', 'F']
                            ]
                        });
                        var Result_met = Search_met.run().getRange(0, 1000);
                        if (Result_met != null && Result_met != '') {
                            for (var i = 0; i < Result_met.length; i++) {
                                fieldPayMethod.addSelectOption({
                                    value: Result_met[i].getValue('internalid'),
                                    text: Result_met[i].getValue('name')
                                });
                            }
                        }

                        if (isEnableLoc == true) {
                            var fieldLocation = form.addField({
                                id: 'custpage_id_location',
                                label: labels.get(Language, "LblLct"),
                                type: serverWidget.FieldType.SELECT,
                                source: 'location',
                                container: 'group_cla'
                            });
                            if (pref_loc == true) {
                                fieldLocation.isMandatory = true;
                            }
                        }

                        if (isEnableClass == true) {
                            var fieldClass = form.addField({
                                id: 'custpage_id_class',
                                label: labels.get(Language, "LblClass"),
                                type: serverWidget.FieldType.SELECT,
                                source: 'classification',
                                container: 'group_cla'
                            });
                            if (pref_clas == true) {
                                fieldClass.isMandatory = true;
                            }
                        }

                        if (requestPayeeID != null && requestPayeeID != '') {
                            var field_payee = fieldPayee;
                            field_payee.defaultValue = requestPayeeID;
                            field_payee.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }


                        if (requestCurrencyID != null && requestCurrencyID != '') {
                            //Reseteo campo currency
                            var vendor = requestPayeeID;
                            var field_currency = fieldCurrency;
                            field_currency.addSelectOption({
                                value: 0,
                                text: ' '
                            });

                            var array_currency = new Array();
                            var b = search.createFilter({
                                name: 'internalid',
                                operator: 'anyof',
                                values: [vendor]
                            });

                            var a = search.create({
                                type: search.Type.VENDOR,
                                filters: b,
                                columns: [{
                                    name: 'currency'
                                },
                                {
                                    name: 'currency',
                                    join: 'vendorcurrencybalance'
                                }]
                            });
                            var run_search = a.run().getRange({
                                start: 0,
                                end: 1000
                            });

                            //Agrega la moneda principal
                            if (run_search.length > 0) {
                                var col = run_search[0].columns;
                                array_currency.push(run_search[0].getText(col[0]));
                            }
                            //Agrega las monedas secundarias
                            for (var i = 0; i < run_search.length; i++) {
                                var col = run_search[i].columns;
                                if (array_currency[0] != run_search[i].getValue(col[1])) {
                                    array_currency.push(run_search[i].getValue(col[1]));
                                }
                            }

                            var array_currency_internal = new Array();

                            //Sort: porque al leer la busqueda lo iteraba por nombre no por id
                            var c = search.create({
                                type: search.Type.CURRENCY,
                                columns: [{
                                    name: 'internalid',
                                    sort: search.Sort.ASC
                                },
                                {
                                    name: 'name'
                                }
                                ]
                            });
                            var run_c = c.run().getRange({
                                start: 0,
                                end: 1000
                            });

                            if (run_c != null && run_c.length > 0) {
                                for (var i = 0; i < array_currency.length; i++) {
                                    for (var j = 0; j < run_c.length; j++) {
                                        if (run_c[j].getValue({
                                            name: 'name'
                                        }) == array_currency[i]) {
                                            array_currency_internal.push(run_c[j].getValue({
                                                name: 'internalid'
                                            }));
                                        }
                                    }
                                }
                            }

                            for (var k = 0; k < array_currency_internal.length; k++) {
                                field_currency.addSelectOption({
                                    value: array_currency_internal[k],
                                    text: array_currency[k]
                                });
                            }
                            var field_currency = fieldCurrency;
                            field_currency.defaultValue = requestCurrencyID;
                            field_currency.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }

                        if (requestDate != null && requestDate != '') {
                            var field_date = fieldDate;
                            field_date.defaultValue = requestDate;
                            field_date.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }

                        //field_accounting_period.addSelectOption({value:0,text:' '});

                        if (requestPeriodID != null && requestPeriodID != '') {
                            //Reseteo campo accounting period
                            var field_accounting_period = fieldPeriod;
                            getCustomSearch('customsearch_lmry_pe_accounting_period', '', field_accounting_period);
                            // Set value redirect
                            var field_accounting_period = fieldPeriod;
                            field_accounting_period.defaultValue = requestPeriodID;
                            field_accounting_period.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }

                        if (requestExchangerate != '' && requestExchangerate != null) {
                            fieldExchangeRate.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }

                        // Seteo en el rellamado
                        if (requestDepartmentID != '' && requestDepartmentID != null) {
                            var field_department = fieldDepartment;
                            field_department.defaultValue = requestDepartmentID;
                            field_department.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }
                        // Seteo en el rellamado
                        if (requestClassID != '' && requestClassID != null) {
                            var field_class = fieldClass;
                            field_class.defaultValue = requestClassID;
                            field_class.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }
                        // Seteo en el rellamado
                        if (requestLocationID != '' && requestLocationID != null) {
                            var field_location = fieldLocation;
                            field_location.defaultValue = requestLocationID;
                            field_location.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }
                        // Seteo en el rellamado
                        if (requestMethodID != '' && requestMethodID != null) {
                            var field_paymethod = fieldPayMethod;
                            field_paymethod.defaultValue = requestMethodID;
                            field_paymethod.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }
                    }

                    // Seteo en el rellamado
                    if (requestAccountID != '' && requestAccountID != null) {
                        fieldAccoundPay.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                        fieldAccoundPay.defaultValue = requestAccountID;
                    }

                    // Seteo en el rellamado
                    if (requestBankID != '' && requestBankID != null) {
                        var field_bank = fieldBank;
                        field_bank.defaultValue = requestBankID;
                        field_bank.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                    }

                    // Currency - Caso Miss Market
                    var h_currency = form.addField({
                        id: 'custpage_mm_currency',
                        label: 'Currency - Miss Market',
                        type: serverWidget.FieldType.TEXT,
                        container: 'group_cla'
                    });
                    h_currency.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    var FolderId = runtime.getCurrentScript().getParameter({
                        name: 'custscript_lmry_currency'
                    });
                    // log.error('FolderId', FolderId);
                    h_currency.defaultValue = FolderId;

                    var tab_a = form.addTab({
                        id: 'custpage_tab1',
                        label: labels.get(Language, "TabTrans")
                    });

                    var featureMB = runtime.isFeatureInEffect({
                        feature: "MULTIBOOK"
                    });

                    if (requestPayeeID != '' && requestPayeeID != null && isOneWorld && featureMB) {
                        var currency_setup = libraryBill.getFeatSetupTaxSubsidiary(requestSubsidiaryID, 'custrecord_lmry_setuptax_currency');
                        var currency_sub = search.lookupFields({
                            type: search.Type.SUBSIDIARY,
                            id: requestSubsidiaryID,
                            columns: ['currency']
                        });
                        currency_sub = currency_sub.currency[0].value;

                        var multibooking_flag = false;
                        if (currency_setup != currency_sub && currency_setup != requestCurrencyID) {
                            multibooking_flag = true;
                        }

                        if (multibooking_flag) {
                            var tab_a = form.addTab({
                                id: 'custpage_tab2',
                                label: labels.get(Language, "LblMulti")
                            });

                            var SubTabla_Book = form.addSublist({
                                id: 'custpage_id_sublista_book',
                                type: serverWidget.SublistType.LIST,
                                label: labels.get(Language, "LblSublist"),
                                tab: 'custpage_tab2'
                            });

                            SubTabla_Book.addField({
                                id: 'custpage_id_book',
                                label: labels.get(Language, "LblBook"),
                                type: serverWidget.FieldType.TEXT
                            });
                            SubTabla_Book.addField({
                                id: 'custpage_id_currency',
                                label: labels.get(Language, "LblBaseCur"),
                                type: serverWidget.FieldType.TEXT
                            });
                            var ex_book = SubTabla_Book.addField({
                                id: 'custpage_id_rate_book',
                                label: labels.get(Language, "LblExRate"),
                                type: serverWidget.FieldType.FLOAT
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });

                            if (requestPayeeID != '' && requestPayeeID != null) {
                                ex_book.isMandatory = true;

                                var search_isocode = search.lookupFields({
                                    type: search.Type.CURRENCY,
                                    id: currency_sub,
                                    columns: ['symbol']
                                });
                                search_isocode = search_isocode.symbol;

                                var paymentDate = format.parse({ type: format.Type.DATE, value: requestDate });
                                var search_book = record.load({
                                    type: search.Type.SUBSIDIARY,
                                    id: requestSubsidiaryID
                                });

                                var c_lineas = search_book.getLineCount({
                                    sublistId: 'accountingbookdetail'
                                });
                                if (c_lineas > 0) {
                                    for (var i = 0; i < c_lineas; i++) {
                                        var name_book = search_book.getSublistText({
                                            sublistId: 'accountingbookdetail',
                                            fieldId: 'accountingbook',
                                            line: i
                                        });
                                        var currency_book = search_book.getSublistText({
                                            sublistId: 'accountingbookdetail',
                                            fieldId: 'currency',
                                            line: i
                                        });
                                        var status_book = search_book.getSublistText({
                                            sublistId: 'accountingbookdetail',
                                            fieldId: 'bookstatus',
                                            line: i
                                        });
                                        status_book = status_book.substring(0, 3);
                                        status_book = status_book.toUpperCase();

                                        if (status_book != 'ACT') {
                                            continue;
                                        }

                                        var search_isocode_book = search.lookupFields({
                                            type: search.Type.CURRENCY,
                                            id: search_book.getSublistValue({
                                                sublistId: 'accountingbookdetail',
                                                fieldId: 'currency',
                                                line: i
                                            }),
                                            columns: ['symbol']
                                        });
                                        search_isocode_book = search_isocode_book.symbol;

                                        var rate = currency.exchangeRate({
                                            source: search_isocode,
                                            target: search_isocode_book,
                                            date: new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate())
                                        });

                                        SubTabla_Book.setSublistValue({
                                            id: 'custpage_id_book',
                                            line: i,
                                            value: name_book
                                        });
                                        SubTabla_Book.setSublistValue({
                                            id: 'custpage_id_currency',
                                            line: i,
                                            value: currency_book
                                        });
                                        SubTabla_Book.setSublistValue({
                                            id: 'custpage_id_rate_book',
                                            line: i,
                                            value: rate
                                        });

                                    }
                                }

                            }
                        }
                    }

                    var SubTabla = form.addSublist({
                        id: 'custpage_id_sublista',
                        type: serverWidget.SublistType.LIST,
                        label: labels.get(Language, "LblSublist"),
                        tab: 'custpage_tab1'
                    });
                    //SubTabla.addMarkAllButtons();
                    SubTabla.addButton({ id: 'id_mark', label: labels.get(Language, "BtnMarkAll"), functionName: 'markAll' });
                    SubTabla.addButton({ id: 'id_desmark', label: labels.get(Language, "BtnDesmarkAll"), functionName: 'desmarkAll' });

                    SubTabla.addField({
                        id: 'id_appl',
                        label: labels.get(Language, "LblApply"),
                        type: serverWidget.FieldType.CHECKBOX
                    });

                    var internalID = SubTabla.addField({
                        id: 'id_int',
                        label: labels.get(Language, "LblInternalID"),
                        type: serverWidget.FieldType.TEXT
                    });

                    if (!featureNoDomi) {
                        internalID.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.ENTRY
                        });
                        internalID.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                    }

                    SubTabla.addField({
                        id: 'id_tran',
                        label: labels.get(Language, "LblTrans"),
                        type: serverWidget.FieldType.TEXT
                    });

                    SubTabla.addField({
                        id: 'id_date',
                        label: labels.get(Language, "LblDate"),
                        type: serverWidget.FieldType.DATE
                    });

                    SubTabla.addField({
                        id: 'id_vend',
                        label: labels.get(Language, "LblName"),
                        type: serverWidget.FieldType.TEXT
                    });

                    var document = SubTabla.addField({
                        id: 'id_doc',
                        label: labels.get(Language, "LblFiscal"),
                        type: serverWidget.FieldType.SELECT,
                        source: 'customrecord_lmry_tipo_doc'
                    });
                    document.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });
                    SubTabla.addField({
                        id: 'id_curn',
                        label: labels.get(Language, "LblCur"),
                        type: serverWidget.FieldType.TEXT
                    });
                    SubTabla.addField({
                        id: 'id_exch',
                        label: labels.get(Language, "LblExRate"),
                        type: serverWidget.FieldType.FLOAT
                    });


                    SubTabla.addField({
                        id: 'id_tota',
                        label: labels.get(Language, "LblTotalAm"),
                        type: serverWidget.FieldType.FLOAT
                    });

                    var desab = SubTabla.addField({
                        id: 'id_amou',
                        label: labels.get(Language, "LblDueAm"),
                        type: serverWidget.FieldType.CURRENCY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.ENTRY
                    });

                    desab.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });

                    var payment = SubTabla.addField({
                        id: 'id_pay',
                        label: labels.get(Language, "LblPay"),
                        type: serverWidget.FieldType.CURRENCY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.ENTRY
                    });

                    payment.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });

                    if ((requestSubsidiaryID != null && requestSubsidiaryID != '') && (requestCurrencyID != null && requestCurrencyID != '') && (requestPayeeID != null && requestPayeeID != '') && (requestAccountID != null && requestAccountID != '')) {

                        if (isOneWorld) {
                            var Filter_Subs = search.createFilter({
                                name: 'subsidiary',
                                operator: search.Operator.ANYOF,
                                values: requestSubsidiaryID
                            });
                        }
                        var Filter_Curr = search.createFilter({
                            name: 'currency',
                            operator: search.Operator.ANYOF,
                            values: requestCurrencyID
                        });

                        var Filter_Date = search.createFilter({
                            name: 'trandate',
                            operator: search.Operator.ONORBEFORE,
                            values: requestDate
                        });

                        var Filter_Paye = search.createFilter({
                            name: 'mainname',
                            operator: search.Operator.ANYOF,
                            values: requestPayeeID
                        });

                        var Filter_Acco = search.createFilter({
                            name: 'accountmain',
                            operator: search.Operator.ANYOF,
                            values: requestAccountID
                        });

                        // const legalFilters = search.createFilter({
                        //     name: 'custbody_lmry_document_type',
                        //     operator: search.Operator.ANYOF,
                        //     values: '354'
                        // });



                        // Busqueda personalizada : LatamReady - PE Vendor Bill
                        var search_transac = search.load({
                            id: 'customsearch_lmry_pe_vendor_bill'
                        });

                        if (isOneWorld) {
                            search_transac.filters.push(Filter_Subs);
                        }
                        search_transac.filters.push(Filter_Curr);
                        search_transac.filters.push(Filter_Paye);
                        search_transac.filters.push(Filter_Date);
                        search_transac.filters.push(Filter_Acco);
                        //search_transac.filters.push(legalFilters);
                        //search_transac.filters.push(Filter_Impuesto);
                        //search_transac.filters.push(Filter_TransField);
                        
                        search_transac.columns.push(search.createColumn({ name: 'fxamountremaining' }));
                        


                        var resul_transac = search_transac.run();
                        var lengt_transac = resul_transac.getRange(0, 1000);
                        if (featureNoDomi) {
                            getTransactionByCabecera(lengt_transac, SubTabla);
                        } else {
                            getTransactionByLine(lengt_transac, SubTabla);
                        }
                    }

                    // Script Cliente
                    form.clientScriptModulePath = './Latam_Library/LMRY_PE_BillPayment_CLNT.js';

                    // Seteo en el rellamado
                    if (requestPayeeID != '' && requestPayeeID != null) {
                        form.addSubmitButton({
                            label: labels.get(Language, "BtnSave")
                        });
                        form.addButton({
                            id: 'id_cancel',
                            label: labels.get(Language, "BtnBack"),
                            functionName: 'funcionCancel'
                        });
                    } else {
                        form.addSubmitButton({ label: labels.get(Language, "BtnFilter") });
                    }
                    form.addResetButton({ label: labels.get(Language, "BtnReset") });

                    // Dibuja el fomulario
                    context.response.writePage(form);
                } else {
                    var status = context.request.parameters.id_state;

                    if (status == '' || status == null) {
                        var isOneWorld = runtime.isFeatureInEffect({
                            feature: "SUBSIDIARIES"
                        });
                        var subsidiaryID = '1';
                        if (isOneWorld) {
                            subsidiaryID = context.request.parameters.custpage_id_subsi;
                        }
                        // realiza la consulta con los parametros seleccionados
                        redirect.toSuitelet({
                            scriptId: runtime.getCurrentScript().id,
                            deploymentId: runtime.getCurrentScript().deploymentId,
                            parameters: {
                                'custparam_subsi': subsidiaryID,
                                'custparam_curre': context.request.parameters.custpage_id_curren,
                                'custparam_payee': context.request.parameters.custpage_id_payee,
                                'custparam_accon': context.request.parameters.custpage_id_account_pay,
                                'custparam_date': context.request.parameters.custpage_id_date,
                                'custparam_bacco': context.request.parameters.custpage_id_bank,
                                'custparam_acper': context.request.parameters.custpage_id_period,
                                'custparam_exrat': context.request.parameters.custpage_id_rate,
                                'custparam_exrat_journal': context.request.parameters.custpage_id_rate_journal,
                                'custparam_depar': context.request.parameters.custpage_id_depart,
                                'custparam_class': context.request.parameters.custpage_id_class,
                                'custparam_locat': context.request.parameters.custpage_id_location,
                                'custparam_metho': context.request.parameters.custpage_id_method,
                                'custparam_doc': context.request.parameters.custpage_id_doc
                            }
                        });

                    } else {
                        var user = runtime.getCurrentUser().id;
                        var isOneWorld = runtime.isFeatureInEffect({
                            feature: "SUBSIDIARIES"
                        });

                        var parameters = {};
                        //En la derecha estan el id de estado y de user
                        parameters.custscript_lmry_pe_logid = context.request.parameters.id_state;
                        parameters.custscript_lmry_pe_userid = user;

                        try {
                            var scheduleTask = task.create({
                                taskType: task.TaskType.MAP_REDUCE,
                                scriptId: 'customscript_lmry_pe_billpayment_mprd',
                                deploymentId: 'customdeploy_lmry_pe_billpayment_mprd',
                                params: parameters
                            });
                            scheduleTask.submit();
                        } catch (err) {
                            library.sendemail(' [ Map Reduce ] ' + err, LMRY_script);
                        }

                        redirect.toSuitelet({
                            scriptId: 'customscript_lmry_pe_log_payments_sltl',
                            deploymentId: 'customdeploy_lmry_pe_log_payments_sltl'
                        });

                    }
                }
            } catch (msgerr) {

                var form = serverWidget.createForm({ title: labels.get(Language, "LblForm") });
                var myInlineHtml = form.addField({
                    id: 'custpage_id_message',
                    label: labels.get(Language, "LblTittleMsg"),
                    type: serverWidget.FieldType.INLINEHTML
                });
                myInlineHtml.layoutType = serverWidget.FieldLayoutType.OUTSIDEBELOW;
                myInlineHtml.updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });

                var strhtml = "<html>";
                strhtml += "<table border='0' class='table_fields' cellspacing='0' cellpadding='0'>";
                strhtml += "<tr>";
                strhtml += "</tr>";
                strhtml += "<tr>";
                strhtml += "<td class='text'>";
                strhtml += "<div style=\"color: gray; font-size: 12pt; margin-top: 10px; padding: 5px; border-top: 1pt solid silver\">";
                strhtml += labels.get(Language, "LblMsg3") + ".<br><br>";
                strhtml += "<br>Code :" + xml.escape(msgerr.name);
                strhtml += "<br>Details :" + xml.escape(msgerr.message);
                strhtml += "</div>";
                strhtml += "</td>";
                strhtml += "</tr>";
                strhtml += "</table>";
                strhtml += "</html>";

                // Mensaje HTML
                myInlineHtml.defaultValue = strhtml;

                // Dibuja el Formulario
                context.response.writePage(form);
                log.error({
                    title: 'Se generó un error en suitelet',
                    details: msgerr
                });

                // Envio de mail al clientes
                library.sendemail(' [ onRequest ] ' + msgerr, LMRY_script);
            }
        }


        function obtenerSubsidiarias(fieldSubsidiary) {
            var subsidiarys = [];
            var isOneWorld = runtime.isFeatureInEffect({
                feature: "SUBSIDIARIES"
            });
            if (isOneWorld) {
                var allLicenses = library.getAllLicenses();

                var Filter_Custo = new Array();
                Filter_Custo[0] = search.createFilter({
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: 'F'
                });
                Filter_Custo[1] = search.createFilter({
                    name: 'country',
                    operator: search.Operator.ANYOF,
                    values: 'PE'
                });

                var search_Subs = search.create({
                    type: search.Type.SUBSIDIARY,
                    filters: Filter_Custo,
                    columns: ['internalid', 'name']
                });
                var resul_sub = search_Subs.run();
                var lengt_sub = resul_sub.getRange({
                    start: 0,
                    end: 1000
                });

                if (lengt_sub != null && lengt_sub.length > 0) {
                    // Llena una linea vacia
                    if (fieldSubsidiary != 0) {
                        fieldSubsidiary.addSelectOption({
                            value: 0,
                            text: ' '
                        });
                    }

                    // Llenado de listbox
                    for (var i = 0; i < lengt_sub.length; i++) {
                        var subID = lengt_sub[i].getValue('internalid');
                        var subNM = lengt_sub[i].getValue('name');

                        if (allLicenses[subID] != null && allLicenses[subID] != undefined) {
                            if (allLicenses[subID].indexOf(136) > -1) {
                                subsidiarys.push(subID);
                                if (fieldSubsidiary != 0) {
                                    fieldSubsidiary.addSelectOption({
                                        value: subID,
                                        text: subNM
                                    });
                                }
                            }
                        }
                    }
                }
            } else {
                var licenses = library.getLicenses(1);
                if (licenses.indexOf(136) > -1) {
                    subsidiarys.push(1);
                }
            }
            return subsidiarys;
        }

        function getFeatBySubsidiary(subsidiaryId, featureId) {
            var licenses = library.getLicenses(subsidiaryId);
            var active = library.getAuthorization(featureId, licenses);
            return active
        }

        function getCustomSearch(idSearch, filter, field) {
            var searchLoad = search.load({ id: idSearch });
            if (filter) {
                searchLoad.filters.push(search.createFilter(filter));
            }
            var resultSearch = searchLoad.run().getRange(0, 1000);
            if (resultSearch != null && resultSearch.length > 0) {
                var columns = resultSearch[0].columns;
                field.addSelectOption({ value: 0, text: ' ' });
                for (var i = 0; i < resultSearch.length; i++) {
                    var id = resultSearch[i].getValue(columns[0]);
                    var name = resultSearch[i].getValue(columns[1]);
                    if (name != null && name != '') {
                        field.addSelectOption({ value: id, text: name });
                    }
                }
            }
        }

        function getTransactionByLine(lengt_transac, SubTabla) {
            var arrayLines = new Array();

            var search_lines = search.load({
                id: 'customsearch_lmry_pe_bill_lines'
            });

            var resul_lines = search_lines.run();
            var lengt_lines = resul_lines.getRange(0, 1000);

            if (lengt_lines != null && lengt_lines.length > 0) {
                for (var i = 0; i < lengt_lines.length; i++) {
                    var colFields = lengt_lines[i].columns;
                    var internalID = lengt_lines[i].getValue(colFields[0]);
                    arrayLines.push(internalID);
                }
            }

            if (lengt_transac != null && lengt_transac.length > 0) {
                var key = -1;
                for (var i = 0; i < lengt_transac.length; i++) {
                    var encontro = false;
                    var colFields = lengt_transac[i].columns;
                    var internalID = lengt_transac[i].getValue(colFields[0]);
                    if (arrayLines.length > 0) {
                        for (var j = 0; j < arrayLines.length; j++) {
                            if (internalID == arrayLines[j]) {
                                encontro = true;
                                key++;
                                break;
                            }
                        }
                    }
                    if (encontro) {
                        var intid = "" + lengt_transac[i].getText(colFields[0]);
                        var doc_fiscal = "" + lengt_transac[i].getValue(colFields[8]);
                        if (doc_fiscal != "") {
                            SubTabla.setSublistValue({ id: 'id_doc', line: key, value: doc_fiscal });
                        }
                        if (intid != "") {
                            SubTabla.setSublistValue({ id: 'id_int', line: key, value: intid });
                        }
                        var cdate = "" + lengt_transac[i].getValue(colFields[7]);
                        if (cdate != "") {
                            SubTabla.setSublistValue({ id: 'id_date', line: key, value: cdate });
                        }
                        var namev = "" + lengt_transac[i].getText(colFields[1]);
                        if (namev != "") {
                            SubTabla.setSublistValue({ id: 'id_vend', line: key, value: namev });
                        }
                        var namet = "" + lengt_transac[i].getValue(colFields[6]);
                        if (namet != "") {
                            SubTabla.setSublistValue({ id: 'id_tran', line: key, value: namet });
                        }
                        var curnt = "" + lengt_transac[i].getText(colFields[3]);
                        if (curnt != "") {
                            SubTabla.setSublistValue({ id: 'id_curn', line: key, value: curnt });
                        }
                        var exchang = "" + lengt_transac[i].getValue(colFields[5]);
                        if (exchang != "") {
                            SubTabla.setSublistValue({ id: 'id_exch', line: key, value: exchang });
                        }
                        var am_total = "" + (Math.round(parseFloat(lengt_transac[i].getValue(colFields[4])) * 100) / 100);
                        if (am_total != "") {
                            SubTabla.setSublistValue({ id: 'id_tota', line: key, value: am_total });
                        }
                        var amure = "" + (Math.round(parseFloat(lengt_transac[i].getValue('fxamountremaining')) * 100) / 100);
                        if (amure != "") {
                            SubTabla.setSublistValue({ id: 'id_amou', line: key, value: amure });
                        }
                    }
                }
            }
        }

        function getTransactionByCabecera(lengt_transac, SubTabla) {
            if (lengt_transac != null && lengt_transac.length > 0) {
                for (var i = 0; i < lengt_transac.length; i++) {
                    var colFields = lengt_transac[i].columns;
                    var intid = "" + lengt_transac[i].getText(colFields[0]);
                    var doc_fiscal = "" + lengt_transac[i].getValue(colFields[8]);
                    if (doc_fiscal != "") {
                        SubTabla.setSublistValue({ id: 'id_doc', line: i, value: doc_fiscal });
                    }
                    if (intid != "") {
                        SubTabla.setSublistValue({ id: 'id_int', line: i, value: intid });
                    }
                    var cdate = "" + lengt_transac[i].getValue(colFields[7]);
                    if (cdate != "") {
                        SubTabla.setSublistValue({ id: 'id_date', line: i, value: cdate });
                    }
                    var namev = "" + lengt_transac[i].getText(colFields[1]);

                    if (namev != "") {
                        SubTabla.setSublistValue({ id: 'id_vend', line: i, value: namev });
                    }

                    var namet = "" + lengt_transac[i].getValue(colFields[6]);

                    if (namet != "") {
                        var urlBill = url.resolveRecord({ recordId: intid, recordType: 'vendorbill' });
                        SubTabla.setSublistValue({ id: 'id_tran', line: i, value: '<a href="' + urlBill + '" target="_blank">' + namet + '</a>' });
                    }
                    var curnt = "" + lengt_transac[i].getText(colFields[3]);
                    if (curnt != "") {
                        SubTabla.setSublistValue({ id: 'id_curn', line: i, value: curnt });
                    }
                    var exchang = "" + lengt_transac[i].getValue(colFields[5]);
                    if (exchang != "") {
                        SubTabla.setSublistValue({ id: 'id_exch', line: i, value: exchang });
                    }
                    var am_total = "" + (Math.round(parseFloat(lengt_transac[i].getValue(colFields[4])) * 100) / 100);
                    if (am_total != "") {
                        SubTabla.setSublistValue({ id: 'id_tota', line: i, value: am_total });
                    }
                    var amure = '' + (Math.round(parseFloat(lengt_transac[i].getValue('fxamountremaining')) * 100) / 100);
                    if (amure != "") {
                        SubTabla.setSublistValue({ id: 'id_amou', line: i, value: amure });
                    }

                }
            }
        }


        return {
            onRequest: onRequest
        };

    });
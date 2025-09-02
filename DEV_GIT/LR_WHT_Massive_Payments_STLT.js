/*
/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LR_WHT_Massive_Payments_STLT.js                  ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.1     Jul 22 2019  LatamReady    Use Script 2.1           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NModuleScope Public
 */
define(["N/record", "N/currency", "N/log", "N/xml", "N/ui/serverWidget", "N/search", "N/runtime", "N/redirect", "N/suiteAppInfo", "N/format",
    "SuiteBundles/Bundle 37714/Latam_Library/LMRY_libSendingEmailsLBRY_V2.0", "SuiteBundles/Bundle 37714/Latam_Library/LMRY_Log_LBRY_V2.0", "./LR_WHT_Massive_Payments_Querys"],

    function (record, currency, nLog, xml, serverWidget, search, runtime, redirect, suiteAppInfo, format, library, lbryLog, QUERYS) {

        function onRequest(context) {
            const LMRY_script = "LatamReady - WHT MASSIVE PAYMENTS STLT";
            try {
                if (context.request.method === "GET") {
                    // Nombre del Script
                    let Language = runtime.getCurrentScript().getParameter({ name: "LANGUAGE" });
                    const category = runtime.getCurrentScript().getParameter({ name: "custscript_lmry_category" });
                    const bank_details = runtime.getCurrentScript().getParameter({ name: "custscript_lmry_bank_details" });
                    Language = Language.substring(0, 2);

                    switch (Language) {
                        case "es":
                            var LblDueDateFrom = "Fecha de Vencimiento Desde";
                            var LblDueDateTo = "Fecha de Vencimiento Hasta";
                            var LblForm = "LatamTAX - WHT Pagos Masivos Avanzados";
                            var LblMsg1 = "AVISO: Actualmente la licencia para este módulo está vencida, por favor contacte al equipo comercial de LatamReady";
                            var LblMsg2 = "También puedes contactar con nosotros a través de";
                            var LblMsg3 = "Importante: El acceso no está permitido";
                            var LblGroup1 = "Información Primaria";
                            var LblTittleMsg = "Mensaje";
                            var LblMulti = "Multibooking";
                            var LblName = "Nombre";
                            var LblBook = "Libro";
                            var LblSub = "Subsidiaria";
                            var LblBaseCur = "Moneda Base";
                            var LblCur = "Moneda";
                            var LblAPAccount = "Cuenta A/P";
                            var LblBnkAccount = "Cuenta Bancaria";
                            var LblActPrd = "Periodo Contable";
                            var LblGroup2 = "Classificación";
                            var LblDpt = "Departmento";
                            var LblPyMtd = "LATAM - Método de Pago";
                            var LblClass = "Clase";
                            var LblLct = "Ubicación";
                            var LblIDProcess = "ID Proceso";
                            var TabTrans = "Transacciones";
                            var LblTrans = "Transacción";
                            var LblApply = "Aplciar";
                            var LblInternalID = "ID Interno";
                            var LblSublist = "Sublista";
                            var LblTotalAm = "Monto Total";
                            var LblDueAm = "Monto Adeudado";
                            var LblPay = "Pago";
                            var LblFiscalDoc = "Documento Fiscal";
                            var LblElecPay = "Pago electrónico EFT";
                            var LblDate = "Fecha";
                            var BtnBack = "Atrás";
                            var BtnSave = "Guardar";
                            var BtnFiltrar = "Filtrar";
                            var BtnReset = "Reiniciar";
                            var LblExRate = "Tipo de Cambio";
                            var BtnMarkAll = "Marcar Todo";
                            var BtnDesmarkAll = "Desmarcar Todo";
                            var LblHelp = "Ayuda Detalles bancarios";
                            var LblPayDate = "Fecha de pago";
                            var LblCashFlow = "Flujo de Caja";
                            var LblGroup3 = "Otros Filtros";
                            var LblMemo = "Memo";
                            var LblResTy = "Latam - AR Tipo de Responsable";
                            break;

                        case "pt":
                            var LblDueDateFrom = "Data de Vencimento De";
                            var LblDueDateTo = "Data de Vencimento Para";
                            var LblForm = "LatamTAX - WHT Pagamentos Massivos";
                            var LblMsg1 = "AVISO: Atualmente a licença para este módulo expirou, entre em contato com a equipe comercial da LatamReady";
                            var LblMsg2 = "Você também pode nos contatar através de";
                            var LblMsg3 = "Importante: o acesso não é permitido";
                            var LblGroup1 = "Informação Primária";
                            var LblTittleMsg = "Mensagem";
                            var LblMulti = "Multibooking";
                            var LblName = "Nome";
                            var LblBook = "Livro";
                            var LblSub = "Subsidiária";
                            var LblBaseCur = "Moeda Base";
                            var LblCur = "Moeda";
                            var LblAPAccount = "Conta A/P";
                            var LblBnkAccount = "Conta bancária";
                            var LblActPrd = "Período contábil";
                            var LblGroup2 = "Classificação";
                            var LblDpt = "Departmento";
                            var LblPyMtd = "LATAM - Forma de Pagamento";
                            var LblClass = "Classe";
                            var LblLct = "Localização";
                            var LblIDProcess = "ID do Proceso";
                            var TabTrans = "Transações";
                            var LblTrans = "Transação";
                            var LblApply = "Aplicar";
                            var LblInternalID = "ID Interno";
                            var LblSublist = "Sublista";
                            var LblTotalAm = "Montante total";
                            var LblDueAm = "Quantia Devida";
                            var LblPay = "Pagamento";
                            var LblFiscalDoc = "Documento Fiscal";
                            var LblElecPay = "Pagamento Eletrônico EFT";
                            var LblDate = "Data";
                            var BtnBack = "Voltar";
                            var BtnSave = "Salve";
                            var BtnFiltrar = "Filtro";
                            var BtnReset = "Redefinir";
                            var LblExRate = "Taxa de câmbio";
                            var BtnMarkAll = "Marcar Tudo";
                            var BtnDesmarkAll = "Desmarcar Tudo";
                            var LblHelp = "Dados do Banco de Ajuda";
                            var LblPayDate = "Data de Pagamento";
                            var LblCashFlow = "Fluxo de caixa";
                            var LblGroup3 = "Outros Filtros";
                            var LblMemo = "Memo";
                            var LblResTy = "Latam - AR Responsible Type";
                            break;

                        default:
                            var LblDueDateFrom = "Due Date From";
                            var LblDueDateTo = "Due Date To";
                            var LblForm = "LatamTAX - WHT Massive Payments Advance";
                            var LblMsg1 = "NOTICE: Currently the license for this module is expired, please contact the commercial team of LatamReady";
                            var LblMsg2 = "You can also contact us through";
                            var LblMsg3 = "Important: Access is not allowed";
                            var LblGroup1 = "Primary Information";
                            var LblTittleMsg = "Message";
                            var LblMulti = "Multibooking";
                            var LblName = "Name";
                            var LblBook = "Book";
                            var LblSub = "Subsidiary";
                            var LblBaseCur = "Base currency";
                            var LblCur = "Currency";
                            var LblAPAccount = "A/P Account";
                            var LblBnkAccount = "Bank Account";
                            var LblActPrd = "Accounting Period";
                            var LblGroup2 = "Classification";
                            var LblDpt = "Department";
                            var LblPyMtd = "LATAM - Payment Method";
                            var LblClass = "Class";
                            var LblLct = "Location";
                            var LblIDProcess = "Process ID";
                            var TabTrans = "Transactions";
                            var LblTrans = "Transaction";
                            var LblApply = "Apply";
                            var LblInternalID = "Internal ID";
                            var LblSublist = "Sublist";
                            var LblTotalAm = "Total amount";
                            var LblDueAm = "Amount due";
                            var LblPay = "Payment";
                            var LblFiscalDoc = "Fiscal Document";
                            var LblElecPay = "Electronic Payment EFT";
                            var LblDate = "Date";
                            var BtnBack = "Back";
                            var BtnSave = "Save";
                            var BtnFiltrar = "Filtrar";
                            var BtnReset = "Reset";
                            var LblExRate = "Exchange Rate";
                            var BtnMarkAll = "Mark all";
                            var BtnDesmarkAll = "Desmark all";
                            var LblHelp = "Help Bank Details";
                            var LblPayDate = "Payment Date";
                            var LblCashFlow = "Cash Flow";
                            var LblGroup3 = "Other Filters";
                            var LblMemo = "Memo";
                            var LblResTy = "Latam - AR Responsible Type";
                    }
                    // 138 Argentina , 139 = Paraguay y 141 = Brasil

                    const allLicenses = library.getAllLicenses();

                    //Activacion de enable features
                    const enab_dep = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
                    const enab_loc = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
                    const enab_clas = runtime.isFeatureInEffect({ feature: "CLASSES" });

                    //activacion de Accounting Preferences
                    const userObj = runtime.getCurrentUser();
                    const pref_dep = userObj.getPreference({ name: "DEPTMANDATORY" });
                    const pref_loc = userObj.getPreference({ name: "LOCMANDATORY" });
                    const pref_clas = userObj.getPreference({ name: "CLASSMANDATORY" });

                    const subsi_OW = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });

                    const Rd_SubId = context.request.parameters.custparam_subsi;
                    const Rd_CurId = context.request.parameters.custparam_curre;
                    const Rd_AccId = context.request.parameters.custparam_accon;
                    const Rd_DateId = context.request.parameters.custparam_date;
                    const Rd_BacId = context.request.parameters.custparam_bacco;
                    const Rd_PerId = context.request.parameters.custparam_acper;
                    const Rd_RatId = context.request.parameters.custparam_exrat;
                    const Rd_DepId = context.request.parameters.custparam_depar;
                    const Rd_ClaId = context.request.parameters.custparam_class;
                    const Rd_LocId = context.request.parameters.custparam_locat;
                    const Rd_MetId = context.request.parameters.custparam_metho;
                    const Rd_CatId = context.request.parameters.custparam_categ;
                    const Rd_FroId = context.request.parameters.custparam_datef;
                    const Rd_TooId = context.request.parameters.custparam_datet;
                    const Rd_MemId = context.request.parameters.custparam_memo;
                    const Rd_ResId = context.request.parameters.custparam_resty;
                    const Rd_agip = context.request.parameters.custparam_agip;
                    // const nroResults = context.request.parameters.custparam_results;

                    const licenses = allLicenses[Rd_SubId] || [];
                    const setupSubsidiary = QUERYS.getSetupTaxSubsidiary(Number(Rd_SubId));
                    const form = serverWidget.createForm({ title: LblForm });
                    form.addFieldGroup({ id: "group_pi", label: LblGroup1 });
                    //--------------------------------------------------------
                    if (subsi_OW) {
                        const p_subsi = form.addField({ id: "custpage_id_subsi", label: LblSub, type: serverWidget.FieldType.SELECT, container: "group_pi" });
                        p_subsi.isMandatory = true;
                        if (Number(Rd_SubId)) {
                            const subsidiary = search.lookupFields({
                                type: "subsidiary",
                                id: Rd_SubId,
                                columns: ["internalid", "name"]
                            });
                            p_subsi.addSelectOption({ value: subsidiary.internalid[0].value, text: subsidiary.name });
                            p_subsi.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                        } else {
                            const subsidiaries = QUERYS.getSubsidiaries();
                            p_subsi.addSelectOption({ value: 0, text: " " });
                            subsidiaries.forEach(subsidiary => {
                                const subID = subsidiary.id;
                                const subNM = subsidiary.name;
                                if (allLicenses[subID] && allLicenses[subID].includes(138)) {
                                    p_subsi.addSelectOption({ value: subID, text: subNM });
                                }
                            });
                        }
                    }
                    //--------------------------------------------------------
                    const p_accountpay = form.addField({ id: "custpage_id_account_pay", label: LblAPAccount, type: serverWidget.FieldType.SELECT, container: "group_pi" });
                    if (!library.getAuthorization(675, licenses)) {
                        p_accountpay.isMandatory = true;
                    }
                    if (subsi_OW) {
                    }
                    if (Number(Rd_AccId)) {
                        const accountInfo = search.lookupFields({
                            type: "account",
                            id: Rd_AccId,
                            columns: ["internalid", "name"]
                        });
                        p_accountpay.addSelectOption({ value: accountInfo.internalid[0].value, text: accountInfo.name });
                    }
                    if (Rd_CurId) {
                        p_accountpay.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    }
                    //--------------------------------------------------------
                    const p_curren = form.addField({ id: "custpage_id_curren", label: LblCur, type: serverWidget.FieldType.SELECT, container: "group_pi" });
                    p_curren.isMandatory = true;
                    if (Rd_CurId) {
                        const currencyInfo = search.lookupFields({
                            type: "currency",
                            id: Rd_CurId,
                            columns: ["internalid", "name"]
                        });
                        p_curren.addSelectOption({ value: currencyInfo.internalid[0].value, text: currencyInfo.name });
                        p_curren.defaultValue = Rd_CurId;
                        p_curren.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    }
                    //--------------------------------------------------------
                    const p_bank = form.addField({ id: "custpage_id_bank", label: LblBnkAccount, type: serverWidget.FieldType.SELECT, container: "group_pi" });
                    p_bank.isMandatory = true;
                    if (!subsi_OW && !Number(Rd_BacId)) {
                        const search_bank = search.load({ id: "customsearch_lmry_wht_bank_account" });
                        search_bank.filters.push(search.createFilter({ name: "isinactive", operator: "is", values: "F" }));

                        const lengt_bank = search_bank.run().getRange({ start: 0, end: 1000 });

                        if (lengt_bank && lengt_bank.length > 0) {
                            const columns_bank = lengt_bank[0].columns;
                            p_bank.addSelectOption({ value: 0, text: " " });
                            lengt_bank.forEach(lengt_bankItem => {
                                const bankID = lengt_bankItem.getValue(columns_bank[0]);
                                const bankNM = lengt_bankItem.getValue(columns_bank[1]);
                                if (bankNM && bankNM !== "") {
                                    p_bank.addSelectOption({ value: bankID, text: bankNM });
                                }
                            });
                        }
                    }
                    if (Number(Rd_BacId)) {
                        const accountInfo = search.lookupFields({
                            type: "account",
                            id: Rd_BacId,
                            columns: ["internalid", "name"]
                        });
                        p_bank.addSelectOption({ value: accountInfo.internalid[0].value, text: accountInfo.name });
                        p_bank.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                    }
                    //--------------------------------------------------------
                    const p_datefrom = form.addField({ id: "custpage_id_datefrom", label: LblDueDateFrom, type: serverWidget.FieldType.DATE, source: "date", container: "group_pi" });
                    p_datefrom.isMandatory = true;
                    if (Rd_FroId) {
                        p_datefrom.defaultValue = Rd_FroId;
                        p_datefrom.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    }

                    //--------------------------------------------------------

                    const p_dateto = form.addField({ id: "custpage_id_dateto", label: LblDueDateTo, type: serverWidget.FieldType.DATE, source: "date", container: "group_pi" });
                    p_dateto.isMandatory = true;
                    if (Rd_FroId) {
                        p_dateto.defaultValue = Rd_TooId;
                        p_dateto.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    }

                    //--------------------------------------------------------

                    //FEATURE 465: AR - WHT CHANGE PAYMENT DATE
                    const p_date = form.addField({ id: "custpage_id_date", label: LblPayDate, type: serverWidget.FieldType.DATE, source: "date", container: "group_pi" });
                    p_date.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    p_date.isMandatory = true;
                    if (Rd_DateId) {
                        p_date.defaultValue = Rd_DateId;
                        p_date.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    }

                    //--------------------------------------------------------

                    const p_period = form.addField({ id: "custpage_id_period", label: LblActPrd, type: serverWidget.FieldType.SELECT, container: "group_pi" });
                    p_period.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    p_period.isMandatory = true;
                    if (Number(Rd_PerId)) {
                        const periodInfo = search.lookupFields({
                            type: "accountingperiod",
                            id: Rd_PerId,
                            columns: ["periodname", "internalid"]
                        });
                        p_period.addSelectOption({ value: periodInfo.internalid[0].value, text: periodInfo.periodname });

                    }
                    //--------------------------------------------------------

                    const p_exrate = form.addField({ id: "custpage_id_rate", label: LblExRate, type: serverWidget.FieldType.FLOAT, source: "exchangerate", container: "group_pi" });
                    p_exrate.isMandatory = true;
                    if (Rd_RatId) {
                        p_exrate.defaultValue = Rd_RatId;
                        p_exrate.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    }

                    //--------------------------------------------------------

                    const p_memo = form.addField({ id: "custpage_id_memo", label: "MEMO", type: serverWidget.FieldType.TEXT, container: "group_pi" });
                    //--------------------------------------------------------
                    if (library.getAuthorization(1030, licenses)) {
                        const p_agip = form.addField({ id: "custpage_id_agip", label: "AGIP", type: serverWidget.FieldType.CHECKBOX, container: "group_pi", });

                        if (setupSubsidiary[0]?.custrecord_lmry_setuptax_ar_use_agip_a === "T") {
                            p_agip.defaultValue = "T";
                        }
                        if (Rd_agip) {
                            p_agip.defaultValue = Rd_agip;
                            p_agip.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED,
                            });
                        }
                    }
                    //-----------------------------------------------
                    if (category === true) {
                        var p_category = form.addField({ id: "custpage_id_category", label: LblCashFlow, type: serverWidget.FieldType.SELECT, container: "group_pi", source: "vendorcategory" });
                        p_category.isMandatory = true;
                        if (Number(Rd_CatId)) { p_category.defaultValue = Rd_CatId; p_category.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED, }); }
                    }
                    //-----------------------------------------------
                    form.addField({
                        id: "custpage_data_log",
                        label: "Data Log",
                        type: serverWidget.FieldType.LONGTEXT
                    }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                    //------------------------------------------------
                    if (Number(Rd_CurId)) {
                        const p_stado = form.addField({ id: "id_state", label: LblIDProcess, type: serverWidget.FieldType.TEXT, container: "group_pi" });
                        p_stado.defaultValue = "PENDIENTE";
                        p_stado.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                    }

                    /***************************************
                   *  
                   * 244403	Electronic Bank Payments
                   * Cambio de un search a un boolean 04/08/2023
                   ***************************************/
                    let result_bundle = suiteAppInfo.isBundleInstalled({
                        bundleId: 338570
                    });

                    if (!result_bundle) {
                        result_bundle = suiteAppInfo.isBundleInstalled({
                            bundleId: 337228
                        });
                    }
                    if (setupSubsidiary[0]?.custrecord_lmry_setuptax_no_preview_pay === "T") {
                        var p_noPreview = form.addField({
                            id: "custpage_no_preview",
                            label: "No Preview",
                            type: "checkbox",
                            container: "group_pi"
                        });
                        p_noPreview.defaultValue = "T";
                    }
                    if (setupSubsidiary[0]?.custrecord_lmry_setuptax_elec_payment === "T" && result_bundle) {
                        var p_eft = form.addField({ id: "custpage_id_eft", label: LblElecPay, type: serverWidget.FieldType.CHECKBOX, container: "group_pi" });
                    }
                    //------------------------------------------------
                    form.addFieldGroup({ id: "group_oth", label: LblGroup3 });
                    //--------------------------------------------------------

                    const o_memo = form.addField({ id: "custpage_id_memobill", label: LblMemo, type: serverWidget.FieldType.TEXT, container: "group_oth" });
                    if (Rd_MemId) o_memo.defaultValue = Rd_MemId;
                    if (Rd_CurId) o_memo.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                    //--------------------------------------------------------

                    const o_resty = form.addField({ id: "custpage_lmry_ar_tiporespons", label: LblResTy, type: serverWidget.FieldType.MULTISELECT, container: "group_oth" });

                    QUERYS.getTypeResponsable().forEach((responsable) => {
                        o_resty.addSelectOption({ value: responsable.id, text: responsable.name });
                    });
                    if (Rd_ResId) {
                        o_resty.defaultValue = Rd_ResId;
                    }
                    if (Rd_CurId) o_resty.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                    //--------------------------------------------------------
                    // const resultsField = form.addField({ id: "custpage_lmry_nro_results", label: "Nro", type: "select", container: "group_oth" });
                    // [500, 1000, 2000, 3000, 4000].forEach((e) => {
                    //     resultsField.addSelectOption({ value: e, text: e.toString() });
                    // });
                    // if (Number(nroResults)) {
                    //     resultsField.defaultValue = nroResults;
                    // }
                    // if (nroResults) o_resty.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                    //--------------------------------------------------------

                    const help = form.addField({ id: "custpage_id_help", type: serverWidget.FieldType.TEXT, label: LblHelp }).updateDisplayType({ displayType: "hidden" });
                    //--------------------------------------------------------

                    const billsDataField = form.addField({ id: "custpage_bills_data", type: serverWidget.FieldType.INLINEHTML, label: "Data Bills" });
                    billsDataField.updateDisplayType({ displayType: "hidden" });
                    //-------------------------------------------------
                    if (Number(Rd_SubId)) {
                        form.addFieldGroup({ id: "group_cla", label: LblGroup2 });
                        if (enab_dep) {
                            const c_depart = form.addField({ id: "custpage_id_depart", label: LblDpt, type: serverWidget.FieldType.SELECT, container: "group_cla" });
                            if (pref_dep) c_depart.isMandatory = true;
                            c_depart.addSelectOption({ value: 0, text: " " });
                            QUERYS.getDepartmentsBySubsidiary(Rd_SubId).forEach((department) => {
                                c_depart.addSelectOption({ value: department.id, text: department.name });
                            });
                        }

                        const c_payMeth = form.addField({ id: "custpage_id_method", label: LblPyMtd, type: serverWidget.FieldType.SELECT, container: "group_cla" });
                        c_payMeth.isMandatory = true;
                        c_payMeth.addSelectOption({ value: 0, text: " " });
                        QUERYS.getPaymentMethods().forEach((paymentMethod) => {
                            c_payMeth.addSelectOption({ value: paymentMethod.id, text: paymentMethod.name });
                        });

                        if (enab_loc) {
                            const c_location = form.addField({ id: "custpage_id_location", label: LblLct, type: serverWidget.FieldType.SELECT, container: "group_cla" });
                            if (pref_loc) c_location.isMandatory = true;
                            c_location.addSelectOption({ value: 0, text: " " });
                            QUERYS.getLocationsBySubsidiary(Rd_SubId).forEach((location) => {
                                c_location.addSelectOption({ value: location.id, text: location.name });
                            });
                        }
                        if (enab_clas) {
                            const c_class = form.addField({ id: "custpage_id_class", label: LblClass, type: serverWidget.FieldType.SELECT, container: "group_cla" });
                            if (pref_clas) c_class.isMandatory = true;
                            c_class.addSelectOption({ value: 0, text: " " });
                            QUERYS.getClassesBySubsidiary(Rd_SubId).forEach((_class) => {
                                c_class.addSelectOption({ value: _class.id, text: _class.name });
                            });
                        }
                    }
                    //------------------------------------------------
                    form.addTab({ id: "custpage_tab1", label: TabTrans });
                    if (Number(Rd_CurId) && Number(setupSubsidiary[0]?.custrecord_lmry_setuptax_currency) && Number(setupSubsidiary[0]?.custrecord_lmry_setuptax_currency) !== Number(Rd_CurId)) {
                        form.addTab({ id: "custpage_tab2", label: LblMulti });

                        const SubTabla_Book = form.addSublist({ id: "custpage_id_sublista_book", type: serverWidget.SublistType.LIST, label: LblSublist, tab: "custpage_tab2" });

                        SubTabla_Book.addField({ id: "custpage_id_book", label: LblBook, type: serverWidget.FieldType.TEXT });
                        SubTabla_Book.addField({ id: "custpage_id_currency", label: LblBaseCur, type: serverWidget.FieldType.TEXT });
                        const ex_book = SubTabla_Book.addField({ id: "custpage_id_rate_book", label: LblExRate, type: serverWidget.FieldType.FLOAT }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });

                        ex_book.isMandatory = true;

                        let search_isocode = search.lookupFields({ type: search.Type.CURRENCY, id: Number(setupSubsidiary[0]?.custrecord_lmry_setuptax_currency), columns: ["symbol"] });
                        search_isocode = search_isocode.symbol;

                        const search_book = record.load({ type: search.Type.SUBSIDIARY, id: Rd_SubId });

                        const c_lineas = search_book.getLineCount({ sublistId: "accountingbookdetail" });
                        let numBooks = 0;
                        if (c_lineas > 0) {
                            for (let i = 0; i < c_lineas; i++) {
                                const name_book = search_book.getSublistText({ sublistId: "accountingbookdetail", fieldId: "accountingbook", line: i });
                                const currency_book = search_book.getSublistText({ sublistId: "accountingbookdetail", fieldId: "currency", line: i });
                                let status_book = search_book.getSublistText({ sublistId: "accountingbookdetail", fieldId: "bookstatus", line: i });
                                status_book = status_book.substring(0, 3);
                                status_book = status_book.toUpperCase();

                                if (status_book !== "ACT") {
                                    continue;
                                }

                                let search_isocode_book = search.lookupFields({ type: search.Type.CURRENCY, id: search_book.getSublistValue({ sublistId: "accountingbookdetail", fieldId: "currency", line: i }), columns: ["symbol"] });
                                search_isocode_book = search_isocode_book.symbol;

                                var rate = currency.exchangeRate({ source: search_isocode, target: search_isocode_book, date: new Date() });

                                SubTabla_Book.setSublistValue({ id: "custpage_id_book", line: numBooks, value: name_book });
                                SubTabla_Book.setSublistValue({ id: "custpage_id_currency", line: numBooks, value: currency_book });
                                SubTabla_Book.setSublistValue({ id: "custpage_id_rate_book", line: numBooks, value: rate });
                                numBooks++;

                            }
                        }

                    }
                    //-------------------------------------------------
                    const SubTabla = form.addSublist({ id: "custpage_id_sublista", type: serverWidget.SublistType.LIST, label: LblSublist, tab: "custpage_tab1" });

                    SubTabla.addField({ id: "id_appl", label: LblApply, type: serverWidget.FieldType.CHECKBOX });
                    SubTabla.addField({ id: "id_int", label: LblInternalID, type: serverWidget.FieldType.TEXT });
                    SubTabla.addField({ id: "id_tran", label: LblTrans, type: serverWidget.FieldType.TEXT });
                    SubTabla.addField({ id: "id_date", label: LblDate, type: serverWidget.FieldType.DATE });
                    SubTabla.addField({ id: "id_vend", label: LblName, type: serverWidget.FieldType.SELECT, source: "vendor" }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    if (!Number(Rd_AccId) && library.getAuthorization(675, licenses)) {
                        SubTabla.addField({
                            id: "id_account", label: "account", type: serverWidget.FieldType.SELECT, source: "account"
                        }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    }
                    const document = SubTabla.addField({ id: "id_doc", label: LblFiscalDoc, type: serverWidget.FieldType.SELECT, source: "customrecord_lmry_tipo_doc" });
                    document.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    SubTabla.addField({ id: "id_method", label: LblPyMtd, type: serverWidget.FieldType.TEXT });
                    SubTabla.addField({ id: "id_memo", label: "Memo", type: serverWidget.FieldType.TEXT });
                    SubTabla.addField({ id: "id_exch", label: LblExRate, type: serverWidget.FieldType.FLOAT });
                    SubTabla.addField({ id: "id_cred", label: "Bill Credit", type: serverWidget.FieldType.FLOAT });
                    SubTabla.addField({ id: "id_json", label: "JSON CREDIT", type: serverWidget.FieldType.TEXTAREA })
                        .updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                    SubTabla.addField({ id: "id_tota", label: LblTotalAm, type: serverWidget.FieldType.FLOAT });
                    const desab = SubTabla.addField({ id: "id_amou", label: LblDueAm, type: serverWidget.FieldType.CURRENCY });
                    desab.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    desab.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                    SubTabla.addField({ id: "id_pay", label: LblPay, type: serverWidget.FieldType.CURRENCY })
                        .updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    //-----------------------------------------------
                    if (Number(Rd_SubId) && Number(Rd_CurId)) {

                        let arrResponType = [];
                        arrResponType = Rd_ResId.split("\u0005");

                        SubTabla.addButton({ id: "id_mark", label: BtnMarkAll, functionName: "markAll" });
                        SubTabla.addButton({ id: "id_desmark", label: BtnDesmarkAll, functionName: "desmarkAll" });

                        const jsonCredit = {};

                        const billsSublistData = {};

                        const result_transac = QUERYS.getVendorBills({ subsidiary: Rd_SubId, currency: Rd_CurId, memo: Rd_MemId, account: Rd_AccId, dateFrom: Rd_FroId, dateTo: Rd_TooId, tipoResp: Rd_ResId });
                        const resultBillCredits = QUERYS.getVendorCredits();

                        resultBillCredits.forEach((resultBillCredit) => {
                            if (!jsonCredit.hasOwnProperty(resultBillCredit.billid)) {
                                jsonCredit[resultBillCredit.billid] = {};
                            }
                            jsonCredit[resultBillCredit.billid][resultBillCredit.id] = {
                                "amount": Math.abs(parseFloat(resultBillCredit.amount)),
                                "exento": resultBillCredit.exento || 0,
                                "iva": resultBillCredit.iva || 0,
                                "gravado": resultBillCredit.gravado || 0,
                                "nogravado": resultBillCredit.nogravado || 0,
                                "anticipo": resultBillCredit.anticipo
                            };
                        });
                        if (result_transac && result_transac.length > 0) {
                            result_transac.forEach((result_transacItem, i) => {
                                const intid = result_transacItem.id;
                                const doc_fiscal = result_transacItem.custbody_lmry_document_type;
                                if (Number(doc_fiscal)) {
                                    SubTabla.setSublistValue({ id: "id_doc", line: i, value: String(doc_fiscal) });
                                }
                                if (Number(intid)) {
                                    SubTabla.setSublistValue({ id: "id_int", line: i, value: String(intid) });
                                }

                                const cdate = result_transacItem.trandate;
                                if (cdate) {
                                    SubTabla.setSublistValue({ id: "id_date", line: i, value: cdate });
                                }
                                const namev = result_transacItem.entity;

                                if (namev) {
                                    SubTabla.setSublistValue({ id: "id_vend", line: i, value: String(namev) });
                                }

                                const namet = result_transacItem.tranid;

                                if (namet) {
                                    SubTabla.setSublistValue({ id: "id_tran", line: i, value: namet });
                                }

                                const exchang = result_transacItem.exchangerate;
                                if (exchang !== "") {
                                    SubTabla.setSublistValue({ id: "id_exch", line: i, value: String(exchang) });
                                }

                                const am_total = Math.abs(result_transacItem.foreignamount);
                                if (am_total) {
                                    SubTabla.setSublistValue({ id: "id_tota", line: i, value: Number(am_total) });
                                }

                                const amure = result_transacItem.foreignamountunpaid;

                                if (amure >= 0) {
                                    // amure = `${searchresult.getValue({ name: colFields[13] })}`;
                                    //amure = parseFloat(amure);
                                    SubTabla.setSublistValue({ id: "id_amou", line: i, value: Number(amure) });
                                }

                                SubTabla.setSublistValue({ id: "id_cred", line: i, value: 0 });

                                if (jsonCredit.hasOwnProperty(intid)) {

                                    let totalAmount = 0;
                                    for (var j in jsonCredit[intid]) {
                                        totalAmount += parseFloat(jsonCredit[intid][j]["amount"]);
                                    }

                                    SubTabla.setSublistValue({ id: "id_cred", line: i, value: totalAmount });
                                    SubTabla.setSublistValue({ id: "id_json", line: i, value: JSON.stringify(jsonCredit[intid]) });

                                }
                                const account = result_transacItem.expenseaccount;
                                if (account) {
                                    SubTabla.setSublistValue({ id: "id_account", line: i, value: String(account) });
                                }

                                if (!billsSublistData.hasOwnProperty(intid)) {
                                    billsSublistData[intid] = { id: intid };
                                }

                                const methodLine = result_transacItem.custbody_lmry_paymentmethod || "";
                                if (methodLine) {
                                    SubTabla.setSublistValue({ id: "id_method", line: i, value: String(methodLine) });
                                }

                                const memoLine = result_transacItem.memo || "";
                                memoLine.substring(0, 300);
                                if (memoLine) {
                                    SubTabla.setSublistValue({ id: "id_memo", line: i, value: memoLine });
                                }

                                if (bank_details && result_transacItem[bank_details]) {
                                    var checkBankDetails = result_transacItem[bank_details];
                                    if (billsSublistData.hasOwnProperty(intid)) {
                                        billsSublistData[intid].checkBankDetails = checkBankDetails;
                                    }
                                }
                            });

                            billsDataField.defaultValue = JSON.stringify(billsSublistData);
                        }

                    }
                    //--------------------------------------------
                    form.clientScriptModulePath = "./LR_WHT_Massive_Payments_CLNT.js";
                    // Object.keys(context.request.parameters).forEach((param) => {
                    //   if (param.indexOf("custpage_") !== 0) return;
                    //   const field = form.getField({ id: param });
                    //   if (!field) return;
                    //   field.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                    //   if (!context.request.parameters[param]) return;

                    //   field.defaultValue = context.request.parameters[param];
                    // });
                    if (Number(Rd_CurId)) {
                        form.addSubmitButton({ label: BtnSave });
                        form.addButton({ id: "id_cancel", label: BtnBack, functionName: "funcionCancel" });
                    } else {
                        form.addSubmitButton({ label: BtnFiltrar });
                    }
                    form.addResetButton({ label: BtnReset });

                    context.response.writePage(form);

                } else {
                    var _estado = context.request.parameters.id_state;
                    if (!_estado) {
                        var subsi_OW = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
                        var subsi = "1";
                        if (subsi_OW) {
                            subsi = context.request.parameters.custpage_id_subsi;
                        }
                        // realiza la consulta con los parametros seleccionados
                        redirect.toSuitelet({
                            scriptId: runtime.getCurrentScript().id,
                            deploymentId: runtime.getCurrentScript().deploymentId,
                            parameters: {
                                "custparam_subsi": subsi,
                                "custparam_curre": context.request.parameters.custpage_id_curren,
                                "custparam_accon": context.request.parameters.custpage_id_account_pay,
                                "custparam_date": context.request.parameters.custpage_id_date,
                                "custparam_bacco": context.request.parameters.custpage_id_bank,
                                "custparam_acper": context.request.parameters.custpage_id_period,
                                "custparam_exrat": context.request.parameters.custpage_id_rate,
                                "custparam_depar": context.request.parameters.custpage_id_depart,
                                "custparam_class": context.request.parameters.custpage_id_class,
                                "custparam_locat": context.request.parameters.custpage_id_location,
                                "custparam_metho": context.request.parameters.custpage_id_method,
                                "custparam_categ": context.request.parameters.custpage_id_category,
                                "custparam_datef": context.request.parameters.custpage_id_datefrom,
                                "custparam_datet": context.request.parameters.custpage_id_dateto,
                                "custparam_memo": context.request.parameters.custpage_id_memobill,
                                "custparam_resty": context.request.parameters.custpage_lmry_ar_tiporespons,
                                "custparam_agip": context.request.parameters.custpage_id_agip,
                                "custparam_results": context.request.parameters.custpage_lmry_nro_results
                            }
                        });

                    } else {
                        var massiveLogs = context.request.parameters.custpage_data_log || "";
                        if (massiveLogs) {
                            massiveLogs = JSON.parse(massiveLogs);
                            var _date = context.request.parameters.custpage_id_date;
                            _date = format.parse({
                                value: _date,
                                type: format.Type.DATE
                            });

                            //ejecutando el post del suitelet principal
                            var usuario = runtime.getCurrentUser().id;
                            var subsi_OW = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
                            var massiveIds = massiveLogs;

                            var noPreview = context.request.parameters.custpage_no_preview;

                            // realiza la consulta con los parametros seleccionados
                            if (massiveIds.length === 1) {
                                redirect.toSuitelet({
                                    scriptId: "customscript_lmry_wht_massive_deta_stlt",
                                    deploymentId: "customdeploy_lmry_wht_massive_deta_stlt",
                                    parameters: { 
                                        "param_logid": massiveIds[0], 
                                        "param_useid": usuario, 
                                        "param_nopreview": noPreview,
                                        "param_scriptId": "customscript_lr_ar_massive_payment",
                                        "param_deployId": "customdeploy_lr_ar_massive_payment"
                                    }
                                });
                            }
                            if (massiveIds.length > 1) {
                                redirect.toSuitelet({
                                    scriptId: "customscript_lmry_ar_wht_masivo_det_stl",
                                    deploymentId: "customdeploy_lmry_ar_wht_masivo_det_stl",
                                    parameters: { 
                                        "param_logid": massiveIds.join(","), 
                                        "param_useid": usuario, 
                                        "param_nopreview": noPreview,
                                        "param_scriptId": "customscript_lr_ar_massive_payment",
                                        "param_deployId": "customdeploy_lr_ar_massive_payment"
                                    }
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                nLog.error("error", error);
                // Envio de mail al clientes
                lbryLog.doLog({ title: "[ onRequest ]", message: error });
                library.sendemail('[onRequest] ' + error, LMRY_script);
            }

        }
        return {
            onRequest: onRequest
        };
    });
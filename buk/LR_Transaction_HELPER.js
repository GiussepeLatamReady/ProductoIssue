/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Name LR_Transaction_HELPER.js
 * @Author LatamReady
 * @Date 27/11/2024
 */
define(["N/runtime", "../error/LR_Error_LIB"], (runtime, Error_LBRY) => {
    const script = "LR_Transaction_HELPER.js";
    
    /**
     * Function to reload the transaction and set values by parameters
     * @param {Object} currentRecord - Current record of the transaction object
     * @param {String} fieldId - Current field id
     * @param {String} contextMode - Create, Edit or Copy
     */
    const reloadTransaction = (currentRecord, fieldId, contextMode) => {
        const { type } = currentRecord;
        const hasFeatureMultiSubs = runtime.isFeatureInEffect({
            feature: "multisubsidiarycustomer"
        });        
        if (["invoice", "creditmemo", "cashsale", "salesorder", "estimate"].includes(type)) {
            if (!hasFeatureMultiSubs && fieldId === "entity" && contextMode === "create") {
                const transSubsidiary = currentRecord.getValue({ fieldId: "subsidiary" });
                const transEntity = currentRecord.getValue({ fieldId: "entity" });
                const transForm = currentRecord.getValue({ fieldId: "customform" });
                setWindowChanged(window, false);

                const valueurl = new URL(document.location.href);
                valueurl.searchParams.delete("cf");
                valueurl.searchParams.delete("entity");
                valueurl.searchParams.delete("subsidiary");
                valueurl.searchParams.append("cf", transForm);
                valueurl.searchParams.append("entity", transEntity);
                valueurl.searchParams.append("subsidiary", transSubsidiary);
                window.location.href = valueurl;
            }
        }
        if (fieldId === "subsidiary" && contextMode === "create") {
            const transSubsidiary = currentRecord.getValue({ fieldId: "subsidiary" });
            const transEntity = currentRecord.getValue({ fieldId: "entity" });
            const transForm = currentRecord.getValue({ fieldId: "customform" });
            const account = currentUrl.searchParams.get('account');
            const amount = currentUrl.searchParams.get('amount');
            const paramDate = currentUrl.searchParams.get('date'); 
            const hasTransSubsidiary = _validateFieldValue(transSubsidiary);
            const hasTransEntity = _validateFieldValue(transEntity);
            const hasTransForm = _validateFieldValue(transForm);
            const hasBankTools = account && amount && paramDate ? true : false;
            if (hasBankTools) return false;
            if (hasTransSubsidiary && hasTransEntity && hasTransForm) {
                setWindowChanged(window, false);
                window.location.href = `${window.location.href.split("?")[0]}?where=&cf=${transForm}&entity=${transEntity}&subsidiary=${transSubsidiary}`;
            }
        }
        if (fieldId === "subsidiary" && contextMode === "create" && type == "journalentry") {
            const currentUrl = new URL(window.location.href);
            const bookje = currentUrl.searchParams.get('bookje');
            
            const recall = currentUrl.searchParams.get('recall');
            const account = currentUrl.searchParams.get('account');
            const amount = currentUrl.searchParams.get('amount');
            const paramDate = currentUrl.searchParams.get('date'); 
            const hasBankTools = account && amount && paramDate ? true : false;      
            const transSubsidiary = currentRecord.getValue({ fieldId: "subsidiary" });            
            const transForm = currentRecord.getValue({ fieldId: "customform" });

            const hasTransSubsidiary = _validateFieldValue(transSubsidiary);            
            const hasTransForm = _validateFieldValue(transForm);
            if (hasTransSubsidiary && hasTransForm && recall != "T" && !hasBankTools) {
                setWindowChanged(window, false);
                let link = `${window.location.href}&cf=${transForm}&subsidiary=${transSubsidiary}&recall=T`;

                if (bookje) {
                    const accountingBook = currentRecord.getValue({ fieldId: "accountingBook" });  
                    link+= `&accountingBook=${accountingBook}`;
                }
                window.onbeforeunload = null;
                window.location.href = link;
            }
        }
    };

    /**
     * Function to validate value of the variable.
     * @param {String|Number|Object} fieldValue
     * @returns {Boolean}
     */
    const _validateFieldValue = (fieldValue) => {
        if (!fieldValue || fieldValue === "" || fieldValue === null || JSON.stringify(fieldValue) === "{}" || JSON.stringify(fieldValue) === "[]") {
            return false;
        }

        return true;
    };

    const CLEAN_FIELDS = [
        "custbody_lmry_co_reteica_amount",
        "custbody_lmry_co_reteiva_amount",
        "custbody_lmry_co_retefte_amount",
        "custbody_lmry_co_retecree_amount",
        "custbody_lmry_reference_entity",
        "custbody_lmry_apply_transaction",
        "custbody_lmry_payment_type",
        "custbody_lmry_reference_transaction",
        "custbody_lmry_reference_transaction_id",
        "custbody_lmry_type_concept"
    ];

    const CLEAN_FIELDS_CHECKBOX = [
        "custbody_lmry_asiento_apertura",
        "custbody_lmry_apply_wht_code",
        "custbody_lmry_carga_inicial"
    ];

    const cleanFieldsValue = ({ newRecord, fieldList, value }) => {
        fieldList.forEach((fieldId) => {
            const fieldObj = newRecord.getField({ fieldId: fieldId });

            if (fieldObj) {
                newRecord.setValue({
                    fieldId: fieldId,
                    value,
                    ignoreFieldChange: true
                });
            }
        });
    };

    const cleanFields = (context) => {
        const { type, newRecord } = context;
        const createdFrom = newRecord.getValue({ fieldId: "createdfrom" }) || "";
        const memDoc = Number(newRecord.getValue({ fieldId: "memdoc" }));

        if ((type === "copy" && !memDoc) || (createdFrom && type === "create")) {
            cleanFieldsValue({ newRecord, fieldList: CLEAN_FIELDS, value: "" });
            cleanFieldsValue({ newRecord, fieldList: CLEAN_FIELDS_CHECKBOX, value: "F" });
        }
    };

    const setValues = (scriptContext) => {
        const {mode,currentRecord} = scriptContext;
        if (mode != "create") return false;
        const currentUrl = new URL(window.location.href);
        const bookje = currentUrl.searchParams.get('bookje');
        if (bookje) {
            const accountingBook = currentUrl.searchParams.get('accountingBook');    
            if (accountingBook) currentRecord.setValue({ fieldId: 'accountingBook', value: accountingBook });
        }else{
            const subsidiaryID = currentUrl.searchParams.get('subsidiary');
            if (subsidiaryID) currentRecord.setValue({ fieldId: 'subsidiary', value: subsidiaryID });
        }
    }

    return {        
        reloadTransaction,
        cleanFields,
        setValues
    };
});

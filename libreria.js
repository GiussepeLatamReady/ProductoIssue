/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Name LMRY_AR_TaxResults_LBRY.js
 * @Author piero.flores@latamready.com
 * @Date 30/01/2025
 */
define(["N/log", "N/record", "N/query", "N/https","N/search"], function (nLog, record, query, https,search) {
    /**
     *
     * @param {Number|String} transactionId - Internal ID of the transaction
     * @param {Array<Object>} jsonResults - Array of calculation result objects
     */
    const createTaxResults = (transactionId, jsonResults) => {
        nLog.debug('jsonResults',jsonResults);
        try{

            const data = jsonResults;
             data.forEach(item => {

             });

        jsonResults.forEach((jr) => {
            const taxResultRecord = record.create({
                type: "customrecord_lmry_br_transaction"
            });

            //Latam Related ID
            taxResultRecord.setValue("custrecord_lmry_br_transaction", transactionId);
            //Latam Related Transaction
            taxResultRecord.setValue("custrecord_lmry_br_related_id", transactionId);
            //Latam SubType
            taxResultRecord.setValue("custrecord_lmry_br_type", jr.subType);
            //Latam Base Amount
            taxResultRecord.setValue("custrecord_lmry_base_amount", jr.baseAmount);
            //Latam Total
            taxResultRecord.setValue("custrecord_lmry_br_total", jr.Total);
            //Latam Total Base Currency
            taxResultRecord.setValue("custrecord_lmry_total_base_currency", jr.lc_baseAmount);
            //Latam Percentage
            taxResultRecord.setValue("custrecord_lmry_br_percent", jr.perceptionPercentage);
            //Latam Total / Linen
            //revisar
            taxResultRecord.setValue("custrecord_lmry_total_item", 'Line');
            //Latam Tax Type
            //revisar
            taxResultRecord.setValue("custrecord_lmry_tax_type", 2);
            //Latam Item
            taxResultRecord.setValue("custrecord_lmry_item", jr.Item);
            //Latam SubType List
            taxResultRecord.setValue("custrecord_lmry_br_type_id", jr.subtype);
            //Latam Line UniqueKey
            taxResultRecord.setValue("custrecord_lmry_lineuniquekey", jr.Uniqe);
            //Latam Base Amount Local Currency
            taxResultRecord.setValue("custrecord_lmry_base_amount_local_currc", jr.lc_baseAmount);
            //Latam Amount local Currency 
            taxResultRecord.setValue("custrecord_lmry_amount_local_currency", jr.lc_baseAmount);

            taxResultRecord.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });
        });
        nLog.debug('Tax Res Created');

    }catch(err){
        nLog.debug('damn',err);
    }
    };
    const deleteTaxResultsByProcessType = (transactionId, processType) => {
        const taxResultSearch = search.create({
            type: "customrecord_lmry_br_transaction",
            filters: [
                ['isinactive', 'is', 'F'],
                'AND', ['custrecord_lmry_br_transaction','anyof',transactionId]
            ],
            columns: [
                search.createColumn({ name: 'id' })
            ]
        });

        taxResultSearch.run().each(result => {
            const recordId = result.getValue({ name: 'id' });
        
            // Eliminar el registro usando el ID obtenido
            try {
                record.delete({
                    type: "customrecord_lmry_br_transaction",
                    id: recordId
                });
                log.audit("Registro eliminado", `ID: ${recordId}`);
            } catch (error) {
                log.error("Error al eliminar", `ID: ${recordId}, Error: ${error.message}`);
            }
        
            return true; // Continuar iterando por los resultados
        });
    };

    const saveTaxResultsByService = (transactionId, jsonResultId, processType) => {
        nLog.debug('Entro a lib', jsonResultId);
        if (jsonResultId) {
            const result = search.lookupFields({
                type: "customrecord_lmry_ste_json_result",
                id: jsonResultId,
                columns: ["custrecord_lmry_ste_perception_tax_trans"]
            });

            nLog.debug('resultado en lib extra',result.custrecord_lmry_ste_perception_tax_trans);
            if (result.custrecord_lmry_ste_perception_tax_trans) {
                const jsonResults = JSON.parse(result.custrecord_lmry_ste_perception_tax_trans);
                nLog.debug("[_post: jsonResults]",jsonResults);

                createTaxResults(transactionId, jsonResults);
            }
        }
    };

    return {
        deleteTaxResultsByProcessType,
        createTaxResults,
        saveTaxResultsByService
    };
});

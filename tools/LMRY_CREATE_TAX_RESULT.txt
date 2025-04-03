/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * @Name SMC_GADP_MPRD_V2.1.js
 * @Author LatamReady - Giussepe Delgado
 * @Date 02/01/2024
 */
define([
    "N/record",
    "N/runtime",
    "N/file",
    "N/search",
    "N/nLog"
],

    (record, runtime, file, search, nLog) => {

        // let scriptParameters = {};



        const getInputData = () => {

            try {

                const jsonResultId = runtime.getCurrentScript().getParameter({ name: "custscript_lmry_ste_jsonresult_id" });
                const transactionId = runtime.getCurrentScript().getParameter({ name: "custscript_lmry_ste_transaction_id" });
                let jsonResults = []
                const result = search.lookupFields({
                    type: "customrecord_lmry_ste_json_result",
                    id: jsonResultId,
                    columns: ["custrecord_lmry_ste_jr_pertaxtransaction"]
                });

                if (result.custrecord_lmry_ste_jr_pertaxtransaction) {
                    jsonResults = JSON.parse(result.custrecord_lmry_ste_jr_pertaxtransaction);
                    nLog.debug("[_post: jsonResults]", jsonResults);
                }

                // agrego el id de la transaccion como un paramtro mas acada elemento
                jsonResults = jsonResults.map(obj => ({
                    ...obj,
                    transactionId: transactionId
                }));

                return jsonResults;
            } catch (error) {

                nLog.error("getinputdata error", error)
                return [["isError", error.message]];
            }

        }

        const map = (context) => {
            const infoTaxResult = JSON.parse(context.value);
            try {
                if (context.value.indexOf("isError") != -1) {
                    context.write({
                        key: context.key,
                        value: context.value
                    });
                } else {
                    createTaxResult(infoTaxResult)

                    /*
                    context.write({
                        key: context.key,
                        value: infoTaxResult
                    });
                    */
                }
            } catch (error) {
                nLog.error("error map transaction", infoTaxResult);
                nLog.error("error map", error);
                /*
                context.write({
                    key: context.key,
                    value: ["isError " + infoTaxResult.internalid + " - " + infoTaxResult.transaction, error.message]
                });
                */
            }
        }

        const createTaxResult = (infoTaxResult) => {
            nLog.debug('jsonResults', infoTaxResult);
            try {

                /* no que logica se iba hacer acá :D
                const data = jsonResults;
                data.forEach(item => {

                });
                */

                const taxResultRecord = record.create({
                    type: "customrecord_lmry_br_transaction"
                });

                //Latam Related ID
                taxResultRecord.setValue("custrecord_lmry_br_transaction", infoTaxResult.transactionId);
                //Latam Related Transaction
                taxResultRecord.setValue("custrecord_lmry_br_related_id", infoTaxResult.transactionId);
                //Latam SubType
                taxResultRecord.setValue("custrecord_lmry_br_type", infoTaxResult.subType);
                //Latam Base Amount
                taxResultRecord.setValue("custrecord_lmry_base_amount", infoTaxResult.baseAmount);
                //Latam Total
                taxResultRecord.setValue("custrecord_lmry_br_total", infoTaxResult.Total);
                //Latam Total Base Currency
                taxResultRecord.setValue("custrecord_lmry_total_base_currency", infoTaxResult.lc_baseAmount);
                //Latam Percentage
                taxResultRecord.setValue("custrecord_lmry_br_percent", infoTaxResult.perceptionPercentage);
                //Latam Total / Linen
                //revisar
                taxResultRecord.setValue("custrecord_lmry_total_item", 'Line');
                //Latam Tax Type
                //revisar
                taxResultRecord.setValue("custrecord_lmry_tax_type", 2);
                //Latam Item
                taxResultRecord.setValue("custrecord_lmry_item", infoTaxResult.Item);
                //Latam SubType List
                taxResultRecord.setValue("custrecord_lmry_br_type_id", infoTaxResult.subtype);
                //Latam Line UniqueKey
                taxResultRecord.setValue("custrecord_lmry_lineuniquekey", infoTaxResult.Uniqe);
                //Latam Base Amount Local Currency
                taxResultRecord.setValue("custrecord_lmry_base_amount_local_currc", infoTaxResult.lc_baseAmount);
                //Latam Amount local Currency 
                taxResultRecord.setValue("custrecord_lmry_amount_local_currency", infoTaxResult.lc_baseAmount);

                taxResultRecord.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true });
                nLog.debug('Tax Res Created');

            } catch (err) {
                nLog.debug('damn', err);
            }
        };
        const summarize = (context) => {
            try {
                //setConfiguration();
                let arrTransactions = new Array();

                context.output.iterator().each(function (key, value) {
                    arrTransactions.push(value);
                    return true;
                });
                const title = "Id Interno,Tranid,Items Inactivos" + '\n'
                let fileContent = arrTransactions.map(transaction => transaction + '\n').join('');
                //nLog.error("fileContent",fileContent)
                fileContent = `${title}${fileContent}\r\n`
                //saveFile(fileContent, "items_inactivos.csv", "3101091")
                //nLog.error("arrTransactions", arrTransactions)

            } catch (error) {
                nLog.error("error Summarize", error);

            }

        }


        return { getInputData, map, summarize };
    });
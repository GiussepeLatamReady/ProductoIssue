/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 * @Name LMRY_AR_TaxResults_RSLT.js
 * @Author diego@latamready.com
 * @Date 30/03/2024
 */
define(["N/log", "N/search","N/task", "./LMRY_AR_TaxResults_LBRY", "../../Latam Tools/Router/LMRY_AR_Library_ROUT", "../../Constants/LMRY_AR_GlobalConstants_LBRY"], function (
    nLog,
    search,
    task,
    TaxResult_Lib,
    Router_LBRY,
    Constants
) {
    const { Error_LBRY } = Router_LBRY;

    const _post = (context) => {
        try {
            const { operation, transactionId, jsonResultId, processType } = context;
            nLog.debug("[_post: context]", JSON.stringify(context));
            if (operation === "saveTaxResults") {
                TaxResult_Lib.deleteTaxResultsByProcessType(transactionId, processType);

                if (jsonResultId) {
                    task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_id_maprd",
                        deploymentId: "customdeploy_id_maprd",
                        params: {
                            custscript_lmry_ste_jsonresult_id: jsonResultId,
                            custscript_lmry_ste_transaction_id: transactionId
                        }
                    }).submit();
                }

                return JSON.stringify({
                    ok: true,
                    message: "COMPLETED"
                });
            }
        } catch (err) {
            Error_LBRY.handleError({ title: "[_post]", err, suiteAppId: Constants.APP_ID });
            return {
                ok: false,
                message: err
            };
        }
    };

    return {
        post: _post
    };
});

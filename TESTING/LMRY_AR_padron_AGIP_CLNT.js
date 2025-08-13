/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Name LMRY_AR_padron_AGIP_CLNT.js
 * @Author LatamReady
 * @Date 09/08/2025
 */
define([
    "N/runtime", "N/format", "N/search","N/ui/message"
], (runtime, format, search,message) => {

    const pageInit = (scriptContext) => { };

    const fieldChanged = (scriptContext) => { };

    const saveRecord = (scriptContext) =>  {
        try {
            if (isRunning()) return false;
            return true;
        } catch (err) {
            Lib_Error.handleError({ title: "[saveRecord]", err });
        }
    };

    const isRunning = () => {
        let language = runtime.getCurrentScript().getParameter({ name: "LANGUAGE" }).substring(0, 2);
        language = language === "es" || language === "pt"? language : "en";

        let translations = {
            "LR_ALERT": {
                "es": "ALERTA",
                "en": "ALERT",
                "pt": "ALERTA"
            },
            "LR_MESSAGUE": {
                "es": "Espere un momento por favor, el proceso se encuentra en curso.",
                "en": "Please wait a moment, the process is in progress.",
                "pt": "Por favor, aguarde um momento, o processo está em andamento."
            }
        }

        let mprd_scp = 'customscript_lmry_ar_agip_mprd';
        let mprd_dep = 'customdeploy_lmry_ar_agip_mprd';
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
                search.createColumn({
                    name: 'timestampcreated',
                    sort: search.Sort.DESC
                }),
                'mapreducestage',
                'status',
                'taskid'
            ]
        });

        let results = search_executions.run().getRange(0, 1);

        if (results && results.length) {
            let myMsg = message.create({
                title: translations["LR_ALERT"][language],
                message: translations["LR_MESSAGUE"][language],
                type: message.Type.INFORMATION,
                duration: 8000
            });
            myMsg.show();
            return true;
        }

        return false;
    }


    return {
        pageInit,
        fieldChanged,
        saveRecord
    };
});

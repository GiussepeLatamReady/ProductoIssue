/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

define(['N/file', 'N/search', 'N/log', 'N/record'], (file, search, log, record) => {


    const execute = () => {
        try {

            const data = getData();

            const files = data.filenames;
            /*
            const files = [
                "LMRY_EI_libSendingEmailsLBRY_update.js",
                "LMRY_PE_AnulacionInvoice_LBRY_V2.0.js",
                "LMRY_EI_MAIN_URET_V2.0.js",
                "LMRY_EI_Impresion_FileCabinet_STLT.js",
                "LMRY_EI_AdditionalTools_V2.1.js",
                "LMRY_MassiveTemplateVersionManagement_URET_v2.0.js",
                "LMRY_PDF_LBRY_V2.0.js",
                "LMRY_EI_Impresion_FileCabinet_STLT.js",
                "LMRY_TemplateVersionManagement_URET_v2.0.js",
                "LMRY_EI_ITEM_SPLIT_PI.js",
                "LMRY_EI_MAIN_URET_V2.0.js",
                "LMRY_Invoicing_Populate_MPRD.js",
                "LMRY_EI_AR_CO_PE_CL_functions_LBRY_v2.0.js",
                "LMRY_Purchasing_Populate_MPRD.js",
                "LMRY_Fulfillment_Receipt_Populate_MPRD.js",
                "LMRY_CL_EI_OWN_SEND_STLT_V2.0.js",
                "LMRY_CL_EI_OWN_GENE_STLT_V2.0.js",
                "LMRY_EI_GENERATE_COUNTRIES.js",
                "LMRY_EI_SEND_COUNTRIES.js",
                "LMRY_CO_EI_OWN_SEND_STLT_V2.1.js",
                "LMRY_CO_EI_OWN_GENE_STLT_V2.1.js",
                "LMRY_CO_PDF_LBRY_V2.0.js",
                "LMRY_EI_AR_CO_PE_CL_functions_LBRY_v2.0.js",
                "LMRY_PA_EI_OWN_SEND_STLT_2.0.js",
                "LMRY_PA_EI_OWN_GENE_STLT_2.0.js",
                "LMRY_EI_GENERATE_COUNTRIES.js",
                "LMRY_EI_SEND_COUNTRIES.js",
                "LMRY_DO_EI_OWN_SEND_STLT_V2.0.js",
                "LMRY_DO_EI_OWN_GENE_STLT_V2.0.js",
                "LMRY_PY_EI_OWN_SEND_STLT_V2.0.js",
                "LMRY_PY_EI_OWN_GENE_STLT_V2.0.js",
                "LMRY_PE_EI_OWN_SEND_STLT_V2.0.js",
                "LMRY_PE_EI_OWN_GENE_STLT_V2.0.js",
                "LMRY_AR_EI_OWN_SEND_STLT_V2.0.js",
                "LMRY_AR_EI_OWN_GENE_STLT_V2.0.js",
                "library_send_ar.js",
                "library_gene_ar.js",
                "LMRY_EC_EI_OWN_SEND_STLT_V2.0.js",
                "LMRY_EC_EI_OWN_GENE_STLT_V2.0.js",
                "library_send_ec.js",
                "library_gene_ec.js",
                "LMRY_MX_EI_OWN_SEND_STLT_V2.0.js",
                "LMRY_MX_EI_OWN_GENE_STLT_V2.0.js",
                "LMRY_EI_Conection_handler_LBRY_v2.0.js",
                "LMRY_EI_MX_functions_LBRY_v2.0.js",
                "LMRY_MX_Reverse_Cancellation_CLNT_LBRY_V2.1.js",
                "LMRY_MX_Reverse_Cancellation_CLNT_V2.1.js",
                "LMRY_EI_MAIN_URET_V2.0.js",
                "LMRY_UY_EI_OWN_SEND_STLT_V2.0.js",
                "LMRY_UY_EI_OWN_GENE_STLT_V2.0.js",
                "LMRY_EI_SEND_COUNTRIES.js",
                "LMRY_EI_GENERATE_COUNTRIES.js",
                "LMRY_BR_EI_OWN_GENE_STLT_V2.0.js",
                "library_send_gt.js",
                "library_gene_gt.js",
                "LMRY_GT_EI_OWN_SEND_STLT_2.0.js",
                "LMRY_EI_GENERATE_COUNTRIES.js",
                "LMRY_EI_SEND_COUNTRIES.js"
            ]

            */

            const BUNDLE_MAP = data.bundles;

            //log.error("files", files)
            //log.error("BUNDLE_MAP", BUNDLE_MAP)
            
            files.forEach(filename => {
                processFiles(filename,BUNDLE_MAP);
            })
            

            record.submitFields({
                type: "customrecord_smc_update_bundles",
                id: "1",
                values: {
                    custrecord_smc_status: "complete",
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true,
                    disableTriggers: true
                }
            });
        } catch (e) {
            log.error('Error in Scheduled Script', e);
        }
    };

    /*
    const BUNDLE_MAP = {
        172283: 171494,
        91304: 91253,
        254306: 249493,
        94367: 93009,
        91306: 91257,
        99467: 99451,
        233839: 254106,
        85269: 87463,
        265774: 265643,
        109373: 109364,
        91215: 91208,
        164268: 160431,
        90411: 90408,
        238689: 238681,
        447284: 447284,
        245878: 245872,
        245925: 245881,
        247582: 247359,
        218187: 218153,
        218184: 218157,
        233291: 233281,
        117246: 111360,
        393323: 387945,
        249702: 277722,
        195267: 195265,
        322538: 294079,
        126067: 125032,
        179139: 179119,
        245636: 243159,
        158163: 158135,
        37714: 35754,
        126263: 125338,
        429401: 420280,
        425714: 400033,
        420621: 409509,
        188371: 188233,
        85270: 87462,
        443292: 439070,
        424856: 419767,
        338570: 337228,
        468331: 453751,
        456213: 454827
    };
    */
    const FOLDER_ID = 'YOUR_FOLDER_ID'; // Reemplaza con el ID de carpeta que contiene los .js

    const getData = () => {
        const data = {
            filenames: [],
            bundles: {},
            status: "Nole"
        };
        const fileSearch = search.create({
            type: 'customrecord_smc_update_bundles',
            columns: [
                'custrecord_smc_filenames',
                'custrecord_smc_bundles',
                'custrecord_smc_status'
            ]
        });

        fileSearch.run().each((result) => {
            try {
                let filenames = result.getValue('custrecord_smc_filenames')
                if (filenames) data.filenames = JSON.parse(filenames);
            } catch (error) {
                log.error("error [getData filenames]", error)
            }

            try {
                let bundles = result.getValue('custrecord_smc_bundles')
                if (bundles) data.bundles = JSON.parse(bundles);
            } catch (error) {
                log.error("error [getData bundles]", error)
            }
            data.status = result.getValue('custrecord_smc_status') || ""
        });

        return data
    }
    const replaceBundleIds = (content, BUNDLE_MAP) => {
        return content.replace(/Bundle (\d+)/g, (match, id) => {
            const original = Number(id);
            return BUNDLE_MAP[original] ? `Bundle ${BUNDLE_MAP[original]}` : match;
        });
    };

    const processFiles = (filename, BUNDLE_MAP) => {
        const fileSearch = search.create({
            type: 'file',
            filters: [['name', 'is', filename.trim()]],
            columns: ['internalid', 'name']
        });

        fileSearch.run().each((result) => {
            const fileId = result.getValue('internalid');
            let jsFile = file.load({ id: fileId });
            const originalContent = jsFile.getContents();
            const updatedContent = replaceBundleIds(originalContent, BUNDLE_MAP);
            log.error("jsFile.name", jsFile.name)
            log.error("validate", originalContent !== updatedContent)
            if (originalContent !== updatedContent) {
                log.error("update", "update")
                file.create({
                    name: jsFile.name,
                    fileType: jsFile.fileType,
                    contents: updatedContent,
                    folder: jsFile.folder
                }).save();
                //log.audit('File updated', jsFile.name);
            }
            return true;
        });
    };

    const processFiles_b = (filename) => {
        const fileSearch = search.create({
            type: 'file',
            filters: [['name', 'is', filename]],
            columns: ['internalid', 'name']
        });

        fileSearch.run().each((result) => {
            const fileId = result.getValue('internalid');
            const filename = result.getValue('name');

            console.log("fileId :", fileId)
            console.log("filename :", filename)
            return true;
        });
        console.log("End")
    };

    //processFiles_b("LMRY_EI_libSendingEmailsLBRY_V2.0.js")



    return { execute };

});

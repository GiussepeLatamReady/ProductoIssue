/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =*\
||  This script for Report - Chile                                      ||
||                                                                      ||
||  File Name: TEST_GADP_SCHDL_V2.0.js                       ||
||                                                                      ||
||  Version Date           Author            Remarks                    ||
||  2.0     April 01 2023  Giussepe Delgado  Use Script 2.0             ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
define(["N/record", "N/log"],
    function (record, log) {

        function execute(Context) {
            // ID de la transacción que deseas duplicar
            let transactionId = '346639'; // Reemplaza con el ID de la transacción deseada

            for (let i = 0; i < 1; i++) {
                try {
                    let transactionFields = {
                        type: record.Type.VENDOR_CREDIT, // Reemplaza con el tipo de transacción adecuado
                        memo: 'Testing Qa',
                        approvalstatus: '2',
                        custbody_lmry_serie_doc_cxp: 'TESTNC',
                        custbody_lmry_num_preimpreso: '102536',
                        custbody_lmry_document_type: '318'
                    };
                    
                    // Crea la nueva transacción
                    let newTransaction = record.create({
                        type: transactionFields.type,
                        isDynamic: true // Usar isDynamic para crear una transacción en modo dinámico
                    });
                    
                    // Establece los valores de los campos para la nueva transacción
                    for (let fieldId in transactionFields) {
                        newTransaction.setValue({
                            fieldId: fieldId,
                            value: transactionFields[fieldId]
                        });
                    }
                    
                    // Guarda la nueva transacción
                    let newTransactionId = newTransaction.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });

                    //let transactions = getTransactions("TESTNC", "102536","318");
                    //log.error("transactions",transactions);

                    
                    

                    log.error('Transacción duplicada', 'Nueva transacción ID: ' + newTransactionId);
                } catch (error) {
                    log.error('Error al duplicar la transacción', error);
                }
            }

        }

        function getTransactions(serie,preimpreso,idDocument){
            let transactions = {};
            let vendorcreditSearchObj = search.create({
                type: "vendorcredit",
                filters:
                    [
                        ["subsidiary", "anyof", "27"],
                        "AND",
                        ["type", "anyof", "VendCred"],
                        "AND",
                        ["custbody_lmry_serie_doc_cxp", "is", serie],
                        "AND",
                        ["custbody_lmry_num_preimpreso", "is", preimpreso],
                        "AND",
                        ["custbody_lmry_document_type.internalid", "anyof", idDocument],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.DESC,
                            label: "Internal ID"
                        }),
                        search.createColumn({ name: "type", label: "Type" }),
                        search.createColumn({ name: "custbody_lmry_serie_doc_cxp", label: "Latam - CxP Series" }),
                        search.createColumn({ name: "custbody_lmry_num_preimpreso", label: "Latam - Preprinted Number" }),
                        search.createColumn({ name: "custbody_lmry_document_type", label: "Latam - Legal Document Type" }),
                    ]
            });
            vendorcreditSearchObj.run().each(function(result){
            
                let columns = result.columns;
                transactions[id] = {
                    id:result.getValue(columns[0]),
                    type:result.getValue(columns[1]),
                    serie:result.getValue(columns[2]),
                    preimpreso:result.getValue(columns[3]),
                    document:result.getValue(columns[4]),
                }
                
                return true;
            });

            return transactions;
        }

        

        return {
            execute: execute
        };
    });



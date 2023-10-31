/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =*\
||  This script for Report - Chile                                      ||
||                                                                      ||
||  File Name: TEST_GADP_SCHDL_V2.0.js                       ||
||                                                                      ||
||  Version Date           Author            Remarks                    ||
||  2.0     April 01 2023  Giussepe Delgado  Use Script 2.0             ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
define([ "N/record","N/log"],
    function ( record, log) {

        function execute(Context) {
            // ID de la transacción que deseas duplicar
            var transactionId = '346639'; // Reemplaza con el ID de la transacción deseada

            for (var i = 0; i < 10; i++) {
                try {
                    // Duplicar la transacción
                    var duplicatedTransaction = record.copy({
                        type: record.Type.VENDOR_BILL, // Reemplaza con el tipo de transacción adecuado
                        id: transactionId,
                    });

                    // Puedes realizar modificaciones en la transacción duplicada si es necesario
                    duplicatedTransaction.setValue({
                       fieldId: 'memo',
                       value: 'detracciongadp',
                     });

                    duplicatedTransaction.setValue({
                        fieldId: 'approvalstatus',
                        value: '2',
                    });

                    // Guardar la transacción duplicada
                    var newTransactionId = duplicatedTransaction.save();

                    log.error('Transacción duplicada', 'Nueva transacción ID: ' + newTransactionId);
                } catch (error) {
                    log.error('Error al duplicar la transacción', error);
                }
            }

        }



        return {
            execute: execute
        };
    });



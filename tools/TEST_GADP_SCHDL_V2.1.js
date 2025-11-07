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
define([
    'N/file',
    "N/search",
    "N/record",
    "N/log",
    "N/query",
    "N/runtime"
],
    function (file, search, record, log, query, runtime, libryVoidItemReceipt) {

        function execute(Context) {
            // ID de la transacción que deseas duplicar
            try {
                //deleteAllRecord();
                createExpenseReport();
            } catch (error) {
                log.error("error", error)
            }

        }

        const createExpenseReport = () => {
            const obj_bill = record.copy({ type: 'expensereport', id: "4355823", isDynamic: false });
            const totalItems = obj_bill.getLineCount({ sublistId: 'expense' });
            log.error("totalItems", totalItems);
            var count = totalItems;
            var arrEntity = ["4457","4940"];
            var serie = 0;
            for (let c = count; c < 10; c++) {
                const indice = Math.round(Math.random() * 2);
                serie++;
                var seriecompl = CompletarCero(5,serie);
                obj_bill.insertLine({ sublistId: 'expense', line: c });
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'amount', line: c, value: Math.random() * 10000 });
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'category', line: c, value: "5" });
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'class', line: c, value: "2" });
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'department', line: c, value: "1" });
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'location', line: c, value: "6" });
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'currency', line: c, value: "5" });
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'taxcode', line: c, value: "4583" });
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'custcol_lmry_exp_rep_num_doc', line: c, value: seriecompl });
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'custcol_lmry_exp_rep_serie_doc', line: c, value: "G0"+seriecompl});
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'custcol_lmry_exp_rep_type_doc', line: c, value: "312" });
                obj_bill.setSublistValue({ sublistId: 'expense', fieldId: 'custcol_lmry_exp_rep_vendor_colum', line: c, value: arrEntity[indice]});
            }

            const expenseId = obj_bill.save();
            log.error("expenseId", `https://tstdrv1774174.app.netsuite.com/app/accounting/transactions/exprept.nl?id=${expenseId}`)
        }

        function CompletarCero(tamano, valor) {
            var strValor = valor + '';
            var lengthStrValor = strValor.length;
            var nuevoValor = valor + '';

            if (lengthStrValor <= tamano) {
                if (tamano != lengthStrValor) {
                    for (var i = lengthStrValor; i < tamano; i++) {
                        nuevoValor = '0' + nuevoValor;
                    }
                }
                return nuevoValor;
            } else {
                return nuevoValor.substring(0, tamano);
            }
        }

        function CompletarCero2(tamano, valor) {
            var strValor = valor + '';
            var lengthStrValor = strValor.length;
            var nuevoValor = valor + '';

            if (lengthStrValor <= tamano) {
                if (tamano != lengthStrValor) {
                    for (var i = lengthStrValor; i < tamano; i++) {
                        nuevoValor = '0' + nuevoValor;
                    }
                }
                return nuevoValor;
            } else {
                return nuevoValor.substring(0, tamano);
            }
        }
        

        return {
            execute: execute
        };
    });



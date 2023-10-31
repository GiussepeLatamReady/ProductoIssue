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
define(["N/search","N/record", "N/log"],
    function (search, record, log) {

        function execute(Context) {
            // ID de la transacción que deseas duplicar
            let transactionId = '346639'; // Reemplaza con el ID de la transacción deseada

            for (let i = 0; i < 1; i++) {
                try {
                    let transactionFields = {
                        type: record.Type.VENDOR_CREDIT, // Reemplaza con el tipo de transacción adecuado
                        entity:"6781",
                        subsidiary: "27",
                        custbody_lmry_subsidiary_country:"174",
                        memo: 'Testing Qa',
                        approvalstatus: '2',
                        custbody_lmry_document_type: "318",
                        custbody_lmry_serie_doc_cxp: 'TESTNC',
                        custbody_lmry_num_preimpreso: '102536'
                    };
                    deleteTransactions(
                        transactionFields.custbody_lmry_serie_doc_cxp,
                        transactionFields.custbody_lmry_num_preimpreso,
                        transactionFields.custbody_lmry_document_type)
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
                    
                    setItem(newTransaction);
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

        function setItem(newTransaction){


            var itemLine = {
                amount: 1425.65,
                amounthasbeenset: "F",
                billvariancestatusallbook: "F",
                binitem: "F",
                class: "10",
                class_display: "Accessories",
                custcol_lmry_br_invoice_item_type: "09",
                custcol_lmry_br_items_type: "10",
                custcol_lmry_br_origin_code: "2",
                custcol_lmry_br_purp_code: "778",
                custcol_lmry_br_service_catalog: "2",
                custcol_lmry_br_service_catalog_display: "1.05 Licenciamiento o cesión de derechos de uso de programas de computación, incluida la distribución.",
                custcol_lmry_item_customercode: "3122",
                custcol_lmry_item_type: "Inventory Item",
                custcol_lmry_num_imei: "021331558",
                custcol_lmry_unit_of_measure: "Unid",
                custcol_lmry_unit_of_measure_code: '[{"Country" : "BO", "CountryID" : "29", "Code" : "7"}, {"Country" : "DO", "CountryID" : "61", "Code" : "1"}, {"Country" : "AR", "CountryID" : "11", "Code" : "7"}, {"Country" : "BR", "CountryID" : "30", "Code" : "UNID"}, {"Country" : "CL", "CountryID" : "45", "Code" : "10"}, {"Country" : "PA", "CountryID" : "173", "Code" : "und"}, {"Country" : "PY", "CountryID" : "186", "Code" : "77", "Representation": "UNI"}]',
                custcol_statistical_value_base_curr: "0.00",
                department: "2",
                department_display: "Sales",
                description: "A great phone with 24 programmable feature buttons",
                grossamt: "1682.27",
                id: "176782_1",
                initquantity: "1",
                item: "505",
                item_display: "NET ACC00005",
                itemtype: "InvtPart",
                line: "1",
                lineuniquekey: "1211223",
                location: "27",
                location_display: "Loc PE Soles",
                olditemid: "505",
                origlocation: "27",
                origrate: "1425.65",
                quantity: "1",
                rate: "1425.65",
                refamt: "1425.65",
                sys_id: "5410455441643572",
                sys_parentid: "5410455458375173",
                tax1amt: "256.62",
                taxcode: "1101",
                taxcode_display: "IGV_PE:S-PE",
                unitconversionrate: "1",
                units: "1",
                units_display: "Ea",
                unitslist: "1",
                vendorname: "Vendor Name",
                weightinlb: "2"
            };
            newTransaction.selectNewLine({
                sublistId: 'item'
            });
            for (var fieldId in itemLine) {
                newTransaction.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: fieldId,
                    value: itemLine[fieldId]
                });
            }
            newTransaction.commitLine({
                sublistId: 'item'
            });
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
                transactions[result.getValue(columns[0])] = {
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

        function deleteTransactions(serie, preimpreso, idDocument) {
            // Obtiene las transacciones que coinciden con los criterios de búsqueda
            try {
                let transactions = getTransactions(serie, preimpreso, idDocument);
        
                // Itera a través de las transacciones y las elimina
                for (let transactionId in transactions) {
                    try {
                        record.delete({
                            type: record.Type.VENDOR_CREDIT,
                            id: transactionId
                        });
                        log.debug('Transacción Eliminada', 'ID de la transacción eliminada: ' + transactionId);
                    } catch (error) {
                        log.error('Error al eliminar la transacción', error.toString());
                    }
                }
            } catch (error) {
                log.error('Error al eliminar la transaccion', error);
            }
           
        }

        return {
            execute: execute
        };
    });



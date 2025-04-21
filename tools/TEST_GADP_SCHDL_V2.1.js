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
    function (file,search, record, log, query, runtime,libryVoidItemReceipt) {

        function execute(Context) {
            // ID de la transacción que deseas duplicar
            try {
                deleteRecord();
            } catch (error) {
                log.error("error", error)
            }

        }

        const loadcsv = () => {
            const csvFile = file.load({
                id: '3918704'
            });

            const csvContent = csvFile.getContents();
            log.error("csvContent",csvContent)
            parseCsvToArray(csvContent)
        }

        const parseCsvToArray = (csvText) => {
            // Separa el contenido en líneas (considerando diferentes saltos de línea)
            let lines = csvText.split(/\r\n|\n/);
            let result = [];
            
            if (lines.length === 0) {
                return result;
            }
            
            // La primera línea contiene los encabezados
            let headers = lines[0].split(',');
            
            // Recorre las líneas restantes
            for (let i = 1; i < lines.length; i++) {
                let line = lines[i].trim();
                // Si la línea está vacía, la omite
                if (line === '') {
                    continue;
                }
                
                // Separa los valores de la línea
                let values = line.split(',');
                let obj = {};
                
                // Crea un objeto asignando cada valor a su respectivo encabezado
                for (let j = 0; j < headers.length; j++) {
                    // Si lo deseas, aquí puedes transformar el nombre de la propiedad
                    // Ejemplo: headers[j].trim().toLowerCase() para usar minúsculas
                    obj[ headers[j].trim() ] = values[j] ? values[j].trim() : '';
                }
                
                result.push(obj);
            }
            log.error("result",result)
            return result;
        }

        const deleteRecord = (csvText) => {
            const entitiesSegment = [];
            const entitySegmentSearch = search.create({
                type: "customrecord_cseg_lr_co_name",
                filters: [
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    "internalid"
                ],
            });
            let pageData = entitySegmentSearch.runPaged({ pageSize: 1000 });
            if (pageData) {
                pageData.pageRanges.forEach(function (pageRange) {
                    let page = pageData.fetch({ index: pageRange.index });
                    page.data.forEach(function (result) {
                        const get = (i) => result.getValue(result.columns[i]);
                        const internalid = get(0);
                        entitiesSegment.push(internalid);
                    });
                });
            }

            entitiesSegment.forEach(element => {
                record.delete({
                    type: 'customrecord_cseg_lr_co_name',
                    id: element
                })
            });
            
        }

        return {
            execute: execute
        };
    });



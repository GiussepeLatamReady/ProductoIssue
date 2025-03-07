/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/file', 'N/record', 'N/log', 'N/search', 'N/format'], 
       (file, record, log, search, format) => {

    // Definir ruta o ID del archivo que contiene los transaction IDs (traid)
    const FILE_ID = '5196855'; // Reemplazar con el internal ID del archivo subido a NetSuite

    // Etapa de inicio: Leer el archivo y devolver los transaction IDs (traid)
    const getInputData = () => {
        const startTime = new Date().getTime();
        const traIds = [];
        try {
            const fileObj = file.load({ id: FILE_ID });
            const content = fileObj.getContents();
            const lines = content.split('\n');
            lines.forEach(line => {
                const id = line.trim();
                if (id) {
                    traIds.push(id);
                }
            });

            // Mide el tiempo consumido
            const endTime = new Date().getTime();
            log.audit('Tiempo de ejecución - getInputData', `${(endTime - startTime) / 1000} segundos`);
            
        } catch (e) {
            log.error('Error leyendo el archivo', e);
        }
        return traIds;
    };

    // Buscar el internalId del Invoice a partir del transaction ID
    const getInternalIdByTraId = (traId) => {
        try {
            log.debug('getInternalIdByTraId', `Transaction ID: ${traId}`);
            
            const startTime = new Date().getTime();
            const TranData = [];

            const searchResult = search.create({
                type: search.Type.INVOICE,
                filters: [['mainline', 'is', 'T'],  // Solo linea principal
                           'AND',
                          ['subsidiary', 'is', 7],  // Subsidiaria de la transaccion
                          'AND',
                          ['tranid', 'is', traId]], // Tran id de la transacion
                columns: ['internalid',                     // Tran ID
                          'trandate',                       // Fecha
                          'custbody_lmry_document_type',    // Latam - Legal Document Type
                          'custbody_lmry_serie_doc_cxc',    // Latam - Serie CxC
                          'custbody_lmry_num_preimpreso',   // Latam - Preprinted Number
                          'status']
            }).run().getRange({ start: 0, end: 1 });
            
            log.debug('getInternalIdByTraId', `searchResult: ${searchResult.length}`);

            // Mide el tiempo consumido
            const endTime = new Date().getTime();
            log.audit('Tiempo de ejecución - getInternalIdByTraId', `${(endTime - startTime) / 1000} segundos`);

            if (searchResult.length > 0) {
                // Internal ID
                TranData.push(searchResult[0].getValue('internalid'));
                // Fecha
                TranData.push(searchResult[0].getValue('trandate'));
                // Latam - Legal Document Type
                TranData.push(searchResult[0].getValue('custbody_lmry_document_type'));
                // Latam - Serie CxC
                TranData.push(searchResult[0].getText('custbody_lmry_serie_doc_cxc'));
                // Latam - Preprinted Number
                TranData.push(searchResult[0].getValue('custbody_lmry_num_preimpreso'));
                // Arreglo de Datos
                return TranData;
            } else {
                log.debug('No se encontró la factura', `Transaction ID: ${traId}`);
            }
        } catch (e) {
            log.error('Error buscando el internalId', e);
        }
        return null;
    };

    // Etapa de mapeo: Convertir cada factura a una nota de crédito
    const map = (context) => {
        const startTime = new Date().getTime();
        const traId = context.value;
        try {
            log.debug('map : Procesando Transaction ID', traId);

            const invoiceId = getInternalIdByTraId(traId);
            if (!invoiceId) {
                log.debug('map : No se pudo obtener el datos para el Transaction ID', traId);
                return;
            }else{
                log.debug('map : Datos obtenidos invoiceId[]', invoiceId);
            }

            // Transformar la factura a nota de crédito
            const creditMemo = record.transform({
                fromType: record.Type.INVOICE,
                fromId: invoiceId[0],
                toType: record.Type.CREDIT_MEMO
            });
            
            /* *** Libera campos del Invoice *** */
            log.debug('map : Clear Fields', 'Libera campos del Invoice');

            // Latam - Legal Document Type
            creditMemo.setValue({
                fieldId: 'custbody_lmry_document_type',
                value: ''
            });
            // Latam - Serie CxC
            creditMemo.setValue({
                fieldId: 'custbody_lmry_serie_doc_cxc',
                value: ''
            });
            // Latam - Preprinted Number
            creditMemo.setValue({
                fieldId: 'custbody_lmry_num_preimpreso',
                value: ''
            });

            /* *** Seteo de campos del Invoice *** */
            log.debug('map : Set Fields', 'Seteo campos del Invoice');

            // Custom Form
            creditMemo.setValue({
                fieldId: 'customform',
                value: 94
            });
            // Latam - Transaction Reference
            creditMemo.setValue({
                fieldId: 'custbody_lmry_reference_transaction',
                value: invoiceId[0]
            });
            // Latam - Transaction Reference ID
            creditMemo.setValue({
                fieldId: 'custbody_lmry_reference_transaction_id',
                value: invoiceId[0]
            });


            // Latam - Document Date Ref
            var tranDate = format.parse({
                value: invoiceId[1],
                type: format.Type.DATE
              });
            creditMemo.setValue({
                fieldId: 'custbody_lmry_doc_ref_date',
                value: tranDate
            });
            // Latam - Document Type Ref
            creditMemo.setValue({
                fieldId: 'custbody_lmry_doc_ref_type',
                value: invoiceId[2]
            });
            // Latam - Document Series Ref
            creditMemo.setValue({
                fieldId: 'custbody_lmry_doc_serie_ref',
                value: invoiceId[3]
            });
            // Latam - Document Number Ref
            creditMemo.setValue({
                fieldId: 'custbody_lmry_num_doc_ref',
                value: invoiceId[4]
            });

            /* *** Grabar Credit Memo  *** */
            log.debug('map : Set Fields', 'Grabando transaccion');

            // Guardar la nota de crédito
            const creditMemoId = creditMemo.save({ ignoreMandatoryFields: true,
                                                   disableTriggers: true,
                                                   enableSourcing: true
                                                });
            
            // Mide el tiempo consumido
            const endTime = new Date().getTime();
            log.audit('Tiempo de ejecución - map', `${(endTime - startTime) / 1000} segundos`);

            log.debug('Nota de crédito creada', `Credit Memo ID: ${creditMemoId} para Invoice ID: ${invoiceId[0]}`);

        } catch (e) {
            log.error(`Error al transformar Transaction ID ${traId}`, e);
        }
    };

    // Etapa de reducción (no necesaria aquí, pero es obligatoria)
    const reduce = () => {};

    // Etapa de resumen: Log de resultados
    const summarize = (summary) => {
        log.debug('Resumen del proceso', 'Fin');

        summary.mapSummary.errors.iterator().each((key, error) => {
            log.error(`Error procesando Transaction ID: ${key}`, error);
            return true;
        });
    };

    return { getInputData, map, reduce, summarize };
});

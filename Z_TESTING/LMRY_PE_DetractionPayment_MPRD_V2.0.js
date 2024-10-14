/*= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
  ||  This script for customer center                             ||
  ||                                                              ||
  ||  File Name:  LMRY_PE_DetractionPayment_MPRD_V2.0.js          ||
  ||                                                              ||
  ||  Version Date         Author        Remarks                  ||
  ||  2.0     Feb 05 2020  LatamReady    Bundle 37714             ||
   \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search', 'N/format', 'N/runtime', 'N/url', 'N/email'],

    function (log, record, search, format, runtime, url, email) {

        var LMRY_script = 'LatamReady - PE Detraction Payment MPRD';

        /*var scriptObj = runtime.getCurrentScript();
        var logid = scriptObj.getParameter({
            name: 'custscript_lmry_br_mass_gen_id'
        });*/
        var idJournal = runtime.getCurrentScript().getParameter('custscript_lmry_pe_detpay_journalid');
        var feature = runtime.getCurrentScript().getParameter('custscript_lmry_pe_detpay_feature');

        var featureOW = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
        /**
         * Input Data for processing
         *
         * @return Array,Object,Search,File
         *
         * @since 2016.1
         */
        function getInputData() {

            try {
                log.error('logid', idJournal);

                var journalentrySearchObj = search.create({
                    type: "journalentry",
                    filters: [
                        ["internalid", "is", idJournal]
                    ],
                    columns: [
                        'internalid', 'account',
                        'custcol_lmry_fecha_detraccion', 'custcol_lmry_factura_prov_detraccion',
                        'custcol_lmry_numero_detraccion', 'custcol_lmry_es_detraccion_masiva', 'line'
                    ]
                });
                if (featureOW) {
                    journalentrySearchObj.columns.push(search.createColumn({ name: 'subsidiary' }));
                }
                
                return journalentrySearchObj;

            } catch (err) {
                log.error('[ getInputData ]', err);
                return [];
            }

        }


        function map(context) {

            try {
                var searchResult = JSON.parse(context.value);

                var internalid = searchResult.values.internalid.value;
                var account = searchResult.values.account;
                //var subsidiary = searchResult.values.subsidiary.value;
                var fecha_detraccion = searchResult.values.custcol_lmry_fecha_detraccion;
                var numero_detraccion = searchResult.values.custcol_lmry_numero_detraccion;
                var es_detraccion_masiva = searchResult.values.custcol_lmry_es_detraccion_masiva;
                var factura = searchResult.values.custcol_lmry_factura_prov_detraccion.value;
                var linea = searchResult.values.line;

                if (featureOW) {
                    var subsidiary = searchResult.values.subsidiary.value;
                } else {
                    var subsidiary = 1;
                }
                if (linea % 2 == 0) {
                    if (es_detraccion_masiva == true || es_detraccion_masiva == 'T') {
                        if (factura) {
                            fecha_detraccion = fecha_detraccion.split('/');
                            var fecha_format = format.format({ value: new Date(fecha_detraccion[2], fecha_detraccion[1] - 1, fecha_detraccion[0]), type: format.Type.DATE });

                            record.submitFields({
                                type: 'vendorbill', id: factura,
                                values: {
                                    custbody_lmry_doc_detraccion_date: fecha_format,
                                    custbody_lmry_num_comprobante_detrac: numero_detraccion,
                                    custbody_lmry_reference_transaction: internalid,
                                    custbody_lmry_reference_transaction_id: internalid
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true,
                                    disableTriggers: true
                                }
                            });
                            if (feature == true || feature == 'true') {
                                transferIgv(subsidiary,factura,fecha_format);
                            }
                        }
                    }
                }

                context.write({
                    key: 1,
                    value: true
                });


            } catch (err) {
                log.error('[ map ]', err);
            }

        }


        function summarize(context) {

            try {

                var asientoDiario = record.load({ type: record.Type.JOURNAL_ENTRY, id: idJournal, isDynamic: true });

                asientoDiario.setValue('custbody_lmry_estado_detraccion', 'Procesado');

                var lineas = asientoDiario.getLineCount('line');
                for (var i = 0; i < lineas; i++) {
                    asientoDiario.selectLine({ sublistId: 'line', line: i });
                    asientoDiario.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_es_detraccion_masiva', value: false });
                    asientoDiario.commitLine({ sublistId: 'line' });
                }

                asientoDiario.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true,
                    disableTriggers: true
                });

            } catch (err) {
                log.error('[ summarize ]', err);
            }
            return true;
        }

        /**
         * Devuelve las líneas de ítems de un Vendor Bill en formato JSON.
         * Card: CP2400504
         * @param {number|string} billID - ID del Vendor Bill a cargar.
         * @returns {Object} JSON con las líneas del Vendor Bill
         */
        function getLines(billID){

            
            var recordLoad = record.load({
                type:"vendorbill",
                id: billID
            });
            var jsonLines = {};
            
            var itemsLines = recordLoad.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < itemsLines; i++) {
                var iditem = recordLoad.getSublistValue({ sublistId: 'item', fieldId: "item", line: i });
                var department = recordLoad.getSublistValue({ sublistId: 'item', fieldId: "department", line: i });
                var location = recordLoad.getSublistValue({ sublistId: 'item', fieldId: "location", line: i });
                var _class = recordLoad.getSublistValue({ sublistId: 'item', fieldId: "class", line: i });
                var taxcode = recordLoad.getSublistValue({ sublistId: 'item', fieldId: "taxcode", line: i });
                var lineuniquekey = recordLoad.getSublistValue({ sublistId: 'item', fieldId: "lineuniquekey", line: i });

                var taxamount = Number(recordLoad.getSublistValue({ sublistId: 'item', fieldId: "tax1amt", line: i }));

                if (!jsonLines[lineuniquekey]) {
                    jsonLines[lineuniquekey] = {
                        "department": department,
                        "location": location,
                        "class": _class,
                        "taxcode": taxcode,
                        "debitamount": taxamount,
                        "item": iditem,
                        "lineuniquekey":lineuniquekey,
                        "sublist":"item"
                    }
                }
            }

            var itemsExpense = recordLoad.getLineCount({ sublistId: 'expense' });
            for (var i = 0; i < itemsExpense; i++) {
                var iditem = recordLoad.getSublistValue({ sublistId: 'expense', fieldId: "account", line: i });
                var department = recordLoad.getSublistValue({ sublistId: 'expense', fieldId: "department", line: i });
                var location = recordLoad.getSublistValue({ sublistId: 'expense', fieldId: "location", line: i });
                var _class = recordLoad.getSublistValue({ sublistId: 'expense', fieldId: "class", line: i });
                var taxcode = recordLoad.getSublistValue({ sublistId: 'expense', fieldId: "taxcode", line: i });
                var lineuniquekey = recordLoad.getSublistValue({ sublistId: 'expense', fieldId: "lineuniquekey", line: i });

                var taxamount = Number(recordLoad.getSublistValue({ sublistId: 'expense', fieldId: "tax1amt", line: i }));

                if (!jsonLines[lineuniquekey]) {
                    jsonLines[lineuniquekey] = {
                        "department": department,
                        "location": location,
                        "class": _class,
                        "taxcode": taxcode,
                        "debitamount": taxamount,
                        "item": iditem,
                        "lineuniquekey":lineuniquekey,
                        "sublist":"expense"
                    }
                }
            }
            return jsonLines;
        }

        /**
         * Agrupa las líneas por código de impuestos y asigna valores de departamento, clase y ubicación según las preferencias del usuario.
         * Card: CP2400504
         * @param {Object} jsonLines - Objeto JSON con las líneas a agrupar.
         * @param {Object} setupTaxSubsidiary - Configuración de la subsidiaria, con posibles valores de departamento, clase y ubicación.
         * @returns {Array} Arreglo de líneas agrupadas por código de impuestos, con los valores correspondientes asignados.
         */
        function groupLines(jsonLines,setupTaxSubsidiary) {

            var departmentMandatory = runtime.getCurrentUser().getPreference({ name: "DEPTMANDATORY" });
            var classMandatory = runtime.getCurrentUser().getPreference({ name: "CLASSMANDATORY" });
            var locationMandatory = runtime.getCurrentUser().getPreference({ name: "LOCMANDATORY" });
        
            var groupTaxcode = orderLines(jsonLines);
        
            // Asignar valores de departamento, clase y ubicación
            var groupedLines = [];
            for (var key in groupTaxcode) {
                if (departmentMandatory == true || departmentMandatory == "T") {
                    if (setupTaxSubsidiary.department) {
                        groupTaxcode[key]["department"] = setupTaxSubsidiary.department;
                    }
                }else{
                    groupTaxcode[key]["department"] = "";
                }
                if (classMandatory == true || classMandatory == "T") {
                    if (setupTaxSubsidiary.class) {
                        groupTaxcode[key]["class"] = setupTaxSubsidiary.class;
                    }
                }else{
                    groupTaxcode[key]["class"] = "";
                }
                if (locationMandatory == true || locationMandatory == "T") {
                    if (setupTaxSubsidiary.location) {
                        groupTaxcode[key]["location"] = setupTaxSubsidiary.location;
                    }
                }else{
                    groupTaxcode[key]["location"] = "";
                }
                groupedLines.push(groupTaxcode[key]);
            }
        
            return groupedLines;
        }

        function orderLines(jsonLines) {
            var sortedKeys = [];
            for (var lineuniquekey in jsonLines) {
                if (jsonLines.hasOwnProperty(lineuniquekey)) {
                    sortedKeys.push(lineuniquekey);
                }
            }
        
            // Ordenar las claves por 'lineuniquekey' ascendente y dar prioridad a 'item' sobre 'expense'
            sortedKeys.sort(function (a, b) {
                var lineA = jsonLines[a];
                var lineB = jsonLines[b];
            
                // Comparar por sublista primero (priorizar 'item' sobre 'expense')
                if (lineA.sublist !== lineB.sublist) {
                    return lineA.sublist === 'item' ? -1 : 1;
                }
            
                // Si las sublistas son iguales, comparar por 'lineuniquekey' ascendente
                var lineUniquekeyA = parseInt(lineA.lineuniquekey, 10);
                var lineUniquekeyB = parseInt(lineB.lineuniquekey, 10);
            
                return lineUniquekeyA - lineUniquekeyB;
            });
            
            
            var groupTaxcode = {};
        
            // Agrupar usando el arreglo de claves ordenadas
            for (var i = 0; i < sortedKeys.length; i++) {
                var lineuniquekey = sortedKeys[i];
                var item = jsonLines[lineuniquekey];
                var key = item.taxcode;
        
                if (!groupTaxcode[key]) {
                    groupTaxcode[key] = item;
                } else {
                    groupTaxcode[key].debitamount += item.debitamount;
                }
            }
            return groupTaxcode;
        }

        /**
         * Une los detalles de las líneas de impuestos con los detalles de la búsqueda de Vendor Bill.
         * Card: CP2400504
         * @param {Array} groupedLines - Líneas agrupadas por código de impuestos.
         * @param {number|string} billID - ID del Vendor Bill para realizar la búsqueda.
         * @returns {Array} Líneas agrupadas con los detalles adicionales de cuenta, detracción, moneda y tipo de cambio.
         */
        function joinDetailsLines(groupedLines,billID) {

            var taxlineDetail = {}

            var billSearchObj = search.create({
                type: "vendorbill",
                filters: [
                    ["internalid", "is", billID],
                    "AND",
                    ["mainline", "is", "F"],
                    "AND",
                    ["taxline", "is", "T"]
                ],
                columns: [
                            'internalid', 
                            'account',
                            'currency', 
                            'exchangerate', 
                            'custbody_lmry_concepto_detraccion',
                            'item'
                        ]
            });
            var resultTaxline = billSearchObj.run().getRange(0, 1000);

            //Json con los Datos del GL Impact
        
            for (var i = 0; i < resultTaxline.length; i++) {
                var taxcodeID = resultTaxline[i].getValue('item');
                if (taxlineDetail[taxcodeID]) continue;
                taxlineDetail[taxcodeID] = {
                    'account': resultTaxline[i].getValue('account'),
                    'concept_detraction': resultTaxline[i].getValue('custbody_lmry_concepto_detraccion'),
                    'currency': resultTaxline[i].getValue('currency'),
                    'exchangerate': resultTaxline[i].getValue('exchangerate')
                }
            }
        
            for (var i = 0; i < groupedLines.length; i++) {
                var taxcodeID = groupedLines[i]["taxcode"];
                groupedLines[i]["account"] = taxlineDetail[taxcodeID]["account"];
                groupedLines[i]["concept_detraction"] = taxlineDetail[taxcodeID]["concept_detraction"];
                groupedLines[i]["currency"] = taxlineDetail[taxcodeID]["currency"];
                groupedLines[i]["exchangerate"] = taxlineDetail[taxcodeID]["exchangerate"];
            }
        
            return groupedLines;
        }

        /**
         * Crea un asiento de diario para trasladar el IVA basado en las líneas agrupadas y la configuración de la subsidiaria.
         * Card: CP2400504
         * @param {Array} groupedLines - Líneas agrupadas con detalles del IVA.
         * @param {number|string} subsidiary - ID de la subsidiaria a la que pertenece la transacción.
         * @param {string} detractionDate - Fecha de detracción, en formato de texto.
         * @param {number|string} billID - ID de la factura (Vendor Bill).
         * @param {number|string} accountIva - ID de la cuenta de IVA para la línea de débito.
         */
        function createJournalTransferIgv(groupedLines,subsidiary,detractionDate,billID,accountIva){
            var featureAprove = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
            var concepDetraction = groupedLines[0]["concept_detraction"];
            if (concepDetraction && concepDetraction != 12) {
                var newJournal = record.create({
                    type: record.Type.JOURNAL_ENTRY
                });
                if (featureOW && subsidiary) {
                    newJournal.setValue('subsidiary', subsidiary);
                }
                if (detractionDate) {
                    var detractionDateFormat = format.parse({ value: detractionDate, type: format.Type.DATE });
                    newJournal.setValue('trandate', detractionDateFormat);
                }
                if (billID) {
                    newJournal.setValue('custbody_lmry_reference_transaction', billID);
                    newJournal.setValue('custbody_lmry_reference_transaction_id', billID);
                }
                newJournal.setValue('custbody_lmry_es_detraccion', false);
                if (featureAprove == 'T' || featureAprove == true) {
                    newJournal.setValue('approvalstatus', 2);
                }
                newJournal.setValue('currency', groupedLines[0]["currency"]);
                newJournal.setValue('exchangerate', groupedLines[0]["exchangerate"]);
                newJournal.setValue('memo', 'Traslado de IVA - Bill ID: ' + billID);
                var linejournal = 0;
                for (var i = 0; i < groupedLines.length; i++) {
                    var debitfxamount = groupedLines[i]["debitamount"];
                    if (debitfxamount) {
                        // Line from

                        var department = groupedLines[i]["department"];
                        var _class = groupedLines[i]["class"];
                        var location = groupedLines[i]["location"];
                        newJournal.setSublistValue('line', 'account', linejournal, groupedLines[i]["account"]);
                        newJournal.setSublistValue('line', 'credit', linejournal, debitfxamount.toFixed(2));
                        newJournal.setSublistValue('line', 'memo', linejournal, 'Tax amount redirect');
                        newJournal.setSublistValue('line', 'custcol_lmry_es_detraccion_masiva', linejournal, false);

                        if (department) {
                            newJournal.setSublistValue('line', 'department', linejournal, department);
                        }
                        if (_class) {
                            newJournal.setSublistValue('line', 'class', linejournal, _class);
                        }
                        if (location) {
                            newJournal.setSublistValue('line', 'location', linejournal, location);
                        }
                        
                        // Line to
                        newJournal.setSublistValue('line', 'account', linejournal + 1, accountIva);
                        newJournal.setSublistValue('line', 'debit', linejournal + 1, debitfxamount.toFixed(2));
                        newJournal.setSublistValue('line', 'memo', linejournal + 1, 'Tax amount redirect');
                        newJournal.setSublistValue('line', 'custcol_lmry_es_detraccion_masiva', linejournal + 1, false);

                        if (department) {
                            newJournal.setSublistValue('line', 'department', linejournal + 1, department);
                        }
                        if (_class) {
                            newJournal.setSublistValue('line', 'class', linejournal + 1, _class);
                        }
                        if (location) {
                            newJournal.setSublistValue('line', 'location', linejournal + 1, location);
                        }
                        linejournal += 2;
                    }

                }

                if (linejournal != 0) {
                    
                    var idJournal = newJournal.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true,
                        dissableTriggers: true
                    });

                }
            }
        }

        function transferIgv(subsidiary,billID,detractionDate){
            var setupTaxSubsidiary = getSetupTaxSubsidiary(subsidiary);
            var accountIva = setupTaxSubsidiary.accountIva;
            if (!accountIva) return false;
            var transactionLines = getLines(billID);
            var groupedLines = groupLines(transactionLines,setupTaxSubsidiary);
            groupedLines =  joinDetailsLines(groupedLines,billID);
            createJournalTransferIgv(
                                        groupedLines,
                                        subsidiary,
                                        detractionDate,
                                        billID,
                                        accountIva
                                    );
        }


        function getSetupTaxSubsidiary(subsidiary){
            var setupTaxSubsidiary = {};
            var setuptaxSearch = search.create({
                type: "customrecord_lmry_setup_tax_subsidiary",
                filters: [
                    ["custrecord_lmry_setuptax_subsidiary", "is", subsidiary],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    'custrecord_lmry_setuptax_department',
                    'custrecord_lmry_setuptax_class',
                    'custrecord_lmry_setuptax_location',
                    'custrecord_lmry_setuptax_pe_vat_account',
                ]
            });
            var resultSetupTax = setuptaxSearch.run().getRange(0, 1000);

            if (resultSetupTax && resultSetupTax.length) {
                setupTaxSubsidiary["department"] = resultSetupTax[0].getValue('custrecord_lmry_setuptax_department');
                setupTaxSubsidiary["class"] = resultSetupTax[0].getValue('custrecord_lmry_setuptax_class');
                setupTaxSubsidiary["location"] = resultSetupTax[0].getValue('custrecord_lmry_setuptax_location');
                setupTaxSubsidiary["accountIva"] = resultSetupTax[0].getValue('custrecord_lmry_setuptax_pe_vat_account');
            }
            return setupTaxSubsidiary;
        }

        return {
            getInputData: getInputData,
            map: map,
            //reduce: reduce,
            summarize: summarize
        };

    });
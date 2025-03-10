/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_AR_WHT_Void_Payments_MPRD.js  			    ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jul 05 2020  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@NModuleScope Public
 */
 define(['N/log', 'N/runtime', 'N/search', 'N/record', 'N/format', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0'],
    function (log, runtime, search, record, format, library_mail) {

        var LMRY_script = "LatamReady - AR WHT Void Payment MPRD";
        var MEMO = "Latam - AR VOID";

        function getInputData() {
            try {
                var idLog = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_ar_wht_void_idlog' });
                
                var cancellationDate = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_ar_wht_void_date' });
                var idPayment = search.lookupFields({
                    type: "customrecord_lmry_wht_payments_log",
                    id: idLog,
                    columns: ["custrecord_lmry_wht_tra"]
                }).custrecord_lmry_wht_tra[0].value;

                log.error('idPayment', idPayment);

                var transactions = {};
                transactions[idPayment] = { type: "vendorpayment" };

                var search_credits = search.create({
                    type: "vendorcredit",
                    filters: [
                        ["custbody_lmry_reference_transaction", "anyof", idPayment], "AND",
                        ["mainline", "is", "T"]
                    ],
                    columns: [
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.ASC,
                        })
                    ]
                });

                var results = search_credits.run().getRange(0, 1000);
                for (var i = 0; i < results.length; i++) {
                    var internalid = results[i].getValue("internalid");
                    transactions[internalid] = { type: "vendorcredit",cancellationDate:cancellationDate };
                }

                log.error('transactions', JSON.stringify(transactions));

                return transactions;

            }
            catch (err) {
                library_mail.sendemail('[ getInputData ]' + err, LMRY_script);
                log.error("err getinput data", err)
            }
        }

        function map(context) {
            try {
                var idTransaction = context.key;
                var mapValues = JSON.parse(context.value);
                log.error('mapValues', context.value);

                var typeRecord = mapValues["type"];
                var cancellationDate = mapValues["cancellationDate"];

                var lines = getTransactionLines(idTransaction);
                log.error('lines', JSON.stringify(lines));

                var oldJournals = getOldJournals(idTransaction);
                log.error('oldJournals', oldJournals);

                var idJournal = createReverseJournal(idTransaction, typeRecord, lines);
                log.error('idJournal', idJournal);

                //Se aplica el journal entry creado y desaplican las demas transacciones
                applyJournal(typeRecord, idTransaction, idJournal);

                if (typeRecord == "vendorcredit") {
                    //Issue: Para Bill Credits con moneda en dolares la primera vez no se aplica el journal
                    applyJournal(typeRecord, idTransaction, idJournal);
                    updateWHTRecords(idTransaction);
                    createTransactionFields(idTransaction,cancellationDate)
                }

                for (var i = 0; i < oldJournals.length; i++) {
                    var id = oldJournals[i];
                    record.delete({
                        type: "journalentry",
                        id: id
                    });
                }

                context.write({
                    key: idTransaction,
                    value: { isSuccess: 'T', type: typeRecord, idJournal: idJournal }
                });

            } catch (err) {
                library_mail.sendemail('[ map ]' + err, LMRY_script);

                context.write({
                    key: idTransaction,
                    value: { isSuccess: 'F' }
                });
            }
        }

        function summarize(context) {
            try {
                var totalRows = 0, totalSuccess = 0;
                var payments = [], credits = [], journals = [];

                context.output.iterator().each(function (key, value) {
                    var objValue = JSON.parse(value);
                    var isSuccess = objValue.isSuccess;
                    var type = objValue.type;
                    var idJournal = objValue.idJournal
                    if (isSuccess == 'T') {

                        if (type == "vendorpayment") {
                            payments.push(key);
                        } else {
                            credits.push(key);
                        }

                        journals.push(idJournal);

                        totalSuccess++;
                    }

                    totalRows++;
                    return true;
                });

                log.error('totalRows', totalRows);
                log.error("totalSuccess", totalSuccess);
                log.error("payments", payments);
                log.error("credits", credits);
                log.error("journals", journals);


                var idLog = runtime.getCurrentScript().getParameter({ name: 'custscript_lmry_ar_wht_void_idlog' });


                var status = "Ocurrio un error";
                if (totalRows == totalSuccess) {
                    status = "ANULADO";
                }

                record.submitFields({
                    type: 'customrecord_lmry_wht_payments_log',
                    id: idLog,
                    values: {
                        'custrecord_lmry_wht_sta': status,
                    },
                    options: {
                        disableTriggers: true
                    }
                });


            } catch (err) {
                library_mail.sendemail('[ summarize ]' + err, LMRY_script);
            }
        }


        function getTransactionLines(idTransaction) {

            var lines = [];

            var columns = [
                "internalid",
                search.createColumn({
                    name: "linesequencenumber",
                    sort: search.Sort.ASC,
                }),
                "account",
                "creditfxamount",
                "debitfxamount",
                "memo",
                "entity"
            ];

            var FEAT_DPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
            var FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });
            var FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });

            if (FEAT_DPT == 'T' || FEAT_DPT == true) {
                columns.push('department');
            }

            if (FEAT_CLASS == 'T' || FEAT_CLASS == true) {
                columns.push('class');
            }

            if (FEAT_LOC == 'T' || FEAT_LOC == true) {
                columns.push('location');
            }

            var search_lines = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", idTransaction], "AND",
                        ["taxline", "is", "F"], "AND",
                        ["formulatext: {item.type.id}", "doesnotstartwith", "ShipItem"]
                    ],
                columns: columns
            });

            var results = search_lines.run().getRange(0, 1000);

            for (var i = 0; i < results.length; i++) {
                var internalid = results[i].getValue("internalid");
                var account = results[i].getValue("account");
                var credit = results[i].getValue("creditfxamount");
                var debit = results[i].getValue("debitfxamount");

                var department;
                if (FEAT_DPT == 'T' || FEAT_DPT == true) {
                    department = results[i].getValue('department');
                }

                var class_;
                if (FEAT_CLASS == 'T' || FEAT_CLASS == true) {
                    class_ = results[i].getValue('class');
                }

                var location;
                if (FEAT_LOC == 'T' || FEAT_LOC == true) {
                    location = results[i].getValue('location');
                }

                if (account && (credit || debit)) {

                    lines.push({
                        "internalid": internalid,
                        "account": account,
                        "credit": credit,
                        "debit": debit,
                        "department": department,
                        "class": class_,
                        "location": location
                    });
                }
            }

            return lines;
        }



        function createReverseJournal(idTransaction, typeRecord, lines) {
            var idjournal = "";
            var form = runtime.getCurrentScript().getParameter({ name: "custscript_lmry_wht_journal_entry" });
            if (form) {
                var FEAT_DPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
                var FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });
                var FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
                var FEAT_APPROV_JOURNAL = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
                var FEAT_MULTIBOOK = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });

                //Se toman los valores del record de referencia (VendPymnt o VendCredit)

                var columns = [
                    "entity", "subsidiary", "postingperiod",
                    "exchangerate", "trandate", "currency", "accountingperiod.closed"
                ];

                if (FEAT_DPT == true || FEAT_DPT == 'T') {
                    columns.push("department");
                }

                if (FEAT_CLASS == true || FEAT_CLASS == 'T') {
                    columns.push("class");
                }

                if (FEAT_LOC == true || FEAT_LOC == 'T') {
                    columns.push("location");
                }

                var transaction = search.lookupFields({
                    type: typeRecord,
                    id: idTransaction,
                    columns: columns
                });

                log.error('transaction', JSON.stringify(transaction));

                var vendor = transaction["entity"][0].value;
                var subsidiary = transaction["subsidiary"][0].value;
                var trandate = transaction["trandate"];
                trandate = format.parse({ value: trandate, type: format.Type.DATE });
                var postingperiod = transaction["postingperiod"][0].value;
                var currency = transaction["currency"][0].value;
                var exchangerate = transaction["exchangerate"];
                var isClosed = transaction["accountingperiod.closed"];

                var department = "";
                if (FEAT_DPT == 'T' || FEAT_DPT == true) {
                    if (transaction["department"] && transaction["department"].length) {
                        department = transaction["department"][0].value;
                    }
                }

                var class_ = "";
                if (FEAT_CLASS == 'T' || FEAT_CLASS == true) {
                    if (transaction["class"] && transaction["class"].length) {
                        class_ = transaction["class"][0].value;
                    }
                }

                var location = "";
                if (FEAT_LOC == 'T' || FEAT_LOC == true) {
                    if (transaction["location"] && transaction["location"].length) {
                        location = transaction["location"][0].value;
                    }
                }


                //Se crea el Journal Entry
                var journalRecord = record.create({
                    type: 'journalentry',
                    isDynamic: true
                });

                journalRecord.setValue("customform", form);
                journalRecord.setValue("subsidiary", subsidiary);

                //Si es periodo cerrado, se toma la fecha y periodo actual
                if (isClosed == true || isClosed == 'T') {
                    journalRecord.setValue("trandate", new Date());
                } else {
                    journalRecord.setValue("trandate", trandate);
                    journalRecord.setValue("postingperiod", postingperiod);
                }

                journalRecord.setValue("currency", currency);
                journalRecord.setValue("exchangerate", exchangerate);
                journalRecord.setValue("memo", MEMO);
                journalRecord.setValue("custbody_lmry_reference_transaction", idTransaction);
                journalRecord.setValue("custbody_lmry_reference_transaction_id", idTransaction);

                if (department) {
                    journalRecord.setValue("department", department);
                }

                if (class_) {
                    journalRecord.setValue("class", class_);
                }

                if (location) {
                    journalRecord.setValue("location", location);
                }

                // if (FEAT_APPROV_JOURNAL == true || FEAT_APPROV_JOURNAL == 'T') {
                //     journalRecord.setValue("approvalstatus", 2);
                // }

                //Se define las lineas en base a las lineas de la transaccion de referencia
                for (var i = 0; i < lines.length; i++) {

                    var account = lines[i]["account"];
                    var credit = lines[i]["credit"];
                    var debit = lines[i]["debit"];

                    var department_line = lines[i]["department"];
                    var class_line = lines[i]["class"];
                    var location_line = lines[i]["location"];


                    journalRecord.selectNewLine({ sublistId: 'line' });
                    journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: account });

                    //Se invierten los montos de credit y debit.
                    if (credit) {
                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: credit });
                    }

                    if (debit) {
                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: debit });
                    }

                    journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_pe_transaction_reference', value: idTransaction });
                    journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: vendor });
                    if (department_line) {
                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: department_line });
                    }

                    if (class_line) {
                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: class_line });
                    }

                    if (location_line) {
                        journalRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: location_line });
                    }

                    journalRecord.commitLine({ sublistId: 'line' });
                }


                if (FEAT_MULTIBOOK == true || FEAT_MULTIBOOK == 'T') {
                    var books = getAccountingBooks(idTransaction);

                    log.error('books', JSON.stringify(books));

                    var numJournalBooks = journalRecord.getLineCount({
                        sublistId: "accountingbookdetail"
                    });

                    for (var i = 0; i < numJournalBooks; i++) {
                        journalRecord.selectLine({ sublistId: 'accountingbookdetail', line: i });

                        var bookId = journalRecord.getCurrentSublistValue({
                            sublistId: "accountingbookdetail",
                            fieldId: "bookid"
                        });

                        if (books[String(bookId)]) {
                            journalRecord.setCurrentSublistValue({
                                sublistId: "accountingbookdetail",
                                fieldId: "exchangerate",
                                value: books[String(bookId)]["exchangeRate"]
                            });
                        }
                    }
                }

                idjournal = journalRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true,
                    disableTriggers: true
                });

                if (FEAT_APPROV_JOURNAL == true || FEAT_APPROV_JOURNAL == 'T') {
                    record.submitFields({
                        type: "journalentry",
                        id: idjournal,
                        values: {
                            "approvalstatus": 2
                        },
                        options: {
                            disableTriggers: true
                        }
                    });
                }
            }

            return idjournal;
        }

        function updateWHTRecords(idTransaction) {

            //update wht details
            var search_details = search.create({
                type: "customrecord_lmry_wht_details",
                filters: [
                    ["custrecord_lmry_wht_bill_credit", "anyof", idTransaction]
                ],
                columns: ["internalid"]
            });

            var results = search_details.run().getRange(0, 1000);
            for (var i = 0; i < results.length; i++) {
                var internalid = results[i].getValue("internalid");
                record.submitFields({
                    type: "customrecord_lmry_wht_details",
                    id: internalid,
                    values: {
                        "custrecord_lmry_whtdet_voided": "1"
                    },
                    options: {
                        disableTriggers: true
                    }
                });

            }

            //update vouchers
            var search_vouchers = search.create({
                type: "customrecord_lmry_ar_comproban_retencion",
                filters: [
                    ["custrecord_lmry_ar_pago_relacionado", "anyof", idTransaction]
                ],
                columns: ["internalid"]
            });

            var results = search_vouchers.run().getRange(0, 1000);

            for (var i = 0; i < results.length; i++) {
                var internalid = results[i].getValue("internalid");

                record.submitFields({
                    type: "customrecord_lmry_ar_comproban_retencion",
                    id: internalid,
                    values: {
                        "custrecord_lmry_ar_voided": "1"
                    },
                    options: {
                        disableTriggers: true
                    }
                });
            }
        }

        function getAccountingBooks(idTransaction) {
            var books = {};

            var search_books = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", idTransaction], "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.ASC
                        }),
                        search.createColumn({
                            name: "accountingbook",
                            join: "accountingTransaction"
                        }),
                        search.createColumn({
                            name: "exchangerate",
                            join: "accountingTransaction"
                        })
                    ]
            });


            var results = search_books.run().getRange(0, 1000);
            for (var i = 0; i < results.length; i++) {
                var bookId = results[i].getValue({ name: "accountingbook", join: "accountingTransaction" });
                var exchangeRate = results[i].getValue({ name: "exchangerate", join: "accountingTransaction" });
                books[String(bookId)] = {
                    "exchangeRate": exchangeRate
                }

            }

            return books;
        }

        function applyJournal(typeRecord, idTransaction, idJournal) {

            var transactionRecord = record.load({
                type: typeRecord,
                id: idTransaction,
                isDynamic: false
            });

            if (typeRecord == "vendorcredit") {
                var createfrom = transactionRecord.getValue({ fieldId: "createdfrom" });
                transactionRecord.setValue({ fieldId: "tranid", value: "REF-" + createfrom });
            }
            
            var amount = transactionRecord.getValue("total");

            var numApply = transactionRecord.getLineCount({
                sublistId: 'apply'
            });

            var isAppliedJournal = false;

            for (var i = 0; i < numApply; i++) {
                var lineId = transactionRecord.getSublistValue({
                    sublistId: "apply",
                    fieldId: "internalid",
                    line: i
                });

                var isApplied = transactionRecord.getSublistValue({
                    sublistId: "apply",
                    fieldId: "apply",
                    line: i
                });

                if (Number(lineId) == Number(idJournal)) {

                    if (isApplied) {
                        isAppliedJournal = true;
                    }

                    transactionRecord.setSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        line: i,
                        value: true
                    });

                    transactionRecord.setSublistValue({
                        sublistId: 'apply',
                        fieldId: 'amount',
                        line: i,
                        value: parseFloat(amount)
                    });

                } else {
                    transactionRecord.setSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        line: i,
                        value: false
                    });
                }
            }

            log.error("isAppliedJournal", isAppliedJournal);

            if (!isAppliedJournal) {
                transactionRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true,
                    disableTriggers: true
                });
            }
        }

        function getOldJournals(idTransaction) {
            var journals = [];
            var search_journals = search.create({
                type: "journalentry",
                filters: [
                    ["custbody_lmry_reference_transaction_id", "equalto", idTransaction], "AND",
                    ["memomain", "startswith", MEMO]
                ],
                columns: ["internalid"]
            });

            var results = search_journals.run().getRange(0, 1000);

            for (var i = 0; i < results.length; i++) {
                var internalid = results[i].getValue("internalid");
                if (journals.indexOf(Number(internalid)) == -1) {
                    journals.push(Number(internalid));
                }
            }

            return journals;
        }

        //Verifica si la retencion es de Honorarios
        function isfeeBased(vendorCreditID){
            var isIncomeType = false;
            search.create({
                type: "customrecord_lmry_wht_details",
                filters: [
                    ["custrecord_lmry_wht_bill_credit", "anyof", vendorCreditID]
                ],
                columns: ["custrecord_lmry_whtdet_is_incometype"]
            }).run().each(function(result){
                isIncomeType = result.getValue("custrecord_lmry_whtdet_is_incometype");
            });

            return isIncomeType === "T" || isIncomeType === true;
        }

        function createTransactionFields(vendorCreditID, dateSICORE) {

            if (!isfeeBased(vendorCreditID)) return false;
            var recordID
            search.create({
                type: "customrecord_lmry_ar_transaction_fields",
                filters:
                    [
                        ["custrecord_lmry_ar_transaction_related.internalid", "anyof", vendorCreditID]
                    ],
                columns:
                    [
                        "internalid"
                    ]
            }).run().each(function (result) {
                recordID = result.getValue("internalid") || "";
            });
            dateSICORE = format.parse({
                value: dateSICORE,
                type: format.Type.DATE // Especifica que el valor es de tipo fecha
            });
            if (recordID) {
                record.submitFields({
                    type: "customrecord_lmry_ar_transaction_fields",
                    id: recordID,
                    values: {
                        "custrecord_lmry_ar_date_report": dateSICORE
                    },
                    options: {
                        disableTriggers: true
                    }
                });
            } else {
                var rec_transField = record.create({ type: 'customrecord_lmry_ar_transaction_fields' });
                rec_transField.setValue({ fieldId: 'custrecord_lmry_ar_date_report', value: dateSICORE })
                rec_transField.setValue({ fieldId: 'custrecord_lmry_ar_transaction_related', value: vendorCreditID })
                rec_transField.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
            }

        }
          

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        }
    });

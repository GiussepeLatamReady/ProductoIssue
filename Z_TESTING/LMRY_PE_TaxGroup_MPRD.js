/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@Name LMRY_PE_TaxGroup_MPRD.js
 *@Author piero.flores@latamready.com
 */
define(["N/runtime", "N/record", "N/log", "N/search", "../Latam_Library/LMRY_PE_TaxGroup_LBRY.js"],
    function (runtime, record, log, search, Lib_Tax_Group) {

        function getInputData() {
            try {
                const taxGroup = Lib_Tax_Group.getTaxGroups();

                var groupsArray = Object.keys(taxGroup).map(function (key) {
                    return parseInt(key, 10);
                });

                var lines = []//= getTransactions(groupsArray, taxGroup);

                lines.push({
                    id: "4355823",
                    taxGroup: taxGroup
                })
                log.error("lines", lines)
                return lines;
            } catch (err) {
                log.error("[getInputData]", err)
            }
        }

        function map(mapContext) {
            const value = JSON.parse(mapContext.value);
            const expenseId = value.id;
            const groupsArray = value.taxGroup;
            if (value.code === "ERROR") {
                mapContext.write({
                    key: value.code,
                    value: value
                });
            } else {
                const id = expenseId;
                try {

                    const deleteTaxResult = Lib_Tax_Group.deletePreviousTaxRecords(id);
                    var expenseObj = record.load({
                        type: 'expensereport',
                        id: id
                    });
                    const taxTransaction = Lib_Tax_Group.getTaxTransaction(expenseObj, groupsArray);
                    log.error("taxTransaction [map]", Object.keys(taxTransaction).length);

                    for (const lineuniquekey in taxTransaction) {
                        const expenseLines = taxTransaction[lineuniquekey];
                        mapContext.write({
                            key: lineuniquekey,  // agrupa todo lo de ese Expense Report en un único reduce
                            value: { expenseLines, id, code: "OK", mode: "CREATE" }
                        });
                    }
                    deleteTaxResult.forEach(taxResultId => {
                        mapContext.write({
                            key: taxResultId,  // agrupa todo lo de ese Expense Report en un único reduce
                            value: { taxResultId, id: taxResultId, code: "OK", mode: "DELETE" }
                        });
                    });


                } catch (error) {
                    log.error("Error [map]", error);
                    log.error("Error [map] data.id", id);
                    data.state = "Error";
                    mapContext.write({
                        key: mapContext.key,
                        value: {
                            code: "ERROR",
                            message: error.message
                        }
                    });
                }

            }
        }

        function reduce(reduceContext) {
            const { values, key } = reduceContext;
            const data = values.map(value => JSON.parse(value));

            if (data[0]?.mode == "CREATE") {
                const expenseLines = data[0]?.expenseLines;
                if (data[0].code != "ERROR") {
                    try {
                        Lib_Tax_Group.createTaxResult(expenseLines, key);
                    } catch (error) {
                        log.error('Error [REDUCE]', error)
                        log.error('Error [REDUCE] id ', data[0].id)
                        data[0].state = "Error";
                    }
                }
            }
            if (data[0]?.mode == "DELETE") {
                if (data[0].code != "ERROR") {
                    try {
                        record.delete({
                            type: "customrecord_lmry_br_transaction",
                            id: key
                        })
                    } catch (error) {
                        log.error('Error [REDUCE]', error)
                        log.error('Error [REDUCE] id ', key)
                        data[0].state = "Error";
                    }
                }
            }



        }

        function summarize(context) { }

        function getTransactions(groupArray, taxGroup) {
            var expPeWithTax = search.create({
                type: search.Type.EXPENSE_REPORT,
                filters: [
                    ['mainline', 'is', 'F'], 'AND',
                    ['subsidiary.country', 'is', 'PE'], 'AND',
                    ['taxitem', 'anyof', groupArray]
                ],
                columns: [
                    search.createColumn({ name: 'internalid', summary: search.Summary.GROUP })
                ]
            });

            const ids = [];
            expPeWithTax.runPaged({ pageSize: 1000 }).pageRanges.forEach(function (pageRange) {
                const page = expPeWithTax.runPaged({ pageSize: 1000 }).fetch({ index: pageRange.index });
                page.data.forEach(function (result) {
                    const id = result.getValue({ name: 'internalid', summary: search.Summary.GROUP });
                    if (id) {
                        ids.push({
                            id: id,
                            taxGroup: taxGroup
                        })
                    }
                });
            });

            return ids;
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });

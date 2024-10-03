function getSegments() {
    const billResult = [];
    /*
    const billSearch = search.load({
        id:"customsearch_lmry_pe_traslado_iva"
    });

    billSearch.filters.push("AND",["internalid","anyof","200778"]);
    */
    const billSearch = search.create({
        type: "vendorbill",
        settings: [{ "name": "consolidationtype", "value": "NONE" }],
        filters:
            [
                ["type", "anyof", "VendBill"],
                "AND",
                ["mainline", "is", "F"],
                "AND",
                ["taxline", "is", "T"],
                "AND",
                ["internalid", "anyof", "200779"]
            ],
        columns:
            [
                search.createColumn({ name: "account", label: "Account" }),
                search.createColumn({ name: "creditfxamount", label: "Amount (Credit) (Foreign Currency)" }),
                search.createColumn({ name: "debitfxamount", label: "Amount (Debit) (Foreign Currency)" }),
                search.createColumn({ name: "entity", label: "Name" }),
                search.createColumn({ name: "department", label: "Department" }),
                search.createColumn({ name: "class", label: "Class" }),
                search.createColumn({ name: "location", label: "Location" }),
                search.createColumn({ name: "item", label: "Item" })
            ]
    });
    billSearch.run().each(result => {
        const {columns,getValue} = result;
        console.log("result", result)
        
        billResult.push({
            account:getValue(columns[0]),
            creditAmount:getValue(columns[1]),
            debitAmount:getValue(columns[2]),
            entity:getValue(columns[3]),
            department:getValue(columns[4]),
            "class":getValue(columns[5]),
            location:getValue(columns[6]),
            Item:getValue(columns[7])
        });
        
        return true;
    });
    return billResult;
}
getSegments();

function getPayment(invoiceId){
    var objTransaction = {};

    objTransaction[invoiceId] = {};
    search.create({
        type: "transaction",
        filters: [
            ['mainline', 'is', 'T'],
            'AND',
            ['internalid', 'is', invoiceId]
        ],
        columns: ['internalid','tranid','entity','applyingTransaction.type','applyingTransaction.fxamount','applyingTransaction.tranid','applyingTransaction.internalid','applyingTransaction.memo']
    }).run().each(function(result){
        var internalid = result.getValue("internalid");

        objTransaction[internalid].tranid_new = result.getValue('tranid');
        objTransaction[internalid].entity = result.getValue('entity');
        var ObjApply = {
            type: result.getText(result.columns[3]),
            amount: result.getValue(result.columns[4]),
            tranid: result.getValue(result.columns[5]),
            internalid: result.getValue(result.columns[6]),
            memo: result.getValue(result.columns[7])
        }

        if (!objTransaction[internalid].apply) objTransaction[internalid].apply = [];
        objTransaction[internalid].apply.push(ObjApply)
        return true;
    })
    
    var payment = objTransaction[invoiceId].apply.find(tx => tx.type === "Payment").internalid;
    return payment || "";
}
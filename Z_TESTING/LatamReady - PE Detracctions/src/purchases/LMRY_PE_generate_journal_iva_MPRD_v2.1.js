/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */

define([
  'N',
  '../../lib/LMRY_detrac_journal_iva_LBRY_2.1.js'
], (
  N,
  journalIVALbry
) => {

  const { record, search } = N;

  function getTransactionsFromJournal() {
    let response = [];

    const journaQuery = search.create({
      type: 'customrecord_lmry_pe_detractions_batch',
      filters: [
        ['isinactive', 'is', 'F'],
        'AND',
        ['custrecord_lmry_pe_det_b_status', 'is', 4]
      ],
      columns: [
        'custrecord_lmry_pe_det_b_vendorbill',
        'custrecord_lmry_pe_det_b_subsidiary',
        { name: 'formulatext', formula: "TO_CHAR({custrecord_lmry_pe_det_b_date}, 'MM/DD/YYYY')", }
      ]
    });

    let myPagedData = journaQuery.runPaged({
      pageSize: 1000
    });

    myPagedData.pageRanges.forEach(function (pageRange) {
      let myPage = myPagedData.fetch({
        index: pageRange.index
      });

      myPage.data.forEach(function (line) {
        let cls = line.columns;
        let transactionString = line.getValue(cls[0]);
        let subsidiary = line.getValue(cls[1]);
        let date = line.getValue(cls[2]);

        let transactionsParse = JSON.parse(transactionString);
        let transactions = transactionsParse instanceof Array ? 
          transactionsParse: Object.keys(transactionsParse);

        response.push({
          date,
          subsidiary,
          context: transactions
        });
      });

    });

    return response;
  }

  function getBillsWithoutJournalIVA(listBills){

    const listBillContext = listBills.reduce((acum, l) => {
      acum = acum.concat(l.context);
      return acum;
    }, []);

    const listBillSet = new Set(listBillContext);

    const journalQuery = search.create({
      type: 'journalentry',
      filters: [
        ['custbody_lmry_reference_transaction', 'anyof', listBillContext]
      ],
      columns: ['custbody_lmry_reference_transaction']
    });

    let myPagedData = journalQuery.runPaged({
      pageSize: 1000
    });

    myPagedData.pageRanges.forEach(function (pageRange) {
      let myPage = myPagedData.fetch({
        index: pageRange.index
      });
      myPage.data.forEach(function (line) {
        let cls = line.columns;
        let billId = line.getValue(cls[0]);
        listBillSet.delete(billId);
      });
    });

    listBills.forEach((l) => {
      l.context = l.context.filter(b => listBillSet.has(b));
    });

    return listBills.filter(l => l.context.length > 0);
  }


  function getInputData() {
    try {
      const billsFromJournal = getTransactionsFromJournal();
      const bills = getBillsWithoutJournalIVA(billsFromJournal);
      const billsPartials = [];

      for(let bill of bills){
        if(bill.context.length > 10) {
          while(bill.context.length > 0) {
            billsPartials.push({
              ...bill,
              context: bill.context.splice(0, 10)
            });
          }
        } else { 
          billsPartials.push(bill);
        }
      }

      return billsPartials;
    } catch (error) {
      log.error('INPUTDATA.ERROR', error.message);
    }
  }

  function map(context) {
    try {
      const billIds = JSON.parse(context.value);

      billIds.context.forEach(bill => {
        journalIVALbry.executeJournalIVA({
          subsidiary: billIds.subsidiary,
          billID: bill,
          fecha_detraccion: new Date(billIds.date)
        })
      });

    } catch (e) {
      log.error('MAP.ERROR', e.message);
    }
  }

  function summarize(context) {
    return true;
  }

  return {
    getInputData,
    map,
    summarize
  }

})
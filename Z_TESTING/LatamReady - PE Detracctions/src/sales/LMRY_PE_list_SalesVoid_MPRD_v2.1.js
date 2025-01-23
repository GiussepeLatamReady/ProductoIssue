/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */
/*****************************************************************************
  VERSION 2.0
  10/04/2023 - Pierre Bernaola

/*****************************************************************************/
define([
  'detraction/journalService',
  'detraction/launcher',
  'detraction/server',
  'N/log',
  'N/record'
],

function(journalService, launcher, server, log, record) {

  function getInputData() {

    let current = server.nextBatchVoid();

    let batches = current.batches;

    let recordId = current.recordId;

    const listBatch = [];

    try {

      for(let i=0; i < batches.length; i++){
        let line = batches[i];

        let batchObject = server.loadBatch(line.batchId);

        line['journalId'] = batchObject.getJournal();

        line['transactions'] = batchObject.getTransactions() == 'string' ? 
          [batchObject.getTransactions()] : batchObject.getTransactions();
          
        line['recordId'] = recordId;

        batchObject.updateStatus('5');
        batchObject.commit();

        listBatch.push(line);
      }

      return listBatch;

    } catch (err) {
      log.error('input.error', err);
      batchObject.failedProcess(err);
    }
  }

  function map(context) {

    let result = launcher.getStepContent(context);

    try {

      let recordContext = result.value;

      let batchId = recordContext.batchId;

      let journalId = recordContext.journalId;

      let recordId = recordContext.recordId;

      let invoices = recordContext.transactions;

      //delete journal

      journalService.deleteJournal(journalId);

      //clean fields invoices

      invoices.forEach( (id)=>{
        record.submitFields({
          type: 'invoice',
          id: id,
          values: {
            'custbody_lmry_num_comprobante_detrac': '',
            'custbody_lmry_doc_detraccion_date': ''
          }
        });
      });

      context.write({
        key: batchId,
        value: {
          status: true,
          recordId
        }
      });

    } catch (err) {

      log.error('map.error :' + result.value.batchId, err);

      context.write({
        key: result.value.batchId,
        value: {
          status: false,
          recordId: result.value.recordId
        }
      });

    }


  }

  function reduce(context) {

  }

  function summarize(context) {

    try {

      let _result = launcher.resultSet(context);

      _result.forEach(function(line) {

        var key = line.key;

        var value = line.value;

        var status = value.status;

        let batchObject = server.loadBatch(key);
        batchObject.updateStatus(status ? '6': '7');

        let batchVoidObj = server.openBatchVoid(value.recordId);
        batchVoidObj.updateStatus(status ? '2': '3', true);

      });

    } catch (err) {

      log.error('sumarize.error', err);

      let batchObject = server.loadBatch(key);
      batchObject.updateStatus('7');

      let batchVoidObj = server.openBatchVoid(value.recordId);
      batchVoidObj.updateStatus('3', true);

    }

    if (server.nextBatchVoid())
      launcher.executeFlow(launcher.Type.VOID_SALES_JOURNAL);

  }

  return {
    getInputData: getInputData,
    map: map,
    //reduce: reduce,
    summarize: summarize
  };

});

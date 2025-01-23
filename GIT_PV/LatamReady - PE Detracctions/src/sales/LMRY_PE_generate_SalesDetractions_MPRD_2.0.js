/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */
/*****************************************************************************
  VERSION 2.0
  17/02/2022 | Richard Galvez
  - The object has a property know "batch", this field is used before the inf.
    pass the map step.
/*****************************************************************************/
define([
    'detraction/journalService',
    'detraction/launcher',
    'detraction/server',
    'N/log'
  ],

  function(journalService, launcher, server, log) {

    /**
     * Input Data for processing
     *
     * @return Array,Object,Search,File
     *
     * @since 2016.1
     */
    function getInputData() {


      let batchID = server.nextBatch();

      log.debug('Batch ID', batchID);

      let batchObject = server.loadBatch(batchID);

      try {

        batchObject.startProcess();

        let subsidiary = batchObject.getSubsidary();

        let date = batchObject.getPeriodInformation().date;

        let period = batchObject.getPeriodInformation().period;

        let note = batchObject.getMemo();

        let clasification = batchObject.getClasification();

        let transactions = batchObject.getTransactions();

        let transactionsWithBatch = batchObject.getBatchNumbers();

        let payInformation = batchObject.getPayInformation();

        let subsidiarySetup = server.openSetup();

        let accountContext = subsidiarySetup.getInformation(subsidiary);

        let journalContext = {
          subsidiary: subsidiary,
          date: date,
          period: period,
          clasification: clasification,
          note: note,
          account: accountContext,
          transactions: transactions,
          number: transactionsWithBatch,
          payInformation: payInformation

        }

        transactionsWithBatch = JSON.parse(transactionsWithBatch);

        let journal = journalService.createJournal(journalContext, true);

        journalService.setCacheByJournal(batchID, journal, "", "");

        let mapTransactions = [];

        for (let i = 0; i < transactions.length; i++) {

          mapTransactions.push({
            id: transactions[i],
            date: date.toISOString(),
            number: payInformation[transactions[i]].batch,
            journal: journal
          })

        }

        return mapTransactions;

      } catch (err) {
        log.error('input.error', err);
        batchObject.failedProcess(err);
      }
    }


    /**
     * If this entry point is used, the map function is invoked one time for each key/value.
     *
     * @param {Object} context
     * @param {boolean} context.isRestarted - Indicates whether the current invocation represents a restart
     * @param {number} context.executionNo - Version of the bundle being installed
     * @param {Iterator} context.errors - This param contains a "iterator().each(parameters)" function
     * @param {string} context.key - The key to be processed during the current invocation
     * @param {string} context.value - The value to be processed during the current invocation
     * @param {function} context.write - This data is passed to the reduce stage
     *
     * @since 2016.1
     */
    function map(context) {

      let result = launcher.getStepContent(context);

      try {

        let invoiceContext = result.value;

        let invoiceID = invoiceContext.id;

        let journal = invoiceContext.journal;

        let date = new Date(invoiceContext.date);

        let number = invoiceContext.number;

        let invoiceResult = journalService.updateInvoiceTransaction(invoiceID, journal, date, number);

        context.write({
          key: invoiceID,
          value: {
            status: true,
          }
        });
      } catch (err) {

        log.error('map.error :' + result.value.id, err);

        context.write({
          key: result.value.id,
          value: {
            status: false,
          }
        });

      }


    }


    /**
     * If this entry point is used, the reduce function is invoked one time for
     * each key and list of values provided..
     *
     * @param {Object} context
     * @param {boolean} context.isRestarted - Indicates whether the current invocation represents a restart
     * @param {number} context.executionNo - Version of the bundle being installed
     * @param {Iterator} context.errors - This param contains a "iterator().each(parameters)" function
     * @param {string} context.key - The key to be processed during the current invocation
     * @param {string} context.value - The value to be processed during the current invocation
     * @param {function} context.write - This data is passed to the reduce stage
     *
     * @since 2016.1
     */
    function reduce(context) {

    }

    /**
     * If this entry point is used, the reduce function is invoked one time for
     * each key and list of values provided..
     *
     * @param {Object} context
     * @param {boolean} context.isRestarted - Indicates whether the current invocation of the represents a restart.
     * @param {number} context.concurrency - The maximum concurrency number when running the map/reduce script.
     * @param {Date} context.datecreated - The time and day when the script began running.
     * @param {number} context.seconds - The total number of seconds that elapsed during the processing of the script.
     * @param {number} context.usage - TThe total number of usage units consumed during the processing of the script.
     * @param {number} context.yields - The total number of yields that occurred during the processing of the script.
     * @param {Object} context.inputSummary - Object that contains data about the input stage.
     * @param {Object} context.mapSummary - Object that contains data about the map stage.
     * @param {Object} context.reduceSummary - Object that contains data about the reduce stage.
     * @param {Iterator} context.ouput - This param contains a "iterator().each(parameters)" function
     *
     * @since 2016.1
     */
    function summarize(context) {

      let cacheContext = journalService.getCacheJournal();

      let batchID = cacheContext.batch;

      let journalCreated = cacheContext.journal;

      let batchObject = server.loadBatch(batchID);

      try {

        let _result = launcher.resultSet(context);

        let _correctTrans = [];

        let _errorTrans = [];

        _result.forEach(function(line) {

          var key = line.key;

          var value = line.value;

          if (value.status == false) {

            _errorTrans.push(key);

          } else {
            _correctTrans.push(key);
          }

        });

        if (_errorTrans.length > 0) {

          for (let i = 0; i < _correctTrans.length; i++) {

            journalService.updateInvoiceTransaction(_correctTrans[i], "", "", "");

          }

          batchObject.rollBackJournal(journalCreated);

          log.debug('Journal Reversed', journalCreated);

          throw "Error in the following transactions: " +
            _errorTrans.join(',') + '.\nThe details have been shown in the script log.';

        } else {

          if ((_correctTrans.length + _errorTrans.length) == 0)
            throw "there are not any invoices selected.";

          batchObject.setJournal(journalCreated);

          batchObject.finishProcess("The Journal have been created.");

        }

      } catch (err) {

        log.error('sumarize.error', err);

        batchObject.failedProcess(err);

      }

      if (server.nextBatch() > -1)
        launcher.executeFlow(launcher.Type.GENERATE_SALES_JOURNAL);

    }

    return {
      getInputData: getInputData,
      map: map,
      //reduce: reduce,
      summarize: summarize
    };

  });

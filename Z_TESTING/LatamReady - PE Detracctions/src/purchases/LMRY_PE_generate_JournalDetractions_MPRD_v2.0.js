/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */
/******************************************************************************************
  VERSION 3.0
  23/05/2022 : Richard Galvez Lopez
  - Change the Script to version 2.1
  - the input data was modified, now create a payInformation key/value.
/*****************************************************************************************/

define(['detraction/batch', 'detraction/batchFlow', 'N/log', "../../lib/LMRY_detrac_journal_iva_LBRY_2.1.js"],

  function(batch, batchFlow, log, journalIVALbry) {

    /**
     * Input Data for processing
     *
     * @return Array,Object,Search,File
     *
     * @since 2016.1
     */
    function getInputData() {


      var batchObject = batch.next('journal');

      try {
        log.error('Batch Record', batchObject.id);

        batchObject.startGenerateJournals();

        var subsidiary = batchObject.getSubsidary();

        var date = batchObject.getDate();

        var period = batchObject.getPeriod();

        var accounts = batchObject.getAccounts();

        var commission = batchObject.getCommission();

        var depositNumber = batchObject.getDepositNumber();

        var transactions = batchObject.getTransactions();

        var clasification = batchObject.getClasification();

        var note = batchObject.getNote();

        var journalContext = {
          subsidiary: subsidiary,
          date: date,
          period: period,
          account: accounts,
          commission: commission,
          number: depositNumber,
          transactions: transactions,
          clasification: clasification,
          note: note
        }
        if (!Array.isArray(transactions)) {
          journalContext.transactions = Object.keys(transactions);
          let payInformation = {};
          for (var x in transactions) {
            payInformation[x] = {
              pay: transactions[x].det,
              decimal: '-'
            }
          }
          journalContext.payInformation = payInformation;
        }

        var journal = batch.createJournal(journalContext, false);

        log.error('Journal Detraction', journal);

        batch.setCacheByJournal(batchObject.id, journal, depositNumber, date);

        if (batchObject) {
          transactions = batchObject.getTransactions();
          if (Array.isArray(transactions)) {
            return transactions;
          } else {
            return Object.keys(transactions);
          }
        }

      } catch (err) {

        log.error('createJournalError', err);

        batchObject.createJournalError(JSON.stringify(err));

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

      var result = batchFlow.getStepContent(context);

      try {

        batch.updateTransaction(result.value);
        
        let batchObj = batch.getBatchJournal();

        journalIVALbry.executeJournalIVA({
          subsidiary: batchObj.getSubsidary(),
          billID: result.value,
          fecha_detraccion: batchObj.getDate()
        });

        var newContext = {
          status: true,
        }

        context.write({
          key: result.value,
          value: newContext
        });

      } catch (err) {

        log.error('map.error', err);

        context.write({
          key: result.value,
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

      var batchObject = batch.getBatchJournal();

      if (batchObject) {

        try {

          batchObject.completeGenerateJournal(batch.getCacheJournal().journal);

          batch.cleanCacheJournal();

        } catch (err) {

          log.error('sumarize.error', err);
          batchObject.createJournalError(JSON.stringify(err));

        }
      }
      if (batch.hasNext('journal'))
        batchFlow.executeFlow(batchFlow.Type.GENERATE_JOURNAL);


    }

    return {
      getInputData: getInputData,
      map: map,
      //reduce: reduce,
      summarize: summarize
    };

  });
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
  - The getInputData had been modified, now it return a array with two key/value,
    1. transaction : internal id of the transaction
    2. det : detraction amount of the transaction
/*****************************************************************************************/

define(['detraction/batch', 'detraction/batchFlow', 'detraction/freemarker', 'N/log'],

  function(batch, batchFlow, freemarker, log) {

    /**
     * Input Data for processing
     *
     * @return Array,Object,Search,File
     *
     * @since 2016.1
     */
    function getInputData() {


      var batchObject = batch.next('file');

      log.error('Batch Record', batchObject.id);

      batch.setCache(batchObject.id);

      batchObject.startGenerateFile();

      if (batchObject) {
        let transactions = batchObject.getTransactions();
        if (Array.isArray(transactions)) {
          transactions = transactions.map((current) => {
            return {
              transaction: current,
              det: null
            }
          });
        } else {
          transactions = Object.values(transactions);
        }
        return transactions;
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
      log.error('map.result', result);
      try {
        var jsonResult = batch.getTransactionRecord(
          result.value.transaction,
          result.value.det
        );
        var newContext = {
          status: true,
          content: jsonResult
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
            content: err
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

      var batchObject = batch.getCache();

      try {
        var _result = batchFlow.resultSet(context);

        var _errorTrans = [];

        var _transResult = [];

        _result.forEach(function(line) {

          var key = line.key;

          var value = line.value;

          if (value.status == false) {

            _errorTrans.push(key);

          } else {
            _transResult.push(value.content);
          }

        });

        if (_errorTrans.length > 0) {

          batchObject.createFileError("Error in the following transactions: " +
            _errorTrans.join(','));

        } else {

          var jsonContext = {
            id: batchObject.getBatchNumber(),
            subsidiary: batch.generateSubsidiaryFile(batchObject.getSubsidary()),
            transaction: _transResult
          };


          var claveSolFormat = freemarker.claveSolFormat();

          var bankFormat = freemarker.bankFormat();

          var claveSolFile = batch.generateFormatFile('CS', claveSolFormat, jsonContext);

          var bankFile = batch.generateFormatFile('BA', bankFormat, jsonContext);

          batchObject.attachFiles(claveSolFile, bankFile);

          batchObject.completeGenerateFile();

        }


      } catch (err) {

        log.error('sumarize.error', err);
        batchObject.createFileError(JSON.stringify(err));

      }

      if (batch.hasNext('file'))
        batchFlow.executeFlow(batchFlow.Type.GENERATE_FILE);


    }

    return {
      getInputData: getInputData,
      map: map,
      //reduce: reduce,
      summarize: summarize
    };

  });

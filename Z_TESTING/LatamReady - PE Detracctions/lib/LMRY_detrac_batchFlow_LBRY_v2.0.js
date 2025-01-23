/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */

/*******************************************************************************************************************
  * 10/07/2021 : Richard Galvez Lopez
    - Add new Batch Map/reduce Script (SalesGenerateJournal)
/*******************************************************************************************************************/


define(['N/runtime', 'N/log', 'N/util', 'N/task', 'N/error'],

  function(runtime, log, util, task, error) {

    var FLOW = {

      'GenerateFile': {
        id: 'customscript_lmry_det_gene_file_mprd',
        deploy: 'customdeploy_lmry_det_gene_file_mprd'
      },
      'GenerateJournal': {
        id: 'customscript_lmry_det_gene_journal_mprd',
        deploy: 'customdeploy_lmry_det_gene_journal_mprd'
      },
      "SalesGenerateJournal": {
        id: 'customscript_lmry_det_sgene_journal_mprd',
        deploy: 'customdeploy_lmry_det_sgene_journal_mprd'
      },
      "SalesVoidJournal" : {
        id: 'customscript_lmry_batch_det_void_s_mprd',
        deploy: 'customdeploy_lmry_batch_det_void_s_mprd'
      }
    }


    function getStepContent(context) {

      var value = context.value;

      if (value) {
        if (util.isString(value)) {
          try {
            value = JSON.parse(value);
          } catch (err) {

          }
        }
      } else {
        value = context.values;
        if (typeof value == 'object') {
          var result = [];
          for (var i = 0; i < value.length; i++) {
            result.push(JSON.parse(value[i]));
          }
          value = result;
        }


      }

      return {
        key: context.key,
        value: value
      }

    }

    function resultSet(context) {
      var _result = [];

      context.output.iterator().each(function(key, value) {

        var _line = {};
        _line['key'] = key;

        var _value = value;
        if (typeof _value == 'string') {
          try {
            _value = JSON.parse(_value);
          } catch (err) {
            log.debug('batch.resultSet', 'The value is not JSON');
          }
        }

        _line['value'] = _value;
        _result.push(_line);

        return true;
      });

      return _result;


    }


    function executeFlow(type) {

      var scriptContext = FLOW[type];

      log.error('ExecuteFlow', scriptContext);

      try {
        task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: scriptContext.id,
          deploymentId: scriptContext.deploy
        }).submit();
      } catch (err) {

        log.error(type, err);
      }
    }


    return {
      Type: {
        'GENERATE_FILE': 'GenerateFile',
        'GENERATE_JOURNAL': 'GenerateJournal',
        'GENERATE_SALES_JOURNAL': 'SalesGenerateJournal',
        'VOID_SALES_JOURNAL': 'SalesVoidJournal'
      },
      //startNextFlow: startNextFlow,
      getStepContent: getStepContent,
      resultSet: resultSet,
      executeFlow: executeFlow
    }

  });

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Name LMRY_detrac_sales_server_LBRY_v2.1
 */
 /*****************************************************************************
   VERSION 2.0
   17/02/2022 | Richard Galvez
   - add "getPayInformation" function and change the result of "getBatchNumber"
     function.
 /*****************************************************************************/
define(['N/error', 'N/log', 'N/runtime', 'N/search', 'N/url', 'N/config', 'N/format', 'N/record', 'N/redirect'],

  function(error, log, runtime, search, url, config, format, record, redirect) {

    function isOneWorld() {

      return runtime.isFeatureInEffect({
        feature: 'SUBSIDIARIES'
      });

    }

    var batchSalesRecordType = 'customrecord_lmry_pe_det_sales_batch';

    var statusContext = {
      "PENDING": 1,
      "PROGRESS": 2,
      "COMPLETED": 3,
      "FAILED": 4,
      "VOID_PROGRESS": 5,
      "VOIDED":6,
      "VOID_FAILED": 7,
      "VOID_PENDING": 8
    }

    function onLoadRecord(type, id) {

      return record.load({
        type: type,
        id: id
      });

    }


    function saveRecord(recordContext) {
      return recordContext.save();
    }

    function nextBatch() {

      let id = -1;

      let searchContext = search.create({
        type: batchSalesRecordType,
        filters: [
          [
            'custrecord_lmry_pe_det_s_b_status', 'is', '1'
          ]
        ],
        columns: [{
          name: 'internalid',
          search: search.Sort.ASC
        }]
      }).run().getRange(0, 10);

      if (searchContext.length > 0) {
        id = searchContext[0].id
      }
      return id;


    }

    class BatchSales {

      constructor(currentID) {

        if (currentID) {
          this.recordContext = record.load({
            type: batchSalesRecordType,
            id: currentID,
          });
        } else {
          this.recordContext = record.create({
            type: batchSalesRecordType
          });
          this.recordContext.setValue('custrecord_lmry_pe_det_s_b_user', runtime.getCurrentUser().id);
          this.recordContext.setValue('custrecord_lmry_pe_det_s_b_status', 1);
        }

      }

      setProperties(fieldContext) {

        let fields = {
          'subsidiary': 'custrecord_lmry_pe_det_s_b_subsidiary',
          'date': 'custrecord_lmry_pe_det_s_b_date',
          'period': 'custrecord_lmry_pe_det_s_b_period',
          'memo': 'custrecord_lmry_pe_det_s_b_note',
          'batch': 'custrecord_lmry_pe_det_s_b_batch',
          'class': 'custrecord_lmry_pe_det_s_b_class',
          'department': 'custrecord_lmry_pe_det_s_b_department',
          'location': 'custrecord_lmry_pe_det_s_b_location'
        }

        for (let currentField in fieldContext) {
          this.recordContext.setValue(fields[currentField], fieldContext[currentField]);

        }


      }

      setTransactions(transactions) {

        let arraytrans = []

        for (let i in transactions) {

          arraytrans.push(i);

        }

        this.recordContext.setValue('custrecord_lmry_pe_det_s_b_invoice', arraytrans);

        this.recordContext.setValue('custrecord_lmry_pe_det_s_b_context', JSON.stringify(transactions))


      }

      setJournal(journal) {
        this.recordContext.setValue('custrecord_lmry_pe_det_s_b_journal', journal);
      }

      //GETs functions

      getJournal() {
        return this.recordContext.getValue('custrecord_lmry_pe_det_s_b_journal');
      }

      getSubsidary() {
        return this.recordContext.getValue('custrecord_lmry_pe_det_s_b_subsidiary')
      }

      getTransactions() {
        return this.recordContext.getValue('custrecord_lmry_pe_det_s_b_invoice');
      }

      getBatchNumbers() {
        let payInformation = JSON.parse(this.recordContext.getValue('custrecord_lmry_pe_det_s_b_context'));

        let result = {};

        for (var key in payInformation) {
          result[key] = payInformation[key].batch;
        }

        return JSON.stringify(result);


      }

      getPayInformation() {
        return JSON.parse(this.recordContext.getValue('custrecord_lmry_pe_det_s_b_context'));
      }

      getMemo() {
        return this.recordContext.getValue('custrecord_lmry_pe_det_s_b_note')
      }

      getBatch() {
        return this.recordContext.getValue('custrecord_lmry_pe_det_s_b_batch');
      }

      getPeriodInformation() {
        let recordContext = this.recordContext;
        return {
          date: recordContext.getValue('custrecord_lmry_pe_det_s_b_date'),
          period: recordContext.getValue('custrecord_lmry_pe_det_s_b_period'),
        }
      }

      getClasification() {
        let recordContext = this.recordContext;
        return {
          department: recordContext.getValue('custrecord_lmry_pe_det_s_b_department'),
          class: recordContext.getValue('custrecord_lmry_pe_det_s_b_class'),
          location: recordContext.getValue('custrecord_lmry_pe_det_s_b_location'),
        }
      }

      updateStatus(status, summary) {

        this.recordContext.setValue('custrecord_lmry_pe_det_s_b_status', status);
        if (summary) {
          this.recordContext.setValue("custrecord_lmry_pe_det_s_b_summary",
            (typeof summary == 'object' ? JSON.stringify(summary) : summary)
          );
        }

        this.recordContext = onLoadRecord(batchSalesRecordType, saveRecord(this.recordContext));

      }

      commit() {
        saveRecord(this.recordContext);
      }

      startProcess() {
        this.recordContext.setValue('custrecord_lmry_pe_det_s_b_end_date', '');
        this.updateStatus(statusContext.PROGRESS);
      }

      finishProcess(stringSummary) {
        this.recordContext.setValue('custrecord_lmry_pe_det_s_b_end_date', new Date());
        this.updateStatus(statusContext.COMPLETED, stringSummary);
      }

      failedProcess(stringSummary) {
        this.recordContext.setValue('custrecord_lmry_pe_det_s_b_end_date', new Date());
        this.updateStatus(statusContext.FAILED, stringSummary);
      }

      rollBackJournal(journal) {

        record.delete({
          type: record.Type.JOURNAL_ENTRY,
          id: journal
        });

      }

      static bulkUpdateWithVoidPending(batchs){

        batchs.forEach( (batch)=>[
          record.submitFields({
            type: batchSalesRecordType,
            id: batch.batchId,
            values: {
              'custrecord_lmry_pe_det_s_b_status': '8'
            }
          })
        ]);
        
      }

    }


    class ContextServer {

      constructor(context) {
        this.scriptContext = context;
      }

      getParamValue(id) {

        return this.scriptContext.request.parameters[id];

      }

      getRequestSublistValues(sublistContext) {

        let request = this.scriptContext.request;

        let sublistId = sublistContext.sublist;

        let arrayFields = sublistContext.input;

        let arrayMap = sublistContext.output;

        let result = [];

        let totalLines = request.getLineCount({
          group: sublistId
        });

        for (let i = 0; i < totalLines; i++) {

          let jsonLine = {};

          for (let j = 0; j < arrayFields.length; j++) {

            let key = arrayMap[j] ? arrayMap[j] : arrayFields[j];

            jsonLine[key] = request.getSublistValue({
              group: sublistId,
              name: arrayFields[j],
              line: i
            })

          }
          result.push(jsonLine)
        }
        return result;


      }


    }


    class SalesDetSetup {

      constructor() {

        let setupContext = {

        }

        if (isOneWorld()) {
          // search.create({
          //   type: 'subsidiary',
          //   columns: ['internalid', 'name'],
          //   filters: [
          //     ['isinactive', 'is', 'F'],
          //     'and',
          //     ['country', 'anyof', 'PE']
          //   ]
          // }).run().each((line) => {
          //
          //   setupContext[line.id] = {
          //     name: line.getValue('name'),
          //     setupId: null,
          //     detraction: null,
          //     bank: null,
          //     rounding: null
          //   }
          //   return true;
          // });

          search.create({
            type: 'customrecord_lmry_pe_detrac_acc_sales',
            filters:
              [
                ["custrecord_lmry_pe_dec_ac_sales_subsi.isinactive", "is", "F"]
              ],
            columns: [
              'custrecord_lmry_pe_dec_ac_sales_subsi',
              'custrecord_lmry_pe_dec_ac_sales_acc_1',
              'custrecord_lmry_pe_dec_ac_sales_acc_2',
              'custrecord_lmry_pe_dec_ac_sales_acc_3',
              'custrecord_lmry_pe_detailed_rounding',
              'custrecord_lmry_pe_dec_ac_sales_acc_4'
            ]
          }).run().each((line) => {

            let id = line.id;
            let subsidiary = line.getValue(line.columns[0]);
            let subsidiaryName = line.getText(line.columns[0]);
            let det = line.getValue(line.columns[1]);
            let rounding = line.getValue(line.columns[2]);
            let bank = line.getValue(line.columns[3]);
            let checkDetailedRounding = line.getValue(line.columns[4]);
            let roundingCredit = line.getValue(line.columns[5]);
            setupContext[subsidiary] = {
              name: subsidiaryName,
              setupId: id,
              detraction: det,
              rounding: rounding,
              roundingCredit: roundingCredit,
              bank: bank,
              checkDetailedRounding: checkDetailedRounding
            };
            return true;

          });


        } else {

          search.create({
            type: 'customrecord_lmry_pe_detrac_acc_sales',
            filters:
              [
                ["custrecord_lmry_pe_dec_ac_sales_subsi.isinactive", "is", "F"]
              ],
            columns: [
              'custrecord_lmry_pe_dec_ac_sales_subsi',
              'custrecord_lmry_pe_dec_ac_sales_acc_1',
              'custrecord_lmry_pe_dec_ac_sales_acc_2',
              'custrecord_lmry_pe_dec_ac_sales_acc_3',
              'custrecord_lmry_pe_detailed_rounding',
              'custrecord_lmry_pe_dec_ac_sales_acc_4',
            ]
          }).run().each((line) => {

            let subsididary = line.getValue(line.columns[0]);
            let det = line.getValue(line.columns[1]);
            let rounding = line.getValue(line.columns[2]);
            let bank = line.getValue(line.columns[3]);
            let checkDetailedRounding = line.getValue(line.columns[4]);
            let roundingCredit = line.getValue(line.columns[5]);
            setupContext = {
              setupId: line.id,
              detraction: det,
              rounding: rounding,
              roundingCredit: roundingCredit,
              bank: bank,
              checkDetailedRounding:checkDetailedRounding
            };
            return false;

          });

        }

        this.setupContext = setupContext;
        this.fieldWrapper = {
            detraction: 'custrecord_lmry_pe_dec_ac_sales_acc_1',
            rounding: 'custrecord_lmry_pe_dec_ac_sales_acc_2',
            roundingCredit: 'custrecord_lmry_pe_dec_ac_sales_acc_4',
            bank: 'custrecord_lmry_pe_dec_ac_sales_acc_3',
            checkDetailedRounding: 'custrecord_lmry_pe_detailed_rounding'
          },
          this.type = 'customrecord_lmry_pe_detrac_acc_sales';
      }

      getInformation(subsidiaryID) {

        let result = {};

        if (isOneWorld()) {
          if (subsidiaryID) {
            result = this.setupContext[subsidiaryID];
          }
        } else {
          result = this.setupContext;
        }
        return result;

      }

      getSubsidaries() {

        if (isOneWorld()) {

          let result = [];

          let setupContext = this.setupContext;

          for (let subsidiary in setupContext) {

            result.push({
              id: subsidiary,
              text: setupContext[subsidiary].name
            });

          }

          return result;

        } else {
          throw error.create({
            title: 'Sales Detraction Error',
            message: 'The account is mid market edition'
          });
        }

      }

      updateInformation(updateContext) {

        let subsidiary = updateContext.subsidiary;
        let detAcc = updateContext.detraction;
        let roundingAcc = updateContext.rounding;
        let roundingAccCredit = updateContext.roundingCredit;
        let bankAcc = updateContext.bank;
        let checkDetailedRounding = updateContext.checkDetailedRounding

        let currentContext = {};

        if (isOneWorld()) {
          currentContext = this.setupContext[subsidiary];

          if (!currentContext) {
            currentContext = {};
          }

        } else {
          currentContext = this.setupContext;
        }

        currentContext.detraction = detAcc;
        currentContext.rounding = roundingAcc;
        currentContext.roundingCredit = roundingAccCredit;
        currentContext.bank = bankAcc;
        currentContext.checkDetailedRounding = checkDetailedRounding;

        let type = this.type;

        let currentRecord = null;

        if (currentContext.setupId) {
          currentRecord = record.load({
            type: type,
            id: currentContext.setupId
          });
        } else {
          currentRecord = record.create({
            type: type
          });
          currentRecord.setValue('custrecord_lmry_pe_dec_ac_sales_subsi', subsidiary);
        }

        for (let field in this.fieldWrapper) {

          currentRecord.setValue(this.fieldWrapper[field], currentContext[field]);

        }
        return currentRecord.save();

      }

    }

    function openRedirect(type) {

      let contextType = {
        'ListDetractions': {
          scriptId: 'customscript_lmry_pe_det_sales_list_stlt',
          deploymentId: 'customdeploy_lmry_pe_det_sales_list_stlt',
          parameters: {
            isNew: 'T'
          }
        }
      }

      redirect.toSuitelet(contextType[type]);

    }

    class BatchSalesVoid {

      static batchSalesVoidRecord = {
        type: 'customrecord_lmry_batch_d_void_sales',
        fields: {
          id: 'internalid',
          status: 'custrecord_lmry_batch_d_void_sales_stts',
          batchId: 'custrecord_lmry_batch_d_void_sales_id'
        }
      }

      constructor(recordId){
        if (recordId) {
          this.recordContext = record.load({
            type: BatchSalesVoid.batchSalesVoidRecord.type,
            id: recordId,
          });
        } else throw 'The record id does not exist.';
      }

      updateStatus(currentStatus, thenSave){
        this.recordContext.setValue(BatchSalesVoid.batchSalesVoidRecord.fields.status,
         currentStatus);
        
        if(thenSave) this.recordContext.save();
      }

      commit(){
        this.recordContext.save();
      }

      static nextBatchVoid(){
        let response;

        let objSearch = search.create({
          type: this.batchSalesVoidRecord.type,
          filters: [
            ['isinactive', 'is', 'F'],
            'AND',
            [this.batchSalesVoidRecord.fields.status, 'is', '1']
          ],
          columns: [
            {
              name: this.batchSalesVoidRecord.fields.id,
              sort: search.Sort.ASC
            },
            this.batchSalesVoidRecord.fields.batchId
          ]
        }).run().getRange(0, 1);

        objSearch.forEach( (line)=>{
          let cl = line.columns;

          response = {
            recordId: line.getValue(cl[0]),
            batches: JSON.parse(line.getValue(cl[1]))
          };
        });

        return response;
      }

    }

    return {
      isOneWorld: isOneWorld,
      openSetup: function() {
        return new SalesDetSetup();
      },
      openContext: function(scriptContext) {
        return new ContextServer(scriptContext);
      },
      nextBatch: nextBatch,

      loadBatch: function(id) {
        if (id || id > 0) {
          return new BatchSales(id);
        } else {
          throw 'Enter a ID in the record load batch.'
        }
      },
      createBatch: function() {
        return new BatchSales();
      },
      openRedirect: openRedirect,
      openBatchVoid: function(id){
        if (id || id > 0) {
          return new BatchSalesVoid(id);
        } else {
          throw 'Enter a ID in the record load batch.'
        }
      },
      nextBatchVoid: function () {
        return BatchSalesVoid.nextBatchVoid();
      },
      bulkUpdateWithVoidPending: function (selecteds){
        BatchSales.bulkUpdateWithVoidPending(selecteds)
      }

    }

  });

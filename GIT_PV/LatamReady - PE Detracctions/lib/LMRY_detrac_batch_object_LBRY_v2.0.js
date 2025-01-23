/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Name LMRY_detrac_batch_object_LBRY_v2.0.js
 */
/*****************************************************************************
  VERSION 1.0
  27/01/2022 | Richard Galvez | QA : Marisol Cconislla.
  - Now the library has not validate about the entity for line when the journal
    entry is being created.
  VERSION 2.0
  17/02/2022 | Richard galvez
  - Now the decimal amount for line is received, this case is for a Sales
    Detraction.
  26/04/2022 | Pierre Bernaola
  - Change in the storage of where the withdrawals of Peru are saved
  28/04/2022 | Pierre Bernaola
  - Was added Bank Line for Transaction and comission
  VERSION 3.0
  23/05/2022 | Richard Galvez
  - the behavior of the "getTransactionRecord" function had been changed,
    it received two parameters ( transaction , detractionAmount), and return
    and a new object. Also return a new key (_detractionAmount) in the
    response object
  - add the "getPeruCurrency" function
/*****************************************************************************/

define([
    'N/error',
    'N/log',
    'N/runtime',
    'N/record',
    'N/file',
    'N/search',
    'N/format',
    'N/cache',
    'N/redirect',
    'N/render',
    'N/file',
    'N/config'
  ],
  function(error, log, runtime, record, file, search, format, cache, redirect, render, file, config) {

    function _isOneWorld() {
      return runtime.isFeatureInEffect({
        feature: 'SUBSIDIARIES'
      });
    }

    var _type = 'customrecord_lmry_pe_detractions_batch';

    var _status = {
      "0": 'status_0', //Pending
      "1": 'status_1', //Generating Files
      "2": 'status_2', //Files Generared
      "3": 'status_3',
      "4": 'status_4',
      "5": 'status_5',
      "6": 'status_6',
      "7": 'status_7', //Canceled
      "8": 'status_8'
    }

    _statusValue = {
      'PENDING_FILE': "0",
      'GENERATING_FILES': '1',
      'COMPLETE_FILES': '2',
      'PENDING_JOURNAL': '8',
      'GENERATING_JOURNAL': '3',
      'COMPLETE_JOURNAL': '4',
      'ERROR_FILES': '5',
      'ERROR_JOURNAL': '6',
      'CANCELED': '7'

    }

    var cacheRecord = null;

    var _dao = '';


    function createBatch(jsonContext) {

      var _record = record.create({
        type: _type
      });

      for (var x in jsonContext) {
        _record.setValue(x, jsonContext[x]);
      }
      return _record.save();


    }

    function hasNext(type) {

      var filterValue = null;

      if (type == 'file') {

        filterValue = _statusValue.PENDING_FILE;

      } else {

        filterValue = _statusValue.PENDING_JOURNAL;

      }

      var isTrue = false;
      if (filterValue) {

        var resultsearch = search.create({
          type: _type,
          filters: [
            ['custrecord_lmry_pe_det_b_status', 'is', filterValue]
          ],
          columns: [{
            name: 'internalid',
            sort: search.Sort.ASC
          }]
        }).run().getRange(0, 1);

        if (resultsearch.length > 0)
          isTrue = true;

      }

      return isTrue;
    }

    function next(type) {

      var filterValue = null;

      if (type == 'file') {

        filterValue = _statusValue.PENDING_FILE;

      } else {

        filterValue = _statusValue.PENDING_JOURNAL;

      }

      var batchResult = null;
      if (filterValue) {

        var resultsearch = search.create({
          type: _type,
          filters: [
            ['custrecord_lmry_pe_det_b_status', 'is', filterValue]
          ],
          columns: [{
            name: 'internalid',
            sort: search.Sort.ASC
          }]
        }).run().getRange(0, 1);

        if (resultsearch.length > 0)
          batchResult = new batchObject(resultsearch[0].id);

      }

      return batchResult;
    }

    function batchObject(id) {

      this.context = record.load({
        type: _type,
        id: id
      });
      this.id = id;

    }

    batchObject.prototype.getDate = function() {
      return this.context.getValue('custrecord_lmry_pe_det_b_date');
    }

    batchObject.prototype.getBatchNumber = function() {
      return this.context.getValue('custrecord_lmry_pe_det_b_batch');
    }

    batchObject.prototype.getClasification = function() {

      return {
        department: this.context.getValue('custrecord_lmry_pe_det_b_department'),
        class: this.context.getValue('custrecord_lmry_pe_det_b_class'),
        location: this.context.getValue('custrecord_lmry_pe_det_b_location'),
      }

    }

    batchObject.prototype.getTransactions = function() {
      return JSON.parse(this.context.getValue('custrecord_lmry_pe_det_b_vendorbill'));
    }

    batchObject.prototype.getTranscationsByJournal = function() {

      var arrayTrans = this.context.getValue('custrecord_lmry_pe_det_b_vendorbill');

      var limit = 20;

      var count = 0;

      var start = 0;

      var result = [];

      while (limit == 20) {

        var temporalTrans = arrayTrans.slice(start, limit);

        if (temporalTrans.length < 20) {
          limit = temporalTrans.length
        }

        for (var i = 0; i < temporalTrans.length; i++) {

          result.push({
            journal: count,
            transaction: temporalTrans[i]
          });

        }

        count++;
      }

      return result;

    }

    batchObject.prototype.startGenerateFile = function() {

      var id = this.id;

      var sunatFile = this.context.getValue('custrecord_lmry_pe_det_b_sunat_file');
      var bankFile = this.context.getValue('custrecord_lmry_pe_det_b_bank_file');

      this.context.setValue('custrecord_lmry_pe_det_b_sunat_file', "");
      this.context.setValue('custrecord_lmry_pe_det_b_bank_file', "");


      if (sunatFile) {
        file.delete(sunatFile);
      }

      if (bankFile) {
        file.delete(bankFile);
      }

      this.context.setValue('custrecord_lmry_pe_det_b_status',
        _statusValue.GENERATING_FILES);

      this.context.setValue('custrecord_lmry_pe_det_b_details',
        '');

      this.context.setValue('custrecord_lmry_pe_det_b_timestamp',
        '');

      this.context.save();

      this.context = record.load({
        type: _type,
        id: id
      });

    }

    batchObject.prototype.startGenerateJournals = function() {

      var id = this.id;


      this.context.setValue('custrecord_lmry_pe_det_b_status',
        _statusValue.GENERATING_JOURNAL);

      this.context.setValue('custrecord_lmry_pe_det_b_details',
        '');

      this.context.save();

      this.context = record.load({
        type: _type,
        id: id
      });

    }

    batchObject.prototype.completeGenerateFile = function() {

      this.context.setValue('custrecord_lmry_pe_det_b_status',
        _statusValue.COMPLETE_FILES);

      this.context.setValue('custrecord_lmry_pe_det_b_timestamp',
        new Date());

      this.context.save();

    }

    batchObject.prototype.completeGenerateJournal = function(journal) {

      this.context.setValue('custrecord_lmry_pe_det_b_journals',
        journal);

      this.context.setValue('custrecord_lmry_pe_det_b_status',
        _statusValue.COMPLETE_JOURNAL);

      this.context.save();

    }

    batchObject.prototype.attachFiles = function(claveSolFile, bankFile) {

      this.context.setValue('custrecord_lmry_pe_det_b_sunat_file',
        claveSolFile);

      this.context.setValue('custrecord_lmry_pe_det_b_bank_file',
        bankFile);

    }

    batchObject.prototype.createFileError = function(errorString) {

      this.context.setValue('custrecord_lmry_pe_det_b_status',
        _statusValue.ERROR_FILES);

      this.context.setValue('custrecord_lmry_pe_det_b_details', errorString)

      this.context.save();

    }

    batchObject.prototype.createJournalError = function(errorString) {

      this.context.setValue('custrecord_lmry_pe_det_b_status',
        _statusValue.ERROR_JOURNAL);

      this.context.setValue('custrecord_lmry_pe_det_b_details', errorString)

      this.context.save();

    }

    batchObject.prototype.getDepositNumber = function() {
      return this.context.getValue('custrecord_lmry_pe_det_b_number');
    }

    batchObject.prototype.getDate = function() {
      return this.context.getValue('custrecord_lmry_pe_det_b_date');
    }

    batchObject.prototype.getCommission = function() {
      return this.context.getValue('custrecord_lmry_pe_det_b_commission');
    }

    batchObject.prototype.getPeriod = function() {
      return this.context.getValue('custrecord_lmry_pe_det_b_period');
    }

    batchObject.prototype.getNote = function() {
      return this.context.getValue('custrecord_lmry_pe_det_b_note');
    }

    batchObject.prototype.getSubsidary = function() {
      return this.context.getValue('custrecord_lmry_pe_det_b_subsidiary');
    }

    batchObject.prototype.getAccounts = function() {
      var subsidiary = this.context.getValue('custrecord_lmry_pe_det_b_subsidiary');

      var result = {
        commission: '',
        rounding: '',
        roundingCredit: '',
        bank: ''
      };

      search.create({
        type: 'customrecord_lmry_pe_detractions_acc',
        columns: [{
            name: 'internalid',
            sort: search.Sort.ASC
          },
          'custrecord_lmry_det_ac_account_1',
          'custrecord_lmry_det_ac_account_2',
          'custrecord_lmry_det_ac_account_3',
          'custrecord_lmry_det_ac_account_4',
          'custrecord_lmry_pe_detailed_rounding_pur',
          'custrecord_lmry_det_ac_account_5',
        ],
        filters: [
          ['custrecord_lmry_pe_dec_ac_subsi', 'anyof', subsidiary]
        ]
      }).run().each(function(line) {
        result.detraction = line.getValue('custrecord_lmry_det_ac_account_1');
        result.commission = line.getValue('custrecord_lmry_det_ac_account_2');
        result.rounding = line.getValue('custrecord_lmry_det_ac_account_3');
        result.roundingCredit = line.getValue('custrecord_lmry_det_ac_account_5');
        result.bank = line.getValue('custrecord_lmry_det_ac_account_4');
        result.checkDetailedRounding = line.getValue('custrecord_lmry_pe_detailed_rounding_pur');
      });

      return result;
    }


    function recordToJson(recordContext) {

      var jsonResult = {};

      var fields = recordContext.getFields();

      for (var i = 0; i < fields.length; i++) {

        var field = recordContext.getField(fields[i]);

        if (field) {
          var type = field.type;
          var isReadOnly = field.isReadOnly;
          var value = '';
          try {
            if (type != 'inlinehtml' && !isReadOnly) {

              value = recordContext.getText(fields[i]) ?
                recordContext.getText(fields[i]) : recordContext.getValue(fields[i]);

              if (type == 'date' || type == "datetime") {

                value = recordContext.getValue(fields[i]);
                if (value)
                  value = value.toISOString();

              }

              if (type == 'currency' || type == 'integer' || type == 'posfloat') {
                value = recordContext.getValue(fields[i]);
              }
              // if (fields[i] == 'exchangerate') {
              //   value = parseFloat(recordContext.getValue(fields[i]) + "");
              // }

            }
          } catch (err) {

            log.error('field', fields[i]);

          }

          jsonResult[fields[i]] = value;

        }

      }
      return jsonResult;

    }

    function getTransactionRecord(id, amount) {

      var vendorBillRecord = record.load({
        type: 'vendorbill',
        id: id
      });

      var vendorRecord = record.load({
        type: 'vendor',
        id: vendorBillRecord.getValue('entity')
      });

      var jsonBill = recordToJson(vendorBillRecord);

      var jsonVendor = recordToJson(vendorRecord);

      jsonBill['entity'] = jsonVendor;
      jsonBill['_detractionAmount'] = amount;

      return jsonBill;

    }

    function generateSubsidiaryFile(id) {

      var subsidiaryJson = {};

      if (_isOneWorld()) {

        var subsidiaryRecord = record.load({
          type: 'subsidiary',
          id: id
        });

        subsidiaryJson = recordToJson(subsidiaryRecord);

      } else {
        var companyInfo = config.load({
          type: config.Type.COMPANY_INFORMATION
        });
        subsidiaryJson = recordToJson(companyInfo);
        subsidiaryJson.federalidnumber = subsidiaryJson.employerid;

      }

      return subsidiaryJson;

    }

    function generateFormatFile(pre, format, jsonContext) {

      var id = "" + jsonContext.id;
      var textName = jsonContext.subsidiary.federalidnumber;
      // for (var i = id.length; i < 8; i++) {
      //   textName += '0';
      // }

      if (pre == 'CS') {
        textName = 'D' + textName + id + '.txt';
      } else {
        textName = pre + '-D' + textName + id + '.txt';
      }
      var _CONTEXT_RENDER = render.create();

      _CONTEXT_RENDER.templateContent = format;

      var jsonContextTxt = {
        text: JSON.stringify(jsonContext)
      };

      _CONTEXT_RENDER.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: "jsonString",
        data: jsonContextTxt
      });

      var outputFileContent = _CONTEXT_RENDER.renderAsString();

      var folderResponseId = search.create({
        type: 'file',
        columns: ['folder'],
        filters: [
          ['name', 'is', 'detractionSetupFolder.xml']
        ]
      }).run().getRange(0, 1);
      if (folderResponseId.length > 0) {
        folderResponseId = folderResponseId[0].getValue('folder');
      } else {
        folderResponseId = -15;
      }
      return file.create({
        name: textName,
        fileType: file.Type.PLAINTEXT,
        contents: outputFileContent,
        encoding: file.Encoding.UTF8,
        folder: Number(folderResponseId),
      }).save();

    }

    function setCache(id) {
      var bacthCache = cache.getCache({
        name: 'batchCache',
        scope: cache.Scope.PROTECTED
      });
      bacthCache.put({
        key: 'id',
        value: id
      });
    }

    function getCache() {

      var bacthCache = cache.getCache({
        name: 'batchCache',
        scope: cache.Scope.PROTECTED
      });

      var id = bacthCache.get({
        key: 'id',
      });

      bacthCache.remove({
        key: 'id'
      });


      return new batchObject(id);
    }

    function setCacheByJournal(batch, id, number, date) {
      var bacthCache = cache.getCache({
        name: 'batchCacheJournal',
        scope: cache.Scope.PROTECTED
      });
      bacthCache.put({
        key: 'batch',
        value: batch
      });

      bacthCache.put({
        key: 'id',
        value: id
      });
      if (number)
        bacthCache.put({
          key: 'number',
          value: number
        });

      if (date)
        bacthCache.put({
          key: 'date',
          value: date
        });


    }

    function getCacheJournal() {

      var bacthCache = cache.getCache({
        name: 'batchCacheJournal',
        scope: cache.Scope.PROTECTED
      });

      var id = bacthCache.get({
        key: 'id',
      });

      var number = bacthCache.get({
        key: 'number',
      });

      var date = bacthCache.get({
        key: 'date',
      });
      var batch = bacthCache.get({
        key: 'batch',
      });


      return {
        batch: batch,
        journal: id,
        number: number,
        date: date

      }
    }

    function cleanCacheJournal() {
      var bacthCache = cache.getCache({
        name: 'batchCacheJournal',
        scope: cache.Scope.PROTECTED
      });

      bacthCache.remove({
        key: 'id',
      });

      bacthCache.remove({
        key: 'number',
      });

      bacthCache.remove({
        key: 'date',
      });
    }

    function getPeruCurrency() {
      let currency = null;
      search.create({
        type: 'currency',
        columns: ['internalid'],
        filters: [
          ['symbol', 'is', 'PEN']
        ]
      }).run().each((row) => {
        currency = row.getValue('internalid');
        return false
      });
      return currency;

    }

    function getSubsidiaryCurrency(subsidiary) {

      if (_isOneWorld()) {

        var currencyContext = search.lookupFields({
          type: 'subsidiary',
          id: subsidiary,
          columns: ['currency']
        });

        return currencyContext.currency[0].value;
      } else {

        var currencyContext = config.load({
          type: config.Type.COMPANY_INFORMATION
        });

        return currencyContext.getValue('basecurrency');

      }
    }

    function createJournal(journalContext, isSales) {

      log.debug('Flow', isSales ? 'Sale' : 'Purchase');

      function setClasificationValues(currentLine, clasification) {
        currentLine.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'memo',
          value: "-"
        });

        if (clasification.department) {

          currentLine.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'department',
            value: clasification.department
          });
        }

        if (clasification.class) {

          currentLine.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'class',
            value: clasification.class
          });
        }

        if (clasification.location) {

          currentLine.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'location',
            value: clasification.location
          });
        }
      }

      var transactions = getTransactionContent(journalContext.transactions, journalContext.payInformation);

      var numberDeposit = journalContext.number;

      try {
        numberDeposit = JSON.parse(numberDeposit);
      } catch (err) {
        numberDeposit = {};
      }

      var commission = journalContext.commission;

      var date = journalContext.date;

      var period = journalContext.period;

      var subsidiary = journalContext.subsidiary;

      var currency = getPeruCurrency();

      //var detractionsAccount = getWHTTaxCodeAccounts();

      var note = journalContext.note;

      var detracAccount = journalContext.account.detraction;

      var bankAccount = journalContext.account.bank;

      var commissionAccount = journalContext.account.commission;

      var roundingAccount = journalContext.account.rounding;
      var roundingAccountCredit = journalContext.account.roundingCredit;
      var checkDetailedRounding = journalContext.account.checkDetailedRounding;

      var clasification = journalContext.clasification;

      /*--------------------------------------------------------------*/
      var totalRealAmount = 0;
      var totalDecimalAmount = 0;

      var _journal = record.create({
        type: record.Type.JOURNAL_ENTRY,
        isDynamic: true
      });
      //_journal.setValue('customform', 30);

      if (_isOneWorld()) {
        _journal.setValue('subsidiary', subsidiary);
      } else {

        search.create({
          type: 'customrecord_lmry_setup_tax_subsidiary',
          columns: ['custrecord_lmry_setuptax_sub_country']
        }).run().each(function(row) {

          var country = row.getValue('custrecord_lmry_setuptax_sub_country');

          _journal.setValue('custbody_lmry_subsidiary_country', country);

          return false;
        });
      }
      log.debug('currency Journal', currency);

      _journal.setValue('currency', currency);

      _journal.setValue('trandate', date);

      _journal.setValue('postingperiod', period);

      _journal.setValue('memo', note);

      _journal.setValue('custbody_lmry_es_detraccion', true);

      for (var i = 0; i < transactions.length; i++) {

        var amount = transactions[i].amount;

        var entity = transactions[i].entity;

        var id = transactions[i].id;

        var duedate = transactions[i].duedate;

        var transCurrency = transactions[i].currency;

        var RealAmount = parseFloat(amount).toFixed(0);
        
        var DecimalAmount = (amount - RealAmount).toFixed(2);

        if (transactions[i].decimal != '-')
          DecimalAmount = transactions[i].decimal;

          DecimalAmount = parseFloat(DecimalAmount);
        
        //totalRealAmount += parseFloat(parseFloat(amount).toFixed(2));

        // totalRealAmount += parseFloat(RealAmount);

        totalDecimalAmount += parseFloat(DecimalAmount);
        totalDecimalAmount = round2(totalDecimalAmount);

        _journal.selectNewLine('line');

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'account',
          value: detracAccount
        });

        if (isSales == true) {

          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'credit',
            value: RealAmount
          });
        } else {
          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'debit',
            value: RealAmount
          });
        }
        setClasificationValues(_journal, clasification);

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'entity',
          value: entity
        });

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_es_detraccion_masiva',
          value: true
        });
        if (isSales == false) {
          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'custcol_lmry_factura_prov_detraccion',
            value: id
          });
        } else {
          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'custcol_lmry_pe_transaction_reference',
            value: id
          })
        }

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_fecha_detraccion',
          value: duedate
        });

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_numero_detraccion',
          value: numberDeposit[id] ? numberDeposit[id] : ''
        });

        _journal.commitLine({
          sublistId: 'line'
        });

        //BANK LINE

        _journal.selectNewLine('line');

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'account',
          value: bankAccount
        });

        if (isSales == true) {
          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'debit',
            value: RealAmount
          });
        } else {
          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'credit',
            value: RealAmount
          });
        }

        setClasificationValues(_journal, clasification);

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_es_detraccion_masiva',
          value: true
        });

        _journal.commitLine({
          sublistId: 'line'
        });

        if (checkDetailedRounding === "T" || checkDetailedRounding === true) {
          /*--------------------------------------------------------------*
            ROUDING LINE (ROUNDING LINE)
          /*--------------------------------------------------------------*/
          if (DecimalAmount != 0) {
            _journal.selectNewLine('line');

            _journal.setCurrentSublistValue({
              sublistId: 'line',
              fieldId: 'account',
              value: detracAccount
            });

            if (isSales == true) {

              if (DecimalAmount < 0) {
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'debit',
                  value: (-1 * DecimalAmount).toFixed(2)
                });
              } else if (DecimalAmount > 0) {
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'credit',
                  value: (DecimalAmount).toFixed(2)
                });
              }

            } else {

              if (DecimalAmount < 0) {
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'credit',
                  value: (-1 * DecimalAmount).toFixed(2)
                });
              } else if (DecimalAmount > 0) {
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'debit',
                  value: (DecimalAmount).toFixed(2)
                });
              }

            }

            setClasificationValues(_journal, clasification);

            _journal.setCurrentSublistValue({
              sublistId: 'line',
              fieldId: 'custcol_lmry_es_detraccion_masiva',
              value: true
            });

            _journal.setCurrentSublistValue({
              sublistId: 'line',
              fieldId: 'entity',
              value: entity
            });

            _journal.commitLine({
              sublistId: 'line'
            });

            /*--------------------------------------------------------------*
                ROUDING LINE (ROUNDING LINE)
            /*--------------------------------------------------------------*/
            _journal.selectNewLine('line');
            

            if (isSales == true) {

              if (DecimalAmount < 0) {
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'account',
                  value: roundingAccountCredit
                });
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'credit',
                  value: (-1 * DecimalAmount).toFixed(2)
                });
              } else if (DecimalAmount > 0) {
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'account',
                  value: roundingAccount
                });
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'debit',
                  value: (DecimalAmount).toFixed(2)
                });
              }

            } else {

              if (DecimalAmount < 0) {
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'account',
                  value: roundingAccount
                });
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'debit',
                  value: (-1 * DecimalAmount).toFixed(2)
                });
              } else if (DecimalAmount > 0) {
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'account',
                  value: roundingAccountCredit
                });
                _journal.setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'credit',
                  value: (DecimalAmount).toFixed(2)
                });
              }

            }

            setClasificationValues(_journal, clasification);

            _journal.setCurrentSublistValue({
              sublistId: 'line',
              fieldId: 'custcol_lmry_es_detraccion_masiva',
              value: true
            });

            _journal.setCurrentSublistValue({
              sublistId: 'line',
              fieldId: 'entity',
              value: entity
            });

            _journal.commitLine({
              sublistId: 'line'
            });
          }
        }

      }

      log.debug('Transactions Lines', '- End -');

      if (commission) {

        _journal.selectNewLine('line');

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'account',
          value: commissionAccount
        });

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'debit',
          value: commission
        });

        setClasificationValues(_journal, clasification);

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_es_detraccion_masiva',
          value: true
        });

        _journal.commitLine({
          sublistId: 'line'
        });


        //BANK COMISSION

        _journal.selectNewLine('line');

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'account',
          value: bankAccount
        });

        if (isSales == true) {
          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'debit',
            value: commission
          });
        } else {
          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'credit',
            value: commission
          });
        }

        setClasificationValues(_journal, clasification);

        _journal.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_es_detraccion_masiva',
          value: true
        });

        _journal.commitLine({
          sublistId: 'line'
        });

      }

      log.debug('Comission Lines', '- End -');

      /*--------------------------------------------------------------*
          ROUDING LINE (DETRACTION LINE)
      /*--------------------------------------------------------------*/
      if (checkDetailedRounding === "F" || checkDetailedRounding === false){
        if (totalDecimalAmount != 0) {
          _journal.selectNewLine('line');
  
          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'account',
            value: detracAccount
          });
  
          if (isSales == true) {
  
            if (totalDecimalAmount < 0) {
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'debit',
                value: (-1 * totalDecimalAmount).toFixed(2)
              });
            } else if (totalDecimalAmount > 0) {
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'credit',
                value: (totalDecimalAmount).toFixed(2)
              });
            }
  
          } else {
  
            if (totalDecimalAmount < 0) {
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'credit',
                value: (-1 * totalDecimalAmount).toFixed(2)
              });
            } else if (totalDecimalAmount > 0) {
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'debit',
                value: (totalDecimalAmount).toFixed(2)
              });
            }
  
          }
  
          setClasificationValues(_journal, clasification);
  
          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'custcol_lmry_es_detraccion_masiva',
            value: true
          });
  
          _journal.commitLine({
            sublistId: 'line'
          });
  
          /*--------------------------------------------------------------*
              ROUDING LINE (ROUNDING LINE)
          /*--------------------------------------------------------------*/
          _journal.selectNewLine('line');
           
  
          if (isSales == true) {
  
            if (totalDecimalAmount < 0) {
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'account',
                value: roundingAccountCredit
              });
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'credit',
                value: (-1 * totalDecimalAmount).toFixed(2)
              });
            } else if (totalDecimalAmount > 0) {
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'account',
                value: roundingAccount
              });
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'debit',
                value: (totalDecimalAmount).toFixed(2)
              });
            }
  
          } else {
  
            if (totalDecimalAmount < 0) {
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'account',
                value: roundingAccount
              });
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'debit',
                value: (-1 * totalDecimalAmount).toFixed(2)
              });
            } else if (totalDecimalAmount > 0) {
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'account',
                value: roundingAccountCredit
              });
              _journal.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'credit',
                value: (totalDecimalAmount).toFixed(2)
              });
            }
  
          }
  
          setClasificationValues(_journal, clasification);
  
          _journal.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'custcol_lmry_es_detraccion_masiva',
            value: true
          });
  
          _journal.commitLine({
            sublistId: 'line'
          });
        }
      }
      

      log.debug('Rouding Lines', '- End -');

      _journal = _journal.save({
        ignoreMandatoryFields: true
      });

      return _journal;

    }

    function getTransactionContent(transactions, payInformation) {

      var result = [];

      var resultSet = search.create({
        type: 'transaction',
        columns: [{
            name: "internalid",
            summary: "GROUP",
          },
          // {
          //   name: "custrecord_4601_wtc_witaxtype",
          //   join: "CUSTCOL_4601_WITAXCODE",
          //   summary: "GROUP",
          // },
          {
            name: "formulacurrency",
            summary: "SUM",
            formula: "-{custcol_4601_witaxamount}*{exchangerate}",
          },
          {
            name: "mainname",
            summary: "GROUP",
          },
          {
            name: 'trandate',
            summary: 'GROUP'
          },
          {
            name: 'currency',
            summary: 'GROUP'
          },
        ],
        filters: [{
          name: 'taxline',
          operator: 'is',
          values: ['F']
        }, {
          name: 'mainline',
          operator: 'is',
          values: ['F']
        }, {
          name: 'posting',
          operator: 'is',
          values: ['T']
        }, {
          name: 'internalid',
          operator: 'anyof',
          values: transactions
        }]
      }).run().each(function(line) {

        var column = line.columns;

        /*----------------------------------------*/
        var id = line.getValue(column[0]);
        //var detraction = line.getValue(column[1]);
        var detractionAmount = line.getValue(column[1]);
        var entity = line.getValue(column[2]);
        var duedate = line.getValue(column[3]);
        var currency = line.getValue(column[4]);

        var amount = parseFloat(detractionAmount).toFixed(2);
        var decimal = '-';

        if (payInformation) {
          amount = payInformation[id].pay;
          decimal = payInformation[id].decimal;
        }


        result.push({
          id: id,
          entity: entity,
          //detraction: detraction,
          amount: amount,
          decimal: decimal,
          duedate: duedate,
          currency: currency
        });

        return true;

      });

      return result;

    }

    function getWHTTaxCodeAccounts() {

      var wht_type = {};

      var nexus = {};

      search.create({
        type: 'nexus',
        filters: [
          ['country', 'anyof', 'PE']
        ]
      }).run().each(function(line) {
        nexus = line.id;
      });

      if (nexus) {

        var wht_setup = null;

        search.create({
          type: 'customrecord_4601_witaxsetup',
          filters: [
            ['custrecord_4601_wts_nexus', 'equalto', nexus]
          ]
        }).run().each(function(line) {
          wht_setup = line.id;
        });

        if (wht_setup) {
          search.create({
            type: 'customrecord_4601_witaxtype',
            columns: ['custrecord_4601_wtt_purcitem'],
            filters: [
              ['custrecord_4601_wtt_witaxsetup', 'anyof', wht_setup],
              'and',
              ['custrecord_4601_wtt_name', 'is', 'DET']
            ]
          }).run().each(function(line) {

            var acc = search.lookupFields({
              type: 'item',
              id: line.getValue('custrecord_4601_wtt_purcitem'),
              columns: ['expenseaccount']
            });
            log.error(line.id, acc);

            wht_type[line.id] = acc.expenseaccount[0].value;

          });
        }

      }

      return wht_type;

    }

    function updateInvoiceTransaction(id, journal, date, number) {
      record.submitFields({
        type: 'invoice',
        id: id,
        values: {
          'custbody_lmry_reference_transaction': journal,
          'custbody_lmry_num_comprobante_detrac': number,
          'custbody_lmry_doc_detraccion_date': date
        },
        options: {
          disableTriggers: true,
          ignoreMandatoryFields: true
        }
      });
    }

    function updateTransaction(id) {

      var journalContext = getCacheJournal();

      var numbers = {};

      try {

        numbers = JSON.parse(journalContext.number);

      } catch (err) {
        numbers = {};
      }

      var currentNumber = numbers[id] ? numbers[id] : '';

      record.submitFields({
        type: 'vendorbill',
        id: id,
        values: {
          'custbody_lmry_reference_transaction': journalContext.journal,
          'custbody_lmry_num_comprobante_detrac': currentNumber,
          'custbody_lmry_doc_detraccion_date': getBatchJournal().getDate()
        },
        options: {
          disableTriggers: true,
          ignoreMandatoryFields: true
        }
      });

    }

    function getBatchJournal() {

      var journalContext = getCacheJournal();

      return new batchObject(journalContext.batch);
    }

    function openBatchFile(id) {

      record.submitFields({
        type: _type,
        id: id,
        values: {
          'custrecord_lmry_pe_det_b_status': _statusValue.PENDING_FILE
        },
        options: {
          disableTriggers: true,
          ignoreMandatoryFields: true
        }
      });

    }

    function openBatchJournal(id) {

      record.submitFields({
        type: _type,
        id: id,
        values: {
          'custrecord_lmry_pe_det_b_status': _statusValue.PENDING_JOURNAL
        },
        options: {
          disableTriggers: true,
          ignoreMandatoryFields: true
        }
      });

    }

    function deleteJournal(journalId){
      var id = record.delete({
        type: 'journalentry',
        id: journalId
      });

      return id;
    }

    function cancel(id) {

      record.submitFields({
        type: _type,
        id: id,
        values: {
          'custrecord_lmry_pe_det_b_status': _statusValue.CANCELED
        },
        options: {
          disableTriggers: true,
          ignoreMandatoryFields: true
        }
      });
    }

    function reloadPage(id) {
      redirect.toRecord({
        type: _type,
        id: id,
      })
    }

    function round2(num) {
      var e = (num >= 0) ? 1e-6 : -1e-6;
      return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
    }

    return {
      setting: function(dao) {
        _dao = dao;
      },
      setCache: setCache,
      getCache: getCache,
      create: createBatch,
      hasNext: hasNext,
      next: next,
      getTransactionRecord: getTransactionRecord,
      generateFormatFile: generateFormatFile,
      generateSubsidiaryFile: generateSubsidiaryFile,
      setCacheByJournal: setCacheByJournal,
      getCacheJournal: getCacheJournal,
      cleanCacheJournal: cleanCacheJournal,
      createJournal: createJournal,
      deleteJournal: deleteJournal,
      getBatchJournal: getBatchJournal,
      updateTransaction: updateTransaction,
      updateInvoiceTransaction: updateInvoiceTransaction,
      statusType: _status,
      Status: _statusValue,
      openBatchFile: openBatchFile,
      openBatchJournal: openBatchJournal,
      cancel: cancel,
      reloadPage: reloadPage
    }

  });

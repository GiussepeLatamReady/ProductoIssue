/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_TransferenciaIVA_LBRY_V2.0.js               ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jul 05 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */

define(['N/log', 'N/record', 'N/search', 'N/runtime', '../Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', "../Latam_Library/LMRY_Log_LBRY_V2.0"],
  function (log, record, search, runtime, library, lbryLog) {

    var LMRY_script = 'LatamReady - Transferencia IVA LBRY V2.0';
    var TYPE_MAP = {
      'custinvc': 'invoice',
      'vendbill': 'vendorbill',
      'exprept': 'expensereport',
      'custcred': 'creditmemo',
      'vendcred': 'vendorcredit'
    };

    function deleteTransactionIVA(scriptContext) {
      try {
        var recordObj = scriptContext.oldRecord;
        var typeTransaction = recordObj.type;
        var appliedTransactions = {};
        var transactionTypeValidation = ['vendorpayment', 'customerpayment', 'depositapplication', 'customerrefund', 'vendorprepaymentapplication']
        if (transactionTypeValidation.indexOf(typeTransaction) !== -1) {
          appliedTransactions = getAppliedTransactions(recordObj);
        } else if (typeTransaction == "customtransaction_lmry_payment_complemnt") {
          appliedTransactions = getPaymentComplementTransactions(recordObj);
        }

        log.debug("appliedTransactions", JSON.stringify(appliedTransactions));

        var tranKeys = Object.keys(appliedTransactions);
        if (tranKeys.length) {
          //Se busca todas las transacciones pagadas que tienen otros pagos
          var searchGlLines = search.create({
            type: "customrecord_lmry_gl_lines_plug_state",
            filters:
              [
                ["custrecord_lmry_gl_lines_plug_line.internalid", "anyof", tranKeys], "AND",
                ["custrecord_lmry_gl_lines_plug_tran.internalid", "noneof", recordObj.id], "AND",
                ["custrecord_lmry_gl_lines_plug_line.mainline", "is", "T"], "AND",
                ["custrecord_lmry_gl_lines_plug_tran.mainline", "is", "T"]
              ],
            columns:
              [
                search.createColumn({
                  name: "internalid",
                  join: "CUSTRECORD_LMRY_GL_LINES_PLUG_LINE",
                  summary: "GROUP",
                  sort: search.Sort.ASC
                }),
                search.createColumn({
                  name: "internalid",
                  join: "CUSTRECORD_LMRY_GL_LINES_PLUG_TRAN",
                  summary: "GROUP"
                })
              ]
          });

          var glLineIds = [];
          var columns = searchGlLines.columns;
          var results = searchGlLines.run().getRange(0, 1000);
          for (var i = 0; i < results.length; i++) {
            var tranLineId = results[i].getValue(columns[0]);
            glLineIds.push(Number(tranLineId));
          }

          for (var transactionId in appliedTransactions) {
            if (glLineIds.indexOf(Number(transactionId)) == -1) {

              var idTransactionsMX = appliedTransactions[transactionId].idTransactionsMX;
              if (idTransactionsMX.length > 0) {
                for (var i = 0; i < idTransactionsMX.length; i++) {
                  var idTransactionMX = idTransactionsMX[i];
                  record.submitFields({
                    type: 'customrecord_lmry_mx_transaction_fields',
                    id: idTransactionMX,
                    values: { custrecord_lmry_schedule_transfer_of_iva: '2' }
                  });
                }
              }
            }
          }

          deleteRecordGL(recordObj.id);
        }

      } catch (err) {
        log.error('[ deleteTransactionIVA ]', err);
        library.sendemail(' [ deleteTransactionIVA ] ' + err, LMRY_script);
        lbryLog.doLog({ title: "[ deleteTransactionIVA ]", message: err, relatedScript: LMRY_script });
      }
    }


    function afterSubmitTrasladoIva(scriptContext) {
      try {
        var newRecord = scriptContext.newRecord
        var typeTransaction = scriptContext.newRecord.type;

        var idpayment = newRecord.id;
        var account = newRecord.getValue('account');
        if (typeTransaction == "customtransaction_lmry_payment_complemnt") {
          account = newRecord.getValue("custpage_account_bank") || "";
        }
        if (typeTransaction == "vendorprepaymentapplication") {
          account = search.lookupFields({ type: 'vendorprepayment', id: newRecord.getValue('vendorprepayment'), columns: ['account'] }).account[0].value;
        }
        if (typeTransaction == "depositapplication") {
          account = search.lookupFields({ type: 'customerdeposit', id: newRecord.getValue('deposit'), columns: ['account'] }).account[0].value;
        }

        var subsidiary = newRecord.getValue({
          fieldId: 'subsidiary'
        });

        var payment_status = '2';

        var licenses = library.getLicenses(subsidiary);
        var IvabyCode = library.getAuthorization(914, licenses);
        var IvabySubtype = library.getAuthorization(671, licenses);

        if (verificarSetupTax(subsidiary, typeTransaction) == false && !IvabyCode && !IvabySubtype) {
          payment_status = '9'; //error de configuracion
        }

        if (verificarCuentasExentas(account) == true) {
          payment_status = '3'; //error por cuenta excluida
        }

        if (payment_status == '9'/* || payment_status == '3'*/) {
          if (typeTransaction == 'depositapplication') {
            var objRecord = record.load({
              type: typeTransaction,
              id: idpayment,
            });

            objRecord.setValue({
              fieldId: 'custbody_lmry_schedule_transfer_of_iva',
              value: payment_status
            });

            objRecord.save({
              enableSourcing: true,
              ignoreMandatoryFields: true,
              disableTriggers: true
            })

          } else {
            record.submitFields({
              type: typeTransaction,
              id: idpayment,
              values: { 'custbody_lmry_schedule_transfer_of_iva': payment_status },
              options: {
                enableSourcing: true,
                ignoreMandatoryFields: true,
                disableTriggers: true
              }
            });
          }

          return true;
        }

        if (scriptContext.type == 'edit') {
          deleteRecordGL(idpayment);
        }

        var memo = "Latam - IVA Transference";
        var memobycode = "Latam - IVA Tax transference";
        var search_lines = search.create({
          type: typeTransaction,
          filters:
            [
              ["internalid", "anyof", idpayment], "AND",
              [
                ["memo", "startswith", memo], "OR",
                ["memo", "startswith", memobycode]
              ]
            ],
          columns:
            [
              search.createColumn({ name: "internalid", summary: "GROUP" }),
              //search.createColumn({ name: "accountingbook", join: "accountingTransaction", summary: "GROUP"}),
              search.createColumn({ name: "memo", summary: "GROUP" })
            ]
        });

        var glLineIds = [];
        var columns = search_lines.columns;

        var results = search_lines.run().getRange(0, 1000);
        for (var i = 0; i < results.length; i++) {
          var memoLine = results[i].getValue(columns[1]) || "";
          var matches = memoLine.trim().match(/ID: (\d+)\)/);
          if (matches && matches.length) {
            var transactionId = matches[1];
            if (transactionId) {
              glLineIds.push(Number(transactionId));
            }
          }
        }

        log.debug("glLineIds", JSON.stringify(glLineIds));

        var appliedTransactions = {};
        var transactionTypeValidation = ['vendorpayment', 'customerpayment', 'depositapplication', 'customerrefund', 'vendorprepaymentapplication']
        if (transactionTypeValidation.indexOf(typeTransaction) !== -1) {
          appliedTransactions = getAppliedTransactions(newRecord);
        } else if (typeTransaction == "customtransaction_lmry_payment_complemnt") {
          appliedTransactions = getPaymentComplementTransactions(newRecord);
        }

        log.debug("appliedTransactions", JSON.stringify(appliedTransactions));

        var someIVA = false;
        for (var transactionId in appliedTransactions) {
          var statusLine = "4";
          if (glLineIds.indexOf(Number(transactionId)) != -1) {
            statusLine = "1";
            someIVA = true;
          }
          if (payment_status == "3") {
            statusLine = "3";
          }

          log.debug("statusLine", statusLine);
          var idTransactionsMX = appliedTransactions[transactionId].idTransactionsMX;
          log.debug('idTransactionsMX', { 'idTransactionsMX': idTransactionsMX });
          if (idTransactionsMX.length > 0) {
            for (var i = 0; i < idTransactionsMX.length; i++) {
              record.submitFields({
                type: 'customrecord_lmry_mx_transaction_fields',
                id: idTransactionsMX[i],
                values: { custrecord_lmry_schedule_transfer_of_iva: statusLine },
                options: {
                  enableSourcing: true,
                  ignoreMandatoryFields: true,
                  disableTriggers: true
                }
              });
            }
          }
          addRecordGL(idpayment, transactionId, statusLine);
        }

        if (someIVA) {
          payment_status = "1";
        }

        if (typeTransaction == 'depositapplication') {
          var objRecord = record.load({
            type: typeTransaction,
            id: idpayment,
          });

          objRecord.setValue({
            fieldId: 'custbody_lmry_schedule_transfer_of_iva',
            value: payment_status
          });

          objRecord.save({
            enableSourcing: true,
            ignoreMandatoryFields: true,
            disableTriggers: true
          })

        } else {

          record.submitFields({
            type: typeTransaction,
            id: idpayment,
            values: { 'custbody_lmry_schedule_transfer_of_iva': payment_status },
            options: {
              enableSourcing: true,
              ignoreMandatoryFields: true,
              disableTriggers: true
            }
          });
        }
      } catch (err) {
        log.error('[ afterSubmitTrasladoIva ]', err);
        library.sendemail(' [ afterSubmitTrasladoIva ] ' + err, LMRY_script);
        lbryLog.doLog({ title: "[ afterSubmitTrasladoIva ]", message: err, relatedScript: LMRY_script });
      }
    }


    function verificarCuentasExentas(account) {
      if (account) {
        var search_no_account = search.create({
          type: 'customrecord_lmry_account_no_transferiva',
          filters: [
            ['custrecord_lmry_account_no_transferiva', 'anyof', account], 'AND',
            ['isinactive', 'is', 'F']
          ],
          columns: [search.createColumn({ name: "internalid" })]
        });

        var results = search_no_account.run().getRange(0, 10);
        if (results && results.length) {
          return true;
        }
      }

      return false;
    }


    function verificarSetupTax(subsidiary, typeTransaction) {
      var search_setup_tx = search.create({
        type: 'customrecord_lmry_setup_tax_subsidiary',
        filters: [
          ['isinactive', 'is', 'F'], 'AND',
          ['custrecord_lmry_setuptax_subsidiary', 'is', subsidiary]
        ],
        columns: [
          'custrecord_lmry_setuptax_iva_debitpurch',
          'custrecord_lmry_setuptax_iva_creditpurch',
          'custrecord_lmry_setuptax_iva_earningpurc',
          'custrecord_lmry_setuptax_iva_deficitpurc',
          'custrecord_lmry_setuptax_iva_debitsales',
          'custrecord_lmry_setuptax_iva_creditsales',
          'custrecord_lmry_setuptax_iva_earningsale',
          'custrecord_lmry_setuptax_iva_deficitsale'
        ]
      });

      var setup_txs = search_setup_tx.run().getRange(0, 100);
      if (setup_txs && setup_txs.length) {
        var accountDebit = setup_txs[0].getValue("custrecord_lmry_setuptax_iva_debitpurch");
        var accountCredit = setup_txs[0].getValue("custrecord_lmry_setuptax_iva_creditpurch");
        var accEarningSetup = setup_txs[0].getValue("custrecord_lmry_setuptax_iva_earningpurc");
        var accDeficitSetup = setup_txs[0].getValue("custrecord_lmry_setuptax_iva_deficitpurc");

        log.error('typeTransaction', typeTransaction);

        if (typeTransaction == 'customerpayment' || typeTransaction == 'depositapplication' || typeTransaction == 'customerrefund') {
          accountDebit = setup_txs[0].getValue("custrecord_lmry_setuptax_iva_debitsales");
          accountCredit = setup_txs[0].getValue("custrecord_lmry_setuptax_iva_creditsales");
          accEarningSetup = setup_txs[0].getValue("custrecord_lmry_setuptax_iva_earningsale");
          accDeficitSetup = setup_txs[0].getValue("custrecord_lmry_setuptax_iva_deficitsale");
        }

        if (accountDebit && accountCredit && accEarningSetup && accDeficitSetup) {
          return true
        } else {
          return false;
        }
      }
      else {
        return false;
      }
    }


    function deleteRecordGL(idTransaction) {
      var log_search = search.create({
        type: 'customrecord_lmry_gl_lines_plug_state',
        filters: [
          ["custrecord_lmry_gl_lines_plug_tran", "is", idTransaction]
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
        ]
      });

      var log_gls = log_search.run().getRange(0, 1000);

      for (var i = 0; i < log_gls.length; i++) {
        var id_log = log_gls[i].getValue('internalid');
        record.delete({
          type: 'customrecord_lmry_gl_lines_plug_state',
          id: id_log,
        });
      }
    }

    function addRecordGL(idTransaction, idline, statusLine) {
      var newloggl = record.create({
        type: 'customrecord_lmry_gl_lines_plug_state',
        isDynamic: false
      });

      newloggl.setValue('custrecord_lmry_gl_lines_plug_tran', idTransaction);
      newloggl.setValue('custrecord_lmry_gl_lines_plug_line', idline);
      newloggl.setValue('custrecord_lmry_gl_lines_plug_stat', statusLine);
      //newloggl.setValue('custrecord_lmry_gl_lines_plug_book', bookLine);
      newloggl.setValue('custrecord_lmry_gl_lines_plug_schdl', '2');
      newloggl.save(true, true);
    }

    function getAppliedTransactions(recordObj) {

      var sublistType = (recordObj.type == 'vendorprepaymentapplication') ? 'bill' : 'apply';

      var transactions = {};
      for (var i = 0; i < recordObj.getLineCount({ sublistId: sublistType }); i++) {
        var transactionId = recordObj.getSublistValue({ sublistId: sublistType, fieldId: 'doc', line: i });
        transactionId = String(transactionId);
        var type = recordObj.getSublistValue({ sublistId: sublistType, fieldId: 'trantype', line: i }) || "";
        type = type.toLowerCase();
        var isApplied = recordObj.getSublistValue({ sublistId: sublistType, fieldId: 'apply', line: i });
        if ((isApplied == true || isApplied == 'T') && TYPE_MAP.hasOwnProperty(type)) {
          transactions[transactionId] = {
            transactionId: transactionId,
            type: TYPE_MAP[type],
            idTransactionsMX: []
          }
        }
      }

      transactions = getTransactionMX(transactions);

      return transactions;
    }

    function getPaymentComplementTransactions(recordObj) {
      var transactions = {};
      var billSublistId = "recmachcustrecord_lmry_factoring_rel_pymnt_vend";
      for (var i = 0; i < recordObj.getLineCount(billSublistId); i++) {
        var billId = recordObj.getSublistValue({ sublistId: billSublistId, fieldId: "custrecord_lmry_factoring_related_bill", line: i });
        var isApplied = recordObj.getSublistValue({ sublistId: billSublistId, fieldId: "custrecord_lmry_factoring_apply_bill", line: i });
        if (isApplied) {
          transactions[billId] = {
            transactionId: billId,
            type: "vendorbill",
            idTransactionsMX: []
          };
        }
      }

      var invoiceSublistId = "recmachcustrecord_lmry_factoring_rel_pymnt_cust";
      for (var i = 0; i < recordObj.getLineCount(invoiceSublistId); i++) {
        var invoiceId = recordObj.getSublistValue({ sublistId: invoiceSublistId, fieldId: "custrecord_lmry_factoring_related_invoic", line: i });
        var isApplied = recordObj.getSublistValue({ sublistId: invoiceSublistId, fieldId: "custrecord_lmry_factoring_apply_invoice", line: i });
        if (isApplied) {
          transactions[invoiceId] = {
            transactionId: invoiceId,
            type: "invoice",
            idTransactionsMX: []
          };
        }
      }

      transactions = getTransactionMX(transactions);

      return transactions;
    }

    /**
     *  Agregado Nueva Lógica: setear el campo del LATAM - MX PROCESADO POR TRASLADO DE IVA  
     *  en el record MX Transaction Fields no en la transacción origen(Invoice,Bill,Report o Credit Memo(NuevaLógica) )
     *  Desarrollador: Rafael Mendoza
     *  Fecha: 01/12/21
     */

    function getTransactionMX(transactions) {

      var transactionIds = [];
      for (var key in transactions) {
        if (transactions.hasOwnProperty(key)) {
          transactionIds.push(key);
        }
      }

      log.debug('transactionIds', transactionIds);
      if (transactionIds.length == 0) return transactions;

      var searchTransactionMX = search.create({
        type: 'customrecord_lmry_mx_transaction_fields',
        filters:
          [
            ['custrecord_lmry_mx_transaction_related', 'anyof', transactionIds]
          ],
        columns: [
          search.createColumn({ name: "id" }),
          search.createColumn({ name: "custrecord_lmry_mx_transaction_related" })
        ]
      });

      searchTransactionMX.run().each(function (result) {
        var idTransactionMX = result.getValue('id');
        var idTransaction = result.getValue('custrecord_lmry_mx_transaction_related');
        if (transactions.hasOwnProperty(idTransaction)) {
          transactions[idTransaction]['idTransactionsMX'].push(idTransactionMX);
        }
        return true;
      });

      return transactions;
    }

    return {
      deleteTransactionIVA: deleteTransactionIVA,
      afterSubmitTrasladoIva: afterSubmitTrasladoIva
    };

  });
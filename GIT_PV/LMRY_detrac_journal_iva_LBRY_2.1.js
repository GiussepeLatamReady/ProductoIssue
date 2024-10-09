/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Name LMRY_detrac_journal_iva_LBRY_2.1.js
 */

define([
  'N',
  'require'
], (
  N,
  require
) => {

  const { log, record, runtime, search, format } = N;

  function isActiveFeatureIVARedirect(subsidiary) {
    let licenses = null;
    let SendEmailLbry = null;

    try {
      require(['/SuiteBundles/Bundle 37714/Latam_Library/LMRY_libSendingEmailsLBRY_V2.0.js'], (sendEmail) => {
        SendEmailLbry = sendEmail;
      });
    } catch (e) {
      require(['/SuiteBundles/Bundle 35754/Latam_Library/LMRY_libSendingEmailsLBRY_V2.0.js'], (sendEmail) => {
        SendEmailLbry = sendEmail;
      });
    }

    licenses = SendEmailLbry.getLicenses(subsidiary);
    return SendEmailLbry.getAuthorization(503, licenses);
  }

  function getAccountIVA(subsidiary) {
    var account = 0;
    try {
      var billSearchObj = search.create({
        type: "customrecord_lmry_setup_tax_subsidiary",
        filters: [
          ["custrecord_lmry_setuptax_subsidiary", "is", subsidiary],
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: ['custrecord_lmry_setuptax_pe_vat_account']
      });
      billSearchObj = billSearchObj.run().getRange(0, 1000);

      if (billSearchObj != null && billSearchObj != '') {
        account = billSearchObj[0].getValue('custrecord_lmry_setuptax_pe_vat_account');
      }
    } catch (error) {
      log.error('error', error);
    }
    return account;
  }

  function transferIva(billID, ivaAccount, subsidiary, fecha_detraccion) {
    try {
      let featureOW = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
      var billSearchObj = search.create({
        type: "vendorbill",
        filters: [
          ["internalid", "is", billID],
          "AND",
          ["mainline", "is", "F"],
          "AND",
          ["taxline", "is", "T"]
        ],
        columns: ['internalid', 'account', 'debitfxamount', 'currency', 'exchangerate', 'custbody_lmry_concepto_detraccion']
      });
      billSearchObj = billSearchObj.run().getRange(0, 1000);

      if (billSearchObj != null && billSearchObj != '') {
        var featureAprove = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
        var concepDetr = billSearchObj[0].getValue('custbody_lmry_concepto_detraccion');
        if (concepDetr != null && concepDetr != '' && concepDetr != 12) {
          var newJournal = record.create({
            type: record.Type.JOURNAL_ENTRY
          });

          if (featureOW && subsidiary) {
            newJournal.setValue('subsidiary', subsidiary);
          }
          if (fecha_detraccion) {
            var fecha = format.parse({ value: fecha_detraccion, type: format.Type.DATE });
            newJournal.setValue('trandate', fecha);
          }
          if (billID) {
            newJournal.setValue('custbody_lmry_reference_transaction', billID);
            newJournal.setValue('custbody_lmry_reference_transaction_id', billID);
          }
          newJournal.setValue('custbody_lmry_es_detraccion', false);
          if (featureAprove == 'T' || featureAprove == true) {
            newJournal.setValue('approvalstatus', 2);
          }
          newJournal.setValue('currency', billSearchObj[0].getValue('currency'));
          newJournal.setValue('exchangerate', billSearchObj[0].getValue('exchangerate'));
          newJournal.setValue('memo', 'Traslado de IVA - Bill ID: ' + billID);

          var linejournal = 0;
          for (var i = 0; i < billSearchObj.length; i++) {
            var debitfxamount = billSearchObj[i].getValue('debitfxamount');
            if (debitfxamount) {
              // Line from
              newJournal.setSublistValue('line', 'account', linejournal, billSearchObj[i].getValue('account'));
              newJournal.setSublistValue('line', 'credit', linejournal, debitfxamount);
              newJournal.setSublistValue('line', 'memo', linejournal, 'Tax amount redirect');
              newJournal.setSublistValue('line', 'custcol_lmry_es_detraccion_masiva', linejournal, false);
              // Line to
              newJournal.setSublistValue('line', 'account', linejournal + 1, ivaAccount);
              newJournal.setSublistValue('line', 'debit', linejournal + 1, debitfxamount);
              newJournal.setSublistValue('line', 'memo', linejournal + 1, 'Tax amount redirect');
              newJournal.setSublistValue('line', 'custcol_lmry_es_detraccion_masiva', linejournal + 1, false);
              linejournal += 2;
            }

          }

          if (linejournal != 0) {
            newJournal.save({
              enableSourcing: true,
              ignoreMandatoryFields: true,
              dissableTriggers: true
            });
          }

        }

      }
    } catch (error) {
      log.error('error', error);
    }
    return true;
  }

  function updateProcessed(journalId, subsidiary){
    if(!isActiveFeatureIVARedirect(subsidiary)) return false;
    if(!getAccountIVA(subsidiary)) return false;

    let asientoDiario = record.load({ type: record.Type.JOURNAL_ENTRY, id: journalId, isDynamic: true });
    asientoDiario.setValue('custbody_lmry_estado_detraccion', 'Procesado');

    let lineas = asientoDiario.getLineCount('line');
    for (let i = 0; i < lineas; i++) {
        asientoDiario.selectLine({ sublistId: 'line', line: i });
        asientoDiario.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_lmry_es_detraccion_masiva', value: false });
        asientoDiario.commitLine({ sublistId: 'line' });
    }

    return asientoDiario.save({
        enableSourcing: true,
        ignoreMandatoryFields: true,
        disableTriggers: true
    });
  }

  function executeJournalIVA({
    subsidiary,
    billID,
    fecha_detraccion
  }) {
    if (isActiveFeatureIVARedirect(subsidiary)) {
      var ivaAccount = getAccountIVA(subsidiary);
      if (ivaAccount) {
        transferIva(billID, ivaAccount, subsidiary, fecha_detraccion);
      }
    }
  }

  return {
    executeJournalIVA,
    updateProcessed
  };

})
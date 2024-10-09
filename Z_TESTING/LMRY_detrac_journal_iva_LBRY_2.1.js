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
    let account = 0;
    try {
      let billSearchObj = search.create({
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
      transferIgv(subsidiary,billID,fecha_detraccion); 
    }
  }


  const getLines = billID => {
    const recordLoad = record.load({ type: "vendorbill", id: billID });
    const jsonLines = {};
    const itemsLines = recordLoad.getLineCount({ sublistId: 'item' });

    for (let i = 0; i < itemsLines; i++) {
      const lineuniquekey = recordLoad.getSublistValue({ sublistId: 'item', fieldId: "lineuniquekey", line: i });

      if (!jsonLines[lineuniquekey]) {
        const [iditem, department, location, _class, taxcode, taxamount] = [
          "item", "department", "location", "class", "taxcode", "tax1amt"
        ].map(fieldId => recordLoad.getSublistValue({ sublistId: 'item', fieldId, line: i }));

        jsonLines[lineuniquekey] = {
          department,
          location,
          class: _class,
          taxcode,
          debitamount: Number(taxamount),
          item: iditem
        };
      }
    }
    return jsonLines;
  };

  const groupLines = (jsonLines, setupTaxSubsidiary) => {

    let departmentMandatory = runtime.getCurrentUser().getPreference({ name: "DEPTMANDATORY" });
    let classMandatory = runtime.getCurrentUser().getPreference({ name: "CLASSMANDATORY" });
    let locationMandatory = runtime.getCurrentUser().getPreference({ name: "LOCMANDATORY" });

    let groupTaxcode = {};

    // Agrupar las líneas por código de impuestos
    for (let lineuniquekey in jsonLines) {
      let item = jsonLines[lineuniquekey];
      let key = item.taxcode;
      if (!groupTaxcode[key]) {
        groupTaxcode[key] = item;
      } else {
        groupTaxcode[key].debitamount += item.debitamount;
      }
    }

    // Asignar valores de departamento, clase y ubicación
    let groupedLines = [];
    for (let key in groupTaxcode) {
      if (departmentMandatory == true || departmentMandatory == "T") {
        if (setupTaxSubsidiary.department) {
          groupTaxcode[key]["department"] = setupTaxSubsidiary.department;
        }
      } else {
        groupTaxcode[key]["department"] = "";
      }
      if (classMandatory == true || classMandatory == "T") {
        if (setupTaxSubsidiary.class) {
          groupTaxcode[key]["class"] = setupTaxSubsidiary.class;
        }
      } else {
        groupTaxcode[key]["class"] = "";
      }
      if (locationMandatory == true || locationMandatory == "T") {
        if (setupTaxSubsidiary.location) {
          groupTaxcode[key]["location"] = setupTaxSubsidiary.location;
        }
      } else {
        groupTaxcode[key]["location"] = "";
      }
      groupedLines.push(groupTaxcode[key]);
    }

    return groupedLines;
  }


  const joinDetailsLines = (groupedLines, billID) => {
    const taxlineDetail = {};

    const billSearchObj = search.create({
      type: "vendorbill",
      filters: [
        ["internalid", "is", billID],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["taxline", "is", "T"]
      ],
      columns: [
        'internalid',
        'account',
        'currency',
        'exchangerate',
        'custbody_lmry_concepto_detraccion',
        'item'
      ]
    });

    billSearchObj.run().each(result => {
      const taxcodeID = result.getValue('item');
      if (!taxlineDetail[taxcodeID]) {
        taxlineDetail[taxcodeID] = {
          account: result.getValue('account'),
          concept_detraction: result.getValue('custbody_lmry_concepto_detraccion'),
          currency: result.getValue('currency'),
          exchangerate: result.getValue('exchangerate')
        };
      }
      return true;
    });

    // Asignar los detalles a las líneas agrupadas
    groupedLines.forEach(line => {
      const taxcodeID = line.taxcode;
      const details = taxlineDetail[taxcodeID] || {};

      line.account = details.account || '';
      line.concept_detraction = details.concept_detraction || '';
      line.currency = details.currency || '';
      line.exchangerate = details.exchangerate || '';
    });

    return groupedLines;
  };

  const createJournalTransferIgv = (groupedLines, subsidiary, detractionDate, billID, accountIva) => {
    const featureAprove = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });
    const concepDetraction = groupedLines[0]?.concept_detraction;

    if (concepDetraction && concepDetraction != 12) {
      const newJournal = record.create({ type: record.Type.JOURNAL_ENTRY });
      let featureOW = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" })
      if (featureOW && subsidiary) newJournal.setValue('subsidiary', subsidiary);

      if (detractionDate) {
        const detractionDateFormat = format.parse({ value: detractionDate, type: format.Type.DATE });
        newJournal.setValue('trandate', detractionDateFormat);
      }

      if (billID) {
        newJournal.setValue('custbody_lmry_reference_transaction', billID);
        newJournal.setValue('custbody_lmry_reference_transaction_id', billID);
      }

      newJournal.setValue('custbody_lmry_es_detraccion', false);

      if (featureAprove === 'T' || featureAprove === true) {
        newJournal.setValue('approvalstatus', 2);
      }

      newJournal.setValue('currency', groupedLines[0].currency);
      newJournal.setValue('exchangerate', groupedLines[0].exchangerate);
      newJournal.setValue('memo', `Traslado de IVA - Bill ID: ${billID}`);

      let linejournal = 0;

      groupedLines.forEach(line => {
        const debitfxamount = line.debitamount;

        if (debitfxamount) {
          const { department, class: _class, location } = line;

          // Line from
          newJournal.setSublistValue('line', 'account', linejournal, line.account);
          newJournal.setSublistValue('line', 'credit', linejournal, debitfxamount.toFixed(2));
          newJournal.setSublistValue('line', 'memo', linejournal, 'Tax amount redirect');
          newJournal.setSublistValue('line', 'custcol_lmry_es_detraccion_masiva', linejournal, false);

          if (department) newJournal.setSublistValue('line', 'department', linejournal, department);
          if (_class) newJournal.setSublistValue('line', 'class', linejournal, _class);
          if (location) newJournal.setSublistValue('line', 'location', linejournal, location);

          // Line to
          newJournal.setSublistValue('line', 'account', linejournal + 1, accountIva);
          newJournal.setSublistValue('line', 'debit', linejournal + 1, debitfxamount.toFixed(2));
          newJournal.setSublistValue('line', 'memo', linejournal + 1, 'Tax amount redirect');
          newJournal.setSublistValue('line', 'custcol_lmry_es_detraccion_masiva', linejournal + 1, false);

          if (department) newJournal.setSublistValue('line', 'department', linejournal + 1, department);
          if (_class) newJournal.setSublistValue('line', 'class', linejournal + 1, _class);
          if (location) newJournal.setSublistValue('line', 'location', linejournal + 1, location);

          linejournal += 2;
        }
      });

      if (linejournal !== 0) {


        const idJournal = newJournal.save({
          enableSourcing: true,
          ignoreMandatoryFields: true,
          dissableTriggers: true
        });
        log.error("idJournal create",idJournal)
      }
    }
  };

  const transferIgv = (subsidiary, billID, detractionDate) => {
    const setupTaxSubsidiary = getSetupTaxSubsidiary(subsidiary);
    log.error("setupTaxSubsidiary",setupTaxSubsidiary)
    const accountIva = setupTaxSubsidiary?.accountIva;

    if (!accountIva) return false;

    const transactionLines = getLines(billID);
    log.error("transactionLines",transactionLines)
    let groupedLines = groupLines(transactionLines, setupTaxSubsidiary);
    log.error("groupedLines",groupedLines)
    groupedLines = joinDetailsLines(groupedLines, billID);
    log.error("joinDetailsLines",groupedLines)
    createJournalTransferIgv(groupedLines, subsidiary, detractionDate, billID, accountIva);
  };

  const getSetupTaxSubsidiary = (subsidiary) => {
    let setupTaxSubsidiary = {};
    let setuptaxSearch = search.create({
        type: "customrecord_lmry_setup_tax_subsidiary",
        filters: [
            ["custrecord_lmry_setuptax_subsidiary", "is", subsidiary],
            "AND",
            ["isinactive", "is", "F"]
        ],
        columns: [
            'custrecord_lmry_setuptax_department',
            'custrecord_lmry_setuptax_class',
            'custrecord_lmry_setuptax_location',
            'custrecord_lmry_setuptax_pe_vat_account',
        ]
    });
    let resultSetupTax = setuptaxSearch.run().getRange(0, 1000);

    if (resultSetupTax && resultSetupTax.length) {
        setupTaxSubsidiary["department"] = resultSetupTax[0].getValue('custrecord_lmry_setuptax_department');
        setupTaxSubsidiary["class"] = resultSetupTax[0].getValue('custrecord_lmry_setuptax_class');
        setupTaxSubsidiary["location"] = resultSetupTax[0].getValue('custrecord_lmry_setuptax_location');
        setupTaxSubsidiary["accountIva"] = resultSetupTax[0].getValue('custrecord_lmry_setuptax_pe_vat_account');
    }
    return setupTaxSubsidiary;
}

  return {
    executeJournalIVA,
    updateProcessed
  };

})
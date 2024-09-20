function iteracionBill(jsonLog, currentLog, jsonTaxRecord) {

   let bills = [], billsAux = [];
   let payments = jsonLog[currentLog]['payments'].split('|');

   for (let i = 0; i < payments.length - 1; i++) {
       let auxBill = payments[i].split(';');
       //0:bill ID, 1:total, 2:amount due, 3:payment amount, 4:total de Invoice, 5:num.Installment, 6:mora, 7:interes, 8:anticipo, 9:es primer pago

       let numeroInstallment = auxBill[5];

       if (jsonLog[currentLog]['multaeinteres'][auxBill[0]] == null || jsonLog[currentLog]['multaeinteres'][auxBill[0]] == undefined) {
           jsonLog[currentLog]['multaeinteres'][auxBill[0]] = {};
           jsonLog[currentLog]['truepercent'][auxBill[0]] = {};
           jsonLog[currentLog]['percent'][auxBill[0]] = {};
           jsonLog[currentLog]['newbills'][auxBill[0]] = {};
           //jsonLog[currentLog]['advance'][auxBill[0]] = {};
           jsonLog[currentLog]['primerpago'][auxBill[0]] = {};
           jsonLog[currentLog]['percentjournal'][auxBill[0]] = {};
           //jsonLog[currentLog]['bills'][auxBill[0]] = [0,0,0,0];

           bills.push(auxBill[0]);
           billsAux.push(auxBill[0]);

       }

       jsonLog[currentLog]['bills'][auxBill[0]] = [];

       jsonLog[currentLog]['primerpago'][auxBill[0]][numeroInstallment] = auxBill[9];
       jsonLog[currentLog]['multaeinteres'][auxBill[0]][numeroInstallment] = [auxBill[6], auxBill[7]];
       jsonLog[currentLog]['truepercent'][auxBill[0]][numeroInstallment] = parseFloat(auxBill[3]) / parseFloat(auxBill[4]);
       jsonLog[currentLog]['percent'][auxBill[0]][numeroInstallment] = parseFloat(auxBill[3]) / parseFloat(auxBill[1]);

       if (auxBill[9] == 'T' && jsonLog[currentLog]['process'] == 'Individual' && parseFloat(auxBill[8]) > 0) {
           auxBill[3] = parseFloat(auxBill[3]) + parseFloat(auxBill[8]);
       }

       jsonLog[currentLog]['newbills'][auxBill[0]][numeroInstallment] = [auxBill[1], auxBill[2], auxBill[3], auxBill[5]];
       jsonLog[currentLog]['percentjournal'][auxBill[0]][numeroInstallment] = parseFloat(auxBill[3]) / parseFloat(auxBill[4]);

   }

   log.debug('bills', bills);
   jsonLog[currentLog]['primerb'] = bills[0];

   // Busqueda de Bill Credit Aplicados
   let appliedLinesList = [];
   let appliedLines = {};
   let entitiesByBill = {};
   let retentionObj = search.create({
       type: "transaction",
       filters: [
           ["appliedtotransaction", "anyof", bills]
       ],
       columns: [
           search.createColumn({ name: "internalid", label: "Internal ID" }),
           search.createColumn({ name: "appliedtotransaction", label: "Applied To Transaction" }),
           search.createColumn({ name: "entity", join: "appliedtotransaction", label: "Name" })
       ]
   }).runPaged({ pageSize: 1000 });

   if (retentionObj) {
       retentionObj.pageRanges.forEach(function (pageRange) {
           let page = retentionObj.fetch({ index: pageRange.index });
           let results = page.data;
           if (results) {
               for (let i = 0; i < results.length; i++) {
                   appliedLinesList.push(results[i].getValue('internalid'));
                   appliedLines[results[i].getValue('internalid')] = results[i].getValue('appliedtotransaction');
                   entitiesByBill[results[i].getValue('appliedtotransaction')] = results[i].getValue({ name: 'entity', join: 'appliedtotransaction' });
               }
           }
       });
   }
   log.debug('appliedLinesList', appliedLinesList);
   log.debug('appliedLines', appliedLines);
   log.debug('entitiesByBill', entitiesByBill);

   // Caso no haya Retenciones aplicadas
   if (!appliedLinesList.length) {
       jsonLog[currentLog]['journal'] = {};
       log.debug('jsonLog after', JSON.stringify(jsonLog));
       return jsonLog;
   }

   // Busqueda de Lineas del Bill Credit Aplicado
   let creditLines = {};
   let creditObj = search.create({
       type: "transaction",
       filters: [
           ["mainline", "is", "F"],
           "AND",
           ["shipping", "is", "F"],
           "AND",
           ["taxline", "is", "F"],
           "AND",
           ["cogs", "is", "F"],
           "AND",
           ["item", "noneof", "@NONE@"],
           "AND",
           ["internalid", "anyof", appliedLinesList]
       ],
       columns: [
           search.createColumn({ name: "internalid", label: "Internal ID" }),
           search.createColumn({ name: "item", label: "Item" }),
           search.createColumn({ name: "account", label: "Account" }),
           search.createColumn({ name: "fxamount", label: "Amount (Foreign Currency)" }),
           search.createColumn({ name: "lineuniquekey", label: "Line Unique Key" }),
           search.createColumn({ name: "memo", label: "Memo" })
       ]
   }).runPaged({ pageSize: 1000 });

   if (creditObj) {
       creditObj.pageRanges.forEach(function (pageRange) {
           let page = creditObj.fetch({ index: pageRange.index });
           let results = page.data;
           if (results) {
               for (let i = 0; i < results.length; i++) {
                   //let id = results[i].getValue('internalid');
                   let subtype = results[i].getValue('memo') ? results[i].getValue('memo').split(" ")[0] : "";
                   let key = [results[i].getValue('item'), Math.abs(results[i].getValue('fxamount')), subtype].join(';');
                   if (!creditLines[key]) {
                       creditLines[key] = [];
                   }
                   creditLines[key] = {
                       internalid: results[i].getValue('internalid'),
                       item: results[i].getValue('item'),
                       account: results[i].getValue('account'),
                       fxamount: results[i].getValue('fxamount'),
                       lineuniquekey: results[i].getValue('lineuniquekey')
                   };
               }
           }
       });
   }
   log.debug('creditLines', creditLines);

   // Busqueda de Lineas del Bill
   let billLines = {};
   let FEAT_DEPT = runtime.isFeatureInEffect({ feature: "DEPARTMENTS" });
   let FEAT_LOC = runtime.isFeatureInEffect({ feature: "LOCATIONS" });
   let FEAT_CLASS = runtime.isFeatureInEffect({ feature: "CLASSES" });

   let transationColumns = [];
   transationColumns.push(search.createColumn({ name: "internalid", label: "Internal ID" }));
   transationColumns.push(search.createColumn({ name: "item", label: "Item" }));
   transationColumns.push(search.createColumn({ name: "account", label: "Account" }));
   transationColumns.push(search.createColumn({ name: "trandate", label: "Date" }));
   transationColumns.push(search.createColumn({ name: "custcol_lmry_br_tax_rule", label: "Latam Col - Tax Rule" }));
   transationColumns.push(search.createColumn({ name: "custcol_lmry_wht_rule", label: "Latam Col - WHT Rule" }));
   transationColumns.push(search.createColumn({ name: "fxamount", label: "Amount (Foreign Currency)" }));
   transationColumns.push(search.createColumn({ name: "lineuniquekey", label: "Line Unique Key" }));
   if (FEAT_DEPT == true || FEAT_DEPT == "T") {
       transationColumns.push(search.createColumn({ name: "department", label: "Department" }));
   }
   if (FEAT_LOC == true || FEAT_LOC == "T") {
       transationColumns.push(search.createColumn({ name: "location", label: "Location" }));
   }
   if (FEAT_CLASS == true || FEAT_CLASS == "T") {
       transationColumns.push(search.createColumn({ name: "class", label: "Class" }));
   }

   let transactionObj = search.create({
       type: "transaction",
       filters: [
           ["mainline", "is", "F"],
           "AND",
           ["shipping", "is", "F"],
           "AND",
           ["taxline", "is", "F"],
           "AND",
           ["cogs", "is", "F"],
           "AND",
           ["item", "noneof", "@NONE@"],
           "AND",
           ["internalid", "anyof", bills]
       ],
       columns: transationColumns
   }).runPaged({ pageSize: 1000 });

   if (transactionObj) {
       transactionObj.pageRanges.forEach(function (pageRange) {
           let page = transactionObj.fetch({ index: pageRange.index });
           let results = page.data;
           if (results) {
               for (let i = 0; i < results.length; i++) {
                   let linekey = results[i].getValue("lineuniquekey");
                   if (!billLines[linekey]) {
                       billLines[linekey] = [];
                   }
                   billLines[linekey] = {
                       trandate: results[i].getValue("trandate"),
                       taxrule: results[i].getValue("custcol_lmry_br_tax_rule"),
                       whtrule: results[i].getValue("custcol_lmry_wht_rule"),
                       id: results[i].getValue("internalid"),
                       amount: results[i].getValue("fxamount")
                   };
                   if (FEAT_DEPT == true || FEAT_DEPT == "T") {
                       billLines[linekey]["department"] = results[i].getValue("department");
                   }
                   if (FEAT_LOC == true || FEAT_LOC == "T") {
                       billLines[linekey]["location"] = results[i].getValue("location");
                   }
                   if (FEAT_CLASS == true || FEAT_CLASS == "T") {
                       billLines[linekey]["class"] = results[i].getValue("class");
                   }
               }
           }
       });
   }
   log.debug('billLines', billLines);

   let taxResultJSON = {};
   //COPY TAX RESULT
   if (billsAux.length > 0) {
       let filtrosTR = [];
       filtrosTR[0] = search.createFilter({ name: 'custrecord_lmry_br_transaction', operator: 'anyof', values: billsAux });
       filtrosTR[1] = search.createFilter({ name: 'isinactive', operator: 'is', values: 'F' });
       filtrosTR[2] = search.createFilter({ name: 'custrecord_lmry_tax_type', operator: 'is', values: '1' });

       if (jsonLog[currentLog]['subtypes']) {
           let auxTR = jsonLog[currentLog]['subtypes'].split(',');
           filtrosTR[3] = search.createFilter({ name: 'custrecord_lmry_br_type_id', operator: 'anyof', values: auxTR });
       }

       let searchTaxResult = search.create({
           type: 'customrecord_lmry_br_transaction',
           columns: [
               search.createColumn({ name: 'custrecord_lmry_br_total' }),
               search.createColumn({ name: 'custrecord_lmry_br_type_id' }),
               search.createColumn({ name: 'custrecord_lmry_ccl' }),
               search.createColumn({ name: 'custrecord_lmry_ntax' }),
               search.createColumn({ name: 'custrecord_lmry_lineuniquekey' }),
               search.createColumn({ name: 'custrecord_lmry_br_transaction' }),
               search.createColumn({ name: 'internalid' })
           ],
           filters: filtrosTR
       }).runPaged({ pageSize: 1000 });

       if (searchTaxResult) {
           searchTaxResult.pageRanges.forEach(function (pageRange) {
               let page = searchTaxResult.fetch({ index: pageRange.index });
               let results = page.data;
               if (results) {
                   for (let i = 0; i < results.length; i++) {
                       let id = results[i].getValue('custrecord_lmry_br_transaction');
                       if (!taxResultJSON[id]) {
                           taxResultJSON[id] = [];
                       }
                       taxResultJSON[id].push({
                           amount: results[i].getValue('custrecord_lmry_br_total'),
                           subtype: results[i].getValue('custrecord_lmry_br_type_id'),
                           ccl: results[i].getValue('custrecord_lmry_ccl'),
                           ntax: results[i].getValue('custrecord_lmry_ntax'),
                           linekey: results[i].getValue('custrecord_lmry_lineuniquekey'),
                           internalid: results[i].getValue('internalid')
                       });
                       jsonLog[currentLog]['bills'][id].push(results[i].getValue('internalid'));
                   }
               }
           });
       }

       log.debug('taxResultJSON', JSON.stringify(taxResultJSON));
       /*let resultTaxResult = searchTaxResult.run().getRange({ start: 0, end: 1000 });

       if (resultTaxResult != null && resultTaxResult.length > 0) {
           let columnsTaxResult = resultTaxResult[0].columns;
           for (var i = 0; i < resultTaxResult.length; i++) {
               var bill = resultTaxResult[i].getValue('custrecord_lmry_br_transaction');
               jsonLog[currentLog]['bills'][bill].push(resultTaxResult[i].getValue('internalid'));

           }
       }*/
   }

   let aux = {};
   for (const bill in taxResultJSON) {
       let data = {};
       for (let index = 0; index < taxResultJSON[bill].length; index++) {
           let taxAux = taxResultJSON[bill][index];
           let taxrecord = taxAux.ccl;
           let iscc = true;
           if (!taxrecord) {
               taxrecord = taxAux.ntax;
               iscc = false;
           }

           let auxvendor = iscc ? entitiesByBill[bill] : "0";
           log.debug('auxvendor', auxvendor);
           let keycredit = [jsonTaxRecord[auxvendor][taxrecord].item, round2(taxAux.amount), jsonTaxRecord[auxvendor][taxrecord].subtypetext].join(';');
           log.debug('keycredit', keycredit);
           let linekey = taxAux.linekey;
           log.debug('linekey', linekey);

           data[[keycredit, linekey].join(";")] = {
               'amount': taxAux.amount,
               'item': jsonTaxRecord[auxvendor][taxrecord].item || "",
               'rate': jsonTaxRecord[auxvendor][taxrecord].rate || "",
               'journal': jsonTaxRecord[auxvendor][taxrecord].journal || "",
               'account': creditLines[keycredit].account || "",
               'impuesto': taxAux.subtype,
               'department': billLines[linekey].department || "",
               'class': billLines[linekey].class || "",
               'location': billLines[linekey].location || ""
           };
       }
       aux[bill] = data;
   }

   jsonLog[currentLog]['journal'] = aux;

   log.debug('jsonLog after', JSON.stringify(jsonLog));

   return jsonLog;

}
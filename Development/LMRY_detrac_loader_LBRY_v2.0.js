/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
/******************************************************************************************
  VERSION 3.0
  23/05/2022 : Richard Galvez Lopez
  - the "getWHTTaxCode" function was changed, Now the function get one o more Wht Setups.
  - Add the "exchangeRateContext" function, it get the exrate by currency.
  - Add the "getCurrencySubsidiary" function, it get the currency of the current subsidiary
    or the currency of the company information if the instance is mid market edition.
  - Add "getRangeOfTheTransactionList" and "currenciesByTransactionList" function,
    the first get the minimun and maximum date, the second get the currency list of the
    transaction search.
  - add "getApplyTransactions_v2" function, it replaced the old version, now the function
    return anb object where each transaction has its detraction amount
  25/08/2022 : Richard Galvez Lopez
  - The values of ExchangeRateContext were inverted. The "From Currency is Transaction 
    currency, and the "To" Currency is a Base Currency 
  15/12/2022 | Richard Galvez (CP2201499)
  - Change the getTransactionsByIds search, the issue was the exchange rate is mutiplied 
    twice
  26/01/2023 | Pierre Bernaola
  - Update searches in the functions getTransactionsByIds and getTransactions. Added NVL Plsql
    in the columns.
  
/*****************************************************************************************/
define(['N/error', 'N/log', 'N/runtime', 'N/search', 'N/url', 'N/config', 'N/format'],

  function (error, log, runtime, search, url, config, format) {

    function isOneWorld() {
      return runtime.isFeatureInEffect({
        feature: 'SUBSIDIARIES'
      });
    }

    function exchangeRateContext(context) {
      let rates = {};
      let startDate = context.start;
      let endDate = context.end;
      let from = Array.isArray(context.from) ? context.from : [context.from];
      from.forEach((current) => {
        rates[current] = [];
      })
      let to = -1;

      /* Get the Pen Currency ID*/
      search.create({
        type: 'currency',
        columns: ['internalid'],
        filters: [
          ['symbol', 'is', 'PEN']
        ]
      }).run().each((row) => {
        to = row.getValue('internalid');
        return false;
      });


      let exRateSearch = search.create({
        type: "currencyrate",
        filters: [
          ["transactioncurrency", "anyof"].concat(from),
          "AND",
          ["basecurrency", "anyof"].concat(to),
          'AND',
          ["effectivedate", "within", startDate, endDate]
        ],
        columns: [{
          name: "effectivedate",
          sort: search.Sort.DESC,
        },
          "basecurrency",
          "transactioncurrency",
          "exchangerate",
        {
          name: "formulatext",
          formula: "TO_CHAR({effectivedate},'YYYYMMDD')"
        }
        ]
      });
      let defaultData = 0;
      let myPagedData = exRateSearch.runPaged({
        pageSize: 1000
      });
      myPagedData.pageRanges.forEach(function (pageRange) {
        let myPage = myPagedData.fetch({
          index: pageRange.index
        });
        myPage.data.forEach(function (row) {
          defaultData++;
          let columns = row.columns;
          let currentFrom = row.getValue(columns[2]);
          let currentRate = row.getValue(columns[3]);
          let currentFormatDate = Number(row.getValue(columns[4]));
          rates[currentFrom].push({
            date: currentFormatDate,
            rate: currentRate
          })
        });
      });

      if (defaultData == 0) {
        let exRateSearch = search.create({
          type: "currencyrate",
          filters: [
            ["transactioncurrency", "anyof"].concat(from),
            "AND",
            ["basecurrency", "anyof"].concat(to),
          ],
          columns: [{
            name: "effectivedate",
            sort: search.Sort.DESC,
          },
            "basecurrency",
            "transactioncurrency",
            "exchangerate",
          {
            name: "formulatext",
            formula: "TO_CHAR({effectivedate},'YYYYMMDD')"
          }
          ]
        });
        let defaultData = 0;
        let myPagedData = exRateSearch.runPaged({
          pageSize: 1000
        });
        myPagedData.pageRanges.forEach(function (pageRange) {
          let myPage = myPagedData.fetch({
            index: pageRange.index
          });
          myPage.data.forEach(function (row) {
            defaultData++;
            let columns = row.columns;
            let currentFrom = row.getValue(columns[2]);
            let currentRate = row.getValue(columns[3]);
            let currentFormatDate = Number(row.getValue(columns[4]));
            rates[currentFrom].push({
              date: currentFormatDate,
              rate: currentRate
            })
          });
        });
      } else {
        let lastRate = search.create({
          type: "currencyrate",
          filters: [
            ["transactioncurrency", "anyof"].concat(from),
            "AND",
            ["basecurrency", "anyof"].concat(to),
            'AND',
            ["effectivedate", "before", startDate]
          ],
          columns: [{
            name: "effectivedate",
            sort: search.Sort.DESC,
          },
            "basecurrency",
            "transactioncurrency",
            "exchangerate",
          {
            name: "formulatext",
            formula: "TO_CHAR({effectivedate},'YYYYMMDD')"
          }
          ]
        }).run().getRange(0, 1);
        if (lastRate.length > 0) {
          lastRate = lastRate[0];
          let columns = lastRate.columns;
          let currentFrom = lastRate.getValue(columns[2]);
          let currentRate = lastRate.getValue(columns[3]);
          let currentFormatDate = Number(lastRate.getValue(columns[4]));
          rates[currentFrom].push({
            date: currentFormatDate,
            rate: currentRate
          });
        }
      }

      this.rates = rates;
      this.to = to;
    }

    exchangeRateContext.prototype.getRate = function (currency, date) {

      let currentRates = this.rates[currency];

      let dateDate = "" + date.getDate();
      dateDate = dateDate.length == 1 ? "0" + dateDate : dateDate;

      let dateMonth = "" + (date.getMonth() + 1);
      dateMonth = dateMonth.length == 1 ? "0" + dateMonth : dateMonth;

      let dateYear = date.getFullYear();

      let formatDate = Number(dateYear + "" + dateMonth + "" + dateDate);

      let currentRate = currentRates.find((current) => {
        return current.date <= formatDate;
      });
      log.debug(formatDate, currentRate);
      if (!currentRate) {
        currentRate = currentRates[currentRates.length - 1];
      }
      return Number(currentRate.rate);
    }

    exchangeRateContext.prototype.isPeruCurrency = function (currency) {
      return currency == this.to;
    }

    function getCurrencySubsidiary(subsidiary) {
      if (isOneWorld()) {
        let currency = search.lookupFields({
          type: 'subsidiary',
          id: subsidiary,
          columns: ['currency']
        });
        return currency.currency[0].value;
      } else {
        let companyInf = config.load({
          type: config.Type.COMPANY_INFORMATION
        });
        return companyInf.getValue('basecurrency');
      }
    }

    function getRangeOfTheTransactionList(filters) {
      let result = {
        start: null,
        end: null
      };
      let resultSet = search.create({
        type: 'vendorbill',
        columns: [{
          name: "trandate",
          summary: "MIN",
        }, {
          name: "trandate",
          summary: "MAX",
        }],
        filters: filters
      }).run().getRange(0, 1);
      if (resultSet.length > 0) {
        let columns = resultSet[0].columns;
        result.start = resultSet[0].getValue(columns[0]);
        result.end = resultSet[0].getValue(columns[1]);
      }
      return result;
    }

    function getCurrenciesByTransactionList(filters) {
      let result = [];
      search.create({
        type: 'vendorbill',
        columns: [{
          name: "currency",
          summary: "GROUP",
        }],
        filters: filters
      }).run().each((row) => {
        result.push(row.getValue(row.columns[0]));
        return true;
      })
      return result;
    }

    function getParams(context) {

      return context.request.parameters;

    }

    function getOption(json) {

      var result = [];
      var searchContext = search.create(json);

      var myPagedData = searchContext.runPaged();
      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (line) {
          result.push({
            id: line.getValue(line.columns[0]),
            text: line.getValue(line.columns[1])
          });

        });
      });
      return result;
    }

    function getSearch(json) {
      var result = [];
      search.create(json).run().each(function (line) {

        var columns = line.columns;
        var row = [];
        for (var i = 0; i < columns.length; i++) {
          row.push(line.getValue(columns[i]));
        }

        return true;
      });
      return result;
    }

    function getAccounts(subsidiary) {

      var result = {}

      search.create({
        type: 'customrecord_lmry_pe_detractions_acc',
        columns: [
          'custrecord_lmry_det_ac_account_1',
          'custrecord_lmry_det_ac_account_2',
          'custrecord_lmry_det_ac_account_3',
          'custrecord_lmry_det_ac_account_4'
        ],
        filters: [
          ['custrecord_lmry_pe_dec_ac_subsi', 'anyof', subsidiary]
        ]
      }).run().each(function (line) {

        result["custpage_acc_1"] = line.getValue('custrecord_lmry_det_ac_account_1');
        result["custpage_acc_2"] = line.getValue('custrecord_lmry_det_ac_account_2');
        result["custpage_acc_3"] = line.getValue('custrecord_lmry_det_ac_account_3');
        result["custpage_acc_4"] = line.getValue('custrecord_lmry_det_ac_account_4');

      });

      return result;
    }

    function getWHTTaxCode() {

      var wht_type = [];

      var nexus = {};

      search.create({
        type: 'nexus',
        filters: [
          ['country', 'anyof', 'PE']
        ]
      }).run().each(function (line) {
        nexus = line.id;
      });

      if (nexus) {

        var wht_setup = null;

        search.create({
          type: 'customrecord_4601_witaxsetup',
          filters: [
            ['custrecord_4601_wts_nexus', 'equalto', nexus]
          ]
        }).run().each(function (line) {
          wht_setup = line.id;
        });

        if (wht_setup) {
          search.create({
            type: 'customrecord_4601_witaxtype',
            filters: [
              ['custrecord_4601_wtt_witaxsetup', 'anyof', wht_setup],
              'and',
              ['custrecord_4601_wtt_name', 'contains', 'DET']
            ]
          }).run().each(function (line) {
            wht_type.push(line.id);
            return true;
          });
        }

      }

      return wht_type;

    }

    function getTransactionsByIds(array, numbers, subsidiary) {
      var result = [];

      var baseCurrency = getCurrencySubsidiary(subsidiary);

      var wht_detraction = getWHTTaxCode();

      var filters = [
        ["type", "anyof", "VendBill"],
        "AND",
        ["taxline", "is", "F"],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["posting", "is", "T"],
        "AND",
        ["custbody_lmry_concepto_detraccion", "noneof", "12", "@NONE@"],
        "AND",
        ["custcol_4601_witaxapplies", "is", "T"],
        "AND",
        ["CUSTCOL_4601_WITAXCODE.custrecord_4601_wtc_witaxtype", 'anyof'].concat(wht_detraction),
        "AND",
        ["internalid", 'anyof'].concat(array)
      ]

      let rangeDate = getRangeOfTheTransactionList(filters);
      let fromCurrencies = getCurrenciesByTransactionList(filters);
      let ExchangeRateManager = new exchangeRateContext({
        start: rangeDate.start,
        end: rangeDate.end,
        from: fromCurrencies
      });
      let baseIsPeruCurrency = ExchangeRateManager.isPeruCurrency(baseCurrency);

      var setupSearch = {
        type: 'vendorbill',
        columns: [{
          name: "internalid",
          summary: "GROUP",
        },
        {
          name: "trandate",
          summary: "GROUP",
        },
        {
          name: "formulatext",
          summary: "GROUP",
          formula: "NVL({tranid}, '-')"
        },
        {
          name: "mainname",
          summary: "GROUP"
        },
        {
          name: "currency",
          summary: "GROUP",
        },
        {
          name: "custcol_4601_witaxbaseamount",
          summary: "SUM",
          formula: "NVL({custcol_4601_witaxbaseamount}, 0)"
        },
        {
          name: "exchangerate",
          summary: "GROUP",
        },
        {
          name: "formulacurrency",
          summary: "SUM",
          formula: "{custcol_4601_witaxbaseamount}",
        },
        {
          name: "formulapercent",
          summary: "GROUP",
          formula: "0",
        },
        {
          name: "formulacurrency",
          summary: "SUM",
          formula: "-{custcol_4601_witaxamount}",
        },
        {
          name: "formulatext",
          summary: "GROUP",
          formula: "CONCAT(  SUBSTR({custbody_lmry_serie_doc_cxp}, LENGTH({custbody_lmry_serie_doc_cxp})-1, 2 ) ,  CONCAT('-',  CASE WHEN LENGTH({custbody_lmry_num_preimpreso}) < 6 THEN {custbody_lmry_num_preimpreso} ELSE SUBSTR({custbody_lmry_num_preimpreso}, LENGTH({custbody_lmry_num_preimpreso})-5, 6) END))",
          label: "No. de Proforma"
        },
        {
          name: "formulatext",
          summary: "GROUP",
          formula: "NVL(SUBSTR({custbody_lmry_concepto_detraccion},1,2),'-')",
          label: "Codigo bien o servicio"
        },
        {
          name: "formulatext",
          summary: "GROUP",
          formula: "'01'",
          label: "Código del Tipo de Operación realizada"
        },
        {
          name: "formulatext",
          summary: "GROUP",
          formula: "concat( to_char({accountingperiod.enddate},'YYYY') , to_char({accountingperiod.enddate},'MM'))",
          label: "Periodo Tributario"
        },
        {
          name: "formulatext",
          summary: "GROUP",
          formula: "'01'",
          label: "Tipo de comprobante"
        },
        {
          name: "formulatext",
          summary: "GROUP",
          formula: "NVL({custbody_lmry_serie_doc_cxp}, '-')",
          label: "Serie de comprobante"
        },
        {
          name: "formulatext",
          summary: "GROUP",
          formula: "NVL({custbody_lmry_num_preimpreso}, '-')",
          label: "Número de comprobante"
        },
        {
          name: "formulatext",
          summary: "GROUP",
          formula: "NVL({vendor.custentity_lmry_pe_ctactebn}, '-')",
          label: "No. Cuenta Corriente Proveedor"
        },
        ],
        filters: filters
      }


      if (runtime.isFeatureInEffect('SUBSIDIARIES') == true || runtime.isFeatureInEffect('SUBSIDIARIES') == 'T') {
        setupSearch.settings = [{ name: 'consolidationtype', value: 'NONE' }]
      }

      var resultSet = search.create(setupSearch).run().getRange(0, 1000);

      for (var i = 0; i < resultSet.length; i++) {

        var row = resultSet[i];
        var column = row.columns;

        var idTrans = row.getValue(column[0]);
        var number = numbers[idTrans] ? numbers[idTrans] : '';
        var Trans = row.getValue(column[2]);
        var date = row.getValue(column[1]);
        var vendorName = row.getText(column[3]);
        var vendorId = row.getValue(column[3]);
        var currency = row.getValue(column[4]);
        var total = row.getValue(column[5]);
        var rate = row.getValue(column[6]);
        var rateByTransaction = row.getValue(column[6]);
        if (ExchangeRateManager.isPeruCurrency(currency)) {
          rate = 1;
        } else if (!baseIsPeruCurrency) {
          let baseDate = stringToDate(date);
          rate = ExchangeRateManager.getRate(baseCurrency, baseDate);
        }
        var baseAmount = Number(row.getValue(column[7]));
        var detractionAmount = Number(row.getValue(column[9]));
        // if (baseCurrency != currency && !ExchangeRateManager.isPeruCurrency(currency)) {
        //   baseAmount = baseAmount * Number(rateByTransaction);
        //   detractionAmount = detractionAmount * Number(rateByTransaction);
        // }
        // var detractionAmount = row.getValue(column[9]);
        baseAmount = baseAmount * rate;
        detractionAmount = detractionAmount * rate;
        var percent = (detractionAmount * 100 / baseAmount).toFixed(2);
        var proformaNumber = row.getValue(column[10]);
        var code = row.getValue(column[11]);
        var operation = row.getValue(column[12]);
        var taxperiod = row.getValue(column[13]);
        var voucher = row.getValue(column[14]);
        var voucherSerie = row.getValue(column[15]);
        var voucherNumber = row.getValue(column[16]);
        var accountNumber = row.getValue(column[17]);

        var lines = [];
        lines.push(number);
        lines.push(idTrans);
        lines.push(generateUrl('vendorbill', Trans, idTrans));
        lines.push(generateUrl('vendor', vendorName, vendorId));

        lines.push(accountNumber);
        lines.push(proformaNumber);
        lines.push(code);
        lines.push(operation);
        lines.push(taxperiod);
        lines.push(voucher);
        lines.push(voucherSerie);
        lines.push(voucherNumber);

        lines.push(currency);
        lines.push(total);
        lines.push(baseAmount);
        lines.push(percent);
        lines.push(detractionAmount);

        result.push(lines);

      }

      return result;
    }

    function getTransactionsInProgress() {

      var ids = [];

      search.create({
        type: 'customrecord_lmry_pe_detractions_batch',
        columns: ['custrecord_lmry_pe_det_b_vendorbill'],
        filters: [
          ['custrecord_lmry_pe_det_b_status', 'is', "0"],
          'or',
          ['custrecord_lmry_pe_det_b_status', 'is', "1"],
          'or',
          ['custrecord_lmry_pe_det_b_status', 'is', "8"],
          'or',
          ['custrecord_lmry_pe_det_b_status', 'is', "3"],
          'or',
          ['custrecord_lmry_pe_det_b_status', 'is', "2"],
          'or',
          ['custrecord_lmry_pe_det_b_status', 'is', "4"],
        ]
      }).run().each(function (line) {

        var array = [];

        try {
          array = JSON.parse(line.getValue('custrecord_lmry_pe_det_b_vendorbill'));

        } catch (err) {
          array = [];

        }

        if (array.length > 0) {
          ids = ids.concat(array);
        }

        return true;

      });

      return ids;

    }

    function getTransactions(_params) {

      var result = [];

      var transactionsInProgress = getTransactionsInProgress();

      var wht_detraction = getWHTTaxCode();

      log.debug('WHT Detraction', wht_detraction);

      var baseCurrency = getCurrencySubsidiary(_params['custfilter_subsi']);

      var filters = [
        ["type", "anyof", "VendBill"],
        "AND",
        ["taxline", "is", "F"],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["posting", "is", "T"],
        "AND",
        ["custbody_lmry_concepto_detraccion", "noneof", "12", "@NONE@"],
        "AND",
        ["custcol_4601_witaxapplies", "is", "T"],
        "AND",
        ["custbody_lmry_num_comprobante_detrac", "isempty", ""],
        "AND",
        ["CUSTCOL_4601_WITAXCODE.custrecord_4601_wtc_witaxtype", 'anyof'].concat(wht_detraction),
        "AND",
        ["voided", 'is', 'F'],
        "AND",
        ["status", "anyof", "VendBill:B", "VendBill:A", "VendBill:F"],
        "AND",
        ['custcol_4601_witaxrate', 'isnotempty', '']
      ]

      if (isOneWorld()) {
        if (_params['custfilter_subsi']) {
          filters.push("AND");
          filters.push(['subsidiary', 'anyof', _params['custfilter_subsi']]);
        }
      }

      if (_params['custfilter_ap_acc']) {
        filters.push("AND");
        filters.push(['accountmain', 'anyof', _params['custfilter_ap_acc']]);
      }

      if (_params['custfilter_vendor']) {
        filters.push("AND");
        filters.push(['name', 'anyof', _params['custfilter_vendor']]);
      }

      if (_params['custfilter_date_from']) {
        filters.push("AND");
        filters.push(['trandate', 'onorafter', _params['custfilter_date_from']]);
      }

      if (_params['custfilter_date_to']) {
        filters.push("AND");
        filters.push(['trandate', 'onorbefore', _params['custfilter_date_to']]);
      }

      if (transactionsInProgress.length > 0) {
        filters.push("AND");
        filters.push(['internalid', 'noneof'].concat(transactionsInProgress));
      }

      /*Add the exrate Functions*/
      let rangeDate = getRangeOfTheTransactionList(filters);
      let fromCurrencies = getCurrenciesByTransactionList(filters);

      /* Check if the transactions list have data */
      if (fromCurrencies.length > 0) {
        let ExchangeRateManager = new exchangeRateContext({
          start: rangeDate.start,
          end: rangeDate.end,
          from: fromCurrencies
        });
        log.debug('exchange Object', ExchangeRateManager);

        let baseIsPeruCurrency = ExchangeRateManager.isPeruCurrency(baseCurrency);

        var setupSearch = {
          type: 'vendorbill',
          columns: [{
            name: "internalid",
            summary: "GROUP",
          },
          {
            name: "trandate",
            summary: "GROUP"
          },
          {
            name: "formulatext",
            summary: "GROUP",
            formula: "NVL({tranid}, '-')"
          },
          {
            name: "mainname",
            summary: "GROUP"
          },
          {
            name: "currency",
            summary: "GROUP",
          },
          {
            name: "formulanumeric",
            summary: "SUM",
            formula: "NVL({custcol_4601_witaxbaseamount}, 0)"
          },
          {
            name: "formulanumeric",
            summary: "GROUP",
            formula: "NVL({exchangerate}, 0)"
          },
          {
            name: "formulacurrency",
            summary: "SUM",
            formula: "{custcol_4601_witaxbaseamount}",
          },
          // {
          //   name: "formulapercent",
          //   summary: "GROUP",
          //   formula: "{custcol_4601_witaxrate}",
          // },
          {
            name: "formulapercent",
            summary: "GROUP",
            formula: "0"
          },
          {
            name: "formulacurrency",
            summary: "SUM",
            formula: "-{custcol_4601_witaxamount}",
          },
          {
            name: "trandate",
            summary: "GROUP",
          },
          {
            name: "formulatext",
            summary: "GROUP",
            formula: "CONCAT(  SUBSTR({custbody_lmry_serie_doc_cxp}, LENGTH({custbody_lmry_serie_doc_cxp})-1, 2 ) ,  CONCAT('-',  CASE WHEN LENGTH({custbody_lmry_num_preimpreso}) < 6 THEN {custbody_lmry_num_preimpreso} ELSE SUBSTR({custbody_lmry_num_preimpreso}, LENGTH({custbody_lmry_num_preimpreso})-5, 6) END))",
            label: "No. de Proforma"
          },
          {
            name: "formulatext",
            summary: "GROUP",
            formula: "NVL(SUBSTR({custbody_lmry_concepto_detraccion},1,2), '-')",
            label: "Codigo bien o servicio"
          },
          // {
          //   name: "formulatext",
          //   summary: "GROUP",
          //   formula: "{vendor.custentity_lmry_pe_ctactebn}",
          //   label: "No. Cuenta Corriente Proveedor"
          // },
          {
            name: "formulatext",
            summary: "GROUP",
            formula: "'01'",
            label: "Código del Tipo de Operación realizada"
          },
          {
            name: "formulatext",
            summary: "GROUP",
            formula: "concat( to_char({accountingperiod.enddate},'YYYY') , to_char({accountingperiod.enddate},'MM'))",
            label: "Periodo Tributario"
          },
          {
            name: "formulatext",
            summary: "GROUP",
            formula: "'01'",
            label: "Tipo de comprobante"
          },
          {
            name: "formulatext",
            summary: "GROUP",
            formula: "NVL({custbody_lmry_serie_doc_cxp}, '-')",
            label: "Serie de comprobante"
          },
          {
            name: "formulatext",
            summary: "GROUP",
            formula: "NVL({custbody_lmry_num_preimpreso}, '-')",
            label: "Número de comprobante"
          },
          {
            name: "formulatext",
            summary: "GROUP",
            formula: "NVL({vendor.custentity_lmry_pe_ctactebn}, '-')",
            label: "No. Cuenta Corriente Proveedor"
          }
          ],
          filters: filters
        }
        if (runtime.isFeatureInEffect('SUBSIDIARIES') == true || runtime.isFeatureInEffect('SUBSIDIARIES') == 'T') {
          setupSearch.settings = [{ name: 'consolidationtype', value: 'NONE' }]
        }

        var resultSet = search.create(setupSearch).run().getRange(0, 1000);

        for (var i = 0; i < resultSet.length; i++) {

          var row = resultSet[i];
          var column = row.columns;

          var idTrans = row.getValue(column[0]);
          var Trans = row.getValue(column[2]);
          var date = row.getValue(column[1]);
          var vendorName = row.getText(column[3]);
          var vendorId = row.getValue(column[3]);
          var currency = row.getValue(column[4]);
          var total = row.getValue(column[5]);
          var rate = Number(row.getValue(column[6]));
          var rateByTransaction = row.getValue(column[6]);

          if (ExchangeRateManager.isPeruCurrency(currency)) {
            rate = 1;
          } else if (!baseIsPeruCurrency) {
            let baseDate = stringToDate(date);
            rate = ExchangeRateManager.getRate(baseCurrency, baseDate);
          }
          var baseAmount = Number(row.getValue(column[7]));
          var detractionAmount = Number(row.getValue(column[9]));

          // if (baseCurrency != currency && !ExchangeRateManager.isPeruCurrency(currency)) {
          //   baseAmount = baseAmount * Number(rateByTransaction);
          //   detractionAmount = detractionAmount * Number(rateByTransaction);
          // }

          baseAmount = baseAmount * rate;
          detractionAmount = detractionAmount * rate;
          var percent = (detractionAmount * 100 / baseAmount).toFixed(2);
          var date = row.getValue(column[10]);
          var proformaNumber = row.getValue(column[11]);
          var code = row.getValue(column[12]);
          var operation = row.getValue(column[13]);
          var taxperiod = row.getValue(column[14]);
          var voucher = row.getValue(column[15]);
          var voucherSerie = row.getValue(column[16]);
          var voucherNumber = row.getValue(column[17]);
          var accountDetrac = row.getValue(column[18]);

          var lines = [];

          lines.push(idTrans);
          lines.push('F');
          lines.push(generateUrl('vendorbill', Trans, idTrans));
          lines.push(generateUrl('vendor', vendorName, vendorId));
          lines.push(date);

          lines.push(accountDetrac);
          lines.push(proformaNumber);
          lines.push(code);
          lines.push(operation);
          lines.push(taxperiod);
          lines.push(voucher);
          lines.push(voucherSerie);
          lines.push(voucherNumber);

          lines.push(currency);
          lines.push(total);
          lines.push(baseAmount);
          lines.push(percent);
          lines.push(detractionAmount);

          result.push(lines);

        }
      }
      return result;
    }

    function generateUrl(type, name, id) {

      var path = url.resolveRecord({
        recordType: type,
        recordId: id,
      });

      var link = "<a href='" + path + "' target='_blank' class='dottedlink'>" + name + "</a>";
      return link;

    }

    function getClasification(text) {

      var accounting = config.load({
        type: config.Type.ACCOUNTING_PREFERENCES
      });

      var result = 'hidden';

      var key = {
        'departments': 'DEPTMANDATORY',
        'classes': 'CLASSMANDATORY',
        'locations': 'LOCMANDATORY',
      }

      var isVisible = runtime.isFeatureInEffect({
        feature: text
      });
      if (isVisible == 'T' || isVisible == true) {
        result = 'visible';

        if (key[text]) {

          var isMandatory = accounting.getValue(key[text]);
          if (isMandatory == true || isMandatory == 'T')
            result = 'mandatory';

        }

      }
      return result;

    }

    function getApplyTransactions(context) {

      var request = context.request;
      var size = request.getLineCount({
        group: 'custlist_transactions'
      });
      var result = [];
      for (var i = 0; i < size; i++) {

        var check = request.getSublistValue({
          group: 'custlist_transactions',
          name: 'custpage_col_trans_check',
          line: i
        });
        if (check == 'T' || check == true) {
          result.push(request.getSublistValue({
            group: 'custlist_transactions',
            name: 'custpage_col_trans_id',
            line: i
          }));
        }
      }
      return JSON.stringify(result);
    }

    function getApplyTransactions_v2(context) {
      var request = context.request;
      var size = request.getLineCount({
        group: 'custlist_transactions'
      });
      var result = {};
      for (var i = 0; i < size; i++) {

        var check = request.getSublistValue({
          group: 'custlist_transactions',
          name: 'custpage_col_trans_check',
          line: i
        });
        if (check == 'T' || check == true) {
          let transaction = request.getSublistValue({
            group: 'custlist_transactions',
            name: 'custpage_col_trans_id',
            line: i
          });
          let detraction = request.getSublistValue({
            group: 'custlist_transactions',
            name: 'custpage_col_de_amount',
            line: i
          });
          result[transaction] = {
            transaction: transaction,
            det: Number(detraction)
          };
        }
      }
      return JSON.stringify(result);
    }

    function getUser() {
      return runtime.getCurrentUser().id;
    }

    function stringToDate(stringDate) {

      return format.parse({
        value: stringDate,
        type: format.Type.DATE
      })
    }

    function dateToString(date) {

      return format.format({
        value: date,
        type: format.Type.DATE
      })
    }

    function getCurrentPeriod() {

      var date = new Date();
      var dateString = dateToString(date);

      var result = {
        custpage_i_date: date,
        custpage_i_period: ''
      };

      search.create({
        type: "accountingperiod",
        filters: [
          ["isquarter", "is", "F"],
          "AND",
          ["isyear", "is", "F"],
          "AND",
          ["closed", "is", "F"],
          "AND",
          ["isadjust", "is", "F"],
          'and',
          ['enddate', 'onorafter', dateString],
          'and',
          ['startdate', 'onorbefore', dateString]
        ],
        columns: [{
          name: "internalid",
        }, {
          name: "periodname",
        }]
      }).run().each(function (line) {
        result.custpage_i_period = line.id;

      });

      return result;
    }

    return {
      generateUrl: generateUrl,
      getCurrentPeriod: getCurrentPeriod,
      stringToDate: stringToDate,
      dateToString: dateToString,
      getClasification: getClasification,
      getParams: getParams,
      getOption: getOption,
      getTransactions: getTransactions,
      getAccounts: getAccounts,
      getUser: getUser,
      getApplyTransactions: getApplyTransactions_v2,
      getTransactionsByIds: getTransactionsByIds
    }

  });

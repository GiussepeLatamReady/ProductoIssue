/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
/*****************************************************************************
  VERSION 1.0
  19/08/2021 | Richard Galvez | QA : Marisol Cconislla.
  - Change en "getBatchSearch" function, now return the batch name.
  - All empty values in the search, now return a "-".
  - The search now have a new filter (only invoice with the legal document type
    is "Factura")
  29/09/2021 | Richard Galvez | Issue (CD2100158)
  - Add The Paid in full in the invoice search result.
  VERSION 2.0
  17/02/2022 | Richard Galvez
  - Change the behavior of "getSearchInvoice" function.
  VERSION 3.0
  24/05/2022 | Richard Galvez
  - the "getWHTTaxCode" function was changed, Now the function get one o more Wht Setups.
  - Add the "exchangeRateContext" function, it get the exrate by currency.
  - Add the "getCurrencySubsidiary" function, it get the currency of the current subsidiary
    or the currency of the company information if the instance is mid market edition.
  - Add "getRangeOfTheTransactionList" and "currenciesByTransactionList" function,
    the first get the minimun and maximum date, the second get the currency list of the
    transaction search.
  30/06/2022 | Richard Galvez | QA : Hilary Castro
  - In case the subsidiary has  USD as currency, but the transaction have
    currency other than PEN or USD, the module fails, the improvement was first get the
    base amount with exrate of the transaction, next multiply this value with the
    exrate that was get of the base currency.
  25/08/2022 : Richard Galvez Lopez
  - The values of ExchangeRateContext were inverted. The "From Currency is Transaction 
    currency, and the "To" Currency is a Base Currency
  27/01/2023 : Piero Desposorio Gonzales
  - Update the search in the function createsearchInvoiceWithDetraction
  22/02/2023 : Richard Galvez
  - Update the Wht Function, now return one or more values for wht types.
/*****************************************************************************/
define(['N/error', 'N/log', 'N/runtime', 'N/search', 'N/url', 'N/config', 'N/format'],

  function (error, log, runtime, search, url, config, format) {


    function _isOneWorld() {
      return runtime.isFeatureInEffect({
        feature: 'SUBSIDIARIES'
      });
    }

    function parseStringToObject(inputText) {

      let result = null;

      try {

        result = JSON.parse(inputText);

      } catch (err) {
        log.debug('parseStringToObject.error', inputText);
      }

      return result;

    }

    function parseJsonToArray(jsonContext) {

      let result = [];

      for (let line in jsonContext) {
        result.push(jsonContext[line]);
      }
      return result;
    }

    function getSubsidiariesSetup() {

      let result = {};

      search.create({
        type: 'subsidiary',
        columns: ['internalid'],
        filters: [
          ['country', 'anyof', 'PE'], 'and',
          ['isinactive', 'is', 'F']
        ]
      }).run().each((line) => {
        result[line.id] = {
          subsidiary: line.id
        };
        return true;
      });


      search.create({
        type: 'customrecord_lmry_pe_detrac_acc_sales',
        columns: [
          'custrecord_lmry_pe_dec_ac_sales_subsi',
          'custrecord_lmry_pe_dec_ac_sales_acc_1',
          'custrecord_lmry_pe_dec_ac_sales_acc_2',
          'custrecord_lmry_pe_dec_ac_sales_acc_3'
        ]
      }).run().each((line) => {

        let subsididary = line.getValue(line.columns[0]);
        let det = line.getValue(line.columns[1]);
        let rounding = line.getValue(line.columns[2]);
        let bank = line.getValue(line.columns[3]);

        result[subsididary] = {
          subsidiary: subsididary,
          detraction: det,
          rounding: rounding,
          bank: bank
        };
        return true;

      });
      return parseJsonToArray(result);
    }

    function getCompanySetup() {

      let result = {
        detraction: '',
        rounding: '',
        bank: ''
      };

      search.create({
        type: 'customrecord_lmry_pe_detrac_acc_sales',
        columns: [
          'custrecord_lmry_pe_dec_ac_sales_subsi',
          'custrecord_lmry_pe_dec_ac_sales_acc_1',
          'custrecord_lmry_pe_dec_ac_sales_acc_2',
          'custrecord_lmry_pe_dec_ac_sales_acc_3',
          {
            name: 'internalid',
            sort: search.Sort.ASC
          }
        ]
      }).run().each((line) => {

        let subsididary = line.getValue(line.columns[0]);
        let det = line.getValue(line.columns[1]);
        let rounding = line.getValue(line.columns[2]);
        let bank = line.getValue(line.columns[3]);

        result = {
          detraction: det,
          rounding: rounding,
          bank: bank
        };
        return false;

      });

      return result;

    }

    function getAccountSetup() {

      let isOneWorld = runtime.isFeatureInEffect({
        feature: 'SUBSIDIARIES'
      });

      if (isOneWorld == true || isOneWorld == 'T') {
        return getSubsidiariesSetup();
      } else {
        return getCompanySetup();
      }

    }

    function getSearchAccount() {

      let resultContext = {
        bank: [],
        rounding: [],
        detraction: [],
      };

      let searchContext = search.create({
        type: 'account',
        filters: [
          ['isinactive', 'is', 'F'],
          'and',
          ['type', 'anyof', 'Bank', 'OthCurrAsset', 'Income', 'Expense', 'OthIncome', 'OthExpense'],
          "AND",
          ["custrecord_lmry_code_account_sunat", 'noneof', "@NONE@"]
        ],
        columns: [
          'internalid',
          'displayname',
          'type'
        ],
      });

      let myPagedData = searchContext.runPaged({
        pageSize: 1000
      });

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({
          index: pageRange.index
        });
        myPage.data.forEach(function (result) {

          var id = result.getValue('internalid');
          var type = result.getValue('type');
          var name = result.getValue('displayname');

          var context = {
            id: id,
            value: id,
            text: name
          };

          switch (type) {
            case "OthCurrAsset":
              resultContext.detraction.push(context);
              break;
            // case "AcctPay":
            //   resultContext.detraction.push(context);
            case "Bank":
              resultContext.bank.push(context);
              break;
            case "Expense":
              resultContext.rounding.push(context);
              break;
            case "Income":
              resultContext.rounding.push(context);
              break;
            case "OthIncome":
              resultContext.rounding.push(context);
              break;
            case "OthExpense":
              resultContext.rounding.push(context);
              break;
          }

          return true;

        });
      });
      return resultContext;

    }

    function getSearchReceivableAccount() {

      let searchResult = [];

      let searchContext = search.create({
        type: 'account',
        filters: [
          ['isinactive', 'is', 'F'],
          'and',
          ['type', 'anyof', 'AcctRec']
        ],
        columns: [
          'internalid',
          'displayname',
        ],
      });

      let myPagedData = searchContext.runPaged({
        pageSize: 1000
      });

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({
          index: pageRange.index
        });
        myPage.data.forEach(function (result) {

          var id = result.getValue('internalid');
          var name = result.getValue('displayname');

          searchResult.push({
            id: id,
            text: name
          });

          return true;

        });
      });

      return searchResult;

    }

    function getSearchCustomer(subsidiary) {

      let searchResult = [];

      let filters = [
        ['isinactive', 'is', 'F'],
      ]

      if (subsidiary) {
        filters.push('and');
        filters.push(['subsidiary', 'anyof', subsidiary]);
      }

      let searchContext = search.create({
        type: 'customer',
        filters: filters,
        columns: [
          'internalid',
          //'altname',
          'companyname',
          'firstname',
          'lastname',
          'isperson'
        ],
      });

      let myPagedData = searchContext.runPaged({
        pageSize: 1000
      });

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({
          index: pageRange.index
        });
        myPage.data.forEach(function (result) {

          var id = result.getValue('internalid');

          var name = ''

          if (result.getValue('isperson') == 'T' || result.getValue('isperson') == true) {

            name = result.getValue('firstname') + ' ' + result.getValue('lastname');

          } else {

            name = result.getValue('companyname');

          }

          searchResult.push({
            id: id,
            text: name
          });

          return true;

        });
      });

      return searchResult;

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

    function exchangeRateContext(context) {
      let rates = {};
      let startDate = context.start;
      let endDate = context.end;
      let from = Array.isArray(context.from) ? context.from : [context.from];
      from.forEach((current) => {
        rates[current] = [];
      })
      let to = -1;
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
          let currentTo = row.getValue(columns[1]);
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
            let currentTo = row.getValue(columns[1]);
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
          let currentTo = lastRate.getValue(columns[1]);
          let currentRate = lastRate.getValue(columns[3]);
          let currentFormatDate = Number(lastRate.getValue(columns[4]));
          rates[currentFrom].push({
            date: currentFormatDate,
            rate: currentRate
          });
        }
      }

      log.debug('Rates Context', rates);
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
      if (!currentRate) {
        currentRate = currentRates[currentRates.length - 1];
      }
      return Number(currentRate.rate);
    }

    exchangeRateContext.prototype.isPeruCurrency = function (currency) {
      return currency == this.to;
    }

    function getCurrencySubsidiary(subsidiary) {
      if (_isOneWorld()) {
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
        type: 'invoice',
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
        type: 'invoice',
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

    function createsearchInvoiceWithDetraction(filters, payInformation, subsidiary) {

      let wht_detraction = getWHTTaxCode();

      log.debug('wht_detrac', wht_detraction);

      let currentFilters = [
        ["type", 'anyof', 'CustInvc'],
        'AND',
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
        ["custbody_lmry_document_type", "anyof", 312],
        "AND",
        ["CUSTCOL_4601_WITAXCODE.custrecord_4601_wtc_witaxtype", 'anyof'].concat(wht_detraction),
        "AND",
        ["voided", 'is', 'F'],
        "AND",
        ["status", "anyof", "CustInvc:A", "CustInvc:D", "CustInvc:B"],
        'AND',
        ['custbody_lmry_carga_inicial', 'is', 'F']
      ];

      if (Array.isArray(filters)) {

        currentFilters = currentFilters.concat(filters);

      }

      let baseCurrency = getCurrencySubsidiary(subsidiary);

      let rangeDate = getRangeOfTheTransactionList(currentFilters);

      let fromCurrencies = getCurrenciesByTransactionList(currentFilters);

      let searchResult = [];

      if (fromCurrencies.length > 0) {

        let ExchangeRateManager = new exchangeRateContext({
          start: rangeDate.start,
          end: rangeDate.end,
          from: fromCurrencies
        });
        let baseIsPeruCurrency = ExchangeRateManager.isPeruCurrency(baseCurrency);

        let currentColumns = [{
          name: "internalid",
          summary: "GROUP",
          label: "id"
        }, {
          name: "trandate",
          summary: "GROUP",
          label: "trandate"
        }, {
          name: "mainname",
          summary: "GROUP",
          label: "customer"
        }, {
          name: "formulatext",
          summary: "GROUP",
          formula: "NVL({tranid},'-')",
          label: "transaction"
        }, {
          name: "formulatext",
          summary: "GROUP",
          formula: "NVL({custbody_lmry_concepto_detraccion},'-')",
          label: "concept"
        }, {
          name: "postingperiod",
          summary: "GROUP",
          label: "period"
        }, {
          name: "formulatext",
          summary: "GROUP",
          formula: "NVL({custbody_lmry_serie_doc_cxc},'-')",
          label: "serie"
        }, {
          name: "formulatext",
          summary: "GROUP",
          formula: "NVL({custbody_lmry_num_preimpreso},'-')",
          label: "number"
        }, {
          name: "formulacurrency",
          summary: "SUM",
          formula: "-{custcol_4601_witaxbaseamount}",
          label: "base"
        }, {
          name: "formulapercent",
          summary: "GROUP",
          formula: "0",
          label: "exrate"
        }, {
          name: "formulacurrency",
          summary: "SUM",
          formula: "{custcol_4601_witaxamount}",
          label: "amount"
        }, {
          name: 'currency',
          summary: "GROUP"
        }, {
          name: "formulacurrency",
          summary: "SUM",
          formula: "-{custcol_4601_witaxbaseamount}",
          label: "base"
        }, {
          name: 'exchangerate',
          summary: "GROUP",
          formula: "NVL({exchangerate},0)",
          label: "Exchange Rate Transaction"
        }];
        let resultSet = search.create({
          type: 'invoice',
          filters: currentFilters,
          columns: currentColumns
        }).run().getRange(0, 1000);

        for (let i = 0; i < resultSet.length; i++) {

          let currentLine = resultSet[i];

          let columns = currentLine.columns;
          let pay = 0;
          let isOldVersion = false;
          let decimal = 0;

          if (payInformation[currentLine.getValue(columns[0])]) {
            pay = payInformation[currentLine.getValue(columns[0])].pay;
            isOldVersion = payInformation[currentLine.getValue(columns[0])].isTotal;
            decimal = payInformation[currentLine.getValue(columns[0])].decimal;
          }

          let currency = currentLine.getValue(columns[11]);

          let date = currentLine.getValue(columns[1]);

          let rate = currentLine.getValue(columns[13]);
          if (ExchangeRateManager.isPeruCurrency(currency)) {
            rate = 1;
          } else if (!baseIsPeruCurrency) {
            let baseDate = stringToDate(date);
            rate = ExchangeRateManager.getRate(baseCurrency, baseDate);
          }

          let baseAmountWithoutExRate = parseFloat("" + currentLine.getValue(columns[8]));
          let detractionAmountWithoutExRate = parseFloat("" + currentLine.getValue(columns[10]));

          let baseAmount = baseAmountWithoutExRate * rate;
          let detractionAmount = detractionAmountWithoutExRate * rate;
          let rateDetraction = ((detractionAmount * 100) / baseAmount).toFixed(2);

          searchResult.push({
            transaction: {
              id: currentLine.getValue(columns[0]),
              value: currentLine.getValue(columns[3])
            },
            customer: {
              id: currentLine.getValue(columns[2]),
              value: currentLine.getText(columns[2])
            },
            trandate: currentLine.getValue(columns[1]),
            concept: currentLine.getValue(columns[4]),
            period: currentLine.getText(columns[5]),
            serie: currentLine.getValue(columns[6]),
            number: currentLine.getValue(columns[7]),
            base: baseAmount,
            exrate: rateDetraction,
            amount: detractionAmount,
            currency: currency,
            fxBase: currentLine.getValue(columns[12]),
            pay: pay,
            decimal: decimal,
            isOldVersion: isOldVersion
          });

        }
      }
      return searchResult;


    }

    function getSearchInvoice(filterContext) {

      let subsidiary = filterContext.subsidiary;
      let arAccount = filterContext.account;
      let customer = filterContext.customer;
      let datefrom = filterContext.from;
      let dateto = filterContext.to;
      let arrayInvoices = filterContext.transactions;
      let onlyAviable = filterContext.onlyAviable;

      let searchResult = [];

      let filters = []

      if (subsidiary) {
        filters.push('AND');
        filters.push(['subsidiary', 'anyof', subsidiary]);
      }

      if (arAccount) {
        filters.push("AND");
        filters.push(['accountmain', 'anyof', arAccount]);
      }

      if (customer) {
        filters.push("AND");
        filters.push(['name', 'anyof', customer]);
      }

      if (datefrom) {
        filters.push("AND");
        filters.push(['trandate', 'onorafter', datefrom]);
      }

      if (dateto) {
        filters.push("AND");
        filters.push(['trandate', 'onorbefore', dateto]);
      }

      if (Array.isArray(arrayInvoices)) {
        filters.push('AND');
        filters.push(['internalid', 'anyof'].concat(arrayInvoices))
      }

      let currentTransactionValues = {};

      if (onlyAviable) {

        let otherIds = [];

        search.create({
          type: 'customrecord_lmry_pe_det_sales_batch',
          filters: [
            ['custrecord_lmry_pe_det_s_b_status', 'is', '1'],
            'OR',
            ['custrecord_lmry_pe_det_s_b_status', 'is', '2'],
            'OR',
            ['custrecord_lmry_pe_det_s_b_status', 'is', '3'],
          ],
          columns: [
            'custrecord_lmry_pe_det_s_b_context',
            'custrecord_lmry_pe_det_s_b_status',
          ]
        }).run().each((line) => {

          let columns = line.columns;

          let status = line.getValue(columns[1]);

          let invoiceDetails = parseStringToObject(line.getValue(columns[0]));

          //It is not completed
          if (status != 3) {
            for (let x in invoiceDetails) {
              otherIds.push(x);
            }
          } else {

            for (let x in invoiceDetails) {

              if (!currentTransactionValues[x]) {
                currentTransactionValues[x] = {
                  isTotal: false,
                  pay: 0,
                  decimal: 0,
                };
              }

              if (typeof invoiceDetails[x] == 'string') {
                currentTransactionValues[x].isTotal = true;
              } else {
                currentTransactionValues[x].pay += parseFloat("" + invoiceDetails[x].pay);
                currentTransactionValues[x].decimal += parseFloat("" + invoiceDetails[x].decimal);
              }

            }
          }

          return true;
        });

        if (otherIds.length > 0) {
          filters.push("AND");
          filters.push(['internalid', 'noneof'].concat(otherIds));
        }
      }

      searchResult = createsearchInvoiceWithDetraction(filters, currentTransactionValues, subsidiary);

      return searchResult;

    }

    function stringToDate(value) {

      return format.parse({
        value: value,
        type: format.Type.DATE
      });

    }

    function dateToString(date) {

      return format.format({
        value: date,
        type: format.Type.DATE
      })
    }

    function generateRecordLink(id, name, type) {

      var href = url.resolveRecord({
        recordType: type,
        recordId: id,
        isEditMode: false,
      });


      return '<a class=' + 'dottedlink' + ' href="' +
        href + '" target="_blank">' + (name ? name : '-') + '</a>';

    }

    function getSearchPeriod() {

      let result = [];

      search.create({
        type: "accountingperiod",
        filters: [
          ["isquarter", "is", "F"],
          "AND",
          ["isyear", "is", "F"],
          "AND",
          ["closed", "is", "F"],
          "AND",
          ["isadjust", "is", "F"]
        ],
        columns: [{
          name: "internalid",
          summary: "GROUP",
          sort: 'DESC',
        }, {
          name: "periodname",
          summary: "GROUP"
        }]
      }).run().each((line) => {

        result.push({
          id: line.getValue(line.columns[0]),
          text: line.getValue(line.columns[1]),
        })

        return true;
      });

      return result;
    }

    function getCurrentPeriod() {

      var date = new Date();
      var dateString = dateToString(date);

      var result = {
        date: date,
        period: ''
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
        result.period = line.id;
      });

      return result;
    }

    function getBatchSearch() {

      let resultSearch = [];

      let searchContext = search.create({
        type: 'customrecord_lmry_pe_det_sales_batch',
        columns: [{
          name: 'internalid',
          sort: search.Sort.DESC
        },
          'custrecord_lmry_pe_det_s_b_period.periodname',
          'custrecord_lmry_pe_det_s_b_date',
          'custrecord_lmry_pe_det_s_b_user',
          'custrecord_lmry_pe_det_s_b_subsidiary',
          'custrecord_lmry_pe_det_s_b_status',
          'custrecord_lmry_pe_det_s_b_context',
          'custrecord_lmry_pe_det_s_b_journal',
          'custrecord_lmry_pe_det_s_b_summary',
          'custrecord_lmry_pe_det_s_b_end_date',
          'custrecord_lmry_pe_det_s_b_batch'
        ]
      }).run().getRange(0, 500);


      for (let i = 0; i < searchContext.length; i++) {

        let line = searchContext[i];

        let columns = line.columns;

        let countTrans = 0;

        let invoiceContext = JSON.parse(line.getValue(columns[6]));

        for (let x in invoiceContext) {
          countTrans++;
        }

        resultSearch.push({
          batchID: line.getValue(columns[0]),
          period: line.getValue(columns[1]),
          date: line.getValue(columns[2]),
          user: {
            id: line.getValue(columns[3]),
            text: line.getText(columns[3])
          },
          subsidiary: {
            id: line.getValue(columns[4]),
            text: line.getText(columns[4])
          },
          status: line.getValue(columns[5]),
          transactions: countTrans,
          journal: {
            id: line.getValue(columns[7]),
            text: line.getText(columns[7])
          },
          details: line.getValue(columns[8]),
          endDate: line.getValue(columns[9]),
          batchName: line.getValue(columns[10])
        });

      }
      return resultSearch;

    }

    function getBatchSearchForVoid(subsidiary, user, period, datefrom, dateto) {

      var filters = [
        ['isinactive', 'is', 'F'],
          'AND',
        ['custrecord_lmry_pe_det_s_b_status','is', '3'],
        'AND',
        ['custrecord_lmry_pe_det_s_b_period.closed', 'is', 'F']
      ];

      if(subsidiary){
        filters.push(
          'AND', 
          ['custrecord_lmry_pe_det_s_b_subsidiary', 'anyof', subsidiary]
        );
      }

      if(user){
        filters.push(
          'AND', 
          ['custrecord_lmry_pe_det_s_b_user', 'anyof', user]
        );
      }

      if(period){
        filters.push(
          'AND', 
          ['custrecord_lmry_pe_det_s_b_period', 'anyof', period]
        );
      }

      if(datefrom){
        filters.push(
          'AND', 
          ['custrecord_lmry_pe_det_s_b_date', 'onorafter', formatDate(datefrom)]
        );
      }

      if(dateto){
        filters.push(
          'AND', 
          ['custrecord_lmry_pe_det_s_b_date', 'onorbefore', formatDate(dateto)]
        );
      }

      let resultSearch = [];

      let searchContext = search.create({
        type: 'customrecord_lmry_pe_det_sales_batch',
        filters: filters,
        columns: [{
          name: 'internalid',
          sort: search.Sort.DESC
        },
          'custrecord_lmry_pe_det_s_b_period.periodname',
          'custrecord_lmry_pe_det_s_b_date',
          'custrecord_lmry_pe_det_s_b_user',
          'custrecord_lmry_pe_det_s_b_subsidiary',
          'custrecord_lmry_pe_det_s_b_status',
          'custrecord_lmry_pe_det_s_b_context',
          'custrecord_lmry_pe_det_s_b_journal',
          'custrecord_lmry_pe_det_s_b_summary',
          'custrecord_lmry_pe_det_s_b_end_date',
          'custrecord_lmry_pe_det_s_b_batch'
        ]
      }).run().getRange(0, 500);


      for (let i = 0; i < searchContext.length; i++) {

        let line = searchContext[i];

        let columns = line.columns;

        let countTrans = 0;

        let invoiceContext = JSON.parse(line.getValue(columns[6]));

        for (let x in invoiceContext) {
          countTrans++;
        }

        resultSearch.push({
          batchID: line.getValue(columns[0]),
          period: line.getValue(columns[1]),
          date: line.getValue(columns[2]),
          user: {
            id: line.getValue(columns[3]),
            text: line.getText(columns[3])
          },
          subsidiary: {
            id: line.getValue(columns[4]),
            text: line.getText(columns[4])
          },
          status: line.getValue(columns[5]),
          transactions: countTrans,
          journal: {
            id: line.getValue(columns[7]),
            text: line.getText(columns[7])
          },
          details: line.getValue(columns[8]),
          endDate: line.getValue(columns[9]),
          batchName: line.getValue(columns[10])
        });

      }
      return resultSearch;

    }

    function formatDate(date){
      let currentDate = new Date(date);
      let day = currentDate.getUTCDate();
      let month = Number(currentDate.getUTCMonth())+1;
      let year = currentDate.getUTCFullYear();

      return day + '/' + month + '/' + year;
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

    function getBasicSearchBySubsidiary(type, subsidiary) {

      let searchContext = {
        type: type,
        columns: ['name'],
        filters: [
          ['isInactive', 'is', 'F']
        ]
      };

      if (subsidiary) {
        searchContext.filters.push('AND');
        searchContext.filters.push(['subsidiary', 'anyof', subsidiary])
      }

      let resultSet = [];

      search.create(searchContext).run().each((line) => {

        resultSet.push({
          id: line.id,
          text: line.getValue('name')
        });

        return true;
      });
      return resultSet;

    }

    function getSearchClass(subsidiary) {
      return getBasicSearchBySubsidiary('classification', subsidiary);
    }

    function getSearchLocation(subsidiary) {
      return getBasicSearchBySubsidiary('location', subsidiary);
    }

    function getSearchDepartment(subsidiary) {
      return getBasicSearchBySubsidiary('department', subsidiary);
    }

    function getSubsidiariesByCountry(country){
      let response = [];

      let searchObj = search.create({
        type: 'subsidiary',
        filters: [
          ['country', 'is', country]
        ],
        columns: ['internalid', 'name']
      }).run().getRange(0,1000);

      searchObj.forEach( (line)=>{
        let cl = line.columns;

        response.push({
          id: line.getValue(cl[0]),
          text: line.getValue(cl[1])
        })
      });

      return response;
    }

    return {
      getClasification: getClasification,
      generateRecordLink: generateRecordLink,
      dateToString: dateToString,
      stringToDate: stringToDate,
      getAccountSetup: getAccountSetup,
      getCompanySetup: getCompanySetup,
      getSearchAccount: getSearchAccount,
      getSearchReceivableAccount: getSearchReceivableAccount,
      getSearchInvoice: getSearchInvoice,
      getSearchCustomer: getSearchCustomer,
      getSearchPeriod: getSearchPeriod,
      getSearchDepartment: getSearchDepartment,
      getSearchClass: getSearchClass,
      getSearchLocation: getSearchLocation,
      getCurrentPeriod: getCurrentPeriod,
      getBatchSearch: getBatchSearch,
      getBatchSearchForVoid: getBatchSearchForVoid,
      getSubsidiariesByCountry: getSubsidiariesByCountry
    }

  });

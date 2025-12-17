/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 * @Name LMRY_PE_generate_detractions_STLT_v2.0.js
 */
/******************************************************************************************
  VERSION 3.0
  23/05/2022 : Richard Galvez Lopez
  - Change the version Script to 2.1
  15/12/2022 | Richard Galvez (CP2201499)
  - add validations with try/catch
  23/01/2023 | Pierre Bernaola
  - Add message for limite of transactions (message_max_limit_transactions)
/*****************************************************************************************/

define([
  'detraction/serverWidget',
  'detraction/metadata',
  'detraction/loader',
  'detraction/batch',
  'detraction/batchFlow',
  'N/search',
  'N/runtime',
  "N/log",
  '../../../Latam_Library/LMRY_Popup_Lib'
],

  function (
    customWidget,
    metadata,
    loader,
    batch,
    batchFlow,
    search,
    runtime,
    log,
    Lib_Popup

  ) {

    function isOneWorld() {
      return runtime.isFeatureInEffect({
        feature: 'SUBSIDIARIES'
      });
    }

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
      try{
        if (context.request.method == 'GET') {

          var _PARAMS = loader.getParams(context);

          var _DAO = metadata.open();

          customWidget.setting(_DAO);

          let _form = customWidget.createForm('custtitle_suitelet');

          customWidget.addSubmitButton();

          customWidget.print().clientScriptModulePath = './LMRY_PE_generate_detractions_CLNT_v2.0.js';

          var _GROUP_A = customWidget.createGroup('custgroup_criteria');

          if (isOneWorld()) {
            _GROUP_A.addField("custfilter_subsi", 'select').isMandatory(true)
              .setOptions(loader.getOption(contextSearchSubsidiary()));
          } else {
            _GROUP_A.addField("custfilter_subsi", 'select', 'subsidiary').isMandatory(true);
          }


          _GROUP_A.addField("custhtml_setup", 'inlinehtml').setValue(getSetup(_DAO));

          _GROUP_A.addField("custhtml_content", 'longtext').isHidden(true); //.setValue(getAccountPopup());


          /* Other Filters */

          _GROUP_A.addField("custfilter_ap_acc", 'select').isNewColumn(true);
          //Vendor Popup
          let jsonVendorPopup = {
              form: _form,
              id: "custfilter_vendor",
              label: _DAO.getName("custfilter_vendor"),
              source: "vendor",
              container: "custgroup_criteria"
          };
          if (isOneWorld()) jsonVendorPopup['filters'] = { subsidiary: "custfilter_subsi" };
          let popupVendor = new Lib_Popup.CreatePopUp(jsonVendorPopup);
          if (Number(_PARAMS["custfilter_vendor"])) {
              let vendorObj = getVendor(_PARAMS["custfilter_vendor"]);
              popupVendor.setValue(vendorObj);
          }


          /* Dates Filters */
          _GROUP_A.addField("custfilter_date_from", 'date').isNewColumn(true).isShort(true);

          _GROUP_A.addField("custfilter_date_to", 'date').isShort(true);


          var _GROUP_B = customWidget.createGroup('custgroup_inf');
          /* Necesary accounts for the detraction flow */
          _GROUP_B.addField("custpage_acc_1", 'select', 'account').isOnlyRead(true);

          _GROUP_B.addField("custpage_acc_2", 'select', 'account').isOnlyRead(true);

          _GROUP_B.addField("custpage_acc_3", 'select', 'account').isOnlyRead(true);

          _GROUP_B.addField("custpage_acc_5", 'select', 'account').isOnlyRead(true);

          _GROUP_B.addField("custpage_acc_4", 'select', 'account').isOnlyRead(true);

          _GROUP_B.addField("custpage_detailed_rounding", 'checkbox').isOnlyRead(true);

          _GROUP_B.addField("custpage_i_date", 'date').isMandatory(true).isNewColumn(true);

          _GROUP_B.addField("custpage_i_period", 'select').isMandatory(true)
            .setOptions(loader.getOption(contextSearchPeriod()));

          _GROUP_B.addField("custpage_i_note", "text").isNewColumn(true);

          _GROUP_B.addField("custpage_i_batch", 'text').isMandatory(true);

          var _GROUP_C = customWidget.createGroup('custgroup_clasification');

          var clasifications = {
            'departments': 'custpage_c_department',
            'classes': 'custpage_c_class',
            'locations': 'custpage_c_location',
          }
          var records = {
            'departments': 'department',
            'classes': 'classification',
            'locations': 'location',
          }

          for (var key in clasifications) {

            var viewer = loader.getClasification(key);

            if (viewer != 'hidden') {
              log.error("isOneWorld()",isOneWorld())
              if (viewer == 'visible') {
                if (isOneWorld()) {
                  _GROUP_C.addField(clasifications[key], "select");
                } else {
                  _GROUP_C.addField(clasifications[key], "select");
                }
              } else {
                if (isOneWorld()) {
                  _GROUP_C.addField(clasifications[key], "select").isMandatory(true);
                } else {
                  _GROUP_C.addField(clasifications[key], "select").isMandatory(true);
                }
              }

            }

          }

          /*------  Table --------*/
          var _LIST = customWidget.createTable("custlist_transactions");

          _LIST.addColumn('custpage_col_trans_id', 'text').isHidden(true);

          _LIST.addColumn('custpage_col_trans_check', 'checkbox').isOnlyRead(false);

          _LIST.addColumn('custpage_col_tranid', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_vendor', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_date', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_account_det', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_proforma', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_code', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_operation', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_taxperiod', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_voucher', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_voucher_serie', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_voucher_number', 'text').isOnlyRead(true);

          _LIST.addColumn('custpage_col_currency', 'select', 'currency').isOnlyRead(true);

          _LIST.addColumn('custpage_col_amount', 'currency').isOnlyRead(true);

          _LIST.addColumn('custpage_col_fx_amount', 'currency').isOnlyRead(true);

          _LIST.addColumn('custpage_col_de_rate', 'percent').isOnlyRead(true);

          _LIST.addColumn('custpage_col_de_amount', 'currency').isOnlyRead(true);

          _LIST.addMarkAllButtons();

          /* Update values */
          // 2025.11.20 Review ISSUE Mid Market
          log.debug('onRequest - _PARAMS["custfilter_subsi"]', _PARAMS["custfilter_subsi"]);
          if (_PARAMS["custfilter_subsi"]) {

            customWidget.getField('custfilter_ap_acc')
              .setOptions(
                loader.getOption(contextSearchByAppAccount())
              );

            customWidget.getField('custpage_c_department')
              .setOptions(
                loader.getOption(contextSearchSegmentationBySubsidiary(1, _PARAMS["custfilter_subsi"]))
              );
            customWidget.getField('custpage_c_class')
              .setOptions(
                loader.getOption(contextSearchSegmentationBySubsidiary(2, _PARAMS["custfilter_subsi"]))
              );
            customWidget.getField('custpage_c_location')
              .setOptions(
                loader.getOption(contextSearchSegmentationBySubsidiary(3, _PARAMS["custfilter_subsi"]))
              );

            customWidget.setFieldValues(_PARAMS);


            var accounts = loader.getAccounts(_PARAMS["custfilter_subsi"]);

            var isError = false;
            var total = 0;
            for (var x in accounts) {
              total++;
              if (!accounts[x] && x != "custpage_acc_5") {
                isError = true;

              }
            }
            if (total != 0 && !isError) {

              customWidget.activeSubmit();

            } else {

              customWidget.message.warning(_DAO.getName('error_form_001'));

            }


            customWidget.setFieldValues(accounts);

            customWidget.setFieldValues(loader.getCurrentPeriod());

            try {
              var resultTransactions = loader.getTransactions(_PARAMS);

              for (var i = 0; i < resultTransactions.length; i++) {
                _LIST.addRow(resultTransactions[i]);
              }

              if(resultTransactions.length > 1000 ){
                customWidget.message.warning(_DAO.getName('message_max_limit_transactions'));
              }

            } catch (err) {
              let error = err.name;
              let message = err.message;

              if (error == "SSS_SEARCH_FOR_EACH_LIMIT_EXCEEDED") {

                message = _DAO.open('message_max_limit_error').replaceAll("\n", "<br>");

              }
              searchResult = [];
              customWidget.message.warning(message);
            }

          }

          context.response.writePage(customWidget.print());

        } else {

          var jsonContext = {
            'custpage_i_period': 'custrecord_lmry_pe_det_b_period',
            'custpage_i_date': 'custrecord_lmry_pe_det_b_date',
            'custpage_c_department': 'custrecord_lmry_pe_det_b_department',
            'custpage_c_class': 'custrecord_lmry_pe_det_b_class',
            'custpage_c_location': 'custrecord_lmry_pe_det_b_location',
            'custpage_i_note': 'custrecord_lmry_pe_det_b_note',
            'custpage_i_batch': 'custrecord_lmry_pe_det_b_batch',
            'custfilter_subsi': 'custrecord_lmry_pe_det_b_subsidiary'
          }

          var batchContext = {};

          for (var k in jsonContext) {

            if (k != 'custpage_i_date')
              batchContext[jsonContext[k]] = context.request.parameters[k];
            else {
              batchContext[jsonContext[k]] = loader.stringToDate(context.request.parameters[k]);
            }

          }

          batchContext['custrecord_lmry_pe_det_b_status'] = batch.Status.PENDING_FILE;
          batchContext['custrecord_lmry_pe_det_b_user'] = loader.getUser();
          batchContext['custrecord_lmry_pe_det_b_vendorbill'] = loader.getApplyTransactions(context);

          log.debug('batchContext', batchContext);

          batch.setting(metadata.open());

          var batchRecord = batch.create(batchContext);

          batchFlow.executeFlow(batchFlow.Type.GENERATE_FILE);

          batch.reloadPage(batchRecord);

        }

      // 2025.11.20 - ISSUE
      }catch(ls_error){
        let error = ls_error.name;
        let message = ls_error.message;

        if (error == "SSS_SEARCH_FOR_EACH_LIMIT_EXCEEDED") {

          message = _DAO.open('message_max_limit_error').replaceAll("\n", "<br>");

        }
        searchResult = [];
        customWidget.message.warning(message);
        context.response.writePage(customWidget.print());

        log.error('ls_error', ls_error);
      }
    }

    function contextSearchByAppAccount() {
      return {
        type: "account",
        filters: [
          ["type", "anyof", "AcctPay"],
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          'internalid', 'name'
        ]
      };
    }

    function getVendor(vendorID) {
      let dataEntity = search.lookupFields({
          type: 'vendor',
          id: Number(vendorID),
          columns: ['internalid', 'companyname', 'firstname', 'lastname', 'isperson', 'entityid', 'middlename']
      });
      let id = dataEntity.internalid[0].value;
      let isPerson = dataEntity.isperson;
      let firstname = dataEntity.firstname;
      let lastname = dataEntity.lastname;
      let companyname = dataEntity.companyname;
      let entityid = dataEntity.entityid;
      let middlename = dataEntity.middlename;
      let name = '';
      let customName = new Array();
      if (entityid) {
          customName.push(entityid);
      }
      if (isPerson === "T" || isPerson === true) {
          customName.push(firstname, middlename, lastname);
      } else {
          customName.push(companyname);
      }
      name = customName.filter((v) => v).join(" ");
      return { text: name, value: Number(vendorID) }
    }

    function contextSearchSegmentationBySubsidiary(type, subsidiary) {
      var segmentationType = {
        1: 'department',
        2: 'classification',
        3: 'location'
      };
      var jsonContext = {
        type: segmentationType[type],
        filters: [
          ["isinactive", "is", "F"],
        ],
        columns: [
          'internalid', 'name'
        ]
      };

      // 2025.11.20 Review ISSUE Mid Market
      log.debug('contextSearchSegmentationBySubsidiary : isOneWorld',isOneWorld());
      if (isOneWorld()) {
        jsonContext.filters.push('AND');
        jsonContext.filters.push(["subsidiary", "anyof", subsidiary]);
      }
      return jsonContext;
    }

    function contextSearchSubsidiary() {
      return {
        type: "subsidiary",
        filters: [
          ['isinactive', 'is', 'F'],
          'and',
          ['country', 'anyof', 'PE']
        ],
        columns: [
          'internalid', 'name'
        ]
      };
    }

    function contextSearchPeriod() {
      return {
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
          sort: 'DESC',
        }, {
          name: "periodname",
        }]
      };
    }

    function getSetup(dao) {
      var htmlSetup = '';
      htmlSetup += '<span class="dottedlink" id="settings" style="font-size:12px;cursor:pointer" >';
      htmlSetup += '<img width="16px" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDQ4LjM1MiA0OC4zNTIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ4LjM1MiA0OC4zNTI7IiB4bWw6c3BhY2U9InByZXNlcnZlIiBjbGFzcz0iIj48Zz48Zz4KCTxnPgoJCTxnPgoJCQk8Y2lyY2xlIGN4PSIyNC4xNzgiIGN5PSIyNC4xNzYiIHI9IjQuMTY3IiBkYXRhLW9yaWdpbmFsPSIjMDAwMDAwIiBjbGFzcz0iYWN0aXZlLXBhdGgiIHN0eWxlPSJmaWxsOiMwMjJGNjciIGRhdGEtb2xkX2NvbG9yPSIjMDIzMDY4Ij48L2NpcmNsZT4KCQkJPHBhdGggZD0iTTQ3LjM2OSwyMC4wNDZsLTUuODI0LTEuMDkyYy0wLjM1NC0xLjE3OC0wLjgxOC0yLjMwOC0xLjM5My0zLjM3MWwzLjM3LTQuOTI3YzAuMzEyLTAuNDU2LDAuMjQ3LTEuMTQyLTAuMTQ0LTEuNTMyICAgICBsLTQuMTU1LTQuMTU2Yy0wLjM5MS0wLjM5MS0xLjA3Ni0wLjQ1NC0xLjUzLTAuMTQzbC00LjkzLDMuMzcyYy0xLjA5NC0wLjU5LTIuMjU5LTEuMDYzLTMuNDc0LTEuNDJsLTEuMDg2LTUuNzk0ICAgICBDMjguMTAxLDAuNDQsMjcuNTczLDAsMjcuMDE5LDBoLTUuODc2Yy0wLjU1MywwLTEuMDgyLDAuNDQtMS4xODUsMC45ODNMMTguODYsNi44MzRjLTEuMTY1LDAuMzU2LTIuMjgyLDAuODItMy4zMzQsMS4zOTIgICAgIEwxMC42Niw0Ljg5N0MxMC4yMDQsNC41ODUsOS41MTgsNC42NDksOS4xMjgsNS4wNEw0Ljk3Miw5LjE5NmMtMC4zOTEsMC4zOTEtMC40NTQsMS4wNzYtMC4xNDMsMS41MzJsMy4zNSw0Ljg5NiAgICAgYy0wLjU2NCwxLjA1Mi0xLjAyMSwyLjE2OC0xLjM3MSwzLjMzMWwtNS44MjQsMS4wOTFjLTAuNTQyLDAuMTAzLTAuOTgyLDAuNjMyLTAuOTgyLDEuMTg1djUuODc2YzAsMC41NTMsMC40NCwxLjA4MiwwLjk4MiwxLjE4NiAgICAgbDUuODIsMS4wOTFjMC4zNTUsMS4xODgsMC44MjMsMi4zMjgsMS40MDEsMy4zOTlsLTMuMzEyLDQuODQyYy0wLjMxMiwwLjQ1Ni0wLjI0OCwxLjE0MiwwLjE0MywxLjUzMWw0LjE1NSw0LjE1NSAgICAgYzAuMzkxLDAuMzkyLDEuMDc2LDAuNDU0LDEuNTMyLDAuMTQ1bDQuODQtMy4zMTNjMS4wNDEsMC41NjMsMi4xNDYsMS4wMjEsMy4yOTksMS4zNzVsMS4wOTcsNS44NTMgICAgIGMwLjEwMywwLjU0MywwLjYzMiwwLjk4MSwxLjE4NSwwLjk4MWg1Ljg3N2MwLjU1NCwwLDEuMDgxLTAuNDM4LDEuMTg1LTAuOTgxbDEuMDg3LTUuNzk1YzEuMi0wLjM1NCwyLjM1NC0wLjgyMSwzLjQzOC0xLjQwMSAgICAgbDQuOTAxLDMuMzU0YzAuNDU2LDAuMzEyLDEuMTQyLDAuMjQ4LDEuNTMyLTAuMTQ1bDQuMTUzLTQuMTUzYzAuMzkzLTAuMzkyLDAuNDU1LTEuMDc1LDAuMTQ1LTEuNTMybC0zLjMzNS00Ljg3MyAgICAgYzAuNTg5LTEuMDg0LDEuMDYyLTIuMjM3LDEuNDIzLTMuNDRsNS44MTktMS4wOTFjMC41NDEtMC4xMDQsMC45OC0wLjYzMywwLjk4LTEuMTg2di01Ljg3NiAgICAgQzQ4LjM1MywyMC42NzgsNDcuOTEyLDIwLjE0OSw0Ny4zNjksMjAuMDQ2eiBNMjQuMTc4LDM0LjI2MWMtNS41NjgsMC0xMC4wODMtNC41MTUtMTAuMDgzLTEwLjA4NiAgICAgYzAtNS41NjcsNC41MTUtMTAuMDgzLDEwLjA4My0xMC4wODNjNS41NywwLDEwLjA4Niw0LjUxNiwxMC4wODYsMTAuMDgzQzM0LjI2NCwyOS43NDYsMjkuNzQ2LDM0LjI2MSwyNC4xNzgsMzQuMjYxeiIgZGF0YS1vcmlnaW5hbD0iIzAwMDAwMCIgY2xhc3M9ImFjdGl2ZS1wYXRoIiBzdHlsZT0iZmlsbDojMDIyRjY3IiBkYXRhLW9sZF9jb2xvcj0iIzAyMzA2OCI+PC9wYXRoPgoJCTwvZz4KCTwvZz4KPC9nPjwvZz4gPC9zdmc+">';
      htmlSetup += "&nbsp" + dao.getName("custsetup_setting_subsi");
      htmlSetup += '</span>';
      return htmlSetup;
    }

    function getAccountPopup() {

      var resultContext = {
        bank: [],
        expense: [],
        other: []
      }

      var searchContext = search.create({
        type: "account",
        filters: [
          ["type", "anyof", "OthCurrLiab", "Bank", "Expense"],
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          'internalid', 'name', 'type'
        ]
      });

      var myPagedData = searchContext.runPaged({
        pageSize: 1000
      });

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({
          index: pageRange.index
        });
        myPage.data.forEach(function (result) {

          var id = result.getValue('internalid');
          var type = result.getValue('type');
          var name = result.getValue('name');

          var context = {
            value: id,
            text: name
          };

          switch (type) {
            case "OthCurrLiab":
              resultContext.other.push(context);
              break;
            case "Bank":
              resultContext.bank.push(context);
              break;
            case "Expense":
              resultContext.expense.push(context);
              break;

          }

          return true;

        });
      });
      return JSON.stringify(resultContext);

    }


    return {
      onRequest: onRequest
    };

  });

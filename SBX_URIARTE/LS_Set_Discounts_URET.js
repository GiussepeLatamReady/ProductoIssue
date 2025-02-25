/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 * @Name LS_Set_Discounts_URET.js
 * @Author anthony@latamready.com
 */
define(['N/log', 'N/record', 'N/runtime', 'N/search', 'N/task', '/SuiteBundles/Bundle 37714/Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './LS_Set_Discounts_LBRY.js', './LS_AutoPercepcionDesc_LBRY_V2.0'/*,
'/SuiteBundles/Bundle 37714/WTH_Library/LMRY_AutoPercepcionDesc_LBRY_V2.0'*/],
    /**
 * @param{log} log
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */
    (log, record, runtime, search, task, libraryMail, libraryDiscount, libraryPercepciones/*, libraryBundlePercepciones*/) => {

        const LMRY_script = 'LS - Set Discounts URET';

        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

          try{

            let recordObj = scriptContext.newRecord;
            let evento = scriptContext.type;
            let form = scriptContext.form;

            let country = recordObj.getValue('custbody_lmry_subsidiary_country');

            if(country != '11'){
              return true;
            }

            if(['estimate', 'salesorder', 'invoice'].indexOf(recordObj.type) == -1){
              return true;
            }

            if(recordObj.type == 'salesorder' && evento == 'view'){
              hideButtons(form, recordObj);
            }

            if(['create', 'copy', 'edit'].indexOf(evento) == -1){
              return true;
            }

            if(runtime.executionContext == 'USERINTERFACE'){
              disableDiscount(form);
            }

            /*if(recordObj.type == 'invoice' && recordObj.getValue('createdfrom') && evento == 'create'){

              let descuentoUR = recordObj.getText('custbody_ur_porc_desglobal');

              if(descuentoUR){

                recordObj.setText('discountrate', descuentoUR);

              }

            }*/


          }catch (err){

            log.error(' beforeLoad ', err);
            libraryMail.sendemail('[beforeLoad] ' + err, LMRY_script);

          }

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

          try{

            let oldRecord = scriptContext.oldRecord;
            let afterObj = scriptContext.newRecord;
            let evento = scriptContext.type;

            if(['create', 'copy', 'edit'].indexOf(evento) == -1){
              return true;
            }

            let country = afterObj.getValue('custbody_lmry_subsidiary_country');

            if(country != '11'){
              return true;
            }

            /*let idSO = '';

            if(afterObj.type == 'invoice'){
              idSO = afterObj.getValue('createdfrom') || '';
            }

            if(afterObj.type == 'salesorder'){
              idSO = afterObj.id;
            }*/

            if(['estimate', 'salesorder', 'invoice', 'creditmemo'].indexOf(afterObj.type) != -1){

              let objRecord = record.load({
                type: afterObj.type,
                id: afterObj.id
              });

              if(!validateSuitelet(objRecord)){
                libraryDiscount.setPriceList(objRecord);
              }

              libraryDiscount.setGlobalDiscountItem(objRecord);

              objRecord = record.load({
                type: afterObj.type,
                id: afterObj.id
              });

              libraryDiscount.setGlobalDiscountColumn(objRecord);

              libraryDiscount.setLineDiscountColumn(objRecord);

              objRecord.save({disableTriggers: true, ignoreMandatoryFields: true});

              //4 transacciones incluye credit memo
              libraryPercepciones.autopercAfterSubmit(scriptContext, 'AR', scriptContext.type);

              //libraryBundlePercepciones.autopercAfterSubmit(scriptContext, 'AR', scriptContext.type);

              if(afterObj.type == 'invoice' || afterObj.type == 'creditmemo'){
                libraryDiscount.updateTransactionFields(objRecord);
              }

            }

          }catch (err){

            log.error(' afterSubmit ', err);
            libraryMail.sendemail('[afterSubmit] ' + err, LMRY_script);

          }

        }


        function disableDiscount(form){

          let sublistItem = form.getSublist('item');

          if(sublistItem){

            let salesDiscountColumn = sublistItem.getField({
                id: 'custcol_lmry_col_sales_discount'
            });

            if(salesDiscountColumn && JSON.stringify(salesDiscountColumn) != '{}'){
              salesDiscountColumn.updateDisplayType({
                  displayType: 'disabled'
              });
            }

          }

        }

        function hideButtons(form, objRecord){

          let nameSubsidiary = objRecord.getText('subsidiary');

          if(!nameSubsidiary.includes("Uriarte Taldea 01") && ! nameSubsidiary.includes("AgroFel 01")){
            return;
          }

          let billButton = form.getButton({id: 'billremaining'});
          let fulfillButton = form.getButton({id: 'process'});

          if(!billButton){
            return;
          }

          let searchSO = search.create({
            type: 'salesorder',
            columns: ['fxamountunbilled', 'fxamount'],
            filters: [
              {name: 'internalid', operator: 'is', values: objRecord.id},
              {name: 'custcol_lmry_ar_item_tributo', operator: 'is', values: 'T'}
            ],
            settings: [search.createSetting({name: 'consolidationtype',value: 'NONE'})]
          });

          searchSO = searchSO.run().getRange({start: 0, end: 10});

          if(!searchSO || !searchSO.length){
            return;
          }

          let amountPerception = 0;
          let amountUnbilled = searchSO[0].getValue('fxamountunbilled') || 0;

          for(let i = 0; i < searchSO.length; i++){
            amountPerception += parseFloat(searchSO[i].getValue('fxamount') || 0);
          }

          if(amountPerception != amountUnbilled){
            return;
          }

          /*if(fulfillButton){
            fulfillButton.isHidden = true;
          }*/

          if(billButton){
            billButton.isHidden = true;
          }

        }

        function validateSuitelet(objRecord){

          let idSO = objRecord.id;

          if(objRecord.type == 'invoice'){
            idSO = objRecord.getValue('createdfrom') || idSO;
          }

          //log.debug('idSO', idSO);

          let searchStlt = search.create({
            type: 'customrecord_ls_local_sales_order_log',
            filters: [[["custrecord_ls_local_so_agrofel","anyof",idSO]],"OR",[["custrecord_ls_local_so_uriarte","anyof",idSO]]]
          });

          searchStlt = searchStlt.run().getRange({start: 0, end: 1});

          if(searchStlt && searchStlt.length){
            return true;
          }

          return false;

        }


        return {beforeLoad, afterSubmit}

    });

/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_VendorURET_V2.0.js                          ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     17 ago 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

 define(['N/search', 'N/runtime', 'N/ui/serverWidget', 'N/log', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_HideViewLBRY_V2.0', './Latam_Library/LMRY_UniversalSetting_Purchase_LBRY'],

 function (search, runtime, serverWidget, log, Library_Mail, Library_HideView, library_Uni_Setting) {

     var LMRY_script = 'LMRY Vendor URET V2.0';
     var LMRY_access = false;
     var LMRY_countr = new Array();
     var RCD = '';
     var isURET = '';
     var FORM = '';
     var licenses = [];


     /**
      * Function definition to be triggered before record is loaded.
      *
      * @param {Object} scriptContext
      * @param {Record} scriptContext.newRecord - New record
      * @param {string} scriptContext.type - Trigger type
      * @param {Form} scriptContext.form - Current form
      * @Since 2015.2
      */
     function beforeLoad(scriptContext) {
         try {
             isURET = scriptContext.type;
             FORM = scriptContext.form;
             RCD = scriptContext.newRecord;

             var subsidiary = RCD.getValue('subsidiary');
             licenses = Library_Mail.getLicenses(subsidiary);

             var country = new Array();
             country[0] = '';
             country[1] = '';

             if (isURET == 'create') {
                 try {

                     var subsidiari = RCD.getValue({
                         fieldId: 'subsidiary'
                     });

                     if (subsidiari == '' || subsidiari == null) {
                         var userS = runtime.getCurrentUser();
                         subsidiari = userS.subsidiary;
                     }

                     if (subsidiari != '' && subsidiari != null) {
                         var filters = new Array();
                         filters[0] = search.createFilter({
                             name: 'internalid',
                             operator: search.Operator.ANYOF,
                             values: [subsidiari]
                         });
                         var columns = new Array();
                         columns[0] = search.createColumn({
                             name: 'country'
                         });

                         var getfields = search.create({
                             type: 'subsidiary',
                             columns: columns,
                             filters: filters
                         });
                         getfields = getfields.run().getRange(0, 1000);

                         if (getfields != '' && getfields != null) {
                             country[0] = getfields[0].getValue('country');
                             country[1] = getfields[0].getText('country');
                         }
                     }
                 } catch (err) {

                     country[0] = runtime.getCurrentScript().getParameter({
                         name: 'custscript_lmry_country_code_stlt'
                     });
                     country[1] = runtime.getCurrentScript().getParameter({
                         name: 'custscript_lmry_country_desc_stlt'
                     });
                 }

                 if (FORM != '' && FORM != null) {
                     Library_HideView.HideSubTab(FORM, country[1], RCD.type, licenses);
                 }
             }

             if (isURET == 'view' || isURET == 'edit') {
                 // Valida el Acceso
                 ValidateAccessV(FORM, RCD.getValue({
                     fieldId: 'subsidiary'
                 }), licenses);
             }

             if (isURET == 'view' || isURET == 'edit') {
                 log.debug("RCD.type", RCD.type);
                 // 2021.11.30 : LatamReady - Automatic Set
                 if (!library_Uni_Setting.search_entity_purchase(licenses)) {
                     var sublist = FORM.getSublist({
                         id: 'recmachcustrecord_lmry_us_entity'
                     });
                     try {
                         sublist.displayType = serverWidget.SublistDisplayType.HIDDEN;
                     } catch (err) {
                         log.error('Only Information', 'LatamReady - Automatic Set : HIDDEN');
                     }
                 }
                 // Only Vendor
             }

             //SOLO COLOMBIA Y CUSTOMER
             if (['edit', 'view', 'create', 'copy'].indexOf(isURET) > -1 && (RCD.type == 'vendor') && RCD.getValue('custentity_lmry_subsidiary_country') == '48') {

                 var featurelang = runtime.getCurrentScript().getParameter({ name: 'LANGUAGE' });
                 featurelang = featurelang.substring(0, 2);

                 var agenteRetencion = FORM.getField('custentity_lmry_es_agente_retencion');

                 if (featurelang == 'es') {
                     agenteRetencion.label = 'Latam - CO Retenciones Masivas por Líneas';
                 } else {
                     agenteRetencion.label = 'Latam - CO Massive WHT by Lines';
                 }

             }

             //custpage de la SUNAT solo para PERU
             if ((isURET == 'create' || isURET == 'edit' || isURET == 'view') && LMRY_countr[0] == 'PE' && LMRY_access == true) {
                 var lmry_exchange_rate = FORM.addField({
                     id: 'custpage_lmry_sunat_link_consulta_ruc',
                     label: 'Latam - Consulta RUC - SUNAT',
                     type: serverWidget.FieldType.INLINEHTML
                 }).defaultValue = '<p class="smallgraytextnolink" style="font-size:12px;">' + 'LATAM - CONSULTA RUC - SUNAT' + '</p><p style="font-weight:bold;font-size:12px">' + '<a href="http://www.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias" target="_blank" >http://www.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias</a>' + '</p>';
             }

             var featureCheck = Library_Mail.getAuthorization(733, licenses);
             if (featureCheck && Library_Mail.getAuthorization(26, licenses)) {
                 var person_type = RCD.getValue('custentity_lmry_pa_person_type')
                 var document_type = RCD.getValue('custentity_lmry_sunat_tipo_doc_id');
                 var entitycountry = RCD.getValue('custentity_lmry_country')
                 var documentTypeScriptId, entitycountryScriptId;
                 if (document_type) {
                     documentTypeScriptId = search.lookupFields({
                         type: 'customrecord_lmry_tipo_doc_iden',
                         id: document_type,
                         columns: ["scriptid"]
                     }).scriptid.toLowerCase();
                 }

                 if (entitycountry) {
                     entitycountryScriptId = search.lookupFields({
                         type: 'customrecord_lmry_mx_country',
                         id: entitycountry,
                         columns: ["scriptid"]
                     }).scriptid.toLowerCase();
                 }
                 
                 var tax_number = RCD.getValue('vatregnumber')
                 var digit_verifier = RCD.getValue('custentity_lmry_digito_verificator');

                 //entityCountry=21 y documentType=12
                 if (entitycountryScriptId == "value_21_t1038906_417" && LMRY_countr[0] == 'CO' && person_type == 5 && documentTypeScriptId == 'value_12_t1038906_417' /*12*/ && !isNaN(tax_number) && tax_number.length == 9 && digit_verifier == "") {
                     if (isURET == 'view') {
                         var featurelang = runtime.getCurrentScript().getParameter({ name: 'LANGUAGE' });
                         featurelang = featurelang.substring(0, 2);
                         var lblBtn = 'Verifier Digit';
                         if (featurelang == 'es') {
                             lblBtn = 'Digito Verificador';
                         }
                         if (featurelang == 'pt') {
                             lblBtn = "Dígito Verificador";
                         }
                         FORM.clientScriptModulePath = "./LMRY_VendorCLNT_V2.0.js";
                         FORM.addButton({
                             id: 'custpage_veri_digit',
                             label: lblBtn,
                             functionName: "generateVerifierDigit()"
                         });
                     }
                 }
             }

             var Field = FORM.getField('custentity_lmry_subsidiary_country');
             if (Field) {
                Field.updateDisplayType({
                    displayType: 'hidden'
                });
             }
             
         } catch (err) {
             Library_Mail.sendemail('[beforeLoad] ' + err, LMRY_script);
         }
         return true;
     }

     /**
      * Function definition to be triggered before record is loaded.
      *
      * @param {Object} scriptContext
      * @param {Record} scriptContext.newRecord - New record
      * @param {Record} scriptContext.oldRecord - Old record
      * @param {string} scriptContext.type - Trigger type
      * @Since 2015.2
      */
     function beforeSubmit(scriptContext) {

     }

     /**
      * Function definition to be triggered before record is loaded.
      *
      * @param {Object} scriptContext
      * @param {Record} scriptContext.newRecord - New record
      * @param {Record} scriptContext.oldRecord - Old record
      * @param {string} scriptContext.type - Trigger type
      * @Since 2015.2
      */
     function afterSubmit(scriptContext) {

     }

     /* ------------------------------------------------------------------------------------------------------
      * featureId = 1 Registro de Compras Electronico - Peru (PE)
      * --------------------------------------------------------------------------------------------------- */
     function ValidateAccessV(RCD, ID, licenses) {
         try {
             // Oculta todos los campos LMRY
             if (isURET == 'view') {
                 Library_Mail.onFieldsHide(1, RCD, true);
             }

             // Inicializa variables Locales y Globales
             LMRY_access = false;
             LMRY_countr = Library_Mail.Validate_Country(ID);

             // Verifica que el arreglo este lleno
             if (LMRY_countr.length < 1) {
                 return true;
             }

             if ((isURET == 'view' || isURET == 'edit') && (FORM != '' && FORM != null)) {
                 Library_HideView.HideSubTab(FORM, LMRY_countr[1], RCD.type, licenses);
             }

             LMRY_access = Library_Mail.getCountryOfAccess(LMRY_countr, licenses);

             // Solo si tiene acceso
             if (LMRY_access == true) {
                 if (isURET == 'view') {
                     Library_Mail.onFieldsDisplayE(RCD, LMRY_countr[1], true);
                 }
             }
         } catch (err) {
             Library_Mail.sendemail(' [ ValidateAccessV ] ' + err, LMRY_script);
         }

         return true;
     }

     return {
         beforeLoad: beforeLoad
         // beforeSubmit: beforeSubmit,
         // afterSubmit: afterSubmit
     };

 });
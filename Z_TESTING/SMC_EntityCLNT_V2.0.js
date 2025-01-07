/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_EntityCLNT_V2.0.js			                    ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     16 Ago 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/currentRecord', 'N/runtime', 'N/search', 'N/log', 'N/url', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0',
  './Latam_Library/LMRY_Val_TransactionLBRY_V2.0', './Latam_Library/LMRY_Entity_Validate_LBRY_V2.0', './Latam_Library/LMRY_ValidateRegNumberLBRY_V2.0', 'N/record',
  './Latam_Library/LMRY_Log_LBRY_V2.0'
],

  function (currentRecord, runtime, search, log, url, Library_Mail, Library_Val, Library_Entity_Validate, Library_Validate_RegNumber, record, libLog) {

    var LMRY_script = 'LatamReady - Entity CLNT V2.0';
    var LMRY_access = false;
    var LMRY_countr = new Array();
    var LMRY_Result = new Array();
    var currentRCD = '';
    var mode_type = '';
    var licenses = [];
    var results = '';
    var multiselect_br_exempt = '';
    var listBRExempt = {};

    var Val_Campos = new Array();
    // SuiteTax Feature
    var ST_FEATURE = false;

    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
      try {
        mode_type = scriptContext.mode;
        currentRCD = scriptContext.currentRecord;

        var subsidiary = currentRCD.getValue('subsidiary');
        licenses = Library_Mail.getLicenses(subsidiary);

        // Desactiva el campo
        currentRCD.getField({
          fieldId: 'custentity_lmry_subsidiary_country'
        }).isDisabled = true;

        // Activa el campo
        var sub_country = currentRCD.getValue('custentity_lmry_subsidiary_country')

        if (sub_country == '' || sub_country == null) {
          currentRCD.getField({
            fieldId: 'custentity_lmry_subsidiary_country'
          }).isDisabled = false;
        }

        // Valida el Acceso
        ValidateAccessE(subsidiary);
        currentRCD.getField({
          fieldId: 'custentity_lmry_subsidiary_country'
        }).isDisplay = false;

        //Filtrado de campo "LATAM - BR EXEMPT TAX" de acuerdo al tipo de documento de identidad
        if (LMRY_Result[0] == 'BR' && LMRY_Result[2] && runtime.executionContext == 'USERINTERFACE') {
          if (mode_type != 'view' && mode_type != 'print') {
            multiselect_br_exempt = currentRCD.getField({
              fieldId: 'custpage_br_exempt'
            });
            cargarCustpage();
          }
        }

      } catch (err) {
        console.log("[ pageInit ]", err);
        Library_Mail.sendemail('[pageInit] ' + err, LMRY_script);
        libLog.doLog("[ pageInit ]", err);
      }


    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
      currentRCD = scriptContext.currentRecord;
      var name = scriptContext.fieldId;
      var subListName = scriptContext.sublistId;

      try {
        // 2020.12.18 - En contacto no hace reload
        if (name == 'subsidiary' && mode_type == 'create' &&
          currentRCD.type != 'contact' &&
          (subListName == '' || subListName == null)) {
          var cf = currentRCD.getValue('customform');
          var sub = currentRCD.getValue('subsidiary');

          if (cf != '' && cf != null && cf != -1 && sub != '' && sub != null && sub != -1) {

            setWindowChanged(window, false);

            var currentUrl = window.location.href;
            currentUrl = currentUrl.replace(/(\&)*(cf\=\-*[0-9]+)/g, "");
            currentUrl = currentUrl.replace(/(\&)*(subsidiary\=[0-9]+)/g, "");
            var params = "cf=" + cf + "&subsidiary=" + sub;
            if ((/\?(.*)/).test(currentUrl)) {
              currentUrl = currentUrl + "&" + params;
            } else {
              currentUrl = currentUrl + "?" + params;
            }
            window.location.href = currentUrl;
            //window.location.href = window.location.href.split('?')[0] + '?whence=&cf=' + cf + '&subsidiary=' + sub;
          }
          return true;
        }
      } catch (err) {
        console.log("[ fieldChanged ]",err);
        Library_Mail.sendemail('[fieldChanged] ' + err, LMRY_script);
        libLog.doLog("[ fieldChanged ]", err);
        return false;
      }
      return true;
    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
      try {

        var currentRCD = scriptContext.currentRecord;

        if (scriptContext.fieldId == 'subsidiary') {

          var subt = currentRCD.getValue('subsidiary');

          if (subt != '' && subt != null) {
            currentRCD.getField({
              fieldId: 'custentity_lmry_subsidiary_country'
            }).isDisabled = true;
          }

          // Valida el Acceso
          ValidateAccessE(subt);

          // Cambio de campo
          LMRY_swinit = true;
          var lmry_entity = currentRCD.getValue({
            fieldId: 'subsidiary'
          });
          if (lmry_entity == null || lmry_entity == '') {
            return true;
          }
          var featuresubs = runtime.isFeatureInEffect({
            feature: 'SUBSIDIARIES'
          });
          if (featuresubs == true || featuresubs == 'T') {
            var subs = lmry_entity;
            var user = runtime.getCurrentUser();

            if (user.subsidiary == subs) {
              ValidateAccessE(subs);
            }
          }
          LMRY_swinit = false;

          return true;
        }

        //Seteo de campo "LATAM - BR EXEMPT TAX" de acuerdo al tipo de documento de identidad
        if (LMRY_Result[0] == 'BR' && LMRY_Result[2] && runtime.executionContext == 'USERINTERFACE') {
          if (mode_type != 'view' && mode_type != 'print') {

            if (scriptContext.fieldId == 'custentity_lmry_sunat_tipo_doc_id') {
              currentRCD.setValue('custpage_br_exempt', '');
              var docid = currentRCD.getValue('custentity_lmry_sunat_tipo_doc_id');
              filtrarBRExempt(docid, results);
            }

            if (scriptContext.fieldId == 'custpage_br_exempt') {
              var docid = currentRCD.getValue('custpage_br_exempt');
              currentRCD.setValue('custentity_lmry_br_exempt_tax', docid);
            }
          }
        }

        /* ******************************************************************** *
        * Automatización entidad de cliente (Mejoras Imprimible Factura Exterior)
        * Requerimiento C0586           Date: 8 Aug 2022
        * ******************************************************************** */
        ST_FEATURE = runtime.isFeatureInEffect({ feature: "tax_overhauling" });
        if (ST_FEATURE == false || ST_FEATURE == "F") {
          var sub_country = currentRCD.getValue('custentity_lmry_subsidiary_country');
          if (currentRCD.type == 'customer' || currentRCD.type == 'prospect' || currentRCD.type == 'lead') {
            if (mode_type == 'create' && sub_country == 157) {
              if (scriptContext.fieldId == 'vatregnumber') {
                taxRegNumAutomaticFieldsMx();
                return true;
              }
              if (scriptContext.fieldId == 'custentity_lmry_country') {
                foreignAutomaticFieldsMx();
                return true;
              }
            }
          }
        }

      } catch (err) {
        console.log("[ validateField ]", err);
        Library_Mail.sendemail('[validateField] ' + err, LMRY_script);
        libLog.doLog("[ validateField ]", err);
        return false;
      }
      return true;

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
      try {
        currentRCD = scriptContext.currentRecord;

        /* **********************************
         * 2021.06.17 - No se hace validacion
         * en Contactos
         ********************************** */
        if (currentRCD.type == 'contact') {
          return true;
        }

        var country = LMRY_countr[0];
        var val = 0;
        var val1 = 0;

        /* **********************************
         * 2021.07.16  - Mejora
         * Solo Customer - Vendor
         ********************************** */
        if (currentRCD.type == 'customer' || currentRCD.type == 'vendor') {
          if (country = 'PE' && Library_Mail.getAuthorization(651, licenses) == true) {
            // TAX REG. Number = Latam - Taxpayer Registration Number
            var TaxNumber = currentRCD.getValue('custentity_lmry_sv_taxpayer_number');
            currentRCD.setValue('vatregnumber', TaxNumber);
          }
        }

        ValidateAccessE(currentRCD.getValue('subsidiary'));

        if (Val_Campos.length > 0) {
          if (Library_Val.Val_Mensaje(currentRCD, Val_Campos) == false)
            return false;
        }

        // Valida Formato del campo Nro de Contribuyente
        if (!Valida_TaxNumber()) {
          return false;
        }

        // Solo para peru
        if (!LMRY_access) {
          return true;
        }

        seteoARExtranjero(currentRCD);

        // Validacion del Numero de C.U.I.T. solo para Argentina
        if (!Valida_CUIT()) {
          return false;
        }

        // Validacion del Numero de Ruc solo para PERU
        if (!ValidaRUC()) {
          return false;
        }

        // Validacion del Número de RUT solo para CHILE
        if (!ValidaRUT()) {
          return false;
        }

        // Validacion del Numero de Ruc solo para COLOMBIA
        if (!ValidaNIT()) {
          return false;
        }

        //Validación de Vat Reg Number de acuerdo al tipo de identidad, solo para BRASIL
        if (!Library_Validate_RegNumber.validateVatRegNumber(currentRCD, country, LMRY_access)) {
          return false;
        }


        if (!Library_Entity_Validate.validateEntityDuplicity(currentRCD, licenses)) {
          return false;
        }

      } catch (err) {
        console.log("[ saveRecord ]", err);
        Library_Mail.sendemail(' [ saveRecord ] ' + err, LMRY_script);
        libLog.doLog("[ saveRecord ]", err);
        return false;
      }
      return true;
    }

    /* ------------------------------------------------------------------------------------------------------
     * Valida formato del campo Nro de Contribuyente
     * --------------------------------------------------------------------------------------------------- */
    function Valida_TaxNumber() {
      // Solo para Chile
      if (LMRY_countr[0] == 'CL' && Library_Mail.getAuthorization(600, licenses)) {
        var regexp_8dig = /^[0-9]{2}\.[0-9]{3}\.[0-9]{3}$/;
        var regexp_7dig = /^[0-9]{1}\.[0-9]{3}\.[0-9]{3}$/;

        var TaxNumber = currentRCD.getValue({ fieldId: 'custentity_lmry_sv_taxpayer_number' });

        if (TaxNumber != null && TaxNumber != '') {
          var tested = regexp_8dig.test(TaxNumber) || regexp_7dig.test(TaxNumber);

          if (!tested) {
            // Verifica el idioma de la instancia
            var idioma = runtime.getCurrentScript().getParameter({
              name: 'LANGUAGE'
            });
            idioma = idioma.substring(0, 2);

            var TaxNumberField = currentRCD.getField({
              fieldId: 'custentity_lmry_sv_taxpayer_number'
            });
            // Mensaje al usuario
            if (idioma == 'es') {
              alert('El campo "' + TaxNumberField.label + '" debe tener el formato xx.xxx.xxx o x.xxx.xxx');
            } else {
              alert('The "' + TaxNumberField.label + '" field must be in the format xx.xxx.xxx or x.xxx.xxx');
            }
            return false;
          }
        } else {
          var TaxNumberField = currentRCD.getField({
            fieldId: 'custentity_lmry_sv_taxpayer_number'
          });
          // Mensaje al usuario
          if (idioma == 'es') {
            alert('El campo "' + TaxNumberField.label + '" no debe estar vacío');
          } else {
            alert('The "' + TaxNumberField.label + '" field must not be empty');
          }
          return false;
        }

        var pVerificador = currentRCD.getValue('custentity_lmry_digito_verificator');
        if (pVerificador == null || pVerificador == '') {
          var pVerificadorField = currentRCD.getField({
            fieldId: 'custentity_lmry_digito_verificator'
          });
          // Mensaje al usuario
          if (idioma == 'es') {
            alert('El campo "' + pVerificadorField.label + '" no debe estar vacío');
          } else {
            alert('The "' + pVerificadorField.label + '" field must not be empty');
          }
          return false;
        }
      }

      //Seteo de campo VAT REG NUMBER con el valor del campo LATAM - NRO DE REGISTRO DE CONTRIBUYENTE
      if (LMRY_countr[0] == 'CL' && mode_type != 'view' && mode_type != 'print') {
        var nro_registro = currentRCD.getValue({ fieldId: 'custentity_lmry_sv_taxpayer_number' });
        if (nro_registro != null && nro_registro != '' && Library_Mail.getAuthorization(609, licenses)) {
          currentRCD.setValue('vatregnumber', nro_registro);
        }
      }

      return true;
    }

    /* ------------------------------------------------------------------------------------------------------
     * Seteo Automático AR
     Date            Author
     Sep 09 2022     Error Prevention
     * --------------------------------------------------------------------------------------------------- */

    function seteoARExtranjero(currentRCD) {
      var CUIT = currentRCD.getText('custentity_lmry_ar_cuitc_name');
      var CUIT_ID = currentRCD.getValue('custentity_lmry_ar_cuitc_name');
      var objField = currentRCD.getField({fieldId: 'custentity_lmry_ar_cuitc_name'});

      if (LMRY_countr[0] == 'AR' && currentRCD.type == 'customer' && (CUIT_ID!= '' && CUIT_ID!= 0)){
        if(CUIT.length = 11){
          var vatreg= CUIT.substring(0,10);
          var digitVerif = CUIT.substring(10,11);
          currentRCD.setValue('custentity_lmry_sv_taxpayer_number',vatreg);
          currentRCD.setValue('vatregnumber',vatreg);
          currentRCD.setValue('custentity_lmry_digito_verificator',digitVerif);
        }else{
          alert('El campo [ ' + objField.label + ' ] debe tener el valor de 11 dígitos.');
          return false;
        }
      }
    }

    /* ------------------------------------------------------------------------------------------------------
     * featureId = 219 AR Validacion de C.U.I.T.
     * --------------------------------------------------------------------------------------------------- */
    function Valida_CUIT() {
      // Solo para Argentina
      if (LMRY_countr[0] != 'AR' || !Library_Mail.getAuthorization(219, licenses)) {
        return true;
      }
      var objField = currentRCD.getField({
        fieldId: 'custentity_lmry_sunat_tipo_doc_id'
      });
      if (currentRCD.getValue('custentity_lmry_sunat_tipo_doc_id') == "") {
        alert('Seleccionar el campo [ ' + objField.label + ' ].');
        return false;
      }

      // Solo para tipos de documento C.U.I.T
      if (currentRCD.getValue('custentity_lmry_sunat_tipo_doc_cod') != "80") {
        return true;
      }

      // Datos para validar
      var pTaxNumber = currentRCD.getValue('vatregnumber');
      var pVerificador = currentRCD.getValue('custentity_lmry_digito_verificator');

      // Verifica el idioma de la instancia
      var idioma = runtime.getCurrentScript().getParameter({
        name: 'LANGUAGE'
      });
      var idiomaS = idioma.substring(0, 2);

      pTaxNumber = '' + pTaxNumber.replace(/\-/g, '');
      if (pTaxNumber.length != 10) {
        // Mensaje al usuario
        if (idiomaS == 'es') {
          alert('ERROR:\nLa longitud del CUIT es incorrecta. Debe tener 10 dígitos en este campo. El dígito verificador debe ingresarse en el campo “Latam - Dígito Verificador”.');
        } else {
          alert('ERROR:\nThe CUIT length is wrong. This field must have 10 digits. The Verified Digit must be entered in the “Latam - Verified Digit” field.');
        }
        return false;
      }

      var isCorrect = true;
      switch (pTaxNumber) {
        case '0000000000':
          isCorrect = false;
          break;
        case '1111111111':
          isCorrect = false;
          break;
        case '2222222222':
          isCorrect = false;
          break;
        case '3333333333':
          isCorrect = false;
          break;
        case '4444444444':
          isCorrect = false;
          break;
        case '5555555555':
          isCorrect = false;
          break;
        case '6666666666':
          isCorrect = false;
          break;
        case '7777777777':
          isCorrect = false;
          break;
        case '8888888888':
          isCorrect = false;
          break;
        case '9999999999':
          isCorrect = false;
          break;
      }

      var cuit = pTaxNumber + '' + pVerificador;
      var acumulado = 0;
      var digitos = cuit.split("");
      var digito = digitos.pop();

      for (var i = 0; i < digitos.length; i++) {
        acumulado += digitos[9 - i] * (2 + (i % 6));
      }

      var verif = 11 - (acumulado % 11);
      if (verif == 11 && isCorrect) {
        verif = 0;
      }

      if (digito != verif) {
        // Mensaje al usuario
        if (idiomaS == 'es') {
          alert('DIGITO VERIFICADOR INCORRECTO:\nEl valor ingresado en el campo “Latam - Dígito Verificador” no es el correcto para el CUIT ingresado.');
        } else {
          alert('INCORRECT VERIFIED DIGIT:\nThe value entered in the “Latam - Verified Digit” field isn’t correct according with the CUIT entered.');
        }
        return false;
      }

      // Actualiza el campo personalizado LatamReady
      currentRCD.setValue('custentity_lmry_sv_taxpayer_number', cuit);

      return true;
    }

    /* ------------------------------------------------------------------------------------------------------
     * Validacion estructura de RUC
     * --------------------------------------------------------------------------------------------------- */
    function ValidaRUC() {
      try {
        // Solo para Peru
        if (LMRY_countr[0] != 'PE' || !LMRY_access) {
          return true;
        }

        if (Library_Mail.getAuthorization(242, licenses) == false) {
          return true;
        }

        if (currentRCD.getValue('custentity_lmry_sunat_tipo_doc_id') == "") {
          alert('Seleccionar el campo [ LMRY Tipo de Doc. de Identidad SUNAT ].');
          return true;
        }

        if (currentRCD.getValue('isperson') == 'F' &&
          (currentRCD.getValue('vatregnumber') != '' || currentRCD.getValue('vatregnumber') != null)) {
          var valorIVA = currentRCD.getValue('vatregnumber');
          var subsidiary = currentRCD.getValue('subsidiary');
          var codigoTipoDoc = currentRCD.getValue('custentity_lmry_sunat_tipo_doc_cod');
          var tipoMoneda = currentRCD.getValue('currency');

          //VALIDANDO TIPO DE DOCUMENTO SEA RUC
          if (valorIVA != '' && (codigoTipoDoc == '6' || codigoTipoDoc == '06')) {
            //COMIENZA AUTENTICACION DE RUC
            if (valorIVA.length != 11) {
              alert('El Nro RUC debe tener 11 digitos. Por favor verifique el numero ingresado');
              return false;
            } else {
              matriz1 = new Array(11);
              matriz2 = new Array('5', '4', '3', '2', '7', '6', '5', '4', '3', '2', '0');
              matriz3 = new Array(11);
              //llenando primera matriz
              for (var conta = 0; conta < 11; conta++) {
                matriz1[conta] = valorIVA.substr(conta, 1);
              }
              //llenando tercera matriz
              matriz3[10] = 0;
              for (var i = 0; i < 10; i++) {
                matriz3[i] = matriz1[i] * matriz2[i];
                matriz3[10] = matriz3[10] + matriz3[i];
              }
              var lnResiduo = matriz3[10] % 11;
              var lnUltDigito = 11 - lnResiduo;
              if (lnUltDigito == 11 || lnUltDigito == 1) {
                lnUltDigito = 1;
              }
              if (lnUltDigito == 10 || lnUltDigito == 0) {
                lnUltDigito = 0;
              }

              // Si el RUC es valido valida el duplicidad si el feature esta activo
              if (lnUltDigito == matriz1[10]) {
                return true;
              } else {
                // Mensaje al usuario
                alert("Nro. RUC [ " + valorIVA + " ] Erroneo");
                // Retorna falsedad
                return false;
              }
            }
          } else {
            return true;
          }
        } //FIN DE VALIDAR QUE SEA EMPRESA Y TENGA UNA MONEDA ASIGNADA
        else {
          return true;
        } //RETORNAMOS TRUE SI NO ES EMPRESA
      } catch (err) {
        console.log("[ validaRUC]", err);
        Library_Mail.sendemail(' [ ValidaRUC ] ' + err, LMRY_script);
        libLog.doLog("[ validaRUC ]", err);
      }
      return true;
    }


    function ValidaRUT() {
      try {
        //solo para Chile
        if (LMRY_countr[0] != 'CL' || !LMRY_access) {
          return true;
        }

        if (Library_Mail.getAuthorization(244, licenses) == false) {
          return true;
        }

        var valorRUT = currentRCD.getValue('custentity_lmry_sv_taxpayer_number');
        var valorDig = currentRCD.getValue('custentity_lmry_digito_verificator');


        if (valorRUT != '' && valorRUT != null && valorDig != '' && valorDig != null) {

          valorRUT = valorRUT.replace(/\s/g, ""); // Espacios
          valorRUT = valorRUT.replace(/,/g, ""); // Comas
          valorRUT = valorRUT.replace(/\./g, ""); // Puntos
          valorRUT = valorRUT.replace(/-/g, ""); // Guiones

          if (valorRUT.length > 8 || valorRUT.length < 7) {
            alert('El Nro RUT debe tener 7 u 8 dígitos. Por favor, verifique el número ingresado.');
            return false;
          }
          if (valorDig.length > 1) {
            alert('El Latam - Verified Digit debe tener 1 dígito. Por favor, verifique el número ingresado.');
            return false;
          }

          validarRUT = valorRUT + '-' + valorDig;

          var tmpstr = "";
          var intlargo = validarRUT
          if (intlargo.length > 0) {
            var crut = validarRUT;
            var largo = crut.length;
            if (largo < 2) {
              alert('Nro. RUT [ ' + validarRUT + ' ] Erroneo');
              return false;
            }
            for (var i = 0; i < crut.length; i++)
              if (crut.charAt(i) != ' ' && crut.charAt(i) != '.' && crut.charAt(i) != '-') {
                tmpstr = tmpstr + crut.charAt(i);
              }
            var rut = tmpstr;
            crut = tmpstr;
            largo = crut.length;

            if (largo > 2)
              rut = crut.substring(0, largo - 1);
            else
              rut = crut.charAt(0);

            var dv = crut.charAt(largo - 1);

            if (rut == null || dv == null)
              return 0;

            var dvr = '0';
            var suma = 0;
            var mul = 2;

            for (var i = rut.length - 1; i >= 0; i--) {
              suma = suma + rut.charAt(i) * mul;
              if (mul == 7)
                mul = 2;
              else
                mul++;
            }

            var res = suma % 11;
            if (res == 1)
              dvr = 'k';
            else if (res == 0)
              dvr = '0';
            else {
              var dvi = 11 - res;
              dvr = dvi + "";
            }

            if (dvr != dv.toLowerCase()) {
              alert('Nro. RUT [ ' + validarRUT + ' ] Erroneo');
              return false;
            }
            return true;
          }
        }
      } catch (err) {
        console.log("[ validaRUT ]", err);
        Library_Mail.sendemail(' [ ValidaRUT ] ' + err, LMRY_script);
        libLog.doLog("[ validaRUT ]", err);
      }
      return true;
    }

    function ValidaNIT() {
      try {
        //solo para Colombia
        if (LMRY_countr[0] != 'CO' || !LMRY_access) {
          return true;
        }

        if (Library_Mail.getAuthorization(245, licenses) == false) {
          return true;
        }

        var objField = currentRCD.getField({
          fieldId: 'custentity_lmry_sunat_tipo_doc_id'
        });
        if (currentRCD.getValue('custentity_lmry_sunat_tipo_doc_id') == "") {
          alert('Seleccionar el campo [ ' + objField.label + ' ].');
          return false;
        }
        // Solo para tipos de documento N.I.T
        if (currentRCD.getValue('custentity_lmry_sunat_tipo_doc_id') != "12") {
          return true;
        }
        var valorNIT = currentRCD.getValue('vatregnumber');

        if (valorNIT == '' || valorNIT == null) {
          var objFieldNIT = currentRCD.getField({
            fieldId: 'vatregnumber'
          });
          alert('Falta llenar el campo [ ' + objFieldNIT.label + ' ].');
          return false;
        }
        var valorDig = currentRCD.getValue('custentity_lmry_digito_verificator');
        if (valorDig == '' || valorDig == null) {
          var objFieldDig = currentRCD.getField({
            fieldId: 'custentity_lmry_digito_verificator'
          });
          alert('Falta llenar el campo [ ' + objFieldDig.label + ' ].');
          return false;
        }
        var x, y, z;

        if (valorNIT != '' && valorNIT != null && valorDig != '' && valorDig != null) {

          // Se limpia el Nit
          valorNIT = valorNIT.replace(/\s/g, ""); // Espacios
          valorNIT = valorNIT.replace(/,/g, ""); // Comas
          valorNIT = valorNIT.replace(/\./g, ""); // Puntos
          valorNIT = valorNIT.replace(/-/g, ""); // Guiones

          if (valorNIT.length > 15) {
            alert('El Nro NIT debe tener máximo 15 digitos. Por favor verifique el número ingresado.');
            return false;
          }
          if (valorDig.length > 1) {
            alert('El Latam - Verified Digit debe tener 1 digito. Por favor verifique el número ingresado.');
            return false;
          }


          // Se valida el nit
          if (isNaN(valorNIT)) {
            alert("El nit/cédula '" + valorNIT + "' no es válido(a).");
            return false;
          };

          // Procedimiento
          var vpri = new Array(16);
          z = valorNIT.length;

          vpri[1] = 3;
          vpri[2] = 7;
          vpri[3] = 13;
          vpri[4] = 17;
          vpri[5] = 19;
          vpri[6] = 23;
          vpri[7] = 29;
          vpri[8] = 37;
          vpri[9] = 41;
          vpri[10] = 43;
          vpri[11] = 47;
          vpri[12] = 53;
          vpri[13] = 59;
          vpri[14] = 67;
          vpri[15] = 71;

          x = 0;
          y = 0;
          for (var i = 0; i < z; i++) {
            y = (valorNIT.substr(i, 1));
            x += (y * vpri[z - i]);
          }

          y = x % 11;

          if (y >= 2) {
            y = 11 - y;
          }

          if (y == valorDig) {
            return true;
          } else {
            alert('Nro. NIT [ ' + valorNIT + ' ] Erroneo');
            return false;
          }
        }
      } catch (err) {
        console.log("[ validaNIT ]", err);
        Library_Mail.sendemail(' [ ValidaNIT ] ' + err, LMRY_script);
        libLog.doLog("[ validaNIT ]", err);
      }
      return true;

    };

    /* ------------------------------------------------------------------------------------------------------
     * A la variable featureId se le asigna el valore que le corresponde
     * --------------------------------------------------------------------------------------------------- */
    function ValidateAccessE(ID) {
      try {
        // Oculta todos los campos LMRY
        Library_Mail.onFieldsHide(1, currentRCD, false);

        LMRY_countr = Library_Mail.Get_Country_STLT(ID);

        if (LMRY_countr[0] == '' || LMRY_countr[0] == null) {
          return true;
        }

        // Inicializa variables Locales y Globales
        LMRY_access = false;
        // Verifica que el arreglo este lleno
        if (LMRY_countr.length < 1) {
          LMRY_Result[2] = LMRY_access;
          return LMRY_Result;
        }
        LMRY_access = Library_Mail.getCountryOfAccess(LMRY_countr, licenses);

        // Solo si tiene acceso
        Val_Campos = '';
        if (LMRY_access == true) {
          Library_Mail.onFieldsDisplayE(currentRCD, LMRY_countr[1], false);
          Val_Campos = Library_Val.Val_Authorization(currentRCD, LMRY_countr[0], licenses);
        }

        // Asigna Valores
        LMRY_Result[0] = LMRY_countr[0];
        LMRY_Result[1] = LMRY_countr[1];
        LMRY_Result[2] = LMRY_access;

      } catch (err) {
        console.log("[ validateAccessE ]", err);
        Library_Mail.sendemail(' [ ValidateAccessE ] ' + err, LMRY_script);
        libLog.doLog("[ ValidateAccessE ]", err);
      }

      return true;
    }


    function cargarCustpage() {
      //Búsqueda record "LatamReady - Setup WHT Sub Type"

      var searchBRExempt = search.create({
        type: "customrecord_lmry_ar_wht_type",
        filters: [
          ["custrecord_lmry_withholding_country", "anyof", "30"],
          "AND",
          ["custrecord_lmry_type", "anyof", "8"]
        ],
        columns: ["internalid", "name", "custrecord_lmry_iden_docu"]
      });

      results = searchBRExempt.run().getRange(0, 30);
      if (results && results.length) {
        for (var i = 0; i < results.length; i++) {
          var identity = results[i].getValue('custrecord_lmry_iden_docu');
          var docTag = results[i].getValue('name');
          if (identity) {
            listBRExempt[docTag] = {};
            listBRExempt[docTag]['identity'] = results[i].getValue('custrecord_lmry_iden_docu');
            listBRExempt[docTag]['id'] = results[i].getValue('internalid');

          }
        }
      }
    }

    //Logíca para filtrado de campo LATAM - BR EXEMPT TAX
    function filtrarBRExempt(docid, results) {
      var flag = false;
      multiselect_br_exempt.removeSelectOption({
        value: null
      });
      multiselect_br_exempt.insertSelectOption({
        value: 0,
        text: '&nbsp;'
      });

      /*Setea el campo LATAM - BR EXEMPT TAX si encuentra el documento de identidad configurado
      en el record "LatamReady - Setup WHT Sub Type" */
      if (Object.keys(listBRExempt).length && docid) {
        for (var taxTag in listBRExempt) {
          if (listBRExempt[taxTag]['identity'] == docid) {
            flag = true;
            multiselect_br_exempt.insertSelectOption({
              value: listBRExempt[taxTag]['id'],
              text: taxTag
            });

          }
        }
      }

      /*Al no encontrar un tipo de documento de identidad configurado en el record "LatamReady - Setup WHT Sub Type"
      se llenará el campo LATAM - BR EXEMPT TAX con todos los impuestos existentes */
      if (flag == false) {
        if (results && results.length) {
          for (var i = 0; i < results.length; i++) {
            multiselect_br_exempt.insertSelectOption({
              value: results[i].getValue('internalid'),
              text: results[i].getValue('name')
            });

          }
        }
      }
    }
    function generateVerifierDigit() {
      try {

        var currentRCD2 = currentRecord.get();
        var transLogSearch = search.lookupFields({
          type: 'customer',
          id: currentRCD2.getValue('id'),
          columns: [
            'vatregnumber',
          ]
        });

        var veriDigit = getVerifierDigit(transLogSearch.vatregnumber);

        record.submitFields({
          type: 'customer', id: currentRCD2.getValue('id'),
          values: { custentity_lmry_digito_verificator: veriDigit },
          options: { enableSourcing: false, ignoreMandatoryFields: true, disableTriggers: true }
        });

        window.location.reload();
      } catch (e) {
        alert(e.toString());
        window.location.reload();
      }

      //recargar la pagina
      //validar try
      //if()
    }
    function getVerifierDigit(myNit) {
      var vpri = [41, 37, 29, 23, 19, 17, 13, 7, 3];
      var x = 0;
      // Se limpia el Nit
      myNit = myNit.replace(/\s/g, ""); // Espacios
      myNit = myNit.replace(/,/g, ""); // Comas
      myNit = myNit.replace(/\./g, ""); // Puntos
      myNit = myNit.replace(/-/g, ""); // Guiones
      // Se valida el nit
      if (isNaN(myNit) == true || myNit.length != 9) {
        log.error("El nit/cédula '" + myNit + "' no es válido(a).");
        return "";
      };
      for (var i = 0; i < myNit.length; i++) {
        var y = (myNit.substr(i, 1));
        var z = y * vpri[i]
        x += z;
      }
      // si es 0 -> 0
      // si    1 -> 1
      // si   >1 -> 11 - val
      var dec = x % 11
      var codigo = (dec > 1) ? 11 - dec : dec;
      return Number(codigo.toFixed(0));
    }

    function taxRegNumAutomaticFieldsMx() {
      var regNumber = currentRCD.getValue('vatregnumber');
      currentRCD.setValue({ fieldId: 'custentity_lmry_sv_taxpayer_number', value: regNumber });
      currentRCD.setValue({ fieldId: 'custentity_lmry_customercode', value: regNumber });
    }

    function foreignAutomaticFieldsMx() {

      //Desactiva los campos
      currentRCD.setValue({ fieldId: 'custentity_lmry_foreign', value: false });
      currentRCD.setValue({ fieldId: 'taxitem', value: '' });
      currentRCD.setValue({ fieldId: 'custentity_lmry_sv_taxpayer_type', value: '' });

      var entityCountry = currentRCD.getValue('custentity_lmry_country') || "";
      if (entityCountry > 0) {
        var fieldLookUp = search.lookupFields({
          type: "customrecord_lmry_mx_country",
          id: entityCountry,
          columns: ['custrecord_lmry_mx_country']
        });
        var countrySearch = fieldLookUp.custrecord_lmry_mx_country || "";
        countrySearch = (countrySearch && countrySearch.length) ? countrySearch[0].value : "";
        //Si el pais del cliente es diferente a Mexico
        if (countrySearch != 157) {
          //Activa el checkbox LATAM FOREIGN ENTITY
          currentRCD.setValue({ fieldId: 'custentity_lmry_foreign', value: true });
          //Seteo automatico configurado en el Setup Tax Subsidiary
          var subsid = currentRCD.getValue('subsidiary');
          var setuptaxSearchObj = search.create({
            type: "customrecord_lmry_setup_tax_subsidiary",
            filters: [
              ["custrecord_lmry_setuptax_subsidiary", "anyof", subsid], "AND",
              ["isinactive", "is", "F"]
            ],
            columns: ["custrecord_lmry_setuptax_taxcode_foreign", "custrecord_lmry_setuptax_mx_fr_tp_type"]
          });
          setuptaxSearchObj = setuptaxSearchObj.run().getRange(0, 1000);
          if (setuptaxSearchObj != null && setuptaxSearchObj != '') {
            if (setuptaxSearchObj.length != 0) {
              var taxcode = setuptaxSearchObj[0].getValue('custrecord_lmry_setuptax_taxcode_foreign');
              var taxpayer = setuptaxSearchObj[0].getValue('custrecord_lmry_setuptax_mx_fr_tp_type');
              if (taxcode != null && taxcode != '') {
                currentRCD.setValue({ fieldId: 'taxitem', value: taxcode });
              }
              if (taxpayer != null && taxpayer != '') {
                currentRCD.setValue({ fieldId: 'custentity_lmry_sv_taxpayer_type', value: taxpayer });
              }
            }
          }
        }
      }
    }

    return {
      pageInit: pageInit,
      fieldChanged: fieldChanged,
      // postSourcing: postSourcing,
      // sublistChanged: sublistChanged,
      // lineInit: lineInit,
      validateField: validateField,
      // validateLine: validateLine,
      // validateInsert: validateInsert,
      // validateDelete: validateDelete,
      saveRecord: saveRecord,
      generateVerifierDigit: generateVerifierDigit
    };

  });

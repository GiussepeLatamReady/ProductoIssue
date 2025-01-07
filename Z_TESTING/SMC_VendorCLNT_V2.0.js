/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_VendorCLNT_V2.0.js     				              ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     15 ago 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/runtime', 'N/search', 'N/log', 'N/url', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0',
    './Latam_Library/LMRY_Val_TransactionLBRY_V2.0', './Latam_Library/LMRY_Entity_Validate_LBRY_V2.0', './Latam_Library/LMRY_ValidateRegNumberLBRY_V2.0', 'N/record'],

    function (currentRecord, runtime, search, log, url, Library_Mail, Library_Val, Library_Entity_Validate, Library_Validate_RegNumber, record) {

        var LMRY_script = 'LatamReady - Vendor CLNT V2.0';
        var LMRY_access = false;
        var LMRY_countr = new Array();
        var currentRCD = '';
        var mode_type = '';
        var licenses = [];

        var Val_Campos = new Array();

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
                currentRCD = scriptContext.currentRecord;
                mode_type = scriptContext.mode;

                var subsidiary = currentRCD.getValue('subsidiary');
                licenses = Library_Mail.getLicenses(subsidiary);


                // Valida la existencia del campo 
                var entity_country = currentRCD.getField({
                fieldId: 'custentity_lmry_subsidiary_country'
                })

                if (entity_country) {
                    // Desactiva el campo
                    entity_country.isDisabled = true;
                    // Activa el campo
                    var sub_country = currentRCD.getValue('custentity_lmry_subsidiary_country')
                    if (sub_country == '' || sub_country == null) {
                        entity_country.isDisabled = false;
                    }
                    entity_country.isDisplay = false;
                }
                
                // Valida el Acceso
                ValidateAccessV(subsidiary);

                // Sete que la preferencia de envio de mail se PDF
                if (scriptContext.mode == 'create') {
                    currentRCD.setValue({
                        fieldId: 'emailpreference',
                        value: 'PDF'
                    });
                }
                if (entity_country) {
                    // Desactiva el campo
                    entity_country.isDisplay = false;
                }
            } catch (err) {
                Library_Mail.sendemail('[pageInit] ' + err, LMRY_script);
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
                if (name == 'subsidiary' && mode_type == 'create' && (subListName == '' || subListName == null)) {
                    var cf = currentRCD.getValue('customform');
                    var sub = currentRCD.getValue('subsidiary');

                    if (cf != '' && cf != null && cf != -1 && sub != '' && sub != null && sub != -1) {

                        setWindowChanged(window, false);
                        window.location.href = window.location.href.split('?')[0] + '?whence=&cf=' + cf + '&subsidiary=' + sub;
                    }
                    return true;
                }
            } catch (err) {
                Library_Mail.sendemail('[fieldChanged] ' + err, LMRY_script);
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
                if (scriptContext.fieldId == 'subsidiary') {
                    var currentRCD = scriptContext.currentRecord;

                    // Valida el Acceso
                    var subt = currentRCD.getValue('subsidiary');

                    if (subt != '' && subt != null) {
                        currentRCD.getField({
                            fieldId: 'custentity_lmry_subsidiary_country'
                        }).isDisabled = true;
                    }

                    ValidateAccessV(subt);

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
                            ValidateAccessV(subs);
                        }
                    }
                    LMRY_swinit = false;

                    return true;
                }
            } catch (err) {
                Library_Mail.sendemail('[validateField] ' + err, LMRY_script);
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

                var country = LMRY_countr[0];

                /* **********************************
                 * 2021.07.16  - Mejora
                 * Solo Vendor
                 ********************************** */
                if (country = 'PE' && Library_Mail.getAuthorization(651, licenses) == true) {
                    // TAX REG. Number = Latam - Taxpayer Registration Number
                    var TaxNumber = currentRCD.getValue('custentity_lmry_sv_taxpayer_number');
                    currentRCD.setValue('vatregnumber', TaxNumber);
                }

                //Validación de Vat Reg Number de acuerdo al tipo de identidad, solo para BRASIL
                if (!Library_Validate_RegNumber.validateVatRegNumber(currentRCD, country, LMRY_access)) {
                    return false;
                }

                if (!Library_Entity_Validate.validateEntityDuplicity(currentRCD, licenses)) {
                    return false;
                }

            } catch (err) {
                console.log(err);
                alert("[ saveRecord ]\n" + err.message);
                Library_Mail.sendemail(' [ saveRecord ] ' + err, LMRY_script);
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

                var TaxNumber = currentRCD.getValue({
                    fieldId: 'custentity_lmry_sv_taxpayer_number'
                });

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
                            alert('El campo "' + TaxNumberField.label + '" debe tener el formato xx.xxx.xxx  o x.xxx.xxx');
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
         * featureId = 219 AR Validacion de C.U.I.T.
         * --------------------------------------------------------------------------------------------------- */
        function Valida_CUIT() {
            // Solo para peru
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
            // Solo para peru


            if (LMRY_countr[0] != 'PE' || !LMRY_access) {
                return true;
            }

            if (Library_Mail.getAuthorization(242, licenses) == false) {
                return true;
            }

            if (currentRCD.getValue('custentity_lmry_sunat_tipo_doc_id') == "") {
                alert('Seleccionar el campo [ LMRY Tipo de Doc. de Identidad SUNAT ].');
                return false;
            }

            if (currentRCD.getValue('isperson') == 'F' &&
                (currentRCD.getValue('currency') != '' || currentRCD.getValue('currency') != null)) {
                var valorIVA = currentRCD.getValue('vatregnumber');
                var valorMoneda = currentRCD.getValue('currency');
                var subsidiary = currentRCD.getValue('subsidiary');
                var codigoTipoDoc = currentRCD.getValue('custentity_lmry_sunat_tipo_doc_cod');
                var tipoMoneda = currentRCD.getText('currency');
                var aux; // tomara los valores de True o False para cerciorar la existencia de Billing

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
                        if (lnUltDigito == matriz1[10]) {
                            return true;
                        } else {
                            return alert('Nro. RUC [ ' + valorIVA + ' ] Erroneo');
                        }
                    }
                } else {
                    return true;
                }
            } //FIN DE VALIDAR QUE SEA EMPRESA Y TENGA UNA MONEDA ASIGNADA
            else {
                return true;
            } //RETORNAMOS TRUE SI NO ES EMPRESA

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
                Library_Mail.sendemail(' [ ValidaRUT ] ' + err, LMRY_script);
            }
            return true;
        }

        /* ------------------------------------------------------------------------------------------------------
         * Valida el acceso para los paises de nuestra localizacion
         * --------------------------------------------------------------------------------------------------- */
        function ValidateAccessV(ID) {
            try {
                // Oculta todos los campos LMRY
                Library_Mail.onFieldsHide(1, currentRCD, false);

                if (ID == '' || ID == null) {
                    return true;
                }

                LMRY_access = false;
                LMRY_countr = Library_Mail.Get_Country_STLT(ID);
                // Verifica que el arreglo este lleno
                if (LMRY_countr.length < 1) {
                    return true;
                }

                LMRY_access = Library_Mail.getCountryOfAccess(LMRY_countr, licenses);

                if (LMRY_countr[0] == '' || LMRY_countr[0] == null) {
                    return true;
                }

                // Solo si tiene acceso
                Val_Campos = '';
                if (LMRY_access == true) {
                    Library_Mail.onFieldsDisplayE(currentRCD, LMRY_countr[1], false);
                    Val_Campos = Library_Val.Val_Authorization(currentRCD, LMRY_countr[0], licenses);
                }
            } catch (err) {
                Library_Mail.sendemail(' [ ValidateAccessV ] ' + err, LMRY_script);
            }

            return true;
        }
        function generateVerifierDigit() {
            try {
                var currentRCD2 = currentRecord.get();
                var transLogSearch = search.lookupFields({
                    type: 'vendor',
                    id: currentRCD2.getValue('id'),
                    columns: [
                        'vatregnumber',
                    ]
                });

                var veriDigit = getVerifierDigit(transLogSearch.vatregnumber);

                record.submitFields({
                    type: 'vendor', id: currentRCD2.getValue('id'),
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
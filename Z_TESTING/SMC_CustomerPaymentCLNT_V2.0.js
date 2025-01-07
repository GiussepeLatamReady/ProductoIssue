/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for Transaction customer Payment               ||
||                                                              ||
||  File Name: LMRY_CustomerPaymentCLNT_V2.0.js                 ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jul 20 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/log', 'N/search', 'N/runtime', 'N/email', 'N/format', 'N/url', 'N/https', 'N/record', './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_Val_TransactionLBRY_V2.0', './Latam_Library/LMRY_AlertTraductorSale_LBRY_V2.0', './Latam_Library/LMRY_WebService_LBRY_v2.0.js'],

  function (log, search, runtime, email, format, url, https, record, library, library_Val, library_translator, LR_webService) {

    // Nombre del Script
    var LMRY_script = "LatamReady - Customer Payment CLNT 2.0";
    var LMRY_access = false;
    var LMRY_parent = false;
    var recordObj = '';

    var subsi_OW = runtime.isFeatureInEffect({
      feature: "SUBSIDIARIES"
    });
    var LMRY_Result = new Array();
    var Val_Campos = new Array();
    var validate_camp = false;
    var LMRY_countr = new Array();
    var type = '';
    var licenses = [];
    var subsidiary = '';
    var Language = '';
    var cadena = "";
    var idcurrencyUSD = 0;



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
        console.log("lr")
        /************************************* MODIFICACIÓN ****************************************************+
           - Fecha: 08/06/2020
           - Descripción: Bloqueo de campo Entity, en caso se cree la transacción desde otra
        ********************************************************************************************************/

        var inv = window.location.href.split('?')[1];
        if (inv) {
          var pos = inv.indexOf('inv=');

          if (pos !== -1) {
            var final = inv.indexOf('&', pos);
            if (final !== -1) {
              cadena = inv.substring(pos, final);
            }
          }
        }

        // ********************************************FIN MODIFICACIÓN *****************************************


        /* MODIFICACION ,para la captura del idioma */
        Language = runtime.getCurrentScript().getParameter({
          name: 'LANGUAGE'
        });
        Language = Language.substring(0, 2);
        /*Fin Modificacion*/

        type = scriptContext.mode;
        recordObj = scriptContext.currentRecord;

        subsidiary = recordObj.getValue('subsidiary');

        licenses = library.getLicenses(subsidiary);

        if (type == 'create') {
          var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
          if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
            lmry_exchange_rate_field.isDisplay = false;
          }
          var lmry_basecurrency = recordObj.getField('custpage_lmry_basecurrency');
          if (lmry_basecurrency != null && lmry_basecurrency != '') {
            lmry_basecurrency.isDisplay = false;
          }

          if (recordObj.getValue('customer') != '' && recordObj.getValue('customer') != null) {
            ws_exchange_rate();
          }
        }

        // Solo para cuando es nuevo y se copia
        if (type == 'create' || type == 'copy') {
          // Tipo de Documento - Serie  - Numero - Folio
          recordObj.setValue({
            fieldId: 'custbody_lmry_document_type',
            value: ''
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_serie_doc_cxc',
            value: ''
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_num_preimpreso',
            value: ''
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_foliofiscal',
            value: ''
          });
          // Campo de Trasferencia de IVA MX
          recordObj.setValue({
            fieldId: 'custbody_lmry_schedule_transfer_of_iva',
            value: ''
          });

          var al_country = recordObj.getValue('custbody_lmry_subsidiary_country');

          if (al_country != '' && al_country != null) {
            recordObj.getField({
              fieldId: 'custbody_lmry_subsidiary_country'
            }).isDisabled = true;
          }

        }

        // Valida el Acceso
        if (subsi_OW == true || subsi_OW == 'T') {
          ValidAccessCPU(recordObj.getValue({
            fieldId: 'subsidiary'
          }), licenses);
        } else {
          ValidAccessCPU(1, licenses);
        }
      
        recordObj.getField({
          fieldId: 'custbody_lmry_subsidiary_country'
        }).isDisplay = false;
      

        console.log("custbody_lmry_subsidiary_country",JSON.stringify(recordObj.getField({
          fieldId: 'custbody_lmry_subsidiary_country'
        })))

        log.error("field",recordObj.getField({
          fieldId: 'custbody_lmry_subsidiary_country'
        }))
        log.error("customform f",recordObj.getField({
          fieldId: 'customform'
        }))
        log.error("customform v",recordObj.getValue({
          fieldId: 'customform'
        }))
        if (LMRY_countr[0] == 'MX') {
          if (type == 'create' || type == 'copy' || type == 'edit') {
            var fieldIVA = recordObj.getField({
              fieldId: 'custbody_lmry_schedule_transfer_of_iva'
            });

            if (fieldIVA != '' && fieldIVA != null) {
              fieldIVA.isDisabled = true;
            }
          }
        }

      } catch (error) {
        console.log("[pageinit] error :",error)
        recordObj = scriptContext.currentRecord;
        library.sendemail2(' [ pageInit ] ' + error, LMRY_script, recordObj, 'tranid', 'customer');
      }
    }

    function fieldChanged(scriptContext) {
      currentRCD = scriptContext.currentRecord;
      var name = scriptContext.fieldId;
      try {

        if (name == 'currency' && (type == 'create' || type == 'copy')) {

          var lmry_exchange_rate_field = currentRCD.getField('custpage_lmry_exchange_rate');
          if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
            ws_exchange_rate();
          }
          return true;
        }

        if (name == 'custpage_lmry_exchange_rate' && (type == 'create' || type == 'copy')) {

          var lmry_exchange_rate = currentRCD.getValue('custpage_lmry_exchange_rate');
          if (lmry_exchange_rate != ' ' && lmry_exchange_rate != '' && lmry_exchange_rate != null) {
            currentRCD.setValue('exchangerate', lmry_exchange_rate);
          }
          return true;
        }

        if (name == 'trandate' && (type == 'create' || type == 'copy')) {
          if (currentRCD.getValue('customer') != '' && currentRCD.getValue('customer') != null) {
            ws_exchange_rate();
          }
          return true;
        }

        /* *****************************************************
         * 07.09.2021 - Se cambio el campo subsidiary por
         * el campo el campo custbody_lmry_subsidiary_country
         **************************************************** */
        if (subsi_OW == 'T' || subsi_OW == true) {
          if (name == 'custbody_lmry_subsidiary_country' && type == 'create') {
            var cf = currentRCD.getValue('customform');
            var sub = currentRCD.getValue('subsidiary');
            var ent = currentRCD.getValue('customer');

            if (cf != '' && cf != null && cf != -1 && ent != '' && ent != null && ent != -1 && sub != '' && sub != null && sub != -1) {

              setWindowChanged(window, false);
              if (cadena != '') {
                window.location.href = window.location.href.split('?')[0] + '?whence=&cf=' + cf + '&entity=' + ent + '&' + cadena + '&subsidiary=' + sub;
              } else {
                window.location.href = window.location.href.split('?')[0] + '?whence=&cf=' + cf + '&entity=' + ent + '&subsidiary=' + sub;
              }
            }
            return true;
          }
        }

      } catch (err) {
        library.sendemail('[fieldChanged] ' + err, LMRY_script);
      }
      return true;
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

        var name = scriptContext.fieldId;

        if (name == 'custbody_lmry_subsidiary_country') {
          // Valida el Acceso
          if (subsi_OW == true || subsi_OW == 'T') {
            var user = runtime.getCurrentUser();

            if (user.subsidiary == recordObj.getValue({
              fieldId: 'subsidiary'
            })) {
              ValidAccessCPU(recordObj.getValue({
                fieldId: 'subsidiary'
              }), licenses);
            }
          } else {
            ValidAccessCPU(1, licenses);
          }

          return true;
        }

        /* Validacion 04/02/22 */
        if (name == 'postingperiod') {

          var period = recordObj.getValue('postingperiod');
          var subsidiary = recordObj.getValue('subsidiary') ? recordObj.getValue('subsidiary') : 1;
          // Se optiene el Pre - Fijo de la subsidiaria
          var urlStlt = url.resolveScript({
            scriptId: 'customscript_lmry_get_val_period_stlt',
            deploymentId: 'customdeploy_lmry_get_val_period_stlt',
            returnExternalUrl: false
          }) + '&period=' + period + '&subsidiary=' + subsidiary + '&country=' + LMRY_countr[0] + '&typetran=sales';

          //corregir hard code falta url
          var getStlt = https.get({
            url: 'https://' + window.location.hostname + urlStlt
          });

          // Retorna el cuero del SuiteLet
          var closedPeriod = getStlt.body;

          log.error('closedPeriod', closedPeriod);
          if (closedPeriod == 'T') {
            recordObj.setValue('custpage_lockedperiod', true);
          } else {
            recordObj.setValue('custpage_lockedperiod', false);
          }

          // Sale de la funcion
          return true;
        }
        /* Fin validacion 04/02/22 */

        if (name == 'custbody_lmry_document_type' && LMRY_access == true) {
          // Tipo de Documento - Parent
          var lmry_DocTip = recordObj.getValue('custbody_lmry_document_type');
          if (lmry_DocTip != '' && lmry_DocTip != null && lmry_DocTip != -1) {
            library.onFieldsDisplayParent(recordObj, LMRY_countr[1], lmry_DocTip, false);
            LMRY_parent = true;
            if (Val_Campos.length > 0) {
              library_Val.Val_Authorization(recordObj, LMRY_countr[0], licenses);
            }
          } else {
            if (LMRY_parent == true) {
              library.onFieldsDisplayParent(recordObj, LMRY_countr[1], '', false);
              LMRY_parent = false;
              if (Val_Campos.length > 0) {
                library_Val.Val_Authorization(recordObj, LMRY_countr[0], licenses);
              }
            }
          }
          return true;
        }

        if (name == 'custbody_lmry_serie_doc_cxc') {
          PAYNumberSequence();
          return true;
        }

      } catch (error) {
        recordObj = scriptContext.currentRecord;
        library.sendemail2(' [ validateField ] ' + error, LMRY_script, recordObj, 'tranid', 'customer');
      }

      return true;
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
        recordObj = scriptContext.currentRecord;

        // Valida el Acceso
        if (subsi_OW == true || subsi_OW == 'T') {
          var user = runtime.getCurrentUser();

          if (user.subsidiary == recordObj.getValue({
            fieldId: 'subsidiary'
          })) {
            ValidAccessCPU(recordObj.getValue({
              fieldId: 'subsidiary'
            }), licenses);
          }
        } else {
          ValidAccessCPU(1, licenses);
        }

        /* Validacion 04/02/22 */
        var lockedPeriod = recordObj.getValue("custpage_lockedperiod");
        log.error('lockedPeriod', lockedPeriod);
        if (lockedPeriod == true || lockedPeriod == 'T') {
          return true;
        }
        /* Fin validacion 04/02/22 */

        // Valida Campos Obligatorios
        if (Val_Campos.length > 0) {
          if (library_Val.Val_Mensaje(recordObj, Val_Campos) == false)
            return false;
        }

        if (LMRY_Result[0] == 'MX') {
          if (library.getAuthorization(146, licenses) == true) {
            var auxserie = recordObj.getValue({
              fieldId: 'custbody_lmry_serie_doc_cxc'
            });
            var auxnumber = recordObj.getValue({
              fieldId: 'custbody_lmry_num_preimpreso'
            });

            if (auxserie != null && auxserie != '' && auxnumber != null && auxnumber != '') {
              var nroConse = search.lookupFields({
                type: 'customrecord_lmry_serie_impresion_cxc',
                id: auxserie,
                columns: ['custrecord_lmry_serie_numero_impres']
              });
              nroConse = nroConse.custrecord_lmry_serie_numero_impres;
              if (nroConse != null && nroConse != '') {
                if (parseFloat(auxnumber) > parseFloat(nroConse)) {
                  record.submitFields({
                    type: 'customrecord_lmry_serie_impresion_cxc',
                    id: auxserie,
                    values: {
                      custrecord_lmry_serie_numero_impres: parseFloat(auxnumber)
                    }
                  });
                }
              }
            }
          }

          // Transferencia IVA (SuiteGL)
          var blnIVA = true;
          var status = recordObj.getValue({
            fieldId: 'status'
          });

          if (status != '' && status != null) {
            status = status.toUpperCase();
            if (status == 'voided' || status == 'anulado') {
              blnIVA = false;
            }
          }

          if (blnIVA == true) {
            if (LMRY_countr[0] == 'MX') {
              if (library.getAuthorization(243, licenses) == true) {
                recordObj.setValue({
                  fieldId: 'custbody_lmry_schedule_transfer_of_iva',
                  value: '8'
                });
              }
            }
          }
        }

        if (LMRY_countr[0] == 'BR') {
          /* *****************************************
           * Title : Seteo del campo :
           * 		  Latam - Amount Advance
           * 		  custbody_lmry_br_amount_advance
           * Date  : 27/05/2021
           * *************************************** */
          // Latam - Amount Advance
          recordObj.setValue({
            fieldId: 'custbody_lmry_br_amount_advance',
            value: '1'
          });
        }

      } catch (error) {
        recordObj = scriptContext.currentRecord;
        library.sendemail2(' [ saveRecord ] ' + error, LMRY_script, recordObj, 'tranid', 'customer');
      }

      return true;
    }

    /* ------------------------------------------------------------------------------------------------------
     * A la variable featureId se le asigna el valore que le corresponde
     * --------------------------------------------------------------------------------------------------- */
    function ValidAccessCPU(ID, licenses) {

      try {

        // Oculta todos los campos LMRY
        library.onFieldsHide([2], recordObj, false);
        console.log("Oculta Campos");
        console.log("ID: ",ID);
        if (ID == '' || ID == null) {
          return true;
        }

        // Inicializa variables Locales y Globales
        LMRY_access = false;
        LMRY_countr = library.Get_Country_STLT(ID);

        // Verifica que el arreglo este lleno
        if (LMRY_countr.length < 1) {
          LMRY_Result[2] = LMRY_access;
          return LMRY_Result;
        }

        LMRY_access = library.getCountryOfAccess(LMRY_countr, licenses);

        if (LMRY_countr[0] == '' || LMRY_countr[0] == null) {
          return true;
        }

        // Solo si tiene acceso
        console.log("LMRY_access",LMRY_access);
        Val_Campos = '';
        if (LMRY_access == true) {
          
          library.onFieldsDisplayBody(recordObj, LMRY_countr[1], 'custrecord_lmry_on_customer_payment', false);
          console.log("Muestra Campos");
          // Validación de campos obligatorios
          Val_Campos = library_Val.Val_Authorization(recordObj, LMRY_countr[0], licenses);
          console.log("[Val_Campos]:",Val_Campos)
        }

        // Asigna Valores
        LMRY_Result[0] = LMRY_countr[0];
        LMRY_Result[1] = LMRY_countr[1];
        LMRY_Result[2] = LMRY_access;

      } catch (error) {
        console.log("[ValidAccessCPU] error :",error)
        library.sendemail2(' [ ValidAccessCPU ] ' + error, LMRY_script, recordObj, 'tranid', 'customer');
      }
      console.log("[LMRY_Result]:",LMRY_Result)
      return LMRY_Result;
    }

    /* ------------------------------------------------------------------------------------------------------
     * Deben tener acceso a LatamReady para las siguientes
     * Transaccion Invoice solo para los paises:
     * 		Mexico
     * --------------------------------------------------------------------------------------------------- */
    function PAYNumberSequence() {

      try {

        // Solo para subsidiaria con acceso - Transaction Number Invoice
        //log.error('LMRY_Result' , LMRY_Result);
        if (LMRY_Result[0] == 'MX' && LMRY_Result[2] == true) {
          // Verifica que no este vacio el numero de serie
          var lmry_DocSer = recordObj.getValue({
            fieldId: 'custbody_lmry_serie_doc_cxc'
          });

          if (lmry_DocSer != '' && lmry_DocSer != null && lmry_DocSer != -1) {
            // Verifica que no este vacio el numero preimpreso
            var lmry_DocNum = recordObj.getValue({
              fieldId: 'custbody_lmry_num_preimpreso'
            });
            if (lmry_DocNum == '' || lmry_DocNum == null) {
              /* *********************************************
               * Verifica que este activo el feature Numerar
               * Transaction Number Invoice:
               * MX - Mexico
               **********************************************/
              if (library.getAuthorization(146, licenses) == false) {
                return true;
              }

              // Trae el ultimo numero pre-impreso
              var rdSerie = search.lookupFields({
                type: 'customrecord_lmry_serie_impresion_cxc',
                id: lmry_DocSer,
                columns: ['custrecord_lmry_serie_numero_impres', 'custrecord_lmry_serie_rango_fin', 'custrecord_lmry_serie_num_digitos']
              });
              var nroConse = parseInt(rdSerie.custrecord_lmry_serie_numero_impres) + 1;
              var maxPermi = parseInt(rdSerie.custrecord_lmry_serie_rango_fin);
              var digitos = parseInt(rdSerie.custrecord_lmry_serie_num_digitos);
              //log.error('nroConse - maxPermi - digitos', nroConse + ' - ' + maxPermi + ' - ' + digitos);

              // Valida el numero de digitos
              if (digitos == '' || digitos == null) {
                return true;
              }

              // Crea el numero consecutivo
              if (nroConse > maxPermi) {
                alert(library_translator.getAlert(12, Language, [maxPermi]));
                //alert('El ultimo numero para esta serie (' + maxPermi + ') ha sido utilizado. Verificar si existen numeros disponibles en esta serie');
                // Asigna el numero pre-impero
                recordObj.setValue({
                  fieldId: 'custbody_lmry_num_preimpreso',
                  value: ''
                });
              } else {
                var longNumeroConsec = parseInt((nroConse + '').length);
                var llenarCeros = '';
                for (var i = 0; i < (digitos - longNumeroConsec); i++) {
                  llenarCeros += '0';
                }
                nroConse = llenarCeros + nroConse;

                // Asigna el numero pre-impero
                recordObj.setValue({
                  fieldId: 'custbody_lmry_num_preimpreso',
                  value: nroConse
                });

                // Llama a la funcion de seteo del Tranid
                PAYSet_Field_tranid();
              }
            }
          }
        }

      } catch (error) {
        library.sendemail2(' [ PAYNumberSequence ] ' + error, LMRY_script, recordObj, 'tranid', 'customer');
      }

    }

    /* ------------------------------------------------------------------------------------------------------
     * Funcion Set_Field_tranid que setea el campo standart Tranid
     * Tipo de Documento, Serie de impresion y Numero Preimpreso
     * --------------------------------------------------------------------------------------------------- */
    function PAYSet_Field_tranid() {
      try {

        // Subsidiaria
        var subsidiaria = recordObj.getValue({
          fieldId: 'subsidiary'
        });
        var lmry_DocTip = recordObj.getValue({
          fieldId: 'custbody_lmry_document_type'
        });
        var lmry_DocSer = recordObj.getValue({
          fieldId: 'custbody_lmry_serie_doc_cxc'
        });
        var lmry_DocNum = recordObj.getValue({
          fieldId: 'custbody_lmry_num_preimpreso'
        });
        var tranprefix = '';
        var texto = '';

        if (subsidiaria != '' && subsidiaria != null) {
          if (lmry_DocTip != '' && lmry_DocTip != null && lmry_DocTip != -1 && lmry_DocSer != '' && lmry_DocSer != null && lmry_DocNum != '' && lmry_DocNum != null) {
            /* *********************************************
             * Verifica que este activo el feature Numerar
             * Transaction Number Invoice
             **********************************************/
            if (LMRY_Result[0] == 'MX' && library.getAuthorization(146, licenses) == false) {
              return true;
            }

            // Se optiene el Pre - Fijo de la subsidiaria
            var urlpais = runtime.getCurrentScript().getParameter('custscript_lmry_netsuite_location');
            if (urlpais != '' && urlpais != null) {
              var url_2 = url.resolveScript({
                scriptId: 'customscript_lmry_get_country_stlt',
                deploymentId: 'customdeploy_lmry_get_country_stlt',
                returnExternalUrl: false
              }) + '&sub=' + subsidiaria + '&opt=CDM&cty=' + LMRY_countr[0];

              var get_2 = https.get({
                url: 'https://' + urlpais + url_2
              });

              var tranprefix = get_2.body;
            }

            // Iniciales del tipo de documento
            var tipini = search.lookupFields({
              type: 'customrecord_lmry_tipo_doc',
              id: lmry_DocTip,
              columns: ['custrecord_lmry_doc_initials']
            });

            tipini = tipini.custrecord_lmry_doc_initials;
            if (tipini == '' || tipini == null) {
              tipini = '';
            }

            // Valida si tiene prefijo
            if (tranprefix != '' && tranprefix != null) {
              texto = tranprefix + ' ' + tipini.toUpperCase() + ' ' + recordObj.getText({
                fieldId: 'custbody_lmry_serie_doc_cxc'
              }) + '-' + recordObj.getText({
                fieldId: 'custbody_lmry_num_preimpreso'
              });;
            } else {
              texto = tipini.toUpperCase() + ' ' + recordObj.getText({
                fieldId: 'custbody_lmry_serie_doc_cxc'
              }) + '-' + recordObj.getText({
                fieldId: 'custbody_lmry_num_preimpreso'
              });
            }

            // Seteo del concatenado del TD+Prefix+SER+NRO
            recordObj.setValue({
              fieldId: 'tranid',
              value: texto
            });
          }
        }

      } catch (error) {
        library.sendemail2(' [ PAYSet_Field_tranid ] ' + error, LMRY_script, recordObj, 'tranid', 'customer');
      }
    }

    function removeOtions(id, rcd) {
      var field = rcd.getField(id);
      if (field != null && field != '') {
        field.removeSelectOption({
          value: null,
        });
      }
    }

    function addOptions(id, rcd, values) {

      var field = rcd.getField(id);

      if (field != null && field != '') {
        field.insertSelectOption({
          value: ' ',
          text: '\u2000'
        });
  
        field.insertSelectOption({
          value: values[0]["compra"],
          text: 'Compra',
        });
  
        field.insertSelectOption({
          value: values[0]["venta"],
          text: 'Venta',
        });
      }
    }

    function ws_exchange_rate() {

      try {

        var er_code_country;
        var wsSubsi = recordObj.getValue('subsidiary');
        if (wsSubsi != '' && wsSubsi != null) {
          var result = LR_webService.conection('clntInternal', 'getCountryCode', {
            "subsidiary": wsSubsi
          });
          er_code_country = result.code;
        }

        if (er_code_country != '' && er_code_country != null) {

          var fe_exrate = feature_ws_exchange_rate(er_code_country);

          if (fe_exrate == true) {

            var currencySearch = search.create({
              type: search.Type.CURRENCY,
              filters: ['symbol', 'is', 'USD'],
              columns: 'internalid'
            });
            var currencySearch = currencySearch.run().getRange(0, 1000);
            idcurrencyUSD = currencySearch[0].getValue('internalid');

            if (currencySearch.length > 0) {

              //Moneda Principal Inicio
              var featuresubs = runtime.isFeatureInEffect({
                feature: 'SUBSIDIARIES'
              });

              if (featuresubs == true || featuresubs == 'T') {
                var primaryCurrency = search.lookupFields({
                  type: 'subsidiary',
                  id: recordObj.getValue('subsidiary'),
                  columns: ['currency']
                });

                var primaryCurrencyId = primaryCurrency.currency[0].value;
              } else {
                var primaryCurrencyId = Number(recordObj.getValue('custpage_lmry_basecurrency'));
              };

              if (primaryCurrencyId != idcurrencyUSD && recordObj.getValue('currency') == idcurrencyUSD) {

                result_ws_exchange_rate(er_code_country, 1);
                var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
                if (lmry_exchange_rate_field) {
                  lmry_exchange_rate_field.isDisplay = true;
                }
              } else if (primaryCurrencyId == idcurrencyUSD && recordObj.getValue('currency') != idcurrencyUSD) {

                var secondaryCurrency = search.lookupFields({
                  type: 'currency',
                  id: recordObj.getValue('currency'),
                  columns: ['symbol']
                });

                var codeCurrency = secondaryCurrency.symbol;

                var codeCountry = {
                  'PEN': 'PE',
                  'CRC': 'CR',
                  'ARS': 'AR',
                  'BRL': 'BR',
                  'MXN': 'MX',
                  'COP': 'CO',
                  'USD': 'US',
                  'BOB': 'BO',
                  'USD': 'EC',
                  'USD': 'SV',
                  'GTQ': 'GT',
                  'NIO': 'NI',
                  'PAB': 'PA',
                  'PYG': 'PY',
                  'DOP': 'DO',
                  'UYU': 'UY',
                  'CLP': 'CL'
                };

                var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
                if (lmry_exchange_rate_field) {
                  lmry_exchange_rate_field.isDisplay = true;
                }
                
                result_ws_exchange_rate(codeCountry[codeCurrency], 2);

              } else {
                var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
                if (lmry_exchange_rate_field) {
                  lmry_exchange_rate_field.isDisplay = false;
                }
              }
            }
          }
        }

      } catch (err) {
        library.sendemail2(' [ ws_exchange_rate ] ' + err, LMRY_script, recordObj, 'tranid', 'entity');
      }

    }

    function result_ws_exchange_rate(er_code_country, exchange_rate_case) {

      var er_trandate = recordObj.getValue('trandate');
      if (er_code_country != '' && er_code_country != null && er_trandate != '' && er_trandate != null) {

        if (exchange_rate_case == 1) {

          var result = LR_webService.conection('clnt', 'getExchangeRate', {
            "from": er_code_country,
            "to": "US",
            "date": er_trandate.getDate() + "/" + (er_trandate.getMonth() + 1) + "/" + er_trandate.getFullYear()
          });

        } else if (exchange_rate_case == 2) {

          var result = LR_webService.conection('clnt', 'getExchangeRate', {
            "from": "US",
            "to": er_code_country,
            "date": er_trandate.getDate() + "/" + (er_trandate.getMonth() + 1) + "/" + er_trandate.getFullYear()
          });
        }

        if (result.length > 0) {
          removeOtions('custpage_lmry_exchange_rate', recordObj);
          addOptions('custpage_lmry_exchange_rate', recordObj, result);
        }
      }
    }

    function feature_ws_exchange_rate(code_countr) {
      var autfe = false;
      var authorizations_fe = {
        'AR': 610,
        'BO': 611,
        'BR': 612,
        'CL': 613,
        'CO': 614,
        'CR': 615,
        'DO': 624,
        'EC': 616,
        'SV': 617,
        'GT': 618,
        'MX': 619,
        'NI': 620,
        'PA': 621,
        'PY': 622,
        'PE': 623,
        'UY': 625
      };

      if (authorizations_fe[code_countr]) {
        autfe = library.getAuthorization(authorizations_fe[code_countr], licenses);
      }

      return autfe;
    }

    return {
      pageInit: pageInit,
      fieldChanged: fieldChanged,
      validateField: validateField,
      saveRecord: saveRecord
    };
  });
/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_JournalEntryCLNT_V2.0.js				            ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Jul 20 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/log', 'N/search', 'N/runtime', 'N/email', 'N/format', 'N/currentRecord', 'N/url', 'N/https',
  './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0',
  './Latam_Library/LMRY_AlertTraductorSale_LBRY_V2.0', 'N/record', './Latam_Library/LMRY_Custom_ExchangeRate_LBRY_V2.0.js', './Latam_Library/LMRY_WebService_LBRY_v2.0.js'
],

  function (log, search, runtime, email, format, currentRecord, url, https, library, library_translator, record, Library_ExchangeRate, LR_webService) {

    // Nombre del Script
    var LMRY_script = "LMRY Journal Entry CLNT 2.0";
    var subsi_OW = runtime.isFeatureInEffect({
      feature: "SUBSIDIARIES"
    });
    var LMRY_access = false;
    var LMRY_countr = '';
    var recordObj = '';
    var allLicenses = {};
    var licenses = [];
    var type = '';
    var changes = 0;
    var Language = '';

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
        /* MODIFICACION ,para la captura del idioma */
        Language = runtime.getCurrentScript().getParameter({
          name: 'LANGUAGE'
        });
        Language = Language.substring(0, 2);
        /*Fin Modificacion*/

        type = scriptContext.mode;
        recordObj = scriptContext.currentRecord;

        // ***********************************************
        // 27.08.2021 - Solo para Mid Market Edition
        // ***********************************************
        if (subsi_OW == false || subsi_OW == "F") {
          var filters = new Array();
          var columns = new Array();
          columns[0] = search.createColumn({
            name: 'custrecord_lmry_setuptax_sub_country'
          });

          var getfields = search.create({
            type: 'customrecord_lmry_setup_tax_subsidiary',
            columns: columns,
            //filters: filters
          });
          getfields = getfields.run().getRange(0, 1000);

          if (getfields != '' && getfields != null) {
            var ST_County = '';
            ST_County = getfields[0].getText('custrecord_lmry_setuptax_sub_country');

            //recordObj.setValue("custbody_lmry_serie_doc_cxc", ST_County);
            recordObj.setText("custbody_lmry_subsidiary_country", ST_County);
          }
        }

        allLicenses = library.getAllLicenses();
        var subsidiary = recordObj.getValue('subsidiary');
        if (allLicenses[subsidiary] != null && allLicenses[subsidiary] != '') {
          licenses = allLicenses[subsidiary];
        } else {
          licenses = [];
        }

        if (type == 'create' || type == 'copy') {
          var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
          var lmry_basecurrency = recordObj.getField('custpage_lmry_basecurrency');

          if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '' && lmry_basecurrency != null && lmry_basecurrency != '') {
            lmry_exchange_rate_field.isDisplay = false;
            lmry_basecurrency.isDisplay = false;

            if (recordObj.getValue('subsidiary') != '' && recordObj.getValue('subsidiary') != null) {
              Library_ExchangeRate.ws_exchange_rate(recordObj, licenses);
            }
          }
        }

        if (type == 'copy') {
          recordObj.setValue({
            fieldId: 'custbody_lmry_es_detraccion',
            value: false
          });
          recordObj.setValue({
            fieldId: 'custbody_lmry_estado_detraccion',
            value: ''
          });

        }

        // Desactiva el campo
        var country = recordObj.getValue({
          fieldId: 'custbody_lmry_subsidiary_country'
        });
        if (country != null && country != '') {
          recordObj.getField({
            fieldId: 'custbody_lmry_subsidiary_country'
          }).isDisabled = true;
        }

        // 03/09/2021 - Bloqueo de campos
        recordObj.getField({
          fieldId: 'custbody_lmry_apply_transaction'
        }).isDisabled = true;
        recordObj.getField({
          fieldId: 'custbody_lmry_reference_entity'
        }).isDisabled = true;
        recordObj.getField({
          fieldId: 'custbody_lmry_reference_employee'
        }).isDisabled = true;

        // 03/09/2021 - Solo para One Word Edition
        // Valida el Acceso
        if (subsi_OW == true || subsi_OW == 'T') {
          // Latam - Transaction Reference
          recordObj.getField({
            fieldId: 'custbody_lmry_reference_transaction'
          }).isDisabled = true;
          // Latam - Transaction Reference ID
          recordObj.getField({
            fieldId: 'custbody_lmry_reference_transaction_id'
          }).isDisabled = true;

          ValidateAccessJE(recordObj.getValue({
            fieldId: 'subsidiary'
          }));
        } else {
          ValidateAccessJE(1);
        }

        /**
         * modificacion para journal de El Salvador
         */
        if (type == "copy") {
          if (
            LMRY_countr[0] == "SV"
          ) {
            var cxc_serie = recordObj.getText({
              fieldId: "custbody_lmry_serie_doc_cxc",
            });
            if (
              cxc_serie &&
              cxc_serie != "" &&
              cxc_serie != null &&
              cxc_serie != "-New-"
            ) {
              recordObj.setValue({
                fieldId: "custbody_lmry_num_preimpreso",
                value: ""
              })
              correlativoElSalvador();
              changes += 1;
            }
          }
        }

      } catch (error) {
        console.log(error);
        alert("[ pageInit]\n" + JSON.stringify({ name: error.name, message: error.message }));
        library.sendemail(' [ pageInit ] ' + error, LMRY_script);
      }


    }

    function fieldChanged(scriptContext) {
      /* ******************************************** */
      // 2024.03.15 : Se cambio el valor de la variable
      //recordObj = scriptContext.currentRecord;
      /* ******************************************** */
      recordObj = currentRecord.get();

      var name = scriptContext.fieldId;

      if (name == 'currency' && (type == 'create' || type == 'copy')) {

        var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
        if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
          Library_ExchangeRate.ws_exchange_rate(recordObj, licenses);
        }
        return true;
      }

      if (name == 'custpage_lmry_exchange_rate' && (type == 'create' || type == 'copy')) {
        var lmry_exchange_rate = recordObj.getValue('custpage_lmry_exchange_rate');
        if (lmry_exchange_rate != ' ' && lmry_exchange_rate != '' && lmry_exchange_rate != null) {
          recordObj.setValue('exchangerate', lmry_exchange_rate);
        }
        return true;
      }

      if (name == 'trandate' && (type == 'create' || type == 'copy')) {
        if (recordObj.getValue('subsidiary') != '' && recordObj.getValue('subsidiary') != null) {
          Library_ExchangeRate.ws_exchange_rate(recordObj, licenses);
        }
        return true;
      }

      if (name == 'subsidiary' && (type == 'create' || type == 'copy')) {
        if (recordObj.getValue('subsidiary') != '' && recordObj.getValue('subsidiary') != null) {
          if (recordObj.getValue('currency') != null && recordObj.getValue('currency') != '') {
            Library_ExchangeRate.ws_exchange_rate(recordObj, licenses);
          }
        }
        return true;
      }

      return true;
    }

    function JOURSet_Field_tranid() {
      try {
        var currentRCD = recordObj;
        // Subsidiaria
        var subsidiaria = currentRCD.getValue("subsidiary");
        var lmry_DocTip = currentRCD.getValue("custbody_lmry_document_type");
        var lmry_DocNum = currentRCD.getValue("custbody_lmry_num_preimpreso");
        var lmry_DocSer = currentRCD.getText("custbody_lmry_serie_doc_cxc");
        var tranprefix = "";
        var texto = "";

        //Feature SV - Print Series              ------codigo de caracteristica
        var isSeriesActive = library.getAuthorization(657, licenses);

        var hasSeries = LMRY_countr[0] != "SV" || (LMRY_countr[0] == "SV" && isSeriesActive);

        // Valida el campo subsidiary
        if (subsidiaria != "" && subsidiaria != null) {
          // Validad contenido de campos

          if (
            lmry_DocTip &&
            lmry_DocTip != -1 &&
            lmry_DocNum &&
            ((hasSeries && lmry_DocSer && lmry_DocSer != -1) ||
              LMRY_countr[0] == "SV")
          ) {
            /* *********************************************
             * Verifica que este activo el feature Numerar
             * Transaction Number Journal
             **********************************************/
            // Solo para subsidiaria con acceso
            //ID de features de SET TRANID por pais.
            var featuresByCountry = {
              SV: 660,
            };

            var featureId = featuresByCountry[LMRY_countr[0]];

            // if (featureId && LMRY_countr[2] == true && LMRY_access) {
            if (featureId && LMRY_access) {
              /* *********************************************
               * Verifica que este activo el feature SET TRANID
               **********************************************/
              if (library.getAuthorization(featureId, licenses) == false) {
                return true;
              }

              // URL Del Pais
              var urlpais = runtime
                .getCurrentScript()
                .getParameter("custscript_lmry_netsuite_location");

              // Se optiene el Pre - Fijo de la subsidiaria
              var url_3 =
                url.resolveScript({
                  scriptId: "customscript_lmry_get_country_stlt",
                  deploymentId: "customdeploy_lmry_get_country_stlt",
                  returnExternalUrl: false,
                }) +
                "&sub=" +
                subsidiaria +
                "&opt=INV&cty=" +
                LMRY_countr[0];

              //corregir hard code falta url
              var get = https.get({
                url: "https://" + urlpais + url_3,
              });

              // Retorna el cuero del SuiteLet (Codigo pre configurado "Pre - Fijo de la subsidiaria")
              var tranprefix = get.body;

              var texto = "";
              var separador = "-";
              if (hasSeries) {
                var serie = currentRCD.getText("custbody_lmry_serie_doc_cxc");
                var preimpreso = currentRCD.getValue("custbody_lmry_num_preimpreso");
                texto = serie + separador + preimpreso;
              }
              if (tranprefix) {
                texto =
                  tranprefix +
                  separador +
                  texto
              }


              currentRCD.setValue({
                fieldId: "tranid",
                value: texto,
              });
            } // Solo para subsidiaria con acceso
          } // Validad contenido de campos
        } // Valida el campo subsidiary
        return true;
      } catch (err) {
        console.log(err);
        alert("[ JOURSet_Field_tranid ]\n" + JSON.stringify({ name: err.name, message: err.message }));
        currentRCD = currentRecord.get();
        library.sendemail2(
          " [ JOURSet_Field_tranid ] " + err,
          LMRY_script,
          currentRCD,
          "tranid",
          "entity"
        );
      }

    }

    function correlativoElSalvador() {
      try {
        var currentRCD = currentRecord.get();
        // Solo para subsidiaria con acceso - Transaction Number Journal

        var isSeriesActive = library.getAuthorization(657, licenses);
        // if (featureId && LMRY_countr[2] == true && LMRY_access) {
        if (LMRY_access && isSeriesActive) {
          // Verifica que no este vacio el numero de serie
          var lmry_DocSer = currentRCD.getValue("custbody_lmry_serie_doc_cxc");

          if (lmry_DocSer != "" && lmry_DocSer != null && lmry_DocSer != -1) {
            // Verifica que no este vacio el numero preimpreso
            var lmry_DocNum = currentRCD.getValue("custbody_lmry_num_preimpreso");
            if (lmry_DocNum == '' || lmry_DocNum == null) {

              /* *********************************************
               * Verifica que este activo el feature Numerar
               * Transaction Number Journal:
               **********************************************/
              // if (Library_Mail.getAuthorization(featureId, licenses) == false) {
              //   return true;
              // }
              // Trae el ultimo numero pre-impreso
              var wtax_type = search.lookupFields({
                type: "customrecord_lmry_serie_impresion_cxc",
                id: lmry_DocSer,
                columns: [
                  "custrecord_lmry_serie_numero_impres",
                  "custrecord_lmry_serie_rango_fin",
                  "custrecord_lmry_serie_num_digitos",
                  "custrecord_ei_preprinted_series",
                  "custrecord_lmry_serie_fecha_autoriz",
                  "custrecord_lmry_serie_fecha_auto_fin",
                ],
              });

              var nroConse = parseInt(wtax_type.custrecord_lmry_serie_numero_impres) + 1;
              var maxPermi = parseInt(wtax_type.custrecord_lmry_serie_rango_fin);
              var digitos = parseInt(wtax_type.custrecord_lmry_serie_num_digitos);
              var isEISeries = wtax_type.custrecord_ei_preprinted_series;
              var autoInicio = wtax_type.custrecord_lmry_serie_fecha_autoriz;
              var autoFin = wtax_type.custrecord_lmry_serie_fecha_auto_fin;
              // Valida el numero de digitos
              if (digitos == "" || digitos == null) {
                return true;
              }

              // SW para que no ingrese en un bucle
              LMRY_swpnro = true;
              // Crea el numero consecutivo
              if (nroConse > maxPermi) {
                alert(library_translator.getAlert(3, Language, [maxPermi]));
                // alert(
                //   "El ultimo numero para esta serie (" + maxPermi +") ha sido utilizado. Verificar si existen numeros disponibles en esta serie"
                // );

                // Asigna el numero pre-impero
                currentRCD.setValue("custbody_lmry_num_preimpreso", "");
              } else {
                var longNumeroConsec = parseInt((nroConse + "").length);
                var llenarCeros = "";
                for (var i = 0; i < digitos - longNumeroConsec; i++) {
                  llenarCeros += "0";
                }
                nroConse = llenarCeros + nroConse;

                var fechaingresad = recordObj.getValue("trandate");
                console.log(autoInicio, autoFin, fechaingresad);

                if (fechaingresad && autoInicio && autoFin) {
                  autoInicio = format.parse({
                    value: autoInicio,
                    type: format.Type.DATE
                  })
                  autoFin = format.parse({
                    value: autoFin,
                    type: format.Type.DATE
                  })


                  // fechaingresad = format.format({
                  //   value: fechaingresad,
                  //   type: format.Type.DATE
                  // })

                  console.log(autoInicio, autoFin, fechaingresad);

                  if (autoInicio <= fechaingresad && fechaingresad <= autoFin) {
                    // Asigna el numero pre-impero
                    currentRCD.setValue("custbody_lmry_num_preimpreso", nroConse);

                    // Llama a la funcion de seteo del Tranid
                    JOURSet_Field_tranid();
                  } else {
                    var alertamensaje = {
                      "es": "la fecha ingresada esta fuera del rango de autorizacion para ese periodo",
                      "en": "the date entered is outside the range of authorization for that period",
                      "pt": "a data informada está fora do intervalo de autorização para esse período."
                    };
                    if (Language != null) {
                      alert(alertamensaje[Language])
                    } else {
                      alert(alertamensaje["en"])
                    }

                    return false;
                  }
                } else {
                  currentRCD.setValue({ fieldId: "custbody_lmry_num_preimpreso", value: "", ignoreFieldChange: true });
                  // currentRCD.setValue({ fieldId: "tranid", value: "", ignoreFieldChange: true });
                }
              }
              // SW para que no ingrese en un bucle
              LMRY_swpnro = false;
            }
          }
        }
      } catch (err) {
        console.log(err);
        alert("[ correlativoElSalvador ]\n" + JSON.stringify({ name: err.name, message: err.message }));
        currentRCD = currentRecord.get();
        library.sendemail2(
          " [correlativoElSalvador ] " + err,
          LMRY_script,
          currentRCD,
          "tranid",
          "entity"
        );
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
        recordObj = scriptContext.currentRecord;
        var name = scriptContext.fieldId;

        if (name == "custbody_lmry_subsidiary_country") {
          // Valida el Acceso
          if (subsi_OW == true || subsi_OW == "T") {
            ValidateAccessJE(
              recordObj.getValue({
                fieldId: "subsidiary",
              })
            );
          } else {
            ValidateAccessJE(1);
          }
        }
        //cambio numeracion preimpreso El Salvador
        if (name == "custbody_lmry_serie_doc_cxc") {
          if (
            LMRY_countr[0] == "SV"
          ) {
            var cxc_serie = recordObj.getText({
              fieldId: "custbody_lmry_serie_doc_cxc",
            });
            if (
              cxc_serie &&
              cxc_serie != "" &&
              cxc_serie != null &&
              cxc_serie != "-New-"
            ) {

              correlativoElSalvador();
              changes += 1;
            }
          }
        }
        if (name == "subsidiary") {
          var subsidiary = recordObj.getValue("subsidiary");
          if (allLicenses[subsidiary] != null && allLicenses[subsidiary] != "") {
            licenses = allLicenses[subsidiary];
          } else {
            licenses = [];
          }
        }

        return true;
      } catch (error) {
        console.log(error);
        alert("[ validateField ]\n" + JSON.stringify({ name: error.name, message: error.message }));
        library.sendemail(" [ validateField ] " + error, LMRY_script);
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

      try {
        var LMRY_Result = '';

        // Valida si el feature esta ACTIVO
        if (!LMRY_access) {
          return true;
        }

        recordObj = scriptContext.currentRecord;
        // Valida si esta en la sub lista Line
        if (scriptContext.sublistId != 'line') {
          return true;
        }

        // Standart Fields
        recordObj = scriptContext.currentRecord;

        // Valida el idioma de la instancia
        /*var Language = runtime.getCurrentUser().getPreference({
          name: 'language'
        });
        Language = Language.substring(0, 2);
        Language = Language.toLowerCase();*/
        var es_detraccionmasiva = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_es_detraccion_masiva'
        });
        //var library8 = library.getAuthorization(96, licenses);
        if (library.getAuthorization(96, licenses) && LMRY_countr[0] == 'PE' && (es_detraccionmasiva == true || es_detraccionmasiva == 'T')) {
          var fecha_detraccion = recordObj.getCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'custcol_lmry_fecha_detraccion'
          });
          var numero_detraccion = recordObj.getCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'custcol_lmry_numero_detraccion'
          });
          var bill_detraccion = recordObj.getCurrentSublistText({
            sublistId: 'line',
            fieldId: 'custcol_lmry_factura_prov_detraccion'
          });

          if (bill_detraccion == null || bill_detraccion == '') {
            /* if(Language == 'es'){
               alert('El campo LATAM COL - FACTURA PROVEEDOR DETRACCION esta vacio');
             }else{
               alert('The field LATAM COL - FACTURA PROVEEDOR DETRACCION is empty');
             }*/
            alert(library_translator.getAlert(13, Language, []));

            return false;
          }

          if (!validarfecha(fecha_detraccion)) {
            /*if(Language == 'es'){
              alert('Debe ingresar una fecha valida con el formato dd/mm/yyyy en el campo LATAM COL - FECHA DETRACCION');
            }else{
              alert('You must enter a valid date with the format dd/mm/yyyy in the field LATAM COL - FECHA DETRACCION');
            }*/
            alert(library_translator.getAlert(14, Language, []));

            return false;
          }

          if ((numero_detraccion == null || numero_detraccion == '') || isNaN(numero_detraccion) || numero_detraccion < 0) {
            /* if(Language == 'es'){
               alert('El campo LATAM COL - NUMERO DETRACCION tiene un numero invalido');
             }else{
               alert('The field LATAM COL - NUMBER DETRACCION has an invalid number');
             }*/
            alert(library_translator.getAlert(15, Language, []));

            return false;
          }
        }

        var account = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'account'
        });
        if (account == '' || account == null) {
          return true;
        }

        var memo = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'memo'
        });

        var nameLinea = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'entity'
        });
        var department = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'department'
        });
        var clase = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'class'
        });
        var location = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'location'
        });
        var residual = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'residual'
        });
        // Custom Fields
        var related_asset = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_far_trn_relatedasset'
        });
        var doc_proveedor = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_exp_rep_vendor_colum'
        });
        var doc_numero = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_exp_rep_num_doc'
        });
        var doc_fecha_origen = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_doc_fecha_origen'
        });
        var transaction_reference = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_pe_transaction_reference'
        });
        var factura_proveedor_detraccion = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_factura_prov_detraccion'
        });
        var fecha_detraccion = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_fecha_detraccion'
        });
        var numero_detraccion = recordObj.getCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'custcol_lmry_numero_detraccion'
        });

        var message = "";
        message = library_translator.getAlert(16, Language, []);

        var bandera = true;
        if (subsi_OW) {
          var subsidiaria = recordObj.getValue({
            fieldId: 'subsidiary'
          });
          var filtro_subsidiaria = search.createFilter({
            name: 'custrecord_lmry_journal_subsidiary',
            operator: search.Operator.ANYOF,
            values: [subsidiaria]
          });
        }
        var filtro_account = search.createFilter({
          name: 'custrecord_lmry_journal_account',
          operator: search.Operator.ANYOF,
          values: [account]
        });
        var filtro_inactive = search.createFilter({
          name: 'isinactive',
          operator: search.Operator.IS,
          values: ['F']
        });

        /* * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * Custom Record Type : LatamReady - Validate Journal
         * Custom ID .........: customrecord_lmry_validate_journal
         * Custom Search : LatamReady - Validate Journal
         * Custom ID .........: customsearch_lmry_validate_journal
         * * * * * * * * * * * * * * * * * * * * * * * * * * * */
        var busqueda = search.load({
          id: 'customsearch_lmry_validate_journal'
        });
        if (subsi_OW) {
          busqueda.filters.push(filtro_subsidiaria);
        }
        busqueda.filters.push(filtro_account);
        busqueda.filters.push(filtro_inactive);

        var busqueda1 = busqueda.run();
        var busqueda2 = busqueda1.getRange({
          start: 0,
          end: 1000
        });
        var x, y;
        if (busqueda2 != null && busqueda2.length > 0) {
          for (var i = 0; i < busqueda2.length; i++) {
            /* if (Language == 'es') {*/
            x = busqueda2[i].getValue('custrecord_lmry_journal_memo');
            if (x == true && (memo == null || memo == "")) {
              message = message + library_translator.getAlert(17, Language, []) + "\n";
              bandera = false;
            }
            x = busqueda2[i].getValue('custrecord_lmry_journal_name');
            if (x == true && (nameLinea == null || nameLinea == "")) {
              message = message + library_translator.getAlert(18, Language, []) + "\n";
              bandera = false;
            }
            /************************* Modificacion 7/11/2019 ************************
            Validando que este activo el feature  DEPARTMENTS (ruta: SETUP>COMPANY>ENABLE FEATURES)
            */
            var featureDepartments = runtime.isFeatureInEffect({
              feature: 'DEPARTMENTS'
            });
            if (featureDepartments == true) {
              x = busqueda2[i].getValue('custrecord_lmry_journal_department');
              if (x == true && (department == null || department == "")) {
                message = message + library_translator.getAlert(19, Language, []) + "\n";
                bandera = false;
              }
            }
            //Fin validadcion del Feature DEPARTMENTS

            /************************* Modificacion 7/11/2019 ************************
            Validando que este activo el feature  CLASSES (ruta: SETUP>COMPANY>ENABLE FEATURES)
            */
            var featureClasses = runtime.isFeatureInEffect({
              feature: 'CLASSES'
            });
            if (featureClasses == true) {
              x = busqueda2[i].getValue('custrecord_lmry_journal_class');
              if (x == true && (clase == null || clase == "")) {
                message = message + library_translator.getAlert(20, Language, []) + "\n";
                bandera = false;
              }
            }
            //Fin validadcion del Feature CLASSES

            /* ************************ Modificacion 7/11/2019 ************************
             * Validando que este activo el feature  LOCATIONS
             * (ruta: SETUP>COMPANY>ENABLE FEATURES)
             * ********************************************************************* */
            var featureLocations = runtime.isFeatureInEffect({
              feature: 'LOCATIONS'
            });
            if (featureLocations == true) {
              x = busqueda2[i].getValue('custrecord_lmry_journal_location');
              if (x == true && (location == null || location == "")) {
                message = message + library_translator.getAlert(21, Language, []) + "\n";
                bandera = false;
              }
            }
            //Fin validadcion del Feature LOCATIONS

            x = busqueda2[i].getValue('custrecord_lmry_journal_residual');
            if (x == true && (residual == null || residual == "")) {
              message = message + library_translator.getAlert(22, Language, []) + "\n";
              bandera = false;
            }
            x = busqueda2[i].getValue('custrecord_lmry_journal_related_asset');
            if (x == true && (related_asset == null || related_asset == "")) {
              message = message + library_translator.getAlert(23, Language, []) + "\n";
              bandera = false;
            }
            x = busqueda2[i].getValue('custrecord_lmry_journal_doc_ven');
            if (x == true && (doc_proveedor == null || doc_proveedor == "")) {
              message = message + library_translator.getAlert(24, Language, []) + "\n";
              bandera = false;
            }
            x = busqueda2[i].getValue('custrecord_lmry_journal_doc_num');
            if (x == true && (doc_numero == null || doc_numero == "")) {
              message = message + library_translator.getAlert(25, Language, []) + "\n";
              bandera = false;
            }
            x = busqueda2[i].getValue('custrecord_lmry_journal_doc_dat_ori');
            if (x == true && (doc_fecha_origen == null || doc_fecha_origen == "")) {
              message = message + library_translator.getAlert(26, Language, []) + "\n";
              bandera = false;
            }
            x = busqueda2[i].getValue('custrecord_lmry_journal_transaction_refe');
            if (x == true && (transaction_reference == null || transaction_reference == "")) {
              message = message + library_translator.getAlert(27, Language, []) + "\n";
              bandera = false;
            }
            x = busqueda2[i].getValue('custrecord_lmry_journal_invoice_provider');
            if (x == true && (factura_proveedor_detraccion == null || factura_proveedor_detraccion == "")) {
              message = message + library_translator.getAlert(28, Language, []) + "\n";
              bandera = false;
            }
            x = busqueda2[i].getValue('custrecord_lmry_journal_detraction_date');
            if (x == true && (fecha_detraccion == null || fecha_detraccion == "")) {
              message = message + library_translator.getAlert(29, Language, []) + "\n";
              bandera = false;
            }
            x = busqueda2[i].getValue('custrecord_lmry_journal_number_detractio');
            if (x == true && (numero_detraccion == null || numero_detraccion == "")) {
              message = message + library_translator.getAlert(30, Language, []) + "\n";
              bandera = false;
            }
          }
        }

        if (bandera == false) {
          alert(message);
          return false;
        }

        return true;

      } catch (error) {
        console.log(error);
        alert("[ validateLine ]\n" + JSON.stringify({ name: error.name, message: error.message }));
        // Envio de E-Mail
        library.sendemail(' [ validateLine ] ' + error, LMRY_script);
      }
      return true;
    }

    function saveRecord(scriptContext) {
      try {

        if (!subsi_OW) {
          var swCountry = false;
          var countryValue = recordObj.getValue({
            fieldId: 'custbody_lmry_subsidiary_country'
          });

          var searchSetupSubsidiary = search.create({
            type: "customrecord_lmry_setup_tax_subsidiary",
            filters: [
              ['isinactive', 'is', 'F']
            ],
            columns: ['custrecord_lmry_setuptax_sub_country']
          });
          searchSetupSubsidiary = searchSetupSubsidiary.run().getRange(0, 1);
          if (searchSetupSubsidiary != null && searchSetupSubsidiary != '') {
            var countrySetup = searchSetupSubsidiary[0].getValue('custrecord_lmry_setuptax_sub_country');

            if (countrySetup == countryValue) {
              swCountry = true;
            }
          }

          if (!swCountry) {
            var countryField = recordObj.getField({
              fieldId: 'custbody_lmry_subsidiary_country'
            });
            if (Language == 'es') {
              alert('El campo "' + countryField.label + '" no coincide con el pais de la instancia');
            } else {
              alert('The "' + countryField.label + '" field does not match the country of the instance');
            }
            return false;
          }
        }

        // C1212
        if((library.getAuthorization(151, licenses) == true || library.getAuthorization(151, licenses) == 'T') && LMRY_countr[0] == 'MX'){
          var current = scriptContext.currentRecord;
          var entities = [];
          var lines = current.getLineCount({
            sublistId: 'line'
          });

          var errorDiot = '';
          var errorExtranjero = '';
          var diotFail = false;
          var diotFail2 = false;
          var opType = current.getValue('custbody_lmry_mx_operation_type');

          if(opType){
            var opCode = search.lookupFields({
              type: 'customrecord_lmry_mx_operation_type',
              id: opType,
              columns: 'custrecord_lmry_mx_operation_code',
            });
            opCode=opCode.custrecord_lmry_mx_operation_code;
          }

          for(var i = 0; i < lines; i++){
            var entity = current.getSublistValue({
              sublistId: 'line',
              fieldId: 'entity',
              line: i
            });
            var debit = current.getSublistValue({
              sublistId: 'line',
              fieldId: 'debit',
              line: i
            });

            if (entity != null && entity != '' && debit != null && debit != '') {
              entities.push(entity);
            }
          }
        
          /* ************************************ */
          // 2025.02.21 : Validacion de Entidad
          // CP2500089 - validar arreglo vacio
          /* ************************************ */
          log.debug('saveRecord : entities' , entities)
          if (Array.isArray(entities) && entities.length > 0) {
              var checkEntity = search.create({
                type: 'entity',
                columns: [
                    { name: 'type' }, 
                    { name: 'entityid' }, 
                    { name: 'altname' },
                    { name: 'custentity_lmry_countrycode' }
                ],
                filters: [
                    ['internalid', 'anyof', entities]
                ]
            });
        
            // Ejecutar la búsqueda y procesar los resultados
            checkEntity.run().each(function(result){
                var entityType = result.getValue('type'); // Obtiene el texto descriptivo del tipo
                var entityName = result.getValue('entityid'); // Obtiene el nombre
                var entityAltName = result.getValue('altname');
                var entityCountry = result.getValue('custentity_lmry_countrycode');

                if(entityType != 'Vendor'){
                  errorDiot = errorDiot +' — '+ entityName +' '+entityAltName+'\n';
                  diotFail = true;
                }else{
                  if(opType){
                    if(!(entityCountry == 'MX' || entityCountry == '') && !(opCode== '03' || opCode =='85')){
                      errorExtranjero = errorExtranjero +' — '+entityName+' '+entityAltName+'\n';
                      diotFail2 = true;
                    }
                  }
                }
                return true;
            });
          } // 2025.02.21 : Validacion de Entidad

          if(diotFail){
            var dioterrormensaje = {
              "es": 'Advertencia: La(s) entidad(es) no pertencen(n) al tipo Vendor: '+'\n'+ errorDiot,
              "en": 'Caution: Following entities are not Vendor: '  +'\n'+ errorDiot,
              "pt": 'Aviso: Entidade não é Fornecedor nas seguintes linhas: '  +'\n'+ errorDiot
            };
            if (Language != null) {
              var windowsConfirm = window.confirm(
                dioterrormensaje[Language]
              );
            } else {
              var windowsConfirm = window.confirm(
                dioterrormensaje["en"]
              );
            }

            if(!windowsConfirm){
              return false;
            }
          }

          if(diotFail2){
            var dioterrormensaje2 = {
              "es": 'Advertencia: El Tipo de Operación actual no es apto para DIOT con las siguientes entidades extranjeras: '+'\n'+ errorExtranjero,
              "en": 'Caution: The current Operation Type is not suitable for DIOT with the following foreign entities: '  +'\n'+ errorExtranjero,
              "pt": 'Aviso: O tipo de operação atual não é adequado para DIOT com as seguintes entidades estrangeiras: '  +'\n'+ errorExtranjero
            };
            if (Language != null) {
              var windowsConfirm = window.confirm(
                dioterrormensaje2[Language]
              );
            } else {
              var windowsConfirm = window.confirm(
                dioterrormensaje2["en"]
              );
            }

            if(!windowsConfirm){
              return false;
            }
          }
        }

        if ((library.getAuthorization(96, licenses) == true || library.getAuthorization(96, licenses) == 'T') && LMRY_countr[0] == 'PE') {

          /*var Language = runtime.getCurrentUser().getPreference({name: 'language'});
         
                 Language = Language.substring(0, 2);
                 Language = Language.toLowerCase();*/

          var objRecord = scriptContext.currentRecord;
          var lineas = objRecord.getLineCount({
            sublistId: 'line'
          });

          var result_journal = [];

          for (var i = 0; i < lineas; i++) {
            var json_journal = {};
            var detraccion_masiva = objRecord.getSublistValue({
              sublistId: 'line',
              fieldId: 'custcol_lmry_es_detraccion_masiva',
              line: i
            });
            if (detraccion_masiva == true || detraccion_masiva == 'T') {
              json_journal["id"] = objRecord.getSublistValue({
                sublistId: 'line',
                fieldId: 'custcol_lmry_factura_prov_detraccion',
                line: i
              });
              json_journal["text"] = objRecord.getSublistText({
                sublistId: 'line',
                fieldId: 'custcol_lmry_factura_prov_detraccion',
                line: i
              });

              var credit = objRecord.getSublistValue({
                sublistId: 'line',
                fieldId: 'credit',
                line: i
              });
              var debit = objRecord.getSublistValue({
                sublistId: 'line',
                fieldId: 'debit',
                line: i
              });

              if (credit == null || credit == '') {
                credit = 0;
              }

              if (debit == null || debit == '') {
                debit = 0;
              }

              json_journal["credit"] = credit;
              json_journal["debit"] = debit;
              json_journal["fecha"] = objRecord.getSublistValue({
                sublistId: 'line',
                fieldId: 'custcol_lmry_fecha_detraccion',
                line: i
              });
              json_journal["numero"] = objRecord.getSublistValue({
                sublistId: 'line',
                fieldId: 'custcol_lmry_numero_detraccion',
                line: i
              });

              result_journal.push(json_journal);

            }
          }

          result_journal.sort(sort);
          if (result_journal.length != null && result_journal.length > 0) {
            if (result_journal.length > 1) {
              var aux_monto = 0;
              for (var i = 0; i < result_journal.length; i++) {
                var credit = result_journal[i]["credit"];
                var debit = result_journal[i]["debit"];

                if (credit == null || credit == '') {
                  credit = 0;
                }

                if (debit == null || debit == '') {
                  debit = 0;
                }

                if (i > 0) {
                  if (result_journal[i]["id"] == result_journal[i - 1]["id"]) {

                    if (i == result_journal.length - 1) {
                      aux_monto = parseFloat(aux_monto) + parseFloat(credit) - parseFloat(debit);
                      if (aux_monto != 0 && aux_monto != '0') {
                        /*if(Language == 'es'){
                          alert('El total del credito y el total del debito para el bill ' + result_journal[i-1]["text"] + ' no son iguales en el journal');
                        }else{
                          alert('The total of the credit and the total of the debit for the bill '+result_journal[i-1]["text"] + ' are not equal in the journal');
                        }*/
                        alert(library_translator.getAlert(33, Language, [result_journal[i - 1]["text"]]));

                        return false;
                      }
                    }

                    if (result_journal[i]["fecha"] != result_journal[i - 1]["fecha"]) {
                      /*if(Language == 'es'){
                        alert("El campo LATAM COL - FECHA DETRACCION para el bill " + result_journal[i]["text"] +" no coinciden en el journal");
                      }else{
                        alert("The field LATAM COL - DATE DETRACTION for the bill " + result_journal[i]["text"] +" does not match in the journal");
                      }*/
                      alert(library_translator.getAlert(34, Language, [result_journal[i]["text"]]));

                      return false;
                    }

                    if (result_journal[i]["numero"] != result_journal[i - 1]["numero"]) {
                      /*if(Language == 'es'){
                        alert("El campo LATAM COL - NUMERO DETRACCION para el bill " + result_journal[i]["text"] + " no coinciden en el journal");
                      }else{
                        alert("The field LATAM COL - NUMERO DETRACTION for the bill " + result_journal[i]["text"] + " does not match in the journal");
                      }*/
                      alert(library_translator.getAlert(35, Language, [result_journal[i]["text"]]));

                      return false;
                    }
                  } else {

                    if (i == result_journal.length - 1) {
                      /*if(Language == 'es'){
                        alert('El total del credito y el total del debito para el bill ' + result_journal[i-1]["text"] + ' no son iguales en el journal');
                      }else{
                        alert('The total of the credit and the total of the debit for the bill '+result_journal[i-1]["text"] + ' are not equal in the journal');
                      }*/
                      alert(library_translator.getAlert(33, Language, [result_journal[i - 1]["text"]]));

                      return false;
                    }

                    if (aux_monto != 0 && aux_monto != '0') {
                      /*if(Language == 'es'){
                        alert('El total del credito y el total del debito para el bill ' + result_journal[i-1]["text"] + ' no son iguales en el journal');
                      }else{
                        alert('The total of the credit and the total of the debit for the bill '+result_journal[i-1]["text"] + ' are not equal in the journal');
                      }*/
                      alert(library_translator.getAlert(33, Language, [result_journal[i - 1]["text"]]));

                      return false;
                    }

                    aux_monto = 0;

                  }
                }

                aux_monto = parseFloat(aux_monto) + parseFloat(credit) - parseFloat(debit);
              }
            }

            if (result_journal.length == 1) {
              /*if(Language == 'es'){
                alert('El total del credito y el total del debito para el bill ' + result_journal[0]["text"] + ' no son iguales en el journal');
              }else{
                alert('The total of the credit and the total of the debit for the bill '+result_journal[0]["text"] + ' are not equal in the journal');
              }*/
              alert(library_translator.getAlert(33, Language, [result_journal[0]["text"]]));

              return false;
            }
          }




        }


        //validacion del correlativo para El Salvador
        if (
          LMRY_countr[0] == "SV"
        ) {
          var currentRCD = currentRecord.get();
          // Solo para subsidiaria con acceso - Transaction Number Journal
          var featuresByCountry = {
            SV: 105,
          };

          var featureId = featuresByCountry[LMRY_countr[0]];

          if (featureId && LMRY_access) {
            // Verifica que no este vacio el numero de serie
            var lmry_DocSer = currentRCD.getValue("custbody_lmry_serie_doc_cxc");

            if (lmry_DocSer != "" && lmry_DocSer != null && lmry_DocSer != -1) {
              // Verifica que no este vacio el numero preimpreso
              var lmry_DocNum = currentRCD.getValue("custbody_lmry_num_preimpreso");
              if (lmry_DocNum != "" && lmry_DocNum != null) {
                var Auxserie = currentRCD.getValue("custbody_lmry_serie_doc_cxc");
                var Auxnumer = currentRCD.getValue("custbody_lmry_num_preimpreso");

                if (
                  Auxserie != null &&
                  Auxserie != "" &&
                  Auxnumer != null &&
                  Auxnumer != ""
                ) {
                  //extraemos los datos de la serie
                  var nroConse = search.lookupFields({
                    type: "customrecord_lmry_serie_impresion_cxc",
                    id: Auxserie,
                    columns: [
                      "custrecord_lmry_serie_numero_impres",
                      "custrecord_lmry_serie_rango_fin",
                      "custrecord_ei_preprinted_series",
                      "custrecord_lmry_serie_fecha_autoriz",
                      "custrecord_lmry_serie_fecha_auto_fin",
                    ],
                  });

                  var actualNro = nroConse.custrecord_lmry_serie_numero_impres;
                  var finNro = nroConse.custrecord_lmry_serie_rango_fin;
                  var autoInicio = nroConse.custrecord_lmry_serie_fecha_autoriz;
                  var autoFin = nroConse.custrecord_lmry_serie_fecha_auto_fin;
                  var fechaingresad = currentRCD.getValue("trandate");
                  if (finNro && autoInicio && fechaingresad) {
                    autoInicio = format.parse({
                      value: autoInicio,
                      type: format.Type.DATE
                    })
                    autoFin = format.parse({
                      value: autoFin,
                      type: format.Type.DATE
                    })

                    // fechaingresad = format.format({
                    //   value: fechaingresad,
                    //   type: format.Type.DATE
                    // });
                    console.log(actualNro + "  " + Auxnumer);
                    if (autoInicio <= fechaingresad && fechaingresad <= autoFin) {
                      if ((parseFloat(Auxnumer) > parseFloat(actualNro) && parseFloat(finNro) >= parseFloat(Auxnumer)) || changes == 0) {
                        console.log(actualNro + "  " + Auxnumer);
                        try {
                          if (changes != 0) {
                            var id = record.submitFields({
                              type: "customrecord_lmry_serie_impresion_cxc",
                              id: Auxserie,
                              values: {
                                'custrecord_lmry_serie_numero_impres': parseFloat(Auxnumer),
                              },
                            });
                            console.log(id);
                          }
                        } catch (e) {
                          console.log(e);
                          var alertamensaje = {
                            "es": "Error al momento de actualizar el Nro correlativo",
                            "en": "Error when updating the correlative No.",
                            "pt": "Erro ao atualizar o número correlato."
                          };
                          if (Language != null) {
                            alert(alertamensaje[Language])
                          } else {
                            alert(alertamensaje["en"])
                          }

                          return false;
                        }

                      } else {
                        var alertamensaje = {
                          "es": "Numero ya registrado o serie llena",
                          "en": "Number already registered or series filled",
                          "pt": "Número já registrado ou preenchido em série"
                        };
                        if (Language != null) {
                          alert(alertamensaje[Language])
                        } else {
                          alert(alertamensaje["en"])
                        }

                        return false;
                      } //validamos que el numero correlativo no este vacio
                    } else {
                      var alertamensaje = {
                        "es": "La fecha ingresada no corresponde a la serie seleccionada",
                        "en": "The date entered does not correspond to the selected series.",
                        "pt": "A data informada não corresponde à série selecionada."
                      };
                      if (Language != null) {
                        alert(alertamensaje[Language])
                      } else {
                        alert(alertamensaje["en"])
                      }
                      return false;
                    } //validamos si la fecha seleccionada esta dentro del rango de la serie
                  }
                } //validamos que este definido el field numero preimpreso (correlativo) y tambien la serie de impresion
              } //validamos que este definido el field numero preimpreso (correlativo)
            }
          } //validamos el permiso al acceso de la caracteristica
        } //validamos la subsidiaria

        return true;

      } catch (error) {
        console.log(error);
        alert("[ saveRecord ]\n" + JSON.stringify({ name: error.name, message: error.message }));
        library.sendemail(' [ saveRecord ] ' + error, LMRY_script);
      }
    }

    /* ------------------------------------------------------------------------------------------------------
     * A la variable featureId se le asigna el valore que le corresponde
     * --------------------------------------------------------------------------------------------------- */
    function ValidateAccessJE(ID) {

      try {
        if (ID == '' || ID == null) {
          return true;
        }

        // Inicializa variables Locales y Globales
        LMRY_access = false;
        LMRY_countr = library.Get_Country_STLT(ID);

        // Verifica que el arreglo este lleno
        if (LMRY_countr.length < 1) {
          return true;
        }
        LMRY_access = library.getCountryOfAccess(LMRY_countr, licenses);

        if (LMRY_countr[0] == '' || LMRY_countr[0] == null) {
          return true;
        }

        if (!validateAdvanceHV(LMRY_countr[0], licenses)) {
          // Oculta todos los campos LMRY
          library.onFieldsHide([2], recordObj, false);
          // Solo si tiene acceso
          if (LMRY_access == true) {
            library.onFieldsDisplayBody(recordObj, LMRY_countr[1], 'custrecord_lmry_on_journal', false);
          }
        }

        // ***********************************************
        // 01.10.2021 - Solo para One World Edition
        // ***********************************************
        if (subsi_OW == false || subsi_OW == "F") {
          if (LMRY_access && LMRY_countr[0] == "PE") {
            // Latam - Transaction Reference
            recordObj.getField({
              fieldId: "custbody_lmry_reference_transaction",
            }).isDisabled = false;
            // Latam - Transaction Reference ID
            recordObj.getField({
              fieldId: "custbody_lmry_reference_transaction_id",
            }).isDisabled = false;
          } else {
            // Latam - Transaction Reference
            recordObj.getField({
              fieldId: "custbody_lmry_reference_transaction",
            }).isDisabled = true;
            // Latam - Transaction Reference ID
            recordObj.getField({
              fieldId: "custbody_lmry_reference_transaction_id",
            }).isDisabled = true;
          }
        } else {
          /* ********************************
           * Permite cambiar en Brasil
           * el valore de los campos
           * Latam - Transaction Reference
           * Latam - Transaction Reference ID
           * ******************************** */
          recordObj.getField({
            fieldId: "custbody_lmry_reference_transaction",
          }).isDisabled = false;
          recordObj.getField({
            fieldId: "custbody_lmry_reference_transaction_id",
          }).isDisabled = false;
        } // 01.10.2021

      } catch (error) {
        console.log(error);
        alert("[ ValidateAccessJE ]\n" + JSON.stringify({ name: error.name, message: error.message }));
        library.sendemail(' [ ValidateAccessJE ] ' + error, LMRY_script);
      }

    }

    function sort(a, b) {
      a = a.id;
      b = b.id;
      if (a < b) {
        return 1;
      } else if (a > b) {
        return -1;
      }
      return 0;
    }

    function validarfecha(fecha_detraccion) {

      if (fecha_detraccion == null || fecha_detraccion == '') {
        return false;
      }

      var fechaf = fecha_detraccion.split("/");
      var d = fechaf[0];
      var m = fechaf[1];
      var y = fechaf[2];
      return m > 0 && m < 13 && y > 0 && y < 32768 && d > 0 && d <= (new Date(y, m, 0)).getDate();
    }

    function validateAdvanceHV(country, licenses) {
      var result = false;
      var feature_hv = {
        'CO': 1107,
        'CL': 1108
      }
      if (country && feature_hv[country] && library.getAuthorization(feature_hv[country], licenses)) {
        result = true;
      }

      return result;
    }

    return {
      pageInit: pageInit,
      fieldChanged: fieldChanged,
      validateField: validateField,
      validateLine: validateLine,
      saveRecord: saveRecord
    };

  });
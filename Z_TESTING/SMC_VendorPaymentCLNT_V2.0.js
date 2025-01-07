/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_VendorPaymentCLNT_V2.0.js                   ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Set 22 2017  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/https', 'N/search', 'N/format', 'N/currentRecord', 'N/url', 'N/runtime',
  './Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_Val_TransactionLBRY_V2.0',
  './Latam_Library/LMRY_AlertTraductorPurchase_LBRY_V2.0', './Latam_Library/LMRY_WebService_LBRY_v2.0.js'
],

  function (log, record, https, search, format, currentRecord, url, runtime, library, library2, libAlert, LR_webService) {
    //Declaracion de Variables
    var scriptObj = runtime.getCurrentScript();
    var LMRY_script = 'LatamReady - Vendor Payment CLNT V2.0';
    var recordObj = '';
    var Val_Campos = new Array();
    var valorporcA = 0;
    var WTHoldingA = 0;
    var valorporcB = 0;
    var WTHoldingB = 0;
    var valorporc = '';
    var auxiliarTieneDosTasas = '';
    var Language = '';
    var LMRY_countr = new Array();
    var LMRY_access = false;
    var mode_type = '';
    var cadena = '';
    var licenses = [];

    var featuresubs = runtime.isFeatureInEffect({
      feature: 'SUBSIDIARIES'
    });

    /**
     * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
     * @appliedtorecord recordType
     *
     * @param {String} type Access mode: create, copy, edit
     * @returns {Void}
     */
    function pageInit(context) {
      try {

        /************************************* MODIFICACIÓN ****************************************************+
           - Fecha: 08/06/2020
           - Descripción: Bloqueo de campo Entity, en caso se cree la transacción desde otra
        ********************************************************************************************************/

        var bill = window.location.href.split('?')[1];

        if (bill != null && bill !== undefined) {
          var pos = bill.indexOf('bill=');
          if (pos !== -1) {
            var final = bill.indexOf('&', pos);
            if (final !== -1) {
              cadena = bill.substring(pos, final);
            }
          }
        }

        // ********************************************FIN MODIFICACIÓN *****************************************

        Language = scriptObj.getParameter({
          name: 'LANGUAGE'
        });
        Language = Language.substring(0, 2);
        recordObj = context.currentRecord;
        var subsidiary = recordObj.getValue({
          fieldId: 'subsidiary'
        });
        mode_type = context.mode;

        licenses = library.getLicenses(subsidiary);

        // Valida el Acceso
        ValidAccessVP(subsidiary, recordObj, licenses);

        if (context.mode == 'create') {
          var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
          if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
            lmry_exchange_rate_field.isDisplay = false;
        }
          var lmry_basecurrency = recordObj.getField('custpage_lmry_basecurrency');
          if (lmry_basecurrency != null && lmry_basecurrency != '') {
            lmry_basecurrency.isDisplay = false;
        }

          if (recordObj.getValue('entity') != '' && recordObj.getValue('entity') != null) {
            ws_exchange_rate();
          }
        }

        if (context.mode == 'create' || context.mode == 'copy') {
          // Transferencia de IVA MX
          recordObj.setValue({
            fieldId: 'custbody_lmry_schedule_transfer_of_iva',
            value: ''
          });
        }

        if (LMRY_countr[0] == 'MX') {
          if (context.mode == 'create' || context.mode == 'copy' || context.mode == 'edit') {
            var fieldIVA = recordObj.getField({
              fieldId: 'custbody_lmry_schedule_transfer_of_iva'
            });

            if (fieldIVA != '' && fieldIVA != null) {
              fieldIVA.isDisabled = true;
            }
          }
        }

        var al_country = recordObj.getValue('custbody_lmry_subsidiary_country');

        recordObj.getField({
          fieldId: 'custbody_lmry_subsidiary_country'
        }).isDisplay = false;

      } catch (err) {
        var recordObj = context.currentRecord;
        library.sendemail2('[pageInit] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }

    }

    /**
     * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
     * @appliedtorecord recordType
     *
     * @returns {Boolean} True to continue save, false to abort save
     */
    function saveRecord(context) {
      try {
        var recordObj = context.currentRecord;

        /* Validacion 04/02/22 */
        var lockedPeriod = recordObj.getValue("custpage_lockedperiod");
        log.error('lockedPeriod', lockedPeriod);
        if (lockedPeriod == true || lockedPeriod == 'T') {
          return true;
        }
        /* Fin validacion 04/02/22 */

        var subsidiary = recordObj.getValue({
          fieldId: 'subsidiary'
        });
        if (Val_Campos.length > 0) {
          if (library2.Val_Mensaje(recordObj, Val_Campos) == false)
            return false;
        }
        // Valida el Acceso
        ValidAccessVP(subsidiary, recordObj, licenses);

        // Solo localizacion Peruana
        if (LMRY_countr[0] == 'PE' && LMRY_access == true) {
          // PE - Comprobantes de Retencion
          if (library.getAuthorization(8, licenses)) {
            // Solo para cuandp es Nuevo el Pago
            if (recordObj.id == '' || recordObj.id == null) {
              //VALIDACION SOLO PARA FACTURAS POR CREAR
              var fechaPago = recordObj.getValue({
                fieldId: 'trandate'
              });
              var fechaInicioRetencion = '01/02/2015';
              //alert(fechaPago+' :::: '+ nlapiStringToDate(fechaInicioRetencion, 'date') +' :::: '+ nlapiStringToDate(fechaPago, 'date') +' :::: '+ (nlapiStringToDate(fechaInicioRetencion, 'date') > nlapiStringToDate(fechaPago, 'date')));

              var parseFechaIniRet = format.parse({
                value: fechaInicioRetencion,
                type: format.Type.DATE
              });
              var parseFechaPago = format.parse({
                value: fechaPago,
                type: format.Type.DATE
              });
              if (parseFechaIniRet > parseFechaPago) {
                //VALIDANDO QUE ENTRE EN VIGENCIA LA RETENCION
                return true;
              }

              /* ********************************************************
               * 27/04/2020 Validacion para identificar si es Proveedor
               * para realizar el flujo de Comprobante de Retenciones :
               *
               *    + Latam - Retention Agent?
               *    + Latam - Is a good Taxpayer?
               *    + Latam - Perception Agent?
               *    + Latam Entity - Subsidiary Country
               *
               * Valida si es Proveedor
               ******************************************************* */
              var proveedor = recordObj.getValue({
                fieldId: 'entity'
              });
              var Entity_Type = search.lookupFields({
                type: 'entity',
                id: proveedor,
                columns: ['type']
              });
              if (Entity_Type.type[0].value != 'Vendor') {
                return true;
              }
              // Obtienes datos de la ficha del Proveedor
              var datosproveedor = search.lookupFields({
                type: 'vendor',
                id: proveedor,
                columns: ['custentity_lmry_es_agente_retencion', 'custentity_lmry_es_buen_contribuyente',
                  'custentity_lmry_es_agente_percepcion', 'custentity_lmry_subsidiary_country'
                ]
              });
              // Valida si hay informacion
              if (datosproveedor == null || datosproveedor == '') {
                return true;
              }
              var esAgenteRetencion = datosproveedor.custentity_lmry_es_agente_retencion[0].value;
              var esBuenContribuyente = datosproveedor.custentity_lmry_es_buen_contribuyente[0].value;
              var esAgentePercepcion = datosproveedor.custentity_lmry_es_agente_percepcion[0].value;
              var countryVendor = datosproveedor.custentity_lmry_subsidiary_country[0].text;
              countryVendor = countryVendor.substring(0, 2);
              countryVendor = countryVendor.toUpperCase();

              var tipoCambio = recordObj.getValue({
                fieldId: 'exchangerate'
              });
              /*var montoTotal = parseFloat(recordObj.getValue({
                fieldId: 'total'
              })) * parseFloat(tipoCambio);*/
              var montoTotal = parseFloat(recordObj.getValue({
                fieldId: 'total'
              }));

              //alert(esAgenteRetencion + '-' + esBuenContribuyente + '-' + montoTotal)
              if (esAgenteRetencion != 1 && esAgentePercepcion != 1 && esBuenContribuyente != 1 &&
                (countryVendor == 'PE' || countryVendor == '' || countryVendor == null)) {
                //QUITANDO VALORES DE RETENCION A LAS TRANSACCIONES APLICADAS
                buscaImpuestos();
                var cantAplic = recordObj.getLineCount({
                  sublistId: 'apply'
                });
                var cantAplicadosPago = 0;
                //VALIDANDO CANTIDAD DE TRANSACCIONES A CANCELAR
                for (var cuentaAplicados = 0; cuentaAplicados < cantAplic; cuentaAplicados++) {
                  //nlapiLogExecution('ERROR', 'INGRESA LINEA EN EL PAGO', 'INGRESA LINEA EN EL PAGO');
                  if (recordObj.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    line: cuentaAplicados
                  }) == true) {
                    cantAplicadosPago++;
                  }
                }
                //CREANDO VARIABLE QUE INDICA EXISTENCIA DE DETRACCION EN UNA FACTURA
                var tieneDetraccion = false;
                //VALIDACION DE QUE LA FACTURA CUENTA CON DETRACCION
                /*if(parseFloat(nlapiGetFieldValue('custpage_4601_withheld'))>0){
                  tieneDetraccion = true;
                  nlapiSetFieldValue('custbody_lmry_serie_retencion','');
                }*/

                //CURRENCIES FUERA DE ITERACION: BILL PAYMENT Y SUB
                var currency_billpayment = recordObj.getValue({
                  fieldId: 'currency'
                });

                var featuresubs = runtime.isFeatureInEffect({
                  feature: 'SUBSIDIARIES'
                });

                if (featuresubs) {
                  var currency_sub = variable.getValue({
                    fieldId: 'subsidiary'
                  });
                  currency_sub = search.lookupFields({
                    type: 'subsidiary',
                    id: currency_sub,
                    columns: ['currency']
                  });
                  currency_sub = currency_sub.currency[0].value;
                } else {
                  var currency_sub = runtime.getCurrentScript().getParameter({
                    name: 'custscript_lmry_currency'
                  });
                }

                for (var cuentaDocAplicado = 0; cuentaDocAplicado < cantAplic; cuentaDocAplicado++) {
                  //var sumaRetencion = 0;
                  //nlapiLogExecution('ERROR', 'INGRESA LINEA EN EL PAGO', 'INGRESA LINEA EN EL PAGO');
                  if (recordObj.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    line: cuentaDocAplicado
                  }) == true) {
                    var vendorBillIdx = recordObj.getSublistValue({
                      sublistId: 'apply',
                      fieldId: 'internalid',
                      line: cuentaDocAplicado
                    });
                    // CARGAMOS LOS DATOS DE LA TRANSACCION
                    var recSOx = 0;
                    var dataBill = search.lookupFields({
                      type: 'vendorbill',
                      id: vendorBillIdx,
                      columns: ['entity', 'account'],
                    });
                    if (dataBill.entity[0].value != null || dataBill.account[0].value != null) {
                      recSOx = record.load({
                        type: 'vendorbill',
                        id: vendorBillIdx
                      });
                      encontroTransaccion = true;
                    } else {
                      var dataBill = search.lookupFields({
                        type: 'vendorcredit',
                        id: vendorBillIdx,
                        columns: ['entity']
                      });
                      if (dataBill.entity[0].value != null) {
                        recSOx = record.load({
                          type: 'vendorcredit',
                          id: vendorBillIdx
                        });
                        encontroTransaccion = true;
                      } else {
                        var dataBill = search.lookupFields({
                          type: 'expensereport',
                          id: vendorBillIdx,
                          columns: ['entity']
                        });
                        if (dataBill.entity[0].value != null) {
                          recSOx = record.load({
                            type: 'expensereport',
                            id: vendorBillIdx
                          });
                          encontroTransaccion = true;
                        } else {
                          encontroTransaccion = false;
                        }
                      }
                    }
                    if (tieneDetraccion) {
                      recordObj.setValue({
                        fieldId: 'custbody_lmry_serie_retencion',
                        value: ''
                      });
                    }
                    var valorFecha = recSOx.getValue({
                      fieldId: 'trandate'
                    });
                    validaFecha(valorFecha);
                    var cantItemx = recSOx.getLineCount({
                      sublistId: 'item'
                    });
                    var cantExpnx = recSOx.getLineCount({
                      sublistId: 'expense'
                    });

                    /***********************************************************
                     * CustBody Field Name : Latam - Tipo de Documento Fiscal
                     * el cual se valida si se se le aplica retencion
                     **********************************************************/
                    var tipoDocumento = recSOx.getValue({
                      fieldId: 'custbody_lmry_document_type'
                    });
                    var valorRetenido = 0;
                    var montofactura = parseFloat(recSOx.getValue({
                      fieldId: 'usertotal'
                    }));

                    /***********************************************************
                     * CustomRecord Name : LatamReady - PE Retenciones
                     * Se registra los tipos de documentos fiscal a los
                     * que se le genera retencion
                     ***********************************************************/
                    var filters = new Array();
                    filters[0] = search.createFilter({
                      name: 'custrecord_lmry_pe_tipo_doc_fiscal',
                      operator: search.Operator.ANYOF,
                      values: tipoDocumento
                    });
                    filters[1] = search.createFilter({
                      name: 'isinactive',
                      operator: 'is',
                      values: 'F'
                    });
                    var RetencionesTL = search.create({
                      type: 'customrecord_lmry_pe_retenciones',
                      columns: ['internalid', 'custrecord_lmry_pe_moneda_ret', 'custrecord_lmry_pe_retention_base'],
                      filters: filters
                    });
                    var RetencionesTL = RetencionesTL.run().getRange(0, 1000);
                    var exitoRe = false;
                    var currencyRecord = '';
                    var retencionBase = '';
                    if (RetencionesTL != null && RetencionesTL != '') {
                      var longitudRe = RetencionesTL.length;
                      currencyRecord = RetencionesTL[0].getValue('custrecord_lmry_pe_moneda_ret');
                      retencionBase = RetencionesTL[0].getValue('custrecord_lmry_pe_retention_base');
                      if (longitudRe > 0) {
                        exitoRe = true;
                      }
                    }

                    //VALIDACION DE CURRENCIES
                    if (currency_billpayment != currencyRecord) {
                      if (currency_sub == currencyRecord) {
                        retencionBase = parseFloat(retencionBase) / parseFloat(tipoCambio);
                      } else {
                        var featuremulti = runtime.isFeatureInEffect({
                          feature: 'MULTIBOOK'
                        });
                        if (featuremulti) {
                          var c_books = recordObj.getLineCount({
                            sublistId: 'accountingbookdetail'
                          });
                          if (c_books > 0) {
                            for (var books = 0; books < c_books; books++) {
                              if (currencyRecord == recordObj.getSublistValue({
                                sublistId: 'accountingbookdetail',
                                fieldId: 'currency',
                                line: books
                              })) {
                                retencionBase = parseFloat(retencionBase) / parseFloat(recordObj.getSublistValue({
                                  sublistId: 'accountingbookdetail',
                                  fieldId: 'exchangerate',
                                  line: books
                                }));
                              }
                            }
                          }
                        } else {
                          retencionBase = parseFloat(retencionBase) / parseFloat(tipoCambio);
                        }

                      }
                    }

                    //valida si el tipo de documento esta dentro de la tabla "LatamReady - Pe Retenciones"
                    if (exitoRe) {
                      if (montofactura > retencionBase || (montoTotal > retencionBase && montofactura < retencionBase)) {
                        if (recSOx.getValue({
                          fieldId: 'custbody_lmry_concepto_detraccion'
                        }) != 12) {
                          //FACTURA TIENE CONCEPTO DE DETRACCION DISTINTO A 'SIN DETRACCION'
                          tieneDetraccion = true;
                          recordObj.setValue({
                            fieldId: 'custbody_lmry_serie_retencion',
                            value: ''
                          });

                        }
                        if (parseFloat(recSOx.getValue({
                          fieldId: 'taxtotal'
                        })) > 0) {
                          if (tieneDetraccion) {
                            alert(libAlert.getAlert(16, Language, []));
                            return false;
                          }
                          //VALIDANDO CANTIDAD DE FACTURAS APLICADAS
                          if (cantAplicadosPago > 12) {
                            alert(libAlert.getAlert(17, Language, []));
                            return false;
                          }

                          /***********************************************************
                           * CustBody Field Name : Latam - Serie Retención
                           * Validando que debe elegir serie de retencion solo
                           * si la subsidiaria es agente de retencion
                           **********************************************************/
                          var serieRet = recordObj.getValue({
                            fieldId: 'custbody_lmry_serie_retencion'
                          });
                          if (serieRet == null || serieRet == '') {
                            /***********************************************************
                             * Suitelet Name : LatamReady - Get Agente Retencion STLT
                             * Valida si la subsidiaria es agente de retencion
                             ***********************************************************/
                            var urlText = url.resolveScript({
                              scriptId: 'customscript_lmry_get_agente_reten_stlt',
                              deploymentId: 'customdeploy_lmry_get_agente_reten_stlt',
                              returnExternalUrl: false
                            });
                            urlText += '&idSubsidiaria=' + subsidiary;
                            var get = https.get({
                              url: 'https://' + window.location.host + urlText
                            });

                            var EsAgente = get.body;
                            if (EsAgente == 'F' || EsAgente == 'f') {
                              alert(libAlert.getAlert(18, Language, []));
                            }
                            return false;
                          }
                          //VALIDANDO QUE LA FACTURA ESTA AFECTA A IGV
                          if (parseFloat(recSOx.getValue({
                            fieldId: 'taxtotal'
                          })) > 0) {
                            /* ********************************************************
                             * 29/04/2020 Se cambio el cambio de valor para el campo
                             * de columna :
                             *
                             *    + Apply WH Tax? - custcol_4601_witaxapplies
                             *
                             *    Valor : custcol_4601_witaxapplies = 'T'
                             *    Por : custcol_4601_witaxapplies = true
                             *
                             * Campos pertenicientes al bundle : 47459-Withholding Tax
                             *
                             *    + Apply WH Tax?         - custcol_4601_witaxapplies
                             *    + Withholding Tax Code  - custcol_4601_witaxcode
                             *    + Withholding Tax Rate  - custcol_4601_witaxrate
                             *    + Withholding Tax Base Amount - custcol_4601_witaxbaseamount
                             *    + Withholding Tax Amount - custcol_4601_witaxamount
                             ******************************************************* */
                            // Para las lineas de Items
                            for (var a = 0; a < cantItemx; a++) {
                              recSOx.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_4601_witaxapplies',
                                line: a,
                                value: true
                              });
                              recSOx.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_4601_witaxcode',
                                line: a,
                                value: WTHolding
                              }); ///
                              recSOx.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_4601_witaxrate',
                                line: a,
                                value: valorporc
                              });
                              recSOx.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_4601_witaxbaseamount',
                                line: a,
                                value: recSOx.getSublistValue({
                                  sublistId: 'item',
                                  fieldId: 'grossamt',
                                  line: a
                                })
                              });
                              recSOx.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_4601_witaxamount',
                                line: a,
                                value: (valorporc * parseFloat(recSOx.getSublistValue({
                                  sublistId: 'item',
                                  fieldId: 'grossamt',
                                  line: a
                                })) / 100)
                              });
                            }
                            // Para las lineas de Expense
                            for (var b = 0; b < cantExpnx; b++) {
                              recSOx.setSublistValue({
                                sublistId: 'expense',
                                fieldId: 'custcol_4601_witaxapplies',
                                line: b,
                                value: true
                              });
                              recSOx.setSublistValue({
                                sublistId: 'expense',
                                fieldId: 'custcol_4601_witaxcode',
                                line: b,
                                value: WTHolding
                              }); ///
                              recSOx.setSublistValue({
                                sublistId: 'expense',
                                fieldId: 'custcol_4601_witaxrate',
                                line: b,
                                value: valorporc
                              });
                              recSOx.setSublistValue({
                                sublistId: 'expense',
                                fieldId: 'custcol_4601_witaxbaseamount',
                                line: b,
                                value: recSOx.getSublistValue({
                                  sublistId: 'expense',
                                  fieldId: 'grossamt',
                                  line: b
                                })
                              });
                              recSOx.setSublistValue({
                                sublistId: 'expense',
                                fieldId: 'custcol_4601_witaxamount',
                                line: b,
                                value: (valorporc * parseFloat(recSOx.getSublistValue({
                                  sublistId: 'expense',
                                  fieldId: 'grossamt',
                                  line: b
                                })) / 100)
                              });
                            }
                            //nlapiSubmitRecord(recSOx, false, true);
                            var IDAux = recSOx.save();
                          }
                        }
                      }
                    }
                  }
                }
              }
            } else {
              //VALIDACION SOLO PARA FACTURAS POR EDITAR/ELIMINAR
              var filters = new Array();
              filters[0] = search.createFilter({
                name: 'custrecord_lmry_pago_relacionado',
                operator: search.Operator.ANYOF,
                values: recordObj.id
              });
              filters[1] = search.createFilter({
                name: 'isinactive',
                operator: 'is',
                values: 'F'
              });
              var transacdata = search.create({
                type: 'customrecord_lmry_comprobante_retencion',
                columns: ['internalid'],
                filters: filters
              });
              var transacdata = transacdata.run().getRange(0, 1000);
              var longitud = 0;
              if (transacdata != null) {
                longitud = transacdata.length;
              }
              if (longitud > 0) {
                alert(libAlert.getAlert(19, Language, []));
                return false;
              }
            } // Fin - Solo para cuandp es Nuevo el Pago
          } // Fin - PE - Comprobantes de Retencion
        } // Fin - Solo localizacion Peruana

        // Solo para Brasil - Retenciones
        if (LMRY_countr[0] == 'BR') {
          /* *****************************************
           * Title : Seteo del campo :
           * 		  Latam - Amount Advance
           * 		  custbody_lmry_br_amount_advance
           * Date  : 30/04/2021
           * *************************************** */
          // Latam - Amount Advance
          recordObj.setValue({
            fieldId: 'custbody_lmry_br_amount_advance',
            value: '1'
          });
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
      } catch (err) {
        var recordObj = context.currentRecord;
        library.sendemail2('[saveRecord] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      } //fin catch
      return true;
    }

    /**
     * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
     * @appliedtorecord recordType
     *
     * @param {String} type Sublist internal id
     * @param {String} name Field internal id
     * @param {Number} linenum Optional line item number, starts from 1
     * @returns {Boolean} True to continue changing field value, false to abort value change
     */
    function validateField(context) {
      try {
        var name = context.fieldId;
        var recordObj = context.currentRecord;
        var subsidiaria = recordObj.getValue({
          fieldId: 'subsidiary'
        });
        if (name == 'subsidiary') {
          // Valida el Acceso
          ValidAccessVP(subsidiaria, recordObj, licenses);

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
          }) + '&period=' + period + '&subsidiary=' + subsidiary + '&country=' + LMRY_countr[0] + '&typetran=purchase';

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

      } catch (err) {
        var recordObj = context.currentRecord;
        library.sendemail2('[validateField] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }


      return true;
    }


    /* ------------------------------------------------------------------------------------------------------
     * Localizacion Peruana
     * --------------------------------------------------------------------------------------------------- */
    function buscaImpuestos() {
      // Inicializa Variable
      valorporcA = 0;
      WTHoldingA = 0;
      valorporcB = 0;
      WTHoldingB = 0;


      // Realiza busqueda
      var filtrosImpuestos = new Array();
      filtrosImpuestos[0] = search.createFilter({
        name: 'custrecord_4601_wtc_description',
        operator: search.Operator.CONTAINS,
        values: 'Retencion del IGV'
      });
      filtrosImpuestos[1] = search.createFilter({
        name: 'isinactive',
        operator: 'is',
        values: 'F'
      });
      var transacdataImpuestos = search.create({
        type: 'customrecord_4601_witaxcode',
        columns: ['custrecord_4601_wtc_effectivefrom', 'custrecord_4601_wtc_rate', 'internalid'],
        filters: filtrosImpuestos
      })
      var transacdataImpuestos = transacdataImpuestos.run().getRange(0, 1000);
      if (transacdataImpuestos != null && transacdataImpuestos.length > 0) {

        for (var cuentaImpuesto = 0; cuentaImpuesto < transacdataImpuestos.length; cuentaImpuesto++) {
          fechaObtenida = transacdataImpuestos[cuentaImpuesto].getValue('custrecord_4601_wtc_effectivefrom');
          //if (fechaObtenida != '' && fechaObtenida != null) {
          valorporcB = transacdataImpuestos[cuentaImpuesto].getValue('custrecord_4601_wtc_rate');
          WTHoldingB = transacdataImpuestos[cuentaImpuesto].getValue('internalid');
          //} else {
          valorporcA = transacdataImpuestos[cuentaImpuesto].getValue('custrecord_4601_wtc_rate');
          WTHoldingA = transacdataImpuestos[cuentaImpuesto].getValue('internalid');
          //}
        }
      }

    }

    function validaFecha(valorFecha) {
      var parseValorFecha = '';
      var parseFechaObtenida = '';
      if (fechaObtenida != null && fechaObtenida != '') {
        parseFechaObtenida = format.parse({
          value: fechaObtenida,
          type: format.Type.DATE
        });
      }

      if (valorFecha != null && valorFecha != '') {
        parseValorFecha = format.parse({
          value: valorFecha,
          type: format.Type.DATE
        });
      }

      if (valorFecha != null && valorFecha != '' && fechaObtenida != null && fechaObtenida != '') {
        if (parseValorFecha < parseFechaObtenida) {
          valorporc = valorporcA + '';
          valorporc = valorporc.split('%')[0];
          WTHolding = WTHoldingA;
          auxiliarTieneDosTasas = '1' + auxiliarTieneDosTasas.substring(1, 2);
        } else {

          valorporc = valorporcB;
          valorporc = valorporc.split('%')[0];
          WTHolding = WTHoldingB;
          auxiliarTieneDosTasas = auxiliarTieneDosTasas.substring(0, 1) + '1';
        }
      } else {
        valorporc = valorporcB;
        valorporc = valorporc.split('%')[0];
        WTHolding = WTHoldingB;
        auxiliarTieneDosTasas = auxiliarTieneDosTasas.substring(0, 1) + '1';
      }

    }

    /* ------------------------------------------------------------------------------------------------------
     * A la variable featureId se le asigna el valore que le corresponde
     * --------------------------------------------------------------------------------------------------- */
    function ValidAccessVP(ID, recordObj, licenses) {
      try {
        // Oculta todos los campos LMRY
        library.onFieldsHide([2], recordObj, false);

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

        // Solo si tiene acceso
        Val_Campos = '';
        if (LMRY_access == true) {
          library.onFieldsDisplayBody(recordObj, LMRY_countr[1], 'custrecord_lmry_on_bill_payment', false);
          Val_Campos = library2.Val_Authorization(recordObj, LMRY_countr[0], licenses);

          if (LMRY_countr[0] == 'PE') {
            /***********************************************************
             * Suitelet Name : LatamReady - Get Agente Retencion STLT
             * Valida si la subsidiaria es agente de retencion
             ***********************************************************/
            var urlText = url.resolveScript({
              scriptId: 'customscript_lmry_get_agente_reten_stlt',
              deploymentId: 'customdeploy_lmry_get_agente_reten_stlt',
              returnExternalUrl: false
            });
            urlText += '&idSubsidiaria=' + ID;
            var get = https.get({
              url: 'https://' + window.location.host + urlText
            });

            var EsAgente = get.body;
            if (EsAgente == 'F' || EsAgente == 'f') {
              // Oculta el campo
              var Field = recordObj.getField({
                fieldId: 'custbody_lmry_serie_retencion'
              });
              if (Field != null && Field != '') {
                Field.isDisplay = false;
              }
            }
          }
        }
      } catch (err) {
        library.sendemail2('[ ValidAccessVP ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }

      return true;
    }

    function fieldChanged(context) {
      var recordObj = context.currentRecord;
      var name = context.fieldId;

      try {

        if (name == 'currency' && mode_type == 'create') {

          var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
          if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
            ws_exchange_rate();
          }
          return true;
        }

        if (name == 'custpage_lmry_exchange_rate' && mode_type == 'create') {

          var lmry_exchange_rate = recordObj.getValue('custpage_lmry_exchange_rate');
          if (lmry_exchange_rate != ' ' && lmry_exchange_rate != '' && lmry_exchange_rate != null) {
            recordObj.setValue('exchangerate', lmry_exchange_rate);
          }
          return true;
        }

        if (name == 'trandate' && mode_type == 'create') {
          if (recordObj.getValue('entity') != '' && recordObj.getValue('entity') != null) {
            ws_exchange_rate();
          }
          return true;
        }

        if (featuresubs == 'T' || featuresubs == true) {
          if (name == 'subsidiary' && mode_type == 'create') {
            var cf = recordObj.getValue('customform');
            var sub = recordObj.getValue('subsidiary');
            var ent = recordObj.getValue('entity');

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

        recordObj = currentRecord.get();

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
                if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
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
                if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
                  lmry_exchange_rate_field.isDisplay = true;
              }
                result_ws_exchange_rate(codeCountry[codeCurrency], 2);

              } else {
                var lmry_exchange_rate_field = recordObj.getField('custpage_lmry_exchange_rate');
                if (lmry_exchange_rate_field != null && lmry_exchange_rate_field != '') {
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
      saveRecord: saveRecord,
      validateField: validateField,
    };
  });
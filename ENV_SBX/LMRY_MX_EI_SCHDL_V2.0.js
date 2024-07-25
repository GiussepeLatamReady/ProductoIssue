/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
 ||   This script for customer center (Time)                     ||
 ||                                                              ||
 ||  File Name: LMRY_MX_EI_SCHDL_V2.0.js                         ||
 ||                                                              ||
 ||  Version Date         Author        Remarks                  ||
 ||  2.0     Oct 29 2018  LatamReady    Use Script 2.0           ||
  \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
  define(["N/xml", "N/record", "N/runtime", "N/file", "N/email", "N/search", "N/format", "N/log", "N/config", "N/encode", "N/transaction", "N/task", '/SuiteBundles/Bundle 245636/EI_Library/LMRY_AnulacionInvoice_LBRY_V2.0', 'SuiteBundles/Bundle 245636/EI_Library/LMRY_EI_libSendingEmailsLBRY_V2.0', '/SuiteBundles/Bundle 245636/EI_Send_Email_Module/LMRY_Transaction_Message_LBRY_V2.0.js'],
  function(xml, record, runtime, file, email, search, format, log, config, encode, transaction, task, library_AnulacionInvoice, ei_library, message_lbry) {

      var exito = false;
      var nInternalid = '';
      var typeTrans = '';
      var TipoDoc = '';
      var status_doc = '';
      var tranID = '';
      var nameTypeDoc = '';
      var estatus = '';
      var flag = true;
      var codModificacion = '';
      var folioFiscalRef = '';

      var mensajeError = '';
      var scriptObj = '';
      var idcontenido = new Array();
      var initialConuntry = '';
      var latamidprint1 = '';
      var latamidprint2 = '';
      var latamidprint3 = '';
      var latamidprint4 = '';
      var subsiTransactext = '';
      var xmlCancelacion = '';
      /* Parametros de acceso */
      var HOST = '';
      var SEND_TYPE = '';
      var USER = '';
      var PASSWORD = '';
      var PDF = '';
      var FORMATO_FECHA = '';
      var SEND_EMAIL_CANCEL = '';
      var TransaccionId = '';
      var PDF = '';
      var EMAIL_SUBSI = '';
      var EmailDest = new Array();

      var serie = '';
      var folio = '';
      var IdDiseño = '';
      var rec_subsi = '';
      var codDoc = '';

      var subsi = false;

      var userId = '';
      var nameUser = '';
      var emailUser = '';
      var estadoSF = '';
      var uuid = '';
      var flagTiempo = true;
      var authCode = '';
      var nombreWS = '';
      var flagServicio = true;
      var flagServProc = false;
      var internalIDDs = '';

      //   Licencias
      var licencias_mx = []

      //FEATURES
      //   var FEATURE_SENDCUSTOMER = 'EI_SENDCUSTOMER_MASSIVE';

      //RECORDS
      var REC_LOG_DOC = 'customrecord_lmry_ei_log_docs';
      var REC_DOC_STATUS = 'customrecord_lmry_ei_docs_status';
      var REC_PRINT_PDF = 'customrecord_lmry_printing_pdf_xml';
      var REC_ENABLE_FEAT = 'customrecord_lmry_mx_fel_enable_feature';
      //SEARCHS
      var SRC_TX_PEND_CANC = 'customsearch_lmry_mx_tx_acept_einvoice';

      function execute(context) {
          try {

              log.error("INICIO", "INICIO");

              scriptObj = runtime.getCurrentScript();
              subsi = runtime.isFeatureInEffect({
                  feature: "SUBSIDIARIES"
              });
              userId = scriptObj.getParameter({
                  name: 'custscript_lmry_mx_email_emp_einvoice'
              });
              log.error("userId", userId);
              arrayTransacciones = scriptObj.getParameter({
                  name: 'custscript_lmry_mx_transacciones'
              });
              var p_subsidiaria = scriptObj.getParameter({
                  name: 'custscript_lmry_mx_subsi'
              });

              var rechazar_cancelacion = scriptObj.getParameter({
                  name: 'custscript_lmry_mx_rechazar_cancelacion'
              });
              log.error("Rechazar Cancelacion", rechazar_cancelacion);
              if (userId == '' || userId == null) {
                  myError.prototype = Object.create(Error.prototype);
                  myError.prototype.constructor = myError;
                  throw new myError("Debe tener asignado un empleado en 'LATAM - MX EMAIL EMPLOYEE E-INVOICE' de GENERAL PREFERENCE.");
              }
              recEmp = search.lookupFields({
                  type: search.Type.EMPLOYEE,
                  id: userId,
                  columns: ['firstname', 'email']
              });
              nameUser = recEmp.firstname;
              emailUser = recEmp.email;

              log.error("nameUser", nameUser);
              log.error("emailUser", emailUser);
              if (emailUser == '' || emailUser == null) {
                  myError.prototype = Object.create(Error.prototype);
                  myError.prototype.constructor = myError;
                  throw new myError("El empleado asignado en 'General Preference' no tiene un email.");
              }

              if (p_subsidiaria) {
                  rec_subsi = p_subsidiaria;
                  getEnableFeatures();
                  if (!flag) {
                      myError.prototype = Object.create(Error.prototype);
                      myError.prototype.constructor = myError;
                      throw new myError("En 'Facturación Electrónica Mexico - Enable Features' no se llenó 'LATAM - MX HOST'.");
                  }
                  if (SEND_TYPE == null || SEND_TYPE == '' || USER == null || USER == '' || PASSWORD == null || PASSWORD == '' || FORMATO_FECHA == null || FORMATO_FECHA == '') {
                      myError.prototype = Object.create(Error.prototype);
                      myError.prototype.constructor = myError;
                      throw new myError("En 'Facturación Electrónica Mexico - Enable Features' no se llenó 'LATAM - MX SENT TYPE' o 'LATAM - MX USER' o 'LATAM - MX PASSWORD' o 'LATAM - MX DATE FORMAT'.");
                  }
              }

              /* BUSQUEDA LatamReady - MX Transacciones E-Invoice */
              var busqPendCanc = search.load({
                  id: SRC_TX_PEND_CANC
              });

              if (subsi) {
                  filterInactive = search.createFilter({
                      name: 'formulatext',
                      formula: '{subsidiary.isinactive}',
                      operator: 'is',
                      values: 'F'
                  });
                  busqPendCanc.filters.push(filterInactive);
              }
              if (arrayTransacciones) {
                  var aux_arrayTransacciones = arrayTransacciones.match(/\b\d*\b/g);
                  arrayTransacciones = [];
                  if (aux_arrayTransacciones) {
                      for (i = 0; i < aux_arrayTransacciones.length; i++) {
                          if (aux_arrayTransacciones[i]) arrayTransacciones.push(aux_arrayTransacciones[i]);
                      }
                  }
                  log.error('Transacciones', arrayTransacciones);

                  filterArrayTransacciones = search.createFilter({
                      name: 'internalid',
                      operator: 'anyof',
                      values: arrayTransacciones
                  })
                  busqPendCanc.filters.push(filterArrayTransacciones);
              }

              var range_init = 0;
              var range_max = 1000;
              var busquedaTransaccionesStop = false;
              var contTransacciones = 0;
              var resultPendCanc = busqPendCanc.run().getRange(range_init, range_max);

              while (!busquedaTransaccionesStop) {

                  if (resultPendCanc != null) {

                      for (var i = 0; i < resultPendCanc.length; i++) {
                          // Bucle inicio
                          log.error('Remaining Usage', scriptObj.getRemainingUsage());
                          flagTiempo = true;
                          flagServicio = true;
                          flagServProc = false;
                          xmlCancelacion = '';
                          if (scriptObj.getRemainingUsage() <= 500) {
                              busquedaTransaccionesStop = true;

                              var transaccionesRestantes = {};
                              transaccionesRestantes['custscript_lmry_mx_transacciones'] = arrayTransacciones;
                              if (p_subsidiaria) transaccionesRestantes['custscript_lmry_mx_subsi'] = p_subsidiaria;

                              // Si el uso de memoria se excede, se detiene la ejecucion de este script y se vuelve a llamar este mismo script para que procese las transacciones restantes
                              var mrTask = task.create({
                                  taskType: task.TaskType.SCHEDULED_SCRIPT,
                                  scriptId: 'customscript_lmry_mx_ei_pen_cancel_schdl',
                                  deploymentId: 'customdeploy_lmry_mx_ei_pen_cancel_schdl',
                                  params: transaccionesRestantes
                              });
                              log.error('Memoria insuficiente', 'Rellamando al SCHDL');
                              mrTask.submit();
                              break;
                          }

                          log.error("# Transaccion", contTransacciones);
                          exito = false;

                          var col = resultPendCanc[i].columns;

                          nInternalid = resultPendCanc[i].getValue(col[0]);
                          typeTrans = resultPendCanc[i].getValue(col[1]);
                          nameTypeDoc = resultPendCanc[i].getValue(col[2]);
                          serie = resultPendCanc[i].getValue(col[3]);
                          folio = resultPendCanc[i].getValue(col[4]);
                          estadoSF = resultPendCanc[i].getValue(col[5]);
                          IdDiseño = resultPendCanc[i].getValue(col[6]);
                          if (IdDiseño == '- None -')  IdDiseño = '';
                          codDoc = resultPendCanc[i].getValue(col[7]);
                          tranID = "" + serie + folio;

                          var tipoDocum;
                          codModificacion = resultPendCanc[i].getValue(col[8]);
                          if (codModificacion == '- None -')  codModificacion = '';
                          log.error("transaccion codModificacion", codModificacion);
                          if (['FA', 'NC'].indexOf(codDoc) != -1) {
                              tipoDocum = record.Type.INVOICE;
                          } else if (['NA'].indexOf(codDoc) != -1) {
                              tipoDocum = record.Type.CREDIT_MEMO;
                          } else if (['PA'].indexOf(codDoc) != -1) {
                              if (typeTrans == 'Complemento de Pago') {
                                  tipoDocum = 'customtransaction_lmry_payment_complemnt';
                                  //Modificando Ronald
                                  var cod_modification = search.create({
                                      type: 'customrecord_lmry_complem_paymnt_fields',
                                      columns: ['custrecord_lmry_pycomp_modification_reas.custrecord_lmry_cod_modification_reason'],
                                      filters: [
                                          ['custrecord_lmry_related_complmnt_paym', 'anyof', nInternalid]

                                      ]
                                  });
                                  var result1 = cod_modification.run().getRange(0, 1000);
                                  if (result1 != null && result1.length != 0) {
                                      row = result1[0].columns;
                                      codModificacion = result1[0].getValue(row[0]);

                                  }
                                  //Fin Modificacion
                              } else {
                                  if (typeTrans == 'Customer Deposit' || typeTrans == 'Depósito do cliente' || typeTrans == 'Depósito de cliente') {
                                      tipoDocum = record.Type.CUSTOMER_DEPOSIT;
                                  } else {
                                      tipoDocum = record.Type.CUSTOMER_PAYMENT;
                                  }
                              }
                          } else if (['T'].indexOf(codDoc) != -1) {
                              tipoDocum = record.Type.ITEM_FULFILLMENT;
                          }
                          log.error("TipoDoc", tipoDocum);

                          try{
                            var rec = record.load({
                                type: tipoDocum,
                                id: nInternalid
                            });
                          }catch(e){
                            log.error('Error en carga de transacción InternalID', nInternalid);
                            continue;
                          }
                          
                          uuid = rec.getValue('custbody_lmry_foliofiscal');
                          log.error('uuid', uuid);
                          log.error("Cod Modif", codModificacion);
                          if (codModificacion != '02' && codModificacion != '03') {
                              folioFiscalRef = rec.getValue('custbody_lmry_foliofiscal_doc_ref');

                          } else {
                              folioFiscalRef = '';

                          }
                          log.error("Folio Fiscal Ref", folioFiscalRef);
                          rec_subsi = rec.getValue('subsidiary');
                          licencias_mx = ei_library.getLicenses(rec_subsi)

                          if (subsi) {
                              subsiTransactext = rec.getText('subsidiary');
                              var recsubsi = search.lookupFields({
                                  type: search.Type.SUBSIDIARY,
                                  id: rec_subsi,
                                  columns: ['country']
                              });

                              initialConuntry = recsubsi.country[0].value;
                          } else {

                              var configCompany = config.load({
                                  type: config.Type.COMPANY_INFORMATION
                              });

                              initialConuntry = configCompany.getValue('country');
                          }

                          if (!p_subsidiaria) {
                              getEnableFeatures();
                              if (!flag) {
                                  myError.prototype = Object.create(Error.prototype);
                                  myError.prototype.constructor = myError;
                                  throw new myError("En 'Facturación Electrónica Mexico - Enable Features' no se llenó 'LATAM - MX HOST'.");
                              }
                              if (SEND_TYPE == null || SEND_TYPE == '' || USER == null || USER == '' || PASSWORD == null || PASSWORD == '' || FORMATO_FECHA == null || FORMATO_FECHA == '') {
                                  myError.prototype = Object.create(Error.prototype);
                                  myError.prototype.constructor = myError;
                                  throw new myError("En 'Facturación Electrónica Mexico - Enable Features' no se llenó 'LATAM - MX SENT TYPE' o 'LATAM - MX USER' o 'LATAM - MX PASSWORD' o 'LATAM - MX DATE FORMAT'.");
                              }
                          }
                          log.error('USER - PASSWORD - folio - serie - estadoSF', USER + ' - ' + PASSWORD + ' - ' + serie + ' - ' + folio + ' - ' + estadoSF);
                          // Logica para Actualizar Estado en caso que una Factura haya sido Rechazada
                          if (rechazar_cancelacion == 'true') {
                              var returnObtenerDatos = WSObtenerDatos();
                              if (!flagTiempo) {
                                  log.error('entra a la validacion del tiempo excedido.');
                                  myError.prototype = Object.create(Error.prototype);
                                  myError.prototype.constructor = myError;
                                  throw new myError(mensajeError);
                              }
                              validacionServicioWS(nombreWS);
                              if (!flagServicio) {
                                  log.error('entra a la validacion de WS si el servicio no está activo.');
                                  myError.prototype = Object.create(Error.prototype);
                                  myError.prototype.constructor = myError;
                                  throw new myError(mensajeError);
                              }
                              if (returnObtenerDatos == 'false') {
                                  logError(status_doc, estatus, mensajeError);
                                  logStatus(status_doc);
                                  var parametros = {};
                                  parametros['custbody_lmry_pe_estado_sf'] = status_doc.toString().substring(0, 300);

                                  var otherId = record.submitFields({
                                      type: tipoDocum,
                                      id: nInternalid,
                                      values: parametros,
                                      options: {
                                          ignoreMandatoryFields: true,
                                          enableSourcing: true,
                                          disableTriggers: true
                                      }
                                  });
                              }

                              return;
                          }
                          log.error("Continua", "Continua");
                          if (estadoSF == 'Cancelando') {
                              var returnCancelar = WSCancelarXML();
                              if (!flagTiempo) {
                                  log.error('entra a la validacion del tiempo excedido.');
                                  myError.prototype = Object.create(Error.prototype);
                                  myError.prototype.constructor = myError;
                                  throw new myError(mensajeError);
                              }
                              validacionServicioWS(nombreWS);
                              if (!flagServicio) {
                                  log.error('entra a la validacion de WS si el servicio no está activo.');
                                  myError.prototype = Object.create(Error.prototype);
                                  myError.prototype.constructor = myError;
                                  throw new myError(mensajeError);
                              }
                          }

                          sleep(5000);
                          if (status_doc == 'Cancelado') {
                              if (returnCancelar != null && returnCancelar != '') {
                                  xmlCancelacion = returnCancelar.split('<acuseSAT>')[1];
                                  if (xmlCancelacion!= null && xmlCancelacion!= '') {
                                    xmlCancelacion = xmlCancelacion.split('</acuseSAT>')[0];
                                    xmlCancelacion = DeCodificarXML(xmlCancelacion);
                                  }
                              }
                          }

                          log.error('IdDiseño', IdDiseño);
                          var returnConsultaCFE = WSConsultaCFE();
                          if (estadoSF == 'Cancelando') {
                              if (flagServProc == true) {
                                  log.error('entra a la validacion de WS si el servicio no está activo.');
                                  mensajeError += '.Error en el consumo de ' + nombreWS + '. El servicio no está disponible o Autenticación Inválida (verifique las credenciales). Verificar PDF en el Portal ' +
                                      'si es que no se ha registrado en la transacción con anterioridad.';
                              }
                          } else if (estadoSF == 'Procesando') {
                              if (!flagTiempo) {
                                  log.error('entra a la validacion del tiempo excedido.');
                                  myError.prototype = Object.create(Error.prototype);
                                  myError.prototype.constructor = myError;
                                  throw new myError(mensajeError);
                              }
                              validacionServicioWS(nombreWS);
                              if (!flagServicio) {
                                  log.error('entra a la validacion de WS si el servicio no está activo.');
                                  myError.prototype = Object.create(Error.prototype);
                                  myError.prototype.constructor = myError;
                                  throw new myError(mensajeError);
                              }
                          }
                          log.error("returnConsultaCFE:", returnConsultaCFE);
                          var returnDescargarXML = "";
                          if (exito) {
                              var descargarXML = WSDescargarXML();
                              if (returnConsultaCFE != null && returnConsultaCFE != '') {
                                  if (!flagTiempo) {
                                      log.error('entra a la validacion del tiempo excedido.');
                                      myError.prototype = Object.create(Error.prototype);
                                      myError.prototype.constructor = myError;
                                      throw new myError(mensajeError);
                                  }
                                  validacionServicioWS(nombreWS);
                                  if (!flagServicio) {
                                      log.error('entra a la validacion de WS si el servicio no está activo.');
                                      myError.prototype = Object.create(Error.prototype);
                                      myError.prototype.constructor = myError;
                                      throw new myError(mensajeError);
                                  }
                              }
                              returnDescargarXML = DeCodificarXML(descargarXML);
                              if (uuid == null || uuid == '') {
                                  var xml_doc = xml.Parser.fromString({
                                      text: returnDescargarXML
                                  })
                                  var xml_TimbreFiscalDigital = xml_doc.getElementsByTagName('tfd:TimbreFiscalDigital')
                                  uuid = xml_TimbreFiscalDigital[0].getAttribute('UUID');
                                  log.error('uuid FINAL', uuid);
                              }

                          }

                          logError(status_doc, estatus, mensajeError);
                          logStatus(status_doc);

                          log.error('Status 1:', status_doc.toString().substring(0, 300));
                          var parametros = {};
                          if (uuid != null && uuid != '') {
                              parametros['custbody_lmry_foliofiscal'] = uuid;
                          }
                          parametros['custbody_lmry_pe_estado_sf'] = status_doc.toString().substring(0, 300);

                          try{
                            var otherId = record.submitFields({
                                type: tipoDocum,
                                id: nInternalid,
                                values: parametros,
                                options: {
                                    ignoreMandatoryFields: true,
                                    enableSourcing: true,
                                    disableTriggers: true
                                }
                            });
                          }catch(e){
                            log.error('Error en submitFields ', nInternalid);
                          }

                          if (exito) {
                              search_folder();
                          }

                          sendMail('', returnCancelar, returnDescargarXML, returnConsultaCFE, PDF);

                          /* ************** Codigo para el FileCabinet ************* */
                          if (exito) {

                              busqeiprint = search.create({
                                  type: REC_PRINT_PDF,
                                  columns: ['custrecord_lmry_document_transaction', 'custrecord_lmry_printing_subsidiary', 'custrecord_lmry_print_pdf', 'custrecord_lmry_print_xml'],
                                  filters: [
                                      ['custrecord_lmry_document_transaction', 'anyof', nInternalid]
                                  ]
                              });
                              resultprint = busqeiprint.run().getRange(0, 100);

                              var recordprint;
                              if (resultprint == null || resultprint.length == 0) {
                                  recordprint = record.create({
                                      type: REC_PRINT_PDF
                                  });
                                  recordprint.setValue('custrecord_lmry_document_transaction', nInternalid);
                                  recordprint.setValue('custrecord_lmry_printing_subsidiary', rec_subsi);
                              } else {
                                  recordprint = record.load({
                                      type: REC_PRINT_PDF,
                                      id: resultprint[0].id
                                  });
                              }

                              var output = '';
                              require(['N/url'],
                                  function(url) {
                                      output = url.resolveScript({
                                          scriptId: 'customscript_lmry_ei_impr_file_cabinet',
                                          deploymentId: 'customdeploy_lmry_ei_impr_file_cabinet',
                                          returnExternalUrl: false,
                                      });
                                  });

                              if (idcontenido[0] != null && idcontenido[0] != '' && idcontenido[0] != 'undefined') {
                                  output1 = output.split('&compid')[0] + '&idcontenido=' + idcontenido[0];
                                  recordprint.setValue('custrecord_lmry_print_response', output1);
                              } else {
                                  recordprint.setValue('custrecord_lmry_print_response', '');
                              }
                              if (idcontenido[1] != null && idcontenido[1] != '' && idcontenido[1] != 'undefined') {
                                  output2 = output.split('&compid')[0] + '&idcontenido=' + idcontenido[1];
                                  recordprint.setValue('custrecord_lmry_print_pdf', output2);
                                  setPDF(idcontenido[1], tipoDocum);
                              } else {
                                  recordprint.setValue('custrecord_lmry_print_pdf', '');
                                  setPDF('', tipoDocum);
                              }
                              if (idcontenido[2] != null && idcontenido[2] != '' && idcontenido[2] != 'undefined') {
                                  output3 = output.split('&compid')[0] + '&idcontenido=' + idcontenido[2];
                                  recordprint.setValue('custrecord_lmry_response_doc', output3);
                              } else {
                                  recordprint.setValue('custrecord_lmry_response_doc', '');
                              }
                              recordprint.save();
                            /************* Guardado de archivos en en Comunnication > Files *************/
                            if (exito && status_doc == 'Generado') {
                                if (idcontenido[1] != null && idcontenido[1] != '' && idcontenido[1] != 'undefined') {
                                    try {
                                        // Agrega PDF 
                                        record.attach({
                                            record: {
                                                type: 'file',
                                                id: idcontenido[1] // id de PRINT PDF
                                            },
                                            to: {
                                                type: tipoDocum,
                                                id: nInternalid
                                            }
                                        });

                                    } catch (error) {
                                        log.error('Error al adjuntar PRINT PDF (amc): ', error);
                                    }
                                }

                                if (idcontenido[0] != null && idcontenido[0] != '' && idcontenido[0] != 'undefined') {
                                    try {
                                        // Agrega Response
                                        record.attach({
                                            record: {
                                                type: 'file',
                                                id: idcontenido[0] // id de PRINT RESPONSE
                                            },
                                            to: {
                                                type: tipoDocum,
                                                id: nInternalid
                                            }
                                        });

                                    } catch (error) {
                                        log.error('Error al adjuntar PRINT RESPONSE (amc): ', error);
                                    }
                                }
                            }
                            /************* FIN *************/
                            //Enviar correo a receptor
                            if (ei_library.getAuthorization("573", licencias_mx)) {
                                
                                if (exito && status_doc == 'Generado') {
                                
                                    try{
                                    var mensaje = message_lbry.SEND_MESSAGE(nInternalid, userId, 'rellamado');                

                                    }catch(e){
                                        log.error('Envio correo a receptor', e);
                                    }    
                                } else if ((status_doc == 'Cancelando'|| status_doc == 'Cancelado') && SEND_EMAIL_CANCEL) {
                                
                                    try{
                                    var mensaje = message_lbry.SEND_MESSAGE(nInternalid, userId, 'rellamado');               

                                    }catch(e){
                                        log.error('Envio correo a receptor', e);
                                    }        
                                }
                            }
                              //Flujo Cancelación por Librería o Estandard
                              if (status_doc == 'Cancelado') {
                                  var void_feature = runtime.getCurrentScript().getParameter({
                                      name: 'REVERSALVOIDING'
                                  });

                                  if (nInternalid != '' && nInternalid != null) {
                                      if (tipoDocum == 'invoice') {
                                          var resp_lbry = library_AnulacionInvoice.anularInvoice(nInternalid);
                                          log.error("salidaLBRY", resp_lbry);

                                          if (resp_lbry.wht) mensajeLBRY = "El invoice tiene retenciones.";
                                          else mensajeLBRY = "El invoice NO tiene retenciones.";
                                          log.error("wht", mensajeLBRY);

                                          if (resp_lbry.standardvoid) mensajeLBRY = "Se anula de forma estandar.";
                                          else mensajeLBRY = "Se anula creando Credit Memo.";
                                          log.error("standardvoid", mensajeLBRY);

                                          if (resp_lbry.idcreditmemo != null) mensajeLBRY = "ID de Credit Memo: " + resp_lbry.idcreditmemo;
                                          else mensajeLBRY = "No hay ID de Credit Memo.";
                                          log.error("idcreditmemo", mensajeLBRY);

                                          if (resp_lbry.closedperiod) mensajeLBRY = "El invoice se encuentra en un periodo cerrado";
                                          else mensajeLBRY = "El invoice NO se encuentra en un periodo cerrado";
                                          log.error("closedperiod", mensajeLBRY);

                                          if (resp_lbry.error) {
                                              mensajeLBRY = "Error " + resp_lbry.error.name + ': ' + resp_lbry.error.message;
                                              log.error('resp_lbry.error', mensajeLBRY)
                                              exito = 'Parcial';
                                              mensajeError = "Legally canceled successfully but not in NetSuite. You must void the transacction manually.";
                                              logError(status_doc, estatus, mensajeError);
                                          }
                                      } else if (void_feature == false || void_feature == 'F') {
                                          log.error("Flujo estandar", "entró");
                                          var transType = '';

                                          if (tipoDocum == 'creditmemo') {
                                              transType = transaction.Type.CREDIT_MEMO;
                                          } else if (tipoDocum == 'customerpayment') {
                                              transType = transaction.Type.CUSTOMER_PAYMENT;
                                          } else if (tipoDocum == 'customerdeposit') {
                                              transType = transaction.Type.CUSTOMER_DEPOSIT;
                                          } else if (tipoDocum == 'customtransaction_lmry_payment_complemnt') {
                                              transType = "customtransaction_lmry_payment_complemnt";
                                          } else if (tipoDocum == 'itemfulfillment') {
                                              transType = transaction.Type.ITEM_FULFILLMENT;
                                          }

                                          log.error('transType', transType);
                                          log.error('nInternalid', nInternalid);

                                          if(codModificacion != '01' && transType == 'customtransaction_lmry_payment_complemnt'){
                                             Remove_Trans(rec, nInternalid, tipoDocum, void_feature);
                                          } else if (transType != '' && tipoDocum != 'itemfulfillment') {
                                              try {
                                                  var voidTransaction = transaction.void({
                                                      type: transType,
                                                      id: nInternalid
                                                  });
                                              } catch (e) {
                                                  exito = 'Parcial';
                                                  mensajeError = "Legally canceled successfully but not in NetSuite. You must void the transacction manually.";
                                                  logError(status_doc, estatus, mensajeError);
                                              }
                                          } else if (tipoDocum == 'itemfulfillment' && transType != '') {
                                              saveCartaPorte(nInternalid, folio);
                                              var recordsaved = record.submitFields({
                                                  type: transType,
                                                  id: nInternalid,
                                                  values: {
                                                      'custbody_lmry_document_type': '',
                                                      'custbody_lmry_foliofiscal': '',
                                                      'custbody_lmry_num_preimpreso': '',
                                                      'custbody_lmry_serie_doc_cxc': '',
                                                      'custbody_lmry_mx_document_design': '',
                                                      'custbody_lmry_via_transp_cl': '',
                                                      'custbody_lmry_mx_tipo_relacion': '',
                                                      'custbody_lmry_mx_uso_cfdi': '',
                                                      'custbody_lmry_pe_estado_sf': '',
                                                      'custbody_lmry_modification_reason': ''
                                                  },
                                                  options: {
                                                      ignoreMandatoryFields: true,
                                                      enableSourcing: true,
                                                      disableTriggers: true
                                                  }
                                              });
                                          }
                                      } else if ((void_feature == true || void_feature == 'T') && tipoDocum == 'itemfulfillment') {
                                          var recordType = '';
                                          recordType = record.Type.ITEM_FULFILLMENT;
                                          saveCartaPorte(nInternalid, folio);
                                          var recordsaved = record.submitFields({
                                              type: recordType,
                                              id: nInternalid,
                                              values: {
                                                  'custbody_lmry_document_type': '',
                                                  'custbody_lmry_foliofiscal': '',
                                                  'custbody_lmry_num_preimpreso': '',
                                                  'custbody_lmry_serie_doc_cxc': '',
                                                  'custbody_lmry_mx_document_design': '',
                                                  'custbody_lmry_via_transp_cl': '',
                                                  'custbody_lmry_mx_tipo_relacion': '',
                                                  'custbody_lmry_mx_uso_cfdi': '',
                                                  'custbody_lmry_pe_estado_sf': '',
                                                  'custbody_lmry_modification_reason': ''
                                              },
                                              options: {
                                                  ignoreMandatoryFields: true,
                                                  enableSourcing: true,
                                                  disableTriggers: true
                                              }
                                          });
                                      } else { 
                                         if (tipoDocum == 'customerpayment' || tipoDocum == 'customtransaction_lmry_payment_complemnt') {
                                             if(codModificacion != '01'){
                                                  Remove_Trans(rec, nInternalid, tipoDocum, void_feature);
                                             }
                                         } else {
                                             exito = 'Parcial';
                                             mensajeError = "Legally canceled successfully but not in NetSuite. You must void the transacction manually.";
                                             logError(status_doc, estatus, mensajeError);
                                         }
                                      }
                                      //PRUEBA ANULACION PARCIAL
                                      log.error('internalIDDs', internalIDDs);
                                      if (exito == 'Parcial') {

                                          var jsonObj = {
                                              voidedType: '1'
                                          };
                                          // log.error('jsonObj', jsonObj);
                                          var docProcStatus = JSON.stringify(jsonObj);
                                          // log.error('docProcStatus', docProcStatus);

                                          record.submitFields({
                                              type: REC_DOC_STATUS,
                                              id: internalIDDs,
                                              values: {
                                                  'custrecord_lmry_ei_ds_doc_proc_status': docProcStatus
                                              },
                                              options: {
                                                  ignoreMandatoryFields: true,
                                                  enableSourcing: true,
                                                  disableTriggers: true
                                              }
                                          });
                                      }
                                      //FIN PRUEBA ANULACION PARCIAL
                                  }
                              }
                          }

                          contTransacciones++;

                      }
                  }
                  if (contTransacciones == range_max) {
                      range_init = range_init + 1000;
                      range_max = range_max + 1000;
                      resultPendCanc = busqPendCanc.run().getRange(range_init, range_max);
                  } else {
                      busquedaTransaccionesStop = true;
                  }
              }

              log.error("FIN", "FIN");


          } catch (e) {
              log.error("Catch", e.valueOf().toString());
          }

      }


      function WSCancelarXML() {
          nombreWS = "WSCancelarXML";

          var URL_WS = "";
          URL_WS = HOST + "/ERPWebServices/soap/CFDI33";

          stringInput =
              '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fac="http://facturacion.erp.solucionfactible.com"> ' +
              '<soapenv:Header/> ' +
              '<soapenv:Body> ' +
              '<fac:cancelar> ' +
              '<usuario>' + USER + '</usuario> ' +
              '<password>' + PASSWORD + '</password> ' +
              '<solicitudesCancelacion> ' +
              '<uuid>|' + codModificacion + '|' + folioFiscalRef + '</uuid>' +
              '<folio>' + folio + '</folio> ' +
              '<serie>' + serie + '</serie> ' +
              '</solicitudesCancelacion> ' +
              '</fac:cancelar> ' +
              '</soapenv:Body> ' +
              '</soapenv:Envelope> ';

          try {
              var objEnvioCFE = '';
              if (SEND_TYPE == '1') {
                  URL_WS = "http://" + URL_WS;
                  require(['N/http'], function(http) {
                      objEnvioCFE =
                          http.post({
                              url: URL_WS,
                              body: stringInput
                          });
                  });
              } else if (SEND_TYPE == '2') {
                  URL_WS = "https://" + URL_WS;
                  require(['N/https'], function(https) {
                      objEnvioCFE =
                          https.post({
                              url: URL_WS,
                              body: stringInput
                          });
                  });
              }

              // //PRUEBA
              // flagTiempo = false;
              // if(!flagTiempo){
              //     mensajeError = "Tiempo Excedido al obtener el estado en la Cancelación (WSCancelarXML). Ejecutar nuevamente el Rellamado para actualizar el estado.";
              //     return flagTiempo;
              // }
              // //FIN PRUEBA

              var returnEnvioCFE = objEnvioCFE.body;
              authCode = objEnvioCFE.code;
              returnEnvioCFE = replaceXML(returnEnvioCFE);

              log.error('returnEnvioCFE', returnEnvioCFE);

              checkStatus(returnEnvioCFE);
          } catch (e) {
              mensajeError = e.valueOf().toString();
              if (mensajeError.indexOf("SSS_REQUEST_TIME_EXCEEDED") != -1) {
                  mensajeError = "Tiempo Excedido al obtener el estado en la Cancelación (WSCancelarXML). Ejecutar nuevamente el Rellamado para actualizar el estado.";
                  flagTiempo = false;
                  return flagTiempo;
              }
          }

          return returnEnvioCFE;

      }

      /*******************************************
       * Chequea el status de la generacion PDF
       *******************************************/
      function checkStatus(xml) {
          // estatus = '';
          estatus = xml.split('estatus>')[1].split('</')[0];
          // estatus = "500";
          log.error('estatus', estatus);
          if (estatus != null && estatus != '') { //SI TIENE DATA
              //if (cfeCadCreacion != "200") {
              if (estatus == "201") {
                  //status_doc = "Rechazado";
                  var cadenaResultados = xml.split('resultados>')[1];
                  if (cadenaResultados != null && cadenaResultados != '') {
                      var estatusUUID = cadenaResultados.split('estatusUUID>')[1].split('</')[0];
                      if (estatusUUID != null && estatusUUID != '') { //SI TIENE DATA

                          if (estatusUUID == "201" || estatusUUID == "202") {
                              exito = true;
                              status_doc = "Cancelado";
                          }
                          if (estatusUUID == "205" || estatusUUID == "207") {
                              status_doc = "No Cancelado"
                          }
                      }
                      //var status_doc = xml.split('resultados>')[1].split('detalle>')[1].split('</')[0];
                      //var mensajeError = xml.split('mensaje>')[1].split('</')[0];
                  }
              } else {
                  if (estatus == "202") {
                      exito = true;
                      status_doc = "Cancelado";
                  }
                  if (["204", "213", "501", "502", "503", "601",
                          "602", "603", "604", "610", "611", "612", "613",
                          "620", "621", "622", "623", "624", "625", "626",
                          "630", "631", "632", "633", "1302"
                      ].indexOf(estatus) != -1) {
                      status_doc = "No Cancelado";
                  }
                  if (estatus == "211" || estatus == "500") {
                      exito = true;
                      status_doc = "Cancelando";
                  }
              }

              if (estatus != "202") {
                  mensajeError = xml.split('mensaje>')[1].split('</')[0];
              } else {
                  mensajeError = "Cancelado."
              }

              // logError(status_doc, estatus, mensajeError);

          }

          return;
      }

      /**************************************************
       * Funcion que genera el PDF del CDFI
       **************************************************/
      function WSConsultaCFE() {
          nombreWS = "WSConsultaCFE";

          var URL_WS = "";
          URL_WS = HOST + "/ws/services/CFDI?wsdl";

          var StringXML =
              '<?xml version="1.0" encoding="UTF-8"?> ' +
              '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" ' +
              'xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ' +
              'soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"> ' +
              '<soap:Body> ' +
              '<generarPDF xmlns="http://cfdi.ws.erp.f.s"> ' +
              '<usuario xsi:type="xsd:string">' + USER + '</usuario> ' +
              '<password xsi:type="xsd:string">' + PASSWORD + '</password> ' +
              '<diseno xsi:type="xsd:int">' + IdDiseño + '</diseno> ' +
              '<uuid xsi:type="xsd:string" /> ' +
              '<folio xsi:type="xsd:int">' + folio + '</folio> ' +
              '<serie xsi:type="xsd:string">' + serie + '</serie> ' +
              '</generarPDF> ' +
              '</soap:Body> ' +
              '</soap:Envelope> ';

          try {
              var objConsultaCFE = '';
              if (SEND_TYPE == '1') {
                  URL_WS = "http://" + URL_WS;
                  require(['N/http'], function(http) {
                      objConsultaCFE =
                          http.post({
                              url: URL_WS,
                              body: StringXML
                          });
                  });
              } else if (SEND_TYPE == '2') {
                  URL_WS = "https://" + URL_WS;
                  require(['N/https'], function(https) {
                      objConsultaCFE =
                          https.post({
                              url: URL_WS,
                              body: StringXML
                          });
                  });
              }

              //   //PRUEBA
              //   if(estadoSF == 'Cancelando'){
              //     if(flagTiempo){
              //         mensajeError += ".Tiempo excedido en el WSConsultaCFE. Verificar el PDF en el portal " 
              //         + "si es que no se ha registrado en la transacción con anterioridad.";
              //         return;
              //     }
              //   } else if (estadoSF == 'Procesando'){
              //       flagTiempo = false;
              //       if(!flagTiempo){
              //         mensajeError = "Tiempo excedido al obtener el estado en WSConsultaCFE. Ejecutar nuevamente "
              //         + "el rellamado para actualizar el estado.";
              //         return flagTiempo;
              //       }
              //   }
              //   //FIN PRUEBA

              var returnConsultaCFE = objConsultaCFE.body;
              authCode = objConsultaCFE.code;
              if (authCode == '503' || authCode == '401') {
                  flagServProc = true;
              }
              returnConsultaCFE = replaceXML(returnConsultaCFE);
              // log.error("returnConsultaCFE:", returnConsultaCFE);
              // exito = true;
              if (estadoSF == 'Procesando') {
                  var returnStatus = returnConsultaCFE.split(':estatus>')[1];
                  var returnMensaje = returnConsultaCFE.split(':mensaje>')[1];
                  log.error('returnStatus', returnStatus);
                  log.error('returnMensaje', returnMensaje);
                  if (returnStatus != null && returnStatus != '') {
                      var statusSF = returnStatus.split('</')[0];
                      if (statusSF == '200') {
                          status_doc = 'Generado';
                          mensajeError = "";
                          exito = true;
                      } else {
                          status_doc = 'Rechazado';
                          mensajeError = returnMensaje.split('</')[0];
                      }
                      estatus = statusSF;
                      // logError(status_doc, estatus, mensajeError);
                  }
              }

              var returnPDF = returnConsultaCFE.split(':pdf>')[1];
              if (returnPDF != null && returnPDF != '' && exito && status_doc != 'Cancelando') {
                  var _PosFinal = (returnPDF.length) - (returnPDF.split('</')[1].length + 2);
                  PDF = returnPDF.substring(0, _PosFinal);
              }
          } catch (e) {
              mensajeError = e.valueOf().toString();
              if (mensajeError.indexOf("SSS_REQUEST_TIME_EXCEEDED") != -1) {
                  if (estadoSF == 'Cancelando') {
                      mensajeError += ".Tiempo excedido en el WSConsultaCFE. Verificar el PDF en el portal " +
                          "si es que no se ha registrado en la transacción con anterioridad.";
                      return;
                  } else if (estadoSF == 'Procesando') {
                      mensajeError = "Tiempo excedido al obtener el estado en WSConsultaCFE. Ejecutar nuevamente " +
                          "el rellamado para actualizar el estado.";
                      flagTiempo = false;
                      return flagTiempo;
                  }
              }
          }
          return returnConsultaCFE;

      }

      /**************************************************
       * Funcion que genera el XML de salida del CDFI creado en SF
       **************************************************/
      function WSDescargarXML() {
          nombreWS = "WSDescargarXML";

          var URL_WS = "";
          URL_WS = HOST + "/ERPWebServices/soap/CFDI33";

          var StringXML =
              '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fac="http://facturacion.erp.solucionfactible.com">' +
              '<soapenv:Header/>' +
              '<soapenv:Body>' +
              '<fac:descargarXML>' +
              '<usuario>' + USER + '</usuario> ' +
              '<password>' + PASSWORD + '</password> ' +
              '<folio>' + folio + '</folio> ' +
              '<serie>' + serie + '</serie> ' +
              '<uuid/> ' +
              '</fac:descargarXML>' +
              '</soapenv:Body>' +
              '</soapenv:Envelope>';

          try {
              var objDescargarXML = '';
              if (SEND_TYPE == '1') {
                  URL_WS = "http://" + URL_WS;
                  require(['N/http'], function(http) {
                      objDescargarXML =
                          http.post({
                              url: URL_WS,
                              body: StringXML
                          });
                  });
              } else if (SEND_TYPE == '2') {
                  URL_WS = "https://" + URL_WS;
                  require(['N/https'], function(https) {
                      objDescargarXML =
                          https.post({
                              url: URL_WS,
                              body: StringXML
                          });
                  });
              }

              // //PRUEBA
              // flagTiempo = false;
              // if(!flagTiempo){
              //     log.error('PROCESO VALIDACION TIEMPO EXCEDIDO', 'PROCESO VALIDACION TIEMPO EXCEDIDO');
              //     mensajeError = "Tiempo Excedido al obtener la Representacion Impresa del CFDI (WSDescargarXML). Ejecutar nuevamente el Rellamado para actualizar el estado.";
              //     return flagTiempo;
              // }
              // //FIN PRUEBA

              var returnDescargarXML = objDescargarXML.body;
              authCode = objDescargarXML.code;
              returnDescargarXML = replaceXML(returnDescargarXML);
              if (returnDescargarXML != null && returnDescargarXML != '') {
                  returnDescargarXML = returnDescargarXML.split('xml>')[1];
                  SalidaDescargaXML = returnDescargarXML.substring(0, returnDescargarXML.length - 2);
              }
          } catch (e) {
              mensajeError = e.valueOf().toString();
              if (mensajeError.indexOf("SSS_REQUEST_TIME_EXCEEDED") != -1) {
                  log.error('PROCESO VALIDACION TIEMPO EXCEDIDO', 'PROCESO VALIDACION TIEMPO EXCEDIDO');
                  mensajeError = "Tiempo Excedido al obtener la Representacion Impresa del CFDI (WSDescargarXML). Ejecutar nuevamente el Rellamado para actualizar el estado.";
                  flagTiempo = false;
                  return flagTiempo;
              }
          }

          log.error("returnDescargarXML:", returnDescargarXML);

          return SalidaDescargaXML;

      }

      /**********************************************************************
       * Funcion que transforma el response base64 de descargarXML en UTF-8
       **********************************************************************/
      function DeCodificarXML(stringInput) {

          var decodeXML = encode.convert({
              string: stringInput,
              inputEncoding: encode.Encoding.BASE_64,
              outputEncoding: encode.Encoding.UTF_8
          });

          return decodeXML;
      }

      function saveCartaPorte(internalIdCarta, numberCarta) {
          var recordCancelled = record.create({
              type: 'customrecord_lmry_mx_carta_porte_cancel'
          });
          recordCancelled.setValue('custrecord_lmry_mx_transaction_cartaport', internalIdCarta);
          recordCancelled.setValue('custrecord_lmry_mx_date_cancel_carta', actualTime());
          recordCancelled.setValue('custrecord_lmry_mx_number_carta', numberCarta);
          recordCancelled.save();
          log.error('se guardo el record', 'Se guardo el record');
      }

      function actualTime() {
          dia = new Date();
          utc = dia.getTime() - (dia.getTimezoneOffset() * 60000);
          nd = new Date(utc);
          return nd;
      }

      function replaceXML(xml) {
          xml = xml.replace(/&lt;/g, '<');
          xml = xml.replace(/&gt;/g, '>');
          xml = xml.replace(/&amp;lt;/g, '<');
          xml = xml.replace(/&amp;gt;/g, '>');

          return xml;
      }


      /* ------------------------------------------------------------------------------------------------------
       * Funicion para la creacion de carpetas y guardado de archivos en el FILE CABINET
       * --------------------------------------------------------------------------------------------------- */
      function Consult_folder(name_folder, parent_folder) {

          var busfolder = search.create({
              type: 'folder',
              columns: ['internalid', 'name'],
              filters: [
                  ['name', 'is', name_folder], 'and', ['parent', 'is', parent_folder]
              ]
          });
          var resultado_busqueda = busfolder.run().getRange(0, 10);

          var id_folder = '';
          if (resultado_busqueda == null || resultado_busqueda.length == 0) {
              var subof2 = record.create({
                  type: 'folder'
              });
              subof2.setValue('name', name_folder);
              subof2.setValue('parent', parent_folder);
              id_folder = subof2.save();
          } else {
              id_folder = resultado_busqueda[0].id;
          }
          return id_folder;
      }

      function search_folder() {

          var idprinting = scriptObj.getParameter({
              name: 'custscript_lmry_printing_folder_id'
          });
          if (idprinting == '' || idprinting == null) {

              var busquedafolder = search.create({
                  type: 'folder',
                  columns: ['internalid', 'name'],
                  filters: [
                      ['name', 'is', 'SuiteLatamReady']
                  ]
              });
              var ResultSet = busquedafolder.run().getRange(0, 100);

              if (ResultSet == null || ResultSet.length == 0) {
                  var SubOf = record.create({
                      type: 'folder'
                  });
                  SubOf.setValue('name', 'SuiteLatamReady');
                  latamidprint1 = SubOf.save();
              } else {
                  latamidprint1 = ResultSet[0].id;
              }

              var Nombre_Carpeta = 'XML and PDF Subsidiary';
              latamidprint2 = Consult_folder(Nombre_Carpeta, latamidprint1);

              var subsidixmlpdf = 'XML and PDF ' + initialConuntry;
              latamidprint3 = Consult_folder(subsidixmlpdf, latamidprint2);

              if (subsi) {
                  latamidprint4 = Consult_folder(subsiTransactext, latamidprint3);
              } else {
                  latamidprint4 = Consult_folder('Parent Company', latamidprint3);
              }

              var configRecObj = config.load({
                  type: 'companypreferences'
              });

              configRecObj.setText({
                  fieldId: 'custscript_lmry_printing_folder_id',
                  text: latamidprint2
              });
              configRecObj.save();

          } else {

              if (latamidprint3 == null || latamidprint3 == '') {
                  var subsidixmlpdf = 'XML and PDF ' + initialConuntry;
                  latamidprint3 = Consult_folder(subsidixmlpdf, idprinting);
              }

              if (latamidprint3 != null && latamidprint3 != '') {
                  if (subsi) {
                      latamidprint4 = Consult_folder(subsiTransactext, latamidprint3);
                  } else {
                      latamidprint4 = Consult_folder('Parent Company', latamidprint3);
                  }
              }
          }
      }


      /**********************************************************************
       * Funcion que obtiene los datos de confirguracion Setup MX
       **********************************************************************/
      function getEnableFeatures() {

          // if (subsi) {
          //     /* Registro Personalizado LatamReady - MX FEL Enable Feature */
          //     busqEnabFet = search.create({
          //         type: REC_ENABLE_FEAT,
          //         columns: ['custrecord_lmry_mx_fel_host', 'custrecord_lmry_mx_fel_sendtype',
          //             'custrecord_lmry_mx_fel_user', 'custrecord_lmry_mx_fel_password', 'custrecord_lmry_mx_fel_dateformat'
          //         ],
          //         filters: [
          //             ['custrecord_lmry_mx_fel_subsi', 'anyof', rec_subsi]
          //         ]
          //     });
          // } else {
          //     /* Registro Personalizado LatamReady - MX FEL Enable Feature */
          //     busqEnabFet = search.create({
          //         type: REC_ENABLE_FEAT,
          //         columns: ['custrecord_lmry_mx_fel_host', 'custrecord_lmry_mx_fel_sendtype',
          //             'custrecord_lmry_mx_fel_user', 'custrecord_lmry_mx_fel_password', 'custrecord_lmry_mx_fel_dateformat'
          //         ]
          //     });
          // }

          /* Registro Personalizado LatamReady - MX FEL Enable Feature */
          busqEnabFet = search.create({
              type: REC_ENABLE_FEAT,
              columns: ['custrecord_lmry_mx_fel_host', 'custrecord_lmry_mx_fel_sendtype',
                  'custrecord_lmry_mx_fel_user', 'custrecord_lmry_mx_fel_password', 'custrecord_lmry_mx_fel_dateformat', 'custrecord_lmry_mx_fel_email',
                  'custrecord_lmry_mx_fel_mail_cancel'
              ]
          });

          try {
              if (subsi) {
                  filter_subsi = search.createFilter({
                      name: 'custrecord_lmry_mx_fel_subsi',
                      operator: search.Operator.ANYOF,
                      values: [rec_subsi]
                  });
                  busqEnabFet.filters.push(filter_subsi);
              }

              resultEnabFet = busqEnabFet.run().getRange(0, 10);
          } catch (e) {
              myError.prototype = Object.create(Error.prototype);
              myError.prototype.constructor = myError;
              // throw new myError('La subsidiaria no ha sido asignada, ejecutar el rellamado desde el siguiente STLT: Setup > LatamReady - Electronic Invoicing > Documents to Confirm Status');
              throw new myError(e);
          }


          // resultEnabFet = busqEnabFet.run().getRange(0, 10);

          if (resultEnabFet != null && resultEnabFet.length != 0) {
              row = resultEnabFet[0].columns;
              if (resultEnabFet[0].getValue(row[0]) != null && resultEnabFet[0].getValue(row[0]) != '') {
                  HOST = resultEnabFet[0].getValue(row[0]);
              } else {
                  flag = false;
                  return flag;
              }
              SEND_TYPE = resultEnabFet[0].getValue(row[1]);
              USER = resultEnabFet[0].getValue(row[2]);
              PASSWORD = resultEnabFet[0].getValue(row[3]);
              FORMATO_FECHA = resultEnabFet[0].getValue(row[4]);
              EMAIL_SUBSI = resultEnabFet[0].getValue(row[5]);
              if(PASSWORD != null && PASSWORD != ''){
                  PASSWORD = PASSWORD.replace(/&/g, "&amp;");
              }
              SEND_EMAIL_CANCEL = resultEnabFet[0].getValue(row[6]); 
          }
      }

      function validacionServicioWS(nameWS) {
          try {
              if (authCode == '503' || authCode == '401') {
                  mensajeError = 'Error en el consumo de ' + nameWS + '. El servicio no está disponible o Autenticación Inválida (verifique las credenciales).'
                  // doc_status = "Error";
                  flagServicio = false;
                  return flagServicio;
              }
          } catch (e) {
              log.error('Error', "[validacionServicioWS] " + e)
          }
      }

      function logError(p_status, estatus, p_resp) {
          // Custom Record LatamReady - EI Log of Documents
          var _status = p_status + " - Número: " + serie + '-' + folio;
          var _resp = '';
          if (p_resp != '') {
              _resp = estatus + " - " + p_resp;
          }

          var logRecord = record.create({
              type: REC_LOG_DOC
          });
          logRecord.setValue('custrecord_lmry_ei_ld_doc', nInternalid);
          logRecord.setValue('custrecord_lmry_ei_ld_subsi', rec_subsi);
          logRecord.setValue('custrecord_lmry_ei_ld_employee', userId);
          logRecord.setValue('custrecord_lmry_ei_ld_status', _status.toString().substring(0, 300));
          logRecord.setValue('custrecord_lmry_ei_ld_response', _resp.substring(0, 4000));
          logRecord.setValue('custrecord_lmry_ei_ld_doc_code', codDoc);
          logRecord.save();
      }

      function logStatus(p_status) {
          // Custom Record LatamReady - EI Documents Status
          busqFelEstado = search.create({
              type: REC_DOC_STATUS,
              columns: ['custrecord_lmry_ei_ds_doc', 'custrecord_lmry_ei_ds_doc_status', 'custrecord_lmry_ei_ds_doc_id'],
              filters: [
                  ['custrecord_lmry_ei_ds_doc', 'anyof', nInternalid]
              ]
          });
          resultFelEstado = busqFelEstado.run().getRange(0, 1000);
          var estadoRecord;
          if (resultFelEstado == null || resultFelEstado.length == 0) {
              estadoRecord = record.create({
                  type: REC_DOC_STATUS
              });
              estadoRecord.setValue('custrecord_lmry_ei_ds_doc', nInternalid);
              estadoRecord.setValue('custrecord_lmry_ei_ds_subsi', rec_subsi);
          } else {
              estadoRecord = record.load({
                  type: REC_DOC_STATUS,
                  id: resultFelEstado[0].id
              });
          }
          estadoRecord.setValue('custrecord_lmry_ei_ds_doc_status', p_status.toString().substring(0, 300));
          //estadoRecord.setValue('custrecord_lmry_ei_ds_doc_id', TransaccionId);
          internalIDDs = estadoRecord.save();
      }

      /************************************************************
       * Funcion que envio correo al usuario con datos generados
       * por el proceso de facturacion Electronica SF
       ************************************************************/
      function sendMail(content, WSCancelarXML, WSDescargarXML, WSConsultaCFE, PDF) {

          /*
              var currentuser = runtime.getCurrentUser().id;
              var emailUser = runtime.getCurrentUser().email;

              var recEmp = search.lookupFields({
                  type: search.Type.EMPLOYEE,
                  id: currentuser,
                  columns: 'firstname'
              });
              var nameUser = recEmp.firstname;

              */
          var SentXML = scriptObj.getParameter({
              name: 'custscript_lmry_ei_sent_xml_name'
          });
          var receivedXML = scriptObj.getParameter({
              name: 'custscript_lmry_ei_received_xml_name'
          });
          var PDFname = scriptObj.getParameter({
              name: 'custscript_lmry_ei_pdf_name'
          });

          var body = '<body text="#333333" link="#014684" vlink="#014684" alink="#014684">';
          body += '<table width="642" border="0" align="center" cellpadding="0" cellspacing="0">';
          body += '<tr>';
          body += '<td width="100%" valign="top">';
          body += '<table width="100%" border="0" align="center" cellpadding="0" cellspacing="0">';
          body += '<tr>';
          body += '<td width="100%" colspan="2"><img style="display: block;" src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=921&c=TSTDRV1038915&h=c493217843d184e7f054" width="645" alt="main banner"/></td>';
          body += '</tr>';
          body += '</table>';
          body += '<table width="100%" border="0" align="center" cellpadding="0" cellspacing="0">';
          body += '<tr>';
          body += '<td bgcolor="#d50303" width="15%">&nbsp;</td>';
          body += '<td bgcolor="#d50303" width="85%">';
          body += '<font style="color:#FFFFFF; line-height:130%; font-family:Arial, Helvetica, sans-serif; font-size:19px">';
          body += 'Estimado(a) ' + nameUser + ':<br>';
          body += '</font>';
          body += '</td>';
          body += '</tr>';
          body += '<tr>';
          body += '<td width="100%" bgcolor="#d50303" colspan="2" align="right"><a href="http://www.latamready.com/#contac"><img src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=923&c=TSTDRV1038915&h=3c7406d759735a1e791d" width="94" style="margin-right:45px" /></a></td>';
          body += '</tr>';
          body += '<tr>';
          body += '<td width="100%" bgcolor="#FFF" colspan="2" align="right">';
          body += '<a href="https://www.linkedin.com/company/9207808"><img src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=924&c=TSTDRV1038915&h=c135e74bcb8d5e1ac356" width="15" style="margin:5px 1px 5px 0px" /></a>';
          body += '<a href="https://www.facebook.com/LatamReady-337412836443120/"><img src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=919&c=TSTDRV1038915&h=9c937774d04fb76747f7" width="15" style="margin:5px 1px 5px 0px" /></a>';
          body += '<a href="https://twitter.com/LatamReady"><img src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=928&c=TSTDRV1038915&h=fc69b39a8e7210c65984" width="15" style="margin:5px 47px 5px 0px" /></a>';
          body += '</td>';
          body += '</tr>';
          body += '</table>';
          body += '<table width="100%" border="0" cellspacing="0" cellpadding="2">';
          body += '<tr>';
          body += '<td width="15%">&nbsp;</td>';
          body += '<td width="70%">';
          body += '<font style="color:#333333;line-height:200%; font-family:Trebuchet MS, Helvetica, sans-serif; font-size:13px">';
          if (exito) {
              body += '<p>Este es un mensaje automático de LatamReady SuiteApp.</p>';
              body += '<p>Se ha generado el documento ' + nameTypeDoc + ' <b>' + tranID + '</b> con Internal ID <b>' + nInternalid + '</b> y estado <b>' + status_doc + '</b>.</p>';
          } else {
              body += '<p>Este es un mensaje de error automático de LatamReady SuiteApp.</p>';
              body += '<p>Se produjo un error al cancelar la ' + nameTypeDoc + ' <b>' + tranID + '</b> con Internal ID <b>' + nInternalid + '</b> y estado <b>' + status_doc + '</b>. El error es el siguiente:</p>';
              body += '<p>' + mensajeError + '</p>';
              body += '<p>Por favor, comunícate con nuestro departamento de Servicio al Cliente a: customer.care@latamready.com</p>';
              body += '<p>Nosotros nos encargamos.</p>';
          }
          body += '<p>Saludos,</p>';
          body += '<p>El Equipo de LatamReady</p>';
          body += '</font>';
          body += '</td>';
          body += '<td width="15%">&nbsp;</td>';
          body += '</tr>';
          body += '</table>';
          body += '<br>';
          body += '<table width="100%" border="0" cellspacing="0" cellpadding="2" bgcolor="#e5e6e7">';
          body += '<tr>';
          body += '<td>&nbsp;</td>';
          body += '</tr>';
          body += '<tr>';
          body += '<td width="15%">&nbsp;</td>';
          body += '<td width="70%" align="center">';
          body += '<font style="color:#333333;line-height:200%; font-family:Trebuchet MS, Helvetica, sans-serif; font-size:12px;" >';
          body += '<i>Este es un mensaje automático. Por favor, no responda este correo electrónico.</i>';
          body += '</font>';
          body += '</td>';
          body += '<td width="15%">&nbsp;</td>';
          body += '</tr>';
          body += '<tr>';
          body += '<td>&nbsp;</td>';
          body += '</tr>';
          body += '</table>';
          body += '<table width="100%" border="0" cellspacing="0" cellpadding="2">';
          body += '<tr>';
          body += '<td width="15%">&nbsp;</td>';
          body += '<td width="70%" align="center">';
          body += '<a href="http://www.latamready.com/"><img src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=926&c=TSTDRV1038915&h=e14f0c301f279780eb38" width="169" style="margin:15px 0px 15px 0px" /></a>';
          body += '</td>';
          body += '<td width="15%">&nbsp;</td>';
          body += '</tr>';
          body += '</table>';
          body += '<table width="100%" border="0" cellspacing="0" cellpadding="2">';
          body += '<tr>';
          body += '<td width="15%">&nbsp;</td>';
          body += '<td width="70%" align="center">';
          body += '<a href="https://www.linkedin.com/company/9207808"><img src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=925&c=TSTDRV1038915&h=41ec53b63dba135488be" width="101" style="margin:0px 5px 0px 5px" /></a>';
          body += '<a href="https://www.facebook.com/LatamReady-337412836443120/"><img src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=920&c=TSTDRV1038915&h=7fb4d03fff9283e55318" width="101" style="margin:0px 5px 0px 5px" /></a>';
          body += '<a href="https://twitter.com/LatamReady"><img src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=929&c=TSTDRV1038915&h=300c376863035d25c42a" width="101" style="margin:0px 5px 0px 5px" /></a>';
          body += '</td>';
          body += '<td width="15%">&nbsp;</td>';
          body += '</tr>';
          body += '</table>';
          body += '<table width="100%" border="0" cellspacing="0">';
          body += '<tr>';
          body += '<td>';
          body += '<img src="https://tstdrv1038915.app.netsuite.com/core/media/media.nl?id=918&c=TSTDRV1038915&h=7f0198f888bdbb495497" width="642" style="margin:15px 0px 15px 0px" /></a>';
          body += '</td>';
          body += '</tr>';
          body += '</table>';
          body += '</td>';
          body += '</tr>';
          body += '</table>';
          body += '</body>';

          var fileXML = new Array();

          var i = 0;
          if (SentXML != null && SentXML != '') {
              namesent = tranID + ' - ' + SentXML;
          } else {
              namesent = tranID;
          }
          var FileName = namesent + ' -' + nInternalid + '.xml';

          if (content != null && content != '') {
              fileXML[0] = file.create({
                  name: FileName,
                  fileType: file.Type.XMLDOC,
                  contents: content
              });
          }
          if (WSCancelarXML != null && WSCancelarXML != '') {
              fileXML[i] = file.create({
                  name: "Response CancelarCFE.xml",
                  fileType: file.Type.XMLDOC,
                  contents: WSCancelarXML
              });
              i++;
          }
          if (WSConsultaCFE != null && WSConsultaCFE != '') {
              fileXML[i] = file.create({
                  name: "Response ConsultaCFE " + tranID + ".xml",
                  fileType: file.Type.XMLDOC,
                  contents: WSConsultaCFE
              });
              i++;
          }
          if (WSDescargarXML != null && WSDescargarXML != '') {
              if (SentXML == receivedXML) {
                  if (receivedXML != null && receivedXML != '') {
                      namereceived = tranID + ' - ' + receivedXML + '(1)';
                  } else {
                      namereceived = tranID + '(1)';
                  }
              } else {
                  if (receivedXML != null && receivedXML != '') {
                      namereceived = tranID + ' - ' + receivedXML;
                  } else {
                      namereceived = tranID;
                  }
              }
              namereceived += ' -' + nInternalid;

              fileXML[i] = file.create({
                  name: namereceived + ".xml",
                  fileType: file.Type.XMLDOC,
                  contents: WSDescargarXML
              });
              if (exito) {
                  fileXML[i].folder = latamidprint4;
                  fileXML[i].isOnline = true; // url publico de response
                  idcontenido[0] = fileXML[i].save();
              }
              i++;
          }
          if (PDF != null && PDF != '') {
              if (PDFname != null && PDFname != '') {
                  namepdf = tranID + ' - ' + PDFname;
              } else {
                  namepdf = tranID;
              }
              namepdf += ' -' + nInternalid;
              fileXML[i] = file.create({
                  name: namepdf + ".pdf",
                  fileType: file.Type.PDF,
                  contents: PDF
              });
              if (exito) {
                  fileXML[i].folder = latamidprint4;
                  fileXML[i].isOnline = true; // url publico de pdf
                  idcontenido[1] = fileXML[i].save();
              }
              i++;
          }

          if (xmlCancelacion != null && xmlCancelacion != '') {
              var nameCancel = 'xmlCancelacion -' + nInternalid;
              fileXML[i] = file.create({
                  name: nameCancel + ".xml",
                  fileType: file.Type.XMLDOC,
                  contents: xmlCancelacion
              });
              if (exito) {
                  fileXML[i].folder = latamidprint4;
                  idcontenido[2] = fileXML[i].save();
              }
              i++;
          }
          var subject = '';
          if (exito) {
              subject = "LatamReady - MX " + nameTypeDoc + " " + tranID + ": " + status_doc;
          } else {
              subject = "LatamReady - MX " + nameTypeDoc + " " + tranID + ": Error";
          }

          log.error("Subject", subject);

          if (EMAIL_SUBSI != '' && EMAIL_SUBSI != null) {
              var tempEmail = [emailUser, EMAIL_SUBSI];
              EmailDest = tempEmail;
          } else {
              EmailDest = [emailUser];
          }

          email.send({
              author: userId,
              recipients: EmailDest,
              subject: subject,
              body: body,
              attachments: fileXML
          });
      }

      function sleep(milliseconds) {
          var start = new Date().getTime();
          for (var i = 0; i < 1e7; i++) {
              if ((new Date().getTime() - start) > milliseconds) {
                  break;
              }
          }
      }

      function myError(message) {
          this.name = 'ERROR_SCHDL';
          this.message = message;
          this.stack = (new Error()).stack;
      }

      function setPDF(idContenido, doc_type) {
          // amc
          try {

              if (idContenido != '') {

                  log.debug('PDF Link externo lleno');
                  // Obtiene la url del PDF
                  try {
                      var findFile = search.lookupFields({
                          type: 'file',
                          //id: idcontenido[2],
                          id: idContenido,
                          columns: ['url']
                      });
                      var urlResultBusquedaFile = findFile.url;
                  } catch (error) {
                      log.error('Error al realizar al busqueda del file, con SEARCH.lookupFields (amc)', e.valueOf().toString());
                  }

                  // Obtiene host URL
                  try {
                      var hostURL = '';
                      require(['N/url'], function(URL) {
                          var _hostURL = URL.resolveDomain({
                              hostType: URL.HostType.APPLICATION,
                              accountId: runtime.accountId
                          });
                          hostURL = _hostURL;
                      });
                  } catch (error) {
                      log.error('Error al acceder a resolveDomain (amc): ', error);
                  }

                  var urlPDF = 'https://' + hostURL + urlResultBusquedaFile;

                  // Setea el valor del PDF
                  var paramsUrlPdf = {};
                  paramsUrlPdf['custbody_lmry_webserviceresponse'] = urlPDF;

                  try {
                      record.submitFields({
                          type: doc_type,
                          id: nInternalid,
                          values: paramsUrlPdf
                      });
                  } catch (e) {
                      log.error('Error al setear el campo del invoice (amc)', e.valueOf().toString());
                  }

              }

          } catch (e) {
              log.error('Error', '[setPDF]: ' + e);
          }
      }

      function WSObtenerDatos() {
          nombreWS = "WSObtenerDatos";

          var URL_WS = "";
          URL_WS = HOST + "/ws/services/CFDI?wsdl";

          var StringXML =
              '<?xml version="1.0" encoding="UTF-8"?> ' +
              '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" ' +
              'xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ' +
              'soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"> ' +
              '<soap:Body> ' +
              '<obtenerDatos xmlns="http://cfdi.ws.erp.f.s"> ' +
              '<usuario xsi:type="xsd:string">' + USER + '</usuario> ' +
              '<password xsi:type="xsd:string">' + PASSWORD + '</password> ' +
              '<uuid xsi:type="xsd:string" /> ' +
              '<folio xsi:type="xsd:int">' + folio + '</folio> ' +
              '<serie xsi:type="xsd:string">' + serie + '</serie> ' +
              '</obtenerDatos> ' +
              '</soap:Body> ' +
              '</soap:Envelope> ';

          try {
              var objObtenerDatos = '';
              if (SEND_TYPE == '1') {
                  URL_WS = "http://" + URL_WS;
                  require(['N/http'], function(http) {
                      objObtenerDatos =
                          http.post({
                              url: URL_WS,
                              body: StringXML
                          });
                  });
              } else if (SEND_TYPE == '2') {
                  URL_WS = "https://" + URL_WS;
                  require(['N/https'], function(https) {
                      objObtenerDatos =
                          https.post({
                              url: URL_WS,
                              body: StringXML
                          });
                  });
              }

              var returnObtenerDatos = objObtenerDatos.body;
              authCode = objObtenerDatos.code;
              returnObtenerDatos = replaceXML(returnObtenerDatos);
              var actualizarEstado = returnObtenerDatos.split(':cancelada>')[1];
              log.error("Estado Cancelada", actualizarEstado);
              if (actualizarEstado != null && actualizarEstado != '') {
                  var obtenerEstado = actualizarEstado.split('</')[0];
                  if (obtenerEstado == 'false') {
                      status_doc = 'Generado';
                      mensajeError = ""
                  }
              }
              /*log.error('estadoSF', estadoSF);
              if (estadoSF == 'Procesando') {
                  var returnStatus = returnConsultaCFE.split(':estatus>')[1];
                  var returnMensaje = returnConsultaCFE.split(':mensaje>')[1];
                  log.error('returnStatus', returnStatus);
                  log.error('returnMensaje', returnMensaje);
                  if (returnStatus != null && returnStatus != '') {
                      var statusSF = returnStatus.split('</')[0];
                      if (statusSF == '200') {
                          status_doc = 'Generado';
                          mensajeError = "";
                          exito = true;
                      } else {
                          status_doc = 'Rechazado';
                          mensajeError = returnMensaje.split('</')[0];
                      }
                      estatus = statusSF;
                      // logError(status_doc, estatus, mensajeError);
                  }
              }

              var returnPDF = returnConsultaCFE.split(':pdf>')[1];
              if (returnPDF != null && returnPDF != '' && exito && status_doc != 'Cancelando') {
                  var _PosFinal = (returnPDF.length) - (returnPDF.split('</')[1].length + 2);
                  PDF = returnPDF.substring(0, _PosFinal);
              }*/
          } catch (e) {
              mensajeError = e.valueOf().toString();
              if (mensajeError.indexOf("SSS_REQUEST_TIME_EXCEEDED") != -1) {
                  mensajeError = "Tiempo Excedido al obtener Datos (WSObtenerDatos).";
                  flagTiempo = false;
                  return flagTiempo;
              }
          }
          return obtenerEstado;

      }

      function Remove_Trans(_rec, _recordId, recordType, void_feature) {
        if (recordType == 'customtransaction_lmry_payment_complemnt') {
           _rec = record.load({
            type: recordType,
            id: _recordId,
            isDynamic: false
          });
   
          var count_invoice = _rec.getLineCount({
            sublistId: 'recmachcustrecord_lmry_factoring_rel_pymnt_cust'
          });
          for (var i = 0; i < count_invoice; i++) {
            _rec.setSublistValue({
              sublistId: 'recmachcustrecord_lmry_factoring_rel_pymnt_cust',
              fieldId: 'custrecord_lmry_factoring_apply_compensa',
              line: i,
              value: false
            });
            _rec.setSublistValue({
              sublistId: 'recmachcustrecord_lmry_factoring_rel_pymnt_cust',
              fieldId: 'custrecord_lmry_factoring_apply_invoice',
              line: i,
              value: false
            });
          }
   
          var count_bills = _rec.getLineCount({
            sublistId: 'recmachcustrecord_lmry_factoring_rel_pymnt_vend'
          });
          for (var i = 0; i < count_bills; i++) {
            _rec.setSublistValue({
              sublistId: 'recmachcustrecord_lmry_factoring_rel_pymnt_vend',
              fieldId: 'custrecord_lmry_factoring_apply_bill',
              line: i,
              value: false
            });
          }
          _rec.setValue('custpage_amount_deposited', 0)
          _rec.setValue('custpage_vendor_subtotal', 0);
          _rec.setValue('custpage_vendor_total', 0);
          _rec.setValue('custpage_apply_total', 0);
   
          var count_accounts = _rec.getLineCount({
            sublistId: 'line'
          });
          for (var i = 0; i < count_accounts; i++) {
            _rec.setSublistValue('line', 'credit', i, 0);
            _rec.setSublistValue('line', 'debit', i, 0);
          }
          _rec.save({
            ignoreMandatoryFields: true,
            enableSourcing: true
          });
   
        } else if (recordType == 'customerpayment') {
          var validJournal = true, journalId = "";
          if (void_feature == true || void_feature == 'T') {
            var resultJournal = library_AnulacionInvoice.reversalJournal(_recordId);
            log.debug('resultJournal', resultJournal);
            validJournal = (resultJournal.fields.length == 0);
            journalId = resultJournal.trans || "";
          }
          if (validJournal) {
            var _rec = record.load({
            type: "customerpayment",
            id: _recordId
            });
            
            var count_invoice = _rec.getLineCount({
              sublistId: 'apply'
            });
            for (i = 0; i < count_invoice; i++) {
              if (_rec.getSublistValue('apply', 'apply', i)) {
                _rec.setSublistValue({
                  sublistId: 'apply',
                  fieldId: 'apply',
                  line: i,
                  value: false
                });
              }
              if (journalId) {
                var transactionId = _rec.getSublistValue("apply", "internalid", i);
                if (transactionId == journalId) {
                    _rec.setSublistValue({
                    sublistId: "apply",
                    fieldId: "apply",
                    line: i,
                    value: true
                  })
                }
              }
            }
            _rec.save({
              ignoreMandatoryFields: true,
              enableSourcing: true
            });
          }
        }
      }

      return {
          execute: execute
      };

  });
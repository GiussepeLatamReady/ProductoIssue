/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_MX_EI_VOID_STLT.js                          ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Sep 07 2018  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
 var HOST = '';
 var SEND_TYPE = '';
 var USER = '';
 var PASSWORD = '';
 var PDF = '';
 var SEND_EMAIL_CANCEL = false;
 
 var subsidiary = '';
 var folio = '';
 var folioFiscalRef = '';
 var codModificacion = '';
 var serie = '';
 var exito = false;
 var nInternalid = '';
 var status_doc = '';
 var tranID = '';
 var nameTypeDoc = '';
 var typeRecord = '';
 var transType = '';
 var _IniTypeDoc = '';
 var subsi = '';
 
 var mensajeError = '';
 var _IdDiseño = '';
 var scriptObj = '';
 var idcontenido = new Array();
 var initialCountry = '';
 var latamidprint1 = '';
 var latamidprint2 = '';
 var latamidprint3 = '';
 var latamidprint4 = '';
 var subsiTransactext = '';
 var xmlCancelacion = '';
 var EMAIL_SUBSI = '';
 var EmailDest = new Array();

 var flagEmision = false;
 var flagTiempo = true;
 var flagProcesando = false;
 var authCode = '';
 var nombreWS = '';
 
 var flagServicio = true;
 var flagServProc = false;
 var flagContemplar = false;
 
 var internalIDDs = '';
 var REC_LOG_DOC = 'customrecord_lmry_ei_log_docs';
 var REC_DOC_STATUS = 'customrecord_lmry_ei_docs_status';
 var REC_DOC_TYPE = 'customrecord_lmry_tipo_doc';
 var REC_DOC_DESIGN = 'customrecord_lmry_document_design'
 var REC_PRINT_PDF = 'customrecord_lmry_printing_pdf_xml';
 var REC_ENABLE_FEAT = 'customrecord_lmry_mx_fel_enable_feature';
 
 define(['N/ui/serverWidget', 'N/search', 'N/redirect', "N/email", "N/encode", 'N/runtime', 'N/record', 'N/render', 'N/file', "N/config", "N/url", "N/http", "N/https", "N/transaction", '/SuiteBundles/Bundle 245636/EI_Library/LMRY_AnulacionInvoice_LBRY_V2.0', 'SuiteBundles/Bundle 245636/EI_Send_Email_Module/LMRY_Transaction_Message_LBRY_V2.0.js', 'SuiteBundles/Bundle 245636/EI_Library/LMRY_EI_libSendingEmailsLBRY_V2.0'],
     function(serverWidget, search, redirect, email, encode, runtime, record, render, file, config, url, http, https, transaction, library_AnulacionInvoice, message_lbry, ei_library) {
 
         function onRequest(context) {
 
             if (context.request.method == 'GET') {
 
                 try {
 
                     log.error("INICIO", "INICIO");
 
                     // Get parameters
                     nInternalid = context.request.parameters.internalid;
                     var nTypeRec = context.request.parameters.typerec;
                     nSerieDoc = context.request.parameters.seriedoc;
                     nTypeDoc = context.request.parameters.typedoc;
                     scriptObj = runtime.getCurrentScript();
                     subsi = runtime.isFeatureInEffect({
                         feature: "SUBSIDIARIES"
                     });
 
                     log.error('Valores', nInternalid + '-' + nTypeRec);
                     var isThereModification = false;
                     isThereModification = getOtherFields(nTypeRec, nSerieDoc, nTypeDoc);
                     // Si no hay Motivo de Cancelacion
                     if (isThereModification){
                         status_doc = "Error";
                         mensajeError = 'Debe seleccionar un motivo de Cancelación en el campo "LATAM - MODIFICATION REASON"'
                         logError(status_doc, mensajeError);
                         logStatus(status_doc); 
                         return;
                     }
                    
                     getEnableFeatures();
 
                     var returnCancelar = WSCancelarXML();
                     if(status_doc == 'Cancelado' || status_doc == 'CANCELADO'){
                        if(returnCancelar != null && returnCancelar != ''){
                            xmlCancelacion = returnCancelar.split('<acuseSAT>')[1];
                            if (xmlCancelacion!= null && xmlCancelacion!= '') {
                                xmlCancelacion = xmlCancelacion.split('</acuseSAT>')[0];
                                xmlCancelacion = DeCodificarXML(xmlCancelacion);
                              }
                        }
                        
                     }
                     contemplacionErrores(context);
                     if (flagContemplar) {
                         log.error("Error", mensajeError);
                         return true;
                     }
                     sleep(5000);
                     var returnConsultaCFE = WSConsultaCFE();
                     if (flagServProc == true) {
                         mensajeError = 'Error en el consumo de ' + nombreWS + '. El servicio no está disponible o Autenticación Inválida (verifique las credenciales). ' +
                             'Verificar PDF en el Portal si es que no se encuentra registrado en la transacción.';
                     }
                     log.error("returnConsultaCFE:", returnConsultaCFE);
                     var returnDescargarXML = "";
 
                     if (exito) {
                         var descargarXML = WSDescargarXML();
                         if (returnConsultaCFE != null && returnConsultaCFE != '') {
                             contemplacionErrores(context);
                             if (flagContemplar) {
                                 log.error("Error", mensajeError);
                                 return true;
                             }
                         }
                         returnDescargarXML = DeCodificarXML(descargarXML);
                     }
 
                     logError(status_doc, mensajeError);
                     logStatus(status_doc);
 
                     log.error('Status 1:', status_doc.toString().substring(0, 300));
 
                     var otherId = record.submitFields({
                         type: typeRecord,
                         id: nInternalid,
                         values: {
                             'custbody_lmry_pe_estado_sf': status_doc.toString().substring(0, 300)
                         },
                         options: {
                             ignoreMandatoryFields: true,
                             enableSourcing: true,
                             disableTriggers: true
                         }
                     });
 
                     if (exito) {
                         search_folder();
                     }
 
                     sendMail('', returnCancelar, returnDescargarXML, returnConsultaCFE, PDF);
 
                     /* ************** Codigo para el FileCabinet ************* */
                     if (exito) {
                         printPDFandXML();
                         if (status_doc == 'Cancelado') {
                             log.error("Voided by NetSuite");
                             var void_feature = runtime.getCurrentScript().getParameter({
                                 name: 'REVERSALVOIDING'
                             });
                             if (nInternalid != '' && nInternalid != null) {
                                 if (nTypeRec == 'invoice') {
                                     var resp_lbry = library_AnulacionInvoice.anularInvoice(nInternalid);
                                     log.error("salidaLBRY", resp_lbry);
 
                                     if (resp_lbry.wht) mensajeLBRY = "El invoice tiene retenciones.";
                                     else mensajeLBRY = "El invoice NO tiene retenciones.";
                                     log.error("wht", mensajeLBRY);
 
                                     if (resp_lbry.standardvoid) mensajeLBRY = "Se anuló de forma estandar.";
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
                                         logError(status_doc, mensajeError);
                                     }
                                 } else if (void_feature == false || void_feature == 'F') {
                                     log.error("Flujo estandar", "entró");
                                     if(codModificacion != '01' && transType == 'customtransaction_lmry_payment_complemnt'){
                                         Remove_Trans(rec, nInternalid, tipoDocum, void_feature);
                                      } else if (nTypeRec != 'itemfulfillment' && transType != '') {
                                         try {
                                             var voidTransaction = transaction.void({
                                                 type: transType,
                                                 id: nInternalid
                                             });
                                         } catch (e) {
                                             exito = 'Parcial';
                                             mensajeError = "Legally canceled successfully but not in NetSuite. You must void the transacction manually.";
                                             logError(status_doc, mensajeError);
                                         }
                                     } else if (typeRecord != '' && nTypeRec == 'itemfulfillment') {
                                         saveCartaPorte(nInternalid, folio);
                                         var recordsaved = record.submitFields({
                                             type: typeRecord,
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
 
                                 } else if ((void_feature == true || void_feature == 'T') && nTypeRec == 'itemfulfillment') {
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
                                     if (nTypeRec == 'customerpayment' || nTypeRec == 'customtransaction_lmry_payment_complemnt') {
                                         if(codModificacion != '01') {
                                             Remove_Trans(nInternalid, nTypeRec, void_feature);
                                         }
                                     } else {
                                         exito = 'Parcial';
                                         mensajeError = "Legally canceled successfully but not in NetSuite. You must void the transacction manually.";
                                         logError(status_doc, mensajeError);
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
                         context.response.write(exito.toString());
                     }
 
                     licencias_mx = ei_library.getLicenses(subsidiary)
                     if (ei_library.getAuthorization("573", licencias_mx)) {
                         if ((status_doc == 'Cancelando' || status_doc == 'Cancelado') && SEND_EMAIL_CANCEL) {
                             message_lbry.SEND_MESSAGE(nInternalid, runtime.getCurrentUser().id, 'rellamado');
                         }
                     }
 
                     log.error("FIN", "FIN");
 
                 } catch (e) {
                     logError("Error", e.valueOf().toString())
                 }
             }
         }
 
         return {
             onRequest: onRequest
         };
 
         function WSCancelarXML() {
             nombreWS = "WSCancelarXML";
 
             var URL_WS = "";
             URL_WS = HOST + "/ERPWebServices/soap/CFDI33";
 
             var stringInput =
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
                     objEnvioCFE =
                         http.post({
                             url: URL_WS,
                             body: stringInput
                         });
                 } else if (SEND_TYPE == '2') {
                     URL_WS = "https://" + URL_WS;
                     objEnvioCFE =
                         https.post({
                             url: URL_WS,
                             body: stringInput
                         });
                 }
 
                 // //PRUEBA
                 // flagTiempo = false;
                 // if(!flagTiempo){
                 //     log.error('PROCESO VALIDACION TIEMPO EXCEDIDO', 'PROCESO VALIDACION TIEMPO EXCEDIDO');
                 //     exito = true;
                 //     mensajeError = "Tiempo Excedido en la cancelación (WSCancelarXML). Ejecutar el rellamado para actualizar el estado.";
                 //     status_doc = 'Cancelando';
                 //     flagProcesando = true;
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
                     log.error('PROCESO VALIDACION TIEMPO EXCEDIDO', 'PROCESO VALIDACION TIEMPO EXCEDIDO');
                     exito = true;
                     mensajeError = "Tiempo Excedido en la cancelación (WSCancelarXML). Ejecutar el rellamado para actualizar el estado.";
                     status_doc = 'Cancelando';
                     flagProcesando = true;
                     flagTiempo = false;
                     return flagTiempo;
                 }
             }
 
             return returnEnvioCFE;
 
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
                 '<diseno xsi:type="xsd:int">' + _IdDiseño + '</diseno> ' +
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
                     objConsultaCFE =
                         http.post({
                             url: URL_WS,
                             body: StringXML
                         });
                 } else if (SEND_TYPE == '2') {
                     URL_WS = "https://" + URL_WS;
                     objConsultaCFE =
                         https.post({
                             url: URL_WS,
                             body: StringXML
                         });
                 }
 
                 // //PRUEBA
                 // if(flagTiempo){
                 //     mensajeError = "Tiempo excedido en el WSConsultaCFE. Verificar el PDF en el portal "
                 //     + "si es que no se encuentra registrado en la transacción.";
                 //     return;
                 // }
                 // //FIN PRUEBA
 
                 var returnConsultaCFE = objConsultaCFE.body;
                 authCode = objConsultaCFE.code;
                 if (authCode == '503' || authCode == '401') {
                     flagServProc = true;
                 }
                 returnConsultaCFE = replaceXML(returnConsultaCFE);
                 // log.error("returnConsultaCFE:", returnConsultaCFE);
                 // exito = true;
 
                 var returnPDF = returnConsultaCFE.split(':pdf>')[1];
                 if (returnPDF != null && returnPDF != '' && exito && status_doc != 'Cancelando') {
                     var _PosFinal = (returnPDF.length) - (returnPDF.split('</')[1].length + 2);
                     PDF = returnPDF.substring(0, _PosFinal);
                 }
             } catch (e) {
                 mensajeError = e.valueOf().toString();
                 if (mensajeError.indexOf("SSS_REQUEST_TIME_EXCEEDED") != -1) {
                     mensajeError = "Tiempo excedido en el WSConsultaCFE. Verificar el PDF en el portal " +
                         "si es que no se encuentra registrado en la transacción.";
                     return;
                 }
             }
 
             return returnConsultaCFE;
 
         }
 
         /*******************************************
          * Chequea el status de la generacion PDF
          *******************************************/
         function checkStatus(xml) {
 
             var estatus = xml.split('estatus>')[1].split('</')[0];
             //estatus = "500";
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
                    } else{
                        exito = true;
                        status_doc = "Cancelado";
                    }
                 } else {
                     if (estatus == "202") {
                         exito = true;
                         status_doc = "Cancelado";
                     }
                     //if (estatus == "204" || estatus == "213" || estatus == "500") {
                     if (["204", "213", "501", "502", "503", "601",
                             "602", "603", "604", "610", "611", "612", "613",
                             "620", "621", "622", "623", "624", "625", "626",
                             "630", "631", "632", "633", "1302"
                         ].indexOf(estatus) != -1) {
                         status_doc = "No Cancelado";
                     }
                     if (estatus == "211" || estatus == "500") {
                         status_doc = "Cancelando";
                         exito = true;
                     }
                 }
 
                 mensajeError = xml.split('mensaje>')[1].split('</')[0];
                 mensajeError = estatus + ' - ' + mensajeError;
                 // logError(status_doc, mensajeError);
 
             }
 
             return;
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
                     objDescargarXML =
                         http.post({
                             url: URL_WS,
                             body: StringXML
                         });
                 } else if (SEND_TYPE == '2') {
                     URL_WS = "https://" + URL_WS;
                     objDescargarXML =
                         https.post({
                             url: URL_WS,
                             body: StringXML
                         });
                 }
 
                 // //PRUEBA
                 // flagTiempo = false;
                 // if(!flagTiempo){
                 //     log.error('PROCESO VALIDACION TIEMPO EXCEDIDO', 'PROCESO VALIDACION TIEMPO EXCEDIDO');
                 //     exito = true;
                 //     mensajeError = "Tiempo Excedido al obtener la Representacion Impresa del CFDI (WSDescargarXML). Ejecutar el Rellamado para actualizar el estado.";
                 //     status_doc = 'Cancelando';
                 //     flagProcesando = true;
                 //     return flagTiempo;
                 // }
                 // //FIN PRUEBA
 
                 var returnDescargarXML = objDescargarXML.body;
                 authCode = objDescargarXML.code;
                 if (authCode == '503' || authCode == '401') {
                     exito = true;
                     flagProcesando = true;
                     flagServProc = true;
                 }
                 returnDescargarXML = replaceXML(returnDescargarXML);
                 if (returnDescargarXML != null && returnDescargarXML != '') {
                     returnDescargarXML = returnDescargarXML.split('xml>')[1];
                     SalidaDescargaXML = returnDescargarXML.substring(0, returnDescargarXML.length - 2);
                 }
             } catch (e) {
                 mensajeError = e.valueOf().toString();
                 if (mensajeError.indexOf("SSS_REQUEST_TIME_EXCEEDED") != -1) {
                     log.error('PROCESO VALIDACION TIEMPO EXCEDIDO', 'PROCESO VALIDACION TIEMPO EXCEDIDO');
                     exito = true;
                     mensajeError = "Tiempo Excedido al obtener la Representacion Impresa del CFDI (WSDescargarXML). Ejecutar el Rellamado para actualizar el estado.";
                     status_doc = 'Cancelando';
                     flagProcesando = true;
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
 
         /************************************************************
          * Funcion que envio correo al usuario con datos generados
          * por el proceso de facturacion Electronica SF
          ************************************************************/
         function sendMail(content, WSCancelarXML, WSDescargarXML, WSConsultaCFE, PDF) {
 
             var currentuser = runtime.getCurrentUser().id;
             var emailUser = runtime.getCurrentUser().email;
 
             var recEmp = search.lookupFields({
                 type: search.Type.EMPLOYEE,
                 id: currentuser,
                 columns: 'firstname'
             });
             var nameUser = recEmp.firstname;
 
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
                 body += '<p>Se ha cancelado el documento ' + nameTypeDoc + ' <b>' + tranID + '</b> con Internal ID <b>' + nInternalid + '</b> y estado <b>' + status_doc + '</b>.</p>';
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
             
             if (EMAIL_SUBSI != '' && EMAIL_SUBSI != null) {
                var tempEmail= [emailUser,EMAIL_SUBSI];
                EmailDest=tempEmail;
             }else{
                EmailDest=[emailUser];
             }
            
             email.send({
                 author: currentuser,
                 recipients: EmailDest,
                 subject: subject,
                 body: body,
                 attachments: fileXML
             });
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
 
         function contemplacionErrores(context) {
             try {
                 if (!flagTiempo) {
                     logError(status_doc, mensajeError);
                     if (exito) {
                         logStatus(status_doc);
                         context.response.write(exito.toString());
                     }
                     flagContemplar = true;
                 }
                 validacionServicioWS(nombreWS);
                 if (!flagServicio) {
                     logError(status_doc, mensajeError);
                     if (exito) {
                         logStatus(status_doc);
                         context.response.write(exito.toString());
                     }
                     flagContemplar = true;
                 }
                 if (exito) {
                     record.submitFields({
                         type: typeRecord,
                         id: nInternalid,
                         values: {
                             'custbody_lmry_pe_estado_sf': status_doc.toString().substring(0, 300)
                         },
                         options: {
                             ignoreMandatoryFields: true,
                             enableSourcing: true,
                             disableTriggers: true
                         }
                     });
                 }
 
                 return flagContemplar;
             } catch (e) {
                 log.error('Error', "[contemplacionErrores] " + e)
             }
         }
 
         function validacionServicioWS(nameWS) {
             try {
                 if (authCode == '503' || authCode == '401') {
                     mensajeError = 'Error en el consumo de ' + nameWS + '. El servicio no está disponible o Autenticación Inválida (verifique las credenciales).'
                     if (!flagServProc) {
                         status_doc = "Generado";
                     } else {
                         status_doc = "Cancelando";
                         mensajeError += 'Ya se ha emitido la transacción en la petición anterior. Revisar el portal. ' +
                             'Luego ejecutar el Rellamado para la actualización de su estado.';
                     }
                     flagServicio = false;
                     return flagServicio;
                 }
             } catch (e) {
                 log.error('Error', "[validacionServicioWS] " + e)
             }
         }
 
         /**********************************************************************
          * Funcion que guarda informacion del error en Log MX
          **********************************************************************/
         function logError(doc_status, _resp) {
 
             var _status = doc_status + " - Número: " + serie + '-' + folio;
 
             var logRecord = record.create({
                 type: REC_LOG_DOC
             });
             logRecord.setValue('custrecord_lmry_ei_ld_doc', nInternalid);
             logRecord.setValue('custrecord_lmry_ei_ld_subsi', subsidiary);
             logRecord.setValue('custrecord_lmry_ei_ld_employee', runtime.getCurrentUser().id);
             logRecord.setValue('custrecord_lmry_ei_ld_status', _status.toString().substring(0, 300));
             logRecord.setValue('custrecord_lmry_ei_ld_response', _resp.toString().substring(0, 4000));
             logRecord.setValue('custrecord_lmry_ei_ld_doc_code', _IniTypeDoc);
             logRecord.save();
         }
 
         /**********************************************************************
          * Funcion que obtiene los datos de confirguracion Setup MX
          **********************************************************************/
         function getEnableFeatures() {
 
             if (subsi) {
                 /* Registro Personalizado LatamReady - MX FEL Enable Feature */
                 var busqEnabFet = search.create({
                     type: REC_ENABLE_FEAT,
                     columns: ['custrecord_lmry_mx_fel_host', 'custrecord_lmry_mx_fel_sendtype',
                         'custrecord_lmry_mx_fel_user', 'custrecord_lmry_mx_fel_password', 'custrecord_lmry_mx_fel_email',
                         'custrecord_lmry_mx_fel_mail_cancel'
                     ],
                     filters: [
                         ['custrecord_lmry_mx_fel_subsi', 'anyof', subsidiary]
                     ]
                 });
             } else {
                 /* Registro Personalizado LatamReady - MX FEL Enable Feature */
                 var busqEnabFet = search.create({
                     type: REC_ENABLE_FEAT,
                     columns: ['custrecord_lmry_mx_fel_host', 'custrecord_lmry_mx_fel_sendtype',
                         'custrecord_lmry_mx_fel_user', 'custrecord_lmry_mx_fel_password', 'custrecord_lmry_mx_fel_email'
                     ]
                 });
             }
 
             var resultEnabFet = busqEnabFet.run().getRange(0, 10);
 
             if (resultEnabFet != null && resultEnabFet.length != 0) {
                 row = resultEnabFet[0].columns;
                 HOST = resultEnabFet[0].getValue(row[0]);
                 SEND_TYPE = resultEnabFet[0].getValue(row[1]);
                 USER = resultEnabFet[0].getValue(row[2]);
                 PASSWORD = resultEnabFet[0].getValue(row[3]);
                 EMAIL_SUBSI = resultEnabFet[0].getValue(row[4]); 
                 if(PASSWORD != null && PASSWORD != ''){
                    PASSWORD = PASSWORD.replace(/&/g, "&amp;");
                 }
                 SEND_EMAIL_CANCEL = resultEnabFet[0].getValue(row[5]);
             }
         }
 
         function sleep(milliseconds) {
             var start = new Date().getTime();
             for (var i = 0; i < 1e7; i++) {
                 if ((new Date().getTime() - start) > milliseconds) {
                     break;
                 }
             }
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
             resultado_busqueda = busfolder.run().getRange(0, 100);
 
             var subof2 = '';
             if (resultado_busqueda == null || resultado_busqueda.length == 0) {
                 subof2 = record.create({
                     type: 'folder'
                 });
                 subof2.setValue('name', name_folder);
                 subof2.setValue('parent', parent_folder);
             } else {
                 subof2 = record.load({
                     type: 'folder',
                     id: resultado_busqueda[0].id
                 });
             }
             var id_folder = subof2.save();
 
             return id_folder;
         }
 
         function search_folder() {
 
             var busquedafolder = search.create({
                 type: 'folder',
                 columns: ['internalid', 'name'],
                 filters: [
                     ['name', 'is', 'SuiteLatamReady']
                 ]
             });
 
             ResultSet = busquedafolder.run().getRange(0, 100);
             var SubOf = '';
             if (ResultSet == null || ResultSet.length == 0) {
                 SubOf = record.create({
                     type: 'folder'
                 });
                 SubOf.setValue('name', 'SuiteLatamReady');
             } else {
                 SubOf = record.load({
                     type: 'folder',
                     id: ResultSet[0].id
                 });
             }
             latamidprint1 = SubOf.save();
 
             var idprinting = scriptObj.getParameter({
                 name: 'custscript_lmry_printing_folder_id'
             });
 
             if (idprinting == '' || idprinting == null) {
 
                 var Nombre_Carpeta = 'XML and PDF Subsidiary';
                 latamidprint2 = Consult_folder(Nombre_Carpeta, latamidprint1);
 
                 var subsidixmlpdf = 'XML and PDF ' + initialCountry;
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
 
                 var subsidixmlpdf = 'XML and PDF ' + initialCountry;
                 latamidprint3 = Consult_folder(subsidixmlpdf, idprinting);
 
                 if (subsi) {
                     latamidprint4 = Consult_folder(subsiTransactext, latamidprint3);
                 } else {
                     latamidprint4 = Consult_folder('Parent Company', latamidprint3);
                 }
             }
         }
         /* ************** Fin del Codigo para el FileCabinet ************* */
 
         function getOtherFields(_nTypeRec, _nSerieDoc, _nTypeDoc) {
 
             if (_nTypeRec == 'invoice') {
                 typeRecord = record.Type.INVOICE;
                 transType = transaction.Type.INVOICE;
             } else if (_nTypeRec == 'customerpayment') {
                 typeRecord = record.Type.CUSTOMER_PAYMENT;
                 transType = transaction.Type.CUSTOMER_PAYMENT;
             } else if (_nTypeRec == 'customerdeposit') {
                 typeRecord = record.Type.CUSTOMER_DEPOSIT;
                 transType = transaction.Type.CUSTOMER_DEPOSIT;
             } else if (_nTypeRec == 'customtransaction_lmry_payment_complemnt') {
                 typeRecord = 'customtransaction_lmry_payment_complemnt';
                 transType = 'customtransaction_lmry_payment_complemnt';
                 //Modificacion Ronald
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
             } else if (_nTypeRec == 'creditmemo') {
                 typeRecord = record.Type.CREDIT_MEMO;
                 transType = transaction.Type.CREDIT_MEMO;
             } else if (_nTypeRec == 'itemfulfillment') {
                 typeRecord = record.Type.ITEM_FULFILLMENT;
                 transType = transaction.Type.ITEM_FULFILLMENT;
             }
             log.error("_nSerieDoc - _nTypeDoc", _nSerieDoc+"-"+_nTypeDoc);
             //Entra al IF cuando es Complemento de Pago
             if ((_nSerieDoc != '' && _nSerieDoc != null) && (_nTypeDoc != '' && _nTypeDoc != null)) {
                 var ser = search.lookupFields({
                     type: 'customrecord_lmry_serie_impresion_cxc',
                     id: _nSerieDoc,
                     columns: ['name']
                 })
                 var Rec = search.lookupFields({
                     type: typeRecord,
                     id: nInternalid,
                     columns: ['subsidiary', 'custbody_lmry_num_preimpreso', 'custbody_lmry_modification_reason.custrecord_lmry_cod_modification_reason', 'custbody_lmry_foliofiscal_doc_ref']
                 });
                 subsidiary = Rec.subsidiary[0].value;
                 folio = Rec.custbody_lmry_num_preimpreso;
                 if (codModificacion != '' && codModificacion != null){
                    if (codModificacion == '02' || codModificacion == '03') {
                        folioFiscalRef = '';
                    } else {
                        folioFiscalRef = Rec.custbody_lmry_foliofiscal_doc_ref;
                    }
                 } else {
                     //No se selecciono ningun Motivo de Cancelacion
                     //para complemento de Pago
                     return true;
                 }
                 
                 log.error("Folio Fiscal Ref- cod", folioFiscalRef + '-' + codModificacion);
                 serie = ser.name;
                 var TipoDoc = _nTypeDoc;
             } else {
                var columns_srch = ['subsidiary', 'custbody_lmry_num_preimpreso', 'custbody_lmry_serie_doc_cxc', 'custbody_lmry_document_type', 'custbody_lmry_modification_reason.custrecord_lmry_cod_modification_reason', 'custbody_lmry_foliofiscal_doc_ref'];
                if (!subsi){
                   var columns_srch = ['custbody_lmry_num_preimpreso', 'custbody_lmry_serie_doc_cxc', 'custbody_lmry_document_type', 'custbody_lmry_modification_reason.custrecord_lmry_cod_modification_reason', 'custbody_lmry_foliofiscal_doc_ref'];
                   subsidiary = 1;
                }
                 var Rec = search.lookupFields({
                     type: typeRecord,
                     id: nInternalid,
                     columns: columns_srch
                 });
                 if(subsi){
                    subsidiary = Rec.subsidiary[0].value; 
                 }
                 folio = Rec.custbody_lmry_num_preimpreso;
                 codModificacion = Rec["custbody_lmry_modification_reason.custrecord_lmry_cod_modification_reason"];
                 if (codModificacion != '' && codModificacion != null){
                    if (codModificacion == '02' || codModificacion == '03') {
                        folioFiscalRef = '';
                    } else {
                        folioFiscalRef = Rec.custbody_lmry_foliofiscal_doc_ref;
                    }
                 }else{
                     //No se selecciono ningun Motivo de Cancelacion
                     // para todas las demas transacciones.
                     return true;
                 }
                 
                 log.error("Folio Fiscal Ref- cod", folioFiscalRef + '-' + codModificacion);
                 serie = Rec.custbody_lmry_serie_doc_cxc[0].text;
                 var TipoDoc = Rec.custbody_lmry_document_type[0].value;
             }
 
             var Rec = search.lookupFields({
                 type: REC_DOC_TYPE,
                 id: TipoDoc,
                 columns: ['name', 'custrecord_lmry_doc_initials']
             });
             nameTypeDoc = Rec.name;
             _IniTypeDoc = Rec.custrecord_lmry_doc_initials;
             log.error("nameTypeDoc - _IniTypeDoc", nameTypeDoc + ' - ' + _IniTypeDoc);
 
             var recor = record.load({
                 type: typeRecord,
                 id: nInternalid
             });
 
             if (subsi) {
                 subsiTransactext = recor.getText('subsidiary');
                 var recsubsi = search.lookupFields({
                     type: search.Type.SUBSIDIARY,
                     id: subsidiary,
                     columns: ['country']
                 });
                 initialCountry = recsubsi.country[0].value;
             } else {
                 var configCompany = config.load({
                     type: config.Type.COMPANY_INFORMATION
                 });
                 initialCountry = configCompany.getValue('country');
             }
 
             var desing = recor.getValue('custbody_lmry_mx_document_design');
 
             if (desing != '' && desing != null) {
                 var objdesing = search.lookupFields({
                     type: REC_DOC_DESIGN,
                     id: desing,
                     columns: ['custrecord_lmry_codigo_diseno_doc']
                 });
                 _IdDiseño = objdesing.custrecord_lmry_codigo_diseno_doc;
             }
 
             tranID = serie + folio;
 
             log.error('Valores 1:', subsidiary + '-' + serie + '-' + folio + '-' + desing + '-' + initialCountry + '-' + subsiTransactext);
         }
 
         function logStatus(p_status) {
             /* Registro Personalizado LatamReady - MX EI Documents Status */
             var busqFelEstado = search.create({
                 type: REC_DOC_STATUS,
                 columns: ['custrecord_lmry_ei_ds_doc', 'custrecord_lmry_ei_ds_doc_status', 'custrecord_lmry_ei_ds_doc_id'],
                 filters: [
                     ['custrecord_lmry_ei_ds_doc', 'anyof', nInternalid]
                 ]
             });
             var resultFelEstado = busqFelEstado.run().getRange(0, 1000);
             var estadoRecord;
             if (resultFelEstado == null || resultFelEstado.length == 0) {
                 estadoRecord = record.create({
                     type: REC_DOC_STATUS
                 });
                 estadoRecord.setValue('custrecord_lmry_ei_ds_doc', nInternalid);
             } else {
                 estadoRecord = record.load({
                     type: REC_DOC_STATUS,
                     id: resultFelEstado[0].id
                 });
             }
             estadoRecord.setValue('custrecord_lmry_ei_ds_doc_status', p_status.toString().substring(0, 300));
             if (subsi) {
                 estadoRecord.setValue('custrecord_lmry_ei_ds_subsi', subsidiary);
             }
             internalIDDs = estadoRecord.save();
         }
 
         function printPDFandXML() {
 
             var busqeiprint = search.create({
                 type: REC_PRINT_PDF,
                 columns: ['custrecord_lmry_document_transaction', 'custrecord_lmry_printing_subsidiary', 'custrecord_lmry_print_pdf', 'custrecord_lmry_print_xml'],
                 filters: [
                     ['custrecord_lmry_document_transaction', 'anyof', nInternalid]
                 ]
             });
 
             var resultprint = busqeiprint.run().getRange(0, 100);
 
             var recordprint;
             if (resultprint == null || resultprint.length == 0) {
                 recordprint = record.create({
                     type: REC_PRINT_PDF
                 });
                 recordprint.setValue('custrecord_lmry_document_transaction', nInternalid);
                 recordprint.setValue('custrecord_lmry_printing_subsidiary', subsidiary);
             } else {
                 recordprint = record.load({
                     type: REC_PRINT_PDF,
                     id: resultprint[0].id
                 });
             }
 
             var output = '';
 
             output = url.resolveScript({
                 scriptId: 'customscript_lmry_ei_impr_file_cabinet',
                 deploymentId: 'customdeploy_lmry_ei_impr_file_cabinet',
                 returnExternalUrl: false,
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
             } else {
                 if(status_doc != 'Cancelando'){
                    recordprint.setValue('custrecord_lmry_print_pdf', '');
                 }
                 
             }
             if (idcontenido[2] != null && idcontenido[2] != '' && idcontenido[2] != 'undefined') {
                output3 = output.split('&compid')[0] + '&idcontenido=' + idcontenido[2];
                recordprint.setValue('custrecord_lmry_response_doc', output3);
            } else {
                recordprint.setValue('custrecord_lmry_response_doc', '');
            }
             recordprint.save();
         }

         function Remove_Trans(_recordId, recordType, void_feature) {
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
                  enableSourcing: true,
                });
              }
            }
          }
 
     });
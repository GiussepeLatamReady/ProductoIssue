/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_WHT_Massive_Details_STLT.js                  ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Set 22 2017  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/record','N/search','N/log','N/ui/serverWidget','N/runtime','N/redirect','N/url','N/task',
'./WTH_Library/LMRY_WHT_Massive_Payments_LBRY','N/format','./Latam_Library/LMRY_libSendingEmailsLBRY_V2.0', './Latam_Library/LMRY_Log_LBRY_V2.0'],

function(record,search,log,serverWidget,runtime,redirect,url,task,library_wht,format,library_send, lbryLog) {

    var LMRY_script = 'LatamReady - WHT Massive Details STLT';
    var Language = runtime.getCurrentScript().getParameter({name: 'LANGUAGE'});
    Language = Language.substring(0, 2);

    //Traducción de Campos
    switch (Language) {
      case 'es':
        var LblForm = 'LatamReady - WHT Masivo Detalles';
        var LblPayee = 'Proveedor';
        var LblMsg1 = 'No se puede procesar porque hay un proceso pendiente en la cola';
        var LblMsg2 = 'Importante: no se permite el acceso y / o se ha producido un error';
        var LblGroup1 = 'Información Primaria';
        var LblTittleMsg = 'Mensaje';
        var LblEntDate = 'Fecha de Ingreso';
        var LblState = 'Estado';
        var LblIDUser = 'ID Usuario';
        var LblSub = 'Subsidiaria';
        var LblCur = 'Moneda';
        var LblIDProcess = 'ID Proceso';
        var LblSublist = 'Sublista';
        var BtnBack = 'Cancelar';
        var BtnSave = 'Generar';
        break;

      case 'pt':
        var LblForm = 'LatamReady - WHT Massivo Detalhes';
        var LblPayee = 'Beneficiário';
        var LblMsg1 = 'Não pode ser processado porque existe um processo pendente na fila';
        var LblMsg2 = 'Importante: o acesso não é permitido e / ou ocorreu um erro';
        var LblGroup1 = 'Informação Primária';
        var LblTittleMsg = 'Mensagem';
        var LblEntDate = 'Data Inserida';
        var LblState = 'Estado';
        var LblIDUser = 'ID do usuário';
        var LblSub = 'Subsidiária';
        var LblCur = 'Moeda';
        var LblIDProcess = 'ID do processo';
        var LblSublist = 'Sublista';
        var BtnBack = 'Cancelar';
        var BtnSave = 'Gerar';
        break;

      default:
        var LblForm = 'LatamReady - WHT Massive Details';
        var LblPayee = 'Payee';
        var LblMsg1 = 'Can not be processed as there is a pending process in the queue';
        var LblMsg2 = 'Important: Access is not allowed and / or an error has occurred';
        var LblGroup1 = 'Primary Information';
        var LblTittleMsg = 'Message';
        var LblEntDate = 'Entered date';
        var LblState = 'State';
        var LblIDUser = 'User ID';
        var LblSub = 'Subsidiary';
        var LblCur = 'Currency';
        var LblIDProcess = 'Process ID';
        var LblSublist = 'Sublist';
        var BtnBack = 'Cancel';
        var BtnSave = 'Generate';
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

          if(context.request.method == 'GET'){
            var form = serverWidget.createForm({title:LblForm});
            var state = context.request.parameters.param_logid;
            var useid = context.request.parameters.param_useid;

            var search_massive = search.lookupFields({type:'customrecord_lmry_wht_massive_payments',id:state,columns:['custrecord_lmry_wht_massive_date','custrecord_lmry_wht_massive_subsi',
            'custrecord_lmry_wht_massive_currency','custrecord_lmry_wht_massive_acc_period','custrecord_lmry_wht_massive_rate','custrecord_lmry_wht_massive_vendors','custrecord_lmry_wht_massive_multibooking',
            'custrecord_lmry_wht_massive_payments_log','custrecord_lmry_wht_massive_document']});

            var subsidiary = search_massive.custrecord_lmry_wht_massive_subsi[0].value;

            var currency_actual_text = search_massive.custrecord_lmry_wht_massive_currency[0].text;
            var exchange_actual = search_massive.custrecord_lmry_wht_massive_rate;
            var accounting_period = search_massive.custrecord_lmry_wht_massive_acc_period[0].value;
            var vendors = (search_massive.custrecord_lmry_wht_massive_vendors).split('|');
            var date = search_massive.custrecord_lmry_wht_massive_date;
            var multib = search_massive.custrecord_lmry_wht_massive_multibooking;
            var ids_log = (search_massive.custrecord_lmry_wht_massive_payments_log).split('|');
            var doc_fiscales = search_massive.custrecord_lmry_wht_massive_document;

            // SETUPTAX
            var arreglo_setuptax = library_wht.llenado_setuptax(subsidiary,doc_fiscales);
            //MULTIBOOKING
            var arreglo_currencies = library_wht.multibooking(currency_actual_text,exchange_actual,multib);

            for(var a=0;a<ids_log.length-1;a++){
              library_wht.payment_log('0',ids_log[a],accounting_period,vendors[a], date, arreglo_currencies, arreglo_setuptax[0], subsidiary, arreglo_setuptax[1], arreglo_setuptax[2],arreglo_currencies[2],'','');
              library_wht.reseteo();
              var remainingUsage1 = runtime.getCurrentScript().getRemainingUsage();
            }

            var arregloBanderas = library_wht.banderas();

            form.addFieldGroup({id:'group_pi',label:LblGroup1});

            var p_subsi = form.addField({id: 'id_subsi', label: LblSub, type: serverWidget.FieldType.SELECT, source: 'subsidiary', container: 'group_pi'});
            p_subsi.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
            p_subsi.defaultValue = search_massive.custrecord_lmry_wht_massive_subsi[0].value;

            var p_curren = form.addField({id: 'id_curren', label: LblCur, type: serverWidget.FieldType.TEXT, container: 'group_pi'});
            p_curren.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
            p_curren.defaultValue = search_massive.custrecord_lmry_wht_massive_currency[0].text;

            var p_date = form.addField({id: 'id_date',label: LblEntDate,type: serverWidget.FieldType.DATE,source: 'date',container: 'group_pi'});
            p_date.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
            p_date.defaultValue = date;

            form.addFieldGroup({id:'group_state',label:LblState});

            var p_proc = form.addField({id: 'custpage_st_proc',label: LblIDProcess,type: serverWidget.FieldType.TEXT,container: 'group_state'});
            p_proc.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
            p_proc.defaultValue = state;

            var p_user = form.addField({id: 'id_user',label: LblIDUser,type: serverWidget.FieldType.TEXT,container: 'group_state'});
            p_user.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
            p_user.defaultValue = useid;

            var SubTabla = form.addSublist({id: 'custpage_id_sub',type: serverWidget.SublistType.LIST,label: LblSublist});

            library_wht.llenadoSubTabla(SubTabla,'1',arregloBanderas,search_massive.custrecord_lmry_wht_massive_subsi[0].value, Language);

            var remainingUsage1 = runtime.getCurrentScript().getRemainingUsage();
            log.error('Memoria consumida', remainingUsage1);

            form.addSubmitButton({label:BtnSave});
            form.addButton({id:'id_cancel',label:BtnBack,functionName: 'funcionCancel'});

            // Script Cliente
            form.clientScriptModulePath = './WTH_Library/lmry_wht_details_cancel2.js';
            context.response.writePage(form);

          }else{

            var params = {};
            params['custscript_lmry_wht_massive_useid'] = context.request.parameters.id_user;
            params['custscript_lmry_wht_massive_logid'] = context.request.parameters.custpage_st_proc;

            try{
              var redi_mapr = task.create({
                  taskType: task.TaskType.MAP_REDUCE,
                  scriptId: 'customscript_lmry_wht_massive_pay_mprd',
                  deploymentId: 'customdeploy_lmry_wht_massive_pay_mprd',
                  params: params
              });
              redi_mapr.submit();

              redirect.toSuitelet({
                  scriptId: 'customscript_lmry_wht_log_payments_sltl',
                  deploymentId: 'customdeploy_lmry_wht_log_payments_sltl'
              });

            }catch(err){
              log.error({title: 'Se generó un error en suitelet',details: err});
              library_send.sendemail(['onRequest'] + err,LMRY_script);
              lbryLog.doLog({ title : "[ onRequest ]", message : err });
              
              var form = serverWidget.createForm({title: 'LatamReady - WHT Massive Details STLT'});

              var myInlineHtml = form.addField({id: 'custpage_id_message',label: LblTittleMsg,type: serverWidget.FieldType.INLINEHTML});
              myInlineHtml.layoutType = serverWidget.FieldLayoutType.OUTSIDEBELOW;
              myInlineHtml.updateBreakType({breakType: serverWidget.FieldBreakType.STARTCOL});

              var strhtml = "<html>";
              strhtml += "<table border='0' class='table_fields' cellspacing='0' cellpadding='0'>";
              strhtml += "<tr>";
              strhtml += "<button style=\"font-size: 14px; font-weight:bold\"><a style=\"text-decoration:none\" href=\"javascript:history.back()\"> Back</a></button>";
              strhtml += "</tr>";
              strhtml += "<tr>";
              strhtml += "<td class='text'>";
              strhtml += "<div style=\"color: gray; font-size: 12pt; margin-top: 10px; padding: 5px; border-top: 1pt solid silver\">"+LblMsg1+"</div>";
              strhtml += "</td>";
              strhtml += "</tr>";
              strhtml += "</table>";
              strhtml += "</html>";

              myInlineHtml.defaultValue = strhtml;

              context.response.writePage(form);
            }

          }

      }catch(msgerr){
        library_send.sendemail('[onRequest]' + msgerr,LMRY_script);
        log.error('Se genero un error en suitelet',msgerr);
        lbryLog.doLog({ title : "[ onRequest ]", message : msgerr });

        var form = serverWidget.createForm({title: 'LatamReady - WHT Massive Details STLT'});
        var myInlineHtml = form.addField({id: 'custpage_id_message',label: LblTittleMsg,type: serverWidget.FieldType.INLINEHTML});

        myInlineHtml.layoutType = serverWidget.FieldLayoutType.OUTSIDEBELOW;
        myInlineHtml.updateBreakType({breakType: serverWidget.FieldBreakType.STARTCOL});

        var strhtml = "<html>";
        strhtml += "<table border='0' class='table_fields' cellspacing='0' cellpadding='0'>";
        strhtml += "<tr>";
        strhtml += "</tr>";
        strhtml += "<tr>";
        strhtml += "<td class='text'>";
        strhtml += "<div style=\"color: gray; font-size: 12pt; margin-top: 10px; padding: 5px; border-top: 1pt solid silver\">"+LblMsg2+".</div>";
        strhtml += "</td>";
        strhtml += "</tr>";
        strhtml += "</table>";
        strhtml += "</html>";

        myInlineHtml.defaultValue = strhtml;

        // Dibuja el Formulario
        context.response.writePage(form);
      }

    }

    return {
        onRequest: onRequest
    };

});

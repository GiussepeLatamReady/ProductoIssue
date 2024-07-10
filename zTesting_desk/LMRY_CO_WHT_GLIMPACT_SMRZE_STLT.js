/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for CO GL Impact Transaction                   ||
||                                                              ||
||  File Name: LMRY_CO_WHT_GLIMPACT_SMRZE_STLT.js               ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  1.0     Oct 29 2020  LatamReady    Use Script 1.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
var LMRY_script = "LatamReady - CO WHT GL Impact Smrze STLT";
var recId = 0;
var bookI = 0;
var arrLibroMag = new Array();

var StylTitulo = 'style=\"font-family:  Helvetica; font-size: 25pt; color: #000000; height: 30px; margin-top: 0px\"  align=\"right\" width=\"100%\"';
var StylSubT = 'style=\"font-size: 14pt; height: 25px; \" valign=\"middle\" align=\"left\" ';
var Styl1 = 'style=\"font-size: 9pt; border: 0px; height: 18px \" valign=\"middle\" align=\"left\" ';
var Stylcab = 'style=\"font-size: 7pt; border: 1px solid #000000; height: 8px; color: #FFFFFF; background: #000000 \" valign=\"middle\" align=\"center\"';
var Styl2 = 'style=\"font-size: 7pt; height: 45px;  border-right:1.5px solid #000000 \" valign=\"middle\" align=\"center\" width=\"40\"';
var Styl3 = 'style=\"text-align: justify; font-size: 7pt; height: 45px; border-right:1.5px solid #000000 \" width=\"40\"';
/*
var colStyl = 'style=\"text-align: center; font-size: 9pt; font-weight:bold; color:white; background-color:#d50303; border: 1px solid #d50303; ';
var rowStyl = 'style=\"text-align: Left;   font-size: 9pt; font-weight:bold; border: 1px solid #d50303; ';
var errStyl = 'style=\"text-align: justify;   font-size: 9pt; font-weight:bold; color:red;border: 1px solid #d50303; ';
*/
// Idioma imprimir
var context = nlapiGetContext();
var user = nlapiGetUser();
var idioma = context.getPreference('LANGUAGE');
var idiomaS = idioma.substring(0, 2);

// Para saber si esta activa la funcionalidad de one world o mid market edition
var featuresubs = context.getFeature('SUBSIDIARIES');

// Department, Class and Location
var FeaDepa = context.getFeature('DEPARTMENTS');
var FeaLoca = context.getFeature('LOCATIONS');
var FeaClas = context.getFeature('CLASSES');
var foreigncurrencymanagement=nlapiGetContext().getFeature('foreigncurrencymanagement')
var EmpName = '';
var EmpApro = '';
var today = nlapiDateToString(new Date());

// Solo si tiene Accounting Book
var Tran_Glnu = '';
var BookChag = 0;
var BookName = '';
var country = '';
var currency = {};
// Moneda
var NameCurren = '';

var arrAccounts = new Array();
var ArrAgrupado = new Array();
/* Inicio del SuiteLet */

function Print_CO_WHT_PDF_Gl_Impact(request, response) {
    try {

        recId = request.getParameter('id');
        bookI = request.getParameter('multibook');
        bookI = Number(bookI);
        Forma = request.getParameter('formato');

        // Valida que no esten ejecutando solo el suitelet
        if (recId == '' || recId == null) {
            var form = nlapiCreateForm("LatamReady - CO WHT GL Impact STLT");
            // Mensaje para el cliente
            var myInlineHtml = form.addField('custpage_lmry_v_message', 'inlinehtml').setLayoutType('outsidebelow', 'startcol');
            var strhtml = "<html>";
            strhtml += "<table border='0' class='table_fields' cellspacing='0' cellpadding='0'>" +
                "<tr>" +
                "</tr>" +
                "<tr>" +
                "<td class='text'>" +
                "<div style=\"color: gray; font-size: 12pt; margin-top: 10px; padding: 5px; border-top: 1pt solid silver\">" +
                "Importante: Actualmente no esta ejecutando de la forma correcta el SuiteLet." +
                "</div>" +
                "</td>" +
                "</tr>" +
                "</table>" +
                "</html>";
            myInlineHtml.setDefaultValue(strhtml);

            // Dibuja el formularios
            response.writePage(form);

            // Termina el SuiteLet
            return true;
        }

        getCountry(); // Se carga el pais (country)
        getCurrency(); //Se carga el currency

        // Salida en formato PDF
        if (Forma == 1) {
            Create_GLWHT_PDF(request, response);
        }
        // Salida en formato CSV
        if (Forma == 2) {
            Create_GLWHT_CSV(request, response);
        }
        // Salida e3n formato XLS
        if (Forma == 3) {
            nlapiLogExecution('ERROR', 'excel', 'ID: ' + Forma);
            Create_GLWHT_XLS(request, response);
        }

    } catch (err) {
        // Mensaje para el cliente
        var strhtml = "<html>";
        strhtml += "<br><br>";
        strhtml += "<table border='0' class='table_fields' cellspacing='0' cellpadding='0'>" +
            "<tr>" +
            "</tr>" +
            "<tr>" +
            "<td class='text'>" +
            "<div style=\"color: gray; font-size: 12pt; margin-top: 10px; padding: 5px; border-top: 1pt solid silver\">" +
            "Importante: Se genero un error en el SuiteLet de impresio del PDF, por favor revisar su correo electronico." +
            "</div>" +
            "</td>" +
            "</tr>" +
            "</table>" +
            "</html>";

        // Dibuja el formularios
        response.writePage(strhtml);

        // Envio del correo al usuario
        nlapiLogExecution('ERROR', 'error', err);
    }
}

/* ****************************************** */
/*    Creacion de GL Impact WHT en PDF        */
/* ****************************************** */
function Create_GLWHT_PDF(request, response) {
    try {
        // Envia al log del script
        nlapiLogExecution('ERROR', 'Create_GLWHT_PDF', 'ID: ' + recId + ' - Book: ' + bookI);

        // Crea el PDF
        var htmlFinal = creaArhivoPDF();

        /**************************************************
         * Crea el archivo PDF con todos los certificados
         * en un solo PDF, para luego ser enviado por
         * correo electronico.
         ************************************************/
        var Body_XML_PDF = "<?xml version=\"1.0\"?><!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">";
        Body_XML_PDF += '<pdf>';
        Body_XML_PDF += '<head>';
        Body_XML_PDF += '<macrolist>';
        Body_XML_PDF += '<macro id ="myfooter">';
        Body_XML_PDF += '<table width="100%" border="1">';
        Body_XML_PDF += '<tr>';
        if (idiomaS == 'es') {
            Body_XML_PDF += '<td>Creado por :</td>';
        } else {
            Body_XML_PDF += '<td>Created by :</td>';
        }
        Body_XML_PDF += '<td>' + nlapiEscapeXML(EmpName) + '</td>';
        Body_XML_PDF += '<td>';
        Body_XML_PDF += '|';
        Body_XML_PDF += '</td>';
        if (idiomaS == 'es') {
            Body_XML_PDF += '<td>Aprobado por :</td>';
        } else {
            Body_XML_PDF += '<td>Approved by :</td>';
        }

        // El aprovador va en blanco
        Body_XML_PDF += '<td></td>';
        Body_XML_PDF += '</tr>';
        Body_XML_PDF += '<tr>';
        if (idiomaS == 'es') {
            Body_XML_PDF += '<td>Fecha de sistema :</td>';
        } else {
            Body_XML_PDF += '<td>Date of system :</td>';
        }
        Body_XML_PDF += '<td>' + today + '</td>';
        Body_XML_PDF += '<td>';
        Body_XML_PDF += '|';
        Body_XML_PDF += '</td>';
        if (idiomaS == 'es') {
            Body_XML_PDF += '<td></td>';
        } else {
            Body_XML_PDF += '<td></td>';
        }
        Body_XML_PDF += '<td></td>';
        Body_XML_PDF += '</tr>';
        Body_XML_PDF += '</table>';
        Body_XML_PDF += '</macro>';
        Body_XML_PDF += '</macrolist>';
        Body_XML_PDF += '</head>';
        Body_XML_PDF += '<body footer="myfooter" footer-height="10mm" font-size=\"12\"><h3></h3>';
        Body_XML_PDF += htmlFinal;
        Body_XML_PDF += "</body></pdf>";

        // Crea el PDF
        var myPDFfile = nlapiXMLToPDF(Body_XML_PDF);
        myPDFfile.setName('LatamReady_CO_WHT_GL_Impact_' + recId + '.pdf');

        // Muestra el solo el ultimo PDF en Pantalla
        response.setContentType('PDF', 'LatamReady_CO_WHT_GL_Impact_' + recId + '.pdf', 'inline');
        response.write(myPDFfile.getValue());

    } catch (err) {
        // Log de errores
        nlapiLogExecution('ERROR', 'Create_GLWHT_PDF - Error', err);
    }
}

/********************************************
 * Crea tablas segun el modelo PDF
 * para crear el certifiaco de retencio
 *******************************************/
function creaArhivoPDF() {
    try {
        // Crea el detalle
        var xmlDeta = creaTableDos();
        // Crear tablas
        var xmlBody = '';
        xmlBody += "<div style=\"border: 0px; width:100% \" >";
        xmlBody += creaTableLogo();
        xmlBody += creaTableUno();
        xmlBody += "</div>";
        xmlBody += "<div style=\"border: 0px; height: 20px \" >";
        xmlBody += "</div>";
        xmlBody += xmlDeta;

        // Devuelve el HTML
        return xmlBody;

    } catch (err) {
        // Envio del correo al usuario
        nlapiLogExecution('ERROR', 'creaArhivoPDF - Error', err);

        return '';
    }
}

function creaTableLogo() {
    try {
        nlapiLogExecution('ERROR', '01 - creaTableLogo', 'Table Logo');

        // Para saber si esta activa la funcionalidad de one world o mid market edition
        var subsID = 0;
        if (featuresubs == true) {
            recId = request.getParameter('id');
            subsID = nlapiLookupField('transaction', recId, 'subsidiary');
        }

        // Datos de la Empresa
        var companyruc = "";
        var companyname = "";
        var companylogo = "";
        var companyaddr = "";
        if (featuresubs == true) {
            // Datos para one world edition
            var RecordSub = nlapiLookupField('subsidiary', subsID, ['legalname', 'taxidnum', 'address1',
                'custrecord_lmry_dig_verificador', 'custrecord_lmry_gl_impact_logo']);
            companyruc = RecordSub.taxidnum;
            // Valida que el digito verificado no este vacio
            if (RecordSub.custrecord_lmry_dig_verificador != '' &&
                RecordSub.custrecord_lmry_dig_verificador != null) {
                companyruc = companyruc + '-' + RecordSub.custrecord_lmry_dig_verificador;
            }
            companyname = nlapiEscapeXML(RecordSub.legalname);
            companylogo = RecordSub.custrecord_lmry_gl_impact_logo;
            companyaddr = nlapiEscapeXML(RecordSub.address1);
        } else {
            // Datos para mid makert edition
            var configpage = nlapiLoadConfiguration('companyinformation');
            companyruc = configpage.getFieldValue('employerid');
            // Valida que el digito verificado no este vacio
            if (configpage.getFieldValue('custrecord_lmry_dig_verificador') != '' &&
                configpage.getFieldValue('custrecord_lmry_dig_verificador') != null) {
                companyruc = companyruc + '-' + configpage.getFieldValue('custrecord_lmry_dig_verificador');
            }
            companyname = nlapiEscapeXML(configpage.getFieldValue('companyname'));
            companylogo = configpage.getFieldValue('custrecord_lmry_gl_impact_logo');
            companyaddr = nlapiEscapeXML(configpage.getFieldValue('address1'));
        }
        // Url del logo
        var company_Host = context.getSetting('SCRIPT', 'custscript_lmry_netsuite_location');
        var company_Image = '';
        if (companylogo != '' && companylogo != null) {
            companylogo = nlapiLoadFile(companylogo);
            companylogo = companylogo.getURL();
            // Logo del PDF - SuiteAnswers ID 10289
            company_Image = 'https://' + company_Host + '' + companylogo;
            company_Image = nlapiEscapeXML(company_Image);
        }

        // Tabla Logo del PDF
        var html = "";
        html += "<div style=\"border: 0px \">";
        html += "<table style=\"font-family: Verdana, Arial, Helvetica, sans-serif; width:100%\">";
        html += "<tr>";
        html += "<td " + StylSubT + "width = \"50% \">";
        html += "<table style=\"font-family: Verdana, Arial, Helvetica, sans-serif; width:100%\">";
        html += "<tr>";
        html += "<td " + StylSubT + "width = \"85% \">";
        if (company_Image != '' && company_Image != null) {
            html += "<img width=\"110\" height=\"80\" src=\"" + company_Image + "\" />";
        }
        html += "</td>";
        html += "</tr>";
        html += "<tr>";
        html += "<td " + StylSubT + "width = \"85% \"> <b>" + companyname + "</b></td>";
        html += "</tr>";
        html += "<tr>";
        html += "<td " + StylSubT + "width = \"85% \"> <b>" + companyaddr + "</b></td>";
        html += "</tr>";
        html += "</table>";
        html += "</td>";
        html += "<td " + StylSubT + "width = \"50% \">";
        if (idiomaS == 'es') {
            html += "<p " + StylTitulo + "> Impacto Contable </p>";
        } else {
            html += "<p " + StylTitulo + "> CO WHT GL Impact </p>";
        }
        html += "</td>";
        html += "</tr>";
        html += "</table>";
        html += "</div>";

        html += "<table style=\"font-family: Verdana, Arial, Helvetica, sans-serif ; width:170px\">";
        if (idiomaS == 'es') {
            html += "<tr>";
            html += "<td " + Styl1 + "width = \"10% \"><b>N° Impuesto</b></td>";
            html += "<td " + Styl1 + "width = \"5% \" ><b>:</b></td>";
            html += "<td " + Styl1 + "width = \"20% \"><b>" + companyruc + "</b></td>";
            html += "</tr>";
            html += "<tr>";
            html += "<td " + Styl1 + "width = \"10% \"><b>N° Interno</b></td>";
            html += "<td " + Styl1 + "width = \"5% \" ><b>:</b></td>";
            html += "<td " + Styl1 + "width = \"20% \"><b>" + recId + "</b></td>";
            html += "</tr>";
        } else {
            html += "<tr>";
            html += "<td " + Styl1 + "width = \"10% \"><b>Tax ID</b></td>";
            html += "<td " + Styl1 + "width = \"5% \" ><b>:</b></td>";
            html += "<td " + Styl1 + "width = \"20% \"><b>" + companyruc + "</b></td>";
            html += "</tr>";
            html += "<tr>";
            html += "<td " + Styl1 + "width = \"10% \"><b>Internal ID</b></td>";
            html += "<td " + Styl1 + "width = \"5% \" ><b>:</b></td>";
            html += "<td " + Styl1 + "width = \"20% \"><b>" + recId + "</b></td>";
            html += "</tr>";
        }
        html += "</table>";

        // Devuelve el HTML
        return html;

    } catch (err) {
        // Envio del correo al usuario
        nlapiLogExecution('ERROR', 'creaTableLogo - Error', err);

        return '';
    }
}

function creaTableUno() {
    try {
        nlapiLogExecution('ERROR', '02 - creaTableUno', 'Table Uno');

        // Answer Id: 63042
        var featureglan = nlapiGetContext().getFeature('glauditnumbering');
        // using the GL Audit Numbering feature
        if (featureglan == true || featureglan == 'T') {
            var record = nlapiLookupField('transaction', recId, ['trandate', 'currency', 'exchangerate', 'otherrefnum', 'transactionnumber', 'glnumber', 'subsidiary', 'number']);
        } else {
            var record = nlapiLookupField('transaction', recId, ['trandate', 'currency', 'exchangerate', 'otherrefnum', 'transactionnumber', 'subsidiary', 'number']);
        }

        var Tran_Date = record.trandate;
        var Tran_Exch = record.exchangerate;
        var Tran_Othe = record.otherrefnum;
        var Tran_Numb = record.transactionnumber;
        var Doc_Numb = record.number;

        // Using the GL Audit Numbering feature
        if (bookI == 0 && (featureglan == true || featureglan == 'T')) {
            Tran_Glnu = ' ' + record.glnumber;
        }
        nlapiLogExecution('ERROR', '02 - creaTableUno', 'glauditnumbering : ' + featureglan + ' - Tran_Glnu : ' + Tran_Glnu);

        // Etiquetas
        var html = "";
        html += "<div style=\"border: 0px \" align=\"right\" >";
        html += "<table style=\"font-family: Verdana, Arial, Helvetica, sans-serif ; width:270px; margin-top:-40px\">";

        html += "<tr>";
        if (idiomaS == 'es') {
            html += "<td  " + Styl1 + "width = \"22% \"><b>Numero de Documento</b></td>";
        } else {
            html += "<td  " + Styl1 + "width = \"22% \"><b>Document Number:</b></td>";
        }
        html += "<td " + Styl1 + "width = \"5% \" ><b>:</b></td>";
        html += "<td " + Styl1 + "width = \"20% \"><b>" + nlapiEscapeXML(Doc_Numb) + "</b></td>";
        html += "</tr>";


        html += "<tr>";

        if (idiomaS == 'es') {
            html += "<td  " + Styl1 + "width = \"22% \"><b>Numero de Transaccion</b></td>";
        } else {
            html += "<td  " + Styl1 + "width = \"22% \"><b>Transaction Number</b></td>";
        }
        html += "<td " + Styl1 + "width = \"5% \" ><b>:</b></td>";
        html += "<td " + Styl1 + "width = \"20% \"><b>" + Tran_Numb + "</b></td>";
        html += "</tr>";

        // Other Numebet
        if (Tran_Othe != '' && Tran_Othe != null) {
            html += "<tr>";
            if (idiomaS == 'es') {
                html += "<td  " + Styl1 + "width = \"22% \"><b>Numero de Documento</b></td>";
            } else {
                html += "<td  " + Styl1 + "width = \"22% \"><b>Document Number</b></td>";
            }
            html += "<td " + Styl1 + "width = \"5% \" ><b>:</b></td>";
            html += "<td " + Styl1 + "width = \"20% \"><b>" + nlapiEscapeXML(Tran_Othe) + "</b></td>";
            html += "</tr>";
        }

        // using the GL Audit Numbering feature
        if (featureglan == true || featureglan == 'T') {
            html += "<tr>";
            html += "<td " + Styl1 + "width = \"22% \"><b>GL #</b></td>";
            html += "<td " + Styl1 + "width = \"5% \" ><b>:</b></td>";
            html += "<td " + Styl1 + "width = \"20% \"><b>" + Tran_Glnu + "</b></td>";
            html += "</tr>";
        }

        html += "<tr>";
        if (idiomaS == 'es') {
            html += "<td  " + Styl1 + "width = \"22% \"><b>Numero Interno</b></td>";
        } else {
            html += "<td  " + Styl1 + "width = \"22% \"><b>Internal ID</b></td>";
        }
        html += "<td " + Styl1 + "width = \"5% \" ><b>:</b></td>";
        html += "<td " + Styl1 + "width = \"20% \"><b>" + recId + "</b></td>";
        html += "</tr>";

        // Fecha de proceso
        var text_fecha = "Date of processing";
        if (idiomaS == 'es') {
            text_fecha = "Fecha de tramite";
        }
        html += "<tr>";
        html += "<td  " + Styl1 + "width = \"22% \"><b>" + text_fecha + "</b></td>";
        html += "<td  " + Styl1 + "width = \"5% \"><b>:</b></td>";
        html += "<td  " + Styl1 + "width = \"73% \"><b>" + Tran_Date + "</b></td>";
        html += "</tr>";

        var exchangerate = Tran_Exch;
        // Nombre del libro solo para Multibook
        if (bookI) {
            // Nombre del Libro
            var text_accbookname = "Accounting Book";
            if (idiomaS == 'es') {
                text_accbookname = "Libro Contable";
            }
            html += "<tr>";
            html += "<td  " + Styl1 + "width = \"22% \"><b>" + text_accbookname + "</b></td>";
            html += "<td  " + Styl1 + "width = \"5% \"><b>:</b></td>";
            html += "<td  " + Styl1 + "width = \"73% \"><b>" + BookName + "</b></td>";
            html += "</tr>";

            // Moneda del libro
            var text_currency_acc = "Currency Book";
            if (idiomaS == 'es') {
                text_currency_acc = "Moneda del Libro";
            }
            html += "<tr>";
            html += "<td  " + Styl1 + "width = \"22% \"><b>" + text_currency_acc + "</b></td>";
            html += "<td  " + Styl1 + "width = \"5% \"><b>:</b></td>";
            html += "<td  " + Styl1 + "width = \"73% \"><b>" + NameCurren + "</b></td>";
            html += "</tr>";

            // Tipo de cambio
            exchangerate = BookChag;
        }

        if (Number(exchangerate) < 1) {
            exchangerate = Number(exchangerate);
        }

        var text_exchRange = "Exchange Rate";
        if (idiomaS == 'es') {
            text_exchRange = "Tipo de Cambio";
        }
        html += "<tr>";
        html += "<td  " + Styl1 + "width = \"22% \"><b>" + text_exchRange + "</b></td>";
        html += "<td  " + Styl1 + "width = \"5% \"><b>:</b></td>";
        html += "<td  " + Styl1 + "width = \"73% \"><b>" + exchangerate + "</b></td>";
        html += "</tr>";

        // Fin de la tabla
        html += "</table>";
        html += "</div>";
        nlapiLogExecution('ERROR', '02 -wwwb', Doc_Numb);
        // Devuelve el HTML
        return html;

    } catch (err) {
        // Envio del correo al usuario
        nlapiLogExecution('ERROR', 'creaTableUno - Error', err);

        return '';
    }
}

function creaTableDos() {
    try {
        nlapiLogExecution('ERROR', '00 - creaTableDos', 'Table Dos');
        var resultFinal = AgruparCuentas();
        var custsearch = '';
        var totaldebit = 0;
        var totalcredit = 0;
        // Busqueda a utilizar
        var results = getSearchTransaction(recId);

        // Valida si el campo creado por esta vacio
        var empleado = '';
        searchresult = results[0];
        EmpName = searchresult.getText('createdby');
        EmpApro = searchresult.getText('nextapprover');
        if ((EmpName == '' || EmpName == null) && searchresult.getValue('type') == 'Journal') {
            //SETEE CAMPOS CREADO POR Y APROBADO POR
            var estado_log = nlapiLoadRecord('JournalEntry', recId);
            var user = estado_log.getFieldValue('nluser');
            var employee = nlapiLookupField('employee', user, ['firstname', 'lastname'], null);
            empleado = employee.firstname + " " + employee.lastname;
            empleado = nlapiEscapeXML(empleado);
            estado_log = null;
        }

        // Nombre de empleado
        EmpName = nlapiEscapeXML(EmpName);
        EmpApro = nlapiEscapeXML(EmpName);

        if (EmpApro == '' || EmpApro == null) {
            EmpApro = EmpName;
        }
        if (EmpName == '' || EmpName == null) {
            EmpName = empleado;
            EmpApro = empleado;
        }

        // Tabla 2 del PDF
        var html = "";
        html += "<table style=\"font-family: Verdana, Arial, Helvetica, sans-serif; width:100%; border: 1.5px solid #000000 \">";
        html += "<tr>";
        if (idiomaS == 'es') {
            html += "<td " + Stylcab + ' width=\"10\">Cuenta</td>';
            html += "<td " + Stylcab + ' width=\"10\">Importe (Debito)</td>';
            html += "<td " + Stylcab + ' width=\"10\">Importe (Credito) </td>';
            html += "<td " + Stylcab + ' width=\"10\">Nota </td>';
            html += "<td " + Stylcab + ' width=\"20%\">Nombre </td>';
            // Campo Nuevo
            html += "<td " + Stylcab + ' width=\"10\">ID Fiscal</td>';
            // Deparment
            if (FeaDepa) {
                html += "<td " + Stylcab + ' width=\"10\">Departamento </td>';
            }
            // Class
            if (FeaClas) {
                html += "<td " + Stylcab + ' width=\"10\">Clase</td>';
            }
            // Location
            if (FeaLoca) {
                html += "<td " + Stylcab + ' width=\"10\">Ubicación</td>';
            }
        } else {
            html += "<td " + Stylcab + ' width=\"10\">Account </td>';
            html += "<td " + Stylcab + ' width=\"10\">Amount (Debit) </td>';
            html += "<td " + Stylcab + ' width=\"10\">Amount (Credit) </td>';
            html += "<td " + Stylcab + ' width=\"10\">Memo </td>';
            html += "<td " + Stylcab + ' width=\"10\">Name </td>';
            // Campo Nuevo
            html += "<td " + Stylcab + ' width=\"10\">Tax ID </td>';
            // Deparment
            if (FeaDepa) {
                html += "<td " + Stylcab + ' width=\"10\">Department </td>';
            }
            // Class
            if (FeaClas) {
                html += "<td " + Stylcab + ' width=\"10\">Class </td>';
            }
            // Location
            if (FeaLoca) {
                html += "<td " + Stylcab + ' width=\"10\">Location </td>';
            }
        }
        html += "</tr>";

        // TAX ID / Registro de Contribuyente
        var EntityTAX = '';
        if (results.length > 0) {
            var RecordID = results[0].getId();
            var EntityRS = nlapiLookupField('transaction', RecordID, 'entity');
            if (EntityRS != '' && EntityRS != null) {
                var EntityRS = nlapiLookupField('entity', EntityRS, ['custentity_lmry_sv_taxpayer_number', 'custentity_lmry_digito_verificator']);
                EntityTAX = EntityRS.custentity_lmry_sv_taxpayer_number + '-' + EntityRS.custentity_lmry_digito_verificator
            }
            // Nombre del Libro
            BookName = '';
            if (bookI) {
                searchresult = results[0];
                Tran_Glnu = searchresult.getValue('glnumber', 'accountingTransaction');
                BookName = searchresult.getText('accountingbook', 'accountingTransaction');
                if (foreigncurrencymanagement) {
                    NameCurren = searchresult.getValue('basecurrency', 'accountingTransaction');
                }else{
                    NameCurren = searchresult.getText('currency');
                }
                
            } else {
                NameCurren = searchresult.getText('currency');
            }
        }

        var currencyObj = nlapiLoadRecord('currency', currency['value']);
        var currencyPrecision = currencyObj.getFieldValue('currencyprecision');

        // Datos para one world edition
        for (var i = 0; resultFinal != null && i < resultFinal.length; i++) {
            searchresult = results[i];
            var EntityName = cleanText(resultFinal[i][7]);
            // Lineas de detalle del GL
            html += "<tr>";
            // Descripcion de la cuenta
            if (bookI == 0) {
                if (resultFinal[i][2] == '' || resultFinal[i][2] == null) {
                    html += "<td " + Styl3 + ">" + nlapiEscapeXML(resultFinal[i][25]) + "</td>";
                } else {
                    html += "<td " + Styl3 + ">";
                    html += resultFinal[i][1];
                    html += " ";
                    html += nlapiEscapeXML(resultFinal[i][2]);
                    html += "</td>";
                }
            } else {
                html += "<td " + Styl3 + ">";
                var nameacco = resultFinal[i][25];;
                nameacco = nlapiEscapeXML(nameacco);
                html += nameacco;
                html += "</td>";
            }

            // Importes Debit and Credit
            if (resultFinal[i][24] > 0) {
                var debitamount = Number(resultFinal[i][24]);
                var creditamount = 0.00;

            } else {
                var debitamount = 0.00;
                var creditamount = Number(resultFinal[i][24]) * (-1);

            }
            totaldebit = Number(totaldebit) + Number(debitamount);
            totalcredit = Number(totalcredit) + Number(creditamount);

            if (bookI != 0) {
                // Multibook
                BookChag = resultFinal[i][18];
                BookName = resultFinal[i][17];
            }

            debitamount = roundByCurrency(debitamount, currencyPrecision);
            creditamount = roundByCurrency(creditamount, currencyPrecision);


            html += "<td " + Styl2 + ">" + FormatoNumero(parseFloat(debitamount).toFixed(2)) + "</td>";
            html += "<td " + Styl2 + ">" + FormatoNumero(parseFloat(creditamount).toFixed(2)) + "</td>";

            html += "<td " + Styl3 + ">" + nlapiEscapeXML(resultFinal[i][6]) + "</td>";
            html += "<td " + Styl3 + ">" + nlapiEscapeXML(EntityName) + " </td>";
            // Campo Nuevo Codigo de impuesto
            if (EntityName == '' || EntityName == null || resultFinal[i][6] == "VAT") {
                html += "<td " + Styl3 + "></td>";
            } else {
                html += "<td " + Styl3 + ">" + EntityTAX + "</td>";
            }
            // Deparment
            if (FeaDepa) {
                var namedepa = resultFinal[i][10];
                namedepa = nlapiEscapeXML(namedepa);
                html += "<td " + Styl3 + ">" + namedepa + "</td>";
            }
            // Class
            if (FeaClas) {
                var nameclas = resultFinal[i][11];
                nameclas = nlapiEscapeXML(nameclas);
                html += "<td " + Styl3 + ">" + nameclas + "</td>";
            }
            // Location
            if (FeaLoca) {
                var nameloca = resultFinal[i][12];
                nameloca = nlapiEscapeXML(nameloca);
                html += "<td " + Styl3 + ">" + nameloca + "</td>";
            }
            html += "</tr>";
        }

        // html += "<table style=\"font-family: Verdana, Arial, Helvetica, sans-serif; width:100%; border: 1.5px solid #000000 \">";
        html += "<tr>";
        html += "<td " + Stylcab + ' width=\"10\">TOTAL</td>';
        html += "<td " + Stylcab + ' width=\"10\">' + FormatoNumero(parseFloat(totaldebit).toFixed(2)) + '</td>';
        html += "<td " + Stylcab + ' width=\"10\">' + FormatoNumero(parseFloat(totalcredit).toFixed(2)) + '</td>';
        html += "<td " + Stylcab + ' width=\"10\"> </td>';
        html += "<td " + Stylcab + ' width=\"10\"> </td>';
        html += "<td " + Stylcab + ' width=\"10\"> </td>';
        html += "<td " + Stylcab + ' width=\"10\"> </td>';
        html += "<td " + Stylcab + ' width=\"10\"> </td>';
        html += "<td " + Stylcab + ' width=\"10\"> </td>';

        html += "</tr>";
        // Cierra la tabla
        html += "</table>";

        // Devuelve el HTML
        return html;

    } catch (err) {
        // Envio del correo al usuario
        nlapiLogExecution('ERROR', 'creaTableDos - Error', err);

        return '';
    }
}

function FormatoNumero(pNumero, pSimbolo) {
    var separador = ',';
    var sepDecimal = '.';

    if (pNumero != null && pNumero != 'NaN' && pNumero != '') {
        var splitStr = pNumero.split('.');
        var splitLeft = splitStr[0];
        var splitRight = splitStr.length > 1 ? sepDecimal + splitStr[1] : '';
        var regx = /(\d+)(\d{3})/;
        while (regx.test(splitLeft)) {
            splitLeft = splitLeft.replace(regx, '$1' + separador + '$2');
        }
        pSimbolo = pSimbolo || '';
        var valor = pSimbolo + splitLeft + splitRight;
    } else {
        var valor = '';
    }

    return valor;
}

function ObtieneAccounts(RelaID) {

    // Control de Memoria
    var intDMaxReg = 1000;
    var intDMinReg = 0;
    var arrAuxiliar = new Array();
    var arrLibroMag = new Array();

    // Exedio las unidades
    var DbolStop = false;

    // Valida si es OneWorld
    var featuresubs = nlapiGetContext().getFeature('SUBSIDIARIES');
    var _cont = 0;

    if (bookI == 0) {
        // Search sin Multibook : LatamReady - Transaction GL Impact
        savedsearch = nlapiLoadSearch('transaction', 'customsearch_lmry_transaction_gl_impact'); // id de la busqueda
    } else {
        // Search con Multibook : LatamReady - Transaction GL Impact MB
        savedsearch = nlapiLoadSearch('transaction', 'customsearch_lmry_transacti_gl_impact_mb'); // id de la busqueda
        savedsearch.addFilter(new nlobjSearchFilter('accountingbook', 'accountingtransaction', 'anyof', bookI));
    }
    savedsearch.addFilter(new nlobjSearchFilter('internalid', null, 'anyof', RelaID));

    var searchresult = savedsearch.runSearch();
    while (!DbolStop) {
        var objResult = searchresult.getResults(0, 1000);

        if (objResult != null) {
            var intLength = objResult.length;

            for (var i = 0; i < intLength; i++) {
                var saldo;
                columns = objResult[i].getAllColumns();
                arrAuxiliar = new Array();
                if (bookI == 0) {
                    //0. Account
                    if (objResult[i].getValue(columns[0]) != '- None -') {
                        arrAuxiliar[0] = objResult[i].getValue(columns[0]);
                    } else {
                        arrAuxiliar[0] = '';
                    }

                    //1. Account: Number
                    if (objResult[i].getValue(columns[1]) != '- None -') {
                        arrAuxiliar[1] = objResult[i].getValue(columns[1]);
                    } else {
                        arrAuxiliar[1] = '';
                    }
                    //2. Account: Description
                    if (objResult[i].getValue(columns[2]) != '- None -') {
                        arrAuxiliar[2] = objResult[i].getValue(columns[2]).replace(/,/g, ' ');
                    } else {
                        arrAuxiliar[2] = '';
                    }
                    //3. Amount(Debit)
                    if (objResult[i].getValue(columns[3]) != '- None -') {
                        arrAuxiliar[3] = objResult[i].getValue(columns[3]);
                    } else {
                        arrAuxiliar[3] = '';
                    }
                    //4. Amount(Credit)
                    if (bookI == 0 && objResult[i].getValue(columns[4]) != '- None -') {
                        arrAuxiliar[4] = objResult[i].getValue(columns[4]) * (-1);
                    }
                    else if (objResult[i].getValue(columns[4]) != '- None -') {
                        arrAuxiliar[4] = objResult[i].getValue(columns[4]);
                    } else {
                        arrAuxiliar[4] = '';
                    }
                    //5. Posting
                    if (objResult[i].getValue(columns[5]) != '- None -') {
                        arrAuxiliar[5] = objResult[i].getValue(columns[5]);
                    } else {
                        arrAuxiliar[5] = '';
                    }
                    //6. Memo
                    if (objResult[i].getValue(columns[6]) != '- None -') {
                        arrAuxiliar[6] = objResult[i].getValue(columns[6]);
                    } else {
                        arrAuxiliar[6] = '';
                    }
                    //7. Name
                    if (objResult[i].getValue(columns[7]) != '- None -') {
                        arrAuxiliar[7] = objResult[i].getText(columns[7]);
                    } else {
                        arrAuxiliar[7] = '';
                    }
                    //8. Date
                    if (objResult[i].getValue(columns[8]) != '- None -') {
                        arrAuxiliar[8] = objResult[i].getValue(columns[8]);
                    } else {
                        arrAuxiliar[8] = '';
                    }
                    //9. Currency
                    if (objResult[i].getValue(columns[9]) != '- None -') {
                        arrAuxiliar[9] = objResult[i].getValue(columns[9]);
                    } else {
                        arrAuxiliar[9] = '';
                    }
                    //10. Department
                    if (objResult[i].getValue(columns[10]) != '- None -') {
                        arrAuxiliar[10] = objResult[i].getText(columns[10]);
                    } else {
                        arrAuxiliar[10] = '';
                    }
                    //11. Class
                    if (objResult[i].getValue(columns[11]) != '- None -') {
                        arrAuxiliar[11] = objResult[i].getText(columns[11]);
                    } else {
                        arrAuxiliar[11] = '';
                    }
                    //12. Location
                    if (objResult[i].getValue(columns[12]) != '- None -') {
                        arrAuxiliar[12] = objResult[i].getText(columns[12]);
                    } else {
                        arrAuxiliar[12] = '';
                    }
                    //13. Subsidiary
                    if (objResult[i].getValue(columns[13]) != '- None -') {
                        arrAuxiliar[13] = objResult[i].getValue(columns[13]);
                    } else {
                        arrAuxiliar[13] = '';
                    }
                    //14. Account Type
                    if (objResult[i].getValue(columns[14]) != '- None -') {
                        arrAuxiliar[14] = objResult[i].getValue(columns[14]);
                    } else {
                        arrAuxiliar[14] = '';
                    }
                    //15. Created by
                    if (objResult[i].getValue(columns[15]) != '- None -') {
                        arrAuxiliar[15] = objResult[i].getValue(columns[15]);
                    } else {
                        arrAuxiliar[15] = '';
                    }
                    //16. Next Approver
                    if (objResult[i].getValue(columns[16]) != '- None -') {
                        arrAuxiliar[16] = objResult[i].getValue(columns[16]);
                    } else {
                        arrAuxiliar[16] = '';
                    }
                    //17. en blanco
                    arrAuxiliar[17] = '';
                    //18. en blanco
                    arrAuxiliar[18] = '';
                    //19. en blanco
                    arrAuxiliar[19] = '';
                    //20. en blanco
                    arrAuxiliar[20] = '';
                    //21. Type
                    if (objResult[i].getValue(columns[17]) != '- None -') {
                        arrAuxiliar[17] = objResult[i].getValue(columns[17]);
                    } else {
                        arrAuxiliar[17] = '';
                    }
                    //21. en blanco
                    arrAuxiliar[22] = '';
                    //22. en blanco
                    arrAuxiliar[23] = '';

                    //24. en blanco
                    arrAuxiliar[24] = arrAuxiliar[3] + arrAuxiliar[4];

                    //25.name get text del account
                    if (objResult[i].getValue(columns[0]) != '- None -') {
                        arrAuxiliar[25] = objResult[i].getText(columns[0]);
                    } else {
                        arrAuxiliar[25] = '';
                    }



                    arrLibroMag[_cont] = arrAuxiliar;
                    _cont++;
                } else {

                    //0. Multibook Accounting: Account
                    if (objResult[i].getValue(columns[0]) != '- None -') {
                        arrAuxiliar[0] = objResult[i].getValue(columns[0]);
                    } else {
                        arrAuxiliar[0] = '';
                    }
                    //1. Account: Number
                    if (objResult[i].getValue(columns[1]) != '- None -') {
                        arrAuxiliar[1] = objResult[i].getValue(columns[1]);
                    } else {
                        arrAuxiliar[1] = '';
                    }
                    //2. Account: Description
                    if (objResult[i].getValue(columns[2]) != '- None -') {
                        arrAuxiliar[2] = objResult[i].getValue(columns[2]).replace(/,/g, ' ');
                    } else {
                        arrAuxiliar[2] = '';
                    }
                    //3. Multibook Amount(Debit)
                    if (objResult[i].getValue(columns[3]) != '- None -') {
                        arrAuxiliar[3] = objResult[i].getValue(columns[3]);
                    } else {
                        arrAuxiliar[3] = '';
                    }
                    //4. Multibook Amount(Credit)
                    if (objResult[i].getValue(columns[4]) != '- None -') {
                        arrAuxiliar[4] = Number(objResult[i].getValue(columns[4])) * (-1);
                    } else {
                        arrAuxiliar[4] = '';
                    }
                    //5. Posting
                    if (objResult[i].getValue(columns[5]) != '- None -') {
                        arrAuxiliar[5] = objResult[i].getValue(columns[5]);
                    } else {
                        arrAuxiliar[5] = '';
                    }
                    //6. Memo
                    if (objResult[i].getValue(columns[6]) != '- None -') {
                        arrAuxiliar[6] = objResult[i].getValue(columns[6]);
                    } else {
                        arrAuxiliar[6] = '';
                    }
                    //7. Name
                    if (objResult[i].getValue(columns[7]) != '- None -') {
                        arrAuxiliar[7] = objResult[i].getText(columns[7]);
                    } else {
                        arrAuxiliar[7] = '';
                    }
                    //8. Date
                    if (objResult[i].getValue(columns[8]) != '- None -') {
                        arrAuxiliar[8] = objResult[i].getValue(columns[8]);
                    } else {
                        arrAuxiliar[8] = '';
                    }
                    //9. Currency
                    if (objResult[i].getValue(columns[9]) != '- None -') {
                        arrAuxiliar[9] = objResult[i].getValue(columns[9]);
                    } else {
                        arrAuxiliar[9] = '';
                    }
                    //10. Department
                    if (objResult[i].getValue(columns[10]) != '- None -') {
                        arrAuxiliar[10] = objResult[i].getText(columns[10]);
                    } else {
                        arrAuxiliar[10] = '';
                    }
                    //11. Class
                    if (objResult[i].getValue(columns[11]) != '- None -') {
                        arrAuxiliar[11] = objResult[i].getText(columns[11]);
                    } else {
                        arrAuxiliar[11] = '';
                    }
                    //12. Location
                    if (objResult[i].getValue(columns[12]) != '- None -') {
                        arrAuxiliar[12] = objResult[i].getText(columns[12]);
                    } else {
                        arrAuxiliar[12] = '';
                    }
                    //13. Subsidiary
                    if (objResult[i].getValue(columns[13]) != '- None -') {
                        arrAuxiliar[13] = objResult[i].getValue(columns[13]);
                    } else {
                        arrAuxiliar[13] = '';
                    }
                    //14. Account Type
                    if (objResult[i].getValue(columns[14]) != '- None -') {
                        arrAuxiliar[14] = objResult[i].getValue(columns[14]);
                    } else {
                        arrAuxiliar[14] = '';
                    }
                    //15. Created by
                    if (objResult[i].getValue(columns[15]) != '- None -') {
                        arrAuxiliar[15] = objResult[i].getValue(columns[15]);
                    } else {
                        arrAuxiliar[15] = '';
                    }
                    //16. Next Approver
                    if (objResult[i].getValue(columns[16]) != '- None -') {
                        arrAuxiliar[16] = objResult[i].getValue(columns[16]);
                    } else {
                        arrAuxiliar[16] = '';
                    }
                    //17. Multibook Accounting: AccountingBook
                    if (objResult[i].getValue(columns[17]) != '- None -') {
                        arrAuxiliar[17] = objResult[i].getText(columns[17]);
                    } else {
                        arrAuxiliar[17] = '';
                    }
                    //18. Multibook Accounting: Exchange Rate
                    if (objResult[i].getValue(columns[18]) != '- None -') {
                        arrAuxiliar[18] = objResult[i].getValue(columns[18]);
                    } else {
                        arrAuxiliar[18] = '';
                    }
                    //19. Multibook Accounting: Base Currency
                    if (objResult[i].getValue(columns[19]) != '- None -') {
                        arrAuxiliar[19] = objResult[i].getValue(columns[19]);
                    } else {
                        arrAuxiliar[19] = '';
                    }
                    //20. Multibook Accounting: GL#
                    if (objResult[i].getValue(columns[20]) != '- None -') {
                        arrAuxiliar[20] = objResult[i].getValue(columns[20]);
                    } else {
                        arrAuxiliar[20] = '';
                    }
                    //21. Type
                    if (objResult[i].getValue(columns[21]) != '- None -') {
                        arrAuxiliar[21] = objResult[i].getValue(columns[21]);
                    } else {
                        arrAuxiliar[21] = '';
                    }
                    //22. Line Unique Key
                    if (objResult[i].getValue(columns[22]) != '- None -') {
                        arrAuxiliar[22] = objResult[i].getValue(columns[22]);
                    } else {
                        arrAuxiliar[22] = '';
                    }
                    //23. Custom Script
                    if (objResult[i].getValue(columns[23]) != '- None -') {
                        arrAuxiliar[23] = objResult[i].getValue(columns[23]);
                    } else {
                        arrAuxiliar[23] = '';
                    }
                    //24. sumatoria de debit y credit

                    arrAuxiliar[24] = arrAuxiliar[3] + arrAuxiliar[4];

                    //25.name get text del account
                    if (objResult[i].getValue(columns[0]) != '- None -') {
                        arrAuxiliar[25] = objResult[i].getText(columns[0]);
                    } else {
                        arrAuxiliar[25] = '';
                    }


                    arrLibroMag[_cont] = arrAuxiliar;
                    _cont++;

                }

            }
            intDMinReg = intDMaxReg;
            intDMaxReg += 1000;
            if (intLength < 1000) {
                DbolStop = true;
            }
        } else {
            DbolStop = true;
        }
    }

    return arrLibroMag;
}

function AgruparCuentas() {
    var resultado = new Array();
    var resultadoa = new Array();
    var arrTempAccount = [];
    var resultsBusReten = '';
    var resultsBus = ObtieneAccounts(recId);
    for (var i = 0; resultsBus != null && i < resultsBus.length; i++) {
        resultado.push(resultsBus[i]);
    }

    /* ************************* */
    /* Agregamos las retenciones */
    /* ************************* */
    // nlapiLogExecution('ERROR', 'Relacion de WHT id??', recId);
    var results = nlapiSearchRecord("transaction", null,
        [
            ["mainline", "is", "T"],
            "AND",
            ["custbody_lmry_reference_transaction", "anyof", recId],
        ],
        [
            new nlobjSearchColumn("internalid").setSort(false),
            new nlobjSearchColumn("type"),
            new nlobjSearchColumn("tranid"),
            new nlobjSearchColumn("trandate"),
            new nlobjSearchColumn("memomain")
        ]
    );
    // Valida si tiene retenciones
    if (results != '' && results != null) {

        if (results.length > 0) {
            // Internal ID de Relate transaction
            var RelaID = 0;
            var resultsBusReten = new Array();
            for (var i = 0; results != null && i < results.length; i++) {
                searchresult = results[i];
                if (searchresult.getValue('memomain').indexOf(' RE ') != -1) {
                    continue;
                }
                // Valida que no exista varios
                if (RelaID != searchresult.getValue('internalid')) {
                    RelaID = searchresult.getValue('internalid');
                    var resultsBusReten = ObtieneAccounts(RelaID);


                    for (var j = 0; resultsBusReten != null && j < resultsBusReten.length; j++) {
                        resultadoa.push(resultsBusReten[j]);
                    }

                }

            }
        }

    }

    for (var i = 0; resultadoa != null && i < resultadoa.length; i++) {
        resultado.push(resultadoa[i]);
    }
    for (var i = 0; resultado != null && i < resultado.length; i++) {
        arrTempAccount.push(resultado[i]);
    }
    ArrAgrupado = SumaAccount(arrTempAccount);
    return ArrAgrupado;
}

function SumaAccount(ArrTemp) {

    var aux = [];
    if (ArrTemp != null) {

        var long = ArrTemp.length;
        for (var i = 0; i < long - 1; i++) {
            for (var j = 0; j < long - 1; j++) {
                if (Number(ArrTemp[j][0]) > Number(ArrTemp[j + 1][0])) {
                    var temp = ArrTemp[j + 1];
                    ArrTemp[j + 1] = ArrTemp[j];
                    ArrTemp[j] = temp;
                }
            }
        }

        for (var x = 0; x < long; x++) {
            var auxiliar = new Array();
            auxiliar[0] = ArrTemp[x][0];
            auxiliar[1] = ArrTemp[x][1];
            auxiliar[2] = ArrTemp[x][2];
            auxiliar[3] = ArrTemp[x][3];
            auxiliar[4] = ArrTemp[x][4];
            auxiliar[5] = ArrTemp[x][5];
            auxiliar[6] = ArrTemp[x][6];
            auxiliar[7] = ArrTemp[x][7];
            auxiliar[8] = ArrTemp[x][8];
            auxiliar[9] = ArrTemp[x][9];
            auxiliar[10] = ArrTemp[x][10];
            auxiliar[11] = ArrTemp[x][11];
            auxiliar[12] = ArrTemp[x][12];
            auxiliar[13] = ArrTemp[x][13];
            auxiliar[14] = ArrTemp[x][14];
            auxiliar[15] = ArrTemp[x][15];
            auxiliar[16] = ArrTemp[x][16];
            auxiliar[17] = ArrTemp[x][17];
            auxiliar[18] = ArrTemp[x][18];
            auxiliar[19] = ArrTemp[x][19];
            auxiliar[20] = ArrTemp[x][20];
            auxiliar[21] = ArrTemp[x][21];
            auxiliar[22] = ArrTemp[x][22];
            auxiliar[23] = ArrTemp[x][23];
            //sumatoria amount 
            auxiliar[24] = ArrTemp[x][24];
            //name del account
            auxiliar[25] = ArrTemp[x][25];

            if (x != long - 1) {
                while (((ArrTemp[x][0] == ArrTemp[x + 1][0]))) {
                    auxiliar[24] = Number(auxiliar[24]) + Number(ArrTemp[x + 1][24]);
                    x++;

                    if (x == long - 1) {
                        break;
                    }
                }
            }
            aux.push(auxiliar);

        }
        return aux;
    } else {
        return aux;
    }

}

/* ****************************************** */
/*    Creacion de GL Impact WHT en CSV        */
/* ****************************************** */
function Create_GLWHT_CSV(request, response) {
    try {
        var totaldebit = 0;
        var totalcredit = 0;
        // Envia al log del script
        nlapiLogExecution(
            "ERROR",
            "Create_GLWHT_CSV",
            "ID: " + recId + " - Book: " + bookI
        );
        //busuqeda con todos los datos agrupado rtenciones y glimpact

        // Nombre de la Subsidiaria y Moneda
        var NameSubsid = "";
        var subsID = 0;
        if (featuresubs == true) {
            subsID = nlapiLookupField("transaction", recId, "subsidiary");
            NameSubsid = nlapiLookupField("subsidiary", subsID, "legalname");
        } else {
            // Datos para mid makert edition
            var configpage = nlapiLoadConfiguration("companyinformation");
            NameSubsid = configpage.getFieldValue("companyname");
            configpage = null;
        }
        NameSubsid = cleanText(NameSubsid);
        // Envia al log del script
        nlapiLogExecution("ERROR", "Create_GLWHT_CSV", "NameSubsid: " + NameSubsid);

        // Variable de Archivo de salida
        var FileDemi = ",";
        var FileBodyCSV = "";
        if (idiomaS == "es") {
            if (bookI) {
                FileBodyCSV += "Libro Contable" + FileDemi;
            }
            FileBodyCSV += "Cuenta" + FileDemi;
            FileBodyCSV += "Importe (debito)" + FileDemi;
            FileBodyCSV += "Importe (credito)" + FileDemi;
            FileBodyCSV += "Moneda base" + FileDemi;
            FileBodyCSV += "Contabilización" + FileDemi;
            FileBodyCSV += "Observaciones" + FileDemi;
            FileBodyCSV += "Nombre" + FileDemi;
            FileBodyCSV += "ID Fiscal" + FileDemi;
            FileBodyCSV += "Subsidiaria";
            // Deparment
            if (FeaDepa) {
                FileBodyCSV += FileDemi + "Departmento";
            }
            // Class
            if (FeaClas) {
                FileBodyCSV += FileDemi + "Clase";
            }
            // Location
            if (FeaLoca) {
                FileBodyCSV += FileDemi + "Ubicación";
            }
        } else {
            if (bookI) {
                FileBodyCSV += "Accounting Book" + FileDemi;
            }
            FileBodyCSV += "Account" + FileDemi;
            FileBodyCSV += "Amount (debit)" + FileDemi;
            FileBodyCSV += "Amount (credit)" + FileDemi;
            FileBodyCSV += "Base Currency" + FileDemi;
            FileBodyCSV += "Posting" + FileDemi;
            FileBodyCSV += "Memo" + FileDemi;
            FileBodyCSV += "Name" + FileDemi;
            FileBodyCSV += "TAX ID" + FileDemi;
            FileBodyCSV += "Subsidiary";
            // Deparment
            if (FeaDepa) {
                FileBodyCSV += FileDemi + "Department";
            }
            // Class
            if (FeaClas) {
                FileBodyCSV += FileDemi + "Class";
            }
            // Location
            if (FeaLoca) {
                FileBodyCSV += FileDemi + "Location";
            }
        }
        FileBodyCSV += "\n";

        // Busqueda a utilizar
        var results = getSearchTransaction(recId);
        var resultFinalCSV = AgruparCuentas();
        if (results.length > 0) {
            // TAX ID / Registro de Contribuyente
            var EntityTAX = "";
            if (results.length > 0) {
                var RecordID = results[0].getId();
                var searchCurrency = nlapiSearchRecord(
                    "transaction",
                    null,
                    [["internalid", "anyof", RecordID]],
                    [new nlobjSearchColumn("entity"), new nlobjSearchColumn("currency")]
                );
                var EntityRS = searchCurrency[0].getValue("entity");
                var currencyBody = searchCurrency[0].getText("currency");

                if (EntityRS != "" && EntityRS != null) {
                    EntityRS = nlapiLookupField("entity", EntityRS, [
                        "custentity_lmry_sv_taxpayer_number",
                        "custentity_lmry_digito_verificator",
                    ]);
                    EntityTAX =
                        EntityRS.custentity_lmry_sv_taxpayer_number +
                        "-" +
                        EntityRS.custentity_lmry_digito_verificator;
                }
                // Nombre del Libro
                var BookName = "";
                if (bookI) {
                    searchresult = results[0];
                    BookName = searchresult.getText(
                        "accountingbook",
                        "accountingTransaction"
                    );
                    if (foreigncurrencymanagement) {
                        NameCurren = searchresult.getValue(
                            "basecurrency",
                            "accountingTransaction"
                        );
                    }else{
                        NameCurren = currencyBody;
                    }
                    
                } else {
                    NameCurren = currencyBody;
                }
            }

            // Presicion de la moneda
            var currencyObj = nlapiLoadRecord("currency", currency["value"]);
            var currencyPrecision = currencyObj.getFieldValue("currencyprecision");

            // Resultados de la busqueda
            for (
                var i = 0;
                resultFinalCSV != null && i < resultFinalCSV.length;
                i++
            ) {
                var EntityName = cleanText(resultFinalCSV[i][7]);
                var nameacco = "";
                var debitamount = 0;
                var creditamount = 0;
                if (bookI == 0) {
                    //busqueda sin multibook
                    // Descripcion de la cuenta
                    if (resultFinalCSV[i][2] == "" || resultFinalCSV[i][2] == null) {
                        nameacco = resultFinalCSV[i][25];
                    } else {
                        nameacco = resultFinalCSV[i][1];
                        nameacco += " ";
                        nameacco += nlapiEscapeXML(resultFinalCSV[i][2]);
                    }
                    // Importes Debit and Credit
                    if (resultFinalCSV[i][24] > 0) {
                        debitamount = resultFinalCSV[i][24];
                        creditamount = 0.0;
                    } else {
                        debitamount = 0.0;
                        creditamount = Number(resultFinalCSV[i][24]) * -1;
                    }
                } else {
                    // Descripcion de la cuenta
                    nameacco = resultFinalCSV[i][25];
                    // Importes Debit and Credit
                    // Importes Debit and Credit
                    if (resultFinalCSV[i][24] > 0) {
                        debitamount = resultFinalCSV[i][24];
                        creditamount = 0.0;
                    } else {
                        debitamount = 0.0;
                        creditamount = Number(resultFinalCSV[i][24]) * -1;
                    }
                }
                totaldebit = Number(totaldebit) + Number(debitamount);
                totalcredit = Number(totalcredit) + Number(creditamount);

                debitamount = roundByCurrency(debitamount, currencyPrecision);
                creditamount = roundByCurrency(creditamount, currencyPrecision);

                // Lineas del archivo
                if (bookI) {
                    FileBodyCSV += BookName + FileDemi;
                }
                FileBodyCSV += nameacco + FileDemi;
                FileBodyCSV += debitamount + FileDemi;
                FileBodyCSV += creditamount + FileDemi;
                FileBodyCSV += NameCurren + FileDemi;
                FileBodyCSV += resultFinalCSV[i][5] + FileDemi;
                FileBodyCSV += resultFinalCSV[i][6] + FileDemi;
                FileBodyCSV += EntityName + FileDemi;
                // Campo Nuevo Codigo de impuesto
                if (
                    EntityName == "" ||
                    EntityName == null ||
                    resultFinalCSV[i][6] == "VAT"
                ) {
                    FileBodyCSV += "" + FileDemi;
                } else {
                    FileBodyCSV += EntityTAX + FileDemi;
                }
                // Nombre de la Subsidiaria
                FileBodyCSV += NameSubsid;
                // Deparment
                if (FeaDepa) {
                    FileBodyCSV += FileDemi + resultFinalCSV[i][10];
                }
                // Class
                if (FeaClas) {
                    FileBodyCSV += FileDemi + resultFinalCSV[i][11];
                }
                // Location
                if (FeaLoca) {
                    FileBodyCSV += FileDemi + resultFinalCSV[i][12];
                }
                FileBodyCSV += "\n";
            }
            nlapiLogExecution("ERROR", "debitamount", debitamount);
            nlapiLogExecution("ERROR", "creditamount", creditamount);

            totaldebit = roundByCurrency(totaldebit, currencyPrecision);
            totalcredit = roundByCurrency(totalcredit, currencyPrecision);
            FileBodyCSV += FileDemi + "Total";
            FileBodyCSV += FileDemi + totaldebit;
            FileBodyCSV += FileDemi + totalcredit;

            nlapiLogExecution("ERROR", "Create_GLWHT_XLS", totaldebit);
            nlapiLogExecution("ERROR", "Create_GLWHT_XLS", totalcredit);

            // Crea el CSV
            var myCSVName = "LatamReady_CO_WHT_GL_Impact_" + recId + ".csv";
            var myCSVfile = nlapiCreateFile(myCSVName, "CSV", FileBodyCSV);

            // Muestra el solo el ultimo CSV en Pantalla
            response.setContentType(
                "CSV",
                "LatamReady_CO_WHT_GL_Impact_" + recId + ".csv",
                "inline"
            );
            response.write(myCSVfile.getValue());
        }
    } catch (err) {
        // Log de errores
        nlapiLogExecution("ERROR", "Create_GLWHT_CSV - Error", err);
    }
}
/* ========================================== */
/*      Fin de GL Impact WHT en CSV           */
/* ========================================== */

/* ****************************************** */
/*    Creacion de GL Impact WHT en XLS        */
/* ****************************************** */
function Create_GLWHT_XLS(request, response) {
    try {

        var totaldebit = 0;
        var totalcredit = 0;
        // Envia al log del script
        nlapiLogExecution('ERROR', 'Create_GLWHT_XLS', 'ID: ' + recId + ' - Book: ' + bookI);

        var FileBodyXLS = '\r\n<?xml version="1.0"?>';
        FileBodyXLS += '\r\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
        FileBodyXLS += '\r\nxmlns:o="urn:schemas-microsoft-com:office:office" ';
        FileBodyXLS += '\r\nxmlns:x="urn:schemas-microsoft-com:office:excel" ';
        FileBodyXLS += '\r\nxmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
        FileBodyXLS += '\r\nxmlns:html="http://www.w3.org/TR/REC-html40">';

        // Estilos
        FileBodyXLS += '\r\n<Styles> ';
        FileBodyXLS += '\r\n<Style ss:ID="Default" ss:Name="Normal"> ';
        FileBodyXLS += '\r\n<Alignment ss:Vertical="Bottom"/> ';
        FileBodyXLS += '\r\n<Borders/> ';
        FileBodyXLS += '\r\n<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/> ';
        FileBodyXLS += '\r\n<Interior/> ';
        FileBodyXLS += '\r\n<NumberFormat/> ';
        FileBodyXLS += '\r\n<Protection/> ';
        FileBodyXLS += '\r\n</Style> ';
        FileBodyXLS += '\r\n<Style ss:ID="s76"> ';
        FileBodyXLS += '\r\n<Alignment ss:Horizontal="Center" ss:Vertical="Bottom" ss:WrapText="1"/> ';
        FileBodyXLS += '\r\n<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/> ';
        FileBodyXLS += '\r\n<Interior ss:Color="#4472C4" ss:Pattern="Solid"/> ';
        FileBodyXLS += '\r\n</Style> ';
        FileBodyXLS += '<Style ss:ID="s23"><Font ss:Bold="1"/><Alignment ss:Vertical="Bottom"/><NumberFormat ss:Format="_(* #,##0.00_);_(* \(#,##0.00\);_(* &quot;-&quot;??_);_(@_)"/></Style>';
        FileBodyXLS += '\r\n</Styles> ';

        // Hoja
        FileBodyXLS += '\r\n<Worksheet ss:Name="Sheet1">';
        // Inicio de la tabla
        FileBodyXLS += '\r\n<Table>';
        // Titulo de Columnas
        FileBodyXLS += '\r\n<Row ss:AutoFitHeight="0" ss:Height="30">';
        if (idiomaS == 'es') {
            if (bookI) {
                FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Libro Contable' + '</Data></Cell>';
            }
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Cuenta' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Importe (debito)' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Importe (credito)' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Moneda base' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Contabilización' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Nota' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Nombre' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'ID Fiscal' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Subsidiaria' + '</Data></Cell>';
            // Deparment
            if (FeaDepa) {
                FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Departmento' + '</Data></Cell>';
            }
            // Class
            if (FeaClas) {
                FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Clase' + '</Data></Cell>';
            }
            // Location
            if (FeaLoca) {
                FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Ubicación' + '</Data></Cell>';
            }
        } else {
            if (bookI) {
                FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Accounting Book' + '</Data></Cell>';
            }
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Account' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Amount (debit)' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Amount (credit)' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Base Currency' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Posting' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Memo' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Name' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'TAX ID' + '</Data></Cell>';
            FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Subsidiary' + '</Data></Cell>';
            // Deparment
            if (FeaDepa) {
                FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Department' + '</Data></Cell>';
            }
            // Class
            if (FeaClas) {
                FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Class' + '</Data></Cell>';
            }
            // Location
            if (FeaLoca) {
                FileBodyXLS += '<Cell ss:StyleID="s76"><Data ss:Type="String">' + 'Location' + '</Data></Cell>';
            }
        }
        FileBodyXLS += '\r\n</Row>';
        // Fin de Columnas

        // Envia al log del script
        nlapiLogExecution('ERROR', 'Create_GLWHT_XLS', 'Events: ' + 'Titulo de Columnas');

        // Nombre de la Subsidiaria y Moneda
        var NameSubsid = '';
        var subsID = 0;
        if (featuresubs == true) {
            subsID = nlapiLookupField('transaction', recId, 'subsidiary');
            NameComp = nlapiLookupField('subsidiary', subsID, 'legalname');
        } else {
            // Datos para mid makert edition
            var configpage = nlapiLoadConfiguration('companyinformation');
            NameComp = configpage.getFieldValue('companyname');
            configpage = null;
        }
        NameSubsid = cleanText(nlapiEscapeXML(NameComp));
        // Envia al log del script
        nlapiLogExecution('ERROR', 'Create_GLWHT_XLS', 'NameSubsid: ' + NameSubsid);

        // Busqueda a utilizar
        var results = getSearchTransaction(recId);
        var resultFinalXLS = AgruparCuentas();
        if (results.length > 0) {
            // TAX ID / Registro de Contribuyente
            var EntityTAX = '';
            if (results.length > 0) {
                var RecordID = results[0].getId();

                var searchCurrency = nlapiSearchRecord("transaction", null,
                    [
                        ["internalid", "anyof", RecordID]
                    ],
                    [
                        new nlobjSearchColumn("entity"),
                        new nlobjSearchColumn("currency")
                    ]
                );
                var EntityRS = searchCurrency[0].getValue('entity');
                var currencyBody = searchCurrency[0].getText('currency');
                if (EntityRS != '' && EntityRS != null) {
                    EntityRS = nlapiLookupField('entity', EntityRS, ['custentity_lmry_sv_taxpayer_number', 'custentity_lmry_digito_verificator']);
                    EntityTAX = EntityRS.custentity_lmry_sv_taxpayer_number + '-' + EntityRS.custentity_lmry_digito_verificator;
                }
                // Nombre del Libro
                var BookName = '';
                if (bookI ) {
                    searchresult = results[0];
                    BookName = searchresult.getText('accountingbook', 'accountingTransaction');

                    if (foreigncurrencymanagement) {
                        NameCurren = searchresult.getValue('basecurrency', 'accountingTransaction');
                    }else{
                        NameCurren = currencyBody;
                    }
                    
                } else {
                    NameCurren = currencyBody;
                }
            }

            // Presicion de la moneda
            var currencyObj = nlapiLoadRecord('currency', currency['value']);
            var currencyPrecision = currencyObj.getFieldValue('currencyprecision');

            _StyleNum = ' ss:StyleID="s23" ';
            // Resultados de la busqueda
            for (var i = 0; resultFinalXLS != null && i < resultFinalXLS.length; i++) {

                var EntityName = cleanText(nlapiEscapeXML(resultFinalXLS[i][7]));
                var nameacco = '';
                var debitamount = 0;
                var creditamount = 0;
                if (bookI == 0) {
                    // Descripcion de la cuenta
                    if (resultFinalXLS[i][2] == '' || resultFinalXLS[i][2] == null) {
                        nameacco = resultFinalXLS[i][25];
                    } else {
                        nameacco = resultFinalXLS[i][1];
                        nameacco += " ";
                        nameacco += nlapiEscapeXML(resultFinalXLS[i][2]);

                    }
                    // Importes Debit and Credit
                    if (resultFinalXLS[i][24] > 0) {
                        debitamount = resultFinalXLS[i][24];
                        creditamount = 0.00;
                    } else {
                        debitamount = 0.00;
                        creditamount = Number(resultFinalXLS[i][24]) * (-1);
                    }

                } else {
                    // Descripcion de la cuenta
                    nameacco = resultFinalXLS[i][25];
                    // Importes Debit and Credit
                    if (resultFinalXLS[i][24] > 0) {
                        debitamount = resultFinalXLS[i][24];
                        creditamount = 0.0;
                    } else {
                        debitamount = 0.0;
                        creditamount = Number(resultFinalXLS[i][24]) * (-1);
                    }
                }

                totaldebit = Number(totaldebit) + Number(debitamount);
                totalcredit = Number(totalcredit) + Number(creditamount);

                nameacco = nlapiEscapeXML(nameacco);
                debitamount = roundByCurrency(debitamount, currencyPrecision);
                creditamount = roundByCurrency(creditamount, currencyPrecision);

                // Detalle de la Lineas
                FileBodyXLS += '\r\n<Row ss:AutoFitHeight="0">';

                // Lineas del archivo
                if (bookI) {
                    FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + BookName + '</Data></Cell>';
                }
                FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + nameacco + '</Data></Cell>';

                // FileBodyXLS += '\r\n<Cell><Data ss:Type="Number">' + FormatoNumero(parseFloat(debitamount).toFixed(2)) + '</Data></Cell>';
                FileBodyXLS += '<Cell ' + _StyleNum + '><Data ss:Type="Number">' + Math.abs(debitamount) + '</Data></Cell>';
                FileBodyXLS += '<Cell ' + _StyleNum + '><Data ss:Type="Number">' + Math.abs(creditamount) + '</Data></Cell>';

                FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + NameCurren + '</Data></Cell>';
                FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + resultFinalXLS[i][5] + '</Data></Cell>';
                FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + nlapiEscapeXML(resultFinalXLS[i][6]) + '</Data></Cell>';
                FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + EntityName + '</Data></Cell>';
                // Campo Nuevo Codigo de impuesto
                if (EntityName == '' || EntityName == null || resultFinalXLS[i][6] == "VAT") {
                    FileBodyXLS += '\r\n<Cell><Data ss:Type="String"></Data></Cell>';
                } else {
                    FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + EntityTAX + '</Data></Cell>';
                }
                // Nombre de la Subsidiaria
                FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + NameSubsid + '</Data></Cell>';
                // Deparment
                if (FeaDepa) {
                    FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + resultFinalXLS[i][10] + '</Data></Cell>';
                }
                // Class
                if (FeaClas) {
                    FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + resultFinalXLS[i][11] + '</Data></Cell>';
                }
                // Location
                if (FeaLoca) {
                    FileBodyXLS += '\r\n<Cell><Data ss:Type="String">' + resultFinalXLS[i][12] + '</Data></Cell>';
                }
                // Detalle fin de la Lineas
                FileBodyXLS += '\r\n</Row>';
            }

        }

        // // Detalle del total
        FileBodyXLS += '\r\n<Row ss:AutoFitHeight="0">';
        FileBodyXLS += '<Cell ss:MergeAcross="1" ss:StyleID="s76"><Data ss:Type="String">' + 'TOTAL' + '</Data></Cell>';
        FileBodyXLS += '<Cell ' + _StyleNum + '><Data ss:Type="Number">' + Math.abs(totaldebit) + '</Data></Cell>';
        FileBodyXLS += '<Cell ' + _StyleNum + '><Data ss:Type="Number">' + Math.abs(totalcredit) + '</Data></Cell>';

        FileBodyXLS += '\r\n</Row>';

        // Fin de la tabla
        FileBodyXLS += '\r\n</Table>';
        FileBodyXLS += '\r\n</Worksheet>';
        FileBodyXLS += '\r\n</Workbook>';

        // Formato en Base64
        FileBodyXLS = nlapiEncrypt(FileBodyXLS, 'base64');

        // Crea el XLS
        var myXLSName = 'LatamReady_CO_WHT_GL_Impact_' + recId + '.xls';
        var myXLSfile = nlapiCreateFile(myXLSName, 'EXCEL', FileBodyXLS);

        // Muestra el solo el ultimo CSV en Pantalla
        response.setContentType('EXCEL', 'LatamReady_CO_WHT_GL_Impact_' + recId + '.xls', 'inline');
        response.write(myXLSfile.getValue());

    } catch (err) {
        // Log de errores
        nlapiLogExecution('ERROR', 'Create_GLWHT_XLS - Error', err);
    }
}
/* ========================================== */
/*      Fin de GL Impact WHT en XLS           */
/* ========================================== */

/* ****************************************** */
/*    Funciones para todo el proceso          */
/* ****************************************** */
function getSearchTransaction(RelaID) {
    try {
        if (bookI == 0) {
            // Search sin Multibook : LatamReady - Transaction GL Impact
            custsearch = nlapiLoadSearch('transaction', 'customsearch_lmry_transaction_gl_impact'); // id de la busqueda
        } else {
            // Search con Multibook : LatamReady - Transaction GL Impact MB
            custsearch = nlapiLoadSearch('transaction', 'customsearch_lmry_transacti_gl_impact_mb'); // id de la busqueda
            custsearch.addFilter(new nlobjSearchFilter('accountingbook', 'accountingtransaction', 'anyof', bookI));
        }
        custsearch.addFilter(new nlobjSearchFilter('internalid', null, 'anyof', RelaID));

        var resultSet = custsearch.runSearch();
        var results = resultSet.getResults(0, 1000);
    } catch (err) {
        results = 0;
        // Log de errores
        nlapiLogExecution('ERROR', 'Create_CSV_XLS_Line - Error', err);
    }

    // Retorna la busqueda
    return results;
}

function getCountry() {
    // Para saber si esta activa la funcionalidad de one world o mid market edition
    if (featuresubs == true || featuresubs == 'T') {
        country = nlapiLookupField('transaction', recId, 'subsidiary.country');
    } else {
        country = context.getSetting('SCRIPT', 'custscript_lmry_country_code_stlt');
    }

    nlapiLogExecution('ERROR', 'country', country);
}

function getCurrency() {
    var subsidiary = nlapiLookupField('transaction', recId, 'subsidiary');
    if (bookI != 0 && foreigncurrencymanagement) {
        var results = nlapiSearchRecord("accountingbook", null,
            [
                ["subsidiary", "anyof", subsidiary], 'AND',
                ["internalid", "anyof", bookI]
            ],
            [
                new nlobjSearchColumn("internalid"),
                new nlobjSearchColumn("currency")
            ]
        );
        
        if (results && results.length) {
            currency['name'] = results[0].getText('currency');
            currency['value'] = results[0].getValue('currency');
        }
    } else {
        var idcurrency = nlapiLookupField('subsidiary', subsidiary, 'currency');
        currency['value'] = idcurrency;
    }
}

function roundByCurrency(amount, currencyPrecision) {
    var roundedAmount = '';
    if (amount) {
        roundedAmount = parseFloat(amount).toFixed(currencyPrecision);

        if (!Number(roundedAmount)) {
            roundedAmount = ''
        }
    }

    return roundedAmount;
}

function cleanText(characters) {
    characters = characters.replace(/&quot;/g, '"');
    characters = characters.replace(/&gt;/g, '>');
    characters = characters.replace(/&lt;/g, '<');
    characters = characters.replace(/&amp;/g, '');
    characters = characters.replace(/&amp;/g, '');
    characters = characters.replace(/gt;/g, '>');
    characters = characters.replace(/lt;/g, '<');
    characters = characters.replace(',', '');
return characters;
}
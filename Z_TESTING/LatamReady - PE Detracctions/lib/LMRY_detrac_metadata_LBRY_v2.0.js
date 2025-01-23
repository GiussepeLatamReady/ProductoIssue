/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 * @Name LMRY_detrac_metadata_LBRY_v2.0.js
 */

/******************************************************************************************
  VERSION 1.0
  19/08/2021 | Richard Galvez | QA : Marisol Cconislla.
  - add two translations
    1. Batch with ID is "custcol_sales_list_batch",
    2. Process Date with ID is "custcol_sales_list_dateprocess"
    Aditional, the english transalation of the field with ID is "custcol_sales_list_subsi"
    was changed. The old value was "Subsidiaria", the current value is "Subsidiary"
  VERSION 2.0
  17/02/2022 | Richard Galvez
  - Add the following transales.
    1. custpage_col_de_total_amount
    2. custpage_col_de_pay_amount
    3. custpage_col_de_decimals
    4. custpage_col_de_pending_amount
  VERSION 3.0
  23/05/2022 | Richard Galvez
  - Change the translate of the "custpage_col_fx_amount" column
  15/12/2022 | Richard Galvez (CP2201499)
  - Add translation (message_max_limit_error) 
  23/01/2023 | Pierre Bernaola
  - ADd translation (message_max_limit_transactions)
/*****************************************************************************************/
define(['N/error', 'N/log', 'N/runtime'],

  function(error, log, runtime) {

    /*
      Id | english name | spanish name | portuguese name
    */
    var header = {
      "en": 1,
      "sp": 2,
      "es": 2
    };

    var columns = [
      /* suitelet's Fields */
      ["custpage_buttom_1", "Recreate Files", "Recrear Archivos"],
      ["custpage_buttom_2", "Refresh", "Recargar"],
      ["custpage_buttom_5", "Void", "Anular"],
      ["custpage_buttom_3", "Generate Journal", "Generar Asiento Contable"],
      ["custpage_buttom_4", "Cancel Process", "Cancelar Proceso"],

      ["custgroup_criteria", "Filters", "Filtros"],
      ["custgroup_clasification", "Clasification", "Clasificación"],
      ["custgroup_inf", "Batch Information", "Información del lote"],
      ["custlist_transactions", "Transactions", "Transacciones"],

      ["custpage_custlist_transactions", "Transactions", "Transacciones"],
      ["custpage_tab_transactions", "Transactions", "Transacciones"],

      ["custtitle_suitelet", "Latam - Generate Detractions (Peru)", "Latam - Generar Detracciónes (Perú)"],

      ["custpage_acc_1", "Detractions Account", "Cuenta Contable de Detracciones"],
      ["custpage_acc_2", "Bank Commission Account", "Cuenta Contable de la Comisión"],
      ["custpage_acc_3", "Rounding Account (Debit)", "Cuenta Contable de Redondeo (Debe)"],
      ["custpage_acc_4", "Bank Account", "Cuenta Contable Bancaria"],
      ["custpage_acc_5", "Rounding Account (Credit)", "Cuenta Contable de Redondeo (Haber)"],
      ["custpage_detailed_rounding", "Detailed rounding deduction", "Deducción detallada por redondeo"],
      ["custfilter_subsi", "Subsidiary", "Subsidiaria"],
      ["custfilter_date_from", "Date From", "Fecha Desde"],
      ["custfilter_date_to", "To", "Hasta"],
      ["custfilter_ap_acc", "A/P Account", "Cuenta por Pagar"],
      ["custfilter_ar_acc", "A/R Account", "Cuenta por Cobrar"],
      ["custfilter_vendor", "Vendor", "Proveedor"],
      ["custfilter_customer", "Customer", "Cliente"],

      ["custpage_i_date", "Date to Be Process", "Fecha a Ser procesado"],
      ["custpage_i_period", "Posting Period", "Periodo Contable"],
      ["custpage_i_note", "Note", "Nota"],
      ["custpage_i_batch", "Batch Number", "Nro de Lote"],

      ["custpage_c_department", "Department", "Departamento"],
      ["custpage_c_class", "Class", "Clase"],
      ["custpage_c_location", "Location", "Ubicación"],

      ["custpage_col_trans_id", "ID", "ID"],
      ["custpage_col_trans_check", "Apply", "Aplicar"],
      ['custpage_col_det_number', "Deposit Number", "Nro. de Depósito"],
      ["custpage_col_tranid", "Transaction Number", "Numero de Transacción"],
      ["custpage_col_vendor", "Vendor", "Proveedor"],
      ["custpage_col_customer", 'Customer', 'Cliente'],
      ["custpage_col_currency", "Currency", "Moneda"],
      ["custpage_col_amount", "Base Amount", "Monto Real"],
      ["custpage_col_fx_amount", "Amount (Peruvian Corrency)", "Monto (Moneda Peruana)"],
      ["custpage_col_de_rate", "Rate", "Tasa"],
      ["custpage_col_de_amount", "Detraction", "Detracción"],
      ["custpage_col_date", "Date", "Fecha"],

      ['custpage_col_de_total_amount', "Total Amount (Integer)", "Monto Total (Enteros)"],
      ['custpage_col_de_decimals', "Decimal Amount", "Monto Decimal"],
      ['custpage_col_de_pending_amount', "Pending Amount", "Monto Faltante"],
      ['custpage_col_de_pay_amount', "Pay Amount", "Monto del Pago"],

      ["custpage_col_account_det", "Account Detraction Number (Bank)", "Nro De Cuenta de Detracción (Banco)"],
      ["custpage_col_proforma", "Proforma Number", "Nro de Proforma"],
      ["custpage_col_code", "Service Code", "Código del Servicio"],
      ["custpage_col_operation", "Operation Type", "Tipo de Operación"],
      ["custpage_col_taxperiod", "Tax Period", "Periodo Tributario"],
      ["custpage_col_concept", "Detraction Concept", "Concepto de Detraccion"],
      ["custpage_col_voucher", "Voucher Type", "Tipo de Comprobante"],
      ["custpage_col_voucher_serie", "Voucher Serie", "Serie de Comprobante"],
      ["custpage_col_voucher_number", "Voucher Number", "Nro de Comprobante"],

      ["custbuttom_check_all", "Mark All", "Marcar Todos"],
      ["custbuttom_uncheck_all", "Unmark All", "Desmarcar Todos"],
      ["custsubmit_process", "Process", "Procesar"],

      ["custsetup_setting_subsi", 'Subsidiary Setup', 'Confgurar Subsidiaria'],

      ["status_0", 'Pending to Generate Files', 'Pendiente a Generar Archivos'],
      ["status_8", 'Pending to Generate Journals', 'Pendiente a Generar Asientos'],
      ["status_1", 'In Progress', 'Generando Archivos'],
      ["status_2", 'Files Generated', 'Archivos Generados'],
      ["status_3", 'Generating Journals', 'Generando Diarios'],
      ["status_4", 'Journals Generated', 'Diarios Generados'],
      ["status_5", 'Failed to Generate Files', 'Error al Generar los Archivos'],
      ["status_6", 'Failed to Generate Journals', 'Error de Generar Asientos'],
      ["status_7", 'Canceled', 'Cancelado'],

      ['error_detra_001', 'The batch was cancelled.', "El lote fue cancelado"],

      ['custpopup_submit', 'Save', 'Guardar'],
      ['custpopup_cancel', 'Cancel', 'Cancelar'],

      ["custpopup_acc_1", "Detractions Account", "Cuenta Contable de Detracciones"],
      ["custpopup_acc_2", "Bank Commission Account", "Cuenta Contable de la Comisión"],
      ["custpopup_acc_3", "Rounding Account (Debit)", "Cuenta Contable de Redondeo (Debe)"],
      ["custpopup_acc_4", "Bank Account", "Cuenta Contable Bancaria"],
      ["custpopup_acc_5", "Rounding Account (Credit)", "Cuenta Contable de Redondeo (Haber)"],
      ["custpopup_detailed_rounding", "Detailed rounding deduction", "Deducción detallada por redondeo"],
      ['custpopup_tab', "General Information", "Información General"],

      ['custtitle_popup', "Subsidiary Setup", "Configuración de la Subsidiaria"],

      ['error_popup_001', "The subsidiary has been configured.", "La subsidiaria a sido configurada."],

      ['error_popup_002', "The following fields are empty:\n", "Los siguientes campos estan vacios:\n"],

      ['error_form_001', "The subsidiary is not configured.", "La subsidiaria no esta configurada"],

      ['error_form_002', "There is not any transaction selected.\nPlease select one.", "No se marco ninguna transacción.\nPor favor, seleccione al menos una."],

      ['list_title', ' Latam - Batch Detractions (Peru)', 'Latam - Detracciones por Lote (Perú)'],

      ['list_col_1', 'Actions', ' Acciones'],

      ['list_col_2', 'ID', ' ID'],

      ['list_col_3', 'Transactions', ' Transacciones'],

      ['list_col_4', 'Subsidiary', ' Subsidiaria'],

      ['list_col_5', 'Period', ' Periodo'],

      ['list_col_6', 'Status', ' Estado'],

      ['list_col_7', 'Clave Sol File', ' Archivo Clave Sol'],

      ['list_col_8', 'Bank File', ' Archivo Bancario'],

      ['list_col_9', 'Journal Generated', ' Asiento Generado'],

      ['custlist_batch', ' ', ' '],

      ['custaction_view', 'view', 'ver'],

      //Sales Flow Field
      ["custtitle_suitelet_sales", "Latam - Generate Sales Detractions (Peru)", "Latam - Generar Detracciónes de Ventas (Perú)"],

      ['custtitle_sales_setup', 'LatamReady - Subsidiary Setup (Detraction)', 'LatamReady - Configuracion por Subsidiaria (Detracción)'],

      ['custlist_subsidiaries', 'Subsidiaries', 'Subsidiarias'],

      ['custpage_col_detailed_rounding', 'Detailed rounding deduction', 'Deducción detallada por redondeo'],

      ['custpage_col_sales_subsidiary', 'Subsidiary', 'Subsidiaria'],

      ['custpage_col_sales_det_acc', 'Detraction Account', 'Cuenta de Detración'],

      ['custpage_col_sales_rounding_acc', 'Rounding Account (Debit)', 'Cuenta de Redondeo (Debe)'],

      ['custpage_col_sales_rounding_accc', 'Rounding Account (Credit)', 'Cuenta de Redondeo (Haber)'],

      ['custpage_col_sales_bank_acc', 'Bank Account', 'Cuenta de Banco'],

      ['custbutton_save', 'Save', 'Guardar'],

      ['custbutton_cancel', 'Cancel', 'Cancelar'],

      ['custbutton_back', 'Back', 'Atras'],

      ['custitle_sales_list', "LatamReady - Batch Detractions List (Sales)", 'LatamReady - Lista de Detracciones por Lotes (Ventas)'],

      ['custlist_sales_new', 'New Batch', 'Nuevo Lote'],

      ['custlist_sales_setup', 'Setup', 'Configurar'],

      ['custcol_sales_list_id', 'ID', 'ID'],

      ['custcol_sales_list_batch', "Batch", "Lote"],

      ['custcol_sales_list_subsi', 'Subsidiary', 'Subsidiaria'],

      ['custcol_sales_list_period', 'Period', 'Periodo'],

      ['custcol_sales_list_number', '# Invoices', '# Facturas'],

      ['custcol_sales_list_status', 'Status', 'Estado'],

      ['custcol_sales_list_journal', 'Journal Generated', 'Asiento Generado'],

      ['custcol_sales_list_user', 'User Responsible', 'Usuario Responsable'],

      ['custcol_sales_list_details', 'Details', 'Detalles'],

      ['custcol_sales_list_dateprocess', "Process Date", "Fecha de Procesamiento"],

      ['status_sales_1', 'Pending', 'Pendiente'],

      ['status_sales_2', 'In Progress...', 'En Progreso...'],

      ['status_sales_3', 'Completed', 'Completado'],

      ['status_sales_4', 'Failed', 'Fallido'],
      ['status_sales_5', 'Void In Progress', 'Anulacion en progreso'],
      ['status_sales_6', 'Voided', 'Anulado'],
      ['status_sales_7', 'Void failed', 'Anulado fallido'],
      ['status_sales_8', 'Void Pending', 'Anulado pendiente'],

      ['message_quantity_sales', ' Invoice(s)', 'Factura(s)'],

      ['message_confirm_sales', 'The Batch has been created successfully.', 'El lote se guardo correctamente'],

      ['message_sales_setup_error',
        'The Instance is not configured correctly.<br>One or more accounts fields are empty.',
        'La instancia no esta configurada correctamente.<br>Uno o mas campos de las cuentas estan vacios.'
      ],

      ['message_sales_update_1', 'The accounts configuration was saved successfully.', "La configuración de las cuentas se guardaron correctamente."],

      ['message_sales_update_2', 'An unexpected error occured.\nPlease, Try Again', "Ocurrio un error inesperado.\nIntente de Nuevo."],

      ['message_max_limit_error',"The Quantity of Transactions is greather than 4000.\nAdd More Filters.","La cantidad de transacciones es mayor a 4000.\nRealice mas filtros."],
      ['message_max_limit_transactions',"The Quantity of Transactions is greather than 1000.\nAdd More Filters.","La cantidad de transacciones es mayor a 1000.\nRealice mas filtros."],

      ['custtitle_sales_delete', "LatamReady - Batch Detractions Void (Sales)", "LatamReady - Elimitacion de Detracciones por Lotes (ventas)"],
      ['custtable_sales_delete', "List", "Lista"],
      ['custpage_col_check', "Check", "Seleccionar"],
      ['custpage_col_batch', "Batch", "Batch"],
      ['custpage_col_user', "User Responsive", "Usuario responsable"],
      ['custpage_col_status', "Status", "Estado"],
      ['custpage_col_batch_name', "Batch Name", "Nombre del lote"],
      ['custsubmit_sales_delete', "Process", "Procesar"],
      ['custpage_col_journal', 'Journal Generated', 'Asiento Generado'],

      ['custtab_voidsales_criteria', 'Criteria', 'Criterios'],
      ['custcriteria_subsidiary', 'Subsidiary', 'Subsidiaria'],
      ['custcriteria_user', 'User Responsive', 'Usuario Responsable'],
      ['custcriteria_period', 'Period', 'Periodo'],
      ['custcriteria_process_data', 'Process Data', 'Data Procesada'],
      ["custcriteria_date_to", "To", "Hasta"],
      ["custcriteria_date_from", "Due Date From", "Fecha de Vencimiento Desde"],
      ["custpage_subsidiary", "Subsidiary", "Subsidiaria"]
    ];


    function DAO() {

      var language = runtime.getCurrentUser().getPreference('language').substring(0, 2);
      var pos = header[language] ? header[language] : 1;

      var jsonColumns = {};

      for (var i = 0; i < columns.length; i++) {

        var row = columns[i];

        jsonColumns[row[0]] = row[pos];

      }
      this.language = language;
      this.columns = jsonColumns;

    }

    DAO.prototype.getName = function(id) {
      return this.columns[id] ? this.columns[id] : ' ';
    }

    DAO.prototype.getLanguage = function() {
      return this.language
    }


    return {
      open: function() {
        return new DAO();
      }
    }

  });

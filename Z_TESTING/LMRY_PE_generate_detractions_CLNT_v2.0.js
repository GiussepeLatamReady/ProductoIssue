/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 * @Name LMRY_PE_generate_detractions_CLNT_v2.0.js
 */

define(['N/currentRecord', 'N/url', 'N/record', 'N/search',
    '../../lib/LMRY_detrac_metadata_LBRY_v2.0.js',
    'N/runtime', '../../../Latam_Library/LMRY_Popup_LBRY'
],

    function (currentRecord, url, record, search, metadata, runtime, Lib_Popup) {

        var _dao = '';

        var accounts = null;

        var jsonFields = {

            "custfilter_subsi": 'value',
            "custfilter_date_from": 'date',
            "custfilter_date_to": 'date',
            "custfilter_ap_acc": 'value',
            "custfilter_vendor": 'value',
        }

        /* Temas Netsuite */
        var color_ids = ["-358", "-5", "-16", "-14", "-15", "-8", "10", "-9", "-7",
            "-13", "-12", "-6", "-11", "-100", "-101", "-102", "-103", "-104", "-105", "-106", "-107", "-108",
            "-109", "-110", "-111", "-112", "-113", "-114", "-115", "-116", "-117", "-118", "-119", "-120",
            "-350", "-351", "-352", "-353", "-354", "-355", "-356", "-357",
            "-361", "-362", "-359", "-360", "-363", "-364", "-365", "-121", "-122", "-123", "-124", "-125",
            "-126", "-127", "-128", "-129", "-130", "-131", "-366", "-367",
            "-368", "-369", "-370", "-371", "-372", "-373", "-132", "-133", "-134", "-136", "-137", "-138", "-139",
            "-148", "-135", "-141", "-142", "-143", "-144", "-145",
            "-146", "-147", "-148", "-149", "-150", "-151", "-152", "-153", "-154", "-155", "-156", "-157",
            "-158", "-159", "-160", "-161", "-374", "-375", "-376", "-377",
            "-378", "-380", "-379", "-481"
        ];

        var color_bg_ff = ["#002157", "#607799", "#444444", "#674218", "#888888", "#6D8C1E", "#85C1CF", "#8CB49A", "#E5772A", "#DC64A2", "#6E609D", "#AD4B4B", "#287587", "#FF6600", "#0C2475",
            "#660000", "#EAB200", "#CC0000", "#7595CC", "#D60039", "#000066", "#FFCC66", "#006600", "#BD9C00", "#CC0000", "#000066", "#663399", "#CC9900", "#B40000", "#830506",
            "#FF6600", "#CC6600", "#660000", "#CC0000", "#075699", "#001E58", "#241D4E", "#222222", "#CC0000", "#023EAD", "#990000", "#FF571C", "#222222", "#CC0000", "#000066",
            "#041C43", "#00543D", "#013875", "#000056", "#FF6600", "#8C2108", "#333333", "#000063", "#017400", "#752132", "#702C7E", "#CC0000", "#35457C", "#B69B29", "#990000",
            "#990000", "#004576", "#222222", "#990000", "#000066", "#004A83", "#00287A", "#F76507", "#990000", "#004A85", "#CC0000", "#305930", "#990000", "#002649", "#FF9900",
            "#1A2E57", "#002868", "#840029", "#211F5E", "#044520", "#FF6600", "#AD3118", "#003399", "#A20012", "#330066", "#990000", "#990032", "#990000", "#000067", "#0034AE",
            "#DE0018", "#000066", "#2B0A4F", "#000066", "#880029", "#980033", "#EF9218", "#B5AD63", "#000066", "#8B0222", "#333399", "#000066", "#892020", "#3A027C", "#03492F", "#002654"
        ]

        function pageInit(scriptContext) {
            try {

                _dao = metadata.open();

                if (scriptContext.currentRecord.getValue('custfilter_subsi')) {
                    document.getElementById('settings').addEventListener("click", openPopup);
                    accounts = getAccountPopup(scriptContext.currentRecord.getValue('custfilter_subsi'));
                }


                if (!accounts) {
                    accounts = getAccountPopup('@NONE@');
                }
            } catch (err) {
                console.log(err);
            }

        }

        function openPopup() {

            var _current = currentRecord.get();
            var subsi = _current.getValue('custfilter_subsi');

            var arrayAccounts = JSON.parse(accounts);

            //Color
            var colorId = runtime.getCurrentUser().getPreference({
                name: 'COLORTHEME'
            });
            var i = color_ids.indexOf(colorId);
            if (i == -1) i = 0;
            var colorTheme = color_bg_ff[i];

            openSubForm();

            //Modal de bloqueo
            var overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'rgba(0, 0, 0, 0.5)';
            overlay.style.zIndex = '9999';
            document.body.appendChild(overlay);

            //Contenedor - Ventana
            var container = document.createElement('div');
            container.id = 'modal-container';
            container.style.position = 'fixed';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            container.style.width = '75%';
            container.style.height = '75%';
            container.style.background = 'white';
            container.style.padding = '20px';
            container.style.border = '1px solid #ccc';
            container.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.1)';
            container.style.zIndex = '10000';

            //Cabecera - Ventana
            var header = document.createElement('div');
            header.id = 'subsidiary-modal';
            header.className = 'latam-tab';
            header.style.width = '100%';
            header.style.height = '5%';
            header.style.background = colorTheme; // Se puede cambiar según el colorTheme
            header.style.padding = '20px';
            header.style.border = '1px solid #ccc';
            header.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.1)';
            header.style.zIndex = '10000';
            header.style.display = 'flex';
            header.style.flexDirection = 'row';
            header.style.alignItems = 'center';
            header.style.justifyContent = 'space-between';
            header.style.position = 'relative';

            //Titulo - Cabecera
            var titleHeader = document.createElement('h2');
            titleHeader.id = 'title-header';
            titleHeader.innerText = _dao.getName('custtitle_popup');
            titleHeader.style.color = 'white';
            titleHeader.style.cursor = 'default';
            titleHeader.style.background = 'inherit';
            titleHeader.style.fontSize = '14px';
            titleHeader.style.fontFamily = 'Verdana, Helvetica, sans-serif';

            //Botón de Cierre de Ventana
            var closeButton = document.createElement('button');
            closeButton.id = 'close-button';
            closeButton.textContent = '✖';
            closeButton.style.position = 'absolute';
            closeButton.style.right = '10px';
            closeButton.style.border = 'none';
            closeButton.style.color = 'white';
            closeButton.style.cursor = 'pointer';
            closeButton.style.fontSize = '14px';
            closeButton.style.width = '25px';
            closeButton.style.height = '25px';
            closeButton.style.borderRadius = '50%';
            closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
            closeButton.addEventListener('click', function (event) {
                document.body.removeChild(container);
                document.body.removeChild(overlay);
            });

            //Agregar título y botón a la cabecera
            header.appendChild(titleHeader);
            header.appendChild(closeButton);
            //Mostrar Cabecera
            container.appendChild(header);

            //Tabla de botones
            var buttonTable = document.createElement('table');
            buttonTable.id = 'button-table';
            buttonTable.className = 'latam-table-buttons';

            //Fila de la Tabla
            var trButtonTable = document.createElement('tr');

            //Dato 1 de la Fila
            var tdtrButtonTable1 = document.createElement('td');

            //Botón de guardado
            var saveButton = document.createElement('button');
            saveButton.id = 'save-button';
            saveButton.innerText = _dao.getName('custpopup_submit');
            saveButton.className = 'latam-btn-blue';

            //Agregar botón de guardado a la tabla
            tdtrButtonTable1.appendChild(saveButton);
            trButtonTable.appendChild(tdtrButtonTable1);

            //Dato 2 de la Fila
            var tdtrButtonTable2 = document.createElement('td');

            //Botón de cancelar
            var cancelButton = document.createElement('button');
            cancelButton.id = 'cancel-button';
            cancelButton.innerText = _dao.getName('custpopup_cancel');
            cancelButton.className = 'latam-btn-normal';
            cancelButton.addEventListener('click', function (event) {
                document.body.removeChild(container);
                document.body.removeChild(overlay);
            });

            //Agregar botón de cancelar a la tabla
            tdtrButtonTable2.appendChild(cancelButton);
            trButtonTable.appendChild(tdtrButtonTable2);
            //Agregar tr a la tabla
            buttonTable.appendChild(trButtonTable);
            //Mostrar tabla
            container.appendChild(buttonTable);

            //Sección de Información
            var section = document.createElement('div');
            section.id = 'section-information'
            section.className = 'latam-tab';
            section.style.background = colorTheme;

            //Tab de Infomación
            var tab = document.createElement('button');
            tab.className = 'latam-tab-button';
            tab.id = 'tab-information';
            tab.innerText = _dao.getName('custpopup_tab');

            //Agregar tab a la sección
            section.appendChild(tab);
            //Mostrar sección
            container.appendChild(section);

            //Sección de filtros
            var filtersSection = document.createElement('div');
            filtersSection.id = 'section-filters';
            filtersSection.className = 'latam-tabcontent';
            //Tabla de filtros
            var filtersTable = document.createElement('table');
            filtersTable.id = 'filters-table';
            filtersTable.className = 'latam-table-fields';
            filtersTable.style.width = '100%';

            var fields = [
                { id: 'custpopup_acc_1', label: _dao.getName('custpopup_acc_1'), type: 'other' },
                { id: 'custpopup_acc_2', label: _dao.getName('custpopup_acc_2'), type: 'expense' },
                { id: 'custpopup_acc_3', label: _dao.getName('custpopup_acc_3'), type: 'expense' },
                { id: 'custpopup_acc_5', label: _dao.getName('custpopup_acc_5'), type: 'income' },
                { id: 'custpopup_acc_4', label: _dao.getName('custpopup_acc_4'), type: 'bank' }
            ];

            fields.forEach(function (field) {
                var trFilterTable = document.createElement('tr');
                var tdFilterTable = document.createElement('td');
                var pFilterTable = document.createElement('p');
                pFilterTable.className = 'latam-label';
                pFilterTable.textContent = field.label;

                var selectContainer = document.createElement('div');
                selectContainer.className = 'custom-select';
                selectContainer.style.position = 'relative';
                // selectContainer.style.border = '2px solid #000';
                // selectContainer.style.borderRadius = '5px';
                selectContainer.style.padding = '5px';
                selectContainer.style.display = 'inline-block';
                selectContainer.style.width = '100%';

                var selected = document.createElement('div');
                selected.className = field.id;
                selected.style.padding = '8px';
                selected.style.border = '1px solid #ccc';
                selected.style.border = '1px solid #ccc';
                selected.style.cursor = 'pointer';
                selected.style.display = 'inline-block';
                selected.style.width = '100%';
                selected.style.height = '50%';
                selected.style.boxSizing = 'border-box';

                var options = document.createElement('div');
                options.className = 'options';
                options.style.display = 'none';
                options.style.position = 'absolute';
                options.style.background = 'white';
                options.style.border = '1px solid #ccc';
                options.style.maxHeight = '150px';
                options.style.overflowY = 'auto';
                options.style.width = '100%';
                options.style.zIndex = '1000';

                selected.addEventListener("click", function () {
                    options.style.display = options.style.display === "block" ? "none" : "block";
                    options.style.zIndex = "1000";
                });

                document.addEventListener("click", function (event) {
                    if (!selectContainer.contains(event.target)) {
                        options.style.display = "none";
                    }
                });

                var defaultOption = document.createElement('div');
                defaultOption.style.padding = '8px';
                defaultOption.style.cursor = 'pointer';
                defaultOption.addEventListener('click', function () {
                    selected.textContent = this.textContent;
                    selected.id = '';
                    options.style.display = 'none';
                    // selectContainer.style.border = '2px solid blue';
                });
                options.appendChild(defaultOption);
                if (arrayAccounts[field.type]) {
                    arrayAccounts[field.type].forEach(function (accountInformation) {
                        console.log("accountInformation", accountInformation);
                        var customOption = document.createElement('div');
                        customOption.id = accountInformation.value;
                        customOption.textContent = accountInformation.text;
                        customOption.style.padding = '8px';
                        customOption.style.cursor = 'pointer';
                        customOption.addEventListener('click', function () {
                            selected.id = this.id;
                            selected.textContent = this.textContent;
                            options.style.display = 'none';
                            // selectContainer.style.border = '2px solid blue';
                        });
                        options.appendChild(customOption);
                    });
                }

                selectContainer.appendChild(selected);
                selectContainer.appendChild(options);
                tdFilterTable.appendChild(pFilterTable);
                tdFilterTable.appendChild(selectContainer);
                trFilterTable.appendChild(tdFilterTable);
                filtersTable.appendChild(trFilterTable);
            });

            // Contenedor del Check box Redondeo Detallado
            var checkboxContainer = document.createElement('div');
            checkboxContainer.style.marginTop = '15px';
            checkboxContainer.style.display = 'flex';
            checkboxContainer.style.alignItems = 'center';

            // Check box Redondeo Detallado
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'custpopup_detailed_rounding';
            checkbox.style.marginRight = '10px';

            //Nombre del check box
            var checkboxLabel = document.createElement('label');
            checkboxLabel.innerText = _dao.getName('custpopup_detailed_rounding');
            checkboxLabel.htmlFor = 'detailed_rounding';

            //Agregar check box a la tabla
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(checkboxLabel);
            filtersTable.appendChild(checkboxContainer);
            filtersSection.appendChild(filtersTable);
            //Mostrar tabla
            container.appendChild(filtersTable);
            //Mostrar contenedor
            document.body.appendChild(container);
            
            //Save Button
            saveButton.addEventListener('click', function (event) {
                try {
                  event.preventDefault();
                var _setup = null;
                var acc1 = document.querySelector('.custpopup_acc_1').id;
                var acc2 = document.querySelector('.custpopup_acc_2').id;
                var acc3 = document.querySelector('.custpopup_acc_3').id;
                var acc4 = document.querySelector('.custpopup_acc_4').id;
                if (Number(acc1) && Number(acc2) && Number(acc3) && Number(acc4)) {
                    search.create({
                        type: 'customrecord_lmry_pe_detractions_acc',
                        filters: ['custrecord_lmry_pe_dec_ac_subsi', 'anyof', subsi]
                    }).run().each(function (line) {

                        _setup = record.load({
                            type: 'customrecord_lmry_pe_detractions_acc',
                            id: line.id
                        });

                    });

                    if (!_setup) {
                        _setup = record.create({
                            type: 'customrecord_lmry_pe_detractions_acc'
                        });
                    }
                    try {
                        _setup.setValue('custrecord_lmry_pe_dec_ac_subsi', subsi);
                        _setup.setValue('custrecord_lmry_det_ac_account_1', document.querySelector('.custpopup_acc_1').id);
                        _setup.setValue('custrecord_lmry_det_ac_account_2', document.querySelector('.custpopup_acc_2').id);
                        _setup.setValue('custrecord_lmry_det_ac_account_3', document.querySelector('.custpopup_acc_3').id);
                        _setup.setValue('custrecord_lmry_det_ac_account_4', document.querySelector('.custpopup_acc_4').id);
                        _setup.setValue('custrecord_lmry_det_ac_account_5', document.querySelector('.custpopup_acc_5').id);
                        _setup.setValue('custrecord_lmry_pe_detailed_rounding_pur', document.getElementById('custpopup_detailed_rounding').checked);

                        _setup.save({
                            disableTriggers: true,
                            ignoreMandatoryFields: true
                        })

                        document.body.removeChild(container);
                        document.body.removeChild(overlay);

                        alert(_dao.getName('error_popup_001'));

                        window.location.reload();
                    } catch (err) {
                        alert(err);
                    }

                } else {
                    var mensaje = _dao.getName('error_popup_002');
                    if (!Number(acc1)) {
                        mensaje += '-' + _dao.getName('custpopup_acc_1') + '\n';
                    }
                    if (!Number(acc2)) {
                        mensaje += '-' + _dao.getName('custpopup_acc_2') + '\n';
                    }
                    if (!Number(acc3)) {
                        mensaje += '-' + _dao.getName('custpopup_acc_3') + '\n';
                    }
                    if (!Number(acc4)) {
                        mensaje += '-' + _dao.getName('custpopup_acc_4') + '\n';
                    }
                    alert(mensaje);
                    event.preventDefault();
                }
                } catch (error) {
                  console.log('error 1', error);
                }
                event.preventDefault();
            });

            var acc1 = _current.getValue('custpage_acc_1');
            var acc1_text = _current.getText('custpage_acc_1');
            var acc2 = _current.getValue('custpage_acc_2');
            var acc2_text = _current.getText('custpage_acc_2');
            var acc3 = _current.getValue('custpage_acc_3');
            var acc3_text = _current.getText('custpage_acc_3');
            var acc4 = _current.getValue('custpage_acc_4');
            var acc4_text = _current.getText('custpage_acc_4');
            var acc5 = _current.getValue('custpage_acc_5');
            var acc5_text = _current.getText('custpage_acc_5');
            var chexkDetailedRounding = _current.getValue('custpage_detailed_rounding');

            try {
                if (Number(acc1)) {
                    var selectedDiv = document.querySelector('.custpopup_acc_1');
                    if (selectedDiv) {
                        selectedDiv.id = acc1; // Asigna el valor por defecto
                        selectedDiv.textContent = acc1_text; // Asigna el texto por defecto
                    }
                }
                if (Number(acc2)) {
                    var selectedDiv = document.querySelector('.custpopup_acc_2');
                    if (selectedDiv) {
                        selectedDiv.id = acc2; // Asigna el valor por defecto
                        selectedDiv.textContent = acc2_text; // Asigna el texto por defecto
                    }
                }
                if (Number(acc3)) {
                    var selectedDiv = document.querySelector('.custpopup_acc_3');
                    if (selectedDiv) {
                        selectedDiv.id = acc3; // Asigna el valor por defecto
                        selectedDiv.textContent = acc3_text; // Asigna el texto por defecto
                    }
                }
                if (Number(acc4)) {
                    var selectedDiv = document.querySelector('.custpopup_acc_4');
                    if (selectedDiv) {
                        selectedDiv.id = acc4; // Asigna el valor por defecto
                        selectedDiv.textContent = acc4_text; // Asigna el texto por defecto
                    }
                }
                if (Number(acc5)) {
                    var selectedDiv = document.querySelector('.custpopup_acc_5');
                    if (selectedDiv) {
                        selectedDiv.id = acc5; // Asigna el valor por defecto
                        selectedDiv.textContent = acc5_text; // Asigna el texto por defecto
                    }
                }
                document.getElementById('custpopup_detailed_rounding').checked = chexkDetailedRounding;
            } catch (err) {
                console.log("error set values: ", err);
            }
        }

        function openSubForm() {

            var style = document.createElement('link');
            style.rel = 'stylesheet';
            style.href = 'https://system.netsuite.com/core/media/media.nl?id=514118&c=TSTDRV1038906&h=b4af44a9b704b0222e5b&_xt=.css';
            document.head.appendChild(style);


            var jquery = document.createElement('script');
            jquery.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js';
            document.head.appendChild(jquery);

            var jquery = document.createElement('script');
            jquery.src = 'https://system.netsuite.com/core/media/media.nl?id=427070&c=TSTDRV1038906&h=3495197c2dceba538ccd&_xt=.js';
            document.head.appendChild(jquery);

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
            // 2025.11.20 - Validacion One World Edition
            if (runtime.isFeatureInEffect('SUBSIDIARIES') == true ||
                runtime.isFeatureInEffect('SUBSIDIARIES') == 'T') {
                var currentRecord = scriptContext.currentRecord;

                var fieldId = scriptContext.fieldId;

                if (jsonFields[fieldId]) {

                    var type = jsonFields[fieldId];

                    var jsonContext = {};

                    for (var key in jsonFields) {

                        var value = currentRecord.getValue(key);

                        if (value) {

                            if (jsonFields[key] == 'date') {

                                value = currentRecord.getText(key);

                            }

                            jsonContext[key] = value;
                        }

                    }

                    var path = url.resolveScript({
                        scriptId: 'customscript_lmry_pe_gene_det_stlt',
                        deploymentId: 'customdeploy_lmry_pe_gene_det_stlt',
                        returnExternalUrl: false,
                        params: jsonContext
                    });

                    setWindowChanged(window, false);
                    window.location.href = path;
                }
            }

            return true;

        }

        function validateField(scriptContext) {
            try {
                if (scriptContext.fieldId === "custfilter_subsi") {
                    Lib_Popup.setValue("custfilter_vendor", "")
                }
            } catch (error) {
                console.log("error validateField", error);
                return false;
            }
            return true;
        }

        function saveRecord(scriptContext) {

            var _record = scriptContext.currentRecord;

            _dao = metadata.open();

            var line = _record.findSublistLineWithValue({
                sublistId: 'custlist_transactions',
                fieldId: 'custpage_col_trans_check',
                value: 'T'
            });

            if (line < 0) {
                alert(_dao.getName('error_form_002'));
                return false;
            } else {
                return true;
            }

        }

        function getAccountPopup(subsi) {

            var resultContext = {
                bank: [],
                expense: [],
                other: [],
                income: [],
            }

            var _filters =
                [
                    ["type", "anyof", "OthCurrLiab", "Bank", "Expense", "Income", 'OthIncome', 'OthExpense'],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_lmry_localbook", 'is', 'T'],
                    "AND",
                    ["custrecord_lmry_code_account_sunat", 'noneof', "@NONE@"]
                ];

            if (runtime.isFeatureInEffect('SUBSIDIARIES') == true ||
                runtime.isFeatureInEffect('SUBSIDIARIES') == 'T') {
                _filters.push('AND');
                _filters.push(["subsidiary", 'anyof', [subsi, '@NONE@']])
            }

            var searchContext = search.create({
                type: "account",
                filters: _filters,
                columns: [
                    'internalid', 'name', 'type'
                ]
            });

            var myPagedData = searchContext.runPaged({
                pageSize: 1000
            });

            myPagedData.pageRanges.forEach(function (pageRange) {
                var myPage = myPagedData.fetch({
                    index: pageRange.index
                });
                myPage.data.forEach(function (result) {

                    var id = result.getValue('internalid');
                    var type = result.getValue('type');
                    var name = result.getValue('name');

                    var context = {
                        value: id,
                        text: name
                    };

                    switch (type) {
                        case "OthCurrLiab":
                            resultContext.other.push(context);
                            break;
                        case "Bank":
                            resultContext.bank.push(context);
                            break;
                        case "Expense":
                            resultContext.expense.push(context);
                            break;
                        case "Income":
                            resultContext.income.push(context);
                            break;
                        case "OthIncome":
                            resultContext.income.push(context);
                            break;
                        case "OthExpense":
                            resultContext.expense.push(context);
                            break;
                    }

                    return true;

                });
            });
            return JSON.stringify(resultContext);

        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            validateField: validateField,
            saveRecord: saveRecord
        };

    });

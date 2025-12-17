/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Name LMRY_CustomAddress_CLNT.js
 */
define(["N/search", "N/currentRecord", "N/runtime"], function (search, currentRecord,runtime) {
    function brCustomCity() {
        // const urlt = new URL(window.location.href);
        const recordNow = currentRecord.get();
        const country = recordNow.getValue("country")
        // if (urlt.searchParams.get("country") !== "BR") return;
        NavigationHistory.saveForm();
  
        validateLocalized(country);
  
        
        const province = document.querySelector("[name=custrecord_lmry_addr_prov]");
        if (!province) return;
        const observer = new MutationObserver(async function (mutations) {
            const selectCity = document.querySelector("#custpage_br_city");
  
            selectCity.innerHTML = "<option value=''> </option>";
            if (Number(province.value)) {
                const cities = getCities(province);
  
                cities.forEach((cityData) => {
                    selectCity.innerHTML += `<option value='${cityData.getValue("internalid")}'>${cityData.getValue("name")}</option>`;
                });
                if (Number(recordNow.getValue("custrecord_lmry_addr_city"))) {
                    document.querySelector("#custpage_br_city").value = recordNow.getValue("custrecord_lmry_addr_city");
                }
            }
        });
  
        // Configurar las opciones del observador
        const config = { attributes: true, childList: false, subtree: false };
  
        // Iniciar la observación del elemento input con las opciones configuradas
        observer.observe(province, config);
  
        document.querySelector('[data-walkthrough="Field:custrecord_lmry_addr_city"]').style.display = "none";
  
        document.querySelector('[data-walkthrough="Field:custrecord_lmry_addr_city"]').parentElement.innerHTML +=
            `<div class="uir-field-wrapper" data-nsps-label="Latam - City" data-nsps-type="field" data-field-type="select" data-walkthrough="Field:custrecord_lmry_addr_prov">
    <span id="custrecord_lmry_addr_city_fs_lbl_uir_label" class="smallgraytextnolink uir-label" data-nsps-type="field_label"
        ><span id="custrecord_lmry_addr_city_fs_lbl" class="labelSpanEdit smallgraytextnolink" style="" data-nsps-type="label">
            <a
                tabindex="-1"
                title="What's this?"
                href='javascript:void("help")'
                style="cursor: help"
                onclick="return nlFieldHelp('Field Help', 'custrecord_lmry_addr_city', this)"
                class="smallgraytextnolink"
                onmouseover="this.className='smallgraytext'; return true;"
                onmouseout="this.className='smallgraytextnolink'; "
                >Latam - City</a
            >
        </span>
    </span>
    <span class="uir-field" data-nsps-type="field_input" >
        <select id='custpage_br_city' style="width: 280px;">
        </select>
    </span>
    </div>`;
        if (Number(recordNow.getValue("custrecord_lmry_addr_city"))) {
            const selectCity = document.querySelector("#custpage_br_city");
            selectCity.innerHTML = "<option value=''> </option>";
            const cities = getCities(province);
            cities.forEach((cityData) => {
                selectCity.innerHTML += `<option value='${cityData.getValue("internalid")}'>${cityData.getValue("name")}</option>`;
            });
            document.querySelector("#custpage_br_city").value = recordNow.getValue("custrecord_lmry_addr_city");
        }
        const selectCity = document.querySelector("#custpage_br_city");
        selectCity.addEventListener("change", (ev) => {
            recordNow.setValue("custrecord_lmry_addr_city", ev.target.value);
        });
    }
  
    function getCities(province){
        return search
        .create({
            type: "customrecord_lmry_city",
            filters: [
                ["custrecord_lmry_prov_link", "anyof", province.value],
                "AND",
                ["isinactive","is","F"]
            ],
            columns: [
                search.createColumn({
                    name: "name",
                    sort: search.Sort.ASC
                }),
                "internalid"
            ]
        })
        .run()
        .getRange(0, 1000);
    }
  
    function validateLocalized(country) {
        if (!runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' })) return false;
        NavigationHistory.setURL(document.referrer)

        const { href, searchParams } = new URL(NavigationHistory.findUrl());
        const subsidiaryID = searchParams.get(href.includes("subsidiarytype") ? "id" : "subsidiary");

        console.log("href: ",href)
        console.log("searchParams: ",searchParams)
        console.log("NavigationHistory.getURLS(): ",NavigationHistory.getURLS())
        
        if (subsidiaryID && !isLocalized(subsidiaryID,country)) {
            hideLatamFields();
        } else if (href.includes("entity")) {
            const entityID = searchParams.get("entity") || searchParams.get("entity_id") || searchParams.get("id");
            const subsidiaryID = search.lookupFields({
                type: search.Type.ENTITY,
                id: entityID,
                columns: ['subsidiary']
            }).subsidiary?.[0]?.value;

            console.log("entityID: ",entityID)
            console.log("subsidiaryID: ",subsidiaryID)
            console.log("isLocalized: ",isLocalized(subsidiaryID,country))
            
            if (subsidiaryID && !isLocalized(subsidiaryID,country)) hideLatamFields();
        } else if (href.includes("transactions")){
            const transactionID = searchParams.get("id");
            const subsidiaryID = search.lookupFields({
                type: search.Type.TRANSACTION,
                id: transactionID,
                columns: ['subsidiary']
            }).subsidiary?.[0]?.value;
            if (subsidiaryID && !isLocalized(subsidiaryID,country)) hideLatamFields();
        }
    }
  
    function isLocalized(subsidiaryID,country) {

        var featureInterCompany = runtime.getCurrentScript().getParameter({ name: "custscript_lmry_all_entity_fields" });

        var filters = [
            ['isinactive', 'is', 'F'],
            "AND",
            ['custrecord_lmry_features_subsidiary.internalid', 'anyof', subsidiaryID],
            "AND",
            ['custrecord_lmry_features_subsidiary.isinactive', 'is', 'F']
        ];

        if (!featureInterCompany) {
            filters.push("AND",['custrecord_lmry_features_subsidiary.country', 'anyof', country]);
        }
        const searchOW = search.create({
            type: 'customrecord_lmry_features_by_subsi',
            columns: [
                'internalid'
            ],
            filters: filters
        });
        return searchOW.runPaged().count;
    }
    function hideLatamFields(){
        const rowstable = document.querySelectorAll("tr");
        rowstable.forEach(row => {
            const div = row.querySelector("td>div");
            if (div && div.getAttribute("data-walkthrough")?.startsWith("Field:custrecord_lmry")) {
                row.style.display = "none";
            }
        });
    }
  
  
    class NavigationHistory {
        // Método para agregar una URL al historial
        static setURL(urlUnit) {
            let history = JSON.parse(sessionStorage.getItem('navigationHistory')) || [];
            history.push(urlUnit);
            sessionStorage.setItem('navigationHistory', JSON.stringify(history));
        }
    
        // Método para obtener el historial completo
        static getURLS() {
            return JSON.parse(sessionStorage.getItem('navigationHistory')) || [];
        }
    
        // Método para eliminar el historial completo
        static deleteURLS() { 
            sessionStorage.removeItem('navigationHistory');
        }
  
        static saveForm(){
            const okButton = document.querySelector('input[name="ok"]');
            if (okButton) {
                okButton.addEventListener('mousedown', function () {
                    NavigationHistory.deleteURLS();
                });
            }
  
            const okClose = document.querySelector('input[name="close"]');
            if (okClose) {
                okClose.addEventListener('mousedown', function () {
                    NavigationHistory.deleteURLS();
                });
            }
        }
    
        // Método para buscar la última URL con los parámetros específicos
        static findUrl() {
            const urls = NavigationHistory.getURLS();
            return [...urls].reverse().find(urlUnit => 
                urlUnit.includes("subsidiarytype") || urlUnit.includes("subsidiary") || urlUnit.includes("entity") || urlUnit.includes("transactions")
            );
        }
    }
  
  
    return {
        brCustomCity
    };
  });
  
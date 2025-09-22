/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Name LMRY_CustomAddress_CLNT.js
 */
define(["N/search", "N/currentRecord", "N/runtime"], function (
    search,
    currentRecord,
    runtime
) {
    /*ejecuta en la inicialización de la página (pageInit). */
    function brCustomCity() {
        try {
            const recordNow = currentRecord.get();
            let country = recordNow.getValue("country");

            // Si no hay país directamente en el record, lo obtenemos por búsqueda
            if (!country) {
                country = getCountryExt(recordNow.id);
            }

            // Construcción dinámica del select de ciudades
            const province = document.querySelector(
                "[name=custrecord_lmry_addr_prov]"
            );
            if (province) {
                const observer = new MutationObserver(function () {
                    const selectCity = document.querySelector("#custpage_br_city");
                    if (!selectCity) return;

                    selectCity.innerHTML = "<option value=''> </option>";
                    if (Number(province.value)) {
                        const cities = getCities(province);
                        cities.forEach((cityData) => {
                            selectCity.innerHTML +=
                                "<option value='" +
                                cityData.getValue("internalid") +
                                "'>" +
                                cityData.getValue("name") +
                                "</option>";
                        });
                        // Si ya hay valor guardado, lo seleccionamos
                        if (Number(recordNow.getValue("custrecord_lmry_addr_city"))) {
                            selectCity.value = recordNow.getValue(
                                "custrecord_lmry_addr_city"
                            );
                        }
                    }
                });

                // Observamos cambios en el input de provincia
                observer.observe(province, {
                    attributes: true,
                    childList: false,
                    subtree: false,
                });

                // Ocultamos el campo original de City
                const originalCityField = document.querySelector(
                    '[data-walkthrough="Field:custrecord_lmry_addr_city"]'
                );
                if (originalCityField) {
                    originalCityField.style.display = "none";

                    // Insertamos nuestro propio wrapper de City con id="custpage_br_city"
                    originalCityField.parentElement.innerHTML +=
                        "" +
                        '<div class="uir-field-wrapper" data-nsps-label="Latam - City" data-nsps-type="field" data-field-type="select" data-walkthrough="Field:custrecord_lmry_addr_prov">' +
                        '  <span id="custrecord_lmry_addr_city_fs_lbl_uir_label" class="smallgraytextnolink uir-label" data-nsps-type="field_label">' +
                        '    <span id="custrecord_lmry_addr_city_fs_lbl01" class="labelSpanEdit smallgraytextnolink" data-nsps-type="label">' +
                        '      <a tabindex="-1" title="What\'s this?" href="javascript:void(\'help\')" style="cursor: help" ' +
                        "         onclick=\"return nlFieldHelp('Field Help', 'custrecord_lmry_addr_city', this)\" " +
                        '         class="smallgraytextnolink" onmouseover="this.className=\'smallgraytext\'; return true;" ' +
                        "         onmouseout=\"this.className='smallgraytextnolink'; \">Latam - City</a>" +
                        "    </span>" +
                        "  </span>" +
                        '  <span class="uir-field" data-nsps-type="field_input">' +
                        '    <select id="custpage_br_city" style="width: 280px;"></select>' +
                        "  </span>" +
                        "</div>";

                    // Si ya había valor, lo llenamos en el nuevo select
                    if (Number(recordNow.getValue("custrecord_lmry_addr_city"))) {
                        const selectCity = document.querySelector("#custpage_br_city");
                        selectCity.innerHTML = "<option value=''> </option>";
                        const cities = getCities(province);
                        cities.forEach((cityData) => {
                            selectCity.innerHTML +=
                                "<option value='" +
                                cityData.getValue("internalid") +
                                "'>" +
                                cityData.getValue("name") +
                                "</option>";
                        });
                        selectCity.value = recordNow.getValue("custrecord_lmry_addr_city");
                    }

                    // Cuando cambie la ciudad en el dropdown, actualizamos el record
                    const selectCityFinal = document.querySelector("#custpage_br_city");
                    selectCityFinal.addEventListener("change", (ev) => {
                        recordNow.setValue("custrecord_lmry_addr_city", ev.target.value);
                    });
                }
            }

            // 2) Validación de subsidiaria y país: ocultar/colorear campos si aplica
            validateLocalized(country);

            // 3) Asociar validación al botón
            if (document.getElementById('submitter')) {
                validarCamposDireccion('#submitter');
            }
            if (document.getElementById('ok')) {
                validarCamposDireccion('#ok');
            }

        } catch (error) {
            console.log("error", error);
        }
    }
    
    function validarCamposDireccion(btnSelector) {
        const btn = document.querySelector(btnSelector);
        if (!btn) return;

        btn.addEventListener("click", function (event) {
            // Obtenemos los campos que queremos validar
            const inputProvinceId = document.querySelector("#custrecord_lmry_addr_prov_id");
            const inputProvinceName = document.querySelector("#inpt_custrecord_lmry_addr_prov_4");
            const inputCityId = document.querySelector("#custrecord_lmry_addr_city_id");
            const inputCityName = document.querySelector("#custpage_br_city");

            const provinceIdValue = inputProvinceId ? inputProvinceId.value.trim() : "";
            const provinceNameValue = inputProvinceName ? inputProvinceName.value.trim() : "";
            const cityIdValue = inputCityId ? inputCityId.value.trim() : "";
            const cityNameValue = inputCityName ? inputCityName.value.trim() : "";

            let missingFields = [];
            if (provinceIdValue === "") missingFields.push("- Latam - Province ID");
            if (provinceNameValue === "") missingFields.push("- Latam - Province");
            if (cityIdValue === "") missingFields.push("- Latam - City ID");
            if (cityNameValue === "") missingFields.push("- Latam - City");

            if (missingFields.length > 0) {
                alert("Faltan campos por llenar:\n" + missingFields.join("\n"));
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);
    }


    /**
     * Devuelve la lista de ciudades asociadas a la provincia
     * @param {HTMLElement} province - elemento <input> o <select> de Provincia (contiene el internalid de provincia)
     * @returns {nlobjSearchResult[]} Arreglo de resultados con { name, internalid }
     */
    function getCities(province) {
        if (!province || !province.value) {
            return [];
        }
        return search
        .create({
            type: "customrecord_lmry_city",
            filters: [
                ["custrecord_lmry_prov_link", "anyof", [province.value]],
                "AND",
                ["isinactive", "is", "F"],
            ],
            columns: [
                search.createColumn({
                    name: "name",
                    sort: search.Sort.ASC,
                }),
                "internalid",
            ],
        })
        .run()
        .getRange(0, 1000);
    }

    /**
     * Busca el país asociado a una dirección (address record) y devuelve "CO" o "US"
     * @param {number} addressID - internalid del record Address
     * @returns {string} "CO" si es Colombia, "US" en otro caso
     */
    function getCountryExt(addressID) {
        let country;
        search
            .create({
                type: "address",
                columns: [
                    search.createColumn({
                        name: "formulatext",
                        formula: "{country.id}",
                        label: "country",
                    }),
                ],
                filters: ["internalid", "anyof", addressID],
            })
            .run()
            .each(function (result) {
                if (result.getValue(result.columns[0]) === "Colombia") {
                    country = "CO";
                } else {
                    country = "US";
                }
            });
        return country;
    }

    /**
     * Valida si la subsidiaria actual tiene habilitado el Feature "Latam" para el país dado.
     * Si no, llama a hideLatamFields(); en caso contrario, llama a hideFieldsSAp().
     * @param {string} country - "CO" o "US"
     */
    function validateLocalized(country) {
        if (!runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" })) {
            hideLatamFields();
            return false;
        }
        NavigationHistory.setURL(document.referrer);
        const urlUp = NavigationHistory.findUrl();
        if (!urlUp) {
            hideLatamFields();
            return false;
        }

        const { href, searchParams } = new URL(urlUp);
        let subsidiaryID = searchParams.get(
            href.includes("subsidiarytype") ? "id" : "subsidiary"
        );

        if (subsidiaryID && !isLocalized(subsidiaryID, country)) {
            hideLatamFields();
        } else if (href.includes("entity")) {
            const entityID = searchParams.get("id");

            if (entityID) {
                subsidiaryID = search.lookupFields({
                    type: search.Type.ENTITY,
                    id: entityID,
                    columns: ["subsidiary"],
                }).subsidiary?.[0]?.value;
            }

            if (subsidiaryID && !isLocalized(subsidiaryID, country)) {
                hideLatamFields();
            }
        } else if (href.includes("transactions")) {
            const transactionID = searchParams.get("id");
            subsidiaryID = search.lookupFields({
                type: search.Type.TRANSACTION,
                id: transactionID,
                columns: ["subsidiary"],
            }).subsidiary?.[0]?.value;
            if (subsidiaryID && !isLocalized(subsidiaryID, country)) {
                hideLatamFields();
            }
        }


        hideFieldsSAp(subsidiaryID, country);
    }

    /**
     * Si la subsidiaria es de Colombia (countryForm="CO"), oculta filas de “State/Province” y “City”
     * y colorea en amarillo las cabeceras de Province ID/Name y City ID/Name.
     * @param {number} subsidiaryID - internalid de Subsidiaria
     * @param {string} countryForm - “CO” o “US”
     */
    function hideFieldsSAp(subsidiaryID, countryForm) {
        const lookup = search.lookupFields({
            type: search.Type.SUBSIDIARY,
            id: subsidiaryID,
            columns: ["country"],
        });
        const country = lookup.country[0].value;
        console.log('country', country);
        console.log('countryForm', countryForm);
        if (country === "CO" && countryForm === "CO") {
            const rowstable = document.querySelectorAll("tr");
            rowstable.forEach((row) => {
                const div = row.querySelector("td > div");
                if (
                    div &&
                    div
                        .getAttribute("data-walkthrough")
                        ?.startsWith("Field:dropdownstate")
                ) {
                    row.style.display = "none";
                }
                if (
                    div &&
                    div.getAttribute("data-walkthrough")?.startsWith("Field:city")
                ) {
                    row.style.display = "none";
                }
            });
        }

        // Coloreamos cabeceras de Province ID/Name y City ID/Name en amarillo
        const labelProvinceId = document.querySelector(
            "#custrecord_lmry_addr_prov_id_fs_lbl"
        );
        const labelProvinceName = document.querySelector(
            "#custrecord_lmry_addr_prov_fs_lbl"
        );
        const labelCityId = document.querySelector(
            "#custrecord_lmry_addr_city_id_fs_lbl"
        );
        const labelCityName = document.querySelector(
            "#custrecord_lmry_addr_city_fs_lbl01"
        );

        [labelProvinceId, labelProvinceName, labelCityId, labelCityName].forEach(
            (label) => {
                if (label) {
                    label.style.backgroundColor = "yellow";
                }
            }
        );
    }

    /**
     * Verifica si la subsidiaria dada tiene habilitada la característica para el país.
     * @param {number} subsidiaryID
     * @param {string} country
     * @returns {number} count > 0 si está habilitada, 0 si no
     */
    function isLocalized(subsidiaryID, country) {
        const searchOW = search.create({
            type: "customrecord_lmry_features_by_subsi",
            columns: ["internalid"],
            filters: [
                ["isinactive", "is", "F"],
                "AND",
                [
                    "custrecord_lmry_features_subsidiary.internalid",
                    "anyof",
                    subsidiaryID,
                ],
                "AND",
                ["custrecord_lmry_features_subsidiary.isinactive", "is", "F"],
                "AND",
                ["custrecord_lmry_features_subsidiary.country", "anyof", country],
            ],
        });
        return searchOW.runPaged().count;
    }

    /**
     * Si la subsidiaria no es Latam (o no encontramos URL previa), oculta todos los campos
     * que comienzan con “custrecord_lmry” en data-walkthrough.
     */
    function hideLatamFields() {
        const rowstable = document.querySelectorAll("tr");
        rowstable.forEach((row) => {
            const div = row.querySelector("td > div");
            if (
                div &&
                div
                    .getAttribute("data-walkthrough")
                    ?.startsWith("Field:custrecord_lmry")
            ) {
                row.style.display = "none";
            }
        });
    }

    /**
     * Clase para manejar un historial simple de URLs en sessionStorage.
     */
    class NavigationHistory {
        static setURL(urlUnit) {
            const history =
                JSON.parse(sessionStorage.getItem("navigationHistory")) || [];
            history.push(urlUnit);
            sessionStorage.setItem("navigationHistory", JSON.stringify(history));
        }
        static getURLS() {
            return JSON.parse(sessionStorage.getItem("navigationHistory")) || [];
        }
        static deleteURLS() {
            sessionStorage.removeItem("navigationHistory");
        }
        static saveForm() {
            const okButton = document.querySelector('input[name="ok"]');
            if (okButton) {
                okButton.addEventListener("mousedown", function () {
                    NavigationHistory.deleteURLS();
                });
            }
            const okClose = document.querySelector('input[name="close"]');
            if (okClose) {
                okClose.addEventListener("mousedown", function () {
                    NavigationHistory.deleteURLS();
                });
            }
        }
        static findUrl() {
            const urls = NavigationHistory.getURLS();
            return [...urls]
                .reverse()
                .find(
                    (urlUnit) =>
                        urlUnit.includes("subsidiarytype") ||
                        urlUnit.includes("subsidiary") ||
                        urlUnit.includes("entity") ||
                        urlUnit.includes("transactions")
                );
        }
    }

    return {
        brCustomCity: brCustomCity,
    };
});
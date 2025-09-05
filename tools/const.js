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
function validateLocalized(country) {
        if (!runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' })) return false;
        NavigationHistory.setURL(document.referrer)
        const { href, searchParams } = new URL(NavigationHistory.findUrl());
        const subsidiaryID = searchParams.get(href.includes("subsidiarytype") ? "id" : "subsidiary");

        if (subsidiaryID && !isLocalized(subsidiaryID, country)) {
            hideLatamFields();
        } else if (href.includes("entity")) {
            const entityID = searchParams.get("entity") || searchParams.get("entity_id") || searchParams.get("id");
            let subsidiaryIDEntity = null;
            if (entityID) {
                const result = search.lookupFields({
                    type: search.Type.ENTITY,
                    id: entityID,
                    columns: ['subsidiary']
                });
                subsidiaryIDEntity = result.subsidiary?.[0]?.value;
            }
            if (subsidiaryIDEntity && !isLocalized(subsidiaryIDEntity, country)) hideLatamFields();

        } else if (href.includes("transactions")) {
            const transactionID = searchParams.get("id");
            const subsidiaryID = search.lookupFields({
                type: search.Type.TRANSACTION,
                id: transactionID,
                columns: ['subsidiary']
            }).subsidiary?.[0]?.value;
            if (subsidiaryID && !isLocalized(subsidiaryID, country)) hideLatamFields();
        }
    }
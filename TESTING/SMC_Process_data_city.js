/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 *@Name SMC_Process_data_city.js
 */
define(["N/query", "N/record","N/log"], function (query, record,log) {

    const CO_PROVINCE = "208";
    const BR_PROVINCE = "310";

    function execute(context) {

        try {
            
            const cities = getCities();
            //log.error("cities",cities);
            
            cities.forEach(({ id, country, province }) => {


                //BR
                if (Number(country) === 30 && Number(province) === Number(CO_PROVINCE)) {
                    record.submitFields({
                        type: "customrecord_lmry_city",
                        id: id,
                        values: {
                            custrecord_lmry_prov_link: BR_PROVINCE
                        },
                        options: {
                            disableTriggers: true
                        }
                    });
                }

                //CO
                if (Number(country) === 48 && Number(province) === Number(BR_PROVINCE)) {
                    record.submitFields({
                        type: "customrecord_lmry_city",
                        id: id,
                        values: {
                            custrecord_lmry_prov_link: CO_PROVINCE
                        },
                        options: {
                            disableTriggers: true
                        }
                    });
                }

            });
            
        } catch (err) {
            log.error("[execute]", JSON.stringify({ message: err.message || err, stack: err.stack }))
        }
    }

    const getCities = () => {
        const cityQuery = query.create({
            type: "customrecord_lmry_city"
        });

        cityQuery.condition = cityQuery.createCondition({
            fieldId: "custrecord_lmry_prov_link",
            operator: query.Operator.ANY_OF,
            values: [BR_PROVINCE, CO_PROVINCE]
        });

        cityQuery.columns = [
            cityQuery.createColumn({
                fieldId: "id"
            }),
            cityQuery.createColumn({
                fieldId: "custrecord_lmry_city_country",
                alias: "country"
            }),
            cityQuery.createColumn({
                fieldId: "custrecord_lmry_prov_link",
                alias: "province"
            })
        ]

        return cityQuery.run().asMappedResults();
    }

    return {
        execute: execute
    }
});

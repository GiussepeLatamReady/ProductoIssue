search.lookupFields({ type: search.Type.SUBSIDIARY, id: subsidiari, columns: ['tranprefix'] });


var subsidiaryCountry = search.lookupFields({
    type: search.Type.SUBSIDIARY,
    id: "6",
    columns: ['country']
}).country[0].text;
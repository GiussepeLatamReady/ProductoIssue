function orderLines(jsonLines) {
    var sortedKeys = [];
    for (var lineuniquekey in jsonLines) {
        if (jsonLines.hasOwnProperty(lineuniquekey)) {
            sortedKeys.push(lineuniquekey);
        }
    }

    // Ordenar las claves por 'lineuniquekey' ascendente y dar prioridad a 'item' sobre 'expense'
    sortedKeys.sort(function (a, b) {
        var lineA = jsonLines[a];
        var lineB = jsonLines[b];
    
        // Comparar por sublista primero (priorizar 'item' sobre 'expense')
        if (lineA.sublist !== lineB.sublist) {
            return lineA.sublist === 'item' ? -1 : 1;
        }
    
        // Si las sublistas son iguales, comparar por 'lineuniquekey' ascendente
        var lineUniquekeyA = parseInt(lineA.lineuniquekey, 10);
        var lineUniquekeyB = parseInt(lineB.lineuniquekey, 10);
    
        return lineUniquekeyA - lineUniquekeyB;
    });
    
    
    
    console.log("sortedKeys :",sortedKeys)
    var groupTaxcode = {};

    // Agrupar usando el arreglo de claves ordenadas
    for (var i = 0; i < sortedKeys.length; i++) {
        var lineuniquekey = sortedKeys[i];
        var item = jsonLines[lineuniquekey];
        var key = item.taxcode;

        if (!groupTaxcode[key]) {
            groupTaxcode[key] = item;
        } else {
            groupTaxcode[key].debitamount += item.debitamount;
        }
    }
    return groupTaxcode;
}

var jsonLines = {
    "1": {
        "department": "Finance",
        "location": "New York",
        "class": "C",
        "taxcode": "TX001",
        "debitamount": 25,
        "item": "2001",
        "sublist": "expense",
        "lineuniquekey": "1"
    },
    "2": {
        "department": "HR",
        "location": "Boston",
        "class": "D",
        "taxcode": "TX002",
        "debitamount": 30,
        "item": "2002",
        "sublist": "expense",
        "lineuniquekey": "2"
    },
    "3": {
        "department": "Sales",
        "location": "New York",
        "class": "",
        "taxcode": "TX001",
        "debitamount": 50,
        "item": "1001",
        "sublist": "item",
        "lineuniquekey": "3"
    },
    "4": {
        "department": "Sales",
        "location": "Los Angeles",
        "class": "B",
        "taxcode": "TX001",
        "debitamount": 75,
        "item": "1002",
        "sublist": "item",
        "lineuniquekey": "4"
    },
    "5": {
        "department": "Marketing",
        "location": "San Francisco",
        "class": "A",
        "taxcode": "TX002",
        "debitamount": 100,
        "item": "1003",
        "sublist": "item",
        "lineuniquekey": "5"
    }
};


console.log(orderLines(jsonLines));
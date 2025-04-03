/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/file', 'N/log'], function(file, log) {

    /**
     * Función que parsea una cadena CSV y la convierte en un arreglo de objetos.
     * Separa la primera línea para obtener los encabezados y luego recorre cada línea.
     *
     * @param {string} csvText - Contenido del CSV.
     * @returns {Array} Arreglo de objetos con las propiedades definidas en el encabezado.
     */
    function parseCsvToArray(csvText) {
        // Separa el contenido en líneas (considerando diferentes saltos de línea)
        let lines = csvText.split(/\r\n|\n/);
        let result = [];
        
        if (lines.length === 0) {
            return result;
        }
        
        // La primera línea contiene los encabezados
        let headers = lines[0].split(',');
        
        // Recorre las líneas restantes
        for (let i = 1; i < lines.length; i++) {
            let line = lines[i].trim();
            // Si la línea está vacía, la omite
            if (line === '') {
                continue;
            }
            
            // Separa los valores de la línea
            let values = line.split(',');
            let obj = {};
            
            // Crea un objeto asignando cada valor a su respectivo encabezado
            for (let j = 0; j < headers.length; j++) {
                // Si lo deseas, aquí puedes transformar el nombre de la propiedad
                // Ejemplo: headers[j].trim().toLowerCase() para usar minúsculas
                obj[ headers[j].trim() ] = values[j] ? values[j].trim() : '';
            }
            
            result.push(obj);
        }
        
        return result;
    }
    
    /**
     * Función principal de ejecución.
     * Se muestran dos alternativas:
     *   1) Cargar el CSV desde el file cabinet.
     *   2) Usar una cadena CSV definida directamente.
     *
     * En este ejemplo se usa la opción 2.
     */
    function execute(context) {
        try {
            // OPCIÓN 1: Cargar el archivo CSV desde el file cabinet
            // let csvFile = file.load({ id: 'SuiteScripts/miArchivo.csv' });
            // let csvContent = csvFile.getContents();
            
            // OPCIÓN 2: Usar una cadena CSV directamente (aquí se muestra un ejemplo con pocas líneas)
            let csvContent = "Índice,Transacción\n" +
                             "1,OSF-BRSP NFS-e-3504\n" +
                             "2,OSF-BRSP NFS-e-3503\n" +
                             "3,OSF-BRSP NFS-e-3500\n" +
                             "4,OSF-BRSP NFS-e-3501\n" +
                             "5,OSF-BRSP NFS-e-3502\n" +
                             "6,OSF-BRSP NFS-e-01\n" +
                             "7,OSF-BRSP NFS-e-3505"; // Puedes completar el CSV completo según necesites
            
            // Parsea el CSV y obtiene el arreglo de objetos
            let arrObjetos = parseCsvToArray(csvContent);
            
            // Imprime el arreglo en el log para verificar el resultado
            log.debug({
                title: 'Arreglo de objetos obtenido del CSV',
                details: arrObjetos
            });
            
        } catch (e) {
            log.error({
                title: 'Error al procesar el CSV',
                details: e
            });
        }
    }
    
    return {
        execute: execute
    };
    
});

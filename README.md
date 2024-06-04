
# [CP2400314    4265: CO - Error de impresión PDF + GL WHT con feature](https://docs.google.com/document/d/12uIMF_EN3Tfa4DdkY0WSw3XncpxT0Yt-xFQSuL9hlP0/edit)


## Description of the Requirement

Sin embargo, al momento de utilizar el botón “CO-PRINT GL WHT” y seleccionar cualquiera de las opciones (PDF, CSV o XLS) de uno de los libros contables. Vemos que la pagina se queda en blanco:


## Description of the solution


## Scripts
+ Create

+ Update
    
+ Delete

## Records
+ Create
   
+ Update
    
## Fields
+ Create
+ Update 
+ Delete

## Features
+ Create
+ Involved
+ Delete

## Bundles involved
+ 37714 (production environment)
+ 35754 (development environment)

## Observations
 

## Error




https://tstdrv2083663.app.netsuite.com/app/accounting/transactions/vendbill.nl?id=548535&whence=&cmid=1715804158181_20808





ENCONTRO TRANACCIONES FILTRADS CON 0


## Detalle técnico del error:
   No genera el tranid con check desactivado


## Pasos para la ejecución del error:
    Crear transacciones por csv con version de anterior
## Bundles implicados:
    Manager 37714 
## Script modificados:

## Especificación de la modificación:
    Se cambio el llamado de la libreria
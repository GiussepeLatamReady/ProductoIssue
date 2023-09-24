Caso Decameron - Error al guardar Item Receipt



## Detalle técnico del error:
   Se estuvo intentando guardar una recepción de artículo desde la orden de compra PO-PEA-135

https://4670014-sb1.app.netsuite.com/app/accounting/transactions/purchord.nl?id=37274535&whence=

La recepción que se intentó guardar fue por el total de los artículos y todos dirigidos a una misma ubicación "PEA-Agencia Radisson". Al momento de darle guardar salta el siguiente mensaje de error:

## Pasos para la ejecución del error:
    Crear una copia del Bill que pasado por el proce de detracciones
## Bundles implicados:
    Manager 37714 
## Script modificados:

## Especificación de la modificación:
    El proceso de desactivacion del LATAM - TRANSACTION REFERENCE se estableció solo para el pais de colombia.
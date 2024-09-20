
# [CP2400485   ]()


## Description of the Requirement




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
   El error se da debido a que no se valida el feature foreign currency management (enable feature - tab accounting) al momento de obtener la moneda del libro contable seleccionado.

## Pasos para la ejecución del error:
    ir a una factura  y dar click al boton de cabcera "CO-PRINT GL WHT", luego esocger el libro contable y formato.
## Bundles implicados:
    Manager 37714 
## Script modificados:
    Name:LatamReady - CO WHT GL Impact STLT
    Id:customscript_lmry_co_wht_gl_impact_stlt
    File:LMRY_CO_WHT_GL IMPACT_STLT.js
## Especificación de la modificación:
    Se agregó la validación del feature foreign currency management en el script especificado.
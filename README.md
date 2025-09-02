
# [D2134   Error en módulo pago de retenciones compras]()


## Description of the Requirement

    El Stlt del preview desde advance massive payament tiene el boton de cancelar que te redirige a un modulo distinto



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
   EL campo LATAM - MX CAC se visualiza al momento de editar la cuenta contable aunque la subsidiria relacionada del pais de Mexico este desactivada.

## Pasos para la ejecución del error:
    Editar una cuenta contable asociada a una subsidiaria de mexico inactivada.
## Bundles implicados:
    Manager 37714 
## Script modificados:
    LMRY_AccountURET_V2.0.js
## Especificación de la modificación:
    Se valida la existencia para la  insercion de datos del campo LATAM - MX CAC cuando la cuenta sea editable.
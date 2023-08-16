# 2703 :WSP / LATAM - TRANSACTION REFERENCE


## Detalle técnico del error:
    Cuando se realiza una copia de una factura que ya ha sido pagada de sus detracciones, también se copia el número de journal y no se puede modificar, ya que el campo se encuentra inactivo. Esto genera que la factura que se crea mediante la copia sea interpretada por el sistema como pagada de detracciones.
    El problema se produce debido al considerar el proceso de desactivacion del LATAM - TRANSACTION REFERENCE para todos los paises.
## Pasos para la ejecución del error:
    Crear una copia del Bill que pasado por el proce de detracciones
## Bundles implicados:
    Manager 37714 
## Script modificados:
* Name: LatamReady - Vendor Bill CLNT 2.0
* Id: customscript_lmry_vendorbill_clnt_2_0
* File: LMRY_VendorBillCLNT_V2.0.js
## Especificación de la modificación:
    El proceso de desactivacion del LATAM - TRANSACTION REFERENCE se estableció solo para el pais de colombia.
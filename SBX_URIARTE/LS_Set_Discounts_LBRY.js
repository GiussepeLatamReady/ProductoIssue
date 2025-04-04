/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Name LS_Set_Discounts_LBRY.js
 * @Author anthony@latamready.com
 */
define(['N/record', "N/search"], function (record, search) {

    const setPriceList = (objRecord) => {

      let cItems = objRecord.getLineCount('item');
      let items = [];
      let currency = objRecord.getValue('currency');

      for(let i = 0; i < cItems; i++){

        items.push(objRecord.getSublistValue({sublistId: 'item', fieldId:'item', line: i}));

        //Blankeo
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lr_descuentolista', line: i, value: ''});
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lr_preciolista', line: i, value: ''});
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lr_importedescuentolista', line: i, value: ''});


      }

      let preciosBase = getPreciosBase(items, currency);
      let discounts = getDiscounts();

      for(let i = 0; i < cItems; i++){

        let priceList = objRecord.getSublistValue({sublistId: 'item', fieldId: 'price', line: i});
        let rate = objRecord.getSublistValue({sublistId: 'item', fieldId: 'rate', line: i});
        let quantity = objRecord.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i});
        let amount = objRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i});
        let idItem = objRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});

        let tributo = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_ar_item_tributo', line: i});
        let itemType = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_item_type', line: i});

        if(tributo == 'T' || tributo == true || itemType == 'Descuento' ||  itemType == 'Discount'){
          continue;
        }

        if(priceList == -1){

          objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lr_descuentolista', line: i, value: ''});
          objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lr_preciolista', line: i, value: rate});
          objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lr_importedescuentolista', line: i, value: rate});
          continue;

        }

        //Descuento
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lr_descuentolista', line: i, value: Math.abs(parseFloat(discounts[priceList])) || ''});
        //Precio Base
        let setPrecioBase = '', resta = '';
        if(preciosBase[idItem]){

          for(let j = 0; j < preciosBase[idItem].length; j++){

            var minimo = preciosBase[idItem][j]['minimo'];
            let maximo = preciosBase[idItem][j]['maximo'];
            let price = preciosBase[idItem][j]['price'];

            if(parseFloat(quantity) >= parseFloat(minimo) && parseFloat(quantity) < parseFloat(maximo)){

              setPrecioBase = parseFloat(preciosBase[idItem][j]['price']);
              resta = parseFloat(setPrecioBase) - parseFloat(rate);

            }


          }

        }else {
          setPrecioBase = rate;
          resta = rate;
        }

        objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lr_preciolista', line: i, value: setPrecioBase});
        //Resta
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lr_importedescuentolista', line: i, value: resta});

      }

    }

    const setGlobalDiscountItem = (objRecord) => {

      let customDiscount = objRecord.getValue('custbody_lmry__item_descuento');
      let customRate = 0;

      if(customDiscount){
        let objDiscount = record.load({
          type: 'discountitem',
          id: customDiscount
        });

        customRate = objDiscount.getValue('rate');

      }

      log.debug('customRate', customRate);

      //remove lineas
      let nLineas = objRecord.getLineCount('item');

      for(let i = nLineas - 1; i >= 0; i--){

        let tributo = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_ar_item_tributo', line: i});
        let itemType = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_item_type', line: i});
        let esDescGlobal = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry__esdescuentoglobal', line: i});

        if(/*tributo || */esDescGlobal || itemType == 'Subtotal'){
          objRecord.removeLine({sublistId: 'item', line: i, ignoreRecalc: true});
        }

      }

      let idSubtotal = getItemSubtotal(objRecord);

      log.debug('idSubtotal', idSubtotal);

      if(!customDiscount || !idSubtotal){

        objRecord.setValue('custbody_ur_porc_desglobal', '');
        objRecord.setValue('custbody_lmry__tarifadescuento', '');

        objRecord.save({disableTriggers: true, ignoreMandatoryFields: true});

        return true;

      }

      //Obtener posición por si no se ha eliminado percepción
      let hasPerc = getPositionPerc(objRecord)[0];
      let positionPerc = getPositionPerc(objRecord)[1];

      let firstTaxCode = objRecord.getSublistValue({sublistId: 'item', fieldId: 'taxcode', line: 0});

      if(hasPerc){

        objRecord.insertLine({sublistId: 'item', line: positionPerc});
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'item', line: positionPerc, value: idSubtotal});

        objRecord.insertLine({sublistId: 'item', line: positionPerc + 1});
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'item', line: positionPerc + 1, value: customDiscount});
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lmry__esdescuentoglobal', line: positionPerc + 1, value: true});
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'taxcode', line: positionPerc + 1, value: firstTaxCode});


      }else{

        nLineas = objRecord.getLineCount('item');
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'item', line: nLineas, value: idSubtotal});

        objRecord.setSublistValue({sublistId: 'item', fieldId: 'item', line: nLineas + 1, value: customDiscount});
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lmry__esdescuentoglobal', line: nLineas + 1, value: true});
        objRecord.setSublistValue({sublistId: 'item', fieldId: 'taxcode', line: nLineas + 1, value: firstTaxCode});

      }

      //Cabecera
      objRecord.setValue('custbody_ur_porc_desglobal', customRate);

      objRecord.save({disableTriggers: true, ignoreMandatoryFields: true});

    }

    const setLineDiscountColumn = (objRecord) => {

      for(let i = 0; i < objRecord.getLineCount({sublistId: 'item'}); i++){

        let itemType = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_item_type', line: i});
        let esDescGlobal = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry__esdescuentoglobal', line: i});
        let amount = objRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i});
       
        if((itemType == 'Descuento' || itemType == 'Discount') && !esDescGlobal){

          if(i - 1 >= 0){

            let salesDiscount = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_col_sales_discount', line: i - 1}) || 0;
            salesDiscount += parseFloat(Math.abs(amount));
    
            objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_col_sales_discount', line: i - 1, value: salesDiscount});
  
          }

        }

      }

    }

    const setGlobalDiscountColumn = (objRecord) => {

      let descGlobal = '';
      let rateGlobal = '';

      for(let i = 0; i < objRecord.getLineCount({sublistId: 'item'}); i++){

        objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_col_sales_discount', line: i, value: ''});

        let esDescGlobal = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry__esdescuentoglobal', line: i});

        if(esDescGlobal){
          descGlobal = objRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i});
          rateGlobal = objRecord.getSublistValue({sublistId: 'item', fieldId: 'rate', line: i});
        }

      }

      if(descGlobal){
        objRecord.setValue('custbody_lmry__tarifadescuento', descGlobal);

        for(let i = 0; i < objRecord.getLineCount({sublistId: 'item'}); i++){

          let itemType = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_item_type', line: i});
          let esDescGlobal = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry__esdescuentoglobal', line: i});
          let isTributo = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_ar_item_tributo', line: i});
          let amount = objRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i});
          amount = parseFloat(amount);

          if(itemType == 'Descuento' || itemType == 'Discount' || itemType == 'Subtotal' || esDescGlobal || isTributo){
            continue;
          }

          if(i + 1 < objRecord.getLineCount({sublistId: 'item'})){
            let typeDesc = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_item_type', line: i + 1});
            let esDescGlobal = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry__esdescuentoglobal', line: i + 1});

            let descLinea = objRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i + 1});
            descLinea = parseFloat(descLinea);

            if((typeDesc == 'Descuento' || typeDesc == 'Discount') && !esDescGlobal){
              amount += descLinea;
            }

          }

          let descColumn = (parseFloat(amount) * parseFloat(rateGlobal))/100;
          descColumn = Math.abs(descColumn);

          objRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_col_sales_discount', line: i, value: descColumn});


        }
      }

    }

    const getDiscounts = () => {

      let jsonDiscounts  = {};

      let searchPrices = search.create({
        type: 'pricelevel',
        columns: ['discountpct']
      });

      searchPrices = searchPrices.run().getRange(0, 1000);

      if(searchPrices && searchPrices.length){

        for(let i = 0; i < searchPrices.length; i++){

          jsonDiscounts[searchPrices[i].id] = searchPrices[i].getValue('discountpct');

        }

      }

      //log.debug('jsonDiscounts', jsonDiscounts);

      return jsonDiscounts;

    }

    const getPreciosBase = (items, currency) => {

      let jsonItems  = {};

      let searchItems = search.create({
        type: 'item',
        columns: [
          {name: 'unitprice', join: 'pricing'},
          {name: 'pricelevel', join: 'pricing'},
          {name: 'minimumquantity', join: 'pricing'},
          {name: 'maximumquantity', join: 'pricing'}
        ],
        filters: [
          {name: 'internalid', operator: 'anyof', values: items},
          {name: 'currency', join: 'pricing', operator: 'anyof', values: currency},
          {name: 'internalid', join: 'pricing', operator: 'is', values: '1'} //Precio Base
        ]
      });

      searchItems = searchItems.run().getRange(0, 1000);

      if(searchItems && searchItems.length){

        for(let i = 0; i < searchItems.length; i++){

          let idItem = searchItems[i].id;
          let basePrice = searchItems[i].getValue({name: 'unitprice', join: 'pricing'});
          //let priceLevel = searchItems[i].getValue({name: 'pricelevel', join: 'pricing'});
          let minimumQuantity = searchItems[i].getValue({name: 'minimumquantity', join: 'pricing'});
          let maximumQuantity = searchItems[i].getValue({name: 'maximumquantity', join: 'pricing'}) || 1000000;


          jsonItems[idItem] = jsonItems[idItem] || [];
          //jsonItems[idItem][priceLevel] = jsonItems[idItem][priceLevel] || [];

          jsonItems[idItem].push(
            {'minimo': minimumQuantity, 'maximo': maximumQuantity, 'price': basePrice}
          );

        }

      }

      //log.debug('jsonItems', jsonItems);

      return jsonItems;

    }

    const getItemSubtotal = (objRecord) => {

      let searchSetup = search.create({
        type: 'customrecord_lmry_setup_tax_subsidiary',
        columns: ['custrecord_lr_subtotal_item'],
        filters: [
          {name: 'custrecord_lmry_setuptax_subsidiary', operator: 'is', values: objRecord.getValue('subsidiary')},
          {name: 'isinactive', operator: 'is', values: 'F'}
        ]
      });

      searchSetup = searchSetup.run().getRange(0, 1);

      if(searchSetup && searchSetup.length){

        return searchSetup[0].getValue('custrecord_lr_subtotal_item') || '';

      }

      return '';

    }

    const getPositionPerc = (objRecord) => {

      for(let i = 0; i < objRecord.getLineCount('item'); i++){

        let tributo = objRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_lmry_ar_item_tributo', line: i});

        if(tributo){

          return [true, i];

        }

      }

      return [false, ''];


    }

    const updateTransactionFields = (objRecord) => {

      let recordObj = record.load({
        type: objRecord.type,
        id: objRecord.id
      });

      DeleteGroupLine(recordObj.id);

      var arr_DatFil = [];
      var arr_PosFil = -1;

      var tax_group = search.create({
        type: "customrecord_lmry_setup_taxcode_group",
        filters: [{
          name: 'isinactive',
          operator: 'is',
          values: ['F']
        }],
        columns: ["internalid", "custrecord_lmry_setup_taxcode_country",
          search.createColumn({
            name: "custrecord_lmry_setup_taxcode_group",
            sort: search.Sort.ASC
          }), "custrecord_lmry_setup_taxcode",
          search.createColumn({
            name: "custrecord_lmry_setup_id_custbody",
            join: "custrecord_lmry_setup_taxcode_group"
          }),
          search.createColumn({
            name: "custrecord_lmry_setup_amount_to",
            join: "custrecord_lmry_setup_taxcode_group"
          })
        ]
      });

      var result_grps = tax_group.run().getRange(0, 1000);

      if (result_grps != null && result_grps.length > 0) {
        for (var TaxLine = 0; TaxLine < result_grps.length; TaxLine++) {
          // Declaracion de JSON y Arreglo Tax Group
          var arr_DatCol = {};
          arr_DatCol["TaxGroup"] = ''; // Latam - Tax Code Group
          arr_DatCol["TaxCodes"] = ''; // Latam - Tax Code
          arr_DatCol["TaxField"] = ''; // Latam - Setup ID Custbody
          arr_DatCol["TaxBase"] = ''; // Latam - Setup Amount To
          arr_DatCol["TaxAmoun"] = 0; // Amount

          var arr_Fields = result_grps[TaxLine].columns;

          // TaxLine = Filas del TAX Group
          arr_DatCol.TaxGroup = result_grps[TaxLine].getValue(arr_Fields[2]); // Latam - Tax Code Group
          arr_DatCol.TaxCodes = result_grps[TaxLine].getValue(arr_Fields[3]); // Latam - Tax Code
          arr_DatCol.TaxField = result_grps[TaxLine].getValue(arr_Fields[4]); // Latam - Setup ID Custbody
          arr_DatCol.TaxBase = result_grps[TaxLine].getValue(arr_Fields[5]); // Latam - Setup Amount To
          arr_DatCol.TaxAmoun = 0; // Amount

          if (!arr_DatCol.TaxBase) {
            continue;
          }

          var baseBill = '';
          switch (arr_DatCol.TaxBase) {
            case "1":
              baseBill = 'grossamt';
              break;
            case "2":
              baseBill = 'tax1amt';
              break;
            case "3":
              baseBill = 'amount';
              break;
          }

          // arr_RowSws = switch de si existen lienas
          var arr_RowSws = false;

          /*******************************
           * Solo para la sublista Items
           *******************************/
          var cantidad_items = recordObj.getLineCount({
            sublistId: 'item'
          });
          if (cantidad_items > 0) {
            for (var ItemLine = 0; ItemLine < cantidad_items; ItemLine++) {
              var lin_taxcode = recordObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'taxcode',
                line: ItemLine
              });
              var lin_amounts = recordObj.getSublistValue({
                sublistId: 'item',
                fieldId: baseBill,
                line: ItemLine
              });
              // Compara codigos de impuesto
              if (arr_DatCol.TaxCodes == lin_taxcode) {
                arr_RowSws = true;
                arr_DatCol.TaxAmoun = parseFloat(arr_DatCol.TaxAmoun) + parseFloat(lin_amounts);
              }
            }
          } // Solo para la sublista Items

          // Solo si a capturado valores
          if (arr_RowSws == true) {
            // Incrementa las Filas
            arr_PosFil = arr_PosFil + 1;

            // arr_DatCol = Filas de la agrupacion
            arr_DatFil[arr_PosFil] = arr_DatCol;
          }
        } // Fin Barrido del grupo de impuestos

        /**********************************
         * Realiza la agrupacion por
         * Tax Code Group, Suma importes
         * Solo si existe informacion
         **********************************/
        //arr_DatFil[0].TaxGroup != '' && arr_DatFil[0].TaxGroup != null
        if (arr_DatFil.length > 0 && arr_DatFil != null) {
          var aux_DatCol = {};
          aux_DatCol["TaxGroup"] = ''; // Latam - Tax Code Group
          var aux_PosFil = -1;
          var aux_DatFil = [];
          // Carga el arreglo con el JSON
          aux_DatFil[aux_PosFil] = aux_DatCol;
          for (var nCols = 0; nCols < arr_DatFil.length; nCols++) {
            if (aux_DatFil[aux_PosFil].TaxGroup != arr_DatFil[nCols].TaxGroup) {
              var aux_DatCol = {};
              aux_DatCol["TaxGroup"] = arr_DatFil[nCols].TaxGroup; // Latam - Tax Code Group
              aux_DatCol["TaxCodes"] = ''; // Latam - Tax Code
              aux_DatCol["TaxField"] = ''; // Latam - Setup ID Custbody
              aux_DatCol["TaxAmoun"] = 0; // Amount

              // Incrementa Fila
              aux_PosFil = aux_PosFil + 1;

              // Carga el arreglo con el JSON
              aux_DatFil[aux_PosFil] = aux_DatCol;
            }
            aux_DatFil[aux_PosFil].TaxGroup = arr_DatFil[nCols].TaxGroup; // Latam - Tax Code Group
            aux_DatFil[aux_PosFil].TaxField = arr_DatFil[nCols].TaxField; // Latam - Setup ID Custbody
            aux_DatFil[aux_PosFil].TaxAmoun = parseFloat(aux_DatFil[aux_PosFil].TaxAmoun) +
              parseFloat(arr_DatFil[nCols].TaxAmoun); // Amount
          }

          /**********************************
           * Graba  en el record
           * LatamReady - Transaction Fields
           * los importes acumula
           **********************************/
          var Record_TFS = '';

          // Crea el registro nuevo
          Record_TFS = record.create({
            type: 'customrecord_lmry_transactions_fields',
            isDynamic: true
          });

          // Latam - Related Transaction
          Record_TFS.setValue({
            fieldId: 'custrecord_lmry_transaction_f',
            value: recordObj.id
          });
          Record_TFS.setValue({
            fieldId: 'custrecord_lmry_transaction_f_id',
            value: recordObj.id
          });
          // Latam - Exento
          Record_TFS.setValue({
            fieldId: 'custrecord_lmry_transaction_f_exento',
            value: 0
          });
          // Latam - IVA
          Record_TFS.setValue({
            fieldId: 'custrecord_lmry_transaction_f_iva',
            value: 0
          });
          // Latam - Neto Gravado
          Record_TFS.setValue({
            fieldId: 'custrecord_lmry_transaction_f_gravado',
            value: 0
          });
          // Latam - Neto No Gravado
          Record_TFS.setValue({
            fieldId: 'custrecord_lmry_transaction_f_no_gravado',
            value: 0
          });

          // Actualiza los campos de Record
          for (var nCols = 0; nCols < aux_DatFil.length; nCols++) {
            // nCols = Fila del arreglo
            // [nCols][2] = Latam - Setup ID Custbody
            // [nCols][3] = Amount
            Record_TFS.setValue({
              fieldId: aux_DatFil[nCols].TaxField,
              value: Math.round(parseFloat(aux_DatFil[nCols].TaxAmoun) * 100) / 100
            });
          }

          // Graba el record
          Record_TFS.save({
            ignoreMandatoryFields: true,
            disableTriggers: true,
            enableSourcing: true
          });
        } // Solo si se cargo Tax
      } // Solo si tiene Items

    }

    const DeleteGroupLine = (recordID) => {

      var tax_group = search.create({
        type: 'customrecord_lmry_transactions_fields',
        columns: ['internalid', 'custrecord_lmry_transaction_f'],
        filters: [{
          name: 'custrecord_lmry_transaction_f_id',
          operator: 'equalto',
          values: recordID
        }]
      });

      var result_tax = tax_group.run().getRange(0, 1000);

      if (result_tax != null && result_tax.length > 0) {
        for (var delLine = 0; delLine < result_tax.length; delLine++) {
          record.delete({
            type: 'customrecord_lmry_transactions_fields',
            id: result_tax[delLine].getValue('internalid'),
          });
        } // Eliminacion de Records

      }

    }

    return {

      setPriceList, setGlobalDiscountItem, setGlobalDiscountColumn, setLineDiscountColumn, updateTransactionFields

    }
});

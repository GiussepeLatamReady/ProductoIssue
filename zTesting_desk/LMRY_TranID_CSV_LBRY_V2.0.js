/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_TranID_CSV_LBRY_V2.0.js                     ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Dec 30 2021  LatamReady    Use Script 2.0           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

define(['N/log', './LMRY_libSendingEmailsLBRY_V2.0', 'N/search', 'N/runtime', './LMRY_libToolsFunctionsLBRY_V2.0', './LMRY_Validate_TranID_LBRY'],

  function (log, libraryMail, search, runtime, libtools, libraryVaTranId) {

    const LMRY_script = 'LMRY_TranID_CSV_LBRY_V2.0';

    var featuresubs = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
    /**
     * Code: C0583|C0592
     * Summary: Exclude subsidiary and vendor from the concatenation process or trigger the process
     * Date: 15/06/2022
     */

    //Feature de Strict Bill / Bill Credit Duplicity
    var features = {
      'AR': {
        'vendorbill': 689, //Strict Bill Duplicity
        'vendorcredit': 699,//Strict Bill Credit Duplicity
        'validateTranId': 505,//Validate Tranid (Vendor Bill)
        'exclude': 916 //Automatic Tran Id (A/P)
      },
      'CO': {
        'vendorbill': 687,
        'vendorcredit': 697,
        'validateTranId': 509,
        'exclude': 917
      },
      'MX': {
        'vendorbill': 688,
        'vendorcredit': 698,
        'validateTranId': 514,
        'exclude': 918
      },
      'PE': {
        'vendorbill': 684,
        'vendorcredit': 694,
        'validateTranId': 518,
        'exclude': 990
      },
      'CL': {
        'vendorbill': 686,
        'vendorcredit': 696,
        'validateTranId': 508,
        'exclude': 992
      },
      'PA': {
        'vendorbill': 692,
        'vendorcredit': 702,
        'validateTranId': 516,
        'exclude': 991
      }
    }

    function generateTranID(recordObj, LMRY_countr, licenses) {
      try {

        log.debug('Inicio el Desarrollo de', ' [generateTranID] ');
        var recordType = recordObj.getValue('baserecordtype');

        var docType = recordObj.getValue('custbody_lmry_document_type');
        var docCxp = recordObj.getValue('custbody_lmry_serie_doc_cxp');
        var numPre = recordObj.getValue('custbody_lmry_num_preimpreso');
        var idsubsi = recordObj.getValue({ fieldId: 'subsidiary' });

        if (LMRY_countr == 'AR' && libraryMail.getAuthorization(707, licenses) == true) {
          docCxp = libtools.completeSeries(docCxp, idsubsi);
          numPre = libtools.completePreprinted(numPre, idsubsi);
          recordObj.setValue({ fieldId: 'custbody_lmry_serie_doc_cxp', value: docCxp });
          recordObj.setValue({ fieldId: 'custbody_lmry_num_preimpreso', value: numPre });
        }

        if (features.hasOwnProperty(LMRY_countr) && libraryMail.getAuthorization(features[LMRY_countr][recordType], licenses)) {
          if (!validateEqualDocuments(recordObj, LMRY_countr, licenses)) {
            return false;
          }
        }

        log.debug('docType - docCxp - numPre', docType + ' - ' + docCxp + ' - ' + numPre);

        if (docType != '' && docType != null) {
          var textIni = search.lookupFields({
            type: 'customrecord_lmry_tipo_doc',
            id: docType,
            columns: ['custrecord_lmry_doc_initials']
          });

          var textIni = textIni.custrecord_lmry_doc_initials || '';
          var text = ''

          if (features.hasOwnProperty(LMRY_countr) && libraryMail.getAuthorization(features[LMRY_countr][recordType], licenses) &&
            !libraryMail.getAuthorization(features[LMRY_countr]['exclude'], licenses)) {
            var idprove = recordObj.getValue({ fieldId: 'entity' });
            var presubsi = search.lookupFields({
              type: 'subsidiary',
              id: idsubsi,
              columns: ['tranprefix']
            });
            //Latam - Prefix Vendor
            var preprove = search.lookupFields({
              type: 'vendor',
              id: idprove,
              columns: ['custentity_lmry_prefijo_prov']
            });

            presubsi = presubsi.tranprefix;
            preprove = preprove.custentity_lmry_prefijo_prov;
            if (preprove.length > 12) {
              preprove = preprove.slice(0, 12);
            }
            text += preprove.toUpperCase() + ' ' + presubsi.toUpperCase() + ' ';

          }

          text += textIni.toUpperCase() + ' ' + docCxp + '-' + numPre;

          log.debug('text', text);

          recordObj.setValue({
            fieldId: 'tranid',
            value: text
          });

          if (!libraryVaTranId.validateTranID(recordObj, LMRY_countr, licenses)) {
            return false;
          }
        }
      } catch (error) {
        log.error('generateTranID', error);
        libraryMail.sendemail('[generateTranID] ' + error, LMRY_script);
      }
      return true;
    }

    function validateEqualDocuments(recordObj, LMRY_countr, licenses) {
      var exist = true;
      try {

        var idtransac = recordObj.id;
        var proveedor = recordObj.getValue({ fieldId: 'entity' });
        var tipoDoc = recordObj.getValue({ fieldId: 'custbody_lmry_document_type' });
        var nroSerie = recordObj.getValue({ fieldId: 'custbody_lmry_serie_doc_cxp' });
        var nroDoc = recordObj.getValue({ fieldId: 'custbody_lmry_num_preimpreso' });
        var subsidia = recordObj.getValue({ fieldId: 'subsidiary' });
        var typeTransaccion = recordObj.getValue({ fieldId: 'baserecordtype' });

        if (proveedor != '' &&
          (tipoDoc != '' && tipoDoc != null && tipoDoc != -1) &&
          (nroSerie != '' && nroSerie != null && nroSerie != -1) &&
          (nroDoc != '' && nroDoc != null)) {

          var exclusionDocument = libtools.validateExclusionDocument(tipoDoc);
          var filters = [];
          filters.push(search.createFilter({
            name: 'mainline',
            operator: search.Operator.IS,
            values: 'T'
          }));
          filters.push(
            search.createFilter({
              name: 'entity',
              operator: search.Operator.IS,
              values: proveedor
            })
          );
          if (LMRY_countr == 'AR' && libraryMail.getAuthorization(829, licenses) == true && exclusionDocument) filters.pop()
          filters.push(search.createFilter({
            name: 'custbody_lmry_document_type',
            operator: search.Operator.IS,
            values: tipoDoc
          }));
          filters.push(search.createFilter({
            name: 'custbody_lmry_serie_doc_cxp',
            operator: search.Operator.IS,
            values: nroSerie
          }));
          filters.push(search.createFilter({
            name: 'custbody_lmry_num_preimpreso',
            operator: search.Operator.IS,
            values: nroDoc
          }));
          // Valida si es OneWorld
          if (featuresubs) {
            filters.push(search.createFilter({
              name: 'subsidiary',
              operator: search.Operator.IS,
              values: subsidia
            }));
          }
          var searchresults = search.create({
            type: typeTransaccion,
            columns: ['internalid', 'entity'],
            filters: filters
          });
          var searchresults = searchresults.run().getRange(0, 1000);
          if (searchresults != null && searchresults != '') {
            //prefijo actual
            var prefix = recordObj.getValue({
              fieldId: 'entity'
            });
            var oldpref = search.lookupFields({
              type: 'vendor',
              id: prefix,
              columns: ['custentity_lmry_prefijo_prov']
            });
            oldpref = oldpref.custentity_lmry_prefijo_prov || "";
            oldpref = oldpref.trim();
            //prefijo nuevo
            var prefixid = searchresults[0].getValue('entity')
            var newpref = search.lookupFields({
              type: 'vendor',
              id: prefixid,
              columns: ['custentity_lmry_prefijo_prov']
            });
            newpref = newpref.custentity_lmry_prefijo_prov || "";
            newpref = newpref.trim();

            // Se valida que no sea el mismo registro
            if (idtransac == searchresults[0].getValue('internalid')) {
              exist = true;
            } else {
              if (LMRY_countr == 'AR' && libraryMail.getAuthorization(829, licenses)) {
                if (exclusionDocument) {
                  exist = false;
                  return exist;
                }
              }
              if (oldpref == newpref) {
                exist = false;
              } else {
                exist = true;
              }
            }
          }
        }
      } catch (err) {
        log.error('[ validateEqualDocuments ]', err)
        libraryMail.sendemail2('[ validateEqualDocuments ]' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
      }
      return exist;
    }

    return {
      generateTranID: generateTranID,
      validateEqualDocuments: validateEqualDocuments
    };

  });
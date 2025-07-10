/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for customer center (Time)                     ||
||                                                              ||
||  File Name: LMRY_EI_libSendingEmailsLBRY_V2.0.js             ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.0     Dec 2018  LatamReady    Use Script 2.0              ||
\= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
define(['N/search', 'N/https', 'N/log', 'N/email', 'N/runtime', 'N/record', 'N/url', 'N/format', 'SuiteBundles/Bundle 37714/Latam_Library/LMRY_MD5_encript_LBRY_V2.0.js'],

    function(search, https, log, email, runtime, record, url, format, libraryMD5) {

        function getEIAuthorization(country, feature_tag) {

            try {
                //log.debug('LMRY_EI_libSendingEmailsLBRY_V2.0', 'INICIO getEIAuthorization');
                //log.debug('country - feature_tag', country + ' - ' + feature_tag);

                var featureID = '';
                var customerId = runtime.accountId;
                var resulAuthorization = false;
                featureID = getFeatureID(country, feature_tag);
                if (featureID != '' && featureID != null) {

                    var busqLatamLicense = search.create({
                        type: 'customrecord_latam_licenses',
                        columns: ['custrecord_latam_feature', 'custrecord_expiration_date'],
                        filters: [
                            ['custrecord_latam_feature', 'is', featureID], 'and', ['custrecord_latam_customer', 'is', customerId]
                        ]
                    });

                    var resultLatamLicense = busqLatamLicense.run().getRange(0, 10);

                    if (resultLatamLicense != null && resultLatamLicense.length != 0) {
                        row = resultLatamLicense[0].columns;
                        var featureId = resultLatamLicense[0].getValue(row[0]);
                        expiration = resultLatamLicense[0].getValue(row[1]);

                        var expirationDate = format.parse({
                            value: expiration,
                            type: format.Type.DATE
                        });

                        var day = expirationDate.getDate();
                        var month = expirationDate.getMonth() + 1;
                        var year = expirationDate.getFullYear();

                        if (new Date() < expirationDate) {
                            var busqEnabledFeature = search.create({
                                type: 'customrecord_latam_enabled_features',
                                columns: ['custrecord_latam_enabled_feature'],
                                filters: [
                                    ['custrecord_latam_enabled_feature', 'is', featureId]
                                ]
                            });

                            var resultEnabledFeature = busqEnabledFeature.run().getRange(0, 10);
                            //log.debug("resultEnabledFeature.length", resultEnabledFeature.length);
                            if (resultEnabledFeature && resultEnabledFeature.length > 0) {
                                resulAuthorization = true;
                            }
                        }
                    }
                }

                //log.debug('LMRY_EI_libSendingEmailsLBRY_V2.0', 'FIN getEIAuthorization')
                //log.debug("resulAuthorization", resulAuthorization);

                return resulAuthorization;

            } catch (err) {
                log.error("Error getEIAuthorization", err);
            }

        }

        function getFeatureID(country, feature_tag) {

            //log.debug('LMRY_EI_libSendingEmailsLBRY_V2.0', 'INICIO getFeatureID');
            //log.debug('country - feature_tag', country + ' - ' + feature_tag);

            var featureID = '';

            switch (country) {
                case 'AR':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '220';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '291';
                    } else if (feature_tag == 'EI_ITEM_SPLIT') {
                        featureID = '393';
                    } else if (feature_tag == 'EI_ADVANCED') {
                        featureID = '341';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '512';
                    } else if (feature_tag == 'EI_SENDCUSTOMER_MASSIVE') {
                        featureID = '501';
                    }
                    break;
                case 'BO':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '221';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '292';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '507';
                    }
                    break;
                case 'BR':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '222';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '293';
                    } else if (feature_tag == 'EI_ADVANCED') {
                        featureID = '339';
                    } else if (feature_tag == 'EI_POIMPORT') {
                        featureID = '432';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '513';
                    } else if (feature_tag == 'EI_SENDCUSTOMER_MASSIVE') {
                        featureID = '502';
                    }
                    break;
                case 'CL':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '224';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '294';
                    } else if (feature_tag == 'EI_ITEM_SPLIT') {
                        featureID = '394';
                    } else if (feature_tag == 'EI_ADVANCED') {
                        featureID = '342';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '517';
                    } else if (feature_tag == 'EI_SENDCUSTOMER_MASSIVE') {
                        featureID = '506';
                    }
                    break;
                case 'CO':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '223';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '295';
                    } else if (feature_tag == 'EI_ITEM_SPLIT') {
                        featureID = '395';
                    } else if (feature_tag == 'EI_ADVANCED') {
                        featureID = '343';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '516';
                    } else if (feature_tag == 'EI_SENDCUSTOMER_MASSIVE') {
                        featureID = '505';
                    }
                    break;
                case 'CR':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '225';
                    } else if (feature_tag == 'EI_ITEM_SPLIT'){
                        featureID = '528';
                    } else if (feature_tag == 'EI_ADVANCED') {
                        featureID = '523';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '296';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '519';
                    } else if (feature_tag == 'EI_SENDCUSTOMER_MASSIVE') {
                        featureID = '508';
                    }
                    break;
                case 'EC':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '226';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '297';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '520';
                    } else if (feature_tag == 'EI_SENDCUSTOMER_MASSIVE') {
                        featureID = '509';
                    }
                    break;
                case 'MX':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '227';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '300';
                    } else if (feature_tag == 'EI_ITEM_SPLIT') {
                        featureID = '396';
                    } else if (feature_tag == 'EI_ADVANCED') {
                        featureID = '338';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '515';
                    } else if (feature_tag == 'EI_SENDCUSTOMER_MASSIVE') {
                        featureID = '504';
                    }
                    break;
                case 'PA':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '440';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '438';
                    } else if (feature_tag == 'EI_ADVANCED') {
                        featureID = '441';
                    } else if (feature_tag == 'EI_ITEM_SPLIT') {
                        featureID = '463';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '521';
                    } else if (feature_tag == 'EI_SENDCUSTOMER_MASSIVE') {
                        featureID = '510';
                    }
                    break;
                case 'PE':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '228';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '303';
                    } else if (feature_tag == 'EI_ITEM_SPLIT') {
                        featureID = '397';
                    } else if (feature_tag == 'EI_ADVANCED') {
                        featureID = '344';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '514';
                    } else if (feature_tag == 'EI_SENDCUSTOMER_MASSIVE') {
                        featureID = '503';
                    }
                    break;
                case 'UY':
                    if (feature_tag == 'EI_SETUP') {
                        featureID = '229';
                    } else if (feature_tag == 'EI_OWN') {
                        featureID = '304';
                    } else if (feature_tag == 'EI_SENDCUSTOMER') {
                        featureID = '522';
                    } else if (feature_tag == 'EI_SENDCUSTOMER_MASSIVE') {
                        featureID = '511';
                    }
                    break;
            }
            //log.debug('featureID', featureID);
            //log.debug('LMRY_EI_libSendingEmailsLBRY_V2.0', 'FIN getFeatureID');

            return featureID;

        }

        function getLicenses(subsidiary) {
          //  var arraysalida = [];
          var arrayLicenses = [];
          /*var urlText = url.resolveScript({
            scriptId: 'customscript_lmry_get_enable_feat_stlt',
            deploymentId: 'customdeploy_lmry_get_enable_feat_stlt',
            returnExternalUrl: true
          });

          urlText += '&subsi=' + subsidiary;
          var request = https.get({
            url: urlText
          });*/
          var featuresEnabled = getLicensesArray(subsidiary, 'F');
          var licensesFeatures;
          if (featuresEnabled != null && featuresEnabled != '') {
            licensesFeatures = JSON.parse(featuresEnabled);
            licensesFeatures.map(function(x) {
              arrayLicenses.push(parseInt(x));
              return true;
            });
          }
          return arrayLicenses;
        }

        function getAuthorization(featureId, licenses) {
          try {
            //log.debug('Libreria', 'getAuthorization ' + featureId);
            if (licenses && licenses.length) {
              var type_obj = typeof licenses;

              if (type_obj != 'object') {
                var new_licenses = JSON.parse(licenses);
                return new_licenses && new_licenses.indexOf(Number(featureId)) > -1;
              } else {
                //log.debug('entra object');
                return licenses && licenses.indexOf(Number(featureId)) > -1;
              }

            } else {
              return false;
            }
          } catch (err) {
            log.error("Error getAuthorization", err);
          }
        }

        function getLicensesArray(subsi_id, Rd_Json) {
            var features;
            if (subsi_id == null || subsi_id == '') {
                return JSON.stringify([]);
            }
            subsi_id = String(subsi_id);
            subsi_id = subsi_id.split('|');
            var searchSetup = search.create({
                type: 'customrecord_lmry_features_by_subsi',
                columns: ['custrecord_lmry_features_data', 'custrecord_lmry_features_crytpo', 'custrecord_lmry_features_subsidiary'],
                filters: [
                  ['isinactive', 'is', 'F'], 'AND',
                  ['custrecord_lmry_features_subsidiary', 'anyof', subsi_id]
                ]
              });
              searchSetup = searchSetup.run().getRange(0, 1000);
                if (searchSetup) {
                    if (Rd_Json == 'T') {
                        features = {};
                        for (var i = 0; i < searchSetup.length; i++) {
                            var data = searchSetup[i].getValue('custrecord_lmry_features_data');
                            var cryptoFeature = searchSetup[i].getValue('custrecord_lmry_features_crytpo');
                            var subsi = searchSetup[i].getValue('custrecord_lmry_features_subsidiary');
                            var createHash = libraryMD5.encrypt('Features' + data);
                            if (cryptoFeature == createHash) {
                                features[subsi] = data.split('\000');
                            } else {
                                features = {};
                                break;
                            }
                        }
                    } else {
                        features = [];
                        for (var i = 0; i < searchSetup.length; i++) {
                            var data = searchSetup[i].getValue('custrecord_lmry_features_data');
                            var cryptoFeature = searchSetup[i].getValue('custrecord_lmry_features_crytpo');
                            var createHash = libraryMD5.encrypt('Features' + data);
                            if (cryptoFeature == createHash) {
                                features = features.concat(data.split('\000'));
                            } else {
                                features = [];
                                break;
                            }
                        }
                    }

                } else {
                    if (Rd_Json == 'T') {
                        features = {};
                    } else {
                        features = [];
                    }
                }

            return JSON.stringify(features);
        }

        // Suitelet para obtener código del país: LatamReady - EI Get Country STLT
        function getCountryID(subsi_id) {
            var objResponse = '';
            var json_country = {};
            var country_code = '';
            var country_name = '';
            //log.debug('LMRY_EI_libSendingEmailsLBRY_V2', 'INICIO getCountryID');
            /*var url_stlt = url.resolveScript({
                scriptId: 'customscript_lmry_ei_get_country_stlt',
                deploymentId: 'customdeploy_lmry_ei_get_country_stlt',
                returnExternalUrl: true
            });
            url_stlt += '&subsi_id=' + subsi_id;*/ //parte comentada de country;

            // var host = url.resolveDomain({
            //     hostType: url.HostType.APPLICATION,
            //     accountId: runtime.accountId
            // });
            //log.debug('host', host);
            //url_stlt = host + url_stlt;
            //log.debug("url_stlt", url_stlt);
            //var objResponse = https.get("https://" + url_stlt);

            var featuresubs = runtime.isFeatureInEffect({
                feature: 'SUBSIDIARIES'
            });
            if (subsi_id != '' && subsi_id != null && !isNaN(subsi_id)) {
                if (featuresubs == true || featuresubs == 'T') {

                    var search_subsi = search.create({
                        type: 'subsidiary',
                        filters: ['internalid', 'anyof', subsi_id],
                        columns: ['country']
                    });
                    result_subsi = search_subsi.run().getRange(0, 1000);

                    if (result_subsi != '' && result_subsi != null) {
                        country_code = result_subsi[0].getValue('country');
                        country_name = result_subsi[0].getText('country');
                    }
                    log.debug("country_code - country_name", country_code+ '-' + country_name)
                } else {
                    
                    var url_stlt = url.resolveScript({
                        scriptId: 'customscript_lmry_ei_get_country_stlt',
                        deploymentId: 'customdeploy_lmry_ei_get_country_stlt',
                        returnExternalUrl: true
                    });
                    url_stlt += '&subsi_id=' + subsi_id;
                    
                    var request = https.get({
                        url: url_stlt
                    });
                    objResponse = request.body;
                    log.debug("string_country_2", JSON.parse(objResponse))
                    return JSON.parse(objResponse);
                }
            }

            json_country.code = country_code;
            json_country.name = country_name;
            string_country = JSON.stringify(json_country);
            log.debug("string_country", string_country)

            try {
                objResponse = JSON.parse(string_country);
            } catch (e) {
                log.error('getCountryID', e.valueOf().toString());
            }

            return objResponse;
        }

        function getAllLicenses() {
          var allLicenses = {};
          var search_features = search.create({
            type: 'customrecord_lmry_features_by_subsi',
            filters: [
              ['custrecord_lmry_features_subsidiary.isinactive', 'is', 'F'],
              'AND',
              ['isinactive', 'is', 'F']
            ],
            columns: ['custrecord_lmry_features_subsidiary']
          });

          var aux_feature = [];
          var features_active = search_features.run().getRange(0, 100);
          if (features_active && features_active.length) {
            for (var i = 0; i < features_active.length; i++) {
              var subsidiary = features_active[i].getValue('custrecord_lmry_features_subsidiary');
              aux_feature.push(subsidiary);
            }
          }

          if (aux_feature.length < 1) {
            return {};
          }
          //  var arraysalida = [];

          /*var urlText = url.resolveScript({
            scriptId: 'customscript_lmry_get_enable_feat_stlt',
            deploymentId: 'customdeploy_lmry_get_enable_feat_stlt',
            returnExternalUrl: true
          });

          urlText += '&subsi=' + aux_feature.join('|') + '&json=T';
          var request = https.get({
            url: urlText
          });*/
          //log.debug('getAllLicenses', request.body);
          var featuresEnabled = getLicensesArray(aux_feature.join('|'), 'T');
          var licensesFeatures;
          if (featuresEnabled != null && featuresEnabled != '' && featuresEnabled != undefined) {
            licensesFeatures = JSON.parse(featuresEnabled);
            var arrayLicenses;
            for (var aux in licensesFeatures) {
              arrayLicenses = [];
              licensesFeatures[aux].map(function(x) {
                arrayLicenses.push(parseInt(x));
                return true;
              });
              allLicenses[aux] = arrayLicenses;
            }

          } else {
            allLicenses = {};
          }
          return allLicenses;
        }

        return {
            getEIAuthorization: getEIAuthorization,
            getCountryID: getCountryID,
            getLicenses: getLicenses,
            getLicensesArray: getLicensesArray,
            getAuthorization: getAuthorization,
            getAllLicenses: getAllLicenses
        };
    });
/**
 * Libreria de reutilizacion de set TranId y WHT Code para Bill y Bill Credit
 * @NApiVersion 2.0
 * @NModuleScope Public
 */
define(['N/search', 'N/runtime', 'N/https', 'N/url', './LMRY_libSendingEmailsLBRY_V2.0'],

    function (search, runtime, https, url, library) {
        /**
         *
         * @param {Record} recordObj
         * @param {Array<Object>} LMRY_countr
         * @param {Array<Number>} licenses
         * @returns
         */
        function SetCustomField_WHT_Code_VC(recordObj, LMRY_countr, licenses) {
            try {
                // Solo para subsidiria de Bolivia, Colombia y Paraguay
                if (LMRY_countr[0] != 'BO' && LMRY_countr[0] != 'CO' && LMRY_countr[0] != 'PY') {
                    return true;
                }
                if (runtime.executionContext === 'USERINTERFACE') {
                    // Latam Colombia
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_reteica',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_reteica_amount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_reteiva',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_reteiva_amount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_retefte',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_retefte_amount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_autoretecree',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_retecree_amount',
                        value: 0
                    });
                    // Latam Bolivia
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_bo_autoreteit',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_bo_autoreteit_whtamount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_bo_reteiue',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_bo_reteiue_whtamount',
                        value: 0
                    });
                    // Latam Paraguay
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_py_autoreteir',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_py_autoreteir_amount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_py_reteiva',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_py_reteiva_amount',
                        value: 0
                    });
                }


                // Busca al cliente
                var lmry_entity = recordObj.getValue({
                    fieldId: 'entity'
                });
                if (lmry_entity != '' && lmry_entity != null) {
                    /**********************************
                     *		Valida que no este nulo
                     **********************************/
                    // PY47-BO46-CO27-EC41
                    // Solo para subsidiria de Bolivia
                    if (LMRY_countr[0] == 'BO') {
                        if (library.getAuthorization(27, licenses)) {
                            // Seteo de campos
                            var rec_entity = search.lookupFields({
                                type: 'entity',
                                id: lmry_entity,
                                columns: ['custentity_lmry_bo_autoreteit', 'custentity_lmry_bo_reteiue']
                            });
                            /**********************************
                             *		Valida que no este nulo
                             **********************************/
                            // Latam Bolivia
                            var autoReteIt = rec_entity.custentity_lmry_bo_autoreteit;
                            autoReteIt = autoReteIt && autoReteIt.length ? autoReteIt[0].value : '';

                            var reteItUe = rec_entity.custentity_lmry_bo_reteiue;
                            reteItUe = reteItUe && reteItUe.length ? reteItUe[0].value : '';
                            if (recordObj.getValue('custbody_lmry_bo_autoreteit') || recordObj.getValue('custbody_lmry_bo_reteiue')) return false;
                            if (!recordObj.getValue('custbody_lmry_bo_autoreteit') && autoReteIt) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_bo_autoreteit',
                                    value: autoReteIt
                                });
                            }
                            if (!recordObj.getValue('custbody_lmry_bo_reteiue') && reteItUe) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_bo_reteiue',
                                    value: reteItUe
                                });
                            }
                        }
                    }
                    // Solo para subsidiria de Colombia
                    if (LMRY_countr[0] == 'CO') {
                        if (library.getAuthorization(27, licenses)) {
                            // Seteo de campos
                            var rec_entity = search.lookupFields({
                                type: 'entity',
                                id: lmry_entity,
                                columns: ['custentity_lmry_co_reteica',
                                    'custentity_lmry_co_reteiva',
                                    'custentity_lmry_co_retefte',
                                    'custentity_lmry_co_retecree']
                            });
                            /**********************************
                             *		Valida que no este nulo
                             **********************************/
                            var reteIca = rec_entity.custentity_lmry_co_reteica;
                            reteIca = reteIca && reteIca.length ? reteIca[0].value : '';

                            var reteIva = rec_entity.custentity_lmry_co_reteiva;
                            reteIva = reteIva && reteIva.length ? reteIva[0].value : '';

                            var reteFte = rec_entity.custentity_lmry_co_retefte;
                            reteFte = reteFte && reteFte.length ? reteFte[0].value : '';

                            var reteCree = rec_entity.custentity_lmry_co_retecree;
                            reteCree = reteCree && reteCree.length ? reteCree[0].value : '';
                            if (recordObj.getValue('custbody_lmry_co_reteica') || recordObj.getValue('custbody_lmry_co_reteiva') || recordObj.getValue('custbody_lmry_co_retefte') || recordObj.getValue('custbody_lmry_co_autoretecree')) return false;
                            if (!recordObj.getValue('custbody_lmry_co_reteica') && reteIca) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_co_reteica',
                                    value: reteIca
                                });
                            }

                            if (!recordObj.getValue('custbody_lmry_co_reteiva') && reteIva) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_co_reteiva',
                                    value: reteIva
                                });
                            }
                            if (!recordObj.getValue('custbody_lmry_co_retefte') && reteFte) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_co_retefte',
                                    value: reteFte
                                });
                            }

                            if (!recordObj.getValue('custbody_lmry_co_autoretecree') && reteCree) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_co_autoretecree',
                                    value: reteCree
                                });
                            }
                        }
                    }
                    // Solo para subsidiria de Paraguay
                    if (LMRY_countr[0] == 'PY') {
                        if (library.getAuthorization(47, licenses)) {
                            // Seteo de campos
                            var rec_entity = search.lookupFields({
                                type: 'entity',
                                id: lmry_entity,
                                columns: ['custentity_lmry_py_autoreteir', 'custentity_lmry_py_reteiva']
                            });
                            /**********************************
                             *		Valida que no este nulo
                             **********************************/
                            // Latam Paraguay
                            var autoReteIr = rec_entity.custentity_lmry_py_autoreteir;
                            autoReteIr = autoReteIr && autoReteIr.length ? autoReteIr[0].value : '';
                            var reteIvaPy = rec_entity.custentity_lmry_py_reteiva;
                            reteIvaPy = reteIvaPy && reteIvaPy.length ? reteIvaPy[0].value : '';
                            if (recordObj.getValue('custbody_lmry_py_autoreteir') || recordObj.getValue('custbody_lmry_py_reteiva')) return false;
                            if (!recordObj.getValue('custbody_lmry_py_autoreteir') && autoReteIr) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_py_autoreteir',
                                    value: autoReteIr
                                });
                            }
                            if (!recordObj.getValue('custbody_lmry_py_reteiva') && reteIvaPy) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_py_reteiva',
                                    value: reteIvaPy
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                library.sendemail2(' [ SetCustomField_WHT_Code_VC ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
            }

            return true;
        }

        /**
         *
         * @param {Record} currentRCD
         * @param {Array<Object>} LMRY_countr
         * @param {Array<Number>} licenses
         * @returns
         */
        function Set_Field_tranid(currentRCD, LMRY_countr, licenses) {
            // var currentRCD = scriptContext.currentRecord;
            try {
                /* *********************************************
                 * Verifica que este activo el feature SET TRANID
                 **********************************************/
                if (LMRY_countr[0] != 'BR' || library.getAuthorization(10, licenses) == false) {
                    return true;
                }
                // Subsidiaria
                var subsidiaria = currentRCD.getValue('subsidiary');
                var lmry_DocTip = currentRCD.getValue('custbody_lmry_document_type');
                var lmry_DocNum = currentRCD.getValue('custbody_lmry_num_preimpreso');
                var lmry_DocSer = currentRCD.getValue('custbody_lmry_serie_doc_cxp');
                var tranprefix = '';
                var texto = '';

                // Valida el campo subsidiary
                if (subsidiaria != '' && subsidiaria != null) {
                    // Validad contenido de campos
                    if (lmry_DocTip && lmry_DocTip != -1 && lmry_DocNum &&
                        (lmry_DocSer && lmry_DocSer != -1)) {
                        // URL Del Pais
                        var urlpais = runtime.getCurrentScript().getParameter('custscript_lmry_netsuite_location');

                        // Se optiene el Pre - Fijo de la subsidiaria
                        var url_3 = url.resolveScript({
                            scriptId: 'customscript_lmry_get_country_stlt',
                            deploymentId: 'customdeploy_lmry_get_country_stlt',
                            returnExternalUrl: false
                        }) + '&sub=' + subsidiaria + '&opt=INV&cty=' + LMRY_countr[0];

                        // corregir hard code falta url
                        var get = https.get({
                            url: 'https://' + urlpais + url_3
                        });

                        // Retorna el cuero del SuiteLet
                        tranprefix = get.body;

                        // Iniciales del tipo de documento
                        var tipini = search.lookupFields({
                            type: 'customrecord_lmry_tipo_doc',
                            id: lmry_DocTip,
                            columns: ['custrecord_lmry_doc_initials']
                        });
                        tipini = tipini.custrecord_lmry_doc_initials;
                        if (tipini == '' || tipini == null) {
                            tipini = '';
                        }

                        texto = currentRCD.getValue('custbody_lmry_num_preimpreso');

                        texto = currentRCD.getValue('custbody_lmry_serie_doc_cxp') + '-' + currentRCD.getValue('custbody_lmry_num_preimpreso');

                        if (tipini) {
                            texto = tipini.toUpperCase() + ' ' + texto;
                        }

                        if (tranprefix) {
                            texto = tranprefix + ' ' + texto;
                        }

                        currentRCD.setValue({
                            fieldId: 'tranid',
                            value: texto
                        });
                    } // Validad contenido de campos
                } // Valida el campo subsidiary
                return true;
            } catch (err) {
                library.sendemail2(' [ Set_Field_tranid ] ' + err, LMRY_script, currentRCD, 'transactionnumber', 'entity');
            }
        }

        /* ------------------------------------------------------------------------------------------------------
        * Funcion setea los campos de cabecera
        * --------------------------------------------------------------------------------------------------- */
        /**
         *
         * @param {Record} recordObj
         * @param {Array<Object>} LMRY_countr
         * @param {Array<Number>} licenses
         * @returns
         */
        function SetCustomField_WHT_Code_VB(recordObj, LMRY_countr, licenses) {
            try {
                // Solo para subsidiria de Bolivia, Colombia, Paraguay y Ecuador
                if (LMRY_countr[0] != 'BO' && LMRY_countr[0] != 'CO' && LMRY_countr[0] != 'PY' && LMRY_countr[0] != 'EC') {
                    return true;
                }

                if (LMRY_countr[2] == false) {
                    return true;
                }

                // Desactiva el campo
                var sub_country = recordObj.getValue({
                    fieldId: 'custbody_lmry_subsidiary_country'
                });
                if (sub_country == '' || sub_country == null) {
                    var Field = recordObj.getField({
                        fieldId: 'custbody_lmry_subsidiary_country'
                    });
                    if (Field != '' && Field != null) {
                        Field.isDisabled = false;
                    }
                }
                if (runtime.executionContext === 'USERINTERFACE') {
                    // Latam Colombia
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_reteica',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_reteica_amount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_reteiva',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_reteiva_amount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_retefte',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_retefte_amount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_autoretecree',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_co_retecree_amount',
                        value: 0
                    });
                    // Latam Bolivia
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_bo_autoreteit',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_bo_autoreteit_whtamount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_bo_reteiue',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_bo_reteiue_whtamount',
                        value: 0
                    });
                    // Latam Paraguay
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_py_autoreteir',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_py_autoreteir_amount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_py_reteiva',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_py_reteiva_amount',
                        value: 0
                    });
                    // Latam Ecuador
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_ec_reteir',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_ec_reteir_amount',
                        value: 0
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_ec_reteiva',
                        value: ''
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_lmry_ec_reteiva_amount',
                        value: 0
                    });
                }

                // Busca al cliente
                var lmry_entity = recordObj.getValue({
                    fieldId: 'entity'
                });
                if (lmry_entity != '' && lmry_entity != null) {
                    // Solo para subsidiria de Bolivia
                    if (LMRY_countr[0] == 'BO') {
                        if (library.getAuthorization(46, licenses)) {
                            // Seteo de campos
                            var rec_entity = search.lookupFields({
                                type: 'entity',
                                id: lmry_entity,
                                columns: ['custentity_lmry_bo_autoreteit', 'custentity_lmry_bo_reteiue']
                            });
                            /**********************************
                             *		Valida que no este nulo
                             **********************************/
                            // Latam Bolivia
                            var autoReteIt = rec_entity.custentity_lmry_bo_autoreteit || '';
                            autoReteIt = autoReteIt && autoReteIt.length ? autoReteIt[0].value : '';

                            var reteItUe = rec_entity.custentity_lmry_bo_reteiue || '';
                            reteItUe = reteItUe && reteItUe.length ? reteItUe[0].value : '';
                            if (recordObj.getValue('custbody_lmry_bo_autoreteit') || recordObj.getValue('custbody_lmry_bo_reteiue')) return false;
                            if (!recordObj.getValue('custbody_lmry_bo_autoreteit') && autoReteIt) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_bo_autoreteit',
                                    value: autoReteIt
                                });
                            }

                            if (!recordObj.getValue('custbody_lmry_bo_reteiue') && reteItUe) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_bo_reteiue',
                                    value: reteItUe
                                });
                            }
                        }
                    } // Solo para subsidiria de Colombia
                    else if (LMRY_countr[0] == 'CO') {
                        if (library.getAuthorization(27, licenses)) {
                            // Seteo de campos
                            var rec_entity = search.lookupFields({
                                type: 'entity',
                                id: lmry_entity,
                                columns: ['custentity_lmry_co_reteica',
                                    'custentity_lmry_co_reteiva',
                                    'custentity_lmry_co_retefte',
                                    'custentity_lmry_co_retecree']
                            });
                            /**********************************
                             *		Valida que no este nulo
                             **********************************/
                            var reteIca = rec_entity.custentity_lmry_co_reteica;
                            reteIca = reteIca && reteIca.length ? reteIca[0].value : '';

                            var reteIva = rec_entity.custentity_lmry_co_reteiva;
                            reteIva = reteIva && reteIva.length ? reteIva[0].value : '';

                            var reteFte = rec_entity.custentity_lmry_co_retefte;
                            reteFte = reteFte && reteFte.length ? reteFte[0].value : '';

                            var reteCree = rec_entity.custentity_lmry_co_retecree;
                            reteCree = reteCree && reteCree.length ? reteCree[0].value : '';

                            if (recordObj.getValue('custbody_lmry_co_reteica') || recordObj.getValue('custbody_lmry_co_reteiva') || recordObj.getValue('custbody_lmry_co_retefte') || recordObj.getValue('custbody_lmry_co_autoretecree')) return false;
                            if (!recordObj.getValue('custbody_lmry_co_reteica') && reteIca) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_co_reteica',
                                    value: reteIca
                                });
                            }

                            if (!recordObj.getValue('custbody_lmry_co_reteiva') && reteIva) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_co_reteiva',
                                    value: reteIva
                                });
                            }
                            if (!recordObj.getValue('custbody_lmry_co_retefte') && reteFte) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_co_retefte',
                                    value: reteFte
                                });
                            }

                            if (!recordObj.getValue('custbody_lmry_co_autoretecree') && reteCree) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_co_autoretecree',
                                    value: reteCree
                                });
                            }
                        }
                    } // Solo para subsidiria de Paraguay
                    else if (LMRY_countr[0] == 'PY') {
                        var auth = library.getAuthorization(47, licenses);
                        if (auth == true || auth == 'T') {
                            // Seteo de campos
                            var rec_entity = search.lookupFields({
                                type: 'entity',
                                id: lmry_entity,
                                columns: ['custentity_lmry_py_autoreteir', 'custentity_lmry_py_reteiva']
                            });
                            /**********************************
                             *		Valida que no este nulo
                             **********************************/
                            // Latam Paraguay
                            var autoReteIr = rec_entity.custentity_lmry_py_autoreteir;
                            autoReteIr = autoReteIr && autoReteIr.length ? autoReteIr[0].value : '';
                            var reteIvaPy = rec_entity.custentity_lmry_py_reteiva;
                            reteIvaPy = reteIvaPy && reteIvaPy.length ? reteIvaPy[0].value : '';
                            if (recordObj.getValue('custbody_lmry_py_autoreteir') || recordObj.getValue('custbody_lmry_py_reteiva')) return false;
                            if (!recordObj.getValue('custbody_lmry_py_autoreteir') && autoReteIr) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_py_autoreteir',
                                    value: autoReteIr
                                });
                            }
                            if (!recordObj.getValue('custbody_lmry_py_reteiva') && reteIvaPy) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_py_reteiva',
                                    value: reteIvaPy
                                });
                            }
                        }
                    } // Solo para subsidiria de Ecuador
                    else if (LMRY_countr[0] == 'EC') {
                        if (library.getAuthorization(41, licenses)) {
                            // Seteo de campos
                            var rec_entity = search.lookupFields({
                                type: 'entity',
                                id: lmry_entity,
                                columns: ['custentity_lmry_ec_autoreteir', 'custentity_lmry_ec_reteiva']
                            });
                            /**********************************
                             *		Valida que no este nulo
                             **********************************/
                            // Latam Ecuador
                            var autoReteIrEc = rec_entity.custentity_lmry_ec_autoreteir;
                            autoReteIrEc = autoReteIrEc && autoReteIrEc.length ? autoReteIrEc[0].value : '';
                            var reteIvaEc = rec_entity.custentity_lmry_ec_reteiva;
                            reteIvaEc = reteIvaEc && reteIvaEc.length ? reteIvaEc[0].value : '';
                            if (recordObj.getValue('custbody_lmry_ec_reteir') || recordObj.getValue('custbody_lmry_ec_reteiva')) return false;
                            if (!recordObj.getValue('custbody_lmry_ec_reteir') && autoReteIrEc) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_ec_reteir',
                                    value: autoReteIrEc
                                });
                            }
                            if (!recordObj.getValue('custbody_lmry_ec_reteiva') && reteIvaEc) {
                                recordObj.setValue({
                                    fieldId: 'custbody_lmry_ec_reteiva',
                                    value: reteIvaEc
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                library.sendemail2(' [ SetCustomField_WHT_Code_VB ] ' + err, LMRY_script, recordObj, 'transactionnumber', 'entity');
            }

            return true;
        }

        return {
            SetCustomField_WHT_Code_VC: SetCustomField_WHT_Code_VC,
            Set_Field_tranid: Set_Field_tranid,
            SetCustomField_WHT_Code_VB: SetCustomField_WHT_Code_VB
        };
    });

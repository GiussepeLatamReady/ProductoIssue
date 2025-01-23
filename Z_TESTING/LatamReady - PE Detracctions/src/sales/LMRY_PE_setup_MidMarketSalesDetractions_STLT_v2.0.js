/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */


define([
    'detraction/serverWidget',
    'detraction/metadata',
    'detraction/operations',
    'detraction/server'
  ],

  function(
    customWidget,
    metadata,
    operations,
    server
  ) {


    var daoContext = null;

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {

      daoContext = metadata.open();

      if (context.request.method == 'POST') {

        context.response.setHeader({
          name: 'Content-Type',
          value: 'application/json',
        });

        let result = {
          isCompleted: false,
          value: {}
        };
        try {
          let contextBody = context.request.body;

          contextBody = JSON.parse(contextBody);

          let action = contextBody.action;
          let content = contextBody.content;


          if (action == 'getSearchAccount') {

            result.isCompleted = true;
            result.value = operations.getSearchAccount();
          }

          if (action == 'getSetup') {

            result.isCompleted = true;
            result.value = operations.getCompanySetup();

          }


          if (action == 'updateSetup') {

            let setupContext = server.openSetup();

            setupContext.updateInformation(content);

            result.isCompleted = true;

            result.value = daoContext.getName('message_sales_update_1');
          }


          context.response.write(JSON.stringify(result));

        } catch (err) {
          result.value = err;
          context.response.write(JSON.stringify(result));
        }
      }

    }


    return {
      onRequest: onRequest
    };

  });
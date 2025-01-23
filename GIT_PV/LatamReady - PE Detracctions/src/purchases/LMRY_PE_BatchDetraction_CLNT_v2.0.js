/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NAmdConfig ./config.json
 */

define(['N/log', 'N/currentRecord', 'N/url'],

  function(log, currentRecord, url) {

    function generateFile() {

      var _record = currentRecord.get();

      var path = url.resolveRecord({
        recordType: _record.type,
        recordId: _record.id,
        isEditMode: false,
        params: {
          createFile: 'T'
        }
      });

      setWindowChanged(window, false);
      window.location.href = path;



    }

    function generateJournal() {

      var _record = currentRecord.get();

      var path = url.resolveRecord({
        recordType: _record.type,
        recordId: _record.id,
        isEditMode: false,
        params: {
          generateJournal: 'T'
        }
      });

      setWindowChanged(window, false);
      window.location.href = path;

    }

    function reload() {

      var _record = currentRecord.get();

      var path = url.resolveRecord({
        recordType: _record.type,
        recordId: _record.id,
        isEditMode: false,
      });

      setWindowChanged(window, false);
      window.location.href = path;

    }


    function cancelFlow() {

      var _record = currentRecord.get();

      var path = url.resolveRecord({
        recordType: _record.type,
        recordId: _record.id,
        isEditMode: false,
        params: {
          cancel: 'T'
        }
      });

      setWindowChanged(window, false);
      window.location.href = path;
    }



    return {

      generateFile: generateFile,
      generateJournal: generateJournal,
      reload: reload,
      cancelFlow: cancelFlow
    };

  });

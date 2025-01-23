/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 * @Name LMRY_detrac_ServerWidget_LBRY_v2.0.js
 */

/*****************************************************************************
  VERSION 2.0
  17/02/2022 | Richard Galvez
  - add "isDisabled" function
/*****************************************************************************/
define(['N/error', 'N/log', 'N/runtime', 'N/ui/serverWidget', 'N/record', 'N/ui/message'],

  function(error, log, runtime, serverWidget, record, message) {

    var _FORM = null;
    var _DAO = null;
    var _FIELDS = {};
    var _BUTTON = null;
    var _COLUMNS = [];

    function setting(DAO) {
      _DAO = DAO;
    }

    function createForm(id) {
      _FORM = serverWidget.createForm(_DAO.getName(id));
    }

    function createList(id) {
      _FORM = serverWidget.createList(_DAO.getName(id));
    }

    function addColumn(id, type, orientation) {

      _COLUMNS.push(id);

      _FORM.addColumn({
        id: id,
        type: type,
        label: _DAO.getName(id),
        align: orientation
      });

    }

    function insertRow(arrayValues) {

      var contextRow = {};

      for (var i = 0; i < _COLUMNS.length; i++) {
        contextRow[_COLUMNS[i]] = arrayValues[i] ? arrayValues[i] : '';
      }

      _FORM.addRow({
        row: contextRow
      });

    }

    function addSubmitButton(id) {
      if (id) {
        _BUTTON = _FORM.addSubmitButton(_DAO.getName(id));
        _BUTTON.isDisabled = true;
      } else {
        _BUTTON = _FORM.addSubmitButton(_DAO.getName('custsubmit_process'));
        _BUTTON.isDisabled = true;
      }

    }


    function setForm(form) {
      _FORM = form;
    }

    function addButtom(id, functionText) {

      return _FORM.addButton({
        id: id,
        label: _DAO.getName(id),
        functionName: functionText
      });
    }


    function createGroup(id) {
      this.group = id;

      _FORM.addFieldGroup({
        id: id,
        label: _DAO.getName(id)
      });

    }

    createGroup.prototype.addField = function(id, type, source) {

      return new addField(id, type, source, this.group);

    }

    function setFieldValues(json) {

      for (var x in json) {

        if (_FORM.getField(x))
          _FORM.getField(x).defaultValue = json[x];

      }

    }

    function getField(id) {

      return _FIELDS[id];

    }

    function addField(id, type, source, group, list, label) {
      var json = {
        id: id,
        label: label ? label : (_DAO.getName(id) ? _DAO.getName(id) : ' '),
        type: type,
        source: source ? source : ''
      }
      if (group) {
        json['container'] = group;
      }
      if (!list) {
        this.field = _FORM.addField(json);
      } else {
        this.field = list.addField(json);
      }
      this.id = id;

      _FIELDS[id] = this;
    }



    addField.prototype.setValue = function(value) {

      this.field.defaultValue = value;
    }



    addField.prototype.setOptions = function(resultSearch) {

      this.field.addSelectOption({
        value: "",
        text: ""
      });

      for (var i = 0; i < resultSearch.length; i++) {

        this.field.addSelectOption({
          value: resultSearch[i].id,
          text: resultSearch[i].text
        });

      }

      return this;

    }

    addField.prototype.isShort = function(flag) {

      this.field.updateDisplaySize({
        height: 30,
        width: 120
      });
      return this;
    }

    addField.prototype.isEdit = function(flag) {

      this.field.updateDisplayType({
        displayType: flag ? serverWidget.FieldDisplayType.ENTRY : serverWidget.FieldDisplayType.INLINE
      });
      return this;
    }

    addField.prototype.isOnlyRead = function(flag) {

      this.field.updateDisplayType({
        displayType: flag ? serverWidget.FieldDisplayType.INLINE : serverWidget.FieldDisplayType.NORMAL
      });
      return this;

    }

    addField.prototype.isMandatory = function(flag) {

      this.field.isMandatory = flag;
      return this;
    }

    addField.prototype.isHidden = function(flag) {
      this.field.updateDisplayType({
        displayType: flag ? serverWidget.FieldDisplayType.HIDDEN : serverWidget.FieldDisplayType.NORMAL
      });
      return this;
    }

    addField.prototype.isNewColumn = function(flag) {

      this.field.updateBreakType({
        breakType: flag ? serverWidget.FieldBreakType.STARTCOL : serverWidget.FieldBreakType.NORMAL
      });
      return this;

    }

    addField.prototype.isFirstRow = function(flag) {

      this.field.updateLayoutType({
        layoutType: flag ? serverWidget.FieldLayoutType.OUTSIDEABOVE : serverWidget.FieldLayoutType.NORMAL
      });


      this.field.updateDisplaySize({
        height: 30,
        width: 270
      });

      return this;

    }

    addField.prototype.insertBefore = function(id) {

      _FORM.insertField({
        field: this.field,
        nextfield: id
      });
      return this;

    }

    addField.prototype.isDisabled = function(flag) {
      this.field.updateDisplayType({
        displayType: flag ? serverWidget.FieldDisplayType.DISABLED : serverWidget.FieldDisplayType.NORMAL
      });
      return this;
    }



    function createTable(id, tab) {

      this.table = _FORM.addSublist({
        id: id,
        label: _DAO.getName(id),
        type: serverWidget.SublistType.LIST,
        tab: tab ? tab : null
      });

      this.id = id;
      this.lines = 0;
      this.columns = [];

    }

    createTable.prototype.addMarkAllButtons = function() {
      this.table.addMarkAllButtons();
    }

    createTable.prototype.addButton = function(id, functionName) {
      this.table.addButton({
        id: id,
        label: _DAO.getName(id),
        functionName: functionName
      })
    }

    createTable.prototype.addColumn = function(id, type, source) {
      this.columns.push(id);
      return new addField(id, type, source, null, this.table) //.isOnlyRead(true);

    }

    createTable.prototype.addRow = function(arrayValues) {

      var sublist = this.id;
      var columns = this.columns;
      var line = this.lines;
      for (var i = 0; i < columns.length; i++) {
        
        var value = arrayValues[i];
        
        value = value === true ? "T" : value === false ? "F" : value;

        if (value) {

          this.table.setSublistValue({
            id: columns[i],
            line: line,
            value: value
          });
        }

      }
      this.lines = this.lines + 1;

    }

    function createTab(id, afterId) {
      var Tab = _FORM.addTab({
        id: id,
        label: _DAO.getName(id)
      });
      if (afterId) {
        _FORM.insertTab({
          tab: Tab,
          nexttab: afterId
        });
      }

      this.id = id;

    }

    createTab.prototype.addTable = function(id) {
      return new createTable(id, this.id);
    }

    function replaceField(id, type, source, options) {

      var newId = 'custpage_' + id;

      var field = _FORM.getField(id);

      field.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN
      });

      var value = field.defaultValue;

      var label = field.label;

      var customField = new addField(newId, type, source, null, null, label);

      if (options)
        customField.setOptions(options);

      customField.setValue(value);

      _FORM.insertField({
        field: customField.field,
        nextfield: id
      });

      return customField;

    }


    function print() {
      return _FORM;
    }

    function activeSubmit() {
      _BUTTON.isDisabled = false;
    }

    function clearFields(type) {

      var _RECORD = record.create({
        type: type
      });

      var fields = _RECORD.getFields();

      for (var i = 0; i < fields.length; i++) {

        var field = _FORM.getField(fields[i]);

        if (field) {

          var label = field.label;
          label = label.toUpperCase().replace('LATAM - ', '');
          field.label = label;

        }

      }

    }

    function isUserInterface() {
      return runtime.executionContext == 'USERINTERFACE';
    }

    function setScript(text) {

      _FORM.clientScriptModulePath = text;

    }

    function messageInfo(msg) {

      _FORM.addPageInitMessage({
        type: message.Type.INFORMATION,
        message: msg,
        duration: 100000
      });

    }

    function warningInfo(msg) {
      _FORM.addPageInitMessage({
        type: message.Type.WARNING,
        message: msg,
        duration: 100000
      });
    }


    return {
      createList: createList,
      addColumn: addColumn,
      insertRow: insertRow,
      addSubmitButton: addSubmitButton,
      isUserInterface: isUserInterface,
      setting: setting,
      setForm: setForm,
      createForm: createForm,
      setFieldValues: setFieldValues,
      replaceField: replaceField,
      getField: getField,
      addButtom: addButtom,
      addButton: addButtom,
      addField: function(id, type, source) {
        return new addField(id, type, source, null);
      },
      createGroup: function(id) {
        return new createGroup(id);
      },
      createTable: function(id) {
        return new createTable(id)
      },
      createTab: function(id, tab) {
        return new createTab(id, tab);
      },


      activeSubmit: activeSubmit,
      clearFields: clearFields,
      print: print,
      setScript: setScript,
      message: {
        info: messageInfo,
        warning: warningInfo,
      }
    }

  });

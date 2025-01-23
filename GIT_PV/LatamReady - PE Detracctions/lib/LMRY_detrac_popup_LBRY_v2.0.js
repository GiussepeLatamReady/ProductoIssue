/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
 /*****************************************************************************
   30/03/2022 | Richard Galvez
   - Add size to the form created.
 /*****************************************************************************/
define(['N/runtime'],

  function(runtime) {

    var language = runtime.getCurrentUser().getPreference('language').substring(0, 2);

    /* Temas Netsuite */
    var color_ids = ["-358", "-5", "-16", "-14", "-15", "-8", "10", "-9", "-7",
      "-13", "-12", "-6", "-11", "-100", "-101", "-102", "-103", "-104", "-105", "-106", "-107", "-108",
      "-109", "-110", "-111", "-112", "-113", "-114", "-115", "-116", "-117", "-118", "-119", "-120",
      "-350", "-351", "-352", "-353", "-354", "-355", "-356", "-357",
      "-361", "-362", "-359", "-360", "-363", "-364", "-365", "-121", "-122", "-123", "-124", "-125",
      "-126", "-127", "-128", "-129", "-130", "-131", "-366", "-367",
      "-368", "-369", "-370", "-371", "-372", "-373", "-132", "-133", "-134", "-136", "-137", "-138", "-139",
      "-148", "-135", "-141", "-142", "-143", "-144", "-145",
      "-146", "-147", "-148", "-149", "-150", "-151", "-152", "-153", "-154", "-155", "-156", "-157",
      "-158", "-159", "-160", "-161", "-374", "-375", "-376", "-377",
      "-378", "-380", "-379", "-481"
    ];

    var color_bg_ff = ["#002157", "#607799", "#444444", "#674218", "#888888", "#6D8C1E", "#85C1CF", "#8CB49A", "#E5772A", "#DC64A2", "#6E609D", "#AD4B4B", "#287587", "#FF6600", "#0C2475",
      "#660000", "#EAB200", "#CC0000", "#7595CC", "#D60039", "#000066", "#FFCC66", "#006600", "#BD9C00", "#CC0000", "#000066", "#663399", "#CC9900", "#B40000", "#830506",
      "#FF6600", "#CC6600", "#660000", "#CC0000", "#075699", "#001E58", "#241D4E", "#222222", "#CC0000", "#023EAD", "#990000", "#FF571C", "#222222", "#CC0000", "#000066",
      "#041C43", "#00543D", "#013875", "#000056", "#FF6600", "#8C2108", "#333333", "#000063", "#017400", "#752132", "#702C7E", "#CC0000", "#35457C", "#B69B29", "#990000",
      "#990000", "#004576", "#222222", "#990000", "#000066", "#004A83", "#00287A", "#F76507", "#990000", "#004A85", "#CC0000", "#305930", "#990000", "#002649", "#FF9900",
      "#1A2E57", "#002868", "#840029", "#211F5E", "#044520", "#FF6600", "#AD3118", "#003399", "#A20012", "#330066", "#990000", "#990032", "#990000", "#000067", "#0034AE",
      "#DE0018", "#000066", "#2B0A4F", "#000066", "#880029", "#980033", "#EF9218", "#B5AD63", "#000066", "#8B0222", "#333399", "#000066", "#892020", "#3A027C", "#03492F", "#002654"
    ]



    function openSubForm() {

      var style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = 'https://system.netsuite.com/core/media/media.nl?id=514118&c=TSTDRV1038906&h=b4af44a9b704b0222e5b&_xt=.css';
      document.head.appendChild(style);


      var jquery = document.createElement('script');
      jquery.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js';
      document.head.appendChild(jquery);

      var jquery = document.createElement('script');
      jquery.src = 'https://system.netsuite.com/core/media/media.nl?id=427070&c=TSTDRV1038906&h=3495197c2dceba538ccd&_xt=.js';
      document.head.appendChild(jquery);

    }



    function createForm(name, width, height) {

      return new ObjPopup(name, width, height);
    }


    function ObjPopup(title, width, height) {

      var colorId = runtime.getCurrentUser().getPreference({
        name: 'COLORTHEME'
      });
      var i = color_ids.indexOf(colorId);
      if (i == -1)
        i = 0;
      var color = color_bg_ff[i];

      this.color = color;
      this.title = title;
      this.width = width;
      this.height = height;
      this.error = '';
      this.content = {
        buttons: [],
        fields: [],
        tabs: []
      }

    }

    ObjPopup.prototype.addButton = function(id, label, type) {

      var aux = this.content.buttons;
      for (var i = 0; i < aux.length; i++) {

        if (aux[i].id == id) {
          this.error += 'Error Field: el ' + id + ' ya esta siendo utilizado.\n';
        }
      }

      this.content.buttons.push({
        id: id,
        label: label,
        type: type
      });
    }

    ObjPopup.prototype.addTab = function(id, name) {


      var aux = this.content.tabs;

      for (var i = 0; i < aux.length; i++) {

        if (aux[i].id == id) {
          this.error += 'Error Tab: el ' + id + ' ya esta siendo utilizado.\n';
        }
      }

      this.content.tabs.push({
        id: id,
        name: name
      });
    }

    ObjPopup.prototype.addField = function(id, label, type, group, values) {

      var aux = this.content.fields;

      for (var i = 0; i < aux.length; i++) {

        if (aux[i].id == id) {
          this.error += 'Error Field: el ' + id + ' ya esta siendo utilizado.\n';
        }
      }

      var tabGroup = group;
      if (tabGroup == undefined)
        tabGroup = '';

      this.content.fields.push({
        id: id,
        label: label,
        type: type,
        values: values,
        group: tabGroup
      });
    }

    function addCancelButton() {

      var formHtml = '<button id="latam_btn_cancel" class="latam-btn-normal" type="button" ' +
        'onclick="var win = Ext.WindowMgr.getActive();if (win) {win.close();}" >' + (language == 'es' ? 'Cancelar' : 'Cancel') + '</button>';

      return formHtml;

    }


    ObjPopup.prototype.addClick = function(id_button, content) {

      for (var i = 0; i < this.content.buttons.length; i++) {

        if (this.content.buttons[i].id == id_button) {

          document.getElementById(id_button).addEventListener("click", content);
          break;
        }
      }

    }

    ObjPopup.prototype.setValue = function(id, value) {

      for (var i = 0; i < this.content.fields.length; i++) {

        if (this.content.fields[i].id == id) {
          document.getElementById(id).value = value;
          if (this.content.fields[i].type == 'checkbox') {
            document.getElementById(id).checked = value;
          } else {
            if (this.content.fields[i].type == 'select') {
              var e = document.getElementById(id);
              var value = e.options[e.selectedIndex].text;

              document.getElementById('div_' + id).innerHTML = value.substring(0, 28);
            }
          }
          break;
        }
      }
    }

    ObjPopup.prototype.getValue = function(id) {

      var value;

      for (var i = 0; i < this.content.fields.length; i++) {

        if (this.content.fields[i].id == id) {
          value = document.getElementById(id).value;
          if (this.content.fields[i].type == 'checkbox') {
            value = document.getElementById(id).checked;
          }
          break;
        }
      }

      return value;

    }

    ObjPopup.prototype.getText = function(id) {

      var value;

      for (var i = 0; i < this.content.fields.length; i++) {

        if (this.content.fields[i].id == id) {
          if (this.content.fields[i].type != 'select') {
            value = document.getElementById(id).value;
            break;
          } else {
            var e = document.getElementById(id);
            value = e.options[e.selectedIndex].text;
          }
        }
      }

      return value;

    }

    ObjPopup.prototype.writeForm = function() {


      var errorStatus = this.error;

      if (errorStatus == '') {

        var formHtml = '';


        /* Creacion de los botones de cabecera */
        formHtml += '<table class="latam-table-buttons">';
        formHtml += '<tr>';

        for (var i = 0; i < this.content.buttons.length; i++) {

          var styleClass = '';

          var objButton = this.content.buttons[i];

          formHtml += '<td>';

          if (objButton.type === 'submit') {
            styleClass = 'latam-btn-blue';
          } else {
            styleClass = 'latam-btn-normal';
          }

          formHtml += '<button id="' + objButton.id + '" class="' + styleClass + '" type="button">' + objButton.label + '</button>';

          formHtml += '</td>';
        }

        formHtml += '<td>';
        formHtml += addCancelButton();
        formHtml += '</td>';

        formHtml += '</tr>';
        formHtml += '</table>';


        var colorTheme = this.color;



        /* Creacion del contenido de campos sin tab */
        var arraySinTab = [];
        var arrayFields = this.content.fields;

        for (var i = 0; i < arrayFields.length; i++) {
          if (arrayFields[i].group == '') {
            arraySinTab.push(arrayFields[i]);
          }
        }

        if (arraySinTab.length > 0) {

          formHtml += '<table class="latam-table-fields">';

          for (var i = 0; i < arraySinTab.length; i++) {
            var type = arraySinTab[i].type;

            switch (type) {

              case 'text': {
                formHtml += '<tr><td>';
                formHtml += addInputText(arraySinTab[i].id, arraySinTab[i].label);
                formHtml += '</td></tr>';
              }
              break;

            case 'number': {
              formHtml += '<tr><td>';
              formHtml += addInputNumber(arraySinTab[i].id, arraySinTab[i].label);
              for5mHtml += '</td></tr>';
            }
            break;

            case 'select': {
              formHtml += '<tr><td>';
              formHtml += addInputSelect(arraySinTab[i].id, arraySinTab[i].label,
                arraySinTab[i].values);
              formHtml += '</td></tr>';
            }
            break;

            case 'longtext': {
              formHtml += '<tr><td>';
              formHtml += addInputLongText(arraySinTab[i].id, arraySinTab[i].label);
              formHtml += '</td></tr>';
            }
            break;
            case 'checkbox': {
              formHtml += '<tr><td>';
              formHtml += addInputCheckBox(arraySinTab[i].id, arraySinTab[i].label);
              formHtml += '</td></tr>';
            }
            break;
            case 'date': {
              formHtml += '<tr><td>';
              formHtml += addInputDate(arraySinTab[i].id, arraySinTab[i].label);
              formHtml += '</td></tr>';
            }
            break;

            }
          }

          formHtml += '</table>';

        }


        /* Creacion de la cabecera del tab */
        formHtml += '<div class="latam-tab" style="background:' + colorTheme + '">';
        for (var i = 0; i < this.content.tabs.length; i++) {

          formHtml += '<button class = "latam-tab-button" onclick = "clickTab(event, \'' + this.content.tabs[i].id + '\')" > ' +
            this.content.tabs[i].name + ' </button>';

        }
        formHtml += '</div>';
        /* Creacion del contenido del tab */
        this.content.tabs.forEach(function(tab) {


          formHtml += '<div id="' + tab.id + '" class="latam-tabcontent">';

          //Creacion del formulario
          formHtml += '<table class="latam-table-fields">';

          for (var i = 0; i < arrayFields.length; i++) {
            if (arrayFields[i].group == tab.id) {

              var type = arrayFields[i].type;

              switch (type) {

                case 'text': {
                  formHtml += '<tr><td>';
                  formHtml += addInputText(arrayFields[i].id, arrayFields[i].label);
                  formHtml += '</td></tr>';
                }
                break;

              case 'number': {
                formHtml += '<tr><td>';
                formHtml += addInputNumber(arrayFields[i].id, arrayFields[i].label);
                for5mHtml += '</td></tr>';
              }
              break;

              case 'select': {
                formHtml += '<tr><td>';
                formHtml += addInputSelect(arrayFields[i].id, arrayFields[i].label,
                  arrayFields[i].values);
                formHtml += '</td></tr>';
              }
              break;

              case 'longtext': {
                formHtml += '<tr><td>';
                formHtml += addInputLongText(arrayFields[i].id, arrayFields[i].label);
                formHtml += '</td></tr>';
              }
              break;
              case 'checkbox': {
                formHtml += '<tr><td>';
                formHtml += addInputCheckBox(arrayFields[i].id, arrayFields[i].label);
                formHtml += '</td></tr>';
              }
              break;
              case 'date': {
                formHtml += '<tr><td>';
                formHtml += addInputDate(arrayFields[i].id, arrayFields[i].label);
                formHtml += '</td></tr>';
              }
              break;

              }
            }

          }

          formHtml += '</table>';
          formHtml += '<div style="height:160px"></div>';
          formHtml += '</div>';

        });

        console.log('form', formHtml);

        var objExtForm = Ext.create({
          xtype: 'form',
          labelAlign: 'top',
          frame: false,
          html: formHtml,
          height: this.height,
        });

        Ext.create({
          xtype: 'window',
          width: this.width,
          height: this.height,
          title: this.title,
          modal: true,
          items: [objExtForm],
        }).show();

        executeJQuery();

        if (this.content.tabs.length > 0) {
          document.getElementsByClassName('latam-tab-button')[0].click();
        }
      } else {
        alert(errorStatus);
      }

    }


    function addInputText(id, name) {

      var inptHtml = '<p class="latam-label">' + name + '</p>';
      inptHtml += '<input id="' + id + '" class="latam-input-text" type="text"></input>';

      return inptHtml;

    }

    function addInputNumber(id, name) {

      var inptHtml = '<p class="latam-label">' + name + '</p>';
      inptHtml += '<input id="' + id + '" class="latam-input-number" type="number"></input>';

      return inptHtml
    }

    function addInputDate(id, name) {

      var inptHtml = '<p class="latam-label">' + name + '</p>';
      inptHtml += '<input id="' + id + '" class="latam-input-date" type="date"></input>';

      return inptHtml;

    }

    function addInputSelect(id, name, options) {

      var inptHtml = '<p class="latam-label">' + name + '</p>';
      inptHtml += '<select id="' + id + '" class="latam-select-hidden">';
      inptHtml += '<option value=""> </option>';

      for (var i = 0; i < options.length; i++) {
        inptHtml += '<option value="' + options[i].value + '">' + options[i].text + '</option>';

      }
      inptHtml += '</select>';

      return inptHtml

    }

    function addInputCheckBox(id, name) {

      var inptHtml = '<label class="latam-input-check">' + name;
      inptHtml += '<input id="' + id + '" type="checkbox" />';
      inptHtml += '<span class="latam-input-check-checkmark"></span>';
      inptHtml += '</label>';

      return inptHtml;

    }

    function addInputLongText(id, name) {

      var inptHtml = '<p class="latam-label">' + name + '</p>';
      inptHtml += '<textarea id="' + id + '" class="latam-input-longtext" rows="5"></textarea>';

      return inptHtml;

    }



    function closePopup() {
      var win = Ext.WindowMgr.getActive();
      if (win) {
        win.close();
      }
    }




    return {
      openSubForm: openSubForm,
      createForm: createForm,
      closePopup: closePopup
    };

  });

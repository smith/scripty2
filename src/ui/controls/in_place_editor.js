/*global $, Class, Element, S2 */

(function(UI) {

  /** section: scripty2 ui
   *  class S2.UI.InPlaceEditor < S2.UI.Base
   *
  **/
  UI.InPlaceEditor = Class.create(UI.Base, {
    NAME: "S2.UI.InPlaceEditor",

    /**
     *  new S2.UI.InPlaceEditor(element, url, options)
     *
     *  Instantiates an in place editor.
    **/
    initialize: function (element, url, options) {
      this.element = $(element);
      var opt = this.setOptions(options),
          contents = this.element.innerHTML;

      this._editing = false;
      this._saving = false;
      this._text = contents;
      this._editor = null; // the input or text area
      this._controls = []; // the buttons and/or links
      this.observers = {
        mouseenter: this._mouseenter.bind(this),
        mouseleave: this._mouseleave.bind(this),
        click: this._click.bind(this)
      };
      this.element.store(this.NAME, this);
      this.element.store("originalBackground",
        S2.CSS.colorFromString(this.element.getStyle("background-color"))
      );
      this.element.store("originalContents", contents);
      this.element.store("previousContents", contents);
      this.element.store("originalTitle", this.element.readAttribute("title"));
      this.element.writeAttribute("title", opt.clickToEditText);

      UI.addClassNames(this.element, 'ui-widget ui-inplaceeditor');
      UI.addBehavior(this.element, UI.Behavior.Hover);
      this.addObservers();
    },

    addObservers: function () {
      for (var o in this.observers) { if (this.observers.hasOwnProperty(o)) {
        this.element.observe(o, this.observers[o]);
      }}
    },

    removeObservers: function () {
      for (var o in this.observers) { if (this.observers.hasOwnProperty(o)) {
        this.element.stopObserving(o, this.observers[o]);
      }}
      if (Object.isElement(this._form)) {
        this._form.stopObserving("submit", this._submit.bind(this));
      }
    },

    /**
    **/
    edit: function (event) {
      var result, externalControl = this.options.externalControl;

      if (this._editing || this._saving) { return; }
      this._editing = true;
      result = this.element.fire("ui:inplaceeditor:edit", {
        inPlaceEditor : this
      });

      if (!result.stopped) {
        if (Object.isElement(externalControl)) { externalControl.hide(); }
        this.element.hide();
        this._createForm();
        this.element.insert({ before: this._form });
        if (!this.options.loadTextURL) { this._postProcessEditField(); }
      }

      if (event) { event.stop(); }
    },

    /**
    **/
    getText: function () {
      return this._text.unescapeHTML();
    },

    /**
     **/
    save: function () {
      // TODO
    },

    /**
    **/
    cancel: function () {
      this.element.show();
      // TODO
    },

    /**
    **/
    destroy: function() {
      this.removeObservers();
      if (this._editing) { this.cancel(); }
      if (Object.isElement(this._form)) { this._form.remove(); }
      this.element.update(this.element.retrieve("originalContents"));
      // TODO: remove classnames, title, and element stored data
    },

    _mouseenter: function () {
      if (!this._editing) { this.options.onEnterHover(this); }
    },

    _mouseleave: function () {
      if (!this._editing) { this.options.onLeaveHover(this); }
    },

    _click: function (event) {
       this.edit(event);
    },

    _submit: function (event) {

    },

    _createForm: function () {
      var form = new Element("FORM", {
        id: this.options.formId,
        "class": this.options.formClassName
      });
      form.observe("submit", this._submit.bind(this));
      this._form = form;
      this._createEditor();
      // TODO
    },

    _createEditor: function () {
      var text = this.getText(), opt = this.options, editor, elementOptions,
          rows = parseInt(opt.rows, 10), type;
      if (opt.loadTextURL) { text = opt.loadingText; }
      elementOptions = { name: opt.paramName, value: text };
      if (rows <= 1 && !/\r|\n/.test(text)) { // INPUT
        type = "INPUT";
        Object.extend(elementOptions, {
          type : "text",
          size : parseInt(opt.size, 10)
        });
      } else { // TEXTAREA
        type = "TEXTAREA";
        Object.extend(elementOptions, {
          rows: rows > 1 ? rows : opt.autoRows,
          cols: opt.cols
        });
      }
      editor = new Element(type, elementOptions);
      if (opt.submitOnBlur) { editor.observe("blur", this._submit.bind(this)); }
      if (opt.loadTextURL) { this._loadExternalText(); }
      this._form.insert({ top: editor });
      this._editor = editor;
    },

    _loadExternalText: function () {
      // TODO
    },

    _postProcessEditField: function () {
      var fpc = this.options.fieldPostCreation;
      if (fpc && Object.isElement(this._editor)) {
        this._editor[fpc === "focus" ? "focus" : "activate"]();
      }
    }
  });

  Object.extend(UI.InPlaceEditor, {
    DEFAULT_OPTIONS: {
      ajaxOptions: {},
      autoRows: 3,                         // Use when multi-line w/ rows == 1
      clickToEditText: 'Click to edit',
      cols: 40,
      externalControl: null,               // id|elt
      externalControlOnly: false,
      fieldPostCreation: 'activate',       // 'activate'|'focus'|false
      formClassName: 'ui-inplaceeditor-form',
      formId: null,                        // id|elt
      highlightColor: '#ffff99',
      htmlResponse: true,
      loadingClassName: 'ui-inplaceeditor-loading',
      loadingText: 'Loading...',
      paramName: 'value',
      rows: 1,                             // If 1 and multi-line, uses autoRows
      savingClassName: 'ui-inplaceeditor-saving',
      savingText: 'Saving...',
      size: 0,
      stripLoadedTextTags: false,
      submitOnBlur: false,
      textAfterControls: '',
      textBeforeControls: '',
      textBetweenControls: '',
      controls : [
        {
          type: "button",
          label: "OK",
          primary: true,
          action: function (instance) { instance.save(); }
        },
        {
          type: "button",
          label: "Cancel",
          secondary: true,
          action: function (instance) { instance.cancel(); }
        }
      ],
      onEnterHover: function (instance) {
        instance.element.morph("background-color:" +
          instance.options.highlightColor);
      },
      onLeaveHover: function (instance) {
        instance.element.morph("background-color:" +
          instance.element.retrieve("originalBackground"));
      }
    }
  });

})(S2.UI);

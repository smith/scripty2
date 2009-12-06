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

      this.url = url;
      this._editing = false;
      this._saving = false;
      this._editor = null; // the input or text area
      this._controls = []; // the buttons and/or links
      this.observers = { click: this._click.bind(this) };
      this.element.store(this.NAME, this);
      this.element.store("ui.ipe.originalBackground",
        S2.CSS.colorFromString(this.element.getStyle("background-color"))
      );
      this.element.store("ui.ipe.originalContents", contents);
      this.element.store("ui.ipe.originalTitle",
        this.element.readAttribute("title"));
      this.element.writeAttribute("title", opt.clickToEditText);

      UI.addClassNames(this.element, 'ui-widget ui-ipe');
      UI.addBehavior(this.element, UI.Behavior.Hover);
      this.addObservers();
      this.setText(contents);
    },

    addObservers: function () {
      var external = $(this.options.externalControl);
      Object.keys(this.observers).each(function (o) {
        this.element.observe(o, this.observers[o]);
      }.bind(this));
      if (Object.isElement(external)) {
        external.observe("click", this.edit.bind(this));
      }
    },

    removeObservers: function () {
      Object.keys(this.observers).each(function (o) {
        this.element.stopObserving(o, this.observers[o]);
      }.bind(this));
      if (Object.isElement(this._form)) this._form.stopObserving("submit");
      if (Object.isElement(this._editor)) {
        this._editor.stopObserving("blur");
        this._editor.stopObserving("keydown");
      }
      // TODO: stop observing controls
    },

    /**
    **/
    getText: function () {
      return this._text.unescapeHTML();
    },

    /**
    **/
    setText: function (text) {
      this._text = text;
      this.element.store("ui.ipe.previousContents", text);
      return text;
   },

    /**
    **/
    edit: function (event) {
      var externalControl = $(this.options.externalControl);
      if (this._editing || this._saving) return;
      var result = this.element.fire("ui:ipe:enter", {
        inPlaceEditor: this
      });
      if (!result.stopped) {
        this._editing = true;
        if (Object.isElement(externalControl)) externalControl.hide();
        this.element.hide();
        this._createForm();
        this._editor.setValue(this.getText());
        this.element.insert({ before: this._form });
        if (!this.options.loadTextURL) this._postProcessEditField();
      }

      if (event) event.stop();
    },

    /**
    **/
    stopEditing: function (event) {
      var externalControl = $(this.options.externalControl);
      if (!this._editing) return;
      var result = this.element.fire("ui:ipe:leave", {
        inPlaceEditor: this
      });
      if (!result.stopped) {
          this._editing = false;
          this._form.remove();
          this.element.show();
          if (Object.isElement(externalControl)) externalControl.show();
      }

      if (event) event.stop();
    },

    /**
    **/
    save: function (event) {
      var result = this.element.fire("ui:ipe:before:save", {
        inPlaceEditor: this
      }), ajaxOptions = this.options.ajaxOptions;

      if (!result.stopped) {
        this._saving = true;
        this.stopEditing();
        this.element.update(this.options.savingText);
        this.element.addClassName("ui-ipe-saving");
        // TODO: callback for params instead of serialize
        // TODO: wrap onComplete/onFailure callbacks
        if (!Object.isFunction(ajaxOptions.onComplete)) {
          ajaxOptions.onComplete = function (transport) {
            result = this.element.fire("ui:ipe:after:save", {
              inPlaceEditor: this
            });
            if (!result.stopped) {
              //TODO: Highlight
              this.element.removeClassName("ui-ipe-saving");
              this.setText(transport.responseText);
              this.element.update(this.getText());
              this._saving = false;
            }
          }.bind(this);
        }
        if (!Object.isFunction(ajaxOptions.onFailure)) {
          ajaxOptions.onFailure = function (transport) {
            //TODO: Update, event
          }.bind(this);
        }
        if (this.options.htmlResponse) ajaxOptions.evalScripts = true;
        Object.extend(ajaxOptions, {
          parameters: { editorId: this.element.identify() }
        });
        this._form.request(ajaxOptions);
      }
      if (event) event.stop();
    },

    /**
    **/
    cancel: function (event) {
      var result = this.element.fire("ui:ipe:cancel", {
        inPlaceEditor: this
      });
      if (!result.stopped) {
        this.stopEditing();
        if (this._saving) this._saving = false;
        this.element.update(this.element.retrieve("ui.ipe.previousContents"));
      }
      if (event) event.stop();
    },

    /**
    **/
    destroy: function() {
      this.removeObservers();
      if (this._editing) this.cancel();
      if (Object.isElement(this._form)) this._form.remove();
      this.element.update(this.element.retrieve("ui.ipe.originalContents"));
      // TODO: remove classnames, effects, title, and element stored data
    },

    _click: function (event) {
       this.edit(event);
    },

    _createForm: function () {
      if (Object.isElement(this._form)) return;
      var form = new Element("form", {
        id: this.options.formId,
        "class": this.options.formClassName + " ui-widget",
        action: this.url,
        method: this.options.ajaxOptions.method || "post"
      });
      form.observe("submit", this.save.bind(this));
      this._form = form;
      // TODO: Move these methods into this one
      this._createEditor();
      // TODO: onFormCustomization
      this._createControls();
    },

    // TODO: Comment for clarity
    _createEditor: function () {
      var text = this.getText(), opt = this.options,
          rows = parseInt(opt.rows, 10), type, afterText;
      if (opt.loadTextURL) text = opt.loadingText;
      var elementOptions = { name: opt.paramName };
      if (rows <= 1 && !/\r|\n/.test(text)) { // INPUT
        type = "INPUT";
        Object.extend(elementOptions, {
          type: "text",
          size: opt.size
        });
        afterText = "&nbsp";
      } else { // TEXTAREA
        type = "TEXTAREA";
        Object.extend(elementOptions, {
          rows: rows > 1 ? rows: opt.autoRows,
          cols: opt.cols
        });
        afterText = "<br />";
      }
      var editor = new Element(type, elementOptions);
      editor.observe("keydown", this._checkForEscapeOrReturn.bind(this));
      this._editor = editor;
      if (opt.submitOnBlur) editor.observe("blur", this.save.bind(this));
      if (opt.loadTextURL) this._loadExternalText();
      this._form.insert({ top: editor, bottom: afterText });
    },

    // TODO: Comment for clarity
    _createControls: function () {
      var controls = this._controls, opts = this.options.controls, text = "",
          form = this._form, between = this.options.textBetweenControls;

      function insert(item) { form.insert({ bottom: item }); }

      if (this.options.externalControlOnly) opts = [];
      insert(this.options.textBeforeControls);
      opts.each(function (opt, i) {
        var el, control, last = i === opts.length - 1;
        if (opt.type === "button") {
          el = new Element(opt.type, { type: opt.type });
          control = new S2.UI.Button(el, {
            primary: opt.primary,
            seconary: opt.secondary
          });
        } else if (opt.type === "link") {
          el = new Element("a", { href: "#" });
          control = { element: el };
        } else { // Anything else (string or element) should be inserted as-is
          control = { element: opt };
        }
        el.update(opt.label);
        control.element.observe("click", function (event) {
          var action = opt.action;
          event.stop();
          if (Object.isFunction(action)) action(this);
          else if (Object.isString(action)) this[action](event);
        }.bind(this));
        controls.push(control);
        insert(control.element);
        if (!last) insert(between);
      }, this);
      insert(this.options.textAfterControls);
    },

    _checkForEscapeOrReturn: function (event) {
      var e = event;
      if (!this._editing || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (Event.KEY_ESC === e.keyCode) this.cancel(e);
      else if (Event.KEY_RETURN === e.keyCode) this.save(e);
    },

    _loadExternalText: function () {
      var options = Object.extend({ method: 'get' }, this.options.ajaxOptions);
      this._form.addClassName(this.options.loadingClassName);
      this._editor.setValue(this.options.loadingText).disable();
      Object.extend(options, {
        parameters: { editorId: this.element.identify() },
        onSuccess: function (transport) {
          var text = transport.responseText;
          this._form.removeClassName(this.options.loadingClassName);
          if (this.options.stripLoadedTextTags) text = text.stripTags();
          this.setText(text);
          this._editor.setValue(text).enable();
          this._postProcessEditField();
        }.bind(this),
        onFailure: function () {} // TODO: handle failure
      });
      new Ajax.Request(this.options.loadTextURL, options);
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
      fieldPostCreation: 'activate',       // 'activate'|'focus'|false
      formClassName: 'ui-ipe-form',
      htmlResponse: true,
      loadingClassName: 'ui-ipe-loading',
      loadingText: 'Loading&hellip;',
      paramName: 'value',
      rows: 1,                             // If 1 and multi-line, uses autoRows
      savingClassName: 'ui-ipe-saving',
      savingText: 'Saving&hellip;',
      size: 0,
      textAfterControls: '',
      textBeforeControls: '',
      textBetweenControls: '&nbsp;',
      controls: [
        { type: "button", label: "OK", primary: true, action: "save" },
        { type: "button", label: "Cancel", secondary: true, action: "cancel" }
      ]
    }
  });

})(S2.UI);

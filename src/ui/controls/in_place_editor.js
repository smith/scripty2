/*global $, Class, Element, Event, S2 */

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
      this.element.store("originalTitle", this.element.readAttribute("title"));
      this.element.writeAttribute("title", opt.clickToEditText);

      UI.addClassNames(this.element, 'ui-widget ui-inplaceeditor');
      UI.addBehavior(this.element, UI.Behavior.Hover);
      this.addObservers();
      this.setText(contents);
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
        this._form.stopObserving("submit");
      }
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
      this.element.store("previousContents", text);
      return text;
   },

    /**
    **/
    edit: function (event) {
      var result, externalControl = this.options.externalControl;
      if (this._editing || this._saving) { return; }
      result = this.element.fire("ui:inplaceeditor:enter", {
        inPlaceEditor : this
      });
      if (!result.stopped) {
        this._editing = true;
        if (Object.isElement(externalControl)) { externalControl.hide(); }
        this.element.hide();
        this._createForm();
        this._editor.setValue(this.getText());
        this.element.insert({ before: this._form });
        if (!this.options.loadTextURL) { this._postProcessEditField(); }
      }

      if (event) { event.stop(); }
    },

    /**
    **/
    stopEditing: function (event) {
      var result;
      if (!this._editing) { return; }
      result = this.element.fire("ui:inplaceeditor:leave", {
        inPlaceEditor : this
      });
      if (!result.stopped) {
          this._editing = false;
          this._form.remove();
          this.element.show();
      }

      if (event) { event.stop(); }
    },

    /**
    **/
    save: function (event) {
      var result = this.element.fire("ui:inplaceeditor:before:save", {
        inPlaceEditor : this
      }), ajaxOptions = this.options.ajaxOptions;

      if (!result.stopped) {
        this._saving = true;
        this.stopEditing();
        this.element.update(this.options.savingText);
        this.element.addClassName("ui-inplaceeditor-saving");
        // TODO: callback for params instead of serialize
        // TODO: wrap onComplete/onFailure callbacks
        if (!Object.isFunction(ajaxOptions.onComplete)) {
          ajaxOptions.onComplete = function (transport) {
            result = this.element.fire("ui:inplaceeditor:after:save", {
              inPlaceEditor : this
            });
            if (!result.stopped) {
              //TODO: Highlight
              this.element.removeClassName("ui-inplaceeditor-saving");
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
        if (this.options.htmlResponse) { ajaxOptions.evalScripts = true; }
        Object.extend(ajaxOptions, {
          parameters: { editorId: this.element.identify() }
        });
        this._form.request(ajaxOptions);
      }
      if (event) { event.stop(); }
    },

    /**
    **/
    cancel: function (event) {
      var result = this.element.fire("ui:inplaceeditor:cancel", {
        inPlaceEditor: this
      });
      if (!result.stopped) {
        this.stopEditing();
        if (this._saving) { this._saving = false; }
        this.element.update(this.element.retrieve("previousContents"));
      }
      if (event) { event.stop(); }
    },

    /**
    **/
    destroy: function() {
      this.removeObservers();
      if (this._editing) { this.cancel(); }
      if (Object.isElement(this._form)) { this._form.remove(); }
      this.element.update(this.element.retrieve("originalContents"));
      // TODO: remove classnames, effects, title, and element stored data
    },

    _mouseenter: function () {
      this.options.onEnterHover(this);
    },

    _mouseleave: function () {
      this.options.onLeaveHover(this);
    },

    _click: function (event) {
       this.edit(event);
    },

    _createForm: function () {
      var form;
      if (Object.isElement(this._form)) { return; }
      form = new Element("FORM", {
        id: this.options.formId,
        "class": this.options.formClassName + " ui-widget",
        action: this.url,
        method: this.options.ajaxOptions.method || "post"
      });
      form.observe("submit", this.save.bind(this));
      this._form = form;
      this._createEditor();
      // TODO: onFormCustomization
      this._createControls();
    },

    _createEditor: function () {
      var text = this.getText(), opt = this.options, editor, elementOptions,
          rows = parseInt(opt.rows, 10), type, afterText;
      if (opt.loadTextURL) { text = opt.loadingText; }
      elementOptions = { name: opt.paramName };
      if (rows <= 1 && !/\r|\n/.test(text)) { // INPUT
        type = "INPUT";
        Object.extend(elementOptions, {
          type : "text",
          size : opt.size
        });
        afterText = "&nbsp";
      } else { // TEXTAREA
        type = "TEXTAREA";
        Object.extend(elementOptions, {
          rows: rows > 1 ? rows : opt.autoRows,
          cols: opt.cols
        });
        afterText = "<br />";
      }
      editor = new Element(type, elementOptions);
      editor.observe("keydown", this._checkForEscapeOrReturn.bind(this));
      if (opt.submitOnBlur) { editor.observe("blur", this.save.bind(this)); }
      if (opt.loadTextURL) { this._loadExternalText(); }
      this._form.insert({ top: editor, bottom: afterText });
      this._editor = editor;
    },

    _createControls: function () {
      var controls = this._controls, opts = this.options.controls, text = "",
          form = this._form, between = this.options.textBetweenControls;

      function insert(item) { form.insert({ bottom: item }); }

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
          el = new Element("A", { href: "#" });
          control = { element: el };
        } else {
          // TODO: Handle items that aren't buttons or links (text, element)
        }
        el.update(opt.label);
        control.element.observe("click", function (event) {
          event.stop();
          // TODO: text or function for button action
          opt.action(this);
        }.bind(this));
        controls.push(control);
        insert(control.element);
        if (!last) { insert(between); }
      }, this);
      insert(this.options.textAfterControls);
    },

    _checkForEscapeOrReturn: function (event) {
      var e = event;
      if (!this._editing || e.ctrlKey || e.altKey || e.shiftKey) { return; }
      if (Event.KEY_ESC === e.keyCode) { this.cancel(e); }
      else if (Event.KEY_RETURN === e.keyCode) { this.save(e); }
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
      loadingText: 'Loading&hellip;',
      paramName: 'value',
      rows: 1,                             // If 1 and multi-line, uses autoRows
      savingClassName: 'ui-inplaceeditor-saving',
      savingText: 'Saving&hellip;',
      size: 0,
      stripLoadedTextTags: false,
      submitOnBlur: false,
      textAfterControls: '',
      textBeforeControls: '',
      textBetweenControls: '&nbsp;',
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

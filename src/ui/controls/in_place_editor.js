/*global $, Class, S2 */

(function(UI) {

  /** section: scripty2 ui
   *  class S2.UI.InPlaceEditor < S2.UI.Base
   *
  **/
  UI.InPlaceEditor = Class.create(UI.Base, {
    NAME: "S2.UI.InPlaceEditor",

    /**
     *  new S2.UI.InPlaceEditor(element, options)
     *
     *  Instantiates an in place editor.
    **/
    initialize: function (element, url, options) {
      this.element = $(element);
      var opt = this.setOptions(options);

      this.element.writeAttribute("contentEditable", "true");
      UI.addClassNames(this.element, 'ui-widget ui-inplaceeditor');
      UI.addBehavior(this.element, UI.Behavior.Hover);
      this.element.store("originalBackground",
        S2.CSS.colorFromString(this.element.getStyle("background-color"))
      );

      this.observers = {
        mouseenter: this._mouseenter.bind(this),
        mouseleave: this._mouseleave.bind(this)
      };

      this.addObservers();

      this.element.store(this.NAME, this);
    },

    addObservers: function () {
      for (var o in this.observers) { if (this.observers.hasOwnProperty(o)) {
        this.element.observe(o, this.observers[o]);
      }}
    },

    removeObservers: function () {
    },

    _mouseenter: function () {
      this.options.onEnterHover(this);
    },

    _mouseleave: function () {
      this.options.onLeaveHover(this);
    }
  });

  Object.extend(UI.InPlaceEditor.prototype, {
    dispose : UI.InPlaceEditor.prototype.destroy
  });

  Object.extend(UI.InPlaceEditor, {
    DEFAULT_OPTIONS: {
      ajaxOptions: {},
      autoRows: 3,                         // Use when multi-line w/ rows == 1
      cancelControl: 'link',               // 'link'|'button'|false
      cancelText: 'cancel',
      clickToEditText: 'Click to edit',
      externalControl: null,               // id|elt
      externalControlOnly: false,
      fieldPostCreation: 'activate',       // 'activate'|'focus'|false
      formClassName: 'ui-inplaceeditor-form',
      formId: null,                        // id|elt
      highlightColor: '#ffff99',
      htmlResponse: true,
      loadingClassName: 'ui-inplaceeditor-loading',
      loadingText: 'Loading...',
      okControl: 'button',                 // 'link'|'button'|false
      okText: 'ok',
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
      onEnterHover: function (ipe) {
        ipe.element.morph("background-color:" + ipe.options.highlightColor);
      },
      onLeaveHover: function (ipe) {
        ipe.element.morph("background-color:" +
          (ipe.options.highlightEndColor ||
           ipe.element.retrieve("originalBackground")));
      }
    }
  });

})(S2.UI);
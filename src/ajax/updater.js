  /*------------------------------ AJAX: UPDATER -----------------------------*/

  Ajax.Updater = Class.create(Ajax.Request, (function() {
    function initialize($super, container, url, options) {
      this.container = {
        'success': (container.success || container),
        'failure': (container.failure || (container.success ? null : container))
      };

      options = Object.clone(options);
      var onComplete = options.onComplete;
      options.onComplete = (function(response, json) {
        this.updateContent(response.responseText);
        if (typeof onComplete === 'function') onComplete(response, json);
      }).bind(this);

      $super(url, options);
    }

    function updateContent(responseText) {
      var receiver = this.container[this.success() ? 'success' : 'failure'], 
          options = this.options;

      if (!options.evalScripts) responseText = responseText.stripScripts();

      if (receiver = $(receiver)) {
        if (options.insertion) {
          if (typeof options.insertion === 'string') {
            var insertion = { }; insertion[options.insertion] = responseText;
            receiver.insert(insertion);
          }
          else options.insertion(receiver, responseText);
        } 
        else receiver.update(responseText);
      }
    }

    return {
      'initialize':    initialize,
      'updateContent': updateContent
    };
  })());

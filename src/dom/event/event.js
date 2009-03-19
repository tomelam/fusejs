  /*---------------------------------- EVENT ---------------------------------*/

  if (!global.Event) global.Event = { };

  Event.cache = { };

  Event.CUSTOM_EVENT_NAME =
    Feature('ELEMENT_ADD_EVENT_LISTENER') ? 'dataavailable' :
    Feature('ELEMENT_ATTACH_EVENT') ? 'beforeupdate' : 'keyup';

  // temporarily hold these helpers to avoid creating several closures.
  Object._extend(Event.Temp = { }, (function() {

    function addCache(element, eventName, handler) {
      var id = getCacheID(element),
       ec = getOrCreateCache(id, element, eventName);

      // bail if handler is already exists
      if (ec.handlers.indexOf(handler) !== -1)
        return false;

      ec.handlers.unshift(handler);
      if (ec.dispatcher) return false;
      return ec.dispatcher = createDispatcher(id, eventName);
    }

    function getCacheID(element) {
      var win = getWindow(element);
      // keep a loose match because frame object !== document.parentWindow
      if (element == win) {
        if (element == global) return 1;
        return getCacheID(win.frameElement) + '-1';
      }
      else if (element.nodeType === 9) {
        if (element === Fuse._doc) return 2;
        return getCacheID(win.frameElement) + '-2';
      }
      return element.getEventID();
    }
    getCacheID.id = 3;

    function getDOMEventName(eventName) {
      if (eventName && eventName.include(':'))
        return Event.CUSTOM_EVENT_NAME;
      return eventName;
    }

    function getNewCacheID(element) {
      var id = getCacheID.id++;
      element._prototypeEventID = [id]; // backwards compatibility
      return id;
    }

    function getOrCreateCache(id, element, eventName) {
      var c = Event.cache[id] = Event.cache[id] || { 'events': { } };
      c.element = c.element || element;
      return c.events[eventName] = c.events[eventName] ||
        { 'handlers': [ ], 'dispatcher': false };
    }

    function removeCacheAtIndex(id, eventName, index) {
      // remove responders and handlers at the given index
      var c = Event.cache[id], ec = c.events[eventName];
      ec.handlers.splice(index, 1);

      // if no more handlers/responders then
      // remove the eventName cache
      if (!ec.handlers.length) delete c.events[eventName];

      // if no more events cached remove the
      // cache for the element
      for (var i in c.events) return;
      delete Event.cache[id];
    }

    var addObserver =
      // DOM Level 2
      Feature('ELEMENT_ADD_EVENT_LISTENER') ?
        function(element, eventName, handler) {
          element.addEventListener(getDOMEventName(eventName), handler, false);
        } :
      Feature('ELEMENT_ATTACH_EVENT') ?
        function(element, eventName, handler) {
          element.attachEvent('on' + getDOMEventName(eventName), handler);
        } :
      // DOM Level 0
      function(element, eventName, handler) {
        var attrName = 'on' + getDOMEventName(eventName),
         oldHandler = element[attrName];
        if (oldHandler) {
          if (oldHandler.isDispatcher) return false;
          addCache(element, eventName, element[attrName]);
        }
        element[attrName] = Event.cache[getCacheID(element)]
          .events[eventName].dispatcher;
      },

    removeObserver =
      // DOM Level 2
      Feature('ELEMENT_ADD_EVENT_LISTENER') ?
        function(element, eventName, handler) {
          element.removeEventListener(getDOMEventName(eventName), handler, false);
        } :
      Feature('ELEMENT_ATTACH_EVENT') ?
        function(element, eventName, handler) {
          element.detachEvent('on' + getDOMEventName(eventName), handler);
        } :
      // DOM Level 0
      function(element, eventName, handler) {
        var attrName = 'on' + getDOMEventName(eventName);
        if (!eventName.include(':') && element[attrName] === handler)
          element[attrName] = null;
      },

    // Event dispatchers manage several handlers and ensure
    // FIFO execution order. They are attached as the event
    // listener and execute all the handlers they manage.
    createDispatcher =
      // DOM Level 2
      Feature('ELEMENT_ADD_EVENT_LISTENER') || Feature('ELEMENT_ATTACH_EVENT') ?
        function(id, eventName) {
          return function(event) {
            // Prevent a Firefox bug from throwing errors on page
            // load/unload (#5393, #9421). When firing a custom event all the
            // CUSTOM_EVENT_NAME observers for that element will fire. Before
            // executing, make sure the event.eventName matches the eventName.
            if (!Event || !Event.extend || (event.eventName &&
                event.eventName !== eventName)) return false;
            // shallow copy handlers to avoid issues with nested 
            // observe/stopObserving
            var c = Event.cache[id], ec = c.events[eventName],
             handlers = slice.call(ec.handlers, 0), length = handlers.length;
            event = Event.extend(event || getWindow(c.element).event, c.element);
            while (length--) handlers[length].call(c.element, event);
          };
        } :
        // DOM Level 0
        function(id, eventName) {
          var dispatcher = function(event) {
            if (!Event || !Event.extend) return false;
            event = Event.extend(event || getWindow(this).event, this);
            var c = Event.cache[id], ec = c && c.events &&
              c.events[event.eventName || eventName];
            if (!ec) return false;
            var handlers = slice.call(ec.handlers, 0), length = handlers.length;
            while (length--) handlers[length].call(this, event);
          };
          dispatcher.isDispatcher = true;
          return dispatcher;
        },

    createEvent =
      Feature('DOCUMENT_CREATE_EVENT') ?
        function(context, eventType) {
          var event = getDocument(context).createEvent('HTMLEvents');
          eventType && event.initEvent(eventType, true, true);
          return event;
        } :
      Feature('DOCUMENT_CREATE_EVENT_OBJECT') ?
        function(context, eventType) {
          var event = getDocument(context).createEventObject();
          eventType && (event.eventType = 'on' + eventType);
          return event;
        } :
      function() { return false },

    fireEvent =
      Feature('ELEMENT_DISPATCH_EVENT') ?
        function(element, event) {
          // In the W3C system, all calls to document.fire should treat
          // document.documentElement as the target
          if (element.nodeType === 9)
            element = element.documentElement;
          element.dispatchEvent(event);
        } :
      Feature('ELEMENT_FIRE_EVENT') ?
        function(element, event) {
          element.fireEvent(event.eventType, event);
        } :
      function() { return false };

    return {
      'addCache':           addCache,
      'addObserver':        addObserver,
      'createDispatcher':   createDispatcher,
      'createEvent':        createEvent,
      'fireEvent':          fireEvent,
      'getCacheID':         getCacheID,
      'getDOMEventName':    getDOMEventName,
      'getNewCacheID':      getNewCacheID,
      'getOrCreateCache':   getOrCreateCache,
      'removeCacheAtIndex': removeCacheAtIndex,
      'removeObserver':     removeObserver

    };
  })());

  /*--------------------------------------------------------------------------*/

  Event.Methods = { };

  (function() {
    this.element = function element(event) {
      event = Event.extend(event);
      var node = event.target, type = event.type,
       currentTarget = event.currentTarget;

      // Firefox screws up the "click" event when moving between radio buttons
      // via arrow keys. It also screws up the "load" and "error" events on images,
      // reporting the document as the target instead of the original image.

      // Note: Fired events don't have a currentTarget
      if (currentTarget && (/^(load|error)$/.test(type) ||
         (getNodeName(currentTarget) === 'INPUT' &&
          currentTarget.type === 'radio' && type === 'click'))) {
        node = currentTarget;
      }
      // Fix a Safari bug where a text node gets passed as the target of an
      // anchor click rather than the anchor itself.
      return node && Element.extend(node.nodeType === 3 ?
        node.parentNode : node);
    };

    this.findElement = function findElement(event, expression) {
      var element = Event.element(event);
      if (!expression) return element;
      var elements = prependList(Element.ancestors(element), element);
      return Selector.findElement(elements, expression, 0);
    };

    this.pointer = function pointer(event) {
      return { 'x': Event.pointerX(event), 'y': Event.pointerY(event) };
    };

    this.stop = function stop(event) {
      // Set a "stopped" property so that a custom event can be inspected
      // after the fact to determine whether or not it was stopped.
      event = Event.extend(event);
      event.stopped = true;
      event.preventDefault();
      event.stopPropagation();
    };

    // prevent JScript bug with named function expressions
    var element = null, findElement = null, pointer = null, stop = null;
  }).call(Event.Methods);

  (function() {
    var _isButton = function(event, mouseButton) {
      var property = (typeof event.which === 'number')
       ? 'which' : (typeof event.button === 'number')
         ? 'button' : false;

      var buttonMap = (property === 'button')
        ? { 'left': 1, 'middle': 4, 'right': 2 }
        : { 'left': 1, 'middle': 2, 'right': 3 };

      return (_isButton = (property === false)
        ? function() { return false }
        : function(event, mouseButton) {
            return event[property] === buttonMap[mouseButton];
          }
      )(event, mouseButton);
    };

    this.isLeftClick = function isLeftClick(event) {
      return _isButton(event, 'left');
    };

    this.isMiddleClick = function isMiddleClick(event) {
      return _isButton(event, 'middle');
    };

    this.isRightClick = function isRightClick(event) {
      return _isButton(event, 'right');
    };

    // prevent JScript bug with named function expressions
    var isLeftClick = null, isMiddleClick = null, isRightClick = null;
  }).call(Event.Methods);

  // lazy define Event.pointerX() and Event.pointerY()
  (function(m) {
    function define(methodName, event) {
      if (!Fuse._body) return 0;
      if (typeof event.pageX === 'number') {
        Event.pointerX = m.pointerX = function(event) { return event.pageX };
        Event.pointerY = m.pointerY = function(event) { return event.pageY };
      } else {
        Event.pointerX = m.pointerX = function(event) {
          var element = event.srcElement || global;
          return event.clientX + getRoot(element).scrollLeft - 
            getDocument(element).documentElement.clientLeft;
        };
        Event.pointerY = m.pointerY = function(event) {
          var element = event.srcElement || global;
          return event.clientY + getRoot(element).scrollTop -
            getDocument(element).documentElement.clientTop;
        };
      }
      return m[methodName](event);
    }
    m.pointerX = define.curry('pointerX');
    m.pointerY = define.curry('pointerY');
  })(Event.Methods);

  /*--------------------------------------------------------------------------*/

  (function() {
    var Methods;

    function _addLevel2Methods(event) {
      event.inspect         = inspect;
      event.preventDefault  = preventDefault;
      event.stopPropagation = stopPropagation;

      // avoid memory leak
      event.pointer  = _createPointerMethod();
      event.pointerX = _createPointerMethod('x');
      event.pointerY = _createPointerMethod('y');

      var length = Methods.length;
      while (length--) {
        pair = Methods[length];
        if (!(pair[0] in event))
          event[pair[0]] = pair[1];
      }
      return event;
    }

    function _addLevel2Properties(event, element) {
      event.pageX = Event.pointerX(event);
      event.pageY = Event.pointerY(event);

      event._extendedByFuse = Fuse.emptyFunction;
      event.currentTarget   = element;
      event.target          = event.srcElement || element;
      event.relatedTarget   = _relatedTarget(event);
      return event;
    }

    function _createPointerMethod(xOrY) {
      switch (xOrY) {
        case 'x': return function() { return this.pageX };
        case 'y': return function() { return this.pageY };
        default : return function() { return { 'x': this.pageX, 'y': this.pageY } };
      }
    }

    function _relatedTarget(event) {
      switch (event.type) {
        case 'mouseover': return Element.extend(event.fromElement);
        case 'mouseout':  return Element.extend(event.toElement);
        default:          return null;
      }
    }

    function addMethods(methods) {
      var name; Methods = [];
      methods && Object.extend(Event.Methods, methods);
      Object._each(Event.Methods, Event.prototype
        ? function(value, key) { Event.prototype[key] = value.methodize() }
        : function(value, key) {
            if (key.indexOf('pointer') !== 0)
              Methods.push([key, value.methodize()]);
          }
      );
    }

    function extend(event, element) {
      return (event && !event._extendedByFuse)
        ? _addLevel2Properties(_addLevel2Methods(event), element)
        : event;
    }

    function inspect() {
      return '[object Event]';
    }

    function preventDefault() {
      this.returnValue = false;
    }

    function stopPropagation() {
      this.cancelBubble = true;
    }

    // add methods
    (Event.addMethods = addMethods)();

    if (Event.prototype || Feature('OBJECT_PROTO')) {
      // Safari 2 support
      if (!Event.prototype)
        Event.prototype = Event.Temp.createEvent(Fuse._doc)['__proto__'];

      // IE8 supports Event.prototype but still needs 
      // DOM Level 2 event methods and properties.
      if (Object.hasKey(Event.prototype, 'cancelBubble') &&
          Object.hasKey(Event.prototype, 'returnValue') &&
         !Object.hasKey(Event.prototype, 'stopPropagation') &&
         !Object.hasKey(Event.prototype, 'preventDefault') &&
         !Object.hasKey(Event.prototype, 'target') &&
         !Object.hasKey(Event.prototype, 'currentTarget')) {

        _addLevel2Methods(Event.prototype);
        Event.extend = function(event, element) {
          return (event && !event._extendedByFuse)
            ? _addLevel2Properties(event, element)
            : event;
        };
      }
      else Event.extend = Fuse.K;
    }
    else Event.extend = extend;
  })();

  /*--------------------------------------------------------------------------*/

  (function() {
    var _addCache        = this.Temp.addCache,
     _addObserver        = this.Temp.addObserver,
     _createEvent        = this.Temp.createEvent,
     _fireEvent          = this.Temp.fireEvent,
     _getCacheID         = this.Temp.getCacheID,
     _getNewCacheID      = this.Temp.getNewCacheID,
     _removeCacheAtIndex = this.Temp.removeCacheAtIndex,
     _removeObserver     = this.Temp.removeObserver;

    this.fire = function fire(element, eventName, memo) {
      element = $(element);
      var event = _createEvent(element, Event.CUSTOM_EVENT_NAME);
      if (!event) return false;
      event.eventName = eventName;
      event.memo = memo || { };
      _fireEvent(element, event);
      return Event.extend(event);
    };

    this.getEventID = function getEventID() {
      // handle calls from Event object
      if (this != global) {
        var element = arguments[0];
        return (typeof element === 'string' || element.nodeType === 1)
          ? _getCacheID($(element))
          : _getCacheID(element);
      }

      // private id variable
      var id = _getNewCacheID(arguments[0]);
      // overwrite element.getEventID and execute
      return (arguments[0].getEventID = function() {
        // if cache doesn't match, request a new id
        var c = Event.cache[id];
        if (c && c.element !== this)
          id = _getNewCacheID(this);
        return id;
      })();
    };

    this.observe = function observe(element, eventName, handler) {
      element = $(element);
      var dispatcher = _addCache(element, eventName, handler);
      if (!dispatcher) return element;
      _addObserver(element, eventName, dispatcher);
      return element;
    };

    this.stopObserving = function stopObserving(element, eventName, handler) {
      element = $(element);
      eventName = (typeof eventName === 'string') ? eventName : null;
      var id = _getCacheID(element), c = Event.cache[id];

      if (!c || !c.events) return element;
      var ec = c.events[eventName];

      if (ec && handler == null) {
        // If an event name is passed without a handler,
        // we stop observing all handlers of that type.
        var length = ec.handlers.length;
        while (length--) Event.stopObserving(element, eventName, length);
        return element;
      }
      else if (!eventName) {
        // If both the event name and the handler are omitted,
        // we stop observing _all_ handlers on the element.
        for (var eventName in c.events)
          Event.stopObserving(element, eventName);
        return element;
      }

      var dispatcher = ec.dispatcher,
       foundAt = (typeof handler === 'number') ?
         handler : ec.handlers.indexOf(handler);

      if (foundAt === -1) return element;
      _removeCacheAtIndex(id, eventName, foundAt);

      if (!Event.cache[id] || !Event.cache[id].events[eventName])
      _removeObserver(element, eventName, dispatcher);

      return element;
    };

    // prevent JScript bug with named function expressions
    var fire = null, getEventID = null, observe = null, stopObserving = null;
  }).call(Event);

  /*--------------------------------------------------------------------------*/

  (function() {
    var _addObserver    = Event.Temp.addObserver,
     _createDispatcher  = Event.Temp.createDispatcher,
     _getOrCreateCache  = Event.Temp.getOrCreateCache,
     _domLoadDispatcher = _createDispatcher(2, 'dom:loaded'),
     _winLoadDispatcher = _createDispatcher(1, 'load');

    // Ensure that the dom:loaded event has finished
    // executing its observers before allowing the
    // window onload event to proceed.
    function _domLoadWrapper(event) {
      if (!Fuse._doc.loaded) {
        event = event || global.event;
        event.eventName = 'dom:loaded';

        // define pseudo private body and root properties
        Fuse._body = Element.extend(Fuse._doc.body);
        Fuse._root = Bug('BODY_ACTING_AS_ROOT') ? Fuse._body : Element.extend(Fuse._docEl);

        Fuse._doc.loaded = true;
        _domLoadDispatcher(event);
        Event.stopObserving(Fuse._doc, 'dom:loaded');
      }
    }

    function _winLoadWrapper(event) {
      event = event || global.event;
      if (!Fuse._doc.loaded)
        _domLoadWrapper(event);
      else if (Event.cache['1'].events['dom:loaded'])
        return _winLoadWrapper.defer(event);
      event.eventName = null;
      _winLoadDispatcher(event);
      Event.stopObserving(global, 'load');
    }

    // avoid Function#wrap for better performance esp.
    // in _winLoadWrapper which could be called every 10ms
    _addObserver(Fuse._doc, 'dom:loaded',
      _getOrCreateCache(2, Fuse._doc, 'dom:loaded').dispatcher = _domLoadWrapper);

    _addObserver(global, 'load',
      _getOrCreateCache(1, global, 'load').dispatcher = _winLoadWrapper);
  })();

  /*--------------------------------------------------------------------------*/

  delete Event.Temp;

  Object.extend(Event, Event.Methods);

  Object._extend(Event, {
    'KEY_BACKSPACE': 8,
    'KEY_DELETE':    46,
    'KEY_DOWN':      40,
    'KEY_END':       35,
    'KEY_ESC':       27,
    'KEY_HOME':      36,
    'KEY_INSERT':    45,
    'KEY_LEFT':      37,
    'KEY_PAGEDOWN':  34,
    'KEY_PAGEUP':    33,
    'KEY_RETURN':    13,
    'KEY_RIGHT':     39,
    'KEY_TAB':       9,
    'KEY_UP':        38
  });

  Object._extend(Element.Methods, {
    'fire':          Event.fire,
    'getEventID':    Event.getEventID,
    'observe':       Event.observe,
    'stopObserving': Event.stopObserving
  });

  Object._extend(Fuse._doc, {
    'loaded':        false,
    'fire':          Element.Methods.fire.methodize(),
    'observe':       Element.Methods.observe.methodize(),
    'stopObserving': Element.Methods.stopObserving.methodize()
  });

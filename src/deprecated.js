  /*------------------------------- DEPRECATED -------------------------------*/

  Element.Methods.childOf = Element.Methods.descendantOf;

  Hash.toQueryString = Object.toQueryString;

  global.$continue = new Error('"throw $continue" is deprecated, use "return" instead.');

  global.Toggle = { 'display': Element.toggle };
  
  global.Insertion = { };

  (function() {
    this.Before = function Before(element, content) {
      return Element.insert(element, { 'before':content });
    };

    this.Top = function Top(element, content) {
      return Element.insert(element, { 'top':content });
    };

    this.Bottom = function Bottom(element, content) {
      return Element.insert(element, { 'bottom':content });
    };

    this.After = function After(element, content) {
      return Element.insert(element, { 'after':content });
    };

    // prevent JScript bug with named function expressions
    var Before = null, Top = null, Bottom = null, After = null;
  }).call(Insertion);

  // This should be moved to script.aculo.us; notice the deprecated methods
  // further below, that map to the newer Element methods.
  global.Position = { 
    // set to true if needed, warning: firefox performance problems
    // NOT needed for page scrolling, only if draggable contained in
    // scrollable elements
    'includeScrollOffsets': false, 
    'cumulativeOffset':     Element.Methods.cumulativeOffset,
    'page':                 Element.Methods.viewportOffset,
    'positionedOffset':     Element.Methods.positionedOffset,
    'realOffset':           Element.Methods.cumulativeScrollOffset,
    'offsetParent':         Element.Methods.getOffsetParent
  };

  (function () {
    this.absolutize = function absolutize(element) {
      Position.prepare();
      return Element.absolutize(element);
    };

    this.relativize = function relativize(element) {
      Position.prepare();
      return Element.relativize(element);
    };

    this.clone = function clone(source, target, options) {
      return Element.clonePosition(target, source, options);
    },

    // within must be called directly before
    this.overlap = function overlap(mode, element) {  
      if (!mode) return 0;  
      if (mode == 'vertical') 
        return ((this.offset[1] + element.offsetHeight) - this.ycomp) / 
          element.offsetHeight;
      if (mode == 'horizontal')
        return ((this.offset[0] + element.offsetWidth) - this.xcomp) / 
          element.offsetWidth;
    },

    // must be called before calling withinIncludingScrolloffset, 
    // every time the page is scrolled
    this.prepare = function prepare() {
      this.deltaX =  
        global.pageXOffset     ||
        Fuse._docEl.scrollLeft ||
        Fuse._body.scrollLeft  || 0;

      this.deltaY =
        global.pageYOffset    || 
        Fuse._docEl.scrollTop ||
        Fuse._body.scrollTop  || 0;
    };

    this.within = function within(element, x, y) {
      if (this.includeScrollOffsets)
        return this.withinIncludingScrolloffsets(element, x, y);

      // caches x/y coordinate pair to use with overlap
      this.xcomp  = x;
      this.ycomp  = y;
      this.offset = Element.cumulativeOffset(element);

      return (
        y >= this.offset[1] &&
        y <  this.offset[1] + element.offsetHeight &&
        x >= this.offset[0] && 
        x <  this.offset[0] + element.offsetWidth
      );
    };

    this.withinIncludingScrolloffsets = function withinIncludingScrolloffsets(element, x, y) {
      var offsetcache = Element.cumulativeScrollOffset(element);
      this.xcomp  = x + offsetcache[0] - this.deltaX;
      this.ycomp  = y + offsetcache[1] - this.deltaY;
      this.offset = Element.cumulativeOffset(element);

      return (
        this.ycomp >= this.offset[1] &&
        this.ycomp <  this.offset[1] + element.offsetHeight &&
        this.xcomp >= this.offset[0] && 
        this.xcomp <  this.offset[0] + element.offsetWidth
      );
    };

    // prevent JScript bug with named function expressions
    return absolutize =             null,
     clone =                        null,
     overlap =                      null,
     prepare =                      null,
     relativize =                   null,
     within =                       null,
     withinIncludingScrolloffsets = null;
  }).call(Position);

  /*--------------------------------------------------------------------------*/

  if (!isHostObject(Fuse._doc, 'getElementsByClassName')) {
    (function() {
      var iter = function(name) {
        return name.blank() ? null : '[contains(concat(" ", @class, " "), " ' + name + ' ")]';
      };

      var getElementsByClassName = function getElementsByClassName(element, className) {
        className = className.toString().strip();
        var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
        if (!classNames && !className) return elements;

        var nodes = $(element).getElementsByTagName('*');
        className = ' ' + className + ' ';

        for (var i = 0, child, cn; child = nodes[i]; i++) {
          if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
            (classNames && classNames.all(function(name) {
              return !name.toString().blank() && cn.include(' ' + name + ' ') })))) {
            elements.push(Element.extend(child));
          }
        }
        return elements;
      };

      if (Feature('XPATH')) {
        getElementsByClassName = function getElementsByClassName(element, className) {
          className = className.toString().strip();
          var cond = /\s/.test(className)
            ? $w(className).map(iter).join('')
            : iter(className);

          return cond
            ? Fuse._doc._getElementsByXPath('.//*' + cond, element)
            : [];
        };
      }

      Element.Methods.getElementsByClassName = getElementsByClassName;
    })();

    Fuse._doc.getElementsByClassName = (function() {
      function getElementsByClassName(className, parentElement) {
        return $(parentElement || Fuse._body).getElementsByClassName(className);
      }
      return getElementsByClassName;
    })();
  }

  /*--------------------------------------------------------------------------*/

  Element.ClassNames = Class.create(Enumerable);

  (function() {
    this.initialize = function initialize(element) {
      this.element = $(element);
    };

    this._each = function _each(callback) {
      this.element.className.split(/\s+/)
        .select(function(name) { return name.length > 0 })
          ._each(callback);
    };

    this.add = function add(classNameToAdd) {
      if (this.include(classNameToAdd)) return;
      this.set(this.toArray().concat(classNameToAdd).join(' '));
    };

    this.remove = function remove(classNameToRemove) {
      if (!this.include(classNameToRemove)) return;
      this.set(this.toArray().without(classNameToRemove).join(' '));
    };

    this.set = function set(className) {
      this.element.className = className;
    };

    this.toString = function toString() {
      return this.toArray().join(' ');
    };

    // prevent JScript bug with named function expressions
    var initialize = null,
     _each =         null,
     add =           null,
     remove =        null,
     set =           null,
     toString =      null;
  }).call(Element.ClassNames.prototype);

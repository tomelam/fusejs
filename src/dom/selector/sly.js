  /*----------------------------- SELECTOR: SLY ------------------------------*/

  (function(object, NodeList) {
    function match(element, selectors) {
      return Sly(String(selectors || ''))
        .match(element.raw || fuse.get(element).raw);
    }

    function query(selectors, context, callback, toList) {
      var node, i = -1, results = toList(Sly(String(selectors || ''),
        context && fuse.get(context).raw || fuse._doc));
      if (callback) {
        while (node = results[++i]) callback(node);
      }
      return results;
    }

    function select(selectors, context, callback) {
      return query(selectors, context, callback, NodeList.fromNodeList);
    }

    object.match = match;
    object.select = select;

  })(fuse.dom.selector, fuse.dom.NodeList);

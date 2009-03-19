  /*---------------------------------- AJAX ----------------------------------*/

  global.Ajax = (function() {
    // Check ActiveXObject first because IE7+ implementation of
    // XMLHttpRequest doesn't work with local files.
    var getTransport = function getTransport() { return false };
    
    if (isHostObject(global, 'ActiveXObject')) {
      // The "Difference between MSXML2.XmlHttp and Microsoft.XmlHttp ProgIDs"
      // post explains why MSXML2.XmlHttp is not needed:
      // http://forums.asp.net/p/1000060/1622845.aspx
      getTransport = function getTransport() {
        return new ActiveXObject('Microsoft.XMLHTTP');
      };
    }
    else if (isHostObject(global, 'XMLHttpRequest')) {
      getTransport = function getTransport() {
        return new XMLHttpRequest();
      };
    }

    return {
      'activeRequestCount': 0,
      'getTransport': getTransport
    };
  })();

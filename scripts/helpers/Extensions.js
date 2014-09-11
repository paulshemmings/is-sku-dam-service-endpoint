/*
 * Nifty little method to ensure that allows you to
 * bind a method to a desired scope.
 * Very similar to JQuery $.proxy
 * http://howtonode.org/what-is-this
 *
 * Used like this obj.onEventHandler = bind(HandlerClass.method, HandlerClass);
 *
 * When the handler calls the method, the method will run within the scope
 * of the HandlerClass
 */

exports.bind = function(fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  }
}

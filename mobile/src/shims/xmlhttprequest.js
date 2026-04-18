const NativeXMLHttpRequest =
  typeof global !== 'undefined' && global.XMLHttpRequest
    ? global.XMLHttpRequest
    : function XMLHttpRequestUnavailable() {
        throw new Error('XMLHttpRequest is not available in this runtime');
      };

module.exports = {
  XMLHttpRequest: NativeXMLHttpRequest,
};

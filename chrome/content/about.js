function openURL(url) {

    var uri = SHB.Cc["@mozilla.org/network/standard-url;1"].createInstance(SHB.Ci.nsIURI);
    var protocolSvc = SHB.Cc["@mozilla.org/uriloader/external-protocol-service;1"].getService(SHB.Ci.nsIExternalProtocolService);

    uri.spec = url;
    protocolSvc.loadUrl(uri);
}

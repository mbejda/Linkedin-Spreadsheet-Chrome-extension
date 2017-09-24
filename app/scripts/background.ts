// Enable chromereload by uncommenting this line:
//import 'chromereload/devonly'




/**
 * Google Analytics
 */
(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-26078711-42']);
_gaq.push(['_trackPageview']);


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {


      _gaq.push(['_trackEvent', request.id, request.action]);


  });




chrome.runtime.onInstalled.addListener((details) => {

  _gaq.push(['_trackEvent', 'app', details.previousVersion]);

});

chrome.tabs.onUpdated.addListener((tabId) => {

  chrome.pageAction.show(tabId);

});

chrome.browserAction.onClicked.addListener(function(tab) {

  chrome.tabs.sendMessage(tab.id, {action: "toggle"}, function(response) {

    _gaq.push(['_trackEvent', 'browser action', 'clicked']);

  });

});



// Enable chromereload by uncommenting this line:
///import 'chromereload/devonly'
import * as $ from "jquery";
import * as Handsontable from "handsontable"

var sendEvent = function(id,action) {

  chrome.runtime.sendMessage({id: id,action:action}, function(response) {

  });

};


var handsontable2csv = {
  string: function(instance) {
    var headers = instance.getColHeader();

    var csv = "sep=;\n";
    csv += headers.join(";") + "\n";

    for (var i = 0; i < instance.countRows(); i++) {
      var row = [];
      for (var h in headers) {
        var prop = instance.colToProp(h);
        var value = instance.getDataAtRowProp(i, prop);
        row.push(value)
      }

      csv += row.join(";");
      csv += "\n";
    }

    return csv;
  },

  download: function(instance, filename) {
    var csv = handsontable2csv.string(instance);

    var link = document.createElement("a");
    link.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(csv));
    link.setAttribute("download", filename);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }
};

var containers = {};



var noSheets = function() {
  $('#sheet-wrapper .no-sheets').remove();
  $('#sheet-wrapper').append('<div class="no-sheets"><h1>No Sheets! Click add sheets to get started.</h1></div>');

};

var sheetsExist = function(){
  $('#sheet-wrapper .no-sheets').remove();
};

var isVisible = function(cb){
  chrome.storage.sync.get("visible", function (store) {
    if(!store.visible || store.visible === false){
      return cb(false)
    }
    return cb(true);
  })
};


var addToggleTrigger = function(){

  $('.toggle-sheets').off('click').on('click',function(){

    $("#sheet-wrapper").slideToggle(200,function() {


      if ($("#sheet-wrapper").is(":visible")) {

        chrome.storage.sync.set({"visible": true}, function () {

        })

      } else {

        chrome.storage.sync.set({"visible": false}, function () {

        })
      }

    });

  });

};


var addPanel = function(){

  $('body').append('<div id="sheet-wrapper"><div class="ls-logo"></div><ul id="menu"></ul><ul class="tabs"></ul><div id="sheets"></div></div>');

  $('#sheet-wrapper').append('<a class="logo-img "></a>');

  $('body').append('<a id="toggle" class="l-btn toggle-sheets">Spreadsheet</a>');

};

var togglePanel = function(){

  sendEvent('panel','toggled');

  return $("#sheet-wrapper").slideToggle()

};


function init() {

  addPanel();

  isVisible(function(visible){

    if(visible === false){

      togglePanel();

    }

  });

  addToggleTrigger();


  /**
   * Panel can be toggled by icon click
   */
  chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {

    if (msg.action == 'toggle') {

      togglePanel();
    }
  });




  var $sheets = $('body').find("#sheet-wrapper #sheets");
  var $tabs = $('body').find("#sheet-wrapper ul.tabs");


  var getSheets = function(callback){
    chrome.storage.sync.get('sheets', function(data) {
      if(data){
        try {
          data = JSON.parse(data.sheets);
        }catch(e){
          data = [];
        }
      }
      callback(null,data);

    })
  };

  var saveSheets = function(sheets,callback){

    sendEvent('spreadsheet','added');

    chrome.storage.sync.set({"sheets":JSON.stringify(sheets)},function () {

      callback(null,true);

    });

  };


  var selectSheet= function(sheetId,cb){

    var tab_id = $(`[data-tab="${sheetId}"]`);


    $('ul.tabs li').removeClass('current');
    $('.tab-content').removeClass('current');

    tab_id.addClass('current');
    $("#"+sheetId).addClass('current');

    containers[sheetId].container.render();
    cb(true);
  };



  var addSheet = function(name,id){

    var sheetId = `sheet-${id}`;

    var tab = $(`<li class="tab-link" data-tab="${sheetId}">${name}</li>`);
    var sheet = $(`<div class='spreadsheet tab-content' id="${sheetId}"></div>`);



    $sheets.append(sheet);
    $tabs.append(tab);

    $('ul.tabs li').click(function(){
      var tab_id = $(this).attr('data-tab');

      $('ul.tabs li').removeClass('current');
      $('.tab-content').removeClass('current');

      $(this).addClass('current');
      $("#"+tab_id).addClass('current');

      containers[tab_id].container.render();

    });


    chrome.storage.sync.get(sheetId, function(data) {

      if (data[sheetId]) {
        try {
          data = JSON.parse(data[sheetId])
        }catch(e){
          data = false;
        }
      }

      var container = document.getElementById(sheetId);

      var hot = new Handsontable(container, {
        startCols: 12,
        minCols: 12,
        minRows:10,
        startRows: 12,
        stretchH: 'all',
        minSpareRows: 2,
        rowHeaders: true,
        colHeaders: true,
        contextMenu: true,
        manualColumnFreeze: true,
        manualRowFreeze: true,
        manualRowResize: true,
        manualRowMove: true,
        manualColumnResize: true,
        manualColumnMove:true,
        comments: true,
        afterChange: function (change, source) {
          if (source === 'loadData') {
            return; //don't save this change
          }
          var set = {};
          set[sheetId] = JSON.stringify(hot.getData());

          sendEvent('spreadsheet','saved');

          chrome.storage.sync.set(set, function () {

            // Notify that we saved.
          });

        }
      });















      if(data !== false && Array.isArray(data)) {
       hot.loadData(data);
      }

      if($(".fix-header").hasClass('active')){

        hot.updateSettings({ fixedRowsTop: 1 });

      }

      containers[sheetId] = {container : hot,id:id,name:name};

      selectSheet(sheetId,function(){

      });

    });
  };


  var getSelectedSheet = function(){
    var sheetId = $('ul.tabs li.current').attr('data-tab');
    return sheetId;
  };

  $('#menu').append('<li><input id="sheet-name" type="text"/></li><li><a class="l-btn add-sheet">Add Sheet</a></li>');
  $('#menu').append('<li><a class="l-btn del-sheet">Delete Sheet</a></li>');
  $('#menu').append('<li><a id="export-file" class="l-btn export-sheet ">Export Sheet</a></li>');
  $('#menu').append('<li><a id="clear" class="l-btn clear-sheet ">Clear Sheet</a></li>');
  $('#menu').append('<li><a id="fix-header" class="l-btn fix-header ">Fix Header</a></li>');





  getSheets(function(error,sheets){
    if(!sheets || sheets.length === 0){
      noSheets();
      sheets = [];
    }
    sheets.reverse();

    $.each(sheets,function(index){
      var item = sheets[index];
      addSheet(item.name,item.id);
    });

    $('.export-sheet').on('click',function(){
      var sheetId = getSelectedSheet();
      sendEvent('spreadsheet','exported');

      handsontable2csv.download(containers[sheetId].container, `${containers[sheetId].name}.csv`);

    });

    $('.clear-sheet').on('click',function(){
      var sheetId = getSelectedSheet();

      sendEvent('spreadsheet','cleared');

      containers[sheetId].container.clear();

    });


    $('.fix-header').on('click',function(){
      if($(this).hasClass('active')){
        $(this).removeClass('active');

        sendEvent('header','unfixed');


        Object.keys(containers).forEach(function(key) {

          containers[key].container.updateSettings({ fixedRowsTop: 0 });

        });

      }else{

        sendEvent('header','fixed');


        $(this).addClass('active');

        Object.keys(containers).forEach(function(key) {
          containers[key].container.updateSettings({ fixedRowsTop: 1 });
        });
      }
    });

    $('.del-sheet').on('click',function(){

      var sheetId = getSelectedSheet();
      chrome.storage.sync.remove(sheetId, function () {

        sendEvent('spreadsheet','removed');

        // Notify that we saved.
      });

        $.each(sheets, function (index) {
          var item = sheets[index];

          if (item && sheetId === `sheet-${item.id}`) {
            sheets.splice(index, 1);

            saveSheets(sheets, function () {
            });

            $(`[data-tab="${sheetId}"]`).remove();
            $("#" + sheetId).remove();

            delete containers[sheetId];

            if (sheets.length === 0) {
              noSheets();
              return false;
            }
            var item = sheets[sheets.length - 1];
            var selected = `sheet-${item.id}`;
            selectSheet(selected, function () {

            });

          }


      })
    });

    $('.add-sheet').on('click',function(){
      var rawName = $("#sheet-name").val();
      if(!rawName || rawName.length === 0){

        sendEvent('spreadsheet','name error');

        return false;
      }

      sendEvent('spreadsheet','added');


      var name = rawName.replace(/\s+/g, '-').toLowerCase();


      var id = Math.floor(Date.now() / 1000)+sheets.length;

      sheets.push({name:name,id:id});

      saveSheets(sheets,function () {
        sheetsExist();
        addSheet(name,id);
      });
    });


  });
}



$(document).ready(function(){
  init()
});

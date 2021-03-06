"use strict";

window.onfocus = function (event) {
  event.target.blur();
};

SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement 
  || function(toElement) {
    return toElement.getScreenCTM().inverse().multiply(this.getScreenCTM());
};

function showEvent(event) {
  console.log(event.type);
}

function match_element( obj ) { 
  return obj.element === this;
}

function match_id( obj ) { 
  return obj.id === this;
}

function generate_unique_id( base_id ) {
  var i = 0;
  var uid = base_id;
  while ( null != document.getElementById( uid ) ) {
    uid = base_id + "-" + i++;
  }
  return uid;
}


function describlerObj(root) {
  this.root = root;

  this.app = null;

  // chart properties 
  // document.activeElement
  this.charts = [];

  // voice and sonification properties
  this.speeches = [];
  this.options = [];
  this.menu = new menuObj();

  // this.voice = new SpeechSynthesisUtterance();
  this.sonifier = null;

  // 
  this.interaction_mode = "voice"; // "voice" or "sonifier"

  // constants
  this.svgns = "http://www.w3.org/2000/svg";

  ntc.init();

  this.taskAssessments = [];


  // create a list of all focusable elements, including the root
  var focusList = this.root.parentNode.querySelectorAll("[tabindex='0']");
  this.focusList = Array.from( focusList );

  // unshift
  console.log("this.focusList");
  console.log(this.focusList);

  // focus properties
  this.focusIndex = -1;
  this.activeElement = null;
  this.previous_datapoint = null;
  this.previous_node = null; // flowcharts
  this.activeObject = null;
  this.padding = 0;
  this.strokewidth = 0;

  // find appropriate sizes
  var basesize = 10;
  var vb = root.getAttribute("viewBox");
  if (vb) {
    var vb_array = vb.split(" ");
    basesize = (Math.max(vb_array[2], vb_array[3]) / 100);    
  }
  this.padding = basesize;
  this.strokewidth = basesize / 2;
  
  // create focus box
  this.focusBox = document.createElementNS(this.svgns, "rect");
  this.focusBox.setAttribute("rx", this.padding/2 );
  this.focusBox.setAttribute("ry", this.padding/2 );
  var style = "fill:none; stroke:cornflowerblue; stroke-linejoin:round; stroke-opacity:0.6; stroke-width:" 
            + this.strokewidth + "px; ";
  this.focusBox.setAttribute("style", style);
  this.root.appendChild( this.focusBox );

  this.root.addEventListener("click", bind(this, this.click), false );
  this.root.addEventListener("keydown", bind(this, this.trackKeys), false );

  this.createModel();
  
  this.speech_volume = 0.3;
  this.sonifier_volume = 1;
  this.sonifier = new Sonifier();

  this.metaGroup = document.createElementNS(this.svgns, "g");
  this.metaGroup.setAttribute("id", "describler-metadata" );
  this.root.appendChild( this.metaGroup );

  console.log(this);

  // this.setActiveElement(this.root);

}

describlerObj.prototype.createModel = function () {

  var charts = this.root.querySelectorAll("[role='chart']");
  if (!charts.length) {
    var role = this.root.getAttribute("role");
    
    if ( "chart" == role){
      charts = [this.root];     
    }   
  }
  // console.log( charts );

  // parse all charts
  for (var c = 0, c_len = charts.length; c_len > c; ++c) {
    var chartEl = charts[c];
    var chart = new chartObj( chartEl );
    this.charts.push( chart );  

    var taskAssessment = new taskAssessmentObj( this, this.root, chart ); 
    if (taskAssessment.element) {
      this.taskAssessments.push( taskAssessment );
    }
  }
  console.log( this.charts );
  this.exportCSV();

  var flowcharts = this.root.querySelectorAll("[role='flowchart']");
  if (!flowcharts.length) {
    var role = this.root.getAttribute("role");
    
    if ( "flowchart" == role){
      flowcharts = [this.root];     
    }   
  }
  console.log( charts );

  // parse all flowcharts
  for (var f = 0, f_len = flowcharts.length; f_len > f; ++f) {
    var flowchart_el = flowcharts[f];
    var flowchart = new flowchartObj(flowchart_el);
    this.charts.push( flowchart );  
  }
/*
 */

  // generic unstructured graphics/text content
  if ( 0 == this.charts.length) {
    this.findTextContent();
    // console.log( charts );
  }

  // this.mapToRange();
}   

describlerObj.prototype.exportCSV = function () {
  for (var c = 0, c_len = this.charts.length; c_len > c; ++c) {
    var chart = this.charts[c];
    
    var csv = "";
    for (var d = 0, d_len = chart.datasets.length; d_len > d; ++d) {
      var dataset = chart.datasets[d];
      
      var allies = [];
      for (var a in chart.axes) {
        // console.log(key, chart[axis]);
        var eachAxis = chart.axes[a];
        if (eachAxis["labels"]) {
          if ( dataset.length == eachAxis["labels"].length){
            allies.push({
              "label": eachAxis.label,
              "fields": eachAxis["labels"]
            });
          }
        }
      }
      
      if ( "bar" == chart.type){
        if ( 1 == allies.length){
          var axis = allies[0];
          csv = axis["label"] + ",values\n";

          for (var i = 0, i_len = axis["fields"].length; i_len > i; ++i) {
            csv += axis["fields"][i] + "," + dataset[i].value + "\n";
          } 
        }
      } else if ( "pie" == chart.type){
        for (var i = 0, i_len = dataset.length; i_len > i; ++i) {
          csv += dataset[i].label + "\n";
        } 
      }
    }
    console.log( "CSV file: \n" + csv );
  }


}

describlerObj.prototype.findTextContent = function () {
  console.log("findTextContent");
  var textContents = document.querySelectorAll("text,title");
  for (var t = 0, t_len = textContents.length; t_len > t; ++t) {
    var eachTextContent= textContents[t];
    var el = eachTextContent;
    if ( "title" == el.localName){
      el = el.parentNode;
    }
    
    el.setAttribute("tabindex", 0 );
  }
  this.focusList = this.root.parentNode.querySelectorAll("[tabindex='0']");
  // console.log(this.focusList);
}   

describlerObj.prototype.navNext = function () {
  // console.log( "tabNext: " + focus.index );  
  this.focusIndex++;
  if (this.focusList.length - 1 < this.focusIndex) {
    this.focusIndex = 0;
  }
  
  this.setActiveElement( this.focusList[ this.focusIndex ] );
}

describlerObj.prototype.navPrev = function () {
  // console.log( "tabPrev: " + this.focusIndex );
  this.focusIndex--;
  if (-1 >= this.focusIndex) {
    this.focusIndex = this.focusList.length - 1;
  }
  this.setActiveElement( this.focusList[ this.focusIndex ] );
}

describlerObj.prototype.setActiveElement = function ( el ) {
  if (el) {
    if ( this.activeElement ) {
      var last_role = this.activeElement.getAttribute("role");
      if ( "datapoint" == last_role ) {
        this.previous_datapoint = this.activeElement;
        // console.log( this.previous_datapoint );
      } else if ( "node" == last_role ) {
        this.previous_node = this.activeElement;
        // console.log( this.previous_node );
      }
    // } else {
    //   var focus_index = this.focusList.findIndex( function ( element ) {
    //       return element == this;
    //     }, el );
    //   if ( null != focus_index) {
    //     this.focusIndex = focus_index;
    //   }
    }

    var focus_index = this.focusList.findIndex( function ( element ) {
        return element == this;
      }, el );
    if ( null != focus_index ) {
      this.focusIndex = focus_index;
    }

    this.activeElement = el;
    this.showFocus();
  }
}

describlerObj.prototype.showFocus = function () {
  if (!this.activeElement) {
    console.log("oops");
  }

  this.activeElement.focus();

  // simulate focus
  var bbox = this.activeElement.getBBox();
  var transform = this.activeElement.getScreenCTM().inverse().multiply(this.root.getScreenCTM()).inverse();

  // console.log(transform);

  var x = bbox.x - this.padding;
  var y = bbox.y - this.padding;
  var w = bbox.width + (this.padding * 2);
  var h = bbox.height + (this.padding * 2);

  this.focusBox.setAttribute("x", x );
  this.focusBox.setAttribute("y", y );
  this.focusBox.setAttribute("width", w );
  this.focusBox.setAttribute("height", h );

  // TODO: figure out how to apply matrix transform to this element
  this.focusBox.setAttribute("transform", "translate(" + transform.e + ","  + transform.f + ")" );

  this.menu.reset();
  this.getInfo();
}   

describlerObj.prototype.trackKeys = function (event) {
  // console.log("describlerObj.trackKeys");
  var key = event.key.toLowerCase();
  // console.log( key );
  // console.log( "key: " + event.key);

  if ( "tab" == key 
    || "arrowdown" == key
    || "arrowright" == key
    || "arrowup" == key
    || "arrowleft" == key ) {
    // tab
    event.preventDefault();
    event.stopPropagation();
    // document.activeElement.blur();

    if ( (event && event.shiftKey) 
      || "arrowup" == key
      || "arrowleft" == key ) {
      this.navPrev();
    } else {
      this.navNext();
    }
  } else if ("d" == key ) {
    // d

    // TODO: set "more details"
    this.getInfo();
  } else if ("s" == key) {
    // s
    this.sonify();
  } else if ( "0" == key
          ||  "1" == key
          ||  "2" == key 
          ||  "3" == key 
          ||  "4" == key 
          ||  "5" == key 
          ||  "6" == key 
          ||  "7" == key 
          ||  "8" == key 
          ||  "9" == key ) {
    // 1 to 9
    // var number = parseInt(key.substr(2)) - 30;
    var number = parseInt(key);
    // console.log( "key: " + number);

    var is_selection = this.menu.select( number );
    if (is_selection) {
      var selected = this.menu.selected;

      if ( "assessment" != selected.type ) {
        this.getInfo();
        
        if ( this.speeches.length){
          this.speak();   
        }
      } else {
        if ( "answer" == selected.context ){
          this.taskAssessments[0].evaluateAnswer( selected.id, selected.label, selected.context, selected.type );
        } else {
          this.taskAssessments[0].runTest();
        }
      }
    } else {
      this.speeches.length = 0;
      this.speeches.push( "Invalid option." );
      this.speak();   
    }
   } else if ("escape" == key ) {
    // escape
    if ( speechSynthesis && speechSynthesis.speaking ){
      speechSynthesis.cancel();
    }

    if (this.sonifier) {
      // this.sonifier.stopPlay();
      // this.sonifier.toggleVolume( true );
      this.sonifier.setVolume( 0 );
    }
  }

}

describlerObj.prototype.click = function (event){
  event.preventDefault();
  event.stopPropagation();
  // document.activeElement.blur(); 
  
  var focusEl = event.target;
  while ( !focusEl.hasAttribute("tabindex")){
    // console.log( focusEl );
    if ( document == focusEl.parentNode){
      return false;
    }
    focusEl = focusEl.parentNode;
  }
  // console.log( focusEl );

  focusEl.blur();

  var new_focus_el = this.focusList.find( function ( element ) {
      return element == this;
    }, focusEl );
  if ( new_focus_el ) {
    this.focusIndex = this.focusList.findIndex( function ( element ) {
        return element == this;
      }, focusEl );

    this.setActiveElement( new_focus_el );
  }
}

describlerObj.prototype.mapToRange = function (val, range1, range2){
  // affine transformation transforms number x in range [a,b] to number y in range [c,d]
  // y = (x-a)(d-c/b-a) + c
  
  var newVal = ( (val - range1[0]) * ((range2[1] - range2[0]) / (range1[1] - range1[0])) ) + range2[0];
  return newVal;
}



describlerObj.prototype.getFraction = function (decimal){
  console.log("decimal: " + decimal);
  var msg = "The same as ";

  if ( isNaN(decimal) ){
    return "not a number!";
  }

  if ( 1 != decimal){
    var fraction = 1;
    var numerator = 1;
    var denominator = 1;

    while (fraction.toFixed(3) != decimal.toFixed(3)) {
      // console.log( fraction + "," + decimal );
      if (fraction.toFixed(3) < decimal.toFixed(3)){
        numerator += 1;
      }
      else {
        denominator += 1;
        numerator = parseInt(decimal * denominator);
      }
      fraction = numerator / denominator;
    }

    msg = numerator + "/" + denominator;
    if ( numerator > denominator){
      var number = parseInt( numerator / denominator );
      var mod = numerator % denominator;
      
      /*
      for (var d = 0; 10 > d; ++d) {
        var mod2 = denominator % mod;
        if ( 0 != mod2){
          
        }
      }
      */
      
      msg = number.toString() + " " + mod + "/" + denominator;
      if ( 0 == mod){
        msg = number.toString() + " times ";
      }
    }
  }
  return msg;
}

describlerObj.prototype.getOrdinalNumber = function (number){

  var ordinal = "";
  if ( 3 < ordinal && 21 > number ){
    ordinal += number + "th";
  } else {
    switch ( number.toString().split("").pop() ){
      case "1":
        ordinal += number + "st";
        break;

      case "2":
        ordinal += number + "nd";
        break;

      case "3":
        ordinal += number + "rd";
        break;

      default:
        ordinal += number + "th";
    }
  }
  return ordinal;
}

describlerObj.prototype.convertNumberToWords = function (number){

  var names = [{"0":"zero", "1":"one", "2":"two", "3":"three", "4":"four", "5":"five", "6":"six", 
                "7":"seven", "8":"eight", "9":"nine" },{"0":"ten", "1":"eleven", "2":"twelve", 
                "3":"thirteen", "4":"fourteen", "5":"fifteen", "6":"sixteen", "7":"seventeen", 
                "8":"eighteen", "9":"nineteen"},{"2":"twenty", "3":"thirty", "4":"forty", "5":"fifty", 
                "6":"sixty", "7":"seventy", "8":"eighty", "9":"ninety"},["", "thousand", "million", 
                "billion", "trillion", "quadrillion", "quintillion", "sextillion", "septillion", 
                "octillion", "nonillion", "decillion", "undecillion", "duodecillion", "tredecillion", 
                "quattuordecillion", "quindecillion", "sexdecillion", "septdecillion", "octdecillion", 
                "novemdecillion", "vigintillion"]];
  var to_words = function (s, n){
      var ns = s.slice(0,3);
      return (ns.length < 1)?"":to_words(s.slice(3,s.length),n+1)
             +((ns.length>1)?((ns.length==3&&ns[2]!="0")?names[0][ns[2]]+" hundred "
             +((ns[1]=="1")?names[1][ns[0]]+" ":(ns[1]!="0")?names[2][ns[1]]+" "
             +((ns[0]!="0")?names[0][ns[0]]+" ":""):(ns[0]!="0"
             ?names[0][ns[0]]+" ":"")):((ns[1]=="1")?names[1][ns[0]]+" ":(ns[1]!="0")
             ?names[2][ns[1]]+" "+((ns[0]!="0")?names[0][ns[0]]+" ":""):(ns[0]!="0"
             ?names[0][ns[0]]+" ":""))) + (((ns.length==3&&(ns[0]!="0"||ns[1]!="0"
             ||ns[2]!="0"))||(ns.length==2&&(ns[0]!="0"||ns[1]!="0"))||(ns.length==1&&ns[0]!="0"))
            ?"<span class='magnitude'>"+names[3][n]+"</span> ":""):((ns.length==1&&ns[0]!="0")
            ?names[0][ns[0]]+" ":"") + (((ns.length==3&&(ns[0]!="0"||ns[1]!="0"||ns[2]!="0"))
            ||(ns.length==2&&(ns[0]!="0"||ns[1]!="0"))||(ns.length==1&&ns[0]!="0"))
            ?"<span class='magnitude'>"+names[3][n]+"</span> ":""));
  }, input;
  document.getElementById("input").addEventListener("keyup", function (){
  document.getElementById("output").innerHTML = to_words(this.value.replace(/[^0-9]/g, "")
          .split("").reverse(), 0);
  }, false);
}


describlerObj.prototype.getInfo = function (){
  this.speeches.length = 0;
  this.options.length = 0;
  
  if (!this.activeElement) {
    return false;
  }
  
  var role = this.activeElement.getAttribute("role");

  // if ( "chart" != role){
  // }

  // TODO: cycle through charts, find matching element

  switch ( role ){
    case "chart":
      this.handle_chart();
      break;

    case "datapoint":
      this.handle_datapoint();
      break;

    case "datagroup":
      this.handle_datagroup();
      break;

    case "axis":
    case "xaxis":
    case "yaxis":
      this.handle_axis();
      break;

    case "axisitem":
      this.handle_axisitem();
      break;

    case "legend":
      this.handle_legend();
      break;

    case "legenditem":
      this.handle_legenditem();
      break;

    case "flowchart":
      this.handle_flowchart();
      break;

    case "node":
      this.handle_node();
      break;

    case "connector":
      this.handle_connector();
      break;

    default:
      this.handle_default();
      break;

  }
  
  if ( this.speeches.length){
    this.speak();   
  }
}


describlerObj.prototype.handle_chart = function (){
  // console.log("handle_chart");
  // this.speeches.push( "chart" );     

  var chart = this.charts.find( match_element, this.activeElement );
  if (chart) {
    var chart_index = this.charts.findIndex( match_element, this.activeElement );
    this.activeObject = chart;

    // console.log("chart:");
    // console.log(chart);
    // console.log("index: " + chart_index);

    for (var d = 0, d_len = chart.datasets.length; d_len > d; ++d) {
      var dataset = chart.datasets[d];

      if ( chart.label){
        this.speeches.push( "Chart: " + chart.label );
      }
      
      if ( this.menu.selected ){
        // console.log( "option: " + this.menu.selected.id );
        if ( "stats" == this.menu.selected.id ){
          // this.speeches.push( "This is a " + chart.type + " chart, with " 
          //                    + dataset.length + " data points" );
          var stats_msg = chart.type + " chart, with " 
                        + dataset.statistics.count + " data points. "
                        + "The highest value is " + this.getStat(dataset, "high")
                        + ", and the lowest value is " + this.getStat(dataset, "low")
                        + ", with a range of " + this.getStat(dataset, "range") +". "
                        + "The average is " + this.getStat(dataset, "mean")
                        + ", the median is " + this.getStat(dataset, "median")
                        + ", and the total is " + this.getStat(dataset, "sum") +". ";

          this.speeches.push( stats_msg );                
        } else if ( "low-high" == this.menu.selected.id 
                 || "high-low" == this.menu.selected.id ){
          // list datapoints lowest to highest, or highest to lowest
          // create a copy of the dataset, so we don't mess with the original ordering
          var datasort = dataset.datapoints.slice();
        
          if ( "low-high" == this.menu.selected.id ){
            datasort.sort( function (a, b) {
              return a.value - b.value;
            }); 
            this.speeches.push( "Lowest to highest: " );
          } else if ( "high-low" == this.menu.selected.id ){
            datasort.sort( function (a, b) {
              return b.value - a.value;
            }); 
            this.speeches.push( "Highest to lowest: " );
          }
          
          for (var dp = 0, dp_len = datasort.length; dp_len > dp; ++dp) {
            var datapoint = datasort[dp];
            this.speeches.push( datapoint.label );
          }
        } else if ( "sonification" == this.menu.selected.id ){
          // cancel speech  
          this.speeches.length = 0;

          this.interaction_mode = "sonifier";

          this.sonify();
          this.sonifier.togglePlay();
        }
      }
    }

    this.menu.reset();
    this.menu.add( "stats", "chart statistics", null, null, false );
    this.menu.add( "low-high", "datapoints from lowest to highest", null, null, false );
    this.menu.add( "high-low", "datapoints from highest to lowest", null, null, false );
    this.menu.add( "sonification", "trend sonification", null, null, false );

    if ( this.taskAssessments.length ) {
      this.menu.add( "task-assessment", "start the test", null, "assessment", true );
    }

    // console.log(this.menu);
  }
}


describlerObj.prototype.handle_datapoint = function (){
  // console.log("handle_datapoint");
  // this.speeches.push( "datapoint" );   

  for (var c = 0, c_len = this.charts.length; c_len > c; ++c) {
    var chart = this.charts[c];
    // if ( this.activeElement == chart.element){
    for (var d = 0, d_len = chart.datasets.length; d_len > d; ++d) {
      var dataset = chart.datasets[d];
      console.log(dataset);

      var datapoint = dataset.datapoints.find( match_element, this.activeElement );
      if (datapoint) {
        var dp_index = dataset.datapoints.findIndex( match_element, this.activeElement );
        this.activeObject = datapoint;

        // console.log("datapoint:");
        // console.log(datapoint);
        // console.log("index: " + dp_index);

        // console.log( datapoint );
        if ( !this.menu.selected ){
          this.speeches.push( "Data point " + (dp_index + 1) + " of " + dataset.statistics.count );
        }

        this.speeches.push( datapoint.label );

        var default_menu = true;

        if ( this.menu.selected ){
          var value = datapoint.value;
          // if ( 1 == option ){
          if ( "details" == this.menu.selected.id ){

            // describe change of value from previous datapoint
            if ( this.previous_datapoint ) {
              var prev_datapoint = dataset.datapoints.find( match_element, this.previous_datapoint );
              var lastValue = prev_datapoint.value;
              var lastField = prev_datapoint.label_text;

              var delta = "";
              if ( value > lastValue){
                delta += "This is an increase of " + (value - lastValue);
              } else if ( value < lastValue) {
                delta += "This is a decrease of " + (lastValue - value);
              } else {
                delta += "There is no change";
              }
              delta += " from the last value of " + lastValue + " for " + lastField;
              this.speeches.push( delta );
            }
            
        
            // describe statistical status of value
            if ( dataset.statistics["low"] == value){
              this.speeches.push( "This is the lowest value." );
            } 

            if ( dataset.statistics["high"] == value){
              this.speeches.push( "This is the highest value." );
            }

            if ( dataset.statistics["median"] == value){
              this.speeches.push( "This is the median value." );
            }

            if ( dataset.statistics["mean"] == value){
              this.speeches.push( "This is the average value." );
            }

            // indicate datapoint index
            var index_message = "This is the ";
            index_message += this.getOrdinalNumber( dp_index + 1 );
            if ( dataset.statistics.count == dp_index + 1 ) {
              index_message += " and final ";
            }
            index_message += " data point.";
            this.speeches.push( index_message );  
            // this.speeches.push( "This is the " + this.getOrdinalNumber( dp_index + 1 ) + " data point." ); 

            // describe colors
            var fills = [];
            var strokes = [];

            for (var c = 0, c_len = datapoint.colors.length; c_len > c; ++c) {
              var eachColor = datapoint.colors[ c ]; 

              if ( eachColor.fill_name && !fills.includes(eachColor.fill_name) ) {
                fills.push( eachColor.fill_name );
              }

              if ( eachColor.stroke_name && !strokes.includes(eachColor.stroke_name) ) {
                strokes.push( eachColor.stroke_name );
              }
            }  
            
            var color_message = "";
            var fill_message = this.arrayToSentence(fills, "color", "colors" );
            var stroke_message = this.arrayToSentence(strokes, "outline", "outlines" );

            if ( fill_message && stroke_message ) {
              color_message += fill_message + ", and " + stroke_message.replace("The", "the") + ".";
            } else {
              color_message += fill_message + stroke_message + ".";
            }

            this.speeches.push( color_message );  
                        
          } else if ( "compare" == this.menu.selected.id ) {
            var firstItem = true;
            for (var odp = 0, odp_len = dataset.datapoints.length; odp_len > odp; ++odp) {
              var otherDatapoint = dataset.datapoints[odp];
              if ( datapoint.element != otherDatapoint.element){
                var otherValue = otherDatapoint.value;
                var delta = "";
                if (firstItem) {
                  firstItem = false;
                  delta = "This is ";
                } else if ( odp_len - 1 == odp 
                          || ( odp_len - 1 == dp_index && odp_len - 2 == odp )){
                  delta = " and ";
                }

                // delta += (value/otherValue).toFixed(2);
                // delta += this.getFraction(value/otherValue) + " the value of ";
                delta += ((value/otherValue) * 100).toFixed() + "%" + " the value of ";
                
                if ( otherDatapoint.label_text){
                  delta +=  otherDatapoint.label_text;
                } else {
                  delta +=  otherDatapoint.label;
                }
                
                this.speeches.push( delta );
              }
            }
          } else if ( "compare-single" == this.menu.selected.id 
                  ||  "compare-single" == this.menu.selected.context ) {
            if ( "compare-single" == this.menu.selected.id ) {
              this.speeches.push( "Select datapoint for comparison:" );

              default_menu = false;
              this.menu.reset();
              for (var odp = 0, odp_len = dataset.datapoints.length; odp_len > odp; ++odp) {
                var otherDatapoint = dataset.datapoints[odp];
                if ( datapoint.element != otherDatapoint.element){
                  var other_label = otherDatapoint.label_text;
                  this.menu.add( other_label, other_label, "compare-single", null, false  );
                }
              }
            } else if ( "compare-single" == this.menu.selected.context) {
              var otherDatapoint = dataset.datapoints.find( function (datapoint) {
                return datapoint.label_text == this;
              }, this.menu.selected.id );

              if ( otherDatapoint ){
                // var value = datapoint.value;
                var otherValue = otherDatapoint.value;
                var delta_msg = "Comparison to " + otherDatapoint.label_text + ": ";

                var mean_delta = value - otherValue;
                var mean_delta_comp = " above";
                if ( 0 > mean_delta ) {
                  mean_delta_comp = " below";
                }
                delta_msg += "This is " + Number(Math.abs(mean_delta).toFixed(2)) + mean_delta_comp 
                          + " the value of " + otherValue + " for "
                          + otherDatapoint.label_text;
                delta_msg += ", which is ";
                // delta_msg += this.getFraction(value/otherValue);
                delta_msg += ((value/otherValue) * 100).toFixed() + "%";
                delta_msg += " the amount.";

                this.speeches.push( delta_msg );
              }
            }
          } else if ( "stats" == this.menu.selected.id ) {
            var stats_msg = "";
            if ( dataset.statistics["mean"] == value){
              stats_msg += "This is the mean value, ";
            } else {
              // describe statistical status of value
              var mean_delta = value - dataset.statistics["mean"];
              var mean_delta_comp = " above";
              if ( 0 > mean_delta ) {
                mean_delta_comp = " below";
              }
              stats_msg += "This is " + (Math.abs(mean_delta).toFixed(2)) + mean_delta_comp 
                        + " the mean value of " + this.getStat(dataset, "mean") + ", ";
            }

            if ( dataset.statistics["median"] == value){
              stats_msg += "and this is the median value. ";
            } else {
              // describe statistical status of value
              var median_delta = (value - dataset.statistics["median"]);
              var median_delta_comp = " above";
              if ( 0 > median_delta ) {
                median_delta_comp = " below";
              }
              stats_msg += "and " + (Math.abs(median_delta).toFixed(2)) + median_delta_comp 
                        + " the median value of " + this.getStat(dataset, "median") + ". ";
            }

            if ( dataset.statistics["low"] == value){
              stats_msg += "This is the lowest value, ";
            } else {
              var low_delta = (value - dataset.statistics["low"]).toFixed(2);
              stats_msg += "This is " + low_delta 
                        + " above the low value of " + this.getStat(dataset, "low") + ", ";
            }

            if ( dataset.statistics["high"] == value){
              stats_msg += " and is the highest value. ";
            } else {
              var high_delta = (dataset.statistics["high"] - value).toFixed(2);
              stats_msg += " and " + high_delta 
                        + " below the high value of " + this.getStat(dataset, "high") + ". ";
            }

            stats_msg += datapoint.label_text + " is "
                      // + this.getFraction(value/dataset.statistics["sum"])
                      + ((value/dataset.statistics["sum"]) * 100).toFixed(2) + "%"
                      + " of the total value of " + this.getStat(dataset, "sum") + ". ";

            this.speeches.push( stats_msg );  

          }
        }

        if ( default_menu ) {
          this.menu.reset();
          this.menu.add( "details", "more details", null, null, false );
          this.menu.add( "compare", "comparison to all other data points", null, null, false );        
          this.menu.add( "compare-single", "comparison to a specific data point", null, null, false );        
          this.menu.add( "stats", "datapoint statistics", null, null, false );
        }
      }
    }
  }
}


describlerObj.prototype.handle_datagroup = function (){
  console.log("handle_datagroup");
  this.speeches.push( "datagroup" );     
}

describlerObj.prototype.handle_axis = function (){
  // console.log("handle_axis");
  // this.speeches.push( "axis" );     

  for (var c = 0, c_len = this.charts.length; c_len > c; ++c) {
    var chart = this.charts[c];
      for (var a in chart.axes) {
        // console.log(key, chart[axis]);
        var axis = chart.axes[a];
        if ( this.activeElement == axis.element){
          this.activeObject = axis;

          if ( axis.label){
            this.speeches.push( axis.type + " axis: " + axis.label );
          }
    
          if ( !isNaN(axis.min) && !isNaN(axis.max)){
            this.speeches.push( ", " + axis.items.length + " items, ranging from " 
                                + axis.min + " to " + axis.max );
          } else {
            this.speeches.push( ", " + axis.items.length + " items, ranging from " 
                               + axis.items[0].label + " to " 
                               + axis.items[axis.items.length - 1].label );
            // if ( 1 == option ){
            //  this.speeches.push( ", with the following labels: " );
            //  for (var l = 0, l_len = axis.labels.length; l_len > l; ++l) {
            //    this.speeches.push( axis.labels[l] );
            //  }
            // } else {
            //  this.speeches.push( ", " + axis.labels.length + " items, ranging from " 
            //                      + axis.labels[0] + " to " 
            //                      + axis.labels[axis.labels.length - 1] );
            // }
          }

          var default_menu = true;
          
          if ( this.menu.selected ){
            if ( "labels" == this.menu.selected.id ){
              this.speeches.push( ", with the following labels: " );
              for (var l = 0, l_len = axis.items.length; l_len > l; ++l) {
                this.speeches.push( axis.items[l].label );
              }
            } else if ( "select" == this.menu.selected.id
                  ||  "select" == this.menu.selected.context ) {
              // TODO: let user select axis label by menu or typing name 
              // TODO: account for nested/group axis labels
              if ( "select" == this.menu.selected.id ){
                this.speeches.push( "Select axis label:" );

                default_menu = false;
                this.menu.reset();
                for (var l = 0, l_len = axis.items.length; l_len > l; ++l) {
                  this.menu.add( axis.items[l].label, axis.items[l].label, "select", null, false );
                }
              } else if ( "select" == this.menu.selected.context ) {
                var axisitem = axis.items.find( function (axis) {
                  return axis.label == this;
                }, this.menu.selected.id );
                console.log(axisitem);

                default_menu = false;
                this.menu.reset();

                if (axisitem) {
                  var refs_length = axisitem.refs.length
                  var axisitem_msg = axisitem.label + " has " 
                    + axisitem.refs.length + " datapoint";

                  if ( 1 != refs_length){
                    axisitem_msg += "s"; // make it plural
                  }
                    
                  this.speeches.push( axisitem_msg );
                  this.speak();


                      // temporary hack
                      // TODO: let user select datapoint explicitly, in case there are multiples
                      var datapoint = axisitem.refs[0].element;
                      this.setActiveElement( datapoint );

                } else {
                  console.log("error");
                } 
              }
            }
          }

          if ( default_menu ) {
            this.menu.reset();
            this.menu.add( "labels", "axis labels", null, null, false );

            // only show "select" option if one of the axis labels has datapoints
            var select_possible = false;
            for (var l = 0, l_len = axis.items.length; l_len > l; ++l) {
              if (axis.items[l].refs.length) {
                select_possible = true;
                break;
              }
            }

            if ( select_possible ) {
              this.menu.add( "select", "select datapoints by axis label", null, null, true );
            }
          }

          // no need to iterate further
          continue;
          c = c_len;
        }

    }
  }
}


describlerObj.prototype.handle_axisitem = function (){
  console.log("handle_axisitem");
  this.speeches.push( "axisitem" );     


          // } else if ( "compare-single" == this.menu.selected.id 
          //         ||  "compare-single" == this.menu.selected.type ) {
          //   if ( "compare-single" == this.menu.selected.id ) {
          //     this.speeches.push( "Select datapoint for comparison:" );

          //     default_menu = false;
          //     this.menu.reset();
          //     for (var odp = 0, odp_len = dataset.datapoints.length; odp_len > odp; ++odp) {
          //       var otherDatapoint = dataset.datapoints[odp];
          //       if ( datapoint.element != otherDatapoint.element){
          //         var other_label = otherDatapoint.label_text;
          //         this.menu.add( other_label, other_label, "compare-single" );
          //       }
          //     }
          //   } else {
          //     var otherDatapoint = dataset.datapoints.find( function (datapoint) {
          //       return datapoint.label_text == this;
          //     }, this.menu.selected.id );

          //     if ( otherDatapoint ){
          //       // var value = datapoint.value;
          //       var otherValue = otherDatapoint.value;
          //       var delta_msg = "Comparison to " + otherDatapoint.label_text + ": ";

          //       var mean_delta = value - otherValue;
          //       var mean_delta_comp = " above";
          //       if ( 0 > mean_delta ) {
          //         mean_delta_comp = " below";
          //       }
          //       delta_msg += "This is " + Math.abs(mean_delta) + mean_delta_comp 
          //                 + " the value of " + otherValue + " for "
          //                 + otherDatapoint.label_text;
          //       delta_msg += ", which is ";
          //       // delta_msg += this.getFraction(value/otherValue);
          //       delta_msg += ((value/otherValue) * 100).toFixed() + "%";
          //       delta_msg += " the amount.";

          //       this.speeches.push( delta_msg );
          //     }
          //   }
          // }

}


describlerObj.prototype.handle_legend = function (){
  // console.log("handle_legend");
  // this.speeches.push( "legend" );     

    for (var c = 0, c_len = this.charts.length; c_len > c; ++c) {
      var chart = this.charts[c];
      for (var l = 0, l_len = chart.legends.length; l_len > l; ++l) {
        var eachLegend = chart.legends[ l ]; 
        if ( this.activeElement == eachLegend.element){
          this.activeObject = eachLegend;

          var legendItemsCount = eachLegend.items.length + " legend item";
          if ( 1 != eachLegend.items.length){
            legendItemsCount += "s"; // make it plural
          }
          
          this.speeches.push( "Legend: " + eachLegend.label + " with " + legendItemsCount );  
          // if ( !1 == option ){
          //  this.speeches.push( "Legend item " + (li + 1) + " of " + li_len );
          // }
          
          // no need to iterate further
          continue;
          l = l_len;
          c = c_len;
        }
      }
    }

}


describlerObj.prototype.handle_legenditem = function (){
  // console.log("handle_legenditem");
  // this.speeches.push( "legenditem" );

  for (var c = 0, c_len = this.charts.length; c_len > c; ++c) {
    var chart = this.charts[c];
    for (var l = 0, l_len = chart.legends.length; l_len > l; ++l) {
      var eachLegend = chart.legends[ l ]; 

      var legenditem = eachLegend.items.find( match_element, this.activeElement );
      if (legenditem) {
        var legenditem_index = eachLegend.items.findIndex( match_element, this.activeElement );
        this.activeObject = legenditem;

        if ( !this.menu.selected ){
          this.speeches.push( "Legend item " + (legenditem_index + 1) + " of " + eachLegend.items.length );
        }
        
        this.speeches.push( legenditem.label );

        if ( this.menu.selected ) {
          if ( "datapoints" == this.menu.selected.id ){
            var total = 0;
            var refs_length = legenditem.refs.length;
            
            var refsCount = refs_length + " datapoint";
            if ( 1 != refs_length){
              refsCount += "s"; // make it plural
            }
            
            this.speeches.push( "This legend item applies to " + refsCount);  

            for (var r = 0; refs_length > r; ++r) {
              var eachRef = legenditem.refs[ r ];
              this.speeches.push( eachRef.label );  
              // TODO: make sure the value is numeric
              total += eachRef.value;
            }
            
            this.speeches.push( "The total of all items is " + total ); 
          }
        }
      
        this.menu.reset();
        this.menu.add( "datapoints", "a list of all applicable data points", null, null, false );

        // no need to iterate further
        continue;
        l = l_len;
        c = c_len;
      }
    }
  }
}


describlerObj.prototype.handle_flowchart = function (){
  console.log("handle_flowchart");

  var flowchart = this.charts.find( match_element, this.activeElement );

  var msg = "Flowchart";
  if (flowchart.label) {
    msg += ', labeled "' + flowchart.label + '"';
  }
  this.speeches.push( msg );

  var default_menu = true;
  if ( !this.menu.selected ){
    var node_message = this.objectToSentence( flowchart.node_types, "node", "nodes" );
    var connector_message = this.objectToSentence( flowchart.connector_types, "connector", "connectors" );

    // TODO: get rid of "undefined" in descriptions of nodes and connectors
    // TODO: make example with different 'type's of connectors
    
    // TODO: say how many starting and ending nodes

    // TODO: figure out how to represent connector labels that differ based on direction…
    ////     for example, "south" from one node is "north" from the end node
    ////     justification or rationale or motivation to move from one node to another differs
    ////     maybe all connectors are really one-way, just some have connector back

    // TODO: make voice-driven interface

    // flowchart.nodes.length
    var types_msg = node_message.replace(/There are|There is/, ", with") 
                  + connector_message.replace(/There are|There is/, ", connected by") + ".";

    this.speeches.push( types_msg );
  } else {
    if ( "desc" == this.menu.selected.id ){
      // TODO: describe number of starting and terminal nodes, directed connectors, etc.

      var node_message = this.objectToSentence( flowchart.node_types, "node", "nodes" );
      var connector_message = this.objectToSentence( flowchart.connector_types, "connector", "connectors" );

      // flowchart.nodes.length
      var types_msg = node_message.replace(/There are|There is/, ", with") 
                    + connector_message.replace(/There are|There is/, ", connected by") + ".";

      this.speeches.push( types_msg );
    } else if ( "initial" == this.menu.selected.id
      ||  "initial" == this.menu.selected.context ) {

      default_menu = false;

      // TODO: track how many connectors for each node in flowchart, if only one, jump to it instead of listing options
      if ( "initial" == this.menu.selected.id ){
        this.speeches.push( "Select initial node: " );

        this.menu.reset();
        for (var n = 0, n_len = flowchart.nodes.length; n_len > n; ++n) {
          var node = flowchart.nodes[n];
          if ( node.is_initial ) {
            this.menu.add( node.id, "Starting " + node.type + " node: " + node.label, "jump", null, false );
          }
        }
      } else if ( "initial" == this.menu.selected.context ) {
        var node_el = document.getElementById( this.menu.selected.id );
        if (node_el) {
          this.setActiveElement( node_el );
        }
      }
    } else if ( "jump" == this.menu.selected.id
      ||  "jump" == this.menu.selected.context ) {

      default_menu = false;

      if ( "jump" == this.menu.selected.id ){
        this.speeches.push( "Select node: " );

        this.menu.reset();
        for (var n = 0, n_len = flowchart.nodes.length; n_len > n; ++n) {
          var node = flowchart.nodes[n];

          var type_msg = "";
          if ( node.is_initial ) {
            type_msg += "Starting ";
          } else if ( node.is_terminal ) {
            type_msg += "Ending ";
          }

          this.menu.add( node.id, type_msg + " " + node.type + " node: " + node.label, "jump", null, false );
        }
      } else if ( "jump" == this.menu.selected.context ) {
        var node_el = document.getElementById( this.menu.selected.id );
        if (node_el) {
          this.setActiveElement( node_el );
        }
      }
    }
  }


  if (default_menu) {
    this.menu.reset();
    this.menu.add( "desc", "description of flowchart", null, null, false );
    if ( flowchart.initial_node_count ) {
      if ( 1 == flowchart.initial_node_count ) {
        // if only one initial node, give options to jump to it instead of listing options
        for (var n = 0, n_len = flowchart.nodes.length; n_len > n; ++n) {
          var node = flowchart.nodes[n];
          if ( node.is_initial ) {
            var initial_msg = "go to the starting " + node.type + " node " + '"' + node.label + '"';
            // this.menu.add( "initial", initial_msg, null, null, false );
            this.menu.add( node.id, initial_msg, "jump", null, false );
            break;
          }
        }
      } else {
        this.menu.add( "initial", "go to a starting node", null, null, true );    
      }
    }
    this.menu.add( "jump", "jump to a specific node", null, null, true );
  }


}


describlerObj.prototype.handle_node = function (){
  // console.log("handle_node");
  // this.speeches.push( "node" );  

  for (var f = 0, f_len = this.charts.length; f_len > f; ++f) {
    var flowchart = this.charts[f];

    var node = flowchart.nodes.find( match_element, this.activeElement );
    if (node) {
      var node_index = flowchart.nodes.findIndex( match_element, this.activeElement );

      this.speeches.push( '"' +  node.label + '"' );

      if ( !this.menu.selected ){
        node.visit_count++;

        var type_msg = "";
        if ( node.is_initial ) {
          type_msg += "Starting ";
        } else if ( node.is_terminal ) {
          type_msg += "Ending ";
        }
        
        var connector_msg = "";
        var bidi_length = node.connectors["bidi"].length;
        var from_length = node.connectors["from"].length;
        var to_length = node.connectors["to"].length;

        if ( bidi_length ){
          connector_msg += bidi_length + " two-way connector";
          if ( 1 != bidi_length ){
            connector_msg += "s"; // make it plural
          }
        }
 
        if ( from_length ) {
          if ( bidi_length && to_length ){
            connector_msg += ", "
          } else if ( bidi_length ) {
            connector_msg += " and "
          }
          
          connector_msg += from_length + " outgoing connector";
          if ( 1 != from_length ){
            connector_msg += "s"; // make it plural
          }
        }
 
        if ( to_length ) {
          if ( bidi_length && from_length ){
            connector_msg += ", and "
          } else if ( bidi_length || from_length ) {
            connector_msg += " and "
          }
          
          connector_msg += to_length + " incoming connector";
          if ( 1 != to_length ){
            connector_msg += "s"; // make it plural
          }
        }

        this.speeches.push( type_msg + node.type + " node, with " + connector_msg );

        if ( 1 < node.visit_count ) {
          // var visit_msg = node.visit_count
          // if ( 1 != node.visit_count ){
          //   from_msg += "s"; // make it plural
          // }

          var visit_msg = this.getOrdinalNumber( node.visit_count );
          this.speeches.push( "This is the " + visit_msg + " time you have visited this node." );      
        }

        var all_followed = true;
        for (var c = 0, c_len = flowchart.connectors.length; c_len > c; ++c) {
          var each_connector = flowchart.connectors[c];
          if ( 0 == each_connector.follow_count ) {
            all_followed = false;
            break;
          }
        }

        if (all_followed) {
          this.speeches.push( "You have followed all of the connectors" );
        }

        var all_visited = true;
        for (var n = 0, n_len = flowchart.nodes.length; n_len > n; ++n) {
          var each_node = flowchart.nodes[n];
          if ( 0 == each_node.visit_count ) {
            all_visited = false;
            break;
          }
        }

        if (all_visited) {
          var visited_msg = "You have ";
          if (all_followed) {
            visited_msg = " and";
          }
          this.speeches.push( visited_msg + " visited all of the nodes" );
        }
      }

      // TODO: let user jump immediately to selecting outgoing node if it's the only choice?


      var default_menu = true;
      if ( this.menu.selected ){
        if ( "connector-bidi" == this.menu.selected.id
          ||  "connector-bidi" == this.menu.selected.context ) {
          
          default_menu = false;

          if ( "connector-bidi" == this.menu.selected.id ){
            // this.speeches.push( "Select outgoing connector: " );

            this.menu.reset();
            for (var c = 0, c_len = node.connectors["bidi"].length; c_len > c; ++c) {
              var connector_id = node.connectors["bidi"][c];
              var connector = flowchart.connectors.find( match_id, connector_id );
              var option_label = connector.make_option_label( flowchart, node, "bidi" );
              // this.menu.add( connector.element.id, option_label, "connector-out", null, false );
              this.menu.add( connector.id, option_label, "connector-bidi", null, false );
            }
            this.menu.add( "_default_menu", "other options", null, null, false );
          } else if ( "connector-bidi" == this.menu.selected.context ) {
            console.log(this.menu.selected.id);

            // this.menu.reset();
            var connector_el = document.getElementById( this.menu.selected.id );

            var connector = flowchart.connectors.find( match_element, connector_el );
            if (connector) {
              connector.follow_count++;
              // var connector_index = flowchart.connectors.findIndex( match_element, connector_el );
              var target_el = connector.to_el;
              if ( node.element == connector.to_el ) {
                target_el = connector.from_el;
              }
              this.setActiveElement( target_el ); // TODO: no, figure out which direction
            }
          }
        } else if ( "connector-out" == this.menu.selected.id
          ||  "connector-out" == this.menu.selected.context ) {
          
          default_menu = false;

          if ( "connector-out" == this.menu.selected.id ){
            // this.speeches.push( "Select outgoing connector: " );

            this.menu.reset();
            for (var c = 0, c_len = node.connectors["from"].length; c_len > c; ++c) {
              var connector_id = node.connectors["from"][c];
              var connector = flowchart.connectors.find( match_id, connector_id );
              var option_label = connector.make_option_label( flowchart, node, "to" );
              // this.menu.add( connector.element.id, option_label, "connector-out", null, false );
              this.menu.add( connector.id, option_label, "connector-out", null, false );
            }
            this.menu.add( "_default_menu", "other options", null, null, false );
          } else if ( "connector-out" == this.menu.selected.context ) {
            console.log(this.menu.selected.id);

            // this.menu.reset();
            var connector_el = document.getElementById( this.menu.selected.id );

            var connector = flowchart.connectors.find( match_element, connector_el );
            if (connector) {
              connector.follow_count++;
              // var connector_index = flowchart.connectors.findIndex( match_element, connector_el );
              this.setActiveElement( connector.to_el );
            }
          }
        } else if ( "connector-in" == this.menu.selected.id
          ||  "connector-in" == this.menu.selected.context ) {

          default_menu = false;

          if ( "connector-in" == this.menu.selected.id ){
            this.speeches.push( "Select incoming connector: " );
            this.menu.reset();
            for (var c = 0, c_len = node.connectors["to"].length; c_len > c; ++c) {
              var connector_id = node.connectors["to"][c];
              var connector = flowchart.connectors.find( match_id, connector_id );

              // this.menu.add( connector.element.id, option_label, "connector-in", null, false );
             var option_label = connector.make_option_label( flowchart, node, "from" );
             this.menu.add( connector.id, option_label, "connector-in", null, false );
            }
            this.menu.add( "_default_menu", "other options", null, null, false );
          } else if ( "connector-in" == this.menu.selected.context ) {
            console.log(this.menu.selected.id);

            var connector_el = document.getElementById( this.menu.selected.id );

            var connector = flowchart.connectors.find( match_element, connector_el );
            if (connector) {
              // TODO: decide if following a directed link backward is "following"
              connector.follow_count++;

              // var connector_index = flowchart.connectors.findIndex( match_element, connector_el );
              this.setActiveElement( connector.from_el );
            }
          }
        } else if ( "desc" == this.menu.selected.id ){
          var from_length = node.connectors["from"].length;
          var from_msg = from_length + " outgoing connector";
          if ( 1 != from_length ){
            from_msg += "s"; // make it plural
          }
          
          var to_length = node.connectors["to"].length;
          var to_msg = to_length + " incoming connector";
          if ( 1 != to_length ){
            to_msg += "s"; // make it plural
          }

          var type_msg = "";
          if ( node.is_initial ) {
            type_msg += "Starting ";
          } else if ( node.is_terminal ) {
            type_msg += "Ending ";
          }
                    
          this.speeches.push( type_msg + node.type + " node, with " + from_msg + ", and " +  to_msg );

          var visit_msg = this.getOrdinalNumber( node.visit_count );
          this.speeches.push( "This is the " + visit_msg + " time you have visited this node." );      

          this.speeches.push( "Node " + (node_index + 1) + " of " + flowchart.nodes.length + "." );
        } else if ( "return" == this.menu.selected.id ){
          if ( this.previous_node ) {
            default_menu = false;

            // TODO: keep full navigation path, give option to step back
            this.setActiveElement( this.previous_node );
          }           
        } else if ( "jump" == this.menu.selected.id
          ||  "jump" == this.menu.selected.context ) {

          default_menu = false;

          if ( "jump" == this.menu.selected.id ){
            this.speeches.push( "Select node: " );

            this.menu.reset();
            for (var n = 0, n_len = flowchart.nodes.length; n_len > n; ++n) {
              var node = flowchart.nodes[n];

              var type_msg = "";
              if ( node.is_initial ) {
                type_msg += "Starting ";
              } else if ( node.is_terminal ) {
                type_msg += "Ending ";
              }

              this.menu.add( node.id, type_msg + " " + node.type + " node: " + node.label, "jump", null, false );
            }
          } else if ( "jump" == this.menu.selected.context ) {
            if ( this.menu.selected.type ) {
              var connector = flowchart.connectors.find( match_id, this.menu.selected.type );
              connector.follow_count++;
            }

            var node_el = document.getElementById( this.menu.selected.id );
            if (node_el) {
              this.setActiveElement( node_el );
            }
          }
        }
      }

      // TODO: provide way to jump back to last decision point i.e. last time there was more than one connector
      // TODO: give option to repeat choices?
      // TODO: deal with info overload… add break between info and options?

      if (default_menu) {
        // TODO: add option for more details on each connector, such as
        //      desc (if any) and label of end node
        this.menu.reset();

        if ( node.connectors["bidi"].length ) {
          if ( 1 == node.connectors["bidi"].length ) {
            // if only one connector, give option to jump to it instead of listing options
            var connector_id = node.connectors["bidi"][0];
            var connector = flowchart.connectors.find( match_id, connector_id );
            var option_label = "follow the two-way connector ";
            option_label += connector.make_option_label( flowchart, node, "bidi" );
            // option_label.replace("the connector a two-way connector", "the two-way connector");
            this.menu.add( connector.to_el.id, option_label, "jump", connector.id, true );

          } else {
            this.menu.add( "connector-bidi", "follow a two-way connector", null, null, true );
          }
        }

        if ( node.connectors["from"].length ) {
          if ( 1 == node.connectors["from"].length ) {
            // if only one connector, give option to jump to it instead of listing options
            var connector_id = node.connectors["from"][0];
            var connector = flowchart.connectors.find( match_id, connector_id );
            var option_label = "follow the outgoing connector ";
            option_label += connector.make_option_label( flowchart, node, "to" );
            option_label.replace("the connector a two-way connector", "the two-way connector");
            this.menu.add( connector.to_el.id, option_label, "jump", connector.id, true );

          } else {
            this.menu.add( "connector-out", "follow an outgoing connector", null, null, true );
          }
        }

        if ( node.connectors["to"].length ) {
          if ( 1 == node.connectors["to"].length ) {
            // if only one connector, give option to jump to it instead of listing options
            var connector_id = node.connectors["to"][0];
            var connector = flowchart.connectors.find( match_id, connector_id );
            var option_label = "follow the incoming connector ";
            option_label += connector.make_option_label( flowchart, node, "from" );
            option_label.replace("the connector a two-way connector", "the two-way connector");
            this.menu.add( connector.from_el.id, option_label, "jump", connector.id, true );

          } else {
            this.menu.add( "connector-in", "follow an incoming connector", null, null, true );
          }
        }

        this.menu.add( "desc", "description of node", null, null, false );
        if ( this.previous_node ) {
          this.menu.add( "return", "return to the last node", null, null, true );
        }    
        this.menu.add( "jump", "jump to a specific node", null, null, true );
      }
    }
  }
}


describlerObj.prototype.handle_connector = function (){
  console.log("handle_connector");

  for (var f = 0, f_len = this.charts.length; f_len > f; ++f) {
    var flowchart = this.charts[f];

    var connector = flowchart.connectors.find( match_element, this.activeElement );
    if (connector) {
      var connector_index = flowchart.connectors.findIndex( match_element, this.activeElement );
  
      var from_node = flowchart.nodes.find( match_element, connector.from_el );
      var to_node = flowchart.nodes.find( match_element, connector.to_el );

      // TODO: consider moving most/all descriptions to the objects themselves
      ////     – would need to know their parents and describler object for references
      this.speeches.push( connector.get_info( flowchart ) ); 

      // count how many time connector has been followed (like with nodes visited)
      // this.speeches.push( connector.get_visit_count( flowchart ) ); 
      if ( 0 != connector.follow_count ) {
          var follow_msg = this.getOrdinalNumber( connector.follow_count );
          this.speeches.push( "This is the " + follow_msg + " time you have followed this connector." );      
      }     


      var default_menu = true;
      if ( this.menu.selected ){
        if ( "desc" == this.menu.selected.id ){
          // var from_length = node.connectors["from"].length;
          // var from_msg = from_length + " outgoing connector";
          // if ( 1 != from_length ){
          //   from_msg += "s"; // make it plural
          // }
          
          // var to_length = node.connectors["to"].length;
          // var to_msg = to_length + " incoming connector";
          // if ( 1 != to_length ){
          //   to_msg += "s"; // make it plural
          // }

          // var type_msg = "";
          // if ( node.is_initial ) {
          //   type_msg += "Starting ";
          // } else if ( node.is_terminal ) {
          //   type_msg += "Ending ";
          // }
                    
          // this.speeches.push( type_msg + node.type + " node, with " + from_msg + ", and " +  to_msg );

          // var visit_msg = this.getOrdinalNumber( node.visit_count );
          // this.speeches.push( "This is the " + visit_msg + " time you have visited this node." );      

          // this.speeches.push( "Node " + (node_index + 1) + " of " + flowchart.nodes.length + "." );
        } else if ( "from_node" == this.menu.selected.id ){
          connector.follow_count++;
          default_menu = false;
          this.setActiveElement( connector.from_el );
        } else if ( "to_node" == this.menu.selected.id ){
          connector.follow_count++;
          default_menu = false;
          this.setActiveElement( connector.to_el );
        } else if ( "return" == this.menu.selected.id ){
          if ( this.previous_node ) {
            default_menu = false;

            // TODO: keep full navigation path, give option to step back
            this.setActiveElement( this.previous_node );
          }           
        } else if ( "jump" == this.menu.selected.id
          ||  "jump" == this.menu.selected.context ) {

          default_menu = false;

          if ( "jump" == this.menu.selected.id ){
            this.speeches.push( "Select node: " );

            this.menu.reset();
            for (var n = 0, n_len = flowchart.nodes.length; n_len > n; ++n) {
              var node = flowchart.nodes[n];

              var type_msg = "";
              if ( node.is_initial ) {
                type_msg += "Starting ";
              } else if ( node.is_terminal ) {
                type_msg += "Ending ";
              }

              this.menu.add( node.id, type_msg + " " + node.type + " node: " + node.label, "jump", null, false );
            }
          } else if ( "jump" == this.menu.selected.context ) {
            var node_el = document.getElementById( this.menu.selected.id );
            if (node_el) {
              this.setActiveElement( node_el );
            }
          }
        }
      }

      // TODO: provide option to follow connector to either end
      if (default_menu) {
        this.menu.reset();
        this.menu.add( "desc", "description of connector", null, null, false );

        var from_msg = "navigate to the first node";
        var to_msg = "navigate to the second node";
        if ( connector.is_directed ) {
          from_msg = "navigate to the starting node";
          to_msg = "navigate to the ending node";
        }
        this.menu.add( "from_node", from_msg, null, null, true );
        this.menu.add( "to_node", to_msg, null, null, true );

        if ( this.previous_node ) {
          this.menu.add( "return", "return to the last node", null, null, true );
        }    
        this.menu.add( "jump", "jump to a specific node", null, null, true );
      }

    }
  }
}


describlerObj.prototype.handle_default = function (){
  // console.log("handle_default");
  // this.speeches.push( "default" );  

  this.activeObject = null;

  var el = this.activeElement;
  if ( "text" != this.activeElement.localName){
    el = this.activeElement.querySelector("title");
  
    if ( !el ){
      el = this.activeElement.querySelector("text");
    }
  }
  // var dataText = el.textContent;
  
  if ( el ){
    this.speeches.push( el.textContent );     
  }

  if ( this.menu.selected ){
    if ( "details" == this.menu.selected.id ){ 
      var desc = this.activeElement.querySelector("[tabindex] > desc");
      if ( desc ){
        this.speeches.push( desc.textContent );     
      }
    }
  } 

  this.menu.reset();
  var desc = this.activeElement.querySelector("[tabindex] > desc");
  if ( desc ){
    this.menu.add( "details", "more details", null, null, false );
  }
}

describlerObj.prototype.arrayToSentence = function ( arr, singular_noun, plural_noun ) {
  var msg = "";
  if ( 1 == arr.length ) {
    msg += "The " + singular_noun + " is " + arr[0];
  } else if ( 2 <= arr.length ) {
    var arr_clone = arr.slice(0);
    var last_item = arr_clone.pop();
    var oxford_comma = ",";
    if ( 2 == arr.length ) {
      oxford_comma = "";
    }
    msg += "The " + plural_noun + " are " + arr_clone.join(', ') + oxford_comma + " and " + last_item;
  }
  return msg;
}

describlerObj.prototype.objectToSentence = function ( obj, singular_noun, plural_noun ) {
  var msg = "There are ";
  // var verb = " are ";

  // var count = Object.keys(obj).length;
  var obj_array = Object.keys(obj);

  // console.log("obj_array:");
  // console.log(obj_array);

  // sort by number of items, with "null" always listed last no matter how many items
  obj_array = obj_array.sort(function(a, b) {
    return (a=="null") - (b=="null") || obj[b] - obj[a];
  });
  // console.log("obj_array null end:");
  // console.log(obj_array);


    // var type = node.type;
    // if (!type) {
    //   type = "uncategorized";
    // }

  // obj_array[ "uncategorized" ] = obj_array[ "null" ];
  // delete obj_array[ "null" ];

  for (var o = 0, o_len = obj_array.length; o_len > o; ++o) {
    var each_key = obj_array[o];
    var count = obj[ each_key ];

    // rename null 
    if ( "null" == each_key) {
      each_key = "uncategorized";
    }

    var noun = plural_noun;
    if ( 1 == count ) {
      noun = singular_noun;
    }

    if ( 0 == o ) {
      if ( 1 == count ) {
        msg = "There is ";
      }
      msg += count + " " + each_key + " " + noun;
    } else if ( 0 < o ) {
      var oxford_comma = ",";
      if ( 2 == o_len ) {
        oxford_comma = "";
      }

      if ( o_len == (o + 1) ) {
        msg += oxford_comma + " and " + count + " " + each_key + " " + noun;
      } else {
        msg += oxford_comma + " " + count + " " + each_key + " " + noun;
      }
    }
  }
  return msg;
}

describlerObj.prototype.speak = function ( callback, callbackObj ) {
  var msg = this.speeches.join(". \n");
   // check Speech Synthesis support
  if ("speechSynthesis" in window) {
    // cancel previous calls to speech API, 
    //  so UI is faster, more responsive, and less verbose
    if ( speechSynthesis.speaking ){
      speechSynthesis.cancel();
    }
    console.log( "speak: " + msg );

    var voice = new SpeechSynthesisUtterance();
    voice.text = msg;
    voice.lang = "en-US";
    voice.rate = 1.1;
    voice.volume = this.speech_volume;
    speechSynthesis.speak( voice );

    this.app.showText( msg );

    var options_msg = this.menu.list();
    this.app.populateOptions( this.menu.options.slice() );

    if (options_msg) {
      voice.onend = (function (options_msg, volume) {
        var voice = new SpeechSynthesisUtterance();
        voice.text = options_msg;
        voice.lang = "en-US";
        voice.rate = 1.1;
        voice.volume = volume;
        speechSynthesis.speak( voice );
        // console.log( options_msg );
      })( options_msg, this.speech_volume );
    }

    if ( "function" === typeof callback ) {
      voice.onend = (function (callback, callbackObj) {
        callback.apply( callbackObj );
      })( callback, callbackObj );
    }
  }

  // if ( speechSynthesis.speaking){
  //   speechSynthesis.cancel();
  // } else {
  //   // this.voice.text = msg;
  //   // this.voice.lang = "en";
  //   // this.voice.rate = 1.2;
  //   // speechSynthesis.speak( this.voice );
  // 
  //    // for (var s = 0, s_len = this.speeches.length; s_len > s; ++s) {
  //    //  msg = this.speeches[s];
  //    //   // console.log( msg );
  //    //      this.voice.text = msg;
  //    //      speechSynthesis.speak( this.voice );
  //    // }
  // }      
}


describlerObj.prototype.sonify = function () {
  // Create sonfication lines
  var datapoints = document.querySelectorAll("*[role='datapoint']");
  for (var c = 0, c_len = this.charts.length; c_len > c; ++c) {
    var chart = this.charts[c];
    for (var d = 0, d_len = chart.datasets.length; d_len > d; ++d) {
      var dataset = chart.datasets[d];
      var datalinePoints = "";
      for (var dp = 0, dp_len = dataset.datapoints.length; dp_len > dp; ++dp) {
        var datapoint = dataset.datapoints[dp].element;
        var bbox = datapoint.getBBox();
        datalinePoints += (bbox.x + (bbox.width/2)) + "," + bbox.y + " "; 

        // var datapoint_origin = this.root.createSVGPoint();
        // datapoint_origin.x = bbox.x;
        // datapoint_origin.y = bbox.y;
        // datapoint_origin = datapoint_origin.matrixTransform( this.root.getScreenCTM().inverse() );      
        // datalinePoints += (datapoint_origin.x + (bbox.width/2)) + "," + datapoint_origin.y + " "; 
      }

      // TODO: work on this for transforms
      /*
      for (var dp = 0, dp_len = dataset.datapoints.length; dp_len > dp; ++dp) {
        var datapoint = dataset.datapoints[dp].element;
        var bbox = datapoint.getBBox();
        var x = (bbox.x + (bbox.width/2));
        var y = bbox.y;
        // var bbox = datapoint.getBoundingClientRect();
        // var x = (bbox.left + (bbox.width/2));
        // var y = bbox.top;
        // datalinePoints += x + "," + y + " "; 
      }
      */
      
      console.log("datalinePoints:");
      console.log(datalinePoints);

      // draw line plot
      var dataline = document.createElementNS(this.svgns, "polyline");
      //line.setAttribute("id", dataset);
      dataline.setAttribute("id", "dataLine");
      dataline.setAttribute("role", "trend-line");
      dataline.setAttribute("points", datalinePoints);
      dataline.setAttribute("fill", "none");
      // dataline.setAttribute("stroke", "none");
      dataline.setAttribute("stroke", "red");
      this.metaGroup.appendChild( dataline );  

      //      this.x = 0;
      // this.y = 0;
      // this.width = 0;
      // this.height = 0;
      // var xAxisRange = [yearlabels[0], yearlabels[ yearlabels.length - 1]];
      var xAxisRange = [chart.axes["x"].min, chart.axes["x"].max];
      var yAxisRange = [chart.axes["y"].min, chart.axes["y"].max];
      var xAxisPos = chart.x;
      var yAxisPos = chart.y + chart.height;

      this.sonifier.init( this.root, this.metaGroup, dataline, 
                          chart.x, chart.y, 
                          chart.width, chart.height, 
                          xAxisRange, yAxisRange, 
                          xAxisPos, yAxisPos, "red" );
    }
  }      
}


describlerObj.prototype.selectOption = function ( option_id, option_context, option_type ) {
  this.activeElement.focus();

  var selection = this.menu.select( null, option_id );
  if (selection) {
    if ( "assessment" != option_type ) {
      this.getInfo();
      
      if ( this.speeches.length){
        this.speak();   
      }
    } else {
      console.log("assessment");
      this.speeches.length = 0;
      this.speeches.push( "assessment" );

      if ( "answer" == option_context ){
        this.taskAssessments[0].evaluateAnswer( option_id, option_context, option_type );
      } else {
        this.taskAssessments[0].runTest();
      }
    }
  }
}   


describlerObj.prototype.set_voice_volume = function ( volume ) {
  this.speech_volume = volume;
}   


describlerObj.prototype.getStat = function ( dataset, stat ) {
  var value = Number((+dataset.statistics[ stat ]).toFixed(2));
  
  // hack, proof of concept 
  if ( this.taskAssessments[0] && this.taskAssessments[0].tasks[ stat ] ) {
    value = '"a hidden value"';
  }

  return value;
}   



/*
*  Menu Object
*/

function menuObj() {
  this.options = [];
  this.selected = null;

  this.init();
}

menuObj.prototype.init = function (){
  // TODO: add history to options chosen,
  //       use "repeat" in options menu
}

menuObj.prototype.add = function ( id, label, context, type, is_verb ){
  var option = new optionObj( id, label, context, type, is_verb );
  this.options.push(option);
}

menuObj.prototype.list = function (){
  // var options_msg = "Options: " + this.options.join(". \n");
  var options_msg = null;

  if ( this.options.length ) {
    options_msg = "Options: ";

    for (var o = 0, o_len = this.options.length; o_len > o; ++o) {
      var option = this.options[o];
      var preposition = " to ";
      if ( !option.is_verb ) {
        preposition = " for ";
      }
      options_msg += "Press " + (o + 1) + preposition + option.label + ". \n";
    }
  }

  return options_msg;
}

menuObj.prototype.select = function ( number, id ){
  this.selected = null;
  if ( null != number ) {
    this.selected = this.options[ (number - 1) ];
  } else if ( null != id ) {
    this.selected = this.options.find( function (option) {
      return option.id == this;
    }, id );
  }

  if ( this.selected ) {
    return true;
  } else {
    return false;
  }
}

menuObj.prototype.reset = function (){
  this.options = [];
  this.selected = null;
}


function optionObj( id, label, context, type, is_verb ) {
  this.id = id;
  this.label = label;
  this.context = context;
  this.type = type;
  this.is_verb = is_verb; // use "for" for nouns, "to" for verbs
}




/*
*  Task Assessment Object (proof-of-concept)
*/

function taskAssessmentObj( app, doc, chart ) {
  // TODO: create more robust assessment tool
  this.app = app;
  this.doc = doc;
  this.chart = chart;
  this.element = this.doc.querySelector("metadata[role='assessment']");
  this.tasks = [];

  this.scores = [];

  this.current_task = null;

  this.init();
}

taskAssessmentObj.prototype.init = function (){
  this.buildAssessment();
}

taskAssessmentObj.prototype.buildAssessment = function (){
  if (this.element) {
    var task_els = this.element.querySelectorAll("metadata[role='task']");

    for (var t = 0, t_len = task_els.length; t_len > t; ++t) {
      var each_task_el = task_els[t];
      var each_task = each_task_el.getAttribute("data-task");
      var answer = each_task_el.getAttribute("data-answer");
      var choices = each_task_el.getAttribute("data-choices").split(",");
      // total hack, should be targetted at specific dataset
      // var answer = this.chart.datasets[0].statistics[ each_task ];

      this.tasks[ each_task ] = new taskObj( each_task, answer, choices );
    }
  }
}  

taskAssessmentObj.prototype.runTest = function (){
  console.log("runTest");

  this.app.menu.reset();
  var complete = true;
  for ( var t in this.tasks ){
    var task = this.tasks[t];
    this.current_task = task;
    // if ( task && taskObj === typeof task && null == task.selection ) {
    // console.log(typeof task);
    if ( task && null == task.selection && task.choices ) {
      for (var c = 0, c_len = task.choices.length; c_len > c; ++c) {
        var choice = task.choices[c];
        this.app.menu.add( choice, choice, "answer", "assessment", false );
      }

      this.app.speeches.length = 0;
      this.app.speeches.push( "Question " + (this.scores.length + 1) + ": " );
      this.app.speeches.push( "What is the " + task.task + " of all datapoints?" );
      complete = false;

      break; 
    } 
  }

  if (complete) {
    this.report();
  }

  if ( this.app.speeches.length ){
    this.app.speak();   
  }
}  

taskAssessmentObj.prototype.evaluateAnswer = function ( option_id, option_context, option_type ){
  var task = this.current_task;
  // this.tasks[ option_id ];

  task.selection = option_id;

  if (task) {
    var msg = "";
    var is_correct = false;
    if ( task.selection == task.answer ) {
      is_correct = true;
      msg = "Correct";
    } else {
      msg = "Incorrect";
    }
    
    msg += ". The " + task.task + " is " + task.answer + ". ";

    this.scores.push(is_correct);

    // console.log( "correct: " + is_correct );

    this.app.speeches.length = 0;
    this.app.speeches.push( msg );

    this.app.menu.reset();
    this.app.menu.add( "next", "next question", "next", "assessment", false );

    if ( this.app.speeches.length){
      var self = this;
      // use callback to delay next result
      // this.app.speak( self.runTest, self );   
      this.app.speak();   
    }
  }
}  

taskAssessmentObj.prototype.report = function (){
  var score = 0;
  var total = this.scores.length;
  for (var s = 0; total > s; ++s) {
    var each_score = this.scores[s];
    if ( true == each_score ) {
      score++;
    }
  }

  this.app.menu.reset();
  this.app.speeches.length = 0;
  this.app.speeches.push( "You have completed all questions. Your score is " 
                          + score + " out of a possible " + total + ". " );
  this.app.speak();   
}


function taskObj( task, answer, choices ) {
  this.task = task;
  this.answer = answer;
  this.choices = choices;
  this.selection = null;

  this.init();
}

taskObj.prototype.init = function (){
  this.shuffle();
  // if ( this.answer ) {
  //   // generate fake answers
  //   var answer_index = randomNumber(0, 4);

  //   this.answers[ answer_index ] = this.answer;
  //   for (var a = 0; 6 > a; ++a) {
  //     if ( null == this.answers[a] ) {
  //       this.answers[a] = this.answer + randomNumber(-2, 2);
  //     }
  //   }
  // }
}

taskObj.prototype.shuffle = function (){
  var m = this.choices.length, t, i;

  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = this.choices[m];
    this.choices[m] = this.choices[i];
    this.choices[i] = t;
  }
}


//generates a quasi-random number in the ranges between the two parameters
randomNumber.today = new Date();
randomNumber.seed = randomNumber.today.getTime();
function randomNumber(min, max) {
  var range = Number(max) - Number(min);
  var offset = 0;
  if (0 == min) {
    range = max + 1;
    offset = 1;
  }
  else if (0 > min) {
    range += 1;
    offset = 1;
  }
  randomNumber.seed = (randomNumber.seed * 9301 + 49297) % 233280;
  var result = Math.ceil(randomNumber.seed / (233280.0) * range);
  return Number(result) + Number(min) - Number(offset);
};



/*
*  Chart Object
*/

function chartObj(el) {
  this.element = el;
  this.type = null;
  this.label = null;
  this.axes = [];
  this.datasets = [];
  this.legends = [];
  this.x = null;
  this.y = null;
  this.width = null;
  this.height = null;

  this.init();
}

chartObj.prototype.init = function (){
  this.type = this.element.getAttribute("aria-charttype");
  
  // get chart title
  var title = this.element.querySelector("[role='chart'] > [role='heading']");
  if ( title){
    this.label = title.textContent;
  }
    
  // find the dimensions of the chart area
  var chartarea = this.element.querySelector("[role='chartarea']");
  if ( chartarea){
    this.x = +chartarea.getAttribute("x");
    this.y = +chartarea.getAttribute("y");
    this.width = +chartarea.getAttribute("width");
    this.height = +chartarea.getAttribute("height");
  }
  
  if ( "pie" != this.type){
    // get chart axes
    this.axes["x"] = new axisObj( this.element, "x", "horizontal" );
    this.axes["y"] = new axisObj( this.element, "y", "vertical" );
  }

  var datasetEls = this.element.querySelectorAll("[role='dataset']");
  for (var d = 0, d_len = datasetEls.length; d_len > d; ++d) {
    var eachDataset = datasetEls[d];
    var datapoints = eachDataset.querySelectorAll("[role='datapoint']");
  
    var dataset = this.extractDataset( datapoints );
    this.datasets.push( dataset );
  }

  var legendEls = this.element.querySelectorAll("[role='legend']");
  for (var l = 0, l_len = legendEls.length; l_len > l; ++l) {
    var eachLegend = legendEls[ l ]; 
    var legend = new legendObj( eachLegend );
    this.legends.push( legend );
  }
}   

chartObj.prototype.extractDataset = function (datapoints){
  // var dataset = [];
  // dataset.values = [];
  var dataset = new datasetObj();

  for (var dp = 0, dp_len = datapoints.length; dp_len > dp; ++dp) {
    var eachDatapoint = datapoints[dp];
    var datapoint = new datapointObj( eachDatapoint );
    // datapoint.init( eachDatapoint ); 
    dataset.values.push( datapoint.value );
    dataset.datapoints.push( datapoint );
  };

  // sort values
  dataset.values.sort( function (a, b) {
    return a - b;
  }); 

  var stats = new statisticsObj( dataset.values.slice() );
  dataset.statistics = stats.stats;

  // TODO: find multiple lows/highs, etc.
  // TODO: find stats for:
  //       each datagroup
  //       sets of datagroups
  //       collective datapoints in all datagroups
  //       different items in same series across datagroups (e.g. 3rd datapoint in each datagroup)

  return dataset; 
}   


function statisticsObj( values_arr ) {
  this.values = values_arr;
  this.stats = {};

  this.init();
}   

statisticsObj.prototype.init = function (){  
  // TODO: do stats appropriate for different data types (NOIR)
  this.count();
  this.sum();
  this.low();
  this.high();
  this.range();
  this.mean();
  this.median();
  this.mode();
  // TODO: number of "classes":
  //       for histogram, may be multiple datapoints for each bin;
  //       find way to embed all this data in each datapoint, for distribution?
  // TODO: inner quartile range?

  return this.stats; 
}   

statisticsObj.prototype.count = function (){  
  // find low
  this.stats["count"] = this.values.length;
}   

statisticsObj.prototype.sum = function (){  
  // find sum
  this.stats["sum"] = this.values.reduce( function (a, b) {
    return a + b;
  }); 
}   

statisticsObj.prototype.low = function (){  
  // find low
  this.stats["low"] = this.values[0];
}   

statisticsObj.prototype.high = function (){  
  if (!this.stats["count"]) {
    this.count();
  }

  // find high
  this.stats["high"] = this.values[ this.stats["count"] - 1 ];
}   

statisticsObj.prototype.range = function (){
  if (!this.stats["high"]) {
    this.high();
  }

  if (!this.stats["low"]) {
    this.low();
  }

  // find range 
  this.stats["range"] = this.stats["high"] - this.stats["low"];
}   

statisticsObj.prototype.mean = function (){  
  if (!this.stats["sum"]) {
    this.sum();
  }

  if (!this.stats["count"]) {
    this.count();
  }

  // find mean 
  this.stats["mean"] = this.stats["sum"] / this.stats["count"];
}   

statisticsObj.prototype.median = function (){  
  // find median  
  var mid = Math.floor(this.values.length/2);
  // if ( 1 == dataset.length%2){
  if (this.values.length % 2) {
    this.stats["median"] = this.values[mid];
  } else {
    this.stats["median"] = ( this.values[mid - 1] + this.values[mid]) / 2;
  }
}   

statisticsObj.prototype.mode = function (){  
  // find mode 
  var modeMap = {},
      maxCount = 1, 
      modes = [this.values[0]];

  for(var i = 0; i < this.values.length; ++i) {
    var val = this.values[i];

    if (modeMap[val] == null) {
      modeMap[val] = 1;
    } else {
      modeMap[val]++;
    }

    if (modeMap[val] > maxCount) {
      modes = [val];
      maxCount = modeMap[val];
    } else if (modeMap[val] == maxCount) {
      modes.push(val);
      maxCount = modeMap[val];
    }
  }
  this.stats["mode"] = modes; 
}   


function datasetObj() {
  this.datapoints = [];
  this.datagroups = [];
  this.values = [];
  this.statistics = {};

  this.init();
}

datasetObj.prototype.init = function (){  
}   


function datapointObj( el ) {
  this.element = el;
  this.value = null;
  this.values = [];
  this.label = null;
  this.label_els = [];
  this.label_text = "";

  this.datagroup = null; // element or object? should this be an array?

  this.colors = [];

  this.init();
}

datapointObj.prototype.init = function (){  
  var datavalue_el = this.element.querySelector("[role='datavalue']");
  if (datavalue_el) {
    var data_text = datavalue_el.textContent;
    // remove label commas and parse numeric portion as float
    this.value = parseFloat( data_text.replace(/\,/g,'') );
    
    // TODO: allow multiple data values per datapoint, 
    //       for different data types or axes;
    //       for example:
    //       * raw number and percentage (same value expressed differently)
    //       * x and y value

    // compose accessible name
    var aria_labels = this.element.getAttribute("aria-labelledby");
    aria_labels += " " + datavalue_el.getAttribute("aria-labelledby");
    var aria_label_array = aria_labels.match(/\S+/g) || [];

    // var aria_labels = datavalue_el.getAttribute("aria-labelledby").match(/\S+/g) || [];
    // console.log(aria_labels);
    for (var l = 0, l_len = aria_label_array.length; l_len > l; ++l) {
      var each_label = aria_label_array[ l ]; 
      var label_el = document.getElementById( each_label );

      // don't include datavalue element text, in case it's included as an AT hack
      if (label_el && this.element != label_el && datavalue_el != label_el) {
        this.label_text += label_el.textContent.trim();
        this.label_els.push(label_el);
        if ( l_len != l + 1 ) {
          this.label_text += ", ";
        }
      }
    } 
    this.label = this.label_text + ": " + data_text;

    if ( "g" == this.element.localName ) {
      var shapes = this.element
                .querySelectorAll("circle, ellipse, rect, line, polyline, polygon, path, use");
      for (var s = 0, s_len = shapes.length; s_len > s; ++s) {
        var eachShape = shapes[ s ]; 
        var colorItem = new colorObj(eachShape);
        // console.log( this.element.id + ": " + eachShape.localName 
        //               + "\n fill: " + colorItem.fill 
        //               + "\n stroke: " + colorItem.stroke 
        //             );
        this.colors.push(colorItem);
      }  
    } else {
      var colorItem = new colorObj(this.element);
      this.colors.push(colorItem);
    }
  }
}

function datagroupObj( el, parent_el ) {
  this.element = el;
  this.parent_el = parent_el;
  this.datapoint_els = [];
  this.datagroups = [];
  this.label = null;
  this.label_els = [];
  this.label_text = "";

  this.statistics = {};

  this.init();
}

datagroupObj.prototype.init = function (){  
  var parent = this.element.parentNode;

  // detect if this is a direct child of the parent element,
  // or if it's a subgroup
  while ( this.parent_el != parent ) {
    var parent_role = parent.getAttribute("role");
    if ( "datagroup" == parent_role ) {
      this.element = null;
      return;
    }
    parent = parent.parentNode;
  }

  // var datavalue_el = this.element.querySelector("[role='datavalue']");

  // TODO: get all child elements 
  this.datapoint_els = this.element.querySelector("[role='datapoint']");

  // TODO: get all child datagroups 
  // this.datagroup_els = this.element.querySelector("[role='datagroup']");

  // get all child datagroups 
  var datagroup_els = this.element.querySelector("[role='datagroup']");
  // make sure that no subgroups are included
  for (var d = 0, d_len = datagroup_els.length; d_len > d; ++d) {
    var each_datagroup = datagroup_els[ d ]; 
    var datagroupItem = new datagroupObj( each_datagroup, this.element );
    if ( datagroupItem.element ) {
      this.datagroups.push(each_datagroup);
    }
  }

  // TODO: generate stats for each datagroup
}

function axisObj(chart_el, type, dir) {
  this.element = chart_el.querySelector("[role='" + type + "axis']");
  this.chart_el = chart_el;
  this.type = type;
  this.direction = dir;
  this.min = null;
  this.max = null;
  this.units = null;
  this.label = null;
  this.labels = [];
  this.items = [];

  this.init();
}

axisObj.prototype.init = function (){
  this.min = parseFloat(this.element.getAttribute("aria-valuemin"));
  this.max = parseFloat(this.element.getAttribute("aria-valuemax"));
  this.units = null;  
  
  // get axis title
  var title = this.chart_el.querySelector("[role='" + this.type + "axis'] > [role='heading']");
  if ( title){
    this.label = title.textContent;
  }

  // first extract all the axis labels
  var axislabels = this.element.querySelectorAll("[role='axislabel']");
  if ( axislabels.length){
    // var axisTexts = [];
    // var axisValues = [];
    for (var a = 0, a_len = axislabels.length; a_len > a; ++a) {
      var eachLabel = axislabels[ a ]; 
      // this.labels.push( eachLabel.textContent );
      this.items.push( new axisItemObj( eachLabel, this ) );
      // axisValues.push( parseFloat(eachLabel.textContent) );
    }
    // console.log( min + ", " + max );
  }
}

function axisItemObj( el, axis ) {
  this.element = el;
  this.label = el.textContent;
  this.axis = axis;
  this.group = null;
  this.refs = []; // rename datapoints? here and in legenditems?


  this.init();
}

axisItemObj.prototype.init = function (){
  // TODO: populate datapoints 

  var allRefs = document.querySelectorAll("[aria-labelledby~='" + this.element.id + "']");
  for (var r = 0, r_len = allRefs.length; r_len > r; ++r) {
    var eachRef = allRefs[ r ]; 
    
    var ref = eachRef;
    var role = eachRef.getAttribute("role");
    while ( "datapoint" != role){
      ref = ref.parentNode;
      role = ref.getAttribute("role");
    }   
    
    // TODO: find existing datapoint and link to that instead of creating a new one?
    var datapoint = new datapointObj( ref );
    this.refs.push(datapoint); // list of referencing datapoints
    // console.log( min + ", " + max );
  }
}


function legendObj( el ) {
  this.element = el;
  this.label = null;
  this.items = []; // each item has: element, label, list of referencing datapoints

  this.init();
}

legendObj.prototype.init = function (){
  // get legend title
  var title = this.element.querySelector("[role='legend'] > [role='heading']");
  if ( title){
    this.label = title.textContent;
  }
  
  // first extract all the legend items
  var legendItems = this.element.querySelectorAll("[role='legenditem']");
  for (var l = 0, l_len = legendItems.length; l_len > l; ++l) {
    var eachItem = legendItems[ l ]; 
    var legendItem = new legendItemObj( eachItem );
    this.items.push( legendItem );
  }
}

function legendItemObj(el) {
  this.element = el;
  this.label = null;
  this.refs = []; // list of referencing datapoints

  this.init();
}

legendItemObj.prototype.init = function (){
  var title = this.element.querySelector("[role='legenditem'] > text,[role='legenditem'] > title");
  if ( title){
    this.label = title.textContent;
  }

  /// BE HERE NOW!!!
  
  /// find all the datapoints which reference this legend item
  var allRefs = document.querySelectorAll("[aria-labelledby~='" + this.element.id + "']");
  for (var r = 0, r_len = allRefs.length; r_len > r; ++r) {
    var eachRef = allRefs[ r ]; 
    
    var ref = eachRef;
    var role = eachRef.getAttribute("role");
    while ( "datapoint" != role){
      ref = ref.parentNode;
      role = ref.getAttribute("role");
    }   

    // if ( "datavalue" == role){
    //  while ( "datapoint" == role){
    //    ref = ref.parentNode;
    //  }   
    //  
    // }    
    
    var datapoint = new datapointObj( ref );
    // datapoint.init( ref ); 
    // dataset.values.push( datapoint.value );
    // dataset.push( datapoint );
    
    
    this.refs.push(datapoint); // list of referencing datapoints
    // console.log( min + ", " + max );
  }

}

/*
*  Flowchart Object
*/

function flowchartObj(el) {
  this.element = el;
  this.type = null;
  this.label = null;

  this.nodes = [];
  this.node_types = {};
  this.node_type_count = 0;

  this.connectors = [];
  this.connector_types = {};
  this.connector_type_count = 0;

  this.initial_node_count = 0;
  this.terminal_node_count = 0;

  this.init();
}

flowchartObj.prototype.init = function (){
  this.type = this.element.getAttribute("aria-charttype");
  
  // get chart title
  var title = this.element.querySelector("[role='flowchart'] > [role='heading']");
  if ( title ){
    this.label = title.textContent;
  }

  // find connectors first, in case an ID is missing and needs to be added
  this.find_connectors(); 
  this.find_nodes();
}

flowchartObj.prototype.find_connectors = function (){
  var connector_els = this.element.querySelectorAll("[role='connector'][aria-flowfrom][aria-flowto]");
  for (var c = 0, c_len = connector_els.length; c_len > c; ++c) {
    var each_connector = connector_els[c];
    var connector = new connectorObj( each_connector );
    this.connectors.push( connector );

    var count = this.connector_types[ connector.type ];
    if ( !count ) {
      this.connector_types[ connector.type ] = 1;
      this.connector_type_count++;
    } else {
      this.connector_types[ connector.type ] = ++count;
    }
  }
}

flowchartObj.prototype.find_nodes = function (){
  var node_els = this.element.querySelectorAll("[role='node']");
  for (var n = 0, n_len = node_els.length; n_len > n; ++n) {
    var each_node = node_els[n];
    var node = new nodeObj( each_node, this.element );
    this.nodes.push( node );

    if ( node.is_initial ) {
      this.initial_node_count++;
    } 

    if ( node.is_terminal ) {
      this.terminal_node_count++;
    }

    var count = this.node_types[ node.type ];
    if ( !count ) {
      this.node_types[ node.type ] = 1;
      this.node_type_count++;
    } else {
      this.node_types[ node.type ] = ++count;
    }
  }
}


function connectorObj( el ) {
  this.element = el;
  this.id = this.element.id;
  this.label = null;
  this.type = this.element.getAttribute("aria-type");
  this.nodes = [];
  this.from_el = null;
  this.to_el = null;
  this.is_directed = false;
  this.is_loop = false;
  this.follow_count = 0;

  this.init();
}

connectorObj.prototype.init = function (){
  var directed = this.element.getAttribute("aria-directed");
  if ( "true" == directed ) {
    this.is_directed = true;
  }

  if (!this.type || "" == this.type ) {
    this.type = null;
  }

  // TODO: if this.is_directed is false, add connector to both "to" and "from" lists
  // TODO: handle description case where 2-way connector is on the "to" node… reverse "to" and "from"
  // TODO: fix number of connectors listed… list 2-way connectors only once

  // TODO: if missing 'to' or 'from', or if element doesn't exist, tell user (what does ARIA do?);

  var from_value = this.element.getAttribute("aria-flowfrom");
  this.from_el = document.getElementById( from_value );

  var to_value = this.element.getAttribute("aria-flowto");
  this.to_el = document.getElementById( to_value );

  if ( from_value == to_value ) {
    this.is_loop = true;
  }

  // generate ID for connector is there is none
  if ( !this.id || "" == this.id ) {
    this.id = generate_unique_id( "connector-" + from_value + "-to-" + to_value );
    this.element.id = this.id;
  }

  var name = new accessibleNameObj( this.element );
  this.label_els = name.label_els;
  this.label_text = name.label_text;
  this.label = name.label;
}

connectorObj.prototype.get_info = function ( flowchart ){
  var from_node = flowchart.nodes.find( match_element, this.from_el );
  var to_node = flowchart.nodes.find( match_element, this.to_el );

  var msg = "Connector";
  if (this.label) {
    msg += ', with the label "' + this.label + '". ';
  }
  msg += ". This is a ";
  if ( this.is_directed ) {
    msg += "one-way connector starting at the node ";
    msg += '"' + from_node.label + '"';
    msg += ' and ending at the node "' + to_node.label + '".';
  } else {
    msg += "two-way connector between the nodes " ;
    msg += '"' + from_node.label + '" and ';
    msg += '"' + to_node.label + '". ';
  }

  return msg;
}

connectorObj.prototype.make_option_label = function ( flowchart, node, direction ){
  var start_el = this.from_el;
  var end_el = this.to_el;
  if ( "bidi" == direction && node.element == this.to_el ) {
    start_el = this.to_el;
    end_el = this.from_el;
  } else if ( "from" == direction ) {
    start_el = this.from_el;
  } else if ( "to" == direction ) {
    start_el = this.to_el;
  }

  // if ( "bidi" == direction ) {
  //   if ( node.element == this.to_el ) {
  //     start_el = this.from_el;
  //   } else {
  //     start_el = this.to_el;
  //   }
  // } else if ( "from" == direction ) {
  //   start_el = this.from_el;
  // } else if ( "to" == direction ) {
  //   start_el = this.to_el;
  // }

  // TODO: handle "outgoing" and "incoming" based on direction and node
  var start_node = flowchart.nodes.find( match_element, start_el );
  var end_node = flowchart.nodes.find( match_element, end_el );

  if ( end_node ) {
    var msg = this.label;
    if ( "" != msg ) {
      msg += ", ";
    }

    if (!this.is_directed) {
      // option_label += ", bidirectional connector";
      msg += "a two-way connector ";
    }

    if ( this.is_loop ) {
      // handle loop connectors that return to the same node
      msg += "looping back to this node";
    } else {
      if ( "" == msg ) {
        msg += "the connector ";
      }

      var dir_msg = "to the ";
      if ( "from" == direction ) {
        dir_msg = "starting at the ";
      }

      // give end-node label
      var type_msg = "";
      if ( end_node.is_initial ) {
        type_msg += " starting ";
      } else if ( end_node.is_terminal ) {
        type_msg += " ending ";
      }

      msg += dir_msg + type_msg + ' node labeled "' + end_node.label + '"';
    }

    if ( 0 != this.follow_count ) {
      msg += " (already followed " + this.follow_count + " times)";
      if ( 1 == this.follow_count ){
        msg = msg.replace("times)", "time)"); // make it singular
      }
    }

    return msg;
  }
}


function nodeObj( el, root ) {
  this.element = el;
  this.root = root;
  this.id = this.element.id;
  this.type = "";
  this.label = null;
  this.label_els = [];
  this.label_text = "";
  this.is_initial = false;
  this.is_terminal = false;
  this.visit_count = 0;

  this.connectors = {
    "all": [],
    "bidi": [],
    "to": [],
    "from": []
  };

  this.shape = ""; // flowchart symbol
  this.colors = [];

  this.init();
}

nodeObj.prototype.init = function (){  
  this.type = this.element.getAttribute("aria-nodetype");
  if (!this.type || "" == this.type ) {
    this.type = null;
  }

  var name = new accessibleNameObj( this.element, this.root );
  this.label_els = name.label_els;
  this.label_text = name.label_text;
  this.label = name.label;

  // get related connectors
  var from_connector_els = this.root.querySelectorAll("[role='connector'][aria-flowfrom='" + this.id + "']");
  this.connectors["from"] = this.find_connectors( from_connector_els );
  
  var to_connector_els = this.root.querySelectorAll("[role='connector'][aria-flowto='" + this.id + "']");
  this.connectors["to"] = this.find_connectors( to_connector_els );

  this.connectors["all"] = this.connectors["from"].concat( this.connectors["to"]);
  
  var all_connector_els = Array.from( from_connector_els ).concat( Array.from( to_connector_els ) );

  // if this.is_directed is false, add connector to "bidi" and remove from "to" and "from" lists
  for (var c = 0, c_len = all_connector_els.length; c_len > c; ++c) {
    var each_connector = all_connector_els[c];
    var directed = each_connector.getAttribute( "aria-directed" );
    if ( !directed || "false" == directed ) {
      var each_connector_id = each_connector.id;
      this.connectors["bidi"].push( each_connector_id );

      // remove from "from" array
      var fi = this.connectors["from"].indexOf( each_connector_id );
      if( -1 != fi ) {
        this.connectors["from"].splice(fi, 1);
      }

      // remove from "to" array
      var ti = this.connectors["to"].indexOf( each_connector_id );
      if( -1 != ti ) {
        this.connectors["to"].splice(ti, 1);
      }

    }
  }


  // // get related connectors
  // var from_query = "[role='connector'][aria-flowfrom='" + this.id + "']:not([aria-directed='false'])"
  // var from_connector_els = this.root.querySelectorAll(from_query);
  // this.connectors["from"] = this.find_connectors( from_connector_els );
  
  // var to_query = "[role='connector'][aria-flowto='" + this.id + "']:not([aria-directed='false'])"
  // var to_connector_els = this.root.querySelectorAll(to_query);
  // this.connectors["to"] = this.find_connectors( to_connector_els );
  
  // var bidi_query = "[role='connector'][aria-flowto='" + this.id + "']:not([aria-directed='false'])"
  // var bidi_connector_els = this.root.querySelectorAll(bidi_query);
  // this.connectors["bidi"] = this.find_connectors( bidi_connector_els );

  // this.connectors["all"] = this.connectors["from"].concat( this.connectors["to"]);


  // if this.is_directed is false, add connector to both "to" and "from" lists
  // for (var c = 0, c_len = to_connector_els.length; c_len > c; ++c) {
  //   var each_connector = to_connector_els[c];
  //   var directed = each_connector.getAttribute( "aria-directed" );
  //   if ( "false" == directed ) {
  //     this.connectors["from"].push( each_connector.id );
  //   }
  // }

  
  if ( 0 != this.connectors["from"].length && 0 == this.connectors["to"].length ) {
    this.is_initial = true;
  }  
  
  if ( 0 == this.connectors["from"].length && 0 != this.connectors["to"].length ) {
    this.is_terminal = true;
  }  


  // get colors
  if ( "g" == this.element.localName ) {
    var shapes = this.element
              .querySelectorAll("circle, ellipse, rect, line, polyline, polygon, path, use");
    for (var s = 0, s_len = shapes.length; s_len > s; ++s) {
      var eachShape = shapes[ s ]; 
      var colorItem = new colorObj(eachShape);
      // console.log( this.element.id + ": " + eachShape.localName 
      //               + "\n fill: " + colorItem.fill 
      //               + "\n stroke: " + colorItem.stroke 
      //             );
      this.colors.push(colorItem);
    }  
  } else {
    var colorItem = new colorObj(this.element);
    this.colors.push(colorItem);
  }
}

nodeObj.prototype.find_connectors = function ( connectors ){  
  var connector_array = [];
  for (var c = 0, c_len = connectors.length; c_len > c; ++c) {
    var each_connector = connectors[c];
    connector_array.push( each_connector.id );
  }
  return connector_array;

  // var connector_array = [];
  // for (var c = 0, c_len = connectors.length; c_len > c; ++c) {
  //   var each_connector = connectors[c];
  //   var connector = new connectorObj( each_connector );
  //   connector_array.push( connector );
  // }
  // return connector_array;
}




function accessibleNameObj ( el, root ) { 
  this.element = el;
  this.root = root; // root document node to search in
  this.label_els = [];
  this.label_text = "";
  this.label = null;
  this.role = this.element.getAttribute("role");

  this.init();
}

accessibleNameObj.prototype.init = function (){
  // compose accessible name
  var aria_label_ids = this.element.getAttribute("aria-labelledby");
  var aria_label_id_array = [];
  if (aria_label_ids) {
    aria_label_id_array = aria_label_ids.match(/\S+/g) || [];
  } 

  // var aria_labels = datavalue_el.getAttribute("aria-labelledby").match(/\S+/g) || [];
  // console.log(aria_labels);
  var l_len = aria_label_id_array.length
  for (var l = 0; l_len > l; ++l) {
    var each_label_id = aria_label_id_array[ l ]; 
    var label_el = document.getElementById( each_label_id );

    // don't include this element text, in case it's included as an AT hack
    if (label_el && this.element != label_el) {
      this.label_text += label_el.textContent.trim();
      this.label_els.push(label_el);
      if ( l_len != l + 1 ) {
        this.label_text += ", ";
      }
    }
  } 

  // if there's no aria-labelledby, use the child title and text elements
  if ( 0 == l_len ) {
    var title_el = this.element.querySelector("[role='" + this.role + "'] > [role='heading']");
    if ( title_el ){
      this.label_els.push( title_el );
      if ( "" != this.label_text ) {
        this.label_text += ", ";
      }
      this.label_text += title_el.textContent;
    }   

    var text_el = this.element.querySelector("[role='" + this.role + "'] > text");
    if ( text_el ){
      this.label_els.push( text_el );
      if ( "" != this.label_text ) {
        this.label_text += ", ";
      }
      this.label_text += text_el.textContent;
    }
  }

  if ( "text" == this.element.localName 
    || "tspan" == this.element.localName 
    || "textPath" == this.element.localName ) {
    if ( "" != this.label_text ) {
      this.label_text += ", ";
    }    
    this.label_text += this.element.textContent;
  }

  this.label = this.label_text;
  this.label = this.label.replace(/\n/g, " ").replace(/\s+/g, " ");

  if (!this.label) {
    // this.label = "unlabeled";
    this.label = "";
  }
}

/*
*  Color Object
*/
function colorObj( el ) {
  this.element = el;
  this.fill = null;
  this.fill_name = null;
  this.fill_hue = null;
  this.fill_shade = null;
  this.stroke = null;
  this.stroke_name = null;
  this.stroke_hue = null;
  this.stroke_shade = null;

  this.init();
}

colorObj.prototype.init = function (){
  var el_style = window.getComputedStyle(this.element, null);
  this.fill = el_style.getPropertyValue("fill");
  this.stroke = el_style.getPropertyValue("stroke");

  // console.log("this.fill: " + this.fill);
  // console.log("this.stroke: " + this.stroke);

  //TODO: translate color values (hsl, hex, rgb) to named hue
  //TODO: translate complex named colors to simpler hue name
  //TODO: detect uniqueness of hue among all datapoints, set as color name

  //TODO: if this is a <use> element, find referent and detect those colors

  //TODO: for datapoints with multiple shapes (e.g. 3D bars), 
  //      find the largest shape and set that as the color for the datapoint

  //TODO: rewrite NTC lib
  //      * accept any color value format as input
  //      * output object with hue, shade, name
  //      * give preference to named color values
  //      * give good names to common Brewer pallette colors, including hue name (e.g. "lake blue")
  //TODO: add new "shade" value to color array (very dark/dark/medium/light/very light)


  if ( "none" == this.fill ){
    this.fill = null;
  } else {
    // var fill_match = ntc.name( this.rgb2hex(this.fill) );
    var fill_match = this.colorToName(this.fill);
    this.fill_name = fill_match[1];
    this.fill_hue = fill_match[1];
    this.fill_shade = fill_match[3];
  }

  if ( "none" == this.stroke ){
    this.stroke = null;
  } else {
    // var stroke_match = ntc.name( this.rgb2hex(this.stroke) );
    var stroke_match = this.colorToName(this.stroke);
    this.stroke_name = stroke_match[1];
    this.stroke_hue = stroke_match[1];
    this.stroke_shade = stroke_match[3];
  }


    // var n_match  = ntc.name("#6195ED");
    // n_rgb = n_match[0]; // This is the RGB value of the closest matching color
    // n_name = n_match[1]; // This is the text string for the name of the match
    // n_shade_rgb = n_match[2]; // This is the RGB value for the name of colors shade
    // n_shade_name = n_match[3]; // This is the text string for the name of colors shade
    // n_exactmatch = n_match[4]; // True if exact color match, False if close-match


}

colorObj.prototype.colorToName = function (color) {
  // TODO: detect all value CSS color formats 
  //      (hex, rgb, rgba, hsl, hsla, named colors) and convert to hex 
  var hex_value = null;
  var color_names = "";
  if ( "#" == color.slice(0,1) ) {
    color_names = ntc.name( color );
  } else if ( "rgb" == color.slice(0,3) ) {
   color = color.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
   hex_value = (color && color.length === 4) ? "#" +
               ("0" + parseInt(color[1],10).toString(16)).slice(-2) +
               ("0" + parseInt(color[2],10).toString(16)).slice(-2) +
               ("0" + parseInt(color[3],10).toString(16)).slice(-2) : '';
    color_names = ntc.name( hex_value );
  } else if ( "hsl" == color.slice(0,3) ) {
    color_names = ""; // placeholder
    
    // TODO: convert HSLa to hext
    // … in progress
    // var hsl_array = color.split(.*\())[1].split()

    // var hsl = color.match(/^hsla?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)%[\s+]?,[\s+]?(\d+)%[\s+]?/i);
    // var r, g, b;

    // if(s == 0){
    //     r = g = b = l; // achromatic
    // }else{
    //     var hue2rgb = function hue2rgb(p, q, t){
    //         if(t < 0) t += 1;
    //         if(t > 1) t -= 1;
    //         if(t < 1/6) return p + (q - p) * 6 * t;
    //         if(t < 1/2) return q;
    //         if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    //         return p;
    //     }

    //     var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    //     var p = 2 * l - q;
    //     r = hue2rgb(p, q, h + 1/3);
    //     g = hue2rgb(p, q, h);
    //     b = hue2rgb(p, q, h - 1/3);
    // }

    // return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];

  } else {
    // TODO: do something about color name here
    //       probably just look up name directly in color-ref
    color_names = color; // placeholder
  }

  return color_names;
}

/****
* Sonifier
****/

function Sonifier() {
  this.svgroot = null;
  this.cursor = null;
  this.cursorpoint = null;
  this.output = null;
  this.audioContext = null;
  this.oscillator = null;
  this.volume = null;
  this.volumeLevel = 1;
  this.metaGroup = null;
  this.dataLine = null;
  this.dataLinePoints = null;
  this.minx = 0;
  this.maxx = 0;
  this.miny = 0;
  this.maxy = 0;
  this.axisX = null;
  this.axisY = null;
  this.valuePoint = null;
  this.isMute = false;
  this.isPlaying = false;
  this.isReady = false;
  this.timer = null;
  this.cursorSpeed = 15; // 25
  this.cursorDirection = 1;
  this.cursorColor = "white";
  this.cursorIntersect = false;
  this.tickContext = null;
  this.tickTone = null;
  this.panner = null;
  this.panValue = -1;

  this.coords = null;

  // constants
  this.svgns = "http://www.w3.org/2000/svg";
}

Sonifier.prototype.init = function (svgroot, metaGroup, dataLine, 
                                     x, y, width, height, xAxis, yAxis, xAxisPos, yAxisPos, color){ 
  this.svgroot = svgroot;
  this.metaGroup = metaGroup;
  this.dataLine = dataLine;
  this.minx = x;
  this.miny = y;
  this.maxx = x + width;
  this.maxy = y + height;
  this.coords = this.svgroot.createSVGPoint();
  this.axisX = new Axis( xAxis[0], xAxis[1], xAxisPos, 0, width);
  this.axisY = new Axis( yAxis[0], yAxis[1], yAxisPos, 0, height);
  this.cursorColor = color;


  // this.oscillator = null;
  // this.volume = null;
  this.volumeLevel = 1;
  this.valuePoint = null;
  this.isMute = false;
  this.timer = null;
  this.cursorDirection = 1;
  this.cursorIntersect = false;
  this.setDetune(0);
  this.dataLinePoints = null;

  // // create frame, debugging
  //   var frame = document.createElementNS(this.svgns, "path");
  //   frame.setAttribute("d", "M" + this.minx + "," + this.miny 
  //                               + " " + this.maxx + "," + this.miny
  //                               + " " + this.maxx + "," + this.maxy
  //                               + " " + this.minx + "," + this.maxy
  //                               + " z");
  //   frame.setAttribute("fill", "lime");
  //   frame.setAttribute("opacity", "0.5");
  //   frame.setAttribute("pointer-events", "none");
  //   this.metaGroup.appendChild( frame );


  // create cursor line and point
  this.cursor = document.createElementNS(this.svgns, "path");
  this.cursor.setAttribute("id", "cursor");
  this.cursor.setAttribute("d", "M" + this.minx + "," + this.miny + " " + this.minx + "," + this.maxy);
  // this.cursor.setAttribute("d", "M0,0 0," + this.maxy);
  this.cursor.setAttribute("fill", "none");
  this.cursor.setAttribute("stroke", this.cursorColor);
  this.cursor.setAttribute("stroke-width", "1");
  this.cursor.setAttribute("stroke-linecap", "round");
  this.cursor.setAttribute("stroke-dasharray", "5");
  this.cursor.setAttribute("pointer-events", "none");
  this.metaGroup.appendChild( this.cursor );

  this.cursorpoint = document.createElementNS(this.svgns, "circle");
  this.cursorpoint.setAttribute("id", "cursorpoint");
  this.cursorpoint.setAttribute("cx", this.minx );
  this.cursorpoint.setAttribute("cy", this.miny );
  this.cursorpoint.setAttribute("r", 3 );
  this.cursorpoint.setAttribute("fill", "none");
  this.cursorpoint.setAttribute("stroke", "none");
  this.cursorpoint.setAttribute("pointer-events", "none");
  this.metaGroup.appendChild( this.cursorpoint );


  this.metaGroup.addEventListener("mousemove", bind(this, this.trackPointer), false );
  // document.documentElement.addEventListener("click", this.toggleAudio, false );

  if ( !this.isReady){
    // only register key listener on first initialization
    document.documentElement.addEventListener("keydown", bind(this, this.trackKeys), false );
  }
  
  // indicate first initialization
  this.isReady = true;

  // var axisMsg = "X-axis: " + this.axisX.min 
  //                + " to " + this.axisX.max + ". Y-axis: " + this.axisY.min + " to " + this.axisY.max;
  // this.speak( axisMsg, false );
}

Sonifier.prototype.trackKeys = function (event) {
  // console.log("Sonifier.trackKeys");
  // var key = event.keyIdentifier.toLowerCase();
  var key = event.key.toLowerCase();

  if ( "sonifier" == this.interaction_mode ) {
    switch ( key){
      case "down":
      case "arrowdown":
      case "right":
      case "arrowright":
        this.stepCursor( 1 );
        break;

      case "up":
      case "arrowup":
      case "left":
      case "arrowleft":
      this.stepCursor( -1 );
        break;

      case "enter":
        this.speak( null, true );
        break;


      case "p":
        this.togglePlay();
        break;

      case "s":
        this.resetPlay();
        break;

      case "[":
        this.setPlayRate( 10 );
        break;

      case "]":
        this.setPlayRate( -10 );
        break;

      case "m":
        this.toggleVolume();
        break;

      case "o":
        this.setDirection();
        break;
    }
  }
}   


Sonifier.prototype.togglePlay = function (forcePause){
  console.log("togglePlay");
  if ( this.timer || forcePause){
    this.stopPlay();
  } else {
    this.isPlaying = true;
    var t = this; 
    
    this.timer = setInterval( function () { 
      t.coords.x += t.cursorDirection;
      t.updateCursor();
    }, t.cursorSpeed);
  }
}   

Sonifier.prototype.stopPlay = function () { 
  clearInterval( this.timer );
  this.timer = null;
}   

Sonifier.prototype.resetPlay = function () { 
  this.stopPlay( 1, 1 );
  this.isPlaying = false;
  this.coords.x = 0;
  this.coords.y = 0;
  this.positionCursor( this.coords.x, this.coords.y, true );
  this.setVolume( 0 );
}   

Sonifier.prototype.setPlayRate = function (rateDelta){ 
  this.cursorSpeed += rateDelta;
  if ( this.timer){
    this.stopPlay();
    this.togglePlay();
  }
}   

Sonifier.prototype.stepCursor = function (direction){ 
  var x = parseFloat( this.cursorpoint.getAttribute( "cx" ) );
  this.coords.x = x + direction;
  // this.coords.y = 0;
  this.updateCursor();  
}   

Sonifier.prototype.setDirection = function () { 
  if ( 1 == this.cursorDirection){
    this.cursorDirection = -1;
  } else {
    this.cursorDirection = 1;
  }
  
  if ( !this.timer){
    this.togglePlay();
  }
}   


Sonifier.prototype.setRange = function (xAxis, yAxis){ 
  //this.oscillator.stop();
}   

Sonifier.prototype.trackPointer = function (event) { 
  if ( this.cursor){
    this.coords.x = event.clientX;
    this.coords.y = event.clientY;
    this.coords = this.coords.matrixTransform( this.cursor.getScreenCTM().inverse() );      

    this.updateCursor();
  }
}   

Sonifier.prototype.updateCursor = function () { 
  // clip to range
  var x = Math.max( Math.min( this.maxx, this.coords.x ), this.minx );

  if ( ( this.maxx == x && 1 == this.cursorDirection ) 
    || ( 0 == x && -1 == this.cursorDirection )){
    this.stopPlay();
  } else {
    var cursor_p1 = new Point2D(x, this.miny);
    var cursor_p2 = new Point2D(x, this.maxy);

    if (!this.dataLinePoints) {
      this.dataLinePoints = [];
      var dataLineArray = null;
      if ("path" == this.dataLine.localName) {
        dataLineArray = this.dataLine.getAttribute("d").split("L");
      } else if ("polyline" == this.dataLine.localName || "polygon" == this.dataLine.localName) {
        dataLineArray = this.dataLine.getAttribute("points").split(" ");
        // dataLineArray = 
      }
      console.log("Sonifier.updateCursor:");
      console.log(dataLineArray);
      
      for (var vp in dataLineArray){
        if ("function" != typeof dataLineArray[vp]) { 
          var values = dataLineArray[vp].replace(/[A-Za-z]+/g, "").split(/[ ,]+/);
          this.dataLinePoints.push( 
            new Point2D( 
              parseFloat(values[0]), 
              parseFloat(values[1]) 
            )
          );
        }
      }
    }

    // update cursor line
    this.cursor.setAttribute("d", "M" + x + "," + this.miny + " " + x + "," + this.maxy);

    // find intersection
    var intersections = Intersection.intersectLinePolygon(
      cursor_p1, cursor_p2, this.dataLinePoints
    );

    this.valuePoint = intersections.points[0];
    if (this.valuePoint) {
      if (!this.cursorIntersect) {
        this.cursorIntersect = true;
        this.setVolume( 1 );
        this.cursorpoint.setAttribute( "stroke", this.cursorColor );
      }
    } else {
      this.valuePoint = {x:0, y:0};
      if (this.cursorIntersect) {
        this.cursorIntersect = false;       
        this.setVolume( 0 );
        this.cursorpoint.setAttribute( "stroke", "none" );
      }
    }

    this.positionCursor( x, this.valuePoint.y, false );
    
    /*
    affine transformation:
    to transform number x in range [a,b] to number y in range [c,d], use this formula:
    y = (x−a)(d−c/b−a) + c
    */
    this.panValue = ((x - this.axisX.chartMin) * (2 / (this.axisX.chartMax - this.axisX.chartMin))) - 1;
    this.pan();

    var detune = (this.valuePoint.y - this.axisY.chartMin) * ((1000 - -1000) / 
                 (this.axisY.chartMin - this.axisY.chartMax)) + 1000;
    this.setDetune ( detune );    
  }
  
  if ( this.axisX.pos == x 
    || this.axisX.chartMin == x
    || this.axisX.chartMax == x){
      console.log("tick");
      
      //this.playTickmark(); /// buggy right now, doesn't turn off
      
      
    //  var msg = "";
    //  if (  this.axisX.pos == x){
    //    msg = "axis marker: " + x;
    //  } else if (  this.axisX.chartMin == x){
    //    msg = "min: " + x;
    //  } else if (  this.axisX.chartMax == x){
    //    msg = "max: " + x;
    //  }
    // console.log(msg)
  }
}   

Sonifier.prototype.positionCursor = function (x, y, setLine){ 
  this.cursorpoint.setAttribute( "cx", x );
  this.cursorpoint.setAttribute( "cy", y );

  if ( setLine){
    // update cursor line
    this.cursor.setAttribute("d", "M" + x + "," + this.miny + " " + x + "," + this.maxy);
  }
}

Sonifier.prototype.setDetune = function (detune){ 
  if (!this.oscillator) {
    this.audioContext = new AudioContext();

    this.oscillator = this.audioContext.createOscillator();
    // this.oscillator.detune.value = -50; //min="-100" max="100"
    this.oscillator.frequency.value = 280; // 220

    this.oscillator.start(0);

    this.volume = this.audioContext.createGain(); 
    this.oscillator.connect(this.volume);
    this.volume.gain.value = 0;
    // this.volume.connect(this.audioContext.destination);

    this.panner = this.audioContext.createPanner();
    this.volume.connect(this.panner);
    this.panner.panningModel = "equalpower";
    this.panner.distanceModel = "exponential";
    // this.panner.refDistance = 1000;
    this.panner.coneOuterGain = 1;
    this.panner.coneOuterAngle = 180;
    this.panner.coneInnerAngle = 0;
    this.panner.connect(this.audioContext.destination);
  }

  this.oscillator.detune.value = Math.pow(2, 1/12) * detune;

  // oscillator.frequency.value = 440; // Set waveform frequency to 440 Hz
  // oscillator.detune.value = Math.pow(2, 1/12) * 10; // Offset sound by 10 semitones
}

Sonifier.prototype.setVolume = function (gain){ 
  if (this.volume) {
    this.volume.gain.value = gain;    
  }
}

Sonifier.prototype.toggleVolume = function (forceMute){ 
  if ( this.volume && this.audioContext.destination ){
    if ( !this.isMute || forceMute){
      this.isMute = true;
      this.volume.disconnect(this.audioContext.destination);
    } else {
      this.isMute = false;
      this.volume.connect(this.audioContext.destination);
    }
  }
}

// panVal is a float between -1 and 1: -1 == left; 1 == right
Sonifier.prototype.pan = function () {  
  var panAngle = this.panValue * Math.PI / 2;
  this.panner.setPosition(Math.sin(panAngle), Math.cos(panAngle), 1, 0, 0.5);
}

Sonifier.prototype.playTickmark = function () { 
  
  if (!this.tickTone) {
    this.tickContext = new AudioContext();

    this.tickTone = this.tickContext.createOscillator();
    this.tickTone.type = "square";
    this.tickTone.frequency.value = 880;
  }

  this.tickTone.connect(this.tickContext.destination);
  this.tickTone.start(0);
  
  /// buggy right now, doesn't turn off
  var t = this; 
  setTimeout( function () { 
    t.tickTone.disconnect(t.tickContext.destination);
  }, 100);
}


Sonifier.prototype.speak = function (msg){ 
  if ( "undefined" != typeof speechSynthesis){
    if ( speechSynthesis.speaking){
      speechSynthesis.cancel();
    }
  
    if ( !msg){
      msg = "x = " + this.axisX.scale( this.valuePoint.x );
      msg += ", y = " + this.axisY.scale( this.valuePoint.y );
    }
    
    var t = this;
    t.toggleVolume( true );
    if ( t.isPlaying){
      t.togglePlay( true );
    }

    var voice = new SpeechSynthesisUtterance();
    voice.text = msg;
    voice.lang = "en-US";
    voice.rate = 1.2;
    voice.onend = function () { 
      t.toggleVolume(); 
      if ( t.isPlaying){
        t.togglePlay();
      }
    }
    speechSynthesis.speak( voice );
  }
}

function Axis(min, max, pos, chartMin, chartMax) {
  if ( arguments.length > 0){
    this.min = min;
    this.max = max;
    this.pos = pos; // position of the axis line along the axis
    this.chartMin = chartMin;
    this.chartMax = chartMax;
  }
}

Axis.prototype.scale = function ( val){
  var newVal = (val / ((this.chartMax - this.chartMin) / (this.max - this.min))) + this.min;
  newVal = Math.round( newVal * 10 ) / 10;
  return newVal;
};


/****
* Helper methods
****/

Array.prototype.max = function () {
  return Math.max.apply(null, this);
}

Array.prototype.min = function () {
  return Math.min.apply(null, this);
}

function bind (scope, fn) {
  return function () {
    return fn.apply( scope, arguments );
  }
}


/******
* 
* from Intersection.js
* by Kevin Lindsey
* https://gemnasium.com/npms/kld-intersections
*
******/

function Point2D(x, y) {
  if ( arguments.length > 0){
    this.x = x;
    this.y = y;
  }
}

function Intersection(status) {
  if ( arguments.length > 0){
    this.init(status);
  }
}

Intersection.prototype.init = function (status) {
  this.status = status;
  this.points = new Array();
};

Intersection.prototype.appendPoints = function (points) {
  this.points = this.points.concat(points);
};

Intersection.intersectLineLine = function (a1, a2, b1, b2) {
  var result;

  var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
  var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
  var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

  if ( u_b != 0){
    var ua = ua_t / u_b;
    var ub = ub_t / u_b;

    if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1){
      result = new Intersection("Intersection");
      result.points.push(
        new Point2D(
          a1.x + ua * (a2.x - a1.x),
          a1.y + ua * (a2.y - a1.y)
        )
      );
    } else {
      result = new Intersection("No Intersection");
    }
  } else {
    if ( ua_t == 0 || ub_t == 0){
      result = new Intersection("Coincident");
    } else {
      result = new Intersection("Parallel");
    }
  }

  return result;
};

Intersection.intersectLinePolygon = function (a1, a2, points) {
  var result = new Intersection("No Intersection");
  var length = points.length;

  for ( var i = 0; i < length; ++i){
    var b1 = points[i];
    var b2 = points[(i+1) % length];
    var inter = Intersection.intersectLineLine(a1, a2, b1, b2);

    result.appendPoints(inter.points);
  }

  if ( result.points.length > 0){
    result.status = "Intersection";
  }
  
  return result;
};

/*
+-----------------------------------------------------------------+
|   Created by Chirag Mehta - http://chir.ag/tech/download/ntc    |
|-----------------------------------------------------------------|
|               ntc js (Name that Color JavaScript)               |
+-----------------------------------------------------------------+

All the functions, code, lists etc. have been written specifically
for the Name that Color JavaScript by Chirag Mehta unless otherwise
specified.

This script is released under the: Creative Commons License:
Attribution 2.5 http://creativecommons.org/licenses/by/2.5/

Sample Usage:
  <script type="text/javascript" src="ntc.js"></script>
  <script type="text/javascript">
    var n_match  = ntc.name("#6195ED");
    n_rgb = n_match[0]; // This is the RGB value of the closest matching color
    n_name = n_match[1]; // This is the text string for the name of the match
    n_shade_rgb = n_match[2]; // This is the RGB value for the name of colors shade
    n_shade_name = n_match[3]; // This is the text string for the name of colors shade
    n_exactmatch = n_match[4]; // True if exact color match, False if close-match
    alert(n_match);
  </script>
*/

var ntc = {

  init: function() {
    var color, rgb, hsl;
    for(var i = 0; i < ntc.names.length; i++) {
      color = "#" + ntc.names[i][0];
      rgb = ntc.rgb(color);
      hsl = ntc.hsl(color);
      ntc.names[i].push(rgb[0], rgb[1], rgb[2], hsl[0], hsl[1], hsl[2]);
    }
  },

  name: function(color) {

    color = color.toUpperCase();
    if(color.length < 3 || color.length > 7)
      return ["#000000", "Invalid Color: " + color, "#000000", "", false];
    if(color.length % 3 == 0)
      color = "#" + color;
    if(color.length == 4)
      color = "#" + color.substr(1, 1) 
                  + color.substr(1, 1) 
                  + color.substr(2, 1)
                  + color.substr(2, 1)
                  + color.substr(3, 1) 
                  + color.substr(3, 1);

    var rgb = ntc.rgb(color);
    var r = rgb[0], g = rgb[1], b = rgb[2];
    var hsl = ntc.hsl(color);
    var h = hsl[0], s = hsl[1], l = hsl[2];
    var ndf1 = 0, ndf2 = 0, ndf = 0;
    var cl = -1, df = -1;

    for(var i = 0; i < ntc.names.length; i++) {
      if(color == "#" + ntc.names[i][0])
        return ["#" + ntc.names[i][0], ntc.names[i][1], 
                      ntc.shadergb(ntc.names[i][2]), 
                      ntc.names[i][2], true];

      ndf1 = Math.pow(r - ntc.names[i][3], 2) + 
             Math.pow(g - ntc.names[i][4], 2) + 
             Math.pow(b - ntc.names[i][5], 2);
      ndf2 = Math.abs(Math.pow(h - ntc.names[i][6], 2)) + 
             Math.pow(s - ntc.names[i][7], 2) + 
             Math.abs(Math.pow(l - ntc.names[i][8], 2));
      ndf = ndf1 + ndf2 * 2;
      if(df < 0 || df > ndf)
      {
        df = ndf;
        cl = i;
      }
    }

    return (cl < 0 ? ["#000000", 
                      "Invalid Color: " + color, 
                      "#000000", "", false] 
                      : ["#" + 
                      ntc.names[cl][0], 
                      ntc.names[cl][1], 
                      ntc.shadergb(ntc.names[cl][2]), 
                      ntc.names[cl][2], false]);
  },

  // adopted from: Farbtastic 1.2
  // http://acko.net/dev/farbtastic
  hsl: function (color) {

    var rgb = [parseInt('0x' + color.substring(1, 3)) / 255, 
               parseInt('0x' + color.substring(3, 5)) / 255, 
               parseInt('0x' + color.substring(5, 7)) / 255];
    var min, max, delta, h, s, l;
    var r = rgb[0], g = rgb[1], b = rgb[2];

    min = Math.min(r, Math.min(g, b));
    max = Math.max(r, Math.max(g, b));
    delta = max - min;
    l = (min + max) / 2;

    s = 0;
    if(l > 0 && l < 1)
      s = delta / (l < 0.5 ? (2 * l) : (2 - 2 * l));

    h = 0;
    if(delta > 0)
    {
      if (max == r && max != g) h += (g - b) / delta;
      if (max == g && max != b) h += (2 + (b - r) / delta);
      if (max == b && max != r) h += (4 + (r - g) / delta);
      h /= 6;
    }
    return [parseInt(h * 255), parseInt(s * 255), parseInt(l * 255)];
  },

  // adopted from: Farbtastic 1.2
  // http://acko.net/dev/farbtastic
  rgb: function(color) {
    return [parseInt('0x' + color.substring(1, 3)), 
            parseInt('0x' + color.substring(3, 5)),  
            parseInt('0x' + color.substring(5, 7))];
  },
  
  shadergb: function (shadename) {
    for(var i = 0; i < ntc.shades.length; i++) {
      if(shadename == ntc.shades[i][1])
        return "#" + ntc.shades[i][0];
    }
    return "#000000";
  },
  
  shades: [
["FF0000", "Red"],
["FFA500", "Orange"],
["FFFF00", "Yellow"],
["008000", "Green"],
["0000FF", "Blue"],
["EE82EE", "Violet"],
["A52A2A", "Brown"],
["000000", "Black"],
["808080", "Grey"],
["FFFFFF", "White"]
],

/*

List of color names by Daniel Flück
http://www.color-blindness.com/color-name-hue/

*/

  names: [
["35312C","Acadia","Brown"],["75AA94","Acapulco","Green"],["C0E8D5","Aero Blue","Green"],
["745085","Affair","Violet"],["905E26","Afghan Tan","Yellow"],["5D8AA8","Air Force Blue","Blue"],
["BEB29A","Akaroa","Yellow"],["F2F0E6","Alabaster","Grey"],["E1DACB","Albescent White","Yellow"],
["954E2C","Alert Tan","Orange"],["F0F8FF","Alice Blue","Blue"],["E32636","Alizarin","Red"],
["1F6A7D","Allports","Blue"],["EED9C4","Almond","Yellow"],["9A8678","Almond Frost","Brown"],
["AD8A3B","Alpine","Yellow"],["CDC6C5","Alto","Grey"],["848789","Aluminium","Grey"],
["E52B50","Amaranth","Red"],["387B54","Amazon","Green"],["FFBF00","Amber","Yellow"],
["8A7D72","Americano","Brown"],["9966CC","Amethyst","Violet"],["95879C","Amethyst Smoke","Violet"],
["F5E6EA","Amour","Violet"],["7D9D72","Amulet","Green"],["8CCEEA","Anakiwa","Blue"],
["6C461F","Antique Brass","Orange"],["FAEBD7","Antique White","White"],["C68E3F","Anzac","Yellow"],
["D3A95C","Apache","Yellow"],["66B348","Apple","Green"],["A95249","Apple Blossom","Red"],
["DEEADC","Apple Green","Green"],["FBCEB1","Apricot","Orange"],["F7F0DB","Apricot White","Yellow"],
["00FFFF","Aqua","Blue"],["D9DDD5","Aqua Haze","Grey"],["E8F3E8","Aqua Spring","Green"],
["DBE4DC","Aqua Squeeze","Grey"],["7FFFD4","Aquamarine","Blue"],["274A5D","Arapawa","Blue"],
["484A46","Armadillo","Grey"],["4B5320","Army green","Green"],["827A67","Arrowtown","Yellow"],
["3B444B","Arsenic","Grey"],["BEBAA7","Ash","Green"],["7BA05B","Asparagus","Green"],
["EDD5A6","Astra","Yellow"],["376F89","Astral","Blue"],["445172","Astronaut","Blue"],
["214559","Astronaut Blue","Blue"],["DCDDDD","Athens Grey","Grey"],["D5CBB2","Aths Special","Yellow"],
["9CD03B","Atlantis","Green"],["2B797A","Atoll","Green"],["3D4B52","Atomic","Blue"],
["FF9966","Atomic Tangerine","Orange"],["9E6759","Au Chico","Brown"],["372528","Aubergine","Brown"],
["712F2C","Auburn","Brown"],["EFF8AA","Australian Mint","Green"],["95986B","Avocado","Green"],
["63775A","Axolotl","Green"],["F9C0C4","Azalea","Red"],["293432","Aztec","Green"],
["F0FFFF","Azure","Blue"],["6FFFFF","Baby Blue","Blue"],["25597F","Bahama Blue","Blue"],
["A9C01C","Bahia","Green"],["5C3317","Baker's Chocolate","Brown"],["849CA9","Bali Hai","Blue"],
["3C3D3E","Baltic Sea","Grey"],["FBE7B2","Banana Mania","Yellow"],["878466","Bandicoot","Green"],
["D2C61F","Barberry","Green"],["B6935C","Barley Corn","Yellow"],["F7E5B7","Barley White","Yellow"],
["452E39","Barossa","Violet"],["2C2C32","Bastille","Blue"],["51574F","Battleship Grey","Grey"],
["7BB18D","Bay Leaf","Green"],["353E64","Bay Of Many","Blue"],["8F7777","Bazaar","Brown"],
["EBB9B3","Beauty Bush","Red"],["926F5B","Beaver","Brown"],["E9D7AB","Beeswax","Yellow"],
["F5F5DC","Beige","Brown"],["86D2C1","Bermuda","Green"],["6F8C9F","Bermuda Grey","Blue"],
["BCBFA8","Beryl Green","Green"],["F4EFE0","Bianca","Yellow"],["334046","Big Stone","Blue"],
["3E8027","Bilbao","Green"],["AE99D2","Biloba Flower","Violet"],["3F3726","Birch","Yellow"],
["D0C117","Bird Flower","Green"],["2F3C53","Biscay","Blue"],["486C7A","Bismark","Blue"],
["B5AC94","Bison Hide","Yellow"],["FFE4C4","Bisque","Brown"],["3D2B1F","Bistre","Brown"],
["88896C","Bitter","Green"],["D2DB32","Bitter Lemon","Green"],["FE6F5E","Bittersweet","Orange"],
["E7D2C8","Bizarre","Orange"],["000000","Black","Black"],["232E26","Black Bean","Green"],
["2C3227","Black Forest","Green"],["E0DED7","Black Haze","Grey"],["332C22","Black Magic","Brown"],
["383740","Black Marlin","Blue"],["1E272C","Black Pearl","Blue"],["2C2D3C","Black Rock","Blue"],
["532934","Black Rose","Red"],["24252B","Black Russian","Grey"],["E5E6DF","Black Squeeze","Grey"],
["E5E4DB","Black White","Grey"],["43182F","Blackberry","Violet"],["2E183B","Blackcurrant","Violet"],
["D9D0C1","Blanc","Yellow"],["FFEBCD","Blanched Almond","Brown"],["EBE1CE","Bleach White","Yellow"],
["A3E3ED","Blizzard Blue","Blue"],["DFB1B6","Blossom","Red"],["0000FF","Blue","Blue"],
["62777E","Blue Bayoux","Blue"],["9999CC","Blue Bell","Blue"],["E3D6E9","Blue Chalk","Violet"],
["262B2F","Blue Charcoal","Blue"],["408F90","Blue Chill","Green"],["4B2D72","Blue Diamond","Violet"],
["35514F","Blue Dianne","Green"],["4B3C8E","Blue Gem","Violet"],["BDBACE","Blue Haze","Violet"],
["00626F","Blue Lagoon","Green"],["6A5BB1","Blue Marguerite","Violet"],["D8F0D2","Blue Romance","Green"],
["78857A","Blue Smoke","Green"],["166461","Blue Stone","Green"],["8A2BE2","Blue Violet","Violet"],
["1E3442","Blue Whale","Blue"],["3C4354","Blue Zodiac","Blue"],["305C71","Blumine","Blue"],
["B55067","Blush","Red"],["2A2725","Bokara Grey","Grey"],["79443B","Bole","Brown"],
["AEAEAD","Bombay","Grey"],["DFD7D2","Bon Jour","Grey"],["0095B6","Bondi Blue","Blue"],
["DBC2AB","Bone","Orange"],["4C1C24","Bordeaux","Red"],["4C3D4E","Bossanova","Violet"],
["438EAC","Boston Blue","Blue"],["92ACB4","Botticelli","Blue"],["254636","Bottle Green","Green"],
["7C817C","Boulder","Grey"],["A78199","Bouquet","Violet"],["AF6C3E","Bourbon","Orange"],
["5B3D27","Bracken","Brown"],["DCB68A","Brandy","Orange"],["C07C40","Brandy Punch","Orange"],
["B6857A","Brandy Rose","Red"],["B5A642","Brass","Yellow"],["517B78","Breaker Bay","Green"],
["C62D42","Brick Red","Red"],["F8EBDD","Bridal Heath","Orange"],["FAE6DF","Bridesmaid","Orange"],
["66FF00","Bright Green","Green"],["57595D","Bright Grey","Grey"],["922A31","Bright Red","Red"],
["ECBD2C","Bright Sun","Yellow"],["08E8DE","Bright Turquoise","Blue"],["FF55A3","Brilliant Rose","Red"],
["FB607F","Brink Pink","Red"],["004225","British Racing Green","Green"],["A79781","Bronco","Brown"],
["CD7F32","Bronze","Brown"],["584C25","Bronze Olive","Yellow"],["434C28","Bronzetone","Yellow"],
["EECC24","Broom","Yellow"],["A52A2A","Brown","Brown"],["53331E","Brown Bramble","Brown"],
["594537","Brown Derby","Brown"],["3C241B","Brown Pod","Brown"],["E6F2EA","Bubbles","Green"],
["6E5150","Buccaneer","Red"],["A5A88F","Bud","Green"],["BC9B1B","Buddha Gold","Yellow"],
["F0DC82","Buff","Yellow"],["482427","Bulgarian Rose","Red"],["75442B","Bull Shot","Orange"],
["292C2F","Bunker","Grey"],["2B3449","Bunting","Blue"],["800020","Burgundy","Red"],
["DEB887","Burly Wood","Brown"],["234537","Burnham","Green"],["D08363","Burning Sand","Orange"],
["582124","Burnt Crimson","Red"],["FF7034","Burnt Orange","Orange"],["E97451","Burnt Sienna","Brown"],
["8A3324","Burnt Umber","Brown"],["DA9429","Buttercup","Yellow"],["9D702E","Buttered Rum","Yellow"],
["68578C","Butterfly Bush","Violet"],["F6E0A4","Buttermilk","Yellow"],["F1EBDA","Buttery White","Yellow"],
["4A2E32","Cab Sav","Red"],["CD526C","Cabaret","Red"],["4C5544","Cabbage Pont","Green"],
["5B6F55","Cactus","Green"],["5F9EA0","Cadet Blue","Blue"],["984961","Cadillac","Red"],
["6A4928","Cafe Royale","Brown"],["D5B185","Calico","Brown"],["E98C3A","California","Orange"],
["3D7188","Calypso","Blue"],["206937","Camarone","Green"],["803A4B","Camelot","Red"],
["CCA483","Cameo","Brown"],["4F4D32","Camouflage","Yellow"],["78866B","Camouflage Green","Green"],
["D08A9B","Can Can","Red"],["FFFF99","Canary","Yellow"],["8E5164","Cannon Pink","Red"],
["4E5552","Cape Cod","Grey"],["FEE0A5","Cape Honey","Yellow"],["75482F","Cape Palliser","Orange"],
["AFC182","Caper","Green"],["592720","Caput Mortuum","Brown"],["FFD59A","Caramel","Yellow"],
["EBE5D5","Cararra","Green"],["1B3427","Cardin Green","Green"],["C41E3A","Cardinal","Red"],
["C99AA0","Careys Pink","Red"],["00CC99","Caribbean Green","Green"],["E68095","Carissma","Red"],
["F5F9CB","Carla","Green"],["960018","Carmine","Red"],["5B3A24","Carnaby Tan","Brown"],
["FFA6C9","Carnation Pink","Red"],["F8DBE0","Carousel Pink","Red"],["ED9121","Carrot Orange","Orange"],
["F0B253","Casablanca","Yellow"],["3F545A","Casal","Blue"],["8CA8A0","Cascade","Green"],
["D1B399","Cashmere","Brown"],["AAB5B8","Casper","Blue"],["44232F","Castro","Red"],
["273C5A","Catalina Blue","Blue"],["E0E4DC","Catskill White","Grey"],["E0B8B1","Cavern Pink","Red"],
["9271A7","Ce Soir","Violet"],["463430","Cedar","Brown"],["ACE1AF","Celadon","Green"],
["B4C04C","Celery","Green"],["D2D2C0","Celeste","Green"],["3A4E5F","Cello","Blue"],
["2B3F36","Celtic","Green"],["857158","Cement","Brown"],["DE3163","Cerise","Violet"],
["007BA7","Cerulean","Blue"],["2A52BE","Cerulean Blue","Blue"],["FDE9E0","Chablis","Red"],
["5A6E41","Chalet Green","Green"],["DFC281","Chalky","Yellow"],["475877","Chambray","Blue"],
["E8CD9A","Chamois","Yellow"],["EED9B6","Champagne","Yellow"],["EDB8C7","Chantilly","Red"],
["394043","Charade","Blue"],["464646","Charcoal","Grey"],["F8EADF","Chardon","Orange"],
["FFC878","Chardonnay","Yellow"],["A4DCE6","Charlotte","Blue"],["D0748B","Charm","Red"],
["7FFF00","Chartreuse","Green"],["DFFF00","Chartreuse Yellow","Yellow"],["419F59","Chateau Green","Green"],
["B3ABB6","Chatelle","Violet"],["2C5971","Chathams Blue","Blue"],["88A95B","Chelsea Cucumber","Green"],
["95532F","Chelsea Gem","Orange"],["DEC371","Chenin","Yellow"],["F5CD82","Cherokee","Yellow"],
["372D52","Cherry Pie","Violet"],["F5D7DC","Cherub","Red"],["B94E48","Chestnut","Brown"],
["666FB4","Chetwode Blue","Blue"],["5B5D56","Chicago","Grey"],["F0F5BB","Chiffon","Green"],
["D05E34","Chilean Fire","Orange"],["F9F7DE","Chilean Heath","Green"],["FBF3D3","China Ivory","Green"],
["B8AD8A","Chino","Yellow"],["9DD3A8","Chinook","Green"],["D2691E","Chocolate","Brown"],
["382161","Christalle","Violet"],["71A91D","Christi","Green"],["BF652E","Christine","Orange"],
["CAC7B7","Chrome White","Green"],["7D4E38","Cigar","Brown"],["242A2E","Cinder","Grey"],
["FBD7CC","Cinderella","Red"],["E34234","Cinnabar","Red"],["5D3B2E","Cioccolato","Brown"],
["8E9A21","Citron","Green"],["9FB70A","Citrus","Green"],["D2B3A9","Clam Shell","Orange"],
["6E2233","Claret","Red"],["F4C8DB","Classic Rose","Violet"],["897E59","Clay Creek","Yellow"],
["DFEFEA","Clear Day","Green"],["463623","Clinker","Brown"],["C2BCB1","Cloud","Yellow"],
["353E4F","Cloud Burst","Blue"],["B0A99F","Cloudy","Brown"],["47562F","Clover","Green"],
["0047AB","Cobalt","Blue"],["4F3835","Cocoa Bean","Red"],["35281E","Cocoa Brown","Brown"],
["E1DABB","Coconut Cream","Green"],["2D3032","Cod Grey","Grey"],["726751","Coffee","Yellow"],
["362D26","Coffee Bean","Brown"],["9A463D","Cognac","Red"],["3C2F23","Cola","Brown"],
["9D8ABF","Cold Purple","Violet"],["CAB5B2","Cold Turkey","Red"],["9BDDFF","Columbia Blue","Blue"],
["636373","Comet","Blue"],["4C785C","Como","Green"],["A0B1AE","Conch","Green"],
["827F79","Concord","Grey"],["D2D1CD","Concrete","Grey"],["DDCB46","Confetti","Green"],
["654D49","Congo Brown","Brown"],["B1DD52","Conifer","Green"],["C16F68","Contessa","Red"],
["DA8A67","Copper","Red"],["77422C","Copper Canyon","Orange"],["996666","Copper Rose","Violet"],
["95524C","Copper Rust","Red"],["FF7F50","Coral","Orange"],["F5D0C9","Coral Candy","Red"],
["FF4040","Coral Red","Red"],["AB6E67","Coral Tree","Red"],["404D49","Corduroy","Green"],
["BBB58D","Coriander","Green"],["5A4C42","Cork","Brown"],["FBEC5D","Corn","Yellow"],
["F8F3C4","Corn Field","Green"],["42426F","Corn Flower Blue","Blue"],["8D702A","Corn Harvest","Yellow"],
["FFF8DC","Corn Silk","Yellow"],["93CCEA","Cornflower","Blue"],["6495ED","Cornflower Blue","Blue"],
["E9BA81","Corvette","Orange"],["794D60","Cosmic","Violet"],["E1F8E7","Cosmic Latte","White"],
["FCD5CF","Cosmos","Red"],["625D2A","Costa Del Sol","Green"],["FFB7D5","Cotton Candy","Red"],
["BFBAAF","Cotton Seed","Yellow"],["1B4B35","County Green","Green"],["443736","Cowboy","Brown"],
["87382F","Crab Apple","Red"],["A65648","Crail","Red"],["DB5079","Cranberry","Red"],
["4D3E3C","Crater Brown","Brown"],["FFFDD0","Cream","White"],["FFE39B","Cream Brulee","Yellow"],
["EEC051","Cream Can","Yellow"],["393227","Creole","Brown"],["77712B","Crete","Green"],
["DC143C","Crimson","Red"],["706950","Crocodile","Yellow"],["763C33","Crown Of Thorns","Red"],
["B4E2D5","Cruise","Green"],["165B31","Crusoe","Green"],["F38653","Crusta","Orange"],
["784430","Cumin","Orange"],["F5F4C1","Cumulus","Green"],["F5B2C5","Cupid","Red"],
["3D85B8","Curious Blue","Blue"],["5C8173","Cutty Sark","Green"],["0F4645","Cyprus","Green"],
["EDD2A4","Dairy Cream","Yellow"],["5B3E90","Daisy Bush","Violet"],["664A2D","Dallas","Brown"],
["FED85D","Dandelion","Yellow"],["5B89C0","Danube","Blue"],["00008B","Dark Blue","Blue"],
["654321","Dark Brown","Brown"],["08457E","Dark Cerulean","Blue"],["986960","Dark Chestnut","Red"],
["CD5B45","Dark Coral","Orange"],["008B8B","Dark Cyan","Green"],["B8860B","Dark Goldenrod","Yellow"],
["A9A9A9","Dark Gray","Grey"],["013220","Dark Green","Green"],["4A766E","Dark Green Copper","Green"],
["BDB76B","Dark Khaki","Yellow"],["8B008B","Dark Magenta","Violet"],["556B2F","Dark Olive Green","Green"],
["FF8C00","Dark Orange","Orange"],["9932CC","Dark Orchid","Violet"],["03C03C","Dark Pastel Green","Green"],
["E75480","Dark Pink","Red"],["871F78","Dark Purple","Violet"],["8B0000","Dark Red","Red"],
["45362B","Dark Rum","Brown"],["E9967A","Dark Salmon","Orange"],["8FBC8F","Dark Sea Green","Green"],
["465352","Dark Slate","Green"],["483D8B","Dark Slate Blue","Blue"],["2F4F4F","Dark Slate Grey","Grey"],
["177245","Dark Spring Green","Green"],["97694F","Dark Tan","Brown"],["FFA812","Dark Tangerine","Orange"],
["00CED1","Dark Turquoise","Blue"],["9400D3","Dark Violet","Violet"],["855E42","Dark Wood","Brown"],
["788878","Davy's Grey","Grey"],["9F9D91","Dawn","Green"],["E6D6CD","Dawn Pink","Orange"],
["85CA87","De York","Green"],["CCCF82","Deco","Green"],["E36F8A","Deep Blush","Red"],
["51412D","Deep Bronze","Brown"],["DA3287","Deep Cerise","Violet"],["193925","Deep Fir","Green"],
["343467","Deep Koamaru","Violet"],["9955BB","Deep Lilac","Violet"],["CC00CC","Deep Magenta","Violet"],
["FF1493","Deep Pink","Red"],["167E65","Deep Sea","Green"],["00BFFF","Deep Sky Blue","Blue"],
["19443C","Deep Teal","Green"],["B5998E","Del Rio","Brown"],["486531","Dell","Green"],
["999B95","Delta","Grey"],["8272A4","Deluge","Violet"],["1560BD","Denim","Blue"],
["F9E4C6","Derby","Yellow"],["A15F3B","Desert","Orange"],["EDC9AF","Desert Sand","Brown"],
["EDE7E0","Desert Storm","Grey"],["E7F2E9","Dew","Green"],["322C2B","Diesel","Grey"],
["696969","Dim Gray","Grey"],["607C47","Dingley","Green"],["892D4F","Disco","Red"],
["CD8431","Dixie","Yellow"],["1E90FF","Dodger Blue","Blue"],["F5F171","Dolly","Green"],
["6A6873","Dolphin","Violet"],["6C5B4C","Domino","Brown"],["5A4F51","Don Juan","Brown"],
["816E5C","Donkey Brown","Brown"],["6E5F56","Dorado","Brown"],["E4CF99","Double Colonial White","Yellow"],
["E9DCBE","Double Pearl Lusta","Yellow"],["D2C3A3","Double Spanish White","Yellow"],["777672","Dove Grey","Grey"],
["6FD2BE","Downy","Green"],["FBEB9B","Drover","Yellow"],["514F4A","Dune","Grey"],
["E5CAC0","Dust Storm","Orange"],["AC9B9B","Dusty Grey","Grey"],["F0DFBB","Dutch White","Yellow"],
["B0AC94","Eagle","Green"],["B8A722","Earls Green","Green"],["FBF2DB","Early Dawn","Yellow"],
["47526E","East Bay","Blue"],["AA8CBC","East Side","Violet"],["00879F","Eastern Blue","Blue"],
["E6D8D4","Ebb","Red"],["313337","Ebony","Grey"],["323438","Ebony Clay","Grey"],
["A4AFCD","Echo Blue","Blue"],["3F3939","Eclipse","Grey"],["C2B280","Ecru","Brown"],
["D6D1C0","Ecru White","Green"],["C96138","Ecstasy","Orange"],["266255","Eden","Green"],
["C1D8C5","Edgewater","Green"],["97A49A","Edward","Green"],["F9E4C5","Egg Sour","Yellow"],
["990066","Eggplant","Violet"],["1034A6","Egyptian Blue","Blue"],["39392C","El Paso","Green"],
["8F4E45","El Salva","Red"],["7DF9FF","Electric Blue","Blue"],["6600FF","Electric Indigo","Violet"],
["CCFF00","Electric Lime","Green"],["BF00FF","Electric Purple","Violet"],["243640","Elephant","Blue"],
["1B8A6B","Elf Green","Green"],["297B76","Elm","Green"],["50C878","Emerald","Green"],
["6E3974","Eminence","Violet"],["50494A","Emperor","Grey"],["7C7173","Empress","Grey"],
["29598B","Endeavour","Blue"],["F5D752","Energy Yellow","Yellow"],["274234","English Holly","Green"],
["8BA58F","Envy","Green"],["DAB160","Equator","Yellow"],["4E312D","Espresso","Red"],
["2D2F28","Eternity","Green"],["329760","Eucalyptus","Green"],["CDA59C","Eunry","Red"],
["26604F","Evening Sea","Green"],["264334","Everglade","Green"],["F3E5DC","Fair Pink","Orange"],
["6E5A5B","Falcon","Brown"],["C19A6B","Fallow","Brown"],["801818","Falu Red","Red"],
["F2E6DD","Fantasy","Orange"],["625665","Fedora","Violet"],["A5D785","Feijoa","Green"],
["4D5D53","Feldgrau","Grey"],["D19275","Feldspar","Red"],["63B76C","Fern","Green"],
["4F7942","Fern Green","Green"],["876A68","Ferra","Brown"],["EACC4A","Festival","Yellow"],
["DBE0D0","Feta","Green"],["B1592F","Fiery Orange","Orange"],["636F22","Fiji Green","Green"],
["75785A","Finch","Green"],["61755B","Finlandia","Green"],["694554","Finn","Violet"],
["4B5A62","Fiord","Blue"],["8F3F2A","Fire","Orange"],["B22222","Fire Brick","Red"],
["E09842","Fire Bush","Yellow"],["CE1620","Fire Engine Red","Red"],["314643","Firefly","Green"],
["BE5C48","Flame Pea","Orange"],["86282E","Flame Red","Red"],["EA8645","Flamenco","Orange"],
["E1634F","Flamingo","Orange"],["EEDC82","Flax","Yellow"],["716E61","Flint","Green"],
["7A2E4D","Flirt","Red"],["FFFAF0","Floral White","White"],["D0EAE8","Foam","Green"],
["D5C7E8","Fog","Violet"],["A7A69D","Foggy Grey","Grey"],["228B22","Forest Green","Green"],
["FDEFDB","Forget Me Not","Yellow"],["65ADB2","Fountain Blue","Blue"],["FFD7A0","Frangipani","Yellow"],
["029D74","Free Speech Aquamarine","Green"],["4156C5","Free Speech Blue","Blue"],["09F911","Free Speech Green","Green"],
["E35BD8","Free Speech Magenta","Red"],["C00000","Free Speech Red","Red"],["BFBDC1","French Grey","Grey"],
["DEB7D9","French Lilac","Violet"],["A4D2E0","French Pass","Blue"],["F64A8A","French Rose","Red"],
["86837A","Friar Grey","Grey"],["B4E1BB","Fringy Flower","Green"],["E56D75","Froly","Red"],
["E1E4C5","Frost","Green"],["E2F2E4","Frosted Mint","Green"],["DBE5D2","Frostee","Green"],
["4BA351","Fruit Salad","Green"],["C154C1","Fuchsia","Violet"],["FF77FF","Fuchsia Pink","Red"],
["C2D62E","Fuego","Green"],["D19033","Fuel Yellow","Yellow"],["335083","Fun Blue","Blue"],
["15633D","Fun Green","Green"],["3C3B3C","Fuscous Grey","Grey"],["C45655","Fuzzy Wuzzy Brown","Brown"],
["2C4641","Gable Green","Green"],["DCDCDC","Gainsboro","White"],["DCD7D1","Gallery","Grey"],
["D8A723","Galliano","Yellow"],["E49B0F","Gamboge","Yellow"],["C5832E","Geebung","Yellow"],
["31796D","Genoa","Green"],["E77B75","Geraldine","Red"],["CBD0CF","Geyser","Grey"],
["C0BFC7","Ghost","Blue"],["F8F8FF","Ghost White","White"],["564786","Gigas","Violet"],
["B9AD61","Gimblet","Green"],["D9DFCD","Gin","Green"],["F8EACA","Gin Fizz","Yellow"],
["EBD4AE","Givry","Yellow"],["78B1BF","Glacier","Blue"],["5F8151","Glade Green","Green"],
["786E4C","Go Ben","Yellow"],["34533D","Goblin","Green"],["FFD700","Gold","Yellow"],
["D56C30","Gold Drop","Orange"],["E2B227","Gold Tips","Yellow"],["CA8136","Golden Bell","Orange"],
["996515","Golden Brown","Brown"],["F1CC2B","Golden Dream","Yellow"],["EBDE31","Golden Fizz","Green"],
["F9D77E","Golden Glow","Yellow"],["FCC200","Golden Poppy","Yellow"],["EACE6A","Golden Sand","Yellow"],
["FFC152","Golden Tainoi","Yellow"],["FFDF00","Golden Yellow","Yellow"],["DBDB70","Goldenrod","Yellow"],
["373332","Gondola","Grey"],["29332B","Gordons Green","Green"],["FDE336","Gorse","Green"],
["399F86","Gossamer","Green"],["9FD385","Gossip","Green"],["698890","Gothic","Blue"],
["51559B","Governor Bay","Blue"],["CAB8A2","Grain Brown","Yellow"],["FFCD73","Grandis","Yellow"],
["8B8265","Granite Green","Yellow"],["C5E7CD","Granny Apple","Green"],["7B948C","Granny Smith","Green"],
["9DE093","Granny Smith Apple","Green"],["413D4B","Grape","Violet"],["383428","Graphite","Yellow"],
["4A4B46","Gravel","Grey"],["008000","Green","Green"],["3E6334","Green House","Green"],
["393D2A","Green Kelp","Green"],["526B2D","Green Leaf","Green"],["BFC298","Green Mist","Green"],
["266242","Green Pea","Green"],["9CA664","Green Smoke","Green"],["A9AF99","Green Spring","Green"],
["23414E","Green Vogue","Blue"],["2C2D24","Green Waterloo","Green"],["DEDDCB","Green White","Green"],
["ADFF2F","Green Yellow","Green"],["C14D36","Grenadier","Orange"],["808080","Grey","Grey"],
["9FA3A7","Grey Chateau","Grey"],["BDBAAE","Grey Nickel","Green"],["D1D3CC","Grey Nurse","Grey"],
["A19A7F","Grey Olive","Yellow"],["9391A0","Grey Suit","Blue"],["465945","Grey-Asparagus","Green"],
["952E31","Guardsman Red","Red"],["343F5C","Gulf Blue","Blue"],["74B2A8","Gulf Stream","Green"],
["A4ADB0","Gull Grey","Grey"],["ACC9B2","Gum Leaf","Green"],["718F8A","Gumbo","Green"],
["484753","Gun Powder","Violet"],["2C3539","Gunmetal","Blue"],["7A7C76","Gunsmoke","Grey"],
["989171","Gurkha","Green"],["9E8022","Hacienda","Yellow"],["633528","Hairy Heath","Brown"],
["2C2A35","Haiti","Violet"],["EDE7C8","Half And Half","Green"],["558F93","Half Baked","Blue"],
["F2E5BF","Half Colonial White","Yellow"],["FBF0D6","Half Dutch White","Yellow"],["F1EAD7","Half Pearl Lusta","Yellow"],
["E6DBC7","Half Spanish White","Yellow"],["E8D4A2","Hampton","Yellow"],["5218FA","Han Purple","Violet"],
["3FFF00","Harlequin","Green"],["C93413","Harley Davidson Orange","Orange"],["CBCEC0","Harp","Green"],
["EAB76A","Harvest Gold","Yellow"],["3B2B2C","Havana","Brown"],["5784C1","Havelock Blue","Blue"],
["99522B","Hawaiian Tan","Orange"],["D2DAED","Hawkes Blue","Blue"],["4F2A2C","Heath","Red"],
["AEBBC1","Heather","Blue"],["948C7E","Heathered Grey","Brown"],["46473E","Heavy Metal","Grey"],
["DF73FF","Heliotrope","Violet"],["69684B","Hemlock","Yellow"],["987D73","Hemp","Brown"],
["928C3C","Highball","Green"],["7A9461","Highland","Green"],["A7A07E","Hillary","Green"],
["736330","Himalaya","Yellow"],["DFF1D6","Hint Of Green","Green"],["F5EFEB","Hint Of Red","Grey"],
["F6F5D7","Hint Of Yellow","Green"],["49889A","Hippie Blue","Blue"],["608A5A","Hippie Green","Green"],
["AB495C","Hippie Pink","Red"],["A1A9A8","Hit Grey","Grey"],["FDA470","Hit Pink","Orange"],
["BB8E34","Hokey Pokey","Yellow"],["647D86","Hoki","Blue"],["25342B","Holly","Green"],
["F400A1","Hollywood Cerise","Red"],["5C3C6D","Honey Flower","Violet"],["F0FFF0","Honeydew","White"],
["E8ED69","Honeysuckle","Green"],["CD6D93","Hopbush","Violet"],["648894","Horizon","Blue"],
["6D562C","Horses Neck","Yellow"],["815B28","Hot Curry","Yellow"],["FF00CC","Hot Magenta","Red"],
["FF69B4","Hot Pink","Red"],["4E2E53","Hot Purple","Violet"],["A7752C","Hot Toddy","Yellow"],
["CEEFE4","Humming Bird","Green"],["355E3B","Hunter Green","Green"],["8B7E77","Hurricane","Brown"],
["B2994B","Husk","Yellow"],["AFE3D6","Ice Cold","Green"],["CAE1D9","Iceberg","Green"],
["EF95AE","Illusion","Red"],["B0E313","Inch Worm","Green"],["CD5C5C","Indian Red","Red"],
["4F301F","Indian Tan","Brown"],["4B0082","Indigo","Violet"],["9C5B34","Indochine","Orange"],
["002FA7","International Klein Blue","Blue"],["FF4F00","International Orange","Orange"],["03B4C8","Iris Blue","Blue"],
["62422B","Irish Coffee","Brown"],["CBCDCD","Iron","Grey"],["706E66","Ironside Grey","Grey"],
["865040","Ironstone","Brown"],["009900","Islamic Green","Green"],["F8EDDB","Island Spice","Yellow"],
["FFFFF0","Ivory","White"],["3D325D","Jacarta","Violet"],["413628","Jacko Bean","Brown"],
["3D3F7D","Jacksons Purple","Violet"],["00A86B","Jade","Green"],["E27945","Jaffa","Orange"],
["CAE7E2","Jagged Ice","Green"],["3F2E4C","Jagger","Violet"],["29292F","Jaguar","Blue"],
["674834","Jambalaya","Brown"],["2F7532","Japanese Laurel","Green"],["CE7259","Japonica","Orange"],
["259797","Java","Green"],["5F2C2F","Jazz","Red"],["A50B5E","Jazzberry Jam","Red"],
["44798E","Jelly Bean","Blue"],["BBD0C9","Jet Stream","Green"],["136843","Jewel","Green"],
["463D3E","Jon","Grey"],["EEF293","Jonquil","Green"],["7AAAE0","Jordy Blue","Blue"],
["5D5346","Judge Grey","Brown"],["878785","Jumbo","Grey"],["29AB87","Jungle Green","Green"],
["B0C4C4","Jungle Mist","Green"],["74918E","Juniper","Green"],["DCBFAC","Just Right","Orange"],
["6C5E53","Kabul","Brown"],["245336","Kaitoke Green","Green"],["C5C3B0","Kangaroo","Green"],
["2D2D24","Karaka","Green"],["FEDCC1","Karry","Orange"],["576D8E","Kashmir Blue","Blue"],
["4CBB17","Kelly Green","Green"],["4D503C","Kelp","Green"],["6C322E","Kenyan Copper","Red"],
["5FB69C","Keppel","Green"],["F0E68C","Khaki","Yellow"],["BFC0AB","Kidnapper","Green"],
["3A3532","Kilamanjaro","Grey"],["49764F","Killarney","Green"],["695D87","Kimberly","Violet"],
["583580","Kingfisher Daisy","Violet"],["E093AB","Kobi","Red"],["7B785A","Kokoda","Green"],
["804E2C","Korma","Orange"],["FEB552","Koromiko","Yellow"],["F9D054","Kournikova","Yellow"],
["428929","La Palma","Green"],["BAC00E","La Rioja","Green"],["C6DA36","Las Palmas","Green"],
["C6A95E","Laser","Yellow"],["FFFF66","Laser Lemon","Yellow"],["6E8D71","Laurel","Green"],
["E6E6FA","Lavender","Violet"],["CCCCFF","Lavender Blue","Blue"],["FFF0F5","Lavender Blush","Violet"],
["BDBBD7","Lavender Grey","Grey"],["FBAED2","Lavender Pink","Red"],["FBA0E3","Lavender Rose","Red"],
["7CFC00","Lawn Green","Green"],["906A54","Leather","Brown"],["FDE910","Lemon","Yellow"],
["FFFACD","Lemon Chiffon","Yellow"],["968428","Lemon Ginger","Yellow"],["999A86","Lemon Grass","Green"],
["2E3749","Licorice","Blue"],["ADD8E6","Light Blue","Blue"],["F08080","Light Coral","Orange"],
["E0FFFF","Light Cyan","Blue"],["EEDD82","Light Goldenrod","Yellow"],["FAFAD2","Light Goldenrod Yellow","Yellow"],
["90EE90","Light Green","Green"],["D3D3D3","Light Grey","Grey"],["FFB6C1","Light Pink","Red"],
["FFA07A","Light Salmon","Orange"],["20B2AA","Light Sea Green","Green"],["87CEFA","Light Sky Blue","Blue"],
["8470FF","Light Slate Blue","Blue"],["778899","Light Slate Grey","Grey"],["B0C4DE","Light Steel Blue","Blue"],
["856363","Light Wood","Brown"],["FFFFE0","Light Yellow","Yellow"],["F7A233","Lightning Yellow","Yellow"],
["C8A2C8","Lilac","Violet"],["9470C4","Lilac Bush","Violet"],["C19FB3","Lily","Violet"],
["E9EEEB","Lily White","Grey"],["7AAC21","Lima","Green"],["00FF00","Lime","Green"],
["32CD32","Lime Green","Green"],["5F9727","Limeade","Green"],["89AC27","Limerick","Green"],
["FAF0E6","Linen","White"],["C7CDD8","Link Water","Blue"],["962C54","Lipstick","Red"],
["534B4F","Liver","Brown"],["312A29","Livid Brown","Brown"],["DBD9C2","Loafer","Green"],
["B3BBB7","Loblolly","Green"],["489084","Lochinvar","Green"],["316EA0","Lochmara","Blue"],
["A2A580","Locust","Green"],["393E2E","Log Cabin","Green"],["9D9CB4","Logan","Blue"],
["B9ACBB","Lola","Violet"],["AE94AB","London Hue","Violet"],["522426","Lonestar","Red"],
["8B504B","Lotus","Brown"],["4C3347","Loulou","Violet"],["AB9A1C","Lucky","Green"],
["292D4F","Lucky Point","Blue"],["4E5541","Lunar Green","Green"],["782E2C","Lusty","Red"],
["AB8D3F","Luxor Gold","Yellow"],["697D89","Lynch","Blue"],["CBE8E8","Mabel","Blue"],
["FFB97B","Macaroni And Cheese","Orange"],["B7E3A8","Madang","Green"],["2D3C54","Madison","Blue"],
["473E23","Madras","Brown"],["FF00FF","Magenta","Violet"],["AAF0D1","Magic Mint","Green"],
["F8F4FF","Magnolia","White"],["CA3435","Mahogany","Brown"],["A56531","Mai Tai","Orange"],
["2A2922","Maire","Yellow"],["E3B982","Maize","Yellow"],["695F50","Makara","Brown"],
["505555","Mako","Grey"],["0BDA51","Malachite","Green"],["97976F","Malachite Green","Green"],
["66B7E1","Malibu","Blue"],["3A4531","Mallard","Green"],["A59784","Malta","Brown"],
["766D7C","Mamba","Violet"],["8D90A1","Manatee","Blue"],["B57B2E","Mandalay","Yellow"],
["8E2323","Mandarin Orange","Orange"],["CD525B","Mandy","Red"],["F5B799","Mandys Pink","Orange"],
["E77200","Mango Tango","Orange"],["E2AF80","Manhattan","Orange"],["7FC15C","Mantis","Green"],
["96A793","Mantle","Green"],["E4DB55","Manz","Green"],["352235","Mardi Gras","Violet"],
["B88A3D","Marigold","Yellow"],["42639F","Mariner","Blue"],["800000","Maroon","Brown"],
["2B2E26","Marshland","Green"],["B7A8A3","Martini","Brown"],["3C3748","Martinique","Violet"],
["EBC881","Marzipan","Yellow"],["57534B","Masala","Brown"],["365C7D","Matisse","Blue"],
["8E4D45","Matrix","Red"],["524B4B","Matterhorn","Grey"],["E0B0FF","Mauve","Violet"],
["915F6D","Mauve Taupe","Red"],["F091A9","Mauvelous","Red"],["C8B1C0","Maverick","Violet"],
["73C2FB","Maya Blue","Blue"],["8C6338","McKenzie","Orange"],["66CDAA","Medium Aquamarine","Blue"],
["0000CD","Medium Blue","Blue"],["AF4035","Medium Carmine","Red"],["EAEAAE","Medium Goldenrod","Yellow"],
["BA55D3","Medium Orchid","Violet"],["9370DB","Medium Purple","Violet"],["3CB371","Medium Sea Green","Green"],
["7B68EE","Medium Slate Blue","Blue"],["00FA9A","Medium Spring Green","Green"],["48D1CC","Medium Turquoise","Blue"],
["C71585","Medium Violet Red","Red"],["A68064","Medium Wood","Brown"],["E0B7C2","Melanie","Red"],
["342931","Melanzane","Violet"],["FEBAAD","Melon","Red"],["C3B9DD","Melrose","Violet"],
["D5D2D1","Mercury","Grey"],["E1DBD0","Merino","Yellow"],["4F4E48","Merlin","Grey"],
["73343A","Merlot","Red"],["554A3C","Metallic Bronze","Red"],["6E3D34","Metallic Copper","Red"],
["D4AF37","Metallic Gold","Yellow"],["BB7431","Meteor","Orange"],["4A3B6A","Meteorite","Violet"],
["9B3D3D","Mexican Red","Red"],["666A6D","Mid Grey","Grey"],["21303E","Midnight","Blue"],
["191970","Midnight Blue","Blue"],["21263A","Midnight Express","Blue"],["242E28","Midnight Moss","Green"],
["3F3623","Mikado","Brown"],["F6F493","Milan","Green"],["9E3332","Milano Red","Red"],
["F3E5C0","Milk Punch","Yellow"],["DCD9CD","Milk White","Grey"],["595648","Millbrook","Brown"],
["F5F5CC","Mimosa","Green"],["DAEA6F","Mindaro","Green"],["373E41","Mine Shaft","Blue"],
["506355","Mineral Green","Green"],["407577","Ming","Green"],["3E3267","Minsk","Violet"],
["F5FFFA","Mint Cream","White"],["98FF98","Mint Green","Green"],["E0D8A7","Mint Julep","Green"],
["C6EADD","Mint Tulip","Green"],["373F43","Mirage","Blue"],["A5A9B2","Mischka","Blue"],
["BAB9A9","Mist Grey","Grey"],["FFE4E1","Misty Rose","Violet"],["605A67","Mobster","Violet"],
["582F2B","Moccaccino","Red"],["FFE4B5","Moccasin","Yellow"],["6F372D","Mocha","Red"],
["97463C","Mojo","Red"],["FF9889","Mona Lisa","Red"],["6B252C","Monarch","Red"],
["554D42","Mondo","Brown"],["A58B6F","Mongoose","Brown"],["7A7679","Monsoon","Grey"],
["393B3C","Montana","Grey"],["7AC5B4","Monte Carlo","Green"],["8378C7","Moody Blue","Violet"],
["F5F3CE","Moon Glow","Green"],["CECDB8","Moon Mist","Green"],["C0B2D7","Moon Raker","Violet"],
["F0C420","Moon Yellow","Yellow"],["9ED1D3","Morning Glory","Blue"],["442D21","Morocco Brown","Brown"],
["565051","Mortar","Grey"],["005F5B","Mosque","Green"],["ADDFAD","Moss Green","Green"],
["1AB385","Mountain Meadow","Green"],["A09F9C","Mountain Mist","Grey"],["997A8D","Mountbatten Pink","Violet"],
["A9844F","Muddy Waters","Yellow"],["9E7E53","Muesli","Brown"],["C54B8C","Mulberry","Violet"],
["884F40","Mule Fawn","Brown"],["524D5B","Mulled Wine","Violet"],["FFDB58","Mustard","Yellow"],
["D68B80","My Pink","Red"],["FDAE45","My Sin","Yellow"],["21421E","Myrtle","Green"],
["D8DDDA","Mystic","Grey"],["4E5D4E","Nandor","Green"],["A39A87","Napa","Yellow"],
["E9E6DC","Narvik","Green"],["FFDEAD","Navajo White","Brown"],["000080","Navy","Blue"],
["0066CC","Navy Blue","Blue"],["B8C6BE","Nebula","Green"],["EEC7A2","Negroni","Orange"],
["4D4DFF","Neon Blue","Blue"],["FF9933","Neon Carrot","Orange"],["FF6EC7","Neon Pink","Violet"],
["93AAB9","Nepal","Blue"],["77A8AB","Neptune","Green"],["252525","Nero","Grey"],
["AAA583","Neutral Green","Green"],["666F6F","Nevada","Grey"],["6D3B24","New Amber","Orange"],
["00009C","New Midnight Blue","Blue"],["E4C385","New Orleans","Yellow"],["EBC79E","New Tan","Brown"],
["DD8374","New York Pink","Red"],["29A98B","Niagara","Green"],["332E2E","Night Rider","Grey"],
["A23D54","Night Shadz","Red"],["253F4E","Nile Blue","Blue"],["A99D9D","Nobel","Grey"],
["A19986","Nomad","Yellow"],["1D393C","Nordic","Blue"],["A4B88F","Norway","Green"],
["BC9229","Nugget","Yellow"],["7E4A3B","Nutmeg","Brown"],["FCEDC5","Oasis","Yellow"],
["008F70","Observatory","Green"],["4CA973","Ocean Green","Green"],["CC7722","Ochre","Brown"],
["DFF0E2","Off Green","Green"],["FAF3DC","Off Yellow","Yellow"],["313330","Oil","Grey"],
["8A3335","Old Brick","Red"],["73503B","Old Copper","Red"],["CFB53B","Old Gold","Yellow"],
["FDF5E6","Old Lace","White"],["796878","Old Lavender","Violet"],["C02E4C","Old Rose","Red"],
["808000","Olive","Green"],["6B8E23","Olive Drab","Green"],["B5B35C","Olive Green","Green"],
["888064","Olive Haze","Yellow"],["747028","Olivetone","Green"],["9AB973","Olivine","Orange"],
["C2E6EC","Onahau","Blue"],["48412B","Onion","Yellow"],["A8C3BC","Opal","Green"],
["987E7E","Opium","Brown"],["395555","Oracle","Green"],["FFA500","Orange","Orange"],
["FFA000","Orange Peel","Orange"],["FF4500","Orange Red","Orange"],["A85335","Orange Roughy","Orange"],
["EAE3CD","Orange White","Yellow"],["DA70D6","Orchid","Violet"],["F1EBD9","Orchid White","Yellow"],
["255B77","Orient","Blue"],["C28E88","Oriental Pink","Red"],["D2D3B3","Orinoco","Green"],
["818988","Oslo Grey","Grey"],["D3DBCB","Ottoman","Green"],["2D383A","Outer Space","Grey"],
["FF6037","Outrageous Orange","Orange"],["28353A","Oxford Blue","Blue"],["6D9A78","Oxley","Green"],
["D1EAEA","Oyster Bay","Blue"],["D4B5B0","Oyster Pink","Red"],["864B36","Paarl","Orange"],
["7A715C","Pablo","Yellow"],["009DC4","Pacific Blue","Blue"],["4F4037","Paco","Brown"],
["7EB394","Padua","Green"],["682860","Palatinate Purple","Violet"],["987654","Pale Brown","Brown"],
["DDADAF","Pale Chestnut","Red"],["ABCDEF","Pale Cornflower Blue","Blue"],["EEE8AA","Pale Goldenrod","Yellow"],
["98FB98","Pale Green","Green"],["BDCAA8","Pale Leaf","Green"],["F984E5","Pale Magenta","Violet"],
["9C8D72","Pale Oyster","Brown"],["FADADD","Pale Pink","Red"],["F9F59F","Pale Prim","Green"],
["EFD6DA","Pale Rose","Red"],["636D70","Pale Sky","Blue"],["C3BEBB","Pale Slate","Grey"],
["BC987E","Pale Taupe","Grey"],["AFEEEE","Pale Turquoise","Blue"],["DB7093","Pale Violet Red","Red"],
["20392C","Palm Green","Green"],["36482F","Palm Leaf","Green"],["EAE4DC","Pampas","Grey"],
["EBF7E4","Panache","Green"],["DFB992","Pancho","Orange"],["544F3A","Panda","Yellow"],
["FFEFD5","Papaya Whip","Yellow"],["7C2D37","Paprika","Red"],["488084","Paradiso","Green"],
["D0C8B0","Parchment","Yellow"],["FBEB50","Paris Daisy","Green"],["312760","Paris M","Violet"],
["BFCDC0","Paris White","Green"],["305D35","Parsley","Green"],["77DD77","Pastel Green","Green"],
["639283","Patina","Green"],["D3E5EF","Pattens Blue","Blue"],["2A2551","Paua","Violet"],
["BAAB87","Pavlova","Yellow"],["404048","Payne's Grey","Grey"],["FFCBA4","Peach","Orange"],
["FFDAB9","Peach Puff","Yellow"],["FFCC99","Peach-Orange","Orange"],["FADFAD","Peach-Yellow","Yellow"],
["7A4434","Peanut","Brown"],["D1E231","Pear","Yellow"],["DED1C6","Pearl Bush","Orange"],
["EAE0C8","Pearl Lusta","Yellow"],["766D52","Peat","Yellow"],["2599B2","Pelorous","Blue"],
["D7E7D0","Peppermint","Green"],["ACB9E8","Perano","Blue"],["C2A9DB","Perfume","Violet"],
["ACB6B2","Periglacial Blue","Green"],["C3CDE6","Periwinkle","Blue"],["1C39BB","Persian Blue","Blue"],
["00A693","Persian Green","Green"],["32127A","Persian Indigo","Violet"],["F77FBE","Persian Pink","Red"],
["683332","Persian Plum","Red"],["CC3333","Persian Red","Red"],["FE28A2","Persian Rose","Red"],
["EC5800","Persimmon","Red"],["CD853F","Peru","Brown"],["733D1F","Peru Tan","Orange"],
["7A7229","Pesto","Yellow"],["DA9790","Petite Orchid","Red"],["91A092","Pewter","Green"],
["826663","Pharlap","Brown"],["F8EA97","Picasso","Green"],["5BA0D0","Picton Blue","Blue"],
["FDD7E4","Pig Pink","Red"],["00A550","Pigment Green","Green"],["756556","Pine Cone","Brown"],
["BDC07E","Pine Glade","Green"],["01796F","Pine Green","Green"],["2A2F23","Pine Tree","Green"],
["FFC0CB","Pink","Red"],["FF66FF","Pink Flamingo","Red"],["D8B4B6","Pink Flare","Red"],
["F6CCD7","Pink Lace","Red"],["F3D7B6","Pink Lady","Orange"],["BFB3B2","Pink Swan","Grey"],
["9D5432","Piper","Orange"],["F5E6C4","Pipi","Yellow"],["FCDBD2","Pippin","Red"],
["BA782A","Pirate Gold","Yellow"],["BBCDA5","Pixie Green","Green"],["E57F3D","Pizazz","Orange"],
["BF8D3C","Pizza","Yellow"],["3E594C","Plantation","Green"],["DDA0DD","Plum","Violet"],
["651C26","Pohutukawa","Red"],["E5F2E7","Polar","Green"],["8AA7CC","Polo Blue","Blue"],
["6A1F44","Pompadour","Violet"],["DDDCDB","Porcelain","Grey"],["DF9D5B","Porsche","Orange"],
["3B436C","Port Gore","Blue"],["F4F09B","Portafino","Green"],["8B98D8","Portage","Blue"],
["F0D555","Portica","Yellow"],["EFDCD4","Pot Pourri","Orange"],["845C40","Potters Clay","Brown"],
["B0E0E6","Powder Blue","Blue"],["883C32","Prairie Sand","Red"],["CAB4D4","Prelude","Violet"],
["E2CDD5","Prim","Violet"],["E4DE8E","Primrose","Green"],["F8F6DF","Promenade","Green"],
["F6E3DA","Provincial Pink","Orange"],["003366","Prussian Blue","Blue"],["DD00FF","Psychedelic Purple","Violet"],
["CC8899","Puce","Red"],["6E3326","Pueblo","Orange"],["59BAA3","Puerto Rico","Green"],
["BAC0B4","Pumice","Green"],["FF7518","Pumpkin","Orange"],["534931","Punga","Yellow"],
["800080","Purple","Violet"],["652DC1","Purple Heart","Violet"],["9678B6","Purple Mountain's Majesty","Violet"],
["50404D","Purple Taupe","Grey"],["CDAE70","Putty","Yellow"],["F2EDDD","Quarter Pearl Lusta","Green"],
["EBE2D2","Quarter Spanish White","Yellow"],["D9D9F3","Quartz","White"],["C3988B","Quicksand","Brown"],
["CBC9C0","Quill Grey","Grey"],["6A5445","Quincy","Brown"],["232F2C","Racing Green","Green"],
["FF355E","Radical Red","Red"],["DCC6A0","Raffia","Yellow"],["667028","Rain Forest","Green"],
["B3C1B1","Rainee","Green"],["FCAE60","Rajah","Orange"],["2B2E25","Rangoon Green","Green"],
["6F747B","Raven","Blue"],["D27D46","Raw Sienna","Brown"],["734A12","Raw Umber","Brown"],
["FF33CC","Razzle Dazzle Rose","Red"],["E30B5C","Razzmatazz","Red"],["453430","Rebel","Brown"],
["FF0000","Red","Red"],["701F28","Red Berry","Red"],["CB6F4A","Red Damask","Orange"],
["662A2C","Red Devil","Red"],["FF3F34","Red Orange","Orange"],["5D1F1E","Red Oxide","Red"],
["7D4138","Red Robin","Red"],["AD522E","Red Stage","Orange"],["BB3385","Medium Red Violet","Violet"],
["5B342E","Redwood","Red"],["D1EF9F","Reef","Green"],["A98D36","Reef Gold","Yellow"],
["203F58","Regal Blue","Blue"],["798488","Regent Grey","Blue"],["A0CDD9","Regent St Blue","Blue"],
["F6DEDA","Remy","Red"],["B26E33","Reno Sand","Orange"],["323F75","Resolution Blue","Blue"],
["37363F","Revolver","Violet"],["3D4653","Rhino","Blue"],["EFECDE","Rice Cake","Green"],
["EFF5D1","Rice Flower","Green"],["5959AB","Rich Blue","Blue"],["A15226","Rich Gold","Orange"],
["B7C61A","Rio Grande","Green"],["89D9C8","Riptide","Green"],["556061","River Bed","Blue"],
["DDAD56","Rob Roy","Yellow"],["00CCCC","Robin's Egg Blue","Blue"],["5A4D41","Rock","Brown"],
["93A2BA","Rock Blue","Blue"],["9D442D","Rock Spray","Orange"],["C7A384","Rodeo Dust","Brown"],
["6D7876","Rolling Stone","Green"],["D8625B","Roman","Red"],["7D6757","Roman Coffee","Brown"],
["F4F0E6","Romance","Grey"],["FFC69E","Romantic","Orange"],["EAB852","Ronchi","Yellow"],
["A14743","Roof Terracotta","Red"],["8E593C","Rope","Orange"],["D3A194","Rose","Red"],
["FEAB9A","Rose Bud","Red"],["8A2D52","Rose Bud Cherry","Red"],["AC512D","Rose Of Sharon","Orange"],
["905D5D","Rose Taupe","Violet"],["FBEEE8","Rose White","Red"],["BC8F8F","Rosy Brown","Brown"],
["B69642","Roti","Yellow"],["A94064","Rouge","Red"],["4169E1","Royal Blue","Blue"],
["B54B73","Royal Heath","Red"],["6B3FA0","Royal Purple","Violet"],["E0115F","Ruby","Red"],
["716675","Rum","Violet"],["F1EDD4","Rum Swizzle","Green"],["80461B","Russet","Brown"],
["7D655C","Russett","Brown"],["B7410E","Rust","Red"],["3A181A","Rustic Red","Red"],
["8D5F2C","Rusty Nail","Orange"],["5D4E46","Saddle","Brown"],["8B4513","Saddle Brown","Brown"],
["FF6600","Safety Orange","Orange"],["F4C430","Saffron","Yellow"],["989F7A","Sage","Green"],
["B79826","Sahara","Yellow"],["A5CEEC","Sail","Blue"],["177B4D","Salem","Green"],
["FA8072","Salmon","Red"],["FFD67B","Salomie","Yellow"],["696268","Salt Box","Violet"],
["EEF3E5","Saltpan","Grey"],["3B2E25","Sambuca","Brown"],["2C6E31","San Felix","Green"],
["445761","San Juan","Blue"],["4E6C9D","San Marino","Blue"],["867665","Sand Dune","Brown"],
["A3876A","Sandal","Brown"],["AF937D","Sandrift","Brown"],["786D5F","Sandstone","Brown"],
["DECB81","Sandwisp","Yellow"],["FEDBB7","Sandy Beach","Orange"],["F4A460","Sandy Brown","Brown"],
["92000A","Sangria","Red"],["6C3736","Sanguine Brown","Red"],["9998A7","Santas Grey","Blue"],
["A96A50","Sante Fe","Orange"],["E1D5A6","Sapling","Yellow"],["082567","Sapphire","Blue"],
["555B2C","Saratoga","Green"],["F4EAE4","Sauvignon","Red"],["F5DEC4","Sazerac","Orange"],
["6F63A0","Scampi","Violet"],["ADD9D1","Scandal","Green"],["FF2400","Scarlet","Red"],
["4A2D57","Scarlet Gum","Violet"],["7E2530","Scarlett","Red"],["6B6A6C","Scarpa Flow","Grey"],
["87876F","Schist","Green"],["FFD800","School Bus Yellow","Yellow"],["8D8478","Schooner","Brown"],
["308EA0","Scooter","Blue"],["6A6466","Scorpion","Grey"],["EEE7C8","Scotch Mist","Yellow"],
["66FF66","Screamin' Green","Green"],["3D4031","Scrub","Green"],["EF9548","Sea Buckthorn","Orange"],
["DFDDD6","Sea Fog","Grey"],["2E8B57","Sea Green","Green"],["C2D5C4","Sea Mist","Green"],
["8AAEA4","Sea Nymph","Green"],["DB817E","Sea Pink","Red"],["77B7D0","Seagull","Blue"],
["321414","Seal Brown","Brown"],["69326E","Seance","Violet"],["FFF5EE","Seashell","White"],
["37412A","Seaweed","Green"],["E6DFE7","Selago","Violet"],["FFBA00","Selective Yellow","Yellow"],
["6B4226","Semi-Sweet Chocolate","Brown"],["9E5B40","Sepia","Brown"],["FCE9D7","Serenade","Orange"],
["837050","Shadow","Green"],["9AC0B6","Shadow Green","Green"],["9F9B9D","Shady Lady","Grey"],
["609AB8","Shakespeare","Blue"],["F8F6A8","Shalimar","Green"],["33CC99","Shamrock","Green"],
["009E60","Shamrock Green","Green"],["34363A","Shark","Grey"],["00494E","Sherpa Blue","Green"],
["1B4636","Sherwood Green","Green"],["E6B2A6","Shilo","Red"],["745937","Shingle Fawn","Brown"],
["7988AB","Ship Cove","Blue"],["4E4E4C","Ship Grey","Grey"],["842833","Shiraz","Red"],
["E899BE","Shocking","Violet"],["FC0FC0","Shocking Pink","Red"],["61666B","Shuttle Grey","Grey"],
["686B50","Siam","Green"],["E9D9A9","Sidecar","Yellow"],["A0522D","Sienna","Brown"],
["BBADA1","Silk","Brown"],["C0C0C0","Silver","Grey"],["ACAEA9","Silver Chalice","Grey"],
["BEBDB6","Silver Sand","Grey"],["67BE90","Silver Tree","Green"],["A6D5D0","Sinbad","Green"],
["69293B","Siren","Red"],["68766E","Sirocco","Green"],["C5BAA0","Sisal","Yellow"],
["9DB4AA","Skeptic","Green"],["87CEEB","Sky Blue","Blue"],["6A5ACD","Slate Blue","Blue"],
["708090","Slate Grey","Grey"],["42342B","Slugger","Brown"],["003399","Smalt","Blue"],
["496267","Smalt Blue","Blue"],["BB5F34","Smoke Tree","Orange"],["605D6B","Smoky","Violet"],
["FFFAFA","Snow","White"],["E3E3DC","Snow Drift","Grey"],["EAF7C9","Snow Flurry","Green"],
["D6F0CD","Snowy Mint","Green"],["E4D7E5","Snuff","Violet"],["ECE5DA","Soapstone","Grey"],
["CFBEA5","Soft Amber","Yellow"],["EEDFDE","Soft Peach","Red"],["85494C","Solid Pink","Red"],
["EADAC2","Solitaire","Yellow"],["E9ECF1","Solitude","Blue"],["DD6B38","Sorbus","Orange"],
["9D7F61","Sorrell Brown","Brown"],["C9B59A","Sour Dough","Brown"],["6F634B","Soya Bean","Brown"],
["4B433B","Space Shuttle","Brown"],["7B8976","Spanish Green","Green"],["DED1B7","Spanish White","Yellow"],
["375D4F","Spectra","Green"],["6C4F3F","Spice","Brown"],["8B5F4D","Spicy Mix","Brown"],
["FF1CAE","Spicy Pink","Red"],["B3C4D8","Spindle","Blue"],["F1D79E","Splash","Yellow"],
["7ECDDD","Spray","Blue"],["A7FC00","Spring Bud","Green"],["00FF7F","Spring Green","Green"],
["A3BD9C","Spring Rain","Green"],["F1F1C6","Spring Sun","Green"],["E9E1D9","Spring Wood","Grey"],
["B8CA9D","Sprout","Green"],["A2A1AC","Spun Pearl","Blue"],["8F7D6B","Squirrel","Brown"],
["325482","St Tropaz","Blue"],["858885","Stack","Grey"],["A0A197","Star Dust","Grey"],
["D2C6B6","Stark White","Yellow"],["E3DD39","Starship","Green"],["4682B4","Steel Blue","Blue"],
["43464B","Steel Grey","Grey"],["833D3E","Stiletto","Red"],["807661","Stonewall","Yellow"],
["65645F","Storm Dust","Grey"],["747880","Storm Grey","Blue"],["DABE82","Straw","Yellow"],
["946A81","Strikemaster","Violet"],["406356","Stromboli","Green"],["724AA1","Studio","Violet"],
["8C9C9C","Submarine","Blue"],["EEEFDF","Sugar Cane","Green"],["C6EA80","Sulu","Green"],
["8FB69C","Summer Green","Green"],["38B0DE","Summer Sky","Blue"],["EF8E38","Sun","Orange"],
["C4AA4D","Sundance","Yellow"],["F8AFA9","Sundown","Red"],["DAC01A","Sunflower","Yellow"],
["C76155","Sunglo","Red"],["FFCC33","Sunglow","Orange"],["C0514A","Sunset","Red"],
["FE4C40","Sunset Orange","Orange"],["FA9D49","Sunshade","Orange"],["FFB437","Supernova","Yellow"],
["B8D4BB","Surf","Green"],["C3D6BD","Surf Crest","Green"],["007B77","Surfie Green","Green"],
["7C9F2F","Sushi","Green"],["8B8685","Suva Grey","Grey"],["252F2F","Swamp","Green"],
["DAE6DD","Swans Down","Grey"],["F9E176","Sweet Corn","Yellow"],["EE918D","Sweet Pink","Red"],
["D7CEC5","Swirl","Grey"],["DBD0CA","Swiss Coffee","Grey"],["F6AE78","Tacao","Orange"],
["D2B960","Tacha","Yellow"],["DC722A","Tahiti Gold","Orange"],["D8CC9B","Tahuna Sands","Yellow"],
["853534","Tall Poppy","Red"],["A39977","Tallow","Yellow"],["752B2F","Tamarillo","Red"],
["D2B48C","Tan","Brown"],["B8B5A1","Tana","Green"],["1E2F3C","Tangaroa","Blue"],
["F28500","Tangerine","Orange"],["FFCC00","Tangerine Yellow","Yellow"],["D46F31","Tango","Orange"],
["7C7C72","Tapa","Green"],["B37084","Tapestry","Red"],["DEF1DD","Tara","Green"],
["253C48","Tarawera","Blue"],["BAC0B3","Tasman","Grey"],["483C32","Taupe","Grey"],
["8B8589","Taupe Grey","Grey"],["643A48","Tawny Port","Red"],["496569","Tax Break","Blue"],
["2B4B40","Te Papa Green","Green"],["BFB5A2","Tea","Yellow"],["D0F0C0","Tea Green","Green"],
["F883C2","Tea Rose","Orange"],["AB8953","Teak","Yellow"],["008080","Teal","Blue"],
["254855","Teal Blue","Blue"],["3C2126","Temptress","Brown"],["CD5700","Tenne (Tawny)","Orange"],
["F4D0A4","Tequila","Yellow"],["E2725B","Terra Cotta","Red"],["ECE67E","Texas","Green"],
["FCB057","Texas Rose","Orange"],["B1948F","Thatch","Brown"],["544E31","Thatch Green","Yellow"],
["D8BFD8","Thistle","Violet"],["4D4D4B","Thunder","Grey"],["923830","Thunderbird","Red"],
["97422D","Tia Maria","Orange"],["B9C3BE","Tiara","Grey"],["184343","Tiber","Green"],
["FC80A5","Tickle Me Pink","Red"],["F0F590","Tidal","Green"],["BEB4AB","Tide","Brown"],
["324336","Timber Green","Green"],["D9D6CF","Timberwolf","Grey"],["DDD6E1","Titan White","Violet"],
["9F715F","Toast","Brown"],["6D5843","Tobacco Brown","Brown"],["44362D","Tobago","Brown"],
["3E2631","Toledo","Violet"],["2D2541","Tolopea","Violet"],["4F6348","Tom Thumb","Green"],
["FF6347","Tomato","Red"],["E79E88","Tonys Pink","Orange"],["817C87","Topaz","Violet"],
["FD0E35","Torch Red","Red"],["353D75","Torea Bay","Blue"],["374E88","Tory Blue","Blue"],
["744042","Tosca","Red"],["9CACA5","Tower Grey","Green"],["6DAFA7","Tradewind","Green"],
["DDEDE9","Tranquil","Blue"],["E2DDC7","Travertine","Green"],["E2813B","Tree Poppy","Orange"],
["7E8424","Trendy Green","Green"],["805D80","Trendy Pink","Violet"],["C54F33","Trinidad","Orange"],
["AEC9EB","Tropical Blue","Blue"],["00755E","Tropical Rain Forest","Green"],["4C5356","Trout","Grey"],
["8E72C7","True V","Violet"],["454642","Tuatara","Grey"],["F9D3BE","Tuft Bush","Orange"],
["E3AC3D","Tulip Tree","Yellow"],["DEA681","Tumbleweed","Brown"],["46494E","Tuna","Grey"],
["585452","Tundora","Grey"],["F5CC23","Turbo","Yellow"],["A56E75","Turkish Rose","Red"],
["AE9041","Turmeric","Yellow"],["40E0D0","Turquoise","Blue"],["6CDAE7","Turquoise Blue","Blue"],
["363E1D","Turtle Green","Green"],["AD6242","Tuscany","Orange"],["E3E5B1","Tusk","Green"],
["BF914B","Tussock","Yellow"],["F8E4E3","Tutu","Red"],["DAC0CD","Twilight","Violet"],
["F4F6EC","Twilight Blue","Grey"],["C19156","Twine","Yellow"],["66023C","Tyrian Purple","Violet"],
["FF6FFF","Ultra Pink","Red"],["120A8F","Ultramarine","Blue"],["D4574E","Valencia","Red"],
["382C38","Valentino","Violet"],["2A2B41","Valhalla","Violet"],["523936","Van Cleef","Brown"],
["CCB69B","Vanilla","Brown"],["EBD2D1","Vanilla Ice","Red"],["FDEFD3","Varden","Yellow"],
["C80815","Venetian Red","Red"],["2C5778","Venice Blue","Blue"],["8B7D82","Venus","Violet"],
["62603E","Verdigris","Grey"],["48531A","Verdun Green","Green"],["FF4D00","Vermilion","Red"],
["5C4033","Very Dark Brown","Brown"],["CDCDCD","Very Light Grey","Grey"],["A85533","Vesuvius","Orange"],
["564985","Victoria","Violet"],["5F9228","Vida Loca","Green"],["4DB1C8","Viking","Blue"],
["955264","Vin Rouge","Red"],["C58F9D","Viola","Red"],["2E2249","Violent Violet","Violet"],
["EE82EE","Violet","Violet"],["9F5F9F","Violet Blue","Violet"],["F7468A","Violet Red","Red"],
["40826D","Viridian","Blue"],["4B5F56","Viridian Green","Green"],["F9E496","Vis Vis","Yellow"],
["97D5B3","Vista Blue","Green"],["E3DFD9","Vista White","Grey"],["FF9980","Vivid Tangerine","Orange"],
["803790","Vivid Violet","Violet"],["4E2728","Volcano","Red"],["443240","Voodoo","Violet"],
["36383C","Vulcan","Grey"],["D4BBB1","Wafer","Orange"],["5B6E91","Waikawa Grey","Blue"],
["4C4E31","Waiouru","Green"],["E4E2DC","Wan White","Grey"],["849137","Wasabi","Green"],
["B6ECDE","Water Leaf","Green"],["006E4E","Watercourse","Green"],["D6CA3D","Wattle","Green"],
["F2CDBB","Watusi","Orange"],["EEB39E","Wax Flower","Orange"],["FDD7D8","We Peep","Red"],
["4C6B88","Wedgewood","Blue"],["8E3537","Well Read","Red"],["5C512F","West Coast","Yellow"],
["E5823A","West Side","Orange"],["D4CFC5","Westar","Grey"],["F1919A","Wewak","Red"],
["F5DEB3","Wheat","Brown"],["DFD7BD","Wheatfield","Yellow"],["D29062","Whiskey","Orange"],
["D4915D","Whiskey Sour","Orange"],["EFE6E6","Whisper","Grey"],["FFFFFF","White","White"],
["D7EEE4","White Ice","Green"],["E7E5E8","White Lilac","Blue"],["EEE7DC","White Linen","Grey"],
["F8F6D8","White Nectar","Green"],["DAD6CC","White Pointer","Grey"],["D4CFB4","White Rock","Green"],
["F5F5F5","White Smoke","White"],["7A89B8","Wild Blue Yonder","Blue"],["E3D474","Wild Rice","Green"],
["E7E4DE","Wild Sand","Grey"],["FF3399","Wild Strawberry","Red"],["FD5B78","Wild Watermelon","Red"],
["BECA60","Wild Willow","Green"],["53736F","William","Green"],["DFE6CF","Willow Brook","Green"],
["69755C","Willow Grove","Green"],["462C77","Windsor","Violet"],["522C35","Wine Berry","Red"],
["D0C383","Winter Hazel","Yellow"],["F9E8E2","Wisp Pink","Red"],["C9A0DC","Wisteria","Violet"],
["A29ECD","Wistful","Blue"],["FBF073","Witch Haze","Green"],["302621","Wood Bark","Brown"],
["463629","Woodburn","Brown"],["626746","Woodland","Green"],["45402B","Woodrush","Yellow"],
["2B3230","Woodsmoke","Grey"],["554545","Woody Brown","Brown"],["75876E","Xanadu","Green"],
["FFFF00","Yellow","Yellow"],["9ACD32","Yellow Green","Green"],["73633E","Yellow Metal","Yellow"],
["FFAE42","Yellow Orange","Orange"],["F49F35","Yellow Sea","Yellow"],["FFC5BB","Your Pink","Red"],
["826A21","Yukon Gold","Yellow"],["C7B882","Yuma","Yellow"],["6B5A5A","Zambezi","Brown"],
["B2C6B1","Zanah","Green"],["C6723B","Zest","Orange"],["3B3C38","Zeus","Grey"],
["81A6AA","Ziggurat","Blue"],["EBC2AF","Zinnwaldite","Brown"],["DEE3E3","Zircon","Grey"],
["DDC283","Zombie","Yellow"],["A29589","Zorba","Brown"],["17462E","Zuccini","Green"],
["CDD5D5","Zumthor","Grey"]
]

}
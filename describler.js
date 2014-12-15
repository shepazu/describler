"use strict";

window.onfocus = function ( event ) {
	event.target.blur();
}

function describlerObj () {
	this.root = null;
	
	// focus properties
	this.focusList = [];
	this.focusIndex = 0;
	this.focusBox = null;
	this.activeElement = null;
	this.padding = 0;
	this.strokewidth = 0;
	this.navDirection = 0;
	this.detailCount = 0;
	
	// chart properties
	this.charts = [];

	// voice and sonification properties
	this.speeches = [];
	this.voice = new SpeechSynthesisUtterance();
	this.sonifier = null;

	// constants
  this.svgns = "http://www.w3.org/2000/svg";
}

describlerObj.prototype.init = function ( root ) {
	this.root = root;

  // find appropriate sizes
  var vb = root.getAttribute("viewBox").split(" ");
	var basesize = (Math.max(vb[2], vb[3]) / 100);
  this.padding = basesize;
  this.strokewidth = basesize / 2;
  
  this.focusBox = document.createElementNS(this.svgns, 'rect');
  this.focusBox.setAttribute("rx", this.padding/2 );
  this.focusBox.setAttribute("ry", this.padding/2 );
  this.focusBox.setAttribute("fill", "none");
  this.focusBox.setAttribute("stroke", "cornflowerblue");
  this.focusBox.setAttribute("stroke-opacity", "0.6");
  this.focusBox.setAttribute("stroke-width", this.strokewidth );
  this.focusBox.setAttribute("stroke-linejoin", "round");
  this.root.appendChild( this.focusBox );

  this.root.addEventListener('click', bind(this, this.click), false );
  this.root.addEventListener('keydown', bind(this, this.trackKeys), false );

	// create a list of all focusable elements, including the root
  this.focusList = this.root.parentNode.querySelectorAll("[tabindex]");

  console.log( this.focusList );
	this.createModel();
	
	this.sonifier = new Sonifier();
	this.metaGroup = document.createElementNS(this.svgns, 'g');
  this.metaGroup.setAttribute("id", "describler-metadata" );
  this.root.appendChild( this.metaGroup );
}

describlerObj.prototype.createModel = function () {

	var charts = this.root.querySelectorAll("[role='chart']");
	if (!charts.length) {
		var role = this.root.getAttribute("role");
		
		if ( "chart" == role ) {
			charts = [this.root];			
		}		
	}
  // console.log( charts );

	if (!charts.length) {
		this.findTextContent();
	  // console.log( charts );
	}

	// parse all charts
	for (var c = 0, cLen = charts.length; cLen > c; ++c) {
		var chartEl = charts[c];
		var chart = new chartObj();
		chart.init( chartEl );
		this.charts.push( chart );
	}
  console.log( this.charts );
	this.exportCSV();

	// this.mapToRange();
}   

describlerObj.prototype.exportCSV = function () {
	for (var c = 0, cLen = this.charts.length; cLen > c; ++c) {
		var chart = this.charts[c];
		
		var csv = "";
		for (var d = 0, dLen = chart.datasets.length; dLen > d; ++d) {
			var dataset = chart.datasets[d];
			
			var allies = [];
			for (var a in chart.axes) {
			  // console.log(key, chart[axis]);
				var eachAxis = chart.axes[a];
				if (eachAxis["labels"]) {
					if ( dataset.length == eachAxis["labels"].length ) {
						allies.push({
							"label": eachAxis.label,
							"fields": eachAxis["labels"]
						});
					}
				}
			}
			
			if ( "bar" == chart.type ) {
				if ( 1 == allies.length ) {
					var axis = allies[0]
					csv = axis["label"] + ",values\n";

					for (var i = 0, iLen = axis["fields"].length; iLen > i; ++i) {
						csv += axis["fields"][i] + "," + dataset[i].value + "\n";
					}	
				}
			} else if ( "pie" == chart.type ) {
				for (var i = 0, iLen = dataset.length; iLen > i; ++i) {
					csv += dataset[i].label + "\n";
				}	
			}
		}
	  console.log( "CSV file: \n" + csv );
	}


}

describlerObj.prototype.findTextContent = function () {
  var textContents = document.querySelectorAll("text,title");
	for (var t = 0, tLen = textContents.length; tLen > t; ++t) {
		var eachTextContent= textContents[t];
		var el = eachTextContent;
		if ( "title" == el.localName ) {
		  el = el.parentNode;
		}
		
	  el.setAttribute("tabindex", 0 );
	}
  this.focusList = this.root.parentNode.querySelectorAll("[tabindex]");
	// console.log(this.focusList)
}   

describlerObj.prototype.navNext = function () {
  // console.log( "tabNext: " + focus.index );
	this.navDirection = 1;
	
  this.activeElement = this.focusList[ this.focusIndex ];
	document.activeElement = this.activeElement;
  this.focusIndex++;
  if (this.focusList.length - 1 < this.focusIndex) {
    this.focusIndex = 0;
  }
  
  this.showFocus();
}

describlerObj.prototype.navPrev = function () {
  // console.log( "tabPrev: " + this.focusIndex );
	this.navDirection = -1;
  
  this.activeElement = this.focusList[ this.focusIndex ];
	document.activeElement = this.activeElement;
  this.focusIndex--;
  if (-1 > this.focusIndex) {
    this.focusIndex = this.focusList.length - 1;
  }

  this.showFocus();
}

describlerObj.prototype.showFocus = function () {
  // console.log( el );
  var bbox = this.activeElement.getBBox();
	var transform = this.root.getTransformToElement(this.activeElement).inverse();
	
	// console.log(transform)

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

	this.getInfo();
}   

describlerObj.prototype.trackKeys = function (event) {
	var key = event.keyIdentifier.toLowerCase();
  // console.log( key );

  if ("u+0009" == key) {
    // tab
   	event.preventDefault();
    event.stopPropagation();
		// document.activeElement.blur();

    if (event && event.shiftKey) {
      this.navPrev();
    } else {
      this.navNext();
    }
	} else if ("u+0044" == key) {
		// d
	  // console.log( "10: " + this.detailCount );
		this.getInfo( true );
	} else if ("u+0053" == key) {
		// s
		this.sonify();
	}
}

describlerObj.prototype.click = function ( event ) {
 	event.preventDefault();
  event.stopPropagation();
	// document.activeElement.blur();	
	
	var focusEl = event.target;
	while ( !focusEl.hasAttribute("tabindex") ) {
	  // console.log( focusEl );
		if ( document == focusEl.parentNode ) {
			return false;
		}
		focusEl = focusEl.parentNode;
	}
  // console.log( focusEl );

	focusEl.blur();

  // console.log( this.focusIndex );
	for (var l = 0, lLen = this.focusList.length; lLen > l; ++l) {
		if ( focusEl == this.focusList[l] ) {
			this.focusIndex = l + 1;
		  if (this.focusList.length - 1 < this.focusIndex) {
		    this.focusIndex = 0;
		  }
			continue;
		}
  };
  console.log( this.focusIndex );

  this.activeElement = focusEl;
	document.activeElement = this.activeElement;
	this.showFocus();
}

describlerObj.prototype.mapToRange = function (val, range1, range2 ) {
	// affine transformation transforms number x in range [a,b] to number y in range [c,d]
	// y = (x-a)(d-c/b-a) + c
	
	var newVal = ( (val - range1[0]) * ((range2[1] - range2[0]) / (range1[1] - range1[0])) ) + range2[0];
	return newVal;
}



describlerObj.prototype.getFraction = function ( decimal ) {
	var msg = "The same as ";
	if ( 1 != decimal ) {
		var fraction = 1;
		var numerator = 1;
		var denominator = 1;

		while (fraction.toFixed(3) != decimal.toFixed(3)) {
		  // console.log( fraction + "," + decimal );
			if (fraction.toFixed(3) < decimal.toFixed(3) ) {
				numerator += 1;
			}
			else {
				denominator += 1;
				numerator = parseInt(decimal * denominator);
			}
			fraction = numerator / denominator;
		}

		msg = numerator + '/' + denominator;
		if ( numerator > denominator ) {
			var number = parseInt( numerator / denominator );
			var mod = numerator % denominator;
			
			/*
			for (var d = 0; 10 > d; ++d) {
				var mod2 = denominator % mod;
				if ( 0 != mod2 ) {
					
				}
			}
			*/
			
			msg = number.toString() + " " + mod + '/' + denominator;
			if ( 0 == mod ) {
				msg = number.toString() + " times ";
			}
		}
	}
	return msg;
}


describlerObj.prototype.convertNumberToWords = function ( number ) {

	var names = [{"0":"zero", "1":"one", "2":"two", "3":"three", "4":"four", "5":"five", "6":"six", 
								"7":"seven", "8":"eight", "9":"nine" },{"0":"ten", "1":"eleven", "2":"twelve", 
								"3":"thirteen", "4":"fourteen", "5":"fifteen", "6":"sixteen", "7":"seventeen", 
								"8":"eighteen", "9":"nineteen"},{"2":"twenty", "3":"thirty", "4":"forty", "5":"fifty", 
								"6":"sixty", "7":"seventy", "8":"eighty", "9":"ninety"},["", "thousand", "million", 
								"billion", "trillion", "quadrillion", "quintillion", "sextillion", "septillion", 
								"octillion", "nonillion", "decillion", "undecillion", "duodecillion", "tredecillion", 
								"quattuordecillion", "quindecillion", "sexdecillion", "septdecillion", "octdecillion", 
								"novemdecillion", "vigintillion"]];
	var to_words = function(s, n){
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
	document.getElementById('input').addEventListener('keyup', function(){
	document.getElementById('output').innerHTML = to_words(this.value.replace(/[^0-9]/g, '')
					.split('').reverse(), 0);
	}, false);
}


describlerObj.prototype.getInfo = function ( details ) {
	
	this.speeches.length = 0;
	
	if (!this.activeElement) {
		return false;
	}
	
	var role = this.activeElement.getAttribute("role");
	if ( "datapoint" == role) {
		for (var c = 0, cLen = this.charts.length; cLen > c; ++c) {
			var chart = this.charts[c];
			for (var d = 0, dLen = chart.datasets.length; dLen > d; ++d) {
				var dataset = chart.datasets[d];
				for (var dp = 0, dpLen = dataset.length; dpLen > dp; ++dp) {
					var datapoint = dataset[dp];
					if ( this.activeElement == datapoint.element ) {
					  // console.log( datapoint );
						if ( !details ) {
							this.speeches.push( "Data point " + (dp + 1) + " of " + dataset.length );
						}

						this.speeches.push( datapoint.label );

						if ( details ) {
							var value = datapoint.value;
							
							// increment detail counter, to allow additional level of detail
							this.detailCount++;
						  // console.log( "1: " + this.detailCount );

							if ( 1 == this.detailCount ) {
							  // console.log( "2: " + this.detailCount );
								// describe change of value
								if ( (0 != dp && 1 == this.navDirection ) 
										|| (dpLen - 1 != dp && -1 == this.navDirection )) {
											
									var previousValue = dataset[dp - 1].value;
									if ( -1 == this.navDirection ) {
										previousValue = dataset[dp + 1].value;
									}

									var delta = "";
									if ( value > previousValue ) {
										delta += "This is an increase of " + (value - previousValue);
									}	else if ( value < previousValue) {
										delta += "This is a decrease of " + (previousValue - value);
									} else {
										delta += "There is no change";
									}
									delta += " from the previous value of " + previousValue;
									this.speeches.push( delta );
								  // console.log( "3: " + this.detailCount );
								}

								// describe change of value
								if ( dataset["low"] == value ) {
									this.speeches.push( "This is the lowest value." );
								} 

								if ( dataset["high"] == value ) {
									this.speeches.push( "This is the highest value." );
								}

								if ( dataset["median"] == value ) {
									this.speeches.push( "This is the median value." );
								}

								if ( dataset["mean"] == value ) {
									this.speeches.push( "This is the average value." );
								}
							} else { // more details
							  // console.log( "4: " + this.detailCount );
								// reset detail counter, no deeper level of detail
								this.detailCount = 0;
								var firstItem = true;
								for (var odp = 0, odpLen = dataset.length; odpLen > odp; ++odp) {
									var otherDatapoint = dataset[odp];
									if ( datapoint.element != otherDatapoint.element ) {
										var otherValue = otherDatapoint.value;
										var delta = "";
										if (firstItem) {
											firstItem = false;
											delta = "This is ";
										} else if ( odpLen - 1 == odp 
															|| ( odpLen - 1 == dp && odpLen - 2 == odp ) ) {
											delta = " and ";
										}

										// delta += (value/otherValue).toFixed(2);
										delta += this.getFraction(value/otherValue);
										delta += " the value of ";
										
										if ( otherDatapoint.labelElementText ) {
											delta +=  otherDatapoint.labelElementText;
										} else {
											delta +=  otherDatapoint.label;
										}
										
										this.speeches.push( delta );
									  // console.log( "5: " + this.detailCount );
									}
								}

							}
						}
						
						// no need to iterate further
						continue;
						d = dLen;
						c = cLen;
					}
				}
			}
		}
	} else if ( "xaxis" == role || "yaxis" == role ) {
		// reset detail counter, different detail levels only available on datapoints
		this.detailCount = 0;
		
		for (var c = 0, cLen = this.charts.length; cLen > c; ++c) {
			var chart = this.charts[c];
			for (var a in chart.axes) {
			  // console.log(key, chart[axis]);
				var axis = chart.axes[a];
				if ( this.activeElement == axis.element ) {
					if ( axis.label ) {
						this.speeches.push( axis.type + " axis: " + axis.label );
					}
		
					if ( !isNaN(axis.min) && !isNaN(axis.max) ) {
						this.speeches.push( ", " + axis.labels.length + " items, ranging from " 
																+ axis.min + " to " + axis.max );
					} else {
						if ( details ) {
							this.speeches.push( ", with the following labels: " );
							for (var l = 0, lLen = axis.labels.length; lLen > l; ++l) {
								this.speeches.push( axis.labels[l] );
							}
						} else {
							this.speeches.push( ", " + axis.labels.length + " items, ranging from " 
																	+ axis.labels[0] + " to " 
																	+ axis.labels[axis.labels.length - 1] );
						}
					}
					
					// no need to iterate further
					continue;
					c = cLen;
				}
			}
		}
	} else if ( "chart" == role ) {
		// reset detail counter, different detail levels only available on datapoints
		this.detailCount = 0;

		for (var c = 0, cLen = this.charts.length; cLen > c; ++c) {
			var chart = this.charts[c];
			if ( this.activeElement == chart.element ) {
				for (var d = 0, dLen = chart.datasets.length; dLen > d; ++d) {
					var dataset = chart.datasets[d];

					if ( chart.label ) {
						this.speeches.push( "Chart: " + chart.label );
					}

					if ( details ) {
					  // console.log( "6: " + this.detailCount );
						// this.speeches.push( "This is a " + chart.type + " chart, with " 
						// 										+ dataset.length + " data points" );
						this.speeches.push( "" + chart.type + " chart, with " 
																+ dataset.length + " data points" );
						this.speeches.push( "The highest value is " + +dataset.high.toFixed(2)
																+ ", and the lowest value is " + +dataset.low.toFixed(2)
																+ ", with a range of " + +dataset.range.toFixed(2) );
						this.speeches.push( "The average is " + +dataset.mean.toFixed(2)
																+ ", the median is " + +dataset.median.toFixed(2)
																+ ", and the total is " + +dataset.sum.toFixed(2) );
																// + ", and the total of all data points is " + dataset.sum );				
					}
				}
				continue;
			}
		}
	} else if ( "legend" == role ) {
		this.speeches.push( "Legend: " );	
		
		var title = this.activeElement.querySelector("[role='legend'] > [role='heading']");
		if ( !title ) {
			title = this.activeElement.querySelector("[role='legend'] > title");
		}

		if ( title ) {
			this.speeches.push( title.textContent );			
		}
		
	} else if ( "legenditem" == role ) {
		for (var c = 0, cLen = this.charts.length; cLen > c; ++c) {
			var chart = this.charts[c];
			for (var l = 0, lLen = chart.legends.length; lLen > l; ++l) {
				var eachLegend = chart.legends[ l ]; 
				for (var li = 0, liLen = eachLegend.items.length; liLen > li; ++li) {
					var eachLegendItem = eachLegend.items[ li ]; 
					if ( this.activeElement == eachLegendItem.element ) {
						if ( !details ) {
							this.speeches.push( "Legend item " + (li + 1) + " of " + liLen );
						}
						
						this.speeches.push( eachLegendItem.label );	

						if ( details ) {
							var total = 0;
							var refsLength = eachLegendItem.refs.length;
							
							var msg = refsLength + " datapoint";
							if ( 1 < refsLength ) {
								msg += "s"; // make it plural
							}
							
							this.speeches.push( "This legend item applies to " + msg);	

							for (var r = 0; refsLength > r; ++r) {
								var eachRef = eachLegendItem.refs[ r ];
								this.speeches.push( eachRef.label );	
								// TODO: make sure the value is numeric
								total += eachRef.value
							}
							
							this.speeches.push( "The total of all items is " + total );	
						}

						
						// no need to iterate further
						continue;
						l = lLen;
						c = cLen;
					}
				}
			}
		}
	} else {
		// reset detail counter, different detail levels only available on datapoints
		this.detailCount = 0;
		
		var el = this.activeElement;
		if ( "text" != this.activeElement.localName ) {
		  el = this.activeElement.querySelector("title");
		
			if ( !el ) {
			  el = this.activeElement.querySelector("text");
			}
		}
		// var dataText = el.textContent;
		
		if ( el ) {
			this.speeches.push( el.textContent );			
		}
		
		if ( details ) {
			var desc = this.activeElement.querySelector("[tabindex] > desc");
			if ( desc ) {
				this.speeches.push( desc.textContent );			
			}
		}
	}
	
	if ( this.speeches.length ) {
		this.speak();		
	}
}

describlerObj.prototype.speak = function () {
  if ( speechSynthesis.speaking ) {
    speechSynthesis.cancel();
  } else {
    var msg = this.speeches.join(". \n");
	  console.log( msg );

    this.voice.text = msg;
    this.voice.lang = "en";
    this.voice.rate = 1.2;
    speechSynthesis.speak( this.voice );

		// for (var s = 0, sLen = this.speeches.length; sLen > s; ++s) {
		// 	msg = this.speeches[s];
		//   // console.log( msg );
		// 	    this.voice.text = msg;
		// 	    speechSynthesis.speak( this.voice );
		// }
  }      
}


describlerObj.prototype.sonify = function () {
	// Create sonfication lines
  var datapoints = document.querySelectorAll("*[role='datapoint']");
	for (var c = 0, cLen = this.charts.length; cLen > c; ++c) {
		var chart = this.charts[c];
		for (var d = 0, dLen = chart.datasets.length; dLen > d; ++d) {
			var dataset = chart.datasets[d];
      var datalinePoints = "";
			for (var dp = 0, dpLen = dataset.length; dpLen > dp; ++dp) {
				var datapoint = dataset[dp].element;
			  var bbox = datapoint.getBBox();
		    datalinePoints += (bbox.x + (bbox.width/2)) + "," + bbox.y + " "; 
			}
			
		  console.log(datalinePoints);

		  // draw line plot
		  var dataline = document.createElementNS(this.svgns, 'polyline');
		  //line.setAttribute("id", dataset);
		  dataline.setAttribute("id", "dataLine");
		  dataline.setAttribute("role", "trend-line");
		  dataline.setAttribute("points", datalinePoints);
		  dataline.setAttribute("fill", "none");
		  // dataline.setAttribute("stroke", "none");
		  dataline.setAttribute("stroke", "red");
		  this.metaGroup.appendChild( dataline );  

			// 		  this.x = 0;
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


/*
*  Chart Object
*/

function chartObj() {
	this.element = null;
	this.type = null;
	this.label = null;
	this.axes = [];
	this.datasets = [];
	this.legends = [];
	this.x = null;
	this.y = null;
	this.width = null;
	this.height = null;
}

chartObj.prototype.init = function ( el ) {
	this.element = el;
	this.type = this.element.getAttribute("aria-charttype");
	
	// get chart title
	var title = this.element.querySelector("[role='chart'] > [role='heading']");
	if ( title ) {
		this.label = title.textContent;
	}
    
	// find the dimensions of the chart area
	var chartarea = this.element.querySelector("[role='chartarea']");
	if ( chartarea ) {
		this.x = +chartarea.getAttribute("x");
		this.y = +chartarea.getAttribute("y");
		this.width = +chartarea.getAttribute("width");
		this.height = +chartarea.getAttribute("height");
	}
	
	if ( "pie" != this.type ) {
		// get chart axes
		this.axes["x"] = new axisObj;
		this.axes["x"].init( this.element, "x", "horizontal" )

		this.axes["y"] = new axisObj;
		this.axes["y"].init( this.element, "y", "vertical" )
	}

  var datasetEls = this.element.querySelectorAll("[role='dataset']");
	for (var d = 0, dLen = datasetEls.length; dLen > d; ++d) {
		var eachDataset = datasetEls[d];
	  var datapoints = eachDataset.querySelectorAll("[role='datapoint']");
	
		var dataset = this.extractDataset( datapoints );
		this.datasets.push( dataset );
  }

  var legendEls = this.element.querySelectorAll("[role='legend']");
	for (var l = 0, lLen = legendEls.length; lLen > l; ++l) {
		var eachLegend = legendEls[ l ]; 
		var legend = new legendObj();
		legend.init( eachLegend );
		this.legends.push( legend );
	}
}   

chartObj.prototype.extractDataset = function ( datapoints ) {
	var dataset = [];
	dataset["values"] = [];

	for (var dp = 0, dpLen = datapoints.length; dpLen > dp; ++dp) {
		var eachDatapoint = datapoints[dp];
		var datapoint = new datapointObj();
		datapoint.init( eachDatapoint ); 
		dataset["values"].push( datapoint.value );
		dataset.push( datapoint );
  };

	// sort values
	dataset["values"].sort( function(a, b) {
	  return a - b;
	}); 

	// find low
	dataset["low"] = dataset["values"][0];

	// find high
	dataset["high"] = dataset["values"][ dataset.length - 1 ];

	// find range 
	dataset["range"] = dataset["high"] - dataset["low"];

	// find sum
	dataset["sum"] = dataset["values"].reduce( function(a, b) {
	  return a + b;
	}); 

	// find mean 
	dataset["mean"] = dataset["sum"] / dataset.length;

	// find median  
  var mid = Math.floor(dataset.length/2);
  // if ( 1 == dataset.length%2 ) {
  if (dataset.length % 2) {
  	dataset["median"] = dataset["values"][mid];
	} else {
    dataset["median"] = ( dataset["values"][mid - 1] + dataset["values"][mid]) / 2;
	}

	// find mode 
	var modeMap = {},
      maxCount = 1, 
      modes = [dataset["values"][0]];

  for(var i = 0; i < dataset["values"].length; ++i) {
    var val = dataset["values"][i];

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
	dataset["mode"] = modes;	
	
	return dataset;	
}   


function datapointObj() {
	this.element = null;
	this.value = null;
	this.values = [];
	this.label = null;
	this.labelElement = null;
	this.labelElementText = null;
}

datapointObj.prototype.init = function ( el ) {
	this.element = el;
	
	var datavalueEL = this.element.querySelector("[role='datavalue']");
	var dataText = datavalueEL.textContent;
	this.value = parseFloat( dataText );
	
	var labelEl = datavalueEL.getAttribute("aria-labelledby");
	this.labelElement = labelEl;
	var labelContent = "";
	if (labelEl) {
	  var label = document.getElementById(labelEl);
		if (label) {
	    labelContent = label.textContent.trim();
			this.labelElementText = labelContent;
		}
		labelContent += ": ";
	}
	this.label = labelContent + dataText;
}

function axisObj() {
	this.element = null;
	this.direction = null;
	this.min = null;
	this.max = null;
	this.units = null;
	this.label = null;
	this.labels = [];
}

axisObj.prototype.init = function ( chartEl, type, dir ) {
	this.element = chartEl.querySelector("[role='" + type + "axis']");
	this.type = type;
	this.direction = dir;
	this.min = parseFloat(this.element.getAttribute("aria-valuemin"));
	this.max = parseFloat(this.element.getAttribute("aria-valuemax"));
	this.units = null;	
	
	// get axis title
	var title = chartEl.querySelector("[role='" + type + "axis'] > [role='heading']");
	if ( title ) {
		this.label = title.textContent;
	}

	// first extract all the axis labels
	var axislabels = this.element.querySelectorAll("[role='axislabel']");
	if ( axislabels.length ) {
		// var axisTexts = [];
		// var axisValues = [];
		for (var a = 0, aLen = axislabels.length; aLen > a; ++a) {
			var eachLabel = axislabels[ a ]; 
			this.labels.push( eachLabel.textContent );
			// axisValues.push( parseFloat(eachLabel.textContent) );
		}
	  // console.log( min + ", " + max );
	}
}


function legendObj() {
	this.element = null;
	this.label = null;
	this.items = []; // each item has: element, label, list of referencing datapoints
}

legendObj.prototype.init = function ( el ) {
	this.element = el;
	
	// get legend title
	var title = this.element.querySelector("[role='legend'] > [role='heading']");
	if ( title ) {
		this.label = title.textContent;
	}
	
	// first extract all the legend items
	var legendItems = this.element.querySelectorAll("[role='legenditem']");
	for (var l = 0, lLen = legendItems.length; lLen > l; ++l) {
		var eachItem = legendItems[ l ]; 
		var legendItem = new legendItemObj();
		legendItem.init( eachItem )
		this.items.push( legendItem );
	}
}

function legendItemObj() {
	this.element = null;
	this.label = null;
	this.refs = []; // list of referencing datapoints
}

legendItemObj.prototype.init = function ( el ) {
	this.element = el;
	var title = this.element.querySelector("[role='legenditem'] > text,[role='legenditem'] > title");
	if ( title ) {
		this.label = title.textContent;
	}

	/// BE HERE NOW!!!
	
	/// find all the datapoints which reference this legend item
	var allRefs = document.querySelectorAll("[aria-labelledby~='" + this.element.id + "']");
	for (var r = 0, rLen = allRefs.length; rLen > r; ++r) {
		var eachRef = allRefs[ r ]; 
		
		var ref = eachRef;
		var role = eachRef.getAttribute("role");
		while ( "datapoint" != role ) {
			ref = ref.parentNode;
			role = ref.getAttribute("role");
		}		

		// if ( "datavalue" == role ) {
		// 	while ( "datapoint" == role ) {
		// 		ref = ref.parentNode;
		// 	}		
		// 	
		// }		
		
		var datapoint = new datapointObj();
		datapoint.init( ref ); 
		// dataset["values"].push( datapoint.value );
		// dataset.push( datapoint );
		
		
		this.refs.push(datapoint); // list of referencing datapoints
  	// console.log( min + ", " + max );
	}

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
  this.cursorSpeed = 25;
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

Sonifier.prototype.init = function ( svgroot, metaGroup, dataLine, 
																		 x, y, width, height, xAxis, yAxis, xAxisPos, yAxisPos, color ) {	
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
	//   var frame = document.createElementNS(this.svgns, 'path');
	//   frame.setAttribute("d", "M" + this.minx + "," + this.miny 
	// 															 + " " + this.maxx + "," + this.miny
	// 															 + " " + this.maxx + "," + this.maxy
	// 															 + " " + this.minx + "," + this.maxy
	// 															 + " z");
	//   frame.setAttribute("fill", "lime");
	//   frame.setAttribute("opacity", "0.5");
	//   frame.setAttribute("pointer-events", "none");
	//   this.metaGroup.appendChild( frame );


	// create cursor line and point
  this.cursor = document.createElementNS(this.svgns, 'path');
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


  this.metaGroup.addEventListener('mousemove', bind(this, this.trackPointer), false );
  // document.documentElement.addEventListener('click', this.toggleAudio, false );

	if ( !this.isReady ) {
		// only register key listener on first initialization
	  document.documentElement.addEventListener('keydown', bind(this, this.trackKeys), false );
	}
	
	// indicate first initialization
  this.isReady = true;

	// var axisMsg = "X-axis: " + this.axisX.min 
	// 								+ " to " + this.axisX.max + ". Y-axis: " + this.axisY.min + " to " + this.axisY.max;
	// this.speak( axisMsg, false );
}

Sonifier.prototype.trackKeys = function (event) {
	var key = event.keyIdentifier.toLowerCase();
  
  switch ( key ) {
    case "down":
    case "right":
      this.stepCursor( 1 );
      break;

    case "up":
    case "left":
    this.stepCursor( -1 );
      break;

    case "enter":
      this.speak( null, true );
      break;


    case "p":
    case "u+0050":
      this.togglePlay();
      break;

    case "s":
    case "u+0053":
      this.resetPlay();
      break;

    case "[":
    case "u+005b":
      this.setPlayRate( 10 );
      break;

    case "]":
    case "u+005d":
      this.setPlayRate( -10 );
      break;

		case "m":
		case "u+004d":
			this.toggleVolume();
			break;

		case "o":
		case "u+004f":
			this.setDirection();
			break;
  }
}   


Sonifier.prototype.togglePlay = function ( forcePause ) {
	console.log("togglePlay")
	if ( this.timer || forcePause ) {
		this.stopPlay();
	} else {
	  this.isPlaying = true;
		var t = this; 

		this.timer = setInterval( function() { 
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

Sonifier.prototype.setPlayRate = function ( rateDelta ) { 
	this.cursorSpeed += rateDelta;
	if ( this.timer ) {
		this.stopPlay();
		this.togglePlay();
	}
}   

Sonifier.prototype.stepCursor = function ( direction ) { 
	var x = parseFloat( this.cursorpoint.getAttribute( "cx" ) );
	this.coords.x = x + direction;
	// this.coords.y = 0;
	this.updateCursor();	
}   

Sonifier.prototype.setDirection = function () { 
  if ( 1 == this.cursorDirection ) {
		this.cursorDirection = -1;
	} else {
		this.cursorDirection = 1;
	}
	
	if ( !this.timer ) {
		this.togglePlay();
	}
}   


Sonifier.prototype.setRange = function ( xAxis, yAxis ) { 
  //this.oscillator.stop();
}   

Sonifier.prototype.trackPointer = function (event) { 
	if ( this.cursor ) {
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
		|| ( 0 == x && -1 == this.cursorDirection ) ) {
		this.stopPlay();
	} else {
	  var cursor_p1 = new Point2D(x, this.miny);
	  var cursor_p2 = new Point2D(x, this.maxy);

	  if (!this.dataLinePoints) {
	    this.dataLinePoints = [];
	    var dataLineArray = null;
			if ("path" == this.dataLine.localName) {
				dataLineArray = this.dataLine.getAttribute("d").split('L');
			} else if ("polyline" == this.dataLine.localName || "polygon" == this.dataLine.localName) {
				dataLineArray = this.dataLine.getAttribute("points").split(" ");
				// dataLineArray = 
			}
			console.log(dataLineArray)
			
	    for (var vp in dataLineArray ) {
				if (typeof dataLineArray[vp] != 'function') { 
		      var values = dataLineArray[vp].replace(/[A-Za-z]+/g, '').split(/[ ,]+/);
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
	  this.cursor.setAttribute('d', "M" + x + "," + this.miny + " " + x + "," + this.maxy);

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
		to transform number x in range [a,b] to	number y in range [c,d], use this formula:
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
		|| this.axisX.chartMax == x ) {
			console.log("tick")
			
			//this.playTickmark(); /// buggy right now, doesn't turn off
			
			
		// 	var msg = "";
		// 	if (  this.axisX.pos == x ) {
		// 		msg = "axis marker: " + x;
		// 	} else if (  this.axisX.chartMin == x ) {
		// 		msg = "min: " + x;
		// 	}	else if (  this.axisX.chartMax == x ) {
		// 		msg = "max: " + x;
		// 	}
		// console.log(msg)
	}
}   

Sonifier.prototype.positionCursor = function ( x, y, setLine ) { 
  this.cursorpoint.setAttribute( "cx", x );
  this.cursorpoint.setAttribute( "cy", y );

	if ( setLine ) {
	  // update cursor line
	  this.cursor.setAttribute('d', "M" + x + "," + this.miny + " " + x + "," + this.maxy);
	}
}

Sonifier.prototype.setDetune = function ( detune ) { 
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
		this.panner.panningModel = 'equalpower';
		this.panner.distanceModel = 'exponential';
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

Sonifier.prototype.setVolume = function ( gain ) { 
	if (this.volume) {
	  this.volume.gain.value = gain;		
	}
}

Sonifier.prototype.toggleVolume = function ( forceMute ) { 
	if ( !this.isMute || forceMute ) {
		this.isMute = true;
    this.volume.disconnect(this.audioContext.destination);
	} else {
		this.isMute = false;
    this.volume.connect(this.audioContext.destination);
	}
}

// panVal is a float between -1 and 1: -1 == left; 1 == right
Sonifier.prototype.pan = function () { 	
	var panAngle = this.panValue * Math.PI / 2;
	this.panner.setPosition(Math.sin(panAngle), Math.cos(panAngle), 1, 0, 0.5)
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
	setTimeout( function() { 
    t.tickTone.disconnect(t.tickContext.destination);
	}, 100);
}


Sonifier.prototype.speak = function ( msg ) { 
  if ( "undefined" != typeof speechSynthesis ) {
	  if ( speechSynthesis.speaking ) {
	    speechSynthesis.cancel();
	  }
	
		if ( !msg ) {
			msg = "x = " + this.axisX.scale( this.valuePoint.x );
			msg += ", y = " + this.axisY.scale( this.valuePoint.y );
		}
		
		var t = this;
		t.toggleVolume( true );
		if ( t.isPlaying ) {
			t.togglePlay( true );
		}

    var voice = new SpeechSynthesisUtterance();
    voice.text = msg;
    voice.lang = 'en-US';
    voice.rate = 1.2;
		voice.onend = function() { 
			t.toggleVolume(); 
			if ( t.isPlaying ) {
				t.togglePlay();
			}
		}
    speechSynthesis.speak( voice );
  }
}

function Axis(min, max, pos, chartMin, chartMax) {
	if ( arguments.length > 0 ) {
		this.min = min;
		this.max = max;
		this.pos = pos; // position of the axis line along the axis
		this.chartMin = chartMin;
		this.chartMax = chartMax;
	}
}

Axis.prototype.scale = function( val ) {
	var newVal = (val / ((this.chartMax - this.chartMin) / (this.max - this.min))) + this.min;
	newVal = Math.round( newVal * 10 ) / 10;
	return newVal;
};


/****
* Helper methods
****/

Array.prototype.max = function() {
  return Math.max.apply(null, this)
}

Array.prototype.min = function() {
  return Math.min.apply(null, this)
}

function bind (scope, fn) {
	return function() {
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
	if ( arguments.length > 0 ) {
		this.x = x;
		this.y = y;
	}
}

function Intersection(status) {
	if ( arguments.length > 0 ) {
		this.init(status);
	}
}

Intersection.prototype.init = function(status) {
	this.status = status;
	this.points = new Array();
};

Intersection.prototype.appendPoints = function(points) {
	this.points = this.points.concat(points);
};

Intersection.intersectLineLine = function(a1, a2, b1, b2) {
	var result;

	var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
	var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
	var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

	if ( u_b != 0 ) {
		var ua = ua_t / u_b;
		var ub = ub_t / u_b;

		if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
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
		if ( ua_t == 0 || ub_t == 0 ) {
			result = new Intersection("Coincident");
		} else {
			result = new Intersection("Parallel");
		}
	}

	return result;
};

Intersection.intersectLinePolygon = function(a1, a2, points) {
	var result = new Intersection("No Intersection");
	var length = points.length;

	for ( var i = 0; i < length; ++i ) {
		var b1 = points[i];
		var b2 = points[(i+1) % length];
		var inter = Intersection.intersectLineLine(a1, a2, b1, b2);

		result.appendPoints(inter.points);
	}

	if ( result.points.length > 0 ) {
		result.status = "Intersection";
	}
	
	return result;
};

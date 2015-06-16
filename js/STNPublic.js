//various global variables are set here (Declare here, instantiate below)     
var map, legendLayers = [];
var identifyParams;
var navToolbar;
var locator;
var allLayers;

var filterSensors, clearSelections;

//var currentRadParCheck;

var layerArray = [];

var disclaimerHTML = "<p>Data are provisional and are subject to revision until thoroughly reviewed and approved.</p><p>Real-time data relayed by satellite or other telemetry are automatically screened to not display improbable values until they can be verified.</p><p>Provisional data may be inaccurate due to instrument malfunctions or physical changes at the measurement site. Subsequent review based on field inspections and measurements may result in significant revisions to the data.</p><p>The data are being provided to meet the need for timely best science and are released on the condition that neither the USGS nor the U.S. Government may be held liable for any damages resulting from authorized or unauthorized use of the information. Data users are cautioned to consider carefully the provisional nature of the information before using it for decisions that concern personal or public safety or the conduct of business that involves substantial monetary or operational consequences.</p><p>Information concerning the accuracy and appropriate uses of these data or concerning other hydrologic data may be obtained from the USGS.</p><button type=\"button\" class=\"disclaimerButton\" onclick=\"dojo.style('disclaimer', 'visibility', 'hidden');\">OK</button>";

// var rapidDeployDef = [];
// var waveHtDef = [];
// var baroDef = [];
// var metDef = [];
// var stormTideDef = [];
// var peaksDef = [];
// var HWMsDef = [];

var filterDefinition = [];

//allLayers = STNPubLayers;

require([
  "esri/map",
  "esri/dijit/Popup",
  "esri/toolbars/navigation",
  "esri/dijit/BasemapGallery",
  "esri/geometry/Extent",
  "dojo/parser",
  "dojo/ready",
  "dojo/dom",
  "dojo/on",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "esri/graphicsUtils",
  "esri/geometry/Point",
  "esri/layers/FeatureLayer",
  "dijit/registry",
  "dojo/_base/array",
  "dojo/dom-attr",
  "dojo/data/ItemFileReadStore",
  "dijit/layout/BorderContainer",
  "dijit/TitlePane",
  "dijit/layout/ContentPane",
  "dijit/form/FilteringSelect",
  "dojo/dom-style",
  "dojo/dom-construct",
  "dojo/domReady!"
], function(
  Map,
  Popup,
  Navigation,
  BasemapGallery,
  Extent,
  parser,
  ready,
  dom,
  on,
  Query,
  QueryTask,
  graphicsUtils,
  Point,
  FeatureLayer,
  registry,
  array,
  domAttr,
  ItemFileReadStore,
  BorderContainer,
  TitlePane,
  ContentPane,
  FilteringSelect,
  domStyle,
  domConstruct) {


	allLayers = STNPubLayers;
     
	//sets up the onClick listener for the USGS logo
	on(dom.byId("usgsLogo"), "click", showUSGSLinks);

	
	// a popup is constructed below from the dijit.Popup class, which extends some addtional capability to the InfoWindowBase class.
	var popup = new Popup({},domConstruct.create("div"));
	
	map = new Map("map", {
    	basemap: "topo",
		wrapAround180: true,
		extent: new Extent({xmin:-14580516.019450117,ymin:2072972.2070934423,xmax:-5618427.327072154,ymax:7527518.54552217,spatialReference:{wkid:102100}}), 
		slider: true,
		sliderStyle: "small", //use "small" for compact version, "large" for long slider version
		logo:false,
		infoWindow: popup
	});
	
    navToolbar = new Navigation(map);
	
    on(map, "load", mapReady);
	
	var basemapGallery = new BasemapGallery({
		showArcGISBasemaps: true,
		map: map
	}, "basemapGallery");
	basemapGallery.startup();

    ///tables for sensors filter
    var eventList = new FeatureLayer(mapServicesRoot + "/Sensors/MapServer/9", { mode: FeatureLayer.MODE_ONDEMAND, outFields: ["*"]});

    var stateList = new FeatureLayer(mapServicesRoot + "/Sensors/MapServer/8", { mode: FeatureLayer.MODE_ONDEMAND, outFields: ["*"]});

    var countyList = new FeatureLayer(mapServicesRoot + "/Sensors/MapServer/10", { mode: FeatureLayer.MODE_ONDEMAND, outFields: ["*"]});

    var eventQuery = new Query();
    eventQuery.where = "EVENT_NAME IS NOT null";
    eventList.queryFeatures(eventQuery, function(featureSet) {
        var eventFilterValues = array.map(featureSet.features, function(feature) {
            return {
                eventName: feature.attributes.EVENT_NAME
            };
        });

        eventFilterValues.unshift( new Object ({eventName: " All"}));

        var eventDataItems = {
            identifier: 'eventName',
            label: 'eventName',
            items: eventFilterValues
        };

        var eventStore = new ItemFileReadStore({
            data: eventDataItems
        });

        var eventSelect = registry.byId("eventSelectInput");
        domAttr.set(eventSelect, "store", eventStore);
    });

    var stateQuery = new Query();
    stateQuery.where = "STATE IS NOT null";
    stateList.queryFeatures(stateQuery, function(featureSet) {
        var stateFilterValues = array.map(featureSet.features, function(feature) {
            return {
                stateOption: feature.attributes.STATE
            };
        });

        stateFilterValues.unshift( new Object ({stateOption: " All"}));

        var stateDataItems = {
            identifier: 'stateOption',
            label: 'stateOption',
            items: stateFilterValues
        };

        var stateStore = new ItemFileReadStore({
            data: stateDataItems
        });

        //dijit.byId("stateSelectInput").set("store", stateStore);
        domAttr.set(registry.byId("stateSelectInput"), "store", stateStore);

    });
    var countyQuery = new Query();
    countyQuery.where = "COUNTY IS NOT null";

    countyList.queryFeatures(countyQuery, function(featureSet) {
        var countyFilterValues = array.map(featureSet.features, function(feature) {
            return {
                countyOption: feature.attributes.COUNTY
            };
        });

        countyFilterValues.unshift( new Object ({countyOption: " All"}));

        var countyDataItems = {
            identifier: 'countyOption',
            label: 'countyOption',
            items: countyFilterValues
        };

        var countyStore = new ItemFileReadStore({
            data: countyDataItems
        });

        //dijit.byId("countySelectInput").set("store", countyStore);
        domAttr.set(registry.byId("countySelectInput"), "store", countyStore);

    });




	var executeFilterHandler = on(dom.byId("sensorSubmitButton"), "click", function(){

		for (var i = 0; i < legendLayers.length; i++) {

				if (legendLayers[i].layer !== null){

					legendLayers[i].layer.setDisableClientCaching(true);
					legendLayers[i].layer.setLayerDefinitions(filterDefinition);
					legendLayers[i].layer.refresh();
				}
			}

			var selectionQueryTask = new QueryTask(mapServicesRoot + "/Sensors/MapServer/0");
			var selectionQuery = new Query();

			selectionQuery.returnGeometry = true;
			selectionQuery.where = filterDefinition[0];

			selectionQueryTask.execute(selectionQuery,onQueryComplete);

			function onQueryComplete (results){

				var selectionExtent = new graphicsUtils.graphicsExtent(results.features);

				if (results.features.length > 1){
					selectionExtent = selectionExtent.expand(3);
					map.setExtent(selectionExtent, true);
				} else {
					//Zoom to the location of the single returned feature's geometry
					var singleSiteGraphic = results.features[0];
					var location = new Point(singleSiteGraphic.geometry.x, singleSiteGraphic.geometry.y, map.spatialReference);
					map.centerAndZoom(location, 15);
				}
			}

			// function selectionQueryError(error){
			// 	console.log(error);
			// }
				
			var noRecordsQueryTask = new QueryTask(mapServicesRoot + "/Sensors/MapServer/0");
			var noRecordsQuery = new Query();
			
			noRecordsQuery.where = filterDefinition[0];

			if (filterDefinition[0] !== "") {
			noRecordsQueryTask.executeForCount(noRecordsQuery, function (count){ 
				//alert("Your filter selection returned " + count + " sites.");
				var filterCount = count;
				console.log(filterCount);
				//displayFilterCount();
			});
			
			}
			console.log("layer definition updated, executed, and extent refreshed");


	});


	var clearSelectionsHandler = on(dom.byId("sensorClearButton"), "click", function () {

			filterDefinition.length = 0;

			var blankString = '';

			registry.byId("eventSelectInput").setDisplayedValue(blankString);
			registry.byId("stateSelectInput").setDisplayedValue(blankString);
			registry.byId("countySelectInput").setDisplayedValue(blankString);

			for (var i = 0; i < legendLayers.length; i++) {
				if (legendLayers[i].layer !== null){
					legendLayers[i].layer.setLayerDefinitions(filterDefinition);
				}
			}

			var fullExtent = new Extent({"xmin":-15238485.958928764,"ymin":2101101.0335023645,"xmax":-6286181.2061713,"ymax":7350184.639900593,"spatialReference":{"wkid":102100}});
			map.setExtent(fullExtent);
			////make fullextent global

	});



	require([
	  "esri/dijit/Legend",
	  "esri/tasks/locator",
	  "esri/tasks/query",
	  "esri/tasks/QueryTask",
	  "esri/graphicsUtils",
	  "esri/geometry/Point",
	  "esri/geometry/Extent",
	  "dijit/form/CheckBox",
	  "dijit/form/RadioButton",
	  "dojo/query",
	  "dojo/dom-construct",
	  "dojo/dom-style"
	], function(
	  Legend,
	  Locator,
	  Query,
	  QueryTask,
	  graphicsUtils,
	  Point,
	  Extent,
	  CheckBox,
	  RadioButton,
	  query,
	  domConstruct,
	  domStyle) {

	  	on(map, "layers-add-result", function() {

			var legend = new Legend({
				map:map,
				layerInfos:legendLayers
			},"legendDiv");
			legend.startup();

			//this counter to track first and last of items in legendLayers
			var i = 0;
			var lastItem = legendLayers.length;		
			
			array.forEach(legendLayers, function(layer){
					
					var layerName = layer.title;

					if (layer.type != "heading") {

						if (layer.toggleType == "radioParent"){
							
							var radioParentCheck = new CheckBox({
								name:"radioParentCheck" + layer.group,
								id:"radioParentCheck_" + layer.group,
								params: {group: layer.group},
								onChange:function(){
									var radChildLayers = [];
									var grp = this.params.group;
									array.forEach (legendLayers, function (layer){
										if (grp == layer.group && layer.toggleType != "radioParent"  ){
											radChildLayers.push(layer.layer);
										}
									});
									if (!this.checked){
										array.forEach (radChildLayers, function (layer){
											layer.setVisibility(false);
										});	
										var divs = query("." + grp);
										for(var i = 0; i < divs.length; i++) {
											divs[i].style.display= "none";  
										}
									} 
									if (this.checked){
										var divs = query("." + grp);
										for(var i = 0; i < divs.length; i++) {
										    divs[i].style.display= "block"; 
										}
									}
								}
							});
							var toggleDiv = domConstruct.create("div");			
							domConstruct.place(toggleDiv,dom.byId("toggle"), 0 );
							domConstruct.place(radioParentCheck.domNode,toggleDiv,"first");
							domStyle.set(toggleDiv, "paddingLeft", "15px");
							if (i === 0) {
								domStyle.set(toggleDiv, "paddingBottom", "10px");
							} else if (i == lastItem) {
								domStyle.set(toggleDiv, "paddingTop", "10px");
							}
							var radioParentCheckLabel = domConstruct.create('label',{'for':radioParentCheck.name,innerHTML:layerName},radioParentCheck.domNode,"after");
							domConstruct.place("<br/>",radioParentCheckLabel,"after");

						} else if (layer.toggleType == "checkbox"){
							
							var checkBox = new CheckBox({
								name:"checkBox" + layer.layer.id,
								id:"checkBox" + layer.layer.id,
								value:layer.layer.id,
								checked:layer.layer.visible,
								onChange:function(){
									var checkLayer = map.getLayer(this.value);
									checkLayer.setVisibility(!checkLayer.visible);
									this.checked = checkLayer.visible;	
								}
							});
							var toggleDiv = domConstruct.create("div");
							domConstruct.place(toggleDiv,dom.byId("toggle"), 0 );
							domConstruct.place(checkBox.domNode,toggleDiv,"first");
							domStyle.set(toggleDiv, "paddingLeft", "15px");
							if (i === 0) {
								domStyle.set(toggleDiv, "paddingBottom", "10px");
							} else if (i == lastItem) {
								domStyle.set(toggleDiv, "paddingTop", "10px");
							}
							var checkLabel = domConstruct.create('label',{'for':checkBox.name,innerHTML:layerName},checkBox.domNode,"after");
							domConstruct.place("<br/>",checkLabel,"after");

						} else if (layer.toggleType == "radio") {
							
							var radioButton = new RadioButton({
								name: layer.group,
								id: "radioButton" + layer.layer.id,
								value:layer.layer.id,
								checked:layer.layer.visible,
								params: {group: layer.group},
								onChange:function() {
									var radioLayer = map.getLayer(this.value);
									var parentID = "radioParentCheck_" + layer.group;

									var checkedEval = (this.checked && registry.byId(parentID).checked) ? true : false;
									radioLayer.setVisibility(checkedEval);
									//(this.checked && registry.byId(parentID).checked) ? radioLayer.setVisibility(true) : radioLayer.setVisibility(false);
								}
							});	
							var toggleDiv = domConstruct.create("div");
							domConstruct.place(toggleDiv,dom.byId("toggle"), 0 );
							domConstruct.place(radioButton.domNode,toggleDiv,"first");
							domAttr.set(toggleDiv, "class", radioButton.params.group);
							domStyle.set(toggleDiv, "paddingLeft", "25px");
							domStyle.set(toggleDiv, "display", "none");
							if (i === 0) {
								domStyle.set(toggleDiv, "paddingBottom", "10px");
							} else if (i == lastItem) {
								domStyle.set(toggleDiv, "paddingTop", "10px");
							}
							var radioLabel = domConstruct.create('label',{'for':radioButton.name,innerHTML:layerName},radioButton.domNode,"after");
							domConstruct.place("<br/>",radioLabel,"after");
						}
						/////code below for headings w/out toggles
					} else  {
						
						var headingDiv = domConstruct.create("div");
						headingDiv.innerHTML = layer.title;
						domConstruct.place(headingDiv,dom.byId("toggle"),"first");
						domStyle.set(headingDiv, "paddingTop", "10px");
						domStyle.set(headingDiv, "color", "#D3CFBA");
						if (i === 0) {
							domStyle.set(headingDiv, "paddingBottom", "10px");
						} else if (i == lastItem) {
							domStyle.set(headingDiv, "paddingTop", "10px");
						}	
						
					}	
				i++;	
				//don't miss this iterator!!!!!
			});
		});

		addAllLayers();
		
		//Geocoder reference to geocoding services
	    locator = new Locator("http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer");
		//calls the function that does the goeocoding logic (found in geocoder.js, an associated JS module)*
	    //dojo.connect(locator, "onAddressToLocationsComplete", showResults);
	    on(locator, "address-to-locations-complete", showResults);
		
		dom.byId("disclaimer").innerHTML = disclaimerHTML;
		
		var disclaimerNode = dom.byId("disclaimer");
		
		var horCenter = domStyle.get(document.body, "width") / 2;
		var vertCenter = domStyle.get(document.body, "height") / 2;
		var disclaimerWidth = domStyle.get(disclaimerNode, "width") / 2;
		var disclaimerHeight = domStyle.get(disclaimerNode, "height") / 2;
		domStyle.set(disclaimerNode, 'left', horCenter - disclaimerWidth + "px");
		domStyle.set(disclaimerNode, 'top', vertCenter - disclaimerHeight + "px");
		domStyle.set(disclaimerNode, 'visibility', 'visible');

		
		filterSensors = function  () {
			console.log("filterSensors function fired");

			filterDefinition.length = 0;

			if (!(registry.byId("eventSelectInput").value === " All" || registry.byId("eventSelectInput").value === "")) {
				filterDefinition.push("EVENT_NAME LIKE '" +  registry.byId("eventSelectInput").value + "'");
			} else {
				filterDefinition.push("EVENT_NAME LIKE '%'");
			}

			if (!(registry.byId("stateSelectInput").value === " All" || registry.byId("stateSelectInput").value === "")) {
				filterDefinition.push("STATE LIKE '" +  registry.byId("stateSelectInput").value + "'");
			} else {
				filterDefinition.push("STATE LIKE '%'");
			}

			if (!(registry.byId("countySelectInput").value === " All" || registry.byId("countySelectInput").value === "")) {
				filterDefinition.push("COUNTY LIKE '" +  registry.byId("countySelectInput").value + "'");
			} else {
				filterDefinition.push("COUNTY LIKE '%'");
			}

			filterDefinition = ['((' + filterDefinition.join(") AND (") + '))'];

			console.log (filterDefinition[0]);

			console.log("filter definition updated");
		}
		//end filterSensors function

		function addAllLayers() {
			
			var radioGroup;
			var radioGroupArray;

			require([
			  "esri/layers/ArcGISDynamicMapServiceLayer"
			], function(
			  ArcGISDynamicMapServiceLayer) {

				for (var layer in allLayers) {
					if (allLayers[layer].wimOptions.type == "layer") {

						console.log(layer);
						var newLayer = new ArcGISDynamicMapServiceLayer(allLayers[layer].url, allLayers[layer].arcOptions);
						if (allLayers[layer].visibleLayers) {
							newLayer.setVisibleLayers(allLayers[layer].visibleLayers);
						}
						
						//set wim options
						if (allLayers[layer].wimOptions) {
							if (allLayers[layer].wimOptions.includeInLayerList === true) {
								if (allLayers[layer].wimOptions.layerOptions.selectorType == "radio" ) {

									radioGroup = allLayers[layer].wimOptions.layerOptions.radioGroup;
									radioGroupArray.push({group: radioGroup, layer:newLayer});

									legendLayers.push({layer: newLayer, type:"layer", title: layer, toggleType: "radio", group: radioGroup}); 
									
								} else {
									legendLayers.push({layer: newLayer, type:"layer", title: layer, toggleType: "checkbox", group: ""});
								}
							}
						} else {
							legendLayers.push({layer: newLayer, title: layer});
						}
						
						layerArray.push(newLayer);

					} else if (allLayers[layer].wimOptions.type == "radioParent"){
						
						radioGroup = allLayers[layer].wimOptions.layerOptions.radioGroup;
						radioGroupArray.push({group: radioGroup, layer: null});
						
						legendLayers.push({layer:null, type: "radioParent", title: layer, toggleType: "radioParent", group: radioGroup});
						
					} else if (allLayers[layer].wimOptions.type == "heading") {
						legendLayers.push({layer: null, type: "heading", title: layer});
					}
				}
				map.addLayers(layerArray);
				
			});//end of require statement just for dynamic map service layer	
		}//end of addAllLayers

	});//end of require statement containing legend building code

	///////////////////////////////////////////////////////////////////////
	//mapReady function that fires when the first or base layer has been successfully added to the map. Very useful in many situations. called above by this line: dojo.connect(map, "onLoad", mapReady)
	function mapReady(){ 	

		require([
		  "esri/tasks/IdentifyTask",
		  "esri/tasks/IdentifyParameters",
		  "esri/geometry/webMercatorUtils"
		], function(
		  IdentifyTask,
		  IdentifyParameters,
		  webMercatorUtils) {
			
			//var latLngBar = new LatLngScale({map: map}, "latLngScaleBar");
			
			on(map, "click", function(evt) {
			
				for (var i=0; i< map.layerIds.length; i++) {
					if (map.layerIds[i].match(/stormTide/g) !== null) {
						if (map.getLayer(map.layerIds[i]).visible === true) {
			
							var identifyInstrument = new IdentifyTask(mapServicesRoot + "/StormTide/MapServer");
						
							identifyParams = new IdentifyParameters();
							identifyParams.tolerance =5;
							identifyParams.returnGeometry = true;
							identifyParams.layerIds = [0];
							identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_TOP;
							identifyParams.width = map.width;
							identifyParams.height = map.height;
							identifyParams.geometry = evt.mapPoint;
							identifyParams.mapExtent = map.extent;
                            identifyParams.layerDefinitions = [];
                            identifyParams.layerDefinitions[0] = filterDefinition[0];
							identifyInstrument.execute(identifyParams, function(identifyResults){ 

								if (identifyResults.length > 0) { 
					
									var sensorType = identifyResults[0].layerName;
									var eventName = identifyResults[0].feature.attributes.EVENT_NAME;
									var siteId = identifyResults[0].feature.attributes.SITE_ID;
									var instrumentId = identifyResults[0].feature.attributes.INSTRUMENT_ID;
									var siteName = identifyResults[0].feature.attributes.SITE_NAME;
									var siteNum = identifyResults[0].feature.attributes.SITE_NO;
									var instrumentCity = identifyResults[0].feature.attributes.CITY;
									var instrumentCounty = identifyResults[0].feature.attributes.COUNTY;
									var instrumentState = identifyResults[0].feature.attributes.STATE;
									var instrumentStatus = identifyResults[0].feature.attributes.STATUS;
									var instrumentLat = identifyResults[0].feature.geometry.y;
									var instrumentLong = identifyResults[0].feature.geometry.x;
									
									var point = webMercatorUtils.xyToLngLat(instrumentLong, instrumentLat);
									console.log(point[0]);
									console.log(point[1]);
									
									map.infoWindow.setTitle( );
									map.infoWindow.setContent(
										"<b><font size=\"3\">" + sensorType + " :</br> " + eventName +
										"</b></font><p><b>Site Name</b>: " + siteName +"<br/>" +
										"<b>Site Number</b>: " + siteNum +"<br/></p>" +
										"<p><b><font color=\"red\">Status</b>: " + instrumentStatus +"</font><br/></p>" +
										"<p><b>City</b>: " + instrumentCity +"<br/>" +
										"<b>County</b>: " + instrumentCounty +"<br/>" +
										"<b>State</b>: " + instrumentState +"<br/></p>" +
										"<p><b>Latitude</b>: " + point[1].toFixed(3) +
										"</br><b>Longitude</b>: " + point[0].toFixed(3) +"<br/></p>" +
										"<b><a target=\"blank\" href=" + sensorPageURLRoot + siteId + "&sensorId=" + instrumentId + " \">Link to data page</a></b>");
										
									map.infoWindow.show(evt.mapPoint,map.getInfoWindowAnchor(evt.screenPoint));
								}
							
							});	
						}
					}
				}
					
				for (var i=0; i< map.layerIds.length; i++) {
					if (map.layerIds[i].match(/met/g) !== null) {
						if (map.getLayer(map.layerIds[i]).visible === true) {
			
							var identifyInstrument = new IdentifyTask(mapServicesRoot + "/Meteorological/MapServer");
						
							identifyParams = new IdentifyParameters();
							identifyParams.tolerance =5;
							identifyParams.returnGeometry = true;
							identifyParams.layerIds = [0];
							identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_TOP;
							identifyParams.width = map.width;
							identifyParams.height = map.height;
							identifyParams.geometry = evt.mapPoint;
							identifyParams.mapExtent = map.extent;
                            identifyParams.layerDefinitions = [];
                            identifyParams.layerDefinitions[0] = filterDefinition[0];
							identifyInstrument.execute(identifyParams, function(identifyResults){ 

								if (identifyResults.length > 0) { 
					
									var sensorType = identifyResults[0].layerName;
									var eventName = identifyResults[0].feature.attributes.EVENT_NAME;
									var siteId = identifyResults[0].feature.attributes.SITE_ID;
									var instrumentId = identifyResults[0].feature.attributes.INSTRUMENT_ID;
									var siteName = identifyResults[0].feature.attributes.SITE_NAME;
									var siteNum = identifyResults[0].feature.attributes.SITE_NO;
									var instrumentCity = identifyResults[0].feature.attributes.CITY;
									var instrumentCounty = identifyResults[0].feature.attributes.COUNTY;
									var instrumentState = identifyResults[0].feature.attributes.STATE;
									var instrumentStatus = identifyResults[0].feature.attributes.STATUS;
									var instrumentLat = identifyResults[0].feature.geometry.y;
									var instrumentLong = identifyResults[0].feature.geometry.x;
									
									var point = webMercatorUtils.xyToLngLat(instrumentLong, instrumentLat);
									console.log(point[0]);
									console.log(point[1]);
									
									map.infoWindow.setTitle( );
									map.infoWindow.setContent(
										"<b><font size=\"3\">" + sensorType + " :</br> " + eventName +
										"</b></font><p><b>Site Name</b>: " + siteName +"<br/>" +
										"<b>Site Number</b>: " + siteNum +"<br/></p>" +
										"<p><b><font color=\"red\">Status</b>: " + instrumentStatus +"</font><br/></p>" +
										"<p><b>City</b>: " + instrumentCity +"<br/>" +
										"<b>County</b>: " + instrumentCounty +"<br/>" +
										"<b>State</b>: " + instrumentState +"<br/></p>" +
										"<p><b>Latitude</b>: " + point[1].toFixed(3) +
										"</br><b>Longitude</b>: " + point[0].toFixed(3) +"<br/></p>" +
                                        "<b><a target=\"blank\" href=" + sensorPageURLRoot + siteId + "&sensorId=" + instrumentId + " \">Link to data page</a></b>");
										
									map.infoWindow.show(evt.mapPoint,map.getInfoWindowAnchor(evt.screenPoint));
								}
							});	
						}
					}
				}
					
				for (var i=0; i< map.layerIds.length; i++) {
					if (map.layerIds[i].match(/baro/g) !== null) {
						if (map.getLayer(map.layerIds[i]).visible === true) {
			
							var identifyInstrument = new IdentifyTask(mapServicesRoot + "/Barometric/MapServer");
						
							identifyParams = new IdentifyParameters();
							identifyParams.tolerance =5;
							identifyParams.returnGeometry = true;
							identifyParams.layerIds = [0];
							identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_TOP;
							identifyParams.width = map.width;
							identifyParams.height = map.height;
							identifyParams.geometry = evt.mapPoint;
							identifyParams.mapExtent = map.extent;
                            identifyParams.layerDefinitions = [];
                            identifyParams.layerDefinitions[0] = filterDefinition[0];
							identifyInstrument.execute(identifyParams, function(identifyResults){ 

								if (identifyResults.length > 0){
					
									var sensorType = identifyResults[0].layerName;
									var eventName = identifyResults[0].feature.attributes.EVENT_NAME;
									var siteId = identifyResults[0].feature.attributes.SITE_ID;
									var instrumentId = identifyResults[0].feature.attributes.INSTRUMENT_ID;
									var siteName = identifyResults[0].feature.attributes.SITE_NAME;
									var siteNum = identifyResults[0].feature.attributes.SITE_NO;
									var instrumentCity = identifyResults[0].feature.attributes.CITY;
									var instrumentCounty = identifyResults[0].feature.attributes.COUNTY;
									var instrumentState = identifyResults[0].feature.attributes.STATE;
									var instrumentStatus = identifyResults[0].feature.attributes.STATUS;
									var instrumentLat = identifyResults[0].feature.geometry.y;
									var instrumentLong = identifyResults[0].feature.geometry.x;
									
									var point = webMercatorUtils.xyToLngLat(instrumentLong, instrumentLat);
									console.log(point[0]);
									console.log(point[1]);
									
									map.infoWindow.setTitle( );
									map.infoWindow.setContent(
										"<b><font size=\"3\">" + sensorType + " :</br> " + eventName +
										"</b></font><p><b>Site Name</b>: " + siteName +"<br/>" +
										"<b>Site Number</b>: " + siteNum +"<br/></p>" +
										"<p><b><font color=\"red\">Status</b>: " + instrumentStatus +"</font><br/></p>" +
										"<p><b>City</b>: " + instrumentCity +"<br/>" +
										"<b>County</b>: " + instrumentCounty +"<br/>" +
										"<b>State</b>: " + instrumentState +"<br/></p>" +
										"<p><b>Latitude</b>: " + point[1].toFixed(3) +
										"</br><b>Longitude</b>: " + point[0].toFixed(3) +"<br/></p>" +
                                        "<b><a target=\"blank\" href=" + sensorPageURLRoot + siteId + "&sensorId=" + instrumentId + " \">Link to data page</a></b>");
										
									map.infoWindow.show(evt.mapPoint,map.getInfoWindowAnchor(evt.screenPoint));
								}
							
							});	
						}
					}
				}
					
				for (var i=0; i< map.layerIds.length; i++) {
					if (map.layerIds[i].match(/waveHt/g) !== null) {
						if (map.getLayer(map.layerIds[i]).visible === true) {
			
							var identifyInstrument = new IdentifyTask(mapServicesRoot + "/WaveHeight/MapServer");
						
							identifyParams = new IdentifyParameters();
							identifyParams.tolerance =5;
							identifyParams.returnGeometry = true;
							identifyParams.layerIds = [0];
							identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_TOP;
							identifyParams.width = map.width;
							identifyParams.height = map.height;
							identifyParams.geometry = evt.mapPoint;
							identifyParams.mapExtent = map.extent;
                            identifyParams.layerDefinitions = [];
                            identifyParams.layerDefinitions[0] = filterDefinition[0];
							identifyInstrument.execute(identifyParams, function(identifyResults){ 
					
								if (identifyResults.length > 0){

									var sensorType = identifyResults[0].layerName;
									var eventName = identifyResults[0].feature.attributes.EVENT_NAME;
									var siteId = identifyResults[0].feature.attributes.SITE_ID;
									var instrumentId = identifyResults[0].feature.attributes.INSTRUMENT_ID;
									var siteName = identifyResults[0].feature.attributes.SITE_NAME;
									var siteNum = identifyResults[0].feature.attributes.SITE_NO;
									var instrumentCity = identifyResults[0].feature.attributes.CITY;
									var instrumentCounty = identifyResults[0].feature.attributes.COUNTY;
									var instrumentState = identifyResults[0].feature.attributes.STATE;
									var instrumentStatus = identifyResults[0].feature.attributes.STATUS;
									var instrumentLat = identifyResults[0].feature.geometry.y;
									var instrumentLong = identifyResults[0].feature.geometry.x;
									
									var point = webMercatorUtils.xyToLngLat(instrumentLong, instrumentLat);
									console.log(point[0]);
									console.log(point[1]);
									
									map.infoWindow.setTitle( );
									map.infoWindow.setContent(
										"<b><font size=\"3\">" + sensorType + " :</br> " + eventName +
										"</b></font><p><b>Site Name</b>: " + siteName +"<br/>" +
										"<b>Site Number</b>: " + siteNum +"<br/></p>" +
										"<p><b><font color=\"red\">Status</b>: " + instrumentStatus +"</font><br/></p>" +
										"<p><b>City</b>: " + instrumentCity +"<br/>" +
										"<b>County</b>: " + instrumentCounty +"<br/>" +
										"<b>State</b>: " + instrumentState +"<br/></p>" +
										"<p><b>Latitude</b>: " + point[1].toFixed(3) +
										"</br><b>Longitude</b>: " + point[0].toFixed(3) +"<br/></p>" +
                                        "<b><a target=\"blank\" href=" + sensorPageURLRoot + siteId + "&sensorId=" + instrumentId + " \">Link to data page</a></b>");
										
									map.infoWindow.show(evt.mapPoint,map.getInfoWindowAnchor(evt.screenPoint));
								}
							
							});	
						}
					}
				}
					
				for (var i=0; i< map.layerIds.length; i++) {
					if (map.layerIds[i].match(/rapidDeploy/g) !== null) {
						if (map.getLayer(map.layerIds[i]).visible === true) {
			
							var identifyInstrument = new IdentifyTask(mapServicesRoot + "/RapidDeployGage/MapServer");
						
							identifyParams = new IdentifyParameters();
							identifyParams.tolerance =5;
							identifyParams.returnGeometry = true;
							identifyParams.layerIds = [0];
							identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_TOP;
							identifyParams.width = map.width;
							identifyParams.height = map.height;
							identifyParams.geometry = evt.mapPoint;
							identifyParams.mapExtent = map.extent;
                            identifyParams.layerDefinitions = [];
                            identifyParams.layerDefinitions[0] = filterDefinition[0];
							identifyInstrument.execute(identifyParams, function(identifyResults){ 

								if (identifyResults.length > 0) {
					
									var sensorType = identifyResults[0].layerName;
									var eventName = identifyResults[0].feature.attributes.EVENT_NAME;
									var siteId = identifyResults[0].feature.attributes.SITE_ID;
									var instrumentId = identifyResults[0].feature.attributes.INSTRUMENT_ID;
									var siteName = identifyResults[0].feature.attributes.SITE_NAME;
									var siteNum = identifyResults[0].feature.attributes.SITE_NO;
									var instrumentCity = identifyResults[0].feature.attributes.CITY;
									var instrumentCounty = identifyResults[0].feature.attributes.COUNTY;
									var instrumentState = identifyResults[0].feature.attributes.STATE;
									var instrumentStatus = identifyResults[0].feature.attributes.STATUS;
									var instrumentLat = identifyResults[0].feature.geometry.y;
									var instrumentLong = identifyResults[0].feature.geometry.x;
									
									var point = webMercatorUtils.xyToLngLat(instrumentLong, instrumentLat);
									console.log(point[0]);
									console.log(point[1]);
									
									map.infoWindow.setTitle( );
									map.infoWindow.setContent(
										"<b><font size=\"3\">" + sensorType + " :</br> " + eventName +
										"</b></font><p><b>Site Name</b>: " + siteName +"<br/>" +
										"<b>Site Number</b>: " + siteNum +"<br/></p>" +
										"<p><b><font color=\"red\">Status</b>: " + instrumentStatus +"</font><br/></p>" +
										"<p><b>City</b>: " + instrumentCity +"<br/>" +
										"<b>County</b>: " + instrumentCounty +"<br/>" +
										"<b>State</b>: " + instrumentState +"<br/></p>" +
										"<p><b>Latitude</b>: " + point[1].toFixed(3) +
										"</br><b>Longitude</b>: " + point[0].toFixed(3) +"<br/></p>" +
                                        "<b><a target=\"blank\" href=" + sensorPageURLRoot + siteId + "&sensorId=" + instrumentId + " \">Link to data page</a></b>");
										
									map.infoWindow.show(evt.mapPoint,map.getInfoWindowAnchor(evt.screenPoint));

								}
							
							});	
						}
					}
				}
			
				
				for (var i=0; i< map.layerIds.length; i++) {
					if (map.layerIds[i].match(/peaks/g) !== null) {
						if (map.getLayer(map.layerIds[i]).visible === true) {
							
							var identifyPeak = new IdentifyTask(mapServicesRoot + "/Peaks/MapServer");
					
							identifyParams = new IdentifyParameters();
							identifyParams.tolerance = 5;
							identifyParams.returnGeometry = true;
							identifyParams.layerIds = [0];
							identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_TOP;
							identifyParams.width = map.width;
							identifyParams.height = map.height;
							identifyParams.geometry = evt.mapPoint;
							identifyParams.mapExtent = map.extent;
                            identifyParams.layerDefinitions = [];
                            identifyParams.layerDefinitions[0] = filterDefinition[0];
							identifyPeak.execute(identifyParams, function(identifyResults){ 

								if (identifyResults.length > 0) {
					
									var type = identifyResults[0].layerName;
									var eventName = identifyResults[0].feature.attributes.EVENT_NAME;
									var peakStage = identifyResults[0].feature.attributes.PEAK_STAGE;
									var peakDateTime = identifyResults[0].feature.attributes.PEAK_DATE;
									var datum = identifyResults[0].feature.attributes.DATUM_NAME;
						
									map.infoWindow.setTitle( );
									map.infoWindow.setContent(
										"<b><font size=\"3\">" + type + " :</br> " + eventName +
										"</b></font><p><b>Peak Stage</b>: " + peakStage +"<br/>" +
										"<b>Peak Date & Time</b>: " + peakDateTime +"<br/></p>" +
										"<p><b>Datum</b>: " + datum +"<br/></p>"); 
							
									map.infoWindow.show(evt.mapPoint,map.getInfoWindowAnchor(evt.screenPoint));

								}
								
							});
						}
					}
				}
					
					
				for (var i=0; i< map.layerIds.length; i++) {
					if (map.layerIds[i].match(/HWMs/g) !== null) {
						if (map.getLayer(map.layerIds[i]).visible === true) {
							
							var identifyHWM = new IdentifyTask(mapServicesRoot + "/HWMs/MapServer");
					
							identifyParams = new IdentifyParameters();
							identifyParams.tolerance = 5;
							identifyParams.returnGeometry = true;
							identifyParams.layerIds = [0];
							identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_TOP;
							identifyParams.width = map.width;
							identifyParams.height = map.height;
							identifyParams.geometry = evt.mapPoint;
							identifyParams.mapExtent = map.extent;
                            identifyParams.layerDefinitions = [];
                            identifyParams.layerDefinitions[0] = filterDefinition[0];
							identifyHWM.execute(identifyParams, function(identifyResults){ 

								if (identifyResults.length > 0) {
						
									var pointType = identifyResults[0].layerName;
									var siteId = identifyResults[0].feature.attributes.SITE_ID; 
									var hwmId = identifyResults[0].feature.attributes.HWM_ID;
									var eventName = identifyResults[0].feature.attributes.EVENT_NAME;
									var siteName = identifyResults[0].feature.attributes.SITE_NAME;
									var siteNum = identifyResults[0].feature.attributes.SITE_NO;
									var locDescrip = identifyResults[0].feature.attributes.HWM_LOCATIONDESCRIPTION; 
									var elev = identifyResults[0].feature.attributes.ELEV_FT;
									var datum = identifyResults[0].feature.attributes.DATUM_ABBREVIATION;
									var approved = identifyResults[0].feature.attributes.IS_APPROVED;
									var type = identifyResults[0].feature.attributes.HWM_TYPE;
									var marker = identifyResults[0].feature.attributes.MARKER;
									var qual = identifyResults[0].feature.attributes.HWM_QUALITY;
									var waterbody = identifyResults[0].feature.attributes.WATERBODY;
									var city = identifyResults[0].feature.attributes.CITY;
									var county = identifyResults[0].feature.attributes.COUNTY;
									var state = identifyResults[0].feature.attributes.STATE;
									var hwmLat = identifyResults[0].feature.geometry.y;
									var hwmLong = identifyResults[0].feature.geometry.x;
									var notes = identifyResults[0].feature.attributes.HWM_NOTES;
									
									var point = webMercatorUtils.xyToLngLat(hwmLong, hwmLat);
									console.log(point[0]);
									console.log(point[1]);
									
									map.infoWindow.setTitle( );
									map.infoWindow.setContent(
										"<font size=\"3\"><b>" + pointType + " :</br> " + eventName +
										"</font><p><b>Site Name</b>: " + siteName +"<br/>" +
										"<b>Site Number</b>: " + siteNum +"<br/></p>" +
										"<p><b><font color=\"red\">Elevation (ft)</b>: " + elev +"<br/>" +
										"<b>Datum</b>: " + datum +"</br>" +
										"<b>Approved</b>: " + approved +"</br></font></p>" +
										"<p><b>HWM Type</b>: " + type +"<br/>" +
										"<b>Marker</b>: " + marker +"<br/>" +
										"<b>Quality</b>: " + qual +"<br/></p>" +
										"<p><b>Waterbody</b>: " + waterbody +"<br/>" +
										"<b>City</b>: " + city +"<br/>" +
										"<b>County</b>: " + county +"<br/>" +
										"<b>State</b>: " + state +"<br/></p>" +
										"<p><b>Latitude</b>: " + point[1].toFixed(3) +
										"</br><b>Longitude</b>: " + point[0].toFixed(3) +"<br/></p>" +
										"<p><b>Notes</b>: " + notes +"<br/>" +
                                        "<b><a target=\"blank\" href=" + hwmPageURLRoot + siteId + "&hwmId=" + hwmId + " \">Link to data page</a></b>");
			
									map.infoWindow.show(evt.mapPoint,map.getInfoWindowAnchor(evt.screenPoint));

								}
							});
						}
					}
				}
			});

			//domStyle.set('loadingScreen', 'opacity', '0.75');

			
			on(map, "update-end", function () {
				domStyle.set('loadingScreen', 'visibility', 'hidden');
				
				on(map, "update-start", function () {
					domStyle.set('refreshScreen', 'visibility', 'visible');
				});
				
				on(map, "update-end", function () {
					domStyle.set('refreshScreen', 'visibility', 'hidden');
				});
			});
			

		});//end require for identify task and identify parameters
	}//end of mapReady


	///////////////
	// USGS Logo click handler function
	function showUSGSLinks(evt){
		//check to see if there is already an existing linksDiv so that it is not build additional linksDiv. Unlikely to occur since the usgsLinks div is being destroyed on mouseleave.
		if (!dom.byId('usgsLinks')){
			//create linksDiv
			var linksDiv = domConstruct.create("div");
			linksDiv.id = 'usgsLinks';
			//LINKS BOX HEADER TITLE HERE
			linksDiv.innerHTML = '<div class="usgsLinksHeader"><b>USGS Links</b></div>';
			//USGS LINKS GO HERE
			linksDiv.innerHTML += '<p>';
			linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/">USGS Home</a><br />';
			linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/ask/">Contact USGS</a><br />';
			linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://search.usgs.gov/">Search USGS</a><br />';
			linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/laws/accessibility.html">Accessibility</a><br />';
			linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/foia/">FOIA</a><br />';
			linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/laws/privacy.html">Privacy</a><br />';
			linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/laws/policies_notices.html">Policies and Notices</a></p>';
			
			//place the new div at the click point minus 5px so the mouse cursor is within the div
			linksDiv.style.top =  evt.clientY-5 + 'px';
			linksDiv.style.left = evt.clientX-5 + 'px';
			
			//add the div to the document
			dom.byId('map').appendChild(linksDiv);
			//on mouse leave, call the removeLinks function
			on(dom.byId("usgsLinks"), "mouseleave", removeLinks);

		}
	}

	//remove (destroy) the usgs Links div (called on mouseleave event)
	function removeLinks(){
		domConstruct.destroy('usgsLinks');
	}

});////end of parent require statement

//end of AMD conversion
/////////////////////////////////////////////////////////////////////////////////////

//dojo.ready(init);
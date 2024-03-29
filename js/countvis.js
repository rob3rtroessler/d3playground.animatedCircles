
/*
 * CountVis - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data						-- the actual data: perDayData
 */

CountVis = function(_parentElement, _data, _eventHandler){
    this.parentElement = _parentElement;
    this.data = _data;
    this.eventHandler = _eventHandler;
    this.displayData = []; // see data wrangling
	this.zoomActive = false;
	this.currentBrushRegion = null;

    this.initVis();

    console.log(this.data);
}


/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

CountVis.prototype.initVis = function(){
    var vis = this;

    vis.margin = { top: 40, right: 0, bottom: 60, left: 60 };

    vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right,
        vis.height = 700 - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");


    // Define inner chart area (all overlapping elements are getting clipped)
    vis.svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", vis.width)
        .attr("height", vis.height);


        // Scales and axes
    vis.xOrig = d3.scaleTime()
        .range([0, vis.width]);

    vis.y = d3.scaleLinear()
        .range([vis.height, 0]);

    vis.xAxis = d3.axisBottom()
        .scale(vis.x);

    vis.yAxis = d3.axisLeft()
        .scale(vis.y)
        .ticks(6);

    // Set domains
    var minMaxY= [0, d3.max(vis.data.map(function(d){ return d.count; }))];
    vis.y.domain(minMaxY);

    var minMaxX = d3.extent(vis.data.map(function(d){ return d.time; }));
    vis.xOrig.domain(minMaxX);

    // We will use vis.x for all other operations with vis.xOrig as the original
    vis.x = vis.xOrig;

    vis.onSelectionChange(vis.x.domain()[0], vis.x.domain()[1]);

    // Append elements to SVG area
    vis.svg.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", "translate(0," + vis.height + ")");

    vis.svg.append("g")
        .attr("class", "y-axis axis");

    vis.svg.append("text")
        .attr("x", -50)
        .attr("y", -8)
        .text("Votes");


    // Append a path for the area function, so that it is later behind the brush overlay
    vis.timePath = vis.svg.append("path")
        .attr("class", "area area-time");

    // Define the D3 path generator
    vis.area = d3.area()
        .curve(d3.curveStep)
        .x(function(d) {
            return vis.x(d.time);
        })
        .y0(vis.height)
        .y1(function(d) { return vis.y(d.count); });


    // Initialize brushing component
    vis.brush = d3.brushX()
        .extent([[0,0],[vis.width,vis.height]])
        .on("brush", function(){

            vis.currentBrushRegion = d3.event.selection.map(vis.x.invert);
            $(vis.eventHandler).trigger("selectionChanged", vis.currentBrushRegion);
        });

    // Append brush component
    vis.brushGroup = vis.svg.append("g")
        .attr("class", "brush")
        .call(vis.brush);

    vis.zoomFunction = function () {

        vis.zoomActive = true;

        //console.log(d3.event.transform);
        vis.x = d3.event.transform.rescaleX(vis.xOrig);

        if(vis.currentBrushRegion) {
            vis.brushGroup.call(vis.brush.move, vis.currentBrushRegion.map(vis.x));
        }

        // Update the visualization
        vis.updateVis();
    }

    // Define zoom
    vis.zoom = d3.zoom()
        .scaleExtent([1,20])
        .on("zoom", vis.zoomFunction);

    vis.brushGroup.call(vis.zoom)
        .on("mousedown.zoom", null)
        .on("touchstart.zoom", null);

    // Define the action for the 'reset zoom' button
    d3.select("#reset-zoom").on("click", function(){

        vis.zoomActive = false;

        console.log(vis.svg.select(".brush"));
        vis.brushGroup.call(vis.zoom.transform, d3.zoomIdentity);

        vis.updateVis();
        console.log("reset");
    });

    // (Filter, aggregate, modify data)
    vis.wrangleData();
}



/*
 * Data wrangling
 */

CountVis.prototype.wrangleData = function(){
    var vis = this;

    this.displayData = this.data;

    // Update the visualization
    vis.updateVis(null);
}



/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

CountVis.prototype.updateVis = function(){
    var vis = this;

    // Check if zoom is active
    if(vis.zoomActive)
        $("#reset-zoom").show();
    else
        $("#reset-zoom").hide();

    vis.brushGroup
        .selectAll('rect')
        .attr("height", vis.height)
        .attr("clip-path", "url(#clip)");

    // Call the area function and update the path
    // D3 uses each data point and passes it to the area function.
    // The area function translates the data into positions on the path in the SVG.

    console.log('hello', vis.displayData);

    vis.area.x(function(d) {
        return vis.x(d.time);
    });

    console.log('test');
    let circles = vis.svg.selectAll('circle')
        .data(vis.displayData);

    let myCircles = circles.enter().append('circle')
        .attr('class', function(d){
            if (d.ages.length === 100){
                return 'customCircle blue'
            } else {
                return 'customCircle red'
            }
        })
        .attr('cx', function(d,i){
            if(i % 4 === 0){
                return 20;
            } else if(i % 4 === 1) {
                return 30
            } else if(i % 4 === 2) {
                return 40
            } else if(i % 4 === 3) {
                return 50
            }
        })
        .attr('cy', function(d,i){
            return (Math.trunc(i / 4)) * 6;
           /* if (i <= 4){return 0}
            else if (4 < i <= 8) { return 5}*/

        })
        .attr('r', 2)
        .attr('fill', function(d,i){
            console.log(d.ages.length);
            if(d.ages.length === 100){
                return 'blue'
            }else{
                console.log('rot', d.ages.length);
                return 'red'
            }
        });


    vis.svg.select(".x-axis").call(vis.xAxis.scale(vis.x));
    vis.svg.select(".y-axis").call(vis.yAxis);
}


/*
 * Update time period labels
 */

CountVis.prototype.onSelectionChange = function(rangeStart, rangeEnd){
    var vis = this;

    d3.select("#time-period-min").text(dateFormatter(rangeStart));
    d3.select("#time-period-max").text(dateFormatter(rangeEnd));
}
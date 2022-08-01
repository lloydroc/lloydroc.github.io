var width = 550,
    height = 200,
    barHeight = 20;

var x = d3.scaleLinear()
          .domain([-20, 20])
          .range([0, width]);

var chart;

d3.dsv(",", "stocks.csv", function(d) {
  //console.log(d);
  return {
    t: +d.t,
    ticker: d.ticker,
    price: +d.price,
    change: +d.change,
    ts: new Date(d.ts),
    gain: d.change > 0
  };
}).then(function(data) {
  height = barHeight*data.length;
  chart = d3.select("#stocks")
            .attr("width", width)
            .attr("height", height);

  draw(data);
});

var draw = function(data) {
  var bar;

  bar = chart.selectAll("g")
           .data(data)
         .enter().append("g")
           .attr("transform", function(d,i) {
             //console.log(x(0),d.change,x(d.change),width/2-x(d.change),x(Math.abs(d.change))-x(0));
             if(d.change >= 0) return "translate(" + width/2 + "," + i*barHeight + ")";
             var w = x(d.change);
             return "translate(" + w + "," + i*barHeight + ")";
           });

  bar.append("rect")
     .attr("width", function(d) { return x(Math.abs(d.change))-x(0); } )
     .attr("height", 20-1)
     .classed("loss", function(d) { return d.gain == false; } )
     .classed("gain", function(d) { return d.gain; } );

  chart.selectAll("text")
       .data(data)
       .enter()
       .append("text")
       .text(function(d) { return d.ticker+" $"+d.price.toFixed(2); })
       .attr("x",0)
       .attr("y", function(d,i) { return (i+1)*barHeight-4; })
       .classed("ticker",true);

  var lines = [0, -5, 5, 10, -10];
  chart.selectAll("line")
       .data(lines)
       .enter().append("line")
          .classed("centerline", function(d) { return d == 0})
          .classed("gridline", function(d) { return d != 0})
          .attr('x1',function(d) { return x(d); })
          .attr('x2',function(d) { return x(d); })
          .attr('y1','0')
          .attr('y2',height);

  //console.log(data);
}

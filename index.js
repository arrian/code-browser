var express = require('express');
var app = express();
var path = require('path');
var YUIGraph = require('./src/graph/yuigraph').YUIGraph;
var FileGraph = require('./src/graph/filegraph').FileGraph;

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/src/index.html'));
});

app.get('/graph.js', function (req, res) {
  res.sendFile(path.join(__dirname + '/src/graph.js'));
});

app.get('/result.json', function (req, res) {
  res.sendFile(path.join(__dirname + '/result.json'));
});

app.get('/yui.json', function(req, res) {
	var graph = new YUIGraph('YUI Project', './temp/yui', 'x.x');
	graph.parse().then(() => {
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(graph.toJSON()));
	});
});

app.get('/file.json', function(req, res) {
	var graph = new FileGraph('Folder Project', './temp/folder', 'x.x');
	graph.parse().then(() => {
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(graph.toJSON()));
	});
});

app.get('/style.css', function (req, res) {
  res.sendFile(path.join(__dirname + '/src/style.css'));
});

app.listen(3000, function () {
  console.log('Visualiser started on port 3000!');
});

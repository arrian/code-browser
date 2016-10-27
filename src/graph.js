var w = window.innerWidth,
	h = window.innerHeight,
	graph;

function resize() {
	w = window.innerWidth || e.clientWidth || g.clientWidth;
	h = window.innerHeight || e.clientHeight || g.clientHeight;

	$('#svg').attr("width", w).attr("height", h);
}
window.onresize = resize;

function updateFilter() {
	var nodeFilter = {},
		linkFilter = {};

	nodeFilter.name = $('#filter').val();

	nodeFilter.showAdjacent = $("#showAdjacent").is(':checked');

	linkFilter.relationships = [];
	$('.linkSettings:checked').each(function(index, input) {
		linkFilter.relationships.push(input.id);
	});

	graph.filter(nodeFilter, linkFilter);
}

function Graph(url) {
	var _this = this,
		source = url,
		x = d3.scale.linear().domain([0, w]).range([0, w]),
		y = d3.scale.linear().domain([0, h]).range([h, 0]),
		color = d3.scale.category20c(),
		visualisation,
		force,
		nodes,
		links,
		drag;

	this.allLinks = [];
	this.allNodes = [];

	var doubleClick = function(d) {
		d3.select(this).classed("fixed", d.fixed = false);
		force.resume();
	};

	var dragStart = function(d) {
		d3.event.sourceEvent.stopPropagation();
		d3.select(this).classed("fixed", d.fixed = true);
	};

	var zoom = function() {
		visualisation.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	};

	visualisation = d3.select("body")
			.append("svg:svg")
			.call(d3.behavior.zoom().x(x).y(y).scaleExtent([0, 10]).on("zoom", zoom))
			.on("dblclick.zoom", null)
			.attr("width", w)
			.attr("height", h)
			.attr("id", "svg")
			.attr("pointer-events", "all")
			.attr("viewBox", "0 0 " + w + " " + h)
			.attr("perserveAspectRatio", "xMinYMid")
			.append('svg:g');

	force = d3.layout.force();

	nodes = force.nodes();
	links = force.links();

	drag = force.drag()
		.on("dragstart", dragStart);

	// Create arrow definition
	d3.select("#svg").append("svg:defs").selectAll("marker")
		.data(["end"])
	  .enter().append("svg:marker")
		.attr("id", String)
		.attr('class', 'arrow')
		.attr("viewBox", "0 -5 10 10")
		.attr("refX", 16)
		.attr("refY", 0)
		.attr("markerWidth", 6)
		.attr("markerHeight", 6)
		.attr("orient", "auto")
	  .append("svg:path")
		.attr("d", "M0,-3L10,0L0,3");

	/**
	Resets the graph to the initial state.
	**/
	this.reset = function () {
		nodes.splice(0, nodes.length);
		links.splice(0, links.length);
		nodes = this.allNodes.splice();
		links = this.allLinks.splice();
		updateFilter();
	};

	/**
	Loads data from the specified data source.
	**/
	this.load = function () {
		if (source !== '') {
			$.getJSON(source, function(data) {
				_this.addNodes(data.nodes);
				_this.addLinks(data.links);
				updateFilter();
			});
		}
	};

	this.containsNode = function (node) {
		return $.grep(nodes, function(n) { return n.name === node.name; }).length > 0;
	};

	this.showNode = function (node) {
		nodes.push(node);
	};

	this.hideNode = function (node) {
		var index = this.findNodeIndex(node);
		if(index >= 0) nodes.splice(index, 1);
	};

	this.addNode = function (node) {
		this.allNodes.push(node);
		nodes.push(node);
		return node;
	};

	this.addNodes = function (nodes) {
		$.each(nodes, function(index, node) {
			_this.addNode(node);
		});
	};

	this.removeNode = function (node) {
		var index = this.findNodeIndex(node);
		if(index >= 0) nodes.splice(index, 1);
		// TODO: remove from allNodes
	};

	/**
	Finds a node by name.
	**/
	this.findNode = function (name) {
		for(var id in this.allNodes) {
			var node = this.allNodes[id];
			if(node.name === name) return node;
		}
		return null;
	}

	/**
	Finds the index of the specified node in graph.nodes.
	**/
	this.findNodeIndex = function (node) {
		return nodes.map(function(x) { return x.name; }).indexOf(node.name);
	};

	this.showLink = function (link) {
		links.push(link);
	};

	this.hideLink = function (link) {
		var index = this.findLinkIndex(link);
		if(index >= 0) links.splice(index, 1);
	};

	this.addLink = function (link) {
		var adjustedLink = link,//could clone here... but we don't really care about the object given
			newSource = this.findNode(link.source),
			newTarget = this.findNode(link.target);

		if(newSource === null) {
			adjustedLink.source = this.addNode({ name: link.source, synthetic: true });//create a synthetic node... mark as such
		} else {
			adjustedLink.source = newSource;
		}

		if(newTarget === null) {
			adjustedLink.target = this.addNode({ name: link.target, synthetic: true });//create a synthetic node... mark as such
		} else {
			adjustedLink.target = newTarget;
		}

		this.allLinks.push(adjustedLink);
		links.push(adjustedLink);
		return link;
	};

	this.addLinks = function (links) {
		//TODO: handle nodes that have not yet been added
		$.each(links, function(index, link) {
			_this.addLink(link);
		});
	};

	this.removeLink = function (link) {
		var index = this.findLinkIndex(link);
		if(index >= 0) links.splice(index, 1);
		//TODO: remove from allLinks
	};

	/**
	Find links attached to the given node.
	**/
	this.findLink = function (node) {
		return $.grep(links, function(link) { return link.source.name === node.name || link.target.name === node.name; });
	};

	/**
	Finds the index of the specified link in graph.links.
	**/
	this.findLinkIndex = function (link) {
		for (var i = 0; i < links.length; i++) {
			var l = links[i];
			if(l.relationship === link.relationship && 
			   l.source.name === link.source.name &&
			   l.target.name === link.target.name) {
				return id;
			}
			//TODO: check source with target... they might be swapped
		}
		return -1;
	};

	/**
	Fuzzy matches the given text with the given node, returning true if match found. 
	**/
	this.matchNode = function (nodeName, name) {
		return name === '' || nodeName.toLowerCase().search(new RegExp(name.toLowerCase())) >= 0;
		// return name === '' || nodeName.toLowerCase().indexOf(name.toLowerCase()) >= 0;
	};

	/**
	Checks the link against the given list of permitted relationships, 
	returning true if the link relationship is in the list.
	**/
	this.matchLink = function (linkRelationship, relationships) {
		for(var id in relationships) {
			var relationship = relationships[id];

			if(linkRelationship === relationship) return true;
		}
		return false;
	};

	/**
	Filters nodes and links based on a criteria.
	**/
	this.filter = function (nodeFilter, linkFilter) {
		var targetLinks = [],
			targetNodes = [];

		targetNodes = $.grep(this.allNodes, function(node) {
			return _this.matchNode(node.name, nodeFilter.name);
		});

		targetLinks = $.grep(this.allLinks, function(link) {
			var linkMatch = _this.matchLink(link.relationship, linkFilter.relationships),
				sourceMatch = _this.matchNode(link.source.name, nodeFilter.name),
				targetMatch = _this.matchNode(link.target.name, nodeFilter.name);

			if(nodeFilter.showAdjacent && linkMatch && (sourceMatch || targetMatch)) {
				targetNodes.push(link.source);
				targetNodes.push(link.target);
			}

			return (linkMatch && sourceMatch && targetMatch) ||
				   (linkMatch && sourceMatch && nodeFilter.showAdjacent) ||
				   (linkMatch && targetMatch && nodeFilter.showAdjacent);
		});

		// Make targetNodes unique
		var u = {}, a = [];
		for(var i = 0, l = targetNodes.length; i < l; ++i){
			if(!u.hasOwnProperty(targetNodes[i].name)) {
				a.push(targetNodes[i]);
				u[targetNodes[i].name] = 1;
			}
		}
		targetNodes = a;

		nodes.splice(0, nodes.length);
		links.splice(0, links.length);

		nodes.push.apply(nodes, targetNodes);
		links.push.apply(links, targetLinks);

		this.update();
	};

	this.update = function () {
		var getNodeRadius = function(metric) {
			// return metric + 5;
			return 8;
		};

		var link = visualisation.selectAll("line")
				.data(links, function (d) { return d.source.name + "-" + d.target.name; });

		link.enter().append("line")
				.attr("id", function (d) { return d.source.name + "-" + d.target.name; })
				.attr("stroke-width", function (d) { return d.value / 10; })
				.attr("class", function (d) { return "link " + d.relationship; })
				.attr("marker-end", "url(#end)");

		link.append("title")
				.text(function (d) { return d.source.name + ' ' + d.relationship + ' ' + d.target.name; });

		link.exit().remove();

		var node = visualisation.selectAll("g.node")
				.data(nodes, function (d) { return d.name; });

		var nodeEnter = node.enter().append("g")
				.attr("class", "node")
				.call(drag)
				.on("dblclick", doubleClick);

		nodeEnter.append("svg:circle")
				// .attr("r", 8)
				.attr("r", function(d) { return getNodeRadius(d.dependencies ? d.dependencies.length : 0); })
				.attr("id", function (d) { return "Node;" + d.name; })
				.attr("class", "nodeStrokeClass")
				.attr("fill", function(d) {
					return color(d.name.substring(0, d.name.indexOf('.')));
				});

		nodeEnter.append("svg:text")
				.attr("class", "textClass")
				.attr("x", 10)
				.attr("y", ".31em")
				.text(function (d) { return d.friendlyName || d.name; });

		node.exit().remove();

		force.on("tick", function () {

			node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

			link.attr("x1", function (d) { return d.source.x; })
				.attr("y1", function (d) { return d.source.y; })
				.attr("x2", function (d) { return d.target.x; })
				.attr("y2", function (d) { return d.target.y; });
		});

		force
			.linkDistance(100)
			.charge(-400)
			.size([w, h])
			.start();

		$(".nodeStrokeClass").each(function(index) {
			var gnode = this.parentNode;
			gnode.parentNode.appendChild(gnode);
		});
	};

	this.load();
}

graph = new Graph('file.json');

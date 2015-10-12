'use strict';

angular.module('codeGraphApp')
	.directive('graph', function() {
		
		return {
			controller: function($scope, $http) {
				var i = 0;

				$scope.error = null;
				$scope.graph = { nodes: [], relationships: [], inactiveNodes: [], inactiveRelationships: [] };

				$http.get('/graph?label=Warning&label=File&label=Folder&label=Class&label=Module')
				  .success(function (data) {
				  	var stagingNodes = {},
				  		graphNodes = $scope.graph.nodes,
				  		graphRelationships = $scope.graph.relationships,
				  		inactiveGraphNodes = $scope.graph.inactiveNodes,
				  		inactiveGraphRelationships = $scope.graph.inactiveRelationships;
				    
				    Array.prototype.push.apply(inactiveGraphNodes, data[0].nodes);
				    Array.prototype.push.apply(inactiveGraphRelationships, data[0].relationships);

				    inactiveGraphNodes.map(function(node) {
				    	stagingNodes[node.id] = node;
				    });

				    //link the json relationships to the actual nodes
				    inactiveGraphRelationships.map(function(relationship) {
				    	relationship.source = stagingNodes[relationship.start];
				    	relationship.target = stagingNodes[relationship.end];
				    });

					var i = inactiveGraphRelationships.length
					while (i--) {
						var relationship = inactiveGraphRelationships[i];
						if(!relationship.source || !relationship.target) {
							inactiveGraphRelationships.splice(i, 1);
						}
					}

					// Only display the root node of the downloaded data
					for(var i = 0; i < inactiveGraphNodes.length; i++) {
						if(inactiveGraphNodes[i].root) break;
					}
					Array.prototype.push.apply(graphNodes, inactiveGraphNodes.splice(i,1));

				    $scope.update();

				  })
				  .error(function (data, status, headers, config) {
				    $scope.error = {
				      status: status,
				      headers: headers,
				      config: config,
				      data: data
				    }
				  });
			},
			link: function(scope, el) {
				var nodes = scope.graph.nodes,
					relationships = scope.graph.relationships,
					inactiveNodes = scope.graph.inactiveNodes,
					inactiveRelationships = scope.graph.inactiveRelationships,
					element = el.children('svg')[0],
					width = element.clientWidth,
					height = element.clientHeight,
					x = d3.scale.linear().domain([0, width]).range([0, width]),
					y = d3.scale.linear().domain([0, height]).range([height, 0]),
					
					//d3 elements
					canvas,
					layout,
					tooltip,

					//utility functions
					colourise = d3.scale.category20b(),
					colourMapper,
					drag,
					filter,
					update,
					reset,
					indexById,
					elementById,
					shiftById,
					expand,

					//listeners
					onResize,
					onFilter,
					onDoubleClick,
					onClick,
					onDragStart,
					onZoom,
					onTick,

					//node functions
					getNode,
					fuzzyNode,
					showNode,
					hideNode,
					addNode,
					removeNode,

					//relationship functions
					getRelationship,
					fuzzyRelationship,
					showRelationship,
					hideRelationship,
					addRelationship,
					removeRelationship;

				scope.graph.inactiveNodes = inactiveNodes;
				scope.graph.inactiveRelationships = inactiveRelationships;

				filter = function(nodeFilter, relationshipFilter) {

				};

				update = function() {
					var node,
						relationship,
						relationshipEnter,
						nodeEnter;

					relationship = canvas.select('.relationships').selectAll('.relationship').data(relationships, function(d) {
						return d.source.id + '-' + d.target.id;
					});

					relationshipEnter = relationship.enter().append('line')
					.attr('class', function(d) {
						return 'relationship relationship-' + d.source.name + '-' + d.target.name;
					});

					relationship.exit().remove();

					node = canvas.select('.nodes').selectAll('.node').data(nodes, function(d) {
						return d.id;
					});

					nodeEnter = node.enter().append('g')
					.attr('class', function(d) {
						return 'node node-' + d.id + ' node-' + d.label.toLowerCase();
					})
					.attr('transform', function(d) {
						if(!d.x || !d.y) {
							d.x = width / 2;
							d.y = height / 2;
							return 'translate(' + d.x + ',' + d.y + ')';
						}
						return 'translate(' + d.x + ',' + d.y + ')';
					})
					.call(drag).on('dblclick', onDoubleClick).on('click', onClick);

					nodeEnter.append('svg:circle').attr('r', 8).attr('class', 'node-stroke');

					nodeEnter.append('svg:text').attr('class', 'node-text').attr('x', 10).attr('y', '.31em').text(function(d) {
						if(d.name) return d.name;
						if(d.message) return d.message;
						return d.id;
					});

					node.exit().remove();

					layout.on('tick', function() {
						node.attr('transform', function(d) {
							return 'translate(' + d.x + ',' + d.y + ')';
						});
						relationship
							.attr('x1', function(d) { return d.source.x })
							.attr('y1', function(d) { return d.source.y })
							.attr('x2', function(d) { return d.target.x })
							.attr('y2', function(d) { return d.target.y });
					});

					layout.linkDistance(100).charge(-400).size([width, height]).start();					
				};

				reset = function() {
					//TODO: show all nodes in graph
					//TODO: show all relationships in graph
				};

				indexById = function(array, id) {
					for(var i = 0; i < array.length; i++) {
						if(array[i].id === id) return i;
					}
					return -1;
				};

				elementById = function(array, id) {
					for(var i = 0; i < array.length; i++) {
						if(array[i].id === id) return array[i];
					}
					return null;
				};

				shiftById = function(sourceArray, targetArray, id) {
					var index = indexById(sourceArray, id),
						result;

					if(index >= 0) {
						result = sourceArray.splice(index, 1);
						Array.prototype.push.apply(targetArray, result);
					}
				};

				expand = function(node) {
					var newNode;
					console.log(node.x);
					console.log(node.y);

					inactiveRelationships.forEach(function(relationship) {
						if(relationship.source.id === node.id) {
							newNode = getNode(relationship.target.id);
							newNode.x = node.x;
							newNode.y = node.y;

							showNode(relationship.target.id);
							showRelationship(relationship.id);

						} else if(relationship.target.id === node.id) {
							newNode = getNode(relationship.source.id);
							newNode.x = node.x;
							newNode.y = node.y;

							showNode(relationship.source.id);
							showRelationship(relationship.id);
						}
					});
				}

				onResize = function(el) {
					var resizeElement = el.children('svg')[0];

					width = resizeElement.clientWidth;
					height = resizeElement.clientHeight;
					// $('#svg').attr("width", w).attr("height", h);
					//TODO: watch the element
				};

				onFilter = function() {

				};

				onDoubleClick = function(node) {
					// d3.select(this).classed('fixed', node.fixed = true);
					expand(node);
					update();
					// layout.resume();
				};

				onClick = function(node) {
					// d3.select(this).classed('fixed', node.fixed = !node.fixed);
				};

				
				onDragStart = function(node) {
					// tooltip.hide();
					d3.event.sourceEvent.stopPropagation();
					// d3.select(this).classed('fixed', node.fixed = true);
				};

				

				onZoom = function() {
					canvas.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
				};

				onTick = function() {

				};

				getNode = function(id) {
					var node = elementById(nodes, id);
					if(node) return node;
					return elementById(inactiveNodes, id);
				};

				fuzzyNode = function() {

				};

				showNode = function(id) {
					shiftById(inactiveNodes, nodes, id);
				};

				hideNode = function(id) {
					shiftById(nodes, inactiveNodes, id);
				};

				getRelationship = function(id) {
					var relationship = elementById(relationships, id);
					if(relationship) return relationship;
					return elementById(inactiveRelationships, id);
				};

				fuzzyRelationship = function() {

				};

				showRelationship = function(id) {
					shiftById(inactiveRelationships, relationships, id);
				};

				hideRelationship = function(id) {
					shiftById(relationships, inactiveRelationships, id);
				};

				// tooltip = d3.tip().attr('class', 'd3-tip').offset([-10, 0])
				// 			.html(function(target) {
				// 				return '<span>' + target.name + '</span>';
				// 			});
		
				canvas = d3.select(element)//.append('svg:svg')
						   .call(d3.behavior.zoom().x(x).y(y).scaleExtent([0, 10]).on('zoom', onZoom))
						   // .call(tooltip)
						   .on('dblclick.zoom', null)
						   .attr('width', width).attr('height', height)
						   .attr('pointer-events', 'all')
						   .attr('viewBox', '0 0 ' + width + ' ' + height)
						   .attr('preserveAspectRatio', 'xMinYMid')
						   .append('svg:g');

				canvas.append("g").attr("class", "relationships");
				canvas.append("g").attr("class", "nodes");

				layout = d3.layout.force();
				layout.nodes(nodes);
				layout.links(relationships);//.drag('dragstart', onDragStart);

				drag = layout.drag().on("dragstart", onDragStart);


				scope.update = update;

			},
			template: '<svg></svg>'
		}
	});
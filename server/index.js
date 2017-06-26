// const { JSGraph } = require('./graph/jsgraph');
// console.log('loaded');
// graph = new JSGraph('Code Graph', '../client/src', 'x.x');
// graph.parse().then(() => {
// 	console.log(JSON.stringify(graph.toJSON()));
// }).catch(error => console.log(error));


const { YUIGraph } = require('./graph/yuigraph');
console.log('loaded');
graph = new YUIGraph('YUI', '/Users/arrian/Dev/yui/yui3-master/src', 'x.x');
graph.parse().then(() => {
	console.log(JSON.stringify(graph.toJSON()));
}).catch(error => console.log(error));
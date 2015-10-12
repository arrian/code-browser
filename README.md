# Code Browser

Browse source code repositories as a graph.

## Getting Started

1.  Install [Neo4j](http://neo4j.com/download/)
2.  Modify `server/configuration` in this project with the address, username and password for neo4j
3.  Modify `server/configuration` in this project to point to the source code that you want to graph
4.  Run `grunt serve` at the root of this project to start the node server
5.  Populate the graph with a PUT to `http://localhost:9000/graph` (eg. using [Postman](http://www.getpostman.com))
6.  View the graph in your browser at `http://localhost:9000`



//require the Elasticsearch librray
const elasticsearch = require('elasticsearch');
// instantiate an Elasticsearch client
const client = new elasticsearch.Client({
   hosts: [ 'http://localhost:9200']
});
// ping the client to be sure Elasticsearch is up
client.ping({
     requestTimeout: 30000,
 }, function(error) {
 // at this point, eastic search is down, please check your Elasticsearch service
     if (error) {
         console.error('Elasticsearch cluster is down!');
     } else {
         console.log('Everything is ok');
     }
 });

var days = [11,12,13,14,15,16,17];

days.forEach(day=>{
    const index = "alerts-2019-02-"+day;

	client.indices.delete({
  	index: index
	}, function (error, response) {
  		console.log(error)
	});
});

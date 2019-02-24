const util = require('util')
//data.js
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
const index="alerts-2019-02-13"

let body = {
  "size": 0,
  "aggs": {
    "by_label1": {
      "terms": {
        "field": "label1.keyword"
      },
      "aggs": {
        "by_type": {
          "terms": {
            "field": "type.keyword"
          },
          "aggs": {
            "by_status": {
              "terms": {
                "field": "status.keyword"
              }
            }
          }
        }
      }
    }
  }
}
  // perform the actual search passing in the index, the search query and the type
  client.search({index:index,   body, type:'alerts'})
  .then(results => {
    console.log(util.inspect(results.aggregations, {showHidden: false, depth: null}));
  })
  .catch(err=>{
    console.log(err)
  });




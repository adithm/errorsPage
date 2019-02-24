//data.js
//require the Elasticsearch librray
const elasticsearch = require('elasticsearch');
// instantiate an Elasticsearch client
const client = new elasticsearch.Client({
   hosts: ['http://localhost:9200']
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

// declare an empty array called bulk



days.forEach(day=>{
  var bulk = [];
    const index = "alerts-2019-02-"+day;
    //data.js
    // require the array of alerts that was downloaded
    const alerts = require('./'+index+'.json');
    //loop through each city and create and push two objects into the array in each loop
    //first object sends the index and type you will be saving the data as
    //second object is the data you want to index
    alerts.forEach(alert =>{
      bulk.push({index:{ 
                    _index:index, 
                    _type:"alerts",
                }          
            })
      bulk.push(alert)
    })

client.indices.putMapping({
   indes:index,
   type: "alerts",
   body: {
    "mappings": {
      "_doc": {
        "properties": {
          "type": {
            "type": "text",
            "fields": {
              "raw": {
                "type": "keyword"
              }
            }
          },
          "label1": {
            "type": "text",
            "fields": {
              "raw": {
                "type": "keyword"
              }
            }
          },
          "status": {
            "type": "text",
            "fields": {
              "raw": {
                "type": "keyword"
              }
            }
          }
        }
      }
    }
  }
}, function (err, response) {
   // from this point on, if you don't get any error, you may call bulk.

//perform bulk indexing of the data passed
client.bulk({body:bulk}, function( err, response  ){ 
         if( err ){ 
             console.log("Failed Bulk operation".red, err) 
         } else { 
             console.log("Successfully imported "); 
         } 
}); 

});
});


<template>
  <div id="app">
    <error-table></error-table>
  </div>
</template>

<script>
import errorTable from "./components/ErrorTable.vue";

const elasticsearch = require("elasticsearch");

var client = new elasticsearch.Client({
  hosts: ["https://bef7590d.ngrok.io"]
});

export default {
  components: {
    errorTable
  },
  methods: {
    addAlerts() {
      var days = [11, 12, 13, 14, 15, 16, 17];
      var bulk = [];

      days.forEach(day => {
        var bulk = [];
        const index = "alerts-2019-02-" + day;
        const alerts = require("./Alerts/" + index + ".json");
        alerts.forEach(alert => {
          bulk.push({
            index: {
              _index: index,
              _type: "alerts"
            }
          });
          bulk.push(alert);
        });

        client.indices.putMapping(
          {
            indes: index,
            type: "alerts",
            body: {
              mappings: {
                _doc: {
                  properties: {
                    type: {
                      type: "text",
                      fields: {
                        raw: {
                          type: "keyword"
                        }
                      }
                    },
                    label1: {
                      type: "text",
                      fields: {
                        raw: {
                          type: "keyword"
                        }
                      }
                    },
                    status: {
                      type: "text",
                      fields: {
                        raw: {
                          type: "keyword"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          function(err, response) {
            client.bulk({ body: bulk }, function(err, response) {
              if (err) {
                console.log("Failed Bulk operation", err);
              } else {
                console.log("Successfully imported");
              }
            });
          }
        );
      });
    }
  },
  created() {
    // this.addAlerts()
    // this.count()
    // GET /_cat/indices?v
    // GET /alerts-2019-02-17/Service_Stuck/_search?q=*
  }
};
</script>

<style>
</style>
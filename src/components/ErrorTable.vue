<template>
    <div>
    <b-dropdown class="dropdown" text="Alert Type">
        <b-dropdown-item @click="updateAlertsToShow('All', '')"> All </b-dropdown-item> 
        <template v-for="(alerts, heading) in alertHeadings">
            <b-dropdown-item v-for="alert in alerts" 
                            :key="alert" 
                            @click="updateAlertsToShow(alert, heading)">
                {{alert}}
            </b-dropdown-item>
        </template>
    </b-dropdown>

    <table class="table table-bordered">
        <thead>
            <th>Alert type</th>
            <th>Today</th>
            <th>Yesterday</th>
            <th>{{curMonth}} {{curDate - 2}}</th>
            <th>{{curMonth}} {{curDate - 3}}</th>
            <th>{{curMonth}} {{curDate - 4}}</th>
            <th>{{curMonth}} {{curDate - 5}}</th>
            <th>{{curMonth}} {{curDate - 6}}</th>
        </thead>
        <tbody>
            <template v-for="(alerts, heading) in alertsToShow">
                <tr :key="heading">
                    <th class="label"> {{heading}} </th>
                </tr>
                <template v-for="alert in alerts">
                    <tr :key="alert">
                        <td> {{alert}} </td>
                        <td v-for="date in getDates()" :key="date" @click="getMessages($event, date, alert)" class="pointer">
                            <i class="material-icons">{{getIcon(date, heading, alert)}}</i>
                        </td>                        
                    </tr>
                    <transition name="fade" :key="alert">
                    <tr v-if="showMessages[alert]['show']" style="background-color: #eee;">
                        <td colspan="8">
                        <table class="table table-borderless" style="margin: 1rem auto;">
                            <thead>
                                <th>Time</th>
                                <th>Message</th>
                            </thead>
                            <tbody>
                                <tr v-for="message in showMessages[alert]['messages']" :key="message['time']">
                                    <td>{{showMessages[alert]['messages'][0]['time']}}</td>
                                    <td>{{message['message']}}</td>
                                </tr>
                            </tbody>
                        </table>
                        </td>
                    </tr>
                    </transition>
                </template>
            </template>
        </tbody>
    </table>
    </div>
</template>

<script>
import Vue from 'vue';

let date = new Date()
const elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
    hosts: ['http://127.0.0.1:9200']
});

export default {
    data() {
        return {
            curDate: date.getDate(),
            curMonth: date.toString().split(" ")[1],
            alertHeadings: {},
            alerts: {},
            showMessages: {},
            showingMessage: {},
            alertsToShow: {}
        }
    },
    created () {        
        for (let i = 11; i < 18; i++) {
            const index="alerts-2019-02-" + i
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
            client.search({index: index, body: body, type: 'alerts'})
            .then(results => {
                this.cleanData(i, results)
                if (i == 17) {
                    this.alertHeadings = this.buildHeadings(this.alerts[11]); 
                    for (let key in this.alertHeadings) {
                        this.alertHeadings[key].forEach(alert => {
                            Vue.set(this.showMessages, alert, {"show": false})
                        })
                    }
                    this.alertsToShow = this.alertHeadings 
                    console.log("alertHeadings =", this.alertHeadings)
                    console.log("alerts =", this.alerts)
                }
            })
            .catch(err=>{
                console.log(err)
            });
        }
        
    },
    methods: {
        updateAlertsToShow(alertType, heading) {
            if (alertType === 'All')
                this.alertsToShow = this.alertHeadings
            else {
                console.log(alertType, heading)
                this.alertsToShow = {
                    [heading] : [alertType]
                }
                console.log(this.alertsToShow)
            }
        },
        cleanData(date, res) {
            res = res['aggregations']['by_label1']['buckets']
            let value = {}
            res.forEach(row => {
                value[row['key']] = this.getAlerts(row)
            });
            Vue.set(this.alerts, date, value)
            console.log('res =', res)
        },
        getAlerts(row) {
            let vals = row['by_type']['buckets']
            let subAlerts = {}
            vals.forEach(alert => {
                let key = alert['key']
                let status = {}
                alert['by_status']['buckets'].forEach(element => {
                    status[element['key']] = element['doc_count']
                })
                subAlerts[key] = status
            })
            return subAlerts
        },
        buildHeadings(alerts) {
            let headings = {}
            for (let key in alerts) {
                headings[key] = Object.keys(alerts[key])
            }
            return headings
        },
        getDates() {
            return [17, 16, 15, 14, 13, 12, 11]
        },
        getIcon(date, heading, alert) {
            try {
                let count = this.alerts[date][heading][alert]
                if (!('FAILURE' in count)) 
                    return "done"
                if (!('SUCCESS' in count) || count['SUCCESS'] < count['FAILURE'])
                    return "close"
                return "error_outline"   
            }
            catch (err) {
                console.log("err", err)
                console.log(date, heading, alert)
                console.log(this.alerts[date][heading])
                return "done_outline"
            }
        },
        getMessages(event, date, alert) {
            if (alert in this.showingMessage) {
                this.showingMessage[alert].classList.remove("selected")
                if (event.currentTarget === this.showingMessage[alert]) {
                    this.showMessages[alert]['show'] = false 
                    delete this.showingMessage[alert]
                    return
                }
                delete this.showingMessage[alert]
            }
            this.showingMessage[alert] = event.currentTarget
            event.currentTarget.classList.add("selected");
            console.log('getMessages', date, alert)           
            const index = "alerts-2019-02-" + date
            let body = {
                "query": {
                    "match": {
                        "type": alert
                    }
                }
            }
            client.search({ index: index, body: body, type: 'alerts' })
            .then(result => {
                let messages = []
                result.hits.hits.forEach(res => {
                    messages.push({
                        'time': res['_source']['event_time'],
                        'message': res['_source']['message']
                    })
                })
                Vue.set(this.showMessages[alert], 'messages', messages)
                this.showMessages[alert]['show'] = true
            })
            .catch(err=>{
                console.log(err)
            });
        }
    }
}
</script>

<style scoped>
    .card {
        box-shadow: rgba(0, 0, 0, 0.08) 0px 8px 10px;
    }
    table {
        width: 80%;
        margin: 7rem auto;
        table-layout: fixed;
    }
    th:first-child {
        width: 20rem;
    }
    th, td {
        text-align: center;
    }
    .dropdown {
        top: 4rem;
        left: 10%;
    }
    .label {
        /* border: none; */
    }
    .pointer:hover {
        background:#eee;
        cursor:pointer;
        transform: scale(1.05, 1.1);
        transition:0.2s ease all;
    }
    .selected {
        background:#eee;
    }
    .fade-enter-active, .fade-leave-active {
        transition: opacity .5s;
    }
    .fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
        opacity: 0;
    }
</style>


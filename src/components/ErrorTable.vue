<template>
    <div>
    <b-dropdown class="dropdown" variant="success" :text="alertType">
        <b-dropdown-item @click="updateAlertsToShow('All Alerts')"> All Alerts </b-dropdown-item> 
        <b-dropdown-divider />
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
                    <th class="heading"> {{heading}} </th>
                </tr>
                <template v-for="alert in alerts">
                    <tr :key="alert">
                        <td> {{alert}} </td>
                        <td v-for="date in getDates()" :key="date" @click="getMessages($event, date, alert)" class="pointer">
                            <template v-for="icon in [getIcon(date, heading, alert)]">
                                <i :key="icon" class="material-icons" :style="getColor(icon)">{{icon}}</i>
                            </template>
                        </td>
                    </tr>
                    <transition name="fade" :key="alert">
                    <tr v-if="showMessages[alert]['show']" style="background-color: #eee;">
                        <td colspan="8">
                        <table class="table table-borderless" style="margin: 1rem auto; box-shadow: none;">
                            <thead>
                                <th class="pointer" @click="sortBy('time', alert)">
                                    Time <i class="material-icons sortIcon">swap_vert</i>
                                </th>
                                <th>Message</th>
                                <th class="pointer" @click="sortBy('status', alert)">
                                    Status <i class="material-icons sortIcon">swap_vert</i>
                                </th>
                            </thead>
                            <tbody>
                                <tr v-for="message in showMessages[alert]['messages']" :key="message['time']">
                                    <td>{{message['time']}}</td>
                                    <td>{{message['message']}}</td>
                                    <td>{{message['status']}}</td>
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
    <div v-if="loading" class="overlay"><div class="loader"></div></div>
    </div>
</template>

<script>
import Vue from 'vue';

let date = new Date()
const elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
    hosts: ['https://bef7590d.ngrok.io']
});

export default {
    data() {
        return {
            curDate: date.getDate(),
            curMonth: date.toString().split(" ")[1],
            alertType: "All Alerts",
            alertHeadings: {},
            alerts: {},
            showMessages: {},
            showingMessage: {},
            alertsToShow: {},
            loading: false
        }
    },
    created () {  
        this.loading = true      
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
                    this.loading = false
                }
            })
            .catch(err=>{
                console.log(err)
            });
        }
        
    },
    methods: {
        updateAlertsToShow(alertType, heading = '') {
            this.alertType = alertType
            if (alertType === 'All Alerts')
                this.alertsToShow = this.alertHeadings
            else {
                console.log(alertType, heading)
                this.alertsToShow = {
                    [heading] : [alertType]
                }
                for (let key in this.showMessages) {
                    if (key !== alertType)
                        this.showMessages[key]['show'] = false
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
        getColor(icon) {
            let color = ''
            let weight = 700
            if (icon === 'done')
                color = 'green'
            else if (icon === 'error_outline') {
                color = 'orange'
                weight = 500
            }
            else
                color = '#b00020'
            return {
                color: color,
                // fontSize: '1.6rem',
                fontWeight: weight
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
            this.loading = true
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
                this.loading = false
                let messages = []
                result.hits.hits.forEach(res => {
                    messages.push({
                        'time': res['_source']['event_time'],
                        'message': res['_source']['message'],
                        'status': res['_source']['status']
                    })
                })
                Vue.set(this.showMessages[alert], 'messages', messages)
                this.showMessages[alert]['show'] = true
            })
            .catch(err=>{
                console.log(err)
            });
        },
        sortBy(row, alert) {
            this.showMessages[alert]['messages'] = _.sortBy(this.showMessages[alert]['messages'], row)
        }
    }
}
</script>

<style scoped>
    .dropdown {
        box-shadow: 0 2px 6px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.23); 
        border-radius: 4px;
        top: 4rem;
        left: 10%;
    }
    table {
        width: 80%;
        margin: 7rem auto;
        table-layout: fixed;
        box-shadow: rgba(0, 0, 0, 0.08) 0px 8px 10px;
        border-radius: 5px;
    }
    th:first-child {
        width: 20rem;
    }
    th, td {
        text-align: center;
    }
    .heading {
        padding-top: 2.5rem;
    }
    i {
        font-size: 1.6rem;
        vertical-align: middle;
        padding-bottom: 3px;
    }
    .sortIcon {
        font-size: 1.4rem;
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
        transition: opacity .4s;
    }
    .fade-enter, .fade-leave-to {
        opacity: 0;
    }
    /* loader css */
    .loader {
        position: fixed;
        border: 0.6rem solid #f3f3f3;
        border-radius: 50%;
        border-top: 0.6rem solid black;
        width: 4rem;
        height: 4rem;
        top: calc(50% - 2rem);
        left: calc(50% - 2rem);
        z-index: 2;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .overlay {
        background: hsla(0, 0%, 0%, 0.2);
        position: fixed;
        width: 100%;
        height: 100%;
        top: 0px;
        left: 0px;
        z-index: 1;
    }
</style>


console.log(__filename);
var config = require('../config');
var Hash = require('hashish');
var request = require('request');
var http = require('http');
var api = require('../api');
var store = require('../lib/store')(config.dbtype);
var guard = require('../guard')(store)
api.setStore(store);
var util = require('util');
var cors = require('cors')

var queuelib = require('queuelib');
var express = require('express');
var testutils = require('./utils');
var q = new queuelib;

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

var app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

app.post('/v1/user/rename',guard.locked,api.user.rename);

var assert = require('chai').assert;
var server = http.createServer(app);
test('test-rename',function(done) {
    q.series([
    function(lib) {
        server.listen(5150,function() {
           lib.done() 
        })
    },
    function(lib) {
        testutils.person.id = testutils.person.blob_id;
        delete testutils.person.blob_id
        delete testutils.person.date
        store.db('blob')
        .truncate()
        .then(function() {
            return store.db('blob')
            .insert(testutils.person)
        })
        .then(function() {
            lib.done()
        })
    },
    function(lib) {
        request.post({url:'http://localhost:5150/v1/user/rename',
        json:{data:testutils.person.data,revision:1,new_blob_id:'35435a',blob_id:'00ff',new_username:'bob2'}},function(err,resp,body) {
            assert.equal(resp.statusCode,400)
            assert.equal(body.result,'error')
            assert.equal(body.message,'invalid blob_id')
            lib.done()
        })
    },
    function(lib) {
        request.post({url:'http://localhost:5150/v1/user/rename',
        json:{data:testutils.person.data,revision:2,new_blob_id:'35435a',blob_id:testutils.person.id,new_username:'bob2'}},function(err,resp,body) {
            assert.equal(resp.statusCode,200)
            assert.equal(body.result,'success')
            lib.done()
            done()
        })
    }
    ])
})

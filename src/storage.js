// Storage module

'use strict'

var AWS = require('aws-sdk');


var storage = (function(){

    var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
    var tableName = 'TechCrunchUserData';

    return {
        saveData: function(userId, data, callback) {
            // Note: Attribute values should not be null or empty
            var item = {userId: {S: userId}};
            if (data.currentCategory) {
                item.currentCategory = {S: data.currentCategory};
            }
            if (data.currentOrder) {  // Note: Zero is invalid order
                item.currentOrder = {N: data.currentOrder.toString()};
            }
            if (data.currentUrl) {
                item.currentUrl = {S: data.currentUrl};
            }
            if (data.categoryUrls) {
                item.categoryUrls = {S: JSON.stringify(data.categoryUrls)};
            }
            console.log('Saved data: ', item);
            dynamodb.putItem({TableName: tableName, Item: item}, callback);
        },
        loadData: function(userId, callback) {
            var key = {userId: {S: userId}};
            dynamodb.getItem({TableName: tableName, Key: key}, callback);
        }
    }
})();

module.exports = storage;

/*
* TechCrunch Reader
*
* @author Alex Dementsov
* @date 12-18-2016
*/

// Limitations:
// - Can read articles from the first page only


'use strict';

var APP_ID = process.env.APP_ID;

var AlexaSkill = require('./AlexaSkill');
var cheerio = require('cheerio');
var request = require('request');

var HELP_TEXT = 'TechCrunch Reader helps you to read online articles. ' + 
    'For example, you can ask thinkgs like: read articles from Startup category. ' +
    'Or, list categories. What would you like to read today?';
var ERROR_TEXT = 'Ooops. Something went wrong.';
var SERVICE_ERROR_TEXT = 'Something is wrong with TechCrunch';
var REPROMPT_TEXT = 'What would you like to read?';
var BASE_URL = 'https://techcrunch.com/';
var CATEGORIES = {
    news: '',
    startups: 'startups',
    mobile: 'mobile',
    gadgets: 'gadgets',
    enterprise: 'enterprise',
    social: 'social',
    europe: 'europe'
}


var TechCrunchReader = function () {
    AlexaSkill.call(this, APP_ID);
};


// Extend AlexaSkill
TechCrunchReader.prototype = Object.create(AlexaSkill.prototype);
TechCrunchReader.prototype.constructor = TechCrunchReader;

TechCrunchReader.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log('Session started');
    initSession(session);
}


TechCrunchReader.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    handleAskResponse(response, HELP_TEXT, REPROMPT_TEXT);
}


TechCrunchReader.prototype.intentHandlers = {
    ListCategoryIntent: function(intent, session, response) {
        listCategoryIntent(intent, session, response);
    },
    ListByCategoryIntent: function(intent, session, response) {
        listByCategoryIntent(intent, session, response);
    },
    ArticleIntent: function(intent, session, response) {
        articleIntent(intent, session, response);
    },
    NextArticleIntent: function(intent, session, response) {
        nextArticleIntent(intent, session, response);
    },
    RepeatArticleIntent: function(intent, session, response) {
        repeatArticleIntent(intent, session, response);
    },
    'AMAZON.HelpIntent': function(intent, session, response) {
        helpIntent(intent, session, response);
    },
    'AMAZON.StopIntent': function(intent, session, response) {
        stopIntent(intent, session, response);
    },
    'AMAZON.CancelIntent': function(intent, session, response) {
        cancelIntent(intent, session, response);
    }
}

// Intents

var listCategoryIntent = function(intent, session, response) {
    // Lists categories
    var speechText = 'Category options are ' + getCategoriesText();
    speechText += 'What category would you like to read news from?'
    handleAskResponse(response, speechText, REPROMPT_TEXT);
}

var listByCategoryIntent = function(intent, session, response) {
    // List articles by category
    var category = cleanCategory(intent.slots.Category);
    var repromptQuestion = 'Category options are ' + getCategoriesText();
    if (!category) {
        handleErrorResponse(response, repromptQuestion);
    }
    console.log('Category: ' + category);
    var url = BASE_URL + CATEGORIES[category];
    console.log('Request url: ' + url);

    requestListArticles(url, response, function(data){
        // Response format: 1. Title A. 2. Title B. ...
        var speechText = '';
        if (data.length) {
            // Set current category and list of urls for the category
            session.attributes.currentCategory = category;
            session.attributes.currentOrder = 1;  // Reset order
            session.attributes.categoryUrls[category] = [];
            for (var i = 0; i < data.length; i++){
                var order = i + 1;
                // Set article urls
                session.attributes.categoryUrls[category].push(data[i][1]);
                speechText += order + '. ' + data[i][0] + '. ';     
            }
            handleTellResponse(response, speechText);
        } else { 
            speechText = 'There are no articles for ' + category + ' category.';
            handleErrorResponse(response, speechText);
        }
    });
}

var articleIntent = function(intent, session, response) {
    // Reads article
    var category = cleanCategory(intent.slots.Category);
    var order = intent.slots.Order.value;
    readArticle(intent, session, response, category, order);
}


var nextArticleIntent = function(intent, session, response) {
    // Reads next article
    // Note: If an order exceeds max number of articles it will be reset to order 1
    var category = cleanCategory(intent.slots.Category);
    var order = session.attributes.currentOrder;
    if (order === undefined) {
        order = 1;
    } else {
        order += 1;  // Increment by one
    }
    readArticle(intent, session, response, category, order);
}


var repeatArticleIntent = function(intent, session, response) {
    // Reads recent article
    if (session.attributes.currentUrl) {
        requestArticle(session.attributes.currentUrl, response, 
                       function(title, author, article) {
            articleResponse(response, title, author, article);
        });
    } else {
        var speechText = 'There is no recent article.';
        handleErrorResponse(response, speechText);
    }
}


var helpIntent = function (intent, session, response) {
    handleAskResponse(response, HELP_TEXT, REPROMPT_TEXT);
}


var stopIntent = function(intent, session, response) {
    handleTellResponse(response, 'Goodbye', true);
}


var cancelIntent = function(intent, session, response) {
    handleTellResponse(response, 'Goodbye', true);
}

// Utils functions

var readArticle = function(intent, session, response, category, order) {
    // Util for reading an article. Used in articleIntent and nextArticleIntent
    var speechText = '';
    var url;
    var url2;

    // Set default category
    if (!category) {
        // If current category is set, use it
        if (session.attributes.currentCategory) {
            category = session.attributes.currentCategory;
        } else {
            category = 'news';  // Default category
        }
    }
    if (!session.attributes.categoryUrls[category]) {
        session.attributes.categoryUrls[category] = [];
    }

    var isValidOrder = function(order_) {
        return (order_ !== undefined && order_ > 0 &&
                order_ <= session.attributes.categoryUrls[category].length);
    }

    if (isValidOrder(order)) {
        url = session.attributes.categoryUrls[category][order-1];
        requestArticle(url, response, function(title, author, article) {
            session.attributes.currentCategory = category;
            session.attributes.currentOrder = order;
            session.attributes.currentUrl = url;
            articleResponse(response, title, author, article);
        });
    } else {  // Order is not set or invalid
        url = BASE_URL + CATEGORIES[category];
        // Latest article from news: get list of articles, then get article details
        requestListArticles(url, response, function(data){
            if (data.length) {
                for (var i = 0; i < data.length; i++){
                    session.attributes.categoryUrls[category].push(data[i][1]);
                }
                var index = 0;
                if (isValidOrder(order)) {
                    index = order - 1;
                }
                url2 = data[index][1];  // Url of the first article
                requestArticle(url2, response, function(title, author, article) {
                    session.attributes.currentCategory = category;
                    session.attributes.currentOrder = 1;
                    session.attributes.currentUrl = url2;
                    articleResponse(response, title, author, article);
                });
            } else {
                // Highly unlikely scenario
                speechText = 'There are no articles to read.';
                handleErrorResponse(response, speechText);
            } 
        });
    }
}

var getCategoriesText = function() {
    // Converts list of categories to string
    return Object.keys(CATEGORIES).join(', ') + '. ';
}


var cleanCategory = function(category) {
    // Cleans category
    if (!category.value) {
        return
    }
    category = category.value.toLowerCase();
    if (category.indexOf('start') === 0) {
        category = 'startups';
    }
    if (category in CATEGORIES) {
        return category;
    }
}


var cleanText = function(text) {
    return text.replace(/[^\w\s\.]/gi, ' ').replace(/[\n\t]+/gi, ' ');
}


var requestListArticles = function(url, response, callback) {
    // Makes request for list of articles by category
    request(url, function(error, reqresp, html){
        if (error) {
            handleErrorResponse(response, SERVICE_ERROR_TEXT)
        }
        var $ = cheerio.load(html);
        var data = [];
        $('.post-title').filter(function() {
            var titleText = $(this).text();
            var articleUrl = $(this).find('a').attr('href');
            data.push([titleText, articleUrl]);
        });
        callback(data)
    })
}


var requestArticle = function(url, response, callback) {
    // Requests article
    request(url, function(error, reqresp, html){
        if (error){
            handleErrorResponse(response, SERVICE_ERROR_TEXT)
        }
        var $ = cheerio.load(html);
        var title = $('.tweet-title').text();
        var author = $('a[rel=author]').text();
        var article = $('.article-entry').text();
        article = cleanText(article)
        callback(title, author, article);
    })  
}


var articleResponse = function(response, title, author, article) {
    // Response for article request
    var speechText = title + '. by ' + author + '. ' + article;
    handleTellResponse(response, speechText);
}


var handleResponse = function(response, speechError, speechResponse, speechQuestion,
                              repromptQuestion, shouldEndSession) {
    // Handles Alexa response
    var speechOutput;
    var repromptOutput;
    var cardTitle = 'TechCrunch Reader';

    if (speechResponse) {
        speechOutput = {
            speech: speechResponse,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tellWithCard(speechOutput, cardTitle, speechResponse, shouldEndSession);
    } else {
        var speechText = speechError;
        var repromptSpeechText = 'What would you like to read?';
        if (!speechError) {
            speechText = speechQuestion;
            repromptSpeechText = repromptQuestion;
        }
        speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        repromptOutput = {
            speech: repromptSpeechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        // askWithCard doesn't end session
        response.askWithCard(speechOutput, repromptOutput, cardTitle, speechText.substring(0, 20));
    }
}


var handleTellResponse = function(response, speechResponse, shouldEndSession) {
    // Doesn't end session by default
    handleResponse(response, null, speechResponse, null, null, shouldEndSession);
}


var handleErrorResponse = function(response, speechError) {
    handleResponse(response, speechError);
}


var handleAskResponse = function(response, speechQuestion, repromptQuestion) {
    handleResponse(response, null, null, speechQuestion, repromptQuestion);
}


var initSession = function(session) {
    session.attributes = {
        currentCategory: '',
        currentOrder: 1,
        currentUrl: '',
        categoryUrls:  {},
    }
} 


exports.handler = function (event, context) {
    var skill = new TechCrunchReader();
    skill.execute(event, context);
};

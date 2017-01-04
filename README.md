# TechCrunch Reader

aka Tik Crunch, is a simple Alexa application for reading TechCrunch online news using Echo. The application is submitted for The Amazon Alexa API Mashup Contest.

## Alexa Skill

The application is published in Alexa Skills: https://www.amazon.com/dp/B01NAKQZS7/

Invocation name: `tik crunch`

## Story

Listening online news when driving makes journey more pleasant. TechCrunch Reader helps you to get your daily briefings on the go controlled by your voice. TechCrunch website has well structured markup that can be used as an open webservice API with no key required :).

## Stack

* Node.js
* Alexa
* Amazon Lambda
* Amazon DynamoDB

## Typical conversation

```
- Alexa open tik crunch
- list categories
- list articles from startup category
- read articles
- read articles from social category
- next
- read article five
- read again
```

## Architecture

```
Alexa <--> TechCrunch Reader <--> www.techcrunch.com
                    |
            Prefereces (DynamoDB)
```
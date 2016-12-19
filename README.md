# TechCrunch Reader

This is a simple Alexa application for reading TechCrunch online news using Echo. The application is submitted for The Amazon Alexa API Mashup Contest.

## Story

Listening online news when driving makes journey more pleasant. TechCrunch Reader helps you to get your daily briefings on the go controlled by your voice. TechCrunch website has well structured markup that can be used as an open webservice API with no key required :).  

## Stack

* Node.js
* Alexa
* Amazon Lambda 

## Typical conversation

```
- Alexa open Tech Crunch
- list categories
- list articles from startup category
- read articles
- read articles from social category
- read article two
- read again
```

## Architecture

```
Alexa <--> TechCrunch Reader <--> www.techcrunch.com
```
# A-Frame Github Storage

This library implements WebSocket API which can be used to store A-Frame scene to github.

## Usage

# Publish package

## First publish

---
    npm publish --access public
---

## Update

---
    npm version patch
    npm publish
---

## Deploying storage server to heroku

### Preparation 

* Checkout this project from github.
* Install heroku cli.

### Commands

---
    git clone https://github.com/tlaukkan/aframe-github-storage.git
    cd aframe-github-storage
    heroku create <your-heroku-account>-aframe-github-storage

    heroku config:set GITHUB_USERNAME=<github-username>
    heroku config:set GITHUB_TOKEN=<github-token>
    heroku config:set GITHUB_REPOSITORY=<github-repository>
    heroku config:set STORAGE_DESCRIPTORS="[{\"storageType\":\"GITHUB\",\"repository\":\"infinity\",\"elementRegExpPattern\":\"^a-\",\"attributeRegExpPattern\":\"^id$\"},{\"storageType\":\"GITHUB\",\"repository\":\"test\",\"elementRegExpPattern\":\"^a-\",\"attributeRegExpPattern\":\"^id$\"}]"
    heroku config:set STORAGE_TOKEN_HASH_SEED=<storage-hash-eed>
    heroku config:set STORAGE_ENCRYPTION_KEY=<storage-encryption-key> 
    heroku config:set SMTP_HOST=<smtp-host>
    heroku config:set SMTP_HOST=<smtp-port> 
    heroku config:set SMTP_USERNAME=<smtp-username>
    heroku config:set SMTP_PASSWORD=<smtp-password>    
    heroku config:set SMTP_SECURE=<smtp-is-secure>
    heroku config:set SMTP_FROM=<smtp-from-email-address> 

    git push heroku master
    heroku logs -t
---

### Healt check
Storage server provides 200 OK healthcheck at URL path: /signaling-health-check.

Example: http://127.0.0.1:8080/health-check


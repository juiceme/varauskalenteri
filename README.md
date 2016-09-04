# varauskalenteri

A node.js reservation calendar utility, handy for tracking and reserving rentables for example.

## Description

Varauskalenteri enables multiple clients to create and send reservations for certain calendar durations. Itemized renting bills are maintained based on the calendar data.
Data for the recipients and items are stored as JSON files. Web-interface enables adding items separately for each recipient.

## Installation

Varauskalenteri requires websocket and emailjs npm modules. You can install all depencencies by "npm install"
The repository clones AES cryptography and datastorage libraries as submodules, You need to install them by running the script ./checkout_submodules.sh

## Features

* Users managed in JSON file
* Calendar data managed in JSON file
* User passwords are not stored in plaintext but hashed in both client and server
* Web frontend to manage and generate entries
* Uses AES-CTR encryption between server and client to defeat man-in-the-middle attacks.
* Automatic mailing of resesrvation entries to users
* User password recovery via email
  
## Coming soon!

* Probably more enhancements as I think them up :)
    
## Documentation

### Message sequences

```
CREATING NEW USER
=================

client                        server                 action
------                        ------                 ------

[clientStarted]       --> 
                      <--     [loginView]
[confirmEmail]        --> 
                      <--     [loginView]            Verification code is emailed  to the user provided address
            (when user receives code)
[validateAccount]     -->
                      <--     [createNewAccount]
[createAccount]       -->
                      <--     [loginView]


RECLAIMING FORGOTTEN PASSWORD
=============================

client                        server                 action
------                        ------                 ------

[clientStarted]       --> 
                      <--     [loginView]
[confirmEmail]        --> 
                      <--     [loginView]            Verification code is emailed  to the user provided address
            (when user receives code)
[validateAccount]     -->
                      <--     [createNewAccount]
[createAccount]       -->
                      <--     [loginView]


LOGGING IN USER
===============

client                        server                 action
------                        ------                 ------

[clientStarted]       --> 
                      <--     [loginView]
[userLogin]           -->
                      <--     [loginChallenge]
[loginResponse]       -->
                      <--     [calendarData]


```


## License

Varauskalenteri is available under the GPLv3 license.

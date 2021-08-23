# Frequently asked questions
Below you will find a list of reoccuring questions and answers to them.

## The adapter crashes when it loads devices from Tahoma, or sets up corresponding states incorrectly. What can I do to help the developers to fix this?
The adapter can log the data received by Tahoma which immensely helps any developer to reproduce and fix your issue. Please provide this as part of your issue report.
- Please turn on DEBUG logging and restart the adapter in ioBroker Admin
- Export the logs in the Log-view of ioBroker Admin
- Before attaching the logs to an issue or sending them, please make sure that you remove your personalized information from them. For this look out for `Response:` entries in the log. Sometimes Tahomalink will send data like `<location>` (aka your private address data!) which on DEBUG-loglevel also appears in your logs. Replace the sensitive data in there with placeholders.
- Send the logs to excodibur-iobroker@posteo.de, or attach them to your Github issue.

## I cannot connect to Tahoma and get 401 errors. Why?
- Your username/password comibnation could be invalid. Please check via https://tahomalink.com/, if you can still login with those credentials. If they work there, they should work for the adapter.
- Somfy could have temporarily locked your account. We don't know exactly why this happens but it could be due to:
  - Too many failed login attemps with incorrect password. Deactivate the adapter temporarily and try again later. You could also tweak your reconnect-behaviour under `Advanced Connection Settings`.
  - Too many update-/state-polling-requests in a certain amount of time. Think about setting a bigger `Polling Interval` configuration.

## My adapter keeps loosing the password. Why?
The adapter stores the password in an encrypted form and also uses an ioBroker feature to protect the password from being extracted by external resources as part of the adapter-configuration. This is a security-mechanism that helps to protect your sensitive credentials from getting stolen, or leaked.

If you try to retrieve the adapter-configuration (`getObject`), e.g. in JavaScript-adapter, ioBroker will provide it with the contents of the password-field being emptied out. Of course, if you then try to update and store that configuration again (`setObject`), the empty-password field will overwrite your set password and effectively your password will be lost.

In case you just want to implement some external adapter restart logic, you should instead of altering the adapter-configuration modify the _alive_ status of the adapter:
```
setState("system.adapter.tahoma.0.alive", false);
setState("system.adapter.tahoma.0.alive", true);
```

## Why is it so difficult to provide this Adapter in a stable state?
There are multiple reasons that lead to reoccuring problems:
- The adapter uses an inofficial API, that is used by Somfy for their Tahomalink-frontend (and likely also by the mobile-app). Thanks to [research done by a forum-member](https://forum.iobroker.net/post/336001), we can utilize this for the adapter. But this means:
  - There is no official support whatsoever by Somfy for the used API, so we can't know the full capabilities, or even more important: We have no idea when Somfy applies mechanics like rate-limiting to it. Perhaps they just see such reoccuring programatical access to an API desgined for GUI access as suspicious behavior and temporarily block it - we just don't know.
  - In theory Somfy could retire this API at any point, rendering the adapter in its current form useless.
- Since we don't have any interface specification for the used API, we can only make assumptions in which form Somfy will provide device-data and states to us. Apparently some devices result in more complex data-structures to be delivered by the API than for others. Old RTS components also "look" differently than new IO components.
  - Developers have only a limited amount of device-types available which they can test, so without support by common adapter-users providing DEBUG-logs it is impossible ensure that the adapter can handle all device-types properly. Everytime Somfy releases a new device with Tahoma-connectivity, the adapter potentially might have to be adjusted to work with it properly.

## Why does the adapter not use the offical Somfy Open API?
Ideally we could use the [Somfy Open API](https://developer.somfy.com/apis-docs) for this adapter, since it is the officially supported way by Somfy to steer their devices on a techical level. But there are issues with that approach:

- <span style="color:red; font-weight: bold">BLOCKER</span>: The api seems to be designed to be used by third party app providers, to allow them to add the possibility to manage some Somfy-devices via their own frontend. The problem here is, that Somfy uses the [OAuth2 Authorization Code Grant Type](https://developer.somfy.com/apis-docs), which basically means that
  - Login credentials cannot be sent directly to an authentication endpoint to get a valid token, but instead the user needs to be redirected to a Somfy login page where he has to enter credentials to authorize the client (here the ioBroker adapter) to use the Somfy device API. This is not a one-time action. Keeping the adapter connection alive and automatically reconnecting (not just refreshing the token) becomes almost impossible with those limitations. Of course for intgration of Somfy device management into another App (which seems to be the intended usecase) this is hardly a problem, but for an adapter that should "just work" and keep device-states current over longer time periods, this is a problem.
  - For all of this to work, you also have to create special Resource Owner credentials on the [Somfy dev-portal (called "App")](https://developer.somfy.com/user/me/apps), which is much more technical, then simply entering your known Tahomalink credentials.
- <span style="color:orange; font-weight: bold">LIMITATION</span>: Much less devices are currently supported by the official Somfy Open API, than by the (undocumented) API endpoint the Adapter is using. Device information and usable commands provided by this API are also more limited, than what the Adapter can currently do.
- <span style="color:orange; font-weight: bold">LIMITATION</span>: From time to time Somfy applies rate-limiting to this API, via such announcements:
  
        Dear customer,

        As you might have noticed, we have updated the quota policy of the Somfy Open API, in an ongoing effort to provide the best services to our users.

        We are contacting you today to inform you about the new rules we are now applying to the API:
        - First of all, no limitation will be applied on the POST /device/{deviceId}/exec endpoint as we want to provide you a total freedom on controlling your devices.
        - On the other hand, polling frequency on the GET /site and child endpoints will now have to be under 1 call per minute.

        To preserve an efficient and available service to any of our users, we want to keep the usage of the Open API to a usable but reasonable level to everybody. As we will keep monitoring the generated traffic and the potential impacts, be aware that we do reserve the rights to modify the authorized polling frequency or take any additional measure at any time as stated in our General Terms of Use.

        Thank you for your understanding.

## Some of the device-states the adapter provides should be changeable, but currently are not. Why?
As there is no official API-support or specifcation from Somfy, it is hard to tell sometimes, which data-fields provided by Tahoma-link should be changeable, and which ones are merely for informal purposes. If you think a state definitely should be changeable (e.g. to control device behaviour), **you might be right!** Please create a Github issue for it, so we can check it.

## Why are some configuration options visible only Admin 5.x with the new React-based GUI?
As this is meant to be the default GUI now (2021) and can be extended much easier, new configuration-features are only added here, to keep the implmentation effort manageable.

/* eslint-disable n/no-callback-literal */
/* eslint-disable dot-notation */
const request = require("request");

let controller;

function Tahoma (username, password, url, localUrl, loginOptions, applyOptions, context) {
    controller = this;

    controller.context = context;

    controller.username = username;
    controller.password = password;
    controller.url = url;
    controller.local_url = localUrl;
    controller.use_local_api = (controller.local_url !== "");

    if (controller.use_local_api)
        controller.context.log.info("Adapter will connect to Tahoma Box via local API.");

    controller.loginOptions = loginOptions;
    controller.applyOptions = applyOptions;
    controller.lastEventTime = new Date().getTime();

    controller.rawDeviceData = false;
    controller.tahomaJar = request.jar();

    controller.req_defaults = {
        "headers": {
            // 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36'
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:79.0) Gecko/20100101 Firefox/79.0"
        },
        "rejectUnauthorized": !controller.use_local_api,
        "jar": controller.tahomaJar
    };
    controller.baseRequest = request.defaults(controller.req_defaults);
    controller.localRequest = null;

    controller.baerer_token = null;

    controller.tahomaDevices = {};
    controller.tahomaActionGroups = {};
    controller.Map_DeviceURL2StateName = {};

    controller.isConnectedInternal = false;
    controller.loginInProgress = false;

    controller.gatewayList = [];
    controller.gatewayTimer = null;

    controller.eventRegisterID = "-1";
    controller.loginAttempts = 0;
    controller.loginErrorTimeout = null;

    controller.applyQueue = [];
    controller.applyTimer = null;
    controller.applyProcessing = false;

    controller.retryTimeout = null;
    controller.loginTimeout = null;
    controller.reapplyTimeout = null;

    controller.lastRelogin = null;
    controller.failedRequests = 0;
    controller.retryLocked = false;

    controller.lastRefresh = 0;

    controller.deviceExecIds = {};

    controller.ackStateValues = {};
    controller.existingSlowStates = {};

    controller.events = {};
}

Tahoma.prototype.unload = function (callback) {
    if (controller.loginErrorTimeout)
        clearTimeout(controller.loginErrorTimeout);

    if (controller.applyTimer)
        clearTimeout(controller.applyTimer);

    if (controller.retryTimeout)
        clearTimeout(controller.retryTimeout);

    if (controller.loginTimeout)
        clearTimeout(controller.loginTimeout);

    if (controller.reapplyTimeout)
        clearTimeout(controller.reapplyTimeout);

    if (controller.gatewayTimer)
        clearTimeout(controller.gatewayTimer);

    callback();
};

Tahoma.prototype.isConnected = function () {
    return controller.isConnectedInternal;
};

Tahoma.prototype.setConnected = function (connected) {
    controller.isConnectedInternal = connected;

    controller.context.setState("info.connection", true, true);
};

Tahoma.prototype.getCreateStateOptions4Widget = function (widget) {
    switch (widget) {
        case "PositionableHorizontalAwning":
            return {
                "role": "blind",
                "features": {
                    "deployment": true,
                    "percentage": true,
                    "closure": false,
                    "orientation": false,
                    "slow": false
                }
            };

        case "UpDownHorizontalAwning":
            return {
                "role": "blind",
                "features": {
                    "deployment": true,
                    "percentage": false,
                    "closure": false,
                    "orientation": false,
                    "slow": false
                }
            };

        case "UpDownCurtain":
        case "UpDownDualCurtain":
        case "UpDownExteriorScreen":
        case "UpDownExteriorVenetianBlind":
        case "UpDownRollerShutter":
        case "UpDownScreen":
        case "UpDownVenetianBlind":
        case "UpDownSwingingShutter":
            return {
                "role": "blind",
                "features": {
                    "deployment": false,
                    "percentage": false,
                    "closure": true,
                    "orientation": false,
                    "slow": false
                }
            };

        case "BioclimaticPergola":
            return {
                "role": "blind",
                "features": {
                    "deployment": false,
                    "percentage": false,
                    "closure": false,
                    "orientation": true,
                    "slow": false
                }
            };

        case "PositionableRollerShutterWithLowSpeedManagement":
            return {
                "role": "blind",
                "features": {
                    "deployment": false,
                    "percentage": true,
                    "closure": true,
                    "orientation": false,
                    "slow": true
                }
            };

        case "PositionableScreen":
        case "PositionableScreenUno":
        case "PositionableHorizontalAwningUno":
        case "PositionableRollerShutter":
        case "PositionableTiltedRollerShutter":
        case "PositionableRollerShutterUno":
        case "PositionableTiltedScreen":
        case "PositionableTiltedWindow":
        case "PositionableGarageDoor":
        case "DiscretePositionableGarageDoor":
        case "AwningValance":
            return {
                "role": "blind",
                "features": {
                    "deployment": false,
                    "percentage": true,
                    "closure": true,
                    "orientation": false,
                    "slow": false
                }
            };

        case "LuminanceSensor":
            return {
                "role": "sensor"
            };

        case "DimmerLight":
            return {
                "role": "light.dimmer",
                "features": {
                    "intensity": true
                }
            };
        default:
            return {
                "role": "state"
            };
    }
};

Tahoma.prototype.getCreateStateOptions4State = function (widget, stateName) {
    if (stateName === "core:ClosureState" || stateName === "core:TargetClosureState" || stateName === "core:DeploymentState" || stateName === "core:TargetDeploymentState" || stateName === "core:TargetTemperatureState") {
        return {
            "type": "number", // optional,  default "number"
            "read": true, // mandatory, default true
            "write": true, // mandatory, default true
            "min": 0, // optional,  default 0
            "max": 100, // optional,  default 100
            "unit": "%", // optional,  default %
            "role": "level.blind" // mandatory
        };
    } else if (stateName === "core:TargetTemperatureState") {
        return {
            "type": "number", // optional,  default "number"
            "read": true, // mandatory, default true
            "write": true, // mandatory, default true
            "min": 5, // optional,  min according to Somfy specs
            "max": 26, // optional,  max according to Somfy specs
            "role": "thermo" // mandatory
        };
    } else if (stateName === "core:SlateOrientationState") {
        return {
            "type": "number", // optional,  default "number"
            "read": true, // mandatory, default true
            "write": true, // mandatory, default true
            "min": 0, // optional,  default 0
            "max": 100, // optional,  default 100
            "unit": "%", // optional,  default %
            "role": "level.blind.orientation" // mandatory
        };
    } else if (stateName === "core:LuminanceState") {
        return {
            "type": "number", // optional,  default "number"
            "read": true, // mandatory, default true
            "write": false, // mandatory, default true
            "min": 0, // optional,  default 0
            "max": 100000, // optional,  default 100
            "unit": "Lux", // optional,  default %
            "role": "level.color.luminance" // mandatory
        };
    } else if (stateName === "core:OnOffState") {
        return {
            "type": "string", // optional,  default "number"
            "read": true, // mandatory, default true
            "write": true, // mandatory, default true
            "role": "switch" // mandatory
        };
    } else if (stateName === "core:LightIntensityState") {
        return {
            "type": "number", // optional,  default "number"
            "read": true, // mandatory, default true
            "write": true, // mandatory, default true
            "min": 0, // optional,  default 0
            "max": 100, // optional,  default 100
            "unit": "W", // optional,  default W
            "role": "level.dimmer" // mandatory
        };
    } else {
        return {
            "read": true,
            "write": false,
            "role": "state"
        };
    }
};

Tahoma.prototype.sendPOST = function (requestPath, payload, callback, locally) {
    controller.login(function (err, data) {
        if (err)
            return callback(err, data);

        controller.sendInternalPOST(requestPath, payload, callback, locally);
    });
};

Tahoma.prototype.sendGET = function (requestPath, payload, callback, locally) {
    controller.login(function (err, data) {
        if (err)
            return callback(err, data);

        controller.sendInternalGET(requestPath, payload, callback, locally);
    });
};

Tahoma.prototype.sendDELETE = function (requestPath, payload, callback, locally) {
    controller.login(function (err, data) {
        if (err)
            return callback(err, data);

        controller.sendInternalDELETE(requestPath, payload, callback, locally);
    });
};

Tahoma.prototype.sendInternalRequest = function (method, requestPath, payload, callback, locally) {
    let url;
    if (locally)
        url = controller.local_url + requestPath;
    else
        url = controller.url + requestPath;

    if (!locally && requestPath.endsWith("apply") && payload && payload.actions && payload.actions.length === 1) { // only on POST
        // do not abuse high Priority! It will result in err 400 on too many requests
        url = controller.url + requestPath + "/highPriority";
    }

    let formPayload = null;
    let jsonPayload = null;

    const requestParams = {
        "url": url
    };

    if (requestPath === "login") { // only on POST
        formPayload = payload;
    } else
        jsonPayload = payload;

    if (requestPath === "login")
        controller.context.log.debug(method + " request on " + url + " with payload: +++redacted+++");
    else
        controller.context.log.debug(method + " request on " + url + " with payload:" + JSON.stringify(payload));

    let reqFunc;
    let sendFunc;

    let baseReq;
    if (locally)
        baseReq = controller.localRequest;
    else
        baseReq = controller.baseRequest;

    if (method === "POST") {
        reqFunc = baseReq.post;
        sendFunc = controller.sendPOST;
    } else if (method === "GET") {
        reqFunc = baseReq.get;
        sendFunc = controller.sendGET;
    } else if (method === "DELETE") {
        reqFunc = baseReq.delete;
        sendFunc = controller.sendDELETE;
    } else {
        controller.context.log.warn("Invalid method for request: " + method);
        callback && callback(true, {});
        return;
    }

    if (!locally || (method === "POST")) {
        if (jsonPayload !== null) requestParams.json = jsonPayload;
        if (formPayload !== null) requestParams.form = formPayload;
    }

    reqFunc(requestParams, function (error, response, body) {
        if (!error && response && (response.statusCode === 200 || response.statusCode === 204)) {
            controller.failedRequests = 0;
            if (requestPath === "login") { // only on POST
                callback(false, JSON.parse(body));
            } else {
                controller.context.log.debug("Response: " + JSON.stringify(body));
                callback(false, body);
            }
        } else if (response && requestPath !== "logout" && (response.statusCode === 401 || response.statusCode === 403)) {
            controller.context.log.warn("error during request: " + response.statusMessage + " ->" + response.statusCode + " retry " + requestPath);

            // session expired?
            if (locally) controller.clearBearerToken();
            controller.setConnected(false);
            controller.loginInProgress = false;

            if (controller.loginErrorTimeout)
                clearTimeout(controller.loginErrorTimeout);

            if (controller.loginAttempts >= controller.loginOptions.maxAttempts) {
                controller.loginAttempts = 0;
                // sleep for two minutes
                controller.context.log.info("Login failed " + controller.loginOptions.maxAttempts + " times, waiting " + controller.loginOptions.delayAfterFailure + " seconds before retrying.");

                if (controller.loginTimeout)
                    clearTimeout(controller.loginTimeout);

                if (controller.retryTimeout)
                    controller.context.log.info("Timeout still active.");
                else {
                    controller.retryTimeout = setTimeout(function () {
                        controller.context.log.info("Executing Timeout (retry login).");
                        controller.retryTimeout = null;
                        sendFunc(requestPath, payload, callback);
                    }, controller.loginOptions.delayAfterFailure * 1000);
                }
            } else {
                controller.loginAttempts++;
                controller.context.log.debug("Will attempt again to login in " + controller.loginOptions.delayAttempts + " seconds.");
                controller.loginErrorTimeout = setTimeout(function () {
                    controller.context.log.info("Login attempt #" + controller.loginAttempts);
                    // perform login and send again
                    sendFunc(requestPath, payload, callback);
                }, controller.loginOptions.delayAttempts * 1000);
            }
        } else if (response && (response.statusCode === 400 || response.statusCore === 503)) {
            controller.failedRequests++;

            if (!controller.use_local_api || requestPath !== "events/register") {
                if (requestPath === "login")
                    controller.context.log.warn("error during request: " + error + ", request path: " + requestPath + " with payload: +++redacted+++");
                else
                    controller.context.log.warn("error during request: " + error + ", request path: " + requestPath + " with payload:" + JSON.stringify(payload));

                if (response)
                    controller.context.log.warn("Response: " + JSON.stringify(response));

                if (body)
                    controller.context.log.warn("Body: " + JSON.stringify(body));
            }

            if (controller.use_local_api) {
                callback(true, response);
                return;
            }

            if (controller.failedRequests > 5 || (body && body.errorCode && body.errorCode === "UNSPECIFIED_ERROR")) {
                let delay;
                if (response.statusCode === 503) {
                    // down for maintenance
                    delay = 30000;
                } else {
                    // problem with request
                    delay = 10000;
                }

                if (controller.retryTimeout)
                    clearTimeout(controller.retryTimeout);

                controller.retryLocked = true;

                controller.context.log.warn("Waiting " + (delay / 1000) + " until re-login because of too many errors.");
                controller.retryTimeout = setTimeout(function () {
                    controller.retryTimeout = null;
                    controller.logout(function (err) {
                        controller.context.log.warn("Failure during logout: " + err);
                        controller.retryLocked = false;
                        callback(true, response);
                    });
                }, delay);
            } else
                callback(true, response);
        } else {
            if (requestPath === "login")
                controller.context.log.warn("error during request: " + error + ", request path: " + requestPath + " with payload: +++redacted+++");
            else
                controller.context.log.warn("error during request: " + error + ", request path: " + requestPath + " with payload:" + JSON.stringify(payload));

            if (response)
                controller.context.log.warn("Response: " + JSON.stringify(response));

            if (body)
                controller.context.log.warn("Body: " + JSON.stringify(body));

            const result = {};
            result.error = error;

            if (typeof response !== "undefined") {
                controller.context.log.debug("response status: " + response.statusCode + " " + response.statusMessage);

                result.responseStatusCode = response.statusCode;
                result.responsestatusMessage = response.statusMessage;
            }

            callback(true, result);
        }
    }, controller.use_local_api);
};

Tahoma.prototype.clearBearerToken = function (r) {
    controller.context.log.info("Clearing stored bearer token " + controller.context.config.bearer_token);
    controller.context.getForeignObject("system.adapter." + controller.context.namespace, (err, obj) => {
        if (!err && obj) {
            obj.native.bearer_token = "";
            controller.context.setForeignObject("system.adapter." + controller.context.namespace, obj);
        }
    });
};

Tahoma.prototype.sendInternalGET = function (requestPath, payload, callback, locally) {
    return controller.sendInternalRequest("GET", requestPath, payload, callback, locally);
};

Tahoma.prototype.sendInternalPOST = function (requestPath, payload, callback, locally) {
    return controller.sendInternalRequest("POST", requestPath, payload, callback, locally);
};

Tahoma.prototype.sendInternalDELETE = function (requestPath, payload, callback, locally) {
    return controller.sendInternalRequest("DELETE", requestPath, payload, callback, locally);
};

Tahoma.prototype.logout = function (callback) {
    if (controller.use_local_api) {
        // do not log out on enabled local api
        callback(false, {});
        return true;
    }

    const performLogout = controller.isConnected();
    controller.setConnected(false);

    if (controller.applyTimer) {
        controller.applyProcessing = true; // avoid executing mistakenly
        clearTimeout(controller.applyTimer);
        controller.applyTimer = null;
    }

    controller.eventRegisterID = "-1";

    if (performLogout) {
        controller.sendInternalPOST("logout", {}, function (err, data) {
            callback(err, data);
        });
    } else
        callback(false, {});

    return true;
};

Tahoma.prototype.login = function (callback) {
    if (controller.isConnected()) {
        callback(false, {});
        return;
    }

    if ((controller.local_url.length > 0) && controller.context.config.bearer_token) {
        controller.lastEventTime = new Date().getTime();
        controller.setConnected(true);
        controller.loginInProgress = false;

        const newDefaults = controller.req_defaults;
        newDefaults.headers["Authorization"] = "Bearer " + controller.context.config.bearer_token;
        newDefaults.headers["Content-type"] = "application/json";
        controller.localRequest = request.defaults(newDefaults);
        controller.context.log.info("Using stored bearer token " + controller.context.config.bearer_token);

        controller.gatewayTimer = setTimeout(function () {
            controller.updateGateWays();
        }, 10000);
        return controller.getSetup(callback);
    }

    // check for login already started but not yet finished
    if (controller.loginInProgress) {
        controller.loginTimeout = setTimeout(function () {
            controller.loginTimeout = null;
            controller.login(callback);
        }, 1500);
        return;
    }

    controller.loginInProgress = true;

    const payload = {
        "userId": controller.username,
        "userPassword": controller.password
    };

    controller.sendInternalPOST("login", payload, function (err, data) {
        if (err || !data.success) {
            controller.loginInProgress = false;
            return callback(true, data);
        }

        controller.lastEventTime = new Date().getTime();
        controller.setConnected(true);
        controller.loginInProgress = false;

        if (controller.use_local_api) {
            // we need a bearer token for the local api
            // first get token
            controller.sendInternalGET("config/" + controller.context.config.gatewaypin + "/local/tokens/generate", {}, function (err, data) {
                if (typeof data !== "object")
                    data = JSON.parse(data);
                if (!err && data.token) {
                    controller.context.log.info("Got token for local api: " + data.token);
                    const bearerToken = data.token;

                    // activate token
                    const tokendata = {
                        "label": "Toto token",
                        "token": bearerToken,
                        "scope": "devmode"
                    };
                    controller.sendInternalPOST("config/" + controller.context.config.gatewaypin + "/local/tokens", tokendata, function (err, data) {
                        if (!err) {
                            controller.context.config.bearer_token = bearerToken;
                            const newDefaults = controller.req_defaults;
                            newDefaults.headers["Authorization"] = "Bearer " + bearerToken;
                            newDefaults.headers["Content-type"] = "application/json";
                            controller.localRequest = request.defaults(newDefaults);
                            controller.context.getForeignObject("system.adapter." + controller.context.namespace, (err, obj) => {
                                if (err) {
                                    controller.context.log.error("Error while getting bearer token: " + err);
                                    callback(err, data);
                                }
                                if (obj) {
                                    obj.native.bearer_token = bearerToken;
                                    controller.context.setForeignObject("system.adapter." + controller.context.namespace, obj);
                                }
                            });
                            controller.gatewayTimer = setTimeout(function () {
                                controller.updateGateWays();
                            }, 10000);
                            return controller.getSetup(callback);
                        } else {
                            controller.setConnected(false);
                            controller.loginInProgress = false;
                        }
                        callback(err, data);
                    });
                } else {
                    controller.setConnected(false);
                    controller.loginInProgress = false;
                    controller.context.log.warn("Error getting token for local api");
                    callback(err, data);
                }
            });
        } else {
            // using remote api
            controller.getUserInfo(function (err, data) {
                if (!err) {
                    controller.gatewayTimer = setTimeout(function () {
                        controller.updateGateWays();
                    }, 10000);
                    return controller.getSetup(callback);
                }

                callback(err, data);
            });
        }
    });
};

Tahoma.prototype.getUserInfo = function (callback) {
    controller.sendGET("enduser/mainAccount", {}, function (err, data) {
        if (!err) {
            controller.updateData("userdata", data.endUser);

            callback(false, data);
        } else
            controller.context.log.warn("enduser/mainAccount failed!");
    });
};

Tahoma.prototype.updateGateWayData = function (gateways) {
    controller.gatewayList = [];
    for (const i in gateways) {
        const gateway = gateways[i];
        if (gateway.gatewayId) {
            controller.gatewayList.push(gateway.gatewayId);
            controller.updateData(gateway.gatewayId, gateway);
        }
    }
};

Tahoma.prototype.updateDevices = function (devices) {
    controller.tahomaDevices = devices;
    controller.context.log.debug(JSON.stringify(devices));
    for (const i in devices) {
        const device = devices[i];

        // just set the raw data from tahoma
        device.label = device.label.replace(/\./g, "_");
        device.label = device.label.replace(/__/g, "_");
        device.label = device.label.replace(controller.context.FORBIDDEN_CHARS, "_");
        controller.updateDevice("devices." + device.label, device);
    }
};

Tahoma.prototype.updateDevice = function (name, deviceData) {
    const features = controller.getCreateStateOptions4Widget(deviceData.definition?.widgetName);

    const objset = {
        "role": features.role,
        "read": true,
        "write": false
    };

    controller.createOrUpdateState(name, "", objset);

    // device URL
    controller.createOrUpdateState(name + ".deviceURL", deviceData.deviceURL);

    // states
    for (const stateKey in deviceData.states) {
        const state = deviceData.states[stateKey];

        if (typeof state.value === "undefined")
            controller.context.log.debug("State " + name + ".states." + state.name + " is undefined. Tahoma has no use for it, hence ignoring it.");
        else if (typeof state.value === "object") {
            // Prepare sub-states
            const channelStates = [];
            for (const [key, value] of Object.entries(state.value))
                channelStates.push({ "name": key, "value": value });

            // Create a channel with state-sublelements
            controller.createOrUpdateChannel(name + ".states." + state.name, channelStates);
        } else {
            controller.createOrUpdateState(name + ".states." + state.name, controller.mapValueTahoma2ioBroker(state.name, state.value), controller.getCreateStateOptions4State(deviceData.widget, state.name));

            if (features.features && features.features.slow && features.features.slow === true) {
                const validStates = [
                    "core:ClosureState",
                    "core:TargetClosureState"
                ];
                if (validStates.includes(state.name)) {
                    controller.existingSlowStates[name + ".states." + state.name] = true;
                    controller.createOrUpdateState(name + ".states." + state.name + ":slow", controller.mapValueTahoma2ioBroker(state.name, state.value), controller.getCreateStateOptions4State(deviceData.widget, state.name));
                }
            }
        }
    }

    // commands
    for (const commandKey in deviceData.definition.commands) {
        const command = deviceData.definition.commands[commandKey];

        // nparams for commands indicates how may parameters a command expects

        if ((deviceData.deviceURL.startsWith("io:") && (command.nparams === 0)) ||
            (deviceData.deviceURL.startsWith("rts:") && (command.nparams <= 1)) ||
            (deviceData.deviceURL.startsWith("ogp:") && (command.nparams <= 1))) {
            controller.createOrUpdateState(name + ".commands." + command.commandName, false, {
                "type": "boolean",
                "read": true,
                "write": true,
                "role": "button"
            });

            if (features.features && features.features.slow && features.features.slow === true) {
                const validCommands = [
                    "up",
                    "open",
                    "down",
                    "close"
                ];
                if (validCommands.includes(command.commandName)) {
                    controller.existingSlowStates[name + ".commands." + command.commandName] = true;
                    controller.createOrUpdateState(name + ".commands." + command.commandName + ":slow", false, {
                        "type": "boolean",
                        "read": true,
                        "write": true,
                        "role": "button"
                    });
                }
            }
        }
    }

    // raw data
    if (controller.rawDeviceData) {
        for (const p in deviceData) {
            const value = deviceData[p];

            if (typeof (value) === "object")
                controller.updateData("raw." + name + "." + p, value);
            else
                controller.createOrUpdateState("raw." + name + "." + p, value);
        }
    }
};

Tahoma.prototype.updateActionGroups = function (actionGroups) {
    controller.tahomaActionGroups = actionGroups;

    for (const i in actionGroups) {
        const actionGroup = actionGroups[i];
        // just set the raw data from tahoma
        controller.updateActionGroup("actionGroups." + actionGroup.label, actionGroup);
    }
};

Tahoma.prototype.updateActionGroup = function (actionGroup, actionGroupData) {
    // Action Group OID
    controller.createOrUpdateState(actionGroup + ".oid", actionGroupData.oid);

    controller.createOrUpdateState(actionGroup + ".commands." + "execute", false, {
        "type": "boolean",
        "read": true,
        "write": true,
        "role": "button"
    });
};

Tahoma.prototype.mapValueTahoma2ioBroker = function (stateName, stateValue) {
    switch (stateName) {
        case "core:ClosureState":
        case "core:TargetClosureState":
        case "core:DeploymentState":
        case "core:TargetDeploymentState":
        case "core:SlateOrientationState":
        case "core:LuminanceState":
        case "core:PriorityLockTimerState":
        case "core:RSSILevelState":
        case "core:LightIntensityState":
        case "core:TemperatureState":
        case "internal:LightingLedPodModeState":
        case "internal:AlarmDelayState":
        case "core:BatteryLevelState":
        case "core:TargetTemperatureState":
        case "core:TargetRoomTemperatureState":
        case "core:DerogationEndDateTimeState":
        case "core:DerogationStartDateTimeState":
        case "io:ManualModeTargetTemperatureState":
        case "core:DerogatedTargetTemperatureState":
        case "core:ColorTemperatureState":
            stateValue = parseInt(stateValue, 10);
            break;
        case "core:MovingState":
            stateValue = stateValue || (stateValue === "true");
            break;
    }
    return stateValue;
};

Tahoma.prototype.mapValueioBroker2Tahoma = function (stateName, stateValue) {
    if (stateName === "core:ClosureState" || stateName === "core:TargetClosureState" || stateName === "core:DeploymentState" || stateName === "core:TargetDeploymentState") {
        // stateValue = parseInt(stateValue,10);
    }

    return stateValue;
};

Tahoma.prototype.updateData = function (type, data) {
    for (const p in data) {
        const value = data[p];

        if (typeof (value) === "object")
            controller.updateData(type + "." + p, value);
        else
            controller.createOrUpdateState(type + "." + p, value);
    }
};

Tahoma.prototype.createOrUpdateState = function (key, value, options) {
    // controller.context.log.debug('createOrUpdateState: ' + key + ' => ' + value);
    const stateName = key.substr(key.lastIndexOf(".") + 1);

    key = key.replace(/ /g, "_");
    key = key.replace(controller.context.FORBIDDEN_CHARS, "_");
    let typeName = "string";

    if (value === "true" || value === "false" || value === true || value === false) {
        value = (value === "true" || value === true);
        typeName = "boolean";
    } else if (Number.isInteger(value)) {
        value = parseInt(value, 10);
        typeName = "number";
    } else if (!isNaN(value)) {
        value = Number(value);
        typeName = "number";
    }

    controller.context.getObject(key, function (err, obj) {
        if (err || !obj) {
            if (typeof (options) === "undefined") {
                options = {
                    "read": true,
                    "write": false,
                    "type": typeName
                };
            }
            if (!options.name)
                options.name = stateName;

            if (!options.role)
                options.role = "state";

            if (!options.type)
                options.type = typeName;

            // controller.context.log.debug('createState ' + key + ' => ' + value);
            // create state
            controller.context.setObject(key, {
                "type": "state",
                "common": options,
                "native": {}
            }, function () {
                controller.ackStateValues[key] = value;
                controller.context.setState(key, value, true);
            });
        } else {
            controller.context.log.debug("setState " + key + " => " + value);
            controller.ackStateValues[key] = value;
            controller.context.setState(key, value, true);
        }
    });
};

Tahoma.prototype.createOrUpdateChannel = function (key, states) {
    key = key.replace(/ /g, "_");
    key = key.replace(controller.context.FORBIDDEN_CHARS, "_");

    controller.context.setObjectNotExists(key, {
        "type": "channel",
        "common": {
            "read": true,
            "write": false
        }
    }, () => {
        states.forEach(state => {
            if (typeof state.value === "object") {
                // If there is a way more complex structure at this point, the adapter will ignore for now.
                state.value = "Data too complex.";
            }
            controller.context.log.debug("Creating sub-state: " + key + "." + state.name);
            controller.createOrUpdateState(key + "." + state.name, controller.mapValueTahoma2ioBroker(state.name, state.value), controller.getCreateStateOptions4State(null, state.name));
        });
    });
};

Tahoma.prototype.updateGateWays = function (nextEntry) {
    controller.gatewayTimer = null;

    if (!nextEntry)
        nextEntry = 0;
    else if (nextEntry >= controller.gatewayList.length) {
        controller.gatewayTimer = setTimeout(function () {
            controller.updateGateWays();
        }, 30000);
        return;
    }
    controller.context.log.debug("Update gateway status for id " + controller.gatewayList[nextEntry]);
    let useUrl = "setup/gateways";
    if (!controller.use_local_api)
        useUrl = useUrl + "/" + controller.gatewayList[nextEntry];

    controller.sendGET(useUrl, {}, function (err, data) {
        if (!err && data) {
            controller.updateGateWayData([data]);
            controller.context.log.debug("Updated gateway status for id " + controller.gatewayList[nextEntry]);
        }
        controller.updateGateWays(nextEntry + 1);
    }, controller.use_local_api);
};

Tahoma.prototype.getSetup = function (callback) {
    controller.sendGET("setup", {}, function (err, data) {
        if (!err) {
            if (typeof data !== "object")
                data = JSON.parse(data);

            controller.updateGateWayData(data.gateways);
            controller.updateData("location", data.location);
            controller.updateDevices(data.devices);

            // delete old devices
            controller.deleteOldDevices();

            let toProcess = 0;
            // update mapping table device URL to state key with label
            controller.context.getAdapterObjects(function (res) {
                const objKeys = Object.keys(res);
                const search = new RegExp("^" + controller.context.namespace + "\\.devices\\..+\\.deviceURL$");
                for (let i = 0; i < objKeys.length; i++) {
                    const objid = objKeys[i];
                    if (objid.match(search)) {
                        toProcess++;
                        controller.context.getState(objid, function (err, state) {
                            if (!err && state)
                                controller.Map_DeviceURL2StateName[state.val] = objid.substr(0, objid.indexOf(".deviceURL"));

                            toProcess--;
                            if (toProcess < 1) {
                                // now we should be able to refresh (devices known)
                                controller.refresh(callback);
                            }
                        });
                    } else if (i === objKeys.length - 1 && toProcess < 1) {
                        // now we should be able to refresh (devices known)
                        controller.refresh(callback);
                    }
                }
            });
        } else {
            controller.context.log.warn("setup failed!");
            controller.context.log.warn(JSON.stringify(data));
            callback(err, {});
        }
    }, controller.use_local_api);

    if (!controller.use_local_api) {
        controller.sendGET("actionGroups", {}, function (err, data) {
            if (!err)
                controller.updateActionGroups(data);
            else {
                controller.context.log.warn("actionGroups failed!");
                controller.context.log.warn(JSON.stringify(data));
            }
            // callback(err, {});
        });
    }
};

Tahoma.prototype.refresh = function (callback) { // controller.one is overridden below?!
    if (controller.use_local_api)
        callback && callback(false, {});
    else {
        controller.sendPOST("setup/devices/states/refresh", null, function (err, data) {
            if (err)
                controller.context.log.warn("refresh device state failed: Error - " + err + " data: " + JSON.stringify(data));

            callback && callback(err, {});
        });
    }
};

Tahoma.prototype.getAllStates = function (callback) {
    if (!controller.use_local_api && controller.retryLocked)
        return;

    controller.login(function (err, data) {
        if (err)
            return;

        if (controller.eventRegisterID === "-1") {
            // currently the event registration does not work on local api (UNKOWN OBJECT) – waiting for firmware update!
            // as workaround we do "setup" again …
            controller.sendPOST("events/register", {}, function (err, data) {
                if (err && controller.use_local_api) {
                    controller.context.log.debug("events/register failed. falling back to setup/devices");
                    controller.getSetup(callback);
                    return;
                }

                controller.eventRegisterID = data.id;
                controller.context.log.info("eventRegisterID = " + controller.eventRegisterID);

                controller.fetchEvents(callback);
            }, controller.use_local_api);
        } else
            controller.fetchEvents(callback);
    });
};

Tahoma.prototype.fetchEvents = function (callback) {
    const curTime = (new Date()).getTime();
    if (controller.lastRefresh < curTime - (5 * 60 * 1000)) {
        controller.context.log.debug("Refreshing device states.");
        controller.lastRefresh = curTime;
        controller.refresh(function () {
            controller.fetchEvents(callback);
        });
        return;
    };

    controller.sendPOST("events/" + controller.eventRegisterID + "/fetch", {}, function (err, data) {
        if (err)
            return;

        controller.context.log.debug("events/" + controller.eventRegisterID + "/fetch" + "Fetched Data " + JSON.stringify(data));
        controller.updateDeviceStateFromEvent(data);
        if (callback)
            callback();
    }, controller.use_local_api);
};

Tahoma.prototype.updateDeviceStateFromEvent = function (events) {
    for (const i in events) {
        controller.lastEventTime = new Date().getTime();
        const event = events[i];

        if (event.name === "DeviceStateChangedEvent")
            controller.updateDeviceState(event);
        else if (event.name === "ExecutionStateChangedEvent" || event.name === "ExecutionRegisteredEvent")
            controller.updateEventState(event);
    }
};

Tahoma.prototype.updateEventState = function (event) {
    controller.context.log.debug("Event: " + JSON.stringify(event));
    const execId = event.execId;

    const currentState = event.state || event.newState;

    if (event.name === "ExecutionRegisteredEvent") {
        controller.events[event.execId] = {
            "deviceURL": event.actions[0].deviceURL,
            "command": event.actions[0].command || event.actions[0].commands[0].name,
            "parameters": event.actions[0].parameters,
            "state": event.actions[0].state
        };
    }

    if (currentState !== "IN_PROGRESS" && currentState !== "COMPLETED" && currentState !== "FAILED")
        return;

    let url = "exec/current/";
    if (currentState === "COMPLETED" || currentState === "FAILED") {
        const storedEvent = controller.events[event.execId];
        controller.context.log.debug(`Skipping calling history. Using stored event (${JSON.stringify(storedEvent)}) instead`);
        storedEvent.state = currentState;
        controller.updateDeviceActionState(storedEvent, execId);
        delete controller.events[event.execId];
        return;
    }

    url += execId;
    if (!controller.use_local_api)
        url += "?_=" + (new Date()).getTime();

    controller.sendGET(url, {}, function (err, data) {
        if (err) {
            controller.context.log.warn("Failed getting execution state for " + execId);
            return;
        } else if (!data || (!data.execution && !data.state))
            return;

        controller.context.log.debug(url + " - Fetched Data " + JSON.stringify(data));

        let actions;
        if (data.execution) {
            // unify contents
            data = data.execution;
            actions = data.commands;
        } else {
            if (data.actionGroup)
                actions = data.actionGroup.actions;
            else if (data.commands)
                actions = data.commands;
        }

        let action;
        for (let i = 0; i < actions.length; i++) {
            action = actions[i];
            if (action.commands) {
                const cmd = action.commands[0];
                action.type = cmd.type;
                action.name = cmd.name;
                action.parameters = cmd.parameters;
            }

            if (currentState === "IN_PROGRESS" || currentState === "FAILED") {
                // Acknowledge that the command state was set, so the user can see something is happening
                const devicePath = controller.Map_DeviceURL2StateName[action.deviceURL];
                let command = (action.command ? action.command : action.name);
                if (command === "setClosureAndLinearSpeed")
                    command = ((action.parameters[0] === 100) ? "down:slow" : "up:slow");
                const commandStateId = devicePath + ".commands." + command;
                controller.context.getState(commandStateId, (err, tmpState) => {
                    if (err || tmpState === null) {
                        controller.context.log.debug("Command " + commandStateId + " does not seem to be a changable state. Skipping it.");
                        return; // state for command probably does not exist, so do nothing
                    }
                    switch (currentState) {
                        case "IN_PROGRESS":
                            controller.context.log.debug("Command \"" + commandStateId + "\" " + currentState + ". ACKnowledging it.");
                            controller.context.setState(commandStateId, true, true);
                            break;
                        case "FAILED":
                            controller.context.log.debug("Command \"" + commandStateId + "\" " + currentState + ". Setting it to false.");
                            controller.context.setState(commandStateId, false, true);
                            break;
                    }
                });
            }

            // store event for future use
            /* controller.events[execId] = {
                "deviceURL": action.deviceURL,
                "command": action.command,
                "name": action.name,
                "parameters": action.parameters,
                "state": action.state
            }; */

            controller.updateDeviceActionState(action, execId);
        }
    }, controller.use_local_api);
};

Tahoma.prototype.updateDeviceActionState = function (event, execId) {
    const deviceURL = event.deviceURL;

    if (!deviceURL) {
        controller.context.log.info("No deviceURL in event: " + JSON.stringify(event));
        return;
    }

    const devicePath = controller.Map_DeviceURL2StateName[deviceURL];
    if (!devicePath) {
        controller.context.log.warn("Got action event for invalid device: " + JSON.stringify(event));
        return;
    }

    controller.context.log.debug("got action event for device " + devicePath + ": " + JSON.stringify(event));

    let command = (event.command ? event.command : event.name);
    const state = (event.state ? event.state : "START");

    let targetPosition = null;
    let direction = 0;

    let resetCommands = [command];

    if (state !== "COMPLETED" && state !== "FAILED") {
        controller.deviceExecIds[deviceURL] = execId;

        if (command === "up" || command === "open" || command === "deploy")
            direction = 1;
        else if (command === "down" || command === "close" || command === "undeploy")
            direction = 2;
        else if (command === "setClosure" || command === "setDeployment" || command === "setClosureAndLinearSpeed") {
            if (event.parameters && event.parameters.length > 0)
                targetPosition = event.parameters[0];
        } else
            return;
    } else {
        if (controller.deviceExecIds[devicePath])
            delete controller.deviceExecIds[deviceURL];

        // Reset the command to "false" again, if it was completed/failed
        if (command === "setClosureAndLinearSpeed") {
            if (event.parameters && event.parameters.length > 0)
                command = ((event.parameters[0] === 100) ? "down:slow" : "up:slow");
            else {
                controller.context.log.debug("Can't determine state (down/up:slow) from action event. Resetting both.");
                resetCommands = ["down:slow", "up:slow"];
            }
        }

        for (const resetCommand of resetCommands) {
            const commandStateId = devicePath + ".commands." + resetCommand;
            controller.context.getState(commandStateId, (err, tmpState) => {
                if (err || tmpState === null) {
                    controller.context.log.debug("Command " + commandStateId + " does not seem to be a changable state. Skipping it.");
                    return; // state for command probably does not exist, so do nothing
                }
                controller.context.log.debug("Command \"" + commandStateId + "\" " + state + ". Resetting it to false.");
                controller.context.setState(commandStateId, false, true);
            });
        }
    }

    if (targetPosition === null) {
        controller.setDeviceMoving(devicePath, direction);
        return;
    }

    let currentPos = null;

    let basePath = devicePath;
    if (basePath.indexOf(controller.context.namespace) === 0)
        basePath = basePath.substr(controller.context.namespace.length + 1);

    let key = basePath + ".states.core:ClosureState";
    if (undefined !== controller.ackStateValues[key])
        currentPos = controller.ackStateValues[key];
    else {
        controller.context.log.debug(key + " not found in ackStateValues. Values are: " + JSON.stringify(controller.ackStateValues));
        key = basePath + ".states.core:DeploymentState";
        if (undefined !== controller.ackStateValues[key])
            currentPos = controller.ackStateValues[key];
        else {
            key = basePath + ".states.core:OpenCloseState";
            if (undefined !== controller.ackStateValues[key]) {
                const openClosed = controller.ackStateValues[key];
                direction = 3;
                if (openClosed === "open") {
                    if (targetPosition > 0)
                        direction = 1;
                } else if (openClosed === "close") {
                    if (targetPosition < 100)
                        direction = 2;
                }

                controller.setDeviceMoving(devicePath, direction);
                return;
            }
        }
    }

    if (currentPos !== null) {
        if (targetPosition > currentPos)
            direction = 2;
        else
            direction = 1;
    } else
        direction = 3;

    controller.setDeviceMoving(devicePath, direction);
};

Tahoma.prototype.setDeviceMoving = function (devicePath, direction) {
    if (!devicePath) {
        controller.context.log.warn("Could not set moving state because devicePath is missing.");
        return;
    }

    controller.context.log.debug("Updating moving state to " + direction);
    // update state
    controller.createOrUpdateState(devicePath + ".states.moving", direction, {
        "type": "number",
        "read": true,
        "write": false,
        "role": "value.direction",
        "states": {
            "0": "stopped",
            "1": "up/undeploy",
            "2": "down/deploy",
            "3": "moving (unknown direction)"
        }
    });
};

Tahoma.prototype.updateDeviceState = function (event) {
    controller.context.log.debug("Event: " + JSON.stringify(event));
    let deviceURL = event.deviceURL;
    const states = event.deviceStates;

    if (!deviceURL)
        deviceURL = "";

    let devicePath = controller.Map_DeviceURL2StateName[deviceURL];
    if (!devicePath)
        devicePath = "";

    controller.context.log.debug("got event for device " + devicePath + "(" + deviceURL + ")");
    if (!devicePath)
        return;

    for (const i in states) {
        const state = states[i];
        const name = state.name;
        const value = controller.mapValueTahoma2ioBroker(name, state.value);

        // Ignore states that have undefined values, as Tahoma does not seem to have any meaningful data for them
        // Excodibur: We could set it to null instead (which is supported by JSON) but then IOBroker will warn that "state has no object"
        if (typeof value === "undefined") {
            controller.context.log.debug("State " + name + " is undefined. Tahoma has no use for it, hence ignoring it.");
            continue;
        }

        controller.context.log.debug("found " + devicePath + ".states." + name + " -> " + value);

        if (devicePath.indexOf(controller.context.namespace) === 0)
            devicePath = devicePath.substr(controller.context.namespace.length + 1);

        const key = devicePath + ".states." + name;

        // Check if key is a state or a channel with substates
        controller.context.getObject(key, (error, object) => {
            if (error) return;

            if (object.type === "channel") {
                try {
                    let subStates;
                    if (typeof value === "object")
                        subStates = value;
                    else
                        subStates = JSON.parse(value);

                    const channelPath = key;
                    for (const [attrName, attrValue] of Object.entries(subStates)) {
                        controller.ackStateValues[channelPath + "." + attrName] = attrValue;
                        controller.context.setState(channelPath + "." + attrName, attrValue, true);
                    }
                } catch (e) {
                    controller.context.log.warn("Could not state-data for channel " + key + " Raw-data: " + value);
                }
            } else {
                controller.ackStateValues[key] = value;
                controller.context.setState(key, value, true);
                if (typeof controller.existingSlowStates[key] !== "undefined")
                    controller.context.setState(key + ":slow", value, true);
            }
        });
    }
};

Tahoma.prototype.deleteOldDevices = function () {
    const currentTime = new Date().getTime();

    controller.context.getAdapterObjects(function (res) {
        const objKeys = Object.keys(res);
        const search = new RegExp("^" + controller.context.namespace + "\\.devices\\..+\\.lastUpdateTime$");
        const delObjects = [];

        for (let i = 0; i < objKeys.length; i++) {
            const objid = objKeys[i];
            if (objid.match(search)) {
                controller.context.getState(objid, function (err, state) {
                    if (!err && state) {
                        const device = objid.substr(0, objid.indexOf(".lastUpdateTime"));
                        if (currentTime - state.ts > 5 * 60 * 1000) {
                            controller.context.log.debug("found old " + device + " -> " + new Date(state.ts));
                            delObjects.push(device);
                        }
                    }
                });
            }
        }

        for (let i = 0; i < objKeys.length; i++) {
            const objid = objKeys[i];
            for (let d = 0; d < delObjects.length; d++) {
                if (objid.indexOf(delObjects[d]) === 0) {
                    controller.context.log.debug("delete state:" + objid, "debug");
                    controller.context.deleteState(objid);
                }
            }
        }
    });
};

Tahoma.prototype.onApplyChange = function (attribute, id, value, slow) {
    if (!attribute)
        attribute = "closure";

    let commandName;
    let stateName;

    if (attribute === "closure") {
        commandName = "setClosure";
        if (slow && slow === true)
            commandName = "setClosureAndLinearSpeed";

        stateName = "core:ClosureState";
    } else if (attribute === "deployment") {
        commandName = "setDeployment";
        stateName = "core:DeploymentState";
    } else if (attribute === "orientation") {
        commandName = "setOrientation";
        stateName = "core:SlateOrientationState";
    } else if (attribute === "temperature") {
        commandName = "setDerogation";
        stateName = "core:TargetTemperatureState";
    } else if (attribute === "onoff") {
        commandName = "setOnOff";
        stateName = "core:OnOffState";
    } else if (attribute === "intensity") {
        commandName = "setIntensity";
        stateName = "core:LightIntensityState";
    }

    controller.context.getState(id.substr(0, id.indexOf(".states.")) + ".deviceURL", function (err, state) {
        if (!err && state) {
            const deviceURL = state.val;
            const stateValue = value;
            const roomName = id.substr(id.indexOf(".devices.") + 9);

            let params;

            if (commandName === "setDerogation")
                params = [controller.mapValueioBroker2Tahoma(stateName, stateValue), "further_notice"];
            else
                params = [controller.mapValueioBroker2Tahoma(stateName, stateValue)];

            if (slow && slow === true)
                params.push("lowspeed");

            const action = {
                "label": roomName + " - " + (attribute === "orientation" ? "Ausrichtung" : "Positioniere") + " auf " + stateValue + " % - ioBroker",
                "deviceURL": deviceURL,
                "commands": [{
                    "name": commandName,
                    "parameters": params
                }]
            };

            if (controller.applyTimer)
                clearTimeout(controller.applyTimer);

            controller.applyQueue.push(action);
            controller.applyTimer = setTimeout(function () {
                controller.applyTimer = null;
                controller.processApplyQueue();
            }, 500);
        }
    });
};

Tahoma.prototype.listHasDevice = function (device, list) {

};

Tahoma.prototype.processApplyQueue = function (secondtry) {
    controller.context.log.debug("ApplyQueue len: " + controller.applyQueue.length);
    if (controller.applyQueue.length < 1) {
        controller.applyProcessing = false;
        controller.context.log.debug("ApplyQueue processing completed.");
        return;
    } else if (controller.applyProcessing && !secondtry) {
        controller.context.log.debug("Skipping, ApplyQueue already processing.");
        return;
    }

    controller.applyProcessing = true;

    for (let e = 0; e < controller.applyQueue.length; e++) {
        const el = controller.applyQueue[e];

        if (el.deviceURL in controller.deviceExecIds) {
            controller.deleteExecution(controller.deviceExecIds[el.deviceURL], function () {
                const toDelete = [];
                for (const k in controller.deviceExecIds) {
                    if (controller.deviceExecIds[k] === controller.deviceExecIds[el.deviceURL])
                        toDelete.push(k);
                }
                for (let i = 0; i < toDelete.length; i++)
                    delete controller.deviceExecIds[toDelete[i]];

                controller.applyProcessing = false;
                controller.processApplyQueue();
            });
            return;
        }
    }

    const payload = {
        "label": "",
        "actions": []
    };

    const backupQueue = [];
    let elem;
    while (controller.applyQueue.length > 0) {
        elem = controller.applyQueue.shift();

        if (payload.label === "")
            payload.label = elem.label;

        backupQueue.push(elem);

        // remove all previous possibly inserted actions for this deviceURL
        const newArr = [];
        for (let i = 0; i < payload.actions.length; i++) {
            if (payload.actions[i].deviceURL !== elem.deviceURL)
                newArr.push(payload.actions[i]);
        }
        payload.actions = newArr;

        payload.actions.push({
            "deviceURL": elem.deviceURL,
            "commands": elem.commands
        });
    }

    if (payload.actions.length < 1) {
        controller.context.log.warn("Empty ApplyQueue - this should never happen.");
        return;
    } else if (payload.actions.length > 1)
        payload.label += " and " + (payload.actions.length - 1) + " more";

    controller.sendPOST("exec/apply", payload, function (err, data) {
        if (err && data && data.responseStatusCode && (data.responseStatusCode === 400 || data.responseStatusCode === 503)) {
            // sometimes a request is not accepted, so we try it again if we did not already
            if (!secondtry) {
                for (let i = backupQueue.length - 1; i >= 0; i--)
                    controller.applyQueue.unshift(backupQueue[i]);

                controller.reapplyTimeout = setTimeout(function () {
                    controller.reapplyTimeout = null;
                    // not setting applyProcessing to false as we do not want it to be processed before the timeout
                    controller.processApplyQueue(true);
                }, controller.applyOptions.delayRetry);
                return;
            }
        } else if (err || !data) {
            // nothing to do here currently
            return;
        } else {
            if (data.execId)
                controller.updateEventState({ "execId": data.execId, "newState": "IN_PROGRESS", "issuer": "onClosureStateChange" });
        }

        // just in case there as been a race-condition in adding queue elements
        controller.applyProcessing = false;
        controller.processApplyQueue();
    }, controller.use_local_api);
};

Tahoma.prototype.deleteExecution = function (execId, callback) {
    controller.sendDELETE("exec/current/setup/" + execId, {}, function (err, data) {
        callback && callback(err, data);
    }, controller.use_local_api);
};

Tahoma.prototype.onDeploymentStateChange = function (id, value) {
    return controller.onApplyChange("deployment", id, value);
};

Tahoma.prototype.onClosureStateChange = function (id, value, slow) {
    return controller.onApplyChange("closure", id, value, slow);
};

Tahoma.prototype.onSetOrientation = function (id, value) {
    return controller.onApplyChange("orientation", id, value);
};

Tahoma.prototype.onTemperatureStateChange = function (id, value) {
    return controller.onApplyChange("temperature", id, value);
};

Tahoma.prototype.onOnOffStateChange = function (id, value) {
    return controller.onApplyChange("onoff", id, value);
};

Tahoma.prototype.onIntensityStateChange = function (id, value) {
    return controller.onApplyChange("intensity", id, value);
};

Tahoma.prototype.onExecuteCommand = function (id) {
    controller.context.getState(id.substr(0, id.indexOf(".commands.")) + ".oid", function (err, state) {
        if (!err && state) {
            const oid = state.val;
            controller.context.log.info(controller.url + "exec/" + oid);

            controller.sendPOST("exec/" + oid, "", function (err, data) {
                if (err)
                    controller.context.log.warn(controller.url + "exec/" + oid);
            }, controller.use_local_api);
        }
    });
};

Tahoma.prototype.onExecuteDeviceCommand = function (id, slow) {
    const commandName = id.substr(id.lastIndexOf(".") + 1);
    controller.context.log.debug("button pressed: " + id);

    controller.context.getState(id.substr(0, id.indexOf(".commands.")) + ".deviceURL", function (err, state) {
        if (!err && state) {
            const deviceURL = state.val;
            let params = [];
            if (slow === true)
                params = ["lowspeed"];

            const action = {
                "label": "command " + commandName + " from ioBroker",
                "deviceURL": deviceURL,
                "commands": [{
                    "name": commandName,
                    "parameters": params
                }]
            };

            if (controller.applyTimer)
                clearTimeout(controller.applyTimer);

            controller.applyQueue.push(action);
            controller.applyTimer = setTimeout(function () {
                controller.applyTimer = null;
                controller.processApplyQueue();
            }, 500);
        }
    });
};

module.exports = {
    "Tahoma": Tahoma
};

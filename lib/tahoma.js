const request = require('request');
const API_URL = 'https://www.tahomalink.com/enduser-mobile-web/enduserAPI/';

let controller;

function Tahoma(username, password, context) {
	controller = this;

	controller.username = username;
	controller.password = password;
	controller.context = context;

	controller.lastEventTime = new Date().getTime();

	controller.rawDeviceData = false;
	controller.tahomaJar = request.jar();

	controller.baseRequest = request.defaults({
		headers: {
			//'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36'
			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:73.0) Gecko/20100101 Firefox/73.0'
		},
		jar: controller.tahomaJar
	});

	controller.tahomaDevices = {};
	controller.tahomaActionGroups = {};
	controller.Map_DeviceURL2StateName = {};

	controller.isConnectedInternal = false;
	controller.loginInProgress = false;

	controller.gatewayList = [];
	controller.gatewayTimer = null;

	controller.eventRegisterID = '-1';
	controller.loginErrors = 0;
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
}

Tahoma.prototype.unload = function(callback) {
	if(controller.loginErrorTimeout) {
		clearTimeout(controller.loginErrorTimeout);
	}
	if(controller.applyTimer) {
		clearTimeout(controller.applyTimer);
	}
	if(controller.retryTimeout) {
		clearTimeout(controller.retryTimeout);
	}
	if(controller.loginTimeout) {
		clearTimeout(controller.loginTimeout);
	}
	if(controller.reapplyTimeout) {
		clearTimeout(controller.reapplyTimeout);
	}
	if(controller.gatewayTimer) {
		clearTimeout(controller.gatewayTimer);
	}
	callback();
};

Tahoma.prototype.isConnected = function() {
    return controller.isConnectedInternal;
};

Tahoma.prototype.setConnected = function(connected) {
    controller.isConnectedInternal = connected;

    controller.context.setState('info.connection', true, true);
};

Tahoma.prototype.getCreateStateOptions4Widget = function(widget) {

	switch(widget) {
		case 'PositionableHorizontalAwning':
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
			break;

		case 'UpDownHorizontalAwning':
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
			break;

		case 'UpDownCurtain':
		case 'UpDownDualCurtain':
		case 'UpDownExteriorScreen':
		case 'UpDownExteriorVenetianBlind':
		case 'UpDownRollerShutter':
		case 'UpDownScreen':
		case 'UpDownVenetianBlind':
		case 'UpDownSwingingShutter':
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
			break;

		case 'BioclimaticPergola':
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
			break;

		case 'PositionableRollerShutterWithLowSpeedManagement':
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
			break;

		case 'PositionableScreen':
		case 'PositionableScreenUno':
		case 'PositionableHorizontalAwningUno':
		case 'PositionableRollerShutter':
		case 'PositionableTiltedRollerShutter':
		case 'PositionableRollerShutterUno':
		case 'PositionableTiltedScreen':
		case 'PositionableTiltedWindow':
		case 'PositionableGarageDoor':
		case 'DiscretePositionableGarageDoor':
		case 'AwningValance':
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
			break;

		case 'LuminanceSensor':
			return {
				"role": "sensor"
			};
			break;

		default:
			return {
				role: "state"
			};
	}

};

Tahoma.prototype.getCreateStateOptions4State = function(widget, stateName) {
    if(stateName === "core:ClosureState" || stateName === "core:TargetClosureState" || stateName === "core:DeploymentState" || stateName === "core:TargetDeploymentState") {
        return {
			"type":  "number",               // optional,  default "number"
			"read":  true,                   // mandatory, default true
			"write": true,                   // mandatory, default true
			"min":   0,                      // optional,  default 0
			"max":   100,                    // optional,  default 100
			"unit":  "%",                    // optional,  default %
			"role":  "level.blind"           // mandatory
	   };
    } else if(stateName === "core:SlateOrientationState") {
        return {
			"type":  "number",               // optional,  default "number"
			"read":  true,                   // mandatory, default true
			"write": true,                   // mandatory, default true
			"min":   0,                      // optional,  default 0
			"max":   100,                    // optional,  default 100
			"unit":  "%",                    // optional,  default %
			"role":  "level.blind.orientation"           // mandatory
	   };
    } else if (stateName === "core:LuminanceState") {
        return {
			"type":  "number",               // optional,  default "number"
			"read":  true,                   // mandatory, default true
			"write": false,                   // mandatory, default true
			"min":   0,                      // optional,  default 0
			"max":   100000,                    // optional,  default 100
			"unit":  "Lux",                    // optional,  default %
			"role":  "level.color.luminance"           // mandatory
	   };
    /*} else if (stateName === "core:Memorized1PositionState") {
        return {
			"type":  "number",               // optional,  default "number"
			"read":  true,                   // mandatory, default true
			"write": true,                   // mandatory, default true
			"min":   0,                      // optional,  default 0
			"max":   100,                    // optional,  default 100
			"unit":  "%",                    // optional,  default %
			"role":  "level.blind"           // mandatory
	   };*/
    } else {
		return {
			read: true,
			write: false,
			role: "state"
		};
	}
};


Tahoma.prototype.sendPOST = function(requestPath, payload, callback) {
	controller.login(function(err,data) {
        if(err) {
            return callback(err, data);
        }

        controller.sendInternalPOST(requestPath, payload, callback);
    });
};

Tahoma.prototype.sendGET = function(requestPath, payload, callback) {
    controller.login(function(err,data) {
        if(err) {
            return callback(err, data);
        }

        controller.sendInternalGET(requestPath, payload, callback);
    });
};

Tahoma.prototype.sendDELETE = function(requestPath, payload, callback) {
    controller.login(function(err,data) {
        if(err) {
            return callback(err, data);
        }

        controller.sendInternalDELETE(requestPath, payload, callback);
    });
};

Tahoma.prototype.sendInternalRequest = function(method, requestPath, payload, callback) {
	let url = API_URL + requestPath;
    if(requestPath.endsWith("apply") && payload && payload.actions && payload.actions.length === 1) { // only on POST
		// do not abuse high Priority! It will result in err 400 on too many requests
		url = API_URL + requestPath + "/highPriority";
    }

	let formPayload = null;
    let jsonPayload = null;

	if (requestPath === 'login') { // only on POST
        formPayload = payload;
    } else {
        jsonPayload = payload;
    }

	if(requestPath === 'login') {
		controller.context.log.debug(method + " request on " + url + " with payload: +++redacted+++");
	} else {
		controller.context.log.debug(method + " request on " + url + " with payload:" + JSON.stringify(payload));
	}

	let reqFunc;
	let sendFunc;
	if(method === 'POST') {
		reqFunc = controller.baseRequest.post;
		sendFunc = controller.sendPOST;
	} else if(method === 'GET') {
		reqFunc = controller.baseRequest.get;
		sendFunc = controller.sendGET;
	} else if(method === 'DELETE') {
		reqFunc = controller.baseRequest.delete;
		sendFunc = controller.sendDELETE;
	} else {
		controller.context.log.warn('Invalid method for request: ' + method);
		callback && callback(true, {});
		return;
	}

    reqFunc({
		url:    url,
		json:   jsonPayload,
		form:   formPayload
	}, function(error, response, body) {
		if(!error && response && (response.statusCode === 200 || response.statusCode === 204)) {
			controller.failedRequests = 0;
			if (requestPath === 'login') {// only on POST
				callback(false, JSON.parse(body));
			} else {
				callback(false, body);
			}
		} else if(response && requestPath !== 'logout' && (response.statusCode === 401 || response.statusCode === 403)) {
			controller.context.log.warn("error during tahomalink request: " + response.statusText + " ->" + response.statusCode + " retry "  + requestPath);

			// session expired?
			controller.setConnected(false);
			controller.loginInProgress = false;

			if(controller.loginErrorTimeout) {
				clearTimeout(controller.loginErrorTimeout);
			}
			if(controller.loginErrors > 3) {
				// sleep for two minutes
				controller.context.log.info('Login failed three times, waiting 2 minutes before retrying.');
				if(controller.retryTimeout) {
					//clearTimeout(controller.retryTimeout);
				}
				if(controller.loginTimeout) {
					clearTimeout(controller.loginTimeout);
				}
				if(controller.retryTimeout) {
					controller.context.log.info('Timeout still active.');
				}else{
					controller.retryTimeout = setTimeout(function() {
						controller.context.log.info('Executing Timeout (retry login).');
						controller.retryTimeout = null;
						sendFunc(requestPath, payload, callback);						
					}, 120000);
				}
			} else {
				controller.loginErrors++;
				controller.loginErrorTimeout = setTimeout(function() {
					controller.loginErrorTimeout = null;
					controller.loginErrors = 0;
				}, 60000);
				// perform login and send again
				sendFunc(requestPath, payload, callback);
			}
		} else if(response && (response.statusCode === 400 || response.statusCore === 503)) {
			controller.failedRequests++;
			if(controller.failedRequests > 5 || (body && body.errorCode && body.errorCode === 'UNSPECIFIED_ERROR')) {
				let delay;
				if(response.statusCode === 503) {
					// down for maintenance
					delay = 30000;
				} else {
					// problem with request
					delay = 10000;
				}

				if(controller.retryTimeout) {
					clearTimeout(controller.retryTimeout);
				}
				controller.retryLocked = true;

				controller.context.log.warn('Waiting ' + (delay/1000) + ' until re-login because of too many errors.');
				controller.retryTimeout = setTimeout(function() {
					controller.retryTimeout = null;
					controller.logout(function(err) {
						controller.retryLocked = false;
						callback(true, response);
					});
				}, delay);
			} else {
				callback(true, result);
			}
		} else {
			if(requestPath === 'login') {
				controller.context.log.warn("error during tahomalink request: " + error + ", request path: " + requestPath + " with payload: +++redacted+++");
			} else {
				controller.context.log.warn("error during tahomalink request: " + error + ", request path: " + requestPath + " with payload:" + JSON.stringify(payload));
			}
			if(response) {
				controller.context.log.warn("Response: " + JSON.stringify(response));
			}
			if(body) {
				controller.context.log.warn("Body: " + JSON.stringify(body));
			}

			var result = {};
			result.error = error;

			if(typeof response !== "undefined") {
				controller.context.log.debug("response status: " + response.statusCode + " " + response.statusText);

				result.responseStatusCode = response.statusCode;
				result.responseStatusText = response.statusText;
			}

			callback(true, result);
		}
	});
};

Tahoma.prototype.sendInternalGET = function(requestPath, payload, callback) {
    return controller.sendInternalRequest('GET', requestPath, payload, callback);
};

Tahoma.prototype.sendInternalPOST = function(requestPath, payload, callback) {
	return controller.sendInternalRequest('POST', requestPath, payload, callback);
};

Tahoma.prototype.sendInternalDELETE = function(requestPath, payload, callback) {
	return controller.sendInternalRequest('DELETE', requestPath, payload, callback);
};

Tahoma.prototype.logout = function(callback)
{
    var performLogout = controller.isConnected();
    controller.setConnected(false);

	if(controller.applyTimer) {
		controller.applyProcessing = true; // avoid executing mistakenly
		clearTimeout(controller.applyTimer);
		controller.applyTimer = null;
	}

	controller.eventRegisterID = '-1';

    if(performLogout) {
        controller.sendInternalPOST("logout", {}, function (err, data) {
            callback(err, data);
        });
    } else {
        callback(false, {});
    }

	return true;
};

Tahoma.prototype.login = function(callback) {
    if(controller.isConnected()) {
         callback(false, {});
         return;
    }

    // check for login already started but not yet finished
    if(controller.loginInProgress) {
        controller.loginTimeout = setTimeout(function() {
			controller.loginTimeout = null;
            controller.login(callback);
        }, 1500);
        return;
    }

    controller.loginInProgress = true;

    var payload = {
		'userId': controller.username,
		'userPassword': controller.password
	};

    controller.sendInternalPOST("login", payload, function (err, data) {
        if(err || !data.success) {
            controller.loginInProgress = false;
            return callback(true, data);
        }

        controller.lastEventTime = new Date().getTime();
        controller.setConnected(true);
        controller.loginInProgress = false;

        controller.getUserInfo(function (err,data) {
            if (!err) {
				controller.gatewayTimer = setTimeout(function() {
					controller.updateGateWays();
				}, 10000);
                return controller.getSetup(callback);
            }

            callback(err, data);
        });
    });
};

Tahoma.prototype.getUserInfo = function(callback) {
    controller.sendGET('enduser/mainAccount', {},function (err, data) {
        if (!err) {
            controller.updateData('userdata', data.endUser);

            callback(false, data);
        } else {
            controller.context.log.warn("enduser/mainAccount failed!");
        }

    });
};

Tahoma.prototype.updateGateWayData = function(gateways) {
    controller.gatewayList = [];
	for(var i in gateways) {
        var gateway = gateways[i];
		if(gateway.gatewayId) {
			controller.gatewayList.push(gateway.gatewayId);
	        controller.updateData(gateway.gatewayId, gateway);
		}
    }
};

Tahoma.prototype.updateDevices = function(devices) {
    controller.tahomaDevices = devices;

    for(var i in devices) {
        var device = devices[i];

        // just set the raw data from tahoma
        device.label = device.label.replace(/\./g, '_');
        device.label = device.label.replace(/__/g, '_');
        controller.updateDevice('devices.' + device.label, device);
    }
};

Tahoma.prototype.updateDevice = function(name, deviceData) {
	let features = controller.getCreateStateOptions4Widget(deviceData.widget);

	let objset = {
		role: features.role,
		read: true,
		write: false
	};

    controller.createOrUpdateState(name, '', objset);

    // device URL
    controller.createOrUpdateState(name + '.deviceURL', deviceData.deviceURL);

    // states
    for(var stateKey in deviceData.states) {
        var state = deviceData.states[stateKey];

        controller.createOrUpdateState(name + '.states.' + state.name, controller.mapValueTahoma2ioBroker(state.name, state.value), controller.getCreateStateOptions4State(deviceData.widget, state.name));

		if(features.features && features.features.slow && features.features.slow === true) {
			let validStates = [
				"core:ClosureState",
				"core:TargetClosureState"
			];
			if(validStates.includes(state.name)) {
				controller.existingSlowStates[name + '.states.' + state.name] = true;
				controller.createOrUpdateState(name + '.states.' + state.name + ':slow', controller.mapValueTahoma2ioBroker(state.name, state.value), controller.getCreateStateOptions4State(deviceData.widget, state.name));
			}
		}
    }

     // commands
    for(var commandKey in deviceData.definition.commands) {
        var command = deviceData.definition.commands[commandKey];

        if(command.nparams === 0) {
            controller.createOrUpdateState(name + '.commands.' + command.commandName, false, {
				type: "boolean",
                read: true,
                write: true,
                role: "button"
            });

			if(features.features && features.features.slow && features.features.slow === true) {
				let validCommands = [
					"up",
					"open",
					"down",
					"close"
				];
				if(validCommands.includes(command.commandName)) {
					controller.existingSlowStates[name + '.commands.' + command.commandName] = true;
					controller.createOrUpdateState(name + '.commands.' + command.commandName + ':slow', false, {
						type: "boolean",
						read: true,
						write: true,
						role: "button"
					});
				}
			}
        }
    }

    // raw data
    if(controller.rawDeviceData) {
        for(var p in deviceData) {
            var value = deviceData[p];

            if (typeof(value) === 'object') {
                controller.updateData('raw.' + name + '.' + p, value);
            } else {
                controller.createOrUpdateState('raw.' + name + '.' + p, value);
            }
        }
    }
};

Tahoma.prototype.updateActionGroups = function(actionGroups) {
    controller.tahomaActionGroups = actionGroups;

    for(var i in actionGroups) {
        var actionGroup = actionGroups[i];

        // just set the raw data from tahoma
        controller.updateActionGroup('actionGroups.' + actionGroup.label, actionGroup);
    }
};

Tahoma.prototype.updateActionGroup = function(actionGroup, actionGroupData) {
    // Action Group OID
    controller.createOrUpdateState(actionGroup + '.oid', actionGroupData.oid);

    controller.createOrUpdateState(actionGroup + '.commands.' + 'execute', false, {
		type: "boolean",
        read: true,
        write: true,
        role: "button"
    });
};

Tahoma.prototype.mapValueTahoma2ioBroker = function(stateName, stateValue) {
    if(stateName === 'core:ClosureState' ||
		stateName === 'core:TargetClosureState' ||
        stateName === 'core:DeploymentState' ||
        stateName === 'core:TargetDeploymentState' ||
        stateName === "core:SlateOrientationState" ||
        stateName === "core:LuminanceState"	) {
        stateValue = parseInt(stateValue,10);
    }

    return stateValue;
};

Tahoma.prototype.mapValueioBroker2Tahoma = function(stateName, stateValue) {
    if(stateName === 'core:ClosureState' || stateName === 'core:TargetClosureState' || stateName === 'core:DeploymentState' || stateName === 'core:TargetDeploymentState') {
        //stateValue = parseInt(stateValue,10);
    }

    return stateValue;
};

Tahoma.prototype.updateData = function(type, data) {
    for (var p in data) {
        var value = data[p];

        if (typeof(value) === 'object') {
            controller.updateData(type + '.' + p, value);
        } else {
            controller.createOrUpdateState(type + '.' + p, value);
        }
    }
};

Tahoma.prototype.createOrUpdateState = function(key, value, options) {
	//controller.context.log.debug('createOrUpdateState: ' + key + ' => ' + value);
    let stateName = key.substr(key.lastIndexOf('.') + 1);

	key = key.replace(/ /g , '_');
    var typeName = "string";

    if(value === "true" || value === "false" || value === true || value === false) {
        value = (value === "true" || value === true);
        typeName = "boolean";
    } else if(Number.isInteger(value)) {
        value = parseInt(value, 10);
        typeName = "number";
    } else if(!isNaN(value)) {
        value = Number(value);
        typeName="number";
    }

    controller.context.getObject(key, function(err, obj) {
		if(err || !obj) {
			if(typeof(options) === 'undefined') {
				options = {
					read: true,
					write: false,
					type: typeName
				};
			}
			if(!options['name']) {
				options['name'] = stateName;
			}
			if(!options['role']) {
				options['role'] = 'state';
			}
			if(!options['type']) {
				options['type'] = typeName;
			}
			//controller.context.log.debug('createState ' + key + ' => ' + value);
			// create state
			controller.context.setObject(key, {
				type: 'state',
				common: options,
				native: {}
			}, function() {
				controller.ackStateValues[key] = value;
				controller.context.setState(key, value, true);
			});
		} else {
			controller.context.log.debug('setState ' + key + ' => ' + value);
			controller.ackStateValues[key] = value;
			controller.context.setState(key, value, true);
		}

	});
};

Tahoma.prototype.updateGateWays = function(nextEntry) {
	controller.gatewayTimer = null;

	if(!nextEntry) {
		nextEntry = 0;
	} else if(nextEntry >= controller.gatewayList.length) {
		controller.gatewayTimer = setTimeout(function() {
			controller.updateGateWays();
		}, 30000);
		return;
	}
	controller.context.log.debug('Update gateway status for id ' + controller.gatewayList[nextEntry]);
	controller.sendGET('setup/gateways/' + controller.gatewayList[nextEntry], {}, function(err, data) {
		if(!err && data) {
			controller.updateGateWayData([data]);
			controller.context.log.debug('Updated gateway status for id ' + controller.gatewayList[nextEntry]);
		}
		controller.updateGateWays(nextEntry + 1);
	});
};

Tahoma.prototype.getSetup = function(callback) {
    controller.sendGET('setup', {}, function(err, data) {
        if(!err) {
            controller.updateGateWayData(data.gateways);
            controller.updateData('location', data.location);
            controller.updateDevices(data.devices);

            // delete old devices
            controller.deleteOldDevices();

			let toProcess = 0;
            // update mapping table device URL to state key with label
			controller.context.getAdapterObjects(function(res) {
				const objKeys = Object.keys(res);
				const search = new RegExp('^' + controller.context.namespace + '\.devices\..+\.deviceURL$');
				for(let i = 0; i < objKeys.length; i++) {
					let objid = objKeys[i];
					if(objid.match(search)) {
						toProcess++;
						controller.context.getState(objid, function(err, state) {
							if(!err && state) {
								controller.Map_DeviceURL2StateName[state.val] = objid.substr(0, objid.indexOf(".deviceURL"));
							}
							toProcess--;
							if(toProcess < 1) {
								// now we should be able to refresh (devices known)
								controller.refresh(callback);
							}
						});
					} else if(i === objKeys.length - 1 && toProcess < 1) {
						// now we should be able to refresh (devices known)
						controller.refresh(callback);
					}
				}
            });

        } else {
			controller.context.log.warn("setup failed!");
            callback(err, {});
        }
    });

    controller.sendGET('actionGroups', {}, function (err, data) {
        if(!err) {
            controller.updateActionGroups(data);
        } else {
            controller.context.log.warn("actionGroups failed!");
            //callback(err, {});
        }
    });
};

Tahoma.prototype.refresh = function(callback) { // controller.one is overridden below?!
    controller.sendPOST('/setup/devices/states/refresh', {}, function (err, data) {
		if(err) {
			controller.context.log.warn("refresh device state failed");
		}
		callback && callback(err, {});
	});
};

Tahoma.prototype.getAllStates = function(callback) {
	if(controller.retryLocked) {
		return;
	}
    controller.login(function (err, data) {
        if (err) {
            return;
        }

		if(controller.eventRegisterID === '-1'){
			controller.sendPOST("events/register", {}, function(err,data) {
				if(err) {
					controller.context.log.warn("events/register failed");
					return;
				}

				controller.eventRegisterID = data.id;
				controller.context.log.info("eventRegisterID = " + controller.eventRegisterID);

				controller.fetchEvents(callback);
			});
		} else {
			controller.fetchEvents(callback);
		}
	});
};

Tahoma.prototype.fetchEvents = function(callback) {
	let curTime = (new Date()).getTime();
	if(controller.lastRefresh < curTime - (5 * 60 * 1000)) {
		controller.context.log.debug('Refreshing device states.');
		controller.lastRefresh = curTime;
		controller.refresh(function() {
			controller.fetchEvents(callback);
		});
		return;
	};

    controller.sendPOST("events/" + controller.eventRegisterID + "/fetch", {}, function (err,data) {
        if (err) {
            return;
        }

        controller.context.log.debug("events/" + controller.eventRegisterID + "/fetch" + "Fetched Data " + JSON.stringify(data));
        controller.updateDeviceStateFromEvent(data);
		if(callback) {
			callback();
		}
    });
};

Tahoma.prototype.updateDeviceStateFromEvent = function(events) {
    for(var i in events) {
        controller.lastEventTime = new Date().getTime();
        var event = events[i];

        if (event.name === 'DeviceStateChangedEvent') {
            controller.updateDeviceState(event);
        } else if(event.name === 'ExecutionStateChangedEvent') {
			controller.updateEventState(event);
		}
    }
};

Tahoma.prototype.updateEventState = function(event) {
	controller.context.log.debug('Event: ' + JSON.stringify(event));
	let execId = event.execId;

	let currentState = event.newState;

	if(currentState !== 'IN_PROGRESS' && currentState !== 'COMPLETED') {
		return;
	}

	let url = 'exec/current/';
	if(currentState === 'COMPLETED' || currentState === 'FAILED') {
		url = 'history/executions/';
	}
	url += execId + '?_=' + (new Date()).getTime();

	controller.sendGET(url, {}, function(err, data) {
		if(err) {
			controller.context.log.warn('Failed getting execution state for ' + execId);
			return;
		} else if(!data || (!data.execution && !data.state)) {
			return;
		}

		controller.context.log.debug(url + " - Fetched Data " + JSON.stringify(data));

		let actions;
		if(data.execution) {
			// unify contents
			data = data.execution;
			actions = data.commands;
		} else {
			if(data.actionGroup) {
				actions = data.actionGroup.actions;
			} else if(data.commands) {
				actions = data.commands;
			}
		}
		let execState = data.state;

		let action;
		for(let i = 0; i < actions.length; i++) {
			action = actions[i];
			if(action.commands) {
				let cmd = action.commands[0];
				action.type = cmd.type;
				action.name = cmd.name;
				action.parameters = cmd.parameters;
			}
			controller.updateDeviceActionState(action, execId);
		}

		/*
		[{"type":1,"name":"open","parameters":[]}]


		exec:
			[{"deviceURL":"io://1223-9503-4050/11106291","command":"open","parameters":[],"rank":0,"dynamic":false,"state":"COMPLETED","failureType":"NO_FAILURE"}]
		*/
	});
};

Tahoma.prototype.updateDeviceActionState = function(event, execId) {
	let deviceURL = event.deviceURL;

	if(!deviceURL) {
		controller.context.log.info('No deviceURL in event: ' + JSON.stringify(event));
		return;
	}

    let devicePath = controller.Map_DeviceURL2StateName[deviceURL];
	if(!devicePath) {
		controller.context.log.warn('Got action event for invalid device: ' + JSON.stringify(event));
		return;;
	}

	controller.context.log.debug("got action event for device " + devicePath + ': ' + JSON.stringify(event));

	let command = (event.command ? event.command : event.name);
	let state = (event.state ? event.state : 'START');

	let targetPosition = null;
	let direction = 0;
	if(state !== 'COMPLETED' && state !== 'FAILED') {
		controller.deviceExecIds[deviceURL] = execId;

		if(command === 'up' || command === 'open' || command === 'deploy') {
			direction = 1;
		} else if(command === 'down' || command === 'close' || command === 'undeploy') {
			direction = 2;
		} else if(command === 'setClosure' || command === 'setDeployment' || command === 'setClosureAndLinearSpeed') {
			if(event.parameters && event.parameters.length > 0) {
				targetPosition = event.parameters[0];
			}
		} else {
			return;
		}
	} else {
		if(controller.deviceExecIds[devicePath]) {
			delete controller.deviceExecIds[deviceURL];
		}
	}

	if(targetPosition === null) {
		controller.setDeviceMoving(devicePath, direction);
		return;
	}

	let currentPos = null;

	let basePath = devicePath;
	if(basePath.indexOf(controller.context.namespace) === 0) {
		basePath = basePath.substr(controller.context.namespace.length + 1);
	}
	let key = basePath + '.states.core:ClosureState';
	if(undefined !== controller.ackStateValues[key]) {
		currentPos = controller.ackStateValues[key];
	} else {
		controller.context.log.debug(key + ' not found in ackStateValues. Values are: ' + JSON.stringify(controller.ackStateValues));
		key = basePath + '.states.core:DeploymentState';
		if(undefined !== controller.ackStateValues[key]) {
			currentPos = controller.ackStateValues[key];
		} else {
			key = basePath + '.states.core:OpenCloseState';
			if(undefined !== controller.ackStateValues[key]) {
				let openClosed = controller.ackStateValues[key];
				direction = 3;
				if(openClosed === "open") {
					if(targetPosition > 0) {
						direction = 1;
					}
				} else if(openClosed === "close") {
					if(targetPosition < 100) {
						direction = 2;
					}
				}

				controller.setDeviceMoving(devicePath, direction);
				return;
			}
		}
	}

	if(null !== currentPos) {
		if(targetPosition !== null) {
			if(targetPosition > currentPos) {
				direction = 2;
			} else {
				direction = 1;
			}
		} else {
			direction = 3;
		}
	} else {
		direction = 3;
	}

	controller.setDeviceMoving(devicePath, direction);
};

Tahoma.prototype.setDeviceMoving = function(devicePath, direction) {
	if(!devicePath) {
		controller.context.log.warn('Could not set moving state because devicePath is missing.');
		return;
	}

	// update state
	controller.createOrUpdateState(devicePath + '.states.moving', direction, {
		type: "number",
        read: true,
        write: false,
        role: "value.direction",
		states: {
			'0': 'stopped',
			'1': 'up/undeploy',
			'2': 'down/deploy',
			'3': 'moving (unknown direction)'
		}
    });
};

Tahoma.prototype.updateDeviceState = function(event) {
	controller.context.log.debug('Event: ' + JSON.stringify(event));
    var deviceURL = event.deviceURL;
    var states = event.deviceStates;

	if(!deviceURL) {
		deviceURL = '';
	}
    var devicePath = controller.Map_DeviceURL2StateName[deviceURL];
	if(!devicePath) {
		devicePath = '';
	}
	controller.context.log.debug("got event for device " + devicePath + '(' + deviceURL + ')');
	if(!devicePath) {
		return;
	}

    for(var i in states) {
        var state = states[i];
        var name = state.name;
        var value = controller.mapValueTahoma2ioBroker(name, state.value);

        controller.context.log.debug("found " + devicePath + '.states.' + name + " -> " + value);

		if(devicePath.indexOf(controller.context.namespace) === 0) {
			devicePath = devicePath.substr(controller.context.namespace.length + 1);
		}
		let key = devicePath + '.states.' + name;

		controller.ackStateValues[key] = value;
        controller.context.setState(key, value, true);
		if('undefined' !== typeof controller.existingSlowStates[key]) {
			controller.context.setState(key + ':slow', value, true);
		}
    }
};

Tahoma.prototype.deleteOldDevices = function() {
    var currentTime = new Date().getTime();

	controller.context.getAdapterObjects(function(res) {
		const objKeys = Object.keys(res);
		const search = new RegExp('^' + controller.context.namespace + '\.devices\..+\.lastUpdateTime$');
		let delObjects = [];

		for(let i = 0; i < objKeys.length; i++) {
			let objid = objKeys[i];
			if(objid.match(search)) {
				controller.context.getState(objid, function(err, state) {
					if(!err && state) {
						let device = objid.substr(0, objid.indexOf('.lastUpdateTime'));
						if(currentTime - state.ts > 5 * 60 * 1000) {
							controller.context.log.debug("found old " + device + " -> " + new Date(state.ts));
							delObjects.push(device);
						}
					}
				});
			}
		}

		for(let i = 0; i < objKeys.length; i++) {
			let objid = objKeys[i];
			for(let d = 0; d < delObjects; d++) {
				if(objid.indexOf(delObjects[d]) === 0) {
					controller.context.log.debug("delete state:" + objid, 'debug');
					controller.context.deleteState(objid);
				}
			}
		}
    });
};

Tahoma.prototype.onApplyChange = function(attribute, id, value, slow) {
	if(!attribute) {
		attribute = 'closure';
	}

	let commandName;
	let stateName;

	if(attribute === 'closure') {
		commandName = "setClosure";
		if(slow && slow === true) {
			commandName = "setClosureAndLinearSpeed";
		}
		stateName = "core:ClosureState";
	} else if(attribute === 'deployment') {
		commandName = "setDeployment";
		stateName = "core:DeploymentState";
	} else if(attribute === 'orientation') {
		commandName = "setOrientation";
		stateName = "core:SlateOrientationState";
	}

	controller.context.getState(id.substr(0, id.indexOf(".states.")) + ".deviceURL", function(err, state) {
		if(!err && state) {
			let deviceURL = state.val;
			var stateValue = value;
			var roomName = id.substr(id.indexOf('.devices.') + 9);

			let params = [
				controller.mapValueioBroker2Tahoma(stateName, stateValue)
			];
			if(slow && slow === true) {
				params.push('lowspeed');
			}
			var action = {
				'label': roomName + ' - ' + (attribute === 'orientation' ? 'Ausrichtung' : 'Positioniere') + ' auf ' + stateValue + ' % - ioBroker',
				'deviceURL': deviceURL,
				'commands': [{
					'name': commandName,
					'parameters': params
				}]
			};

			if(controller.applyTimer) {
				clearTimeout(controller.applyTimer);
			}
			controller.applyQueue.push(action);
			controller.applyTimer = setTimeout(function() {
				controller.applyTimer = null;
				controller.processApplyQueue();
			}, 500);
		}
	});
};

Tahoma.prototype.listHasDevice = function(device, list) {

};

Tahoma.prototype.processApplyQueue = function(secondtry) {
	controller.context.log.debug('ApplyQueue len: ' + controller.applyQueue.length);
	 if(controller.applyQueue.length < 1) {
		controller.applyProcessing = false;
		controller.context.log.debug('ApplyQueue processing completed.');
		return;
	} else if(controller.applyProcessing && !secondtry) {
		controller.context.log.debug('Skipping, ApplyQueue already processing.');
		return;
	}

	controller.applyProcessing = true;

	for(let e = 0; e < controller.applyQueue.length; e++) {
		let el = controller.applyQueue[e];

		if(el.deviceURL in controller.deviceExecIds) {
			controller.deleteExecution(controller.deviceExecIds[el.deviceURL], function() {
				let toDelete = [];
				for(let k in controller.deviceExecIds) {
					if(controller.deviceExecIds[k] === controller.deviceExecIds[el.deviceURL]) {
						toDelete.push(k);
					}
				}
				for(let i = 0; i < toDelete.length; i++) {
					delete controller.deviceExecIds[toDelete[i]];
				}
				controller.applyProcessing = false;
				controller.processApplyQueue();
			});
			return;
		}
	}


	var payload = {
		'label': '',
		'actions': []
	};

	let backupQueue = [];
	let elem;
	while(controller.applyQueue.length > 0) {
		elem = controller.applyQueue.shift();

		if(payload['label'] === '') {
			payload['label'] = elem.label;
		}

		backupQueue.push(elem);

		// remove all previous possibly inserted actions for this deviceURL
		let newArr = [];
		for(let i = 0; i < payload['actions'].length; i++) {
			if(payload['actions'][i].deviceURL !== elem.deviceURL) {
				newArr.push(payload['actions'][i]);
			}
		}
		payload['actions'] = newArr;

		payload['actions'].push({
			'deviceURL': elem.deviceURL,
			'commands': elem.commands
		});
	}

	if(payload['actions'].length < 1) {
		controller.context.log.warn('Empty ApplyQueue - this should never happen.');
		return;
	} else if(payload['actions'].length > 1) {
		payload['label'] += ' and ' + (payload['actions'].length - 1) + ' more';
	}

	controller.sendPOST("exec/apply", payload, function(err, data) {
		if(err && data && data.responseStatusCode && (data.responseStatusCode == 400 || data.responseStatusCode == 503)) {
			// sometimes a request is not accepted, so we try it again if we did not already
			if(!secondtry) {
				for(let i = backupQueue.length - 1; i >= 0; i--) {
					controller.applyQueue.unshift(backupQueue[i]);
				}
				controller.reapplyTimeout = setTimeout(function() {
					controller.reapplyTimeout = null;
					// not setting applyProcessing to false as we do not want it to be processed before the timeout
					controller.processApplyQueue(true);
				}, 15000);
				return;
			}
		} else if(err || !data) {
			// nothing to do here currently
			return;
		} else {
			if(data.execId) {
				controller.updateEventState({execId: data.execId, newState: 'IN_PROGRESS', issuer: 'onClosureStateChange'});
			}
		}

		// just in case there as been a race-condition in adding queue elements
		controller.applyProcessing = false;
		controller.processApplyQueue();
	});

};

Tahoma.prototype.deleteExecution = function(execId, callback) {
	controller.sendDELETE('exec/current/setup/' + execId, {}, function(err, data) {
		callback && callback(err, data);
	});
};

Tahoma.prototype.onDeploymentStateChange = function(id, value) {
    return controller.onApplyChange('deployment', id, value);
};

Tahoma.prototype.onClosureStateChange = function(id, value, slow) {
    return controller.onApplyChange('closure', id, value, slow);
};

Tahoma.prototype.onSetOrientation = function(id, value) {
	return controller.onApplyChange('orientation', id, value);
};

Tahoma.prototype.onExecuteCommand = function(id) {
	controller.context.getState(id.substr(0, id.indexOf(".commands.")) + ".oid", function(err, state) {
		if(!err && state) {
			let oid = state.val;
			controller.context.log.info(API_URL + "exec/" + oid);

			controller.sendPOST("exec/" + oid, "", function(err, data) {
				if(err) {
					controller.context.log.warn(API_URL + "exec/" + oid);
					return;
				}
			});
		}
	});
};

Tahoma.prototype.onExecuteDeviceCommand = function(id, slow) {
	var commandName = id.substr(id.lastIndexOf(".") + 1);
	controller.context.log.debug("button pressed: " + id);

	controller.context.getState(id.substr(0, id.indexOf(".commands.")) + ".deviceURL", function(err, state) {
		if(!err && state) {
			let deviceURL = state.val;
			let params = [];
			if(slow === true) {
				params = ['lowspeed'];
			}

			var action = {
				'label': 'command ' + commandName + ' from ioBroker',
				'deviceURL': deviceURL,
				'commands': [{
					'name': commandName,
					'parameters': params
				}]
			};

			if(controller.applyTimer) {
				clearTimeout(controller.applyTimer);
			}
			controller.applyQueue.push(action);
			controller.applyTimer = setTimeout(function() {
				controller.applyTimer = null;
				controller.processApplyQueue();
			}, 500);
		}
	});
};

module.exports = {
	Tahoma: Tahoma
};

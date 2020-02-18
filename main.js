'use strict';

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const ioBLib = require('@strathcole/iob-lib').ioBLib;
const tahoma = require('./lib/tahoma');

const packageJson = require('./package.json');
const adapterName = packageJson.name.split('.').pop();
const adapterVersion = packageJson.version;

const patchVersion = '';

let adapter;
var deviceUsername;
var devicePassword;

let bigPolling;
let polling;
let pollingTime;
let controller;

function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
		name: 'tahoma'
	});

	adapter = new utils.Adapter(options);
	ioBLib.init(adapter);

	adapter.on('unload', function(callback) {
		if(polling) {
			clearTimeout(polling);
		}
		if(bigPolling) {
			clearTimeout(bigPolling);
		}
		
		controller && controller.logout(function (err, data) {
			controller.unload(function() {
				adapter.setState('info.connection', false, true);
				callback();
			});
        }) || callback();
	});

	adapter.on('stateChange', function(id, state) {
		// Warning, state can be null if it was deleted
		try {
			adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

			if(!id) {
				return;
			}
			
			if(state && id.substr(0, adapter.namespace.length + 1) !== adapter.namespace + '.') {
				//processStateChangeForeign(id, state);
				return;
			}
			id = id.substring(adapter.namespace.length + 1); // remove instance name and id
			
			if(state && state.ack) {
				return;
			}
			
			state = state.val;
			adapter.log.debug("id=" + id);
			
			if('undefined' !== typeof state && null !== state) {
				processStateChange(id, state);
			}
		} catch(e) {
			adapter.log.info("Error processing stateChange: " + e);
		}
	});
	
	adapter.on('ready', function() {
		if(!adapter.config.username) {
			adapter.log.warn('[START] Username not set');
		} else if(!adapter.config.password) {
			adapter.log.warn('[START] Password not set');
		} else {
			adapter.log.info('[START] Starting adapter ' + adapterName + ' v' + adapterVersion + '' + patchVersion);
			adapter.getForeignObject('system.config', (err, obj) => {
				if (obj && obj.native && obj.native.secret) {
					//noinspection JSUnresolvedVariable
					adapter.config.password = ioBLib.decrypt(obj.native.secret, adapter.config.password);
				} else {
					//noinspection JSUnresolvedVariable
					adapter.config.password = ioBLib.decrypt('Zgfr56gFe87jJOM', adapter.config.password);
				}
				
				main();
			});
		}
	});

	return adapter;
}


function main() {
	deviceUsername = adapter.config.username;
	devicePassword = adapter.config.password;

	pollingTime = adapter.config.pollinterval || 10000;
	if(pollingTime < 5000) {
		pollingTime = 5000;
	}
	
	adapter.log.info('[INFO] Configured polling interval: ' + pollingTime);
	adapter.log.debug('[START] Started Adapter');

	adapter.subscribeStates('*');
	
	ioBLib.setOrUpdateState('update', 'Update device states', false, '', 'boolean', 'button.refresh');
	
	controller = new tahoma.Tahoma(deviceUsername, devicePassword, adapter);
	
	controller.login(function(err, obj) {
		if(!err) {
			pollStates();
		}
	});
}

function pollStatesRelogin() {
	if(bigPolling) {
		clearTimeout(bigPolling);
		bigPolling = null;
	}
	
	if (new Date().getTime() - controller.lastEventTime > 9 * 60 * 1000) {
		// no events within last 10 minutes
        adapter.log.info("update tahoma all 10 minutes (last event is older)");
        controller.getAllStates();
    }
	
	bigPolling = setTimeout(function() {
		pollStatesRelogin();
	}, 10 * 60 * 1000);
}

function pollStates() {
	adapter.log.debug('Starting state polling');
	if(polling) {
		clearTimeout(polling);
		polling = null;
	}
	
	if(controller.isConnected()) {
		controller.getAllStates(function() {
			if (new Date().getTime() - controller.lastEventTime > 5 * 60 * 1000) {
				// no events within last 5 minutes
				controller.logout(function () {});
			}
		});
	}
	
	polling = setTimeout(function() {
		pollStates();
	}, pollingTime);
}

function processStateChange(id, value) {
	adapter.log.debug('StateChange: ' + JSON.stringify([id, value]));
	
	if(id === 'update') {
		if(value) {
			pollStates();
			adapter.setState('update', false, true);
		}
	} else if(id.match(/^devices.*\.states\.core:ClosureState$/)) {
		controller.onClosureStateChange(id, value);
	} else if(id.match(/^devices.*\.states\.core:TargetClosureState$/)) {
		controller.onClosureStateChange(id, value);
	} else if(id.match(/^devices.*\.states\.core:ClosureState:slow$/)) {
		controller.onClosureStateChange(id, value, true);
	} else if(id.match(/^devices.*\.states\.core:TargetClosureState:slow$/)) {
		controller.onClosureStateChange(id, value, true);
	} else if(id.match(/^devices.*\.states\.core:DeploymentState$/)) {
		controller.onDeploymentStateChange(id, value);
	} else if(id.match(/^devices.*\.states\.core:TargetDeploymentState$/)) {
		controller.onDeploymentStateChange(id, value);
	} else if(id.match(/^devices.*\.states\.core:SlateOrientationState$/)) {
		controller.onSetOrientation(id, value);
	} else if(id.match(/^actionGroups.*\.commands\.execute/) && value) {
        controller.onExecuteCommand(id, value);
    } else if(id.match(/^devices.*\.commands\./) && value) {
		let slow = false;
		if(id.endsWith(':slow')) {
			adapter.log.debug('Triggered command with slow mode: ' + id);
			slow = true;
			id = id.substr(0, id.length - 5);
			let cmd = id.substr(id.lastIndexOf('.') + 1);
			if(cmd === 'up' || cmd === 'open') {
				id = id.replace(/\.commands\.[a-z]+$/, '.states.core:ClosureState');
				controller.onClosureStateChange(id, 0, true);
			} else if(cmd === 'down' || cmd === 'close') {
				id = id.replace(/\.commands\.[a-z]+$/, '.states.core:ClosureState');
				controller.onClosureStateChange(id, 100, true);
			} else {
				adapter.log.warn('Unknown slow command: ' + id);
			}
		} else {
			controller.onExecuteDeviceCommand(id, slow);
		}
	}

	return;
}


// If started as allInOne/compact mode => return function to create instance
if(module && module.parent) {
	module.exports = startAdapter;
} else {
	// or start the instance directly
	startAdapter();
} // endElse

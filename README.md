![Logo](admin/tahoma.png)

[![NPM](https://nodei.co/npm/iobroker.tahoma.png?downloads=true)](https://nodei.co/npm/iobroker.tahoma/)

[![NPM version](https://img.shields.io/npm/v/iobroker.tahoma.svg)](https://www.npmjs.com/package/iobroker.tahoma)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://github.com/Excodibur/iobroker.tahoma/blob/master/LICENSE)

[![Dependency Status](https://img.shields.io/david/Excodibur/iobroker.schwoerer-ventcube.svg)](https://david-dm.org/Excodibur/iobroker.tahoma)

![Number of Installations (latest)](http://iobroker.live/badges/tahoma-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/tahoma-stable.svg)

[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/Excodibur/ioBroker.tahoma.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/Excodibur/ioBroker.tahoma/context:javascript)
![Github release status](https://github.com/Excodibur/iobroker.tahoma/workflows/Build%2C%20Test%20and%20Release/badge.svg)


# ioBroker.tahoma

An ioBroker adapter for Somfy Tahoma. This project has no affiliation with Somfy. Initially based on the script taken from https://forum.iobroker.net/post/336001 and forked from https://github.com/StrathCole/ioBroker.tahoma.

The adapter connects to the Tahomalink end user API and controls the devices set up through Tahoma Box (and most likely Connexoon).  
The adapter is not feature-complete, yet, but it should support most actions for controlling blinds and shutters etc.

Follwing some of the states created by the adapter.

## Currently tested devices

Generally, this adapter should support all devices that can be accessed via __tahomalink.com__, but for the adapter developer it is difficult to guarantee this. Mainly, because the documention of the used Somfy-API is (at least publically) non-existant and the developer can only test Somfy-devices which he owns himself, or is able to test with support of willing participants.

The following Somfy devices were verified to work with this adapter:
- Plug IO
- RS 100 IO Smoove Uno
- RS 100 IO Smoove Pure
- Sun sensor Sunis IO
- Temperature sensor IO
- Smoke Sensor IO
- Adapter Plug IO

## States

### tahoma.X.location

The state in this tree contain the personal information of the user like city, street address and longitude/latitude.

### tahoma.X.devices.*.deviceURL

This state contains the device URL that is used by Tahoma to identify the device.

### tahoma.X.devices.*.commands

These states contain button commands for controlling the devices. Most devices will support commands like `close` and `open` but also some more.  
Some of the commands have a `:slow` at the end if supported by the device. Using those enables low speed or so-called silent mode.

### tahoma.X.devices.*.states

These states contain current status of the devices as follows. Some of the states have a `:slow` at the end if supported by the device. Setting those enables low speed or so-called silent mode.


| Device state                                                | Editable | Purpose/Description |
|-------------------------------------------------------------|----------|---------------------|
| `tahoma.X.devices.*.states.core:DeploymentState`            | &#10003; | Provides information about and controls the state of current deployment. 100 means fully deployed, 0 is undeployed. Not all devices have this value, some have `ClosureState` instead. |
| `tahoma.X.devices.*.states.core:TargetDeploymentState`      | &#10003; | See `tahoma.X.devices.*.states.core:DeploymentState`. Use this to e.g. change blind position directly. |
| `tahoma.X.devices.*.states.coreClosureState`                | &#10003; | Provides information about and controls the state of current closure. 100 means fully closed, 0 is open. Not all devices have this value, some have `DeploymentState` instead. |
| `tahoma.X.devices.*.states.core:TargetClosureState`         | &#10003; | See `tahoma.X.devices.*.states.core:ClosureState` |
| `tahoma.X.devices.*.states.core:OrientationState`           | &#10003; | Provides information about and ocntrols the orientation (e. g. for shutters) of slats. Not all devices offer this value | 
| `tahoma.X.devices.*.states.core:TargetOrientationState`     | &#10003; | See `tahoma.X.devices.*.states.core:OrientationState` |  
| `tahoma.X.devices.*.states.core:NameState`                  |          | Contains the current name of the device. |
| `tahoma.X.devices.*.states.core:OpenClosedState`            |          | Contains `closed` if the device is 100% closed or 0% deployed and `open` otherwise. |
| `tahoma.X.devices.*.states.core:PriorityLockTimerState`     |          | If a sensor has locked the device this is stated here, e. g. a wind sensor blocking an awning. |
| `tahoma.X.devices.*.states.core:RSSILevelState`             |          | The current signal quality of the device. |
| `tahoma.X.devices.*.states.core:StatusState`                |          | `available` if the device is currently available. |
| `tahoma.X.devices.*.states.io:PriorityLockLevelState`       |          | See `tahoma.X.devices.*.states.core:PriorityLockTimerState` |
| `tahoma.X.devices.*.states.io:PriorityLockOriginatorState`  |          | See `tahoma.X.devices.*.states.core:PriorityLockTimerState` |
| `tahoma.X.devices.*.states.moving`                          |          | States if the device is currently moving. `0 = stopped`, `1 = up/undeploy`, `2 = down/deploy`, `3 = unknown direction` |


## Changelog
See [Changelog](https://github.com/Excodibur/ioBroker.tahoma/blob/master/CHANGELOG.md).

## License

The MIT License (MIT)

Copyright (c) 2020 Marius Burkard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
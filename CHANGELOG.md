# Changelog
<!--
	Placeholder for the next version (add instead of version-number-headline below):
	## **WORK IN PROGRESS**
-->
## 0.10.1 (2023-01-23)
- Fixed: Clear bearer token, if connection to local API fails, so new one can be fetched.

## 0.10.0 (2023-01-03)
- Fixed warnings about _Failed getting execution state_ when using the local API.

## 0.9.0 (2022-10-21)
- Added support for Somfy Connectivity Kit devices

## 0.8.0 (2022-08-26)
- Added support for dimming via core:LightIntensityState

## 0.7.2 (2022-06-15)
- Fix switching between local and online api

## 0.7.1 (2022-05-15)
- (StrathCole) Fixed parsing issues as result of latest Tahoma Box update by Somfy

## 0.7.0 (2022-05-12)
- (StrathCole) Added local API support to adapter
- Some fixes for newly added functionality

## 0.6.1 (2022-03-31)
-  Fixed issue with refresh of device state

## 0.6.0 (2022-03-24)
-  Improved state handling of commands. Issued commands will be acknowledged once "in progress" and be set to false, once completed. Aborted/Interupted commands will be set to false again.

## 0.5.6 (2022-03-16)
-  Smaller bugfixes (core:OnOffState)

## 0.5.5 (2022-03-15)
-  Made core:OnOffState changeable

## 0.5.4 (2022-02-23)
-  Allow temperature control by state

## 0.5.3 (2022-02-22)
-  Fix handling of special characters in device-names

## 0.5.2 (2022-02-18)
-  Fix issues/warnings with complex state updates through events

## 0.5.1 (2021-11-18)
-  Allow changes to core:TargetTemperatureState

## 0.5.0 (2021-10-12)
-  Added support for additional RTS device commands

## 0.4.3 (2021-08-09)
-  Fixed more type-errors for various states
-  Fixed wanring during logout
-  Code quality improvements

## 0.4.2 (2021-08-08)
-  Code quality improvements & security fixes
-  Fixed type-error for two states (core:LightIntensityState, core:TemperatureState)

## 0.4.1 (2021-08-07)
-  Fixed issue with way too complex state (TimeProgramXState)

## 0.4.0 (2021-08-06)
-  Added Admin 5 support
-  Fixed login retry behaviour and added configuration parameters (Admin 5)
-  Fixed issues with more complex states (e.g. ManufacturerSettingsState)

## 0.3.3

-  Removed credentials from log on error and debug

## 0.3.2

-  Fixed silent modes (low speed) for newer Somfy devices
-  Fixed problem with wrong reference to `this`

## 0.3.1

-   Fixed adapter crash on empty response object after request error
-   Fixed problems with slow/silent mode for closure

## 0.3.0

-   Added possibility for low speed open and close on supported devices
-   Fixed commands not stopping on next command for device
-   Smaller fixes

## 0.2.6

-   Added queue for device commands not already covered by update to 0.2.1

## 0.2.5

-   Added README for states

## 0.2.4

-   Switched moving state values 1 / 2 for DeploymentState devices

## 0.2.3

-   Fixed direction (moving state) for deployment devices

## 0.2.2

-   Fixed problem with DeploymentState treated as ClosureState on setting values

## 0.2.1

-   Fixed problems with too many simultanous commands/devices

## 0.2.0

-   Added deployment actions
-   Added new state for moving direction
-   Changed command buttons to boolean type

## 0.1.2

-   Retry device command on error 400 (payload) once

## 0.1.1

-   No changes

## 0.1.0

-   First running Version
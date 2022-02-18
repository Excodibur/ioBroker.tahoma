# Changelog
<!--
	Placeholder for the next version (add instead of version-number-headline below):
	## **WORK IN PROGRESS**
-->
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
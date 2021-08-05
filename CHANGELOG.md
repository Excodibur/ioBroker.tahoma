# Changelog
<!--
	Placeholder for the next version (add instead of version-number-headline below):
	## __WORK IN PROGRESS__
-->
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
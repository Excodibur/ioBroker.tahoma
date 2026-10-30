'use strict';

const sinon = require('sinon');
const sinonChai = require('sinon-chai').default;
const { expect, use } = require('chai');
const { Tahoma } = require('../lib/tahoma');

use(sinonChai);

function createContext() {
    return {
        namespace: 'tahoma.0',
        FORBIDDEN_CHARS: /[\][*,;'"`<>\\?]/g,
        config: {},
        log: {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
        },
        getObject: sinon.stub(),
        setState: sinon.stub(),
        // resolved on each call, so sinon fake timers still apply
        setTimeout: (cb, timeout, ...args) => setTimeout(cb, timeout, ...args),
        clearTimeout: timer => clearTimeout(timer),
    };
}

describe('lib/tahoma', () => {
    let context;
    let tahoma;

    beforeEach(() => {
        context = createContext();
        tahoma = new Tahoma('user', 'pass', 'https://example.com', '', {}, {}, context);
    });

    describe('mapValueTahoma2ioBroker - core:MovingState (#466)', () => {
        const cases = [
            ['true', true],
            ['false', false],
            [true, true],
            [false, false],
        ];
        for (const [input, expected] of cases) {
            it(`maps ${JSON.stringify(input)} to boolean ${expected}`, () => {
                expect(tahoma.mapValueTahoma2ioBroker('core:MovingState', input)).to.equal(expected);
            });
        }
    });

    describe('mapValueTahoma2ioBroker - percentage states (#409)', () => {
        for (const stateName of [
            'core:ClosureState',
            'core:TargetClosureState',
            'core:DeploymentState',
            'core:TargetDeploymentState',
        ]) {
            it(`caps ${stateName} at 100`, () => {
                expect(tahoma.mapValueTahoma2ioBroker(stateName, 124)).to.equal(100);
                expect(tahoma.mapValueTahoma2ioBroker(stateName, '124')).to.equal(100);
            });

            it(`keeps valid ${stateName} values`, () => {
                expect(tahoma.mapValueTahoma2ioBroker(stateName, 0)).to.equal(0);
                expect(tahoma.mapValueTahoma2ioBroker(stateName, '42')).to.equal(42);
                expect(tahoma.mapValueTahoma2ioBroker(stateName, 100)).to.equal(100);
            });
        }
    });

    describe('updateDeviceState (#464)', () => {
        it('does not throw when the ioBroker object no longer exists', () => {
            tahoma.Map_DeviceURL2StateName['io://1234/5678'] = 'devices.Blind';
            context.getObject.callsFake((key, callback) => callback(null, null));

            expect(() =>
                tahoma.updateDeviceState({
                    deviceURL: 'io://1234/5678',
                    deviceStates: [{ name: 'core:ClosureState', type: 1, value: 50 }],
                }),
            ).to.not.throw();
            expect(context.setState).to.not.have.been.called;
        });

        it('still sets the state when the object exists', () => {
            tahoma.Map_DeviceURL2StateName['io://1234/5678'] = 'devices.Blind';
            context.getObject.callsFake((key, callback) => callback(null, { type: 'state' }));

            tahoma.updateDeviceState({
                deviceURL: 'io://1234/5678',
                deviceStates: [{ name: 'core:MovingState', type: 6, value: 'true' }],
            });
            expect(context.setState).to.have.been.calledWith('devices.Blind.states.core:MovingState', true, true);
        });
    });

    describe('updateDevice (#468)', () => {
        it('does not throw for a device without definition', () => {
            const createOrUpdateState = sinon.stub(tahoma, 'createOrUpdateState');

            expect(() =>
                tahoma.updateDevice('devices.Unknown', { deviceURL: 'io://1234/9999', states: [] }),
            ).to.not.throw();
            expect(createOrUpdateState).to.have.been.calledWith('devices.Unknown.deviceURL', 'io://1234/9999');
        });

        it('creates command states when a definition is present', () => {
            const createOrUpdateState = sinon.stub(tahoma, 'createOrUpdateState');

            tahoma.updateDevice('devices.Blind', {
                deviceURL: 'io://1234/5678',
                states: [],
                definition: { commands: [{ commandName: 'open', nparams: 0 }] },
            });
            expect(createOrUpdateState).to.have.been.calledWith('devices.Blind.commands.open', false);
        });
    });

    describe('updateEventState (#416, #428)', () => {
        it('ignores executions without actions instead of throwing', () => {
            sinon
                .stub(tahoma, 'sendGET')
                .callsFake((url, payload, callback) => callback(null, { state: 'IN_PROGRESS' }));
            const updateDeviceActionState = sinon.stub(tahoma, 'updateDeviceActionState');

            tahoma.updateEventState({ name: 'ExecutionStateChangedEvent', execId: 'abc', newState: 'IN_PROGRESS' });

            expect(context.log.warn).to.not.have.been.called;
            expect(updateDeviceActionState).to.not.have.been.called;
        });
    });

    describe('connection reuse (#399)', () => {
        it('uses keep-alive connections with an own agent pool', () => {
            expect(tahoma.req_defaults.forever).to.equal(true);
            expect(tahoma.req_defaults.pool).to.be.an('object');
        });
    });

    describe('reconnect handling (#243)', () => {
        const expiredBody = { error: '"No registered event listener."', errorCode: 'UNSPECIFIED_ERROR' };

        function respondWith(target, error, response, body) {
            const reply = (params, callback) => callback(error, response, body);
            target.post = sinon.stub().callsFake(reply);
            target.get = sinon.stub().callsFake(reply);
        }

        for (const local of [false, true]) {
            const api = local ? 'local API' : 'cloud API';

            it(`registers a new event listener when the box no longer knows the old one (${api})`, () => {
                tahoma = new Tahoma(
                    'user',
                    'pass',
                    'https://example.com/',
                    local ? 'https://box/' : '',
                    {},
                    {},
                    context,
                );
                tahoma.eventRegisterID = 'old-id';
                const req = {};
                respondWith(req, null, { statusCode: 400 }, expiredBody);
                if (local) {
                    tahoma.localRequest = req;
                } else {
                    tahoma.baseRequest = req;
                }
                const callback = sinon.stub();

                tahoma.sendInternalRequest('POST', 'events/old-id/fetch', {}, callback, local);

                expect(tahoma.eventRegisterID).to.equal('-1');
                expect(callback).to.have.been.calledOnceWith(true);
                expect(tahoma.retryTimeout).to.equal(null);
            });
        }

        it('re-registers the event listener and warns only once while the box is unreachable', () => {
            tahoma.eventRegisterID = 'old-id';
            const error = new Error('getaddrinfo ENOTFOUND gateway-1234.local');
            respondWith((tahoma.baseRequest = {}), error, undefined, undefined);

            tahoma.sendInternalRequest('POST', 'events/old-id/fetch', {}, sinon.stub(), false);
            tahoma.sendInternalRequest('GET', 'setup/gateways', {}, sinon.stub(), false);

            expect(tahoma.eventRegisterID).to.equal('-1');
            expect(context.log.warn).to.have.been.calledOnce;
            expect(context.setState).to.have.been.calledWith('info.connection', false, true);
        });

        it('logs when the connection is restored and sets info.connection again', () => {
            tahoma.setConnected(true);
            respondWith((tahoma.baseRequest = {}), new Error('ETIMEDOUT'), undefined, undefined);
            tahoma.sendInternalRequest('POST', 'events/id/fetch', {}, sinon.stub(), false);

            respondWith(tahoma.baseRequest, null, { statusCode: 200 }, []);
            tahoma.sendInternalRequest('POST', 'events/register', {}, sinon.stub(), false);

            expect(context.log.info).to.have.been.calledWith('Connection to Tahoma restored.');
            expect(context.setState.lastCall).to.have.been.calledWith('info.connection', true, true);
        });

        it('sets info.connection to the actual connection state', () => {
            tahoma.setConnected(true);
            tahoma.setConnected(false);

            expect(context.setState.firstCall).to.have.been.calledWith('info.connection', true, true);
            expect(context.setState.secondCall).to.have.been.calledWith('info.connection', false, true);
        });

        it('keeps only one gateway update loop when logging in again', () => {
            const clock = sinon.useFakeTimers();
            try {
                const updateGateWays = sinon.stub(tahoma, 'updateGateWays');
                tahoma.scheduleGatewayUpdate(10000);
                tahoma.scheduleGatewayUpdate(10000);
                clock.tick(10000);
                expect(updateGateWays).to.have.been.calledOnce;
            } finally {
                clock.restore();
            }
        });

        it('only treats events/<id>/fetch as event fetch request', () => {
            expect(tahoma.isEventFetchRequest('events/089201ec-180a-42de-8aad-21583977f5fa/fetch')).to.equal(true);
            expect(tahoma.isEventFetchRequest('events/register')).to.equal(false);
            expect(tahoma.isEventFetchRequest('setup/gateways')).to.equal(false);
        });
    });
});

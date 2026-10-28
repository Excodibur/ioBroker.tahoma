'use strict';

const sinon = require('sinon');
const sinonChai = require('sinon-chai');
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
            sinon.stub(tahoma, 'sendGET').callsFake((url, payload, callback) => callback(null, { state: 'IN_PROGRESS' }));
            const updateDeviceActionState = sinon.stub(tahoma, 'updateDeviceActionState');

            tahoma.updateEventState({ name: 'ExecutionStateChangedEvent', execId: 'abc', newState: 'IN_PROGRESS' });

            expect(context.log.warn).to.not.have.been.called;
            expect(updateDeviceActionState).to.not.have.been.called;
        });
    });
});

const path = require('path');
const { tests } = require('@iobroker/testing');
const Tail = require('always-tail');

function delay (t, val) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve(val);
        }, t);
    });
}

function readMockData () {
    var fs = require('fs');
    try {
        var fileData = fs.readFileSync('test/tahoma-mock/data.json', 'utf8');

        var arr = JSON.parse(fileData);
        return arr;
    } catch (error) {
        console.error("Could not read mock service file");
    }
}

function monitorMockLogs (callback){
    let tail = new Tail("tahoma-mock.log");
    tail.on("line", callback);
}


function findStateByDeviceName (mockData, deviceName, stateName) {
    let result = null;
    mockData.forEach(testdata => {
        if (!(testdata.endpoint.path == "setup"))
            return;

        testdata.response.devices.forEach(device => {
            if (device.label == deviceName) {
                device.states.forEach(state => {
                    if (state.name == stateName)
                        result = state;
                })
            }
        });
    });

    return result;
}

function encrypt (key, value) {
    var result = '';
    for (var i = 0; i < value.length; ++i) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
}

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, ".."), {
    defineAdditionalTests (getHarness) {


        describe("Adapter core functions", () => {
            it("should read correct values from Ventcube mock", () => {
                return new Promise(async (resolve, reject) => {
                    const harness = getHarness();



                    harness._objects.getObjects(['system.adapter.tahoma.0', 'system.config'], async (err, objs) => {
                        objs[0].native.tahomalinkurl = "http://localhost:3000/";
                        objs[0].native.username = "some@mail.com";
                        const password = "testpw";

                        if (objs[1] && objs[1].native && objs[1].native.secret) {
                            //noinspection JSUnresolvedVariable
                            encryptedPassword = encrypt(objs[1].native.secret, password);
                        } else {
                            //noinspection JSUnresolvedVariable
                            encryptedPassword = encrypt('Zgfr56gFe87jJOM', password);
                        }

                        objs[0].native.password = encryptedPassword;
                        harness._objects.setObject(objs[0]._id, objs[0]);


                        await harness.startAdapterAndWait();

                        //check if states shown correlate to mock server
                        //read data from mock logs
                        const mockValues = readMockData();

                        //get state from adapter, adapter need some time to load first values from mock
                        await delay(5000);

                        const state = findStateByDeviceName(mockValues, "Blind 1 Somfy RS 100 IO Smoove Uno", "core:TargetClosureState");
                        const mockValue = state.value;

                        harness.states.getState("tahoma.0.devices.Blind_1_Somfy_RS_100_IO_Smoove_Uno.states.core:TargetClosureState", function (error, state) {

                            if (state.val == mockValue)
                                resolve();
                            else {
                                reject("ERROR - Value Missmatch. State: tahoma.0.devices.Blind_1_Somfy_RS_100_IO_Smoove_Uno.states.core:TargetClosureState, Adapter value: " + state.val + ", Mock value:" + mockValue);
                            }
                        });




                    });
                });
            }).timeout(30000);

            it("should update device state correctly", () => {
                return new Promise(async (resolve, reject) => {
                    const harness = getHarness();

                    harness._objects.getObjects(['system.adapter.tahoma.0', 'system.config'], async (err, objs) => {
                        objs[0].native.tahomalinkurl = "http://localhost:3000/";
                        objs[0].native.username = "some@mail.com";
                        const password = "testpw";

                        if (objs[1] && objs[1].native && objs[1].native.secret) {
                            //noinspection JSUnresolvedVariable
                            encryptedPassword = encrypt(objs[1].native.secret, password);
                        } else {
                            //noinspection JSUnresolvedVariable
                            encryptedPassword = encrypt('Zgfr56gFe87jJOM', password);
                        }

                        objs[0].native.password = encryptedPassword;
                        harness._objects.setObject(objs[0]._id, objs[0]);


                        await harness.startAdapterAndWait();

                        await delay(5000); //Give adapter time to fully start

                        monitorMockLogs(line => {
                            if ((line.includes("Blind_1_Somfy_RS_100_IO_Smoove_Uno.states.core:TargetClosureState")) && (line.includes("/exec/apply/highPriority"))) resolve();
                        });                        

                        await harness.states.setStateAsync("tahoma.0.devices.Blind_1_Somfy_RS_100_IO_Smoove_Uno.states.core:TargetClosureState", 100);
                    });
                });
            }).timeout(30000);
        });
    }
});
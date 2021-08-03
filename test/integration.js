const path = require('path');
const { tests } = require('@iobroker/testing');

function delay (t, val) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve(val);
        }, t);
    });
}

function readValuesFromMock () {
    var fs = require('fs');
    try {
        var fileData = fs.readFileSync('tahoma-mock/data.json', 'utf8');

        var arr = JSON.parse(fileData);
        return arr;
    } catch (error) {
        console.error("Could not read mock service file");
    }
}

function findStateByDeviceName (mockData, deviceName, stateName) {
    console.log("++++++++++++++++++++++++++++");
    let result = null;
    mockData.foreach(testdata => {
        console.log("+++++Checking dataset: " + testdata.endpoint.path);
        if (!(testdata.endpoint.path == "setup"))
            return;

        testdata.response.devices.foreach(device => {
            console.log("+++++Checking device: " + device.label);
            if (device.label == deviceName) {
                device.states.foreach(state => {
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
                        console.log("############################load mock values");
                        let mockValues = readValuesFromMock();

                        //get state from adapter, adapter need some time to load first values from mock
                        await delay(5000);

                        //Check one value from mockservice and compare to state in adapter. In theory we could iterate over all values
                        //but let's keep it simple for now.
                        const mockValue = (findStatebyDeviceName(mockValues, "EG Buero seite", "core:TargetClosureState")).value;
                        console.log("#########################");
                        console.log("#########################MOCKVALUE:" + mockValue);
                        console.log("#########################");
                        harness.states.getState("tahoma.0.devices.EG_Buero_seite.states.core:TargetClosureState", function (error, state) {

                            if (state.val == mockValue)
                                resolve();
                            else {
                                reject("ERROR - Value Missmatch. State: tahoma.0.devices.EG_Buero_seite.states.core:TargetClosureState, Adapter value: " + state.val + ", Mock value:" + mockValue);
                            }
                        });




                    });
                });
            }).timeout(30000);
        });
    }
});
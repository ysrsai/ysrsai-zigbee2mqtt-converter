import * as m from 'zigbee-herdsman-converters/lib/modernExtend';
import {presets as e} from 'zigbee-herdsman-converters/lib/exposes';

// The identity below comes from the supplied ZHA quirk. Confirm both strings
// against the actual Zigbee2MQTT device information before deployment.
const sceneAction = {
    cluster: 'genMultistateInput',
    type: ['attributeReport'],
    convert: (model, msg) => {
        const key = msg.endpoint.ID - 3;
        if (key < 1 || key > 4) return;
        const value = msg.data.presentValue ?? msg.data[0x0055];
        const action = {1: 'single', 2: 'double', 3: 'hold_start'}[value];
        if (action !== undefined) return {action: `scene_${key}_${action}`};
    },
};

const actions = [1, 2, 3, 4].flatMap((key) =>
    ['single', 'double', 'hold_start'].map((action) => `scene_${key}_${action}`),
);

const lightExtend = m.light({colorTemp: {range: [153, 370], startup: false}, color: {modes: ['xy', 'hs']}, effect: false, powerOnBehavior: false, configureReporting: true});
// Keep the converters and configure (which reads colorCapabilities), not its fixed expose.
lightExtend.exposes = [];

function lightExposes(device) {
    const light = e.light().withBrightness();
    const endpoint = device?.getEndpoint?.(1);
    if (endpoint?.supportsInputCluster('lightingColorCtrl')) {
        const capabilities = endpoint.getClusterAttributeValue('lightingColorCtrl', 'colorCapabilities');
        // Missing or invalid cached capabilities cannot identify the supported modes.
        if (Number.isInteger(capabilities) && capabilities >= 0 && capabilities <= 0xffff) {
            if (capabilities & 0x10) light.withColorTemp([153, 370]);
            const modes = [];
            if (capabilities & 0x08) modes.push('xy');
            if (capabilities & 0x01) modes.push('hs');
            if (modes.length) light.withColor(modes);
        }
    }
    return [light, e.action(actions)];
}

export default {
    fingerprint: [{modelID: 'Light-PIR-Lux', manufacturerName: 'YSRSAI'}],
    model: 'YSRSAI-Light-PIR-Lux-Z2M',
    vendor: 'YSRSAI',
    description: 'Light, occupancy, illuminance and four scene keys',
    // 153..370 is appropriate only for firmware configured for 2700..6500 K.
    // RGB, RGBW and RGBCW may all report 0x19 and cannot be distinguished here.
    extend: [
        lightExtend,
        m.occupancy({reporting: false}),
        m.illuminance({reporting: false}),
    ],
    fromZigbee: [sceneAction],
    exposes: lightExposes,
};

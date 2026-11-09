# YSRSAI Light-PIR-Lux integrations

Unofficial, community-provided integrations for a device reporting manufacturer `YSRSAI` and model `Light-PIR-Lux`. Confirm both strings in your device information before use. This is not official Zigbee2MQTT, Home Assistant, or manufacturer support. Automatic configuration and operation across all five device modes have not been fully verified; behavior depends on firmware and integration versions.

## Choose one integration

| File | Integration | Purpose |
| --- | --- | --- |
| `ysrsai_light_pir_lux_z2m.mjs` | Zigbee2MQTT external converter | Matches the fingerprint and exposes light controls, occupancy, illuminance, and scene actions. |
| `ysrsai_zha_5mode_4key.py` | Home Assistant ZHA custom quirk | Adds four-key device triggers to a matching ZHA device; it does not install a Zigbee2MQTT converter. |

These files are **not interchangeable**. Use the file for the Zigbee integration controlling your device.

## Zigbee2MQTT installation

1. Use a Zigbee2MQTT release and `zigbee-herdsman-converters` version compatible with this ES module and its `modernExtend` APIs. No specific release range has been fully validated; upgrades can change converter APIs.
2. For Zigbee2MQTT 2.x, copy `ysrsai_light_pir_lux_z2m.mjs` into the `external_converters` directory alongside Zigbee2MQTT's `configuration.yaml`. In 2.0–2.10, converters in this directory load without an additional setting. In 2.11 and later, new installations disable external JavaScript by default: enable `advanced.enable_external_js` if needed, merging it into any existing `advanced` configuration. External JavaScript runs code with Zigbee2MQTT's permissions; enable it only for trusted files.
3. Restart Zigbee2MQTT and check its log for converter loading or API errors. Older 1.x versions use a different external-converter configuration and may not support this `.mjs` file or its APIs; compatibility is not guaranteed. Consult the [external converter documentation](https://www.zigbee2mqtt.io/advanced/more/external_converters.html) for your installed version.
4. In the device information, verify manufacturer and model, then check the device exposes and try light control. Observe occupancy and illuminance after the device reports them. Press each key and inspect the `action` property or MQTT messages for events such as `scene_1_single`, `scene_1_double`, and `scene_1_hold_start`. Check all four keys and supported light functions on your firmware.

## Home Assistant ZHA installation

1. Use a Home Assistant/ZHA and zigpy version supporting `zigpy.quirks.v2.QuirkBuilder` and the APIs used by this file. No exact compatible release range has been verified; check logs after upgrades.
2. Put `ysrsai_zha_5mode_4key.py` in a directory accessible to Home Assistant, for example `/config/custom_zha_quirks/`. In Home Assistant's `configuration.yaml`, add the following **under the existing `zha:` key**, if present; merge with other ZHA settings rather than creating a duplicate `zha:` section:

   ```yaml
   zha:
     enable_quirks: true
     custom_quirks_path: /config/custom_zha_quirks
   ```

   Adjust the path for your installation. If these keys already exist, update them in place and preserve the other settings.
3. Restart Home Assistant so ZHA loads the custom quirk. Inspect Home Assistant logs for import or quirk-loading errors.
4. Check the device's manufacturer and model and that the quirk is applied. The quirk also requires endpoints 4–7 to have profile `0x0104`, device type `0x0006`, and input cluster `0x0012`. Check ZHA device automation triggers for buttons 1–4, or listen for `zha_event` events and verify each press. If the device is already paired and the quirk is not applied, investigate logs and device signature before considering a re-interview or re-pair.

## Scene keys

Endpoints 4, 5, 6, and 7 correspond to keys 1, 2, 3, and 4. A `genMultistateInput` (`0x0012`) `presentValue` (`0x0055`) attribute report maps as follows:

| Value | Meaning | Action suffix / ZHA command |
| --- | --- | --- |
| 1 | Single click | `single` |
| 2 | Double click | `double` |
| 3 | Long-press start | `hold_start` |

For Zigbee2MQTT the full action is `scene_<key>_<suffix>`; ZHA uses the command and endpoint/button identity. Neither implementation generates a release event.

## Light and sensor limitations

- Zigbee2MQTT determines color and color-temperature exposes from the cached endpoint 1 `colorCapabilities` bits. If the cluster or a valid cached value is missing, it falls back to brightness-only light exposure rather than guessing color support. A later successful capability read may be needed to expose additional controls.
- RGB, RGBW, and RGBCW devices can report the same capability bits (including `0x19`); these bits alone cannot distinguish the physical channel layout or prove that every mode works.
- The converter hard-codes a color-temperature range of 153–370 mired, appropriate only for firmware configured for approximately 2700–6500 K. Check your firmware before relying on this range; other ranges require adaptation.
- The Zigbee2MQTT converter requests occupancy binding and reporting with a minimum interval of 0 seconds and a maximum interval of 300 seconds. The user has confirmed automatic PIR reporting works in their setup; other versions and device modes still require verification. The converter does not actively configure illuminance reporting, so illuminance updates depend on the device sending reports and may remain unavailable or stale. The light configuration requests reporting, but successful automatic configuration is not guaranteed.
- The ZHA quirk targets the scene-key events; it should not be taken as a guarantee of complete light or sensor support in every mode.

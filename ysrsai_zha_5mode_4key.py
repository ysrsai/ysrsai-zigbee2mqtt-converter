"""YSRSAI Light-PIR-Lux 四键三种动作的 ZHA V2 quirk。"""

import logging

from zigpy.quirks import CustomCluster
from zigpy.quirks.v2 import QuirkBuilder
from zigpy.zcl import foundation
from zigpy.zcl.clusters.general import MultistateInput

_LOGGER = logging.getLogger(__name__)
_ENDPOINTS = (4, 5, 6, 7)
_COMMANDS = {
    1: "single",
    2: "double",
    3: "hold_start",
}


def _matches_endpoints(device):
    """只检查四个按键端点，不限制其他端点或 cluster。"""
    try:
        return all(
            (endpoint := device.endpoints.get(endpoint_id)) is not None
            and endpoint.profile_id == 0x0104
            and endpoint.device_type == 0x0006
            and 0x0012 in endpoint.in_clusters
            for endpoint_id in _ENDPOINTS
        )
    except (AttributeError, TypeError):
        return False


class YSRSAIFourKeyInput(CustomCluster, MultistateInput):
    """将属性报告转换为 ZHA 按键事件。"""

    def handle_cluster_general_request(self, hdr, args, *, dst_addressing=None):
        try:
            if hdr.command_id == foundation.GeneralCommand.Report_Attributes:
                for report in getattr(args, "attribute_reports", ()) or ():
                    try:
                        if report.attrid != 0x0055:
                            continue
                        value = report.value.value
                        if not isinstance(value, int) or isinstance(value, bool):
                            continue
                        command = _COMMANDS.get(value)
                        if command is not None:
                            self.listener_event("zha_send_event", command, {})
                    except (AttributeError, TypeError, ValueError):
                        _LOGGER.debug("忽略无效的按键属性报告", exc_info=True)
        except Exception:
            _LOGGER.exception("处理按键事件失败")
        return super().handle_cluster_general_request(
            hdr, args, dst_addressing=dst_addressing
        )


_builder = QuirkBuilder("YSRSAI", "Light-PIR-Lux").filter(_matches_endpoints)
for _endpoint_id in _ENDPOINTS:
    _builder.replaces(YSRSAIFourKeyInput, endpoint_id=_endpoint_id)

_builder.device_automation_triggers(
    {
        (command, f"button_{endpoint_id - 3}"): {
            "endpoint_id": endpoint_id,
            "cluster_id": 0x0012,
            "command": command,
        }
        for endpoint_id in _ENDPOINTS
        for command in _COMMANDS.values()
    }
).add_to_registry()

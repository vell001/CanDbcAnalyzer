let dbc_protocol = {};

let curCanId = undefined;
let can_info = {};

function dbcAnalyzer(data) {
    console.log("dbcAnalyzer");
    let id = (data[2] & 0xFF) + ((data[3] & 0xFF) << 8);

    let can_data = Array.from(data.subarray(4, 12));
    updateCanInfo(id, can_data);
    if (curCanId && curCanId === id) {
        updateCanBitData(can_info[id]);
    }
}

function updateCanInfo(stdId, data) {
    if (!(stdId in can_info)) {
        can_info[stdId] = {
            "name": "",
            "count": 0,
            "bytes": undefined
        }

        document.getElementById("tbody-can-data").innerHTML += String.format("\n" +
            "            <tr id='can_data_{0}' onclick=\"canDataOnClick(this)\" class=\"cabana-meta-messages-list-item\">\n" +
            "                <td id='can_name_{0}'></td>\n" +
            "                <td id='can_id_{0}'>{0}</td>\n" +
            "                <td id='can_count_{0}'></td>\n" +
            "                <td>\n" +
            "                    <div id='can_bytes_{0}' class=\"cabana-meta-messages-list-item-bytes\">\n" +
            "                        \n" +
            "                    </div>\n" +
            "                </td>\n" +
            "            </tr>", stdId)
    }
    if (data) {
        can_info[stdId]["bytes"] = data;
        document.getElementById("can_bytes_" + stdId).innerText = bytesToHex(can_info[stdId]["bytes"]);
        can_info[stdId]["count"] += 1;
    }
    updateCanNameView(stdId);
    document.getElementById("can_count_" + stdId).innerText = can_info[stdId]["count"];
}

function updateCanNameView(stdId) {
    if (stdId in dbc_protocol) {
        can_info[stdId]["name"] = dbc_protocol[stdId]["name"];
        document.getElementById("can_name_" + stdId).innerText = can_info[stdId]["name"];
    }
}

function getIdxById(obj) {
    let l = obj.id.split("_");
    return Number(l[l.length - 1]);
}

function canDataOnClick(obj) {
    let id = getIdxById(obj);
    if (curCanId) {
        document.getElementById("can_data_" + curCanId).className =
            document.getElementById("can_data_" + curCanId).className.replace(" is-selected", "");
    }
    curCanId = id;
    updateCanBitData(can_info[curCanId]);
    obj.className += " is-selected";

    if (curCanId in dbc_protocol) {
        document.getElementById("input-msg-name").value = dbc_protocol[curCanId]["name"];
        document.getElementById("input-msg-size").value = dbc_protocol[curCanId]["byteNum"];
    }

    updateDbcSignalView(true);
}

function dbcEditOnChange(obj) {
    if (obj.id.startsWith("input-msg-name")) {
        let isExist = false;
        for (let id in dbc_protocol) {
            if (id !== curCanId.toString() && dbc_protocol[id]["name"] === obj.value) {
                isExist = true;
                break;
            }
        }
        if (isExist) {
            document.getElementById("dbc-edit-msg-info").style.background = "#FF0000";
        } else {
            document.getElementById("dbc-edit-msg-info").style.background = "#FFFFFF";
            dbc_protocol[curCanId]["name"] = obj.value;

            updateCanNameView(curCanId);
        }
    } else if (obj.id.startsWith("input-msg-size")) {
        dbc_protocol[curCanId]["size"] = obj.value;
    } else if (obj.id.startsWith("input-signal-name")) {
        let sigIdx = getIdxById(obj);
        let isExist = false;
        dbc_protocol[curCanId]["signals"].forEach((sig, idx) => {
            if (sig && idx !== sigIdx && sig["name"] === obj.value) {
                isExist = true;
            }
        });
        if (isExist) {
            document.getElementById("input-signal-name-error_" + sigIdx).hidden = false;
        } else {
            document.getElementById("input-signal-name-error_" + sigIdx).hidden = true;
            dbc_protocol[curCanId]["signals"][sigIdx]["name"] = obj.value;
            updateDbcSignalView(false);
        }
    } else if (obj.id.startsWith("input-signal-startBit")) {
        let sigIdx = getIdxById(obj);
        let v = Number(obj.value);
        dbc_protocol[curCanId]["signals"][sigIdx]["startBit"] = v;
        updateDbcSignalView(false);
    } else if (obj.id.startsWith("input-signal-bitLen")) {
        let sigIdx = getIdxById(obj);
        let v = Number(obj.value);
        dbc_protocol[curCanId]["signals"][sigIdx]["bitLen"] = v;
        updateDbcSignalView(false);
    } else if (obj.id.startsWith("select-signal-byteOrder")) {
        let sigIdx = getIdxById(obj);
        let v = Number(obj.value);
        dbc_protocol[curCanId]["signals"][sigIdx]["byteOrder"] = v;
        updateDbcSignalView(false);
    } else if (obj.id.startsWith("select-signal-isSigned")) {
        let sigIdx = getIdxById(obj);
        let v = Number(obj.value);
        dbc_protocol[curCanId]["signals"][sigIdx]["isSigned"] = v;
        updateDbcSignalView(false);
    } else if (obj.id.startsWith("input-signal-factor")) {
        let sigIdx = getIdxById(obj);
        let v = Number(obj.value);
        dbc_protocol[curCanId]["signals"][sigIdx]["factor"] = v;
        updateDbcSignalView(false);
    } else if (obj.id.startsWith("input-signal-offset")) {
        let sigIdx = getIdxById(obj);
        let v = Number(obj.value);
        dbc_protocol[curCanId]["signals"][sigIdx]["offset"] = v;
        updateDbcSignalView(false);
    }
}

function updateCanBitData(data) {
    if (data["bytes"]) {
        data["bytes"].forEach((byte, index) => {
            let byte_value_dom = document.getElementById("byte_value_" + index);
            if (parseInt(byte_value_dom.innerText, 16) !== byte) {
                byte_value_dom.innerText = byteToHex(byte);
                let s = byteToBin(byte);
                for (let i = 0; i < 8; i++) {
                    document.getElementById("bit_value_" + (index * 8 + i)).innerText = s.charAt(7 - i);
                }
            }
        });
    }
}

function dbcCalSignalValue(stdId, data) {
    if (!data) {
        return;
    }
    dbc_protocol[stdId]["signals"].forEach((sig, index) => {
        if (sig) {
            let v = Utils_ByteSub(data, sig["startBit"], sig["bitLen"], sig["byteOrder"]);
            if (sig["isSigned"] === 1) {
                v = v << 0;
            }
            dbc_protocol[stdId]["signals"][index]["value"] = v * sig["factor"] + sig["offset"];
            console.log(sig["name"], v, dbc_protocol[stdId]["signals"][index]["value"]);
        }
    });
}

window.onload = function () {
    document.getElementById("input-dbc-file").addEventListener('change', function () {
        if (this.files.length === 0) {
            console.log("no file selected");
            return;
        }
        const reader = new FileReader();
        reader.onload = function () {
            loadDbc(reader.result);
        }
        reader.readAsText(this.files[0]);
    });

    for (let i = 0; i < 8; i++) {
        document.getElementById("tbody-dbc-bits").innerHTML += String.format("<tr id='byte_tr_{8}'>\n" +
            "                <td onclick='dbcBitsOnClick(this)' id='bit_td_{0}' class=\"_1udfl3\"><span id='bit_value_{0}'>0</span><span id='bit_info_{0}' class=\"_viebo4\"></span></td>\n" +
            "                <td onclick='dbcBitsOnClick(this)' id='bit_td_{1}' class=\"_1udfl3\"><span id='bit_value_{1}'>0</span><span id='bit_info_{1}' class=\"_viebo4\"></span></td>\n" +
            "                <td onclick='dbcBitsOnClick(this)' id='bit_td_{2}' class=\"_1udfl3\"><span id='bit_value_{2}'>0</span><span id='bit_info_{2}' class=\"_viebo4\"></span></td>\n" +
            "                <td onclick='dbcBitsOnClick(this)' id='bit_td_{3}' class=\"_1udfl3\"><span id='bit_value_{3}'>0</span><span id='bit_info_{3}' class=\"_viebo4\"></span></td>\n" +
            "                <td onclick='dbcBitsOnClick(this)' id='bit_td_{4}' class=\"_1udfl3\"><span id='bit_value_{4}'>0</span><span id='bit_info_{4}' class=\"_viebo4\"></span></td>\n" +
            "                <td onclick='dbcBitsOnClick(this)' id='bit_td_{5}' class=\"_1udfl3\"><span id='bit_value_{5}'>0</span><span id='bit_info_{5}' class=\"_viebo4\"></span></td>\n" +
            "                <td onclick='dbcBitsOnClick(this)' id='bit_td_{6}' class=\"_1udfl3\"><span id='bit_value_{6}'>0</span><span id='bit_info_{6}' class=\"_viebo4\"></span></td>\n" +
            "                <td onclick='dbcBitsOnClick(this)' id='bit_td_{7}' class=\"_1udfl3\"><span id='bit_value_{7}'>0</span><span id='bit_info_{7}' class=\"_viebo4\"></span></td>\n" +
            "                <td id='byte_value_{8}'>00</td>\n" +
            "            </tr>",
            i * 8 + 7,
            i * 8 + 6,
            i * 8 + 5,
            i * 8 + 4,
            i * 8 + 3,
            i * 8 + 2,
            i * 8 + 1,
            i * 8,
            i
        );
    }
};

let bitClickStart = -1;

function dbcBitsOnClick(obj) {
    let bitIdx = getIdxById(obj);
    if (bitClickStart >= 0) {
        let dbc_p = dbc_protocol[curCanId];
        let signal = {
            "name": "Signal_" + (dbc_p["signals"].length + 1),
            "isSigned": 0,
            "factor": 1,
            "offset": 0,
            "value": 0,
        }
        if (bitIdx > bitClickStart) {
            signal["startBit"] = bitClickStart;
            signal["bitLen"] = bitIdx - bitClickStart + 1;
            signal["byteOrder"] = 1;
        } else {
            signal["startBit"] = bitIdx;
            signal["bitLen"] = bitClickStart - bitIdx + 1;
            signal["byteOrder"] = 1;
        }
        dbc_p["signals"].push(signal);
        updateDbcSignalView(false);
        bitClickStart = -1;
    } else {
        bitClickStart = bitIdx;
    }
}

function deleteSignal(canId, signalName) {
    dbc_protocol[canId]["signals"][signalName] = undefined;
    updateDbcSignalView(true);
}

function plotSignal(canId, signalName) {

}

function signalNameOnClick(signalName) {
    document.getElementById("signal_body_" + signalName).style.display =
        document.getElementById("signal_body_" + signalName).style.display === "none" ? "" : "none";
}

function signalOnMouseOver(obj) {
    let idx = getIdxById(obj);
    let es = document.getElementsByClassName("bit_td_tag_" + idx);
    Array.from(es).forEach((e, i) => {
        e.className = "bit_td_tag_" + idx + " _a2n86qNaN";
    });
}

function signalOnMouseOut(obj) {
    let idx = getIdxById(obj);
    let es = document.getElementsByClassName("bit_td_tag_" + idx);
    Array.from(es).forEach((e, i) => {
        e.className = "bit_td_tag_" + idx + " " + getBitClass(idx);
    });
}

function updateDbcSignalView(clear) {
    let dbc_p = dbc_protocol[curCanId];
    if (clear) {
        document.getElementById("signals-list").innerHTML = "";
    }
    dbcCalSignalValue(curCanId, can_info[curCanId]["bytes"]);
    clearBitsView();
    dbc_p["signals"].forEach((sig, index) => {
        if (sig) {
            let name = sig["name"];
            let editObj = document.getElementById("signal_edit_" + index);
            if (!editObj) {
                let tmp = document.createElement('div');
                tmp.innerHTML = String.format("<div onmouseover='signalOnMouseOver(this)' onmouseout='signalOnMouseOut(this)' id=\"signal_edit_{3}\" class=\"signal-entry {2}\">\n" +
                    "                <div id=\"signal_header_{3}\">\n" +
                    "                    <label id=\"signal_name_{3}\" onclick='signalNameOnClick(\"{3}\")'>{0}</label>\n" +
                    "                    <button onclick=\"deleteSignal({1},{3})\">delete</button>\n" +
                    "                    <button onclick=\"plotSignal({1},{3})\">plot</button>\n" +
                    "                </div>\n" +
                    "                <div id=\"signal_body_{3}\">\n" +
                    "                    <div>Name: <input onchange=\"dbcEditOnChange(this)\" id=\"input-signal-name_{3}\" type=\"text\" value=\"\"><label id=\"input-signal-name-error_{3}\" hidden='hidden'>名字重复</label></div>\n" +
                    "                    <div>StartBit: <input onchange=\"dbcEditOnChange(this)\" id=\"input-signal-startBit_{3}\" type=\"number\" value=\"\"></div>\n" +
                    "                    <div>Size: <input onchange=\"dbcEditOnChange(this)\" id=\"input-signal-bitLen_{3}\" type=\"number\" value=\"\"></div>\n" +
                    "                    <div>ByteOrder: <select onchange=\"dbcEditOnChange(this)\" id=\"select-signal-byteOrder_{3}\">\n" +
                    "                        <option value=\"0\">大端在前</option>\n" +
                    "                        <option value=\"1\">小端在前</option>\n" +
                    "                    </select>\n" +
                    "                    </div>\n" +
                    "                    <div>Sign: <select onchange=\"dbcEditOnChange(this)\" id=\"select-signal-isSigned_{3}\">\n" +
                    "                        <option value=\"0\">无符号</option>\n" +
                    "                        <option value=\"1\">有符号</option>\n" +
                    "                    </select>\n" +
                    "                    </div>\n" +
                    "                    <div>Factor: <input onchange=\"dbcEditOnChange(this)\" id=\"input-signal-factor_{3}\" type=\"number\" value=\"\"></div>\n" +
                    "                    <div>Offset: <input onchange=\"dbcEditOnChange(this)\" id=\"input-signal-offset_{3}\" type=\"number\" value=\"\"></div>\n" +
                    "                    <div>Value: <input onchange=\"dbcEditOnChange(this)\" id=\"input-signal-value_{3}\" type=\"number\" readonly='readonly' value=\"\"></div>\n" +
                    "                </div>\n" +
                    "            </div>", name, curCanId, "signal-entry" + (index % 2), index);
                document.getElementById('signals-list').insertBefore(tmp, document.getElementById('signals-list').firstChild);
            }

            document.getElementById("signal_name_" + index).innerText = name;
            document.getElementById("input-signal-name_" + index).value = name;
            document.getElementById("input-signal-startBit_" + index).value = sig["startBit"];
            document.getElementById("input-signal-bitLen_" + index).value = sig["bitLen"];
            document.getElementById("select-signal-byteOrder_" + index).value = sig["byteOrder"].toString();
            document.getElementById("select-signal-isSigned_" + index).value = sig["isSigned"].toString();
            document.getElementById("input-signal-factor_" + index).value = sig["factor"];
            document.getElementById("input-signal-offset_" + index).value = sig["offset"];
            document.getElementById("input-signal-value_" + index).value = sig["value"];

            // 更新bit选区
            updateBitsView(index, sig);
        }
    });
}

function clearBitsView() {
    for (let i = 0; i < 64; i++) {
        document.getElementById("bit_td_" + i).className = "_1udfl3";
        document.getElementById("bit_info_" + i).innerText = "";
    }
}

function getBitClass(signalIdx) {
    let bitClass = "_goi20fNaN";
    if (signalIdx % 2 === 0) {
        bitClass = "_1ng3v91NaN";
    }
    return bitClass;
}

function updateBitsView(signalIdx, sig) {
    let bitClass = getBitClass(signalIdx);
    let bitLen = sig["bitLen"];
    let startBit = sig["startBit"];
    let count = 1;
    let endBit = startBit;
    if (sig["byteOrder"] === 0) {
        // 大端在前
        document.getElementById("bit_info_" + startBit).innerText = "msb";
        while (count <= bitLen) {
            document.getElementById("bit_td_" + endBit).className = "bit_td_tag_" + signalIdx + " " + bitClass;
            if (count === bitLen) {
                document.getElementById("bit_info_" + endBit).innerText = "lsb";
            }
            count++;
            endBit--;
            if (endBit % 8 === 7) {
                endBit += 16;
            }
        }
    } else {
        document.getElementById("bit_info_" + startBit).innerText = "lsb";
        while (count <= bitLen) {
            document.getElementById("bit_td_" + endBit).className = "bit_td_tag_" + signalIdx + " " + bitClass;
            count++;
            endBit++;
        }

        document.getElementById("bit_info_" + (endBit - 1)).innerText = "msb";
    }
}

function loadDbc(data) {
    const SG_pattern = /.*SG_\W+(.*)\W+:\W+([0-9]+)\|([0-9]+)\W*@\W*([0-9]+)\W*([\+\-]+)\W+\(\W*([\-0-9\.]+)\W*,\W*([\-0-9\.]+)\)/;
    const BO_pattern = /BO_\W+([0-9]+)\W+(.*)\W*:\W+([0-9]+)/;

    data = data.split(/[\n]+/);
    let lastStdId = undefined;
    data.forEach((item, index) => {
        if (item) {
            let bo = item.match(BO_pattern)
            if (bo) {
                let stdId = Number(bo[1])
                dbc_protocol[stdId] = {
                    "name": bo[2],
                    "byteNum": bo[3],
                    "signals": []
                }
                lastStdId = stdId;
                console.log(bo);
            }
            if (lastStdId) {
                let sg = item.match(SG_pattern);
                if (sg) {
                    dbc_protocol[lastStdId]["signals"].push({
                        "name": sg[1],
                        "startBit": Number(sg[2]),
                        "bitLen": Number(sg[3]),
                        "byteOrder": Number(sg[4]),
                        "isSigned": sg[5] === "-" ? 1 : 0,
                        "factor": Number(sg[6]),
                        "offset": Number(sg[7]),
                        "value": 0,
                    })
                    console.log(dbc_protocol);
                }
            }
        }
    });

    for (let id in dbc_protocol) {
        updateCanInfo(id, undefined);
    }
}

function saveDbc() {
    const BO_template = "\r\nBO_ {0} {1}: {2} Car\r\n";
    const SG_template = " SG_ {0} : {1}|{2}@{3}{4} ({5},{6}) [0|1] \"\" MCU\r\n";
    let text = "";
    for (let stdId in dbc_protocol) {
        text += String.format(BO_template, stdId, dbc_protocol[stdId]["name"], dbc_protocol[stdId]["byteNum"]);
        dbc_protocol[stdId]["signals"].forEach((sig, index) => {
            if (sig) {
                text += String.format(SG_template,
                    sig["name"],
                    sig["startBit"],
                    sig["bitLen"],
                    sig["byteOrder"],
                    sig["isSigned"] === 1 ? "-" : "+",
                    sig["factor"],
                    sig["offset"],
                );
            }
        });
    }
    console.log(text);
    exportRaw(new Date().Format("yyyy-MM-dd_HH-mm-ss") + ".dbc", text);
}

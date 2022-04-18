let dbc_protocol = {};

let curCanId = undefined;
let can_info = {};
let sg_info = {};
let isUpdateSgInfo = false;

function dbcAnalyzer(data) {
    // console.log("dbcAnalyzer");
    let id = (data[2] & 0xFF) + ((data[3] & 0xFF) << 8);

    let can_data = Array.from(data.subarray(4, 12));
    updateCanInfo(id, can_data);
    if (isUpdateSgInfo) {
        updateSgInfo(id, can_data);
    }
    if (curCanId && curCanId === id) {
        updateCanBitData(can_info[id]);
    }

    updatePlotView(id);
}

function updateSgInfo(stdId, data) {
    if (!(stdId in dbc_protocol)) {
        return;
    }

    dbc_protocol[stdId]["signals"].forEach((sig, index) => {
        let sigName = sig["name"] + "_" + stdId;
        if (!(sigName in sg_info)) {
            sg_info[sigName] = {
                "signalName": sig["name"],
                "canId": stdId,
            }
            document.getElementById("tbody-sg-data").innerHTML += String.format(
                "            <tr id='sg_data_{1}' onclick=\"canDataOnClick(this)\" class=\"cabana-meta-messages-list-item\">\n" +
                "                <td id='sg_name_{0}' class='sg_name'></td>\n" +
                "                <td id='sg_can_id_{0}'>{1}[{2}]</td>\n" +
                "                <td id='sg_count_{0}'></td>\n" +
                "                <td>\n" +
                "                    <div id='sg_value_{0}' class=\"cabana-meta-messages-list-item-bytes\">\n" +
                "                        \n" +
                "                    </div>\n" +
                "                </td>\n" +
                "            </tr>", sigName, stdId, Number.parseInt(stdId).toString(16).toUpperCase());
        }

        document.getElementById("sg_name_" + sigName).innerText = sig["name"];
        if (data) {
            dbcCalSignalValue(stdId, index, sig, data);
            document.getElementById("sg_count_" + sigName).innerText = can_info[stdId]["count"];
            document.getElementById("sg_value_" + sigName).innerText = dbc_protocol[stdId]["signals"][index]["value"].toFixed(4);
        }
    });
}

function updateCanInfo(stdId, data) {
    if (!(stdId in can_info)) {
        can_info[stdId] = {
            "count": 0,
            "bytes": undefined
        }

        document.getElementById("tbody-can-data").innerHTML += String.format("\n" +
            "            <tr id='can_data_{0}' onclick=\"canDataOnClick(this)\" class=\"cabana-meta-messages-list-item\">\n" +
            "                <td id='can_name_{0}'></td>\n" +
            "                <td id='can_id_{0}'>{0}[{1}]</td>\n" +
            "                <td id='can_count_{0}'></td>\n" +
            "                <td>\n" +
            "                    <div id='can_bytes_{0}' class=\"cabana-meta-messages-list-item-bytes\">\n" +
            "                        \n" +
            "                    </div>\n" +
            "                </td>\n" +
            "            </tr>", stdId, Number.parseInt(stdId).toString(16).toUpperCase());
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
        document.getElementById("can_name_" + stdId).innerText = dbc_protocol[stdId]["name"];
    } else {
        document.getElementById("can_name_" + stdId).innerText = "";
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
    } else {
        document.getElementById("input-msg-name").value = "untiled";
        document.getElementById("input-msg-size").value = "8";
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
        for (let canId in dbc_protocol) {
            dbc_protocol[canId]["signals"].forEach((sig, idx) => {
                if (sig && idx !== sigIdx && sig["name"] === obj.value) {
                    isExist = true;
                }
            });
        }
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
    } else if (obj.id.startsWith("input-signal-valueMap")) {
        let sigIdx = getIdxById(obj);
        try {
            dbc_protocol[curCanId]["signals"][sigIdx]["valueMap"] = JSON.parse(obj.value);
            document.getElementById("input-signal-valueMap-error_" + sigIdx).hidden = true;
        } catch (e) {
            document.getElementById("input-signal-valueMap-error_" + sigIdx).hidden = false;
            dbc_protocol[curCanId]["signals"][sigIdx]["valueMap"] = {};
            console.log(e);
        }
    }
}

function updateCanBitData(data) {
    if (data["bytes"]) {
        data["bytes"].forEach((byte, index) => {
            let byte_value_dom = document.getElementById("byte_value_" + index);
            // if (parseInt(byte_value_dom.innerText, 16) !== byte) {
            byte_value_dom.innerText = byteToHex(byte);
            let s = byteToBin(byte);
            for (let i = 0; i < 8; i++) {
                let dom = document.getElementById("bit_value_" + (index * 8 + i));
                let bitValue = s.charAt(7 - i);
                let nowMs = new Date().getTime();
                let lastUpdateTime;
                if (dom.innerText !== bitValue || !dom.hasAttribute("lastUpdateTime")) {
                    dom.innerText = bitValue;
                    dom.setAttribute("lastUpdateTime", nowMs.toString());
                    lastUpdateTime = nowMs;
                } else {
                    lastUpdateTime = Number.parseInt(dom.getAttribute("lastUpdateTime"));
                }
                let colorValue = (nowMs - lastUpdateTime) / 10;
                colorValue = colorValue > 255 ? 255 : colorValue;
                dom.parentElement.style.backgroundColor = "rgb(" + 255 + "," + 255 + "," + colorValue + ")";
            }
        });
    }
}

function dbcCalSignalValue(stdId, sigIdx, sig, data) {
    if (!sig) {
        return;
    }
    let v = Utils_ByteSub(data, sig["startBit"], sig["bitLen"], sig["byteOrder"]);
    if (sig["isSigned"] === 1) {
        v = Utils_ToSigned(v, sig["bitLen"]);
    }
    let outValue = v * sig["factor"] + sig["offset"];
    if(outValue.toString() in sig["valueMap"]){
        outValue = sig["valueMap"][outValue.toString()];
    }
    dbc_protocol[stdId]["signals"][sigIdx]["value"] = outValue;
    // console.log(sig["name"], v, dbc_protocol[stdId]["signals"][sigIdx]["value"]);
}

function dbcCalMsgSignalValue(stdId, data) {
    if (!data) {
        return;
    }
    dbc_protocol[stdId]["signals"].forEach((sig, index) => {
        dbcCalSignalValue(stdId, index, sig, data)
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
    if (curCanId === undefined) {
        return;
    }
    let bitIdx = getIdxById(obj);
    if (!(curCanId in dbc_protocol)) {
        dbc_protocol[curCanId] = {
            "name": document.getElementById("input-msg-name").value,
            "byteNum": Number(document.getElementById("input-msg-size").value),
            "signals": []
        }
    }
    if (bitClickStart >= 0) {
        let dbc_p = dbc_protocol[curCanId];
        let signal = {
            "name": "Signal_" + (dbc_p["signals"].length + 1),
            "isSigned": 0,
            "factor": 1,
            "offset": 0,
            "valueMap": {},
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
        dbc_protocol[curCanId]["signals"].push(signal);
        updateDbcSignalView(false);
        bitClickStart = -1;
    } else {
        bitClickStart = bitIdx;
    }
}

function deleteSignal(canId, signalIdx) {
    dbc_protocol[canId]["signals"][signalIdx] = undefined;
    updateDbcSignalView(true);
}

function deleteCurMsg() {
    if (curCanId && curCanId in dbc_protocol) {
        delete dbc_protocol[curCanId];
        updateCanNameView(curCanId);
        updateDbcSignalView(true);
    }
}

let plotCharts = [];
let plotChartSignal = [];

function addPlotChart() {
    let chartIdx = plotCharts.length;
    let tmp = document.createElement("div");
    tmp.id = "signal-plot_" + chartIdx;
    tmp.innerHTML = String.format("<div><button onclick='removePlotSignal({0})'>unplot</button> " +
        "Time: <label id='signal-plot-time_{0}'></label> " +
        "PlotCount: <input id='signal-plot-count_{0}' type='number' value='100' class='input-number'/>" +
        "Value: <label id='signal-plot-value_{0}'></label>" +
        "</div>" +
        "<canvas id=\"signal-plot-chart_{0}\"></canvas>", chartIdx);
    document.getElementById("signal-plot").insertBefore(tmp, document.getElementById("signal-plot").firstChild);
    let ctx = document.getElementById("signal-plot-chart_" + chartIdx).getContext("2d");
    let myNewChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "",
                bezierCurve: false,
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,1)",
                pointColor: "rgba(220,220,220,1)",
                pointStrokeColor: "#fff",
                data: []
            }]
        }
    });
    plotCharts.push(myNewChart);
}

function updatePlotView(canId) {
    plotChartSignal.forEach((s, idx) => {
        if (s && canId === s.canId) {
            dbc_protocol[canId]["signals"].forEach((sig, index) => {
                if (index === s.signalIdx) {
                    dbcCalSignalValue(canId, index, sig, can_info[canId]["bytes"]);
                    let maxCount = Number(document.getElementById("signal-plot-count_" + idx).value);
                    if (plotCharts[idx].config.data.labels.length > maxCount) {
                        plotCharts[idx].config.data.labels = plotCharts[idx].config.data.labels.slice(Math.floor(maxCount * 0.2), maxCount);
                        plotCharts[idx].config.data.datasets[0].data = plotCharts[idx].config.data.datasets[0].data.slice(Math.floor(maxCount * 0.2), maxCount);
                        plotCharts[idx].update(0);
                    }
                    plotCharts[idx].config.data.labels.push(can_info[canId]["count"]);
                    plotCharts[idx].config.data.datasets[0].data.push(dbc_protocol[canId]["signals"][index]["value"]);
                    plotCharts[idx].config.data.datasets[0].label = dbc_protocol[canId]["signals"][index]["name"];
                    plotCharts[idx].update();
                    document.getElementById("signal-plot-value_" + idx).innerText = dbc_protocol[canId]["signals"][index]["value"].toFixed(4);
                    document.getElementById("signal-plot-time_" + idx).innerText = new Date().Format("HH:mm:ss");
                }
            });
        }
    });
}

function plotSignal(canId, signalIdx) {
    addPlotChart();
    plotChartSignal.push({
        canId: canId,
        signalIdx: signalIdx,
    });
}

function removePlotSignal(chartIdx) {
    plotChartSignal[chartIdx] = undefined;
    let d = document.getElementById("signal-plot_" + chartIdx);
    d.parentNode.removeChild(d);
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
    if (clear) {
        document.getElementById("signals-list").innerHTML = "";
    }
    clearBitsView();
    if (!(curCanId in dbc_protocol)) {
        return;
    }
    let dbc_p = dbc_protocol[curCanId];
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
                    "                    <div>ValueMap: <input onchange=\"dbcEditOnChange(this)\" id=\"input-signal-valueMap_{3}\" type=\"text\" value=\"\"><label id=\"input-signal-valueMap-error_{3}\" hidden='hidden'>格式错误</label></div>\n" +
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
            document.getElementById("input-signal-valueMap_" + index).value = JSON.stringify(sig["valueMap"]);

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
            if (endBit % 8 === 7 || endBit < 0) {
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
    const SG_pattern = /.*SG_\s+(.*)\s+:\s+([0-9]+)\|([0-9]+)\s*@\s*([0-9]+)\s*([\+\-]+)\s+\(\s*([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)\)/;
    const BO_pattern = /BO_\s+([0-9]+)\s+(.*)\s*:\s+([0-9]+)/;

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
                        "valueMap": {},
                        "value": 0,
                    })
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

    saveJson();
}

function saveJson() {
    let text = JSON.stringify(dbc_protocol);
    console.log(text);
    exportRaw(new Date().Format("yyyy-MM-dd_HH-mm-ss") + ".json", text);
}

function canInfoSelectorOnClick(item) {
    let selectors = document.getElementById("can-info-selector");
    for (let i = 0; i < selectors.children.length; i++) {
        let obj = selectors.children[i]
        obj.className = obj.className.replace(" is-selected", "");
    }
    item.className += " is-selected";
    let tables = document.getElementById("can-data-list").getElementsByTagName("table");

    for (let i = 0; i < tables.length; i++) {
        tables[i].style.display = "none";
    }
    if (item.id === "can-info-selector-ID") {
        document.getElementById("can-data-list-ID").style.display = "";
        isUpdateSgInfo = false;
    } else if (item.id === "can-info-selector-SG") {
        document.getElementById("can-data-list-SG").style.display = "";
        isUpdateSgInfo = true;
        // 暴力清理下重来
        sg_info = {};
        document.getElementById("tbody-sg-data").innerHTML = "";

        for (let id in dbc_protocol) {
            updateSgInfo(id, undefined);
        }
    }
}
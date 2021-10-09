let dbc_protocol = {};

let curCanId = undefined;
let can_info = {};

function dbcAnalyzer(data) {
    console.log("dbcAnalyzer");
    let id = (data[2] & 0xFF) + ((data[3] & 0xFF) << 8);

    let can_data = Array.from(data.subarray(4, 12));
    updateCanInfo(id, can_data);
    if (curCanId && curCanId === id) {
        updateDbcInfo(id, can_info[id]);
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
    can_info[stdId]["bytes"] = data;
    document.getElementById("can_bytes_" + stdId).innerText = bytesToHex(can_info[stdId]["bytes"]);
    can_info[stdId]["count"] += 1;
    if (stdId in dbc_protocol) {
        can_info[stdId]["name"] = dbc_protocol[stdId]["name"];
        document.getElementById("can_name_" + stdId).innerText = can_info[stdId]["name"];
    }
    document.getElementById("can_count_" + stdId).innerText = can_info[stdId]["count"];
}

function canDataOnClick(obj) {
    console.log(obj);
    let l = obj.id.split("_");
    let id = Number(l[l.length - 1]);
    if (curCanId) {
        document.getElementById("can_data_" + curCanId).className =
            document.getElementById("can_data_" + curCanId).className.replace(" is-selected", "");
    }
    curCanId = id;
    updateDbcInfo(curCanId, can_info[curCanId]);
    obj.className += " is-selected";
}

function updateDbcInfo(stdId, data) {
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

    if (stdId in dbc_protocol) {
        dbcCalMsgValue(stdId, data["bytes"]);
    }
}

function byteToBin(byte) {
    let s = byte.toString(2);
    let len = s.length;
    while (len < 8) {
        s = "0" + s;
        len++;
    }
    return s;
}

function byteToHex(byte) {
    return (byte >>> 4).toString(16) + (byte & 0xF).toString(16);
}

function bytesToHex(bytes) {
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
        hex += byteToHex(bytes[i]) + " ";
    }
    return hex;
}

function Utils_ByteMask(start, end) {
    return (((0xFF << start) & (~(0xFF << (end + 1))))) & 0xFF;
}

/**
 * 字节裁剪
 * @param bytes
 * @param len
 * @param order
 * @return
 */
function Utils_ByteSub(bytes, startBit, len, order) {
    let i = 0;
    let ret = 0;
    let startByte = Math.floor(startBit / 8);
    let endByte = Math.floor((startBit + len) / 8);
    let msbBit; // 一个字节内大端位置 0-7
    let lsbBit; // 一个字节内小端位置 0-7

    if (startByte === endByte) {
        // 同一字节内，
        if (order === 0) { // 大端在前
            msbBit = startBit % 8;
            lsbBit = msbBit - len + 1;
            ret = (bytes[startByte] & Utils_ByteMask(lsbBit, msbBit));
            ret = ret >> lsbBit;
        } else {
            lsbBit = startBit % 8;
            msbBit = lsbBit - len + 1;
            ret = (bytes[startByte] & Utils_ByteMask(msbBit, lsbBit));
            ret = ret >> msbBit;
        }
    } else {
        if (order === 0) { // 大端在前
            msbBit = startBit % 8;
            lsbBit = 8 - ((len - (msbBit + 1)) % 8);
            ret = (bytes[startByte] & Utils_ByteMask(0, msbBit));
            for (i = startByte + 1; i < endByte; i++) {
                ret = (ret << 8) + (bytes[i] & 0xFF);
            }
            ret = (ret << (8 - lsbBit)) + (bytes[endByte] >> lsbBit);

        } else { // 小端在前
            lsbBit = startBit % 8;
            msbBit = (len + startBit) % 8 - 1;

            ret = (bytes[endByte] & Utils_ByteMask(0, msbBit));
            for (i = endByte - 1; i > startByte; i--) {
                ret = (ret << 8) + (bytes[i] & 0xFF);
            }
            ret = (ret << (8 - lsbBit)) + (bytes[startByte] >> lsbBit);
        }
    }

    return ret;
}

function dbcCalMsgValue(stdId, data) {
    dbc_protocol[stdId]["msg"].forEach((msg, index) => {
        let v = Utils_ByteSub(data, msg["startBit"], msg["bitLen"], msg["byteOrder"]);
        if (msg["isSigned"] === 1) {
            v = v << 0;
        }
        dbc_protocol[stdId]["msg"][index]["value"] = v * msg["factor"] + msg["offset"];
        console.log(msg["name"], v, dbc_protocol[stdId]["msg"][index]["value"]);
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
            "                <td id='bit_td_{0}' class=\"_1udfl3\"><span id='bit_value_{0}'>0</span><span id='bit_info_{0}' class=\"_viebo4\"></span></td>\n" +
            "                <td id='bit_td_{1}' class=\"_1udfl3\"><span id='bit_value_{1}'>0</span><span id='bit_info_{1}' class=\"_viebo4\"></span></td>\n" +
            "                <td id='bit_td_{2}' class=\"_1udfl3\"><span id='bit_value_{2}'>0</span><span id='bit_info_{2}' class=\"_viebo4\"></span></td>\n" +
            "                <td id='bit_td_{3}' class=\"_1udfl3\"><span id='bit_value_{3}'>0</span><span id='bit_info_{3}' class=\"_viebo4\"></span></td>\n" +
            "                <td id='bit_td_{4}' class=\"_1udfl3\"><span id='bit_value_{4}'>0</span><span id='bit_info_{4}' class=\"_viebo4\"></span></td>\n" +
            "                <td id='bit_td_{5}' class=\"_1udfl3\"><span id='bit_value_{5}'>0</span><span id='bit_info_{5}' class=\"_viebo4\"></span></td>\n" +
            "                <td id='bit_td_{6}' class=\"_1udfl3\"><span id='bit_value_{6}'>0</span><span id='bit_info_{6}' class=\"_viebo4\"></span></td>\n" +
            "                <td id='bit_td_{7}' class=\"_1udfl3\"><span id='bit_value_{7}'>0</span><span id='bit_info_{7}' class=\"_viebo4\"></span></td>\n" +
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
                    "msg": []
                }
                lastStdId = stdId;
                console.log(bo);
            }
            if (lastStdId) {
                let sg = item.match(SG_pattern);
                if (sg) {
                    dbc_protocol[lastStdId]["msg"].push({
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
    })
}
function fakeClick(obj) {
    let ev = document.createEvent("MouseEvents");
    ev.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    obj.dispatchEvent(ev);
}

function exportRaw(name, data) {
    let urlObject = window.URL || window.webkitURL || window;
    let export_blob = new Blob([data]);
    let save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
    save_link.href = urlObject.createObjectURL(export_blob);
    save_link.download = name;
    fakeClick(save_link);
}

function saveDbc() {
    const BO_template = "\r\nBO_ {0} {1}: {2} Car\r\n";
    const SG_template = " SG_ {0} : {1}|{2}@{3}{4} ({5},{6}) [0|1] \"\" MCU\r\n";
    let text = "";
    for (let stdId in dbc_protocol) {
        text += String.format(BO_template, stdId, dbc_protocol[stdId]["name"], dbc_protocol[stdId]["byteNum"]);
        dbc_protocol[stdId]["msg"].forEach((msg, index) => {
            text += String.format(SG_template,
                msg["name"],
                msg["startBit"],
                msg["bitLen"],
                msg["byteOrder"],
                msg["isSigned"] === 1 ? "-" : "+",
                msg["factor"],
                msg["offset"],
            );
        });
    }
    console.log(text);
    exportRaw(new Date().Format("yyyy-MM-dd_HH-mm-ss") + ".dbc", text);
}

String.format = function (src) {
    if (arguments.length === 0) return null;
    let args = Array.prototype.slice.call(arguments, 1);
    return src.replace(/\{(\d+)\}/g, function (m, i) {
        return args[i];
    });
};
// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "H+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
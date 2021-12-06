
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

function Utils_ToSigned(d, bitLen) {
    let max = (0x01 << bitLen) - 1;
    let signBitMask = 0x01 << (bitLen - 1);
    let isSign = (d & signBitMask) === signBitMask; // 是否是负数
    if (isSign) {
        return -1 * (max - d);
    } else {
        return d;
    }
}

function Utils_ByteSub2(bytes, startBit,bitLen,order) {
    let count = 1;
    let endBit = startBit;
    let value = 0;
    if (order === 0) {
        // 大端在前
        while (count <= bitLen) {
            count++;
            endBit--;
            if (endBit % 8 === 7) {
                endBit += 16;
            }
        }
    } else {
        while (count <= bitLen) {
            if (endBit%8)
            count++;
            endBit++;
        }
    }
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
    let endByte;
    let msbBit; // 一个字节内大端位置 0-7
    let lsbBit; // 一个字节内小端位置 0-7

    if (order === 0) { // 大端在前
        msbBit = startBit % 8;
        endByte = (len - (msbBit + 1)) / 8;
        if(endByte<=0){
            // 同一字节内
            lsbBit = msbBit - len + 1;
            ret = (bytes[startByte] & Utils_ByteMask(lsbBit, msbBit));
            ret = ret >> lsbBit;
        } else {
            endByte = Math.floor(endByte) + 1 + startByte;
            lsbBit = 8 - ((len - (msbBit + 1)) % 8);
            ret = (bytes[startByte] & Utils_ByteMask(0, msbBit));
            for (i = startByte + 1; i < endByte; i++) {
                ret = (ret << 8) + (bytes[i] & 0xFF);
            }
            ret = (ret << (8 - lsbBit)) + (bytes[endByte] >> lsbBit);
        }
    } else { // 小端在前
        endByte = Math.floor((startBit + len) / 8);
        if (startByte === endByte) {
            lsbBit = startBit % 8;
            msbBit = lsbBit + len - 1;
            ret = (bytes[startByte] & Utils_ByteMask(lsbBit, msbBit));
            ret = ret >> lsbBit;
        } else {
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

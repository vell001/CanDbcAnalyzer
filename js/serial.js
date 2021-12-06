let port;
let reader;
let writer;
let closed = true;
let isChecksum = true;

async function openSerial(baud) {
    if (document.getElementById("btnOpenSerial").innerText === "打开串口") {
        port = await navigator.serial.requestPort();
        await port.open({baudRate: baud});
        reader = port.readable.getReader();
        writer = port.writable.getWriter();
        // set how to write to device intervally
        // const writeInt = setInterval(async () => {
        //     const commandFrame = new Uint8Array([
        //         0xF1, 0x05, 0x80, 0x02, 0x00, 0x3F, 0x01, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00
        //     ]);
        //     commandFrame[12] = checksumAdd(commandFrame.subarray(0, 12))
        //     await writer.write(commandFrame);
        // }, 1000); // send a frame every 3000ms

        if (port.readable) {
            document.getElementById("btnOpenSerial").innerText = "关闭串口";
            closed = false;
        }
        while (port.readable && !closed) {
            try {
                while (true) {
                    const {value, done} = await reader.read();
                    if (done) {
                        // Allow the serial port to be closed later.
                        reader.releaseLock();
                        // Allow the serial port to be closed later.
                        writer.releaseLock();
                        break;
                    }
                    if (value) {
                        /*** TODO: deal with the data value ***/
                        // console.log(value);

                        try {
                            parseData(value);
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
            } catch (error) {
                // Handle non-fatal read error.
                console.error(error);
            } finally {
                console.log(port.readable);
            }
        }
        // clearInterval(writeInt);
        document.getElementById("btnOpenSerial").innerText = "打开串口";
        await port.close();
        closed = true;
    } else {
        closed = true;
        reader.cancel();
    }
}

let canData = new Uint8Array(13);
let canDataIdx = 0;
let dataTempList = [];

function parseData(data) {
    for (let i = 0; i < data.length; i++) {
        dataTempList.push(data[i]);
    }
    while (dataTempList.length > canDataIdx) {
        let b = dataTempList[canDataIdx];
        if (canDataIdx === 0 && b === 0xF1) {
            canData[canDataIdx] = b;
            canDataIdx++;
        } else if (canDataIdx === 1 && b === 0x05) {
            canData[canDataIdx] = b;
            canDataIdx++;
        } else if (canDataIdx > 1 && canDataIdx < 12) {
            canData[canDataIdx] = b;
            canDataIdx++;
        } else if (canDataIdx === 12) {
            let isDataOk = false;
            if (isChecksum) {
                canData[12] = checksumAdd(canData.subarray(0, 12))
                if (b === canData[12]) {
                    dbcAnalyzer(canData);
                    isDataOk = true;
                } else {
                    console.log("checksum error", canData[12], b);
                }
            } else {
                dbcAnalyzer(canData);
                isDataOk = true;
            }

            if (!isDataOk) {
                dataTempList.shift();
            } else {
                dataTempList.splice(0, canDataIdx + 1);
            }

            canDataIdx = 0;
        } else {
            dataTempList.shift();
            canDataIdx = 0;
        }
    }
}

function checksumCheckOnChange() {
    isChecksum = document.getElementById("withCheckSum").checked === "checked";
}

function checksumAdd(data) {
    let sum = 0;
    data.forEach((item, index) => {
        sum += item;
    });
    return sum & 0xff;
}

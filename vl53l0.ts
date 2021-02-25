
const VL53L0X_REG_IDENTIFICATION_MODEL_ID      		   =  0xc0
const VL53L0X_REG_IDENTIFICATION_REVISION_ID      	   =  0xc2
const VL53L0X_REG_PRE_RANGE_CONFIG_VCSEL_PERIOD   	   =  0x50
const VL53L0X_REG_FINAL_RANGE_CONFIG_VCSEL_PERIOD 	   =  0x70
const VL53L0X_REG_SYSRANGE_START                 	   =  0x00
const VL53L0X_REG_RESULT_INTERRUPT_STATUS        	   =  0x13
const VL53L0X_REG_RESULT_RANGE_STATUS            	   =  0x14
const VL53L0X_REG_I2C_SLAVE_DEVICE_ADDRESS        	   =  0x8a
const VL53L0X_I2C_ADDR								   =  0x29
const VL53L0X_REG_SYSTEM_RANGE_CONFIG			       =  0x09
const VL53L0X_REG_VHV_CONFIG_PAD_SCL_SDA__EXTSUP_HV    =  0x89
const VL53L0X_REG_SYSRANGE_MODE_SINGLESHOT             =  0x00
const VL53L0X_REG_SYSRANGE_MODE_START_STOP             =  0x01
const VL53L0X_REG_SYSRANGE_MODE_BACKTOBACK             =  0x02
const VL53L0X_REG_SYSRANGE_MODE_TIMED                  =  0x04

const VL53L0X_DEVICEMODE_SINGLE_RANGING	               =  0x00
const VL53L0X_DEVICEMODE_CONTINUOUS_RANGING	           =  0x01
const VL53L0X_DEVICEMODE_CONTINUOUS_TIMED_RANGING      =  0x03
const VL53L0X_DEFAULT_MAX_LOOP                         =  200

const I2C_DevAddr                                      =  0x29

enum MODE{
    //% block=Single
    Single,
    //% block=Continuous
    Continuous,
}
enum PRECISION{
    //% block=High
    High,
    //% block=Low
    Low, 
}
let _newAddr:number = I2C_DevAddr,_state:number,_mode:number,ambientCount:number,signalCount:number,distance:number,status:number
//% weight=20 color=#e7660b icon="\uf185" block="Laser Ranging Sensor"
namespace VL53L0 {

//% blockId=VL53L0_Begin block="Initialize sensor"
//% weight=100
export function Initializesensor():void{
    let val1
    dataInit();
    setDeviceAddress(120);
    val1 = readByteData(VL53L0X_REG_IDENTIFICATION_REVISION_ID);
    val1 = readByteData(VL53L0X_REG_IDENTIFICATION_MODEL_ID);
}

//% blockId=VL53L0_SetMode block="Setup mode %mode and precision %precisionState"
//% weight=90
export function setMode(mode:MODE, precisionState:PRECISION):void{
    _mode = mode;
    switch(precisionState){
    case PRECISION.High:
        writeByteData(VL53L0X_REG_SYSTEM_RANGE_CONFIG,1);
        _state = PRECISION.High;
        break;
    default:
        writeByteData(VL53L0X_REG_SYSTEM_RANGE_CONFIG,0);
        _state = PRECISION.Low;
    }
}

//%blockId=VL53L0_Start block="start measuring"
//% weight=80
export function start():void{
    let Byte = VL53L0X_REG_SYSRANGE_MODE_START_STOP;
    writeByteData(0x80, 0x01);
	writeByteData(0xFF, 0x01);
	writeByteData(0x00, 0x00);
	writeByteData(0x91, 0x3c);
	writeByteData(0x00, 0x01);
	writeByteData(0xFF, 0x00);
	writeByteData(0x80, 0x00);

    switch(_mode){
    case VL53L0X_DEVICEMODE_SINGLE_RANGING:
        writeByteData(VL53L0X_REG_SYSRANGE_START, 0x01);
        let LoopNb = 0;
		do {
			if (LoopNb > 0){
                Byte = readByteData(VL53L0X_REG_SYSRANGE_START);
            }
			    LoopNb = LoopNb + 1;
		} while (((Byte & VL53L0X_REG_SYSRANGE_MODE_START_STOP) == VL53L0X_REG_SYSRANGE_MODE_START_STOP) && 
				(LoopNb < VL53L0X_DEFAULT_MAX_LOOP));
			break;
    case VL53L0X_DEVICEMODE_CONTINUOUS_RANGING:
        writeByteData(VL53L0X_REG_SYSRANGE_START, VL53L0X_REG_SYSRANGE_MODE_BACKTOBACK);
		break;
    default:
        serial.writeString("error");
    }
}

//% blockId=VL53L0_Stop block="stop measuring"
//% weight=70
export function stop():void{
    writeByteData(VL53L0X_REG_SYSRANGE_START, VL53L0X_REG_SYSRANGE_MODE_SINGLESHOT);
	
	writeByteData(0xFF, 0x01);
	writeByteData(0x00, 0x00);
	writeByteData(0x91, 0x00);
	writeByteData(0x00, 0x01);
	writeByteData(0xFF, 0x00);
}

//% blockId=VL53L0_getDistance block="get Distance(mm)"
//% weight=60
export function getDistance():number{
    let _distance,ret;
    readVL53L0X();
	if(distance == 20)
		distance = _distance;
	else
		_distance = distance;
	if(_state ==PRECISION.High){
        if(distance == 0 || distance == null){
            ret = 0
        }else{
            ret = distance/4.0;
        }
    }else{
        if(distance == 0 || distance == null){
            ret = 0
        }else{
            ret = distance;
        }
    }
        return ret;
}

function readVL53L0X():void{
    let buf = pins.createBuffer(1);
    buf[0] = VL53L0X_REG_RESULT_RANGE_STATUS;
    pins.i2cWriteBuffer(_newAddr, buf)
    let buffer = pins.i2cReadBuffer(_newAddr, 12)
    ambientCount = ((buffer[6] & 0xFF) << 8) | (buffer[7] & 0xFF);
    signalCount = ((buffer[8] & 0xFF) << 8) | (buffer[9] & 0xFF);
    distance = ((buffer[10] & 0xFF) << 8) | (buffer[11] & 0xFF);
    status = ((buffer[0] & 0x78) >> 3);
}
function dataInit():void{
    let data1 = readByteData(VL53L0X_REG_VHV_CONFIG_PAD_SCL_SDA__EXTSUP_HV);
    let data =(data1 & 0xfe)|0x01;
    writeByteData(VL53L0X_REG_VHV_CONFIG_PAD_SCL_SDA__EXTSUP_HV,data);
}

function setDeviceAddress(newAddr:number):void{
    newAddr &= 0x7F;
    writeByteData(VL53L0X_REG_I2C_SLAVE_DEVICE_ADDRESS, newAddr);
    _newAddr = newAddr;

}

function writeByteData(reg:number, byte:number):void{
    let buf1 = pins.createBuffer(2);
    buf1[0] = reg;
    buf1[1] = byte;
    pins.i2cWriteBuffer(_newAddr, buf1)
}

function readByteData(reg:number):number{
    let buf = pins.createBuffer(1);
    buf[0] = VL53L0X_REG_VHV_CONFIG_PAD_SCL_SDA__EXTSUP_HV;
    pins.i2cWriteBuffer(0x10, buf);
    let buffer =pins.i2cReadBuffer(I2C_DevAddr, 1);
    return buffer[0];
}
}
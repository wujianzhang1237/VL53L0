VL53L0.Initializesensor()
VL53L0.setMode(MODE.Single, PRECISION.Low)
basic.forever(function () {
    VL53L0.start()
    basic.showNumber(VL53L0.getDistance())
    VL53L0.stop()
})
'use strict'
class Utility{

    checkConnected(devices){
        for(let key in devices){
            if(devices[key]['connected'] === false)
                return false
        }
        return true
    }
    isEmpty(obj) {
        if(typeof obj == 'undefined')
            return true
        return Object.keys(obj).length === 0
    }
    convertDecColorToRGB (dec) {
        let r = Math.floor(dec / (256 * 256))
        let g = Math.floor(dec / 256) % 256
        let b = dec % 256
        return  r +', ' + g + ', ' + b
    }
    delay(callback, ms) {
        var timer = 0
        return function() {
            var context = this, args = arguments
            clearTimeout(timer)
            timer = setTimeout(function () {
                callback.apply(context, args)
            }, ms || 0)
        }
    }
    valueTotalRatio(value, min, max) {
        return ((value - min) / (max - min)).toFixed(2)
    }

     getLinearGradientCSS(ratio, leftColor, rightColor) {
        return [
            '-webkit-gradient(',
            'linear, ',
            'left top, ',
            'right top, ',
            'color-stop(' + ratio + ', ' + leftColor + '), ',
            'color-stop(' + ratio + ', ' + rightColor + ')',
            ')'
        ].join('')
    }

     updateRangeEl(rangeEl) {
        let ratio = this.valueTotalRatio(rangeEl.value, rangeEl.min, rangeEl.max)
        rangeEl.style.backgroundImage = this.getLinearGradientCSS(ratio, '#919e4b', '#c5c5c5')
    }

     initRangeEl(el) {
         let rangeEl = el.querySelector('input[type=range]')
         let textEl = el.querySelector('input[type=text]')
         this.updateRangeEl(rangeEl)
         rangeEl.addEventListener("input", (e) => {
            this.updateRangeEl(e.target)
            textEl.value = e.target.value

         })
         return rangeEl

    }
}
module.exports = Utility
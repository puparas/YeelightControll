'use strict'

const { ipcRenderer, desktopCapturer } = require('electron')
const FastAverageColor = require('fast-average-color')
const elPrefix = "lightElement_"
const modsList = ['ambilight']
const Vibrant = require('node-vibrant')
const fac = new FastAverageColor()

const timers = []

let pressed = false

ipcRenderer.on('add', (event, device) => {
    let $elNode = getNodeByTemplate(device)
    document.querySelector('.elementsTable').appendChild($elNode)
})
ipcRenderer.on('update', (event, NewState) => {
    let $elNode = getNodeByTemplate(NewState)
    document.querySelector('.elementsTable').replaceChild($elNode, document.querySelector('.' + elPrefix + NewState["id"]))

})
ipcRenderer.on('selectedSource', (event, params) => {
    if (!params.source){
        let checkedEl = document.querySelector('.lightElement_' + params.lightElementId + ' .switchDiv input:checked')
        checkedEl.checked = false
        return
    }
    startAmbilight(params.source, params.lightElementId)
})

function sendCommand(deviceNode=false, deviceId, command, value = '', effect, duration){
    if (deviceNode){
        deviceNode.classList.add("disabled")
    }
    ipcRenderer.send('sendCommand', [deviceId, command, value, effect, duration])
}
// Отправка команды для теста. формат  {"id":200,"method":"set_default","params":[]}
function sendTestCommand(id, params){
    ipcRenderer.send('sendTestCommand', [id, params])
}
function addListeners(el){
    el.querySelectorAll('.onclick').forEach((item, i) => {
        item.addEventListener('click', (event) => {
            let deviceNode = item.closest('.lightElement')
            let deviceId = deviceNode.id
            sendCommand(deviceNode, deviceId, item.dataset.command, item.value)
        })
    })
    el.querySelectorAll('.onchange').forEach((item, i) => {
        let deviceNode = item.closest('.lightElement')
        let deviceId = deviceNode.id
        item.addEventListener('change', (event) => {
            sendCommand(deviceNode, deviceId, item.dataset.command, item.value)
        })
    })
    el.querySelectorAll('.parametrsWithRange').forEach(item => {
        initRangeEl(item);
    });
    el.querySelectorAll('.ambilight').forEach(item => {
        item.addEventListener('change', (event) => {
            let deviceNode = item.closest('.lightElement')
            let deviceId = deviceNode.id
        if (item.checked){
            ipcRenderer.send('selectSource', deviceId)
        }else{
                ipcRenderer.send('ambilightOff', deviceId)
                if (timers[deviceId]){
                    stopAmbilight(deviceId)
                }
        }

        })
    });

    // el.querySelector('.textarea').addEventListener('keyup', (e) => {
    //     if (e.key.length>1) return false
    //     let deviceNode = e.target.closest('.lightElement')
    //     let deviceId = deviceNode.id
    //     let rawtext = e.target.innerText
    //     let value = rawtext.match(/([0-9]),? ?/gi).filter(Boolean).join('')
    //     if (!(e.key % 1 == 0) && e.key != ','){
    //         if (value){
    //             value = formatInput(value)
    //             e.target.innerHTML = value
    //         }else{
    //             e.target.innerHTML = ''
    //         }
    //         placeCaretAtEnd(e.target)
    //     }
    //     if (e.key == ','){
    //         // Удаляем пробелы, разбиваем по запятой, удаляем путсные значения в массиве после сплитования
    //         value = formatInput(value)
    //         e.target.innerHTML = value
    //         placeCaretAtEnd(e.target)
    //     }
    //     if (rawtext.split(',').filter(Boolean).length % 4 == 0){
    //         e.target.dataset.valid = 'true'
    //     }else{
    //         e.target.dataset.valid = 'false'
    //     }
    // })

    // el.querySelector('.button_cf_start').addEventListener('click', (e) =>{
    //     let button = e.target
    //     let buttonGroup = button.closest('.cf_buttons')
    //     let valid = button.closest('.lightElement').querySelector('.textarea').dataset.valid
    //     let deviceNode = e.target.closest('.lightElement')
    //     let deviceId = deviceNode.id
    //     if(valid == 'true'){
    //         // {"id":1,"method":"start_cf","params":[ 4, 2, "1000, 2, 2700, 100, 500, 1,
    //         //     255, 10, 5000, 7, 0,0, 500, 2, 5000, 1"]}
    //         buttonGroup.classList.add('started')
    //         let form = deviceNode.querySelector('.colorFlowForm')
    //         let count = parseInt(form.querySelector('.count').value)
    //         let action = parseInt(form.querySelector('.action').value)
    //         let fe = form.querySelector('.textarea').innerText.split(',').filter(Boolean).join(',')
    //         sendTestCommand(deviceId, {"id":666,"method":"start_cf", "params":[ count, action, fe]})
    //     }
    // })
    // el.querySelector('.button_cf_ctop').addEventListener('click', (e) =>{
    //     console.log('stoped')
    //     let button = e.target
    //     let deviceNode = e.target.closest('.lightElement')
    //     let deviceId = deviceNode.id
    //     sendTestCommand(deviceId, {"id":666,"method":"stop_cf", "params":[]})
    // })

    return el


}
function placeCaretAtEnd(el) {
        el.focus();
        let range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

}
function getNodeByTemplate(itemArray){
    let templateChecks = ''
    for (let mod of modsList){
        templateChecks += `<div class="switchDiv"><p>${mod}</p><label class="switch" for="checkbox_${itemArray.id}">
        <input type="checkbox" ${itemArray['mods'][mod]} class="${mod}" id="checkbox_${itemArray.id}" />
        <div class="slider round"></div>
        </label></div>`
    }

    let str = `<div id="${itemArray.id}" class="lightElement_${itemArray.id} lightElement">
    <div class="light_${itemArray.id} light name">
        <span class="colorPiker" style="background-color:rgb(${(itemArray['color_mode'] == 2) ? '255, 255, 255' : convertDecColorToRGB(itemArray['rgb'])});">
        <input class="onchange" data-command="set_rgb" type="color"></span> ${itemArray.name}
            <sup>
                <div class="onOff power onclick" data-command="toggle">
                    <img src="./img/${itemArray['power']}.png" alt="">
                </div>
            </sup>
        </div>
        <div class="lightStatus_${itemArray.id} lightStatus">
            <div class="parametrs parametrsWithRange">
                <span class="paramName">Яркость</span>
                <input class="onchange" data-command="set_bright" type="range" value="${itemArray['bright']}" min="1" max="100" step="1" />
                <input class="brightCounter" type="text" value="${itemArray['bright']}" size="3" />
            </div>
            <div class="parametrs parametrsWithRange">
                <span class="paramName">Цветовая температура</span>
                <input class="onchange" data-command="set_ct_abx" type="range" value="${itemArray['ct']}" min="1700" max="6500" step="1" />
                <input class="CtCounter" type="text" value="${itemArray['ct']}" size="4" />
            </div>
            <div class="modes">${templateChecks}</div>
            <!--<div class='colorFlowForm'>
                <label>Повторений <span title='0 = ∞, умол. 0'>⁇</span>
                    <input data-name='count' class='count cf-input' placeholder='0' value='0'>
                </label>
                <label> Постсостояние <span title='Состояние после окончания (0 - состояние до начала, 1 - последнее состояние на момент окончания, 2 - выкл., умол. 1)'>⁇</span>
                    <input data-name='action' class='action cf-input' placeholder='1' value='1'>
                </label>
                <div class="label">
                    <div class="textarea" data-valid='false'  data-name='flow_expression' contenteditable="true"></div>
                </div>
                <div class="cf_buttons"><div class="button_cf_start">Запустить</div> <div class="button_cf_ctop">X</div></div>
            </div>-->
        </div>
    </div>`

    let parser = new DOMParser()
    let doc = parser.parseFromString(str, 'text/html')
    let $el = doc.querySelector('div')
    $el = addListeners($el)
    return $el
}
function convertDecColorToRGB (dec) {
    let r = Math.floor(dec / (256 * 256));
    let g = Math.floor(dec / 256) % 256;
    let b = dec % 256;
    return  r +', ' + g + ', ' + b
}


function formatInput(val){
    let valArray = val.trim().split(',').filter(Boolean).map((i) => {return i.trim()})
    valArray = chunkArray(valArray, 4)
    let str = ''
    for (let chunk of valArray){
        str += `<span>${chunk.join(', ')}, </span>`
    }
    return str
}
// слайдер яркости
function valueTotalRatio(value, min, max) {
    return ((value - min) / (max - min)).toFixed(2);
}

function getLinearGradientCSS(ratio, leftColor, rightColor) {
    return [
        '-webkit-gradient(',
        'linear, ',
        'left top, ',
        'right top, ',
        'color-stop(' + ratio + ', ' + leftColor + '), ',
        'color-stop(' + ratio + ', ' + rightColor + ')',
        ')'
    ].join('');
}

function updateRangeEl(rangeEl) {
    let ratio = valueTotalRatio(rangeEl.value, rangeEl.min, rangeEl.max);
    rangeEl.style.backgroundImage = getLinearGradientCSS(ratio, '#919e4b', '#c5c5c5');
}

function initRangeEl(el) {
    let rangeEl = el.querySelector('input[type=range]');
    let textEl = el.querySelector('input[type=text]');
    updateRangeEl(rangeEl);
    rangeEl.addEventListener("input", function (e) {
        updateRangeEl(e.target);
        textEl.value = e.target.value;
    });

}

function chunkArray(arr, size) {
    let index = 0;
    let arrayLength = arr.length;
    let tempArray = [];

    for (index = 0; index < arrayLength; index += size) {
        let myChunk = arr.slice(index, index + size);
        tempArray.push(myChunk);
    }

    return tempArray;
}

function stopAmbilight(deviceId){
    clearInterval(timers[deviceId])
    timers[deviceId] = null
}

function startAmbilight(sourceId, deviceId){

    timers[deviceId] = setInterval(()=>{
        desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async sources => {
            for (const source of sources) {
                if (source.id == sourceId) {
                    let bufferJpg = source.thumbnail.toJPEG(50)
                    let bufferRaw = source.thumbnail.getBitmap()
                    const color1 = fac.getColorFromArray4(bufferRaw, {
                        'algorithm': 'dominant'
                    });
                    let vibrant = new Vibrant(bufferJpg, {})
                    vibrant.getPalette().then((palette) => {
                        if (document.querySelector('.colorAverege').checked){
                            let colortest = [(color1[2] + palette.Vibrant.rgb[0]) / 2, (color1[1] + palette.Vibrant.rgb[1]) / 2, (color1[0] + palette.Vibrant.rgb[2]) / 2]
                            sendCommand(false, deviceId, 'set_hsv', colortest, 'smooth', 800)
                        }else if (document.querySelector('.colorTest').checked){

                            sendCommand(false, deviceId, 'set_hsv', palette.Vibrant.rgb, 'smooth', 800)
                        }else{

                            sendCommand(false, deviceId, 'set_hsv', [color1[2], color1[1], color1[0]], 'smooth', 800)

                        }

                    });
                }
            }
        })

    }, 1300)

}



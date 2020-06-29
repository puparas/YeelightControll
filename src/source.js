
const { ipcRenderer, desktopCapturer } = require('electron')
ipcRenderer.on('sources', async () => {

    let sources = await getSources()
    for(source of sources){
        if (source.name == 'Yeelight control') {continue}
        let isMonitor = (source.display_id != '')
        let selectorToAppend = (isMonitor) ? '.monitors' : '.windows'
        $elNode = getNodeByTemplate(source)
        document.querySelector(selectorToAppend).appendChild($elNode)
        handleStream(source.id , source)
    }

})

async function getSources() {
    const sources = [];
    const sourcesArray = await desktopCapturer.getSources({
        types: ['window', 'screen']
    });

    sourcesArray.forEach(sourceItem => sources.push(sourceItem));
    return sources
}



function handleStream(id, source) {
    let validId = clearColon(id)
    let myArray = source.thumbnail.toJPEG(100)
    let blob = new Blob([myArray], { 'type': 'image/png' });
    let URL = window.URL.createObjectURL(blob);
    let img = document.querySelector('.img_' + validId)
    img.src = URL
}

function handleError(e) {
    console.log(e)
}

function getNodeByTemplate(source) {
    let validId = clearColon(source.id)
    let str = `<div class="monitor" >
            <img data-id="${source.id}" src='' class='img_${validId} imagePreview'>
            <span class="name">${source.name}</span>
            </div>`
   // <video data-id="${source.id}" class="video_${validId}" src=""></video>
    let template = document.createElement('template');
    str = str.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = str;
    $el = template.content.firstChild;
    addListeners($el)
    return $el
}

function addListeners(el) {
    el.addEventListener('click', (event) => {
        $this = event.target
        selectedItem = $this.dataset.id
        ipcRenderer.send('selected', selectedItem)
        window.close()
    })
    return el
}
function clearColon(str){
    return str.replace(/:/g, '')
}
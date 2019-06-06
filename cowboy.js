// model z tutorialu: https://youtu.be/DiIoWrOlIRw

// model zamieniony z .dae na .json za pomoca modulu collada-dae-parser

// inne moduły:
// keyframes-to-dual-quats - konwertuje matryce łączeń w tablice 'dual quaternion'

// load-collada-dae - parsuje dane z .dae do buffera WebGl

// raf-loop - biblioteka ktora renderuje petle z minimalnym requestAnimationFrame, 
// co zwieksza performens w przegladarce

// skeletal-animation-system - moduł który pomaga w animacjach bazujących na 'dual quaternions'


// tworzymy canvas na ktorym bedzie wysweitlany model webgl
var canvas = document.createElement('canvas')
canvas.width = 400
canvas.height = 400

var gl = canvas.getContext('webgl')
gl.enable(gl.DEPTH_TEST)

// tworzymy slider, ktorym bedziemy ustawiac mnoznik do keyframe animation
var playbackSlider = document.createElement('input')
playbackSlider.type = 'range'
playbackSlider.min = 0
playbackSlider.max = 2
playbackSlider.step = 0.01
playbackSlider.value = 1
playbackSlider.style.display = 'block'

// tworzymy element wyswietlajacy aktualne ustawienie 'szybkosci animacji'
var speedDisplay = document.createElement('span')
speedDisplay.innerHTML = 'Playback Speed: 100%'

// update na sliderze skutkuje updatem zmiennej i wyswietlania
var playbackSpeed = 1
playbackSlider.oninput = function () {
  playbackSpeed = playbackSlider.value
  speedDisplay.innerHTML = 'Playback Speed: ' + 
  (playbackSpeed * 100).toFixed(0) + '%'
}

// renderujemy elementy wczesniej stworzone DOM
var location = 
document.querySelector('#skeletal-animation-tutorial') 
|| document.body
location.appendChild(canvas)
location.appendChild(playbackSlider)
location.appendChild(speedDisplay)

// ladujemy model
var cowboyJSON = require('./cowboy.json')
var keyframesToDualQuats = require('keyframes-to-dual-quats')
cowboyJSON.keyframes = keyframesToDualQuats(cowboyJSON.keyframes)

// cowboyJSON.keyframes to matryce 4x4 reprezentujace wszystkie kosci 3d modelu w danej klatce czasowej
// konwertujemy je do dual Quats
// matematyczne wyjasnienie jest zlozone, ale dzieki temu nie b edziemy miec dziwnych znieksztalcen po
// interpolacji miedzy klatkami

// ladujemy textury i jak sie zaladuje to wrzucamy model do GPU
var cowboyModel
var texture = new window.Image()

texture.onload = function () {
  // We buffer our 3d model data on the GPU 
  // so that we can later draw it
  var loadCollada = require('load-collada-dae')
  cowboyModel = loadCollada(gl, cowboyJSON, {texture: texture})

  gl.useProgram(cowboyModel.shaderProgram)
}
texture.src = '/cowboy-texture.png'

//w petli bedziemy wyliczac gdzie chcemy miec laczenia bazujac na czasie
// bedziemy rysowac model z laczeniami w nowo obliczonych lokacjach
var secondsElapsed = 0

var renderLoop = require('raf-loop')
var animationSystem = require('skeletal-animation-system')

renderLoop(function (millisecondsSinceLastRender) {
  if (cowboyModel) {
    var uniforms = {
        // per-vertex lighting
        uUseLighting: true,
        uAmbientColor: [1, 0.9, 0.9],
        // NOTE: This lighting direction needs to be a normalized vector
        uLightingDirection: [1, 0, 0],
        uDirectionalColor: [1, 0, 0],
        // Move the model back 27 units so we can see it
        uMVMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0.0, 0.0, -27.0, 1],
        uPMatrix: 
        require('gl-mat4/perspective')([], Math.PI / 4, 400 / 400, 0.1, 100)
      }
        secondsElapsed += millisecondsSinceLastRender * playbackSpeed / 1000
        var interpolatedJoints = animationSystem.interpolateJoints({
        currentTime: secondsElapsed,
        keyframes: cowboyJSON.keyframes,
        jointNums: 
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        currentAnimation: {
            range: [6, 17],
            startTime: 0
        }
        }).joints
        // gdy mamy po interpolacji to dodajemy do skeletal animation shader uniforms
        for (var i = 0; i < 18; i++) {
            uniforms['boneRotQuaternions' + i] = interpolatedJoints[i].slice(0, 4)
            uniforms['boneTransQuaternions' + i] = interpolatedJoints[i].slice(4, 8)
           }
        // no i w koncu rysujemy
        cowboyModel.draw({
            attributes: cowboyModel.attributes,
            uniforms: uniforms
          })
  }
}).start()
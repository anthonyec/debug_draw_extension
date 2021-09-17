const code = `
(function() {
  let calleeId = 0;

  const dispatchExtensionMethod = (namespace, method, ...args) => {
    const event = new CustomEvent('extension-method', {
      detail: {
        id: calleeId,
        namespace,
        method,
        args
      }
    });

    document.dispatchEvent(event);
    calleeId += 1;
  };

  window.debug = {
    rect: (x, y, width, height, color) => dispatchExtensionMethod('DebugDraw', 'rect', x, y, width, height, color),
    line: (x1, y1, x2, y2, color) => dispatchExtensionMethod('DebugDraw', 'line', x1, y1, x2, y2, color),
    circle: (x, y, radius, color) => dispatchExtensionMethod('DebugDraw', 'circle', x, y, radius, color)
  };
})();
`;

const script = document.createElement('script');
script.innerHTML = code;
document.body.appendChild(script);

const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');

canvas.style.position = 'fixed';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.top = '0px';
canvas.style.left = '0px';
canvas.style.pointerEvents = 'none';
canvas.style.zIndex = '9999999';

document.body.appendChild(canvas);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

const scene = [];

function draw() {
  resizeCanvas();

  scene.forEach((node) => {
    if (node.type === 'rect') {
      context.strokeStyle = node.color;
      context.rect(node.x - window.scrollX, node.y - window.scrollY, node.width, node.height);
      context.stroke();
    }

    if (node.type === 'line') {
      context.strokeStyle = node.color;
      context.beginPath();
      context.moveTo(node.x1 - window.scrollX, node.y1 - window.scrollY);
      context.lineTo(node.x2 - window.scrollX, node.y2 - window.scrollY);
      context.stroke();
    }

    if (node.type === 'circle') {
      context.strokeStyle = node.color;
      context.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
    }
  });

  window.requestAnimationFrame(draw);
}

draw();

document.addEventListener('extension-method', (evt) => {
  console.log('extension-method', evt.detail);

  if (evt.detail.method === 'rect') {
    scene.push({
      type: 'rect',
      x: evt.detail.args[0],
      y: evt.detail.args[1],
      width: evt.detail.args[2],
      height: evt.detail.args[3],
      color: evt.detail.args[4]
    })
  }

  if (evt.detail.method === 'line') {
    scene.push({
      type: 'line',
      x1: evt.detail.args[0],
      y1: evt.detail.args[1],
      x2: evt.detail.args[2],
      y2: evt.detail.args[3],
      color: evt.detail.args[4]
    })
  }

  if (evt.detail.method === 'circle') {
    scene.push({
      type: 'circle',
      x: evt.detail.args[0],
      y: evt.detail.args[1],
      radius: evt.detail.args[2],
      color: evt.detail.args[3]
    })
  }
}, false);

// function registerDebugMethod() {

// }

// registerDebugMethod('drawRect', {
//   x: 0,
//   y: 0,
//   width: 0,
//   height: 0,
//   color: 'white'
// }, ({ context, x, y, width, height, color }) => {
//   context.strokeStyle = color;
//   context.rect(x, y, width, height);
//   context.stroke();
// });

// registerDebugMethod('drawLine', {
//   x1: 0,
//   y1: 0,
//   x2: 0,
//   y2: 0,
//   color: 'white'
// });

// registerDebugMethod('drawCircle', {
//   x: 0,
//   y: 0,
//   radius: 0,
//   color: 'white'
// });

// registerDebugMethod('drawText', {
//   x: 0,
//   y: 0,
//   radius: 0,
//   color: 'white'
// });

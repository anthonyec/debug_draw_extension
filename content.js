const WINDOW_API_STRINGS = [];
const DRAW_METHODS = {};
const SCENE = [];

function zip(arrA = [], arrB = []) {
  let props = {};

  // Intentionally not using reduce ;--)
  arrA.forEach((value, index) => {
    const key = arrB[index];
    props[key] = value;
  });

  return props;
}

function getPropsWithScrollPosition(props, scrollX, scrollY) {
  let lineCoords = {};

  // TODO: Temp fix to apply scroll position to line. It should probably be done
  // at the `registerDebugMethod` level.
  if (props.x1 !== undefined && props.y1 !== undefined && props.x2 !== undefined && props.y2 !== undefined) {
    lineCoords = {
      x1: props.x1 - scrollX,
      y1: props.y1 - scrollY,
      x2: props.x2 - scrollX,
      y2: props.y2 - scrollY
    }
  }

  return {
    ...props,
    x: props.x - scrollX,
    y: props.y - scrollY,
    ...lineCoords
  }
}

function getConcatenatedPropKeys(props = {}) {
  return Object.keys(props).join(', ');
}

function registerDebugMethod(name = '', props = {}, draw = () => {}) {
  const concatenatedPropKeys = getConcatenatedPropKeys(props);
  const windowAPIString = `${name}: (${concatenatedPropKeys}) => dispatchExtensionMethod('DebugDraw', '${name}', ${concatenatedPropKeys})`;

  WINDOW_API_STRINGS.push(windowAPIString);
  DRAW_METHODS[name] = {
    name,
    props,
    draw
  };
}

registerDebugMethod('drawRect', {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  color: 'white'
}, ({ context, x, y, width, height, color }) => {
  context.beginPath();
  context.strokeStyle = color;
  context.rect(x, y, width, height);
  context.stroke();
});

registerDebugMethod('drawLine', {
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
  color: 'white'
}, ({ context, x1, y1, x2, y2, color }) => {
  context.strokeStyle = color;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
});

registerDebugMethod('drawCircle', {
  x: 0,
  y: 0,
  radius: 0,
  color: 'white'
}, ({ context, x, y, radius, color }) => {
  context.beginPath();
  context.strokeStyle = color;
  context.arc(x, y, radius, 0, 2 * Math.PI);
  context.stroke();
});

/*
------------------------------------
*/

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
    ${WINDOW_API_STRINGS.join(',\n')}
  };
})();
`;

function main() {
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

  function draw() {
    resizeCanvas();
    context.clearRect(0, 0, canvas.width, canvas.height);

    SCENE.forEach((node) => {
      const propsWithScrollPosition = getPropsWithScrollPosition(
        node.props,
        window.scrollX,
        window.scrollY
      );

      node.draw({ context, ...propsWithScrollPosition });
    });

    window.requestAnimationFrame(draw);
  }

  draw();

  document.addEventListener('extension-method', (evt) => {
    const method = DRAW_METHODS[evt.detail.method];

    if (method) {
      const zippedProps = zip(evt.detail.args, Object.keys(method.props));
      SCENE.push({ name: method.name, draw: method.draw, props: zippedProps });
    }
  }, false);
}

main();

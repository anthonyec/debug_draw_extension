const WINDOW_API_STRINGS = [];
const DRAW_METHODS = {};
const SCENE = [];

function zip(arrA = [], arrB = []) {
  let props = {};

  // Intentionally not using reduce ;--)
  arrA.forEach((value, index) => {
    const key = arrB[index];

    // Only zip if there's a value. Otherwise it will zip undefined stuff.
    // TODO: Should this be here? I think it should...
    if (value) {
      props[key] = value;
    }
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

function registerDrawMethod(name = '', props = {}, draw = () => {}) {
  const concatenatedPropKeys = getConcatenatedPropKeys(props);
  const windowAPIString = `${name}: (${concatenatedPropKeys}) => dispatchExtensionMethod('DebugDraw', '${name}', ${concatenatedPropKeys})`;

  WINDOW_API_STRINGS.push(windowAPIString);
  DRAW_METHODS[name] = {
    name,
    props,
    draw
  };

  // TODO: Clean up.
  const drawWithIdMethod = {
    name: `${name}WithId`,
    props: {
      id: '',
      ...props
    },
    draw: DRAW_METHODS[name]['draw']
  };

  WINDOW_API_STRINGS.push(`${name}WithId: (id, ${concatenatedPropKeys}) => dispatchExtensionMethod('DebugDraw', '${name}WithId', id, ${concatenatedPropKeys})`);
  DRAW_METHODS[name + 'WithId'] = drawWithIdMethod;
}

registerDrawMethod('drawPoint', {
  x: 0,
  y: 0,
  color: 'red'
}, ({ context, x, y, color }) => {
  const radius = 10;

  context.strokeStyle = color;

  context.beginPath();
  context.moveTo(x, y - radius);
  context.lineTo(x, y + radius);
  context.stroke();

  context.beginPath();
  context.moveTo(x - radius, y);
  context.lineTo(x + radius, y);
  context.stroke();

  context.beginPath();
  context.arc(x, y, radius / 2, 0, 2 * Math.PI);
  context.stroke();
});

registerDrawMethod('drawRect', {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  color: 'red'
}, ({ context, x, y, width, height, color }) => {
  context.beginPath();
  context.strokeStyle = color;
  context.rect(x, y, width, height);
  context.stroke();
});

registerDrawMethod('drawLine', {
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
  color: 'red',
}, ({ context, x1, y1, x2, y2, color }) => {
  context.strokeStyle = color;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
});

registerDrawMethod('drawCircle', {
  x: 0,
  y: 0,
  radius: 0,
  color: 'red'
}, ({ context, x, y, radius, color }) => {
  context.beginPath();
  context.strokeStyle = color;
  context.arc(x, y, radius, 0, 2 * Math.PI);
  context.stroke();
});

registerDrawMethod('drawText', {
  x: 0,
  y: 0,
  text: '',
  color: 'red',
  fontSize: 16
}, ({ context, x, y, text, color, fontSize }) => {
  context.textBaseline = 'top';
  context.font = `${fontSize}px Arial`;
  context.fillStyle = color;
  context.fillText(text, x, y);
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
      context.save();

      const propsWithScrollPosition = getPropsWithScrollPosition(
        node.props,
        window.scrollX,
        window.scrollY
      );

      node.draw({ context, ...propsWithScrollPosition });

      context.restore();
    });

    window.requestAnimationFrame(draw);
  }

  draw();

  document.addEventListener('extension-method', (evt) => {
    const method = DRAW_METHODS[evt.detail.method];

    if (method) {
      const zippedProps = zip(evt.detail.args, Object.keys(method.props));
      const props = { ...method.props, ...zippedProps };

      if (props.id) {
        const foundSceneEntityIndex = SCENE.findIndex((sceneEntity) => {
          return sceneEntity.props.id === props.id;
        });

        // TODO: Clean up with less nested if statements.
        if (foundSceneEntityIndex !== -1) {
          SCENE[foundSceneEntityIndex].props = props;
          return;
        }
      }

      SCENE.push({ id: Math.floor(Math.random() * 999) + '' + Date.now(), name: method.name, draw: method.draw, props });
    }
  }, false);
}

main();

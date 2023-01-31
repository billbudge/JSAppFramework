
// Diagrams module.

const diagrams = (function() {
  'use strict';

  //------------------------------------------------------------------------------

  // Rendering utilities.

  function roundRectPath(x, y, width, height, r, ctx) {
    r = Math.min(r, width * 0.5, height * 0.5);
    let right = x + width, bottom = y + height;
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.lineTo(x, bottom - r);
    ctx.quadraticCurveTo(x, bottom, x + r, bottom);
    ctx.lineTo(right - r, bottom);
    ctx.quadraticCurveTo(right, bottom, right, bottom - r);
    ctx.lineTo(right, y + r);
    ctx.quadraticCurveTo(right, y, right - r, y);
    ctx.lineTo(x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
  }

  function rectParamToPoint(left, top, width, height, t) {
    let right = left + width, bottom = top + height,
        x0, y0, nx, ny, dx = 0, dy = 0;
    if (t < 2) {  // + side
      if (t < 1) {  // right
        x0 = right;
        y0 = top;
        dy = height;
        nx = 1;
        ny = 0;
      } else {  // bottom
        y0 = bottom;
        x0 = right;
        dx = -width;
        t -= 1;
        nx = 0;
        ny = 1;
      }
    } else {  // - side
      if (t < 3) {  // left
        x0 = left;
        y0 = bottom;
        dy = -height;
        t -= 2;
        nx = -1;
        ny = 0;
      }
      else {  // top
        y0 = top;
        x0 = left;
        dx = width;
        t -= 3;
        nx = 0;
        ny = -1;
      }
    }
    return { x: x0 + dx * t,
             y: y0 + dy * t,
             nx: nx,
             ny: ny
           };
  }

  function circleParamToPoint(cx, cy, r, t) {
    let rads = ((t - 0.5) / 4) * 2 * Math.PI,
        nx = Math.cos(rads), ny = Math.sin(rads);
    return { x: cx + nx * r,
             y: cy + ny * r,
             nx: nx,
             ny: ny
           };
  }

  function roundRectParamToPoint(left, top, width, height, r, t) {
    let right = left + width, bottom = top + height,
        wr = r / width, hr = r / height, omwr = 1 - wr, omhr = 1 - hr,
        tc;
    if (t < 2) {  // + side
      if (t < 1) {  // right
        if (t < hr)
          return circleParamToPoint(right - r, top + r, r, t / hr * 0.5);
        else if (t > omhr)
          return circleParamToPoint(right - r, bottom - r, r, (t - omhr) / hr * 0.5 + 0.5);
      } else {  // bottom
        tc = t - 1;
        if (tc < wr)
          return circleParamToPoint(right - r, bottom - r, r, tc / wr * 0.5 + 1.0);
        else if (tc > omwr)
          return circleParamToPoint(left + r, bottom - r, r, (tc - omwr) / wr * 0.5 + 1.5);
      }
    } else {  // - side
      if (t < 3) {  // left
        tc = t - 2;
        if (tc < hr)
          return circleParamToPoint(left + r, bottom - r, r, tc / hr * 0.5 + 2.0);
        else if (tc > omhr)
          return circleParamToPoint(left + r, top + r, r, (tc - omhr) / hr * 0.5 + 2.5);
      }
      else {  // top
        tc = t - 3;
        if (tc < wr)
          return circleParamToPoint(left + r, top + r, r, tc / wr * 0.5 + 3.0);
        else if (tc > omwr)
          return circleParamToPoint(right - r, top + r, r, (tc - omwr) / wr * 0.5 + 3.5);
      }
    }

    return rectParamToPoint(left, top, width, height, t);
  }

  function circlePointToParam(cx, cy, p) {
    return ((Math.PI - Math.atan2(p.y - cy, cx - p.x)) / (2 * Math.PI) * 4 + 0.5) % 4;
  }

  function rectPointToParam(left, top, width, height, p) {
    // translate problem to one with origin at center of rect
    let dx = width / 2, dy = height / 2,
        cx = left + dx, cy = top + dy,
        px = p.x - cx, py = p.y - cy;

    // rotate problem into quadrant 0
    // use "PerpDot" product to determine relative orientation
    // (Graphics Gems IV, page 138)
    let result, temp;
    if (dy * px + dx * py > 0) {  // quadrant 0 or 1
      if (-dy * px + dx * py < 0) { // quadrant 0
        result = 0;
      } else {  // quadrant 1
        result = 1;
        temp = px; px = -py; py = temp;
        temp = dx; dx = dy; dy = temp;
      }
    }
    else {  // quadrant 2 or 3
      if (dy * px + -dx * py < 0) {  // quadrant 2
        result = 2;
        px = -px; py = -py;
      } else {  // quadrant 3
        result = 3;
        temp = py; py = -px; px = temp;
        temp = dx; dx = dy; dy = temp;
      }
    }

    let y = dx * py / px;
    result += (y + dy) / (dy * 2);

    return result;
  }

  function diskPath(x, y, r, ctx) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI, false);
  }

  // p1, p2 have x, y, nx, ny.
  // p1, p2 have x, y, nx, ny.
  function getEdgeBezier(p1, p2, scaleFactor) {
    let dx = p1.x - p2.x, dy = p1.y - p2.y,
        nx1 = p1.nx || 0, ny1 = p1.ny || 0, nx2 = p2.nx || 0, ny2 = p2.ny || 0,
        // dot = nx1 * -nx2 + ny1 * -ny2,
        // scale = (2 - dot) * (scaleFactor || 32),
        scale = scaleFactor || Math.sqrt(dx * dx + dy * dy) * 0.3,
        c1 = { x: p1.x + scale * nx1, y: p1.y + scale * ny1 },
        c2 = { x: p2.x + scale * nx2, y: p2.y + scale * ny2 };
    return [p1, c1, c2, p2];
  }

  function arrowPath(p, ctx, arrowSize) {
    let cos45 = 0.866, sin45 = 0.500,
        nx = p.nx, ny = p.ny;
    ctx.moveTo(p.x + arrowSize * (nx * cos45 - ny * sin45),
               p.y + arrowSize * (nx * sin45 + ny * cos45));
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x + arrowSize * (nx * cos45 + ny * sin45),
               p.y + arrowSize * (ny * cos45 - nx * sin45));
  }

  function lineEdgePath(p1, p2, ctx, arrowSize) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    if (arrowSize)
      arrowPath(p2, ctx, arrowSize);
  }

  function bezierEdgePath(bezier, ctx, arrowSize) {
    let p1 = bezier[0], c1 = bezier[1], c2 = bezier[2], p2 = bezier[3];
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
    if (arrowSize)
      arrowPath(p2, ctx, arrowSize);
  }

  function inFlagPath(x, y, width, height, indent, ctx) {
    let right = x + width, bottom = y + height;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(right, y);
    ctx.lineTo(right, y + height); ctx.lineTo(x, y + height);
    ctx.lineTo(x + indent, y + height / 2); ctx.lineTo(x, y);
  }

  function outFlagPath(x, y, width, height, indent, ctx) {
    let right = x + width, bottom = y + height;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(right - indent, y);
    ctx.lineTo(right, y + height / 2); ctx.lineTo(right - indent, y + height);
    ctx.lineTo(x, y + height); ctx.lineTo(x, y);
  }

  function closedPath(points, ctx) {
    ctx.beginPath();
    let length = points.length, pLast = points[length - 1];
    ctx.moveTo(pLast.x, pLast.y);
    for (let i = 0; i < length; i++) {
      let pi = points[i];
      ctx.lineTo(pi.x, pi.y);
    }
  }

  // Check if p is within tolerance of (x, y). Useful for knobbies.
  function hitPoint(x, y, p, tol) {
    return Math.abs(x - p.x) <= tol && Math.abs(y - p.y) <= tol;
  }

  function hitTestRect(x, y, width, height, p, tol) {
    let right = x + width, bottom = y + height,
        px = p.x, py = p.y;
    if (px > x - tol && px < right + tol &&
        py > y - tol && py < bottom + tol) {
      let hitTop = Math.abs(py - y) < tol,
          hitLeft = Math.abs(px - x) < tol,
          hitBottom = Math.abs(py - bottom) < tol,
          hitRight = Math.abs(px - right) < tol,
          hitBorder = hitTop || hitLeft || hitBottom || hitRight;
      return {
        top: hitTop,
        left: hitLeft,
        bottom: hitBottom,
        right: hitRight,
        border: hitBorder,
        interior: !hitBorder,
      };
    }
  }

  function hitTestDisk(x, y, r, p, tol) {
    const dx = x - p.x, dy = y - p.y,
          dSquared = dx * dx + dy * dy,
          inner = Math.max(0, r - tol), outer = r + tol;
    if (dSquared < outer * outer) {
      const border = dSquared > inner * inner;
      return { interior: !border, border: border };
    }
  }

  function hitTestLine(p1, p2, p, tol) {
    if (geometry.pointToPointDist(p1, p) < tol) {
      return { p1: true };
    } else if (geometry.pointToPointDist(p2, p) < tol) {
      return { p2: true };
    } else if (geometry.pointOnSegment(p1, p2, p, tol)) {
      return { edge: true };
    }
  }

  function hitTestBezier(bezier, p, tol) {
    const p1 = bezier[0], p2 = bezier[3];
    if (geometry.pointToPointDist(p1, p) < tol) {
      return { p1: true, t: 0 };
    } else if (geometry.pointToPointDist(p2, p) < tol) {
      return { p2: true, t: 1 };
    } else {
      const hit = geometry.hitTestCurveSegment(bezier[0], bezier[1], bezier[2], bezier[3], p, tol);
      if (hit) {
        hit.edge = true;
      }
      return hit;
    }
  }

  function hitTestConvexHull(hull, p, tol) {
    if (geometry.pointInConvexHull(hull, p, tol)) {
      let interior = geometry.pointInConvexHull(hull, p, -tol);
        return { interior: interior, border: !interior };
    }
  }

  function getCanvasScaleFactor(ctx) {
    return window.devicePixelRatio;
  }

  function getCanvasSize(canvas, ctx) {
    const contextScale = getCanvasScaleFactor(ctx);
    return { width: canvas.width / contextScale, height: canvas.height / contextScale };
  }

  function setCanvasSize(canvas, ctx, width, height) {
    const contextScale = getCanvasScaleFactor(ctx);
    canvas.width  = width * contextScale;
    canvas.height = height * contextScale;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.resetTransform();
    ctx.scale(contextScale, contextScale);
  }

  // Calculates the maximum width of an array of name-value pairs. Names are left
  // justified, values are right justified, and gap is the minimum space between
  // name and value.
  function measureNameValuePairs(pairs, gap, ctx) {
    let maxWidth = 0;
    pairs.forEach(function(pair) {
      let nameWidth = ctx.measureText(pair.name).width,
          valueWidth = ctx.measureText(pair.value).width,
          width = nameWidth + gap + valueWidth;
      maxWidth = Math.max(maxWidth, width);
    });
    return maxWidth;
  }

  //------------------------------------------------------------------------------

  class PropertyGridController {
    constructor(container, theme) {
      this.container = container;
      this.theme = theme || diagrams.theme.create();
      this.types = new Map();
      this.active = undefined;
    }
    register(type, properties) {
      const self = this, table = document.createElement('table'), info = {
        properties: properties,
        table: table,
      };
      // TODO better styling
      table.style = 'position:fixed; table-layout: fixed; top:300px; left: 0;   padding: 0; margin: 0;';
      'border-collapse: collapse; margin: 25px 0; font-size: 0.9em; font-family: sans-serif; ';
      'box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);';
      table.style['background-color'] = this.theme.altBgColor;
      table.style.display = 'none';
      table.style.visibility = 'hidden';

      properties.forEach(function (propertyInfo, index) {
        const label = propertyInfo.label, labelElement = document.createTextNode(label), type = propertyInfo.type, row = table.insertRow(index), cell1 = row.insertCell(), cell2 = row.insertCell();
        let editingElement;
        switch (type) {
          case 'text': {
            editingElement = document.createElement('input');
            editingElement.setAttribute('type', 'text');
            editingElement.addEventListener('change', function (event) {
              propertyInfo.setter(propertyInfo, self.item, editingElement.value);
            });
            break;
          }
          case 'enum': {
            editingElement = document.createElement('select');
            const values = propertyInfo.values.split(',');
            for (let value of values) {
              const option = document.createElement('option');
              option.value = value;
              option.text = value;
              editingElement.add(option);
            }
            editingElement.addEventListener('change', function (event) {
              propertyInfo.setter(propertyInfo, self.item, editingElement.value);
            });
          }
        }
        assert(editingElement);
        cell1.appendChild(labelElement);
        cell2.appendChild(editingElement);
      });
      this.types.set(type, info);
      this.container.appendChild(table);
    }
    show(type, item) {
      const active = this.active, entry = this.types.get(type);
      // Hide the previous table if it's different.
      if (entry !== active && active) {
        const table = active.table;
        table.style.display = 'none';
        table.style.visibility = 'hidden';
      }
      this.active = entry;
      if (entry) {
        const table = entry.table;
        // Initialize editing control values.
        entry.properties.forEach(function (propertyInfo, index) {
          const row = table.rows[index], cell = row.cells[1], editingElement = cell.children[0];
          editingElement.value = propertyInfo.getter(propertyInfo, item);
        });
        this.item = item;
        table.style.display = 'block';
        table.style.visibility = 'visible';
      }
    }
  }

  //------------------------------------------------------------------------------

  class CanvasController {

    setTransform(translation, scale) {
      let tx = 0, ty = 0, sx = 1, sy = 1, sin = 0, cos = 1;
      if (translation) {
        tx = translation.x;
        ty = translation.y;
        this.translation = translation;
      }
      if (scale) {
        sx = scale.x;
        sy = scale.y;
        this.scale = scale;
      }
      this.transform = [sx, 0, 0, sy, tx, ty];
      let ooSx = 1.0 / sx, ooSy = 1.0 / sy;
      this.inverseTransform = [ooSx, 0, 0, ooSy, -tx * ooSx, -ty * ooSy];

      this.cancelHover_();
    }
    applyTransform() {
      let t = this.transform;
      this.ctx.transform(t[0], t[1], t[2], t[3], t[4], t[5]);
    }
    viewToCanvas(p) {
      return geometry.matMulPtNew(p, this.inverseTransform);
    }
    offsetToOtherCanvas(canvasController) {
      const rect = this.getClientRect(),
            otherRect = canvasController.getClientRect();
      return { x: otherRect.left - rect.left, y: otherRect.top - rect.top };
    }
    viewToOtherCanvasView(canvasController, p) {
      if (canvasController === this) {
        return this.viewToCanvas(p);
      } else {
        const offset = this.offsetToOtherCanvas(canvasController);
        p = { x: p.x + offset.x, y: p.y + offset.y }
        return canvasController.viewToCanvas(p);
      }
    }
    draw() {
      const self = this, canvas = this.canvas, ctx = this.ctx, layers = this.layers, length = layers.length, t = this.transform_;
      function draw() {
        const size = self.getSize(canvas, ctx);
        ctx.clearRect(0, 0, size.width, size.height);
        ctx.strokeStyle = self.theme.strokeColor;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(0, 0, size.width, size.height);
        ctx.setLineDash([]);
        for (let i = length - 1; i >= 0; i--) {
          let layer = layers[i];
          if (layer.draw)
            layer.draw(self);
        }
      }
      window.requestAnimationFrame(draw);
    }
    onPointerDown(e) {
      e.preventDefault();
      const self = this,
            alt = (e.button !== 0);
      this.mouse = this.click = this.getPointerPosition(e);
      this.shiftKeyDown = e.shiftKey;
      this.cmdKeyDown = e.ctrlKey || e.metaKey;
      // Call layers until one returns true.
      this.layers.some(function (layer) {
        if (!layer.onClick || !layer.onClick(self, alt))
          return false;
        // Layers that return true from onClick must implement onBeginDrag, etc.
        self.clickOwner = layer;
        self.canvas.setPointerCapture(e.pointerId);
        return true;
      });
      this.cancelHover_();
      this.draw();
      return this.clickOwner;
    }
    onPointerMove(e) {
      e.preventDefault();
      let mouse = this.mouse = this.getPointerPosition(e), click = this.click;
      if (this.clickOwner) {
        let dx = mouse.x - click.x, dy = mouse.y - click.y;
        if (!this.isDragging) {
          this.isDragging = Math.abs(dx) >= this.dragThreshold ||
            Math.abs(dy) >= this.dragThreshold;
          if (this.isDragging) {
            this.cancelHover_();
            this.clickOwner.onBeginDrag(this);
          }
        }
        if (this.isDragging) {
          this.clickOwner.onDrag(this);
          this.draw();
        }
      }
      if (!this.isDragging)
        this.startHover_();
      return this.clickOwner;
    }
    onPointerUp(e) {
      e.preventDefault();
      this.mouse = this.getPointerPosition(e);
      if (this.isDragging) {
        this.isDragging = false;
        this.clickOwner.onEndDrag(this);
        this.draw();
      }
      this.click = null;
      this.clickOwner = null;
      return false;
    }
    onDoubleClick(e) {
      const self = this;
      this.mouse = this.click = this.getPointerPosition(e);
      let handler;
      // Call layers until one returns true.
      this.layers.some(function (layer) {
        if (!layer.onDoubleClick || !layer.onDoubleClick(self, alt))
          return false;
        handler = layer;
        return true;
      });
      this.cancelHover_();
      this.draw();
      return handler;
    }
    startHover_() {
      let self = this;
      if (this.hovering_)
        this.cancelHover_();
      this.hovering_ = window.setTimeout(function () {
        self.layers.some(function (layer) {
          if (!layer.onBeginHover || !layer.onBeginHover(self))
            return false;
          // Layers that return true from onBeginHover must implement onEndHover.
          self.hoverOwner = layer;
          self.hovering_ = 0;
          self.draw();
          return true;
        });
      }, this.hoverTimeout);
    }
    cancelHover_() {
      if (this.hovering_) {
        window.clearTimeout(this.hovering_);
        this.hovering_ = 0;
      }
      if (this.hoverOwner) {
        this.hoverOwner.onEndHover(this);
        this.hoverOwner = null;
        this.draw();
      }
    }
    onKeyDown(e) {
      let self = this;
      this.shiftKeyDown = e.shiftKey;
      this.cmdKeyDown = e.ctrlKey || e.metaKey;
      this.layers.some(function (layer) {
        if (!layer.onKeyDown || !layer.onKeyDown(e))
          return false;
        // Layers that return true from onClick must implement onBeginDrag, onDrag,
        // and onEndDrag.
        self.keyOwner = layer;
        self.draw();
        e.preventDefault();
        return true;
      });
      this.cancelHover_();
      return this.keyOwner;
    }
    onKeyUp(e) {
      this.shiftKeyDown = e.shiftKey;
      this.cmdKeyDown = e.ctrlKey || e.metaKey;
      let keyOwner = this.keyOwner;
      if (keyOwner) {
        if (keyOwner.onKeyUp)
          keyOwner.onKeyUp(e);
        this.keyOwner = null;
        return false;
      }
    }
    getCanvas() {
      return this.canvas;
    }
    getCtx() {
      return this.ctx;
    }
    getSize() {
      return getCanvasSize(this.canvas, this.ctx);
    }
    setSize(width, height) {
      this.width = width;
      this.height = height;
      diagrams.setCanvasSize(this.canvas, this.ctx, width, height);
      this.draw();
    }
    onWindowResize() {
      diagrams.setCanvasSize(this.canvas, this.ctx, this.width, this.height);
      this.draw();
    }
    getClientRect() {
      return this.canvas.getBoundingClientRect();
    }
    getPointerPosition(e) {
      let rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    getCurrentPointerPosition() {
      return this.mouse;  // TODO rename mouse to pointer
    }
    getInitialPointerPosition() {
      return this.click;
    }

    constructor(canvas, theme) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.theme = theme || diagrams.theme.createDefault();

      this.dragThreshold = 4;
      this.hoverThreshold = 4;
      this.hoverTimeout = 500; // milliseconds
      this.mouse = { x: 0, y: 0 };
      this.dragOffset = { x: 0, y: 0 };
      this.translation = { x: 0, y: 0 };
      this.scale = { x: 1.0, y: 1.0 };
      this.transform = [1, 0, 0, 1, 0, 0];
      this.inverseTransform = [1, 0, 0, 1, 0, 0];

      const self = this;
      canvas.addEventListener('pointerdown', e => self.onPointerDown(e));
      canvas.addEventListener('pointermove', e => self.onPointerMove(e));
      canvas.addEventListener('pointerup', e => self.onPointerUp(e));

      canvas.addEventListener('dblclick', e=> self.onDoubleClick(e));
    }
    configure(layers) {
      layers = layers.slice(0);
      this.layers = layers;
      const length = layers.length;
      for (let i = 0; i < length; i++) {
        const layer = layers[i];
        if (layer.initialize)
          layer.initialize(this, i);
      }
      // Layers are presented in draw order, but most loops are hit test order, so
      // reverse the array here.
      layers.reverse();
    }
  }

  //------------------------------------------------------------------------------

  class CanvasPanZoomLayer {
    constructor(canZoom) {
      this.pan = { x: 0, y: 0 };
      this.canZoom = canZoom;
      this.zoom = 1.0;
      this.minZoom = 0.50;
      this.maxZoom = 16.0;
    }
    // Zoom is optional.
    initialize(canvasController) {
      let self = this;
      this.canvasController = canvasController;

      if (this.canZoom) {
        canvasController.canvas.addEventListener('mousewheel', function (e) {
          let pan = self.pan, zoom = self.zoom, center = { x: e.offsetX, y: e.offsetY }, dZoom = 1.0 + e.wheelDelta / 8192, newZoom = zoom * dZoom;
          newZoom = Math.max(self.minZoom, Math.min(self.maxZoom, newZoom));
          dZoom = newZoom / zoom;

          self.zoom = zoom * dZoom;
          self.pan = {
            x: (pan.x - center.x) * dZoom + center.x,
            y: (pan.y - center.y) * dZoom + center.y,
          };
          self.setTransform_();
          canvasController.draw();
          e.preventDefault();
        });
      }
    }
    setTransform_(p) {
      let pan = this.pan, zoom = this.zoom;
      this.canvasController.setTransform(pan, { x: zoom, y: zoom });
    }
    onClick(p) {
      // Always capture the mouse click.
      return true;
    }
    onBeginDrag(p0) {
      this.pan0 = this.pan;
    }
    onDrag(p0, p) {
      let dx = p.x - p0.x, dy = p.y - p0.y, t0 = this.pan0;
      this.pan = { x: t0.x + dx, y: t0.y + dy };
      this.setTransform_();
    }
    onEndDrag(p) {
      this.translation0 = null;
    }
  }

  //------------------------------------------------------------------------------

  class FileController {
    constructor(types, excludeAcceptAllOption) {
      this.types = types ||
        [
          {
            description: 'Text file',
            accept: {'text/plain': ['.txt']},
            },
        ];
      this.excludeAcceptAllOption = excludeAcceptAllOption;
    }
    async getWriteFileHandle(suggestedName) {
      const opts = {
        types: this.types,
        excludeAcceptAllOption: this.excludeAcceptAllOption,
        suggestedName: suggestedName,
      }
      return await window.showSaveFilePicker(opts);
    }
    async saveFile(fileHandle, contents) {
      const writable = await fileHandle.createWritable();
      await writable.write(contents);
      await writable.close();
    }
    async saveUnnamedFile(contents, suggestedName) {
      const fileHandle = await this.getWriteFileHandle(suggestedName);
      await this.saveFile(fileHandle, contents);
    }
    async getReadFileHandle() {
      const opts = {
        types: this.types,
        excludeAcceptAllOption: this.excludeAcceptAllOption,
        multiple: false,
      }
      const [fileHandle] = await window.showOpenFilePicker(opts);
      return fileHandle;
    }
    async openFile() {
      const fileHandle = await this.getReadFileHandle();
      const fileData = await fileHandle.getFile();
      return await fileData.text();
    }
  }

  //------------------------------------------------------------------------------

  let theme = (function() {
    function createDefault() {
      return {
        bgColor: 'white',
        altBgColor: '#F0F0F0',
        strokeColor: '#505050',
        textColor: '#505050',
        highlightColor: '#40F040',
        hotTrackColor: 'blue',
        dimColor: '#e0e0e0',
        hoverColor: '#FCF0AD',
        hoverTextColor: '#404040',

        font: '14px monospace',
        fontSize: 14,
      }
    }

    function createBlueprint() {
      return {
        bgColor: '#6666cc',
        altBgColor: '#5656aa',
        strokeColor: '#f0f0f0',
        textColor: '#f0f0f0',
        highlightColor: '#40F040',
        hotTrackColor: '#F0F040',
        dimColor: '#808080',
        hoverColor: '#FCF0AD',
        hoverTextColor: '#404040',

        font: '14px monospace',
        fontSize: 14,
      }
    }

    return {
      createDefault: createDefault,
      createBlueprint: createBlueprint,
    }
  })();

  //------------------------------------------------------------------------------

  return {
    roundRectPath,
    rectParamToPoint,
    circleParamToPoint,
    roundRectParamToPoint,
    circlePointToParam,
    rectPointToParam,
    diskPath,
    getEdgeBezier,
    arrowPath,
    lineEdgePath,
    bezierEdgePath,
    inFlagPath,
    outFlagPath,
    closedPath,
    hitPoint,
    hitTestRect,
    hitTestDisk,
    hitTestLine,
    hitTestBezier,
    hitTestConvexHull,
    getCanvasSize,
    setCanvasSize,
    measureNameValuePairs,

    CanvasController,
    CanvasPanZoomLayer,
    PropertyGridController,

    FileController,

    theme,
  }

  })();

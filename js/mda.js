(function(){
  'use strict';

  window.MDA = MDA;
  function MDA(element, options){
     return this.constructor(element, options);
  }

  function extend(b, a) {
    var prop;
    if (b === undefined) {
      return a;
    }
    for (prop in a) {
      if (a.hasOwnProperty(prop) && b.hasOwnProperty(prop) === false) {
        b[prop] = a[prop];
      }
    }
    return b;
  }

  MDA.prototype = {
    canvas : null,
    image : null,
    originalImageElement: null,
    scale : null,
    mda : null,
    startX: null,
    startY: null,

    defaults : {
      maxWidth : 500,
      maxHeight : null,
      selectionFill: '#000' ,
    },

    constructor: function(element, options) {
      this.options = extend(options, this.defaults);
      if (typeof element === 'string')
        element = document.querySelector(element);
      if (null === element)
        return;

      var image = new Image();
      image.onload = function() {
        this._initializeDOM(element);
        this._initializeImage();
        this._initializeMDA();
      }.bind(this)

      image.src = element.src;
    },

    _initializeDOM: function(imageElement){
      var mainContainerElement = document.createElement('div');
      mainContainerElement.className = 'container';

      var canvasContainerElement = document.createElement('div');
      canvasContainerElement.className = 'mda-image-container';
      var canvasElement = document.createElement('canvas');
      canvasContainerElement.appendChild(canvasElement);
      mainContainerElement.appendChild(canvasContainerElement);

      imageElement.parentNode.replaceChild(mainContainerElement, imageElement);
      mainContainerElement.appendChild(imageElement);;
      imageElement.style.display = 'none';

      this.originalImageElement = imageElement;
      this.canvas = new fabric.Canvas(canvasElement, {
        selection: false,
        backgroundColor: "#000"
      });
    },

    _initializeImage: function(){
      this.image = new fabric.Image(this.originalImageElement, {
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        lockUniScaling: true,
        hasControls: false,
        hasBorders: false,
      });

      this._setScaleParam();
      var canvasWidth = this.image.getWidth();
      var canvasHeight = this.image.getHeight();
      canvasWidth *= this.scale;
      canvasHeight *= this.scale;

      this.image.setScaleX(this.scale);
      this.image.setScaleY(this.scale);
      this.canvas.add(this.image);
      this.canvas.setWidth(canvasWidth);
      this.canvas.setHeight(canvasHeight);
      this.image.setCoords();
    },

    _setScaleParam: function() {
      var scaleX = 1;
      var scaleY = 1;
      var canvasWidth = this.image.getWidth();
      var canvasHeight = this.image.getHeight();

      if (null !== this.options.maxWidth && this.options.maxWidth < canvasWidth) {
        scaleX =  this.options.maxWidth / canvasWidth;
      }
      if (null !== this.options.maxHeight && this.options.maxHeight < canvasHeight) {
        scaleY =  this.options.maxHeight / canvasHeight;
      }
      this.scale = Math.min(scaleX, scaleY);
    },

    _initializeMDA: function() {
      var mda = new fabric.Rect({
        fill: this.options.selectionFill,
        opacity: 0.5,
        hasBorders: false,
        originX: 'left',
        originY: 'top',
        cornerColor: '#444',
        cornerSize: 8,
        transparentCorners: false,
        lockRotation: true,
        hasRotatingPoint: false,
      });

      this.canvas.add(mda);
      this.canvas.defaultCursor = 'crosshair';
      this.canvas.on('mouse:down', this.onMouseDown.bind(this));
      this.canvas.on('mouse:move', this.onMouseMove.bind(this));
      this.canvas.on('mouse:up', this.onMouseUp.bind(this));
      this.canvas.on('object:moving', this.onObjectMoving.bind(this));
      this.canvas.on('object:scaling', this.onObjectScaling.bind(this));
      this.mda = mda;
    },

    onMouseDown: function(event){
      this.canvas.calcOffset();
      var pointer = this.canvas.getPointer(event.e);
      var x = pointer.x;
      var y = pointer.y;
      var point = new fabric.Point(x, y);
      var activeObject = this.canvas.getActiveObject();

      if (activeObject === this.mda || this.mda.containsPoint(point)) {
       return;
      }

      this.canvas.discardActiveObject();
      this.mda.setWidth(0);
      this.mda.setHeight(0);
      this.mda.setScaleX(1);
      this.mda.setScaleY(1);
      this.startX = x;
      this.startY = y;
    },

    onMouseMove: function(event) {
      if (null === this.startX || null === this.startY) {
        return;
      }

      var pointer = this.canvas.getPointer(event.e);
      var endX = pointer.x;
      var endY = pointer.y;

      var isRight = (endX > this.startX);
      var isLeft = !isRight;
      var isDown = (endY > this.startY);
      var isUp = !isDown;

      var leftX = Math.min(this.startX, endX);
      var rightX = Math.max(this.startX, endX);
      var topY = Math.min(this.startY, endY);
      var bottomY = Math.max(this.startY, endY);

      leftX = Math.max(0, leftX);
      rightX = Math.min(this.canvas.getWidth(), rightX);
      topY = Math.max(0, topY)
      bottomY = Math.min(this.canvas.getHeight(), bottomY);

      var width = rightX - leftX;
      var height = bottomY - topY;

      this.mda.left = leftX;
      this.mda.top = topY;
      this.mda.width = width;
      this.mda.height = height;

      this.canvas.bringToFront(this.mda);
    },

    onMouseUp: function(event) {
      if (null === this.startX || null === this.startY) {
        return;
      }
      this.mda.setCoords();
      this.canvas.setActiveObject(this.mda);
      this.canvas.calcOffset();
      this.startX = null;
      this.startY = null;
    },

    onObjectMoving: function(event) {
       var currentObject = event.target;
       var x = currentObject.getLeft(), y = currentObject.getTop();
       var w = currentObject.getWidth(), h = currentObject.getHeight();
       var maxX = this.canvas.getWidth() - w;
       var maxY = this.canvas.getHeight() - h;

       if (x < 0)
         currentObject.set('left', 0);
       if (y < 0)
         currentObject.set('top', 0);
       if (x > maxX)
         currentObject.set('left', maxX);
       if (y > maxY)
         currentObject.set('top', maxY);
    },

    onObjectScaling: function(event) {
      var currentObject = event.target;
      var minX = currentObject.getLeft();
      var minY = currentObject.getTop();
      var maxX = currentObject.getLeft() + currentObject.getWidth();
      var maxY = currentObject.getTop() + currentObject.getHeight();

      //left & right boundary
      if (minX < 0 || maxX > this.canvas.getWidth()) {
        var lastScaleX = this.lastScaleX || 1;
        currentObject.setScaleX(lastScaleX);
      }

      //top & bottom boundary
      if (minY < 0 || maxY > this.canvas.getHeight()) {
        var lastScaleY = this.lastScaleY || 1;
        currentObject.setScaleY(lastScaleY);
      }

      if (minX < 0) {
        currentObject.setLeft(0);
      }

      if (minY < 0) {
        currentObject.setTop(0);
      }

      this.lastScaleX = currentObject.getScaleX();
      this.lastScaleY = currentObject.getScaleY();
    }
  }
})();

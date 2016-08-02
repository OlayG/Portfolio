var requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
                       window.mozRequestAnimationFrame || window.msRequestAnimationFrame || 
                       function(c) {window.setTimeout(c, 15)};
/**
   Phoria
   pho·ri·a (fôr-)
   n. The relative directions of the eyes during binocular fixation on a given object
*/

// bind to window onload event
window.addEventListener('load', onloadHandler, false);

var bitmaps = [];
function onloadHandler()
{
   var Rnd = function(s) {return Math.random() * s};

   // get the canvas DOM element and the 2D drawing context
   var canvas = document.getElementById('canvas');
   
   // remove frame margin and scrollbars when maxing out size of canvas
   document.body.style.margin = "0px";
   document.body.style.overflow = "hidden";

   // get dimensions of window and resize the canvas to fit
   var width = window.innerWidth,
       height = window.innerHeight;
   canvas.width = width;
   canvas.height = height;

   // create the scene and setup camera, perspective and viewport
   var scene = new Phoria.Scene();
   scene.camera.position = {x:0, y:25.0, z:-60.0};
   scene.camera.lookat = {x:0.0, y:15.0, z:0.0};
   scene.perspective.aspect = canvas.width / canvas.height;
   scene.viewport.width = canvas.width;
   scene.viewport.height = canvas.height;
   
   // create a canvas renderer
   var renderer = new Phoria.CanvasRenderer(canvas);
   
   // add a grid to help visualise camera position etc.
   var plane = Phoria.Util.generateTesselatedPlane(16,16,0,40);
   scene.graph.push(Phoria.Entity.create({
      points: plane.points,
      edges: plane.edges,
      polygons: plane.polygons,
      style: {
         color: [160,255,160],
         drawmode: "wireframe",
         shademode: "plain",
         linewidth: 0.5,
         objectsortmode: "back"
      }
   }));

   // random starfield object - centered on the origin
   var fnGenerateStarfield = function(num, scale) {
      scale = scale || 1;
      var s = scale / 2;
      var points = [];
      for (var i = 0; i < num; i++) {
         // TODO: points too close to the origin (i.e. camera view point) shoud be discared
         points.push({x:Math.random()*scale-s, y:Math.random()*scale-s, z:Math.random()*scale-s});
      }
      return Phoria.Entity.create({
         points: points,
         style: {
            color: [200+~~(Math.random()*55),200+~~(Math.random()*55),200+~~(Math.random()*55)],
            drawmode: "point",
            shademode: "plain",
            linewidth: 0.75,
            objectsortmode: "back"
         }
      });
   };
   scene.graph.push(fnGenerateStarfield(500,2000));

   // generate sparkle bitmap
   var fnGenerateBitmap = function fnGenerateBitmap(size, color) {
      var buffer = document.createElement('canvas');
      buffer.width = buffer.height = size;
      var w = size / 2, ww = w - (size / 8);
      var ctx = buffer.getContext('2d');
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (var i=0; i<128; i++)
      {
         ctx.moveTo(w, w);
         ctx.lineTo(Math.cos(Rnd(Phoria.TWOPI))*ww + w, Math.sin(Rnd(Phoria.TWOPI))*ww + w);
      }
      ctx.closePath();
      ctx.stroke();
      var img = new Image();
      img.src = buffer.toDataURL("image/png");
      return img;
   };

   // firework bitmap effect - sparkle/flicker etc.
   //  - is a firework an emitter that itself has physics, is shot up into the air and eventually explodes
   bitmaps.push(Phoria.Util.generateRadialGradientBitmap(16, "rgba(128,64,32,1)", "rgba(128,64,32,0)"));
   bitmaps.push(fnGenerateBitmap(32, "rgba(255,128,160,0.2)"));
   bitmaps.push(fnGenerateBitmap(32, "rgba(128,255,160,0.2)"));
   bitmaps.push(fnGenerateBitmap(32, "rgba(128,160,255,0.2)"));
   bitmaps.push(fnGenerateBitmap(32, "rgba(255,128,255,0.2)"));
   bitmaps.push(fnGenerateBitmap(32, "rgba(255,255,160,0.2)"));
   bitmaps.push(fnGenerateBitmap(32, "rgba(160,255,255,0.2)"));
   bitmaps.push(fnGenerateBitmap(32, "rgba(255,255,255,0.2)"));

   // rotate the camera around the scene
   scene.onCamera(function(position, lookAt, up) {
      var rotMatrix = mat4.create();
      mat4.rotateY(rotMatrix, rotMatrix, Math.sin(Date.now()/10000)*Phoria.RADIANS*360);
      vec4.transformMat4(position, position, rotMatrix);
   });

   var emit = false;
   scene.triggerHandlers.push({
      trigger: function() {
         // randomly add new emitters
         if (emit)
         {
            emit = false;
            // TODO: different types of firework emitters??
            var emitter = Phoria.EmitterEntity.create({
               position: {x:Rnd(-20)+10, y:0, z:Rnd(-20)+10},
               positionRnd: {x:0.12+Rnd(0.05), y:0.12+Rnd(0.05), z:0.12+Rnd(0.05)},
               rate: 50 + ~~Rnd(50),
               velocity: {x:0, y:0, z:0},
               velocityRnd: {x:0.0, y:0.12+Rnd(0.05), z:0.0},
               lifetime: 450 + ~~Rnd(100),
               lifetimeRnd: 150 + ~~Rnd(100),
               gravity: true,
               style: {
                  compositeOperation: "lighter",
                  linewidth: 12 + ~~Rnd(4),
                  // start with the sprite for a rocket engine effect
                  shademode: "sprite",
                  sprite: 0
               },
               onParticle: function(particle) {
                  // add custom render method to particle - randomly rotating sprite effect
                  // not actually used until the 'callback' sprite mode is set later
                  particle.onRender(function(ctx, x, y, w) {
                     ctx.translate(x, y);
                     ctx.rotate(Math.random(Phoria.TWOPI));
                     ctx.drawImage(emitter.textures[0], -w, -w, w+w, w+w);
                  });
               }
            });
            emitter.textures.push(bitmaps[0]);
            var emitterHandle = new Phoria.PhysicsEntity();
            emitterHandle.explodeY = 7 + Rnd(3);
            emitterHandle.onScene(function() {
               if (!this.exploded && this.explodeY < this.worldposition[1])
               {
                  this.exploded = Date.now();
                  emitter.velocity = {x:0, y:-0.2, z:0};
                  emitter.velocityRnd = {x:0.4+Rnd(0.2), y:0.4+Rnd(0.2), z:0.4+Rnd(0.2)};
                  emitter.gravity = false;
                  emitter.rate = 300 + ~~Rnd(200);
                  
                  // change sprite style to star sparkle effect
                  // select a random bitmap from the list of sparkle bitmap images
                  emitter.style.shademode = "callback";
                  emitter.textures[0] = bitmaps[~~Rnd(bitmaps.length - 1) + 1];
               }
               if (Date.now() - this.exploded > 200)
               {
                  emitter.rate = 0;
                  if (emitter.children.length === 0)
                  {
                     // remove!
                     for (var i=0; i<scene.graph.length; i++)
                     {
                        if (scene.graph[i] === this)
                        {
                           scene.graph.splice(i, 1);
                        }
                     }
                  }
               }
            });
            emitterHandle.impulse({x:0, y:1700+Rnd(300), z:0});
            emitterHandle.children.push(emitter);
            scene.graph.push(emitterHandle);
         }
      }
   });

   var pause = false;
   var fnAnimate = function() {
      if (!pause)
      {
         // execute the model view 3D pipeline and render the scene
         scene.modelView();
         renderer.render(scene);
      }
      requestAnimFrame(fnAnimate);
   };

   // key binding
   document.addEventListener('click', function(e) {
      emit = true;
   }, false);
   document.addEventListener("touchend", function(e) {
      e.preventDefault();
      emit = true;
   }, false);
   document.addEventListener('keydown', function(e) {
      switch (e.keyCode)
      {
         case 32:
            emit = true; break;
         case 27:
            if (pause) scene._lastTime = Date.now();
            pause = !pause;
            break;
      }
   }, false);
   
   // start animation
   requestAnimFrame(fnAnimate)}
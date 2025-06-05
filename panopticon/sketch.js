let angle = 0; // 用户视角旋转角度
let lastMouseX = 0;
let lastMouseY = 0;
let shape;
let isDragging = false;
let numWatchers = 8; // 监视者数量
let radius = 200; // 监视者围绕的半径
let cam;
let userIndex = 0; // 选定的用户作为视角的长方形索引
let camAngle = 0; // 视角绕用户的旋转角度（左右旋转）
let camVerticalAngle = 0; // 视角的上下旋转角度
let targetCamAngle = 0; // 目标水平角度
let targetCamVerticalAngle = 0; // 目标垂直角度
let camDistance = 30; // 视角离用户长方形前方更偏向圆心的位置
const camAngleLimit = Math.PI / 2; // 限制视角旋转范围（左右 180 度）
const camVerticalLimit = Math.PI / 4; // 限制上下俯仰角度（约 ±45 度）
let camTexture;
let w = 640;
let h = 480;
let bodyPose;
let video;
let videoGraphics;
let poses = [];
let connections;
let displaceColors;
let displaceColorsSrc = `
precision highp float;

uniform sampler2D tex0;
varying vec2 vTexCoord;

vec2 zoom(vec2 coord, float amount) {
  vec2 relativeToCenter = coord - 0.5;
  relativeToCenter /= amount; // Zoom in
  return relativeToCenter + 0.5; // Put back into absolute coordinates
}

void main() {
  // Get each color channel using coordinates with different amounts
  // of zooms to displace the colors slightly
  gl_FragColor = vec4(
    texture2D(tex0, vTexCoord).r+0.05,
    texture2D(tex0, zoom(vTexCoord, 1.025)).g,
    texture2D(tex0, zoom(vTexCoord, 1.05)).b+0.05,
    texture2D(tex0, vTexCoord).a+0.5
  );
}
`;

// 新增的变黑效果相关变量
let fadeAmount = 0; // 变化量，控制变黑程度
let fadeSpeed = 1.8; // 变黑速度，可调整
let fadeTexture; // 用于存储变黑效果的图形对象



function preload() {
  // Load the bodyPose model
  bodyPose = ml5.bodyPose();
  shape = loadModel('eye.stl', true)
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  frameRate(30); // 限制帧率提高流畅度
  cam = createCapture(VIDEO);
  cam.size(w, h); // 设置摄像头为标准 9:16 纵向比例
  cam.hide();
  
  camTexture = createGraphics(90, 160);
  fadeTexture = createGraphics(90, 160); // 创建用于变黑效果的图形对象
  
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  
  videoGraphics = createGraphics(640, 480, P2D); // 在 P2D 画布中处理视频

  bodyPose.detectStart(video, gotPoses)
  
  connections = bodyPose.getSkeleton();
  displaceColors = createFilterShader(displaceColorsSrc);
}

// function modelReady() {
//   console.log("BodyPose model ready!");
//   bodyPose.detect(video, gotPoses);
// }

function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;
  
  
}

function draw() {
  background(30);
  
 
  
  // 在 P2D 画布中绘制视频，确保 handpose 正确处理
  videoGraphics.image(video, 0, 0, videoGraphics.width, videoGraphics.height);
  
  // 将摄像头画面正确绘制到 camTexture 以保持比例
  camTexture.image(cam, -55, 0, cam.width/3, cam.height/3);
  
  // 准备变黑效果的图形
  fadeTexture.clear();
  fadeTexture.image(camTexture, 0, 0);
  fadeTexture.fill(0, fadeAmount); // 黑色 & 透明度
  fadeTexture.rect(0, 0, fadeTexture.width, fadeTexture.height);
  
  // 增加 fadeAmount，确保不会超出 255
  fadeAmount = min(fadeAmount + fadeSpeed, 255);
  
  if (poses.length > 0) {
    
    if(poses.length > 1){
      fadeAmount = 0;
    }

    let pose = poses[0]

    // Check if the left wrist (keypoint 10) is detected
    let leftWrist = pose.keypoints[9];
    let hand = pose.keypoints[10];
    let x = pose.keypoints[10].x; // 使用食指根部的坐标
    let y = pose.keypoints[10].y;
    
    if (leftWrist && leftWrist.score > 0.5) { // Ensure the keypoint is detected with a confidence score
      fadeAmount = 0;  // Reset fadeAmount when left wrist is detected
    }
    

    push();//sphere
    translate(210, 0,0);
    pointLight(255,255,255,0,100,0)
    //noStroke()
    ambientMaterial(0,255,255)
    sphere(90);
    pop();

    push();
    noStroke();
    translate(210, 60, 0);
    rotateY(-120);
    //rotateZ(90);
    pointLight(255,255,255,0,100,0)
    ambientMaterial(0,255,255)
    model(shape);
    pop();
    
    let normX = map(x, 0, videoGraphics.width, -1, 1);
    let normY = map(y, 0, videoGraphics.height, -1, 1);
    
    targetCamAngle = normX * camAngleLimit;
    targetCamVerticalAngle = normY * camVerticalLimit;
  }
  
  // 使用 lerp 使角度平滑过渡
  camAngle = lerp(camAngle, targetCamAngle, 0.1);
  camVerticalAngle = lerp(camVerticalAngle, targetCamVerticalAngle, 0.1);
  
  let userAngle = TWO_PI / numWatchers * userIndex;
  let userX = cos(userAngle) * radius;
  let userZ = sin(userAngle) * radius;
  
  let camOffsetX = cos(userAngle) * (camDistance - 20);
  let camOffsetZ = sin(userAngle) * (camDistance - 20);
  let camX = userX + camOffsetX + cos(camAngle) * 50;
  let camZ = userZ + camOffsetZ + sin(camAngle) * 50;
  let camY = sin(camVerticalAngle) * 100;
  
  camAngle = constrain(camAngle, -camAngleLimit, camAngleLimit);
  camVerticalAngle = constrain(camVerticalAngle, -camVerticalLimit, camVerticalLimit);
  
  let targetY = sin(camVerticalAngle) * -50;
  camera(camX, camY, camZ, userX, targetY, userZ, 0, 1, 0);
  
  for (let i = 0; i < numWatchers; i++) {
    let a = TWO_PI / numWatchers * i;
    let x = cos(a) * radius;
    let z = sin(a) * radius;
    
    push();
    translate(x +50, 120, z);
    rotateY(HALF_PI - a);
    
    // 使用带有变黑效果的 fadeTexture
    texture(fadeTexture);
    rectMode(CENTER);
    noStroke()
    rect(0, 0, 90, 160);
    pop();
    filter(GRAY);
    //filter(INVERT);
    filter(displaceColors);
  }
}

// 可选：添加重置功能
// function keyPressed() {
//   console.log(poses)
//   if (key === 'r' || key === 'R') {
//     // 重置变黑效果
//     fadeAmount = 0;
//   }
// }

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}
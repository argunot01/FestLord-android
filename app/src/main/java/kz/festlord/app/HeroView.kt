package kz.festlord.app

import android.content.Context
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import android.view.MotionEvent
import java.nio.ByteBuffer
import java.nio.ByteOrder

class HeroView(context: Context): GLSurfaceView(context) {
 private val renderer3d=HeroRenderer()
 private var previousX=0f
 init {
  setEGLContextClientVersion(2)
  setRenderer(renderer3d)
  renderMode=RENDERMODE_CONTINUOUSLY
 }
 fun changeStyle(i:Int){ queueEvent {renderer3d.style=i} }
 override fun onTouchEvent(event:MotionEvent):Boolean {
  when(event.actionMasked){
   MotionEvent.ACTION_DOWN -> previousX=event.x
   MotionEvent.ACTION_MOVE -> {
    val change=event.x-previousX
    queueEvent {renderer3d.angle+=change*0.4f}
    previousX=event.x
   }
  }
  return true
 }
}

private class HeroRenderer: GLSurfaceView.Renderer {
 var angle=0f
 var style=1
 private val projection=FloatArray(16)
 private val camera=FloatArray(16)
 private val pv=FloatArray(16)
 private val model=FloatArray(16)
 private val mvp=FloatArray(16)
 private var shaderProgram=0
 private var positionLocation=0
 private var matrixLocation=0
 private var colorLocation=0
 private val vertexCoords=floatArrayOf(
  -1f,-1f,1f, 1f,-1f,1f, 1f,1f,1f, -1f,1f,1f,
  -1f,-1f,-1f, -1f,1f,-1f, 1f,1f,-1f, 1f,-1f,-1f,
  -1f,1f,-1f, -1f,1f,1f, 1f,1f,1f, 1f,1f,-1f,
  -1f,-1f,-1f, 1f,-1f,-1f, 1f,-1f,1f, -1f,-1f,1f,
  1f,-1f,-1f, 1f,1f,-1f, 1f,1f,1f, 1f,-1f,1f,
  -1f,-1f,-1f, -1f,-1f,1f, -1f,1f,1f, -1f,1f,-1f
 )
 private val triangles=byteArrayOf(0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11,12,13,14,12,14,15,16,17,18,16,18,19,20,21,22,20,22,23)
 private val vertexBuffer=ByteBuffer.allocateDirect(vertexCoords.size*4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply {put(vertexCoords);position(0)}
 private val indexBuffer=ByteBuffer.allocateDirect(triangles.size).apply {put(triangles);position(0)}
 override fun onSurfaceCreated(gl:javax.microedition.khronos.opengles.GL10?,config:javax.microedition.khronos.egl.EGLConfig?){
  GLES20.glClearColor(.05f,.06f,.09f,1f)
  GLES20.glEnable(GLES20.GL_DEPTH_TEST)
  val vs=compile(GLES20.GL_VERTEX_SHADER,"attribute vec3 aPosition; uniform mat4 uMatrix; void main(){gl_Position=uMatrix*vec4(aPosition,1.0);}")
  val fs=compile(GLES20.GL_FRAGMENT_SHADER,"precision mediump float; uniform vec4 uColor; void main(){gl_FragColor=uColor;}")
  shaderProgram=GLES20.glCreateProgram()
  GLES20.glAttachShader(shaderProgram,vs)
  GLES20.glAttachShader(shaderProgram,fs)
  GLES20.glLinkProgram(shaderProgram)
  positionLocation=GLES20.glGetAttribLocation(shaderProgram,"aPosition")
  matrixLocation=GLES20.glGetUniformLocation(shaderProgram,"uMatrix")
  colorLocation=GLES20.glGetUniformLocation(shaderProgram,"uColor")
 }
 private fun compile(type:Int,source:String):Int{
  val s=GLES20.glCreateShader(type)
  GLES20.glShaderSource(s,source)
  GLES20.glCompileShader(s)
  return s
 }
 override fun onSurfaceChanged(gl:javax.microedition.khronos.opengles.GL10?,width:Int,height:Int){
  GLES20.glViewport(0,0,width,height)
  Matrix.perspectiveM(projection,0,45f,width.toFloat()/height.coerceAtLeast(1),.1f,100f)
 }
 override fun onDrawFrame(gl:javax.microedition.khronos.opengles.GL10?){
  GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
  GLES20.glUseProgram(shaderProgram)
  GLES20.glEnableVertexAttribArray(positionLocation)
  vertexBuffer.position(0)
  GLES20.glVertexAttribPointer(positionLocation,3,GLES20.GL_FLOAT,false,12,vertexBuffer)
  Matrix.setLookAtM(camera,0,0f,.7f,8f,0f,.4f,0f,0f,1f,0f)
  Matrix.multiplyMM(pv,0,projection,0,camera,0)
  val armor=when(style){
   0->floatArrayOf(.15f,.44f,.58f,1f)
   2->floatArrayOf(.53f,.26f,.75f,1f)
   else->floatArrayOf(.22f,.25f,.34f,1f)
  }
  val skin=floatArrayOf(.76f,.52f,.38f,1f)
  val gold=floatArrayOf(.88f,.70f,.30f,1f)
  cube(0f,.6f,0f,.6f,.8f,.35f,armor)
  cube(0f,1.35f,0f,.27f,.3f,.27f,skin)
  cube(-.48f,.6f,0f,.19f,.68f,.23f,armor)
  cube(.48f,.6f,0f,.19f,.68f,.23f,armor)
  cube(-.2f,-.4f,0f,.22f,.95f,.24f,armor)
  cube(.2f,-.4f,0f,.22f,.95f,.24f,armor)
  if(style!=0){
   cube(0f,1.65f,0f,.4f,.14f,.35f,gold)
   cube(0f,.7f,.22f,.35f,.10f,.07f,gold)
  }
 }
 private fun cube(x:Float,y:Float,z:Float,sx:Float,sy:Float,sz:Float,color:FloatArray){
  Matrix.setIdentityM(model,0)
  Matrix.rotateM(model,0,angle,0f,1f,0f)
  Matrix.translateM(model,0,x,y,z)
  Matrix.scaleM(model,0,sx,sy,sz)
  Matrix.multiplyMM(mvp,0,pv,0,model,0)
  GLES20.glUniformMatrix4fv(matrixLocation,1,false,mvp,0)
  GLES20.glUniform4fv(colorLocation,1,color,0)
  indexBuffer.position(0)
  GLES20.glDrawElements(GLES20.GL_TRIANGLES,triangles.size,GLES20.GL_UNSIGNED_BYTE,indexBuffer)
 }
}
